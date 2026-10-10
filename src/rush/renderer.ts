import { CITY_HEIGHT, CITY_WIDTH, coastalScenery } from './city';
import { type CitySnapshot, type Point } from './view';

export type StationSelection = (stationId: string) => void;
export interface CityRenderer {
  mount(host: HTMLElement, onSelect: StationSelection, onTrainSelect?: (trainId: number) => void): void;
  render(snapshot: CitySnapshot): void;
  dispose(): void;
}
const SVG_NS = 'http://www.w3.org/2000/svg';
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const project = (point: Point) => ({ x: point.x * CITY_WIDTH, y: point.y * CITY_HEIGHT });

export function createSvgCityRenderer(): CityRenderer {
  let svg: SVGSVGElement | undefined;
  let select: StationSelection | undefined;
  let selectTrain: ((trainId: number) => void) | undefined;
  let signature = '';
  const stationNodes = new Map<string, SVGGElement>();
  const trainNodes = new Map<number, SVGGElement>();
  function activate(event: MouseEvent | KeyboardEvent) {
    const station = (event.target as Element).closest<SVGElement>('[data-station]');
    const train = (event.target as Element).closest<SVGElement>('[data-train]');
    if (!station && !train) return;
    if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (train) selectTrain?.(Number(train.dataset.train));
    else select?.(station!.dataset.station!);
  }
  function dispose() {
    svg?.removeEventListener('click', activate); svg?.removeEventListener('keydown', activate); svg?.remove();
    svg = undefined; select = undefined; selectTrain = undefined; signature = ''; stationNodes.clear(); trainNodes.clear();
  }
  return {
    mount(host, onSelect, onTrainSelect) {
      dispose(); select = onSelect; selectTrain = onTrainSelect;
      svg = document.createElementNS(SVG_NS, 'svg'); svg.id = 'map';
      svg.setAttribute('viewBox', `0 0 ${CITY_WIDTH} ${CITY_HEIGHT}`); svg.setAttribute('role', 'group');
      svg.addEventListener('click', activate); svg.addEventListener('keydown', activate); host.append(svg);
    },
    render(snapshot) {
      if (!svg) throw new Error('Mount the city renderer before rendering.');
      svg.setAttribute('aria-label', snapshot.accessibleName);
      const nextSignature = JSON.stringify([snapshot.stations.map(s => [s.id, s.position]), snapshot.lines]);
      if (nextSignature !== signature) {
        signature = nextSignature; stationNodes.clear(); trainNodes.clear();
        const stations = new Map(snapshot.stations.map(s => [s.id, s]));
        const tracks = snapshot.lines.map(line => {
          const points = line.stops.map(id => project(stations.get(id)!.position)).map(p => `${p.x},${p.y}`).join(' ');
          return `<g aria-hidden="true"><polyline points="${points}" class="rail-shadow"/><polyline points="${points}" class="rail-bed"/><polyline points="${points}" class="rail-sleepers"/><polyline points="${points}" class="rail-line" stroke="${escape(line.color)}"/><polyline points="${points}" class="rail-highlight"/></g>`;
        }).join('');
        svg.innerHTML = `<g class="city-scenery" aria-hidden="true">${coastalScenery()}</g>${tracks}<text x="364" y="702" class="river-label" aria-hidden="true"></text><g id="station-nodes"></g><g id="train-nodes"></g>`;
        const stationLayer = svg.querySelector('#station-nodes')!;
        for (const station of snapshot.stations) {
          const node = document.createElementNS(SVG_NS, 'g'); const p = project(station.position);
          node.dataset.station = station.id; node.classList.add('station'); node.setAttribute('tabindex', '0'); node.setAttribute('role', 'button'); node.setAttribute('transform', `translate(${p.x} ${p.y})`);
          const side = ['north','library','stadium'].includes(station.id);
          node.innerHTML = `<rect class="station-hit" x="-46" y="-43" width="110" height="99"/><ellipse class="platform-shadow" cy="12" rx="27" ry="12"/><ellipse class="station-platform" cy="5" rx="26" ry="13"/><ellipse class="selection-ring" cy="3" rx="31" ry="19"/><circle class="station-dot" r="9"/><g transform="translate(${side ? 36 : 0} ${side ? -5 : -31})"><text class="station-label" text-anchor="${side ? 'start' : 'middle'}"></text></g><g class="crowd" transform="translate(-21 20)"><rect width="42" height="23" rx="11.5"/><text x="21" y="16" text-anchor="middle"></text></g>`;
          stationLayer.append(node); stationNodes.set(station.id, node);
        }
      }
      svg.querySelector('.river-label')!.textContent = snapshot.riverLabel;
      for (const station of snapshot.stations) {
        const node = stationNodes.get(station.id)!;
        node.setAttribute('aria-label', station.accessibleName); node.setAttribute('aria-pressed', String(station.selected));
        node.classList.toggle('selected', station.selected); node.classList.toggle('busy', station.waiting >= 20); node.classList.toggle('helped', station.helped);
        const stationLabel = node.querySelector('.station-label')!;
        stationLabel.textContent = station.label;
        const vertical = /[\u1800-\u18af]/.test(station.label);
        const side = ['north', 'library', 'stadium'].includes(station.id);
        stationLabel.parentElement!.setAttribute('transform', vertical ? 'translate(38 -42)' : `translate(${side ? 36 : 0} ${side ? -5 : -31})`);
        node.querySelector('.crowd text')!.textContent = String(station.waiting);
      }
      const alive = new Set(snapshot.trains.map(train => train.id));
      for (const [id, node] of trainNodes) if (!alive.has(id)) { node.remove(); trainNodes.delete(id); }
      for (const train of snapshot.trains) {
        let node = trainNodes.get(train.id);
        if (!node) {
          node = document.createElementNS(SVG_NS, 'g'); node.classList.add('train');
          node.dataset.train = String(train.id); node.setAttribute('role', 'button'); node.setAttribute('tabindex', '0');
          node.innerHTML = `<rect class="train-hit" x="-35" y="-35" width="75" height="54" fill="transparent"/><g class="carriages">${[-29, -8, 13].map(x => `<g transform="translate(${x} 0)"><rect class="train-shadow" x="-1" y="-4" width="19" height="13" rx="4"/><rect class="train-body" y="-8" width="18" height="12" rx="4"/><rect class="train-roof" x="1" y="-10" width="16" height="9" rx="3"/><path d="M4-7h3m3 0h3" class="train-window"/><path d="M3 3h12" stroke="#254f50" stroke-width="2"/></g>`).join('')}</g><g class="rider-badge"><rect x="-12" y="-32" width="24" height="17" rx="8"/><text y="-20" text-anchor="middle"></text></g>`;
          svg.querySelector('#train-nodes')!.append(node); trainNodes.set(train.id, node);
        }
        node.setAttribute('aria-label', train.accessibleName);
        const p = project(train.position);
                const heading = Math.atan2(Math.sin(train.heading) * CITY_HEIGHT, Math.cos(train.heading) * CITY_WIDTH);
                const angle = heading * 180 / Math.PI;
                const line = snapshot.lines.find(line => line.id === train.line)!;
                const lane = 9;
                node.setAttribute('transform', `translate(${p.x - Math.sin(heading) * lane} ${p.y + Math.cos(heading) * lane})`);
        node.querySelector('.carriages')!.setAttribute('transform', `rotate(${angle})`);
        node.style.setProperty('--train-color', line.color); node.querySelector('text')!.textContent = String(train.riders);
        node.classList.toggle('spare', train.spare);
      }
    },
    dispose,
  };
}
