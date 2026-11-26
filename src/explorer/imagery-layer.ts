import type { Vec } from './catalog';
import { add, clamp, type camera, dot, length, scale, smooth, sub, unit } from './camera';
import { destinationPlates, galacticVector, imageCoverage, type ImageDestination, plateAxes, surveyU, surveyV } from './imagery';

type Eye = ReturnType<typeof camera>;
type Key = ImageDestination | 'milky-way';
type Raster = { canvas: HTMLCanvasElement; pen: CanvasRenderingContext2D };

function raster(): Raster | undefined {
  const canvas = document.createElement('canvas');
  const pen = canvas.getContext('2d');
  if (pen) return { canvas, pen };
}

export class ImageryLayer {
  private readonly assets = new Map<Key, HTMLImageElement | null>();
  private survey?: { width: number; height: number; pixels: Uint32Array };
  private reprojected?: Raster;
  private output?: ImageData;
  private projectionKey = '';

  constructor(private readonly invalidate?: () => void) {}

  private image(key: Key) {
    if (!this.assets.has(key)) {
      this.assets.set(key, null);
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        this.assets.set(key, image);
        this.invalidate?.();
      };
      image.src = `${import.meta.env.BASE_URL}explorer/imagery/${key}.webp`;
    }
    return this.assets.get(key);
  }

  destination(pen: CanvasRenderingContext2D, id: ImageDestination, target: Vec, eye: Eye, w: number, h: number, opacity: number, horizonUp: Vec, minElevation: number) {
    if (opacity < .01) return 0;
    const { x, y, hw, hh, radius } = destinationPlates[id];
    const range = length(target);
    if (range <= radius * .15) return 0;
    const toward = unit(target);
    if (dot(toward, horizonUp) + radius / range < minElevation) return 0;
    const { right, up } = plateAxes(id, toward);
    const center = add(add(target, scale(right, x)), scale(up, y));
    const depth = dot(center, eye.forward);
    if (depth <= radius * .20) return 0;
    const cx = dot(center, eye.right) / depth, cy = -dot(center, eye.up) / depth;
    const sx = w / 2 + eye.focal * cx, sy = h / 2 + eye.focal * cy;
    const f = eye.focal / depth;
    const rz = dot(right, eye.forward), uz = dot(up, eye.forward);
    // Jacobian of the perspective transform at plate center. The billboard takes one draw call.
    const ax = hw * f * (dot(right, eye.right) - cx * rz);
    const ay = hw * f * (-dot(right, eye.up) - cy * rz);
    const bx = -hh * f * (dot(up, eye.right) - cx * uz);
    const by = -hh * f * (-dot(up, eye.up) - cy * uz);
    const halfW = Math.abs(ax) + Math.abs(bx), halfH = Math.abs(ay) + Math.abs(by);
    if (sx + halfW < 0 || sx - halfW > w || sy + halfH < 0 || sy - halfH > h) return 0;
    const alpha = opacity * imageCoverage(2 * Math.max(halfW, halfH)) * smooth(clamp((range / radius - .15) / .60, 0, 1));
    if (alpha < .01) return 0;
    const image = this.image(id);
    if (!image) return 0;
    pen.save();
    pen.globalAlpha = alpha;
    pen.globalCompositeOperation = 'screen';
    pen.transform(ax, ay, bx, by, sx, sy);
    pen.drawImage(image, -1, -1, 2, 2);
    pen.restore();
    return alpha;
  }

  milkyWay(pen: CanvasRenderingContext2D, eye: Eye, w: number, h: number, opacity: number) {
    const forward = galacticVector(eye.forward);
    // Keep work and downloads off frames that can't see the main Galactic band.
    const halfX = w / (2 * eye.focal), halfY = h / (2 * eye.focal);
    const clearance = Math.abs(Math.asin(clamp(forward[2], -1, 1))) - Math.atan(Math.hypot(halfX, halfY));
    opacity *= 1 - smooth(clamp((clearance - .43) / .25, 0, 1));
    if (opacity < .015) return false;
    const image = this.image('milky-way');
    if (!image) return false;
    if (!this.survey) {
      const source = raster();
      this.reprojected = raster();
      if (!source || !this.reprojected) return false;
      source.canvas.width = image.naturalWidth; source.canvas.height = image.naturalHeight;
      source.pen.drawImage(image, 0, 0);
      const { data, width, height } = source.pen.getImageData(0, 0, source.canvas.width, source.canvas.height);
      // Put black in the alpha channel so the large composite can use accelerated source-over.
      for (let i = 0; i < data.length; i += 4) {
        const alpha = Math.max(data[i], data[i + 1], data[i + 2]);
        if (alpha) {
          const normal = 255 / alpha;
          data[i] *= normal; data[i + 1] *= normal; data[i + 2] *= normal;
        }
        data[i + 3] = alpha;
      }
      this.survey = { width, height, pixels: new Uint32Array(data.buffer) };
    }
    const { canvas, pen: rasterPen } = this.reprojected!;
    // Software projection stays low-resolution and bounded (~26k samples max). It remains usable without WebGL.
    const factor = Math.min(1, 224 / Math.max(w, h), Math.sqrt(25_500 / (w * h)));
    const width = Math.max(1, Math.round(w * factor)), height = Math.max(1, Math.round(h * factor));
    if (canvas.width !== width || canvas.height !== height || !this.output) {
      canvas.width = width; canvas.height = height;
      this.output = rasterPen.createImageData(width, height);
      this.projectionKey = '';
    }
    const right = galacticVector(eye.right), up = galacticVector(eye.up);
    const key = [...forward, ...right, ...up, halfX, halfY].join(',');
    if (this.projectionKey !== key) {
      this.projectionKey = key;
      const { pixels: src, width: sw, height: sh } = this.survey;
      const dst = new Uint32Array(this.output.data.buffer);
      const dx = 2 * halfX / width, dy = 2 * halfY / height;
      const rx = dx * right[0], ry = dx * right[1], rz = dx * right[2];
      for (let row = 0, i = 0; row < height; row++) {
        const v = halfY - (row + .5) * dy;
        let x = forward[0] + v * up[0] - (halfX - dx * .5) * right[0];
        let y = forward[1] + v * up[1] - (halfX - dx * .5) * right[1];
        let z = forward[2] + v * up[2] - (halfX - dx * .5) * right[2];
        for (let col = 0; col < width; col++, i++) {
          const sx = Math.floor(sw * surveyU(x, y)) % sw;
          const sy = Math.min(sh - 1, Math.floor(sh * surveyV(x, y, z)));
          dst[i] = src[sy * sw + sx];
          x += rx; y += ry; z += rz;
        }
      }
      rasterPen.putImageData(this.output, 0, 0);
    }
    pen.save();
    pen.globalAlpha = opacity;
    pen.drawImage(canvas, 0, 0, w, h);
    pen.restore();
    return true;
  }
}
