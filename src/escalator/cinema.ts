export const CINEMA_SECONDS = 9;
const TAU = Math.PI * 2;
const colors = ['#ffd485', '#a6f4ee', '#f8b4d9', '#e7ceff'];
export interface CinemaSpark { x: number; y: number; tailX: number; tailY: number; alpha: number; size: number; color: string }
const noise = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Analytic particles stay bounded and reproducible, regardless of frame rate or tab suspension.
export function cinemaSparks(seconds: number): CinemaSpark[] {
  if (seconds < 0 || seconds >= CINEMA_SECONDS) return [];
  const sparks: CinemaSpark[] = [];
  for (let burst = 0; burst < 8; burst++) {
    const age = seconds - (0.85 + burst * 0.65);
    if (age < 0 || age > 3.3) continue;
    const cx = .17 + noise(burst + 1) * .66, cy = .18 + noise(burst + 20) * .23;
    for (let i = 0; i < 100; i++) {
      const angle = i * TAU / 100 + noise(burst + 50) * TAU;
      const speed = .06 + noise(i + burst * 113) * .1;
      const radius = speed * (1 - Math.exp(-age * 1.15));
      const previous = Math.max(0, age - .18), tail = speed * (1 - Math.exp(-previous * 1.15));
      const perspective = .7 + noise(i + 880) * .3;
      sparks.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * perspective + age * age * .019,
        tailX: cx + Math.cos(angle) * tail, tailY: cy + Math.sin(angle) * tail * perspective + previous * previous * .019,
        alpha: Math.min(1, age * 6) * Math.pow(1 - age / 3.3, 1.6), size: 1 + noise(i + 440) * 1.8, color: colors[burst % colors.length] });
    }
  }
  return sparks;
}

export function createCinematicCelebration(host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'cinema-canvas'; canvas.setAttribute('aria-hidden', 'true'); canvas.hidden = true;
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  let start: number | null = null, lastWidth = 0, lastHeight = 0, lastRatio = 0;
  const sprites = new Map<string, HTMLCanvasElement>();
  function sprite(color: string) {
    let cached = sprites.get(color); if (cached) return cached;
    cached = document.createElement('canvas'); cached.width = cached.height = 48;
    const c = cached.getContext('2d')!;
    const glow = c.createRadialGradient(24, 24, 0, 24, 24, 24);
    glow.addColorStop(0, '#fffef4'); glow.addColorStop(.12, color); glow.addColorStop(.35, `${color}90`); glow.addColorStop(1, `${color}00`);
    c.fillStyle = glow; c.fillRect(0, 0, 48, 48); sprites.set(color, cached); return cached;
  }
  return {
    render(active: boolean, reducedMotion: boolean, now: number) {
      canvas.hidden = !active;
      if (!active) { start = null; return; }
      if (!ctx) return;
      if (start === null) start = now;
      const time = reducedMotion ? 2.1 : Math.min(CINEMA_SECONDS, Math.max(0, (now - start) / 1000));
      const width = host.clientWidth, height = host.clientHeight, ratio = Math.min(1.5, window.devicePixelRatio || 1);
      if (!width || !height) return;
      if (width !== lastWidth || height !== lastHeight || ratio !== lastRatio) {
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        lastWidth = width; lastHeight = height; lastRatio = ratio;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
      const fade = reducedMotion ? 1 : Math.min(1, time * 1.5, (CINEMA_SECONDS - time) / 1.3);
      ctx.globalAlpha = Math.max(0, fade); ctx.globalCompositeOperation = 'source-over';
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#07162ae8'); sky.addColorStop(.6, '#162c4350'); sky.addColorStop(1, '#09242a90');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width, height * 1.65);
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 65; i++) {
        const x = noise(i + 1600) * width, y = noise(i + 1800) * height * .65;
        ctx.globalAlpha = fade * (.22 + noise(i) * .35);
        ctx.drawImage(sprite('#d5f7ee'), x - 3, y - 3, 6, 6);
      }
      // Long champagne trails, a wide atmospheric bloom and quiet reflections create depth.
      for (const spark of cinemaSparks(time)) {
        const x = width * .5 + (spark.x - .5) * scale, y = spark.y * height;
        const tx = width * .5 + (spark.tailX - .5) * scale, ty = spark.tailY * height;
        ctx.globalAlpha = spark.alpha * fade;
        ctx.strokeStyle = spark.color; ctx.lineWidth = spark.size * .65;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        const size = spark.size * 8;
        ctx.drawImage(sprite(spark.color), x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha *= .09;
        ctx.drawImage(sprite(spark.color), x - size, height - y * .35, size * 2, size * .45);
      }
      for (let burst = 0; burst < 8; burst++) {
        const age = time - (.85 + burst * .65), cx = .17 + noise(burst + 1) * .66, cy = .18 + noise(burst + 20) * .23;
        const x = width * .5 + (cx - .5) * scale, y = cy * height;
        if (age >= -.65 && age < 0 && !reducedMotion) {
          const climb = 1 + age / .65, sy = height - (height - y) * climb;
          ctx.globalAlpha = fade * .65; ctx.strokeStyle = '#f9d999'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x - age * 8, sy + 35); ctx.lineTo(x, sy); ctx.stroke();
          ctx.drawImage(sprite('#ffd485'), x - 12, sy - 12, 24, 24);
        }
        if (age >= 0 && age < 2) {
          ctx.globalAlpha = fade * .22 * (1 - age / 2);
          const bloom = 100 + age * 100;
          ctx.drawImage(sprite(colors[burst % colors.length]), x - bloom / 2, y - bloom / 2, bloom, bloom);
        }
      }
      ctx.globalAlpha = fade * .45; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#04111b';
      ctx.fillRect(0, 0, width, height * .045); ctx.fillRect(0, height * .955, width, height * .045);
      ctx.globalAlpha = 1;
    },
    dispose() { canvas.remove(); sprites.clear(); start = null; },
  };
}
