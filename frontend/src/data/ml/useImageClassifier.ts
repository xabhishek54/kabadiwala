/**
 * useImageClassifier.ts — React hook for e-waste image classification.
 *
 * Spawns the classifier Web Worker (Vite ?worker import), sends ImageData,
 * and returns the suggested category + condition + confidence in state.
 * Safely tears down the worker on component unmount.
 *
 * Usage:
 *   const { classify, result, isClassifying, error } = useImageClassifier();
 *   classify(imageDataUrl);  // dataURL string from FileReader / canvas
 *
 * Spec ref: 05-ml-ai-guide.md §1, §2, §6
 */
import { useState, useRef, useCallback, useEffect } from 'react';
// Vite ?worker suffix → bundled as a separate ES module worker chunk
import ClassifierWorker from './classifierWorker.ts?worker';

export interface ClassifierResult {
  category: string;
  condition: 'intact' | 'damaged' | 'stripped';
  confidence: number;
  /** true when heuristic pixel-analysis fallback was used instead of TF.js */
  fallback?: boolean;
}

export function useImageClassifier() {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<ClassifierResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazily create the worker on first use
  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new ClassifierWorker();
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup worker on unmount
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  /**
   * Accepts a dataURL string, decodes it into an ImageData via canvas,
   * and dispatches it to the Web Worker.
   */
  const classify = useCallback(
    async (dataUrl: string) => {
      setIsClassifying(true);
      setError(null);
      setResult(null);

      try {
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = rej;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 224, 224);
        const imageData = ctx.getImageData(0, 0, 224, 224);

        const worker = ensureWorker();

        const handler = (e: MessageEvent) => {
          if (e.data.type === 'RESULT') {
            setResult({
              category: e.data.category,
              condition: e.data.condition,
              confidence: e.data.confidence,
              fallback: e.data.fallback ?? false,
            });
            setIsClassifying(false);
          } else if (e.data.type === 'ERROR') {
            setError(e.data.message);
            setIsClassifying(false);
          }
          worker.removeEventListener('message', handler);
        };

        worker.addEventListener('message', handler);
        // Transfer ImageData.data buffer to avoid copying
        worker.postMessage({ type: 'CLASSIFY', imageData }, [imageData.data.buffer]);
      } catch (err) {
        setError(String(err));
        setIsClassifying(false);
      }
    },
    [ensureWorker]
  );

  return { classify, result, isClassifying, error };
}
