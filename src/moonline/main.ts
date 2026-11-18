import './style.css';
import { JourneyAudio } from './audio';
import { loadLibrary, saveToLibrary } from './library';
import { approachSeconds, compactCodes, cuePosition, hitWindow, instrumentPitches, isBlack, lowerBound, matchingNote, pianoBank, pianoKeys, pianoPitches, pitchBank } from './play';
import { decodeMidi } from './midi';
import { routes as arrangements } from './repertoire';
import { createScenery } from './scenery';
import { pitchName, type Note, type Role, type Song } from './score';
import { openStudio } from './studio';

const game = document.querySelector<HTMLElement>('#moonline')!;
const language = new URLSearchParams(location.search).get('lang');
const zh = language ? language === 'zh' : /^zh/i.test(navigator.language);
const tr = (en: string, cn: string) => zh ? cn : en;
const local = (pair: [string, string]) => pair[zh ? 1 : 0];
document.documentElement.lang = zh ? 'zh-CN' : 'en';
document.title = `${tr('Moonline', '月光列车')} · Transit Tales`;
const clips = import.meta.glob<string>('./scores/*.mid', { eager: true, query: '?inline', import: 'default' });
const midiClip = (id: string) => clips[`./scores/${id}.mid`];
const routes = arrangements.map(({song, ...rest}) => ({...rest, song: decodeMidi(
  Uint8Array.from(atob(midiClip(song.id).split(',')[1]), char => char.charCodeAt(0)), song.id, song.title,
)}));
const audio = new JourneyAudio();
let library = loadLibrary();
let song = routes[0].song;
let track = 0, demo = false, speed = 1, beat = 0, frame = 0, revision = 0;
let state: 'station' | 'play' | 'pause' | 'arrival' = 'station';
let notes: Note[] = [], played = new Set<number>(), streak = 0, lastSection = -1;
let cleanupStudio: (() => void) | undefined;
let textUntil = 0, pendingStart = false;
let pitches: number[] = [], mapped = new Map<string, number>(), keys = new Map<number, HTMLButtonElement>();
let anchors = new Map<number, {x: number; y: number}>();
let pulses = new Map<number, ReturnType<typeof setTimeout>>();
let width = 1, height = 1, banked = false, lastBeat = 0;
const layoutPreference = 'moonline-keyboard';
let keyboardStyle: 'piano' | 'compact' = 'piano';
try { if (localStorage.getItem(layoutPreference) === 'compact') keyboardStyle = 'compact'; } catch { /* optional preference */ }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const route = () => routes.find(r => r.song.id === song.id);
const sections = () => route()?.sections ?? [
  { at: 0, scene: 0, title: ['First light', '初光'], story: ['Your own music opens the signal.', '你的音乐点亮了信号。'] as [string, string] },
  { at: song.beats / 3, scene: 2, title: ['Lantern gardens', '灯火花园'], story: ['A new tune drifts through the trees.', '新的旋律飘进树林。'] as [string, string] },
  { at: song.beats * 2 / 3, scene: 3, title: ['Home platform', '归途站台'], story: ['The station keeps a light on for you.', '车站为你留了一盏灯。'] as [string, string] },
] satisfies NonNullable<ReturnType<typeof route>>['sections'];
const roleCopy: Record<Role, [string, string]> = {piano: ['Piano', '钢琴'], guitar: ['Strings', '弦乐'], bass: ['Bass', '贝司'], pad: ['Pads', '合成铺底'], drums: ['Drums', '鼓组']};
const drumCopy: Record<number, [string, string]> = {35: ['Kick', '底鼓'], 36: ['Kick', '底鼓'], 37: ['Rim', '鼓边'], 38: ['Snare', '军鼓'], 39: ['Clap', '拍手'], 40: ['Snare', '军鼓'], 42: ['Hi-hat', '踩镲'], 44: ['Pedal hat', '脚踩镲'], 45: ['Tom', '通鼓'], 46: ['Open hat', '开镲'], 49: ['Crash', '吊镲'], 51: ['Ride', '叮叮镲']};
const role = () => song.tracks[track].role;
const title = (s: Song) => zh ? routes.find(r => r.song.id === s.id)?.titleZh ?? s.title : s.title;

game.innerHTML = `
  <div class="moon-scene" aria-hidden="true"></div><canvas class="moon-cues" aria-hidden="true"></canvas>
  <header class="moon-top"><a class="moon-home" href="index.html" aria-label="${tr('Back to Transit Tales', '返回旅途故事')}">‹ <span>${tr('Transit Tales', '旅途故事')}</span></a><div class="moon-tools"><button id="moon-studio">${tr('✎ Studio', '✎ 创作室')}</button><a class="moon-lang" href="?lang=${zh ? 'en' : 'zh'}" lang="${zh ? 'en' : 'zh-CN'}">${zh ? 'English' : '简体中文'}</a></div></header>
  <div class="moon-title"><h1>${tr('Moonline', '月光列车')}</h1><p>${tr('Follow the notes to the next station.', '循着音符，驶向下一站。')}</p></div>
  <section class="moon-ticket" aria-labelledby="moon-ticket-title">
    <h2 id="moon-ticket-title">${tr('Departure ticket', '发车车票')}</h2>
    <div class="moon-fields"><label>${tr('Route', '线路')}<select id="moon-song"></select></label><label>${tr('Your part', '你的声部')}<select id="moon-track"></select></label></div>
    <p class="moon-credit"></p>
    <label class="moon-keyboard-choice">${tr('Keyboard', '琴键布局')}<select id="moon-keyboard"><option value="piano">${tr('Piano keys', '钢琴键')}</option><option value="compact">${tr('Compact · used notes', '紧凑 · 仅用到的音')}</option></select></label>
    <div class="moon-options"><label><input type="checkbox" id="moon-demo"> ${tr('Listen first', '先听示范')}</label><label><input type="checkbox" id="moon-slow"> ${tr('Slow practice', '慢速练习')}</label></div>
    <div class="moon-ticket-actions"><button id="moon-start" class="moon-action">${tr('Depart', '发车')} <span aria-hidden="true">→</span></button><button id="moon-edit" hidden>${tr('Edit song', '编辑乐曲')}</button><a id="moon-midi" download>${tr('MIDI file', '下载 MIDI')} <span aria-hidden="true">↓</span></a></div>
  </section>
  <aside class="moon-station"><span class="moon-signal" aria-hidden="true"></span><div><h2 id="moon-station-name"></h2><p id="moon-story"></p></div></aside>
  <div class="moon-caption" aria-hidden="true"></div>
  <section class="moon-console" aria-label="${tr('Cab instrument', '驾驶室乐器')}">
    <div class="moon-rail"><ol class="moon-stops" aria-label="${tr('Stations', '沿途车站')}"></ol><div class="moon-transport"><button id="moon-pause" hidden></button><button id="moon-reset" hidden>${tr('End ride', '结束行程')}</button></div></div>
    <div class="moon-instrument" role="group" aria-label="${tr('Playable instrument', '演奏乐器')}"></div>
    <div class="moon-sill"><span class="moon-role"></span><span class="moon-hint"></span><span class="moon-count"></span></div>
  </section>
  <p class="moon-sr" id="moon-status" role="status"></p><section class="moon-studio" hidden></section>`;
function replace(target: HTMLElement, ...items: Node[]) {
  target.textContent = '';
  target.append(...items);
}
const el = <T extends HTMLElement = HTMLElement>(selector: string) => game.querySelector<T>(selector)!;
const selectSong = el<HTMLSelectElement>('#moon-song'), selectTrack = el<HTMLSelectElement>('#moon-track');
const selectKeyboard = el<HTMLSelectElement>('#moon-keyboard');
selectKeyboard.value = keyboardStyle;
const stage = el('.moon-scene'), scenery = createScenery(stage);
const canvas = el<HTMLCanvasElement>('.moon-cues'), ctx = canvas.getContext('2d');
const instrument = el('.moon-instrument'), ticket = el('.moon-ticket'), studio = el('.moon-studio');
const startButton = el<HTMLButtonElement>('#moon-start'), pauseButton = el<HTMLButtonElement>('#moon-pause'), resetButton = el<HTMLButtonElement>('#moon-reset');
const studioButton = el<HTMLButtonElement>('#moon-studio');
function announce(message: string) { el('#moon-status').textContent = message; }
function caption(message: string, duration = 0) {
  el('.moon-caption').textContent = message;
  textUntil = duration ? performance.now() + duration : 0;
}
const secondsPerBeat = () => 60 / (song.bpm * speed);
const pitchLabel = (pitch: number) => role() === 'drums' && drumCopy[pitch] ? local(drumCopy[pitch]) : pitchName(pitch);
const instrumentWidth = () => instrument.clientWidth || game.clientWidth;
const laneLimit = () => Math.max(8, Math.min(compactCodes.length, Math.floor(instrumentWidth() / 45)));
const whiteLimit = () => Math.max(7, Math.min(11, Math.floor(instrumentWidth() / 43)));
const onPiano = () => keyboardStyle === 'piano' && role() !== 'drums';

function setOptions() {
  replace(selectSong, ...[...routes.map(r => r.song), ...library].map(s => new Option(title(s), s.id)));
  selectSong.value = song.id;
  replace(selectTrack, ...song.tracks.map((t, i) => {
    const part = route()?.partNames?.[i];
    const name = part ? local(part) : t.name;
    const option = new Option(name, String(i)); option.disabled = !t.notes.length; return option;
  }));
  selectTrack.value = String(track);
  const classical = route();
  el('.moon-credit').textContent = classical ? local(classical.composer) : tr('From your studio', '来自你的创作室');
  el('#moon-edit').hidden = Boolean(classical);
  const midi = el<HTMLAnchorElement>('#moon-midi');
  midi.hidden = !classical;
  if (classical) { midi.href = midiClip(song.id); midi.download = `${song.id}.mid`; }
}

function updateAnchors() {
  const ref = canvas.getBoundingClientRect();
  anchors = new Map([...keys].map(([pitch, key]) => {
    const rect = key.getBoundingClientRect();
    return [pitch, {x: rect.left + rect.width / 2 - ref.left, y: rect.top - ref.top}];
  }));
}

function buildInstrument(next: number[]) {
  const focusedPitch = (document.activeElement as HTMLElement | null)?.dataset.pitch;
  pulses.forEach(clearTimeout); pulses.clear();
  pitches = next; keys.clear(); mapped.clear();
  const type = role();
  const piano = onPiano();
  instrument.dataset.role = type;
  instrument.dataset.layout = piano ? 'keys' : 'pads';
  el('.moon-keyboard-choice').hidden = type === 'drums';
  const layout = piano ? pianoKeys(next) : next.map((pitch, i) => ({pitch, black: false, code: compactCodes[i], left: 0, width: 0}));
  replace(instrument, ...layout.map(({pitch, black, code, left, width}) => {
    const key = document.createElement('button');
    key.type = 'button'; key.className = `moon-key${black ? ' moon-black' : ''}`;
    key.dataset.pitch = String(pitch);
    const label = code?.replace('Key', '').replace('Semicolon', ';').replace('Quote', "'").replace('BracketRight', ']') ?? '';
    key.innerHTML = '<span></span><kbd></kbd>';
    key.querySelector('span')!.textContent = pitchLabel(pitch);
    key.querySelector('kbd')!.textContent = label;
    key.setAttribute('aria-label', `${pitchLabel(pitch)}${label ? ` · ${label}` : ''}`);
    if (code) mapped.set(code, pitch);
    if (piano) {
      key.style.left = `${left * 100}%`;
      key.style.width = `${width * 100}%`;
    }
    keys.set(pitch, key);
    return key;
  }));
  if (focusedPitch) (keys.get(Number(focusedPitch)) ?? keys.values().next().value)?.focus();
  el('.moon-role').textContent = local(roleCopy[type]);
  el('.moon-hint').textContent = banked ? tr('Keys follow the score', '按键随乐谱切换') : tr('Tap when a note meets its key', '音符到达琴键时点击');
  updateAnchors();
}

function setupTrack() {
  notes = [...song.tracks[track].notes].sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const horizon = approachSeconds / secondsPerBeat();
  if (onPiano() && notes.length) {
    const all = notes.map(n => n.pitch);
    const extent = all.reduce(([low, high], p) => [Math.min(low, p), Math.max(high, p)], [127, 0]);
    const limit = whiteLimit();
    banked = pianoPitches(extent[0], extent[1]).filter(p => !isBlack(p)).length > limit;
    buildInstrument(pianoBank(notes, 0, banked ? horizon : Infinity, limit));
  } else {
    const limit = laneLimit();
    banked = new Set(notes.map(n => n.pitch)).size > limit;
    buildInstrument(instrumentPitches(notes, 0, horizon, limit));
  }
}

function stationDisplay(at: number) {
  const stops = sections();
  if (lastSection === at) return;
  lastSection = at;
  el('#moon-station-name').textContent = local(stops[at].title);
  el('#moon-story').textContent = local(stops[at].story);
  Array.from(el('.moon-stops').children).forEach((item, i) => {
    if (i === at) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    item.classList.toggle('moon-past', i < at);
  });
}
function setStops() {
  replace(el('.moon-stops'), ...sections().map(s => {
    const li = document.createElement('li'); li.textContent = local(s.title); return li;
  }));
  lastSection = -1; stationDisplay(0);
}

function statusView() {
  game.dataset.state = state;
  ticket.hidden = state !== 'station' && state !== 'arrival';
  pauseButton.hidden = state !== 'play' && state !== 'pause';
  resetButton.hidden = pauseButton.hidden;
  studioButton.hidden = ticket.hidden;
  pauseButton.textContent = state === 'pause' ? tr('Resume', '继续') : tr('Pause', '暂停');
  el('#moon-ticket-title').textContent = state === 'arrival' ? tr('End of the line', '列车到站') : tr('Departure ticket', '发车车票');
  startButton.firstChild!.textContent = state === 'arrival' ? tr('Ride again ', '再坐一次 ') : tr('Depart ', '发车 ');
}
function updateCount() { el('.moon-count').textContent = demo ? tr('Listening', '示范') : `${played.size} / ${notes.length}`; }
function end(next: 'station' | 'arrival' = 'station') {
  const moveFocus = ticket.hidden && studio.hidden;
  revision++; audio.stop(); lastBeat = 0; pendingStart = false;
  cancelAnimationFrame(frame); frame = 0;
  state = next; beat = next === 'arrival' ? song.beats : 0;
  startButton.disabled = false;
  if (next === 'station') { played.clear(); streak = 0; }
  caption(next === 'arrival' ? demo ? tr('Journey complete', '旅程结束') : tr(`${played.size} notes brought home`, `带回了 ${played.size} 个音符`) : '');
  statusView(); updateCount(); draw(beat);
  if (moveFocus && document.activeElement === document.body) startButton.focus();
}
function chooseSong(id: string) {
  song = [...routes.map(r => r.song), ...library].find(s => s.id === id) ?? routes[0].song;
  track = song.tracks.findIndex(t => t.notes.length); if (track < 0) track = 0;
  setOptions(); setStops(); setupTrack(); end();
}
function pause(message = tr('Train paused', '列车已暂停')) {
  if (state !== 'play') return;
  beat = lastBeat;
  audio.stop(); cancelAnimationFrame(frame); frame = 0;
  state = 'pause'; statusView(); caption(message); announce(message);
}
async function start(resume = false) {
  if (pendingStart) return;
  const request = ++revision; pendingStart = true; startButton.disabled = true; pauseButton.disabled = true;
  try {
    await audio.unlock();
    if (request !== revision || document.hidden) return;
    if (!resume) { played.clear(); streak = 0; beat = 0; setupTrack(); }
    const from = resume ? Math.max(0, Math.min(song.beats, beat)) : 0;
    audio.start(song, demo ? -1 : track, from, resume && beat >= 0 ? 0 : 3, speed);
    lastBeat = audio.beat;
    state = 'play'; statusView(); updateCount(); caption('');
    if (!resume) pauseButton.focus();
    frame = requestAnimationFrame(tick);
  } catch {
    if (revision === request) {
      const message = tr('Sound could not start. Tap again to retry.', '声音未能启动，请再点一次。');
      caption(message); announce(message);
    }
  } finally {
    if (revision === request) { pendingStart = false; startButton.disabled = false; pauseButton.disabled = false; }
  }
}
function audition(type: Role, pitch: number, seconds = .26) {
  if (state === 'play' && audio.running) { audio.tap(type, pitch, seconds); return; }
  const request = revision;
  void audio.unlock().then(() => { if (request === revision && !document.hidden) audio.tap(type, pitch, seconds); }).catch(() => {});
}
function pulse(pitch: number) {
  const key = keys.get(pitch); if (!key) return;
  clearTimeout(pulses.get(pitch)); key.classList.add('moon-pressed');
  pulses.set(pitch, setTimeout(() => { pulses.delete(pitch); key.classList.remove('moon-pressed'); }, 150));
}
function playPitch(pitch: number) {
  const at = state === 'play' ? audio.beat : beat;
  let duration = .26;
  if (state === 'play' && !demo) {
    const match = matchingNote(notes, played, pitch, at, secondsPerBeat());
    if (match >= 0) {
      played.add(match); streak++; updateCount();
      duration = notes[match].length * secondsPerBeat();
      caption(streak % 8 === 0 ? tr(`${streak} notes found`, `找到 ${streak} 个音符`) : tr('On track', '正合拍'), 650);
    } else { streak = 0; }
  }
  audition(role(), pitch, duration); pulse(pitch);
}

function draw(at: number) {
  const stops = sections();
  const stop = stops.reduce((index, s, i) => at >= s.at ? i : index, 0);
  const from = stops[stop].at, to = stops[stop + 1]?.at ?? song.beats;
  const progress = Math.max(0, Math.min(1, (at - from) / Math.max(.001, to - from)));
  stationDisplay(stop); scenery.draw(stops[stop].scene, reduceMotion.matches ? .25 : progress);
  el('.moon-stops').style.setProperty('--trip', `${Math.max(0, Math.min(1, at / song.beats)) * 100}%`);
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (state !== 'play' && state !== 'pause') return;
  const spb = secondsPerBeat();
  if (banked && at >= 0) {
    const earliest = lowerBound(notes, at - hitWindow / spb, n => n.beat);
    whileBank: for (let i = earliest; i < notes.length && (notes[i].beat - at) * spb < approachSeconds; i++) {
      if (!played.has(i) && !keys.has(notes[i].pitch)) {
        const start = at - hitWindow / spb, horizon = (approachSeconds + hitWindow) / spb;
        const group = onPiano() ? pianoBank(notes, start, horizon, whiteLimit(), at + hitWindow / spb) : pitchBank(notes, start, horizon, laneLimit());
        if (group.join() !== pitches.join()) buildInstrument(group);
        break whileBank;
      }
    }
  }
  const first = lowerBound(notes, at - hitWindow / spb, n => n.beat);
  const horizonX = width / 2, horizonY = height * .37;
  for (let index = first, count = 0; index < notes.length && count < 256; index++, count++) {
    const n = notes[index], dt = (n.beat - at) * spb;
    if (dt > approachSeconds) break;
    if (played.has(index)) continue;
    const key = anchors.get(n.pitch);
    if (!key) continue;
    if (demo && dt <= 0 && state === 'play') {
      if (!played.has(index)) { played.add(index); pulse(n.pitch); }
      continue;
    }
    const locked = reduceMotion.matches;
    const {x, y, depth} = locked ? {x: key.x, y: key.y - 9, depth: 1} : cuePosition(dt, horizonX, horizonY, key.x, key.y);
    if (locked && dt > .65) continue;
    const scale = 3 + 8 * depth;
    ctx.globalAlpha = (dt < 0 ? 1 + dt / hitWindow : .16 + .84 * depth) * (locked && dt > .18 ? .48 : 1);
    ctx.strokeStyle = '#c7f8c8'; ctx.fillStyle = '#e6ffd6'; ctx.lineWidth = 1.5 + depth;
    ctx.beginPath(); ctx.ellipse(x, y, scale, scale * .55, -.34, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + scale * .8, y - 1); ctx.lineTo(x + scale * .8, y - scale * 2); ctx.lineTo(x + scale * 1.5, y - scale * 1.65); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function tick() {
  if (state !== 'play') return;
  beat = audio.beat; lastBeat = beat;
  if (beat >= song.beats) {
    const message = demo ? tr('Journey complete', '旅程结束') : tr(`Arrived. You played ${played.size} of ${notes.length} notes.`, `已到站。你演奏了 ${played.size} / ${notes.length} 个音符。`);
    announce(message); end('arrival'); startButton.focus(); return;
  }
  if (!audio.running || document.hidden) { pause(); return; }
  if (beat < 0) caption(String(Math.max(1, Math.ceil(-beat))));
  else if (textUntil ? performance.now() > textUntil : /^\d$/.test(el('.moon-caption').textContent ?? '')) caption('');
  draw(beat);
  frame = requestAnimationFrame(tick);
}
function resize() {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  width = rect.width; height = rect.height;
  if (width < 1 || height < 1) return;
  canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); scenery.resize();
  if (state === 'station' || state === 'arrival') setupTrack(); else updateAnchors();
  draw(beat);
}

function launchStudio(edit?: Song) {
  end(); audio.stop();
  const siblings = Array.from(game.children).filter((item): item is HTMLElement => item instanceof HTMLElement && item !== studio);
  siblings.forEach(item => { item.classList.add('moon-behind'); });
  studio.hidden = false;
  const close = () => {
    const cleanup = cleanupStudio; cleanupStudio = undefined; cleanup?.();
    studio.hidden = true; siblings.forEach(item => item.classList.remove('moon-behind'));
    revision++; audio.stop(); resize(); studioButton.focus();
  };
  cleanupStudio = openStudio(studio, edit, {zh, audition, close, save: saved => {
    const result = saveToLibrary(library, saved); if (!result) return false;
    library = result; close(); chooseSong(saved.id); startButton.focus();
    announce(tr('Song saved. It is ready to play.', '乐曲已保存，可以开始演奏。')); return true;
  }});
}

selectSong.onchange = () => chooseSong(selectSong.value);
selectTrack.onchange = () => { track = Number(selectTrack.value); setupTrack(); end(); };
selectKeyboard.onchange = () => {
  keyboardStyle = selectKeyboard.value === 'compact' ? 'compact' : 'piano';
  try { localStorage.setItem(layoutPreference, keyboardStyle); } catch { /* optional preference */ }
  setupTrack();
};
el<HTMLInputElement>('#moon-demo').onchange = e => { demo = (e.target as HTMLInputElement).checked; updateCount(); };
el<HTMLInputElement>('#moon-slow').onchange = e => { speed = (e.target as HTMLInputElement).checked ? .70 : 1; };
startButton.onclick = () => void start();
pauseButton.onclick = () => state === 'play' ? pause() : void start(true);
resetButton.onclick = () => { end(); startButton.focus(); };
studioButton.onclick = () => launchStudio();
el<HTMLButtonElement>('#moon-edit').onclick = () => launchStudio(song);
instrument.addEventListener('pointerdown', event => {
  const key = (event.target as HTMLElement).closest<HTMLButtonElement>('.moon-key');
  if (key && event.button === 0) { event.preventDefault(); playPitch(Number(key.dataset.pitch)); }
});
instrument.addEventListener('click', event => {
  const key = (event.target as HTMLElement).closest<HTMLButtonElement>('.moon-key');
  if (key && event.detail === 0) playPitch(Number(key.dataset.pitch));
});
document.addEventListener('keydown', event => {
  if (!studio.hidden || event.altKey || event.ctrlKey || event.metaKey || event.repeat || (event.target as HTMLElement).matches('select,input,textarea,[contenteditable]')) return;
  if (event.key === 'Escape' && state === 'play') { pause(); pauseButton.focus(); return; }
  const pitch = mapped.get(event.code);
  if (pitch !== undefined) { event.preventDefault(); playPitch(pitch); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state === 'play') pause(); else audio.stop(); }
});
window.addEventListener('pagehide', () => { if (state === 'play') pause(); else audio.stop(); });
window.addEventListener('resize', resize);
if (typeof ResizeObserver === 'function') new ResizeObserver(updateAnchors).observe(instrument);
chooseSong(song.id); resize();
