import { describe, expect, it } from 'vitest';
import { LESSONS, LESSON_IDS, STUDIO_SCORE, cloneScore, completesLesson, note, readProgress, writeProgress } from '../src/melody/lessons';
import { resolvePerformance, resolvePart, scoreIssues, type Score } from '../src/melody/model';
import { curriculumCopy } from '../src/melody/curriculum-copy';
import { buildRailwayGeometry, createRailwayGeometryCache, railwayPitchHeight, sampleRailwayFrame, type JourneySnapshot } from '../src/melody/renderer';

const saved = (studio: unknown) => readProgress({ getItem: () => JSON.stringify({ studio }) }).studio;
const snapshot = (score: Score): JourneySnapshot => ({
  stations: resolvePerformance(score).map(moment => ({ id: moment.index, step: 0, label: 'note', rest: moment.rest, startBeat: moment.startBeat, durationBeats: moment.durationBeats, pass: moment.pass,
    pitches: moment.pitches.map(pitch => ({ midi: pitch.midi, voice: pitch.part, durationBeats: pitch.durationBeats, label: pitch.letter })), dynamic: moment.pitches[0]?.dynamic })),
  meter: score.meter, repeat: score.repeat, activeIndex: 0, progress: 0, playing: true, totalBeats: 8,
});

describe('Imaginative curriculum and expanded save migration', () => {
  it('has 36 unique rounds in four coherent routes', () => {
    expect(LESSONS.map(lesson => lesson.id)).toEqual([...LESSON_IDS]);
    expect(new Set(LESSON_IDS).size).toBe(36);
    expect(['foundations','rhythm','harmony','ensemble'].map(group => LESSONS.filter(lesson => lesson.group === group).length)).toEqual([12,8,8,8]);
    for (const lesson of LESSONS) {
      expect(scoreIssues(lesson.target)).toEqual([]);
      expect(completesLesson(lesson.target, lesson)).toBe(true);
      expect(completesLesson(lesson.initial, lesson)).toBe(false);
      expect(() => resolvePerformance(lesson.initial)).not.toThrow();
    }
  });
  it('keeps a later natural related to an earlier altered pitch in each accidental challenge', () => {
    for (const id of ['sharp','natural','flat','chord-accidentals']) {
      const lesson = LESSONS.find(lesson => lesson.id === id)!;
      const tones = lesson.initial.events.flatMap(event => [event, ...(event.chord ?? [])]);
      for (let index = 0; index < tones.length; index++) if (tones[index].accidental === 0) {
        expect(tones.slice(0,index).some(tone => tone.letter === tones[index].letter && tone.octave === tones[index].octave && (tone.accidental === 1 || tone.accidental === -1 || lesson.initial.key !== 'C'))).toBe(true);
      }
    }
  });
  it('round-trips every advanced score and preserves legacy saves', () => {
    for (const lesson of LESSONS) expect(saved(lesson.target)).toEqual(lesson.target);
    expect(saved(STUDIO_SCORE)).toEqual(STUDIO_SCORE);
    const progress = { completed: [...LESSON_IDS], ear: { attempts: 9, correct: 5 }, studio: LESSONS.at(-1)!.target };
    let value = ''; const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
    expect(writeProgress(storage,progress)).toBe(true);
    expect(readProgress(storage)).toEqual(progress);
  });
  it('preserves incomplete, overflowing and partial triplet drafts without unsafe extra fields', () => {
    const studio = { ...cloneScore(STUDIO_SCORE), events: [{...note('C',4,'eighth'),tuplet:3 as const,unknown:{large:'ignored'}}], unknown:'ignored' };
    expect(saved(studio)).toEqual({ ...STUDIO_SCORE, events:[{...note('C',4,'eighth'),tuplet:3}] });
    expect(saved(LESSONS.find(lesson => lesson.id === 'chord-rhythm')!.initial)).toEqual(LESSONS.find(lesson => lesson.id === 'chord-rhythm')!.initial);
  });
  it('validates all expanded fields and hard limits before accepting imported drafts', () => {
    const base = cloneScore(STUDIO_SCORE);
    for (const unsafe of [
      {...base,repeat:'true'}, {...base,dynamic:'loud'}, {...base,parts:Array(4).fill({clef:'bass',events:base.events})},
      {...base,parts:[{clef:'fake',events:base.events}]}, {...base,events:Array(65).fill(note('C',4))},
      {...base,events:[{...note('C',4),chord:Array(4).fill({letter:'E',octave:4,accidental:null})}]},
      {...base,events:[{...note('C',4),tuplet:5}]}, {...base,events:[{...note('C',4),dynamic:'loud'}]},
      {...base,events:[{...note('C',4),chord:[{letter:'E',octave:99,accidental:null}]}]},
    ]) expect(saved(unsafe)).toEqual(STUDIO_SCORE);
    expect(readProgress({getItem: () => ' '.repeat(128001)}).studio).toEqual(STUDIO_SCORE);
    expect(saved({...base,events:Array(64).fill(note('C',4))}).events).toHaveLength(64);
  });
  it('provides advanced mission copy in all five languages, with correct Mongolian scripts', () => {
    for (const language of ['en','zh-CN','ja','mn-Cyrl-MN','mn-Mong-CN'] as const) for (const lesson of LESSONS.slice(12)) {
      const copy = curriculumCopy(language,lesson.id)!;
      expect(copy[0].length).toBeGreaterThan(2); expect(copy[1].length).toBeGreaterThan(15);
      if (language === 'mn-Cyrl-MN') { expect(copy.join(' ')).toMatch(/[\u0400-\u04ff]/); expect(copy.join(' ')).not.toMatch(/[\u4e00-\u9fff]/); }
      if (language === 'mn-Mong-CN') expect(copy.join(' ')).toMatch(/[\u1820-\u18aa]/);
    }
  });
});

describe('A railway derived from performed music', () => {
  it('uses one absolute semitone elevation across clefs and score ranges', () => {
    expect(railwayPitchHeight(72)-railwayPitchHeight(60)).toBeCloseTo(12 * .0275);
    const score = cloneScore(STUDIO_SCORE);
    const a = buildRailwayGeometry(snapshot(score)); score.clef = 'bass';
    expect(buildRailwayGeometry(snapshot(score)).notes.map(note => note.height)).toEqual(a.notes.map(note => note.height));
  });
  it('spaces stations by duration and gives concurrent voices independent lanes and sustaining coaches', () => {
    const score = LESSONS.find(lesson => lesson.id === 'ensemble')!.target;
    const scene = snapshot(score), geometry = buildRailwayGeometry(scene);
    expect(geometry.voices).toHaveLength(3);
    expect(geometry.notes).toHaveLength(resolvePerformance(score).reduce((sum,moment) => sum + moment.pitches.length,0));
    const frame = sampleRailwayFrame(geometry,{...scene,activeIndex:1,progress:.5});
    expect(frame.coaches.some(coach => coach.note.startBeat < frame.beat)).toBe(true);
    expect(new Set(frame.coaches.map(coach => coach.note.lane)).size).toBe(3);
    expect(geometry.ties.some(tie => tie.strong)).toBe(true);
    expect(geometry.notes[0].endX-geometry.notes[0].x).toBeGreaterThan(0);
  });
  it('reuses the written route on a repeat and draws a connected return route', () => {
    const scene = snapshot(LESSONS.find(lesson => lesson.id === 'repeat')!.target), geometry = buildRailwayGeometry(scene);
    const first = geometry.stops.filter(stop => stop.pass === 0), second = geometry.stops.filter(stop => stop.pass === 1);
    expect(second.map(stop => stop.x)).toEqual(first.map(stop => stop.x));
    expect(second.map(stop => stop.replayOf)).toEqual(first.map((_,index) => index));
    expect(geometry.returnRoutes).toHaveLength(1);
    expect(sampleRailwayFrame(geometry,{...scene,activeIndex:first.length-1,progress:.5}).returning).toBe(true);
  });
  it('coasts through silent events, conveys dynamics, and freezes expressive motion when requested', () => {
    const scene = snapshot(LESSONS.find(lesson => lesson.id === 'heartbeat')!.target), geometry = buildRailwayGeometry(scene);
    const frame = sampleRailwayFrame(geometry,{...scene,activeIndex:2,progress:.5});
    expect(frame.rest).toBe(true); expect(frame.coaches).toHaveLength(0); expect(frame.pulse).toBe(0);
    const dynamics = buildRailwayGeometry(snapshot(LESSONS.find(lesson => lesson.id === 'dynamics')!.target));
    expect(dynamics.stops[2].intensity).toBeGreaterThan(dynamics.stops[0].intensity);
    expect(sampleRailwayFrame(geometry,{...scene,progress:.5},true).wheelAngle).toBe(0);
  });
  it('keeps a sustained voice audible and visible while another staff rests', () => {
    const score: Score = { clef:'treble', key:'C', meter:{beats:4,unit:4}, events:[note('C',4,'whole')],
      parts:[{clef:'bass',events:[note('C',3),...Array.from({length:3},() => note('C',3,'quarter',null,false,true))]}] };
    const scene = snapshot(score), frame = sampleRailwayFrame(buildRailwayGeometry(scene),{...scene,activeIndex:1,progress:.5});
    expect(frame.rest).toBe(false);
    expect(frame.coaches).toHaveLength(1);
    expect(frame.coaches[0].note.midi).toBe(60);
  });
  it('retains every chord ribbon and repeat attack at the complete composition limit', () => {
    const events = (octave: number) => Array.from({length:64},() => ({...note('C',octave,'whole'),chord:['E','G','B'].map(letter => ({letter:letter as 'E'|'G'|'B',octave,accidental:null}))}));
    const score: Score = {clef:'treble',key:'C',meter:{beats:4,unit:4},events:events(4),repeat:true,
      parts:[{clef:'bass',events:events(3)},{clef:'alto',events:events(4)},{clef:'tenor',events:events(4)}]};
    expect(scoreIssues(score)).toEqual([]);
    expect(saved(score)).toEqual(score);
    const scene = snapshot(score), geometry = buildRailwayGeometry(scene);
    expect(geometry.notes.filter(note => note.pass === 0)).toHaveLength(1024);
    expect(geometry.notes).toHaveLength(2048);
    expect(geometry.returnRoutes).toHaveLength(4);
    expect(sampleRailwayFrame(geometry,{...scene,activeIndex:127,progress:.5}).coaches).toHaveLength(16);
  });
  it('caches geometry across animation frames and invalidates on a musical edit', () => {
    const cache = createRailwayGeometryCache(), score = cloneScore(STUDIO_SCORE), scene = snapshot(score);
    const a = cache.get(scene); expect(cache.get({...scene,progress:.9})).toBe(a);
    score.events[0].letter = 'D'; expect(cache.get(snapshot(score))).not.toBe(a);
    cache.clear(); expect(cache.get(scene)).not.toBe(a);
    expect(resolvePart(score)[0].pitches[0].midi).toBe(62);
  });
});
