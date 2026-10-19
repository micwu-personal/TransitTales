export type JourneySnapshot = {
  stations: readonly { id: number; step: number; label: string; rest: boolean; startBeat: number; durationBeats: number }[];
  activeIndex: number;
  progress: number;
  totalBeats: number;
  playing: boolean;
};

export type JourneyRenderer = {
  mount(host: HTMLElement): void;
  render(snapshot: JourneySnapshot): void;
  dispose(): void;
};

const NS = 'http://www.w3.org/2000/svg';
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));
const element = (tag: string, attributes: Record<string, string | number> = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
};

type Stop = { x: number; y: number; label: string; rest: boolean };

/** An illustrative contour, deliberately separate from the game's musical staff. */
export function createJourneyRenderer(): JourneyRenderer {
  let svg: SVGElement | undefined;
  let scenery: SVGElement | undefined;
  let fingerprint = '';
  let stops: Stop[] = [];
  let cars: SVGElement[] = [];
  let markers: SVGElement[] = [];
  let motion: MediaQueryList | undefined;
  let latest: JourneySnapshot | undefined;

  const position = (x: number): Stop => {
    if (!stops.length) return { x, y: 178, label: '', rest: false };
    let previous = { ...stops[0], x: 60 };
    for (const next of [...stops, { ...stops[stops.length - 1], x: 1160 }]) {
      if (x <= next.x) {
        const fraction = clamp((x - previous.x) / Math.max(1, next.x - previous.x), 0, 1);
        return { ...previous, x, y: previous.y + (next.y - previous.y) * fraction };
      }
      previous = next;
    }
    return { ...previous, x };
  };

  const render = (snapshot: JourneySnapshot) => {
    snapshot = { ...snapshot, stations: snapshot.stations.slice(0, 16).map(station => ({ ...station })) };
    latest = snapshot;
    if (!svg || !scenery) return;
    const stations = snapshot.stations.slice(0, 16).map((station, index) => ({
      step: clamp(station.step, -16, 24), label: String(station.label).slice(0, 32), rest: Boolean(station.rest),
      startBeat: clamp(station.startBeat, 0, 1024), durationBeats: clamp(station.durationBeats, 0.0625, 64), index,
    }));
    const key = JSON.stringify(stations);
    if (key !== fingerprint) {
      fingerprint = key;
      scenery.replaceChildren();
      markers = [];
      const extent = Math.max(1, ...stations.map(station => station.startBeat + station.durationBeats));
      const low = Math.min(0, ...stations.filter(station => !station.rest).map(station => station.step));
      const high = Math.max(8, ...stations.filter(station => !station.rest).map(station => station.step));
      let previousY = 178;
      stops = stations.map(station => {
        const y = station.rest ? previousY : 206 - (station.step - low) / (high - low) * 84;
        previousY = y;
        return { x: 155 + station.startBeat / extent * 900, y, label: station.label, rest: station.rest };
      });
      const points = [{ x: 60, y: stops[0]?.y ?? 178 }, ...stops, { x: 1160, y: stops.at(-1)?.y ?? 178 }];
      scenery.append(element('polyline', { points: points.map(stop => `${stop.x},${stop.y + 20}`).join(' '), fill: 'none', stroke: '#d3d2bb', 'stroke-width': 27, 'stroke-linejoin': 'round' }));
      for (let x = 65; x < 1160; x += 21) {
        const { y } = position(x);
        scenery.append(element('path', { d: `M${x - 5} ${y + 11}L${x + 5} ${y + 26}`, stroke: '#b3b69d', 'stroke-width': 4, 'stroke-linecap': 'round' }));
      }
      for (const offset of [12, 23]) scenery.append(element('polyline', { points: points.map(stop => `${stop.x},${stop.y + offset}`).join(' '), fill: 'none', stroke: '#284d47', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
      stops.forEach(stop => {
        const group = element('g', { transform: `translate(${stop.x} ${stop.y})` });
        group.append(element('path', { d: 'M-17 28V50M17 28V50', stroke: '#c1bda0', 'stroke-width': 6 }));
        group.append(element('rect', { x: -27, y: 23, width: 54, height: 9, rx: 3, fill: '#f5f3eb', stroke: '#b9bba4', 'stroke-width': 1.5 }));
        group.append(element('path', { d: 'M0 20V-27', stroke: '#284d47', 'stroke-width': 3 }));
        const marker = element('rect', { x: -24, y: -52, width: 48, height: 26, rx: 5, fill: '#f5f3eb', stroke: '#284d47', 'stroke-width': 2 });
        markers.push(marker);
        group.append(marker);
        const text = element('text', { x: 0, y: -34, 'text-anchor': 'middle', fill: '#284d47', 'font-family': 'system-ui, sans-serif', 'font-size': 15, 'font-weight': 700 });
        text.textContent = stop.rest ? '—' : stop.label;
        if (stop.label.length > 5 && !stop.rest) { text.setAttribute('textLength', '39'); text.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        group.append(text);
        scenery!.append(group);
      });
      cars.forEach(car => svg!.append(car));
    }
    const index = Math.trunc(clamp(snapshot.activeIndex, -1, stops.length - 1));
    const current = stops[index];
    const next = stops[index + 1];
    const fraction = motion?.matches ? 0 : clamp(snapshot.progress, 0, 1);
    const x = current ? current.x + ((next?.x ?? 1130) - current.x) * fraction : 120;
    markers.forEach((marker, markerIndex) => {
      marker.setAttribute('fill', markerIndex === index ? '#a9cfca' : '#f5f3eb');
      marker.setAttribute('stroke-width', markerIndex === index ? '3' : '2');
    });
    cars.forEach((car, carIndex) => {
      const at = position(x - carIndex * 44);
      const before = position(at.x - 2);
      const after = position(at.x + 2);
      const angle = Math.atan2(after.y - before.y, 4) * 180 / Math.PI;
      car.setAttribute('transform', `translate(${at.x} ${at.y}) rotate(${angle})`);
    });
  };

  const motionChanged = () => { if (latest) render(latest); };
  const dispose = () => {
    motion?.removeEventListener('change', motionChanged);
    motion = undefined;
    svg?.remove();
    svg = undefined;
    scenery = undefined;
    cars = [];
    markers = [];
    fingerprint = '';
    latest = undefined;
  };

  return {
    mount(host) {
      dispose();
      svg = element('svg', { viewBox: '0 0 1200 300', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid meet' });
      svg.style.cssText = 'display:block;width:100%;height:100%;background:#f5f3eb;overflow:hidden;';
      svg.append(element('rect', { width: 1200, height: 300, fill: '#f5f3eb' }));
      svg.append(element('circle', { cx: 1050, cy: 48, r: 30, fill: '#e7cb83' }));
      svg.append(element('path', { d: 'M0 230Q110 130 250 223Q395 142 560 223Q720 160 850 223Q1010 140 1200 230V300H0Z', fill: '#a9cfca' }));
      svg.append(element('path', { d: 'M0 265Q200 219 400 268Q620 235 850 275Q1030 242 1200 265V300H0Z', fill: '#c7d6b8' }));
      for (const [x, y, size] of [[70, 223, 18], [285, 237, 13], [483, 251, 18], [740, 235, 15], [963, 245, 19], [1130, 244, 15]]) {
        svg.append(element('path', { d: `M${x} ${y}v-${size * 2}`, stroke: '#284d47', 'stroke-width': 4 }));
        svg.append(element('ellipse', { cx: x, cy: y - size * 2, rx: size, ry: size * 1.3, fill: '#739b80' }));
        svg.append(element('circle', { cx: x + size, cy: y + 3, r: 4, fill: '#ad4938' }));
      }
      scenery = element('g');
      svg.append(scenery);
      cars = [0, 1, 2].map(index => {
        const car = element('g');
        car.append(element('rect', { x: -35, y: -17, width: 38, height: 26, rx: 7, fill: index === 0 ? '#ad4938' : '#a9cfca', stroke: '#284d47', 'stroke-width': 2 }));
        car.append(element('rect', { x: -37, y: -20, width: 41, height: 6, rx: 3, fill: '#284d47' }));
        for (const x of [-29, -14]) car.append(element('rect', { x, y: -11, width: 10, height: 10, rx: 2, fill: '#f5f3eb' }));
        for (const x of [-27, -6]) car.append(element('circle', { cx: x, cy: 11, r: 5, fill: '#284d47' }));
        if (index === 0) car.append(element('circle', { cx: 2, cy: 0, r: 3, fill: '#e7cb83' }));
        svg!.append(car);
        return car;
      });
      motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      motion.addEventListener('change', motionChanged);
      host.append(svg);
      render({ stations: [], activeIndex: -1, progress: 0, totalBeats: 0, playing: false });
    },
    render,
    dispose,
  };
}
