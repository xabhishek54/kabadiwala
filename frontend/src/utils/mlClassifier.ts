export interface ImageClassificationResult {
  category: string;
  subCategoryHint?: string;
  condition: 'intact' | 'damaged' | 'stripped';
  confidence: number;
  fallback?: boolean;
}

/**
 * Multi-item heuristic classifier.
 * Scans an image and returns ALL material types detected above threshold confidence,
 * so one photo of a mixed pile can produce several detected items.
 */
export async function classifyImageClient(
  dataUrl: string,
): Promise<ImageClassificationResult[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 300);
        canvas.height = Math.min(img.height, 300);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve([fallbackResult('PCB')]);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const total = data.length / 4;

        // --- per-pixel signal counters ---
        let greenPCB = 0;    // green circuit boards
        let copperCable = 0; // orange-copper tones
        let darkBattery = 0; // near-black casings (Li-Ion)
        let greyMetal = 0;   // neutral grey motors / CRT
        let blueBattery = 0; // blue / indigo tones (lead-acid, Li-Ion)
        let whitePlastic = 0; // pale / white ABS plastics
        let brownCable = 0;  // brown insulation
        let yellowLcd = 0;   // yellowish screen edges / LCD backlight glow

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;

          // green circuit board (emerald green, strong green channel)
          if (g > r * 1.25 && g > b * 1.25 && g > 60) greenPCB++;

          // copper / orange wire (high red, mid green, low blue)
          if (r > 160 && g > 80 && g < 160 && b < 80 && r > g * 1.2) copperCable++;

          // dark casings — batteries
          if (brightness < 55 && Math.max(r, g, b) - Math.min(r, g, b) < 40) darkBattery++;

          // grey-silver metals — motors, CRT chassis
          if (brightness > 80 && brightness < 190 &&
              Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) greyMetal++;

          // blue / indigo tones — lead-acid casings, some batteries
          if (b > r * 1.3 && b > g * 1.1 && b > 80) blueBattery++;

          // white / pale plastic casings
          if (brightness > 210 && Math.max(r, g, b) - Math.min(r, g, b) < 30) whitePlastic++;

          // brown insulation (cables)
          if (r > 100 && g > 50 && b < 60 && r > g * 1.4 && r < 200) brownCable++;

          // yellowish / warm white (LCD backlight)
          if (r > 200 && g > 180 && b < 140 && r > b * 1.5) yellowLcd++;
        }

        // --- convert to ratios ---
        const ratios = {
          greenPCB: greenPCB / total,
          copperCable: copperCable / total,
          darkBattery: darkBattery / total,
          greyMetal: greyMetal / total,
          blueBattery: blueBattery / total,
          whitePlastic: whitePlastic / total,
          brownCable: brownCable / total,
          yellowLcd: yellowLcd / total,
        };

        // --- detection rules (each rule fires independently) ---
        const results: ImageClassificationResult[] = [];

        if (ratios.greenPCB > 0.06) {
          results.push({
            category: 'PCB',
            subCategoryHint: ratios.greenPCB > 0.18 ? 'Motherboard High Grade' : 'Low Grade Consumer PCB',
            condition: ratios.darkBattery > 0.15 ? 'damaged' : 'intact',
            confidence: clamp(0.70 + ratios.greenPCB * 1.5),
          });
        }

        if (ratios.copperCable > 0.05 || ratios.brownCable > 0.07) {
          const cableRatio = ratios.copperCable + ratios.brownCable;
          results.push({
            category: 'CABLE',
            subCategoryHint: ratios.copperCable > 0.1 ? 'Copper Heavy Duty' : 'Power Cord & Appliance Wire',
            condition: ratios.brownCable > ratios.copperCable ? 'intact' : 'stripped',
            confidence: clamp(0.65 + cableRatio * 2),
          });
        }

        if (ratios.darkBattery > 0.12 || ratios.blueBattery > 0.08) {
          results.push({
            category: 'BATTERY',
            subCategoryHint: ratios.blueBattery > 0.1 ? 'Lead-Acid Battery' : 'Lithium-Ion Pack',
            condition: ratios.darkBattery > 0.25 ? 'damaged' : 'intact',
            confidence: clamp(0.62 + (ratios.darkBattery + ratios.blueBattery) * 1.8),
          });
        }

        if (ratios.greyMetal > 0.20 && ratios.greenPCB < 0.05) {
          results.push({
            category: 'MOTOR_MAGNET',
            subCategoryHint: 'Copper Stator',
            condition: 'intact',
            confidence: clamp(0.60 + ratios.greyMetal),
          });
        }

        if (ratios.whitePlastic > 0.18) {
          results.push({
            category: 'MIXED_PLASTIC',
            subCategoryHint: 'E-Waste Casing',
            condition: 'intact',
            confidence: clamp(0.58 + ratios.whitePlastic),
          });
        }

        if (ratios.yellowLcd > 0.08) {
          results.push({
            category: 'LCD_PANEL',
            subCategoryHint: 'Monitor Screen',
            condition: 'intact',
            confidence: clamp(0.65 + ratios.yellowLcd * 2),
          });
        }

        // Sort by confidence descending
        results.sort((a, b) => b.confidence - a.confidence);

        // If nothing detected, fall back to a single low-confidence PCB
        if (results.length === 0) {
          return resolve([{ category: 'PCB', condition: 'intact', confidence: 0.55, fallback: true }]);
        }

        resolve(results);
      } catch {
        resolve([fallbackResult('PCB')]);
      }
    };

    img.onerror = () => resolve([fallbackResult('PCB')]);
    img.src = dataUrl;
  });
}

function clamp(v: number, min = 0.55, max = 0.97): number {
  return Math.min(max, Math.max(min, v));
}

function fallbackResult(category: string): ImageClassificationResult {
  return { category, condition: 'intact', confidence: 0.6, fallback: true };
}
