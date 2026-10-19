import { describe, expect, it } from 'vitest';
import { durationBeats, measureBeats, midiToFrequency, pitchAtStaffStep, resolveScore, sameMelody, scoreIssues, staffStep,
  type Clef, type Duration, type NoteEvent, type Score } from '../src/melody/model';

const note = (patch: Partial<NoteEvent> = {}): NoteEvent => ({ letter: 'C', octave: 4, accidental: null, duration: 'quarter', dotted: false, rest: false, ...patch });
const score = (events: NoteEvent[], patch: Partial<Score> = {}): Score => ({ clef: 'treble', key: 'C', meter: { beats: 4, unit: 4 }, events, ...patch });

describe('concert tuning', () => {
  it('uses A4=440 and known reference frequencies including MIDI boundaries', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(60)).toBe(261.6255653005986);
    expect(midiToFrequency(0)).toBeCloseTo(8.175798915643707, 12);
    expect(midiToFrequency(127)).toBeCloseTo(12543.853951415975, 9);
    expect(midiToFrequency(57)).toBe(220);
    expect(midiToFrequency(81)).toBe(880);
    for (let midi = 0; midi <= 127; midi++) {
      expect(midiToFrequency(midi)).toBe(440 * Math.pow(2, (midi - 69) / 12));
      if (midi + 12 <= 127) expect(midiToFrequency(midi + 12) / midiToFrequency(midi)).toBeCloseTo(2, 12);
    }
  });
  it.each([-1, 128, .5, NaN, Infinity, -Infinity])('rejects invalid MIDI %s', midi => {
    expect(() => midiToFrequency(midi)).toThrow(RangeError);
  });
});

describe('notation and rhythm', () => {
  it.each<[Clef, NoteEvent['letter'], number]>([['treble', 'E', 4], ['bass', 'G', 2], ['alto', 'F', 3], ['tenor', 'D', 3]])('anchors %s bottom line and round-trips negative and positive steps', (clef, letter, octave) => {
    expect(staffStep(letter, octave, clef)).toBe(0);
    for (let step = -40; step < 60; step++) {
      const pitch = pitchAtStaffStep(step, clef);
      expect(staffStep(pitch.letter, pitch.octave, clef)).toBe(step);
    }
  });
  it('gives standard durations in quarter-note units and dotted meters', () => {
    const values: [Duration, number][] = [['whole', 4], ['half', 2], ['quarter', 1], ['eighth', .5], ['sixteenth', .25]];
    for (const [duration, beats] of values) {
      expect(durationBeats(note({ duration }))).toBe(beats);
      expect(durationBeats(note({ duration, dotted: true, rest: true }))).toBe(beats * 1.5);
    }
    expect(measureBeats({ beats: 6, unit: 8 })).toBe(3);
    expect(measureBeats({ beats: 3, unit: 4 })).toBe(3);
    expect(scoreIssues(score([note({ duration: 'quarter', dotted: true }), note({ duration: 'quarter', dotted: true })], { meter: { beats: 6, unit: 8 } }))).toEqual([]);
  });
  it('resolves key sharps/flats, explicit naturals, octave-scoped propagation, and bar resets', () => {
    const melody = score([
      note({ letter: 'F', accidental: 0 }), note({ letter: 'F' }), note({ letter: 'F', octave: 5 }), note({ letter: 'F' }),
      note({ letter: 'F' }), note({ letter: 'F', accidental: -1 }), note({ letter: 'F' }), note({ letter: 'C' }),
      note({ letter: 'F' }),
    ], { key: 'D' });
    expect(resolveScore(melody).map(n => n.midi)).toEqual([65, 65, 78, 65, 66, 64, 64, 61, 66]);
    expect(resolveScore(score([note({ letter: 'B' }), note({ letter: 'E' })], { key: 'Bb' })).map(n => n.midi)).toEqual([70, 63]);
    expect(resolveScore(score([note({ letter: 'B' })], { key: 'F' }))[0].midi).toBe(70);
    expect(resolveScore(score([note({ letter: 'F' })], { key: 'G' }))[0].midi).toBe(66);
  });
  it('rests advance time without changing accidental state, including at a new measure', () => {
    const notes = resolveScore(score([
      note({ accidental: 1 }), note({ rest: true, accidental: 0 }), note(), note({ rest: true, accidental: -1 }),
      note({ rest: true, accidental: 1 }), note(),
    ]));
    expect(notes.map(n => n.midi)).toEqual([61, null, 61, null, null, 60]);
    expect(notes.map(n => n.frequency)).toEqual([midiToFrequency(61), null, midiToFrequency(61), null, null, midiToFrequency(60)]);
    expect(notes.map(n => n.startBeat)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(notes.map(n => n.measure)).toEqual([0, 0, 0, 0, 1, 1]);
  });
  it('resolves E-sharp, C-flat and B-sharp across octave boundaries', () => {
    const notes = resolveScore(score([note({ letter: 'E', accidental: 1 }), note({ accidental: -1 }), note({ letter: 'B', accidental: 1 })]));
    expect(notes.map(n => n.midi)).toEqual([65, 59, 72]);
    expect(notes.map(n => n.frequency)).toEqual([midiToFrequency(65), midiToFrequency(59), midiToFrequency(72)]);
  });
  it('resolves incomplete drafts without mutation or shared output events', () => {
    const melody = score([note({ accidental: 1 }), note()]);
    const original = JSON.stringify(melody);
    const resolved = resolveScore(melody);
    expect(resolved).toHaveLength(2);
    resolved[0].event.accidental = -1;
    expect(JSON.stringify(melody)).toBe(original);
    expect(scoreIssues(melody)).toEqual([{ code: 'incomplete', index: 1 }]);
  });
});

describe('draft validation and matching', () => {
  it('reports empty, incomplete, crossing-bar overflow and maximum event count', () => {
    expect(scoreIssues(score([]))).toEqual([{ code: 'empty', index: 0 }]);
    expect(scoreIssues(score([note({ duration: 'whole' })]))).toEqual([]);
    const overflowing = score([note({ duration: 'half', dotted: true }), note({ duration: 'half' })]);
    expect(scoreIssues(overflowing)).toEqual([{ code: 'overflow', index: 1 }, { code: 'incomplete', index: 1 }]);
    expect(resolveScore(overflowing)).toHaveLength(2);
    expect(scoreIssues(score(Array.from({ length: 17 }, () => note({ duration: 'sixteenth' }))))).toContainEqual({ code: 'too-long', index: 16 });
    expect(scoreIssues(score([note({ duration: 'whole' })], { meter: { beats: 3, unit: 4 } }))).toContainEqual({ code: 'overflow', index: 0 });
  });
  it('restricts written octaves and handles inherited out-of-range MIDI', () => {
    for (const event of [note({ octave: -1 }), note({ octave: 9 }), note({ letter: 'B', octave: 9 }), note({ octave: -1, rest: true })]) {
      expect(scoreIssues(score([event]))).toContainEqual({ code: 'out-of-range', index: 0 });
      expect(() => resolveScore(score([event]))).toThrow(RangeError);
    }
    expect(resolveScore(score([note({ letter: 'G', octave: 8 })]))[0].midi).toBe(115);
    expect(resolveScore(score([note({ letter: 'B', octave: 8, accidental: 1 })]))[0].midi).toBe(120);
    expect(resolveScore(score([note({ octave: 0 })]))[0].midi).toBe(12);
    expect(scoreIssues(score([note({ letter: 'G', octave: 9, accidental: 1 }), note({ letter: 'G', octave: 9 })]))).toEqual([
      { code: 'out-of-range', index: 0 }, { code: 'out-of-range', index: 1 }, { code: 'incomplete', index: 1 },
    ]);
  });
  it('intentionally throws RangeError for malformed inputs rather than looping', () => {
    for (const malformed of [null, {}, score([note({ duration: 'bogus' as Duration })]), score([note({ octave: NaN })]),
      score([note()], { meter: { beats: 0, unit: 4 } }), score([note()], { meter: { beats: Infinity, unit: 4 } }),
      score([note()], { clef: 'unknown' as Clef }), score([note()], { key: 'constructor' as Score['key'] })]) {
      expect(() => scoreIssues(malformed as Score)).toThrow(RangeError);
      expect(() => resolveScore(malformed as Score)).toThrow(RangeError);
    }
    expect(() => pitchAtStaffStep(.5, 'treble')).toThrow(RangeError);
    expect(() => staffStep('C', .5, 'treble')).toThrow(RangeError);
  });
  it('compares sounding pitches, rests and durations, not incidental notation or meter', () => {
    const a = score([note({ letter: 'F', accidental: 1 }), note({ rest: true })]);
    const b = score([note({ letter: 'F' }), note({ rest: true, letter: 'B', octave: 2 })], { key: 'G', clef: 'bass', meter: { beats: 2, unit: 4 } });
    expect(sameMelody(a, b)).toBe(true);
    expect(sameMelody(score([note({ letter: 'E', accidental: 1 })]), score([note({ letter: 'F' })]))).toBe(true);
    expect(sameMelody(a, score([note({ letter: 'F', accidental: 1 }), note()]))).toBe(false);
    expect(sameMelody(a, score([note({ letter: 'F', accidental: 1, dotted: true }), note({ rest: true })]))).toBe(false);
    expect(sameMelody(a, score([note({ letter: 'F', accidental: 1, octave: 5 }), note({ rest: true })]))).toBe(false);
    expect(sameMelody(a, score([note({ letter: 'F', accidental: 1 })]))).toBe(false);
  });
});
