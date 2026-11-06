export type ArtPlace = 'home' | 'shop' | 'school' | 'bank' | 'park';

export interface ArtOptions {
  place: ArtPlace | 'town';
  gender: 'boy' | 'girl';
  children: 1 | 2 | 3;
  age: number;
  day: number;
  outfit: number;
  completed: boolean;
  cash: number;
  savings: number;
  debt: number;
  stock: number;
  weather: 'sunny' | 'rainy';
  travel?: boolean;
  lifeScene?: string;
  offspring?: number[];
}

// Percent coordinates refer to the complete 1440 × 900 world, not a cropped viewport.
export const townAnchors: Record<ArtPlace, { x: number; y: number }> = {
  home: { x: 17, y: 57 },
  shop: { x: 37, y: 59 },
  school: { x: 61, y: 54 },
  bank: { x: 83, y: 59 },
  park: { x: 80, y: 76 },
};

type Person = ArtOptions['gender'] | 'parent' | 'friend' | 'banker';
type Pose = 'wave' | 'hold' | 'walk' | 'sit';
const c = {
  ink: '#593d32', fine: '#96755a', sky: '#b9dfe8', cloud: '#fff8e8',
  sun: '#f9d976', hill: '#96bc87', grass: '#6ea46c', leaf: '#4e875d',
  lightLeaf: '#a5c477', cream: '#fff0ce', paper: '#fff9e9', apricot: '#edab83',
  roof: '#d78362', cherry: '#c95854', teal: '#438c87', blue: '#649db5',
  wood: '#b98760', lightWood: '#e4b989', skin: '#f3bd98', blush: '#e88f83',
  shadow: '#56764e', yellow: '#efc458', brick: '#ca876b', floor: '#dfb38a',
};
const clothes = [c.cherry, c.teal, c.blue, '#c69745', '#8b7394', '#638c59'];
const bound = (n: number, low: number, high: number, fallback = low): number =>
  Number.isFinite(n) ? Math.min(high, Math.max(low, Math.floor(n))) : fallback;
const places: readonly string[] = ['town', 'home', 'shop', 'school', 'bank', 'park'];
function safeOptions(o: ArtOptions): ArtOptions {
  return {
    place: places.includes(o.place) ? o.place : 'town',
    gender: o.gender === 'girl' ? 'girl' : 'boy',
    children: bound(o.children, 1, 3) as 1 | 2 | 3,
    age: bound(o.age, 7, 100), day: bound(o.day, 1, 3650),
    outfit: bound(o.outfit, 0, 99), completed: o.completed === true,
    cash: bound(o.cash, 0, 999999), savings: bound(o.savings, 0, 999999),
    debt: bound(o.debt, 0, 999999), stock: bound(o.stock, 0, 99),
    weather: o.weather === 'rainy' ? 'rainy' : 'sunny', travel: o.travel === true, lifeScene: typeof o.lifeScene==='string'?o.lifeScene:undefined, offspring:o.offspring?.map(a=>bound(a,0,100)),
  };
}
function g(x: number, y: number, scale: number, content: string): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">${content}</g>`;
}
function path(d: string, fill = 'none', extra = ''): string {
  return `<path d="${d}" fill="${fill}" ${extra}/>`;
}
function rect(x: number, y: number, w: number, h: number, fill: string, r = 0, extra = ''): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
}
function ellipse(x: number, y: number, rx: number, ry: number, fill: string, extra = ''): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
}
function circle(x: number, y: number, r: number, fill: string, extra = ''): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
}
function shadow(x: number, y: number, rx: number, ry = 14): string {
  return ellipse(x, y, rx, ry, c.ink, 'stroke="none" opacity=".12"');
}
function flower(x: number, y: number, scale = 1, color: string = c.paper): string {
  return g(x, y, scale, `${path('M0 14 Q-3 5 0 0', 'none', `stroke="${c.leaf}"`)}
    ${path('M-1 10 Q-13 2-10 11 Q-7 16-1 10', c.leaf, 'stroke="none"')}
    ${circle(-5, -2, 5, color)}${circle(5, -2, 5, color)}${circle(0, -7, 5, color)}${circle(0, 3, 5, color)}${circle(0, -2, 3, c.yellow)}`);
}
function flowers(x: number, y: number, scale = 1): string {
  return g(x, y, scale, flower(-28, 4, .8, c.apricot) + flower(0, -5, 1, c.paper) + flower(25, 9, .75, '#f5c5b3'));
}
function sprig(x: number, y: number, scale = 1): string {
  return g(x, y, scale, path('M0 9 Q-6-4-12-7 M0 9 Q1-9 7-12 M0 9 Q12-2 18 1', 'none', `stroke="${c.leaf}" stroke-width="3"`));
}
function tree(x: number, y: number, scale = 1, flowering = false): string {
  return g(x, y, scale, `${shadow(4, 0, 64, 15)}
    ${path('M-12-4 L-9-135 Q-4-153 8-142 L15-5Z', c.wood)}
    ${path('M-1-83 L-35-118 M3-60 L34-106', 'none', `stroke="${c.fine}" stroke-width="8"`)}
    ${path('M-66-107 Q-90-145-54-161 Q-63-195-19-197 Q-3-224 29-201 Q67-208 71-171 Q98-145 67-115 Q30-85-1-110 Q-31-88-66-107Z', flowering ? '#a8bf7e' : c.grass)}
    ${path('M-54-165 Q-28-185-15-168 M21-184 Q46-190 53-169 M35-122 Q15-132 0-119', 'none', `stroke="${flowering ? '#7da16c' : c.leaf}" stroke-width="4"`)}
    ${flowering ? flower(-45, -145, .8, '#f9d5c5') + flower(22, -173, .8, c.paper) + flower(49, -137, .7, '#f9d5c5') + flower(-7, -195, .6, c.paper) : ''}
    ${sprig(-45, 4, .8)}${flowers(38, 4, .65)}`);
}
function plant(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${path('M-22-34 Q-4-37 22-34 L17 0 Q0 8-17 0Z', c.apricot)}
    ${path('M0-34 Q-1-75-19-86 M0-35 Q17-66 25-84 M0-35 L1-98', 'none', `stroke="${c.leaf}" stroke-width="4"`)}
    ${path('M-16-64 Q-44-91-30-92 Q-10-94-16-64 M10-60 Q34-86 37-67 Q37-52 10-60 M0-79 Q-17-110 2-112 Q16-102 0-79', c.grass)}
    ${path('M-18-25 L18-25', 'none', `stroke="${c.roof}"`)}${ellipse(0, -34, 24, 5, c.wood)}`);
}
function cloud(x: number, y: number, scale = 1): string {
  return g(x, y, scale, path('M-76 13 Q-96-10-65-20 Q-64-49-31-38 Q-12-76 23-50 Q50-67 65-28 Q102-27 91 7 Q64 23-76 13Z', c.cloud, 'stroke="none"'));
}
function sky(weather: ArtOptions['weather'], day: number): string {
  const rainy = weather === 'rainy';
  return `${rect(0, 0, 1440, 900, rainy ? '#b9d0d4' : c.sky, 0, 'stroke="none"')}
    ${circle(1175, 125, 65, rainy ? '#e7e0bc' : c.sun, 'stroke="none"')}
    ${circle(1175, 125, 85, c.sun, 'stroke="none" opacity=".15"')}
    ${cloud(115, 115, 1.4)}${cloud(460 + (day % 3) * 20, 85, 1.1)}${cloud(990, 210, .8)}${cloud(1300, 75, 1.3)}
    ${path('M0 305 Q155 189 319 309 Q476 148 646 296 Q837 162 1021 303 Q1254 185 1440 289 V900 H0Z', '#b2c997', 'stroke="none"')}
    ${path('M0 360 Q234 275 385 359 Q581 253 762 342 Q959 263 1117 340 Q1320 263 1440 350 V900 H0Z', c.hill, 'stroke="none"')}
    ${path('M80 226 Q89 216 99 225 Q108 215 117 224 M1050 98 Q1060 90 1068 98 Q1078 90 1087 98', 'none', `stroke="${c.fine}" stroke-width="2.5"`)}
    ${rainy ? `<g stroke="#81aab9" stroke-width="3" opacity=".48">${path('M98 190l-9 20 M252 225l-9 20 M392 171l-9 20 M583 235l-9 20 M740 185l-9 20 M940 262l-9 20 M1169 236l-9 20 M1358 178l-9 20')}</g>` : ''}`;
}
function windowArt(x: number, y: number, w: number, h: number, curtain = false): string {
  return `${rect(x - 7, y - 7, w + 14, h + 14, c.paper, 9)}
    ${rect(x, y, w, h, c.sky, 4)}
    ${path(`M${x + 5} ${y + h * .75} Q${x + w * .35} ${y + h * .36} ${x + w * .65} ${y + h * .7} L${x + w - 5} ${y + h * .5} V${y + h - 4} H${x + 5}Z`, c.hill, 'stroke="none"')}
    ${path(`M${x + 10} ${y + 10} L${x + w * .55} ${y + 10} L${x + 10} ${y + h * .55}Z`, c.paper, 'stroke="none" opacity=".4"')}
    ${curtain ? path(`M${x - 10} ${y - 7} H${x + w * .25} Q${x + w * .29} ${y + h * .42} ${x - 8} ${y + h * .67}Z M${x + w + 10} ${y - 7} H${x + w * .75} Q${x + w * .71} ${y + h * .42} ${x + w + 8} ${y + h * .67}Z`, '#e9b098') : ''}
    ${path(`M${x + w / 2} ${y} V${y + h} M${x} ${y + h * .52} H${x + w}`, 'none', `stroke="${c.paper}" stroke-width="7"`)}
    ${rect(x - 12, y + h, w + 24, 10, c.lightWood, 3)}`;
}
function face(kind: Person, outfit: number): string {
  const girl = kind === 'girl';
  const parent = kind === 'parent';
  const banker = kind === 'banker';
  const hair = kind === 'friend' ? '#67462f' : banker ? '#7f6251' : '#65432e';
  return `${girl ? path('M-30-20 Q-64-20-55 14 Q-43 37-31 5 M30-20 Q64-20 55 14 Q43 37 31 5', hair) : ''}
    ${parent ? circle(22, -42, 21, hair) : ''}
    ${ellipse(-38, 3, 9, 12, c.skin)}${ellipse(38, 3, 9, 12, c.skin)}
    ${ellipse(0, 0, 39, 42, c.skin)}
    ${path(girl || parent ? 'M-38-3 Q-48-44-11-46 Q30-53 40-22 L39 3 Q18-1 4-25 Q-12-4-38-3Z' : kind === 'friend' ? 'M-39-4 Q-52-21-36-28 Q-44-45-24-44 Q-17-61-1-48 Q16-60 27-42 Q48-40 42-20 L38 0 Q21-15 10-24 Q-9-2-39-4Z' : 'M-38-4 Q-43-37-18-43 Q5-60 31-39 Q47-31 39-3 L31-17 Q15-15 7-29 Q-12-10-38-4Z', hair)}
    ${ellipse(-16, 4, 4.5, 6.5, c.ink, 'stroke="none"')}${ellipse(16, 4, 4.5, 6.5, c.ink, 'stroke="none"')}
    ${circle(-17, 2, 1.6, c.paper, 'stroke="none"')}${circle(15, 2, 1.6, c.paper, 'stroke="none"')}
    ${ellipse(-25, 15, 8, 5, c.blush, 'stroke="none" opacity=".7"')}${ellipse(25, 15, 8, 5, c.blush, 'stroke="none" opacity=".7"')}
    ${path('M-2 11 Q-5 16 2 16 M-11 24 Q0 34 11 24', 'none', 'stroke-width="2.5"')}
    ${banker ? `${rect(-29, -4, 24, 18, 'none', 6)}${rect(5, -4, 24, 18, 'none', 6)}${path('M-5 2 Q0-1 5 2 M-38 1 H-29 M29 1 H38')}` : ''}
    ${girl ? `${path('M-34-20 l-11-7 v13Z M-34-20 l11-7 v13Z', clothes[outfit % clothes.length])}${circle(-34, -20, 3, c.yellow)}` : ''}`;
}
function person(kind: Person, outfit: number, x: number, y: number, scale = 1, pose: Pose = 'wave', age = 8): string {
  const adult = kind === 'parent' || kind === 'banker' || age >= 18;
  const shirt = adult ? kind === 'banker' ? c.teal : c.apricot : clothes[outfit % clothes.length];
  const headY = adult ? -176 : -145;
  const shoulder = adult ? -132 : -102;
  const hem = adult ? -49 : -42;
  const dress = kind === 'girl' && outfit % 3 === 0;
  const arms = pose === 'hold' || pose === 'sit'
    ? `${path(`M-27 ${shoulder + 12} Q-50 ${shoulder + 52}-12 ${shoulder + 48} M27 ${shoulder + 12} Q50 ${shoulder + 52} 12 ${shoulder + 48}`, 'none', `stroke="${c.skin}" stroke-width="15"`)}${ellipse(-10, shoulder + 48, 9, 7, c.skin)}${ellipse(10, shoulder + 48, 9, 7, c.skin)}`
    : `${path(`M-27 ${shoulder + 12} Q-41 ${shoulder + 25}-48 ${shoulder + 53}`, 'none', `stroke="${c.skin}" stroke-width="14"`)}
      ${path(pose === 'wave' ? `M27 ${shoulder + 12} Q48 ${shoulder + 15} 51 ${shoulder - 24}` : `M27 ${shoulder + 12} Q45 ${shoulder + 33} 53 ${shoulder + 45}`, 'none', `stroke="${c.skin}" stroke-width="14"`)}
      ${ellipse(-48, shoulder + 53, 8, 9, c.skin)}${ellipse(pose === 'wave' ? 51 : 53, pose === 'wave' ? shoulder - 24 : shoulder + 45, 8, 10, c.skin)}
      ${pose === 'wave' ? path(`M48 ${shoulder - 32} l-3-9 M53 ${shoulder - 33} l2-8`, 'none', `stroke="${c.skin}" stroke-width="5"`) : ''}`;
  return g(x, y, scale, `${shadow(0, 4, 46, 10)}
    ${pose === 'sit' ? `${path('M-16-45 Q-49-34-48-10 L-17-7 M16-45 Q47-34 49-10 L17-7', '#738c95', 'stroke-width="16"')}` : `${path(`M-17 ${hem} L-19-6 M17 ${hem} L${pose === 'walk' ? 29 : 19}-6`, 'none', 'stroke="#6e838a" stroke-width="18"')}`}
    ${path(`M-26-12 Q-36-3-32 2 H-6 V-9Z M${pose === 'walk' ? 19 : 10}-12 V2 H38 Q42-6 29-12Z`, c.ink)}
    ${arms}
    ${path(`M-29 ${shoulder} Q0 ${shoulder - 15} 29 ${shoulder} L${dress ? 40 : 29} ${hem} Q0 ${hem + 12}-${dress ? 40 : 29} ${hem}Z`, shirt)}
    ${path(`M-29 ${shoulder + 3} L-37 ${shoulder + 24} L-21 ${shoulder + 30} M29 ${shoulder + 3} L37 ${shoulder + 24} L21 ${shoulder + 30}`, shirt)}
    ${path(`M-10 ${shoulder - 5} Q0 ${shoulder + 12} 10 ${shoulder - 5}`, c.paper)}
    ${adult ? `${path(`M-19 ${shoulder + 23} H19 V${hem + 3} H-19Z`, kind === 'banker' ? '#366963' : c.paper)}${path(`M-15 ${shoulder + 43} H15`)}` : age >= 10 ? `${path(`M-21 ${shoulder + 27} H21 M-22 ${shoulder + 36} H22`, 'none', `stroke="${c.paper}" stroke-width="5"`)}${path(`M13 ${shoulder + 49} h10 v13 h-10Z`, shirt)}` : `${g(0, shoulder + 34, .45, glyph('star'))}`}
    ${outfit >= 3 && !adult ? `${path(`M-28 ${shoulder + 4} L-22 ${hem}`, 'none', 'stroke="#eec773" stroke-width="7"')}${path(`M28 ${shoulder + 4} L22 ${hem}`, 'none', 'stroke="#eec773" stroke-width="7"')}` : ''}
    ${rect(-8, headY + 34, 16, 19, c.skin, 4)}${g(0, headY, 1, face(kind, outfit))}
    ${pose === 'hold' ? g(0, shoulder + 48, .7, glyph(kind === 'banker' ? 'coin' : 'bag')) : ''}`);
}
function siblings(o: ArtOptions, x: number, y: number, scale = .85, picnic = false): string {
  return `${o.children >= 2 ? person(o.gender === 'boy' ? 'girl' : 'boy', o.outfit + 1, x, y, scale, picnic ? 'sit' : 'walk', Math.max(7, o.age - 1)) : ''}
    ${o.children === 3 ? person('boy', o.outfit + 2, x + 105 * scale, y + 10, scale * .85, picnic ? 'sit' : 'wave', Math.max(7,o.age-3)) : ''}`;
}
function dog(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${shadow(0, 1, 43, 7)}${path('M-29-15 Q-48-14-48-39 Q-34-35-27-26', c.apricot)}
    ${ellipse(-4, -20, 30, 19, c.paper)}${path('M-23-13 V0 M14-13 V0', 'none', `stroke="${c.apricot}" stroke-width="10"`)}
    ${ellipse(26, -37, 21, 23, c.paper)}${path('M10-48 Q-7-55-4-31 Q0-18 12-26 M39-49 Q58-50 51-30 Q48-20 40-26', c.wood)}
    ${circle(21, -39, 2.5, c.ink, 'stroke="none"')}${circle(36, -39, 2.5, c.ink, 'stroke="none"')}${ellipse(28, -30, 4, 3, c.ink)}
    ${path('M27-27 Q28-21 34-24')}${path('M14-17 Q27-12 39-18', 'none', `stroke="${c.cherry}" stroke-width="5"`)}`);
}
function bicycle(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${shadow(0, 4, 71, 7)}${circle(-40, -25, 27, 'none')}${circle(42, -25, 27, 'none')}
    ${path('M-40-25 L-12-65 L10-25Z M10-25 L25-65 L-12-65 M25-65 L42-25', 'none', `stroke="${c.cherry}" stroke-width="5"`)}
    ${path('M-12-65 L-15-76 M-28-77 H-3 M25-65 L20-82 H35', 'none', 'stroke-width="5"')}${circle(10, -25, 5, c.yellow)}
    ${path('M9-25 l10 6 M-40-25l17-18 M42-25l-16 17', 'none', `stroke="${c.fine}" stroke-width="2"`)}
    ${path('M27-76 H53 L49-55 H30Z', c.lightWood)}${flower(38, -83, .7, c.paper)}`);
}
function coinPile(x: number, y: number, count: number, scale = 1): string {
  const coins = Math.min(5, Math.ceil(count / 10));
  return g(x, y, scale, `${coins > 0 ? `${ellipse(0, 0, 18, 5, c.yellow)}${rect(-18, -coins * 6, 36, coins * 6, c.yellow, 3)}${ellipse(0, -coins * 6, 18, 5, c.sun)}${path('M-14-7H14 M-14-14H14', 'none', 'stroke="#c4953f" stroke-width="2"')}` : ellipse(0, 0, 20, 5, c.wood, 'stroke="none" opacity=".25"')}`);
}
function apple(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${path('M0-10 Q-23-23-24-1 Q-20 23 0 16 Q20 23 24-1 Q23-23 0-10Z', c.cherry)}
    ${path('M0-10 Q-3-18 3-25')}${path('M3-17 Q6-33 19-27 Q17-16 3-17Z', c.leaf)}${path('M-15-5 Q-18 0-14 5', 'none', 'stroke="#f8c3ac" stroke-width="4"')}`);
}
function bread(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${path('M-39 9 Q-45-12-22-22 Q-15-38 3-25 Q28-33 38-13 Q50 6 37 16 L-33 16Z', c.lightWood)}${path('M-19-16 l-7 15 M0-20 l-7 17 M21-15 l-7 16', 'none', 'stroke="#fff0cb" stroke-width="5"')}`);
}
function books(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${rect(-40, -45, 14, 45, c.cherry, 2)}${rect(-23, -56, 17, 56, c.teal, 2)}${rect(-3, -41, 13, 41, c.yellow, 2)}
    ${path('M14-47 l14-4 13 48-14 4Z', c.blue)}${path('M-35-35h5 M-18-43h7 M2-31h4 M21-36l6-2', 'none', 'stroke="#fff8e8" stroke-width="3"')}`);
}
function basket(x: number, y: number, scale = 1, full = true): string {
  return g(x, y, scale, `${path('M-32-27 Q-29-74 0-74 Q29-74 32-27', 'none', `stroke="${c.wood}" stroke-width="8"`)}
    ${full ? apple(-16, -29, .65) + bread(15, -28, .55) : ''}${path('M-44-27 H44 L35 10 Q0 24-35 10Z', c.lightWood)}
    ${path('M-33-15 H33 M-29-3H29 M-20-24l4 34 M0-24v37 M20-24l-4 34', 'none', `stroke="${c.wood}" stroke-width="3"`)}`);
}
function fence(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${path('M-72-24H75 M-72-8H75', 'none', 'stroke="#fff3d7" stroke-width="10"')}
    ${path('M-63 6V-46l7-9 7 9V6 M-25 6V-46l7-9 7 9V6 M13 6V-46l7-9 7 9V6 M51 6V-46l7-9 7 9V6', c.paper, 'stroke-width="2"')}`);
}
function roofTiles(x: number, y: number, w: number): string {
  return path(`M${x + 16} ${y + 14} h${w - 32} M${x + 28} ${y + 32} h${w - 56} M${x + 22} ${y + 52} h${w - 44}`, 'none', 'stroke="#f6c4a0" stroke-width="3" opacity=".7"');
}
function townHome(): string {
  return `${shadow(207, 556, 151, 24)}
    ${path('M83 359 L289 359 L319 385 V544 H83Z', c.cream)}${path('M289 359L319 385V544L289 558Z', '#e7ba92')}
    ${rect(244, 271, 33, 84, c.brick, 3)}${path('M239 271h43v12h-43Z', c.paper)}
    ${path('M60 368L180 259L315 366Z', c.apricot)}${path('M180 259L210 264L337 373L315 366Z', c.roof)}
    ${path('M79 351L181 282L292 353', 'none', 'stroke="#f7c9a5" stroke-width="4"')}
    ${path('M112 322l13 8 M139 300l15 9 M205 296l-9 15 M229 316l-9 15 M254 337l-9 15', 'none', 'stroke="#d38f6f" stroke-width="3"')}
    ${windowArt(107, 386, 57, 73, true)}${windowArt(221, 386, 54, 72, true)}
    ${path('M174 539V456Q194 430 214 456V539Z', c.teal)}${circle(204, 497, 3, c.yellow)}
    ${rect(165, 539, 58, 12, c.lightWood, 3)}${rect(155, 551, 77, 10, c.paper, 3)}
    ${path('M97 477h53 M115 489h38 M237 480h40 M242 492h29', 'none', 'stroke="#e3b392" stroke-width="3"')}
    ${rect(99, 461, 70, 15, c.roof, 3)}${flowers(134, 452, .8)}
    ${plant(264, 545, .55)}${fence(76, 569, .8)}
    ${g(188, 347, .55, glyph('heart'))}`;
}
function townShop(): string {
  return `${shadow(512, 577, 142, 23)}${path('M389 365 H620 L648 387 V557 H389Z', c.paper)}
    ${path('M620 365L648 387V557L620 568Z', '#d9c59f')}
    ${path('M374 365L421 320H597L638 365Z', c.apricot)}${roofTiles(382, 321, 243)}
    ${rect(410, 404, 93, 119, c.sky, 5)}${rect(522, 403, 65, 154, c.teal, 4)}${rect(534, 415, 41, 65, '#aad3d4', 3)}
    ${circle(577, 501, 3, c.yellow)}${path('M418 477H496 M455 404V523', 'none', 'stroke="#fff8e8" stroke-width="5"')}
    ${bread(436, 504, .36)}${apple(477, 504, .42)}
    ${path('M382 382 H630 L643 418 H372Z', c.cream)}
    ${path('M391 383h28l-4 35h-30Z M449 383h28l1 35h-30Z M507 383h28l7 35h-30Z M565 383h28l13 35h-30Z', c.cherry, 'stroke="none"')}
    ${path('M372 418Q389 434 405 418Q421 434 437 418Q453 434 469 418Q485 434 501 418Q517 434 533 418Q549 434 565 418Q581 434 597 418Q620 434 643 418', 'none', 'stroke-width="3"')}
    ${rect(463, 331, 81, 43, c.cream, 10)}${apple(505, 352, .66)}
    ${rect(396, 534, 105, 42, c.wood, 5)}${path('M405 547h86 M405 562h86', 'none', 'stroke="#d7ab79"')}
    ${apple(416, 533, .48)}${apple(446, 529, .53)}${apple(477, 532, .48)}${plant(605, 561, .55)}`;
}
function townSchool(travel = false): string {
  return `${shadow(844, 536, 166, 24)}${rect(721, 322, 254, 205, '#f4d99b', 4)}
    ${path('M975 322L1000 346V519L975 527Z', '#d2b78d')}
    ${path('M700 323L749 278H947L992 323Z', c.apricot)}${roofTiles(713, 279, 264)}
    ${path('M815 326V269L850 240L885 269V326Z', c.cream)}${path('M805 270L850 231L895 270Z', c.roof)}
    ${circle(850, 289, 21, c.paper)}${path('M850 275V289L861 295', 'none', 'stroke-width="3"')}
    ${windowArt(742, 355, 50, 59)}${windowArt(818, 350, 63, 65)}${windowArt(909, 355, 46, 59)}
    ${rect(816, 443, 68, 84, c.teal, 4)}${rect(825, 451, 21, 39, c.sky, 3)}${rect(854, 451, 21, 39, c.sky, 3)}${path('M850 443V527 M840 500h5 M855 500h5')}
    ${rect(807, 527, 90, 12, c.paper, 3)}${rect(796, 539, 113, 9, c.lightWood, 3)}
    ${path('M723 432h69 M910 433h62 M733 452h59 M917 450h47', 'none', 'stroke="#d5b477" stroke-width="3"')}
    ${rect(677, 391, 8, 119, c.wood, 2)}${path('M685 393Q712 383 722 400Q710 419 685 411Z', c.cherry)}
    ${g(852, 432, travel ? .73 : .46, glyph(travel ? 'plane' : 'book'))}${flowers(749, 529, 1)}${plant(953, 527, .6)}`;
}
function townBank(): string {
  return `${shadow(1185, 574, 145, 24)}${path('M1071 365H1275L1307 393V560H1071Z', '#eeddb6')}
    ${path('M1275 365L1307 393V560L1275 572Z', '#ccbb94')}
    ${path('M1053 362L1173 298L1294 362Z', c.teal)}${path('M1173 298L1200 302L1317 372L1294 362Z', '#38736e')}
    ${path('M1084 351L1173 315L1265 350', 'none', 'stroke="#78ada0" stroke-width="3"')}
    ${rect(1062, 364, 233, 17, c.paper, 4)}
    ${rect(1093, 386, 24, 166, c.paper, 4)}${rect(1230, 386, 24, 166, c.paper, 4)}
    ${path('M1087 391h36 M1224 391h36 M1087 540h36 M1224 540h36', 'none', 'stroke="#d6bf94" stroke-width="7"')}
    ${path('M1140 552V453Q1176 415 1211 453V552Z', c.teal)}${path('M1176 438V551', 'none', 'stroke="#fff3d7" stroke-width="5"')}
    ${rect(1148, 461, 20, 50, c.sky, 4)}${rect(1183, 461, 20, 50, c.sky, 4)}${circle(1167, 525, 3, c.yellow)}${circle(1183, 525, 3, c.yellow)}
    ${rect(1080, 551, 195, 13, c.paper, 3)}${rect(1069, 564, 220, 11, c.lightWood, 3)}
    ${g(1176, 354, .65, glyph('coin'))}${plant(1289, 557, .62)}`;
}
function bench(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${shadow(0, 0, 79, 9)}${path('M-58-10V3 M58-10V3', 'none', 'stroke-width="8"')}
    ${rect(-75, -68, 150, 17, c.lightWood, 4)}${rect(-75, -46, 150, 17, c.lightWood, 4)}${rect(-82, -19, 164, 13, c.wood, 3)}
    ${path('M-66-64L-62-18 M66-64L62-18', 'none', 'stroke-width="5"')}`);
}
function picnicBlanket(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${path('M-175-55L110-88L189 39L-137 64Z', '#f5d4b3')}
    ${path('M-149-14L139-45 M-122 28L168-3 M-96-64L-42 53 M-24-73L36 50 M47-80L116 42', 'none', 'stroke="#d77765" stroke-width="19" opacity=".67"')}
    ${path('M-172-54L111-86 M-135 62L189 38', 'none', 'stroke="#fff3d7" stroke-width="5"')}
    ${ellipse(26, -1, 44, 14, c.paper)}${apple(8, -15, .62)}${bread(44, -17, .58)}${basket(-77, -6, .75)}
    ${rect(98, -37, 20, 41, c.teal, 7)}${rect(102, -45, 12, 9, c.paper, 3)}`);
}
function suitcase(x: number, y: number, scale = 1, color: string = c.teal): string {
  return g(x, y, scale, `${shadow(3, 6, 39, 8)}${path('M-11-67V-100H11V-67', 'none', 'stroke-width="5"')}
    ${rect(-32, -69, 64, 68, color, 10)}${path('M-21-62V-9 M21-62V-9', 'none', 'stroke="#fff0cd" stroke-width="4" opacity=".65"')}
    ${rect(-17, -49, 34, 26, c.cream, 5)}${g(0, -36, .48, glyph('plane'))}${circle(-20, 2, 6, c.ink)}${circle(20, 2, 6, c.ink)}
    ${path('M25-50l15-9v23l-15-5Z', c.yellow)}`);
}
function palm(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${shadow(0, 0, 70, 11)}${path('M-10 0Q10-81-3-176L12-176Q32-92 8 0Z', c.lightWood)}
    ${path('M-6-18l22-7 M0-48l24-7 M5-80l24-6 M7-113l22-5 M6-145l18-3', 'none', 'stroke="#b98760" stroke-width="3"')}
    ${path('M4-174Q-54-225-102-176Q-65-169-19-171Q-85-158-82-107Q-56-134 4-174Q-8-104 20-92Q31-138 4-174Q56-199 102-156Q79-162 22-171Q73-148 79-103Q54-119 4-174Q24-225 55-229Q56-207 4-174Z', c.grass)}
    ${circle(0, -169, 10, c.wood)}${circle(16, -170, 9, c.wood)}${sprig(-27, 6, 1.1)}`);
}
function boat(x: number, y: number, scale = 1): string {
  return g(x, y, scale, `${ellipse(1, 23, 75, 8, '#79b3b9', 'stroke="none"')}
    ${path('M-65-1H70L46 27H-45Z', c.cherry)}${path('M-57 9H60', 'none', 'stroke="#fff3d7" stroke-width="4"')}
    ${path('M0-4V-94', 'none', 'stroke-width="5"')}${path('M-6-88L-6-9H-53Z', c.paper)}${path('M8-85L56-9H8Z', c.cream)}
    ${path('M0-94l25 7-25 10Z', c.teal)}`);
}
function foreignTown(o: ArtOptions): string {
  return `${sky(o.weather, o.day)}${path('M0 417Q355 373 674 425Q1136 358 1440 429V900H0Z', '#80ac79', 'stroke="none"')}
    ${path('M0 622Q359 568 717 610Q1045 561 1440 622V739Q1026 662 720 699Q351 652 0 719Z', '#efd8af', 'stroke="none"')}
    ${path('M0 772Q380 701 744 757Q1094 704 1440 767V900H0Z', '#86c3cb', 'stroke="none"')}
    ${path('M0 821Q289 766 538 803Q823 837 1077 792Q1321 757 1440 802 M133 866H456 M982 852H1314', 'none', 'stroke="#c7e4dc" stroke-width="5"')}
    ${palm(34, 555, 1.35)}${palm(1379, 549, 1.4)}${townHome()}${townShop()}${townSchool(true)}${townBank()}
    ${rect(704, 324, 289, 21, c.teal, 3)}${g(1176, 405, .9, glyph('shell'))}
    ${path('M100 237Q721 307 1338 247', 'none', 'stroke="#957354" stroke-width="3"')}
    ${path('M172 245l31 4-20 32Z M360 263l31 3-19 33Z M548 276l31 1-16 32Z M737 281h31l-15 33Z M924 276l31-2-12 34Z M1113 265l31-3-11 34Z M1283 253l30-4-10 34Z', c.cherry)}
    ${path('M360 263l31 3-19 33Z M737 281h31l-15 33Z M1113 265l31-3-11 34Z', c.yellow)}
    ${g(909, 202, 1.7, glyph('plane'))}${path('M850 206H789 M831 214H757', 'none', 'stroke="#fff8e8" stroke-width="4"')}
    ${person('friend', 1, 779, 572, .51, 'wave')}${person('banker', 1, 1290, 578, .5, 'hold')}
    ${palm(1026, 701, .76)}${bench(1230, 682, .8)}${picnicBlanket(1152, 734, .55)}
    ${person('parent', 0, 886, 661, .96, 'wave')}${person(o.gender, o.outfit, 718, 665, 1.03, 'wave', o.age)}
    ${siblings(o, 518, 692, .76)}${suitcase(826, 702, .87)}${suitcase(467, 721, .73, c.cherry)}${dog(968, 721, .7)}
    ${path('M10 741Q351 693 687 738 M1198 730Q1314 715 1440 744', 'none', 'stroke="#a98a65" stroke-width="14"')}
    ${path('M46 735V798 M196 719V781 M355 717V780 M513 725V788 M664 738V805 M1240 727V789 M1395 739V802', 'none', 'stroke="#a98a65" stroke-width="12"')}
    ${boat(285, 855, .93)}${boat(1128, 859, .7)}${flowers(94, 686, 1.2)}${flowers(1322, 705, 1.25)}${basket(1329, 851, 1.1)}
    ${path('M0 898V839Q78 788 147 812Q128 849 189 900 M1337 900Q1381 819 1440 834V900Z', c.leaf, 'stroke="none"')}`;
}
function terminal(o: ArtOptions): string {
  return `${roomBase('#ece4c9', o)}${windowArt(227, 207, 435, 294)}
    ${path('M242 415H649V493H242Z', '#bdc6b4', 'stroke="none"')}${path('M252 453H637', 'none', 'stroke="#fff7df" stroke-width="5" stroke-dasharray="20 20"')}
    ${g(444, 337, 3.35, glyph('plane'))}${cloud(506, 239, .63)}
    ${rect(742, 225, 461, 79, c.teal, 10)}${g(797, 266, 1.1, glyph('plane'))}${g(962, 266, 1.1, glyph('bag'))}${g(1131, 266, 1.1, glyph('check'))}
    ${path('M854 247l18 19-18 19 M1020 247l18 19-18 19', 'none', 'stroke="#f4e8c6" stroke-width="4"')}
    ${rect(745, 325, 112, 219, '#bed1bc', 10)}${rect(759, 340, 84, 124, c.paper, 6)}${g(801, 394, 1.5, glyph('bag'))}${g(801, 511, .85, glyph('check'))}
    ${person('banker', 1, 1044, 623, 1.16, 'wave')}
    ${path('M873 511H1191L1262 564L939 580Z', c.lightWood)}${path('M939 580H1262V699H939Z', c.teal)}${path('M873 511L939 580V699L873 645Z', '#36716b')}
    ${rect(970, 602, 260, 72, '#80aaa0', 5)}${g(1100, 638, 1.04, glyph('check'))}${g(981, 546, 1.07, glyph('book'))}${g(1205, 546, .98, glyph('card'))}
    ${person(o.gender, o.outfit, 721, 678, 1.24, 'hold', o.age)}${person('parent', 0, 503, 683, 1.1, 'wave')}${siblings(o, 331, 717, .77)}
    ${suitcase(599, 715, 1.1, c.cherry)}${suitcase(820, 729, 1)}${plant(1300, 738, 1.2)}${bench(256, 594, 1.02)}
    ${path('M61 796L249 752L1293 752L1395 834H136L61 796Z', '#73989a')}${path('M136 834H1395V895H136Z', '#5b8387')}
    ${path('M212 763L273 827 M348 763L408 827 M484 763L544 827 M620 763L680 827 M756 763L816 827 M892 763L952 827 M1028 763L1088 827 M1164 763L1224 827', 'none', 'stroke="#a8c1b5" stroke-width="4"')}
    ${suitcase(309, 803, .9, c.yellow)}${suitcase(1092, 803, .9, c.cherry)}${basket(1280, 817, .7)}${g(791, 859, 1.2, glyph('plane'))}`;
}
function departurePark(o: ArtOptions): string {
  return `${sky(o.weather, o.day)}${path('M0 401Q239 361 464 413Q818 354 1052 421Q1262 394 1440 430V900H0Z', '#87c4cb', 'stroke="none"')}
    ${path('M0 530L1440 475V900H0Z', '#efd6ab', 'stroke="none"')}${path('M0 544L1440 488', 'none', 'stroke="#b68d64" stroke-width="10"')}
    ${path('M70 540V458 M267 532V451 M464 525V446 M661 518V439 M858 510V432 M1055 502V425 M1252 495V418 M0 474L1440 411', 'none', 'stroke="#b68d64" stroke-width="8"')}
    ${boat(346, 454, 1.28)}${boat(1091, 408, .84)}${palm(72, 730, 2.1)}${palm(1317, 719, 2.02)}
    ${path('M493 564L454 672 M706 555L759 665', 'none', 'stroke="#a98965" stroke-width="10"')}${rect(455, 530, 255, 38, c.teal, 7)}
    ${g(584, 550, .64, glyph('plane'))}${bench(324, 668, 1.28)}
    ${person('parent', 0, 502, 672, 1.1, 'wave')}${person(o.gender, o.outfit, 720, 671, 1.22, 'wave', o.age)}${siblings(o, 908, 699, .84)}
    ${suitcase(602, 720, 1.05, c.cherry)}${suitcase(824, 717, 1.02)}${suitcase(1108, 731, .87, c.yellow)}${dog(1202, 739, .86)}
    ${path('M184 797L568 713L1400 774V900H184Z', '#d5b98c', 'stroke="none"')}${path('M283 775L357 900 M484 737L596 900 M717 725L833 900 M950 741L1070 900 M1184 758L1308 900', 'none', 'stroke="#bd986f" stroke-width="3"')}
    ${basket(982, 838, 1.05)}${g(444, 810, 1.12, glyph('map'))}${g(579, 817, 1.08, glyph('shell'))}${flowers(109, 770, 1.8)}${flowers(1380, 783, 1.6)}`;
}
function town(o: ArtOptions): string {
  return `${sky(o.weather, o.day)}
    ${path('M0 430Q280 391 536 449Q827 401 1440 424V900H0Z', c.grass, 'stroke="none"')}
    ${path('M0 674Q197 532 401 586Q574 634 755 569Q1007 485 1440 595L1440 683Q1047 569 806 645Q576 719 405 660Q212 614 0 760Z', '#c5bb94', 'stroke="none"')}
    ${path('M0 698Q197 563 401 616Q574 665 755 601Q1007 520 1440 627', 'none', 'stroke="#eee0b9" stroke-width="44"')}
    ${path('M195 534Q220 586 272 608 M551 556Q540 604 496 633 M851 527Q839 566 792 606 M1174 552Q1166 587 1124 601', 'none', 'stroke="#eee0b9" stroke-width="38"')}
    ${tree(27, 455, 1.15, true)}${tree(1383, 472, 1.33)}${tree(691, 402, .69, true)}
    ${townHome()}${townShop()}${townSchool()}${townBank()}
    ${fence(320, 553, .65)}${bicycle(346, 578, .68)}${person('parent', 0, 283, 569, .56, 'wave')}
    ${person('friend', 1, 783, 566, .48, 'walk')}${person('girl', 2, 933, 562, .45, 'wave')}${person('banker', 1, 1271, 575, .45, 'wave')}
    ${path('M875 900Q956 759 1124 726Q1239 704 1326 656', 'none', 'stroke="#dbcda4" stroke-width="48"')}
    ${path('M1326 656Q1271 720 1168 740Q1020 756 936 866', 'none', 'stroke="#f0dfb5" stroke-width="32"')}
    ${path('M873 697Q1038 656 1213 665Q1350 665 1440 721V900H873Z', '#7fa96d', 'stroke="none"')}
    ${tree(1351, 755, 1.35, true)}${tree(958, 717, .75, true)}${bench(1230, 702, .8)}
    ${picnicBlanket(1128, 739, .57)}${person('parent', 0, 1187, 733, .48, 'sit')}
    ${person(o.gender, o.outfit, 715, 661, .98 + (Math.min(o.age,18) - 7) * .012, 'wave', o.age)}
    ${siblings(o, 594, 675, .65)}${dog(800, 690, .74)}
    ${plant(89, 664, .85)}${flowers(329, 709, 1.3)}${flowers(914, 690, 1.1)}${flowers(1335, 814, 1.6)}
    ${sprig(68, 744, 1.4)}${sprig(497, 726, 1.3)}${sprig(1220, 809, 1.5)}
    ${path('M0 844Q119 746 256 830Q315 785 421 857V900H0Z', c.leaf, 'stroke="none"')}
    ${path('M43 900Q75 805 103 811Q107 873 76 900 M153 900Q184 808 214 829Q203 885 183 900 M295 900Q325 846 353 851Q347 894 326 900', c.lightLeaf, 'stroke="none"')}
    ${flowers(132, 849, 1.5)}${flowers(375, 871, 1.2)}
    ${o.weather === 'rainy' ? `${ellipse(851, 654, 45, 7, '#a7c9c8', 'stroke="none"')}${ellipse(333, 623, 30, 5, '#a7c9c8', 'stroke="none"')}` : ''}`;
}
function roomBase(wall: string, o: ArtOptions): string {
  return `${rect(0, 0, 1440, 900, wall, 0, 'stroke="none"')}
    ${path('M0 0H175V561L0 731Z', '#e8c39e', 'stroke="none"')}${path('M1270 0H1440V726L1270 561Z', '#e3bf9c', 'stroke="none"')}
    ${rect(174, 540, 1096, 24, c.lightWood)}${path('M0 735L175 564H1270L1440 730V900H0Z', c.floor, 'stroke="none"')}
    ${path('M175 564L0 735 M1270 564L1440 730 M352 565L167 900 M536 565L431 900 M720 565V900 M904 565L1009 900 M1088 565L1273 900 M65 669H1375 M0 786H1440 M162 576H1282', 'none', 'stroke="#c89571" stroke-width="2.5"')}
    ${path('M0 165H1440 M0 179H1440', 'none', 'stroke="#d9b696" stroke-width="3"')}
    ${o.weather === 'sunny' ? path('M259 324L434 324L688 668L412 674Z', c.paper, 'stroke="none" opacity=".17"') : ''}`;
}
function framedPicture(x: number, y: number, scale = 1, kind: 'family' | 'tree' | 'boat' = 'tree'): string {
  return g(x, y, scale, `${rect(-65, -48, 130, 96, c.lightWood, 4)}${rect(-56, -39, 112, 78, c.paper)}
    ${kind === 'family' ? `${g(-23, -2, .42, face('parent', 0))}${g(20, 1, .36, face('boy', 0))}${path('M-46 37Q-23 7-2 37 M2 37Q20 14 42 37', c.teal)}` : kind === 'tree' ? `${circle(26, -21, 10, c.sun, 'stroke="none"')}${path('M-55 22Q-18-7 17 20Q40 3 55 22V38H-55Z', c.hill, 'stroke="none"')}${tree(-3, 28, .25, true)}` : `${path('M-54 19Q-21 11 9 20Q38 27 54 19V38H-54Z', c.sky, 'stroke="none"')}${path('M-25 10H29L17 27H-16Z', c.cherry)}${path('M0 9V-28L24 6Z', c.cream)}`}`);
}
function home(o: ArtOptions): string {
  return `${roomBase('#f6e5c5', o)}${windowArt(238, 208, 207, 234, true)}
    ${path('M213 193H468', 'none', `stroke="${c.wood}" stroke-width="8"`)}${plant(423, 464, .9)}
    ${framedPicture(699, 288, 1.2, 'family')}${framedPicture(927, 282, .82, 'boat')}
    ${rect(1032, 223, 182, 333, c.wood, 7)}${rect(1044, 236, 158, 306, '#ddb788', 3)}
    ${path('M1043 322H1202 M1043 421H1202', 'none', 'stroke="#9d7151" stroke-width="10"')}
    ${books(1095, 315, 1)}${basket(1162, 312, .52)}${books(1129, 414, .95)}${g(1090, 483, .85, glyph('toy'))}${rect(1131, 461, 57, 73, c.teal, 6)}
    ${rect(223, 486, 367, 113, '#df997d', 31)}${rect(238, 419, 335, 138, c.apricot, 28)}
    ${rect(218, 477, 58, 130, c.roof, 19)}${rect(539, 477, 58, 130, c.roof, 19)}
    ${path('M277 536H537 M403 430V530', 'none', 'stroke="#c78163" stroke-width="4"')}
    ${path('M286 481l22-46 63 19-22 48Z', c.paper)}${path('M454 484l-14-45 53-13 19 46Z', c.teal)}
    ${path('M287 445l60 31 M461 441l30 27', 'none', 'stroke="#edcda8" stroke-width="3"')}
    ${ellipse(731, 676, 345, 102, '#c5ba83')}${ellipse(731, 676, 313, 81, '#e8dca3')}
    ${path('M473 674Q725 612 990 674 M487 690Q735 749 980 690', 'none', 'stroke="#b6a773" stroke-width="3"')}
    ${person('parent', 0, 933, 650, 1.14, 'hold')}
    ${person(o.gender, o.outfit, 721, 678, 1.2, 'wave', o.age)}${siblings(o, 455, 708, .9)}
    ${o.travel ? suitcase(599, 711, 1.02, c.cherry) + suitcase(1170, 698, .88) + g(652, 612, .9, glyph('map')) : ''}
    ${path('M791 646L778 722 M1016 646L1026 722', 'none', `stroke="${c.wood}" stroke-width="12"`)}
    ${ellipse(899, 629, 141, 39, c.lightWood)}${path('M767 637Q895 685 1032 637', 'none', 'stroke="#a67453" stroke-width="8"')}
    ${coinPile(841, 614, o.cash, 1.1)}${g(925, 610, .9, glyph('wallet'))}${ellipse(991, 622, 30, 10, c.paper)}${apple(988, 608, .58)}
    ${dog(1090, 718, 1.06)}${plant(1241, 651, 1.3)}
    ${path('M132 552L102 732 M132 552L156 719', 'none', 'stroke="#89694f" stroke-width="7"')}
    ${path('M99 410H165L186 523H77Z', c.cream)}${ellipse(132, 524, 56, 10, c.paper)}
    ${rect(51, 757, 222, 139, c.teal, 24)}${path('M72 773H249V896H72Z', '#7cae9e', 'stroke="none"')}
    ${g(131, 799, 1.2, glyph('broom'))}${basket(1186, 866, 1.25, o.stock > 0)}${books(349, 817, .9)}`;
}
function shelf(x: number, y: number, width: number, content: string): string {
  return `${rect(x, y, width, 14, c.wood, 3)}${path(`M${x + 20} ${y + 14} v19 l24-19 M${x + width - 20} ${y + 14} v19 l-24-19`, c.lightWood)}${content}`;
}
function shop(o: ArtOptions): string {
  return `${roomBase('#f4e5c5', o)}
    ${windowArt(233, 208, 215, 260)}${path('M221 212H460V282Q340 311 221 282Z', c.cream)}
    ${path('M233 212h30v79h-30 M293 212h30v87h-30 M353 212h30v87h-30 M413 212h30v79h-30', c.cherry, 'stroke="none"')}
    ${rect(521, 209, 690, 296, '#e7cfaa', 10)}
    ${shelf(541, 298, 650, `${o.travel ? g(598, 277, 1.17, glyph('plane')) : bread(598, 279, .76)}${bread(702, 279, .7)}${bread(800, 279, .8)}${rect(894, 242, 47, 52, c.cream, 9)}${rect(887, 232, 61, 13, c.cherry, 3)}${rect(1000, 242, 47, 52, c.cream, 9)}${rect(993, 232, 61, 13, c.teal, 3)}${rect(1100, 242, 47, 52, c.cream, 9)}${rect(1093, 232, 61, 13, c.cherry, 3)}`)}
    ${shelf(541, 397, 650, `${g(598, 367, .94, glyph('toy'))}${g(695, 368, .94, glyph('toy'))}${books(806, 390, 1.12)}${g(925, 366, 1.02, glyph('gift'))}${g(1047, 366, 1.02, glyph(o.travel ? 'shell' : 'shirt'))}${g(1149, 366, .94, glyph('toy'))}`)}
    ${shelf(541, 489, 650, `${basket(599, 470, .64)}${basket(708, 470, .64)}${rect(786, 433, 48, 55, c.cream, 8)}${rect(780, 426, 60, 13, c.yellow, 4)}${g(807, 459, .5, glyph('heart'))}${rect(882, 434, 67, 49, c.teal, 4)}${g(915, 457, .6, glyph('apple'))}${bread(1034, 470, .65)}${bread(1137, 470, .67)}`)}
    ${person('parent', 2, 1015, 612, 1.18, 'wave')}
    ${path('M818 531H1187L1239 568L867 584Z', c.lightWood)}${path('M867 584H1239V709H867Z', '#ddaa7f')}${path('M818 531L867 584V709L818 656Z', c.wood)}
    ${rect(894, 605, 317, 76, '#e5bb93', 6)}${path('M1000 606V681 M1105 606V681', 'none', 'stroke="#bd885f"')}
    ${rect(1110, 495, 82, 58, c.teal, 6)}${path('M1115 552H1200L1210 570H1106Z', '#83aaa0')}${rect(1121, 505, 55, 24, '#e3edcc', 3)}${path('M1123 540h8 M1141 540h8 M1159 540h8', 'none', 'stroke="#fff4d8" stroke-width="4"')}
    ${coinPile(1054, 555, o.cash, .9)}${ellipse(936, 553, 42, 12, c.paper)}${o.travel ? g(936, 537, 1.05, glyph('shell')) : bread(936, 540, .8)}
    ${person(o.gender, o.outfit, 724, 678, 1.24, 'hold', o.age)}${siblings(o, 533, 701, .85)}
    ${rect(252, 545, 245, 109, c.wood, 7)}${path('M259 548L280 502H464L490 547Z', c.lightWood)}
    ${apple(300, 516, .75)}${apple(357, 510, .8)}${apple(417, 512, .78)}${apple(455, 531, .65)}
    ${path('M267 570H482 M267 589H482 M267 610H482', 'none', 'stroke="#dab080" stroke-width="6"')}
    ${rect(320, 568, 87, 43, c.cream, 5)}${g(361, 589, .67, glyph('apple'))}
    ${basket(378, 728, 1.1, o.stock > 0)}${plant(1270, 726, 1.18)}
    ${o.travel ? `${suitcase(599, 725, .98)}${g(998, 542, .82, glyph('card'))}` : ''}
    ${path('M81 741L207 709L244 858L95 890Z', c.cream)}${path('M102 738L188 719L207 808L106 830Z', c.teal)}${g(155, 775, 1.3, glyph('bag'))}
    ${rect(1106, 819, 271, 81, c.wood, 9)}${apple(1154, 823, .9)}${apple(1220, 814, 1.1)}${apple(1292, 827, .9)}${path('M1121 846h238 M1121 868h238', 'none', 'stroke="#e3b480" stroke-width="6"')}`;
}
function desk(x: number, y: number, scale = 1, decorated = false): string {
  return g(x, y, scale, `${path('M-90-22L-88 67 M77-22L79 67', 'none', 'stroke="#a67c56" stroke-width="10"')}
    ${path('M-115-44L64-57L117-22L-65-8Z', c.lightWood)}${path('M-65-8L117-22V-11L-65 4Z', c.wood)}
    ${decorated ? `${g(-18, -37, .8, glyph('book'))}${rect(46, -53, 22, 24, c.teal, 3)}${path('M52-55v-23 M63-55l7-26', 'none', 'stroke="#c95854" stroke-width="4"')}` : ''}`);
}
function school(o: ArtOptions): string {
  return `${roomBase('#f1e4bd', o)}${windowArt(231, 209, 195, 269)}
    ${rect(485, 212, 599, 281, c.wood, 8)}${rect(501, 227, 567, 248, '#477e65', 4)}
    ${path('M542 320Q606 274 654 327 M542 342Q593 366 654 327 M584 291V356 M565 380h91', 'none', 'stroke="#e5edd0" stroke-width="4"')}
    ${g(755, 304, 1.5, glyph('apple'))}${g(847, 304, 1.5, glyph('coin'))}${g(956, 304, 1.5, glyph('bag'))}
    ${path('M746 363h27 M755 349v28 M831 363h30 M940 354h29 M940 369h29', 'none', 'stroke="#e7edce" stroke-width="4"')}
    ${path('M731 421Q829 399 1003 419', 'none', 'stroke="#a3be92" stroke-width="3"')}
    ${rect(473, 482, 622, 13, c.lightWood, 3)}${rect(988, 466, 30, 13, c.paper, 3)}
    ${rect(1124, 257, 102, 200, c.lightWood, 5)}${rect(1138, 272, 74, 41, c.paper, 3)}${g(1175, 293, .73, glyph('calendar'))}
    ${path('M1141 346h67 M1141 367h56 M1141 389h67 M1141 411h43', 'none', 'stroke="#d49e76" stroke-width="4"')}
    ${person('parent', 1, 1112, 625, 1.07, 'wave')}${plant(1246, 594, 1)}
    ${desk(995, 616, 1.1, true)}${desk(365, 554, .85, true)}
    ${person('friend', 1, 373, 637, .85, 'hold')}${person('girl', 2, 492, 606, .72, 'wave')}
    ${person(o.gender, o.outfit, 727, 680, 1.24, 'wave', o.age)}${siblings(o, 927, 731, .79)}
    ${desk(467, 710, 1.12, true)}${desk(816, 748, 1.2, true)}
    ${rect(183, 523, 83, 82, c.cherry, 10)}${path('M199 522Q217 499 249 519 M194 548H254 M209 564v18 M242 562v18', 'none', 'stroke="#f5ceab" stroke-width="4"')}
    ${rect(118, 736, 239, 156, c.wood, 6)}${rect(137, 752, 199, 125, '#dfbc8c', 3)}${books(195, 870, 1.7)}${g(289, 842, 1.23, glyph('toy'))}
    ${path('M143 890L143 900 M328 890L328 900', 'none', 'stroke-width="8"')}
    ${path('M1231 709L1247 839 M1345 709L1358 839', 'none', 'stroke="#a27e58" stroke-width="9"')}${rect(1220, 683, 139, 26, c.lightWood, 5)}${books(1271, 681, .97)}${g(1324, 662, .9, glyph('apple'))}`;
}
function savingsJar(x: number, y: number, savings: number, scale = 1): string {
  const level = Math.min(43, Math.ceil(savings / 10) * 8);
  return g(x, y, scale, `${path('M-31-66H31V-52Q43-45 42-29V5Q0 27-42 5V-29Q-43-45-31-52Z', '#c4ded3')}
    ${level ? path(`M-34 3V${3 - level}Q0 ${13 - level} 34 ${3 - level}V3Q0 19-34 3Z`, c.yellow, 'stroke="none"') : ''}
    ${path('M-24-34V-6', 'none', 'stroke="#fff8e7" stroke-width="5"')}${rect(-37, -76, 74, 17, c.teal, 6)}${path('M-14-67h28', 'none', 'stroke-width="4"')}
    ${rect(-20, -31, 40, 29, c.paper, 6)}${g(0, -17, .48, glyph('heart'))}`);
}
function bank(o: ArtOptions): string {
  return `${roomBase('#e9e4c9', o)}${windowArt(231, 212, 189, 245)}${plant(433, 524, .98)}
    ${rect(1063, 216, 168, 288, '#9eaaa0', 15)}${rect(1081, 235, 132, 250, '#c0c9b8', 11)}
    ${circle(1147, 346, 42, c.cream)}${circle(1147, 346, 20, '#a1b0a4')}${path('M1147 309V383 M1109 346H1185 M1120 319L1174 373 M1120 373L1174 319', 'none', 'stroke="#749083" stroke-width="5"')}
    ${path('M1093 259h7 M1093 462h7', 'none', 'stroke="#749083" stroke-width="10"')}
    ${rect(565, 207, 391, 229, c.lightWood, 13)}${rect(580, 222, 361, 197, c.paper, 7)}
    ${path('M580 337Q667 306 761 337Q851 306 941 337V419H580Z', '#d9e3bc', 'stroke="none"')}${tree(660, 401, .64, true)}
    ${g(838, 295, 1.75, glyph(o.travel ? 'shell' : 'bank'))}${g(838, 378, .9, glyph(o.travel ? 'plane' : 'heart'))}
    ${person('banker', 1, 1046, 625, 1.23, 'wave')}
    ${path('M836 497H1161L1267 566L925 588Z', c.lightWood)}${path('M925 588H1267V720H925Z', c.teal)}${path('M836 497L925 588V720L836 636Z', '#36736d')}
    ${rect(949, 611, 289, 82, '#77a293', 5)}${path('M969 630h249 M969 674h249', 'none', 'stroke="#528a7d" stroke-width="3"')}
    ${rect(867, 450, 95, 65, c.cream, 8)}${rect(878, 461, 73, 36, c.sky, 5)}${path('M897 516h36v15h-36Z', c.wood)}
    ${savingsJar(1112, 551, o.savings, 1.04)}${coinPile(992, 555, o.cash, 1.05)}${g(1212, 552, .82, glyph('book'))}
    ${o.travel ? `${g(948, 548, .8, glyph('shell'))}${g(1039, 550, .85, glyph('card'))}${suitcase(619, 725, 1.03, c.cherry)}` : ''}
    ${person(o.gender, o.outfit, 721, 680, 1.25, 'hold', o.age)}${person('parent', 0, 526, 697, 1.05, 'walk')}${siblings(o, 318, 719, .78)}
    ${path('M733 723H890', 'none', 'stroke="#b29568" stroke-width="5"')}${circle(748, 701, 13, c.yellow)}${circle(877, 701, 13, c.yellow)}${path('M748 710v52 M877 710v52', 'none', 'stroke="#a98255" stroke-width="8"')}
    ${bench(271, 678, 1.22)}${plant(1300, 749, 1.25)}
    ${rect(46, 773, 241, 127, c.lightWood, 10)}${rect(61, 790, 211, 108, c.cream, 5)}${g(105, 833, 1.12, glyph('calendar'))}${g(225, 833, 1.12, glyph(o.debt > 0 ? 'handshake' : 'check'))}
    ${path('M1160 815H1377V900H1160Z', '#d9c598')}${savingsJar(1219, 880, o.savings, .95)}${plant(1343, 885, .84)}`;
}
function park(o: ArtOptions): string {
  return `${sky(o.weather, o.day)}${path('M0 422Q296 350 637 414Q1095 353 1440 448V900H0Z', c.grass, 'stroke="none"')}
    ${path('M0 589Q244 486 455 549Q794 609 995 490Q1274 423 1440 541L1440 601Q1273 488 1038 553Q803 678 451 616Q235 558 0 661Z', '#e2d1a4', 'stroke="none"')}
    ${path('M904 900Q890 714 1038 553', 'none', 'stroke="#e2d1a4" stroke-width="86"')}
    ${path('M1071 900Q1149 743 1440 788V900Z', '#94c5c3', 'stroke="none"')}
    ${path('M1124 849Q1219 808 1370 830 M1230 879H1396 M1184 857H1221', 'none', 'stroke="#cae3da" stroke-width="4"')}
    ${tree(123, 651, 2.3, true)}${tree(1268, 643, 2.1, true)}${tree(457, 421, .86)}${tree(977, 450, .98)}
    ${bench(402, 533, 1.1)}${bicycle(324, 562, 1.05)}
    ${path('M1048 541V345 M1176 541V345 M1036 345H1187 M1048 345L1016 544 M1176 345L1205 544', 'none', 'stroke="#b88a61" stroke-width="10"')}
    ${path('M1090 350V468 M1139 350V468', 'none', 'stroke="#e4c68d" stroke-width="4"')}${rect(1080, 466, 69, 13, c.cherry, 4)}
    ${person('friend', 2, 1121, 521, .69, 'sit')}
    ${path('M544 534Q697 482 894 525L1032 738Q767 803 464 716Z', '#82aa6b', 'stroke="none"')}
    ${picnicBlanket(773, 653, 1.55)}
    ${person('parent', 0, 939, 616, 1.04, 'sit')}${person('parent', 2, 543, 616, 1.01, 'wave')}
    ${person(o.gender, o.outfit, 726, 629, 1.14, 'sit', o.age)}${siblings(o, 534, 722, .93, true)}
    ${dog(1038, 725, 1.12)}${g(1103, 661, 1.2, glyph('toy'))}
    ${o.completed ? `${path('M502 295Q732 368 988 296', 'none', 'stroke="#907356" stroke-width="3"')}${path('M535 306l25 5-19 31Z M595 319l26 5-18 30Z M655 331l27 3-16 30Z M716 336h27l-14 32Z M777 332l27-3-10 32Z M838 321l26-5-7 33Z M899 307l26-8-5 34Z', c.apricot)}${path('M595 319l26 5-18 30Z M777 332l27-3-10 32Z M899 307l26-8-5 34Z', c.yellow)}` : ''}
    ${flowers(375, 640, 1.4)}${flowers(1164, 733, 1.65)}${flowers(92, 722, 1.6)}${sprig(411, 736, 1.5)}${sprig(988, 807, 1.2)}
    ${path('M0 860Q160 717 299 829Q410 795 492 900H0Z', c.leaf, 'stroke="none"')}${path('M1290 900Q1321 803 1440 775V900Z', c.leaf, 'stroke="none"')}
    ${flowers(175, 837, 2)}${flowers(347, 873, 1.6)}${sprig(59, 856, 2)}
    ${path('M211 328Q225 314 236 327Q249 309 261 321', 'none', 'stroke-width="3"')}`;
}

/** Original, text-free artwork. The host supplies accessible scene names and HTML controls. */
export function sceneArt(options: ArtOptions): string {
  const o = safeOptions(options);
  const scene = o.place === 'home' ? home(o) : o.place === 'shop' ? shop(o)
    : o.place === 'school' ? o.travel ? terminal(o) : school(o) : o.place === 'bank' ? bank(o)
    : o.place === 'park' ? o.travel ? departurePark(o) : park(o) : o.travel ? foreignTown(o) : town(o);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="eco-scene-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false" stroke="${c.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <!-- THESIS: childhood money stories happen inside an inhabited town, never a console.
    OWN-WORLD: apricot tiled roofs, sage lawns, butter sunlight, brown ink, cherry and teal clothes.
    STORY: walk with family, meet classmates, trade at a counter, save with a teller, share a picnic.
    FIRST VIEWPORT: complete 1440 by 900 scenery; the child and gestures lead the middle-lower stage.
    FORM: user-pinned illustrated life scenes, dimensional streets and full-room destination cutaways. -->
    ${scene}${o.lifeScene ? lifeOverlay(o) : ''}</svg>`;
}

function glyph(name: string): string {
  const ink = c.ink;
  const shapes: Record<string, string> = {
    coin: `${circle(0, 0, 18, c.yellow)}${circle(0, 0, 13, c.sun)}${path('M-4-7H5 M0-10V10 M-5 6H4', 'none', 'stroke-width="3"')}`,
    shell: `${path('M0 19L-21-1Q-26-11-14-15Q-9-26 0-18Q9-26 14-15Q26-11 21-1Z', '#f1bf9e')}${path('M0 15L-13-12 M0 15V-15 M0 15L13-12 M-7 17H7', 'none', 'stroke="#ac725a" stroke-width="2"')}${circle(0, 4, 4, c.yellow)}`,
    plane: `${path('M-21 0L-5-4L-1-19H6L5-3L18-1Q25 2 18 5L4 6L-1 21H-7L-5 5L-17 5L-21 12H-25L-24 2Z', c.paper)}${path('M7 1H15 M-4-7L3-7', 'none', 'stroke="#438c87" stroke-width="3"')}`,
    card: `${rect(-22, -14, 44, 31, c.teal, 5)}${path('M-21-5H21V1H-21Z', '#315f59', 'stroke="none"')}${rect(-14, 5, 9, 6, c.yellow, 2)}${path('M0 8H13', 'none', 'stroke="#fff4d4" stroke-width="2"')}`,
    bag: `${path('M-15-8H15L19 19H-19Z', c.apricot)}${path('M-8-7V-12Q0-24 8-12V-7')}${path('M-5 5Q0 10 5 5')}`,
    apple: apple(0, 3, .75),
    toy: `${circle(-11, -12, 8, c.wood)}${circle(11, -12, 8, c.wood)}${ellipse(0, -3, 16, 15, c.lightWood)}${ellipse(0, 12, 13, 11, c.lightWood)}${ellipse(-15, 9, 6, 8, c.wood)}${ellipse(15, 9, 6, 8, c.wood)}${circle(-10, 20, 6, c.wood)}${circle(10, 20, 6, c.wood)}${circle(-6, -4, 2, ink)}${circle(6, -4, 2, ink)}${ellipse(0, 3, 7, 5, c.cream)}${circle(0, 1, 2, ink)}${path('M-8 10L0 14L8 10L8 18L0 14L-8 18Z', c.cherry)}`,
    broom: `${path('M5-19L-3 7', 'none', 'stroke="#b8875a" stroke-width="6"')}${path('M-8 3L5 7L9 21Q-6 24-18 15Z', c.yellow)}${path('M-8 8l-6 9 M-2 10l-3 10 M4 12v9')}`,
    gift: `${rect(-17, -4, 34, 26, c.apricot, 3)}${rect(-20, -9, 40, 9, c.cherry, 3)}${path('M-3-7H3V22H-3Z', c.cherry, 'stroke="none"')}${path('M0-9Q-20-10-12-20Q-4-25 0-9Q4-25 12-20Q20-10 0-9Z', c.yellow)}`,
    handshake: `${path('M-21-7L-12-14L-3-7L-12 7L-21 0Z', c.cherry)}${path('M21-8L13-14L4-8L12 7L21 1Z', c.teal)}${path('M-12-5L-3-10L7-7L14 3L3 15L-11 4Z', c.skin)}${path('M7-7L0-1Q-8 1-8-4L-3-10 M-5 4L4 12 M0 0L9 8')}`,
    bank: `${path('M-21-10L0-22L21-10Z', c.teal)}${rect(-20, -9, 40, 5, c.cream, 2)}${rect(-17, -3, 6, 20, c.cream, 1)}${rect(-3, -3, 6, 20, c.cream, 1)}${rect(11, -3, 6, 20, c.cream, 1)}${rect(-22, 17, 44, 6, c.lightWood, 2)}`,
    calendar: `${rect(-18, -17, 36, 37, c.paper, 5)}${path('M-18-6H18V-13Q18-17 13-17H-13Q-18-17-18-13Z', c.cherry)}${path('M-10-22V-12 M10-22V-12 M-9 2h3 M4 2h3 M-9 11h3 M4 11h3', 'none', 'stroke-width="3"')}`,
    heart: path('M0 18Q-29-1-15-14Q-6-22 0-9Q6-22 15-14Q29-1 0 18Z', c.cherry),
    book: `${path('M0-13Q-13-23-22-16V16Q-11 10 0 19Q11 10 22 16V-16Q13-23 0-13Z', c.paper)}${path('M0-13V19 M-16-7l10 2 M-16 1l10 2 M6-5l10-2 M6 3l10-2', 'none', 'stroke-width="2"')}`,
    shirt: `${path('M-9-20L-21-11L-15-1L-9-4V21H9V-4L15-1L21-11L9-20Q0-9-9-20Z', c.teal)}${path('M-9-20Q0-8 9-20', 'none', 'stroke="#fff3db" stroke-width="4"')}`,
    bread: bread(0, 2, .51),
    umbrella: `${path('M-22 0Q-19-22 0-22Q19-22 22 0Q15-7 8 0Q0-7-8 0Q-15-7-22 0Z', c.teal)}${path('M0-22V18Q0 25 8 22Q12 20 10 16 M-8 0Q-8-13 0-22Q8-13 8 0', 'none', 'stroke-width="2.5"')}`,
    wallet: `${rect(-21, -14, 42, 32, c.wood, 6)}${path('M-18-13L-9-20H14L18-13Z', c.paper)}${rect(3, -4, 20, 13, c.apricot, 3)}${circle(10, 2, 2, c.yellow)}`,
    arrow: `${path('M-19 0H17 M5-12L17 0L5 12', 'none', 'stroke-width="5"')}`,
    map: `${path('M-21-14L-7-20L7-14L21-20V15L7 21L-7 15L-21 21Z', c.cream)}${path('M-7-20V15 M7-14V21', 'none', 'stroke="#c9aa7c" stroke-width="2"')}${path('M-14 7Q-7-7 2 3Q11 13 14-8', 'none', 'stroke="#6ea46c" stroke-width="3"')}${circle(14, -8, 4, c.cherry)}`,
    home: `${path('M-16-1H16V20H-16Z', c.cream)}${path('M-22 0L0-21L22 0Z', c.apricot)}${rect(-5, 6, 10, 14, c.teal, 2)}${rect(-13, 5, 5, 6, c.sky, 1)}`,
    school: `${rect(-20, -6, 40, 27, c.cream, 2)}${path('M-23-6L0-21L23-6Z', c.apricot)}${circle(0, -7, 6, c.paper)}${path('M0-10V-7L3-5')}${rect(-5, 9, 10, 12, c.teal, 1)}${rect(-15, 3, 5, 6, c.sky, 1)}${rect(10, 3, 5, 6, c.sky, 1)}`,
    park: `${ellipse(0, 19, 22, 5, c.hill, 'stroke="none"')}${path('M-3 19V-12H3V19Z', c.wood)}${path('M-18-2Q-26-15-12-19Q-5-30 6-20Q25-23 21-7Q29 6 12 8Q2 15-4 6Q-19 12-18-2Z', c.grass)}${path('M0 9L-8 2 M0 1L8-6')}`,
    close: path('M-11-11L11 11 M11-11L-11 11', 'none', 'stroke-width="4"'),
    sound: `${path('M-19-6H-11L0-17V17L-11 6H-19Z', c.teal)}${path('M7-8Q15 0 7 8 M13-14Q26 0 13 14', 'none', 'stroke-width="3"')}`,
    'sound-off': `${path('M-19-6H-11L0-17V17L-11 6H-19Z', c.teal)}${path('M7-9L20 9 M20-9L7 9', 'none', 'stroke-width="3"')}`,
    settings: `${path('M-5-20H5L7-14L13-11L19-12L23-4L18 0L18 7L21 12L14 19L8 16L2 18L-2 23L-11 20L-11 14L-16 10L-22 10L-24 1L-18-2L-16-8L-18-14L-10-19L-5-15Z', c.cream)}${circle(0, 0, 7, c.teal)}`,
    check: `${circle(0, 0, 19, '#d5e0a9')}${path('M-10 0L-3 8L12-9', 'none', 'stroke="#407553" stroke-width="4"')}`,
    reset: `${path('M-15-6Q-8-21 8-15Q25-6 15 10Q6 24-10 12 M-15-18V-5H-2', 'none', 'stroke-width="4"')}`,
    sun: `${circle(0, 0, 11, c.sun)}${path('M0-22V-17 M0 17V22 M-22 0H-17 M17 0H22 M-15-15L-12-12 M12 12L15 15 M15-15L12-12 M-12 12L-15 15', 'none', 'stroke="#bc8b40" stroke-width="3"')}`,
    help: `${circle(0, 0, 20, c.cream)}${path('M-6-7Q-5-16 4-12Q13-8 5-2Q0 1 0 6', 'none', 'stroke-width="3"')}${circle(0, 13, 1.8, ink)}`,
    star: path('M0-20L6-7L20-5L10 5L13 20L0 13L-13 20L-10 5L-20-5L-6-7Z', c.yellow),
  };
  return Object.prototype.hasOwnProperty.call(shapes, name) ? shapes[name] : shapes.star;
}

export function icon(name: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" focusable="false" aria-hidden="true" fill="none" stroke="${c.ink}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(24 24) scale(.9)">${glyph(name)}</g></svg>`;
}

export function portrait(gender: Person, outfit = 0): string {
  const kind: Person = ['boy', 'girl', 'parent', 'friend', 'banker'].includes(gender) ? gender : 'boy';
  const wear = bound(outfit, 0, 99);
  const color = kind === 'parent' ? c.apricot : kind === 'banker' ? c.teal : clothes[wear % clothes.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" focusable="false" aria-hidden="true" stroke="${c.ink}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    ${circle(50, 50, 47, '#f5dfb4', 'stroke="none"')}${path('M15 100V85Q21 68 50 68Q79 68 85 85V100Z', color)}${path('M39 76Q50 88 61 76', c.paper)}
    ${rect(44, 63, 12, 15, c.skin, 4)}${g(50, 42, .72, face(kind, wear))}</svg>`;
}

function lifeOverlay(o: ArtOptions): string {
  const id=o.lifeScene??'';
  const family=(o.offspring??[]).map((age,i)=>age<4
    ? g(880+i*85,720,.75,`${ellipse(0,-30,28,44,c.paper)}${circle(0,-53,17,c.skin)}${path('M-24-25Q0-4 24-25','none',`stroke="${c.teal}" stroke-width="7"`)}`)
    : person(i%2?'boy':'girl',i+1,880+i*100,720,age<12?.72:.88,'wave',age)).join('');
  const grey=o.age>=60?g(721,445,1,`${path('M-28 0Q0-26 28 0','none','stroke="#c1bbb0" stroke-width="12"')}${path('M-20 22h14M6 22h14','none','stroke="#96755a" stroke-width="2"')}`):'';
  const bakery=o.place==='shop'&&['studio','materials','production','demand','finance','equity','towns'].includes(id)
    ? g(385,578,1,`${rect(-120,-195,240,195,c.cream,24)}${rect(-97,-160,194,110,c.ink,20)}${path('M-70-70Q-45-130-25-72Q0-145 24-73Q48-124 72-70',c.apricot)}${rect(-100,-34,200,26,c.wood,8)}${circle(-69,-178,7,c.cherry)}${circle(-42,-178,7,c.teal)}${g(115,-90,.65,glyph('bread'))}`):'';
  const trade=o.place==='shop'&&['sourcing','export','exchange'].includes(id)
    ? g(1150,560,.85,`${path('M-170 0H150L105 70H-112Z',c.teal)}${rect(-85,-85,84,75,c.apricot,7)}${rect(7,-110,82,100,c.yellow,7)}${path('M-185 88Q-140 74-95 88T-5 88T85 88T170 88','none',`stroke="${c.blue}" stroke-width="9"`)}`):'';
  const civic=o.place==='school'&&['tax','services','organization'].includes(id)
    ? g(385,550,1,`${rect(-95,-95,190,95,c.paper,12)}${path('M-108-95L0-150L108-95Z',c.apricot)}${rect(-35,-62,70,61,c.teal,5)}${g(0,-24,.42,glyph('heart'))}${person('banker',1,146,46,.8,'hold',42)}`):'';
  return `${bakery}${trade}${civic}${o.place==='home'?family:''}${grey}`;
}
