import type { SceneKind, UniverseRenderer, UniverseSnapshot } from './view';
import { freezeSnapshot } from './view';
import { DESTINATIONS } from './catalog';
import { FLIGHT_STARS, dopplerTint, flightFrame, flightStar, type FlightFrame, type FlightLayer } from './flight';
import { routeFrame, projectDirection, COSMIC_KNOTS, cosmicKnot, type RouteFrame, type RouteObject } from './route';

export type CosmicScene = SceneKind | 'hot' | 'plasma-field' | 'cmb' | 'dark-field' | 'early-stars' | 'protogalaxies' | 'giant' | 'scorched' | 'remnants';

const formationGyr: Readonly<Record<string, number>> = Object.fromEntries(DESTINATIONS.map(destination => [destination.id, destination.formedGyr]));
export function universeScene(snapshot: UniverseSnapshot): CosmicScene {
  switch (snapshot.epoch) {
    case 'bang': return 'hot';
    case 'plasma': return 'plasma-field';
    case 'recombination': return 'cmb';
    case 'dark': return 'dark-field';
    case 'first': return 'early-stars';
    case 'quasar': {
      const ancient = ['galaxy', 'group', 'cluster', 'quasar', 'horizon', 'beyond'].includes(snapshot.kind)
        || (snapshot.kind === 'blackhole' && /sgr|sagittarius/i.test(snapshot.destinationId));
      const formed = Object.prototype.hasOwnProperty.call(formationGyr, snapshot.destinationId)
        ? formationGyr[snapshot.destinationId] <= 2 : ancient;
      return formed ? snapshot.kind : 'protogalaxies';
    }
    case 'future': return snapshot.kind === 'sun' ? 'giant' : snapshot.kind === 'earth' || snapshot.kind === 'moon' ? 'scorched' : snapshot.kind;
    case 'far': return 'remnants';
    default: return snapshot.kind;
  }
}

export function cosmicRandom(seed = 713): () => number {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
export function finiteUnit(value: number): number { return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; }
export function cosmicBeta(value: number): number { return Math.min(.9999, finiteUnit(value)); }

// Original coastlines: deliberately recognizable, illustrative rather than a map dataset.
export const CONTINENTS = [
  'M95 240 L140 178 211 155 258 179 291 173 310 206 277 244 280 272 241 295 226 327 189 336 166 304 122 289Z',
  'M216 329 L255 340 284 387 277 430 250 461 240 510 217 550 197 505 187 447 168 400 180 364Z',
  'M363 239 L391 208 434 205 452 239 483 260 488 293 470 318 467 358 440 409 408 424 381 375 366 331 347 287Z',
  'M394 189 L402 160 438 133 472 143 475 179 455 202 430 202Z',
  'M463 176 L498 145 552 155 590 131 645 148 714 179 770 185 797 221 759 247 721 245 703 281 659 306 625 270 592 262 581 233 537 237 498 217Z',
  'M597 269 L623 281 652 328 643 361 622 343 608 310Z',
  'M707 360 L753 339 792 366 805 403 779 430 727 422 696 393Z',
  'M868 174 L884 213 868 252 855 230Z',
  'M309 99 L332 65 366 83 351 123 321 137Z',
];
const n = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '0';
const circle = (x: number, y: number, r: number, fill: string, opacity = 1) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" opacity="${n(opacity)}"/>`;
function stars(count = 105, seed = 29, dim = false): string {
  const random = cosmicRandom(seed);
  return `<g data-art="stars">${Array.from({ length: count }, () => circle(random() * 1000, random() * 620, .4 + random() * 1.25, random() > .78 ? '#c0d9eb' : '#fff2d4', (dim ? .15 : .25) + random() * (dim ? .18 : .5))).join('')}</g>`;
}
function clouds(count: number, seed: number, colors: string[], spread = 1): string {
  const random = cosmicRandom(seed);
  return `<g data-art="clouds">${Array.from({ length: count }, (_, i) => `<ellipse cx="${n(500 + (random() - .5) * 820 * spread)}" cy="${n(310 + (random() - .5) * 520 * spread)}" rx="${n(55 + random() * 180)}" ry="${n(35 + random() * 95)}" fill="${colors[i % colors.length]}" opacity="${n(.07 + random() * .12)}" transform="rotate(${n(random() * 180)} 500 310)"/>`).join('')}</g>`;
}
function sphere(x: number, y: number, r: number, gradient: string, detail = ''): string {
  return `<g data-art="sphere">${circle(x, y, r + 12, 'url(#u-halo)', .7)}${circle(x, y, r, `url(#u-${gradient})`)}${detail}${circle(x, y, r, 'url(#u-shade)')}</g>`;
}
function earth(scorched = false, companion = true): string {
  return `<g data-art="${scorched ? 'scorched-earth' : 'blue-marble'}">${circle(465, 317, 212, 'url(#u-atmosphere)')}${circle(465, 317, 198, scorched ? 'url(#u-rock)' : 'url(#u-ocean)')}
    <g clip-path="url(#u-globe)"><g transform="translate(241 113) scale(.5 .65)" fill="${scorched ? '#694632' : '#75a487'}" stroke="${scorched ? '#bb7842' : '#d3c593'}" stroke-width="2">${CONTINENTS.map(path => `<path d="${path}"/>`).join('')}</g>
    ${scorched ? '<path d="M305 345Q410 200 590 370T620 220" fill="none" stroke="#f4b35e" stroke-width="4" opacity=".5"/>' : '<g fill="none" stroke="#fffbea" stroke-linecap="round" opacity=".6"><path d="M315 206Q425 181 489 218T620 205M281 283Q346 252 405 280M423 363Q505 332 605 365M344 442Q411 420 467 445" stroke-width="9"/><path d="M350 229Q425 200 528 245M395 396Q480 374 600 410" stroke-width="3"/></g>'}
    ${circle(465, 317, 198, 'url(#u-shade)')}</g><circle cx="465" cy="317" r="199" fill="none" stroke="${scorched ? '#d89b62' : '#b5e6f3'}" stroke-width="2" opacity=".55"/>
    ${companion ? sphere(798, 171, 43, 'moon', craters(798, 171, 43)) : ''}</g>`;
}
function craters(x: number, y: number, r: number): string {
  const random = cosmicRandom(151);
  return `<g data-art="craters">${Array.from({ length: 22 }, () => { const a = random() * Math.PI * 2, d = Math.sqrt(random()) * r * .77; return circle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.025 + random() * .09), '#6e7279', .3); }).join('')}</g>`;
}
function planet(kind: CosmicScene, destinationId: string): string {
  if (kind === 'earth' || kind === 'scorched') return earth(kind === 'scorched');
  if (kind === 'moon') return sphere(490, 312, 188, 'moon', craters(490, 312, 188)) + sphere(817, 155, 37, 'ocean');
  if (destinationId === 'europa') return sphere(490, 312, 176, 'ice', '<g clip-path="url(#u-planet)" data-art="europa-fractures"><path d="M335 212Q510 302 625 399M360 421Q439 315 581 197M298 317Q449 253 644 320" fill="none" stroke="#a77e6f" stroke-width="3" opacity=".7"/></g>');
  if (destinationId === 'titan') return `<g data-art="titan-haze">${circle(490, 312, 190, 'url(#u-halo)', .3)}${sphere(490, 312, 176, 'venus')}</g>`;
  if (destinationId === 'pluto') return sphere(490, 312, 176, 'moon', '<path data-art="pluto-heart" d="M455 328C381 275 399 232 448 258Q478 208 527 256Q553 290 501 342Z" fill="#eee4d3" opacity=".75"/>');
  if (kind === 'sun' || kind === 'giant') {
    const giant = kind === 'giant' || destinationId === 'betelgeuse';
    const random = cosmicRandom(56), r = giant ? 223 : 184;
    return `<g data-art="${giant ? 'red-giant' : 'solar-wind'}">${circle(480, 310, r + 95, 'url(#u-corona)')}${sphere(480, 310, r, giant ? 'giant' : 'sun')}${destinationId === 'betelgeuse' ? '<circle data-outburst="" cx="480" cy="310" r="225" fill="none" stroke="#e8b59a" opacity=".08" data-illustration="compressed mass-loss shell; not a supernova prediction"/>' : ''}
      ${Array.from({ length: 65 }, () => { const a = random() * Math.PI * 2, d = r + 18 + random() * 190; return circle(480 + Math.cos(a) * d, 310 + Math.sin(a) * d * .76, 1 + random() * 2, '#ffe5a3', .15 + random() * .45); }).join('')}
      <path d="M365 161C340 85 457 99 429 152M622 335C729 309 707 404 640 383" fill="none" stroke="#ffc878" stroke-width="5" opacity=".45"/></g>`;
  }
  const ring = kind === 'ring';
  const bands = kind === 'gas' || ring;
  const gradient = destinationId === 'mercury' ? 'moon' : destinationId === 'venus' ? 'venus'
    : destinationId === 'neptune' ? 'neptune' : kind === 'ice' ? 'ice' : bands ? 'gas' : 'rock';
  const detail = bands ? `<g clip-path="url(#u-planet)">${Array.from({ length: 13 }, (_, i) => `<path d="M260 ${171 + i * 24}Q490 ${205 + i * 22} 710 ${165 + i * 24}" stroke="${['#e4c89b', '#9b705c', '#fff0c9'][i % 3]}" stroke-width="${i % 3 === 0 ? 16 : 8}" opacity=".6" fill="none"/>`).join('')}${kind === 'gas' ? '<ellipse cx="557" cy="357" rx="38" ry="16" fill="#b96b53" opacity=".65"/>' : ''}</g>` : kind === 'rock' ? craters(490, 312, 176) : '<path d="M345 265Q445 211 613 270M352 377Q483 403 620 345" fill="none" stroke="#d6f4f0" stroke-width="11" opacity=".15"/>';
  const rings = `<ellipse cx="490" cy="312" rx="300" ry="93" transform="rotate(-24 490 312)" fill="none" stroke="#d9c4a0" stroke-width="42" opacity=".62"/><ellipse cx="490" cy="312" rx="326" ry="104" transform="rotate(-24 490 312)" fill="none" stroke="#fff0c5" stroke-width="8" opacity=".45"/>`;
  return `<g data-art="${kind}-planet">${ring ? rings : ''}${sphere(490, 312, 176, gradient, destinationId === 'venus' ? '' : detail)}${ring ? `<g clip-path="url(#u-ring-front)">${rings}</g>` : ''}</g>`;
}
function debris(comet: boolean, id: string): string {
  const random = cosmicRandom(42), oort = /oort/i.test(id), kuiper = /kuiper/i.test(id);
  return `<g data-art="${comet ? 'comet' : oort ? 'oort-cloud' : kuiper ? 'kuiper-belt' : 'asteroid-belt'}">${comet ? '<path d="M540 343Q382 297 160 114Q241 298 530 359Z" fill="url(#u-tail)"/><path d="M542 344Q381 188 185 177" fill="none" stroke="#83ceea" stroke-width="7" opacity=".17"/>' + sphere(552, 353, 23, 'moon', craters(552, 353, 23)) : Array.from({ length: oort ? 80 : 55 }, () => { const a = random() * Math.PI * 2, d = 170 + random() * 230; const x = 500 + Math.cos(a) * d, y = 310 + Math.sin(a) * d * (oort ? .7 : .32); return `<path d="M${n(x)} ${n(y)}l${n(3 + random() * 6)} -3 4 4 -4 5Z" fill="${kuiper || oort ? '#afc7cc' : '#a79e92'}" opacity="${n(.2 + random() * .5)}"/>`; }).join('')}</g>`;
}
function spiral(x: number, y: number, size: number, seed: number, tilt = -.35, count = 680): string {
  const random = cosmicRandom(seed);
  return `<g data-art="spiral-galaxy" transform="translate(${n(x)} ${n(y)}) rotate(${n(tilt * 57.3)}) scale(1 .57)">${circle(0, 0, size * .5, 'url(#u-galaxy-core)', .8)}${Array.from({ length: count }, (_, i) => { const d = Math.sqrt(random()) * size; const a = (i % 4) * Math.PI / 2 + d / size * 5.5 + (random() - .5) * .42; return circle(Math.cos(a) * d, Math.sin(a) * d, .6 + random() * 2.1, i % 8 === 0 ? '#da9f8b' : i % 3 === 0 ? '#bdddeb' : '#fbebc1', .15 + random() * .65); }).join('')}${circle(0, 0, size * .16, 'url(#u-halo)')}</g>`;
}
function blackhole(quasar = false): string {
  return `<g data-art="${quasar ? 'quasar-jets' : 'black-hole-lensing'}">${quasar ? '<path d="M489 305L457 38 488 72 513 310 553 571 522 544Z" fill="url(#u-jet)"/><path d="M495 285L478 97M510 337L536 524" stroke="#e4f5ff" stroke-width="4" opacity=".85"/>' : ''}
    <ellipse cx="500" cy="311" rx="${quasar ? 158 : 180}" ry="38" transform="rotate(-14 500 311)" fill="none" stroke="${quasar ? '#efcd91' : '#a88169'}" stroke-width="${quasar ? 16 : 6}" opacity="${quasar ? .8 : .35}"/>
    <path d="M342 302C370 170 627 162 653 305" fill="none" stroke="#d3b792" stroke-width="5" opacity=".38"/>
    ${circle(500, 308, 73, '#050b15')}<circle cx="500" cy="308" r="78" fill="none" stroke="#e7d8b8" stroke-width="2" opacity=".7"/>
    <path d="M327 346Q487 380 673 274" stroke="${quasar ? '#fff1c8' : '#b59c82'}" stroke-width="${quasar ? 8 : 3}" fill="none" opacity=".55"/>
    <path d="M273 202Q359 173 394 205M613 412Q683 455 748 410" stroke="#aacbdd" stroke-width="2" fill="none" opacity=".3"/>
    <g data-effect="accretion" data-illustration="time-compressed infall; not ray tracing">${Array.from({ length: 12 }, (_, i) => `<circle data-infall="${i}" cx="${500 + Math.cos(i * Math.PI / 6) * 150}" cy="${310 + Math.sin(i * Math.PI / 6) * 38}" r="2" fill="#e8c492"/>`).join('')}</g></g>`;
}
function web(beyond = false): string {
  const random = cosmicRandom(beyond ? 411 : 145);
  const nodes = Array.from({ length: 53 }, () => [80 + random() * 840, 55 + random() * 510]);
  return `<g data-art="${beyond ? 'speculative-field' : 'cosmic-web'}" opacity="${beyond ? .36 : .72}">${nodes.map(([x, y], i) => nodes.slice(i + 1).filter(([xx, yy]) => Math.hypot(x - xx, y - yy) < 145).map(([xx, yy]) => `<path d="M${n(x)} ${n(y)}Q${n((x + xx) / 2 + 12)} ${n((y + yy) / 2 - 16)} ${n(xx)} ${n(yy)}" stroke="${beyond ? '#94a9ba' : '#a6b4d1'}" stroke-width="${beyond ? 1 : 2}" opacity=".25" fill="none"/>`).join('') + circle(x, y, 5 + random() * 13, 'url(#u-halo)', .8)).join('')}${beyond ? clouds(12, 88, ['#9b8eac', '#6b9ca1'], .8) : ''}</g>`;
}
function scenery(kind: CosmicScene, snapshot: UniverseSnapshot): string {
  switch (kind) {
    case 'earth': case 'moon': case 'sun': case 'rock': case 'gas': case 'ring': case 'ice': case 'giant': case 'scorched':
      return planet(kind, snapshot.destinationId);
    case 'hot': return `<g data-art="hot-whole-field"><rect width="1000" height="620" fill="#f6c28a"/>${clouds(55, 14, ['#fff4ca', '#ee9864', '#ffe1a7'], 1.7)}</g>`;
    case 'plasma-field': return `<g data-art="plasma-whole-field"><rect width="1000" height="620" fill="#b85839"/>${clouds(65, 61, ['#ffd69a', '#f1935a', '#e17c58'], 1.8)}</g>`;
    case 'cmb': { const random = cosmicRandom(378); return `<g data-art="cmb-mottled-field"><rect width="1000" height="620" fill="#b28c79"/>${Array.from({ length: 560 }, () => circle(random() * 1000, random() * 620, 8 + random() * 38, random() > .5 ? '#cf9b70' : '#799cac', .12 + random() * .22)).join('')}</g>`; }
    case 'dark-field': return `<g data-art="dark-diffuse-field">${clouds(30, 35, ['#465771', '#26364e'], 1.8)}</g>`;
    case 'early-stars': return `<g data-art="first-stars">${clouds(20, 29, ['#535873', '#4c656c'])}${[[344, 273, 25], [573, 364, 17], [717, 178, 11]].map(([x, y, r]) => sphere(x, y, r, 'ice')).join('')}</g>`;
    case 'protogalaxies': return `<g data-art="gas-protogalaxies">${clouds(38, 93, ['#b28e91', '#a0b5b8', '#8b779a'])}${[[360, 270, 66], [668, 383, 48], [782, 158, 24]].map(([x, y, r]) => circle(x, y, r, 'url(#u-halo)', .32)).join('')}</g>`;
    case 'belt': case 'comet': return debris(kind === 'comet', snapshot.destinationId);
    case 'triple': {
      const binary = snapshot.destinationId === 'sirius' || snapshot.destinationId === 'eta-carinae';
      return `<g data-art="${binary ? 'binary-system' : 'hierarchical-triple'}" data-illustration="system overview; illustrative component phases and separation">${snapshot.destinationId === 'eta-carinae' ? '<g data-art="homunculus-lobes"><ellipse cx="405" cy="236" rx="115" ry="71" transform="rotate(35 405 236)" fill="#c08365" opacity=".3"/><ellipse cx="601" cy="402" rx="115" ry="71" transform="rotate(35 601 402)" fill="#c08365" opacity=".3"/><path d="M432 311Q474 230 538 319" fill="none" stroke="#edcfa0" opacity=".5"/></g>' : ''}${sphere(415, 304, 68, snapshot.destinationId === 'sirius' ? 'ice' : 'sun')}${sphere(565, 315, snapshot.destinationId === 'sirius' ? 9 : 48, binary ? 'ice' : 'gas')}${binary ? '' : sphere(848, 130, 17, 'giant')}<ellipse cx="491" cy="307" rx="153" ry="53" fill="none" stroke="#a4b4c6" stroke-width="1" opacity=".14"/></g>`;
    }
    case 'nebula': return `<g data-art="bounded-nebula">${clouds(72, 67, ['#b07175', '#638ea5', '#d5ad8b'], .7)}<path d="M324 460Q448 358 396 166Q456 294 503 300Q489 216 541 139Q529 286 605 379L552 491Z" fill="#101e30" opacity=".58"/>${stars(37, 67)}</g>`;
    case 'cluster': { const random = cosmicRandom(322); return `<g data-art="globular-cluster">${circle(500, 310, 190, 'url(#u-galaxy-core)', .45)}${Array.from({ length: 850 }, () => { const a = random() * Math.PI * 2, d = Math.pow(random(), 1.9) * 260; return circle(500 + Math.cos(a) * d, 310 + Math.sin(a) * d, .5 + random() * 1.8, '#fff1cb', .25 + random() * .65); }).join('')}</g>`; }
    case 'neutron': return `<g data-art="neutron-spin-poles" transform="rotate(-23 500 310)"><path d="M482 295L455 44Q500 15 545 44L518 295M482 325L455 576Q500 605 545 576L518 325" fill="url(#u-jet)"/>${sphere(500, 310, 26, 'ice')}<ellipse cx="500" cy="310" rx="118" ry="44" fill="none" stroke="#a6cedd" opacity=".25"/><path d="M490 280Q380 137 404 310T490 340M510 280Q620 137 596 310T510 340" fill="none" stroke="#94c7d9" opacity=".22" stroke-width="2"/></g>`;
    case 'blackhole': return blackhole();
    case 'quasar': return blackhole(true);
    case 'galaxy': return spiral(500, 310, 365, 781);
    case 'group': return `<g data-art="neighboring-galaxies">${spiral(315, 345, 186, 415, .25)}${spiral(718, 217, 147, 516, -.65)}${spiral(690, 447, 74, 55, .1)}${circle(172, 135, 46, 'url(#u-galaxy-core)', .65)}</g>`;
    case 'horizon': return web();
    case 'beyond': return web(true);
    case 'remnants': return `<g data-art="dim-sparse-remnants">${stars(22, 813, true)}${sphere(479, 318, 19, 'moon')}${circle(711, 187, 3, '#8e99a2', .3)}</g>`;
  }
}
const definitions = `<defs>
  <radialGradient id="u-ocean" cx="32%" cy="27%"><stop stop-color="#64c2e3"/><stop offset=".48" stop-color="#2584be"/><stop offset="1" stop-color="#0e395e"/></radialGradient>
  <radialGradient id="u-atmosphere"><stop offset=".89" stop-color="#79cde6" stop-opacity="0"/><stop offset=".94" stop-color="#98e4f1" stop-opacity=".45"/><stop offset="1" stop-color="#a5d4eb" stop-opacity="0"/></radialGradient>
  <radialGradient id="u-shade" cx="27%" cy="25%" r="83%"><stop offset=".2" stop-color="#031328" stop-opacity="0"/><stop offset=".65" stop-color="#031328" stop-opacity=".08"/><stop offset="1" stop-color="#020912" stop-opacity=".86"/></radialGradient>
  <radialGradient id="u-moon" cx="30%" cy="24%"><stop stop-color="#ece5d3"/><stop offset=".7" stop-color="#a1a3a1"/><stop offset="1" stop-color="#565e69"/></radialGradient>
  <radialGradient id="u-rock" cx="30%" cy="24%"><stop stop-color="#e0b384"/><stop offset=".7" stop-color="#b27354"/><stop offset="1" stop-color="#5b3e34"/></radialGradient>
  <radialGradient id="u-venus" cx="30%" cy="24%"><stop stop-color="#f4deaa"/><stop offset=".7" stop-color="#c4a775"/><stop offset="1" stop-color="#756449"/></radialGradient>
  <radialGradient id="u-neptune" cx="30%" cy="24%"><stop stop-color="#719fdc"/><stop offset=".65" stop-color="#3f70b7"/><stop offset="1" stop-color="#20365f"/></radialGradient>
  <radialGradient id="u-gas" cx="30%" cy="24%"><stop stop-color="#f9e3b9"/><stop offset=".7" stop-color="#c09c77"/><stop offset="1" stop-color="#72584d"/></radialGradient>
  <radialGradient id="u-ice" cx="30%" cy="24%"><stop stop-color="#d3f4eb"/><stop offset=".65" stop-color="#69b7c8"/><stop offset="1" stop-color="#296086"/></radialGradient>
  <radialGradient id="u-sun"><stop stop-color="#fff3bb"/><stop offset=".65" stop-color="#ffc876"/><stop offset="1" stop-color="#ed9854"/></radialGradient>
  <radialGradient id="u-giant"><stop stop-color="#ffd39a"/><stop offset=".65" stop-color="#e78d58"/><stop offset="1" stop-color="#ac4e36"/></radialGradient>
  <radialGradient id="u-corona"><stop offset=".48" stop-color="#ffdc98" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf88" stop-opacity="0"/></radialGradient>
  <radialGradient id="u-halo"><stop stop-color="#fff0d1" stop-opacity=".65"/><stop offset=".2" stop-color="#cbdae7" stop-opacity=".22"/><stop offset="1" stop-color="#a9c5db" stop-opacity="0"/></radialGradient>
  <radialGradient id="u-galaxy-core"><stop stop-color="#ffe8b5" stop-opacity=".9"/><stop offset=".18" stop-color="#f2d7b0" stop-opacity=".4"/><stop offset="1" stop-color="#b6c6d9" stop-opacity="0"/></radialGradient>
  <linearGradient id="u-tail"><stop stop-color="#93c6d8" stop-opacity="0"/><stop offset="1" stop-color="#e7f8f0" stop-opacity=".6"/></linearGradient>
  <linearGradient id="u-jet" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#abd9e9" stop-opacity="0"/><stop offset=".5" stop-color="#e2f4ee" stop-opacity=".6"/><stop offset="1" stop-color="#abd9e9" stop-opacity="0"/></linearGradient>
  <clipPath id="u-globe">${circle(465, 317, 198, '#fff')}</clipPath><clipPath id="u-planet">${circle(490, 312, 176, '#fff')}</clipPath><clipPath id="u-ring-front"><path d="M130 333L842 182V620H130Z"/></clipPath>
</defs>`;

const fieldScenes = new Set<CosmicScene>(['hot', 'plasma-field', 'cmb', 'dark-field', 'early-stars', 'protogalaxies', 'remnants']);
const layerSnapshot = (layer: FlightLayer, snapshot: UniverseSnapshot): UniverseSnapshot => ({ ...snapshot, ...layer.location, origin: undefined, travelling: false });
const layerScene = (layer: FlightLayer, snapshot: UniverseSnapshot) => universeScene(layerSnapshot(layer, snapshot));
const layerTransform = (layer: FlightLayer, snapshot: UniverseSnapshot): string => fieldScenes.has(layerScene(layer, snapshot))
  ? '' : `translate(${n(500 + layer.offset * 100)} 310) scale(${n(layer.scale)}) translate(-500 -310)`;
const skyOpacity = (frame: FlightFrame, snapshot: UniverseSnapshot): number => Math.max(0, 1 - frame.layers.reduce((sum, layer) => sum + (fieldScenes.has(layerScene(layer, snapshot)) ? layer.opacity : 0), 0));
function skyPoint(index: number, frame: FlightFrame): { x: number; y: number; color: string; trail: number; opacity: number } {
  const star = FLIGHT_STARS[index], point = flightStar(star, frame);
  const angle = Math.acos(Math.max(-1, Math.min(1, point.z / Math.hypot(point.x, point.y, point.z))));
  // Full-sky azimuthal illustration: forward at center, rear around the rim.
  const r = angle / Math.PI * 500 / Math.hypot(point.x, point.y, point.z);
  const tint = dopplerTint(point.factor);
  return { x: 500 + Math.cos(star.azimuth) * r, y: 310 + Math.sin(star.azimuth) * r * .62,
    color: `rgb(${tint.map(c => Math.round(c * 240)).join(',')})`, trail: point.trail,
    opacity: .6 * Math.sin(Math.PI * (Math.hypot(point.x, point.y, point.z) - 1)) ** 2 };
}
function flightSky(frame: FlightFrame): string {
  return FLIGHT_STARS.map((star, i) => {
    const point = skyPoint(i, frame);
    return `<g data-flight-star="${i}" opacity="${n(point.opacity)}"><circle cx="${n(point.x)}" cy="${n(point.y)}" r="${n(star.size)}" fill="${point.color}"/><path d="M${n(point.x)} ${n(point.y)}l${n((point.x - 500) * point.trail)} ${n((point.y - 310) * point.trail)}" fill="none" stroke="${point.color}" stroke-width="1"/></g>`;
  }).join('');
}
function frameKey(frame: FlightFrame, snapshot: UniverseSnapshot): string {
  return frame.layers.map(layer => `${layer.location.destinationId}|${layer.location.epoch}|${layerScene(layer, snapshot)}`).join(';');
}
function coordinateFlight(snapshot: UniverseSnapshot): boolean {
  return (snapshot.travelling || !!snapshot.coordinateView) && !!snapshot.origin && Object.prototype.hasOwnProperty.call(formationGyr, snapshot.destinationId) && Object.prototype.hasOwnProperty.call(formationGyr, snapshot.origin.destinationId);
}
function routeBody(object: RouteObject, lowPower = false): { art: string; center: [number, number]; radius: number } {
  if (object.kind === 'earth') return { art: earth(false, false), center: [465, 317], radius: 198 };
  if (object.kind === 'moon') return { art: sphere(490, 312, 188, 'moon', craters(490, 312, 188)), center: [490, 312], radius: 188 };
  if (['rock', 'gas', 'ring', 'ice', 'sun'].includes(object.kind)) return { art: planet(object.kind, object.id), center: object.kind === 'sun' ? [480, 310] : [490, 312], radius: object.kind === 'sun' ? object.id === 'betelgeuse' ? 223 : 184 : 176 };
  if (object.kind === 'triple') return { art: scenery('triple', { destinationId: object.id } as UniverseSnapshot), center: [500, 310], radius: object.id === 'proxima' ? 365 : 200 };
  if (object.kind === 'blackhole' || object.kind === 'quasar') return { art: blackhole(object.kind === 'quasar' || object.id === 'cygnus-x1') + (object.id === 'cygnus-x1' ? '<g data-illustration="binary overview; companion separation and wind not to scale"><path data-art="companion-wind" d="M825 217Q703 240 640 309" fill="none" stroke="#a9cae2" stroke-width="4" opacity=".4"/>' + sphere(825, 217, 30, 'ice') + '</g>' : ''), center: [500, 308], radius: 78 };
  if (object.kind === 'neutron') return { art: `<g data-effect="pulsar">${scenery('neutron', { destinationId: object.id } as UniverseSnapshot)}</g>`, center: [500, 310], radius: 26 };
  if (object.kind === 'galaxy' && ['m87', 'centaurus-a'].includes(object.id)) {
    const random = cosmicRandom(872);
    return { art: `<g data-art="elliptical-active-galaxy">${circle(500, 310, 190, 'url(#u-galaxy-core)', .7)}${Array.from({ length: lowPower ? 120 : 350 }, () => { const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 200; return circle(500 + Math.cos(angle) * radius, 310 + Math.sin(angle) * radius * .75, .7 + random(), '#eed9be', .2 + random() * .4); }).join('')}${object.id === 'centaurus-a' ? '<path data-art="dust-lane" d="M314 208L680 383L655 419L305 242Z" fill="#182335" opacity=".8"/>' : ''}<path data-art="active-galaxy-jet" d="M500 310L276 91M500 310L706 509" fill="none" stroke="#a1d7f4" stroke-width="7" opacity=".28"/><g transform="translate(500 310) scale(.11) translate(-500 -310)">${blackhole(true)}</g></g>`, center: [500, 310], radius: 200 };
  }
  if (object.kind === 'galaxy' || object.kind === 'group') return { art: spiral(500, 310, 200, 781, -.35, lowPower ? 160 : 680), center: [500, 310], radius: 200 };
  if (object.kind === 'nebula') return { art: `<g data-art="stellar-nursery" data-illustration="compressed star formation">${clouds(24, 67, ['#b07175', '#638ea5', '#d5ad8b'], .35)}${Array.from({ length: 8 }, (_, i) => `<circle data-newborn="${i}" cx="${420 + (i * 47) % 160}" cy="${235 + (i * 31) % 160}" r="${5 + i % 3}" fill="url(#u-halo)" opacity=".4"/>`).join('')}</g>`, center: [500, 310], radius: 200 };
  // Region markers are translucent diagrams, not invented individually located debris.
  return { art: `<g data-art="region-outline"><ellipse cx="500" cy="310" rx="176" ry="${object.kind === 'belt' && object.id !== 'oort' ? 40 : 176}" fill="none" stroke="${object.color}" stroke-width="2" stroke-dasharray="4 9"/></g>`, center: [500, 310], radius: 176 };
}
function futureFraction(frame: RouteFrame): number { return Math.max(0, Math.min(1, (frame.ageGyr - 13.8) / 5)); }
function stellarFade(frame: RouteFrame): number { return 1 / (1 + Math.max(0, frame.ageGyr - 18.8) / 60); }
function routeTint(object: RouteObject, frame: RouteFrame): string {
  const future = futureFraction(frame), stars = ['sun', 'triple', 'neutron', 'quasar'];
  const fading = stars.includes(object.kind) ? stellarFade(frame) : 1;
  const brightness = Math.min(1.5, object.brightness) * fading * (object.id === 'earth' ? 1 - .8 * future : 1);
  const tint = dopplerTint(object.factor).map(v => v * brightness);
  if (object.id === 'sun') { tint[1] *= 1 - .4 * future; tint[2] *= 1 - .7 * future; }
  return `${tint[0]} 0 0 0 0 0 ${tint[1]} 0 0 0 0 0 ${tint[2]} 0 0 0 0 0 1 0`;
}
function routeTransform(object: RouteObject, frame: RouteFrame, lowPower = false): string {
  const point = projectDirection(object.direction), body = routeBodyCenter(object, lowPower);
  const radius = Math.min(1000, 850 * Math.tan(object.angularRadius) / Math.max(.03, object.direction[2])) * (object.id === 'sun' ? 1 + .7 * futureFraction(frame) : 1);
  return `translate(${n(point.x)} ${n(point.y)}) scale(${Math.max(.00001, radius / body.radius).toFixed(6)}) translate(${-body.center[0]} ${-body.center[1]})`;
}
// Avoid generating the procedural surface again on every animation frame.
const routeArt = new Map<string, ReturnType<typeof routeBody>>();
function routeBodyCenter(object: RouteObject, lowPower = false): ReturnType<typeof routeBody> {
  const key = `${object.id}|${lowPower}`;
  let art = routeArt.get(key); if (!art) { art = routeBody(object, lowPower); routeArt.set(key, art); } return art;
}
function thermalColor(frame: RouteFrame): string {
  const hot = Math.max(0, Math.min(1, (Math.log10(Math.max(2.7, frame.temperatureK)) - 2) / 2));
  return `rgb(${Math.round(16 + 225 * hot)},${Math.round(29 + 151 * hot)},${Math.round(48 + 82 * hot)})`;
}
function knotTransform(point: readonly [number, number, number], frame: RouteFrame): string {
  const expanded = cosmicKnot(point, frame), z = Math.max(.3, expanded[2] + 18);
  return `translate(${n(500 + expanded[0] * 700 / z)} ${n(310 - expanded[1] * 700 / z)}) scale(${n(Math.max(.04, 18 / z))})`;
}
function resolvedBody(object: RouteObject): boolean {
  return object.formed > 0 && object.angularRadius >= .001 && projectDirection(object.direction).visible;
}
function resolvedBodies(frame: RouteFrame): Set<string> {
  const priority = (object: RouteObject) => frame.itinerary.includes(object.id) ? 1 : 0;
  return new Set(frame.objects.filter(resolvedBody).sort((a, b) => priority(b) - priority(a) || b.angularRadius - a.angularRadius).slice(0, 4).map(object => object.id));
}
function lowPowerShift(object: RouteObject): { color: string; opacity: number } {
  return { color: `rgb(${dopplerTint(object.factor).map(v => Math.round(v * 245)).join(',')})`, opacity: Math.min(.4, Math.abs(Math.log(Math.max(.001, object.factor))) * .2) };
}
function routeMarkup(snapshot: UniverseSnapshot, lowPower: boolean): string {
  const frame = routeFrame(snapshot), resolved = resolvedBodies(frame);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-render-budget="${lowPower ? 'safe' : 'full'}" data-scene="coordinate-transit" data-camera-au="${frame.cameraAU.join(',')}" data-age-gyr="${frame.ageGyr}" data-route-leg="${frame.leg}" data-motion="${snapshot.paused || snapshot.reducedMotion ? 'frozen' : 'active'}" style="display:block;width:100%;height:100%;touch-action:none;background:#101d30">
    ${definitions}${lowPower ? '' : `<defs>${frame.objects.map(object => `<filter id="u-tint-${object.id}" color-interpolation-filters="sRGB"><feColorMatrix data-route-tint="${object.id}" type="matrix" values="${routeTint(object,frame)}"/></filter>`).join('')}</defs>`}<rect data-route-background="" width="1000" height="620" fill="${thermalColor(frame)}"/>
    <g data-object="comoving-illustration" opacity="${n(frame.structure)}">${COSMIC_KNOTS.map((point, i) => `<g data-knot="${i}" transform="${knotTransform(point, frame)}">${circle(0, 0, 1.2 + i % 3, '#b9cbdc', .5)}${i % 4 === 0 ? '<path d="M0 0l12 -8" stroke="#6e8aa3" opacity=".3"/>' : ''}</g>`).join('')}</g>
    <g data-object="scene">${frame.objects.map(object => {
      const shown = !lowPower || resolved.has(object.id), body = shown ? routeBodyCenter(object, lowPower) : null, shift = lowPowerShift(object);
      return `<g data-route-body="${object.id}" data-evidence="${object.evidence}" data-distance-au="${object.distanceAU}" transform="${shown ? routeTransform(object,frame,lowPower) : 'translate(0 0)'}"${lowPower ? '' : ` filter="url(#u-tint-${object.id})"`} opacity="${n(object.formed)}" visibility="${shown && projectDirection(object.direction).visible ? 'visible' : 'hidden'}">${body?.art ?? ''}${lowPower && body ? `<circle data-route-shift="${object.id}" cx="${body.center[0]}" cy="${body.center[1]}" r="${body.radius}" fill="${shift.color}" opacity="${n(shift.opacity)}"/>` : ''}</g>`;
    }).join('')}</g>
    <g data-object="catalogue-points">${frame.objects.map(object => { const point = projectDirection(object.direction), color = dopplerTint(object.factor).map(v => Math.round(v * 245)); return `<circle data-route-point="${object.id}" cx="${n(point.x)}" cy="${n(point.y)}" r="${n(Math.min(2.5, object.brightness))}" fill="rgb(${color.join(',')})" opacity="${n(object.formed * stellarFade(frame))}" visibility="${point.visible && (object.angularRadius < .001 || lowPower && !resolved.has(object.id)) ? 'visible' : 'hidden'}"/>`; }).join('')}</g>
  </svg>`;
}
export function universeMarkup(snapshot: UniverseSnapshot, lowPower = false): string {
  if (coordinateFlight(snapshot)) return routeMarkup(snapshot, lowPower);
  const frame = flightFrame(snapshot);
  const represented = frame.layers.reduce<FlightLayer | undefined>((best, layer) => !best || layer.opacity > best.opacity ? layer : best, undefined);
  const kind = represented ? layerScene(represented, snapshot) : 'transit';
  const sky = skyOpacity(frame, snapshot);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-scene="${kind}" data-motion="${snapshot.paused || snapshot.reducedMotion ? 'frozen' : 'active'}" style="display:block;width:100%;height:100%;touch-action:none;background:#101d30">
    <!-- Original false-color/log-scale art. SR source angles are exact; compressed travel, acceleration, epoch blends and lensing are illustrations. -->
    ${definitions}<rect width="1000" height="620" fill="#101d30"/>
    <g data-optics="field" opacity="${n(sky)}">${flightSky(frame)}</g>
    <g data-object="scene">${frame.layers.map((layer, i) => `<g data-flight-layer="${i}" opacity="${n(layer.opacity)}" transform="${layerTransform(layer, snapshot)}">${scenery(layerScene(layer, snapshot), layerSnapshot(layer, snapshot))}</g>`).join('')}</g>
    <g data-optics="shift" opacity="${n(frame.visualBeta * .17)}" pointer-events="none"/>
  </svg>`;
}

export function createUniverseRenderer({ lowPower = false }: { lowPower?: boolean } = {}): UniverseRenderer {
  let host: HTMLElement | null = null, svg: SVGSVGElement | null = null, key = '', latest: UniverseSnapshot | null = null;
  let zoomLevel = 1, panX = 0, panY = 0, serial = 0, lastSnapshotKey = '', lastViewBox = '';
  let lastRoute: RouteFrame | null = null, lastMotion = '';
  const pointers = new Map<number, { x: number; y: number }>();
  const cleanup: (() => void)[] = [];
  const viewBox = () => {
    const pose = latest?.inspection, localZoom = zoomLevel * Math.exp(-(pose?.offset[2] ?? 0) * .12);
    const value = `${n(500 - 500 / localZoom + panX + (pose?.yaw ?? 0) * 850 + (pose?.offset[0] ?? 0) * 40)} ${n(310 - 310 / localZoom + panY - (pose?.pitch ?? 0) * 850 + (pose?.offset[1] ?? 0) * 40)} ${n(1000 / localZoom)} ${n(620 / localZoom)}`;
    if (svg && value !== lastViewBox) { svg.setAttribute('viewBox', value); lastViewBox = value; }
  };
  const zoom = (direction: number) => { if (!Number.isFinite(direction)) return; zoomLevel = Math.max(.65, Math.min(4, zoomLevel * Math.pow(1.18, Math.sign(direction)))); viewBox(); };
  const dispose = () => { cleanup.splice(0).forEach(fn => fn()); pointers.clear(); svg?.remove(); host = null; svg = null; key = ''; lastSnapshotKey = ''; lastViewBox = ''; lastRoute = null; };
  const render = (snapshot: UniverseSnapshot) => {
    latest = freezeSnapshot(snapshot);
    if (!host) return;
    const snapshotKey = JSON.stringify(latest);
    if (snapshotKey === lastSnapshotKey && svg) return;
    lastSnapshotKey = snapshotKey;
    const frame = flightFrame(latest), routing = coordinateFlight(latest);
    const route = routing ? routeFrame(latest) : null;
    const resolved = route ? resolvedBodies(route) : new Set<string>();
    const nextKey = routing ? `route:${latest.origin!.destinationId}:${latest.destinationId}:${lowPower ? [...resolved].sort().join(',') : ''}` : frameKey(frame, latest);
    if (!svg || key !== nextKey) {
      key = nextKey;
      const container = document.createElement('div');
      container.innerHTML = universeMarkup(latest, lowPower).replace(/u-/g, `cosmos-${serial}-`);
      lastRoute = null; lastViewBox = ''; lastMotion = '';
      const replacement = container.querySelector('svg')!;
      if (svg) svg.replaceWith(replacement); else host.prepend(replacement);
      svg = replacement; viewBox();
    }
    if (!svg) return;
    viewBox();
    if (!latest.paused && !latest.reducedMotion && !document.hidden) {
      const time = latest.effectTime ?? 0;
      svg.querySelectorAll<SVGElement>('[data-infall]').forEach(node => {
        const index = Number(node.dataset.infall), phase = (time * .13 + index / 12) % 1, angle = index * Math.PI / 6 + phase * Math.PI * 4;
        node.setAttribute('cx', n(500 + Math.cos(angle) * (150 - phase * 65)));
        node.setAttribute('cy', n(310 + Math.sin(angle) * (38 - phase * 18)));
        node.setAttribute('opacity', n(1 - phase));
      });
      svg.querySelectorAll<SVGElement>('[data-effect="pulsar"]').forEach(node => node.setAttribute('transform', `rotate(${n(Math.sin(time * 2) * 28)} 500 310)`));
      svg.querySelectorAll<SVGElement>('[data-newborn]').forEach(node => node.setAttribute('opacity', n(.35 + .3 * Math.sin(time * .45 + Number(node.dataset.newborn)))));
      svg.querySelectorAll<SVGElement>('[data-outburst]').forEach(node => { const phase = (time * .045) % 1; node.setAttribute('r', n(225 + phase * 90)); node.setAttribute('opacity', n(.18 * Math.sin(Math.PI * phase))); });
    }
    if (route) {
      const motionState = latest.paused || latest.reducedMotion || document.hidden ? 'frozen' : 'active';
      if (motionState !== lastMotion) { svg.setAttribute('data-motion', motionState); lastMotion = motionState; }
      // Ambient clocks and inspection do not change astronomical geometry or its tint.
      if (route === lastRoute) return;
      const cosmicChanged = !lastRoute || route.expansion !== lastRoute.expansion || route.structure !== lastRoute.structure || route.temperatureK !== lastRoute.temperatureK;
      lastRoute = route;
      svg.setAttribute('data-camera-au', route.cameraAU.join(',')); svg.setAttribute('data-age-gyr', String(route.ageGyr)); svg.setAttribute('data-route-leg', String(route.leg));
      if (cosmicChanged) {
        svg.querySelector('[data-route-background]')?.setAttribute('fill', thermalColor(route));
        svg.querySelector('[data-object="comoving-illustration"]')?.setAttribute('opacity', n(route.structure));
        COSMIC_KNOTS.forEach((point, i) => svg?.querySelector(`[data-knot="${i}"]`)?.setAttribute('transform', knotTransform(point, route)));
      }
      route.objects.forEach(object => {
        const node = svg?.querySelector(`[data-route-body="${object.id}"]`), point = projectDirection(object.direction);
        const shown = !lowPower || resolved.has(object.id);
        node?.setAttribute('transform', shown ? routeTransform(object,route,lowPower) : 'translate(0 0)'); node?.setAttribute('opacity', n(object.formed));
        svg?.querySelector(`[data-route-tint="${object.id}"]`)?.setAttribute('values', routeTint(object,route));
        const shift = lowPowerShift(object), overlay = svg?.querySelector(`[data-route-shift="${object.id}"]`);
        overlay?.setAttribute('fill', shift.color); overlay?.setAttribute('opacity', n(shift.opacity));
        node?.setAttribute('visibility', shown && point.visible ? 'visible' : 'hidden'); node?.setAttribute('data-distance-au', String(object.distanceAU));
        const dot = svg?.querySelector(`[data-route-point="${object.id}"]`);
        dot?.setAttribute('cx', n(point.x)); dot?.setAttribute('cy', n(point.y)); dot?.setAttribute('opacity', n(object.formed * stellarFade(route)));
        dot?.setAttribute('visibility', point.visible && (object.angularRadius < .001 || !shown) ? 'visible' : 'hidden');
        dot?.setAttribute('fill', `rgb(${dopplerTint(object.factor).map(v => Math.round(v * 245)).join(',')})`);
        dot?.setAttribute('r', n(Math.min(2.5, object.brightness)));
      });
      return;
    }
    frame.layers.forEach((layer, i) => {
      const node = svg?.querySelector(`[data-flight-layer="${i}"]`);
      node?.setAttribute('opacity', n(layer.opacity));
      node?.setAttribute('transform', layerTransform(layer, latest!));
    });
    const sky = svg.querySelector('[data-optics="field"]');
    sky?.setAttribute('opacity', n(skyOpacity(frame, latest)));
    FLIGHT_STARS.forEach((_, i) => {
      const node = sky?.querySelector(`[data-flight-star="${i}"]`), point = skyPoint(i, frame);
      node?.setAttribute('opacity', n(point.opacity));
      const dot = node?.querySelector('circle'), trail = node?.querySelector('path');
      dot?.setAttribute('cx', n(point.x)); dot?.setAttribute('cy', n(point.y)); dot?.setAttribute('fill', point.color);
      trail?.setAttribute('d', `M${n(point.x)} ${n(point.y)}l${n((point.x - 500) * point.trail)} ${n((point.y - 310) * point.trail)}`);
      trail?.setAttribute('stroke', point.color);
    });
    svg.querySelector('[data-optics="shift"]')?.setAttribute('opacity', n(frame.visualBeta * .17));
    const represented = frame.layers.reduce<FlightLayer | undefined>((best, layer) => !best || layer.opacity > best.opacity ? layer : best, undefined);
    svg.setAttribute('data-scene', represented ? layerScene(represented, latest) : 'transit');
    svg.setAttribute('data-motion', latest.paused || latest.reducedMotion || document.hidden ? 'frozen' : 'active');
  };
  return {
    mount(target) {
      dispose(); host = target; serial = ++svgSerial;
      const listen = (type: string, fn: EventListener, options?: AddEventListenerOptions) => { target.addEventListener(type, fn, options); cleanup.push(() => target.removeEventListener(type, fn, options)); };
      listen('pointerdown', ((event: PointerEvent) => { if (event.button !== 0) return; pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); target.setPointerCapture?.(event.pointerId); }) as EventListener);
      listen('pointermove', ((event: PointerEvent) => {
        const previous = pointers.get(event.pointerId); if (!previous) return;
        const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
        if (other) {
          const before = Math.hypot(previous.x - other.x, previous.y - other.y), after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
          if (before > 2 && after > 2) zoomLevel = Math.max(.65, Math.min(4, zoomLevel * after / before));
        } else {
          const box = target.getBoundingClientRect(), scale = Math.min(box.width / 1000, box.height / 620);
          if (scale > 0) { panX -= (event.clientX - previous.x) / scale / zoomLevel; panY -= (event.clientY - previous.y) / scale / zoomLevel; panX = Math.max(-700, Math.min(700, panX)); panY = Math.max(-440, Math.min(440, panY)); }
        }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); viewBox();
      }) as EventListener);
      const end = ((event: PointerEvent) => { pointers.delete(event.pointerId); if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId); }) as EventListener;
      listen('pointerup', end); listen('pointercancel', end); listen('lostpointercapture', end);
      listen('wheel', ((event: WheelEvent) => { event.preventDefault(); zoom(-event.deltaY); }) as EventListener, { passive: false });
      if (latest) render(latest);
    }, render, zoom,
    reset() { zoomLevel = 1; panX = panY = 0; viewBox(); }, dispose,
  };
}
let svgSerial = 0;
