import { describe, expect, it } from 'vitest';
import { durationBeats, measureBeats, midiToFrequency, partCount, pitchAtStaffStep, resolvePart, resolvePerformance, resolveScore, sameMelody, scoreIssues, staffStep, totalBeats,
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
    expect(scoreIssues(score(Array.from({ length: 65 }, () => note({ duration: 'sixteenth' }))))).toContainEqual({ code: 'too-long', index: 64 });
    expect(scoreIssues(score(Array.from({ length: 64 }, () => note({ duration: 'sixteenth' }))))).toEqual([]);
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

describe('polyphonic performance contract', () => {
  const pitch = (patch: Partial<NoteEvent> = {}) => {
    const value = note(patch);
    return { letter: value.letter, octave: value.octave, accidental: value.accidental };
  };
  it('resolves primary-first chords, octave-scoped chord accidentals and resets at bars', () => {
    const melody = score([
      note({ letter: 'F', accidental: 0, chord: [pitch({ letter: 'A' }), pitch({ letter: 'F', octave: 5, accidental: -1 })] }),
      note({ letter: 'F', chord: [pitch({ letter: 'F', octave: 5 })] }),
      note({ duration: 'half', rest: true, chord: [pitch({ accidental: 1 })] }),
      note({ letter: 'F', chord: [pitch({ letter: 'F', octave: 5 })] }),
    ], { key: 'G' });
    const resolved = resolveScore(melody);
    expect(resolved.map(event => event.pitches.map(pitch => pitch.midi))).toEqual([[65, 69, 76], [65, 76], [], [66, 78]]);
    expect(resolved[0].pitches[0]).toMatchObject({ letter: 'F', octave: 4, accidental: 0, midi: 65, frequency: midiToFrequency(65), staffStep: 1 });
    expect(resolved[0].midi).toBe(resolved[0].pitches[0].midi);
    expect(resolved[2].midi).toBeNull(); expect(resolved[2].frequency).toBeNull();
    const original = JSON.stringify(melody);
    resolved[0].event.chord![0].accidental = 1;
    resolved[0].pitches[0].letter = 'B';
    expect(JSON.stringify(melody)).toBe(original);
  });
  it('applies simultaneous explicit accidentals consistently within a chord', () => {
    const resolved = resolveScore(score([note({ chord: [pitch({ accidental: 1 })] }), note()]));
    expect(resolved.map(event => event.pitches.map(pitch => pitch.midi))).toEqual([[61, 61], [61]]);
  });
  it('keeps accidental and dynamic state independent for every staff, including rest markings', () => {
    const melody = score([note({ accidental: 1, dynamic: 'f' }), note({ rest: true, dynamic: 'p' }), note(), note(), note()], {
      dynamic: 'mp', parts: [{ clef: 'bass', events: [note(), note({ dynamic: 'ff' }), note(), note(), note()] }],
    });
    expect(partCount(melody)).toBe(2);
    expect(resolvePart(melody, 0).map(event => event.midi)).toEqual([61, null, 61, 61, 60]);
    expect(resolvePart(melody, 1).map(event => event.midi)).toEqual([60, 60, 60, 60, 60]);
    expect(resolvePart(melody, 0).map(event => event.dynamic)).toEqual(['f', 'p', 'p', 'p', 'p']);
    expect(resolvePart(melody, 1).map(event => event.dynamic)).toEqual(['mp', 'ff', 'ff', 'ff', 'ff']);
    expect(resolvePart(melody, 1)[0].staffStep).toBe(staffStep('C', 4, 'bass'));
    expect(() => resolvePart(melody, 2)).toThrow(RangeError);
    expect(() => resolvePart(melody, -1)).toThrow(RangeError);
  });
  it('uses exact tick timing for triplets, rests, bar boundaries and complete groups', () => {
    const melody = score(Array.from({ length: 24 }, (_, index) => note({ duration: 'eighth', tuplet: 3, rest: index % 3 === 1 })));
    const resolved = resolveScore(melody);
    expect(scoreIssues(melody)).toEqual([]);
    expect(totalBeats(melody)).toBe(8);
    expect(resolved.map(event => event.startBeat)).toEqual(Array.from({ length: 24 }, (_, i) => i / 3));
    expect(resolved[12].startBeat).toBe(4); expect(resolved[12].measure).toBe(1);
    expect(durationBeats(note({ duration: 'quarter', tuplet: 3 }))).toBe(2 / 3);
    expect(durationBeats(note({ duration: 'eighth', dotted: true, tuplet: 3 }))).toBe(.5);
    const resets = score([...Array.from({ length: 12 }, (_, index) => note({ duration: 'eighth', tuplet: 3, accidental: index === 0 ? 1 : null })), note()]);
    expect(resolveScore(resets)[12].midi).toBe(60);
  });
  it('reports partial, unequal and crossing-bar tuplet groups without throwing on drafts', () => {
    const drafts = [
      score([note({ tuplet: 3 }), note()]),
      score([note({ tuplet: 3 }), note({ tuplet: 3, duration: 'eighth' }), note({ tuplet: 3 })]),
      score([note({ duration: 'half', dotted: true }), ...Array.from({ length: 3 }, () => note({ tuplet: 3 }))]),
    ];
    for (const draft of drafts) {
      expect(scoreIssues(draft).some(issue => issue.code === 'tuplet')).toBe(true);
      expect(() => resolveScore(draft)).not.toThrow();
      expect(resolvePerformance(draft).every(moment => moment.durationBeats > 0)).toBe(true);
    }
  });
  it('groups simultaneous onsets, includes rest references and preserves each new attack duration', () => {
    const melody = score([note({ duration: 'half', chord: [pitch({ letter: 'E' })] }), note({ duration: 'half', rest: true })], {
      parts: [{ clef: 'bass', events: [note({ duration: 'quarter', rest: true }), note({ letter: 'G' }), note({ duration: 'half', letter: 'B' })] }],
    });
    const moments = resolvePerformance(melody);
    expect(moments.map(moment => [moment.index, moment.startBeat, moment.durationBeats, moment.rest, moment.pass])).toEqual([
      [0, 0, 1, false, 0], [1, 1, 1, false, 0], [2, 2, 2, false, 0],
    ]);
    expect(moments[0].events).toEqual([{ part: 0, index: 0 }, { part: 1, index: 0 }]);
    expect(moments[0].pitches.map(pitch => [pitch.midi, pitch.part, pitch.eventIndex, pitch.pitchIndex, pitch.durationBeats, pitch.dynamic])).toEqual([
      [60, 0, 0, 0, 2, 'mf'], [64, 0, 0, 1, 2, 'mf'],
    ]);
    expect(moments[1].pitches.map(pitch => pitch.midi)).toEqual([67]);
    expect(moments[2].events).toEqual([{ part: 0, index: 1 }, { part: 1, index: 2 }]);
    const restOnset = resolvePerformance(score([note({ duration: 'whole' })], { parts: [{ clef: 'bass', events: [note(), note({ rest: true })] }] }))[1];
    expect(restOnset.rest).toBe(true); expect(restOnset.pitches).toEqual([]);
    expect(restOnset.durationBeats).toBe(3);
  });
  it('repeats exactly twice with longest-part offsets and identical reset state', () => {
    const melody = score([note({ accidental: 1 }), note({ dynamic: 'ff' })], {
      repeat: true, dynamic: 'p', parts: [{ clef: 'bass', events: [note({ duration: 'whole' })] }],
    });
    const moments = resolvePerformance(melody);
    expect(totalBeats(melody)).toBe(8);
    expect(moments.map(moment => [moment.startBeat, moment.durationBeats, moment.pass])).toEqual([[0, 1, 0], [1, 3, 0], [4, 1, 1], [5, 3, 1]]);
    expect(moments[2].pitches).toEqual(moments[0].pitches);
    expect(moments[3].pitches).toEqual(moments[1].pitches);
    expect(scoreIssues(melody)).toContainEqual({ code: 'voices', index: 0 });
  });
  it('validates all staff caps and chord tones without rejecting musical drafts structurally', () => {
    const four = score([note()], { parts: Array.from({ length: 3 }, () => ({ clef: 'bass' as const, events: [note()] })) });
    expect(partCount(four)).toBe(4);
    expect(scoreIssues(four).some(issue => issue.code === 'voices')).toBe(false);
    const five = { ...four, parts: [...four.parts!, { clef: 'bass' as const, events: [note()] }] };
    expect(scoreIssues(five)).toContainEqual({ code: 'voices', index: 0 });
    expect(scoreIssues(score([note({ chord: Array.from({ length: 4 }, () => pitch()) })]))).toContainEqual({ code: 'voices', index: 0 });
    const tooLong = score([note()], { parts: [{ clef: 'bass', events: Array.from({ length: 65 }, () => note()) }] });
    expect(scoreIssues(tooLong)).toContainEqual({ code: 'too-long', index: 64, part: 1 });
    const outside = score([note({ chord: [pitch({ octave: 9 })] })]);
    expect(scoreIssues(outside)).toContainEqual({ code: 'out-of-range', index: 0 });
    expect(() => resolvePerformance(outside)).toThrow(RangeError);
    expect(totalBeats(score([]))).toBe(0); expect(resolvePerformance(score([]))).toEqual([]);
  });
  it('rejects malformed optional contract fields intentionally', () => {
    for (const malformed of [score([note({ chord: [pitch({ accidental: 2 as 1 })] })]), score([note({ tuplet: 2 as 3 })]),
      score([note({ dynamic: 'loud' as 'f' })]), score([note()], { parts: [{}] as Score['parts'] }),
      score([note()], { dynamic: 'loud' as 'f' }), score([note()], { repeat: 1 as unknown as boolean })]) {
      expect(() => scoreIssues(malformed)).toThrow(RangeError);
      expect(() => resolvePerformance(malformed)).toThrow(RangeError);
    }
  });
  it('matches complete polyphonic pitch, timing, dynamics and repeat semantics independent of notation', () => {
    const a = score([note({ chord: [pitch({ letter: 'E' })] })], { parts: [{ clef: 'bass', events: [note({ letter: 'G' })] }] });
    const b = score([note({ letter: 'G', chord: [pitch({ letter: 'E' }), pitch()] })], { clef: 'alto', meter: { beats: 1, unit: 4 } });
    expect(sameMelody(a, b)).toBe(true);
    expect(sameMelody(a, { ...a, parts: [{ clef: 'bass', events: [note({ letter: 'A' })] }] })).toBe(false);
    expect(sameMelody(a, { ...a, events: [note({ chord: [pitch({ letter: 'F' })] })] })).toBe(false);
    expect(sameMelody(a, { ...a, dynamic: 'f' })).toBe(false);
    expect(sameMelody(a, { ...a, repeat: true })).toBe(false);
    expect(sameMelody({ ...a, repeat: true }, { ...b, repeat: true })).toBe(true);
    expect(sameMelody(score([note()], { repeat: true }), score([note(), note()]))).toBe(false);
    expect(sameMelody(a, { ...a, parts: [{ clef: 'bass', events: [note({ letter: 'G', duration: 'half' })] }] })).toBe(false);
  });
});
