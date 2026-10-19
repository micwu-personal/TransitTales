import { type CityLayout } from './view';

export const COASTAL_LAYOUT: CityLayout = Object.freeze(Object.fromEntries(Object.entries({
  harbor: [0.105, 0.47], market: [0.265, 0.405], central: [0.465, 0.45], museum: [0.655, 0.405], garden: [0.85, 0.34],
  north: [0.385, 0.12], library: [0.425, 0.275], stadium: [0.515, 0.64], riverside: [0.685, 0.79], airport: [0.865, 0.82],
}).map(([id, [x, y]]) => [id, Object.freeze({ x, y })])));
export const ISLAND_LAYOUT: CityLayout = Object.freeze(Object.fromEntries(Object.entries({
  harbor: [.13, .56], market: [.29, .42], central: [.51, .49], museum: [.67, .31], garden: [.86, .39],
  north: [.47, .16], library: [.40, .30], stadium: [.55, .71], riverside: [.71, .83], airport: [.88, .74],
}).map(([id, [x, y]]) => [id, Object.freeze({ x, y })])));
export const FESTIVAL_ISLANDS = Object.freeze([
  { center: { x: .20, y: .49 }, points: [[.07,.22],[.27,.19],[.35,.31],[.34,.61],[.28,.77],[.12,.8],[.04,.66],[.04,.38]] },
  { center: { x: .53, y: .33 }, points: [[.38,.08],[.58,.06],[.71,.16],[.72,.43],[.64,.61],[.45,.62],[.35,.46],[.34,.21]] },
  { center: { x: .85, y: .36 }, points: [[.8,.18],[.91,.19],[.96,.3],[.95,.49],[.89,.55],[.78,.52],[.74,.38],[.76,.24]] },
  { center: { x: .70, y: .79 }, points: [[.47,.66],[.65,.64],[.84,.61],[.96,.69],[.96,.86],[.82,.94],[.61,.95],[.43,.86],[.42,.75]] },
].map(({ center, points }) => Object.freeze({ center: Object.freeze(center), points: Object.freeze(points.map(([x,y]) => Object.freeze({x,y}))) })));
export function festivalIslandAt(point: { x: number; y: number }): number {
  return FESTIVAL_ISLANDS.findIndex(({ points }) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  });
}
export const layoutFor = (id: 'little-bay' | 'lantern-isles') => id === 'lantern-isles' ? ISLAND_LAYOUT : COASTAL_LAYOUT;
export const CITY_WIDTH = 1120;
export const CITY_HEIGHT = 760;

function building(x: number, y: number, width: number, depth: number, height: number, roof: string, wall: string) {
  const d = depth * 0.55;
  const windows = Array.from({ length: Math.max(1, Math.floor(width / 15)) }, (_, i) => `<rect x="${x + 7 + i * 14}" y="${y - height + 13}" width="6" height="9" rx="1" fill="#557c79"/><rect x="${x + 7 + i * 14}" y="${y - height + 29}" width="6" height="8" rx="1" fill="#557c79"/>`).join('');
  return `<g><path d="M${x + 8} ${y + 9}h${width}l${depth + 12} ${-d}v8l${-depth - 12} ${d}h${-width}z" fill="#537a70" opacity=".13"/><path d="M${x} ${y}v${-height}h${width}v${height}z" fill="${wall}"/><path d="M${x + width} ${y}l${depth} ${-d}v${-height}l${-depth} ${d}z" fill="#b5c4b4"/><path d="M${x} ${y - height}l${depth} ${-d}h${width}l${-depth} ${d}z" fill="${roof}"/><path d="M${x + 8} ${y - height - 3}l${depth - 4} ${-d + 5}h${width - 17}l${-depth + 4} ${d - 5}z" fill="#fff" opacity=".16"/>${windows}<rect x="${x + width / 2 - 5}" y="${y - 17}" width="10" height="17" fill="#58736a"/></g>`;
}
function tree(x: number, y: number, size = 1) {
  return `<g transform="translate(${x} ${y}) scale(${size})"><ellipse cy="7" rx="15" ry="6" fill="#719b87" opacity=".2"/><path d="M0 0v-22" stroke="#816e4f" stroke-width="4"/><ellipse cy="-24" rx="13" ry="18" fill="#739d76"/><ellipse cx="-4" cy="-29" rx="8" ry="12" fill="#8eb18a"/></g>`;
}
export function coastalScenery(): string {
  const homes: [number, number, number, number, number, string, string][] = [
    [100, 240, 47, 26, 48, '#c08c73', '#ece1c8'], [160, 224, 43, 26, 68, '#829f9c', '#f2e8d2'],
    [235, 185, 52, 30, 58, '#c2937c', '#eee4d0'], [300, 228, 45, 24, 44, '#a4aea0', '#e6ddc7'],
    [555, 155, 55, 29, 77, '#7f9691', '#e5e2cf'], [628, 195, 43, 26, 58, '#c6997e', '#eee3cc'],
    [763, 254, 47, 28, 63, '#859b90', '#ece5d5'], [824, 204, 44, 25, 48, '#cba58a', '#e9e0c9'],
    [190, 460, 51, 26, 52, '#c8987b', '#eee2c8'], [278, 478, 43, 24, 73, '#819a91', '#e5e4d2'],
    [397, 450, 54, 32, 46, '#b3997e', '#f0e5ce'], [717, 455, 49, 25, 53, '#a9afa0', '#e9e0c8'],
  ];
  return `<defs><pattern id="water-lines" width="62" height="28" patternUnits="userSpaceOnUse"><path d="M6 14h24m12 0h10" stroke="#d5ece6" stroke-width="1.5" opacity=".58"/></pattern><pattern id="track-sleepers" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M0 0l13 13M-6 6l13 13M6-6l13 13" stroke="#8b9182" stroke-width="2"/></pattern></defs>
  <rect width="1120" height="760" fill="#a9cfca"/><rect width="1120" height="760" fill="url(#water-lines)"/>
  <path d="M55 56Q220 25 412 57L968 65Q1040 140 1011 281L983 385Q901 409 866 448L739 502Q672 530 610 497L465 541Q365 581 214 546L76 471Q23 392 55 56Z" fill="#799e8d" opacity=".25" transform="translate(0 14)"/>
  <path d="M55 56Q220 25 412 57L968 65Q1040 140 1011 281L983 385Q901 409 866 448L739 502Q672 530 610 497L465 541Q365 581 214 546L76 471Q23 392 55 56Z" fill="#d9e2cd" stroke="#edf0df" stroke-width="8"/>
  <path d="M659 568Q755 505 931 489L1075 512V735H707Q649 686 659 568Z" fill="#d5dfca" stroke="#eceddb" stroke-width="7"/>
  <path d="M84 277L344 269L609 221L939 168M168 105L219 529M539 69L617 486M81 432L354 376L964 305M711 536L1018 686" fill="none" stroke="#f2efdf" stroke-width="21" stroke-linejoin="round"/>
  <path d="M84 277L344 269L609 221L939 168M168 105L219 529M539 69L617 486M81 432L354 376L964 305M711 536L1018 686" fill="none" stroke="#c4cbbc" stroke-width="1.5" stroke-dasharray="8 13"/>
  <path d="M588 479L763 615" stroke="#859c91" stroke-width="36"/><path d="M588 472L763 608" stroke="#f1eedb" stroke-width="27"/><path d="M582 472L757 608M598 462L773 598" stroke="#b8c2b1" stroke-width="2"/>
  <g>${homes.map(args => building(...args)).join('')}</g>
  <path d="M850 100q72-35 129 14l-15 111q-54 32-109-3z" fill="#b4caa1"/><path d="M867 173q45-45 88-21t-7 54" fill="none" stroke="#ede5ca" stroke-width="7"/>
  <g>${[[886,138],[930,111],[966,157],[892,217],[943,210],[88,110],[325,101],[354,144],[362,454],[97,485],[806,430],[771,407],[827,559],[1000,552]].map(([x,y], i) => tree(x,y, i % 3 === 0 ? 1.2 : .9)).join('')}</g>
  <g>${building(677,288,77,40,45,'#88a79e','#efe8d6')}<path d="M676 245l41-34 74 0-37 34z" fill="#a9b7a6"/><path d="M690 287v-30m20 30v-30m20 30v-30" stroke="#fcf7e8" stroke-width="5"/></g>
  <g><ellipse cx="594" cy="416" rx="62" ry="36" fill="#b8bdae"/><ellipse cx="594" cy="407" rx="62" ry="36" fill="#efe8d3"/><ellipse cx="594" cy="407" rx="47" ry="25" fill="#8fb294"/><path d="M561 407h66m-33-16v32" stroke="#e1e6cb" stroke-width="2"/></g>
  <g><path d="M68 357L26 386v63l48-23" fill="#c6b398"/><path d="M68 357L26 386v12l48-23" fill="#e8dcc1"/><path d="M30 405l-19 9 2 24 19-9z" fill="#f5efe0"/><path d="M16 421l12-5" stroke="#658b8b" stroke-width="5"/></g>
  <g>${building(872,688,110,40,32,'#8ba5a0','#f0e8d5')}<path d="M1018 545v106m-17-53 17-11 17 11-17-4-4 15-3-15z" fill="#f4f0dd" stroke="#809b96" stroke-width="2"/></g>
  <g opacity=".8"><path d="M382 644l54-20-12 23-29 5z" fill="#f5efe1"/><path d="M407 616v28l-17-13z" fill="#faf5e9"/><path d="M409 619l15 15h-15z" fill="#bc8a70"/><path d="M112 594h27m342-30h25m389-101h32" stroke="#e5f1e9" stroke-width="3" stroke-linecap="round"/></g>`;
}

export function islandScenery(): string {
  const outlines = FESTIVAL_ISLANDS.map(island => `<polygon points="${island.points.map(p => `${p.x * CITY_WIDTH},${p.y * CITY_HEIGHT}`).join(' ')}" fill="#dbe7d0" stroke="#faf1d3" stroke-width="9" stroke-linejoin="round"/>`).join('');
  const lanterns = Array.from({ length: 9 }, (_, i) => `<g transform="translate(${215 + i * 17} ${236 + Math.sin(i / 2) * 9})"><path d="M0-9v22" stroke="#766048"/><ellipse rx="6" ry="8" fill="${i % 2 ? '#e9a746' : '#cf6954'}"/><path d="M-3 7h6" stroke="#f6e3b5"/></g>`).join('');
  const balloons = [[940,465,'#ce776d'],[995,445,'#6595b0'],[1027,480,'#e0b552']].map(([x,y,color]) => `<g transform="translate(${x} ${y})"><ellipse cy="-45" rx="18" ry="23" fill="${color}"/><path d="M-9-26l5 19h8l5-19M0-67v45" fill="none" stroke="#fae9ca" stroke-width="2"/><rect x="-5" y="-8" width="10" height="9" rx="2" fill="#9b7854"/></g>`).join('');
  return `<defs><pattern id="water-lines" width="62" height="28" patternUnits="userSpaceOnUse"><path d="M6 14h24m12 0h10" stroke="#d4efed" stroke-width="1.5" opacity=".6"/></pattern><pattern id="track-sleepers" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M0 0l13 13M-6 6l13 13M6-6l13 13" stroke="#8b9182" stroke-width="2"/></pattern></defs>
    <rect width="1120" height="760" fill="#91c4ca"/><rect width="1120" height="760" fill="url(#water-lines)"/>${outlines}
    <g fill="none" stroke="#f2ebd7" stroke-width="12" stroke-linecap="round"><path d="M121 481L273 214L362 333M444 410L462 151L649 162L732 362M511 620L769 689L986 599M870 349L970 196"/></g>
    <g data-place="lighthouse"><path d="M69 390h89v19H69z" fill="#b5a388"/><path d="M99 388l7-85h27l7 85z" fill="#fbf0da"/><path d="M102 358h35v-13h-33zM106 324h27v-13h-26z" fill="#c87059"/><path d="M103 299h34v-19h-34z" fill="#638f9b"/><path d="M99 280l21-16 21 16z" fill="#ad6755"/><path d="M117 284h8v11" fill="none" stroke="#ffe5a2" stroke-width="4"/></g>
    <g data-place="night-market">${[0,1,2].map(i => `${building(223+i*42,276,30,18,28,'#cf7c63','#f2e4ca')}<path d="M${220+i*42} 250h36l7 12h-45z" fill="${i%2?'#729e97':'#d7965d'}"/>`).join('')}<path d="M212 225Q287 253 360 228" fill="none" stroke="#8a7856" stroke-width="2"/>${lanterns}</g>
    <g data-place="clock-plaza"><ellipse cx="620" cy="304" rx="43" ry="22" fill="#ecddbd"/>${building(606,296,24,19,57,'#aa7962','#f5e7cc')}<circle cx="619" cy="254" r="9" fill="#fff7df" stroke="#667f79" stroke-width="2"/><path d="M619 248v6l5 3" fill="none" stroke="#425f5b" stroke-width="2"/></g>
    <g data-place="observatory"><path d="M700 179h68v-28h-68z" fill="#e9dcca"/><path d="M694 151a40 35 0 0 1 80 0z" fill="#789ea8"/><path d="M734 118v30" stroke="#c9e0df" stroke-width="4"/><path d="M756 122l22-16" stroke="#466d77" stroke-width="8"/><circle cx="778" cy="106" r="7" fill="#ebd39d"/></g>
    <g data-place="glasshouse"><path d="M923 223h87v-41l-44-24-43 24z" fill="#c5dfcf" stroke="#799d8e" stroke-width="3"/><path d="M923 183h87m-66-14v54m22-65v65m22-54v54" fill="none" stroke="#f2f0d8" stroke-width="3"/>${tree(934,223,.6)}${tree(985,225,.6)}</g>
    <g data-place="sky-story-tower">${building(383,178,26,22,53,'#7192a0','#efe6ce')}<path d="M382 123l24-28 25 15-22 13z" fill="#ba8067"/><path d="M395 145h9" stroke="#e2c677" stroke-width="6"/></g>
    <g data-place="puppet-theatre"><ellipse cx="541" cy="602" rx="48" ry="30" fill="#d5b992"/><ellipse cx="541" cy="599" rx="35" ry="19" fill="#f1e3c7"/><path d="M515 584h51v-30h-51z" fill="#9c6f5a"/><path d="M518 557h45v23h-45z" fill="#e8bb80"/><path d="M518 556l10 13-10 13m45-26-10 13 10 13" fill="#be6c65"/><circle cx="541" cy="569" r="5" fill="#608b89"/></g>
    <g data-place="paper-boats">${[0,1,2,3].map(i => `<g transform="translate(${752+i*32} ${684+(i%2)*16})"><path d="M-12 0h26l-7 11h-14z" fill="${i%2?'#ebbb79':'#f8ecda'}"/><path d="M0-13L-10 0h20z" fill="#f8f0db"/></g>`).join('')}</g><g data-place="balloons">${balloons}</g>
    <g>${[[503,94],[548,99],[583,107],[78,487],[186,538],[306,468],[479,655],[630,665],[983,346],[957,271]].map(([x,y],i)=>tree(x,y,i%2?.75:.9)).join('')}</g>
    <g fill="#e4bb75"><path d="M601 199l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/><path d="M671 118l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></g>`;
}
