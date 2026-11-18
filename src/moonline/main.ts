import './style.css';
import { JourneyAudio } from './audio';
import { loadLibrary, saveToLibrary } from './library';
import { approachSeconds, compactCodes, cuePosition, hitWindow, instrumentPitches, isBlack, lowerBound, matchingNote, pianoBank, pianoKeys, pianoPitches, pitchBank } from './play';
import { decodeMidi } from './midi';
import { routes as arrangements } from './repertoire';
import { createScenery } from './scenery';
import { drawStaff, drawStaffNote, staffCue, staffStep } from './staff';
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
let width = 1, height = 1, banked = false;
const layoutPreference = 'moonline-keyboard';
let keyboardStyle: 'piano' | 'compact' = 'piano';
const cuePreference = 'moonline-cues';
let cueStyle: 'flight' | 'staff' = 'flight', staffCenter = 71;
try {
  if (localStorage.getItem(layoutPreference) === 'compact') keyboardStyle = 'compact';
  if (localStorage.getItem(cuePreference) === 'staff') cueStyle = 'staff';
} catch { /* optional preferences */ }
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
    <div class="moon-ticket-face">
      <div class="moon-fields">
        <button id="moon-song" class="moon-stamp" aria-controls="moon-picker"><small>${tr('Route', '线路')}</small><strong></strong></button>
        <button id="moon-track" class="moon-stamp" aria-controls="moon-picker"><small>${tr('Your part', '你的声部')}</small><strong></strong></button>
      </div>
      <p class="moon-credit"></p>
      <div class="moon-switches">
        <div class="moon-levers moon-keyboard-choice" role="group" aria-label="${tr('Keyboard', '琴键布局')}"><button data-keyboard="piano" aria-pressed="true">${tr('Piano keys', '钢琴键')}</button><button data-keyboard="compact" aria-pressed="false">${tr('Compact keys', '紧凑琴键')}</button></div>
        <div class="moon-levers" role="group" aria-label="${tr('Note path', '音符轨道')}"><button data-cues="flight" aria-pressed="true">${tr('Note flight', '飞行音符')}</button><button data-cues="staff" aria-pressed="false">${tr('Staff railway', '五线谱铁路')}</button></div>
      </div>
      <div class="moon-options"><button id="moon-demo" class="moon-lamp" aria-pressed="false">${tr('Listen first', '先听示范')}</button><button id="moon-slow" class="moon-lamp" aria-pressed="false">${tr('Slow practice', '慢速练习')}</button></div>
      <div class="moon-ticket-actions"><button id="moon-start" class="moon-action">${tr('Depart', '发车')} <span aria-hidden="true">→</span></button><button id="moon-ticket-end" hidden>${tr('End ride', '结束行程')}</button><button id="moon-edit" hidden>${tr('Edit song', '编辑乐曲')}</button><a id="moon-midi" download>${tr('MIDI file', '下载 MIDI')} <span aria-hidden="true">↓</span></a></div>
      <p class="moon-error" hidden></p>
    </div>
    <section id="moon-picker" aria-labelledby="moon-picker-title" hidden>
      <div class="moon-picker-head"><h3 id="moon-picker-title"></h3><button id="moon-picker-back">${tr('‹ Back to ticket', '‹ 返回车票')}</button></div>
      <ul class="moon-picker-list"></ul>
    </section>
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
const songButton = el<HTMLButtonElement>('#moon-song'), trackButton = el<HTMLButtonElement>('#moon-track');
const picker = el('#moon-picker'), ticketFace = el('.moon-ticket-face');
let pickerTrigger: HTMLButtonElement | undefined;
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

function partTitle(index: number) {
  const part = route()?.partNames?.[index];
  return part ? local(part) : song.tracks[index].name;
}
function closePicker(focus = false) {
  picker.hidden = true; ticketFace.hidden = false;
  if (focus) pickerTrigger?.focus();
  pickerTrigger = undefined;
}
function openPicker(kind: 'route' | 'part') {
  const pickingRoute = kind === 'route';
  pickerTrigger = pickingRoute ? songButton : trackButton;
  const options = pickingRoute ? [...routes.map(r => r.song), ...library].map(s => ({
    label: title(s), selected: s.id === song.id, disabled: false, choose: () => chooseSong(s.id),
  })) : song.tracks.map((t, i) => ({
    label: partTitle(i), selected: i === track, disabled: !t.notes.length, choose: () => {
      track = i; setOptions(); setupTrack(); end();
    },
  }));
  el('#moon-picker-title').textContent = pickingRoute ? tr('Choose a route', '选择线路') : tr('Choose your part', '选择声部');
  replace(el('.moon-picker-list'), ...options.map(({label, selected, disabled, choose}) => {
    const item = document.createElement('li'), button = document.createElement('button');
    button.textContent = label; button.disabled = disabled;
    if (selected) button.setAttribute('aria-current', 'true');
    button.onclick = () => { closePicker(); if (!selected) choose(); (pickingRoute ? songButton : trackButton).focus(); };
    item.append(button); return item;
  }));
  ticketFace.hidden = true; picker.hidden = false;
  el('#moon-picker-back').focus();
}
function setSwitches() {
  game.dataset.cues = cueStyle;
  game.querySelectorAll<HTMLButtonElement>('[data-keyboard], [data-cues]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.keyboard === keyboardStyle || button.dataset.cues === cueStyle));
  });
  el('#moon-demo').setAttribute('aria-pressed', String(demo));
  el('#moon-slow').setAttribute('aria-pressed', String(speed < 1));
}
function setOptions() {
  songButton.querySelector('strong')!.textContent = title(song);
  trackButton.querySelector('strong')!.textContent = partTitle(track);
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

function setupTrack(at = 0) {
  notes = [...song.tracks[track].notes].sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const byPitch = notes.map(n => n.pitch).sort((a, b) => a - b);
  const middle = byPitch[Math.floor(byPitch.length / 2)] ?? 71;
  staffCenter = [35, 50, 71, 83, 95, 107].reduce((best, p) => Math.abs(p - middle) < Math.abs(best - middle) ? p : best);
  const spb = secondsPerBeat(), start = Math.max(0, at - hitWindow / spb);
  const horizon = (approachSeconds + hitWindow) / spb;
  if (onPiano() && notes.length) {
    const all = notes.map(n => n.pitch);
    const extent = all.reduce(([low, high], p) => [Math.min(low, p), Math.max(high, p)], [127, 0]);
    const limit = whiteLimit();
    banked = pianoPitches(extent[0], extent[1]).filter(p => !isBlack(p)).length > limit;
    buildInstrument(pianoBank(notes, start, banked ? horizon : Infinity, limit, at + hitWindow / spb));
  } else {
    const limit = laneLimit();
    banked = new Set(notes.map(n => n.pitch)).size > limit;
    buildInstrument(instrumentPitches(notes, start, horizon, limit));
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
  const paused = state === 'pause';
  ticket.hidden = state === 'play';
  instrument.inert = paused;
  pauseButton.hidden = state !== 'play';
  resetButton.hidden = pauseButton.hidden;
  studioButton.hidden = ticket.hidden || paused;
  songButton.disabled = trackButton.disabled = paused;
  el('#moon-ticket-end').hidden = !paused;
  el('.moon-options').hidden = paused;
  el('#moon-edit').hidden = paused || Boolean(route());
  el('#moon-midi').hidden = paused || !route();
  el('#moon-ticket-title').textContent = paused ? tr('Train paused', '列车已暂停') : state === 'arrival' ? tr('End of the line', '列车到站') : tr('Departure ticket', '发车车票');
  startButton.firstChild!.textContent = paused ? tr('Resume ride ', '继续行程 ') : state === 'arrival' ? tr('Ride again ', '再坐一次 ') : tr('Depart ', '发车 ');
}
function updateCount() { el('.moon-count').textContent = demo ? tr('Listening', '示范') : `${played.size} / ${notes.length}`; }
function end(next: 'station' | 'arrival' = 'station') {
  const moveFocus = ticket.hidden && studio.hidden;
  revision++; audio.stop(); pendingStart = false;
  cancelAnimationFrame(frame); frame = 0;
  state = next; beat = next === 'arrival' ? song.beats : 0;
  startButton.disabled = false;
  el('.moon-error').hidden = true;
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
  audio.stop(); beat = audio.beat;
  cancelAnimationFrame(frame); frame = 0;
  state = 'pause'; statusView(); caption(''); draw(beat); announce(message);
  if (!document.hidden) startButton.focus();
}
async function start(resume = false) {
  if (pendingStart) return;
  const request = ++revision; pendingStart = true; startButton.disabled = true;
  el('.moon-error').hidden = true;
  try {
    await audio.unlock();
    if (request !== revision || document.hidden) return;
    if (!resume) { played.clear(); streak = 0; beat = 0; setupTrack(); }
    const from = resume ? Math.max(0, Math.min(song.beats, beat)) : 0;
    audio.start(song, demo ? -1 : track, from, resume ? Math.max(0, -beat) : 3, speed);
    state = 'play'; statusView(); updateCount(); caption('');
    pauseButton.focus();
    frame = requestAnimationFrame(tick);
  } catch {
    if (revision === request) {
      const message = tr('Sound could not start. Tap again to retry.', '声音未能启动，请再点一次。');
      const error = el('.moon-error');
      error.textContent = message; error.hidden = false; announce(message);
    }
  } finally {
    if (revision === request) { pendingStart = false; startButton.disabled = false; }
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
  if (state === 'pause' || !picker.hidden) return;
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
  const staff = cueStyle === 'staff';
  const active = state === 'play' || state === 'pause';
  stationDisplay(stop); scenery.draw(stops[stop].scene, reduceMotion.matches ? .25 : progress, active && staff);
  el('.moon-stops').style.setProperty('--trip', `${Math.max(0, Math.min(1, at / song.beats)) * 100}%`);
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (!active) return;
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
  const locked = reduceMotion.matches;
  const horizonX = width / 2, horizonY = height * .37;
  const ref = staff ? canvas.getBoundingClientRect() : undefined;
  const cab = staff ? instrument.getBoundingClientRect() : undefined;
  const vanishing = {x: horizonX, y: horizonY};
  const deck = {x: horizonX, y: Math.max(horizonY + 5, (cab && ref ? cab.top - ref.top : height) - Math.min(73, height * .13))};
  const spacing = Math.min(22, (cab?.width ?? width) / 21);
  const pitched = role() !== 'drums';
  if (cab && ref) drawStaff(ctx, vanishing, deck, spacing, at, spb, !locked, cab.left - ref.left, cab.right - ref.left);
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
    if (locked && dt > .65) continue;
    const step = pitched ? staffStep(n.pitch, staffCenter) : ((key.x - deck.x) / Math.max(1, cab?.width ?? width)) * 9;
    const {x, y, depth} = locked ? {...key, depth: 1} : staff
      ? staffCue(step, dt, vanishing, deck, spacing, key) : cuePosition(dt, horizonX, horizonY, key.x, key.y);
    const scale = 3 + 8 * depth;
    ctx.globalAlpha = (dt < 0 ? 1 + dt / hitWindow : .16 + .84 * depth) * (locked && dt > .18 ? .48 : 1);
    if (staff) {
      const onStaff = !locked && y <= deck.y;
      drawStaffNote(ctx, x, y, scale, step, n.pitch, pitched && onStaff, spacing * (.08 + .92 * (y - horizonY) / (deck.y - horizonY)));
      continue;
    }
    ctx.strokeStyle = '#c7f8c8'; ctx.fillStyle = '#e6ffd6'; ctx.lineWidth = 1.5 + depth;
    ctx.beginPath(); ctx.ellipse(x, y, scale, scale * .55, -.34, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + scale * .8, y - 1); ctx.lineTo(x + scale * .8, y - scale * 2); ctx.lineTo(x + scale * 1.5, y - scale * 1.65); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function tick() {
  if (state !== 'play') return;
  beat = audio.beat;
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
  setupTrack(beat);
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

songButton.onclick = () => openPicker('route');
trackButton.onclick = () => openPicker('part');
el<HTMLButtonElement>('#moon-picker-back').onclick = () => closePicker(true);
game.querySelectorAll<HTMLButtonElement>('button[data-keyboard]').forEach(button => {
  button.onclick = () => {
    keyboardStyle = button.dataset.keyboard === 'compact' ? 'compact' : 'piano';
    try { localStorage.setItem(layoutPreference, keyboardStyle); } catch { /* optional preference */ }
    setSwitches(); setupTrack(beat); draw(beat);
  };
});
game.querySelectorAll<HTMLButtonElement>('button[data-cues]').forEach(button => {
  button.onclick = () => {
    cueStyle = button.dataset.cues === 'staff' ? 'staff' : 'flight';
    try { localStorage.setItem(cuePreference, cueStyle); } catch { /* optional preference */ }
    setSwitches(); draw(beat);
  };
});
el<HTMLButtonElement>('#moon-demo').onclick = () => { demo = !demo; setSwitches(); updateCount(); };
el<HTMLButtonElement>('#moon-slow').onclick = () => { speed = speed === 1 ? .70 : 1; setSwitches(); };
startButton.onclick = () => void start(state === 'pause');
pauseButton.onclick = () => pause();
resetButton.onclick = el<HTMLButtonElement>('#moon-ticket-end').onclick = () => { end(); startButton.focus(); };
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
  if (event.key === 'Escape' && !picker.hidden) { closePicker(true); return; }
  if (event.key === 'Escape' && state === 'play') { pause(); return; }
  if (state === 'pause' || !picker.hidden) return;
  const pitch = mapped.get(event.code);
  if (pitch !== undefined) { event.preventDefault(); playPitch(pitch); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state === 'play') pause(); else audio.stop(); }
});
window.addEventListener('pagehide', () => { if (state === 'play') pause(); else audio.stop(); });
window.addEventListener('resize', resize);
reduceMotion.addEventListener('change', () => draw(beat));
if (typeof ResizeObserver === 'function') new ResizeObserver(updateAnchors).observe(instrument);
setSwitches(); chooseSong(song.id); resize();
