export type JourneyPitch = { midi: number; voice: number; durationBeats: number; label: string };
export type JourneyDynamic = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
export type JourneyStation = {
  id: number; step: number; label: string; rest: boolean; startBeat: number; durationBeats: number;
  pitches?: readonly JourneyPitch[];
  dynamic?: JourneyDynamic;
  pass?: number;
};
export type JourneySnapshot = {
  stations: readonly JourneyStation[];
  meter?: { beats: number; unit: 4 | 8 };
  repeat?: boolean;
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

export type RailwayPoint = { x: number; y: number; z: number };
export type RailwayNote = JourneyPitch & { startBeat: number; endBeat: number; pass: number; lane: number; chord: number; x: number; endX: number; height: number };
export type RailwayStop = JourneyStation & RailwayPoint & { localBeat: number; endX: number; intensity: number; lanes: RailwayPoint[]; replayOf: number };
export type RailwayGeometry = {
  stops: RailwayStop[]; notes: RailwayNote[]; voices: number[]; extent: number;
  routes: RailwayPoint[][]; ties: { beat: number; strong: boolean; points: RailwayPoint[] }[];
  returnRoutes: RailwayPoint[][]; coachCount: number;
};

/** Fixed semitone scale: an octave is always the same climb, regardless of clef or score range. */
export const railwayPitchHeight = (midi: number) => 0.65 + (clamp(midi, 24, 108) - 24) * 0.0275;
export const railwayLaneColor = (lane: number) => ['#ad4938', '#739b80', '#a9cfca', '#e7cb83'][lane % 4];
const intensity = (dynamic?: JourneyDynamic) => ({ pp: 0.35, p: 0.45, mp: 0.55, mf: 0.65, f: 0.78, ff: 0.9 }[dynamic ?? 'mf'] ?? 0.65);
const legacyMidi = (step: number) => 60 + Math.floor(step / 7) * 12 + [0, 2, 4, 5, 7, 9, 11][((step % 7) + 7) % 7];
const laneZ = (lane: number, count: number) => (lane - (count - 1) / 2) * 0.78;
const mix = (a: RailwayPoint, b: RailwayPoint, t: number): RailwayPoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
export function railwayPointAt(points: readonly RailwayPoint[], x: number): RailwayPoint {
  if (!points.length) return { x, y: railwayPitchHeight(60), z: 0 };
  if (x <= points[0].x) return { ...points[0], x };
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i].x) return mix(points[i - 1], points[i], clamp((x - points[i - 1].x) / Math.max(0.000001, points[i].x - points[i - 1].x), 0, 1));
  }
  return { ...points[points.length - 1], x };
}
const returnPoint = (from: RailwayPoint, to: RailwayPoint, t: number, depth: number): RailwayPoint => {
  const point = mix(from, to, t * t * (3 - 2 * t));
  point.z -= Math.sin(Math.PI * t) * depth;
  return point;
};

/** Bounded, playback-independent geometry. Pitches are new attacks; previous attacks sustain by their own clocks. */
export function buildRailwayGeometry(snapshot: JourneySnapshot): RailwayGeometry {
  const stations = snapshot.stations.slice(0, 512).map(station => {
    const rest = Boolean(station.rest);
    const pitches = rest ? [] : (station.pitches ?? [{ midi: legacyMidi(Math.trunc(clamp(station.step, -21, 28))), voice: 0, durationBeats: station.durationBeats, label: station.label }]);
    return { ...station, label: String(station.label).slice(0, 64), rest,
      startBeat: clamp(station.startBeat, 0, 8192), durationBeats: clamp(station.durationBeats, 0.0625, 256),
      pass: Math.trunc(clamp(station.pass ?? 0, 0, 1)),
      pitches: pitches.slice(0, 32).filter(pitch => Number.isFinite(pitch.midi) && Number.isFinite(pitch.voice)).map(pitch => ({
        ...pitch, midi: clamp(pitch.midi, 0, 127), voice: Math.trunc(clamp(pitch.voice, 0, 127)), durationBeats: clamp(pitch.durationBeats, 0.0625, 256),
      })),
    };
  });
  const voices = [...new Set(stations.flatMap(stop => stop.pitches.map(pitch => pitch.voice)))].sort((a, b) => a - b).slice(0, 8);
  if (!voices.length) voices.push(0);
  const passStarts = [0, 1].map(pass => Math.min(...stations.filter(stop => stop.pass === pass).map(stop => stop.startBeat)));
  const passEnds = [0, 1].map(pass => Math.max(0, ...stations.filter(stop => stop.pass === pass).map(stop => stop.startBeat + stop.durationBeats)));
  const extent = Math.max(1, ...passEnds.map((end, pass) => Number.isFinite(passStarts[pass]) ? end - passStarts[pass] : 0));
  const xAt = (beat: number, pass: number) => 0.04 + clamp((beat - passStarts[pass]) / extent, 0, 1) * 0.92;
  const notes: RailwayNote[] = [];
  const heights = voices.map(() => railwayPitchHeight(60));
  let lastPass = -1;
  const stops: RailwayStop[] = stations.map((station, index) => {
    if (station.pass !== lastPass) { heights.fill(railwayPitchHeight(60)); lastPass = station.pass; }
    for (const [lane, voice] of voices.entries()) {
      const attacks = station.pitches.filter(pitch => pitch.voice === voice).sort((a, b) => a.midi - b.midi);
      if (attacks.length) heights[lane] = railwayPitchHeight(attacks[attacks.length - 1].midi);
      attacks.forEach((pitch, chord) => {
        const endBeat = Math.min(station.startBeat + pitch.durationBeats, passEnds[station.pass]);
        notes.push({ ...pitch, startBeat: station.startBeat, endBeat, pass: station.pass, lane,
          chord: (chord - (attacks.length - 1) / 2) * 0.16,
          x: xAt(station.startBeat, station.pass), endX: xAt(endBeat, station.pass), height: railwayPitchHeight(pitch.midi),
        });
      });
    }
    const x = xAt(station.startBeat, station.pass);
    const lanes = heights.map((y, lane) => ({ x, y, z: laneZ(lane, voices.length) }));
    const replayOf = station.pass ? stations.findIndex(previous => previous.pass === 0 && Math.abs((previous.startBeat - passStarts[0]) - (station.startBeat - passStarts[station.pass])) < 0.0001) : -1;
    return { ...station, x, y: heights[0], z: lanes[0].z, lanes, intensity: intensity(station.dynamic),
      localBeat: station.startBeat - passStarts[station.pass], endX: xAt(station.startBeat + station.durationBeats, station.pass), replayOf: replayOf < index ? replayOf : -1,
    };
  });
  const firstPass = stops.filter(stop => stop.pass === (stops[0]?.pass ?? 0));
  const routes = voices.map((_, lane) => {
    const points = firstPass.map(stop => stop.lanes[lane]);
    return points.length ? [{ ...points[0], x: 0 }, ...points, { ...points[points.length - 1], x: 1 }] : [{ x: 0, y: heights[lane], z: laneZ(lane, voices.length) }, { x: 1, y: heights[lane], z: laneZ(lane, voices.length) }];
  });
  const returnRoutes: RailwayPoint[][] = [];
  const returnDepth = 1.6 + voices.length * 0.4;
  for (let i = 0; i < stops.length - 1; i++) if (stops[i].pass !== stops[i + 1].pass) {
    voices.forEach((_, lane) => returnRoutes.push(Array.from({ length: 33 }, (_, sample) => returnPoint(stops[i].lanes[lane], stops[i + 1].lanes[lane], sample / 32, returnDepth))));
  }
  const unit = snapshot.meter?.unit === 8 ? 0.5 : 1;
  const bar = clamp(snapshot.meter?.beats ?? 4, 1, 16) * unit;
  // Quarter/eighth beat sleepers, capped for imported long scores rather than unbounded mesh growth.
  const subdivision = Math.max(unit / 2, extent / 512);
  const ties = Array.from({ length: Math.min(513, Math.floor(extent / subdivision) + 1) }, (_, index) => {
    const beat = index * subdivision;
    return { beat, strong: Math.abs(beat / bar - Math.round(beat / bar)) < 0.00001, points: routes.map(points => railwayPointAt(points, 0.04 + beat / extent * 0.92)) };
  });
  const coachCount = Math.min(32, Math.max(0, ...stops.map(stop => notes.filter(note => note.pass === stop.pass && note.startBeat <= stop.startBeat && note.endBeat > stop.startBeat).length)));
  return { stops, notes, voices, extent, routes, ties, returnRoutes, coachCount };
}

export function createRailwayGeometryCache() {
  let key = '';
  let geometry: RailwayGeometry | undefined;
  return { get(snapshot: JourneySnapshot) {
    const next = JSON.stringify([snapshot.stations.slice(0, 512), snapshot.meter, snapshot.repeat]);
    if (!geometry || next !== key) { key = next; geometry = buildRailwayGeometry(snapshot); }
    return geometry;
  }, clear() { key = ''; geometry = undefined; } };
}

export function sampleRailwayFrame(geometry: RailwayGeometry, snapshot: JourneySnapshot, reducedMotion = false) {
  const index = Math.trunc(clamp(snapshot.activeIndex, -1, geometry.stops.length - 1));
  const stop = geometry.stops[index];
  const next = geometry.stops[index + 1];
  const progress = reducedMotion ? 0 : clamp(snapshot.progress, 0, 1);
  const beat = stop ? stop.startBeat + progress * stop.durationBeats : 0;
  const returning = Boolean(stop && next && stop.pass !== next.pass);
  const x = stop ? stop.x + ((next && !returning ? next.x : stop.endX) - stop.x) * progress : 0.015;
  const lanes = geometry.routes.map((points, lane) => returning ? returnPoint(stop.lanes[lane], next.lanes[lane], progress, 1.6 + geometry.voices.length * 0.4) : railwayPointAt(points, x));
  const sounding = geometry.notes.filter(note => note.pass === stop?.pass && note.startBeat <= beat && note.endBeat > beat).slice(0, 32);
  const subdivision = snapshot.meter?.unit === 8 ? 0.25 : 0.5;
  const phase = ((beat / subdivision) % 1 + 1) % 1;
  const pulse = snapshot.playing && !reducedMotion && stop && sounding.length ? Math.pow(1 - phase, 4) * 0.045 * stop.intensity : 0;
  return { index, beat, returning, lanes, rest: sounding.length === 0, intensity: stop?.intensity ?? 0.65, pulse,
    wheelAngle: snapshot.playing && !reducedMotion ? beat * Math.PI * 2 : 0,
    coaches: sounding.map(note => ({ note, at: returning ? { ...lanes[note.lane], z: lanes[note.lane].z + note.chord } : { x, y: note.height, z: laneZ(note.lane, geometry.voices.length) + note.chord },
      length: 0.7 + Math.min(4, note.durationBeats) * 0.16,
      attack: snapshot.playing && !reducedMotion ? Math.exp(-(beat - note.startBeat) * 12) * 0.045 * (stop?.intensity ?? 0.65) : 0,
    })),
  };
}

/** SVG fallback uses the same musical railway and sounding-tone clocks as Babylon. */
export function createJourneyRenderer(): JourneyRenderer {
  let svg: SVGElement | undefined;
  let scenery: SVGElement | undefined;
  let built: RailwayGeometry | undefined;
  const cache = createRailwayGeometryCache();
  let cars: SVGElement[] = [];
  let markers: SVGElement[] = [];
  let motion: MediaQueryList | undefined;
  let latest: JourneySnapshot | undefined;
  const project = (point: RailwayPoint) => ({ x: 60 + point.x * 1080 + point.z * 12, y: 276 - point.y * 58 + point.z * 18 });
  const pointsText = (points: readonly RailwayPoint[], offset = 0) => points.map(point => { const at = project(point); return at.x + ',' + (at.y + offset); }).join(' ');

  const render = (snapshot: JourneySnapshot) => {
    latest = snapshot;
    if (!svg || !scenery) return;
    const geometry = cache.get(snapshot);
    if (built !== geometry) {
      built = geometry;
      scenery.replaceChildren(); markers = [];
      for (const [index, route] of [...geometry.returnRoutes, ...geometry.routes].entries()) {
        const returning = index < geometry.returnRoutes.length;
        scenery.append(element('polyline', { points: pointsText(route,18), fill:'none', stroke:returning ? '#dedcca' : '#d3d2bb', 'stroke-width':22, 'stroke-linejoin':'round', 'data-route':returning ? 'repeat' : 'voice' }));
        for (const offset of [12,23]) scenery.append(element('polyline', { points:pointsText(route,offset), fill:'none', stroke:'#284d47', 'stroke-width':2, 'stroke-linejoin':'round' }));
      }
      for (const tie of geometry.ties) for (const point of tie.points) {
        const at = project(point);
        scenery.append(element('path', { d:'M' + (at.x-5) + ' ' + (at.y+10) + 'L' + (at.x+5) + ' ' + (at.y+26), stroke:tie.strong ? '#ad4938' : '#b3b69d', 'stroke-width':tie.strong ? 5 : 3, 'data-beat':tie.beat }));
      }
      for (const note of geometry.notes.filter(note => note.pass === 0)) {
        const start = project({x:note.x,y:note.height,z:laneZ(note.lane,geometry.voices.length)+note.chord});
        const end = project({x:note.endX,y:note.height,z:laneZ(note.lane,geometry.voices.length)+note.chord});
        scenery.append(element('path', { d:'M' + start.x + ' ' + (start.y+4) + 'H' + end.x, stroke:railwayLaneColor(note.lane), 'stroke-width':4, opacity:.7, 'data-midi':note.midi, 'data-voice':note.voice }));
      }
      const stops = geometry.stops.filter(stop => stop.pass === 0);
      stops.forEach((stop,index) => {
        const at = project(stop);
        const group = element('g', { transform:'translate(' + at.x + ' ' + at.y + ')' });
        group.append(element('path', { d:'M-17 28V55M17 28V55',stroke:'#c1bda0','stroke-width':5 }));
        group.append(element('rect', { x:-27,y:23,width:54,height:9,rx:3,fill:'#f5f3eb',stroke:'#b9bba4','stroke-width':1.5 }));
        const marker = element('rect', { x:-24,y:-52,width:48,height:26,rx:5,fill:'#f5f3eb',stroke:'#284d47','stroke-width':2 });
        markers.push(marker);
        if (stops.length <= 24 || index % 4 === 0) {
          group.append(element('path', { d:'M0 20V-27',stroke:'#284d47','stroke-width':3 })); group.append(marker);
          const text = element('text', { x:0,y:-34,'text-anchor':'middle',fill:'#284d47','font-family':'system-ui,sans-serif','font-size':15,'font-weight':700 });
          text.textContent = stop.rest ? '—' : stop.label;
          if (stop.label.length > 5 && !stop.rest) { text.setAttribute('textLength','39'); text.setAttribute('lengthAdjust','spacingAndGlyphs'); }
          group.append(text);
        }
        scenery!.append(group);
      });
      cars.forEach(car => svg!.append(car));
    }
    const frame = sampleRailwayFrame(geometry,snapshot,motion?.matches ?? false);
    const current = geometry.stops[frame.index];
    const markerIndex = current?.pass ? current.replayOf : frame.index;
    markers.forEach((marker,index) => { marker.setAttribute('fill',index === markerIndex ? '#a9cfca' : '#f5f3eb'); marker.setAttribute('stroke-width',index === markerIndex ? '3' : '2'); });
    cars.forEach((car,index) => {
      const coach = frame.coaches[index-1];
      const point = index === 0 ? frame.lanes[0] : coach?.at;
      car.setAttribute('visibility', point ? 'visible' : 'hidden');
      if (!point) return;
      const at = project(point);
      const lane = index === 0 ? 0 : coach.note.lane;
      const route = geometry.routes[lane];
      const before = project(railwayPointAt(route,point.x-.002)), after = project(railwayPointAt(route,point.x+.002));
      const angle = frame.returning ? 0 : Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI;
      const bounce = (index === 0 ? frame.pulse : coach.attack)*58;
      const scale = index === 0 ? 1 : coach.length;
      car.setAttribute('transform','translate(' + at.x + ' ' + (at.y-bounce) + ') rotate(' + angle + ') scale(' + scale + ' 1)');
      car.setAttribute('data-voice',String(index === 0 ? geometry.voices[0] : coach.note.voice));
      car.setAttribute('data-midi',index === 0 ? '' : String(coach.note.midi));
      car.querySelector('rect')?.setAttribute('fill',index === 0 ? '#ad4938' : railwayLaneColor(lane));
      car.querySelectorAll('.train-wheel').forEach(wheel => wheel.setAttribute('transform','rotate(' + (frame.wheelAngle*180/Math.PI) + ')'));
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
    built = undefined; cache.clear();
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
      cars = Array.from({length:17}, (_,index) => {
        const car = element('g');
        car.append(element('rect', { x: -35, y: -17, width: 38, height: 26, rx: 7, fill: index === 0 ? '#ad4938' : '#a9cfca', stroke: '#284d47', 'stroke-width': 2 }));
        car.append(element('rect', { x: -37, y: -20, width: 41, height: 6, rx: 3, fill: '#284d47' }));
        for (const x of [-29, -14]) car.append(element('rect', { x, y: -11, width: 10, height: 10, rx: 2, fill: '#f5f3eb' }));
        for (const x of [-27,-6]) {
          car.append(element('circle', {cx:x,cy:11,r:5,fill:'#284d47'}));
          const hub = element('g', {transform:'translate(' + x + ' 11)'}), wheel = element('g',{class:'train-wheel'});
          wheel.append(element('path',{d:'M-3 0H3M0-3V3',stroke:'#f5f3eb','stroke-width':1})); hub.append(wheel); car.append(hub);
        }
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
