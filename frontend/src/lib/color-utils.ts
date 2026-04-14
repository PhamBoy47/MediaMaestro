/**
 * Dynamic Color Extraction Utility
 * Extracts dominant colors from images for Harmonoid-style dynamic backgrounds.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export async function extractDominantColor(imageUrl: string): Promise<RGB> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ r: 40, g: 40, b: 40 });

      // Scale down image for performance
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      try {
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, count = 0;

        // Sample every 4th pixel for speed
        for (let i = 0; i < data.length; i += 16) {
          // Skip transparent or near-black/near-white pixels to get better vibrance
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness < 30 || brightness > 240) continue;

          r += data[i];
          g += data[i+1];
          b += data[i+2];
          count++;
        }

        if (count === 0) return resolve({ r: 60, g: 60, b: 60 });

        resolve({
          r: Math.floor(r / count),
          g: Math.floor(g / count),
          b: Math.floor(b / count),
        });
      } catch (e) {
        console.error("Color extraction failed:", e);
        resolve({ r: 40, g: 40, b: 40 });
      }
    };

    img.onerror = () => {
      resolve({ r: 40, g: 40, b: 40 });
    };
  });
}

export function rgbToHsl(rgb: RGB): { h: number, s: number, l: number } {
  let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}
