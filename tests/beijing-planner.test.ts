import { describe, expect, it } from 'vitest';
import { NETWORK } from '../src/beijing/network';
import { buildGraph, journeyMetrics, replanJourney, remainingRequest, resolveEvent, rideId, startJourney, tickJourney, transferId, validateRoute, walkId, type Graph, type Leg, type Network } from '../src/beijing/model';
import { alightingOptions, boardingLines, canFinish, directionalLeg, plannedRemainder, planPosition, rideDirections, walkingOptions } from '../src/beijing/planner';
import { fixture, roundFor, trip } from './beijing-fixture';

function leg(graph: Graph, line: string, origin: string, next: string, end: string): Leg {
  const direction = rideDirections(graph, line, origin).find(item => item.stops[1] === next)!;
  expect(direction).toBeDefined();
  const result = directionalLeg(graph, line, origin, direction.id, end);
  expect(result).not.toBeNull();
  return result!;
}

const ring: Network = { ...structuredClone(fixture), lines: [{ ...fixture.lines[0], stops: ['a', 'b', 'c', 'd'], loop: true }] };
const actual = buildGraph(NETWORK);
const station = (name: string) => NETWORK.stations.find(item => item.name === name)!.id;

describe('Player-selected direction determines every travelled edge', () => {
  it('constructs only valid directed ride paths for every stop on every shipped service', () => {
    for (const line of NETWORK.lines) for (const origin of line.stops) for (const direction of rideDirections(actual, line.id, origin)) {
      const end = alightingOptions(direction).at(-1)!;
      const draft = directionalLeg(actual, line.id, origin, direction.id, end.value)!;
      const validation = validateRoute(actual, [draft], trip(origin, end.station));
      expect(validation.ok, `${line.id}: ${direction.stops.join(' → ')}`).toBe(true);
      expect(validation.visited).toEqual(direction.stops);
    }
  });
  it('offers opposite linear directions, not every station on the line', () => {
    const graph = buildGraph(fixture), directions = rideDirections(graph, 'red', 'b');
    expect(directions.map(item => item.stops)).toEqual([['b', 'a'], ['b', 'c']]);
    expect(directionalLeg(graph, 'red', 'b', directions[0].id, 'c')).toBeNull();
    expect(leg(graph, 'red', 'b', 'a', 'a').stops).toEqual(['b', 'a']);
    expect(directionalLeg(graph, 'red', 'b', directions[0].id, '')).toBeNull();
    expect(rideDirections(graph, 'red', 'isolated')).toEqual([]);
  });
  it('keeps the chosen long ring direction and allows a genuine full loop via stop', () => {
    const graph = buildGraph(ring);
    const longer = leg(graph, 'red', 'a', 'b', 'd');
    expect(longer.stops).toEqual(['a', 'b', 'c', 'd']);
    expect(leg(graph, 'red', 'a', 'd', 'd').stops).toEqual(['a', 'd']);
    const loop = leg(graph, 'red', 'a', 'b', 'a::4');
    expect(loop.stops).toEqual(['a', 'b', 'c', 'd', 'a']);
    expect(validateRoute(graph, [loop], trip('a', 'a', ['c'])).ok).toBe(true);
    expect(validateRoute(graph, [], trip('a', 'a', ['c'])).ok).toBe(false);
    expect(validateRoute(graph, [], trip('a', 'a')).ok).toBe(true);
  });
  it('stops at a directed closure without reversing or taking the other ring side', () => {
    const graph = buildGraph(ring, { blockedEdges: [rideId('red', 'b', 'c')] });
    expect(rideDirections(graph, 'red', 'a').find(item => item.stops[1] === 'b')?.stops).toEqual(['a', 'b']);
    expect(rideDirections(graph, 'red', 'a').find(item => item.stops[1] === 'd')?.stops).toEqual(['a', 'd', 'c', 'b', 'a']);
    expect(directionalLeg(graph, 'red', 'a', rideId('red', 'a', 'b'), 'c')).toBeNull();
    const firstBlocked = buildGraph(ring, { blockedEdges: [rideId('red', 'a', 'b')] });
    expect(rideDirections(firstBlocked, 'red', 'a')).toHaveLength(1);
  });
  it('follows the real Airport T3 → T2 circuit and distinguishes repeated alighting visits', () => {
    const t3 = station('3号航站楼'), t2 = station('2号航站楼'), bridge = station('三元桥'), dong = station('东直门');
    expect(leg(actual, 'capital-airport', t3, t2, bridge).stops).toEqual([t3, t2, bridge]);
    expect(rideDirections(actual, 'capital-airport', t2)).toHaveLength(1);
    const direction = rideDirections(actual, 'capital-airport', dong).find(item => item.stops[1] === bridge)!;
    const visits = alightingOptions(direction).filter(item => item.station === bridge);
    expect(visits).toHaveLength(2); expect(visits[0].value).not.toBe(visits[1].value);
    const returning = directionalLeg(actual, 'capital-airport', dong, direction.id, visits[1].value)!;
    expect(returning.stops).toEqual([dong, bridge, t3, t2, bridge]);
    expect(validateRoute(actual, [returning], trip(dong, bridge, [t3, t2])).ok).toBe(true);
    expect(directionalLeg(actual, 'capital-airport', t2, rideId('capital-airport', t2, t3), t3)).toBeNull();
  });
});

describe('Origin-led transfers and ordered remaining requirements', () => {
  it('counts required stops passed on a ride, but never clears out-of-order requirements', () => {
    const graph = buildGraph(ring), draft = [leg(graph, 'red', 'a', 'b', 'd')];
    expect(plannedRemainder(graph, trip('a', 'd', ['b', 'c']), draft)).toEqual(trip('d', 'd'));
    expect(validateRoute(graph, draft, trip('a', 'd', ['c', 'b'])).error).toBe('via');
    expect(plannedRemainder(graph, trip('a', 'd', ['c', 'b']), draft).via).toEqual(['b']);
    expect(validateRoute(graph, [leg(graph, 'red', 'a', 'd', 'd')], trip('a', 'd', ['b'])).error).toBe('via');
    expect(planPosition(trip(), [], 'red')).toEqual({ station: 'a', line: 'red' });
  });
  it('permits explicit stationary paid-transfer chains but refuses a blocked direct change', () => {
    const network: Network = { ...structuredClone(fixture), lines: [{ ...fixture.lines[0], stops: ['a', 'b'] }, { ...fixture.lines[1], stops: ['b', 'e'] }, { ...fixture.lines[3], stops: ['b', 'c'] }] };
    const graph = buildGraph(network, { blockedEdges: [transferId('b', 'red', 'blue')] });
    expect(boardingLines(graph, 'b', 'red')).toEqual(['red', 'yellow']);
    const final = leg(graph, 'blue', 'b', 'e', 'e');
    expect(validateRoute(graph, [final], trip('b', 'e'), 'red').error).toBe('access');
    const draft = [{ lineId: 'yellow', stops: ['b'] }, final];
    const result = validateRoute(graph, draft, trip('b', 'e'), 'red');
    expect(result.ok).toBe(true); expect(result.metrics.transfers).toBe(2);
    expect(result.edges.slice(0, 2).map(edge => edge.id)).toEqual([transferId('b', 'red', 'yellow'), transferId('b', 'yellow', 'blue')]);
    expect(canFinish(graph, trip('b', 'e'), 'red')).toBe(true);
  });
  it('keeps external walks tied to source line and separate station identities', () => {
    const network: Network = { ...structuredClone(fixture), lines: [{ ...fixture.lines[0], stops: ['a', 'b'] }, { ...fixture.lines[1], stops: ['e', 'f'] }], externalTransfers: [{ from: 'b', to: 'e', minutes: 6, meters: 300 }] };
    const graph = buildGraph(network);
    expect(boardingLines(graph, 'b', 'red')).toEqual(['red']);
    expect(walkingOptions(graph, 'b', 'blue')).toEqual([]);
    expect(walkingOptions(graph, 'b', 'red')[0].id).toBe(walkId('b', 'e', 'red', 'blue'));
    const walk = { lineId: 'red', stops: ['b', 'e'], walkToLineId: 'blue' };
    expect(planPosition(trip('b', 'f'), [walk])).toEqual({ station: 'e', line: 'blue' });
    expect(plannedRemainder(graph, trip('b', 'f', ['e']), [walk])).toEqual(trip('e', 'f'));
    expect(validateRoute(graph, [walk, leg(graph, 'blue', 'e', 'f', 'f')], trip('b', 'f')).metrics.walk).toBe(300);
    const blocked = buildGraph(network, { stepFree: true, inaccessibleTransfers: [walkId('b', 'e', 'red', 'blue')] });
    expect(walkingOptions(blocked, 'b', 'red')).toEqual([]);
    expect(canFinish(blocked, trip('b', 'f'), 'red')).toBe(false);
    expect(canFinish(graph, trip('isolated', 'f'))).toBe(false);
    expect(canFinish(graph, trip('isolated', 'isolated'))).toBe(true);
    expect(canFinish(graph, trip('missing', 'missing'))).toBe(false);
  });
  it('replans a real interruption from the reached station and pays the initial line change once', () => {
    const network: Network = { ...structuredClone(fixture), lines: [fixture.lines[0], { ...fixture.lines[1], stops: ['c', 'e'] }, { ...fixture.lines[2], stops: ['c', 'f', 'e'] }] };
    const graph = buildGraph(network), initial = [leg(graph, 'red', 'a', 'b', 'c'), leg(graph, 'blue', 'c', 'e', 'e')];
    const journey = startJourney(graph, roundFor(trip(), 'disruption'), initial)!;
    tickJourney(journey, 100000); expect(journey.status).toBe('interrupted');
    const completed = [...journey.completed], spent = journey.totalSeconds;
    resolveEvent(journey, 'replan');
    const changed = buildGraph(network, journey.round.conditions), request = remainingRequest(journey);
    expect(request.origin).toBe('c');
    expect(rideDirections(changed, 'blue', 'c')).toEqual([]);
    const replacement = [leg(changed, 'green', 'c', 'f', 'e')];
    const validation = validateRoute(changed, replacement, request, journey.currentLine);
    expect(validation.ok).toBe(true); expect(validation.metrics.transfers).toBe(1);
    expect(replanJourney(journey, changed, replacement)).toBe(true);
    expect(journey.completed).toEqual(completed); expect(journey.totalSeconds).toBe(spent);
    tickJourney(journey, 100000); expect(journey.status).toBe('complete');
    expect(journeyMetrics(journey).transfers).toBe(1);
    expect(journeyMetrics(journey).minutes).toBeCloseTo(spent / 60 + validation.metrics.minutes, 8);
  });
});
