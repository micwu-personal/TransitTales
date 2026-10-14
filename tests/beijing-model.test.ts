import { describe, it, expect } from 'vitest';
import { buildGraph, makeLeg, validateRoute, findCandidates, rideId, transferId, startJourney, tickJourney, journeyMetrics, replanJourney, resolveEvent, remainingRequest, segmentsFor, createRounds, metricsFor } from '../src/beijing/model';
import { fixture, trip, roundFor } from './beijing-fixture';

const graph = buildGraph(fixture);
const direct = [{ lineId: 'green', stops: ['a','f','e'] }];
const changed = [{ lineId: 'red', stops: ['a','b'] }, { lineId: 'blue', stops: ['b','d','e'] }];

describe('Beijing factual graph boundary', () => {
  it('uses shared station identity, not equal labels', () => {
    expect(graph.at.has('isolated')).toBe(false);
    expect(findCandidates(graph,trip('isolated','e'))).toEqual([]);
    expect(graph.byId.has(rideId('red','b','a'))).toBe(true);
    expect(graph.byId.has(transferId('b','red','blue'))).toBe(true);
    expect(graph.byId.has(transferId('a','red','blue'))).toBe(false);
  });
  it('validates identity, stop references and finite coordinates', () => {
    const bad = structuredClone(fixture); bad.stations[0].x = Infinity;
    expect(() => buildGraph(bad)).toThrow('coordinate');
    bad.stations[0].x = 100; bad.stations.push(bad.stations[0]);
    expect(() => buildGraph(bad)).toThrow('identity');
    const line = structuredClone(fixture); line.lines[0].stops.push('missing');
    expect(() => buildGraph(line)).toThrow('stops');
  });
  it('supports bidirectional loops and directed connections without inventing reverse airport edges', () => {
    const network = structuredClone(fixture); network.lines = [{ ...network.lines[0], stops: ['a','b','c'], loop: true }];
    const loop = buildGraph(network);
    expect(loop.byId.has(rideId('red','a','c'))).toBe(true);
    network.lines[0].connections = [{from:'a',to:'b',bidirectional:true},{from:'b',to:'c',bidirectional:false},{from:'c',to:'a',bidirectional:false}];
    const directed = buildGraph(network);
    expect(directed.byId.has(rideId('red','b','a'))).toBe(true);
    expect(directed.byId.has(rideId('red','c','b'))).toBe(false);
    expect(directed.byId.has(rideId('red','a','c'))).toBe(false);
    expect(makeLeg(directed,'red','c','b')?.stops).toEqual(['c','a','b']);
  });
  it('counts through-service line labels as no interchange and avoids a second boarding', () => {
    const network = structuredClone(fixture); network.lines = [
      {...network.lines[0], serviceGroup:'through', stops:['a','b']},
      {...network.lines[1], serviceGroup:'through', stops:['b','d','e']},
    ];
    const through = buildGraph(network), validation = validateRoute(through,changed,trip());
    expect(validation.ok).toBe(true); expect(validation.metrics.transfers).toBe(0);
    expect(validation.metrics.walk).toBe(0);
    expect(through.byId.get(transferId('b','red','blue'))?.minutes).toBe(0);
    expect(segmentsFor(validation.edges).filter(segment=>segment.kind==='board')).toHaveLength(1);
    const journey = startJourney(through,roundFor(),changed)!; tickJourney(journey,100000);
    expect(journey.status).toBe('complete'); expect(journey.currentLine).toBe('blue');
    expect(journeyMetrics(journey).minutes).toBeCloseTo(validation.metrics.minutes,8);
  });
  it('removes only specified directed disruptions and simulated access edges', () => {
    const blocked = buildGraph(fixture,{blockedEdges:[rideId('red','a','b')]});
    expect(blocked.byId.has(rideId('red','b','a'))).toBe(true);
    expect(validateRoute(blocked,changed,trip()).error).toBe('blocked');
    const access = buildGraph(fixture,{stepFree:true,inaccessibleTransfers:[transferId('b','red','blue')]});
    expect(validateRoute(access,changed,trip()).error).toBe('access');
    expect(findCandidates(access,trip()).length).toBeGreaterThan(0);
    expect(graph.byId.has(rideId('red','a','b'))).toBe(true);
  });
});

describe('Player-authored routes and transparent scoring', () => {
  it('rejects unfinished, noncontiguous, wrong-origin and missing-via legs', () => {
    expect(validateRoute(graph,[],trip()).error).toBe('empty');
    expect(validateRoute(graph,[{lineId:'red',stops:['a','c']}],trip('a','c')).error).toBe('blocked');
    expect(validateRoute(graph,[{lineId:'red',stops:['b','c']}],trip('a','c')).error).toBe('origin');
    expect(validateRoute(graph,[{lineId:'red',stops:['a','b']},{lineId:'blue',stops:['d','e']}],trip()).error).toBe('disconnected');
    expect(validateRoute(graph,direct,trip('a','e',['b'])).error).toBe('via');
    expect(validateRoute(graph,direct,trip('a','b')).error).toBe('destination');
  });
  it('respects ordered errands including origin and repeated waypoint names', () => {
    const candidates = findCandidates(graph,trip('a','e',['a','b','b','d']));
    expect(candidates.length).toBeGreaterThan(0);
    for(const candidate of candidates) expect(validateRoute(graph,candidate.legs,trip('a','e',['a','b','b','d'])).ok).toBe(true);
    expect(validateRoute(graph,changed,trip('a','e',['d','b'])).error).toBe('via');
  });
  it('offers genuinely differing valid journeys, all completable with separate score breakdowns', () => {
    const candidates = findCandidates(graph,trip());
    expect(candidates.length).toBeGreaterThan(1);
    expect(new Set(candidates.map(candidate=>JSON.stringify(candidate.legs))).size).toBe(candidates.length);
    for(const legs of [direct,changed,...candidates.map(candidate=>candidate.legs)]) {
      const validation = validateRoute(graph,legs,trip()); expect(validation.ok).toBe(true);
      const journey = startJourney(graph,roundFor(),legs)!; tickJourney(journey,100000);
      expect(journey.status).toBe('complete'); expect(journey.currentStation).toBe('e');
      expect(journeyMetrics(journey).minutes).toBeCloseTo(validation.metrics.minutes,8);
      expect(journeyMetrics(journey).score).toBe(validation.metrics.score);
      expect(validation.metrics.score).toBe(Math.max(0,1000-validation.metrics.timePenalty-validation.metrics.transferPenalty-validation.metrics.walkPenalty-validation.metrics.crowdPenalty));
    }
    expect(validateRoute(graph,changed,trip()).metrics.transfers).toBe(1);
    expect(validateRoute(graph,changed,trip()).metrics.walk).toBeGreaterThan(0);
  });
  it('includes boarding and stop durations in the planned estimate', () => {
    const edges = validateRoute(graph,changed,trip()).edges;
    expect(metricsFor(edges).minutes).toBeCloseTo(segmentsFor(edges).reduce((sum,s)=>sum+s.seconds,0)/60,8);
  });
  it('accepts already-arrived sandbox journeys and rejects unknown endpoints', () => {
    expect(startJourney(graph,roundFor(trip('a','a')),[])?.status).toBe('complete');
    expect(validateRoute(graph,[],trip('missing','a')).error).toBe('unknown');
  });
  it('resolves scenario IDs from loaded Chinese names rather than fixture IDs', () => {
    const network = structuredClone(fixture); network.stations[0].name='天安门东'; network.stations[4].name='北京南站';
    expect(createRounds(network)[0].request).toEqual(trip());
    expect(createRounds(network)).toHaveLength(7);
  });
});

describe('Journey events and progress-preserving replanning', () => {
  it('pause, invalid deltas and renderer access cannot advance travel', () => {
    const journey = startJourney(graph,roundFor(),changed)!; journey.status='paused';
    tickJourney(journey,10000); expect(journey.totalSeconds).toBe(0);
    journey.status='running'; tickJourney(journey,NaN); tickJourney(journey,-3); expect(journey.totalSeconds).toBe(0);
    tickJourney(journey,10); expect(journey.totalSeconds).toBe(10);
    expect(replanJourney(journey,graph,direct)).toBe(false);
  });
  it('one-hop toilet and lift rounds always stop with an actionable decision', () => {
    const route=[{lineId:'red',stops:['a','b']}];
    for(const event of ['toilet','access'] as const) {
      const journey = startJourney(graph,roundFor(trip('a','b'),event),route)!;
      tickJourney(journey,100000); expect(journey.status).toBe('interrupted'); expect(journey.interruption?.kind).toBe(event);
      resolveEvent(journey,event==='toilet'?'toilet':'lift'); tickJourney(journey,100000);
      expect(journey.status).toBe('complete'); expect(journey.extraMinutes).toBe(event==='toilet'?7:4);
    }
  });
  it('toilet choices can reroute through another game facility and retain elapsed progress', () => {
    const journey = startJourney(graph,roundFor(trip(),'toilet'),changed)!; tickJourney(journey,100000);
    expect(journey.currentStation).toBe('d'); const elapsed=journey.totalSeconds, completed=structuredClone(journey.completed);
    resolveEvent(journey,'replan','f'); const request=remainingRequest(journey); expect(request.via).toEqual(['f']);
    const candidate=findCandidates(graph,request,journey.currentLine)[0]; expect(candidate).toBeDefined();
    expect(replanJourney(journey,graph,candidate.legs)).toBe(true);
    expect(journey.totalSeconds).toBe(elapsed); expect(journey.completed).toEqual(completed);
    tickJourney(journey,100000); expect(journey.interruption?.kind).toBe('toilet'); expect(journey.currentStation).toBe('f');
    resolveEvent(journey,'toilet'); tickJourney(journey,100000);
    expect(journey.status).toBe('complete'); expect(journey.visited).toContain('f');
  });
  it('invalid event actions cannot dismiss needs, and repeat choices do not double-charge', () => {
    const journey=startJourney(graph,roundFor(trip(),'toilet'),changed)!; tickJourney(journey,100000);
    resolveEvent(journey,'wait'); expect(journey.status).toBe('interrupted'); expect(journey.toiletSolved).toBe(false);
    resolveEvent(journey,'toilet'); resolveEvent(journey,'toilet'); expect(journey.extraMinutes).toBe(7);
  });
  it('disruption rerouting removes the upcoming directed edge without resetting completed travel', () => {
    const journey=startJourney(graph,roundFor(trip(),'disruption'),changed)!; tickJourney(journey,100000);
    const blocked=journey.interruption!.blockedEdge!, elapsed=journey.totalSeconds;
    const revised=buildGraph(fixture,resolveEvent(journey,'replan'));
    expect(revised.byId.has(blocked)).toBe(false); expect(graph.byId.has(blocked)).toBe(true);
    const candidates=findCandidates(revised,remainingRequest(journey),journey.currentLine); expect(candidates.length).toBeGreaterThan(0);
    expect(replanJourney(journey,revised,candidates[0].legs)).toBe(true); expect(journey.totalSeconds).toBe(elapsed);
    tickJourney(journey,100000); expect(journey.status).toBe('complete');
  });
  it('waiting for recovery completes the original route with an explicit time penalty', () => {
    const journey=startJourney(graph,roundFor(trip(),'disruption'),changed)!; tickJourney(journey,100000);
    resolveEvent(journey,'wait'); tickJourney(journey,100000); expect(journey.status).toBe('complete'); expect(journey.extraMinutes).toBe(15);
  });
  it('cannot replan onto a prohibited initial-line interchange', () => {
    const journey=startJourney(graph,roundFor(trip(),'disruption'),changed)!; tickJourney(journey,100000);
    const restricted=buildGraph(fixture,{stepFree:true,inaccessibleTransfers:[transferId('d','blue','yellow')]});
    expect(replanJourney(journey,restricted,[{lineId:'yellow',stops:['d','f']},{lineId:'green',stops:['f','e']}])).toBe(false);
    expect(journey.status).toBe('interrupted');
  });
});
