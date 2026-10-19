import { nodeId, rideId, transferId, validateRoute, type Edge, type Graph, type Leg, type Request } from './model';

export interface RideDirection { id: string; stops: string[] }
export interface Alighting { station: string; index: number; value: string }

export function rideDirections(graph: Graph, lineId: string, origin: string): RideDirection[] {
  const line = graph.lines.get(lineId);
  if (!line || !line.stops.includes(origin)) return [];
  const pairs = line.connections ?? (line.directedEdges ?? line.stops.slice(1).map((to, i) => [line.stops[i], to] as [string, string])).map(([from, to]) => ({ from, to, bidirectional: !line.directed && !line.directedEdges }));
  const connections = [...pairs];
  if (line.loop && !line.connections && !line.directedEdges && line.stops.at(-1) !== line.stops[0]) connections.push({ from: line.stops.at(-1)!, to: line.stops[0], bidirectional: !line.directed });
  const topology = new Map<string, string[]>();
  for (const connection of connections) for (const [from, to] of connection.bidirectional ? [[connection.from, connection.to], [connection.to, connection.from]] : [[connection.from, connection.to]]) {
    const next = topology.get(from) ?? [];
    if (!next.includes(to)) next.push(to);
    topology.set(from, next);
  }
  return (topology.get(origin) ?? []).flatMap(first => {
    const id = rideId(lineId, origin, first);
    if (!graph.byId.has(id)) return [];
    const stops = [origin, first], used = new Set([id]);
    // Follow the service topology, not a shortest path. A closure ends this direction;
    // it must never silently reverse a train or switch to the other side of a ring.
    while (!(line.loop && stops.at(-1) === origin)) {
      const current = stops.at(-1)!, previous = stops.at(-2)!;
      const choices = (topology.get(current) ?? []).filter(next => next !== previous && !used.has(rideId(lineId, current, next)));
      const next = choices.find(stop => !stops.includes(stop)) ?? choices[0];
      if (!next || !graph.byId.has(rideId(lineId, current, next))) break;
      used.add(rideId(lineId, current, next)); stops.push(next);
    }
    return [{ id, stops }];
  });
}

export function alightingOptions(direction: RideDirection): Alighting[] {
  const seen = new Set<string>();
  return direction.stops.slice(1).map((station, i) => {
    const index = i + 1, value = seen.has(station) || station === direction.stops[0] ? `${station}::${index}` : station;
    seen.add(station);
    return { station, index, value };
  });
}

export function directionalLeg(graph: Graph, lineId: string, origin: string, directionId: string, endValue: string): Leg | null {
  const direction = rideDirections(graph, lineId, origin).find(choice => choice.id === directionId);
  const end = direction && alightingOptions(direction).find(choice => choice.value === endValue);
  return direction && end ? { lineId, stops: direction.stops.slice(0, end.index + 1) } : null;
}

export function planPosition(request: Request, draft: Leg[], startingLine?: string) {
  return { station: draft.at(-1)?.stops.at(-1) ?? request.origin, line: draft.at(-1)?.walkToLineId ?? draft.at(-1)?.lineId ?? startingLine };
}

export function boardingLines(graph: Graph, station: string, previousLine?: string): string[] {
  return (graph.at.get(station) ?? []).filter(line => !previousLine || line === previousLine || graph.byId.has(transferId(station, previousLine, line)));
}

export function walkingOptions(graph: Graph, station: string, lineId: string): Edge[] {
  return (graph.edges.get(nodeId(station, lineId)) ?? []).filter(edge => edge.kind === 'walk');
}

export function plannedRemainder(graph: Graph, request: Request, draft: Leg[], startingLine?: string): Request {
  const validation = validateRoute(graph, draft, request, startingLine);
  let index = 0;
  for (const station of validation.visited) while (station === request.via[index]) index++;
  return { origin: validation.visited.at(-1)!, destination: request.destination, via: request.via.slice(index) };
}

// Reachability gives an honest dead-end warning without computing or revealing an answer.
export function canFinish(graph: Graph, request: Request, startingLine?: string): boolean {
  if (!graph.stations.has(request.origin) || !graph.stations.has(request.destination) || request.via.some(id => !graph.stations.has(id))) return false;
  if (request.origin === request.destination && request.via.every(id => id === request.origin)) return true;
  const advance = (station: string, index: number) => { while (request.via[index] === station) index++; return index; };
  const queue = (graph.at.get(request.origin) ?? []).filter(line => !startingLine || line === startingLine).map(line => ({ node: nodeId(request.origin, line), index: advance(request.origin, 0) }));
  const seen = new Set(queue.map(state => JSON.stringify(state)));
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i];
    if (JSON.parse(state.node)[0] === request.destination && state.index === request.via.length) return true;
    for (const edge of graph.edges.get(state.node) ?? []) {
      const next = { node: edge.to, index: advance(edge.toStation, state.index) }, key = JSON.stringify(next);
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  return false;
}
