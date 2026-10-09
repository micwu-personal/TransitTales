import { type CityLayout } from './view';

export const COASTAL_LAYOUT: CityLayout = Object.freeze(Object.fromEntries(Object.entries({
  harbor: [0.105, 0.47], market: [0.265, 0.405], central: [0.465, 0.45], museum: [0.655, 0.405], garden: [0.85, 0.34],
  north: [0.385, 0.12], library: [0.425, 0.275], stadium: [0.515, 0.64], riverside: [0.685, 0.79], airport: [0.865, 0.82],
}).map(([id, [x, y]]) => [id, Object.freeze({ x, y })])));
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
