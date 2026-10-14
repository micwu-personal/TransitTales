import { describe, expect, it } from 'vitest';
import { NETWORK } from '../src/beijing/network';
import { buildGraph, createRounds, findCandidates, isChange, journeyMetrics, legsFor, makeLeg, metricsFor, nodeId, replanJourney, remainingRequest, resolveEvent, rideId, segmentsFor, startJourney, tickJourney, transferId, validateRoute, walkId, type Network } from '../src/beijing/model';
import { createSnapshot, detachedLegs } from '../src/beijing/view';
import { fixture, roundFor, trip } from './beijing-fixture';

const walking: Network = { ...structuredClone(fixture), lines: [
  { ...fixture.lines[0], stops: ['a','b'] },
  { ...fixture.lines[1], stops: ['e','f'] },
], externalTransfers: [{ from: 'b', to: 'e', minutes: 6, meters: 300 }] };
const graph = buildGraph(walking);
const walk = { lineId: 'red', stops: ['b','e'], walkToLineId: 'blue' };
const route = [{ lineId: 'red', stops: ['a','b'] }, walk, { lineId: 'blue', stops: ['e','f'] }];

describe('Explicit external walking preserves separate station and service identities', () => {
  it('creates bidirectional walking edges, never a paid-area transfer or fake ride', () => {
    expect(graph.at.get('b')).toEqual(['red']); expect(graph.at.get('e')).toEqual(['blue']);
    expect(graph.byId.has(walkId('b','e','red','blue'))).toBe(true);
    expect(graph.byId.has(walkId('e','b','blue','red'))).toBe(true);
    expect(graph.byId.has(transferId('b','red','blue'))).toBe(false);
    expect(makeLeg(graph,'red','b','e')).toBeNull();
    expect(findCandidates(buildGraph({ ...walking, externalTransfers: [] }),trip('a','f'))).toEqual([]);
  });
  it('validates manually built walk legs and assisted candidates with exactly matching estimates', () => {
    const candidates = findCandidates(graph,trip('a','f'));
    expect(candidates.length).toBeGreaterThan(0);
    for (const legs of [route,...candidates.map(candidate=>candidate.legs)]) {
      const result = validateRoute(graph,legs,trip('a','f',['b','e'])); expect(result.ok).toBe(true);
      expect(result.metrics.transfers).toBe(1); expect(result.metrics.walk).toBe(300);
      expect(segmentsFor(result.edges).filter(segment=>segment.kind==='board')).toHaveLength(2);
      const journey = startJourney(graph,roundFor(trip('a','f',['b','e'])),legs)!;
      tickJourney(journey,100000); expect(journey.status).toBe('complete'); expect(journey.currentLine).toBe('blue');
      expect(journey.visited).toEqual(['a','b','e','f']); expect(journeyMetrics(journey).minutes).toBeCloseTo(result.metrics.minutes,8);
      expect(journeyMetrics(journey).score).toBe(result.metrics.score);
    }
    const reverse = findCandidates(graph,trip('f','a'))[0];
    expect(validateRoute(graph,reverse.legs,trip('f','a')).ok).toBe(true);
    const walkOnly = validateRoute(graph,[walk],trip('b','e'));
    expect(walkOnly.ok).toBe(true); expect(walkOnly.metrics.minutes).toBe(6);
  });
  it('blocks only specified walking direction and accepts simulated access restrictions', () => {
    const id = walkId('b','e','red','blue');
    for (const conditions of [{blockedEdges:[id]},{stepFree:true,inaccessibleTransfers:[id]}]) {
      const restricted=buildGraph(walking,conditions);
      expect(restricted.byId.has(id)).toBe(false); expect(restricted.byId.has(walkId('e','b','blue','red'))).toBe(true);
      expect(validateRoute(restricted,route,trip('a','f')).error).toBe('blocked');
      expect(findCandidates(restricted,trip('a','f'))).toEqual([]);
    }
  });
  it('rejects invalid link references, costs, and invented walking endpoints', () => {
    for (const externalTransfers of [[{from:'b',to:'missing',minutes:6,meters:300}],[{from:'b',to:'e',minutes:NaN,meters:300}],[{from:'b',to:'e',minutes:0,meters:300}],[{from:'b',to:'e',minutes:6,meters:-1}]]) expect(()=>buildGraph({...walking,externalTransfers})).toThrow('external transfer');
    expect(validateRoute(graph,[{...walk,stops:['b','f']}],trip('b','f')).error).toBe('blocked');
    expect(validateRoute(graph,[{...walk,stops:['b','e','f']}],trip('b','f')).error).toBe('unknown');
  });
  it('renders a detached first-person walk snapshot naming the actual destination service', () => {
    const journey=startJourney(graph,roundFor(trip('b','e')),[walk])!; tickJourney(journey,90);
    const snapshot=createSnapshot(graph,journey,'en');
    expect(snapshot.phase).toBe('walk'); expect(snapshot.progress).toBe(.25); expect(snapshot.caption).toContain('Exit the station');
    expect(snapshot.caption).toContain('E'); expect(snapshot.line).toContain('Blue'); expect(Object.isFrozen(snapshot)).toBe(true);
    expect(detachedLegs([walk])[0].walkToLineId).toBe('blue');
  });
  it('walk-only and already-arrived facility rounds expose real decisions, not dead ends', () => {
    for (const event of ['access','toilet'] as const) for (const [request,legs] of [[trip('b','e'),[walk]],[trip('b','b'),[]]] as const) {
      const journey=startJourney(graph,roundFor(request,event),[...legs])!; tickJourney(journey,100000);
      expect(journey.interruption?.kind).toBe(event); resolveEvent(journey,event==='access'?'lift':'toilet'); tickJourney(journey,100000);
      expect(journey.status).toBe('complete');
    }
  });
  it('cannot clear an unresolved arrival toilet with an empty replan', () => {
    const journey=startJourney(graph,roundFor(trip('b','b'),'toilet'),[])!;
    expect(replanJourney(journey,graph,[])).toBe(false);expect(journey.interruption?.kind).toBe('toilet');
    resolveEvent(journey,'toilet');tickJourney(journey,100000);expect(journey.status).toBe('complete');
  });
  it('retains intermediate stationary legs in a necessary transfer chain', () => {
    const network:Network={...structuredClone(fixture),lines:[{...fixture.lines[0],stops:['a','b']},{...fixture.lines[1],stops:['b','e']},{...fixture.lines[3],stops:['b','c']}]};
    const chain=buildGraph(network,{blockedEdges:[transferId('b','red','blue')]});
    const candidates=findCandidates(chain,trip('b','e'),'red'); expect(candidates.length).toBeGreaterThan(0);
    for(const candidate of candidates) {
      expect(candidate.legs[0]).toEqual({lineId:'red',stops:['b']});
      const result=validateRoute(chain,candidate.legs,trip('b','e'));expect(result.ok).toBe(true);
      expect(result.metrics.transfers).toBe(2); expect(result.metrics).toEqual(candidate.metrics);
      expect(legsFor(result.edges)).toEqual(candidate.legs);
    }
  });
});

const actual = buildGraph(NETWORK);
const station = (name:string) => NETWORK.stations.find(stop=>stop.name===name)!.id;
describe('The complete dated network is usable by the real game graph', () => {
  it('is strongly connected on directed station+line states including all tram walking links', () => {
    const root=actual.edges.keys().next().value!;
    const reverse=new Map([...actual.edges.keys()].map(id=>[id,[] as string[]]));
    for(const edges of actual.edges.values()) for(const edge of edges) reverse.get(edge.to)!.push(edge.from);
    for(const backwards of [false,true]) {
      const seen=new Set([root]),queue=[root];
      for(let i=0;i<queue.length;i++) for(const target of backwards?reverse.get(queue[i])!:actual.edges.get(queue[i])!.map(edge=>edge.to)) if(!seen.has(target)){seen.add(target);queue.push(target);}
      expect(seen.size).toBe(actual.edges.size);
      expect(new Set([...seen].map(id=>JSON.parse(id)[0])).size).toBe(426);
    }
  });
  it('preserves the directional Capital Airport circuit and through-service journeys', () => {
    const airport=NETWORK.lines.find(service=>service.id==='capital-airport')!;
    const terminals=airport.stops.filter(id=>stationName(id).includes('航站楼'));
    const t3=terminals.find(id=>stationName(id)==='3号航站楼')!,t2=terminals.find(id=>stationName(id)==='2号航站楼')!,sanyuanqiao=station('三元桥');
    expect(actual.byId.has(rideId(airport.id,t3,t2))).toBe(true);
    expect(actual.byId.has(rideId(airport.id,t2,t3))).toBe(false);
    expect(actual.byId.has(rideId(airport.id,t3,sanyuanqiao))).toBe(false);
    expect(makeLeg(actual,airport.id,t3,sanyuanqiao)?.stops).toEqual([t3,t2,sanyuanqiao]);
    for(const id of ['1-batong','4-daxing']) {
      const service=actual.lines.get(id)!,leg=makeLeg(actual,id,service.stops[0],service.stops.at(-1)!)!;
      const result=validateRoute(actual,[leg],trip(service.stops[0],service.stops.at(-1)!));expect(result.ok).toBe(true);expect(result.metrics.transfers).toBe(0);
    }
  });
  it('exposes each real external link as separate walk legs with simulated costs', () => {
    for(const connection of NETWORK.externalTransfers!) {
      const request=trip(connection.from,connection.to),candidate=findCandidates(actual,request)[0];
      expect(candidate.legs.some(leg=>leg.walkToLineId)).toBe(true);
      const result=validateRoute(actual,candidate.legs,request);expect(result.ok).toBe(true);
      expect(result.edges.some(edge=>edge.kind==='walk')).toBe(true);expect(result.metrics.minutes).toBe(connection.minutes);expect(result.metrics.walk).toBe(connection.meters);
      expect(actual.byId.has(transferId(connection.from,actual.at.get(connection.from)![0],actual.at.get(connection.to)![0]))).toBe(false);
    }
    expect(actual.at.get(station('大红门'))).toEqual(expect.arrayContaining(['8','10']));
  });
  it('supports a complete scored sandbox journey from every included service', () => {
    for(const service of NETWORK.lines) {
      const request=trip(service.stops.at(-1)!,station('西单')),candidate=findCandidates(actual,request)[0];expect(candidate,service.id).toBeDefined();
      const result=validateRoute(actual,candidate.legs,request);expect(result.ok,service.id).toBe(true);
      const journey=startJourney(actual,roundFor(request),candidate.legs)!;tickJourney(journey,1000000);
      expect(journey.status,service.id).toBe('complete');expect(journeyMetrics(journey).minutes).toBeCloseTo(result.metrics.minutes,8);
    }
  });
  it('offers differing valid routes and completes all six missions with working events', () => {
    for(const round of createRounds(NETWORK).filter(round=>round.id!=='sandbox')) {
      const graph=buildGraph(NETWORK,round.conditions),candidates=findCandidates(graph,round.request);expect(candidates.length,round.id).toBeGreaterThan(0);
      if(round.id==='rush')expect(candidates.length).toBeGreaterThan(1);
      for(const candidate of candidates) {
        const result=validateRoute(graph,candidate.legs,round.request);expect(result.ok,round.id).toBe(true);expect(result.metrics).toEqual(candidate.metrics);
        const journey=startJourney(graph,round,candidate.legs)!;tickJourney(journey,1000000);
        if(round.event){expect(journey.interruption?.kind).toBe(round.event);resolveEvent(journey,round.event==='toilet'?'toilet':round.event==='access'?'lift':'wait');tickJourney(journey,1000000);}
        expect(journey.status,round.id).toBe('complete');expect(journey.currentStation).toBe(round.request.destination);
        expect(journey.visited).toEqual(expect.arrayContaining(round.request.via));
      }
    }
  });
  it('can replan the real disruption and alternate toilet while preserving completed travel', () => {
    for(const id of ['disruption','toilet'] as const) {
      const round=createRounds(NETWORK).find(round=>round.id===id)!,initial=buildGraph(NETWORK,round.conditions);
      const journey=startJourney(initial,round,findCandidates(initial,round.request)[0].legs)!;tickJourney(journey,1000000);
      const seconds=journey.totalSeconds,completed=structuredClone(journey.completed);
      const changed=buildGraph(NETWORK,resolveEvent(journey,'replan',id==='toilet'?station('西单'):undefined));
      const candidate=findCandidates(changed,remainingRequest(journey),journey.currentLine)[0];expect(candidate).toBeDefined();expect(replanJourney(journey,changed,candidate.legs)).toBe(true);
      expect(journey.totalSeconds).toBe(seconds);expect(journey.completed).toEqual(completed);tickJourney(journey,1000000);
      if(id==='toilet'){expect(journey.currentStation).toBe(station('西单'));expect(journey.interruption?.kind).toBe('toilet');resolveEvent(journey,'toilet');tickJourney(journey,1000000);}
      expect(journey.status).toBe('complete');expect(journey.completed.every(edge=>isChange(edge)||edge.kind==='ride')).toBe(true);
    }
    expect(actual.edges.has(nodeId(station('东直门'),'capital-airport'))).toBe(true);
    expect(metricsFor([]).score).toBe(1000);
  });
});
function stationName(id:string) { return actual.stations.get(id)!.name; }
