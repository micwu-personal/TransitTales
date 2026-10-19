export interface Station { id: string; name: string; english: string; x: number; y: number }
export interface Line { id: string; name: string; english: string; color: string; stops: string[]; loop: boolean; serviceGroup?: string; serviceId?: string; connections?: { from: string; to: string; bidirectional: boolean }[]; directed?: boolean; directedEdges?: [string, string][] }
export interface Network { stations: Station[]; lines: Line[]; externalTransfers?: { from: string; to: string; minutes: number; meters: number }[]; provenance: { snapshotDate: string; scope: string; sources: { name: string; url: string }[]; notes: string[] } }
export interface Conditions { rush?: boolean; stepFree?: boolean; blockedEdges?: string[]; inaccessibleTransfers?: string[] }
export interface Request { origin: string; destination: string; via: string[] }
export interface Leg { lineId: string; stops: string[]; walkToLineId?: string }
export interface Edge { id: string; from: string; to: string; fromStation: string; toStation: string; lineId: string; toLineId: string; kind: 'ride' | 'transfer' | 'walk'; serviceChange?: boolean; minutes: number; walk: number; crowd: number }
export interface Graph { network: Network; stations: Map<string, Station>; lines: Map<string, Line>; at: Map<string, string[]>; edges: Map<string, Edge[]>; byId: Map<string, Edge> }
export interface Metrics { minutes: number; transfers: number; walk: number; crowd: number; score: number; timePenalty: number; transferPenalty: number; walkPenalty: number; crowdPenalty: number }
export interface Validation { ok: boolean; error?: 'empty' | 'unknown' | 'disconnected' | 'blocked' | 'access' | 'origin' | 'via' | 'destination'; edges: Edge[]; visited: string[]; metrics: Metrics }
export type Preference = 'balanced' | 'fast' | 'changes' | 'quiet';
export interface Candidate { preference: Preference; legs: Leg[]; metrics: Metrics }
const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
export const nodeId = (station: string, line: string) => JSON.stringify([station, line]);
export const rideId = (line: string, from: string, to: string) => `ride:${JSON.stringify([line, from, to])}`;
export const transferId = (station: string, from: string, to: string) => `transfer:${JSON.stringify([station, from, to])}`;
export function scoreMetrics(values: Pick<Metrics, 'minutes' | 'transfers' | 'walk' | 'crowd'>): Metrics {
  const timePenalty = Math.round(values.minutes * 3), transferPenalty = values.transfers * 40;
  const walkPenalty = Math.round(values.walk / 12), crowdPenalty = Math.round(values.crowd * 10);
  return { ...values, timePenalty, transferPenalty, walkPenalty, crowdPenalty, score: Math.max(0, 1000 - timePenalty - transferPenalty - walkPenalty - crowdPenalty) };
}
export const walkId = (from: string, to: string, fromLine: string, toLine: string) => `walk:${JSON.stringify([from, to, fromLine, toLine])}`;
export const isChange = (edge: Edge) => edge.kind === 'walk' || edge.kind === 'transfer' && edge.serviceChange !== false;
export function metricsFor(edges: Edge[]): Metrics {
  const values = edges.reduce((sum, edge) => ({ minutes: sum.minutes + edge.minutes, transfers: sum.transfers + Number(isChange(edge)), walk: sum.walk + edge.walk, crowd: sum.crowd + edge.crowd }), { minutes: 0, transfers: 0, walk: 0, crowd: 0 });
  values.minutes = segmentsFor(edges).reduce((sum, segment) => sum + segment.seconds, 0) / 60;
  return scoreMetrics(values);
}
export function buildGraph(network: Network, conditions: Conditions = {}): Graph {
  const stations = new Map(network.stations.map(station => [station.id, station])), lines = new Map(network.lines.map(line => [line.id, line]));
  if (stations.size !== network.stations.length || lines.size !== network.lines.length) throw new Error('Duplicate network identity');
  const graph: Graph = { network, stations, lines, at: new Map(), edges: new Map(), byId: new Map() };
  for (const station of network.stations) if (!Number.isFinite(station.x) || !Number.isFinite(station.y) || station.x < 0 || station.x > 1000 || station.y < 0 || station.y > 1000) throw new Error('Invalid station coordinate');
  const add = (edge: Edge) => { if (conditions.blockedEdges?.includes(edge.id) || (conditions.stepFree && conditions.inaccessibleTransfers?.includes(edge.id))) return; graph.edges.get(edge.from)!.push(edge); graph.byId.set(edge.id, edge); };
  for (const line of network.lines) {
    if (line.stops.length < 2 || line.stops.some(id => !stations.has(id))) throw new Error('Invalid line stops');
    for (const station of new Set(line.stops)) { const at = graph.at.get(station) ?? []; at.push(line.id); graph.at.set(station, at); graph.edges.set(nodeId(station, line.id), []); }
  }
  for (const line of network.lines) {
    const pairs = line.connections ?? (line.directedEdges ?? line.stops.slice(1).map((to, i) => [line.stops[i], to] as [string, string])).map(([from, to]) => ({ from, to, bidirectional: !line.directed && !line.directedEdges }));
    if (line.loop && !line.connections && !line.directedEdges && line.stops.at(-1) !== line.stops[0]) pairs.push({ from: line.stops.at(-1)!, to: line.stops[0], bidirectional: !line.directed });
    for (const { from: a, to: b, bidirectional } of pairs) {
      if (!line.stops.includes(a) || !line.stops.includes(b)) throw new Error('Invalid line connection');
      for (const [from, to] of bidirectional ? [[a, b], [b, a]] : [[a, b]]) {
        const h = hash(`${line.id}:${[from, to].sort().join(':')}`), crowded = conditions.rush ? 1 + hash(line.id) % 4 : 0.25;
        add({ id: rideId(line.id, from, to), from: nodeId(from, line.id), to: nodeId(to, line.id), fromStation: from, toStation: to, lineId: line.id, toLineId: line.id, kind: 'ride', minutes: 2 + (h % 5) * 0.25 + crowded * 0.15, walk: 0, crowd: crowded });
      }
    }
  }
  for (const [station, at] of graph.at) for (const from of at) for (const to of at) if (from !== to) {
    const sameService = (lines.get(from)!.serviceGroup ?? lines.get(from)!.serviceId ?? from) === (lines.get(to)!.serviceGroup ?? lines.get(to)!.serviceId ?? to), h = hash(`${station}:${[from, to].sort().join(':')}`);
    add({ id: transferId(station, from, to), from: nodeId(station, from), to: nodeId(station, to), fromStation: station, toStation: station, lineId: from, toLineId: to, kind: 'transfer', serviceChange: !sameService, minutes: sameService ? 0 : 3 + h % 4 + (conditions.stepFree ? 2 : 0), walk: sameService ? 0 : 180 + h % 321, crowd: sameService ? 0 : conditions.rush ? 0.5 : 0 });
  }
  for (const connection of network.externalTransfers ?? []) {
    if (!graph.at.has(connection.from) || !graph.at.has(connection.to) || connection.from === connection.to || !Number.isFinite(connection.minutes) || connection.minutes <= 0 || !Number.isFinite(connection.meters) || connection.meters < 0) throw new Error('Invalid external transfer');
    for (const [from, to] of [[connection.from, connection.to], [connection.to, connection.from]]) for (const fromLine of graph.at.get(from)!) for (const toLine of graph.at.get(to)!) add({ id: walkId(from, to, fromLine, toLine), from: nodeId(from, fromLine), to: nodeId(to, toLine), fromStation: from, toStation: to, lineId: fromLine, toLineId: toLine, kind: 'walk', serviceChange: true, minutes: connection.minutes, walk: connection.meters, crowd: 0 });
  }
  return graph;
}
export function makeLeg(graph: Graph, lineId: string, from: string, to: string, reverse = false): Leg | null {
  if (from === to || !graph.lines.has(lineId)) return null;
  const queue: string[][] = [[from]], seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift()!, end = path.at(-1)!;
    const choices = (graph.edges.get(nodeId(end, lineId)) ?? []).filter(edge => edge.kind === 'ride');
    if (reverse) choices.reverse();
    for (const edge of choices) { if (seen.has(edge.toStation)) continue; const next = [...path, edge.toStation]; if (edge.toStation === to) return { lineId, stops: next }; seen.add(edge.toStation); queue.push(next); }
  }
  return null;
}
export function validateRoute(graph: Graph, legs: Leg[], request: Request, startingLine?: string): Validation {
  const edges: Edge[] = [], visited = [request.origin];
  const result = (error?: Validation['error']): Validation => ({ ok: !error, error, edges, visited, metrics: metricsFor(edges) });
  if (!graph.stations.has(request.origin) || !graph.stations.has(request.destination) || request.via.some(id => !graph.stations.has(id))) return result('unknown');
  if (!legs.length) return request.origin === request.destination && request.via.every(id => id === request.origin) ? result() : result('empty');
  if (legs[0].stops[0] !== request.origin) return result('origin');
  if (startingLine && !graph.edges.has(nodeId(request.origin, startingLine))) return result('unknown');
  let last = request.origin, lastLine = startingLine;
  for (const leg of legs) {
    if (!graph.lines.has(leg.lineId) || leg.stops.length < 1 || (leg.walkToLineId ? leg.stops.length !== 2 || !graph.lines.has(leg.walkToLineId) || !graph.edges.has(nodeId(leg.stops[0],leg.lineId)) || !graph.edges.has(nodeId(leg.stops[1],leg.walkToLineId)) : leg.stops.some(id => !graph.edges.has(nodeId(id, leg.lineId))))) return result('unknown');
    if (leg.stops[0] !== last) return result('disconnected');
    if (lastLine && lastLine !== leg.lineId) { const transfer = graph.byId.get(transferId(last, lastLine, leg.lineId)); if (!transfer) return result('access'); edges.push(transfer); }
    for (let i = 1; i < leg.stops.length; i++) {
      const edge = graph.byId.get(leg.walkToLineId ? walkId(leg.stops[0],leg.stops[1],leg.lineId,leg.walkToLineId) : rideId(leg.lineId, leg.stops[i - 1], leg.stops[i]));
      if (!edge) return result('blocked');
      edges.push(edge); visited.push(edge.toStation);
    }
    last = leg.stops.at(-1)!; lastLine = leg.walkToLineId ?? leg.lineId;
  }
  if (last !== request.destination) return result('destination');
  let viaIndex = 0;
  for (const station of visited) while (station === request.via[viaIndex]) viaIndex++;
  return viaIndex < request.via.length ? result('via') : result();
}
function edgeCost(edge: Edge, preference: Preference): number {
  return (edge.minutes + (edge.kind === 'ride' ? .25 : isChange(edge) ? .3 : 0)) * (preference === 'fast' ? 12 : 3) + edge.walk / (preference === 'changes' ? 30 : 12) + Number(isChange(edge)) * (preference === 'changes' ? 200 : 40) + edge.crowd * (preference === 'quiet' ? 60 : 10);
}
class Heap {
  private items: { key: string; cost: number }[] = [];
  push(item: { key: string; cost: number }) { let i = this.items.push(item) - 1; while (i) { const p = (i - 1) >> 1; if (this.items[p].cost <= item.cost) break; this.items[i] = this.items[p]; i = p; } this.items[i] = item; }
  pop() { const first = this.items[0], last = this.items.pop(); if (!last || !this.items.length) return first; let i = 0; while (i * 2 + 1 < this.items.length) { let child = i * 2 + 1; if (child + 1 < this.items.length && this.items[child + 1].cost < this.items[child].cost) child++; if (this.items[child].cost >= last.cost) break; this.items[i] = this.items[child]; i = child; } this.items[i] = last; return first; }
  get size() { return this.items.length; }
}
function shortestPath(graph: Graph, request: Request, preference: Preference, suppressed = new Set<string>(), startingLine?: string): Edge[] | null {
  const advance = (station: string, index: number) => { while (request.via[index] === station) index++; return index; };
  const keyFor = (node: string, via: number) => JSON.stringify([node, via]);
  const distance = new Map<string, number>(), previous = new Map<string, { key: string; edge: Edge }>(), states = new Map<string, { node: string; via: number }>(), heap = new Heap();
  const atOrigin = graph.at.get(request.origin) ?? [];
  for (const line of startingLine ? atOrigin.filter(id => id === startingLine) : atOrigin) { const node = nodeId(request.origin, line), via = advance(request.origin, 0), key = keyFor(node, via); distance.set(key, 0); states.set(key, { node, via }); heap.push({ key, cost: 0 }); }
  if (request.origin === request.destination && request.via.every(id => id === request.origin)) return [];
  while (heap.size) {
    const current = heap.pop()!; if (current.cost !== distance.get(current.key)) continue;
    const state = states.get(current.key)!;
    if (JSON.parse(state.node)[0] === request.destination && state.via === request.via.length) { const route: Edge[] = []; let key = current.key; while (previous.has(key)) { const prev = previous.get(key)!; route.unshift(prev.edge); key = prev.key; } return route; }
    for (const edge of graph.edges.get(state.node) ?? []) {
      if (suppressed.has(edge.id)) continue;
      const via = advance(edge.toStation, state.via), key = keyFor(edge.to, via), cost = current.cost + edgeCost(edge, preference);
      if (cost >= (distance.get(key) ?? Infinity)) continue;
      distance.set(key, cost); states.set(key, { node: edge.to, via }); previous.set(key, { key: current.key, edge }); heap.push({ key, cost });
    }
  }
  return null;
}
export function legsFor(edges: Edge[]): Leg[] {
  const legs: Leg[] = [];
  for (const edge of edges) {
    if (edge.kind === 'walk') { legs.push({ lineId: edge.lineId, stops: [edge.fromStation,edge.toStation], walkToLineId: edge.toLineId }); continue; }
    let last = legs.at(-1);
    if (!last || last.walkToLineId || last.lineId !== edge.lineId || last.stops.at(-1) !== edge.fromStation) { last = { lineId: edge.lineId, stops: [edge.fromStation] }; legs.push(last); }
    if (edge.kind === 'ride') last.stops.push(edge.toStation);
    else legs.push({ lineId: edge.toLineId, stops: [edge.toStation] });
  }
  return legs;
}
export function findCandidates(graph: Graph, request: Request, startingLine?: string): Candidate[] {
  const candidates: Candidate[] = [], seen = new Set<string>();
  const add = (preference: Preference, suppressed?: Set<string>) => { const edges = shortestPath(graph, request, preference, suppressed, startingLine); if (!edges) return; const legs = legsFor(edges), key = JSON.stringify(legs); if (!seen.has(key)) { seen.add(key); candidates.push({ preference, legs, metrics: metricsFor(edges) }); } };
  for (const preference of ['balanced', 'fast', 'changes', 'quiet'] as const) add(preference);
  const best = candidates[0];
  if (best && candidates.length < 4) { const base = validateRoute(graph, best.legs, request).edges.filter(edge => edge.kind === 'ride'); for (const edge of base.filter((_, i) => i % Math.max(1, Math.floor(base.length / 8)) === 0).slice(0, 8)) { add('balanced', new Set([edge.id])); if (candidates.length >= 4) break; } }
  return candidates.slice(0, 4);
}
export type RoundId = 'welcome' | 'rush' | 'errand' | 'family' | 'toilet' | 'disruption' | 'sandbox';
export interface Round { id: RoundId; request: Request; conditions: Conditions; event?: 'access' | 'toilet' | 'disruption' }
export function createRounds(network: Network): Round[] {
  const find = (name: string, fallback: number) => network.stations.find(station => station.name === name)?.id ?? network.stations[fallback % network.stations.length].id;
  const request = (a: string, b: string, via: string[] = []): Request => ({ origin: find(a, 0), destination: find(b, network.stations.length - 1), via: via.map(name => find(name, 2)) });
  const graph = buildGraph(network), family = request('海淀黄庄', '北京站');
  const familyRoute = findCandidates(graph, family)[0];
  const inaccessibleTransfers = familyRoute ? validateRoute(graph, familyRoute.legs, family).edges.filter(isChange).slice(0, 1).flatMap(edge => [edge.id, transferId(edge.fromStation, edge.toLineId, edge.lineId)]) : [];
  return [
    { id: 'welcome', request: request('天安门东', '北京南站'), conditions: {} },
    { id: 'rush', request: request('西直门', '国贸'), conditions: { rush: true } },
    { id: 'errand', request: request('北京站', '奥林匹克公园', ['南锣鼓巷']), conditions: {} },
    { id: 'family', request: family, conditions: { stepFree: true, inaccessibleTransfers }, event: 'access' },
    { id: 'toilet', request: request('东直门', '国家图书馆'), conditions: {}, event: 'toilet' },
    { id: 'disruption', request: request('北京南站', '三元桥'), conditions: { rush: true }, event: 'disruption' },
    { id: 'sandbox', request: request('西单', '东直门'), conditions: {} },
  ];
}
export interface Segment { kind: 'board' | 'ride' | 'transfer' | 'walk' | 'stop'; station: string; nextStation: string; lineId: string; nextLineId: string; seconds: number; edge?: Edge }
export interface Interruption { kind: 'access' | 'toilet' | 'disruption'; station: string; blockedEdge?: string }
export interface Journey { round: Round; route: Leg[]; request: Request; segments: Segment[]; index: number; elapsed: number; totalSeconds: number; currentStation: string; currentLine?: string; completed: Edge[]; visited: string[]; extraMinutes: number; extraWalk: number; status: 'running' | 'paused' | 'interrupted' | 'complete'; interruption?: Interruption; eventDone: boolean; toiletTarget?: string; toiletSolved: boolean }
export function segmentsFor(edges: Edge[]): Segment[] {
  const segments: Segment[] = []; let boarding = true;
  edges.forEach(edge => { if (edge.kind === 'ride' && boarding) { segments.push({ kind: 'board', station: edge.fromStation, nextStation: edge.fromStation, lineId: edge.lineId, nextLineId: edge.lineId, seconds: 18 }); boarding = false; } segments.push({ kind: edge.kind, station: edge.fromStation, nextStation: edge.toStation, lineId: edge.lineId, nextLineId: edge.toLineId, seconds: edge.minutes * 60, edge }); if (edge.kind === 'ride') segments.push({ kind: 'stop', station: edge.toStation, nextStation: edge.toStation, lineId: edge.lineId, nextLineId: edge.lineId, seconds: 15 }); if (isChange(edge)) boarding = true; });
  return segments;
}
export function startJourney(graph: Graph, round: Round, route: Leg[]): Journey | null {
  const validation = validateRoute(graph, route, round.request); if (!validation.ok) return null;
  const immediate = !validation.edges.length && (round.event === 'toilet' || round.event === 'access');
  return { round: structuredClone(round), route: structuredClone(route), request: structuredClone(round.request), segments: segmentsFor(validation.edges), index: 0, elapsed: 0, totalSeconds: 0, currentStation: round.request.origin, completed: [], visited: [round.request.origin], extraMinutes: 0, extraWalk: 0, status: validation.edges.length ? 'running' : immediate ? 'interrupted' : 'complete', interruption: immediate ? { kind: round.event as 'toilet' | 'access', station: round.request.origin } : undefined, eventDone: immediate, toiletSolved: round.event !== 'toilet' };
}
export function tickJourney(journey: Journey, seconds: number): void {
  if (journey.status !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return;
  let remaining = seconds;
  while (remaining > 0 && journey.status === 'running') {
    const segment = journey.segments[journey.index];
    if (!segment) { journey.status = 'complete'; break; }
    const used = Math.min(remaining, segment.seconds - journey.elapsed); journey.elapsed += used; journey.totalSeconds += used; remaining -= used;
    if (journey.elapsed < segment.seconds) break;
    journey.elapsed = 0; journey.index++; journey.currentStation = segment.nextStation; journey.currentLine = segment.nextLineId;
    if (segment.edge) { journey.completed.push(structuredClone(segment.edge)); if (segment.kind === 'ride' || segment.kind === 'walk') journey.visited.push(segment.nextStation); }
    const rides = journey.completed.filter(edge => edge.kind === 'ride').length;
    const next = journey.segments.slice(journey.index).find(item => item.kind === 'ride')?.edge;
    const eventDue = journey.round.event === 'disruption' ? Boolean(next) && rides >= Math.min(2, journey.segments.filter(item => item.kind === 'ride').length - 1) : rides >= 2 || !next;
    if ((segment.kind === 'ride' || segment.kind === 'walk') && !journey.eventDone && journey.round.event && eventDue) {
      journey.eventDone = true; journey.status = 'interrupted'; journey.interruption = { kind: journey.round.event, station: journey.currentStation, blockedEdge: journey.round.event === 'disruption' ? next?.id : undefined }; break;
    }
    if ((segment.kind === 'ride' || segment.kind === 'walk') && journey.toiletTarget === journey.currentStation && !journey.toiletSolved) { journey.status = 'interrupted'; journey.interruption = { kind: 'toilet', station: journey.currentStation }; break; }
    if (journey.index >= journey.segments.length) journey.status = journey.toiletSolved ? 'complete' : 'interrupted';
  }
}
export function journeyMetrics(journey: Journey): Metrics { const metrics = metricsFor(journey.completed); return scoreMetrics({ minutes: journey.totalSeconds / 60 + journey.extraMinutes, transfers: metrics.transfers, walk: metrics.walk + journey.extraWalk, crowd: metrics.crowd }); }
export function remainingRequest(journey: Journey): Request {
  let index = 0; for (const station of journey.visited) while (station === journey.request.via[index]) index++;
  const via = journey.request.via.slice(index); if (journey.toiletTarget && !journey.toiletSolved && !via.includes(journey.toiletTarget)) via.unshift(journey.toiletTarget);
  return { origin: journey.currentStation, destination: journey.request.destination, via };
}
export function replanJourney(journey: Journey, graph: Graph, route: Leg[]): boolean {
  if (journey.status !== 'interrupted' || !journey.interruption || journey.elapsed !== 0) return false;
  const request = remainingRequest(journey), validation = validateRoute(graph, route, request, journey.currentLine); if (!validation.ok) return false;
  const edges = validation.edges;
  if (!edges.length && !journey.toiletSolved) return false;
  journey.route = structuredClone(route); journey.segments = segmentsFor(edges); journey.index = 0; journey.elapsed = 0; journey.interruption = undefined; journey.status = edges.length ? 'running' : (journey.toiletSolved ? 'complete' : 'interrupted'); return true;
}
export function resolveEvent(journey: Journey, choice: 'toilet' | 'lift' | 'wait' | 'replan', toiletTarget?: string): Conditions {
  const conditions = journey.round.conditions, kind = journey.interruption?.kind;
  if (journey.status !== 'interrupted' || !kind || (choice !== 'replan' && choice !== (kind === 'toilet' ? 'toilet' : kind === 'access' ? 'lift' : 'wait'))) return conditions;
  if (journey.interruption?.kind === 'toilet') { if (choice === 'toilet') { journey.extraMinutes += 7; journey.extraWalk += 120; journey.toiletSolved = true; journey.toiletTarget = undefined; } else if (choice === 'replan' && toiletTarget) journey.toiletTarget = toiletTarget; }
  if (journey.interruption?.kind === 'access' && choice === 'lift') { journey.extraMinutes += 4; journey.extraWalk += 40; }
  if (journey.interruption?.kind === 'disruption') {
    const blocked = journey.interruption.blockedEdge;
    if (choice === 'wait') { journey.extraMinutes += 15; }
    else if (blocked) conditions.blockedEdges = [...new Set([...(conditions.blockedEdges ?? []), blocked])];
  }
  if (choice !== 'replan') { journey.interruption = undefined; journey.status = 'running'; }
  return conditions;
}
