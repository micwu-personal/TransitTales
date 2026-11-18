import type { Mission, Point, Shape } from './expedition-model';

const tau = 2 * Math.PI;
const mix = (a: number, b: number, v: number) => a + (b - a) * v;
const seq = <T>(n: number, fn: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => fn(i));
const circle = (n: number, at: (c: number, s: number) => Point): Point[] => seq(n, i => {
  const a = tau * i / n;
  return at(Math.cos(a), Math.sin(a));
});
const orb = (at: Point, r: number, color: string, light?: string, alpha = 1): Shape =>
  ({ kind: 'orb', at, r, color, light, alpha });
const dot = (at: Point, r: number, color: string, alpha = 1): Shape =>
  ({ kind: 'orb', at, r, color, alpha, flat: true });
const line = (points: readonly Point[], color: string, width = 1, alpha = 1, closed = false): Shape =>
  ({ kind: 'line', points, color, width, alpha, closed });
const face = (points: readonly Point[], color: string, alpha = 1): Shape =>
  ({ kind: 'face', points, color, alpha });

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed + .5) / 4294967296;
  };
}

function rail(left: number, right: number, y: number, z: number, major: number, minor: number, value: number, baseline: number | null, color: string) {
  const at = (v: number): Point => [mix(left, right, v), y, z];
  const grip = at(value);
  const shapes = [line([at(0), at(1)], '#7999a8', 2, .7), line([at(0), grip], color, 2)];
  for (let i = 0; i <= major * minor; i++) {
    const p = at(i / (major * minor));
    const big = i % minor === 0;
    shapes.push(line([p, [p[0], y - (big ? .15 : .072), z]], big ? '#dfe9df' : '#7999a8', big ? 1.8 : 1, .8));
  }
  if (baseline !== null) {
    const [x] = at(baseline);
    shapes.push(line([[x, y - .29, z], [x + .064, y - .22, z], [x, y - .15, z], [x - .064, y - .22, z]], '#e3eae1', 1.4, .65, true));
  }
  return { shapes, grip };
}

const skinAccent = '#ffca9f';
const skinOutline: readonly (readonly [number, number])[] = [
  [-1.62, -.52], [-1.27, -.98], [.99, -.98], [1.59, -.61], [1.59, .56], [1.18, .92], [-1.19, .92], [-1.62, .56],
];
function skinLayer(y: number, thickness: number, top: string, sides: readonly string[]): Shape[] {
  const upper = skinOutline.map(([x, z]): Point => [x, y, z]);
  const lower = skinOutline.map(([x, z]): Point => [x, y - thickness, z]);
  return [face(upper, top, .92), face(lower, sides[1], .92), ...upper.map((p, i) => {
    const j = (i + 1) % upper.length;
    return face([p, upper[j], lower[j], lower[i]], sides[i % sides.length], .96);
  }), line(upper, '#ffc4ae', 1.2, .6, true)];
}

const tissue: Mission = {
  title: ['展开皮肤切片', 'Lift the skin layers'],
  guide: ['拖动上方的标记，把示意切片的各层拉开；转到侧面，看看毛根藏在哪里。', 'Drag the top marker to spread the layers of this model. Turn it sideways to find where the hair is rooted.'],
  handle: ['切片层间距', 'Spacing between model layers'],
  accent: skinAccent,
  initial: .48,
  frame(v) {
    const top = .56 + v * .61, dermis = .24, base = -.45 - v * .57;
    const shapes = [
      ...skinLayer(base, .27, '#ab795f', ['#9b665d', '#684552', '#b27e64']),
      ...skinLayer(dermis, .52, '#bf7a85', ['#a65373', '#753e64', '#a9637f']),
      ...skinLayer(top, .22, '#ed9a98', ['#dd7f87', '#af5576', '#ca6b84']),
    ];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 9; col++) {
      const x = -1.3 + col * .32 + (row % 2) * .07, z = -.72 + row * .35;
      const rim = circle(6, (c, s) => [x + c * .158, top + .012, z + s * .165]);
      shapes.push(face(rim, (row + col) % 3 === 0 ? '#ffc2a3' : '#eca28e'), line(rim, '#a86279', .85, .78, true));
    }
    for (let i = 0; i < 14; i++) {
      const a = (i + .5) * tau / 14;
      const x = Math.cos(a) * .94, z = Math.sin(a) * .66;
      shapes.push(orb([x, base + .047, z], .126, '#dca583', '#ffe1a9'));
    }
    for (const [x, z, dx] of [[-.5, -.4, .37], [.52, .3, .25]]) {
      const root: Point = [x - .14, -.18, z];
      const neck: Point = [x, dermis + .04, z];
      const pore: Point = [x + .29 * dx, top + .045, z];
      const tip: Point = [x + dx, top + .49, z + .08];
      shapes.push(orb(root, .13, '#98436a', '#ec9bab'), line([root, neck], '#673750', 8),
        line([root, neck], '#f3a99c', 2), line([neck, pore], '#ffc58f', 1.2, .36),
        ...[0, .22, .45, .68, .9].map(t => line([
          [mix(pore[0], tip[0], t * t), mix(pore[1], tip[1], t), mix(z, tip[2], t)],
          [mix(pore[0], tip[0], Math.min(1, t + .23) ** 2), mix(pore[1], tip[1], Math.min(1, t + .23)), mix(z, tip[2], Math.min(1, t + .23))],
        ], '#663348', 4)), dot(pore, .065, '#713d59'));
    }
    const grip: Point = [mix(-1.15, 1.18, v), top + .03, -1.04];
    shapes.push(line([[-1.24, top + .03, -1.04], [1.26, top + .03, -1.04]], skinAccent, 2, .7));
    return { shapes, grip };
  },
  result(v) {
    return v < .33
      ? ['合拢看：毛干伸出表皮，毛囊却扎在下面的真皮里。', 'Layers together: the shaft sticks out above the epidermis, but its follicle is rooted in the dermis below.']
      : ['拉开看：粉色表皮盖着真皮，下方还有脂肪层。拉开的是模型，不是猫的皮肤。', 'Layers apart: the pink epidermis covers the dermis, with a fatty layer underneath. Only the model moves, not the cat’s skin.'];
  },
};

const membrane = '#8edcd0';
const nucleusCenter: Point = [-.28, .13, -.11];
const nucleusRadii: Point = [.68, .58, .51];
const cellRadii: Point = [1.51, 1.26, 1.11];
function latitude(center: Point, radii: Point, y: number): Point[] {
  const r = Math.sqrt(1 - y * y);
  return circle(32, (c, s) => [center[0] + radii[0] * c * r, center[1] + radii[1] * y, center[2] + radii[2] * s * r]);
}
function section(center: Point, radii: Point, z: number): Point[] | null {
  const h = (z - center[2]) / radii[2];
  if (Math.abs(h) >= 1) return null;
  const r = Math.sqrt(1 - h * h);
  return circle(36, (c, s) => [center[0] + radii[0] * c * r, center[1] + radii[1] * s * r, z]);
}
const cellScaffold: Shape[] = [];
for (const [ctr, radii, tint, alpha] of [
  [[0, 0, 0], cellRadii, membrane, .28], [nucleusCenter, nucleusRadii, '#e8a9cd', .48],
] as const) {
  for (const lat of [-.82, -.5, 0, .5, .82]) cellScaffold.push(line(latitude(ctr, radii, lat), tint, 1, alpha, true));
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI / 5;
    cellScaffold.push(line(circle(28, (c, s) => [ctr[0] + c * radii[0] * Math.cos(a), ctr[1] + s * radii[1], ctr[2] + c * radii[2] * Math.sin(a)]), tint, 1.1, alpha, true));
  }
}
const vesicles: Point[] = [[.85, .33, .32], [.64, -.51, -.45], [-.48, -.74, .28], [-.97, .29, -.49], [.56, .66, -.36], [-.68, .53, .56], [.94, -.12, -.08], [-.2, -.33, .69], [.37, -.81, .24], [-.12, .88, .16]];
const scanZ = (v: number) => mix(-1.03, 1.03, v);
const cell: Mission = {
  title: ['扫过动物细胞', 'Scan through an animal cell'],
  guide: ['拖动下方的标记，把虚拟切片从近端推到远端；留意粉色截面何时出现。', 'Drag the lower marker to scan a virtual slice from front to back. Watch for the pink cross-section.'],
  handle: ['细胞切片深度', 'Cell slice depth'],
  accent: membrane,
  initial: .18,
  frame(v, _elapsed, baseline) {
    const z = scanZ(v);
    const { shapes, grip } = rail(-1.52, 1.52, -1.48, -.36, 4, 2, v, baseline, membrane);
    shapes.push(...cellScaffold);
    for (const [i, p] of vesicles.entries()) {
      const close = Math.abs(p[2] - z) < .18;
      shapes.push(orb(p, i % 3 === 0 ? .129 : .09, '#bdb479', '#f9e3b2', close ? .95 : .34));
    }
    for (const [x, y, depth] of [[.81, -.3, .28], [-.91, -.27, -.14], [.59, .61, .38]]) {
      const close = Math.abs(depth - z) < .19;
      const rim = circle(22, (c, s) => [x + c * .22, y + c * .08 + s * .103, depth + s * .035]);
      shapes.push(face(rim, '#bb7577', close ? .9 : .32), line(rim, '#f3b692', 1.6, close ? 1 : .52, true),
        line(seq(19, i => [x - .17 + i * .018, y - .06 + i * .006 + .045 * Math.sin(i * 1.45), depth - .026]), '#ffc5a4', 1.25, close ? .9 : .38));
    }
    const outline = section([0, 0, 0], cellRadii, z);
    if (outline) shapes.push(face(outline, '#61a8af', .13), line(outline, '#a4f1e1', 2, .95, true));
    const core = section(nucleusCenter, nucleusRadii, z - .006);
    if (core) {
      const r = Math.abs(core[0][0] - nucleusCenter[0]);
      shapes.push(face(core, '#d08fb5', .55), line(core, '#ffbfda', 2.1, 1, true),
        ...seq(5, i => line(seq(15, j => [nucleusCenter[0] + r * (j / 14 - .5) * 1.3,
          nucleusCenter[1] + r * ((i - 2) * .2 + Math.sin(i * 2 + j * .6) * .073), z - .013]), '#ffdbdf', 1.1, .7)));
    }
    return { shapes, grip };
  },
  result(v) {
    return Math.abs(scanZ(v) - nucleusCenter[2]) < nucleusRadii[2]
      ? ['切片穿过细胞核：粉色边缘是核膜，里面存着细胞的大部分 DNA。', 'The slice crosses the nucleus. Its pink edge is the nuclear envelope; most of the cell’s DNA is inside.']
      : ['切片没穿过细胞核。移动切片会改变看到的截面，不会改变细胞。', 'This slice misses the nucleus. Moving the slice changes the view, not the cell.'];
  },
};

const microbeAccent = '#ddee9d';
const capsuleR = (x: number) => .66 * Math.sqrt(Math.max(0, 1 - (Math.max(0, Math.abs(x) - .96) / .66) ** 2));
const rodPoint = ([x, y, z]: Point): Point => [x * .89 - y * .28 - z * .36, x * .25 + y * .96 - z * .10, x * .37 + z * .93];
const capsule: Shape[] = [];
for (let i = 0; i < 11; i++) {
  const x = mix(-1.56, 1.56, i / 10), r = capsuleR(x);
  capsule.push(line(circle(26, (c, s) => rodPoint([x, r * c, r * s])), '#91d4ab', i === 5 ? 1.4 : 1, .37, true));
}
for (let i = 0; i < 9; i++) {
  const a = tau * i / 9;
  capsule.push(line(seq(33, j => {
    const x = mix(-1.62, 1.62, j / 32), r = capsuleR(x);
    return rodPoint([x, r * Math.cos(a), r * Math.sin(a)]);
  }), '#91d7b7', 1.4, .53));
}
const bacterialDNA = seq(105, i => {
  const a = tau * i / 104;
  const x = .98 * Math.cos(a) + .09 * Math.cos(a * 13);
  return { x, p: rodPoint([x, .26 * Math.sin(a * 5) + .09 * Math.sin(a * 13), .21 * Math.cos(a * 5) + .11 * Math.cos(a * 13)]) };
});
const ribosomeRng = seeded(17);
const ribosomes = seq(44, () => {
  const x = mix(-1.37, 1.37, ribosomeRng()), r = capsuleR(x) * Math.sqrt(ribosomeRng()) * .89, a = tau * ribosomeRng();
  return { x, p: rodPoint([x, r * Math.cos(a), r * Math.sin(a)]) };
});
const lensX = (v: number) => mix(-1.45, 1.45, v);
const microbe: Mission = {
  title: ['在细菌里找 DNA', 'Find DNA inside a bacterium'],
  guide: ['拖动观察环沿杆形细菌滑行。亮起来的部分是环附近的结构，不是你移动的东西。', 'Slide the viewing ring along the bacterium. Structures near the ring light up; you aren’t moving anything inside.'],
  handle: ['细菌观察环', 'Bacterium viewing ring'],
  accent: microbeAccent,
  initial: .15,
  frame(v) {
    const x = lensX(v), r = capsuleR(x) + .105;
    const shapes = [...capsule];
    for (let i = 1; i < bacterialDNA.length; i++) {
      const a = bacterialDNA[i - 1], b = bacterialDNA[i];
      const near = Math.exp(-((mix(a.x, b.x, .5) - x) ** 2) / .065);
      shapes.push(line([a.p, b.p], '#ffe49d', 1.2 + 1.9 * near, .23 + .77 * near));
    }
    for (const p of ribosomes) shapes.push(dot(p.p, .037, '#aad6bb', .22 + .52 * Math.exp(-((p.x - x) ** 2) / .065)));
    const ring = circle(32, (c, s) => rodPoint([x, c * r, s * r]));
    shapes.push(face(ring, '#e2e9a1', .08), line(ring, microbeAccent, 2.2, .93, true));
    const grip = rodPoint([x, r + .08, 0]);
    shapes.push(line([rodPoint([x, r, 0]), grip], microbeAccent, 2));
    return { shapes, grip };
  },
  result(v) {
    return Math.abs(lensX(v)) < 1.08
      ? ['金色细线代表盘曲的 DNA。和动物细胞不同，细菌没有核膜把它包起来。', 'The gold strand represents coiled DNA. Unlike in the animal cell, no nuclear envelope surrounds it.']
      : ['这里靠近细菌的一端。沿杆向中间移动观察环，找找金色 DNA；颜色是示意标记。', 'You’re near one end of the rod. Slide toward the middle to find the gold DNA. The colors are model labels.'];
  },
};

const proteinAccent = '#ffc3a6';
const residueCount = 34;
const chainSpan = (v: number) => mix(1.38, 3.84, v);
function chainPoint(t: number, v: number): Point {
  const span = chainSpan(v), sweep = tau * mix(2.15, 1.06, v);
  // Keep the helix contour length fixed while changing its end-to-end span.
  const radius = Math.sqrt(3.89 ** 2 - span ** 2) / sweep;
  const a = (t - 1) * sweep + .56;
  return [(t - .5) * span, Math.cos(a) * radius + .21, Math.sin(a) * radius];
}
const protein: Mission = {
  title: ['展开一段角蛋白链', 'Uncoil a keratin segment'],
  guide: ['拖动链末端，比较螺旋和较伸展的样子。转到端面，看看螺旋绕出的空间。', 'Drag the chain’s end to compare a coil with a more extended shape. Orbit to look down the coil.'],
  handle: ['角蛋白链末端', 'End of the keratin segment'],
  accent: proteinAccent,
  initial: .16,
  frame(v, _elapsed, baseline) {
    const p = seq(residueCount, i => chainPoint(i / (residueCount - 1), v));
    const shapes: Shape[] = [];
    if (baseline !== null && Math.abs(v - baseline) > .02) {
      const ghost = seq(residueCount, i => chainPoint(i / (residueCount - 1), baseline));
      for (let i = 1; i < ghost.length; i += 2) shapes.push(line([ghost[i - 1], ghost[i]], '#adc5d9', 1.4, .48));
    }
    const axis = chainSpan(v) / 2;
    shapes.push(line([[-axis - .13, .21, 0], [axis + .13, .21, 0]], '#a9c9d0', 1.1, .42));
    for (let i = 1; i < p.length; i++) shapes.push(line([p[i - 1], p[i]], '#9b627d', 5), line([p[i - 1], p[i]], '#ffd4b7', 1.6, .72));
    const tones = ['#da8c88', '#db9a80', '#89c3b6', '#91aed0', '#b095c0'];
    for (let i = 0; i < p.length; i++) shapes.push(orb(p[i], i % 5 === 0 ? .097 : .072, tones[i % tones.length], '#fff0cf'));
    const grip = p[p.length - 1];
    return { shapes, grip };
  },
  result(v) {
    return v < .5
      ? ['卷起来时，两端更近，珠子的数目不变。这是一段链，不是整根角蛋白细丝。', 'The ends are closer when coiled, but the bead count stays the same. This is one chain segment, not a whole filament.']
      : ['伸展时，两端更远，珠子的数目不变。这不是对真实折叠、能量或猫毛变化的预测。', 'The ends are farther apart, with the same bead count. This model doesn’t predict real folding, energy, or changes to fur.'];
  },
};

const atomAccent = '#cfbafa';
const bohr = .52;
const atomRng = seeded(67);
const hydrogenCloud: Shape[] = [];
for (let i = 0; i < 384; i++) {
  // The 1s radial distribution is Gamma(3, a₀/2); directions are uniform over the sphere.
  const r = -bohr * .5 * Math.log(atomRng() * atomRng() * atomRng());
  const y = 2 * atomRng() - 1, a = tau * atomRng(), f = r * Math.sqrt(1 - y * y);
  if (r <= 2.37) hydrogenCloud.push(dot([f * Math.cos(a), r * y, f * Math.sin(a)], i % 7 ? .021 : .033, i % 3 ? '#beacef' : '#a0d2f2', .29 + .37 * (i % 7) / 6));
}
const probeDistance = (v: number) => mix(.12, 2.18, v);
const atom: Mission = {
  title: ['氢原子的概率探针', 'Probe a hydrogen atom'],
  guide: ['沿标线拖动探针，从原子中心向外取样。这是另一个原子的模型：氢，不是碳。', 'Drag the probe outward along the ruler. This close-up models a different atom: hydrogen, not carbon.'],
  handle: ['氢原子取样探针', 'Hydrogen sampling probe'],
  accent: atomAccent,
  initial: .36,
  frame(v, _elapsed, baseline) {
    const along = (r: number): Point => [r * .94, -r * .18, -r * .29];
    const r = probeDistance(v), density = Math.exp(-2 * r / bohr);
    const grip = along(r);
    const shapes = [...hydrogenCloud, orb([0, 0, 0], .085, '#dc91ab', '#ffe1bd'),
      line([[0, 0, 0], along(2.24)], '#ada6e5', 1.4, .6)];
    for (let i = 1; i <= 8; i++) {
      const [x, y, z] = along(i * bohr / 2);
      shapes.push(line([[x, y - .05, z], [x, y + (i % 2 ? .05 : .103), z]], '#d1d2ed', 1.3, .76));
    }
    if (baseline !== null) {
      const [x, y, z] = along(probeDistance(baseline));
      shapes.push(line(circle(20, (c, s) => [x, y + c * .14, z + s * .14]), '#c0c7e5', 1, .56, true));
    }
    const [x, y, z] = grip;
    for (const sign of [-1, 1]) {
      shapes.push(line(circle(28, (c, s) => [x + sign * .11, y + c * .17, z + s * .17]), '#e4d8ff', 1.65, .9, true));
      shapes.push(line([[x + sign * .11, y + .17, z], [x - sign * .11, y + .17, z]], atomAccent, 1.2, .74));
    }
    shapes.push(dot(grip, .055 + Math.sqrt(density) * .1, '#ffead5', .28 + Math.sqrt(density) * .72));
    return { shapes, grip };
  },
  result(v) {
    const r = probeDistance(v), relative = (100 * Math.exp(-2 * r / bohr)).toPrecision(2);
    return [`这里的概率密度约为中心的 ${relative}%。点云表示可能的位置，不是电子轨迹，也没有硬边界。`,
      `Local probability density: ${relative}% of its value at the center. The dots are possible locations, not an electron path or a hard boundary.`];
  },
};

const decayAccent = '#f6c0a1';
const decayRng = seeded(119);
const halfLife = 5700;
const lifetimes = seq(24, () => -halfLife * Math.log2(decayRng()));
const ageAt = (v: number) => v * halfLife * 3;
const carbon14: readonly Point[] = [
  [-.34, -.38, -.22], [.11, -.43, -.25], [.48, -.22, -.05], [-.51, -.11, .09], [-.22, .06, -.49], [.24, .03, -.46],
  [-.08, .48, -.17], [.33, .36, -.03], [-.47, .29, .13], [.49, .1, .32], [.05, -.35, .24], [-.14, .04, .48], [.17, .4, .36], [-.04, .09, .02],
];
const nucleus: Mission = {
  title: ['给碳-14 样本拨时间', 'Move through carbon-14 time'],
  guide: ['拖动时间标尺。左边是碳-14 核的放大示意；右边每一颗小球代表样本里的一个原子核。', 'Drag the time ruler. The large cluster is a carbon-14 diagram; each small bead stands for one nucleus in the sample.'],
  handle: ['碳-14 样本经过的时间', 'Elapsed time for the carbon-14 sample'],
  accent: decayAccent,
  initial: .26,
  frame(v, _elapsed, baseline) {
    const { shapes, grip } = rail(-1.75, 1.75, -1.16, -.49, 3, 4, v, baseline, decayAccent);
    const age = ageAt(v);
    for (let i = 0; i < carbon14.length; i++) {
      const [x, y, z] = carbon14[i];
      const proton = i < 6;
      shapes.push(orb([x - .92, y + .14, z], .265, proton ? '#c87880' : '#78a3ad', proton ? '#ffd3b7' : '#cff0dc'));
    }
    for (let i = 0; i < lifetimes.length; i++) {
      const col = i % 6, row = Math.floor(i / 6), x = .12 + .3 * col, y = .63 - .35 * row, z = .26 + .14 * row;
      const carbon = age < lifetimes[i];
      shapes.push(orb([x, y, z], .099, carbon ? '#e5a17d' : '#7abcb7', carbon ? '#ffe5b8' : '#cefbeb'));
    }
    return { shapes, grip };
  },
  result(v) {
    const age = ageAt(v), years = Math.round(age), carbon = lifetimes.filter(t => t > age).length;
    const expected = Math.round(100 * 2 ** (-age / halfLife));
    return [`${years} 年：24 颗中还有 ${carbon} 颗暖色碳-14，冷色是生成的氮-14。大样本预计剩 ${expected}%；单颗何时衰变不可预测。`,
      `${years.toLocaleString('en-US')} years: ${carbon} of 24 warm beads are still carbon-14; cool beads are nitrogen-14. A large sample would have about ${expected}% left. No individual decay time is predictable.`];
  },
};

const fieldAccent = '#a8ddf0';
const electric = '#83d7ee';
const magnetic = '#edabdb';
const wavelength = (v: number) => mix(700, 430, v);
const field: Mission = {
  title: ['用波峰间距量光', 'Measure light crest to crest'],
  guide: ['拖动上方标记改变波长。青色画电场，粉色画磁场；转动可见两个方向互相垂直。', 'Drag the upper marker to change wavelength. Cyan plots the electric field and pink plots the magnetic field. Orbit to see their perpendicular directions.'],
  handle: ['可见光波长', 'Visible-light wavelength'],
  accent: fieldAccent,
  initial: .34,
  duration: 1.65,
  frame(v, elapsed, baseline) {
    const { shapes, grip } = rail(-1.78, 1.78, 1.43, -.27, 3, 3, v, baseline, fieldAccent);
    const period = wavelength(v) / 350;
    const peak = -1.6 + .37 * (1 - Math.exp(-2.5 * elapsed));
    const wave = (x: number) => .72 * Math.cos(tau * (x - peak) / period);
    const start = -2.06, end = 2.06;
    shapes.push(line([[start, 0, 0], [end, 0, 0]], '#c3cee0', 1.6, .64),
      line([[start, -.76, 0], [start, .81, 0]], electric, 1.6, .58),
      line([[start, 0, -.78], [start, 0, .78]], magnetic, 1.6, .58),
      line([[end - .15, .07, 0], [end, 0, 0], [end - .15, -.07, 0]], '#d2dfec', 1.45, .8));
    for (let i = 0; i < 25; i++) {
      const x = mix(start, end, i / 24), w = wave(x);
      shapes.push(line([[x, 0, 0], [x, w, 0]], electric, 1, .32), line([[x, 0, 0], [x, 0, w]], magnetic, 1, .36));
    }
    for (let i = 0; i < 88; i++) {
      const x = mix(start, end, i / 88), next = mix(start, end, (i + 1) / 88);
      shapes.push(line([[x, wave(x), 0], [next, wave(next), 0]], electric, 2.45),
        line([[x, 0, wave(x)], [next, 0, wave(next)]], magnetic, 2.3));
    }
    for (const x of [peak, peak + period]) {
      shapes.push(dot([x, .72, 0], .043, '#fff5c4'), line([[x, .75, 0], [x, 1.08, 0]], '#f8dda1', 1.7));
    }
    shapes.push(line([[peak, 1.04, 0], [peak + period, 1.04, 0]], '#f8dda1', 2));
    return { shapes, grip };
  },
  result(v) {
    const nm = Math.round(wavelength(v));
    return [`波长 ${nm} 纳米：金色标尺量的是相邻波峰的间距。曲线画的是场的数值，不是光的外形或光子的大小。`,
      `Wavelength: ${nm} nm between neighboring crests, marked in gold. The lines plot field values, not the shape of light or the size of a photon.`];
  },
};

const planckAccent = '#ffdea8';
const exponent = (v: number) => 20 * v;
const planck: Mission = {
  title: ['在尺度尺上与普朗克长度比较', 'Compare with the Planck length'],
  guide: ['拖动测量游标，与左端的普朗克长度作比较。每个小刻度都是 10 倍；这是一把对数尺，不是一个空间场景。', 'Drag the caliper away from the Planck-length mark at the left. Each small step is a factor of ten. This is a logarithmic ruler, not a place.'],
  handle: ['相对普朗克长度的游标', 'Planck-length comparison caliper'],
  accent: planckAccent,
  initial: .65,
  frame(v, _elapsed, baseline) {
    const { shapes, grip } = rail(-1.94, 1.94, .34, -.545, 4, 5, v, baseline, planckAccent);
    const front: Point[] = [[-2.03, .47, -.52], [2.03, .47, -.52], [2.03, -.19, -.52], [-2.03, -.19, -.52]];
    const back = front.map(([x, y]): Point => [x, y, -.14]);
    const tones = ['#7895a7', '#596c89', '#475973', '#596c89'];
    shapes.push(face(front, '#3b506c'), face(back, '#53677e'));
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      shapes.push(face([front[i], front[next], back[next], back[i]], tones[i]));
    }
    const [x] = grip;
    const markerColor = '#ffd593';
    const jaws = (z: number): Point[] => [[x - .091, -.42, z], [x - .091, .72, z], [x + .091, .72, z], [x + .091, -.42, z]];
    shapes.push(line(jaws(-.61), markerColor, 2.4), line(jaws(.01), markerColor, 1.8, .74),
      ...jaws(-.61).map((p, i) => line([p, jaws(.01)[i]], markerColor, 1.4, .72)),
      line([[-1.94, -.46, -.58], [-1.94, -.7, -.58], [x, -.7, -.58], [x, -.46, -.58]], planckAccent, 1.9, .89),
      dot([-1.94, .34, -.61], .068, '#fff1c8'));
    return { shapes, grip: [x, .72, -.61] };
  },
  result(v) {
    const e = exponent(v), m = (1.616e-35 * 10 ** e).toExponential(2).replace('e-', 'e−');
    return [`比较长度约为 ${m} 米，即 10^${e.toFixed(1)} 个普朗克长度。参考刻度不是已证实的最短长度。`,
      `Comparison length ≈ ${m} m, or 10^${e.toFixed(1)} Planck lengths. The reference mark is not a proven minimum length.`];
  },
};

export const microMissions: Record<string, Mission> = { tissue, cell, microbe, protein, atom, nucleus, field, planck };
