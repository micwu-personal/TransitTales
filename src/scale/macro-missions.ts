import type { Mission, Point, Shape } from './expedition-model';
import { gravity, GRAVITY_FRAMES, orbitFrames, rng, SOFTENING } from './physics';
import type { Vec } from './physics';

const tau = Math.PI * 2;
const origin: Point = [0, 0, 0];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const between = (a: Point, b: Point, t: number): Point => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const sample = <T>(n: number, make: (i: number) => T) => Array.from({ length: n }, (_, i) => make(i));
const orb = (at: Point, r: number, color: string, light?: string, alpha?: number): Shape => ({ kind: 'orb', at, r, color, light, alpha });
const line = (points: readonly Point[], color: string, width = 1, alpha = 1, closed = false): Shape => ({ kind: 'line', points, color, width, alpha, closed });
const face = (points: readonly Point[], color: string): Extract<Shape, { kind: 'face' }> => ({ kind: 'face', points, color });
const ring = (point: (a: number) => Point, color: string, width = 1, alpha = 1) =>
  sample(32, i => line([point(tau * i / 32), point(tau * (i + 1) / 32)], color, width, alpha));
const shade = (hex: string, gain: number): string => '#' + [1, 3, 5].map(i =>
  Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * gain)).toString(16).padStart(2, '0')).join('');
const lit = ([x, y, z]: Point) => .78 + .22 * (-.44 * x + .77 * y - .46 * z);
const pointOnBall = (a: number, b: number): Point => [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)];

// Each facet is separate so the painter can interleave objects at different depths.
function ellipsoid(center: Point, scale: Point, m: number, n: number, paint: (normal: Point, a: number, b: number) => string): Extract<Shape, { kind: 'face' }>[] {
  const vertex = (a: number, b: number): Point => {
    const p = pointOnBall(a, b);
    return add(center, [p[0] * scale[0], p[1] * scale[1], p[2] * scale[2]]);
  };
  return sample(m * n, i => {
    const a = tau * (i % m) / m, b = Math.PI * (Math.floor(i / m) / n - .5);
    const da = tau / m, db = Math.PI / n;
    return face([vertex(a, b), vertex(a + da, b), vertex(a + da, b + db), vertex(a, b + db)],
      paint(pointOnBall(a + da / 2, b + db / 2), a + da / 2, b + db / 2));
  });
}

function box([x, y, z]: Point, [w, h, d]: Point, tint: string): Shape[] {
  const a: Point = [x - w / 2, y - h / 2, z - d / 2], b: Point = [x + w / 2, y + h / 2, z + d / 2];
  const [l, f, n] = a, [r, t, s] = b;
  return [face([[l,f,n],[r,f,n],[r,t,n],[l,t,n]], tint), face([[r,f,n],[r,f,s],[r,t,s],[r,t,n]], shade(tint, .77)),
    face([[r,f,s],[l,f,s],[l,t,s],[r,t,s]], shade(tint, .88)), face([[l,f,s],[l,f,n],[l,t,n],[l,t,s]], shade(tint, .94)),
    face([[l,t,n],[r,t,n],[r,t,s],[l,t,s]], shade(tint, 1.13)), face([[l,f,s],[r,f,s],[r,f,n],[l,f,n]], shade(tint, .63))];
}

const houseBody: Shape[] = [
  ...box([0,-.96,0], [2.82,.18,2.36], '#527666'), ...box([0,-.25,0], [2.25,1.28,1.9], '#e2b788'),
  ...box([.46,-.48,-.965], [.43,.83,.05], '#89484a'), orb([.59,-.47,-1.005], .032, '#f9da86'),
  ...box([.55,-.87,-1.11], [.63,.13,.27], '#987e70'),
  ...[-.97,.97].flatMap(z => [-.61, .58].filter(x => z > 0 || x < 0).flatMap(x => [
    ...box([x,-.16,z], [.62,.51,.06], '#805653'), ...box([x,-.16,z * 1.042], [.49,.37,.04], '#6599a0'),
    ...box([x,-.16,z * 1.07], [.041,.38,.04], '#f5d5a0'), ...box([x,-.16,z * 1.07], [.50,.04,.04], '#f5d5a0'),
  ])),
  ...[-1,1].flatMap(s => [
    ...box([s*1.14,-.22,.21], [.049,.53,.76], '#855d54'), ...box([s*1.17,-.22,.21], [.03,.41,.61], '#78a6a4'),
    ...box([s*1.19,-.22,.21], [.025,.41,.042], '#f1d4ab'),
  ]),
  ...box([0,.4,0], [2.3,.08,1.94], '#f5d7a3'),
];
const roofPanel = (s: number, start: number, end: number, offset: Point, color: string) => face([
  add([s * start, 1.08 - .52 * start, -1.10], offset), add([s * end, 1.08 - .52 * end, -1.10], offset),
  add([s * end, 1.08 - .52 * end, 1.10], offset), add([s * start, 1.08 - .52 * start, 1.10], offset),
], color);
const house: Mission = {
  title: ['给房子穿外套', 'A coat for the house'], guide: ['拖动屋顶板，让保温层露出来。松手看热量提示。', 'Drag the roof panel to uncover the insulation. Release to watch the heat markers.'],
  handle: ['移动屋顶板', 'Slide the roof panel'], accent: '#ffd18a', initial: .24, duration: 2.4,
  frame(value, elapsed, baseline) {
    const shift: Point = [.58 * value, .97 * value, 0];
    const shapes = [...houseBody, roofPanel(-1,0,1.32,origin,'#9c5043'), roofPanel(1,0,1.27,[0,-.1,0],'#d99f57')];
    for (let i = 0; i < 9; i++) {
      const x = .13 + i * .13;
      shapes.push(line(sample(23, j => [x, .995 - .52 * x + .036 * Math.sin(j * 2.5), -1 + j * .091]), '#ffe1a0', 2));
    }
    const shingles = ['#bc6b4c','#c47853','#a75c48'];
    for (let i = 0; i < 7; i++) {
      shapes.push(roofPanel(1,i * .19,(i + 1) * .19,shift,shingles[i % 3]));
      shapes.push(roofPanel(-1,i * .19,(i + 1) * .19,[0,.007,0],shade(shingles[i % 3],.85)));
      shapes.push(line([add([i * .19,1.09 - .52 * i * .19,-1.105],shift),add([i * .19,1.09 - .52 * i * .19,1.105],shift)],'#824634',1));
    }
    for (const z of [-1.105, 1.105]) {
      shapes.push(face([add([0,1.08,z],shift),add([1.33,.388,z],shift),add([1.33,.315,z],shift),add([0,1.007,z],shift)],'#8e4e40'));
      shapes.push(face([[0,1.08,z],[-1.33,.388,z],[0,.42,z]],'#c18b67'));
    }
    const heat = (openness: number, ghost: boolean) => sample(7, i => {
      const progress = (elapsed * mix(.22,.62,openness) + i * .122) % 1;
      const z = -.82 + (i % 5) * .40;
      return orb([.28 + progress * .89 + (ghost ? -.14 : .13), .77 + progress * .89 + (i % 2) * .1, z], .035 + progress * .013,
        ghost ? '#b9b4a2' : '#ffd186', undefined, (ghost ? .30 : .87) * (1 - .7 * progress));
    });
    if (baseline !== null && Math.abs(baseline - value) > .01) shapes.push(...heat(baseline, true));
    shapes.push(...heat(value, false));
    return { shapes, grip: add([.76,.76,-1.13],shift) };
  },
  result(value) {
    return [`屋顶板拉开 ${Math.round(value * 100)}%。保温层仍在；模型里，多一层覆盖，热量就流得慢些。光点只表示热流快慢，不是温度测量。`,
      `Roof panel ${Math.round(value * 100)}% open. The insulation stays in place. Adding a cover slows the heat flow in this model. Dots show relative heat flow, not measured temperatures.`];
  },
};

const furBrown = '#c47956';
const furCream = '#f3c995';
const catFur = (color: string) => (p: Point) => shade(color, lit(p));
const catBody: Shape[] = [
  ...ellipsoid([.23,-.19,.06],[1.02,.55,.52],14,8,(p,a) => shade(p[1] > .18 && Math.sin(9 * a + 3 * p[1]) > .61 ? '#9b523e' : furBrown,lit(p))),
  ...ellipsoid([-.56,-.15,-.12],[.50,.55,.41],10,7,catFur(furCream)),
  ...ellipsoid([-.79,.22,-.27],[.61,.50,.47],14,8,(p,a) => shade(p[1] > .24 && Math.cos(a * 10) > .60 ? '#915041' : furBrown,lit(p))),
];
for (const s of [-1,1]) {
  const ex = -.79 + s * .34;
  const l: Point = [ex-.22,.45,-.44], r: Point = [ex+.21,.48,-.42], back: Point = [ex,.49,-.02], apex: Point = [ex+s*.16,1.00,-.32];
  catBody.push(face([l,r,apex],furBrown),face([r,back,apex],'#a45a47'),face([back,l,apex],'#bd7050'),
    face([between(l,apex,.15),between(r,apex,.16),between(between(l,r,.5),apex,.78)].map(p => add(p,[0,0,-.02])),'#e8a18c'));
  catBody.push(line([[ex-.11,.25,-.68],[ex-.03,.205,-.72],[ex+.06,.22,-.71],[ex+.13,.27,-.67]],'#532e32',2.4),
    orb([-.79+s*.14,.079,-.681],.128,furCream,'#ffe6bc'));
  for (let j = 0; j < 3; j++) catBody.push(line([[-.79+s*.15,.075,-.80],[-.79+s*(.69 + j*.04),.16-j*.09,-.78+j*.025]],'#f3d9b9',1));
}
catBody.push(orb([-.79,.11,-.805],.055,'#903f49','#da8f86'));
for (const x of [-.65, .68]) for (const z of [-.32,.35]) catBody.push(...ellipsoid([x,-.61,z],[.34,.16,.22],8,5,catFur(x < 0 ? furCream : furBrown)));
const cat: Mission = {
  title: ['一身毛，一层空气', 'A coat that holds air'], guide: ['拖动猫背上的毛被样片，让绒毛蓬起来。松手比较热量散出的快慢。', 'Drag the coat sample on the cat’s back to fluff it up. Release to compare how fast heat escapes.'],
  handle: ['改变样片的蓬松度', 'Fluff the coat sample'], accent: '#ffba92', initial: .45, duration: 2.5,
  frame(value, elapsed, baseline) {
    const shapes = [...catBody];
    for (let i = 0; i < 16; i++) {
      const a = i * .134;
      shapes.push(orb([.91 + .89 * Math.sin(a), -.39 + .71 * (1 - Math.cos(a)), .30 + a * .39], .118 - i * .003, i % 4 < 2 ? '#a25a44' : furBrown,'#dc986c'));
    }
    const fluff = .12 + value * .48;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
      const x = -.20 + i * .113, z = -.46 + j * .104;
      const y = -.19 + .55 * Math.sqrt(Math.max(0, 1 - ((x - .23) / 1.02) ** 2 - ((z - .06) / .52) ** 2));
      const tip = y + fluff * (.78 + .22 * Math.sin(i * 1.7 + j));
      shapes.push(line([[x,y,z],[x+.01,mix(y,tip,.60),z-.045],[x+.062,tip,z-.07]],j % 2 ? '#ffce9c' : '#f0a979',1.7));
    }
    for (let i = 0; i < 7; i++) {
      const heat = (fluffiness: number, ghost: boolean): Shape => {
        const p = (elapsed * mix(.59,.20,fluffiness) + i / 7) % 1;
        return orb([-.20 + i * .149, .20 + p * 1.28, -.62 + .10 * Math.sin(i) - (ghost ? .11 : 0)],.028,ghost ? '#cbb3b0' : '#ffd27f',undefined,(ghost ? .38 : .96) * (1 - .67 * p));
      };
      if (baseline !== null && Math.abs(value - baseline) > .01) shapes.push(heat(baseline, true));
      shapes.push(heat(value, false));
    }
    return { shapes, grip: [.25,.24 + fluff,-.56] };
  },
  result(value) {
    return [`样片蓬松度 ${Math.round(value * 100)}%。蓬松的绒毛能留住更多静止空气，减慢热量散失。光点示意快慢；这不是真猫实验。`,
      `Coat fluffiness: ${Math.round(value * 100)}%. Fluffy fur holds more still air, slowing heat loss. The dots are a model, not measurements from a real cat.`];
  },
};

const globeRadius = 1.22;
// Compact longitude-latitude outlines, in degrees. Deliberately simplified, not map data.
const continents = [
  [[-168,66],[-133,73],[-102,72],[-78,79],[-56,55],[-66,47],[-81,27],[-91,17],[-102,23],[-119,32],[-128,48],[-155,59]],
  [[-81,11],[-63,13],[-48,3],[-34,-7],[-52,-30],[-67,-56],[-73,-43],[-77,-18]],
  [[-54,60],[-65,73],[-54,83],[-22,82],[-19,71],[-37,61]],
  [[-17,29],[-6,36],[19,35],[38,27],[53,10],[40,-15],[27,-35],[14,-33],[6,-16],[-12,4]],
  [[-10,36],[-11,54],[8,62],[31,72],[73,75],[107,78],[142,70],[176,65],[161,51],[138,44],[123,22],[106,0],[98,7],[93,21],[77,7],[64,27],[47,30],[31,42],[14,40]],
  [[112,-21],[121,-16],[140,-11],[151,-21],[154,-29],[148,-42],[126,-34],[114,-35]],
];
function isLand(lon: number, lat: number): boolean {
  return lat < -72 || continents.some(points => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [a,b] = points[i], [c,d] = points[j];
      if ((b > lat) !== (d > lat) && lon < (c - a) * (lat - b) / (d - b) + a) inside = !inside;
    }
    return inside;
  });
}
const globePolar = (v: number) => mix(globeRadius, 1.05, v);
const globeFacets = ellipsoid(origin,[globeRadius,1,globeRadius],32,16,(normal,a,b) => {
  const lon = ((a * 180 / Math.PI + 330) % 360) - 180, lat = b * 180 / Math.PI;
  const color = Math.abs(lat) > 72 ? '#d6ebe3' : isLand(lon,lat) ? (Math.abs(lat) < 24 ? '#9eb96a' : '#58a18a') : '#397fb8';
  return shade(color,lit(normal));
});
const earth: Mission = {
  title: ['地球有多圆？', 'How round is Earth?'], guide: ['拖动北极测量标记，比较球体与略扁的地球。绕到侧面看两条直径。', 'Drag the north-pole marker to compare a sphere with a flattened Earth. Orbit sideways to compare the two diameters.'],
  handle: ['上下移动北极标记', 'Move the north-pole marker'], accent: '#7aedca', initial: .76,
  frame(value, _, baseline) {
    const polar = globePolar(value);
    const shapes: Shape[] = globeFacets.map(facet => face(facet.points.map(([x,y,z]) => [x,y * polar,z]),facet.color));
    shapes.push(...ring(a => [1.245 * Math.cos(a),0,1.245 * Math.sin(a)],'#ffce8a',1.5),
      line([[0,-1.54,0],[0,1.54,0]],'#8cf3d4',1.5),
      line([[-1.49,0,0],[1.49,0,0]],'#ffce8a',1.5));
    for (const s of [-1,1]) {
      shapes.push(line([[-.16,s*polar,-.04],[.16,s*polar,-.04]],'#8cf3d4',2),
        line([[s*globeRadius,-.16,-.04],[s*globeRadius,.16,-.04]],'#ffce8a',2));
      if (baseline !== null && Math.abs(baseline - value) > .01) shapes.push(line([[-.14,s*globePolar(baseline),0],[.14,s*globePolar(baseline),0]],'#eefff5',1,.6));
    }
    return { shapes, grip: [0,polar + .09,-.13] };
  },
  result(value) {
    if (value === 0) return ['球体参照：赤道直径和两极之间的直径相等。真实地球的赤道直径约多 43 千米。', 'Reference sphere: both diameters match. Earth’s equatorial diameter is about 43 km longer than its pole-to-pole diameter.'];
    return ['金色标出赤道，绿色标出两极。真实地球的赤道直径约多 43 千米；模型把这点差异放大了。', 'Gold marks the equator; green marks the poles. On Earth the equatorial diameter is about 43 km longer; this model exaggerates the difference.'];
  },
};

const orbitPoint = (r: number, a: number, height = 0): Point => [r * Math.sin(a), r * Math.cos(a) * .34 + height, -r * Math.cos(a) * .94];
const planets = [
  { r: .49, size: .032, period: .241, phase: .2, color: '#a59489' },
  { r: .68, size: .060, period: .615, phase: 1.1, color: '#efbf7b' },
  { r: .88, size: .070, period: 1, phase: -1.1, color: '#6cc9ba' },
  { r: 1.07, size: .045, period: 1.88, phase: 3.5, color: '#d58662' },
  { r: 1.46, size: .166, period: 11.86, phase: -2.5, color: '#d5a681' },
  { r: 1.77, size: .137, period: 29.46, phase: 2.2, color: '#e4c087' },
  { r: 2.07, size: .094, period: 84.02, phase: -2.0, color: '#8ad6cf' },
  { r: 2.38, size: .096, period: 164.8, phase: 0, color: '#7fafff' },
];
const solarGuides = planets.flatMap((p, i) => ring(a => orbitPoint(p.r,a),i === 7 ? '#86bcff' : '#7281a4',i === 7 ? 1.5 : .8,i === 7 ? .85 : .44));
const solarRandom = rng(106);
const icyBodies = sample(42, () => orb(orbitPoint(mix(2.50,2.87,solarRandom()), solarRandom() * tau, (solarRandom() - .5) * .30), .016 + solarRandom() * .012, '#8ba5c9',undefined,.58));
const solar: Mission = {
  title: ['海王星走一圈', 'One lap of Neptune'], guide: ['拖动蓝色的海王星，拨动太阳系的时间。松手看其他行星也一起走。', 'Drag blue Neptune to scrub through time. Release to watch the other planets move too.'],
  handle: ['拨动海王星的轨道位置', 'Scrub Neptune’s orbital phase'], accent: '#92c3ff', initial: .14, duration: 2.5,
  frame(value, elapsed, baseline) {
    const years = 164.8 * value + 1.25 * elapsed;
    const shapes = [...solarGuides,...icyBodies,orb(origin,.34,'#ed914b','#fff2aa')];
    for (const [i,p] of planets.entries()) {
      const pos = orbitPoint(p.r,p.phase + years / p.period * tau);
      shapes.push(orb(pos,p.size,p.color,'#fff1cd'));
      if (i === 5) shapes.push(...ring(a => add(pos,[.245*Math.cos(a),.09*Math.sin(a),.235*Math.sin(a)]),'#e5c69d',1.65,.78));
    }
    if (baseline !== null) shapes.push(orb(orbitPoint(2.38,tau * baseline),.066,'#bfcaf0',undefined,.42));
    return { shapes, grip: orbitPoint(2.38,tau * value) };
  },
  result(value) {
    return [`时间拨到这一圈的第 ${Math.round(value * 164.8)} 年（海王星一圈约 165 年）。内侧行星绕得更快，外侧还有冰质小天体。轨道用圆表示，大小和间距不按比例。`,
      `Year ${Math.round(value * 164.8)} of Neptune’s roughly 165-year orbit. Inner planets circle faster; icy bodies orbit farther out. Orbits are drawn as circles; sizes and spacing are not to scale.`];
  },
};

type Track = readonly (readonly Vec[])[];
const diskRadii = [.42, .58, .8, 1.09, 1.48, 1.9];
const seedDisk = (center: Vec, radii: readonly number[], count: number): Vec[] => radii.flatMap((r, i) => sample(count, j => {
  const a = tau * (j + i * .43) / count;
  return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)] as Vec;
}));

// Keep only the two most recent releases. Preview never calls the integrator.
function cacheTracks(integrate: (v: number) => Track) {
  const cache = new Map<number, Track>();
  return (v: number): Track => {
    const hit = cache.get(v);
    if (hit) { cache.delete(v); cache.set(v, hit); return hit; }
    const frames = integrate(v);
    cache.set(v, frames);
    if (cache.size > 2) cache.delete(cache.keys().next().value!);
    return frames;
  };
}
const orbitTrack = cacheTracks(v => orbitFrames(massOffset(v)));
const massOffset = (v: number) => (v * 2 - 1) * .84;
const diskPoint = (p: Vec, thickness = 0, scale = 1): Point => [p[0] * scale, p[1] * .54 * scale + thickness, p[1] * .84 * scale];
const diskSeeds = seedDisk([0,0], diskRadii, 12);

function pose(track: Track, index: number, t: number): Vec {
  const low = Math.floor(t), a = track[low][index], b = track[Math.min(low + 1, track.length - 1)][index];
  return [mix(a[0],b[0],t - low),mix(a[1],b[1],t - low)];
}
function trail(track: Track, index: number, t: number, toPoint: (p: Vec) => Point, color: string, ghost = false): Shape[] {
  const out: Shape[] = [];
  // Split traces into short sections so front/back parts sort independently in Canvas.
  for (let end = t; end > Math.max(0,t - 65); end -= 5) {
    const start = Math.max(0,end - 5);
    out.push(line(sample(4, i => toPoint(pose(track,index,mix(start,end,i / 3)))),color,ghost ? 1 : 1.4,
      (ghost ? .32 : .85) * (1 - (t - end) / 80)));
  }
  return out;
}
const galaxyRandom = rng(704214);
const galaxyBackdrop = sample(166, i => {
  const r = .20 + 1.93 * galaxyRandom() ** .84;
  const angle = i % 4 * tau / 4 + 2.65 * Math.log(1 + r * 2) + (galaxyRandom() - .5) * (1.2 - .30 * r);
  return orb(diskPoint([r * Math.cos(angle),r * Math.sin(angle)],(galaxyRandom() - .5) * (.32 - .10 * r)),
    .014 + .025 * galaxyRandom(), r < .72 ? '#efbb93' : i % 4 ? '#8f85ba' : '#a3bde7',undefined,.26 + .18 * galaxyRandom());
});
const galaxyDuration = 4.2;
const galaxy: Mission = {
  title: ['挪动质量点', 'Move a point mass'], guide: ['拖动金色质量点，再松手。比比亮点的路径；淡色旋臂只是银河系示意图。', 'Drag the gold mass, then release. Compare the bright tracer paths. The faint spiral is an illustration of the Milky Way.'],
  handle: ['改变质量点的起点', 'Move the mass’s starting point'], accent: '#ffd49b', initial: .5, duration: galaxyDuration,
  frame(value, elapsed, baseline) {
    const offset = massOffset(value), grip = diskPoint([offset,0],.14);
    const shapes = [...galaxyBackdrop, line([[-.90,.04,0],[.90,.04,0]],'#cf9d75',1,.5), orb(diskPoint([offset,0]),.095,'#f3a85e','#fff0bc')];
    const t = GRAVITY_FRAMES * clamp(elapsed / galaxyDuration);
    const track = t > 0 ? orbitTrack(value) : null;
    const old = t > 0 && baseline !== null && Math.abs(value - baseline) > 1e-4 ? orbitTrack(baseline) : null;
    const marked = [4,20,33,52,67];
    for (let i = 0; i < diskSeeds.length; i++) {
      const special = marked.includes(i);
      const p = track ? pose(track,i + 1,t) : diskSeeds[i];
      if (special && old) shapes.push(...trail(old,i + 1,t,diskPoint,'#b0aedb',true));
      if (special && track) shapes.push(...trail(track,i + 1,t,diskPoint,'#6be3e3'));
      shapes.push(orb(diskPoint(p),special ? .04 : .024,special ? '#aaf8ee' : '#d8dbfb',undefined,special ? 1 : .70));
    }
    return { shapes, grip };
  },
  result(value, elapsed) {
    if (elapsed <= 0) return ['亮点的起始位置和速度不变。松手后，亮点将被金色质量点吸引。', 'The bright tracers start with the same positions and speeds. Release to see them pulled toward the gold mass.'];
    return [`起点偏离原盘心 ${Math.abs(massOffset(value)).toFixed(2)} 个模型单位。亮线是计算出的路径，不是旋臂；真实银河系的引力来自分布广泛的恒星、气体和暗物质等。`,
      `The mass starts ${Math.abs(massOffset(value)).toFixed(2)} model units from the original disk center. Bright lines are computed paths, not spiral arms. Real galaxies feel gravity from stars, gas and dark matter spread throughout them.`];
  },
};

const encounterRadii = [.27,.42,.6,.82,1.01];
const encounterGap = (value: number) => mix(.5,2.45,value);
const encounterCenters = (value: number): [Vec, Vec] => [[-2.8,-encounterGap(value)/2],[2.8,encounterGap(value)/2]];
const encounterCount = 9 * encounterRadii.length;
const encounterLength = 3;
const encounterDuration = 5 * encounterLength;
const encounterFrameCount = GRAVITY_FRAMES * encounterLength;

// Continuous variant of encounterFrames: only the initial transverse gap changes.
// Same softened gravity and velocity Verlet steps. Only the two centers source gravity.
function continuousEncounter(value: number): Track {
  const centers = encounterCenters(value);
  let points: Vec[] = [...centers,...seedDisk(centers[0],encounterRadii,9),...seedDisk(centers[1],encounterRadii,9)];
  let speeds = points.map(([x,y], i): Vec => {
    const group = i === 0 || (i >= 2 && i < 2 + encounterCount) ? 0 : 1;
    const vx = group ? -.47 : .47;
    if (i < 2) return [vx,0];
    const [cx,cy] = centers[group];
    const gain = ((x - cx) ** 2 + (y - cy) ** 2 + SOFTENING ** 2) ** -.75;
    return [vx - (y - cy) * gain,(x - cx) * gain];
  });
  const accel = (p: Vec, i: number, state: readonly Vec[]): Vec => {
    const a = i === 0 ? [0,0] : gravity(p,state[0],1);
    const b = i === 1 ? [0,0] : gravity(p,state[1],1);
    return [a[0] + b[0],a[1] + b[1]];
  };
  const dt = .011, track = [points];
  for (let i = 0; i < encounterFrameCount * 4; i++) {
    speeds = speeds.map(([x,y], j) => {
      const a = accel(points[j],j,points);
      return [x+a[0]*dt/2,y+a[1]*dt/2];
    });
    points = points.map(([x,y], j) => [x + speeds[j][0]*dt,y + speeds[j][1]*dt]);
    speeds = speeds.map(([x,y], j) => {
      const a = accel(points[j],j,points);
      return [x+a[0]*dt/2,y+a[1]*dt/2];
    });
    if (i % 4 === 3) track.push(points);
  }
  return track;
}
const groupTrack = cacheTracks(continuousEncounter);
const groupPoint = (p: Vec) => diskPoint(p,0,.63);
const group: Mission = {
  title: ['两个星系擦肩', 'Two galaxies pass by'], guide: ['拖动蓝色星系，改变两个盘的错开距离。松手，看引力怎样拉弯亮点的路径。', 'Drag the blue galaxy sideways to change the disks’ starting offset. Release to watch gravity bend the tracer paths.'],
  handle: ['改变两个盘的起始错开距离', 'Adjust the encounter offset'], accent: '#9bcbff', initial: .68, duration: encounterDuration,
  frame(value, elapsed, baseline) {
    const centers = encounterCenters(value);
    const grip = add(groupPoint(centers[1]),[0,.19,0]);
    const t = encounterFrameCount * clamp(elapsed / encounterDuration);
    const track = t > 0 ? groupTrack(value) : null;
    const old = t > 0 && baseline !== null && Math.abs(value - baseline) > 1e-4 ? groupTrack(baseline) : null;
    const positions = track ? track[0] : [...centers,...seedDisk(centers[0],encounterRadii,9),...seedDisk(centers[1],encounterRadii,9)];
    const shapes: Shape[] = centers.map(([x,y], i) => line([groupPoint([x,y]),groupPoint([x + (i ? -1 : 1) * 1.48,y])],i ? '#9cc8ec' : '#ecad88',1.2,.54));
    for (let i = 0; i < positions.length; i++) {
      const warm = i === 0 || (i >= 2 && i < 2 + encounterCount);
      const color = warm ? '#ffd0a2' : '#a5d5ff';
      const pos = groupPoint(track ? pose(track,i,t) : positions[i]);
      const showTrail = i < 2 || i === 30 || i === 39 || i === 72 || i === 84;
      if (track && showTrail) shapes.push(...trail(track,i,t,groupPoint,color));
      if (old && showTrail) shapes.push(...trail(old,i,t,groupPoint,'#aca8c2',true));
      if (i < 2) shapes.push(orb(pos,.14,warm ? '#d69676' : '#798ed3','#fff5d1'));
      else {
        shapes.push(orb(pos,showTrail ? .036 : .023,color,undefined,showTrail ? 1 : .78));
        if (i % 3 === 0) shapes.push(orb(add(pos,[0,.10 * Math.sin(i*2.8),0]),.016,color,undefined,.34));
      }
    }
    if (t > 0) shapes.push(orb(groupPoint(centers[1]),.043,'#7694b9',undefined,.60));
    return { shapes, grip };
  },
  result(value, elapsed) {
    const gap = encounterGap(value).toFixed(2);
    return elapsed <= 0 ? [`起始错开 ${gap} 个模型单位。松手后，比较两个盘受引力作用时的变化。`, `Starting offset: ${gap} model units. Release to compare how gravity changes the two disks.`]
      : [`起始错开 ${gap} 个模型单位。彩线显示引力算出的路径。这只是两个质量点和测试粒子的模型，不能预测银河系和仙女座星系会不会合并。`,
        `Starting offset: ${gap} model units. The colored paths are computed under gravity. This two-mass tracer model cannot predict whether the Milky Way and Andromeda will merge.`];
  },
};

const filamentNodes: Point[] = [[-1.97,-.48,-.63], [1.93,.51,.46], [-.91,1.25,1.38], [.48,-1.13,1.36], [-.46,.58,-1.65], [1.03,1.40,-.74]];
function filament(a: Point, b: Point, t: number, bend: number): Point {
  return add(between(a,b,t),[0,bend*Math.sin(Math.PI*t),.27*Math.sin(tau*t)]);
}
const scanCenter = (t: number) => filament(filamentNodes[0],filamentNodes[1],t,.45);
const gasStrength = (t: number) => .26 + .74 * Math.abs(2 * t - 1) ** 1.55;
const webRandom = rng(97111);
const filaments: Shape[] = [];
for (const [a,b,bend] of [[0,1,.45],[0,2,.20],[1,2,-.28],[1,3,-.12],[2,3,.16],[0,4,.23],[1,5,.17],[4,5,-.13],[3,4,-.31]]) {
  const core = (t: number) => filament(filamentNodes[a],filamentNodes[b],t,bend);
  const main = a === 0 && b === 1;
  for (let i = 0; i < 16; i++) filaments.push(line([core(i/16),core((i+1)/16)],main ? '#a99ee7' : '#736497',main ? 1.3 : .9,main ? .76 : .48));
  filaments.push(...sample(main ? 85 : 17, () => {
    const u = webRandom();
    const spread = main ? .24 : .16;
    return orb(add(core(u),[(webRandom()-.5)*spread,(webRandom()-.5)*spread,(webRandom()-.5)*spread*2]),
      .017 + .018 * webRandom(),main ? '#a195ed' : '#8776b4',undefined,main ? .28 + gasStrength(u) * .53 : .32 + webRandom()*.32);
  }));
}
for (let n = 0; n < filamentNodes.length; n++) {
  filaments.push(orb(filamentNodes[n],n < 2 ? .10 : .055,'#b78ccb','#fff0cb'));
  filaments.push(...sample(n < 2 ? 26 : 12, () => {
    const p = pointOnBall(webRandom()*tau,Math.asin(2*webRandom()-1));
    const r = (.08 + .31 * webRandom()) * (n < 2 ? 1 : .6);
    return orb(add(filamentNodes[n],[r*p[0],r*p[1],r*p[2]]),.018+webRandom()*.026,'#dfb7e8','#fff1ca',.65);
  }));
}
const web: Mission = {
  title: ['沿长丝找热气体', 'Trace a thread of hot gas'], guide: ['拖动青色探针沿着长丝走。松手发送扫描脉冲，比较线的中段和两端。', 'Slide the teal probe along the filament. Release to send a scan pulse, then compare the middle with either end.'],
  handle: ['沿长丝移动探针', 'Move the filament probe'], accent: '#8cebdc', initial: .35, duration: 1.5,
  frame(value, elapsed, baseline) {
    const p = scanCenter(value), grip = add(p,[0,.32,-.08]);
    const shapes = [...filaments, orb(grip,.069,'#76c8c1','#defff1'), line([grip,p],'#91f0db',1.8)];
    if (baseline !== null && Math.abs(baseline - value) > .01) shapes.push(orb(scanCenter(baseline),.047,'#cbc1dc',undefined,.58));
    const strength = gasStrength(value);
    for (let i = 0; i < 3; i++) {
      const size = .11 + (elapsed / 1.5) * (.37 - i*.09) + i*.055;
      shapes.push(...ring(a => add(p,[.32 * size * Math.cos(a),size * Math.cos(a),size * Math.sin(a)]),'#83e5d5',i === 0 ? 1.5 : 1,
        (i === 0 ? .9 : .30) * strength * (1 - .48 * elapsed / 1.5)));
    }
    return { shapes, grip };
  },
  result(value) {
    return [`长丝上的位置：${Math.round(value * 100)}%；示意信号：${Math.round(gasStrength(value) * 100)}%。模型两端的气体信号较强。天文学家用 X 射线追踪热气体；这里的颜色和读数不是观测值。`,
      `Position: ${Math.round(value * 100)}% along the thread. Model signal: ${Math.round(gasStrength(value) * 100)}%. The ends are brighter in this example. Astronomers trace hot gas using X-rays; the colors and readings here are not observations.`];
  },
};

const horizonRadius = 1.75;
const beaconRange = (v: number) => mix(.55,2.64,v);
const beaconDirection: Point = [.86,.29,-Math.sqrt(1 - .86**2 - .29**2)];
const beaconPoint = (r: number): Point => [r*beaconDirection[0],r*beaconDirection[1],r*beaconDirection[2]];
const horizonRandom = rng(887653);
const horizonBackdrop = sample(191, () => {
  const p = pointOnBall(horizonRandom()*tau,Math.asin(2*horizonRandom()-1)), r = 2.83 * Math.cbrt(horizonRandom());
  return orb([r*p[0],r*p[1],r*p[2]],.013 + horizonRandom()*.020,r > horizonRadius ? '#968db2' : '#abbdf5',undefined,r > horizonRadius ? .22 : .52);
});
for (const axis of [0,1,2]) horizonBackdrop.push(...ring(a => {
  const c = horizonRadius*Math.cos(a), s = horizonRadius*Math.sin(a);
  return axis === 0 ? [0,c,s] : axis === 1 ? [c,0,s] : [c,s,0];
},'#808fe4',1,.54));
const horizonDuration = 3;
const horizon: Mission = {
  title: ['光来得及到吗？', 'Will the light reach us?'], guide: ['拖动紫色信标，再松手发一束光。试试把信标放在蓝圈内外。', 'Drag the violet beacon, then release to send a pulse. Try starting inside and outside the blue rings.'],
  handle: ['移动发光信标', 'Move the light beacon'], accent: '#c6b4ff', initial: .42, duration: horizonDuration,
  frame(value, elapsed, baseline) {
    const r = beaconRange(value), travel = horizonRadius * clamp(elapsed/horizonDuration), arrived = elapsed > 0 && travel >= r;
    const grip = beaconPoint(r);
    const shapes = [...horizonBackdrop,line([origin,beaconPoint(2.72)],'#b6a8df',1,.46),
      orb(grip,.09,'#946dcb','#e6ceff'), orb(origin,arrived ? .13 : .074,arrived ? '#e6c582' : '#779ecd','#fff8dc')];
    if (baseline !== null && Math.abs(baseline - value) > .01) shapes.push(orb(beaconPoint(beaconRange(baseline)),.06,'#bab2d0',undefined,.52));
    if (elapsed > 0) {
      const pulse = beaconPoint(Math.max(0,r - travel));
      shapes.push(orb(pulse,.057,'#e8b785','#fff2c8'));
      if (!arrived) shapes.push(line([pulse,beaconPoint(Math.min(r,r-travel+.33))],'#ffd98c',2.5));
      else shapes.push(...ring(a => [.24*Math.cos(a),0,.24*Math.sin(a)],'#ffe2a3',1.5,.78));
    }
    return { shapes, grip };
  },
  result(value, elapsed) {
    const distance = beaconRange(value);
    const arrives = horizonRadius * clamp(elapsed / horizonDuration) >= distance;
    const status = elapsed <= 0 ? ['松手后发光。','Release to send a pulse.'] : arrives ? ['光在计时结束前抵达。','The pulse reaches us within the time limit.']
      : elapsed < horizonDuration ? ['光还在路上。','The pulse is on its way.'] : ['计时结束，光还没到。蓝圈并没有挡住它。','Time is up; the light hasn’t reached us. The blue rings didn’t block it.'];
    return [`${status[0]} 蓝圈表示这个模型的观测范围，不是墙。模型不含宇宙膨胀；真实视界今天距我们约 460 亿光年，这不是光走过的路程。`,
      `${status[1]} The blue rings mark the range in this toy model, not a wall. It omits cosmic expansion. The real horizon is now about 46 billion light-years away; that is not the distance light traveled.`];
  },
};

export const macroMissions: Record<string,Mission> = { house, earth, solar, galaxy, group, web, horizon, cat };
