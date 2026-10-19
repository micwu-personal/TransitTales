import { resolveScore, staffStep, type Score, type ResolvedNote, type Clef } from './model';
import { melodyCopy, durationName } from './locale';
import type { Language } from '../rush/locale';

export function escapeText(value: string): string { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
export function resolvedLabel(note: ResolvedNote, language: Language): string {
  if (note.midi === null) return melodyCopy(language).silent;
  const naturalMidi = 12 * (note.event.octave + 1) + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[note.event.letter];
  const difference = note.midi - naturalMidi;
  return `${note.event.letter}${difference === 1 ? '♯' : difference === -1 ? '♭' : ''}${note.event.octave}`;
}
const yAt = (step: number) => 170 - step * 10;
function clefMarkup(clef: Clef): string {
  if (clef === 'treble') return `<path d="M48 199 C70 205 72 181 63 155 L49 99 C43 76 61 66 65 85 C69 109 38 129 35 149 C32 170 64 181 72 159 C78 140 54 130 46 144 C39 155 52 165 61 157" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`;
  if (clef === 'bass') return `<path d="M37 110 C37 90 68 94 68 111 C68 134 48 148 36 151 C55 138 60 126 60 111 C60 97 41 100 41 110" fill="currentColor"/><circle cx="39" cy="110" r="6" fill="currentColor"/><circle cx="78" cy="100" r="3" fill="currentColor"/><circle cx="78" cy="120" r="3" fill="currentColor"/>`;
  const centre = clef === 'alto' ? 130 : 110;
  return `<g transform="translate(35 ${centre})"><path d="M0 -40 V40 M8 -40 V40" fill="none" stroke="currentColor" stroke-width="4"/><path d="M12 -40 C47 -43 44 -10 16 0 C44 10 47 43 12 40 L12 34 C32 34 34 14 15 7 L10 0 L15 -7 C34 -14 32 -34 12 -34 Z" fill="currentColor"/></g>`;
}
export function symbolMarkup(note: ResolvedNote, x: number): string {
  const event = note.event, y = yAt(note.staffStep);
  if (event.rest) {
    const dot = event.dotted ? `<circle cx="${x + 18}" cy="130" r="3"/>` : '';
    if (event.duration === 'whole') return `<g fill="currentColor"><rect x="${x - 9}" y="110" width="18" height="7"/>${dot}</g>`;
    if (event.duration === 'half') return `<g fill="currentColor"><rect x="${x - 9}" y="123" width="18" height="7"/>${dot}</g>`;
    if (event.duration === 'quarter') return `<g transform="translate(${x} 130)" fill="currentColor"><path d="M-5 -26 L9 -12 L-1 0 L9 13 C-5 7 -11 20 -1 27 C-19 22 -14 5 0 5 L-9 -7 L1 -18 Z"/>${event.dotted ? '<circle cx="20" cy="0" r="3"/>' : ''}</g>`;
    return `<g transform="translate(${x} 130)" fill="currentColor"><path d="M8 -19 L-3 27" stroke="currentColor" stroke-width="3"/><circle cx="-2" cy="-14" r="5"/><path d="M-3 -10 Q6 -6 9 -19" fill="none" stroke="currentColor" stroke-width="3"/>${event.duration === 'sixteenth' ? '<circle cx="-6" cy="1" r="5"/><path d="M-6 5 Q2 9 5 -2" fill="none" stroke="currentColor" stroke-width="3"/>' : ''}${event.dotted ? '<circle cx="21" cy="0" r="3"/>' : ''}</g>`;
  }
  let ledgers = '';
  for (let step = -2; step >= note.staffStep; step -= 2) ledgers += `<path d="M${x - 17} ${yAt(step)} H${x + 17}"/>`;
  for (let step = 10; step <= note.staffStep; step += 2) ledgers += `<path d="M${x - 17} ${yAt(step)} H${x + 17}"/>`;
  const open = event.duration === 'whole' || event.duration === 'half';
  const down = note.staffStep >= 4;
  const stemX = x + (down ? -9 : 9), stemEnd = y + (down ? 35 : -35);
  const flags = event.duration === 'eighth' || event.duration === 'sixteenth' ? `<path d="M${stemX} ${stemEnd} q${down ? -19 : 19} ${down ? -10 : 10} 0 ${down ? -25 : 25}"/>${event.duration === 'sixteenth' ? `<path d="M${stemX} ${stemEnd + (down ? -9 : 9)} q${down ? -19 : 19} ${down ? -10 : 10} 0 ${down ? -25 : 25}"/>` : ''}` : '';
  const accidental = event.accidental === null ? '' : `<text x="${x - 30}" y="${y + 8}" class="accidental">${event.accidental === 1 ? '♯' : event.accidental === -1 ? '♭' : '♮'}</text>`;
  return `<g stroke="currentColor" stroke-width="2" fill="none">${ledgers}<ellipse cx="${x}" cy="${y}" rx="${event.duration === 'whole' ? 12 : 10}" ry="7" transform="rotate(-18 ${x} ${y})" fill="${open ? '#fcfaf4' : 'currentColor'}" stroke-width="${open ? 3 : 1}"/>${event.duration !== 'whole' ? `<path d="M${stemX} ${y} V${stemEnd}"/>${flags}` : ''}</g>${accidental}${event.dotted ? `<circle cx="${x + 20}" cy="${y - (note.staffStep % 2 === 0 ? 10 : 0)}" r="3" fill="currentColor"/>` : ''}`;
}
export function staffMarkup(score: Score, language: Language, selected: number, interactive = true): string {
  const c = melodyCopy(language), notes = resolveScore(score);
  let cursor = 185;
  const xs = notes.map(note => { const x = cursor; cursor += Math.max(82, note.durationBeats * 56); return x; });
  const width = Math.max(710, cursor + 35);
  const low = Math.min(0, ...notes.filter(n => !n.event.rest).map(n => n.staffStep));
  const high = Math.max(8, ...notes.filter(n => !n.event.rest).map(n => n.staffStep));
  const top = Math.min(30, yAt(high) - 45), bottom = Math.max(235, yAt(low) + 55);
  const height = bottom - top;
  const keys = score.key === 'G' ? [{ letter: 'F', symbol: '♯' }] : score.key === 'D' ? [{ letter: 'F', symbol: '♯' }, { letter: 'C', symbol: '♯' }] : score.key === 'F' ? [{ letter: 'B', symbol: '♭' }] : score.key === 'Bb' ? [{ letter: 'B', symbol: '♭' }, { letter: 'E', symbol: '♭' }] : [];
  const keyOctave = score.clef === 'treble' ? { F: 5, C: 5, B: 4, E: 5 } : score.clef === 'bass' ? { F: 3, C: 3, B: 2, E: 3 } : score.clef === 'alto' ? { F: 4, C: 4, B: 3, E: 4 } : { F: 3, C: 4, B: 3, E: 4 };
  const keyMarks = keys.map((key, index) => `<text class="accidental" x="${95 + index * 17}" y="${yAt(staffStep(key.letter as 'F' | 'C' | 'B' | 'E', keyOctave[key.letter as keyof typeof keyOctave], score.clef)) + 8}">${key.symbol}</text>`).join('');
  let bars = '';
  notes.forEach((note, index) => { if (index > 0 && note.measure !== notes[index - 1].measure) bars += `<path d="M${xs[index] - 42} 90 V170"/>`; });
  return `<svg class="music-staff" viewBox="0 ${top} ${width} ${height}" style="width:${width}px;height:${height}px" ${interactive ? `role="group" aria-label="${escapeText(c.score)}"` : 'aria-hidden="true"'}>
    <g stroke="#71877e" stroke-width="1.3">${[0, 2, 4, 6, 8].map(step => `<path d="M25 ${yAt(step)} H${width - 20}"/>`).join('')}</g>
    <g class="clef-symbol">${clefMarkup(score.clef)}${keyMarks}<text x="145" y="125" class="meter-digit">${score.meter.beats}</text><text x="145" y="153" class="meter-digit">${score.meter.unit}</text></g>
    <g stroke="#526961" stroke-width="2">${bars}<path d="M${width - 26} 90 V170 M${width - 20} 90 V170"/></g>
    ${notes.map((note, index) => {
      const label = `${index + 1}. ${resolvedLabel(note, language)} · ${durationName(language, note.event.duration)}${note.event.dotted ? ' · ×1.5' : ''}${note.frequency === null ? '' : ` · ${note.frequency.toFixed(3)} Hz`}`;
      return `<g class="score-note${selected === index && interactive ? ' selected' : ''}" ${interactive ? `id="score-note-${index}"` : ''} data-index="${index}" ${interactive ? `role="button" tabindex="0" aria-pressed="${selected === index}" aria-label="${escapeText(label)}"` : ''}><rect class="note-hit" x="${xs[index] - 37}" y="${top + 2}" width="74" height="${height - 4}" rx="10"/>${symbolMarkup(note, xs[index])}<text class="note-label" x="${xs[index]}" y="${bottom - 10}" text-anchor="middle">${escapeText(resolvedLabel(note, language))}</text></g>`;
    }).join('')}
    <path class="score-cursor" d="M0 ${top + 8} V${bottom - 35}" stroke="#ad4938" stroke-width="3" visibility="hidden"/>
  </svg>`;
}
export function staffNoteX(score: Score, index: number): number {
  const notes = resolveScore(score);
  return 185 + notes.slice(0, index).reduce((sum, note) => sum + Math.max(82, note.durationBeats * 56), 0);
}
