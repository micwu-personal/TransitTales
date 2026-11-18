/*
 * THESIS: One glowing railway folds six places into a continuous illustrated journey.
 * OWN-WORLD: Stacked, cut-paper silhouettes in plum ink; apricot windows and sea-glass roofs.
 * STORY: Read the journey in its landmarks: concert hall, frost bridge, gardens, clock tower.
 * FIRST VIEWPORT: A fixed center horizon at 37%; large flanking landmarks above a quiet rail bed.
 * FORM: Full-bleed front window, direct from the specified staging; no concept seed needed.
 */
type Ink = CanvasRenderingContext2D;
type Point = [number, number];
type Place = {
  sky: [string, string, string]; ground: [string, string]; hills: [string, string, string];
  wall: string; roof: string; light: string; rail: string; moon: Point;
};

const places: Place[] = [
  { sky: ['#15132e', '#50304d', '#d18976'], ground: ['#624450', '#191629'], hills: ['#855771', '#633e59', '#4a3048'], wall: '#965c61', roof: '#415763', light: '#ffd396', rail: '#e6a586', moon: [154, -116] },
  { sky: ['#111b39', '#334b66', '#93a7b9'], ground: ['#526e83', '#132838'], hills: ['#788ca4', '#56697f', '#40586e'], wall: '#5f7288', roof: '#355464', light: '#ffe0ab', rail: '#b5dfdc', moon: [-174, -135] },
  { sky: ['#201634', '#513652', '#c97d7d'], ground: ['#54454f', '#26172f'], hills: ['#805b76', '#674862', '#40374d'], wall: '#915e70', roof: '#435e5d', light: '#ffd693', rail: '#e6b9ae', moon: [-137, -140] },
  { sky: ['#18152f', '#65425b', '#cb8c78'], ground: ['#654751', '#241b31'], hills: ['#996f7a', '#6c4a62', '#493749'], wall: '#a56f68', roof: '#416b70', light: '#ffdb9e', rail: '#f3c6a5', moon: [247, -139] },
  { sky: ['#151b39', '#3d425e', '#a68b9f'], ground: ['#555461', '#181d31'], hills: ['#70657e', '#514f67', '#383f52'], wall: '#786578', roof: '#475767', light: '#fbcfa4', rail: '#c9cccc', moon: [132, -150] },
  { sky: ['#211633', '#493752', '#b2859e'], ground: ['#514654', '#21192c'], hills: ['#826580', '#67566f', '#434254'], wall: '#826477', roof: '#3d6667', light: '#ffe3ae', rail: '#b7d6cf', moon: [-168, -138] },
];

const TAU = Math.PI * 2;
function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function poly(ctx: Ink, fill: string, ...points: Point[]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function line(ctx: Ink, color: string, weight: number, ...points: Point[]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.stroke();
}
function oval(ctx: Ink, color: string, x: number, y: number, rx: number, ry = rx) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}
function rect(ctx: Ink, color: string, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}
function gradient(ctx: Ink, y0: number, y1: number, stops: [number, string][]) {
  const fill = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([n, color]) => fill.addColorStop(n, color));
  return fill;
}
function halo(ctx: Ink, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function arch(ctx: Ink, x: number, bottom: number, w: number, h: number, color: string) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x - r, bottom);
  ctx.lineTo(x - r, bottom - h + r);
  ctx.arc(x, bottom - h + r, r, Math.PI, 0);
  ctx.lineTo(x + r, bottom);
  ctx.fillStyle = color;
  ctx.fill();
}
function windowLight(ctx: Ink, p: Place, x: number, bottom: number, w: number, h: number, lit = true, rounded = true) {
  if (rounded) {
    arch(ctx, x, bottom + 2, w + 4, h + 4, '#302739');
    arch(ctx, x, bottom, w, h, lit ? p.light : '#5d7783');
  } else {
    rect(ctx, '#302739', x - w / 2 - 2, bottom - h - 2, w + 4, h + 4);
    rect(ctx, lit ? p.light : '#5d7783', x - w / 2, bottom - h, w, h);
  }
  if (w > 4) {
    line(ctx, '#754f58', 1, [x, bottom - h + 1], [x, bottom]);
    line(ctx, '#754f58', 1, [x - w / 2, bottom - h * .46], [x + w / 2, bottom - h * .46]);
  }
  line(ctx, '#c18b80', 1.5, [x - w * .66, bottom + 2], [x + w * .66, bottom + 2]);
}

function house(ctx: Ink, p: Place, x: number, y: number, w: number, h: number, floors: number, seed: number, reverse = false) {
  const rnd = random(seed);
  const side = reverse ? -1 : 1;
  const depth = w * .29 * side;
  const l = x - w / 2;
  const r = x + w / 2;
  const eave = y - h;
  const gable = w * (.26 + rnd() * .13);
  const edge = x + side * w / 2;
  oval(ctx, '#29263588', x + depth * .58, y, w * .76, Math.max(2, w * .13));
  poly(ctx, '#493243', [edge, eave], [edge + depth, eave - Math.abs(depth) * .44], [edge + depth, y - Math.abs(depth) * .44], [edge, y]);
  rect(ctx, p.wall, l, eave, w, h);
  poly(ctx, p.roof, [x, eave - gable], [x + depth, eave - gable - Math.abs(depth) * .44], [edge + depth + 3 * side, eave - Math.abs(depth) * .44], [edge + 3 * side, eave]);
  poly(ctx, '#433647', [l - 3, eave], [x, eave - gable], [r + 3, eave]);
  line(ctx, '#bd8b7c', 1.4, [l - 3, eave], [x, eave - gable], [x + depth, eave - gable - Math.abs(depth) * .44]);
  const columns = w > 60 ? 4 : w > 36 ? 3 : 2;
  for (let j = 1; j <= floors; j++) {
    const bottom = eave + j * (h / (floors + .2)) - h * .08;
    for (let i = 0; i < columns; i++) {
      windowLight(ctx, p, l + w * (i + .5) / columns, bottom, w / columns * .46, Math.min(23, h / (floors + 1) * .65), rnd() > .27, j !== floors);
    }
    line(ctx, '#c68d7b66', 1, [l, bottom + 4], [r, bottom + 4]);
  }
  if (w > 36) rect(ctx, '#513543', x + w * .15, eave - gable * .9, w * .09, gable * .55);
}

function clock(ctx: Ink, p: Place, x: number, y: number, r: number) {
  halo(ctx, x, y, r * 3, '#eeb17a53');
  oval(ctx, '#362b40', x, y, r + 3);
  oval(ctx, p.light, x, y, r);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    oval(ctx, '#6b4952', x + Math.sin(a) * r * .78, y + Math.cos(a) * r * .78, i % 3 === 0 ? 1.15 : .55);
  }
  line(ctx, '#593c49', 1.3, [x - r * .45, y + r * .2], [x, y], [x + r * .2, y - r * .62]);
}

function tower(ctx: Ink, p: Place, x: number, y: number, w: number, h: number, clockTower = false) {
  const top = y - h;
  rect(ctx, p.wall, x - w / 2, top, w, h);
  poly(ctx, '#55394a', [x + w / 2, top], [x + w * .79, top - w * .13], [x + w * .79, y - w * .13], [x + w / 2, y]);
  poly(ctx, p.roof, [x - w * .64, top], [x - w * .37, top - w * .28], [x, top - w], [x + w * .34, top - w * .3], [x + w * .64, top]);
  line(ctx, '#c39389', 1.4, [x - w * .64, top], [x - w * .37, top - w * .28], [x, top - w]);
  line(ctx, '#e8b38a', 1.5, [x, top - w - 12], [x, top - w + 2]);
  oval(ctx, p.light, x, top - w - 10, 2);
  if (clockTower) clock(ctx, p, x, top + w * .48, w * .24);
  for (let yy = top + w * (clockTower ? 1.26 : .61); yy < y; yy += w * .75) {
    windowLight(ctx, p, x, yy, w * .23, w * .42, true);
  }
}

function theatre(ctx: Ink, p: Place, x: number, y: number) {
  const top = y - 116;
  oval(ctx, '#362d4388', x + 15, y - 3, 150, 19);
  poly(ctx, '#613b4d', [x + 111, top], [x + 145, top - 18], [x + 145, y - 22], [x + 111, y]);
  rect(ctx, p.wall, x - 111, top, 222, 116);
  poly(ctx, p.roof, [x - 119, top], [x - 101, top - 14], [x + 113, top - 31], [x + 151, top - 18], [x + 119, top]);
  ctx.beginPath();
  ctx.moveTo(x - 47, top - 12);
  ctx.bezierCurveTo(x - 31, top - 20, x - 38, top - 60, x, top - 66);
  ctx.bezierCurveTo(x + 38, top - 60, x + 31, top - 20, x + 47, top - 12);
  ctx.fillStyle = p.roof;
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 12, top - 13);
    ctx.quadraticCurveTo(x + i * 9, top - 56, x, top - 66);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#8aafaa';
    ctx.stroke();
  }
  line(ctx, '#f6c48e', 2, [x, top - 67], [x, top - 83]);
  oval(ctx, p.light, x, top - 79, 3);
  rect(ctx, '#c58e7e', x - 116, top + 3, 232, 8);
  poly(ctx, '#dfaa89', [x - 83, top + 28], [x, top - 6], [x + 83, top + 28]);
  poly(ctx, '#aa6c66', [x - 64, top + 24], [x, top + 1], [x + 64, top + 24]);
  oval(ctx, '#ffe3aa', x, top + 17, 9, 5);
  for (let i = -2; i <= 2; i++) windowLight(ctx, p, x + i * 27, y - 18, 17, 60, true);
  for (let i = -3; i <= 3; i++) {
    const px = x + i * 27 - 13;
    rect(ctx, '#d5a089', px, top + 32, 6, 60);
    rect(ctx, '#f4c5a0', px - 2, top + 30, 10, 4);
    rect(ctx, '#bd837b', px - 2, y - 27, 10, 5);
  }
  windowLight(ctx, p, x - 96, y - 20, 13, 36);
  windowLight(ctx, p, x + 96, y - 20, 13, 36);
  for (let i = 0; i < 4; i++) {
    rect(ctx, i % 2 ? '#825665' : '#bd8b82', x - 110 - i * 3, y - 15 + i * 4, 220 + i * 6, 4);
  }
}

function tree(ctx: Ink, x: number, y: number, h: number, seed: number, kind: 'pine' | 'bloom' | 'cypress') {
  const rnd = random(seed);
  oval(ctx, '#211d334e', x + 10, y + 1, h * .43, h * .075);
  line(ctx, kind === 'pine' ? '#2d3544' : '#493546', h * .045, [x + 2, y], [x, y - h * .74]);
  if (kind === 'cypress') {
    const r = h * .2;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.bezierCurveTo(x + r * 1.7, y - h * .52, x + r, y - h * .06, x, y - h * .1);
    ctx.bezierCurveTo(x - r, y - h * .06, x - r * 1.7, y - h * .52, x, y - h);
    ctx.fillStyle = '#344c50';
    ctx.fill();
    line(ctx, '#78948a88', h * .016, [x, y - h * .75], [x - r * .4, y - h * .37]);
  } else if (kind === 'pine') {
    for (let i = 3; i >= 0; i--) {
      const top = y - h + i * h * .17;
      const r = h * (.18 + i * .053);
      poly(ctx, i % 2 ? '#334b5b' : '#405b64', [x, top], [x - r, top + h * .36], [x - r * .2, top + h * .33], [x + r, top + h * .35]);
      poly(ctx, '#a8c8d0', [x, top], [x - r * .85, top + h * .3], [x - r * .23, top + h * .24], [x + r * .41, top + h * .19]);
    }
  } else {
    const colors = ['#57405f', '#76516d', '#a56780', '#ca8496', '#edacaa'];
    const r = h * .24;
    for (let i = 0; i < 4; i++) line(ctx, '#4d3649', h * .026, [x, y - h * .33], [x + (rnd() - .5) * h * .64, y - h * (.64 + rnd() * .23)]);
    for (let i = 0; i < 31; i++) {
      const t = rnd() * TAU;
      const ring = rnd() * r * 1.22;
      const px = x + Math.cos(t) * ring * 1.4;
      const py = y - h * .69 + Math.sin(t) * ring;
      const size = r * (.25 + rnd() * .52);
      oval(ctx, colors[i < 12 ? i % 2 : 2 + (py < y - h * .74 ? i % 3 : i % 2)], px, py, size, size * .84);
    }
  }
}

function lamp(ctx: Ink, p: Place, x: number, y: number, h: number, side: number) {
  const top = y - h;
  line(ctx, '#292639', Math.max(1.5, h * .037), [x, y], [x, top + h * .05], [x + side * h * .18, top]);
  line(ctx, '#948181', Math.max(.45, h * .013), [x - .8, y - h * .14], [x - .8, top + h * .08]);
  const a = x + side * h * .18;
  halo(ctx, a, top + h * .11, h * .49, '#f8ab664f');
  poly(ctx, p.light, [a - h * .071, top + h * .04], [a + h * .071, top + h * .04], [a + h * .046, top + h * .19], [a - h * .046, top + h * .19]);
  poly(ctx, '#4d3848', [a - h * .09, top + h * .05], [a, top - h * .015], [a + h * .09, top + h * .05]);
}

function sky(ctx: Ink, p: Place, scene: number, span: number) {
  rect(ctx, '#171428', -span, -310, span * 2, 820);
  ctx.fillStyle = gradient(ctx, -300, 65, [[0, p.sky[0]], [.48, p.sky[1]], [1, p.sky[2]]]);
  ctx.fillRect(-span, -310, span * 2, 405);
  const rnd = random(682 + scene);
  const [mx, my] = p.moon;
  halo(ctx, mx, my, 107, scene === 1 || scene === 4 ? '#c3e7ed40' : '#f2a57f55');
  for (let i = 0; i < 91; i++) {
    const x = (rnd() - .5) * span * 2;
    const y = -295 + rnd() * 228;
    const r = .46 + rnd() * 1.05;
    if (Math.hypot(x - mx, y - my) < 45) continue;
    ctx.globalAlpha = .2 + rnd() * .63;
    oval(ctx, i % 4 ? '#ffddaf' : '#b5e4dc', x, y, r, r * .86);
    if (i % 13 === 0) {
      line(ctx, '#ffebc7', .6, [x - 4, y], [x + 4, y]);
      line(ctx, '#ffebc7', .6, [x, y - 4], [x, y + 4]);
    }
  }
  ctx.globalAlpha = 1;
  const r = scene === 1 ? 44 : 36;
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = gradient(ctx, my - r, my + r, [[0, '#fff0c8'], [1, '#f2ac83']]);
  ctx.fillRect(mx - r, my - r, r * 2, r * 2);
  for (let i = 0; i < 16; i++) {
    const x = mx + (rnd() - .5) * r * 2;
    const y = my + (rnd() - .5) * r * 2;
    oval(ctx, i % 2 ? '#fff3cb46' : '#bd82972e', x, y, 3 + rnd() * 13, 1 + rnd() * 6);
  }
  ctx.restore();
  for (let i = 0; i < 14; i++) {
    const x = (rnd() - .5) * span * 2;
    const y = -94 + rnd() * 96;
    const w = 40 + rnd() * 110;
    poly(ctx, i % 3 ? '#ffc6a51f' : '#cfa0b331', [x - w, y + 5], [x - w * .38, y + 2], [x - w * .25, y - 3], [x + w * .2, y - 5], [x + w * .65, y - 2], [x + w, y], [x + w * .55, y + 4]);
  }
}

function ridges(ctx: Ink, p: Place, scene: number, span: number) {
  const alpine = scene === 1 || scene === 4;
  const rnd = random(917 + scene);
  for (let j = 0; j < 3; j++) {
    const ridge: Point[] = [[-span, 60]];
    for (let x = -span - 10; x < span + 90; x += alpine ? 42 : 34) {
      const lowerCenter = Math.max(0, 1 - Math.abs(x) / 270);
      const silhouette = Math.sin(x / (68 + j * 16) + j * .57) * (alpine ? 24 : 11);
      const y = -24 + j * 14 + lowerCenter * 23 + silhouette - rnd() * (alpine ? 53 - j * 8 : 23);
      ridge.push([x, y]);
    }
    poly(ctx, p.hills[j], ...ridge, [span, 70]);
    if (alpine && j < 2) {
      for (let i = 1; i < ridge.length - 2; i++) {
        const [x, y] = ridge[i + 1];
        const [left, right] = [ridge[i], ridge[i + 2]];
        if (y > left[1] - 12 || y > right[1] - 8) continue;
        poly(ctx, j ? '#b6bccf76' : '#d4d8e388', [x, y], [(x + left[0]) / 2, (y + left[1]) / 2], [x - 5, y + 11], [x + 4, y + 16], [x + 7, y + 9], [(x + right[0]) / 2, (y + right[1]) / 2]);
      }
    }
  }
}

function river(ctx: Ink, p: Place, scene: number, span: number) {
  const frost = scene === 1;
  const canal = scene === 5;
  const rnd = random(1772 + scene);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-span, 18);
  ctx.lineTo(span, 18);
  if (canal) {
    ctx.quadraticCurveTo(180, 72, 208, 135);
    ctx.quadraticCurveTo(282, 244, span, 298);
    ctx.lineTo(span, 510);
    ctx.lineTo(-span, 510);
    ctx.quadraticCurveTo(-221, 315, -180, 182);
    ctx.quadraticCurveTo(-127, 89, -span, 48);
  } else {
    ctx.lineTo(span, frost ? 440 : 232);
    ctx.quadraticCurveTo(44, 343, -span, frost ? 409 : 245);
  }
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = gradient(ctx, 14, 430, [[0, frost ? '#879fae' : '#82788f'], [.25, frost ? '#527b90' : '#516f7b'], [1, frost ? '#1a4359' : '#1e3c51']]);
  ctx.fillRect(-span, 17, span * 2, 510);
  for (let i = 0; i < 200; i++) {
    const n = rnd() ** 1.6;
    const y = 24 + n * 450;
    const x = (rnd() - .5) * span * 2;
    const w = (6 + n * 63) * rnd();
    const color = i % 5 === 0 ? '#ffe1bb57' : (i % 2 ? '#accfcd42' : '#172f4590');
    line(ctx, color, Math.max(.65, n * 3), [x - w, y], [x + w * .4, y], [x + w, y - n * 2]);
  }
  if (frost) {
    for (let i = 0; i < 31; i++) {
      const y = 28 + rnd() ** 1.45 * 340;
      const x = (rnd() - .5) * span * 2;
      const w = 12 + y * .13;
      poly(ctx, i % 2 ? '#9fc6d16b' : '#bddce067', [x - w, y], [x - w * .3, y - w * .16], [x + w * .6, y - w * .12], [x + w, y + w * .06], [x + w * .15, y + w * .16]);
      line(ctx, '#e0f4ed86', .8, [x - w * .9, y], [x + w * .15, y + w * .16], [x + w, y + w * .06]);
    }
  }
  for (const x of [-258, -138, -72, 97, 164, 248]) {
    for (let j = 0; j < 19; j++) {
      const y = 27 + j * (1 + j * .15);
      const dx = (rnd() - .5) * (3 + j * 1.6);
      ctx.globalAlpha = .45 * (1 - j / 20);
      line(ctx, p.light, 1 + j * .09, [x + dx, y], [x + dx + 3 + j * .5, y]);
    }
  }
  ctx.restore();
}

function viaduct(ctx: Ink, p: Place, span: number) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(10, 17);
    ctx.lineTo(span, 60);
    ctx.lineTo(span, 177);
    ctx.lineTo(10, 31);
    ctx.closePath();
    let x = 28;
    let w = 14;
    while (x < span + 70) {
      const r = w / 2;
      const y = 29 + x * .077;
      ctx.moveTo(x - r, 210);
      ctx.lineTo(x - r, y + r);
      ctx.arc(x, y + r, r, Math.PI, 0);
      ctx.lineTo(x + r, 210);
      ctx.closePath();
      x += w * 1.42;
      w *= 1.22;
    }
    ctx.clip('evenodd');
    ctx.fillStyle = gradient(ctx, 22, 178, [[0, '#aa8b8a'], [.38, p.wall], [1, '#3c3a53']]);
    ctx.fillRect(0, 12, span + 2, 201);
    x = 28;
    w = 14;
    while (x < span + 70) {
      const y = 29 + x * .077;
      for (let j = 0; j < 10; j++) {
        const a = Math.PI + j * Math.PI / 9;
        line(ctx, '#d2b6ab86', 1, [x + Math.cos(a) * w * .5, y + w / 2 + Math.sin(a) * w * .5], [x + Math.cos(a) * w * .62, y + w / 2 + Math.sin(a) * w * .62]);
      }
      x += w * 1.42;
      w *= 1.22;
    }
    const rnd = random(44 + side);
    for (let i = 0; i < 100; i++) {
      const x = rnd() * span;
      const y = 29 + x * .08 + rnd() * x * .28;
      line(ctx, '#d3b8af44', 1, [x, y], [x + 3 + rnd() * 12, y]);
    }
    ctx.restore();
    line(ctx, '#b39089', 4, [side * 9, 16], [side * span, 59]);
    line(ctx, '#e0bfaa', 1, [side * 9, 14], [side * span, 57]);
  }
}

function lanternString(ctx: Ink, p: Place, left: number, right: number, y: number, sag: number, count: number) {
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.quadraticCurveTo((left + right) / 2, y + sag * 2, right, y);
  ctx.strokeStyle = '#433344';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const x = left + (right - left) * t;
    const yy = y + 4 * t * (1 - t) * sag;
    const h = 7 + y * .022 + sag * .12;
    halo(ctx, x, yy + h, h * 2.8, '#ffb47f64');
    line(ctx, '#4b3b4a', 1.25, [x, yy], [x, yy + h * .48]);
    oval(ctx, '#b96c6b', x, yy + h, h * .6, h * .68);
    oval(ctx, p.light, x, yy + h, h * .41, h * .59);
    line(ctx, '#b26363', .85, [x, yy + h * .56], [x, yy + h * 1.43]);
    line(ctx, '#e7a589', .85, [x, yy + h * 1.6], [x, yy + h * 1.89]);
  }
}

function pavilion(ctx: Ink, p: Place, x: number, base: number, s: number) {
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  oval(ctx, '#3026377e', 8, 0, 59, 10);
  rect(ctx, '#8e6a75', -48, -6, 96, 8);
  rect(ctx, '#d6a18e', -44, -9, 88, 3);
  rect(ctx, '#583f53', -37, -60, 74, 51);
  for (const xx of [-23, 0, 23]) windowLight(ctx, p, xx, -14, 17, 40);
  for (const xx of [-37, -12, 12, 37]) rect(ctx, '#b5837e', xx - 2, -60, 4, 52);
  ctx.beginPath();
  ctx.moveTo(-58, -58);
  ctx.quadraticCurveTo(-32, -61, 0, -99);
  ctx.quadraticCurveTo(32, -61, 58, -58);
  ctx.quadraticCurveTo(20, -51, -58, -58);
  ctx.fillStyle = p.roof;
  ctx.fill();
  line(ctx, '#a4c2ab', 1.8, [-57, -58], [-42, -62], [-24, -75], [0, -99]);
  line(ctx, '#f0c598', 1.8, [-58, -58], [-26, -55], [26, -55], [58, -58]);
  oval(ctx, '#ffdcaa', 0, -100, 3);
  ctx.restore();
}

function terminus(ctx: Ink, p: Place, span: number) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    poly(ctx, '#654754', [19, 7], [span, 210], [span, 302], [19, 14]);
    line(ctx, '#d6a487', 3, [19, 11], [span, 233]);
    poly(ctx, '#99717b', [51, -15], [125, -92], [480, -143], [521, 173], [68, 27]);
    poly(ctx, '#725665', [62, -39], [146, -116], [480, -165], [552, -109], [141, -85]);
    line(ctx, '#c4a093', 3, [62, -39], [146, -116], [480, -165], [552, -109]);
    for (const [x, bottom, size] of [[75, 9, 13], [106, 22, 18], [144, 36, 24], [193, 52, 31], [250, 70, 36], [315, 93, 42], [389, 116, 48], [473, 145, 57]]) {
      windowLight(ctx, p, x, bottom, size, size * 1.5);
      rect(ctx, '#bd9191', x + size * .66, bottom - size * 2.12, size * .14, size * 2.42);
    }
    // An opposing pair of Art Nouveau glass canopies forms the arrival frame.
    ctx.beginPath();
    ctx.moveTo(56, -25);
    ctx.quadraticCurveTo(89, -90, 144, -86);
    ctx.lineTo(span, -226);
    ctx.quadraticCurveTo(span * .66, -188, span * .59, 1);
    ctx.closePath();
    ctx.fillStyle = '#477176b5';
    ctx.fill();
    line(ctx, '#faaf8850', 3, [57, -24], [span * .59, 1]);
    for (let i = 1; i < 8; i++) {
      const t = (i / 8) ** 1.45;
      const x = 56 + (span * .59 - 56) * t;
      const tx = 141 + (span - 141) * t;
      const y = -25 + t * 25;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 3, y - 60 - t * 100, tx, -86 - t * 139);
      ctx.lineWidth = 2 + 3 * t;
      ctx.strokeStyle = '#a9c0b2';
      ctx.stroke();
      line(ctx, '#443b4e', 2 + t * 3, [x, y], [x, 25 + t * 130]);
      halo(ctx, x, y + 6, 15 + 15 * t, '#ffc59072');
      oval(ctx, p.light, x, y + 6, 1.4 + t * 3, 3 + t * 2);
    }
    ctx.restore();
  }
  tower(ctx, p, -165, -8, 43, 135, true);
  tower(ctx, p, 150, 3, 30, 90, false);
  poly(ctx, '#5a4757', [-45, 9], [-45, -15], [0, -43], [44, -15], [44, 9], [17, 6], [17, -4], [0, -15], [-17, -4], [-17, 7]);
  line(ctx, '#d8a786', 2, [-46, -15], [0, -43], [44, -15]);
  clock(ctx, p, 0, -27, 5);
}

function sceneryPlate(ctx: Ink, p: Place, scene: number, span: number) {
  sky(ctx, p, scene, span);
  ridges(ctx, p, scene, span);
  ctx.fillStyle = gradient(ctx, 0, 510, [[0, p.ground[0]], [.41, p.ground[1]], [1, '#1d192b']]);
  ctx.fillRect(-span, 2, span * 2, 520);
  const rnd = random(742 + scene);
  if (scene === 1 || scene === 4 || scene === 5) river(ctx, p, scene, span);
  if (scene === 0 || scene === 1) {
    for (let i = 0; i < 30; i++) {
      const x = -span + i * span / 14.5;
      if (Math.abs(x) < 26) continue;
      const w = 13 + rnd() * 22;
      const y = 13 + rnd() * 21;
      const h = 14 + rnd() * (scene === 0 ? 52 : 21);
      house(ctx, p, x, y, w, h, h > 32 ? 2 : 1, i + 200, x > 0);
    }
  }
  switch (scene) {
    case 0:
      for (let i = 8; i >= 0; i--) {
        const t = i / 8;
        const x = 58 + t * 459;
        const y = 14 + t * t * 187;
        house(ctx, p, x, y, 27 + t * 100, 34 + t * 110, t > .5 ? 3 : 2, 285 + i, true);
      }
      tower(ctx, p, 194, 82, 37, 104, true);
      house(ctx, p, -398, 121, 98, 109, 3, 24);
      theatre(ctx, p, -194, 104);
      for (let i = 0; i < 12; i++) {
        const x = -span + rnd() * (span - 82);
        const y = 115 + rnd() * 112;
        line(ctx, '#c388793d', 1 + y * .007, [x, y], [x + 21 + rnd() * 35, y + 2]);
      }
      break;
    case 1:
      for (const side of [-1, 1]) {
        poly(ctx, '#748a9c', [side * span, 23], [side * 84, 28], [side * 139, 39], [side * 292, 58], [side * span, 114]);
        line(ctx, '#b8d3d6', 2, [side * 86, 28], [side * 139, 38], [side * 292, 57], [side * span, 109]);
        for (let i = 0; i < 21; i++) {
          const x = side * (82 + rnd() * (span - 47));
          const y = 30 + Math.abs(x) ** 1.32 * .012 + rnd() * 15;
          tree(ctx, x, y, 17 + rnd() * (22 + Math.abs(x) * .16), i + side * 81, 'pine');
        }
      }
      house(ctx, p, 130, 34, 38, 37, 2, 10, true);
      house(ctx, p, -92, 30, 28, 22, 1, 50);
      break;
    case 2:
      for (let i = 0; i < 30; i++) {
        const x = (rnd() > .5 ? 1 : -1) * (62 + rnd() * span);
        const y = 19 + rnd() * 33;
        tree(ctx, x, y, 28 + rnd() * 60, i + 65, i % 3 === 0 ? 'bloom' : 'cypress');
      }
      pavilion(ctx, p, -161, 99, 1.42);
      pavilion(ctx, p, 172, 82, 1.1);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
          const x = side * (110 + rnd() * span);
          const y = 103 + rnd() * 105;
          tree(ctx, x, y, 59 + rnd() * 104, i + side * 137, 'bloom');
        }
      }
      lanternString(ctx, p, -span, -110, -43, 32, 9);
      lanternString(ctx, p, 99, span, -61, 53, 10);
      lanternString(ctx, p, -113, 114, -75, 22, 8);
      break;
    case 3:
      terminus(ctx, p, span);
      break;
    case 4:
      viaduct(ctx, p, span);
      tower(ctx, p, 178, 36, 26, 68, true);
      for (let i = 0; i < 22; i++) {
        const side = i % 2 ? 1 : -1;
        const x = side * (98 + rnd() * span * .93);
        const y = 12 + Math.abs(x) * .087;
        if ((side === 1 && x > 151 && x < 208) || (side === -1 && x > -246 && x < -125)) continue;
        tree(ctx, x, y, 18 + rnd() * (26 + Math.abs(x) * .07), i + 315, 'pine');
      }
      house(ctx, p, -177, 38, 44, 49, 2, 29);
      break;
    case 5:
      for (let i = 0; i < 26; i++) {
        const x = (rnd() > .5 ? 1 : -1) * (35 + rnd() * span);
        const y = 14 + rnd() * 26;
        tree(ctx, x, y, 22 + rnd() * 63, i + 157, 'bloom');
      }
      pavilion(ctx, p, 214, 132, 1.18);
      pavilion(ctx, p, -222, 170, 1.43);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const x = side * (185 + i * 49);
          const y = 96 + i * 31;
          lamp(ctx, p, x, y, 27 + i * 5, -side);
          if (i % 2 === 1) tree(ctx, x + side * 39, y + 12, 95 + i * 15, i + side * 217, 'bloom');
        }
      }
      for (const [x, y, s] of [[-104, 119, .78], [177, 218, 1.12], [65, 56, .37]]) {
        oval(ctx, '#b1bdbe45', x, y + 3 * s, 34 * s, 5 * s);
        poly(ctx, '#d18a79', [x - 31 * s, y - 7 * s], [x + 33 * s, y - 7 * s], [x + 19 * s, y + 2 * s], [x - 20 * s, y + 2 * s]);
        poly(ctx, '#819d94', [x - 23 * s, y - 9 * s], [x - 6 * s, y - 21 * s], [x + 13 * s, y - 21 * s], [x + 25 * s, y - 9 * s]);
        oval(ctx, p.light, x + 26 * s, y - 8 * s, 2.6 * s);
      }
      break;
  }
  // Original engraving marks and grasses sit on the foreground banks, not the play line.
  for (let i = 0; i < 140; i++) {
    const y = rnd() * 460 + 23;
    const side = rnd() > .5 ? 1 : -1;
    const x = side * (y * .72 + 30 + rnd() * span * (scene === 1 ? .8 : .95));
    if (Math.abs(x) > span + 9) continue;
    const g = 2 + rnd() * (y * .028 + 2);
    if (scene === 1 || scene === 5) {
      line(ctx, '#b9ddd125', 1, [x - g, y], [x + g * 1.6, y]);
    } else {
      line(ctx, i % 3 ? '#b0a38c29' : '#73948946', 1, [x - g * .6, y - g], [x, y], [x + g * .3, y - g * .8]);
    }
  }
}

function rails(ctx: Ink, p: Place, scene: number, progress: number, span: number) {
  const rise = 510;
  const bridge = scene === 1 || scene === 4 || scene === 5;
  const shoulder = bridge ? .60 : .72;
  poly(ctx, bridge ? '#253543' : '#302737', [0, 0], [rise * shoulder, rise], [-rise * shoulder, rise]);
  poly(ctx, '#211f2e', [0, 0], [rise * .45, rise], [-rise * .45, rise]);
  for (const side of [-1, 1]) {
    poly(ctx, '#b2a0a058', [0, 0], [side * rise * shoulder, rise], [side * rise * (shoulder - .025), rise]);
    if (bridge) {
      poly(ctx, '#9cb6bd55', [0, 0], [side * rise * .58, rise], [side * rise * .544, rise]);
      poly(ctx, '#86adb7', [0, 0], [side * rise * .598, rise], [side * rise * .588, rise]);
    }
  }
  const ties = 29;
  // Equal depths pass the camera at increasing screen-space intervals.
  const offset = progress * (scene === 3 ? 25 : 44) % 1;
  for (let j = ties; j >= 0; j--) {
    const z = j + 1 - offset;
    const y = rise / (1 + z * .69);
    const s = y * .54;
    if (y > 504) continue;
    poly(ctx, '#171622', [-s, y], [s, y], [s * 1.03, y + y * .031], [-s * 1.03, y + y * .031]);
    line(ctx, bridge ? '#627d83' : '#785764', Math.max(.7, y * .012), [-s, y], [s, y]);
  }
  for (const side of [-1, 1]) {
    poly(ctx, '#151622', [0, 0], [side * rise * .349, rise], [side * rise * .405, rise]);
    poly(ctx, p.rail, [0, 0], [side * rise * .374, rise], [side * rise * .391, rise]);
    poly(ctx, '#fff2cc99', [0, 0], [side * rise * .378, rise], [side * rise * .382, rise]);
    const positions = [10, 14, 20, 27, 35, 45, 61, 82, 110, 152, 223, 320, 438];
    for (const y of positions) {
      const x = y * shoulder * side;
      if (Math.abs(x) > span + 12) continue;
      if (bridge) {
        line(ctx, '#263544', .7 + y * .018, [x, y + y * .008], [x, y - y * .12]);
        line(ctx, '#b0cbca', .65 + y * .006, [x - side * y * .006, y], [x - side * y * .006, y - y * .12]);
      }
    }
    if (bridge) poly(ctx, '#a6c5c5', [0, 0], [side * rise * shoulder, rise * .88], [side * rise * shoulder, rise * .899]);
  }
  if (scene !== 3) {
    const period = progress * 4.1;
    for (let i = 8; i >= 0; i--) {
      const z = i + 1 - period % 1;
      const y = 540 / (1 + z * .68);
      const x = y * (shoulder + .055);
      if (x > span + 80) continue;
      for (const side of [-1, 1]) {
        if (i % 2 === 1 && y > 130 && (scene === 1 || scene === 4)) continue;
        lamp(ctx, p, side * x, y, 2.6 + y * .34, side);
      }
    }
  }
}

function atmosphere(ctx: Ink, scene: number, progress: number, span: number) {
  const rnd = random(239 + scene);
  const snow = scene === 1;
  const petals = scene === 2 || scene === 5;
  for (let i = 0; i < (snow ? 42 : petals ? 28 : 17); i++) {
    const side = rnd() < .5 ? -1 : 1;
    const y = -31 + ((rnd() + progress * (.06 + rnd() * .15)) % 1) * 380;
    const x = side * (42 + y * .16 + rnd() * span * .87) + Math.cos(progress * 6 + i) * y * .046;
    const r = rnd() * (y > 0 ? 1.9 : .9) + .52;
    const alpha = rnd() * .35 + .12;
    ctx.globalAlpha = alpha;
    if (petals) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(i + progress * 2);
      oval(ctx, '#ffbdc4', 0, 0, r * 1.6, r * .66);
      ctx.restore();
    } else {
      oval(ctx, snow ? '#d3eeee' : '#ffd2a0', x, y, r, r * (snow ? .86 : .64));
    }
  }
  ctx.globalAlpha = 1;
}

export function createScenery(host: HTMLElement): { draw(scene: number, progress: number, staff?: boolean): void; resize(): void; dispose(): void } {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { display: 'block', position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const plate = document.createElement('canvas');
  const ink = plate.getContext('2d', { alpha: false });
  const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let width = 0;
  let height = 0;
  let activeScene = 0;
  let activeProgress = 0;
  let plateScene = -1;
  let paintedProgress = Number.NaN;
  let activeStaff = false, paintedStaff = false;
  let disposed = false;

  function draw(scene: number, progress: number, staff = activeStaff) {
    activeStaff = staff;
    const index = Number.isFinite(scene) ? Math.trunc(scene) : 0;
    activeScene = (index % places.length + places.length) % places.length;
    activeProgress = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
    const travel = reduced?.matches ? 0 : activeProgress;
    if (disposed || !ctx || !ink || !width || !height || (plateScene === activeScene && paintedProgress === travel && paintedStaff === staff)) return;
    const place = places[activeScene];
    const span = Math.min(740, Math.max(300, width / height * 337));
    const xScale = canvas.width / (span * 2);
    const yScale = canvas.height / 800;
    const xCenter = canvas.width / 2;
    const horizon = canvas.height * .37;
    if (plateScene !== activeScene) {
      ink.setTransform(xScale, 0, 0, yScale, xCenter, horizon);
      sceneryPlate(ink, place, activeScene, span + 15);
      plateScene = activeScene;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(plate, 0, 0);
    ctx.setTransform(xScale, 0, 0, yScale, xCenter, horizon);
    if (!staff) rails(ctx, place, activeScene, travel, span);
    atmosphere(ctx, activeScene, travel, span);
    paintedProgress = travel; paintedStaff = staff;
  }

  function resize() {
    if (disposed) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    const density = Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(3_000_000 / (w * h)));
    const pixelsWide = Math.max(1, Math.round(w * density));
    const pixelsHigh = Math.max(1, Math.round(h * density));
    if (w === width && h === height && pixelsWide === canvas.width && pixelsHigh === canvas.height) return;
    width = w;
    height = h;
    canvas.width = plate.width = pixelsWide;
    canvas.height = plate.height = pixelsHigh;
    plateScene = -1;
    draw(activeScene, activeProgress);
  }

  resize();
  return { draw, resize, dispose() {
    disposed = true;
    canvas.remove();
    canvas.width = canvas.height = plate.width = plate.height = 0;
  } };
}
