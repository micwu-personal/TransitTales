import '../languages.css';
import './style.css';
import { createLanguageController, languageOptions, type Language } from '../rush/locale';
import { resolveScore, resolvePart, resolvePerformance, partCount, scoreIssues, staffStep, pitchAtStaffStep, measureBeats, type Score, type NoteEvent, type Pitch, type Dynamic } from './model';
import { advancedCopy } from './advanced-locale';
import { createNotePlayer } from './audio';
import { LESSONS, cloneScore, completesLesson, note, readProgress, writeProgress, drawEarPitch, scoreForMidi, EAR_PITCHES, type LessonId } from './lessons';
import { melodyCopy, lessonTitle, lessonExplanation, clefName, durationName } from './locale';
import { escapeText as esc, staffMarkup, staffNoteX, staffGeometry, resolvedLabel, type NotationStyle } from './notation';
import { createJourneyRenderer, type JourneyRenderer, type JourneySnapshot } from './renderer';

const host = document.querySelector<HTMLDivElement>('#melody')!;
let storage: Storage | undefined;
try { storage = localStorage; } catch { /* Building remains available without local saves. */ }
const progress = readProgress(storage);
let mode: LessonId | 'studio' | 'ear' = 'first';
let draft = cloneScore(LESSONS[0].initial), selected = 0, bpm = 80, volume = 0.25, muted = false;
let history: Score[] = [], showHint = false, statusKey: keyof ReturnType<typeof melodyCopy> | 'tuplet' | 'voices' = 'ready';
let selectedPart = 0, selectedPitch = 0;
type LessonGroup = 'foundations' | 'rhythm' | 'harmony' | 'ensemble';
let lessonGroup: LessonGroup = 'foundations';
let notationStyle: NotationStyle = 'print';
try { if (storage?.getItem('transit-melody-notation') === 'handwritten') notationStyle = 'handwritten'; } catch { /* Optional preference. */ }
let context: { x: number; y: number; returnId: string } | null = null;
let cancelGesture: (() => void) | null = null;
const a = () => advancedCopy(language.language);
const part = () => selectedPart === 0 ? draft : draft.parts![selectedPart - 1];
const selectedEvent = () => part().events[selected];
const selectedTone = (): Pitch | undefined => selectedPitch === 0 ? selectedEvent() : selectedEvent()?.chord?.[selectedPitch - 1];
function nextChordTone(event: NoteEvent): Pitch | null {
  const highest = Math.max(...[event, ...(event.chord ?? [])].map(tone => staffStep(tone.letter, tone.octave, part().clef)));
  const upper = pitchAtStaffStep(highest + 2, part().clef);
  return upper.octave > 8 ? null : { ...upper, accidental: null };
}
function normalizeSelection() {
  selectedPart = Math.min(selectedPart, partCount(draft) - 1);
  selected = Math.max(0, Math.min(selected, part().events.length - 1));
  selectedPitch = Math.min(selectedPitch, selectedEvent()?.chord?.length ?? 0);
}
function statusText(key: typeof statusKey): string { return key === 'tuplet' || key === 'voices' ? a()[key] : c()[key]; }
let earPitch: number | null = null, earAnswered = false, earHeard = false, earGeneration = 0;
let playingScore: Score | null = null, playingKind: 'mine' | 'target' | 'ear' | null = null;
let activeIndex = -1, activeProgress = 0, view: '2d' | '3d' = new URLSearchParams(location.search).get('view') === '2d' ? '2d' : '3d';
let renderer: JourneyRenderer | null = null, renderGeneration = 0, disposed = false, saveOk = !!storage;
const sceneHost = document.createElement('div');
sceneHost.className = 'journey-scene';
const language = createLanguageController(storage, navigator.languages, () => {
  // Musical state and audio are retained; only localized scenery controls are remounted.
  renderGeneration++; renderer?.dispose(); renderer = null; render(); void mountScene();
});
const c = () => melodyCopy(language.language);
const currentLesson = () => LESSONS.find(lesson => lesson.id === mode);
const player = createNotePlayer({
  onPosition(index, fraction) { activeIndex = index; activeProgress = fraction; updatePlayback(); },
  onFinish() { playingScore = null; playingKind = null; activeIndex = -1; statusKey = 'finished'; render(); },
  onUnavailable() { playingScore = null; playingKind = null; activeIndex = -1; statusKey = 'unavailable'; render(); },
});
function persist() { saveOk = writeProgress(storage, progress); }
function stop(announce = true) {
  player.stop(); playingScore = null; playingKind = null; activeIndex = -1; activeProgress = 0;
  if (announce) statusKey = 'stopped';
}
function edit(action: () => void) {
  stop(false); history.push(cloneScore(draft)); if (history.length > 50) history.shift();
  action(); normalizeSelection(); statusKey = 'ready';
  if (mode === 'studio') { progress.studio = cloneScore(draft); persist(); }
  render();
}
function setMode(value: typeof mode) {
  cancelGesture?.(); context = null;
  stop(false); earGeneration++; mode = value; history = []; showHint = false; selected = 0; selectedPart = 0; selectedPitch = 0; statusKey = 'ready';
  if (value !== 'studio' && value !== 'ear') lessonGroup = currentLesson()!.group;
  if (mode === 'studio') draft = cloneScore(progress.studio);
  else if (mode !== 'ear') draft = cloneScore(currentLesson()!.initial);
  earPitch = null; earAnswered = false; earHeard = false;
  render();
}
function issueText(): string {
  const issue = scoreIssues(draft)[0];
  if (!issue) return '';
  const key = issue.code === 'too-long' ? 'limit' : issue.code === 'out-of-range' ? 'range' : issue.code;
  return statusText(key);
}
function journeySnapshot(): JourneySnapshot {
  const privateTarget = playingKind === 'target' && !showHint;
  const score = mode === 'ear' ? null : privateTarget ? draft : playingScore ?? draft;
  const moments = score ? resolvePerformance(score) : [];
  return {
    stations: moments.map((moment, index) => ({
      id: index, step: moment.pitches.length ? moment.pitches.reduce((sum, pitch) => sum + pitch.staffStep, 0) / moment.pitches.length : 4,
      label: moment.pitches.length ? moment.pitches.map(pitch => `${pitch.letter}${pitch.accidental === 1 ? '♯' : pitch.accidental === -1 ? '♭' : ''}${pitch.octave}`).join(' · ') : c().silent,
      rest: moment.rest, startBeat: moment.startBeat, durationBeats: moment.durationBeats,
      pitches: moment.pitches.map(pitch => ({ midi: pitch.midi, voice: pitch.part, durationBeats: pitch.durationBeats, label: `${pitch.letter}${pitch.octave}` })),
      dynamic: moment.pitches[0]?.dynamic ?? score?.dynamic ?? 'mf', pass: moment.pass,
    })),
    activeIndex: privateTarget ? -1 : activeIndex, progress: activeProgress,
    totalBeats: moments.length ? moments[moments.length - 1].startBeat + moments[moments.length - 1].durationBeats : 0,
    playing: player.playing && mode !== 'ear' && !privateTarget, meter: score?.meter, repeat: score?.repeat,
  };
}
async function mountScene() {
  const generation = ++renderGeneration;
  let candidate: JourneyRenderer | null = null;
  try {
    if (view === '3d') {
      const { createJourney3dRenderer } = await import('./renderer3d');
      if (disposed || generation !== renderGeneration) return;
      candidate = createJourney3dRenderer({ onUnavailable: () => fallback(generation), labels: { zoomIn: c().zoomIn, zoomOut: c().zoomOut, reset: c().cameraReset } });
    } else candidate = createJourneyRenderer();
    if (disposed || generation !== renderGeneration) { candidate.dispose(); return; }
    renderer?.dispose(); renderer = candidate; renderer.mount(sceneHost); renderer.render(journeySnapshot());
  } catch {
    candidate?.dispose();
    if (generation === renderGeneration && !disposed) fallback(generation);
  }
}
function fallback(generation: number) {
  if (generation !== renderGeneration || disposed) return;
  renderGeneration++; renderer?.dispose(); renderer = null; view = '2d'; statusKey = 'fallback'; render(); void mountScene();
}
function updatePlayback() {
  renderer?.render(journeySnapshot());
  host.querySelectorAll('.score-cursor').forEach(cursor => cursor.setAttribute('visibility', 'hidden'));
  host.querySelectorAll('.score-note.playing').forEach(note => note.classList.remove('playing'));
  const staff = host.querySelector<SVGSVGElement>(playingKind === 'target' ? '#target-staff .music-staff' : '#draft-staff .music-staff');
  const moment = playingScore && activeIndex >= 0 ? resolvePerformance(playingScore)[activeIndex] : undefined;
  if (staff && moment && playingScore && playingKind !== 'ear') {
    const reference = moment.events.find(event => event.part === selectedPart) ?? moment.events[0];
    if (reference) {
      const cursor = staff.querySelector('.score-cursor');
      const x = staffNoteX(playingScore, reference.index, reference.part, notationStyle);
      cursor?.setAttribute('transform', `translate(${x} 0)`); cursor?.setAttribute('visibility', 'visible');
      for (const reference of moment.events) staff.querySelectorAll(`.score-note[data-index="${reference.index}"][data-part="${reference.part}"]`).forEach(note => note.classList.add('playing'));
    }
  }
  const readout = host.querySelector('#active-note');
  if (readout) readout.textContent = playingKind === 'target' && !showHint ? a().targetPrivate : moment && playingKind !== 'ear' ? `${a().playingEvent}: ${moment.events.map(event => `${a().part} ${event.part + 1} · ${event.index + 1}`).join(' / ')}` : '';
  const stopButton = host.querySelector<HTMLButtonElement>('#stop'); if (stopButton) stopButton.disabled = !player.playing && !playingKind;
}
async function play(value: Score, kind: 'mine' | 'target' | 'ear') {
  stop(false);
  if (kind === 'ear' && (muted || volume === 0)) { statusKey = 'earNeedSound'; render(); return false; }
  const invalid = scoreIssues(value).find(issue => issue.code !== 'incomplete');
  if (invalid) { statusKey = invalid.code === 'too-long' ? 'limit' : invalid.code === 'out-of-range' ? 'range' : invalid.code; render(); return false; }
  playingScore = cloneScore(value); playingKind = kind; statusKey = 'playing';
  context = null;
  render();
  const started = await player.play(value, bpm);
  updatePlayback();
  return started;
}
function check() {
  stop(false);
  if (scoreIssues(draft).length) { statusKey = scoreIssues(draft)[0].code === 'too-long' ? 'limit' : scoreIssues(draft)[0].code === 'out-of-range' ? 'range' : scoreIssues(draft)[0].code as typeof statusKey; }
  else if (currentLesson() && completesLesson(draft, currentLesson()!)) {
    statusKey = 'success'; if (!progress.completed.includes(mode as LessonId)) progress.completed.push(mode as LessonId); persist();
  } else statusKey = 'retry';
  render();
}
function options(values: readonly string[], label: (value: string) => string, value: string) {
  return values.map(item => `<option value="${esc(item)}"${item === value ? ' selected' : ''}>${esc(label(item))}</option>`).join('');
}
function field(id: string, text: string, values: string[], label: (value: string) => string, value: string) {
  return `<label><span>${esc(text)}</span><select id="${id}">${options(values, label, value)}</select></label>`;
}
function render() {
  if (disposed) return;
  cancelGesture?.();
  const copy = c(), lang = language.language, focus = (document.activeElement as HTMLElement | null)?.id;
  const openDisclosures = Array.from(host.querySelectorAll<HTMLDetailsElement>('details[open]')).map(detail => detail.className);
  document.documentElement.lang = lang; document.title = `Transit Tales — ${copy.title}`;
  normalizeSelection();
  const advanced = a(), lesson = currentLesson(), resolved = resolvePart(draft, selectedPart), event = selectedEvent(), tone = selectedTone();
  const total = resolved.reduce((sum, n) => sum + n.durationBeats, 0);
  const issue = issueText();
  const isEar = mode === 'ear';
  host.innerHTML = `<header class="melody-header"><a href="index.html" class="home-link">← ${esc(copy.home)}</a><h1>${esc(copy.title)}</h1><label class="language-control">${esc(copy.language)}<select id="language">${languageOptions(lang)}</select></label><details class="audio-settings"><summary>${esc(copy.audio)}</summary><div><strong>${esc(copy.tuning)}</strong><label>${esc(copy.volume)}<input id="volume" type="range" min="0" max="100" step="1" value="${Math.round(volume * 100)}"></label><label class="toggle"><input id="mute" type="checkbox"${muted ? ' checked' : ''}>${esc(copy.mute)}</label><p>${esc(copy.precision)}</p></div></details></header>
    <main class="melody-layout"><aside class="journey-choices"><h2>${esc(copy.lessons)}</h2><nav aria-label="${esc(copy.lessons)}">${(['foundations','rhythm','harmony','ensemble'] as const).map(group => `<button data-group="${group}" aria-pressed="${lessonGroup === group}">${esc(advanced[group])}</button>`).join('')}${LESSONS.map((item, i) => `<button${item.group === lessonGroup ? '' : ' hidden'} id="lesson-${item.id}" data-lesson="${item.id}" aria-current="${mode === item.id ? 'step' : 'false'}"><span class="ticket-number">${i + 1}</span><span>${esc(lessonTitle(lang, item.id))}</span>${progress.completed.includes(item.id) ? `<span aria-label="${esc(copy.completed)}">✓</span>` : ''}</button>`).join('')}<button id="mode-studio" data-mode="studio" aria-current="${mode === 'studio' ? 'page' : 'false'}">✎ ${esc(copy.studio)}</button><button id="mode-ear" data-mode="ear" aria-current="${isEar ? 'page' : 'false'}">♪ ${esc(copy.ear)}</button></nav><p class="save-note">${esc(saveOk ? copy.saved : copy.unsaved)}</p></aside>
    <section class="workshop" aria-label="${esc(copy.title)}"><div class="mission"><h2>${esc(lesson ? lessonTitle(lang, lesson.id) : isEar ? copy.ear : copy.studio)}</h2><p>${esc(lesson ? lessonExplanation(lang, lesson.id) : isEar ? copy.earIntro : copy.intro)}</p></div>
      <div class="scene-toolbar"${isEar ? ' hidden' : ''}><div role="group" aria-label="${esc(copy.contour)}"><button id="view3d" aria-pressed="${view === '3d'}">${esc(copy.view3d)}</button><button id="view2d" aria-pressed="${view === '2d'}">${esc(copy.view2d)}</button></div><span>${esc(copy.tuning)}</span></div><div id="scene-placeholder"${isEar ? ' hidden' : ''}></div>${isEar ? '' : `<p class="scene-caption">${esc(advanced.railway)}</p>`}
      ${isEar ? earMarkup(lang) : `<div class="score-heading"><h3>${esc(copy.score)}</h3><span>${total} / ${measureBeats(draft.meter)} · ${esc(copy.beats)}</span></div><div id="draft-staff" class="staff-scroll">${staffMarkup(draft, lang, selected, true, { style: notationStyle, part: selectedPart, pitch: selectedPitch })}</div><div class="journey-actions"><button id="play" class="primary"${draft.events.length ? '' : ' disabled'}>▶ ${esc(copy.play)}</button><button id="stop"${playingKind ? '' : ' disabled'}>■ ${esc(copy.stop)}</button>${lesson ? `<button id="listen">♪ ${esc(copy.listen)}</button><button id="check">✓ ${esc(copy.check)}</button><button id="hint" aria-expanded="${showHint}">${esc(showHint ? copy.hideHint : copy.hint)}</button>` : ''}</div>
      ${lesson && showHint ? `<div id="target-staff" class="target-score"><h3>${esc(copy.listen)}</h3><div class="staff-scroll">${staffMarkup(lesson.target, lang, -1, false, { style: notationStyle })}</div></div>` : ''}
      <p class="gesture-help">${esc(advanced.gesture)}</p><div class="score-setup">${field('notation-style', advanced.notation, ['print','handwritten'], value => advanced[value as NotationStyle], notationStyle)}${field('part', advanced.part, Array.from({length:partCount(draft)}, (_, i) => String(i)), value => `${Number(value) + 1} · ${clefName(lang, (Number(value) === 0 ? draft : draft.parts![Number(value)-1]).clef)}`, String(selectedPart))}${field('clef', copy.clef, ['treble','bass','alto','tenor'], value => clefName(lang, value as Score['clef']), part().clef)}${field('key', copy.key, ['C','G','F','D','Bb'], value => ({ C: 'C · 0', G: 'G · F♯', F: 'F · B♭', D: 'D · F♯ C♯', Bb: 'B♭ · B♭ E♭' })[value as Score['key']], draft.key)}${field('meter', copy.meter, ['2/4','3/4','4/4','6/8'], value => value, `${draft.meter.beats}/${draft.meter.unit}`)}<label>${esc(copy.tempo)}<input id="tempo" type="number" min="40" max="160" step="1" value="${bpm}"></label></div>
      <div class="ensemble-controls">${field('score-dynamic', advanced.dynamics, ['pp','p','mp','mf','f','ff'], value => value, draft.dynamic ?? 'mf')}<label class="toggle"><input id="repeat" type="checkbox"${draft.repeat ? ' checked' : ''}>${esc(advanced.repeat)}</label><button id="add-part"${partCount(draft) >= 4 ? ' disabled' : ''}>+ ${esc(advanced.addPart)}</button><button id="remove-part"${selectedPart === 0 ? ' disabled' : ''}>${esc(advanced.removePart)}</button></div><div class="stop-list" role="group" aria-label="${esc(copy.selected)}">${resolved.map((n, i) => `<button id="stop-${i}" data-select="${i}" aria-pressed="${selected === i}">${i + 1} · ${esc(resolvedLabel(n, lang))}</button>`).join('')}</div>
      ${event && tone ? benchMarkup(lang) : ''}
      <div class="edit-actions"><button id="add"${part().events.length >= 64 ? ' disabled' : ''}>+ ${esc(copy.add)}</button><button id="remove"${event ? '' : ' disabled'}>${esc(copy.remove)}</button><button id="undo"${history.length ? '' : ' disabled'}>↶ ${esc(copy.undo)}</button><button id="reset">${esc(copy.reset)}</button>${lesson && progress.completed.includes(lesson.id) && LESSONS.indexOf(lesson) < LESSONS.length - 1 ? `<button id="next">${esc(copy.next)} →</button>` : ''}</div><p class="score-issue"${issue ? '' : ' hidden'}>${esc(issue)}</p>`}
      <p id="status" class="journey-status${statusKey === 'success' || statusKey === 'earCorrect' ? ' success' : ''}" role="status">${esc(statusText(statusKey))}</p><details class="build-guide"><summary>${esc(copy.guide)}</summary><p>${esc(copy.guideText)}</p></details><p class="listening-note">${esc(copy.disclaimer)}</p>
    </section></main>`;
  const placeholder = host.querySelector('#scene-placeholder')!; placeholder.replaceWith(sceneHost); sceneHost.hidden = isEar;
  wire();
  for (const className of openDisclosures) { const detail = host.querySelector<HTMLDetailsElement>(`details.${className}`); if (detail) detail.open = true; }
  renderer?.render(journeySnapshot()); updatePlayback();
  if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
}
function tupletStart(): number {
  const events = part().events;
  if (events[selected]?.tuplet !== 3) return selected;
  let start = selected;
  while (start > 0 && events[start - 1].tuplet === 3) start--;
  return start + Math.floor((selected - start) / 3) * 3;
}
function changeDuration(action: (event: NoteEvent) => void) {
  const start = tupletStart(), count = selectedEvent()?.tuplet === 3 ? 3 : 1;
  for (const event of part().events.slice(start, start + count)) action(event);
}
function benchMarkup(lang: Language): string {
  const copy = c(), advanced = a(), event = selectedEvent()!, tone = selectedTone()!;
  const frequency = resolvePart(draft, selectedPart)[selected]?.pitches[selectedPitch]?.frequency;
  return `<fieldset class="note-bench${context ? ' note-context' : ''}"${context ? ` role="dialog" aria-label="${esc(advanced.controls)}" style="left:${Math.min(context.x, Math.max(8, innerWidth - 360))}px;top:${Math.min(context.y, Math.max(8, innerHeight - 440))}px"` : ''}><legend>${esc(copy.selected)} ${selected + 1}${frequency === undefined ? '' : ` · ${frequency.toFixed(6)} Hz`}</legend>${context ? `<button id="close-context">${esc(advanced.close)}</button>` : `<button id="open-context">${esc(advanced.openControls)}</button>`}${field('tone', advanced.tone, Array.from({length:(event.chord?.length ?? 0) + 1}, (_, i) => String(i)), value => Number(value) === 0 ? advanced.primaryTone : `${Number(value) + 1}`, String(selectedPitch))}${field('letter', copy.letter, ['C','D','E','F','G','A','B'], value => value, tone.letter)}${field('octave', copy.octave, ['0','1','2','3','4','5','6','7','8'], value => value, String(tone.octave))}${field('accidental', copy.accidental, ['inherit','1','-1','0'], value => value === 'inherit' ? copy.inherit : value === '1' ? copy.sharp : value === '-1' ? copy.flat : copy.natural, tone.accidental === null ? 'inherit' : String(tone.accidental))}${field('duration', copy.duration, ['whole','half','quarter','eighth','sixteenth'], value => durationName(lang, value as NoteEvent['duration']), event.duration)}${field('event-dynamic', advanced.eventDynamic, ['inherit','pp','p','mp','mf','f','ff'], value => value === 'inherit' ? advanced.inheritDynamic : value, event.dynamic ?? 'inherit')}<label class="toggle"><input id="dotted" type="checkbox"${event.dotted ? ' checked' : ''}>${esc(copy.dotted)}</label><label class="toggle"><input id="rest" type="checkbox"${event.rest ? ' checked' : ''}>${esc(copy.rest)}</label><label class="toggle"><input id="tuplet" type="checkbox"${event.tuplet === 3 ? ' checked' : ''}${part().events.length - tupletStart() < 3 ? ' disabled' : ''}>${esc(advanced.triplet)}</label><p class="tuplet-help">${esc(advanced.tripletHelp)}</p><button id="add-tone"${event.rest || (event.chord?.length ?? 0) >= 3 || !nextChordTone(event) ? ' disabled' : ''}>+ ${esc(advanced.addTone)}</button><button id="remove-tone"${selectedPitch === 0 ? ' disabled' : ''}>${esc(advanced.removeTone)}</button></fieldset>`;
}
function noteId() { return selectedPart === 0 && selectedPitch === 0 ? `score-note-${selected}` : `score-note-${selectedPart}-${selected}-${selectedPitch}`; }
function closeContext() {
  const returnId = context?.returnId; context = null; render();
  if (returnId) document.getElementById(returnId)?.focus({preventScroll:true});
}
function openContext(x: number, y: number) {
  context = { x: Math.max(8, x), y: Math.max(8, y), returnId: noteId() }; render();
  document.getElementById('close-context')?.focus({preventScroll:true});
}
function selectElement(button: HTMLElement) {
  selectedPart = Number(button.dataset.part ?? selectedPart);
  selected = Number(button.dataset.select ?? button.dataset.index);
  selectedPitch = Number(button.dataset.pitch ?? 0); normalizeSelection();
}
function wireGestures(button: HTMLElement) {
  button.addEventListener('pointerdown', raw => {
    const event = raw as PointerEvent;
    if (event.button !== 0) return;
    cancelGesture?.(); selectElement(button); context = null;
    const original = { ...selectedTone()! }, startY = event.clientY, startX = event.clientX;
    const svg = button.closest('svg')!, rect = svg.getBoundingClientRect(), geometry = staffGeometry(draft, notationStyle);
    const pixels = geometry.spacing / 2 * rect.height / geometry.height;
    const glyph = svg.querySelector<SVGGElement>(`#score-glyph-${selectedPart}-${selected}-${selectedPitch}`);
    const glyphTransform = glyph?.getAttribute('transform');
    let armed = event.pointerType !== 'touch', moved = false, preview = original, ended = false;
    const timer = window.setTimeout(() => { armed = true; }, 450);
    const finish = (cancel: boolean, up?: PointerEvent) => {
      if (ended) return; ended = true; clearTimeout(timer);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', upHandler); window.removeEventListener('pointercancel', cancelHandler);
      button.removeEventListener('touchmove', touchMove); button.removeAttribute('transform'); cancelGesture = null;
      if (glyphTransform) glyph?.setAttribute('transform', glyphTransform); else glyph?.removeAttribute('transform');
      if (cancel) return;
      if (moved && (preview.letter !== original.letter || preview.octave !== original.octave)) edit(() => Object.assign(selectedTone()!, preview));
      else if (armed && event.pointerType === 'touch') openContext(up?.clientX ?? startX, up?.clientY ?? startY);
      else render();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      if (!armed) { if (Math.hypot(e.clientX-startX, e.clientY-startY) > 9) finish(true); return; }
      if (Math.abs(e.clientY-startY) < 4 && !moved) return;
      moved = true;
      const delta = Math.round((startY-e.clientY) / Math.max(1, pixels));
      const next = pitchAtStaffStep(staffStep(original.letter, original.octave, part().clef) + delta, part().clef);
      if (next.octave < 0 || next.octave > 8) return;
      preview = { ...original, ...next };
      const translation = `translate(0 ${-delta * geometry.spacing / 2})`;
      button.setAttribute('transform', translation);
      glyph?.setAttribute('transform', `${glyphTransform ?? ''} ${translation}`);
    };
    const upHandler = (e: PointerEvent) => { if (e.pointerId === event.pointerId) finish(false, e); };
    const cancelHandler = (e: PointerEvent) => { if (e.pointerId === event.pointerId) finish(true); };
    const touchMove = (e: TouchEvent) => { if (armed) e.preventDefault(); };
    button.addEventListener('touchmove', touchMove, {passive:false});
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', upHandler); window.addEventListener('pointercancel', cancelHandler);
    cancelGesture = () => finish(true);
    if (event.pointerType !== 'touch') event.preventDefault();
  });
  button.addEventListener('contextmenu', event => { event.preventDefault(); selectElement(button); openContext(event.clientX, event.clientY); });
}
function earMarkup(lang: Language): string {
  const copy = c();
  const answer = earPitch === null ? null : resolveScore(scoreForMidi(earPitch))[0];
  return `<div class="ear-platform"><svg viewBox="0 0 300 130" aria-hidden="true"><path d="M20 107H280 M20 118H280" stroke="#526961" stroke-width="3"/><rect x="65" y="35" width="170" height="65" rx="14" fill="#ad4938"/><path d="M80 87H220" stroke="#f5f3eb" stroke-width="3"/><rect x="85" y="48" width="42" height="25" rx="4" fill="#d7e9e4"/><rect x="174" y="48" width="42" height="25" rx="4" fill="#d7e9e4"/><circle cx="100" cy="105" r="9" fill="#284d47"/><circle cx="201" cy="105" r="9" fill="#284d47"/><text x="150" y="77" text-anchor="middle" font-size="35" fill="#fff">?</text></svg><div class="journey-actions"><button id="ear-play" class="primary">♪ ${esc(earPitch === null ? copy.earStart : copy.earReplay)}</button><button id="ear-next">${esc(copy.earNext)}</button><button id="stop"${playingKind ? '' : ' disabled'}>■ ${esc(copy.stop)}</button></div><div class="ear-answers" role="group" aria-label="${esc(copy.ear)}">${EAR_PITCHES.map(midi => { const n = resolveScore(scoreForMidi(midi))[0]; return `<button id="ear-${midi}" data-ear="${midi}"${earHeard && !earAnswered ? '' : ' disabled'}>${esc(resolvedLabel(n, lang))}</button>`; }).join('')}</div>${earAnswered && answer ? `<p class="ear-result">${esc(copy.answer)}: <strong>${esc(resolvedLabel(answer, lang))}</strong> · ${answer.frequency!.toFixed(6)} Hz</p><button id="ear-answer">♪ ${esc(copy.answer)}</button>` : ''}<p>${progress.ear.correct} / ${progress.ear.attempts} · ${esc(copy.earStats)}</p></div>`;
}
function bind(id: string, event: string, action: (event: Event) => void) { host.querySelector(`#${id}`)?.addEventListener(event, action); }
function wire() {
  bind('language', 'change', e => language.setLanguage((e.target as HTMLSelectElement).value as Language));
  host.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.lesson as LessonId)));
  host.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode as 'studio' | 'ear')));
  host.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(button => button.addEventListener('click', () => { lessonGroup = button.dataset.group as LessonGroup; render(); }));
  host.querySelectorAll<HTMLElement>('[data-select],#draft-staff .score-note').forEach(button => {
    const select = () => { selectElement(button); render(); };
    button.addEventListener('click', select);
    if (button.classList.contains('score-note')) wireGestures(button);
    button.addEventListener('keydown', e => {
      const key = (e as KeyboardEvent).key;
      if (['Enter',' ','ArrowUp','ArrowDown','Delete','ContextMenu'].includes(key) || (key === 'F10' && (e as KeyboardEvent).shiftKey)) e.stopPropagation();
      if (key === 'Enter' || key === ' ') { e.preventDefault(); select(); }
      else if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault(); selectElement(button);
        const old = selectedTone()!, pitch = pitchAtStaffStep(staffStep(old.letter, old.octave, part().clef) + (key === 'ArrowUp' ? 1 : -1), part().clef);
        if (pitch.octave >= 0 && pitch.octave <= 8) edit(() => Object.assign(selectedTone()!, pitch));
      } else if (key === 'Delete') { e.preventDefault(); selectElement(button); edit(() => selectedPitch ? selectedEvent()!.chord!.splice(selectedPitch - 1, 1) : part().events.splice(selected, 1)); }
      else if (key === 'ContextMenu' || (key === 'F10' && (e as KeyboardEvent).shiftKey)) { e.preventDefault(); selectElement(button); const rect = button.getBoundingClientRect(); openContext(rect.x, rect.y); }
    });
  });
  bind('part', 'change', e => { selectedPart = Number((e.target as HTMLSelectElement).value); selected = selectedPitch = 0; context = null; render(); });
  bind('tone', 'change', e => { selectedPitch = Number((e.target as HTMLSelectElement).value); render(); });
  bind('notation-style', 'change', e => { notationStyle = (e.target as HTMLSelectElement).value as NotationStyle; try { storage?.setItem('transit-melody-notation', notationStyle); } catch { /* Optional preference. */ } render(); });
  bind('score-dynamic', 'change', e => edit(() => { draft.dynamic = (e.target as HTMLSelectElement).value as Dynamic; }));
  bind('event-dynamic', 'change', e => edit(() => { const value = (e.target as HTMLSelectElement).value; if (value === 'inherit') delete selectedEvent()!.dynamic; else selectedEvent()!.dynamic = value as Dynamic; }));
  bind('repeat', 'change', e => edit(() => { draft.repeat = (e.target as HTMLInputElement).checked; }));
  bind('add-part', 'click', () => edit(() => { if (partCount(draft) >= 4) return; (draft.parts ??= []).push({clef:'bass',events:cloneScore({...draft,parts:undefined}).events.map(event => ({...event,rest:true,chord:undefined}))}); selectedPart = partCount(draft)-1; selected = selectedPitch = 0; }));
  bind('remove-part', 'click', () => edit(() => { if (selectedPart) draft.parts!.splice(selectedPart-1,1); selectedPart = selectedPitch = 0; }));
  bind('add-tone', 'click', () => edit(() => { const event = selectedEvent()!, upper = nextChordTone(event); if (event.rest || (event.chord?.length ?? 0) >= 3 || !upper) return; (event.chord ??= []).push(upper); selectedPitch = event.chord.length; }));
  bind('remove-tone', 'click', () => edit(() => { if (selectedPitch) selectedEvent()!.chord!.splice(selectedPitch-1,1); selectedPitch = 0; }));
  bind('tuplet', 'change', e => edit(() => { const start = tupletStart(), checked = (e.target as HTMLInputElement).checked, duration = selectedEvent()!.duration; for (const event of part().events.slice(start,start+3)) { if (checked) { event.tuplet = 3; event.duration = duration; event.dotted = false; } else delete event.tuplet; } }));
  bind('open-context', 'click', e => { const rect = (e.target as HTMLElement).getBoundingClientRect(); openContext(rect.x,rect.y); });
  bind('close-context', 'click', closeContext);
  bind('play', 'click', () => { void play(draft, 'mine'); });
  bind('listen', 'click', () => { void play(currentLesson()!.target, 'target'); });
  bind('stop', 'click', () => { stop(); render(); });
  bind('check', 'click', check);
  bind('hint', 'click', () => { showHint = !showHint; render(); });
  bind('next', 'click', () => setMode(LESSONS[LESSONS.indexOf(currentLesson()!) + 1].id));
  bind('add', 'click', () => edit(() => { if (part().events.length < 64) { part().events.push(note('C', 4)); selected = part().events.length - 1; selectedPitch = 0; } }));
  bind('remove', 'click', () => edit(() => { part().events.splice(selected, 1); selectedPitch = 0; }));
  bind('undo', 'click', () => { const last = history.pop(); if (last) { stop(false); draft = last; normalizeSelection(); if (mode === 'studio') { progress.studio = cloneScore(draft); persist(); } render(); } });
  bind('reset', 'click', () => edit(() => { draft = cloneScore(mode === 'studio' ? { clef: 'treble', key: 'C', meter: { beats: 4, unit: 4 }, events: [] } : currentLesson()!.initial); selected = 0; }));
  bind('clef', 'change', e => edit(() => { part().clef = (e.target as HTMLSelectElement).value as Score['clef']; }));
  bind('key', 'change', e => edit(() => { draft.key = (e.target as HTMLSelectElement).value as Score['key']; }));
  bind('meter', 'change', e => edit(() => { const [beats, unit] = (e.target as HTMLSelectElement).value.split('/').map(Number); draft.meter = { beats, unit: unit as 4 | 8 }; }));
  bind('tempo', 'change', e => { const value = Number((e.target as HTMLInputElement).value); stop(false); bpm = Number.isFinite(value) ? Math.round(Math.min(160, Math.max(40, value))) : 80; render(); });
  for (const key of ['letter','octave','duration','accidental'] as const) bind(key, 'change', e => edit(() => {
    const value = (e.target as HTMLSelectElement).value;
    if (key === 'octave') selectedTone()!.octave = Number(value);
    else if (key === 'accidental') selectedTone()!.accidental = value === 'inherit' ? null : Number(value) as -1 | 0 | 1;
    else if (key === 'duration') changeDuration(event => { event.duration = value as NoteEvent['duration']; });
    else selectedTone()!.letter = value as Pitch['letter'];
  }));
  bind('rest', 'change', e => edit(() => { selectedEvent()!.rest = (e.target as HTMLInputElement).checked; selectedPitch = 0; }));
  bind('dotted', 'change', e => edit(() => changeDuration(event => { event.dotted = (e.target as HTMLInputElement).checked; })));
  bind('volume', 'input', e => { volume = Number((e.target as HTMLInputElement).value) / 100; player.setVolume(volume); if (mode === 'ear' && volume === 0) { stop(false); earHeard = false; statusKey = 'earNeedSound'; render(); } });
  bind('mute', 'change', e => { muted = (e.target as HTMLInputElement).checked; player.setMuted(muted); if (mode === 'ear' && muted) { stop(false); earHeard = false; statusKey = 'earNeedSound'; render(); } });
  for (const nextView of ['2d','3d'] as const) bind(`view${nextView}`, 'click', () => {
    if (view === nextView) return; renderGeneration++; renderer?.dispose(); renderer = null; view = nextView; render(); void mountScene();
  });
  bind('ear-play', 'click', () => { void startEar(false); }); bind('ear-next', 'click', () => { void startEar(true); });
  bind('ear-answer', 'click', () => { if (earPitch !== null) void play(scoreForMidi(earPitch), 'ear'); });
  host.querySelectorAll<HTMLButtonElement>('[data-ear]').forEach(button => button.addEventListener('click', () => {
    if (!earHeard || earAnswered || earPitch === null) return;
    stop(false); earAnswered = true; progress.ear.attempts++;
    const correct = Number(button.dataset.ear) === earPitch; if (correct) progress.ear.correct++;
    statusKey = correct ? 'earCorrect' : 'earWrong'; persist(); render();
  }));
}
async function startEar(fresh: boolean) {
  if (muted || volume === 0) { statusKey = 'earNeedSound'; render(); return; }
  const generation = ++earGeneration;
  if (fresh || earPitch === null) { earPitch = drawEarPitch(earPitch); earAnswered = false; earHeard = false; }
  const pitch = earPitch;
  const started = await play(scoreForMidi(pitch), 'ear');
  if (generation !== earGeneration || mode !== 'ear') return;
  earHeard = started; render();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { cancelGesture?.(); if (context) closeContext(); } });
document.addEventListener('click', e => { if (context && !(e.target as Element).closest('.note-context') && !(e.target as Element).closest('select,input')) closeContext(); });
function onHidden() { if (document.hidden) { stop(); earGeneration++; render(); } }
function onPageHide(e: PageTransitionEvent) {
  stop(false); earGeneration++;
  if (!e.persisted) { disposed = true; renderGeneration++; renderer?.dispose(); player.dispose(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', onPageHide); window.removeEventListener('pageshow', onPageShow); }
}
function onPageShow(e: PageTransitionEvent) { if (e.persisted && !disposed) { statusKey = 'stopped'; render(); } }
document.addEventListener('visibilitychange', onHidden); window.addEventListener('pagehide', onPageHide); window.addEventListener('pageshow', onPageShow);
render(); void mountScene();
