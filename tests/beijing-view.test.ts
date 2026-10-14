import { describe, it, expect } from 'vitest';
import { buildGraph, startJourney, tickJourney } from '../src/beijing/model';
import { createSnapshot, detachedLegs } from '../src/beijing/view';
import { languages, t, stationLabel, lineLabel } from '../src/beijing/locale';
import { fixture, roundFor } from './beijing-fixture';

describe('Detached first-person presentation contract', () => {
  it('freezes independent renderer snapshots without handing out model references', () => {
    const graph=buildGraph(fixture), route=[{lineId:'green',stops:['a','f','e']}];
    const journey=startJourney(graph,roundFor(),route)!;
    tickJourney(journey,20); const before=structuredClone(journey), snapshot=createSnapshot(graph,journey,'en',true);
    expect(Object.isFrozen(snapshot)).toBe(true); expect(snapshot.phase).toBe('ride'); expect(snapshot.nextStation).toContain('f');
    expect(snapshot.reducedMotion).toBe(true); expect(snapshot.progress).toBeGreaterThan(0);
    expect(()=>{(snapshot as {station:string}).station='different';}).toThrow();
    expect(journey).toEqual(before); tickJourney(journey,30); expect(snapshot.elapsed).not.toBe(journey.elapsed);
    const legs=detachedLegs(route); expect(Object.isFrozen(legs[0].stops)).toBe(true); route[0].stops.push('c'); expect(legs[0].stops).toHaveLength(3);
  });
  it('handles ready, paused, complete and zero-second service continuation snapshots', () => {
    const graph=buildGraph(fixture); expect(createSnapshot(graph,null,'en').phase).toBe('ready');
    const journey=startJourney(graph,roundFor(),[{lineId:'green',stops:['a','f','e']}])!;
    journey.status='paused'; expect(createSnapshot(graph,journey,'en').paused).toBe(true);
    journey.segments[0].seconds=0; expect(createSnapshot(graph,journey,'en').progress).toBe(0);
    journey.status='running'; tickJourney(journey,100000); expect(createSnapshot(graph,journey,'en').phase).toBe('complete');
  });
  it('provides essential written flow in all five locales, while factual labels stay bilingual', () => {
    for(const language of languages) {
      for(const key of ['title','tutorial','simulated','toiletEvent','accessEvent','disruptionEvent','voiceUnavailable','noRoute','formula'] as const) expect(t(language,key).trim().length).toBeGreaterThan(0);
    }
    expect(stationLabel(fixture.stations[0])).toBe('a · A'); expect(lineLabel(fixture.lines[0])).toBe('红线 · Red');
  });
});
