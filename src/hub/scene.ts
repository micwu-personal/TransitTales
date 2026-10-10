import { hubCopy, type HubLanguage } from './locale';
export function concourseScene(language: HubLanguage): string {
  const labels = hubCopy(language);
  const sign = (x: number, y: number, label: string, arrow: string, color: string, width: number, height: number, fontSize: number) => {
    if (language === 'mn-Mong-CN') {
      const columns = label.split(' ');
      const text = columns.map((column, index) => `<tspan x="${-12 + index * 25}" y="-45">${column}</tspan>`).join('');
      return `<g class="concourse-sign" transform="translate(${x} ${y})"><rect x="-38" y="-70" width="76" height="132" rx="6" fill="${color}"/><text x="-25" y="-50" fill="#fff9e9" font-size="17" font-family="Segoe UI,sans-serif">${arrow}</text><text lang="mn-Mong-CN" xml:lang="mn-Mong-CN" fill="#fff9e9" font-size="15" font-family="Noto Sans Mongolian,sans-serif" style="writing-mode:vertical-lr;text-orientation:mixed;letter-spacing:normal;text-anchor:start">${text}</text></g>`;
    }
    return `<g class="concourse-sign" transform="translate(${x} ${y})"><rect x="${-width / 2}" y="${height === 40 ? -25 : -21}" width="${width}" height="${height}" rx="${height === 40 ? 6 : 5}" fill="${color}"/><text text-anchor="middle" y="${height === 40 ? 1 : 2}" fill="#fff9e9" font-size="${fontSize}" font-family="Segoe UI,Microsoft YaHei,sans-serif">${arrow} ${label}</text></g>`;
  };
  const person = (x: number, y: number, color: string, bag = false) => `<g transform="translate(${x} ${y})"><ellipse cy="23" rx="10" ry="3" fill="#375f50" opacity=".15"/><path d="M-3 12l-2 10m9-10 2 10" stroke="#3c554d" stroke-width="3" stroke-linecap="round"/><rect x="-6" y="-2" width="12" height="16" rx="5" fill="${color}"/><circle cy="-7" r="5" fill="#d5aa82"/>${bag ? '<rect x="8" y="7" width="8" height="10" rx="2" fill="#bc8352"/>' : ''}</g>`;
  const plants = (x: number, y: number) => `<g transform="translate(${x} ${y})"><path d="M-18 0h36l-4 22h-28z" fill="#b8916b"/><path d="M0 4v-33" stroke="#5d8060" stroke-width="4"/><ellipse cx="-9" cy="-18" rx="15" ry="8" transform="rotate(35 -9 -18)" fill="#689274"/><ellipse cx="10" cy="-28" rx="15" ry="8" transform="rotate(-35 10 -28)" fill="#86a57c"/></g>`;
  const steps = Array.from({ length: 19 }, (_, i) => { const x = 295 + i * 11; const y = 274 - i * 5.9; return `<path d="M${x} ${y}h12v-6" fill="none" stroke="#d7ded0" stroke-width="3"/>`; }).join('');
  const windows = Array.from({ length: 10 }, (_, i) => `<rect x="${196 + i * 49}" y="432" width="35" height="32" rx="5" fill="#b3d6d0"/><path d="M${201 + i * 49} 437h25" stroke="#e5ede1" stroke-width="2"/>`).join('');
  return `<svg viewBox="0 0 1000 560" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs><pattern id="tiles" width="55" height="28" patternUnits="userSpaceOnUse"><path d="M0 0H55V28" fill="none" stroke="#cbd5c6" stroke-width="1"/></pattern><pattern id="canopy" width="78" height="78" patternUnits="userSpaceOnUse"><path d="M0 78L78 0M0 0V78H78" fill="none" stroke="#739b91" stroke-width="4"/></pattern></defs>
  <path d="M0 0h1000v560H0z" fill="#a9cfca"/><path d="M40 125L465 25l487 105v345L514 541 40 435z" fill="#7ba19a" opacity=".22"/>
  <path d="M55 117L453 24l483 98-409 106z" fill="#d8e7db"/><path d="M90 109L453 40l439 88-368 83z" fill="#b7d8cc"/><path d="M90 109L453 40l439 88-368 83z" fill="url(#canopy)"/>
  <path d="M55 117v279l472 120V228z" fill="#e5e9d9"/><path d="M527 228l409-106v275L527 516z" fill="#d4ddcd"/>
  <path d="M102 139v107l402 88V227z" fill="#eff1e5"/><path d="M551 232l348-90v109l-348 89z" fill="#a8c8ba"/>
  <path d="M99 277l385-89 410 100-379 105z" fill="#f7f4e5"/><path d="M99 277l416 116v25L99 302z" fill="#c4cebd"/><path d="M515 393l379-105v25L515 418z" fill="#b0bca9"/>
  <path d="M101 278l383-87 408 98-377 102z" fill="url(#tiles)"/>
  <path d="M108 391l373-79 413 101-378 109z" fill="#f5f0dd"/><path d="M108 391l408 131v15L108 406z" fill="#b0bca9"/><path d="M516 522l378-109v15L516 537z" fill="#8b9d8b"/>
  <path d="M583 324l-302-68 228-118 282 57" fill="none" stroke="#bdcbb8" stroke-width="14"/>
  <g><path d="M279 271L516 141l29 12L306 287z" fill="#334f48"/><path d="M294 274L516 156" stroke="#a9baae" stroke-width="20"/>${steps}<path d="M279 258L507 133l13 5" fill="none" stroke="#52736a" stroke-width="7" stroke-linecap="round"/><path d="M313 281L541 156l13 5" fill="none" stroke="#52736a" stroke-width="7" stroke-linecap="round"/><path d="M279 258v13m34 10v12m194-160v12m34 11v12" stroke="#789487" stroke-width="4"/></g>
  <path d="M162 144v99m404-63v114m286-146v118" stroke="#91a798" stroke-width="12"/>
  ${sign(664, 226, labels.atrium, '↑', '#315d50', 124, 40, 17)}
  ${plants(177, 280)}${plants(802, 292)}${plants(576, 183)}
  ${person(374, 230, '#bd7451', true)}${person(446, 190, '#5b82a0')}${person(663, 294, '#a28d4d', true)}${person(704, 306, '#456f63')}${person(226, 301, '#6388a1')}
  <path d="M127 475l406 95 361-97" fill="none" stroke="#46675e" stroke-width="23"/><path d="M127 470l406 95 361-97" fill="none" stroke="#dad5c0" stroke-width="13"/><path d="M127 470l406 95 361-97" fill="none" stroke="#5d7970" stroke-width="5"/>
  <g class="concourse-train"><path d="M165 423l509-18 58 30v53l-509 19-58-29z" fill="#a94b3b"/><path d="M165 423l509-18 58 30-509 19z" fill="#dfa084"/><path d="M223 454l509-19v53l-509 19z" fill="#b95944"/>${windows}<path d="M354 426v66m198-73v66" stroke="#e9b7a0" stroke-width="3"/><rect x="177" y="434" width="27" height="25" rx="4" fill="#446e6a"/><path d="M179 473h20" stroke="#ffe6af" stroke-width="4"/></g>
  ${sign(700, 371, labels.platform, '↓', '#2d5b6c', 136, 35, 15)}
  ${person(765, 417, '#53769b', true)}${person(807, 427, '#b78855')}${person(735, 408, '#526e53')}
  <path d="M83 376v-60m834 83v-64" stroke="#719584" stroke-width="8"/>
  </svg>`;
}
