/**
 * classifierWorker.ts — TF.js Web Worker for e-waste image classification.
 *
 * Runs a MobileNet-based dual-head model in a dedicated Web Worker thread so
 * it never blocks the main UI thread. Falls back gracefully when:
 *   - TF.js fails to load (CDN offline, quota exceeded)
 *   - Inference exceeds 3 s timeout
 *   - Model files are not yet cached
 *
 * Messages FROM main thread:
 *   { type: 'CLASSIFY', imageData: ImageData }
 *
 * Messages TO main thread:
 *   { type: 'RESULT', category: string, condition: string, confidence: number }
 *   { type: 'ERROR', message: string }
 *
 * Spec ref: 05-ml-ai-guide.md §1, §2; 02-features-implementation.md §1
 */

// ---------------------------------------------------------------------------
// Label maps (must match training order)
// ---------------------------------------------------------------------------
const CATEGORY_LABELS = [
  'PCB',
  'BATTERY',
  'CABLE',
  'LCD_PANEL',
  'CRT',
  'MOTOR_MAGNET',
  'MIXED_PLASTIC',
] as const;

const CONDITION_LABELS = ['intact', 'damaged', 'stripped'] as const;

type CategoryLabel = (typeof CATEGORY_LABELS)[number];
type ConditionLabel = (typeof CONDITION_LABELS)[number];

// ---------------------------------------------------------------------------
// Heuristic image-feature fallback (no TF.js)
// ---------------------------------------------------------------------------
/**
 * Analyses raw pixel statistics to guess category + condition without a neural
 * network. Used as the fallback when TF.js is unavailable.
 *
 * Logic (simplified field heuristics):
 *  - Green-channel dominance → PCB
 *  - Very dark image → CABLE (black sheathing)
 *  - High mean brightness + glass-like → CRT / LCD_PANEL
 *  - Else → MIXED_PLASTIC (safest generic bucket)
 *  Condition:
 *  - Low contrast (std < 35) → likely intact packaging
 *  - High variance → damaged
 *  - Very high variance → stripped
 */
function heuristicClassify(imageData: ImageData): {
  category: CategoryLabel;
  condition: ConditionLabel;
  confidence: number;
} {
  const { data, width, height } = imageData;
  let rSum = 0, gSum = 0, bSum = 0;
  const pixelCount = width * height;

  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
  }

  const rMean = rSum / pixelCount;
  const gMean = gSum / pixelCount;
  const bMean = bSum / pixelCount;
  const brightness = (rMean + gMean + bMean) / 3;

  // Compute variance for condition proxy
  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const px = (data[i] + data[i + 1] + data[i + 2]) / 3;
    variance += (px - brightness) ** 2;
  }
  const stdDev = Math.sqrt(variance / pixelCount);

  // Category heuristic
  let category: CategoryLabel;
  if (gMean > rMean * 1.15 && gMean > bMean * 1.1) {
    category = 'PCB';
  } else if (brightness < 55) {
    category = 'CABLE';
  } else if (brightness > 160 && stdDev < 40) {
    category = 'LCD_PANEL';
  } else if (rMean > gMean * 1.2) {
    category = 'BATTERY';
  } else if (brightness > 120 && bMean > rMean * 1.1) {
    category = 'CRT';
  } else if (stdDev > 80) {
    category = 'MOTOR_MAGNET';
  } else {
    category = 'MIXED_PLASTIC';
  }

  // Condition heuristic from pixel variance
  let condition: ConditionLabel;
  if (stdDev < 35) {
    condition = 'intact';
  } else if (stdDev < 65) {
    condition = 'damaged';
  } else {
    condition = 'stripped';
  }

  // Low confidence — clearly labelled as heuristic-based
  const confidence = 0.35 + Math.random() * 0.10;

  return { category, condition, confidence };
}

// ---------------------------------------------------------------------------
// TF.js model inference
// ---------------------------------------------------------------------------
let modelPromise: Promise<any> | null = null;

async function loadModel(): Promise<any> {
  // Dynamically import TF.js — allows bundler to tree-shake when unused
  const tf = await import(/* @vite-ignore */ '@tensorflow/tfjs');
  await tf.ready();
  // Model is served from /public/models/classifier/model.json
  const model = await tf.loadLayersModel('/models/classifier/model.json');
  return { tf, model };
}

async function tfClassify(imageData: ImageData): Promise<{
  category: CategoryLabel;
  condition: ConditionLabel;
  confidence: number;
}> {
  if (!modelPromise) {
    modelPromise = loadModel();
  }

  const { tf, model } = await modelPromise;

  const tensor = tf.tidy(() => {
    const img = tf.browser.fromPixels({ data: imageData.data, width: imageData.width, height: imageData.height });
    return img
      .toFloat()
      .div(255.0)
      .resizeBilinear([224, 224])
      .expandDims(0);
  });

  const outputs = model.predict(tensor) as any[];
  // Model has 2 heads: [category_logits (7), condition_logits (3)]
  const catLogits: number[] = await outputs[0].data();
  const condLogits: number[] = await outputs[1].data();

  tensor.dispose();

  const catIdx = catLogits.indexOf(Math.max(...catLogits));
  const condIdx = condLogits.indexOf(Math.max(...condLogits));

  // Softmax confidence for category
  const catMax = Math.max(...catLogits);
  const catSoftmax = catLogits.map((v) => Math.exp(v - catMax));
  const catSum = catSoftmax.reduce((a, b) => a + b, 0);
  const confidence = catSoftmax[catIdx] / catSum;

  return {
    category: CATEGORY_LABELS[catIdx] ?? 'MIXED_PLASTIC',
    condition: CONDITION_LABELS[condIdx] ?? 'intact',
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

// ---------------------------------------------------------------------------
// Worker message handler
// ---------------------------------------------------------------------------
self.onmessage = async (event: MessageEvent) => {
  if (event.data?.type !== 'CLASSIFY') return;

  const imageData: ImageData = event.data.imageData;

  try {
    // Race: TF.js inference vs 3 s timeout
    const result = await Promise.race([
      tfClassify(imageData),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TF.js inference timeout (3s)')), 3000)
      ),
    ]);
    self.postMessage({ type: 'RESULT', ...result });
  } catch (tfError) {
    console.warn('[ClassifierWorker] TF.js failed, using heuristic:', tfError);
    // Graceful fallback to pixel-heuristic classifier
    try {
      const fallback = heuristicClassify(imageData);
      self.postMessage({ type: 'RESULT', ...fallback, fallback: true });
    } catch (heurError) {
      self.postMessage({ type: 'ERROR', message: String(heurError) });
    }
  }
};
