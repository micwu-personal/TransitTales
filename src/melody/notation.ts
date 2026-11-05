import { Accidental, BarlineType, Beam, Dot, Flow, Formatter, Glyph, Stave, StaveConnector, StaveNote, TextDynamics, Tuplet, Voice } from 'vexflow';
import { measureBeats, resolvePart, type Score, type ResolvedNote, type Clef, type Dynamic } from './model';
import { NotationContext } from './notation-context';
import { melodyCopy, durationName } from './locale';
import type { Language } from '../rush/locale';

export function escapeText(value: string): string { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
export function resolvedLabel(note: ResolvedNote, language: Language): string {
  if (note.midi === null) return melodyCopy(language).silent;
  const naturalMidi = 12 * (note.event.octave + 1) + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[note.event.letter];
  const difference = note.midi - naturalMidi;
  return `${note.event.letter}${difference === 1 ? '♯' : difference === -1 ? '♭' : ''}${note.event.octave}`;
}

export type NotationStyle = 'print' | 'handwritten';
export type StaffGeometry = {
  width: number; height: number; spacing: number;
  notes: { part: number; index: number; pitch: number; x: number; y: number; step: number }[];
};
type EngravedEvent = { part: number; resolved: ResolvedNote; note: StaveNote };
type EngravedMeasure = { staves: Stave[]; voices: Voice[]; formatter: Formatter; events: EngravedEvent[]; beams: Beam[]; tuplets: Tuplet[]; width: number };
type Engraving = { key: string; geometry: StaffGeometry; artwork: string; parts: ResolvedNote[][] };
const spacing = 10;
const cache = new Map<NotationStyle, Engraving>();
const durationCodes = { whole: 'w', half: 'h', quarter: 'q', eighth: '8', sixteenth: '16' } as const;

function styleName(style: NotationStyle): string {
  if (style !== 'print' && style !== 'handwritten') throw new RangeError('Unsupported notation style');
  return style === 'handwritten' ? 'Petaluma' : 'Bravura';
}
function createNote(resolved: ResolvedNote, clef: Clef): StaveNote {
  const { event } = resolved;
  const note = new StaveNote({
    clef, keys: event.rest ? ['r/4'] : resolved.pitches.map(pitch => `${pitch.letter.toLowerCase()}/${pitch.octave}`),
    duration: `${durationCodes[event.duration]}${event.rest ? 'r' : ''}`,
    dots: event.dotted ? 1 : 0, auto_stem: true,
  });
  if (event.dotted) Dot.buildAndAttach([note], { all: true });
  if (!event.rest) [event, ...(event.chord ?? [])].forEach((pitch, index) => {
    if (pitch.accidental !== null) note.addModifier(new Accidental(pitch.accidental === 1 ? '#' : pitch.accidental === -1 ? 'b' : 'n'), index);
  });
  return note;
}
function addTuplets(events: EngravedEvent[]): Tuplet[] {
  const tuplets: Tuplet[] = [];
  for (let i = 0; i < events.length;) {
    const event = events[i].resolved.event;
    if (event.tuplet !== 3) { i++; continue; }
    const notes: StaveNote[] = [];
    do {
      notes.push(events[i++].note);
    } while (notes.length < 3 && i < events.length && events[i].resolved.event.tuplet === 3
      && events[i].resolved.event.duration === event.duration && events[i].resolved.event.dotted === event.dotted);
    // Partial draft groups retain their written 3:2 ratio; scoreIssues identifies incompleteness.
    tuplets.push(new Tuplet(notes, { num_notes: 3, notes_occupied: 2, bracketed: true, ratioed: false }));
  }
  return tuplets;
}
function drawDynamic(context: NotationContext, dynamic: Dynamic, x: number, y: number): void {
  context.openGroup(`dynamic dynamic-${dynamic}`);
  for (const letter of dynamic) {
    const spec = TextDynamics.GLYPHS[letter];
    new Glyph(spec.code, Flow.NOTATION_FONT_SCALE, { category: 'textNote' }).render(context, x, y);
    x += spec.width;
  }
  context.closeGroup();
}

function engrave(score: Score, style: NotationStyle): Engraving {
  const font = styleName(style);
  const key = JSON.stringify(score);
  const cached = cache.get(style);
  if (cached?.key === key) return cached;
  const previousFont = Flow.getMusicFont();
  // VexFlow fonts and glyph metrics are global. Finish all drawing/geometry synchronously,
  // and restore the caller's font stack; cached output never contains live VexFlow objects.
  Flow.setMusicFont(font);
  try {
    const definitions = [{ clef: score.clef, events: score.events }, ...(score.parts ?? [])];
    const parts = definitions.map((_part, index) => resolvePart(score, index));
    const bar = measureBeats(score.meter);
    let bottom = 0;
    const rows = parts.map(notes => {
      const steps = notes.flatMap(note => note.pitches.map(pitch => pitch.staffStep));
      const low = Math.min(0, ...steps), high = Math.max(8, ...steps);
      const y = bottom + Math.max(20, (high - 8) * spacing / 2 + 20);
      const staffBottom = y + 8 * spacing;
      const dynamicY = staffBottom + Math.max(65, -low * spacing / 2 + 65);
      bottom = dynamicY + 40;
      return { y, dynamicY };
    });
    const context = new NotationContext();
    const count = Math.max(1, ...parts.flatMap(notes => notes.map(note => note.measure + 1)));
    const measures: EngravedMeasure[] = [];
    for (let measure = 0; measure < count; measure++) {
      const staves = definitions.map((part, index) => {
        const stave = new Stave(32, rows[index].y, 1000, { spacing_between_lines_px: spacing });
        stave.setContext(context).setStyle({ fillStyle: 'currentColor', strokeStyle: 'currentColor' });
        stave.setDefaultLedgerLineStyle({ strokeStyle: 'currentColor', lineWidth: 1.4 });
        if (measure === 0) stave.addClef(part.clef).addKeySignature(score.key).addTimeSignature(`${score.meter.beats}/${score.meter.unit}`);
        stave.setBegBarType(measure === 0 ? score.repeat ? BarlineType.REPEAT_BEGIN : BarlineType.SINGLE : BarlineType.NONE);
        stave.setEndBarType(measure === count - 1 ? score.repeat ? BarlineType.REPEAT_END : BarlineType.END : BarlineType.SINGLE);
        return stave;
      });
      const formatter = new Formatter();
      const events: EngravedEvent[] = [], voices: Voice[] = [], tuplets: Tuplet[] = [], beams: Beam[] = [];
      parts.forEach((part, partIndex) => {
        const entries = part.filter(note => note.measure === measure).map(resolved => {
          const note = createNote(resolved, definitions[partIndex].clef).setStave(staves[partIndex]).setContext(context);
          return { part: partIndex, resolved, note };
        });
        events.push(...entries);
        tuplets.push(...addTuplets(entries));
        if (!entries.length) return;
        const voice = new Voice({ num_beats: score.meter.beats, beat_value: score.meter.unit }).setMode(Voice.Mode.SOFT);
        voice.addTickables(entries.map(entry => entry.note)).setStave(staves[partIndex]);
        voices.push(voice);
        formatter.joinVoices([voice]);
        beams.push(...Beam.generateBeams(entries.map(entry => entry.note), {
          groups: Beam.getDefaultBeamGroups(`${score.meter.beats}/${score.meter.unit}`), beam_rests: false,
        }));
      });
      tuplets.forEach(tuplet => {
        const notes = tuplet.getNotes() as StaveNote[];
        tuplet.setBracketed(notes.length !== 3 || !notes.every(note => note.getBeam() === notes[0].getBeam() && note.getBeam()));
      });
      Stave.formatBegModifiers(staves);
      const prefix = Math.max(...staves.map(stave => stave.getNoteStartX())) - 32;
      const minimum = voices.length ? formatter.preCalculateMinTotalWidth(voices) : 0;
      const onsets = new Set(events.map(entry => Math.round(entry.resolved.startBeat * 24)));
      const width = prefix + Math.max(180, minimum + onsets.size * 44, bar * 64) + 36;
      measures.push({ staves, voices, formatter, events, beams, tuplets, width });
    }
    const naturalWidth = measures.reduce((sum, measure) => sum + measure.width, 0) + 64;
    measures[measures.length - 1].width += Math.max(0, 710 - naturalWidth);
    let x = 32;
    const geometry: StaffGeometry = { width: Math.max(710, naturalWidth), height: bottom, spacing, notes: [] };
    measures.forEach(measure => {
      measure.staves.forEach(stave => stave.setX(x).setWidth(measure.width));
      Stave.formatBegModifiers(measure.staves);
      const start = Math.max(...measure.staves.map(stave => stave.getNoteStartX()));
      measure.staves.forEach(stave => stave.setNoteStartX(start));
      const end = Math.min(...measure.staves.map(stave => stave.getNoteEndX()));
      if (measure.voices.length) measure.formatter.format(measure.voices, end - start - 24, { context });
      measure.staves.forEach(stave => stave.draw());
      if (measure.staves.length > 1) {
        new StaveConnector(measure.staves[0], measure.staves[measure.staves.length - 1]).setType('singleLeft').setContext(context).draw();
        if (x === 32) new StaveConnector(measure.staves[0], measure.staves[measure.staves.length - 1]).setType('bracket').setContext(context).draw();
      }
      measure.events.forEach(entry => {
        const { note, resolved, part } = entry;
        context.openGroup(`event event-${part}-${resolved.index} duration-${resolved.event.duration}${resolved.event.dotted ? ' dotted' : ''}`);
        note.noteHeads.forEach((head, pitch) => head.setAttribute('id', `score-glyph-${part}-${resolved.index}-${pitch}`));
        note.draw();
        context.closeGroup();
        const staffBottom = measure.staves[part].getYForLine(4);
        note.noteHeads.forEach((head, pitch) => {
          geometry.notes.push({ part, index: resolved.index, pitch,
            x: head.getAbsoluteX() + head.getWidth() / 2, y: head.getY(),
            step: resolved.event.rest ? (staffBottom - head.getY()) * 2 / spacing : resolved.pitches[pitch].staffStep });
        });
        const dynamic = resolved.event.dynamic ?? (resolved.index === 0 ? score.dynamic : undefined);
        if (dynamic) drawDynamic(context, dynamic, note.getNoteHeadBeginX(), rows[part].dynamicY);
      });
      measure.beams.forEach(beam => beam.setContext(context).draw());
      measure.tuplets.forEach(tuplet => {
        context.openGroup(`tuplet${tuplet.getNotes().length === 3 ? '' : ' incomplete-tuplet'}`);
        tuplet.setContext(context).draw();
        context.closeGroup();
      });
      x += measure.width;
    });
    geometry.notes.sort((a, b) => a.part - b.part || a.index - b.index || a.pitch - b.pitch);
    const engraving = { key, geometry, artwork: context.markup(), parts };
    cache.set(style, engraving);
    return engraving;
  } finally { Flow.setMusicFont(...previousFont); }
}

/** Full-sized SVG viewBox units: spacing is 10 per staff space, and 5 per diatonic step. */
export function staffGeometry(score: Score, style: NotationStyle = 'print'): StaffGeometry {
  const geometry = engrave(score, style).geometry;
  return { ...geometry, notes: geometry.notes.map(note => ({ ...note })) };
}
export function staffNoteX(score: Score, index: number, part = 0, style: NotationStyle = 'print'): number {
  const engraving = engrave(score, style);
  return engraving.geometry.notes.find(note => note.part === part && note.index === index && note.pitch === 0)?.x ?? engraving.geometry.width - 32;
}
export function staffMarkup(score: Score, language: Language, selected: number, interactive = true,
  options: { style?: NotationStyle; part?: number; pitch?: number } = {}): string {
  const style = options.style ?? 'print';
  const { geometry, artwork, parts } = engrave(score, style);
  const { width, height } = geometry;
  const targetAttributes = (target: StaffGeometry['notes'][number]): string => {
    const note = parts[target.part][target.index];
    const pitch = note.pitches[target.pitch];
    const label = `${target.part + 1}.${target.index + 1}.${target.pitch + 1}. ${pitch ? `${pitch.letter}${pitch.accidental === 1 ? '#' : pitch.accidental === -1 ? 'b' : ''}${pitch.octave}` : melodyCopy(language).silent} · ${durationName(language, note.event.duration)}${note.event.dotted ? ' · ×1.5' : ''}${note.event.tuplet ? ' · 3:2' : ''}${pitch ? ` · ${pitch.frequency.toFixed(3)} Hz` : ''}`;
    const pressed = selected === target.index && (options.part ?? 0) === target.part && (options.pitch ?? 0) === target.pitch;
    const id = target.part === 0 && target.pitch === 0 ? `score-note-${target.index}` : `score-note-${target.part}-${target.index}-${target.pitch}`;
    return `class="score-note${pressed ? ' selected' : ''}" id="${id}" data-index="${target.index}" data-part="${target.part}" data-pitch="${target.pitch}" role="button" tabindex="0" aria-pressed="${pressed}" aria-label="${escapeText(label)}"`;
  };
  const targets = !interactive ? '' : geometry.notes.map(target => {
    // Partition overlapping 44px areas by nearest head. Later targets cannot mask
    // an earlier chord tone; both hit shapes bubble to exactly one editable group.
    let polygon = [[-22, -22], [22, -22], [22, 22], [-22, 22]];
    for (const other of geometry.notes) {
      if (other === target) continue;
      const dx = other.x - target.x, dy = other.y - target.y;
      if (Math.abs(dx) > 44 || Math.abs(dy) > 44 || dx === 0 && dy === 0) continue;
      const boundary = (dx * dx + dy * dy) / 2;
      const distance = (point: number[]) => point[0] * dx + point[1] * dy - boundary;
      polygon = polygon.flatMap((point, index, vertices) => {
        const next = vertices[(index + 1) % vertices.length];
        const a = distance(point), b = distance(next);
        const output = a <= 0 ? [point] : [];
        if ((a <= 0) !== (b <= 0)) {
          const fraction = a / (a - b);
          output.push([point[0] + fraction * (next[0] - point[0]), point[1] + fraction * (next[1] - point[1])]);
        }
        return output;
      });
    }
    const clip = `score-hit-${target.part}-${target.index}-${target.pitch}`;
    const points = polygon.map(point => `${point[0] + target.x},${point[1] + target.y}`).join(' ');
    return `<g ${targetAttributes(target)}><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><polygon points="${points}"/></clipPath><rect class="note-hit" x="${target.x - 22}" y="${target.y - 22}" width="44" height="44" rx="6" fill="transparent" stroke="none" clip-path="url(#${clip})" pointer-events="all"/><ellipse class="notehead-target" cx="${target.x}" cy="${target.y}" rx="6" ry="4.5" fill="transparent" stroke="none" pointer-events="all"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="music-staff" data-notation-style="${style}" data-music-font="${styleName(style)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="width:${width}px;min-width:${width}px;max-width:none;height:${height}px;flex:none" ${interactive ? `role="group" aria-label="${escapeText(melodyCopy(language).score)}"` : 'aria-hidden="true"'}><g class="music-engraving" aria-hidden="true" pointer-events="none">${artwork}</g>${targets}<path class="score-cursor" d="M0 16 V${height - 16}" stroke="#ad4938" stroke-width="3" pointer-events="none" visibility="hidden" aria-hidden="true"/></svg>`;
}
