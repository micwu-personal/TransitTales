import { type Graph, type Leg } from './model';
import { escapeHtml as e, stationLabel } from './locale';
import { placeMapLabels, type MapSegment } from './map-labels';
export class NetworkMap {
  private host: HTMLElement; private svg: SVGSVGElement; private layer: SVGGElement;
  private view = { x: -30, y: -30, size: 1060 }; private pointers = new Map<number, { x: number; y: number }>(); private gesture?: { view: { x: number; y: number; size: number }; x: number; y: number; distance: number }; private moved = false;
  private selected: string; private graph: Graph; private onSelect: (id: string) => void; private abort = new AbortController();
  private nodes: SVGGElement[] = []; private labelSizes = new Map<string, { width: number; height: number; x: number; y: number }>();
  private routeStations = new Set<string>(); private segments: MapSegment[] = []; private resize: ResizeObserver; private frame = 0;
  constructor(host: HTMLElement, graph: Graph, onSelect: (id: string) => void) {
    this.host = host; this.graph = graph; this.onSelect = onSelect; this.selected = graph.network.stations[0].id;
    const paths = graph.network.lines.map(line => { const points = [...line.stops]; if (line.loop && points.at(-1) !== points[0]) points.push(points[0]); const sections = line.connections?.map(connection => [connection.from,connection.to]) ?? line.directedEdges?.map(pair => [...pair]) ?? [points]; return sections.map(ids => { const d = ids.map((id,i) => { const station=graph.stations.get(id)!; return `${i?'L':'M'}${station.x},${station.y}`; }).join(' '); return `<path d="${d}" fill="none" stroke="${e(line.color)}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><title>${e(line.name+' · '+line.english)}</title></path>`; }).join(''); }).join('');
    const external = (graph.network.externalTransfers??[]).map(connection=>{const from=graph.stations.get(connection.from)!,to=graph.stations.get(connection.to)!;return `<path d="M${from.x},${from.y} L${to.x},${to.y}" fill="none" stroke="#806843" stroke-width="3.5" stroke-dasharray="3 3"><title>${e(stationLabel(from))} ↔ ${e(stationLabel(to))} · ${connection.minutes} min / ${connection.meters} m · simulated exit/re-entry walk</title></path>`;}).join('');
    const stations = graph.network.stations.map(station => { const transfer = new Set((graph.at.get(station.id)??[]).map(id=>graph.lines.get(id)!.serviceGroup??graph.lines.get(id)!.serviceId??id)).size > 1; return `<g class="map-station${transfer ? ' interchange' : ''}" data-station="${e(station.id)}" role="button" tabindex="${station.id === this.selected ? 0 : -1}" aria-label="${e(stationLabel(station))}" transform="translate(${station.x} ${station.y})"><title>${e(stationLabel(station))}</title><circle class="station-hit" r="12" fill="transparent"/><circle class="station-dot" r="${transfer ? 4.8 : 2.7}" fill="#fcfaf4" stroke="#284d47" stroke-width="${transfer ? 1.8 : 0.7}"/><g class="map-station-label" visibility="hidden" aria-hidden="true"><text class="station-text" x="0" y="11" font-size="12" fill="#284d47" paint-order="stroke" stroke="#e9f0e5" stroke-width="1.5">${e(station.name)}<tspan x="0" dy="12" font-size="10">${e(station.english)}</tspan></text></g></g>`; }).join('');
    host.innerHTML = `<svg class="network-svg" viewBox="-30 -30 1060 1060" aria-label="Beijing subway network" role="group"><rect x="-3000" y="-3000" width="7000" height="7000" fill="#e9f0e5"/><g class="network-lines">${paths}${external}</g><g class="route-lines"></g><g class="network-stations">${stations}</g></svg>`;
    this.svg = host.querySelector('svg')!; this.layer = host.querySelector('.route-lines')!;
    this.nodes = Array.from(this.svg.querySelectorAll<SVGGElement>('[data-station]'));
    for (const line of graph.network.lines) {
      const points = [...line.stops]; if (line.loop && points.at(-1) !== points[0]) points.push(points[0]);
      const pairs = line.connections?.map(edge => [edge.from, edge.to]) ?? line.directedEdges ?? points.slice(1).map((id, i) => [points[i], id]);
      for (const [from, to] of pairs) this.segments.push({ from: graph.stations.get(from)!, to: graph.stations.get(to)! });
    }
    for (const edge of graph.network.externalTransfers ?? []) this.segments.push({ from: graph.stations.get(edge.from)!, to: graph.stations.get(edge.to)! });
    this.resize = new ResizeObserver(() => this.scheduleLabels()); this.resize.observe(host);
    document.fonts.ready.then(() => { if (!this.abort.signal.aborted) { this.labelSizes.clear(); this.scheduleLabels(); } });
    const options = { signal: this.abort.signal };
    this.svg.addEventListener('pointerdown', event => { if (event.button !== 0) return; this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); this.svg.setPointerCapture(event.pointerId); this.begin(); this.moved = this.pointers.size > 1; }, options);
    this.svg.addEventListener('pointermove', event => { if (!this.pointers.has(event.pointerId) || !this.gesture) return; this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); const points = [...this.pointers.values()], x = points.reduce((sum, p) => sum + p.x, 0) / points.length, y = points.reduce((sum, p) => sum + p.y, 0) / points.length; const distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0; const deltaX = x - this.gesture.x, deltaY = y - this.gesture.y; if (Math.hypot(deltaX, deltaY) > 5 || points.length > 1) this.moved = true; const rect = this.svg.getBoundingClientRect(), scale = this.gesture.view.size / Math.min(rect.width, rect.height), size = Math.max(90, Math.min(1600, this.gesture.view.size * (this.gesture.distance && distance ? this.gesture.distance / distance : 1))); this.view = { x: this.gesture.view.x - deltaX * scale + (this.gesture.view.size - size) / 2, y: this.gesture.view.y - deltaY * scale + (this.gesture.view.size - size) / 2, size }; this.apply(); }, options);
    const end = (event: PointerEvent) => { const wasMoved = this.moved, target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-station]'); this.pointers.delete(event.pointerId); if (!this.pointers.size && !wasMoved && event.type !== 'pointercancel' && target) this.onSelect(target.getAttribute('data-station')!); if (this.pointers.size) { this.begin(); this.moved = true; } else this.gesture = undefined; };
    this.svg.addEventListener('pointerup', end, options); this.svg.addEventListener('pointercancel', end, options);
    this.svg.addEventListener('wheel', event => { event.preventDefault(); this.zoom(Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * .004)); }, { ...options, passive: false });
    this.svg.addEventListener('keydown', event => { const id = (event.target as Element).closest('[data-station]')?.getAttribute('data-station'); if (!id) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.onSelect(id); } else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); const current = graph.stations.get(id)!; const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight', sign = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1; const next = graph.network.stations.filter(station => (horizontal ? station.x - current.x : station.y - current.y) * sign > 0).sort((a,b) => { const cost = (s: typeof current) => Math.hypot(s.x-current.x,s.y-current.y) + Math.abs(horizontal ? s.y-current.y : s.x-current.x)*2; return cost(a)-cost(b); })[0]; if (next) { this.onSelect(next.id); this.center(next.id); this.focus(next.id); } } }, options);
    this.apply();
  }
  private begin() { const points = [...this.pointers.values()]; this.gesture = { view: { ...this.view }, x: points.reduce((sum,p) => sum+p.x,0)/points.length, y: points.reduce((sum,p) => sum+p.y,0)/points.length, distance: points.length > 1 ? Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y) : 0 }; }
  private apply() { this.view.x = Math.max(-1300, Math.min(1300,this.view.x)); this.view.y = Math.max(-1300, Math.min(1300,this.view.y)); this.svg.setAttribute('viewBox', `${this.view.x} ${this.view.y} ${this.view.size} ${this.view.size}`); this.scheduleLabels(); }
  private scheduleLabels() { if (!this.frame && !this.abort.signal.aborted) this.frame = requestAnimationFrame(() => { this.frame = 0; this.layoutLabels(); }); }
  private layoutLabels() {
    const rect = this.svg.getBoundingClientRect(), matrix = this.svg.getScreenCTM();
    if (!matrix || !rect.width || !rect.height) return;
    const scale = Math.hypot(matrix.a, matrix.b);
    if (!scale) return;
    const screen = (point: { x: number; y: number }) => ({ x: matrix.a * point.x + matrix.c * point.y + matrix.e - rect.left, y: matrix.b * point.x + matrix.d * point.y + matrix.f - rect.top });
    const points = this.graph.network.stations.map(station => screen(station));
    const segments = this.segments.map(edge => ({ from: screen(edge.from), to: screen(edge.to) })).filter(edge => Math.max(edge.from.x, edge.to.x) >= 0 && Math.min(edge.from.x, edge.to.x) <= rect.width && Math.max(edge.from.y, edge.to.y) >= 0 && Math.min(edge.from.y, edge.to.y) <= rect.height);
    const labels = this.nodes.flatMap(node => {
      const id = node.getAttribute('data-station')!, station = this.graph.stations.get(id)!, point = screen(station);
      const priority = id === this.selected ? 0 : node.classList.contains('current') ? 1 : this.routeStations.has(id) ? 2 : node.classList.contains('interchange') ? 3 : 4;
      const label = node.querySelector<SVGGElement>('.map-station-label')!;
      label.setAttribute('visibility', 'hidden');
      node.querySelector('.station-dot')!.setAttribute('r', String((priority < 2 ? 6 : node.classList.contains('interchange') ? 4.5 : 2.8) / scale));
      node.querySelector('.station-hit')!.setAttribute('r', String(22 / scale));
      if (priority === 4 && scale < 1.2 || point.x < 0 || point.y < 0 || point.x > rect.width || point.y > rect.height) return [];
      let size = this.labelSizes.get(id);
      if (!size) { const box = label.querySelector<SVGTextElement>('text')!.getBBox(); size = { width: box.width, height: box.height, x: box.x, y: box.y }; this.labelSizes.set(id, size); }
      return [{ id, ...point, width: size.width, height: size.height, priority }];
    });
    const placements = placeMapLabels(labels, segments, points, rect.width, rect.height);
    const placed = new Map(placements.map(placement => [placement.id, placement.box]));
    for (const node of this.nodes) {
      const id = node.getAttribute('data-station')!, box = placed.get(id); if (!box) continue;
      const point = screen(this.graph.stations.get(id)!), size = this.labelSizes.get(id)!, label = node.querySelector<SVGGElement>('.map-station-label')!;
      label.setAttribute('transform', `translate(${(box.x - point.x - size.x) / scale} ${(box.y - point.y - size.y) / scale}) scale(${1 / scale})`);
      label.setAttribute('visibility', 'visible');
    }
  }
  zoom(factor: number) { const size = Math.max(90, Math.min(1600,this.view.size/factor)); this.view.x += (this.view.size-size)/2; this.view.y += (this.view.size-size)/2; this.view.size=size; this.apply(); }
  fit() { this.view={x:-30,y:-30,size:1060}; this.apply(); }
  center(id: string) { const station=this.graph.stations.get(id); if (!station) return; this.view={x:station.x-170,y:station.y-170,size:340}; this.apply(); }
  focus(id: string) { this.stationElements().find(el=>el.getAttribute('data-station')===id)?.focus(); }
  private stationElements() { return this.nodes; }
  render(legs: Leg[], selected: string, current?: string, completed: { fromStation: string; toStation: string; kind?: string }[] = []) {
    this.selected=selected;
    this.routeStations = new Set(legs.flatMap(leg => [leg.stops[0], leg.stops.at(-1)!]));
    this.scheduleLabels();
    this.stationElements().forEach(el=> { const id=el.getAttribute('data-station'); el.classList.toggle('selected',id===selected); el.classList.toggle('current',id===current); el.setAttribute('tabindex',id===selected?'0':'-1'); el.setAttribute('aria-pressed',String(id===selected)); });
    const pathFor = (ids:string[]) => ids.map((id,i)=>{const s=this.graph.stations.get(id)!;return `${i?'L':'M'}${s.x},${s.y}`;}).join(' ');
    this.layer.innerHTML=legs.map(leg=>`<path d="${pathFor(leg.stops)}" fill="none" stroke="#fcfaf4" stroke-width="7"/><path d="${pathFor(leg.stops)}" fill="none" stroke="${e(leg.walkToLineId?'#806843':this.graph.lines.get(leg.lineId)?.color??'#315d50')}" stroke-width="4"${leg.walkToLineId?' stroke-dasharray="5 4"':''}/><path d="${pathFor(leg.stops)}" fill="none" stroke="#284d47" stroke-width="1.2" stroke-dasharray="2 5"/>`).join('')+completed.map(edge=>`<path d="${pathFor([edge.fromStation,edge.toStation])}" fill="none" stroke="${edge.kind==='walk'?'#806843':'#315d50'}" stroke-width="4" opacity=".8"${edge.kind==='walk'?' stroke-dasharray="5 4"':''}/>`).join('');
  }
  dispose() { this.abort.abort(); this.resize.disconnect(); cancelAnimationFrame(this.frame); this.frame = 0; this.pointers.clear(); this.host.innerHTML=''; }
}
