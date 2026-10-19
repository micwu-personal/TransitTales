export type LineId = 'coral' | 'blue';
export interface Station { id: string; name: string; x: number; y: number; icon: string }
export interface Line { id: LineId; name: string; color: string; stops: string[] }
export type MapId = 'little-bay' | 'lantern-isles';
export interface Network { stations: Station[]; lines: Line[]; segmentSeconds: number; mapId?: MapId }
export const NETWORK: Network = {
  mapId: 'little-bay', segmentSeconds: 12,
  stations: [
    { id: 'harbor', name: 'Harbor', x: 95, y: 245, icon: '⚓' },
    { id: 'market', name: 'Market', x: 245, y: 245, icon: '♧' },
    { id: 'central', name: 'Central', x: 415, y: 245, icon: '⇄' },
    { id: 'museum', name: 'Museum', x: 585, y: 245, icon: '▥' },
    { id: 'garden', name: 'Garden', x: 755, y: 245, icon: '✿' },
    { id: 'north', name: 'North Park', x: 415, y: 60, icon: '♣' },
    { id: 'library', name: 'Library', x: 415, y: 150, icon: '▤' },
    { id: 'stadium', name: 'Stadium', x: 415, y: 355, icon: '♫' },
    { id: 'riverside', name: 'Riverside', x: 585, y: 455, icon: '≈' },
    { id: 'airport', name: 'Airport', x: 755, y: 455, icon: '✈' },
  ],
  lines: [
    { id: 'coral', name: 'C · Coral line', color: '#b94432', stops: ['harbor', 'market', 'central', 'museum', 'garden'] },
    { id: 'blue', name: 'B · Blue line', color: '#286cb1', stops: ['north', 'library', 'central', 'stadium', 'riverside', 'airport'] },
  ],
};
export interface ShiftEvent { at: number; station: string; count: number; message: string; effect?: 'helpers' | 'spare' }
export interface Scenario { id: string; mapId?: MapId; name: string; subtitle: string; briefing: string; duration: number; target: number; demand: number; seed: number; hot: string; events: ShiftEvent[] }
// The sister district uses the same named services: captions, recordings and platform picking never need aliases.
export const ISLAND_NETWORK: Network = { mapId: 'lantern-isles', segmentSeconds: 11,
  stations: NETWORK.stations.map(station => ({ ...station })), lines: NETWORK.lines.map(line => ({ ...line, stops: [...line.stops] })) };
export const SCENARIOS: Scenario[] = [
  { id: 'first-shift', name: 'First shift', subtitle: 'Learn the ropes', briefing: 'Market is busy! Select it and send a spare train. Get 220 people home before your shift ends.', duration: 180, target: 220, demand: 0.23, seed: 71, hot: 'market', events: [ { at: 40, station: 'garden', count: 25, message: 'Picnic finished! Garden has a fresh crowd.' }, { at: 100, station: 'north', count: 30, message: 'School is out at North Park. A spare train would help!' } ] },
  { id: 'concert', name: 'The big encore', subtitle: 'Rescue the concert crowd', briefing: 'The concert is about to finish. Keep an eye on Stadium and send relief trains before the queue grows.', duration: 195, target: 310, demand: 0.31, seed: 123, hot: 'stadium', events: [ { at: 20, station: 'stadium', count: 50, message: 'Encore over! 50 music lovers arrive at Stadium.' }, { at: 75, station: 'stadium', count: 40, message: 'Another concert wave! Let’s get everyone home.' }, { at: 130, station: 'central', count: 25, message: 'Central is busy with late connections.' } ] },
  { id: 'connections', name: 'Meet me at Central', subtitle: 'Two lines, one little city', briefing: 'Many riders need to change lines. Send spare trains to busy platforms and briefly hold a train at Central to catch arriving riders.', duration: 210, target: 390, demand: 0.36, seed: 451, hot: 'central', events: [ { at: 30, station: 'airport', count: 40, message: 'A flight has landed. Airport riders need both lines.' }, { at: 90, station: 'harbor', count: 35, message: 'Ferry arrivals at Harbor! Watch their connections.' }, { at: 150, station: 'central', count: 35, message: 'One last rush at Central. You’ve got this!' } ] },
  { id: 'kite-day', name: 'Kites over the bay', subtitle: 'A breezy park adventure', briefing: 'Follow the kite festival from North Park to Garden. Send relief before the crowds arrive; festival volunteers help at Garden for 22 seconds.', duration: 200, target: 325, demand: 0.29, seed: 809, hot: 'north', events: [
    { at: 25, station: 'north', count: 38, message: 'Kite prizes awarded! North Park welcomes 38 happy flyers.' },
    { at: 70, station: 'garden', count: 42, effect: 'helpers', message: 'Garden kite workshop ends! Volunteers double boarding for 22 seconds.' },
    { at: 125, station: 'library', count: 30, message: 'Windy-day story time ends at Library. Time for a cosy ride home!' } ] },
  { id: 'ferry-fair', name: 'The floating fair', subtitle: 'A final coastal challenge', briefing: 'Ferries, food stalls and a museum sleepover all finish in waves. An extra spare arrives with the fair crew. Keep both lines connected at Central.', duration: 225, target: 410, demand: 0.35, seed: 1207, hot: 'harbor', events: [
    { at: 20, station: 'harbor', count: 42, effect: 'spare', message: 'The floating fair docks! 42 riders and one extra spare arrive at Harbor.' },
    { at: 65, station: 'market', count: 36, message: 'The last pancake is sold! Market stallholders are heading home.' },
    { at: 120, station: 'museum', count: 38, message: 'Museum sleepover checkout! The little explorers need both lines.' },
    { at: 165, station: 'central', count: 28, message: 'The fair’s final connections arrive at Central. Keep those doors open!' } ] },
  { id: 'island-welcome', mapId: 'lantern-isles', name: 'Welcome to Lantern Isles', subtitle: 'Lighthouse, bridges and little trains', briefing: 'Explore Little Bay’s island district. Start at the lighthouse pier at Harbor, then meet the night-market crowd. Familiar station names, a new adventure!', duration: 180, target: 250, demand: 0.24, seed: 2473, hot: 'market', events: [
    { at: 35, station: 'harbor', count: 30, message: 'Lighthouse tour finished! 30 visitors arrive at Harbor.' },
    { at: 90, station: 'market', count: 36, effect: 'helpers', message: 'Night-market tasting ends. Friendly stallholders help board twice as fast for 22 seconds!' } ] },
  { id: 'lantern-parade', mapId: 'lantern-isles', name: 'The lantern parade', subtitle: 'Follow the glow', briefing: 'The lantern parade travels from Market through Central to Riverside. Read the next-event forecast and send relief ahead of each wave.', duration: 200, target: 340, demand: 0.30, seed: 2239, hot: 'central', events: [
    { at: 20, station: 'market', count: 42, message: 'The first lanterns set off! Market has 42 riders ready to go.' },
    { at: 65, station: 'central', count: 35, effect: 'helpers', message: 'The clockwork plaza glows. Parade helpers double Central boarding for 22 seconds.' },
    { at: 125, station: 'riverside', count: 45, message: 'Floating lanterns launched! Riverside spectators need a ride home.' } ] },
  { id: 'star-party', mapId: 'lantern-isles', name: 'A pocketful of stars', subtitle: 'Observatory open night', briefing: 'Museum’s observatory and Library’s sky stories close in waves. Plan the transfers at Central; the astronomy club brings an extra spare train.', duration: 210, target: 355, demand: 0.31, seed: 2343, hot: 'museum', events: [
    { at: 30, station: 'museum', count: 45, effect: 'spare', message: 'A shooting star! The observatory tour ends and the club lends one extra spare.' },
    { at: 85, station: 'library', count: 38, message: 'Sky stories are over at Library. The young astronomers are coming home.' },
    { at: 140, station: 'garden', count: 32, message: 'The glowing glasshouse closes at Garden. Catch the last connections!' } ] },
  { id: 'regatta', mapId: 'lantern-isles', name: 'The paper-boat regatta', subtitle: 'Tiny boats, a big crowd', briefing: 'Paper boats race along Riverside, while Stadium hosts the puppet finals. Divide your spare trains between the two celebrations.', duration: 215, target: 385, demand: 0.34, seed: 2371, hot: 'riverside', events: [
    { at: 25, station: 'riverside', count: 48, message: 'The paper-boat winner crosses the line! 48 spectators arrive at Riverside.' },
    { at: 75, station: 'stadium', count: 42, effect: 'helpers', message: 'Puppet finals finished! The theatre crew doubles Stadium boarding for 22 seconds.' },
    { at: 135, station: 'harbor', count: 38, message: 'The little sailboats return to the lighthouse pier. Harbor is busy again!' } ] },
  { id: 'balloon-finale', mapId: 'lantern-isles', name: 'Balloons at sundown', subtitle: 'The island festival finale', briefing: 'Balloons land at Airport, a picnic wraps up at North Park and the whole island connects at Central. Chase your best score in the grand finale!', duration: 230, target: 440, demand: 0.37, seed: 2498, hot: 'airport', events: [
    { at: 20, station: 'airport', count: 46, effect: 'spare', message: 'The balloons touch down! 46 visitors and one extra spare arrive at Airport.' },
    { at: 70, station: 'north', count: 42, message: 'Cloud-garden picnic ends! North Park’s visitors need the Blue line.' },
    { at: 125, station: 'garden', count: 38, effect: 'helpers', message: 'The glasshouse farewell begins. Garden volunteers double boarding for 22 seconds.' },
    { at: 175, station: 'central', count: 32, message: 'One last lantern-lit connection at Central. Bring everyone home!' } ] },
];
export const MAPS = [
  { id: 'little-bay' as const, network: NETWORK, scenarios: SCENARIOS.filter(s => !s.mapId) },
  { id: 'lantern-isles' as const, network: ISLAND_NETWORK, scenarios: SCENARIOS.filter(s => s.mapId === 'lantern-isles') },
];
export const mapFor = (id: MapId) => MAPS.find(map => map.id === id)!;
export const nextScenario = (scenario: Scenario) => SCENARIOS[(SCENARIOS.indexOf(scenario) + 1) % SCENARIOS.length];
export interface Passenger { id: number; destination: string; born: number; waited: number; changed: boolean }
export interface Train { id: number; line: LineId; index: number; direction: 1 | -1; progress: number; dwell: number; moving: boolean; riders: Passenger[]; spare: boolean; held: boolean }
export type Notice = { kind: 'briefing'; scenario: string } | { kind: 'event'; scenario: string; index: number } | { kind: 'dispatch'; station: string } | { kind: 'helpers' | 'hold' | 'spare' | 'finished' };
export interface Game { network: Network; scenario: Scenario; time: number; phase: 'ready' | 'playing' | 'finished'; queues: Record<string, Passenger[]>; trains: Train[]; delivered: number; transfers: number; left: number; spawned: number; totalWait: number; spares: number; nextSpare: number; holdCooldown: number; crewCooldown: number; crewUntil: Record<string, number>; eventIndex: number; rng: number; nextPassenger: number; nextTrain: number; notices: Notice[]; actionCount: number }
export const CAPACITY = 24;
export const lineFor = (g: Game, id: LineId) => g.network.lines.find(l => l.id === id)!;
export function nextHop(network: Network, from: string, destination: string): string | null {
  if (from === destination) return null;
  const todo: string[][] = [[from]]; const visited = new Set([from]);
  while (todo.length) {
    const path = todo.shift()!; const here = path[path.length - 1];
    for (const line of network.lines) {
      const i = line.stops.indexOf(here); if (i < 0) continue;
      for (const j of [i - 1, i + 1]) {
        const next = line.stops[j]; if (!next || visited.has(next)) continue;
        if (next === destination) return path[1] ?? next;
        visited.add(next); todo.push([...path, next]);
      }
    }
  }
  return null;
}
function random(g: Game) { g.rng = (Math.imul(g.rng, 1664525) + 1013904223) >>> 0; return g.rng / 4294967296; }
export function addCrowd(g: Game, station: string, count: number) {
  const destinations = g.network.stations.filter(s => s.id !== station);
  for (let i = 0; i < count; i++) {
    const destination = destinations[Math.floor(random(g) * destinations.length)].id;
    if (!nextHop(g.network, station, destination)) continue;
    g.queues[station].push({ id: g.nextPassenger++, destination, born: g.time, waited: 0, changed: false }); g.spawned++;
  }
}
export function createGame(scenario: Scenario = SCENARIOS[0], network: Network = scenario.mapId === 'lantern-isles' ? ISLAND_NETWORK : NETWORK): Game {
  const g: Game = { network, scenario, time: 0, phase: 'ready', queues: Object.fromEntries(network.stations.map(s => [s.id, []])), trains: [], delivered: 0, transfers: 0, left: 0, spawned: 0, totalWait: 0, spares: 2, nextSpare: 28, holdCooldown: 0, crewCooldown: 0, crewUntil: {}, eventIndex: 0, rng: scenario.seed, nextPassenger: 1, nextTrain: 1, notices: [{ kind: 'briefing', scenario: scenario.id }], actionCount: 0 };
  for (const l of network.lines) for (const [index, direction] of [[0, 1], [l.stops.length - 1, -1]] as const) g.trains.push({ id: g.nextTrain++, line: l.id, index, direction, progress: 0, dwell: 3, moving: false, riders: [], spare: false, held: false });
  for (const s of network.stations) addCrowd(g, s.id, s.id === scenario.hot ? 32 : 4);
  return g;
}
function notice(g: Game, message: Notice) { g.notices.push(message); if (g.notices.length > 5) g.notices.shift(); }
export function preferredDirection(g: Game, station: string, line: LineId): 1 | -1 {
  const l = lineFor(g, line); const i = l.stops.indexOf(station);
  if (i <= 0) return 1; if (i >= l.stops.length - 1) return -1;
  const votes = g.queues[station].reduce((n, p) => n + (nextHop(g.network, station, p.destination) === l.stops[i + 1] ? 1 : nextHop(g.network, station, p.destination) === l.stops[i - 1] ? -1 : 0), 0);
  return votes >= 0 ? 1 : -1;
}
export function canDispatch(g: Game, station: string, line: LineId): boolean {
  const l = lineFor(g, line); const index = l.stops.indexOf(station);
  return g.phase === 'playing' && g.spares > 0 && index >= 0 && !g.trains.some(t => t.line === line && !t.moving && t.index === index);
}
export function dispatch(g: Game, station: string, line: LineId): boolean {
  if (!canDispatch(g, station, line)) return false;
  const l = lineFor(g, line); const direction = preferredDirection(g, station, line);
  g.trains.push({ id: g.nextTrain++, line, index: l.stops.indexOf(station), direction, progress: 0, dwell: 3, moving: false, riders: [], spare: true, held: false });
  g.spares--; g.actionCount++; notice(g, { kind: 'dispatch', station }); return true;
}
export function sendCrew(g: Game, station: string): boolean {
  if (g.phase !== 'playing' || g.crewCooldown > 0 || !g.queues[station]) return false;
  g.crewUntil[station] = g.time + 22; g.crewCooldown = 30; g.actionCount++; notice(g, { kind: 'helpers' }); return true;
}
export function holdConnection(g: Game, trainId: number): boolean {
  const t = g.trains.find(t => t.id === trainId);
  if (g.phase !== 'playing' || !t || t.moving || lineFor(g, t.line).stops[t.index] !== 'central' || t.held || g.holdCooldown > 0) return false;
  t.dwell += 6; t.held = true; g.holdCooldown = 18; g.actionCount++; notice(g, { kind: 'hold' }); return true;
}
function board(g: Game, t: Train) {
  const l = lineFor(g, t.line); const station = l.stops[t.index]; const next = l.stops[t.index + t.direction];
  const rate = (g.crewUntil[station] ?? 0) > g.time ? 12 : 6;
  let boarded = 0;
  g.queues[station] = g.queues[station].filter(p => {
    if (boarded >= rate || t.riders.length >= CAPACITY || nextHop(g.network, station, p.destination) !== next) return true;
    t.riders.push(p); boarded++; return false;
  });
}
function arrive(g: Game, t: Train) {
  const l = lineFor(g, t.line); const station = l.stops[t.index];
  if (t.index === 0) t.direction = 1; if (t.index === l.stops.length - 1) t.direction = -1;
  t.riders = t.riders.filter(p => {
    if (p.destination === station) { g.delivered++; g.totalWait += p.waited; return false; }
    if (nextHop(g.network, station, p.destination) !== l.stops[t.index + t.direction]) { if (!p.changed) { g.transfers++; p.changed = true; } g.queues[station].push(p); return false; }
    return true;
  });
  t.moving = false; t.progress = 0; t.dwell = 4; t.held = false;
}
// Fixed one-second steps keep results independent of rendering speed.
export function step(g: Game): void {
  if (g.phase !== 'playing') return;
  g.time++; g.holdCooldown = Math.max(0, g.holdCooldown - 1); g.crewCooldown = Math.max(0, g.crewCooldown - 1);
  if (g.time >= g.nextSpare) { g.spares = Math.min(3, g.spares + 1); g.nextSpare += 28; notice(g, { kind: 'spare' }); }
  while (g.eventIndex < g.scenario.events.length && g.scenario.events[g.eventIndex].at <= g.time) {
    const e = g.scenario.events[g.eventIndex++]; addCrowd(g, e.station, e.count);
    if (e.effect === 'helpers') g.crewUntil[e.station] = Math.max(g.crewUntil[e.station] ?? 0, g.time + 22);
    if (e.effect === 'spare') g.spares = Math.min(3, g.spares + 1);
    notice(g, { kind: 'event', scenario: g.scenario.id, index: g.eventIndex - 1 });
  }
  for (const s of g.network.stations) {
    if (random(g) < g.scenario.demand) addCrowd(g, s.id, 1);
    g.queues[s.id] = g.queues[s.id].filter(p => { p.waited++; if (p.waited <= 100) return true; g.left++; return false; });
  }
  for (const t of g.trains) {
    if (t.moving) {
      const l = lineFor(g, t.line); const nextIndex = t.index + t.direction;
      t.progress = Math.min(1, t.progress + 1 / g.network.segmentSeconds);
      if (t.progress >= 1 - 1e-8 && !g.trains.some(other => other !== t && other.line === t.line && !other.moving && other.index === nextIndex)) { t.index = nextIndex; arrive(g, t); }
    } else {
      board(g, t); t.dwell = Math.max(0, t.dwell - 1);
      if (t.dwell === 0 && !g.trains.some(other => other !== t && other.line === t.line && other.moving && other.index === t.index && other.direction === t.direction)) t.moving = true;
    }
  }
  if (g.time >= g.scenario.duration) { g.phase = 'finished'; notice(g, { kind: 'finished' }); }
}
export function stats(g: Game) {
  const waiting = Object.values(g.queues).reduce((n, q) => n + q.length, 0);
  const aboard = g.trains.reduce((n, t) => n + t.riders.length, 0);
  const averageWait = g.delivered ? Math.round(g.totalWait / g.delivered) : 0;
  const stars = g.delivered >= g.scenario.target * 1.3 ? 3 : g.delivered >= g.scenario.target ? 2 : g.delivered >= g.scenario.target * 0.65 ? 1 : 0;
  return { waiting, aboard, averageWait, stars, score: Math.max(0, g.delivered * 10 + g.transfers * 2 - g.left * 4 - Math.round(g.totalWait / 10)) };
}
