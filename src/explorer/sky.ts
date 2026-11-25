import { type SkyObject, type Vec } from './catalog';
import { add, apparentMagnitude, camera, clamp, DEG, direction, dot, type Frame, length, scale, sub, unit } from './camera';

type Point = { x: number; y: number; distance: number };
export type SkyView = {
  position: Vec; frame: Frame; yaw: number; pitch: number; zoom: number;
  ground: boolean; sun: Vec; faintLimit: number; locale: 'en' | 'zh';
  objects: SkyObject[]; skyObjects: SkyObject[]; edges: readonly [string, string][];
  members?: Set<string>; focus: number; target?: string;
};
const PC_KM = 3.08567758149e13;
const colors = ['190,213,255', '238,239,255', '255,236,200', '255,183,131'];
const bodyColors: Record<string, string> = { sun: '#fff4ce', moon: '#d2c6b3', earth: '#70b5e5', mars: '#d88a65', venus: '#f0cda5', jupiter: '#d7ac8c', saturn: '#dfc692', uranus: '#8fcad0', neptune: '#678eda' };

export class Sky {
  private pen: CanvasRenderingContext2D;
  private hits: { x: number; y: number; object: SkyObject; radius: number }[] = [];
  private brushes = new Map<string, HTMLCanvasElement>();
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private canvas: HTMLCanvasElement) {
    const pen = canvas.getContext('2d', { alpha: false });
    if (!pen) throw new Error('Canvas unavailable');
    this.pen = pen;
  }

  pick(x: number, y: number) {
    return this.hits.reduce<{ object?: SkyObject; distance: number }>((best, hit) => {
      const distance = Math.hypot(hit.x - x, hit.y - y);
      return distance < hit.radius && distance < best.distance ? { object: hit.object, distance } : best;
    }, { distance: Infinity }).object;
  }

  private brush(rgb: string) {
    const known = this.brushes.get(rgb);
    if (known) return known;
    const image = document.createElement('canvas');
    image.width = image.height = 32;
    const pen = image.getContext('2d')!;
    const light = pen.createRadialGradient(16, 16, 0, 16, 16, 16);
    light.addColorStop(0, `rgba(${rgb},.83)`);
    light.addColorStop(.23, `rgba(${rgb},.27)`);
    light.addColorStop(1, `rgba(${rgb},0)`);
    pen.fillStyle = light;
    pen.fillRect(0, 0, 32, 32);
    this.brushes.set(rgb, image);
    return image;
  }

  draw(view: SkyView) {
    const { canvas, pen } = this;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, w * h > 1_100_000 ? 1.35 : 1.65);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    pen.setTransform(dpr, 0, 0, dpr, 0, 0);
    const eye = camera(view.frame, view.yaw, view.pitch, w, h, view.zoom);
    const sunDir = unit(sub(view.sun, view.position));
    const sunAlt = dot(sunDir, view.frame.up);
    const day = view.ground ? clamp((sunAlt + .13) / .25, 0, 1) : 0;
    const dusk = view.ground ? clamp(1 - Math.abs(sunAlt + .07) * 9, 0, 1) : 0;
    const tint = (night: number[], light: number[], fade: number) => `rgb(${night.map((n, i) => Math.round(n + (light[i] - n) * fade)).join(',')})`;
    const project = (v: Vec): Point | undefined => {
      const z = dot(v, eye.forward);
      if (z <= 0) return;
      const x = w / 2 + eye.focal * dot(v, eye.right) / z;
      const y = h / 2 - eye.focal * dot(v, eye.up) / z;
      return { x, y, distance: length(v) };
    };
    const vertical = (upDot: number) => h / 2 + eye.focal * Math.tan(clamp(view.pitch - upDot, -1.46, 1.46));
    const horizon = vertical(0);
    const gradient = pen.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, tint([5, 10, 24], [19, 73, 132], day));
    gradient.addColorStop(1, tint([15, 26, 53], [107, 161, 191], day));
    pen.fillStyle = gradient; pen.fillRect(0, 0, w, h);
    if (view.ground && horizon > -80 && horizon < h + 280) {
      const glow = pen.createLinearGradient(0, horizon - h * .31, 0, horizon);
      glow.addColorStop(0, 'transparent');
      glow.addColorStop(1, `rgba(${dusk > .09 ? '229,134,105' : '119,163,203'},${.13 + dusk * .44 + day * .12})`);
      pen.fillStyle = glow; pen.fillRect(0, 0, w, h);
    }
    const sunPoint = project(sunDir);
    if (sunPoint && day > 0 && sunPoint.x > -w && sunPoint.x < 2 * w && sunPoint.y > -h && sunPoint.y < 2 * h) {
      const haze = pen.createRadialGradient(sunPoint.x, sunPoint.y, 1, sunPoint.x, sunPoint.y, Math.max(w, h) * .68);
      haze.addColorStop(0, `rgba(255,222,159,${.53 * day})`);
      haze.addColorStop(1, 'transparent');
      pen.fillStyle = haze; pen.fillRect(0, 0, w, h);
    }
    const edgeIds = new Set(view.edges.flat());
    const points = new Map<string, Point>();
    const labels: { point: Point; object: SkyObject; radius: number }[] = [];
    const disks: { point: Point; object: SkyObject; radius: number; vector: Vec }[] = [];
    this.hits = [];
    const skyLimit = view.faintLimit - (view.ground ? day * 9 + dusk * 1.6 : 0);
    for (const object of [...view.objects, ...view.skyObjects]) {
      const member = view.members?.has(object.id) ?? false;
      if (view.focus >= .999 && !member) continue;
      const vector = sub(object.position, view.position);
      if (dot(vector, eye.forward) <= 0) continue;
      if (view.ground && dot(vector, view.frame.up) <= 0) continue;
      const body = object.kind === 'sun' || object.kind === 'moon' || object.kind === 'planet';
      const landmark = !view.ground && object.id === view.target;
      const anchor = (member && !view.ground) || landmark || (body && object.kind !== 'planet');
      // Earth is only ~5 microparsecs from the Sun. Use catalog V magnitudes here,
      // so a daytime or light-polluted sky can reject faint stars before projection.
      if (view.ground && !anchor && object.mag > skyLimit) continue;
      const point = project(vector)!;
      const onScreen = point.x >= -40 && point.x <= w + 40 && point.y >= -40 && point.y <= h + 40;
      if (point.distance < 1e-13 || (!onScreen && !edgeIds.has(object.id))) continue;
      const mag = !view.ground && object.absolute != null ? apparentMagnitude(object.absolute, point.distance) : object.mag;
      if (!anchor && mag > skyLimit) continue;
      if (edgeIds.has(object.id)) points.set(object.id, point);
      if (!onScreen) continue;
      const alpha = (member ? 1 : 1 - view.focus) * clamp(.28 + (skyLimit - mag) * .18, .25, 1);
      const radius = object.radiusKm ? Math.min(Math.max(w, h), eye.focal * object.radiusKm / PC_KM / point.distance) : 0;
      if (body && (radius > 1.7 || landmark)) {
        disks.push({ point, object, radius: Math.max(radius, 2), vector });
        this.hits.push({ ...point, object, radius: Math.max(22, radius) });
        labels.push({ point, object, radius: Math.max(3, radius) });
        continue;
      }
      const color = colors[(object.bv ?? .55) < .16 ? 0 : (object.bv ?? .55) < .52 ? 1 : (object.bv ?? .55) < .99 ? 2 : 3];
      const size = clamp(1.12 - mag * .125, .42, 2.7);
      const diffuse = object.kind === 'nebula' || object.kind === 'galaxy' || object.kind === 'cluster';
      pen.globalAlpha = alpha;
      if (mag < 2.1 || diffuse || landmark) {
        const halo = diffuse ? (landmark ? 55 : 7) : (size * 3.2 + 2);
        pen.drawImage(this.brush(diffuse ? '167,155,224' : color), point.x - halo, point.y - halo, halo * 2, halo * 2);
      }
      pen.fillStyle = `rgb(${color})`;
      pen.beginPath(); pen.arc(point.x, point.y, size, 0, 2 * Math.PI); pen.fill();
      if (mag < 1 || landmark || member || body) {
        this.hits.push({ ...point, object, radius: 22 });
        if ((mag < .85 && object.name && !/^HIP |^HD |^HR /.test(object.name)) || landmark || body) labels.push({ point, object, radius: 1 });
      }
    }
    pen.globalAlpha = 1;
    pen.strokeStyle = `rgba(211,197,154,${view.ground ? .50 - .23 * day : .48})`;
    pen.lineWidth = .9;
    pen.beginPath();
    for (const [a, b] of view.edges) {
      const start = points.get(a), end = points.get(b);
      if (!start || !end) continue;
      pen.moveTo(start.x, start.y); pen.lineTo(end.x, end.y);
    }
    pen.stroke();
    disks.sort((a, b) => b.point.distance - a.point.distance);
    for (const disk of disks) this.body(disk.object, disk.point, disk.radius, disk.vector, eye, view.sun, 1 - view.focus);
    if (view.ground) this.land(w, h, horizon, eye.focal, view.yaw, day, dusk);
    const occupied: { x: number; y: number; width: number }[] = [];
    labels.sort((a, b) => (b.object.id === view.target ? 100 : b.radius) - (a.object.id === view.target ? 100 : a.radius));
    pen.font = `12px 'Segoe UI', 'Microsoft YaHei', sans-serif`;
    pen.textBaseline = 'middle';
    for (const { point, object, radius } of labels) {
      if (occupied.length > 16) break;
      const name = (view.locale === 'zh' && object.zh) || object.name;
      const x = point.x + radius + 9, y = point.y + 1;
      const width = pen.measureText(name).width;
      if (x < 8 || x + width > w - 8 || y < 10 || y > h - 10 || (view.ground && y > horizon) || occupied.some(label => Math.abs(label.y - y) < 18 && x < label.x + label.width + 7 && x + width > label.x - 7)) continue;
      pen.globalAlpha = view.members?.has(object.id) ? 1 : 1 - view.focus;
      pen.strokeStyle = '#0b142b'; pen.lineWidth = 3;
      pen.strokeText(name, x, y);
      pen.fillStyle = '#f2e8d4'; pen.fillText(name, x, y);
      occupied.push({ x, y, width });
    }
    pen.globalAlpha = 1;
  }

  private body(object: SkyObject, p: Point, radius: number, vector: Vec, eye: ReturnType<typeof camera>, sun: Vec, opacity: number) {
    const pen = this.pen;
    const { x, y } = p;
    const color = bodyColors[object.id] ?? '#b4a89b';
    const emissive = object.kind === 'sun';
    const light = unit(sub(sun, object.position));
    const towardObserver = unit(scale(vector, -1));
    const phase = clamp(dot(towardObserver, light), -1, 1);
    const lightX = dot(light, eye.right), lightY = -dot(light, eye.up);
    const small = radius < 4;
    pen.globalAlpha = opacity;
    if (emissive || small) {
      const r = radius * (emissive ? 5 : 2.8);
      pen.drawImage(this.brush(emissive ? '255,211,133' : '211,224,251'), x - r, y - r, 2 * r, 2 * r);
    }
    if (object.id === 'saturn' && !small) {
      pen.save(); pen.translate(x, y); pen.rotate(-.39);
      pen.strokeStyle = '#c5ad87'; pen.lineWidth = radius * .23;
      pen.beginPath(); pen.ellipse(0, 0, radius * 1.78, radius * .50, 0, 0, Math.PI * 2); pen.stroke(); pen.restore();
    }
    pen.save(); pen.translate(x, y);
    pen.beginPath(); pen.arc(0, 0, radius, 0, 2 * Math.PI); pen.clip();
    pen.fillStyle = emissive ? color : '#161e31'; pen.fillRect(-radius, -radius, 2 * radius, 2 * radius);
    if (!emissive && !small) {
      pen.rotate(Math.atan2(lightY, lightX));
      pen.beginPath(); pen.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2);
      if (Math.abs(phase) > .001) pen.ellipse(0, 0, radius * Math.abs(phase), radius, 0, Math.PI / 2, 3 * Math.PI / 2, phase < 0);
      pen.closePath(); pen.clip();
    }
    const tone = pen.createRadialGradient(-radius * .24, -radius * .28, radius * .10, 0, 0, radius * 1.12);
    tone.addColorStop(0, emissive ? '#fffdf0' : color);
    tone.addColorStop(.63, color); tone.addColorStop(1, emissive ? '#d88047' : '#565063');
    pen.fillStyle = tone; pen.fillRect(-radius, -radius, 2 * radius, 2 * radius);
    if (!small && !this.reduced.matches && (object.id === 'jupiter' || object.id === 'earth' || object.id === 'moon')) {
      // Suggest surface structure without presenting a texture as observational data.
      pen.rotate(-Math.atan2(lightY, lightX));
      pen.globalAlpha = opacity * .19;
      pen.fillStyle = object.id === 'earth' ? '#a5dfbc' : '#705259';
      for (let i = 0; i < 7; i++) {
        pen.beginPath();
        pen.ellipse(Math.sin(i * 1.97) * radius * .65, (i - 3) * radius * .25, radius * (object.id === 'jupiter' ? .92 : .24 + .09 * (i % 3)), radius * (.05 + .025 * (i % 4)), -.12 + .03 * i, 0, Math.PI * 2); pen.fill();
      }
    }
    pen.restore(); pen.globalAlpha = 1;
  }

  private land(w: number, h: number, horizon: number, focal: number, yaw: number, day: number, dusk: number) {
    if (horizon >= h + 50) return;
    const pen = this.pen;
    const height = (x: number, layer: number) => {
      const a = yaw + Math.atan((x - w / 2) / focal);
      const rise = .32 + .18 * Math.sin(a * (7 + layer) + layer * 3) + .14 * Math.sin(a * 19 - layer) + .10 * Math.sin(a * 33 + layer) + .046 * Math.sin(a * 67);
      return Math.max(-100, horizon - rise * (layer ? 37 : 64) * Math.max(.65, h / 850) + layer * 7);
    };
    for (let layer = 0; layer < 2; layer++) {
      pen.beginPath(); pen.moveTo(0, h);
      for (let x = 0; x < w; x += 4) pen.lineTo(x, height(x, layer));
      pen.lineTo(w, height(w, layer)); pen.lineTo(w, h); pen.closePath();
      const land = pen.createLinearGradient(0, Math.min(h - 1, Math.max(0, horizon - 40)), 0, h);
      land.addColorStop(0, layer ? `rgb(${10 + Math.round(day * 16)},${18 + Math.round(day * 23)},${32 + Math.round(day * 22)})` : `rgb(${26 + Math.round(dusk * 25 + day * 28)},${36 + Math.round(day * 31)},${59 + Math.round(day * 28)})`);
      land.addColorStop(1, '#080e1c'); pen.fillStyle = land; pen.fill();
    }
  }
}
