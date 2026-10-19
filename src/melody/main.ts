import '../languages.css';
import './style.css';
import { createLanguageController, languageOptions, type Language } from '../rush/locale';
import { resolveScore, scoreIssues, staffStep, pitchAtStaffStep, measureBeats, type Score, type NoteEvent } from './model';
import { createNotePlayer } from './audio';
import { LESSONS, cloneScore, completesLesson, note, readProgress, writeProgress, drawEarPitch, scoreForMidi, EAR_PITCHES, type LessonId } from './lessons';
import { melodyCopy, lessonTitle, lessonExplanation, clefName, durationName } from './locale';
import { escapeText as esc, staffMarkup, staffNoteX, resolvedLabel } from './notation';
import { createJourneyRenderer, type JourneyRenderer, type JourneySnapshot } from './renderer';

const host = document.querySelector<HTMLDivElement>('#melody')!;
let storage: Storage | undefined;
try { storage = localStorage; } catch { /* Building remains available without local saves. */ }
const progress = readProgress(storage);
let mode: LessonId | 'studio' | 'ear' = 'first';
let draft = cloneScore(LESSONS[0].initial), selected = 0, bpm = 80, volume = 0.25, muted = false;
let history: Score[] = [], showHint = false, statusKey: keyof ReturnType<typeof melodyCopy> = 'ready';
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
  action(); selected = Math.max(0, Math.min(selected, draft.events.length - 1)); statusKey = 'ready';
  if (mode === 'studio') { progress.studio = cloneScore(draft); persist(); }
  render();
}
function setMode(value: typeof mode) {
  stop(false); earGeneration++; mode = value; history = []; showHint = false; selected = 0; statusKey = 'ready';
  if (mode === 'studio') draft = cloneScore(progress.studio);
  else if (mode !== 'ear') draft = cloneScore(currentLesson()!.initial);
  earPitch = null; earAnswered = false; earHeard = false;
  render();
}
function issueText(): string {
  const issue = scoreIssues(draft)[0];
  if (!issue) return '';
  const key = issue.code === 'too-long' ? 'limit' : issue.code === 'out-of-range' ? 'range' : issue.code;
  return c()[key];
}
function journeySnapshot(): JourneySnapshot {
  const score = mode === 'ear' ? null : playingScore ?? draft;
  const resolved = score ? resolveScore(score) : [];
  return { stations: resolved.map(n => ({ id: n.index, step: n.staffStep, label: resolvedLabel(n, language.language), rest: n.event.rest, startBeat: n.startBeat, durationBeats: n.durationBeats })), activeIndex, progress: activeProgress, totalBeats: resolved.reduce((sum, n) => sum + n.durationBeats, 0), playing: player.playing && mode !== 'ear' };
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
  const staff = host.querySelector<SVGElement>(playingKind === 'target' ? '#target-staff .music-staff' : '#draft-staff .music-staff');
  const cursor = staff?.querySelector<SVGPathElement>('.score-cursor');
  if (cursor && activeIndex >= 0 && playingScore && playingKind !== 'ear') {
    const x = staffNoteX(playingScore, activeIndex), next = staffNoteX(playingScore, activeIndex + 1);
    cursor.setAttribute('transform', `translate(${x + (next - x) * activeProgress} 0)`); cursor.setAttribute('visibility', 'visible');
  }
  const stopButton = host.querySelector<HTMLButtonElement>('#stop'); if (stopButton) stopButton.disabled = !player.playing && !playingKind;
}
async function play(value: Score, kind: 'mine' | 'target' | 'ear') {
  stop(false);
  if (kind === 'ear' && (muted || volume === 0)) { statusKey = 'earNeedSound'; render(); return false; }
  const invalid = scoreIssues(value).find(issue => issue.code !== 'incomplete');
  if (invalid) { statusKey = invalid.code === 'too-long' ? 'limit' : invalid.code === 'out-of-range' ? 'range' : invalid.code; render(); return false; }
  playingScore = cloneScore(value); playingKind = kind; statusKey = 'playing';
  if (kind === 'target') showHint = true;
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
  const copy = c(), lang = language.language, focus = (document.activeElement as HTMLElement | null)?.id;
  const openDisclosures = Array.from(host.querySelectorAll<HTMLDetailsElement>('details[open]')).map(detail => detail.className);
  document.documentElement.lang = lang; document.title = `Transit Tales — ${copy.title}`;
  const lesson = currentLesson(), resolved = resolveScore(draft), event = draft.events[selected];
  const total = resolved.reduce((sum, n) => sum + n.durationBeats, 0);
  const issue = issueText();
  const isEar = mode === 'ear';
  host.innerHTML = `<header class="melody-header"><a href="index.html" class="home-link">← ${esc(copy.home)}</a><h1>${esc(copy.title)}</h1><label class="language-control">${esc(copy.language)}<select id="language">${languageOptions(lang)}</select></label><details class="audio-settings"><summary>${esc(copy.audio)}</summary><div><strong>${esc(copy.tuning)}</strong><label>${esc(copy.volume)}<input id="volume" type="range" min="0" max="100" step="1" value="${Math.round(volume * 100)}"></label><label class="toggle"><input id="mute" type="checkbox"${muted ? ' checked' : ''}>${esc(copy.mute)}</label><p>${esc(copy.precision)}</p></div></details></header>
    <main class="melody-layout"><aside class="journey-choices"><h2>${esc(copy.lessons)}</h2><nav aria-label="${esc(copy.lessons)}">${LESSONS.map((item, i) => `<button id="lesson-${item.id}" data-lesson="${item.id}" aria-current="${mode === item.id ? 'step' : 'false'}"><span class="ticket-number">${i + 1}</span><span>${esc(lessonTitle(lang, item.id))}</span>${progress.completed.includes(item.id) ? `<span aria-label="${esc(copy.completed)}">✓</span>` : ''}</button>`).join('')}<button id="mode-studio" data-mode="studio" aria-current="${mode === 'studio' ? 'page' : 'false'}">✎ ${esc(copy.studio)}</button><button id="mode-ear" data-mode="ear" aria-current="${isEar ? 'page' : 'false'}">♪ ${esc(copy.ear)}</button></nav><p class="save-note">${esc(saveOk ? copy.saved : copy.unsaved)}</p></aside>
    <section class="workshop" aria-label="${esc(copy.title)}"><div class="mission"><h2>${esc(lesson ? lessonTitle(lang, lesson.id) : isEar ? copy.ear : copy.studio)}</h2><p>${esc(lesson ? lessonExplanation(lang, lesson.id) : isEar ? copy.earIntro : copy.intro)}</p></div>
      <div class="scene-toolbar"${isEar ? ' hidden' : ''}><div role="group" aria-label="${esc(copy.contour)}"><button id="view3d" aria-pressed="${view === '3d'}">${esc(copy.view3d)}</button><button id="view2d" aria-pressed="${view === '2d'}">${esc(copy.view2d)}</button></div><span>${esc(copy.tuning)}</span></div><div id="scene-placeholder"${isEar ? ' hidden' : ''}></div>${isEar ? '' : `<p class="scene-caption">${esc(copy.contour)}</p>`}
      ${isEar ? earMarkup(lang) : `<div class="score-heading"><h3>${esc(copy.score)}</h3><span>${total} / ${measureBeats(draft.meter)} · ${esc(copy.beats)}</span></div><div id="draft-staff" class="staff-scroll">${staffMarkup(draft, lang, selected)}</div><div class="journey-actions"><button id="play" class="primary"${draft.events.length ? '' : ' disabled'}>▶ ${esc(copy.play)}</button><button id="stop"${playingKind ? '' : ' disabled'}>■ ${esc(copy.stop)}</button>${lesson ? `<button id="listen">♪ ${esc(copy.listen)}</button><button id="check">✓ ${esc(copy.check)}</button><button id="hint" aria-expanded="${showHint}">${esc(showHint ? copy.hideHint : copy.hint)}</button>` : ''}</div>
      ${lesson && showHint ? `<div id="target-staff" class="target-score"><h3>${esc(copy.listen)}</h3><div class="staff-scroll">${staffMarkup(lesson.target, lang, -1, false)}</div></div>` : ''}
      <div class="score-setup">${field('clef', copy.clef, ['treble','bass','alto','tenor'], value => clefName(lang, value as Score['clef']), draft.clef)}${field('key', copy.key, ['C','G','F','D','Bb'], value => ({ C: 'C · 0', G: 'G · F♯', F: 'F · B♭', D: 'D · F♯ C♯', Bb: 'B♭ · B♭ E♭' })[value as Score['key']], draft.key)}${field('meter', copy.meter, ['2/4','3/4','4/4','6/8'], value => value, `${draft.meter.beats}/${draft.meter.unit}`)}<label>${esc(copy.tempo)}<input id="tempo" type="number" min="40" max="160" step="1" value="${bpm}"></label></div>
      <div class="stop-list" role="group" aria-label="${esc(copy.selected)}">${resolved.map((n, i) => `<button id="stop-${i}" data-select="${i}" aria-pressed="${selected === i}">${i + 1} · ${esc(resolvedLabel(n, lang))}</button>`).join('')}</div>
      ${event ? `<fieldset class="note-bench"><legend>${esc(copy.selected)} ${selected + 1}${resolved[selected].frequency === null ? '' : ` · ${resolved[selected].frequency!.toFixed(6)} Hz`}</legend>${field('letter', copy.letter, ['C','D','E','F','G','A','B'], value => value, event.letter)}${field('octave', copy.octave, ['0','1','2','3','4','5','6','7','8'], value => value, String(event.octave))}${field('accidental', copy.accidental, ['inherit','1','-1','0'], value => value === 'inherit' ? copy.inherit : value === '1' ? copy.sharp : value === '-1' ? copy.flat : copy.natural, event.accidental === null ? 'inherit' : String(event.accidental))}${field('duration', copy.duration, ['whole','half','quarter','eighth','sixteenth'], value => durationName(lang, value as NoteEvent['duration']), event.duration)}<label class="toggle"><input id="dotted" type="checkbox"${event.dotted ? ' checked' : ''}>${esc(copy.dotted)}</label><label class="toggle"><input id="rest" type="checkbox"${event.rest ? ' checked' : ''}>${esc(copy.rest)}</label></fieldset>` : ''}
      <div class="edit-actions"><button id="add"${draft.events.length >= 16 ? ' disabled' : ''}>+ ${esc(copy.add)}</button><button id="remove"${event ? '' : ' disabled'}>${esc(copy.remove)}</button><button id="undo"${history.length ? '' : ' disabled'}>↶ ${esc(copy.undo)}</button><button id="reset">${esc(copy.reset)}</button>${lesson && progress.completed.includes(lesson.id) && LESSONS.indexOf(lesson) < LESSONS.length - 1 ? `<button id="next">${esc(copy.next)} →</button>` : ''}</div><p class="score-issue"${issue ? '' : ' hidden'}>${esc(issue)}</p>`}
      <p id="status" class="journey-status${statusKey === 'success' || statusKey === 'earCorrect' ? ' success' : ''}" role="status">${esc(copy[statusKey])}</p><details class="build-guide"><summary>${esc(copy.guide)}</summary><p>${esc(copy.guideText)}</p></details><p class="listening-note">${esc(copy.disclaimer)}</p>
    </section></main>`;
  const placeholder = host.querySelector('#scene-placeholder')!; placeholder.replaceWith(sceneHost); sceneHost.hidden = isEar;
  wire();
  for (const className of openDisclosures) { const detail = host.querySelector<HTMLDetailsElement>(`details.${className}`); if (detail) detail.open = true; }
  renderer?.render(journeySnapshot()); updatePlayback();
  if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
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
  host.querySelectorAll<HTMLElement>('[data-select],#draft-staff .score-note').forEach(button => {
    const select = () => { selected = Number(button.dataset.select ?? button.dataset.index); render(); };
    button.addEventListener('click', select);
    button.addEventListener('keydown', e => {
      const key = (e as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') { e.preventDefault(); select(); }
      else if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault(); selected = Number(button.dataset.select ?? button.dataset.index);
        const old = draft.events[selected], pitch = pitchAtStaffStep(staffStep(old.letter, old.octave, draft.clef) + (key === 'ArrowUp' ? 1 : -1), draft.clef);
        if (pitch.octave >= 0 && pitch.octave <= 8) edit(() => Object.assign(draft.events[selected], pitch));
      } else if (key === 'Delete') { e.preventDefault(); selected = Number(button.dataset.select ?? button.dataset.index); edit(() => draft.events.splice(selected, 1)); }
    });
  });
  bind('play', 'click', () => { void play(draft, 'mine'); });
  bind('listen', 'click', () => { void play(currentLesson()!.target, 'target'); });
  bind('stop', 'click', () => { stop(); render(); });
  bind('check', 'click', check);
  bind('hint', 'click', () => { showHint = !showHint; render(); });
  bind('next', 'click', () => setMode(LESSONS[LESSONS.indexOf(currentLesson()!) + 1].id));
  bind('add', 'click', () => edit(() => { if (draft.events.length < 16) { draft.events.push(note('C', 4)); selected = draft.events.length - 1; } }));
  bind('remove', 'click', () => edit(() => draft.events.splice(selected, 1)));
  bind('undo', 'click', () => { const last = history.pop(); if (last) { stop(false); draft = last; selected = Math.min(selected, Math.max(0, draft.events.length - 1)); if (mode === 'studio') { progress.studio = cloneScore(draft); persist(); } render(); } });
  bind('reset', 'click', () => edit(() => { draft = cloneScore(mode === 'studio' ? { clef: 'treble', key: 'C', meter: { beats: 4, unit: 4 }, events: [] } : currentLesson()!.initial); selected = 0; }));
  for (const key of ['clef','key'] as const) bind(key, 'change', e => edit(() => { draft[key] = (e.target as HTMLSelectElement).value as never; }));
  bind('meter', 'change', e => edit(() => { const [beats, unit] = (e.target as HTMLSelectElement).value.split('/').map(Number); draft.meter = { beats, unit: unit as 4 | 8 }; }));
  bind('tempo', 'change', e => { const value = Number((e.target as HTMLInputElement).value); stop(false); bpm = Number.isFinite(value) ? Math.round(Math.min(160, Math.max(40, value))) : 80; render(); });
  for (const key of ['letter','octave','duration','accidental'] as const) bind(key, 'change', e => edit(() => {
    const value = (e.target as HTMLSelectElement).value;
    if (key === 'octave') draft.events[selected].octave = Number(value);
    else if (key === 'accidental') draft.events[selected].accidental = value === 'inherit' ? null : Number(value) as -1 | 0 | 1;
    else draft.events[selected][key] = value as never;
  }));
  for (const key of ['rest','dotted'] as const) bind(key, 'change', e => edit(() => { draft.events[selected][key] = (e.target as HTMLInputElement).checked; }));
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
function onHidden() { if (document.hidden) { stop(); earGeneration++; render(); } }
function onPageHide(e: PageTransitionEvent) {
  stop(false); earGeneration++;
  if (!e.persisted) { disposed = true; renderGeneration++; renderer?.dispose(); player.dispose(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', onPageHide); window.removeEventListener('pageshow', onPageShow); }
}
function onPageShow(e: PageTransitionEvent) { if (e.persisted && !disposed) { statusKey = 'stopped'; render(); } }
document.addEventListener('visibilitychange', onHidden); window.addEventListener('pagehide', onPageHide); window.addEventListener('pageshow', onPageShow);
render(); void mountScene();
