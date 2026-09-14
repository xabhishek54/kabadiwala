export interface ImageClassificationResult {
  category: string;
  condition: 'intact' | 'damaged' | 'stripped';
  confidence: number;
  fallback?: boolean;
}

/**
 * Heuristic client-side image classifier.
 * Analyzes image dimensions and color distributions to estimate e-waste material category.
 */
export async function classifyImageClient(dataUrl: string): Promise<ImageClassificationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 200);
        canvas.height = Math.min(img.height, 200);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ category: 'PCB', condition: 'intact', confidence: 0.82, fallback: true });
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let greenCount = 0;
        let metallicCount = 0;
        let total = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Green circuit board heuristic
          if (g > r * 1.2 && g > b * 1.2 && g > 60) greenCount++;
          // Metallic / copper heuristic
          if (r > 140 && g > 90 && b < 80) metallicCount++;
        }

        const greenRatio = greenCount / total;
        const metalRatio = metallicCount / total;

        if (greenRatio > 0.15) {
          return resolve({ category: 'PCB', condition: 'intact', confidence: 0.88, fallback: true });
        } else if (metalRatio > 0.1) {
          return resolve({ category: 'CABLE', condition: 'stripped', confidence: 0.84, fallback: true });
        } else {
          return resolve({ category: 'BATTERY', condition: 'intact', confidence: 0.76, fallback: true });
        }
      } catch {
        resolve({ category: 'PCB', condition: 'intact', confidence: 0.75, fallback: true });
      }
    };

    img.onerror = () => {
      resolve({ category: 'PCB', condition: 'intact', confidence: 0.7, fallback: true });
    };

    img.src = dataUrl;
  });
}
