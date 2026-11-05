import { describe, expect, it } from 'vitest';
import { Clef as VexClef, Flow, Stave } from 'vexflow';
import { staffGeometry, staffMarkup, staffNoteX, type NotationStyle } from '../src/melody/notation';
import { NotationContext } from '../src/melody/notation-context';
import { pitchAtStaffStep, resolvePart, type Clef, type NoteEvent, type Score } from '../src/melody/model';

const note = (patch: Partial<NoteEvent> = {}): NoteEvent => ({ letter: 'C', octave: 4, accidental: null, duration: 'quarter', dotted: false, rest: false, ...patch });
const score = (events: NoteEvent[], patch: Partial<Score> = {}): Score => ({ clef: 'treble', key: 'C', meter: { beats: 4, unit: 4 }, events, ...patch });
const styles: NotationStyle[] = ['print', 'handwritten'];
const clefs: Clef[] = ['treble', 'bass', 'alto', 'tenor'];
const group = (svg: string, className: string) => svg.match(new RegExp(`<g class="${className}"[^>]*>(.*?)</g>`, 's'))?.[1] ?? '';
const paths = (svg: string) => [...svg.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
const noteheads = (svg: string) => [...svg.matchAll(/<g class="vf-notehead"[^>]*>(.*?)<\/g>/gs)].map(match => match[1]);

function withFont<T>(style: NotationStyle, run: () => T): T {
  const previous = Flow.getMusicFont();
  Flow.setMusicFont(style === 'print' ? 'Bravura' : 'Petaluma');
  try { return run(); } finally { Flow.setMusicFont(...previous); }
}

describe.each(styles)('%s embedded normative engraving', style => {
  it.each(clefs)('engraves %s with the actual embedded clef outline and clef-relative geometry', clef => {
    const melody = score([note(pitchAtStaffStep(0, clef)), note(pitchAtStaffStep(4, clef)), note(pitchAtStaffStep(8, clef))], { clef });
    const geometry = staffGeometry(melody, style);
    const svg = staffMarkup(melody, 'en', 0, true, { style });
    expect(geometry.spacing).toBe(10);
    expect(geometry.notes.map(n => n.step)).toEqual([0, 4, 8]);
    expect(geometry.notes[0].y - geometry.notes[1].y).toBe(20);
    expect(geometry.notes[1].y - geometry.notes[2].y).toBe(20);
    const expected = withFont(style, () => {
      const context = new NotationContext();
      const stave = new Stave(32, geometry.notes[0].y - 80, 1000).setContext(context);
      stave.addClef(clef);
      stave.getNoteStartX();
      const modifier = stave.getModifiers().find(mod => mod instanceof VexClef)!;
      modifier.draw();
      return paths(context.markup());
    });
    expect(paths(group(svg, 'vf-clef'))).toEqual(expected);
    expect(svg).not.toMatch(/[\u{1D100}-\u{1D1FF}♯♭♮]/u);
    expect(svg).not.toContain('<text');
    expect(svg).not.toContain('NaN');
    expect(svg).toContain(`data-music-font="${style === 'print' ? 'Bravura' : 'Petaluma'}"`);
  });

  it('uses 3.5-space quarter stems, proper directions, and no stem for whole notes', () => {
    const melody = score([note(pitchAtStaffStep(0, 'treble')), note(pitchAtStaffStep(4, 'treble'))]);
    const svg = staffMarkup(melody, 'en', 0, false, { style });
    const stems = [...svg.matchAll(/<g class="vf-stem"><path d="M([\d.-]+) ([\d.-]+) L([\d.-]+) ([\d.-]+)"/g)];
    expect(stems).toHaveLength(2);
    const first = stems[0].slice(1).map(Number), second = stems[1].slice(1).map(Number);
    expect(first[0]).toBe(first[2]);
    expect(second[0]).toBe(second[2]);
    const geometry = staffGeometry(melody, style);
    expect(geometry.notes[0].y - first[3]).toBeCloseTo(35, 1);
    expect(second[3] - geometry.notes[1].y).toBeCloseTo(35, 1);
    const whole = staffMarkup(score([note({ duration: 'whole' })]), 'en', 0, false, { style });
    expect(whole).not.toContain('class="vf-stem"');
  });

  it.each(clefs)('delegates sharp and flat key placement to VexFlow for %s', clef => {
    for (const key of ['G', 'D', 'F', 'Bb'] as const) {
      const melody = score([note(pitchAtStaffStep(0, clef))], { key, clef });
      const geometry = staffGeometry(melody, style);
      const svg = staffMarkup(melody, 'en', 0, false, { style });
      const expected = withFont(style, () => {
        const context = new NotationContext();
        const stave = new Stave(32, geometry.notes[0].y - 80, 1000).setContext(context);
        stave.addClef(clef).addKeySignature(key).addTimeSignature('4/4');
        stave.getNoteStartX();
        const signature = stave.getModifiers().find(mod => mod.getCategory() === 'KeySignature')!;
        signature.draw();
        return paths(context.markup());
      });
      expect(paths(group(svg, 'vf-keysignature'))).toEqual(expected);
      expect(expected).toHaveLength(key === 'D' || key === 'Bb' ? 2 : 1);
    }
  });

  it('renders embedded normative rests, dotted notes, flags and ledger lines', () => {
    for (const duration of ['whole', 'half', 'quarter', 'eighth', 'sixteenth'] as const) {
      const melody = score([note({ duration, rest: true, dotted: true })]);
      const svg = staffMarkup(melody, 'en', 0, true, { style });
      const geometry = staffGeometry(melody, style);
      expect(geometry.notes).toHaveLength(1);
      expect(svg).toContain('data-pitch="0"');
      expect(group(svg, 'vf-notehead')).toContain('<path');
      expect(svg).not.toContain('class="vf-stem"');
      expect(paths(noteheads(svg)[0])).toHaveLength(2);
      expect(noteheads(svg)[0]).toContain('A2 2');
    }
    const high = score([note(pitchAtStaffStep(14, 'treble'))]);
    expect(staffGeometry(high, style).notes[0].step).toBe(14);
    const ledgerSvg = staffMarkup(high, 'en', 0, false, { style });
    const ledgerLines = [...ledgerSvg.matchAll(/<path d="M([\d.-]+) ([\d.-]+) L([\d.-]+) ([\d.-]+)"[^>]*stroke-width="1.4"/g)];
    expect(ledgerLines).toHaveLength(3);
    for (const line of ledgerLines) expect(Number(line[2])).toBe(Number(line[4]));
    const low = score([note(pitchAtStaffStep(-8, 'treble'))]);
    expect(staffGeometry(low, style).notes[0].y).toBeLessThan(staffGeometry(low, style).height - 40);
    for (const duration of ['eighth', 'sixteenth'] as const) {
      const quarter = staffMarkup(score([note({ letter: 'E' })]), 'en', 0, false, { style });
      const flagged = staffMarkup(score([note({ letter: 'E', duration })]), 'en', 0, false, { style });
      expect(paths(flagged).length).toBe(paths(quarter).length + 1);
    }
  });

  it('preserves primary/chord pitch order, offsets adjacent noteheads, and places all accidentals', () => {
    const melody = score([note({ letter: 'E', accidental: 0, dotted: true, chord: [
      { letter: 'C', octave: 4, accidental: 1 }, { letter: 'D', octave: 4, accidental: -1 }, { letter: 'F', octave: 4, accidental: 1 },
    ] })]);
    const geometry = staffGeometry(melody, style);
    const pitches = geometry.notes;
    expect(pitches.map(p => p.pitch)).toEqual([0, 1, 2, 3]);
    expect(pitches.map(p => p.step)).toEqual([0, -2, -1, 1]);
    expect(pitches[1].x).not.toBe(pitches[2].x);
    expect(pitches[0].x).not.toBe(pitches[3].x);
    expect(staffNoteX(melody, 0, 0, style)).toBe(pitches[0].x);
    const svg = staffMarkup(melody, 'en', 0, true, { style, pitch: 2 });
    expect(noteheads(svg)).toHaveLength(4);
    for (const head of noteheads(svg)) {
      expect(paths(head)).toHaveLength(3);
      expect(head).toContain('A2 2');
    }
    expect(svg).toContain('id="score-note-0"');
    for (let pitch = 1; pitch < 4; pitch++) expect(svg).toContain(`id="score-note-0-0-${pitch}"`);
    expect(svg).toMatch(/id="score-note-0-0-2"[^>]*aria-pressed="true"/);
    expect(svg).toMatch(/id="score-note-0"[^>]*aria-pressed="false"/);
  });

  it('preserves original pitch indices when engraving unordered chords', () => {
    const melody = score([note({ letter: 'G', octave: 4, chord: [
      { letter: 'D', octave: 4, accidental: -1 },
      { letter: 'A', octave: 4, accidental: 1 },
      { letter: 'E', octave: 4, accidental: 0 },
    ] })]);
    const geometry = staffGeometry(melody, style);
    expect(geometry.notes.map(target => target.pitch)).toEqual([0, 1, 2, 3]);
    expect(geometry.notes.map(target => target.step)).toEqual([2, -1, 3, 0]);
    geometry.notes.forEach(target => expect(target.y).toBeCloseTo(geometry.notes[0].y - (target.step - 2) * 5, 5));
    const svg = staffMarkup(melody, 'en', 0, true, { style, pitch: 2 });
    expect(svg).toMatch(/id="score-note-0-0-2"[^>]*aria-pressed="true"[^>]*aria-label="[^"]*A#4/);
    expect(noteheads(svg).map(head => paths(head).length)).toEqual([1, 2, 2, 2]);
  });

  it('engraves beams and exact 3:2 triplet glyphs without altering timing', () => {
    const melody = score(Array.from({ length: 6 }, (_, index) => note({ ...pitchAtStaffStep(index, 'treble'), duration: 'eighth', tuplet: 3 })));
    const svg = staffMarkup(melody, 'en', 0, true, { style });
    expect(svg.match(/class="vf-tuplet"/g)).toHaveLength(2);
    expect(svg.match(/class="vf-beam"/g)).toHaveLength(2);
    expect(svg).not.toContain('incomplete-tuplet');
    expect(resolvePart(melody).map(n => n.startBeat)).toEqual([0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3]);
    expect(staffGeometry(melody, style).notes.map(n => n.x)).toEqual([...staffGeometry(melody, style).notes.map(n => n.x)].sort((a, b) => a - b));
    const quarters = score(Array.from({ length: 3 }, () => note({ tuplet: 3 })));
    const quarterSvg = staffMarkup(quarters, 'en', 0, false, { style });
    expect(quarterSvg).toContain('class="vf-tuplet"');
    expect(quarterSvg).not.toContain('class="vf-beam"');
    expect(group(quarterSvg, 'vf-tuplet')).toContain('<rect');
  });

  it('synchronizes beat columns across four clefs and unequal-duration parts', () => {
    const melody = score(Array.from({ length: 4 }, () => note(pitchAtStaffStep(0, 'treble'))), { parts: [
      { clef: 'bass', events: Array.from({ length: 8 }, () => note({ ...pitchAtStaffStep(0, 'bass'), duration: 'eighth' })) },
      { clef: 'alto', events: Array.from({ length: 2 }, () => note({ ...pitchAtStaffStep(0, 'alto'), duration: 'half' })) },
      { clef: 'tenor', events: [note({ ...pitchAtStaffStep(0, 'tenor'), duration: 'whole' })] },
    ] });
    const geometry = staffGeometry(melody, style);
    const at = (part: number, index: number) => geometry.notes.find(n => n.part === part && n.index === index)!;
    for (let i = 0; i < 4; i++) expect(at(0, i).x).toBeCloseTo(at(1, i * 2).x, 2);
    expect(at(0, 0).x).toBeCloseTo(at(2, 0).x, 2);
    expect(at(0, 2).x).toBeCloseTo(at(2, 1).x, 2);
    // Whole-note heads have a wider glyph; their tick/stem column is shared, not their center.
    expect(Math.abs(at(0, 0).x - at(3, 0).x)).toBeLessThan(10);
    expect(at(0, 0).y).toBeLessThan(at(1, 0).y);
    expect(at(1, 0).y).toBeLessThan(at(2, 0).y);
    expect(at(2, 0).y).toBeLessThan(at(3, 0).y);
    expect(at(3, 0).y).toBeLessThan(geometry.height);
    expect(staffNoteX(melody, 2, 1, style)).toBe(at(1, 2).x);
    const svg = staffMarkup(melody, 'en', 0, true, { style, part: 2 });
    expect(svg.match(/class="vf-clef"/g)).toHaveLength(4);
    expect(svg).toContain('id="score-note-2-0-0"');
    expect(svg).toMatch(/id="score-note-2-0-0"[^>]*aria-pressed="true"/);
  });

  it('renders all dynamic glyphs, score dynamics, and whole-score repeat barlines', () => {
    const melody = score(['pp', 'p', 'mp', 'mf', 'f', 'ff'].map(dynamic => note({ dynamic: dynamic as NoteEvent['dynamic'] })), { repeat: true, dynamic: 'mp' });
    const svg = staffMarkup(melody, 'en', 0, false, { style });
    for (const dynamic of ['pp', 'p', 'mp', 'mf', 'f', 'ff']) expect(group(svg, `vf-dynamic dynamic-${dynamic}`)).toContain('<path');
    const plain = staffMarkup({ ...melody, repeat: false }, 'en', 0, false, { style });
    expect(svg).not.toBe(plain);
    expect(svg.match(/ A2 2 /g)?.length).toBeGreaterThanOrEqual(8);
    expect(staffMarkup(score([note()], { dynamic: 'pp' }), 'en', 0, false, { style })).toContain('dynamic-pp');
  });
});

describe('notation API, accessibility, headless rendering, and font isolation', () => {
  it('runs without document, uses embedded outlines only, and restores global font state', () => {
    expect(typeof document).toBe('undefined');
    const original = Flow.getMusicFont();
    const melody = score([note(), note({ letter: 'D', accidental: 1, duration: 'eighth' })], { key: 'Bb' });
    const print = staffMarkup(melody, 'en', 0, true, { style: 'print' });
    const handwritten = staffMarkup(melody, 'en', 0, true, { style: 'handwritten' });
    expect(print).not.toBe(handwritten);
    expect(paths(group(print, 'vf-clef'))).not.toEqual(paths(group(handwritten, 'vf-clef')));
    expect(staffMarkup(melody, 'en', 0, true, { style: 'print' })).toBe(print);
    expect(staffMarkup(melody, 'en', 0, true, { style: 'handwritten' })).toBe(handwritten);
    expect(Flow.getMusicFont()).toEqual(original);
    expect((print + handwritten).replaceAll('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:\/\/|@font-face|<image|<foreignObject/);
    expect(() => staffGeometry({ ...melody, clef: 'wrong' as Clef }, 'handwritten')).toThrow();
    expect(Flow.getMusicFont()).toEqual(original);
    expect(() => staffGeometry(melody, 'wrong' as NotationStyle)).toThrow(RangeError);
  });

  it('returns defensive, score-sensitive geometry and real notehead centers', () => {
    const melody = score([note(), note({ letter: 'D' })]);
    const initial = staffGeometry(melody);
    const originalX = initial.notes[0].x;
    initial.notes[0].x = -100;
    expect(staffGeometry(melody).notes[0].x).toBe(originalX);
    expect(staffNoteX(melody, 0)).toBe(originalX);
    const y = staffGeometry(melody).notes[0].y;
    melody.events[0].letter = 'B';
    expect(staffGeometry(melody).notes[0].y).toBeLessThan(y);
    const svg = staffMarkup(melody, 'en', 0);
    for (const target of staffGeometry(melody).notes) expect(svg).toContain(`cx="${target.x}" cy="${target.y}"`);
    expect(originalX).toBeGreaterThan(32);
  });

  it('keeps full-sized notation scrollable and creates accessible 44px targets plus precise pitch spots', () => {
    const melody = score(Array.from({ length: 64 }, () => note({ duration: 'sixteenth' })));
    const geometry = staffGeometry(melody);
    expect(geometry.width).toBeGreaterThan(1000);
    const svg = staffMarkup(melody, 'en', 3);
    expect(svg).toContain(`viewBox="0 0 ${geometry.width} ${geometry.height}"`);
    expect(svg).toContain(`min-width:${geometry.width}px;max-width:none`);
    expect(svg).not.toContain('scale(');
    expect(svg.match(/width="44" height="44"/g)).toHaveLength(64);
    expect(svg.match(/class="score-note(?: selected)?"/g)).toHaveLength(64);
    expect(svg.match(/notehead-target/g)).toHaveLength(64);
    expect(svg).toMatch(/id="score-note-3"[^>]*data-index="3" data-part="0" data-pitch="0"[^>]*role="button" tabindex="0" aria-pressed="true" aria-label="[^"]+"/);
    const passive = staffMarkup(melody, 'en', 3, false);
    expect(passive).toContain('aria-hidden="true"');
    expect(passive).not.toContain('score-note');
    expect(passive).not.toContain('role="button"');
    expect(passive).not.toContain('tabindex');
  });

  it('provides exactly one nonnested editable group and one isolated glyph per pitch', () => {
    const melody = score([note({ chord: [
      { letter: 'D', octave: 4, accidental: 1 },
      { letter: 'E', octave: 4, accidental: 0 },
    ] }), note({ rest: true })], { parts: [{ clef: 'bass', events: [note({ letter: 'G', octave: 2 })] }] });
    const svg = staffMarkup(melody, 'en', 0, true, { pitch: 1 });
    const targets = [...svg.matchAll(/<g (class="score-note[^"]*"[^>]*)>(.*?)<\/g>/gs)];
    expect(targets).toHaveLength(staffGeometry(melody).notes.length);
    expect(svg.match(/class="score-note(?: selected)?"/g)).toHaveLength(targets.length);
    expect(svg.match(/role="button"/g)).toHaveLength(targets.length);
    for (const [, attributes, contents] of targets) {
      expect(attributes).toContain('tabindex="0"');
      expect(contents).toContain('width="44" height="44"');
      expect(contents).toContain('class="notehead-target"');
      expect(contents).toContain('clip-path="url(#score-hit-');
      expect(contents).not.toMatch(/score-note|role="button"|tabindex|data-index/);
    }
    for (const target of staffGeometry(melody).notes) {
      const id = `score-glyph-${target.part}-${target.index}-${target.pitch}`;
      const glyphs = [...svg.matchAll(new RegExp(`<g class="vf-notehead" id="${id}">(.*?)</g>`, 'gs'))];
      expect(glyphs).toHaveLength(1);
      expect(glyphs[0][1]).toContain('<path');
      expect(glyphs[0][1]).not.toContain('vf-notehead');
    }
  });

  it('engraves incomplete/empty drafts and never substitutes approximate glyphs', () => {
    expect(staffGeometry(score([])).notes).toEqual([]);
    expect(staffMarkup(score([]), 'en', -1)).toContain('vf-clef');
    const partial = score([note({ tuplet: 3 }), note({ tuplet: 3 })], { parts: [{ clef: 'bass', events: [] }] });
    expect(staffMarkup(partial, 'en', 0)).toContain('incomplete-tuplet');
    expect(staffGeometry(partial).notes).toHaveLength(2);
  });
});
