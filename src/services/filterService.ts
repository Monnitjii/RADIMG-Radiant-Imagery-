/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FilterType = 'halftone' | 'glitch' | 'ascii' | 'dither' | 'glass' | 'blur' | 'trace' | 'vision' | 'bitcrush' | 'doubleExposure' | 'outline';

export interface FilterParams {
  [key: string]: any;
}

export class FilterService {
  /**
   * Applies the selected filter to the canvas context.
   */
  static applyFilter(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    type: FilterType,
    params: FilterParams,
    originalImage: HTMLImageElement
  ) {
    // Create a temporary canvas to get image data without drawing to the main canvas yet
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(originalImage, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    switch (type) {
      case 'halftone':
        this.applyHalftone(ctx, width, height, params, originalImage);
        break;
      case 'glitch':
        this.applyGlitch(ctx, width, height, params, imageData);
        break;
      case 'ascii':
        this.applyASCII(ctx, width, height, params, originalImage);
        break;
      case 'dither':
        this.applyDither(ctx, width, height, params, imageData);
        break;
      case 'glass':
        this.applyGlass(ctx, width, height, params, originalImage);
        break;
      case 'blur':
        this.applyBlur(ctx, width, height, params, originalImage);
        break;
      case 'trace':
        this.applyTrace(ctx, width, height, params, originalImage);
        break;
      case 'vision':
        this.applyVision(ctx, width, height, params, originalImage);
        break;
      case 'bitcrush':
        this.applyBitcrush(ctx, width, height, params, imageData);
        break;
      case 'doubleExposure':
        this.applyDoubleExposure(ctx, width, height, params, originalImage);
        break;
      case 'outline':
        this.applyOutline(ctx, width, height, params, originalImage);
        break;
    }
  }

  private static applyOutline(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    const thickness = p.thickness ?? 5;
    const glow = p.glow ?? 0.5;
    const edgeBlur = p.edgeBlur ?? 0.1;
    const showBackground = p.showBackground !== false;

    const color = 'rgb(255, 255, 255)';

    ctx.clearRect(0, 0, w, h);

    // 1. Background (Fixed black)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);

    // 2. Subject (Original) - Respected by showBackground
    if (showBackground) {
      ctx.save();
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    }

    // 3. Outline Effect (Sobel Edge Detection)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d')!;
    
    // Grayscale pass for edge detection
    tCtx.filter = 'grayscale(100%)';
    tCtx.drawImage(img, 0, 0, w, h);
    
    const imageData = tCtx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const edgeData = new Uint8ClampedArray(data.length);

    // Sobel kernels
    const gx = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    const gy = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let resX = 0;
        let resY = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = ((y + ky) * w + (x + kx)) * 4;
            const val = data[pixelIdx]; // Grayscale so R=G=B
            resX += val * gx[ky + 1][kx + 1];
            resY += val * gy[ky + 1][kx + 1];
          }
        }

        const magnitude = Math.sqrt(resX * resX + resY * resY);
        const i = (y * w + x) * 4;
        
        // Higher threshold for thinner lines
        if (magnitude > 45) {
          edgeData[i] = 255;
          edgeData[i+1] = 255;
          edgeData[i+2] = 255;
          edgeData[i+3] = 255;
        }
      }
    }
    
    tCtx.putImageData(new ImageData(edgeData, w, h), 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Glow
    if (glow > 0) {
      ctx.shadowBlur = glow * 15;
      ctx.shadowColor = color;
    }
    
    // Edge Blur - Only affects the lines drawn below
    ctx.filter = `blur(${edgeBlur * 10}px)`;
    
    ctx.globalAlpha = 0.8;
    const t = Math.floor(thickness);
    // Subtle thickness loop
    for (let dy = -t; dy <= t; dy++) {
      for (let dx = -t; dx <= t; dx++) {
        if (dx*dx + dy*dy <= t*t) {
          ctx.drawImage(tempCanvas, dx, dy);
        }
      }
    }
    
    ctx.globalAlpha = 1.0;
    ctx.drawImage(tempCanvas, 0, 0);
    
    ctx.restore();
  }

  private static applyDoubleExposure(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    const exposure = p.exposure ?? 1.5;
    const blur = p.blur ?? 15;
    const ghosting = p.ghosting ?? 0.4;
    const blend = p.blend ?? 0.6;
    const showBackground = p.showBackground !== false;

    ctx.clearRect(0, 0, w, h);

    // 1. Base Layer (Overexposed & Blurred)
    ctx.save();
    if (showBackground) {
      ctx.filter = `brightness(${exposure * 100}%) contrast(${exposure * 120}%) blur(${blur}px)`;
      ctx.drawImage(img, 0, 0, w, h);
    }
    ctx.restore();

    // 2. Ghost Layer (Offset & Transparent)
    ctx.save();
    ctx.globalAlpha = ghosting;
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = `brightness(${exposure * 150}%) contrast(150%) blur(${blur / 2}px)`;
    ctx.drawImage(img, w * 0.05, h * 0.05, w, h);
    ctx.restore();

    // 3. Procedural "Urban" Layer (Double Exposure using self-texture)
    // We use a high-contrast, scaled-up, and slightly rotated version of the image to simulate "architecture"
    ctx.save();
    ctx.globalAlpha = blend;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(w / 2, h / 2);
    ctx.rotate(Math.PI / 180 * 5); // 5 degree rotation
    ctx.scale(1.2, 1.2); // 1.2x scale
    ctx.filter = `grayscale(100%) contrast(300%) brightness(80%) blur(2px)`;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    // 4. Subject Detail Layer (High Contrast)
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = `contrast(200%) brightness(110%)`;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();

    // 5. Washed-out Bleed (Bloom)
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(30px) brightness(200%)`;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }

  private static applyHalftone(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    const size = Math.max(2, p.size ?? 10);
    const angle = (p.angle ?? 45) * (Math.PI / 180);
    const contrast = p.contrast ?? 1.5;
    
    // Create a temporary canvas to read pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0, w, h);
    const imageData = tempCtx.getImageData(0, 0, w, h).data;

    if (p.showBackground !== false) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    
    ctx.fillStyle = 'black';

    const diag = Math.sqrt(w * w + h * h);
    const cx = w / 2;
    const cy = h / 2;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let y = -diag / 2; y < diag / 2; y += size) {
      for (let x = -diag / 2; x < diag / 2; x += size) {
        // Rotate coordinates to get screen position
        const sx = cx + x * cos - y * sin;
        const sy = cy + x * sin + y * cos;
        
        // Skip if outside canvas bounds
        if (sx < -size || sx > w + size || sy < -size || sy > h + size) continue;

        const px = Math.floor(sx);
        const py = Math.floor(sy);
        
        if (px >= 0 && px < w && py >= 0 && py < h) {
          const idx = (py * w + px) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          
          // Apply contrast
          const adjustedBrightness = Math.max(0, Math.min(1, (brightness - 0.5) * contrast + 0.5));
          const radius = (size / 2) * (1 - adjustedBrightness);

          if (radius > 0) {
            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  private static applyGlitch(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, imageData: ImageData) {
    const data = imageData.data;
    const intensity = p.intensity ?? 0.5;
    const complexity = p.complexity ?? 0.3;
    const amount = p.amount ?? 0.5;
    const seed = p.seed ?? 0;
    
    const newData = new Uint8ClampedArray(data);
    
    const random = (s: number) => {
      const x = Math.sin(s + seed) * 10000;
      return x - Math.floor(x);
    };

    // RGB Shift
    const shift = Math.floor(intensity * 40 * amount);
    for (let i = 0; i < data.length; i += 4) {
      if (i + shift * 4 < data.length) {
        newData[i] = data[i + shift * 4]; // Red shift
      }
    }
    
    if (p.showBackground === false) {
      // Make non-glitched pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        if (newData[i] === data[i] && newData[i+1] === data[i+1] && newData[i+2] === data[i+2]) {
          newData[i+3] = 0;
        }
      }
      ctx.clearRect(0, 0, w, h);
    }
    
    ctx.putImageData(new ImageData(newData, w, h), 0, 0);

    // Slice Glitches (Blocks)
    if (complexity > 0.1) {
      const sliceCount = Math.floor(complexity * 30);
      for (let i = 0; i < sliceCount; i++) {
        if (random(i) < intensity) {
          const sliceW = Math.floor(random(i + 1) * w * amount * 0.8) + 10;
          const sliceH = Math.floor(random(i + 2) * 30 * amount) + 5;
          const x = Math.floor(random(i + 3) * (w - sliceW));
          const y = Math.floor(random(i + 4) * (h - sliceH));
          
          const offsetX = Math.floor((random(i + 5) - 0.5) * 100 * intensity * amount);
          
          // Copy a block and paste it with offset
          const slice = ctx.getImageData(x, y, sliceW, sliceH);
          ctx.putImageData(slice, (x + offsetX + w) % w, y);
        }
      }
    }

    // Scanline / Noise overlay
    if (intensity > 0.7) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(intensity - 0.7) * 0.2})`;
      for (let y = 0; y < h; y += 4) {
        if (random(y) > 0.5) {
          ctx.fillRect(0, y, w, 1);
        }
      }
    }
  }

  private static applyASCII(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    const fontSize = Math.max(4, p.fontSize ?? 8);
    const chars = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ".split("").reverse();
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0, w, h);
    const imageData = tempCtx.getImageData(0, 0, w, h).data;

    if (p.showBackground !== false) {
      ctx.drawImage(img, 0, 0, w, h);
      
      if (p.asciiStrength > 0.5) {
        ctx.fillStyle = `rgba(0, 0, 0, ${(p.asciiStrength - 0.5) * 0.5})`;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const strength = p.asciiStrength ?? 1.0;
    const transparency = p.transparency ?? 1.0;
    ctx.globalAlpha = transparency;

    const getLuminance = (x: number, y: number) => {
      const px = Math.min(w - 1, Math.max(0, Math.floor(x)));
      const py = Math.min(h - 1, Math.max(0, Math.floor(y)));
      const i = (py * w + px) * 4;
      return (imageData[i] * 0.299 + imageData[i + 1] * 0.587 + imageData[i + 2] * 0.114) / 255;
    };

    for (let y = 0; y < h; y += fontSize) {
      for (let x = 0; x < w; x += fontSize) {
        // Calculate local gradients for edge detection
        const l = getLuminance(x, y);
        const lx = getLuminance(x + 1, y) - getLuminance(x - 1, y);
        const ly = getLuminance(x, y + 1) - getLuminance(x, y - 1);
        const edgeStrength = Math.sqrt(lx * lx + ly * ly);
        
        // Use a combination of edge strength and a subtle noise seed for density
        // This prioritizes showing characters on edges first
        const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const priority = edgeStrength * 2 + Math.abs(noise) * 0.5;
        
        // Threshold based on strength: 0 strength = no chars, 1 strength = all chars
        // We normalize priority to roughly 0-1 range for the check
        if (priority < (1 - strength) * 1.5) continue;

        let char = '';
        if (edgeStrength > 0.1) {
          // Pick directional character based on gradient angle
          const angle = Math.atan2(ly, lx) * (180 / Math.PI);
          const normalizedAngle = (angle + 180) % 180;
          
          if (normalizedAngle < 22.5 || normalizedAngle >= 157.5) char = '|';
          else if (normalizedAngle < 67.5) char = '/';
          else if (normalizedAngle < 112.5) char = '-';
          else char = '\\';
        } else {
          const charIdx = Math.floor(l * (chars.length - 1));
          char = chars[charIdx];
        }

        if (p.colorize) {
          const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
          ctx.fillStyle = `rgb(${imageData[idx]},${imageData[idx + 1]},${imageData[idx + 2]})`;
        } else {
          ctx.fillStyle = 'white';
        }
        
        ctx.fillText(char, x + fontSize / 2, y + fontSize / 2);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  private static applyDither(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, imageData: ImageData) {
    const data = imageData.data;
    const intensity = p.intensity ?? 0.5; // Threshold
    const complexity = p.complexity ?? 0.5; // Error diffusion strength
    const amount = p.amount ?? 1.0; // Mix
    const seed = p.seed ?? 0;

    const originalData = new Uint8ClampedArray(data);
    
    // Simple noise function
    const noise = (x: number, y: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
      return n - Math.floor(n);
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        
        // Add noise based on seed
        const n = (noise(x, y) - 0.5) * (p.seed ? 0.2 : 0);
        const threshold = (1 - intensity) * 255 + n * 255;

        const oldR = data[i];
        const oldG = data[i + 1];
        const oldB = data[i + 2];
        
        const newR = oldR < threshold ? 0 : 255;
        const newG = oldG < threshold ? 0 : 255;
        const newB = oldB < threshold ? 0 : 255;
        
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
        
        if (p.showBackground === false) {
          // If background is transparent, make white pixels transparent
          if (newR === 255 && newG === 255 && newB === 255) {
            data[i + 3] = 0;
          }
        }

        const errR = (oldR - newR) * complexity;
        const errG = (oldG - newG) * complexity;
        const errB = (oldB - newB) * complexity;
        
        const distributeError = (nx: number, ny: number, weight: number) => {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
          const ni = (ny * w + nx) * 4;
          data[ni] = Math.max(0, Math.min(255, data[ni] + errR * weight));
          data[ni + 1] = Math.max(0, Math.min(255, data[ni + 1] + errG * weight));
          data[ni + 2] = Math.max(0, Math.min(255, data[ni + 2] + errB * weight));
        };
        
        distributeError(x + 1, y, 7/16);
        distributeError(x - 1, y + 1, 3/16);
        distributeError(x, y + 1, 5/16);
        distributeError(x + 1, y + 1, 1/16);
      }
    }

    // Apply amount (mix)
    if (amount < 1.0) {
      for (let i = 0; i < data.length; i++) {
        data[i] = originalData[i] * (1 - amount) + data[i] * amount;
      }
    }

    if (p.showBackground === false) {
      ctx.clearRect(0, 0, w, h);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private static applyGlass(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    const distortion = p.distortion ?? 0.4;
    const refraction = p.refraction ?? 1.3;
    const blurAmt = p.blur ?? 0.2;

    if (p.showBackground !== false) {
      ctx.filter = `blur(${blurAmt * 10}px)`;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    // Simple refraction simulation using displacement
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0, w, h);
    
    const blockSize = Math.max(2, Math.floor(refraction * 10));

    for (let y = 0; y < h; y += blockSize) {
      for (let x = 0; x < w; x += blockSize) {
        const offsetX = Math.sin(y * 0.1) * distortion * 50;
        const offsetY = Math.cos(x * 0.1) * distortion * 50;
        ctx.drawImage(tempCanvas, x, y, blockSize, blockSize, x + offsetX, y + offsetY, blockSize, blockSize);
      }
    }
  }

  private static applyBlur(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    const length = p.length ?? 20;
    const angle = (p.angle ?? 0) * (Math.PI / 180);
    
    ctx.clearRect(0, 0, w, h);
    if (p.showBackground !== false) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, w, h);
    }
    
    const steps = Math.max(1, Math.floor(length));
    ctx.globalAlpha = 1 / steps;
    
    for (let i = 0; i < steps; i++) {
      const offset = i - steps / 2;
      const x = Math.cos(angle) * offset;
      const y = Math.sin(angle) * offset;
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.globalAlpha = 1.0;
  }

  private static applyTrace(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    const sensitivity = p.sensitivity ?? 0.5;
    const density = p.density ?? 0.4;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0, w, h);
    const imageData = tempCtx.getImageData(0, 0, w, h).data;

    if (p.showBackground) {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    let currentSeed = 1337;
    const random = () => {
      currentSeed = (currentSeed * 16807) % 2147483647;
      return (currentSeed - 1) / 2147483646;
    };

    const getBrightness = (x: number, y: number) => {
      const px = Math.floor(Math.max(0, Math.min(w - 1, x)));
      const py = Math.floor(Math.max(0, Math.min(h - 1, y)));
      const idx = (py * w + px) * 4;
      return (imageData[idx] * 0.299 + imageData[idx + 1] * 0.587 + imageData[idx + 2] * 0.114) / 255;
    };

    const lines = Math.floor(density * 5000);
    for (let i = 0; i < lines; i++) {
      let x = random() * w;
      let y = random() * h;
      
      // Only start lines in areas that aren't too dark
      if (getBrightness(x, y) < (1 - sensitivity) * 0.5) continue;

      ctx.beginPath();
      ctx.moveTo(x, y);
      
      for (let j = 0; j < 30; j++) {
        const b = getBrightness(x, y);
        
        // Calculate gradient
        const bRight = getBrightness(x + 2, y);
        const bLeft = getBrightness(x - 2, y);
        const bDown = getBrightness(x, y + 2);
        const bUp = getBrightness(x, y - 2);
        
        const gx = bRight - bLeft;
        const gy = bDown - bUp;
        
        // Move along the contour (perpendicular to gradient) or along gradient
        // To "fit" the image, we follow the contours (edges)
        // Perpendicular to (gx, gy) is (-gy, gx)
        const speed = 5;
        const mag = Math.sqrt(gx * gx + gy * gy) || 1;
        
        // Add some noise to prevent getting stuck
        const nx = (random() - 0.5) * 2;
        const ny = (random() - 0.5) * 2;
        
        if (mag < 0.01) {
          x += (random() - 0.5) * 10;
          y += (random() - 0.5) * 10;
        } else {
          // Follow contour
          x += (-gy / mag) * speed + nx;
          y += (gx / mag) * speed + ny;
        }
        
        if (x < 0 || x >= w || y < 0 || y >= h) break;
        
        // Fade out lines in darker areas
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, b * 0.5)})`;
        ctx.lineTo(x, y);
        
        if (b < (1 - sensitivity) * 0.2) break;
      }
      ctx.stroke();
    }
  }

  private static applyVision(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, img: HTMLImageElement) {
    if (p.showBackground !== false) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    
    const boxesCount = Math.floor(p.boxes ?? 10);
    const boxSize = p.boxSize ?? 1.0;
    const shape = p.shape ?? 'rectangle';
    const transparency = p.transparency ?? 1.0;
    const seed = p.seed ?? 0;
    
    let currentSeed = 1337 + Math.floor(seed);
    const random = () => {
      currentSeed = (currentSeed * 16807) % 2147483647;
      return (currentSeed - 1) / 2147483646;
    };

    // Find regions of interest (high contrast/edges)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0, w, h);
    const imgData = tempCtx.getImageData(0, 0, w, h).data;

    const gridSize = 20;
    const cellW = w / gridSize;
    const cellH = h / gridSize;
    
    const cells: {cx: number, cy: number, score: number}[] = [];
    
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let minL = 255;
        let maxL = 0;
        
        // Sample points in the cell to find contrast
        for (let i = 0; i < 10; i++) {
          const px = Math.floor(gx * cellW + random() * cellW);
          const py = Math.floor(gy * cellH + random() * cellH);
          // Ensure within bounds
          const safeX = Math.min(Math.max(px, 0), w - 1);
          const safeY = Math.min(Math.max(py, 0), h - 1);
          const idx = (safeY * w + safeX) * 4;
          const r = imgData[idx], g = imgData[idx+1], b = imgData[idx+2];
          const l = r*0.299 + g*0.587 + b*0.114;
          if (l < minL) minL = l;
          if (l > maxL) maxL = l;
        }
        
        cells.push({
          cx: gx * cellW + cellW / 2,
          cy: gy * cellH + cellH / 2,
          score: maxL - minL
        });
      }
    }
    
    // Sort cells by contrast score descending
    cells.sort((a, b) => b.score - a.score);
    
    // Take the top ones, add some randomness so it's not always the exact same if seed changes
    const topCells = cells.slice(0, Math.max(boxesCount * 2, 20));
    
    // Shuffle top cells based on seed
    for (let i = topCells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [topCells[i], topCells[j]] = [topCells[j], topCells[i]];
    }
    
    const selectedCells = topCells.slice(0, boxesCount);
    
    const keyPoints: {x: number, y: number}[] = [];
    for (let i = 0; i < Math.min(8, selectedCells.length); i++) {
      const cell = selectedCells[i];
      keyPoints.push({
        x: cell.cx + (random() - 0.5) * cellW * 0.5,
        y: cell.cy + (random() - 0.5) * cellH * 0.5
      });
    }

    const labels = ["0.1429", "0.2857", "0.4286", "0.5714", "0.7143", "0.8571", "1.0000", "1.1429", "1.2857", "1.4286"];
    
    const boxes: {x: number, y: number, bw: number, bh: number, cx: number, cy: number}[] = [];

    ctx.globalAlpha = transparency;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.textBaseline = 'top';

    for (let i = 0; i < selectedCells.length; i++) {
      const cell = selectedCells[i];
      
      const bw = (cellW * 1.5 + random() * cellW * 2) * boxSize;
      const bh = (cellH * 1.5 + random() * cellH * 2) * boxSize;
      
      const cx = cell.cx + (random() - 0.5) * cellW;
      const cy = cell.cy + (random() - 0.5) * cellH;
      
      const x = cx - bw/2;
      const y = cy - bh/2;
      
      boxes.push({x, y, bw, bh, cx, cy});
      
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.ellipse(cx, cy, bw/2, bh/2, 0, 0, Math.PI*2);
        ctx.stroke();
      } else if (shape === 'rounded') {
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, 10);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, bw, bh);
      }
      
      const label = labels[i % labels.length];
      
      // Draw label background for readability
      ctx.font = '10px monospace';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * transparency})`;
      ctx.fillRect(x, y, textWidth + 4, 14);
      
      ctx.fillStyle = `rgba(255, 255, 255, ${transparency})`;
      ctx.fillText(label, x + 2, y + 2);
    }
    
    // Connect some boxes with thin white lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * transparency})`;
    for (let i = 0; i < boxes.length - 1; i++) {
      if (random() > 0.3) { // 70% chance to connect to next box
        ctx.beginPath();
        ctx.moveTo(boxes[i].cx, boxes[i].cy);
        ctx.lineTo(boxes[i+1].cx, boxes[i+1].cy);
        ctx.stroke();
      }
      
      // Connect to key points
      if (random() > 0.6 && keyPoints.length > 0) {
        const kp = keyPoints[Math.floor(random() * keyPoints.length)];
        ctx.beginPath();
        ctx.moveTo(boxes[i].cx, boxes[i].cy);
        ctx.lineTo(kp.x, kp.y);
        ctx.stroke();
        
        // Draw a small crosshair at the key point
        ctx.beginPath();
        ctx.moveTo(kp.x - 3, kp.y);
        ctx.lineTo(kp.x + 3, kp.y);
        ctx.moveTo(kp.x, kp.y - 3);
        ctx.lineTo(kp.x, kp.y + 3);
        ctx.stroke();
      }
    }
  }

  private static applyBitcrush(ctx: CanvasRenderingContext2D, w: number, h: number, p: any, imageData: ImageData) {
    const data = imageData.data;
    const shift = 0; // Removed colorShift
    const blockSize = Math.max(1, Math.floor(p.blockSize ?? 4));
    const banding = p.banding ?? 1.0;
    const ditherAmount = p.dither ?? 0.0;

    // Create a temporary array for processing
    const tempData = new Uint8ClampedArray(data);

    // Apply blockiness (pixelation)
    if (blockSize > 1) {
      for (let y = 0; y < h; y += blockSize) {
        for (let x = 0; x < w; x += blockSize) {
          // Calculate average color for the block
          let r = 0, g = 0, b = 0, count = 0;
          
          for (let by = 0; by < blockSize && y + by < h; by++) {
            for (let bx = 0; bx < blockSize && x + bx < w; bx++) {
              const i = ((y + by) * w + (x + bx)) * 4;
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              count++;
            }
          }
          
          r /= count;
          g /= count;
          b /= count;

          // Apply to the block
          for (let by = 0; by < blockSize && y + by < h; by++) {
            for (let bx = 0; bx < blockSize && x + bx < w; bx++) {
              const i = ((y + by) * w + (x + bx)) * 4;
              tempData[i] = r;
              tempData[i + 1] = g;
              tempData[i + 2] = b;
            }
          }
        }
      }
    }

    // Apply banding and dithering
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        
        // Add simple ordered dither based on position
        let ditherVal = 0;
        if (ditherAmount > 0) {
          // Bayer matrix 4x4
          const bayer = [
            [ 0,  8,  2, 10],
            [12,  4, 14,  6],
            [ 3, 11,  1,  9],
            [15,  7, 13,  5]
          ];
          const bayerVal = bayer[y % 4][x % 4] / 16.0 - 0.5;
          ditherVal = bayerVal * 255 * ditherAmount;
        }

        const oldR = tempData[i];
        const oldG = tempData[i + 1];
        const oldB = tempData[i + 2];

        // Apply color shift (bitwise shift for glitchy bitcrush effect)
        const shiftedR = ((oldR + ditherVal) << shift) & 0xFF;
        const shiftedG = ((oldG + ditherVal) << shift) & 0xFF;
        const shiftedB = ((oldB + ditherVal) << shift) & 0xFF;
        
        // If shift is 0, we still want to apply banding/posterization
        // to keep the "crushed" feel even without the psychedelic color shift
        const step = 255 / 15; // Default 4-bit posterization base
        const newR = shift > 0 ? shiftedR : Math.round((oldR + ditherVal) / step) * step;
        const newG = shift > 0 ? shiftedG : Math.round((oldG + ditherVal) / step) * step;
        const newB = shift > 0 ? shiftedB : Math.round((oldB + ditherVal) / step) * step;

        // Mix with original based on banding intensity
        data[i] = oldR * (1 - banding) + newR * banding;
        data[i + 1] = oldG * (1 - banding) + newG * banding;
        data[i + 2] = oldB * (1 - banding) + newB * banding;

        if (p.showBackground === false) {
          // If background is transparent, make white pixels transparent
          if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
            data[i + 3] = 0;
          }
        }
      }
    }

    if (p.showBackground === false) {
      ctx.clearRect(0, 0, w, h);
    }
    ctx.putImageData(imageData, 0, 0);
  }
}
