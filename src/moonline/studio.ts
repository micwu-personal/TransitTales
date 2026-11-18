import './studio.css';
import { accompany, pitchName, quantize } from './score';
import type { Song, Track, Note, Role } from './score';
import { decodeMidi, encodeMidi } from './midi';

type StudioOptions = {
  zh: boolean;
  audition: (role: Role, pitch: number) => void;
  save: (song: Song) => boolean;
  close: () => void;
};

const roles: Role[] = ['piano', 'guitar', 'bass', 'pad', 'drums'];
const homePitch: Record<Role, number> = { piano: 60, guitar: 60, bass: 36, pad: 60, drums: 36 };
const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
const blackKeys = [1, 3, 6, 8, 10];
const drums = [36, 38, 42, 46, 45, 49, 51];
const bar = 4;
const maxBeats = 1_000_000;
const minimumNote = 0.001;
const cap = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const newId = () => globalThis.crypto?.randomUUID?.() ?? `moonline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const displayBeat = (beat: number) => String(Number((beat + 1).toFixed(3)));
const compareNotes = (a: Note, b: Note) => a.beat - b.beat || a.pitch - b.pitch;
function copySong(song: Song): Song {
  let beats = song.beats;
  const tracks = song.tracks.map(track => ({
    ...track,
    name: track.name.slice(0, 150),
    notes: track.notes.map(note => {
      beats = Math.max(beats, note.beat + note.length);
      return { ...note };
    }).sort(compareNotes),
  }));
  return { ...song, title: song.title.slice(0, 150), beats, tracks };
}

function readMidiFile(file: File) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reader.onabort = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function firstNoteAt(notes: Note[], beat: number) {
  let low = 0;
  let high = notes.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (notes[mid].beat < beat) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function openStudio(container: HTMLElement, song: Song | undefined, options: StudioOptions): () => void {
  const t = (en: string, zh: string) => options.zh ? zh : en;
  const roleNames: Record<Role, string> = { piano: t('Piano', '钢琴'), guitar: t('Guitar', '吉他'), bass: t('Bass', '贝斯'), pad: t('Pad', '氛围音'), drums: t('Drums', '鼓组') };
  const drumNames = [t('Kick', '底鼓'), t('Snare', '军鼓'), t('Closed hat', '闭镲'), t('Open hat', '开镲'), t('Low tom', '低音嗵鼓'), t('Crash', '碎音镲'), t('Ride', '叮叮镲')];
  const labelPitch = (role: Role, pitch: number) => role !== 'drums' ? pitchName(pitch) : drumNames[drums.indexOf(pitch)] ?? `${roleNames.drums} ${pitch}`;
  let draft = song ? copySong(song) : { id: newId(), title: t('Untitled tune', '未命名曲子'), bpm: 100, beats: 16, tracks: [{ name: t('Melody', '旋律'), role: 'piano', notes: [] }] } satisfies Song;
  if (!draft.tracks.length) draft.tracks.push({ name: t('Melody', '旋律'), role: 'piano', notes: [] });
  let trackIndex = 0;
  let selected: Note | undefined;
  let step = 0.5;
  let noteLength = 0.5;
  let stepMode = true;
  let cursor = 0;
  let page = 0;
  let pitch = homePitch[draft.tracks[0].role];
  let octave = Math.floor(pitch / 12) - 1;
  let dirty = false;
  let disposed = false;
  let frame = 0;
  let playing = false;
  let playBeat = -1;
  let importRun = 0;
  const downloads = new Map<string, number>();
  const track = () => draft.tracks[trackIndex];
  const slotsOnPage = () => Math.ceil(Math.min(bar, draft.beats - page * bar) / step);
  const lastPage = () => Math.max(0, Math.ceil(draft.beats / bar) - 1);
  const lastSlot = () => Math.max(0, (Math.ceil(draft.beats / step) - 1) * step);
  const snapBeat = (beat: number) => cap(quantize(beat, step), 0, lastSlot());
  const slotOf = (beat: number) => Math.floor(beat / step) * step;
  const roleOptions = roles.map(role => `<option value="${role}">${roleNames[role]}</option>`).join('');
  const button = (action: string, label: string, extra = '') => `<button type="button" data-act="${action}" ${extra}>${label}</button>`;

  const root = document.createElement('section');
  root.className = 'ml-studio';
  root.lang = options.zh ? 'zh-CN' : 'en';
  root.setAttribute('aria-label', t('Moonline composition studio', '月光线作曲室'));
  root.innerHTML = `<!-- THESIS: A score you can tap like a departure board, not a miniature DAW.
  OWN-WORLD: Peach ticket stock carries the song; plum ink and mint notes carry the music.
  STORY: Write a phrase at the keys, lay it beside other tracks, listen, and save a playable song.
  FIRST VIEWPORT: Ticket and playback at the top, keys over the full-width arrangement.
  FORM: A conductor’s workbench, directly shaped to the pinned Moonline brief. -->
  <div class="ml-studio-shell">
    <header class="ml-studio-header">
      <div><h1 tabindex="-1">${t('Moonline Studio', '月光线作曲室')}</h1><p>${t('Tap out a tune. Give it a whole train of sounds.', '敲出一段旋律，再给它配上一路的声音。')}</p></div>
      ${button('close', `← ${t('Back', '返回')}`)}
    </header>
    <div class="ml-studio-ticket">
      <div class="ml-studio-ticket-fields">
        <label class="ml-studio-song-title">${t('Song title', '曲名')}<input data-field="title" maxlength="150" type="text" spellcheck="false"></label>
        <label>${t('Tempo (BPM)', '速度 (BPM)')}<input data-field="bpm" type="number" min="1" max="600" step="any"></label>
        <label>${t('Total beats', '总拍数')}<input data-field="beats" type="number" min="0.001" max="${maxBeats}" step="any"></label>
      </div>
      <div class="ml-studio-ticket-actions">
        ${button('play', `▶ ${t('Listen', '试听')}`)}${button('save', t('Save song', '保存曲子'))}
        <p data-part="status" role="status" aria-atomic="true">${t('Saved songs stay on this device.', '曲子保存在这台设备上。')}</p>
      </div>
    </div>
    <section class="ml-studio-keys-section" aria-label="${t('Note keys', '音符琴键')}">
      <div class="ml-studio-heading"><h2>${t('Note keys', '音符琴键')} <span data-part="instrument"></span></h2><div class="ml-studio-entry-tools">
        ${button('mode', t('Step entry', '逐步输入'), 'aria-pressed="true"')}${button('rest', t('Skip step', '跳过一步'))}
        <label>${t('Snap', '对齐网格')}<select data-field="step"><option value="1">${t('1 beat', '1 拍')}</option><option value="0.5" selected>${t('½ beat', '½ 拍')}</option><option value="0.25">${t('¼ beat', '¼ 拍')}</option></select></label>
        <label>${t('New note length', '新音符时长')}<select data-field="length"><option value="0.25">${t('¼ beat', '¼ 拍')}</option><option value="0.5" selected>${t('½ beat', '½ 拍')}</option><option value="1">${t('1 beat', '1 拍')}</option><option value="2">${t('2 beats', '2 拍')}</option><option value="4">${t('4 beats', '4 拍')}</option></select></label>
      </div></div>
      <div class="ml-studio-keybed"><div data-part="keys"></div><div class="ml-studio-register" data-part="register"></div></div>
      <p class="ml-studio-hint" data-part="entry-hint"></p>
    </section>
    <section class="ml-studio-arrangement" aria-label="${t('Arrangement', '编曲')}">
      <div class="ml-studio-heading"><h2>${t('Arrangement', '编曲')}</h2><div class="ml-studio-pager">
        ${button('prev', '←', `aria-label="${t('Previous bar', '上一小节')}"`)}
        <label>${t('Bar', '小节')}<input data-field="page" type="number" min="1" step="1"></label><span data-part="pages"></span>
        ${button('next', '→', `aria-label="${t('Next bar', '下一小节')}"`)}
      </div></div>
      <div class="ml-studio-timeline" data-part="timeline" role="region" aria-label="${t('Track timeline', '轨道时间线')}"></div>
      <p class="ml-studio-hint">${t('Tap + to place the chosen note. Tap any note to edit it below.', '点按 + 放入选中的音符。点按已有音符可在下方修改。')}</p>
    </section>
    <section class="ml-studio-controls" aria-label="${t('Edit notes and tracks', '编辑音符与轨道')}">
      <div class="ml-studio-inspector">
        <h2>${t('Edit note', '编辑音符')}</h2>
        <p class="ml-studio-hint" data-part="inspection"></p>
        <fieldset data-part="note-fields">
          <label class="ml-studio-note-picker">${t('Notes in this step', '这一步的音符')}<select data-field="note"></select></label>
          <label>${t('Pitch (MIDI)', '音高 (MIDI)')}<input data-field="pitch" type="number" min="0" max="127" step="1"></label>
          <label>${t('Start beat', '起始拍')}<input data-field="beat" type="number" min="1" step="any"></label>
          <label>${t('Length (beats)', '时长 (拍)')}<input data-field="duration" type="number" min="0.001" step="any"></label>
          ${button('hear-note', t('Hear note', '试听音符'))}${button('remove-note', t('Remove note', '移除音符'))}
        </fieldset>
      </div>
      <div class="ml-studio-track-tools">
        <h2>${t('Tracks', '轨道')}</h2>
        <div class="ml-studio-track-fields"><label>${t('Track name', '轨道名称')}<input data-field="track-name" type="text" maxlength="150" spellcheck="false"></label>
          <label>${t('Instrument', '乐器')}<select data-field="role">${roleOptions}</select></label></div>
        <div class="ml-studio-actions">${button('snap', t('Snap track notes', '对齐本轨音符'))}${button('remove-track', t('Remove track', '移除轨道'))}${button('add-track', t('Add track', '添加轨道'))}${button('backing', t('Add backing tracks', '添加伴奏轨道'))}</div>
        <p class="ml-studio-hint">${t('Backing adds new tracks without changing your notes.', '伴奏会添加新轨道，不会更改已有音符。')}</p>
      </div>
    </section>
    <footer class="ml-studio-midi">
      <span>${t('Take your tune to another music app with MIDI.', '用 MIDI 把曲子带到其他音乐应用。')}</span>
      <div class="ml-studio-actions">${button('import', t('Import MIDI', '导入 MIDI'))}${button('export', t('Export MIDI', '导出 MIDI'))}</div>
      <input data-part="file" type="file" accept=".mid,.midi,audio/midi,audio/x-midi" hidden>
    </footer>
    <p class="ml-studio-midi-message" data-part="midi-status" role="status" aria-atomic="true"></p>
  </div>`;
  container.append(root);

  const part = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-part="${name}"]`)!;
  const field = <T extends HTMLInputElement | HTMLSelectElement = HTMLInputElement>(name: string) => root.querySelector<T>(`[data-field="${name}"]`)!;
  const action = (name: string) => root.querySelector<HTMLButtonElement>(`[data-act="${name}"]`)!;
  const timeline = part('timeline');
  const fileInput = part<HTMLInputElement>('file');
  function message(text: string, error = false, at = 'status') {
    const node = part(at);
    node.textContent = text;
    node.classList.toggle('is-error', error);
  }
  function setDirty() {
    dirty = true;
    message(t('Unsaved changes', '有未保存的修改'));
  }
  const focusWithin = (scope: HTMLElement) => scope.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.focus : undefined;
  const restoreFocus = (scope: HTMLElement, key: string | undefined) => {
    if (key) scope.querySelector<HTMLElement>(`[data-focus="${key}"]`)?.focus({ preventScroll: true });
  };

  function renderKeys() {
    const keys = part('keys');
    const register = part('register');
    const keyFocus = focusWithin(keys);
    const registerFocus = focusWithin(register);
    const drumTrack = track().role === 'drums';
    const makeKey = (midi: number) => button('key', labelPitch(track().role, midi), `data-pitch="${midi}" data-focus="key-${midi}" aria-pressed="${pitch === midi}" ${midi > 127 ? 'hidden' : ''}`);
    if (drumTrack) {
      keys.innerHTML = `<div class="ml-studio-pads">${drums.map(makeKey).join('')}</div>`;
      register.hidden = true;
      register.textContent = '';
    } else {
      const base = (octave + 1) * 12;
      keys.innerHTML = `<div class="ml-studio-sharps">${blackKeys.map(n => makeKey(base + n)).join('')}</div><div class="ml-studio-naturals">${whiteKeys.map(n => makeKey(base + n)).join('')}</div>`;
      register.hidden = false;
      register.innerHTML = `${button('lower', '−', `aria-label="${t('Lower octave', '降低八度')}" data-focus="lower" ${octave <= -1 ? 'disabled' : ''}`)}<span>${t('Octave', '八度')} <b>${octave}</b></span>${button('higher', '+', `aria-label="${t('Higher octave', '升高八度')}" data-focus="higher" ${octave >= 9 ? 'disabled' : ''}`)}`;
    }
    part('instrument').textContent = track().name;
    action('mode').setAttribute('aria-pressed', String(stepMode));
    part('entry-hint').textContent = stepMode
      ? t(`Beat ${displayBeat(cursor)} · Tap a key to write a note and move to the next step.`, `第 ${displayBeat(cursor)} 拍 · 点按琴键写入音符，然后前进一步。`)
      : t(`Beat ${displayBeat(cursor)} · Tap a key to hear it, then place it in the arrangement.`, `第 ${displayBeat(cursor)} 拍 · 点按琴键试听，再把音符放进编曲。`);
    restoreFocus(keys, keyFocus);
    restoreFocus(register, registerFocus);
    if (registerFocus && document.activeElement === document.body) register.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  function renderTimeline() {
    const oldFocus = focusWithin(timeline);
    const start = page * bar;
    const end = start + bar;
    const slots = slotsOnPage();
    const activeSlot = Math.round((cursor - start) / step);
    const beats = Array.from({ length: slots }, (_, i) => start + i * step);
    const fragment = document.createDocumentFragment();
    const ruler = document.createElement('div');
    ruler.className = 'ml-studio-row ml-studio-ruler';
    ruler.innerHTML = `<span>${t('Track / beat', '轨道 / 拍')}</span>${beats.map(beat => `<span class="${Number.isInteger(beat) ? 'is-beat' : ''}">${displayBeat(beat)}</span>`).join('')}`;
    fragment.append(ruler);
    draft.tracks.forEach((lane, ti) => {
      const row = document.createElement('div');
      row.className = `ml-studio-row ml-studio-lane ml-studio-lane-${lane.role}`;
      row.innerHTML = button('track', '<span></span><small></small>', `data-track="${ti}" data-focus="track-${ti}" aria-pressed="${ti === trackIndex}" class="ml-studio-lane-label"`);
      row.querySelector('span')!.textContent = lane.name || roleNames[lane.role];
      row.querySelector('small')!.textContent = roleNames[lane.role];
      const buckets: { note: Note; index: number }[][] = Array.from({ length: slots }, () => []);
      for (let index = firstNoteAt(lane.notes, start); index < lane.notes.length && lane.notes[index].beat < end; index++) {
        const note = lane.notes[index];
        buckets[Math.floor((note.beat - start) / step)]?.push({ note, index });
      }
      row.insertAdjacentHTML('beforeend', beats.map((beat, slot) => {
        const active = ti === trackIndex && slot === activeSlot;
        const cellNotes = buckets[slot];
        const focusKey = `slot-${ti}-${slot}`;
        const details = cellNotes.slice(0, 3).map(({ note, index }) => {
          const name = labelPitch(lane.role, note.pitch);
          return button('note', `<span>${name}</span>`, `class="ml-studio-note" data-track="${ti}" data-index="${index}" data-focus="note-${ti}-${index}" aria-pressed="${selected === note}" aria-label="${name} · ${t('Beat', '第')} ${displayBeat(note.beat)}" tabindex="-1"`);
        }).join('');
        const more = cellNotes.length > 3 ? button('chord', `+${cellNotes.length - 3}`, `data-track="${ti}" data-slot="${slot}" aria-label="${t('Show all notes in this step', '显示这一步的所有音符')}" tabindex="-1" class="ml-studio-more"`) : '';
        const place = button('place', '+', `class="ml-studio-place" data-track="${ti}" data-slot="${slot}" data-focus="${focusKey}" aria-label="${t('Place note at beat', '在此拍放置音符')} ${displayBeat(beat)}" tabindex="${active ? 0 : -1}"`);
        return `<div class="ml-studio-slot ${Number.isInteger(beat) ? 'is-beat' : ''} ${active ? 'is-cursor' : ''}" data-slot-column="${slot}">${details}${more}${place}</div>`;
      }).join(''));
      fragment.append(row);
    });
    timeline.style.setProperty('--ml-slots', String(slots));
    timeline.textContent = '';
    timeline.appendChild(fragment);
    field('page').value = String(page + 1);
    field('page').max = String(lastPage() + 1);
    part('pages').textContent = `/ ${lastPage() + 1}`;
    action('prev').disabled = page <= 0;
    action('next').disabled = page >= lastPage();
    if (oldFocus && !timeline.querySelector(`[data-focus="${oldFocus}"]`)) focusCursor();
    else restoreFocus(timeline, oldFocus);
    paintPlayhead();
  }

  function focusCursor() {
    timeline.querySelector<HTMLElement>('.is-cursor [data-act="place"]')?.focus({ preventScroll: true });
  }

  function revealCursor() {
    const current = timeline.querySelector('.is-cursor');
    if (!current) return;
    const bounds = timeline.getBoundingClientRect();
    const cell = current.getBoundingClientRect();
    const labelWidth = timeline.querySelector('.ml-studio-lane-label')?.getBoundingClientRect().width ?? 0;
    if (cell.right > bounds.left + timeline.clientWidth) timeline.scrollLeft += cell.right - bounds.left - timeline.clientWidth;
    else if (cell.left < bounds.left + labelWidth) timeline.scrollLeft -= bounds.left + labelWidth - cell.left;
    const rulerHeight = timeline.querySelector('.ml-studio-ruler')?.getBoundingClientRect().height ?? 0;
    if (cell.bottom > bounds.top + timeline.clientHeight) timeline.scrollTop += cell.bottom - bounds.top - timeline.clientHeight;
    else if (cell.top < bounds.top + rulerHeight) timeline.scrollTop -= bounds.top + rulerHeight - cell.top;
  }

  function notesInCursor() {
    const notes = track().notes;
    return notes.slice(firstNoteAt(notes, cursor), firstNoteAt(notes, cursor + step));
  }

  function renderInspector() {
    const notes = notesInCursor();
    const picker = field<HTMLSelectElement>('note');
    picker.textContent = '';
    const choices = document.createDocumentFragment();
    notes.forEach((note, i) => choices.appendChild(new Option(`${labelPitch(track().role, note.pitch)} · ${displayBeat(note.beat)}`, String(i))));
    picker.appendChild(choices);
    if (!notes.length) picker.add(new Option(t('No notes here', '此处没有音符'), ''));
    picker.value = selected ? String(notes.indexOf(selected)) : '';
    if (notes.length && !selected) {
      picker.add(new Option(t('Choose a note', '选择音符'), ''), 0);
      picker.value = '';
    }
    picker.disabled = notes.length === 0;
    for (const control of ['pitch', 'beat', 'duration']) field(control).disabled = !selected;
    action('hear-note').disabled = !selected;
    action('remove-note').disabled = !selected;
    part('inspection').textContent = selected
      ? `${track().name} · ${labelPitch(track().role, selected.pitch)} · ${t('Beat', '拍')} ${displayBeat(selected.beat)}`
      : t('Choose a note in the arrangement to change it.', '在编曲中选一个音符进行修改。');
    field('pitch').value = selected ? String(selected.pitch) : '';
    field('beat').value = selected ? String(selected.beat + 1) : '';
    field('duration').value = selected ? String(selected.length) : '';
    field('track-name').value = track().name;
    field<HTMLSelectElement>('role').value = track().role;
    action('remove-track').disabled = draft.tracks.length <= 1;
    action('add-track').disabled = draft.tracks.length >= 128;
    action('snap').disabled = !track().notes.length;
  }

  function renderSongFields() {
    field('title').value = draft.title;
    field('bpm').value = String(draft.bpm);
    field('beats').value = String(draft.beats);
  }
  function render(reveal = false) {
    renderKeys();
    renderTimeline();
    renderInspector();
    if (reveal) revealCursor();
  }

  function selectTrack(index: number) {
    if (trackIndex === index) return;
    trackIndex = index;
    pitch = homePitch[track().role];
    octave = Math.floor(pitch / 12) - 1;
    selected = undefined;
  }
  function selectNote(note: Note, hear = true) {
    selected = note;
    cursor = slotOf(note.beat);
    page = Math.floor(cursor / bar);
    pitch = note.pitch;
    octave = Math.floor(pitch / 12) - 1;
    if (hear) options.audition(track().role, pitch);
    render(true);
  }
  function putNote(at: number, midi: number) {
    const beat = snapBeat(at);
    const lane = track();
    const existing = lane.notes.find(note => note.beat === beat && note.pitch === midi);
    if (existing) return existing;
    if (lane.notes.length >= 50000) {
      message(t('This track has reached its note limit. Add another track.', '这条轨道的音符已满，请添加新轨道。'), true);
      return;
    }
    stopPlayback();
    const note = { beat, pitch: midi, length: Math.min(draft.beats - beat, noteLength), velocity: 90 };
    lane.notes.push(note);
    lane.notes.sort(compareNotes);
    setDirty();
    return note;
  }
  function moveCursor(target: number) {
    cursor = snapBeat(target);
    page = Math.floor(cursor / bar);
    selected = undefined;
    render(true);
  }
  function advance() {
    if (cursor < lastSlot()) moveCursor(cursor + step);
    else message(t('End of the song. Increase Total beats to keep writing.', '已经到曲尾。增加总拍数就能继续创作。'));
  }

  function paintPlayhead() {
    const onPage = playing && Math.floor(playBeat / bar) === page;
    const next = onPage ? String(Math.floor((playBeat - page * bar) / step)) : '';
    const current = timeline.querySelector<HTMLElement>('.ml-studio-ruler .is-playing')?.dataset.column ?? '';
    if (current === next) return;
    timeline.querySelectorAll('.is-playing').forEach(node => node.classList.remove('is-playing'));
    if (next) {
      const rulerCell = timeline.querySelector<HTMLElement>(`.ml-studio-ruler > :nth-child(${Number(next) + 2})`);
      if (rulerCell) {
        rulerCell.dataset.column = next;
        rulerCell.classList.add('is-playing');
      }
      timeline.querySelectorAll(`[data-slot-column="${next}"]`).forEach(node => node.classList.add('is-playing'));
    }
  }
  function stopPlayback() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!playing) return;
    playing = false;
    playBeat = -1;
    action('play').textContent = `▶ ${t('Listen', '试听')}`;
    paintPlayhead();
  }
  function listen() {
    if (playing) { stopPlayback(); return; }
    const events = draft.tracks.flatMap(lane => lane.notes.map(note => ({ beat: note.beat, pitch: note.pitch, role: lane.role }))).sort((a, b) => a.beat - b.beat);
    if (!events.length) { message(t('Add a note before listening.', '先添加一个音符，再试听。'), true); return; }
    const start = performance.now();
    const tempo = draft.bpm / 60000;
    const end = Math.min(draft.beats, Math.max(...draft.tracks.map(lane => lane.notes.reduce((last, note) => Math.max(last, note.beat + note.length), 0))));
    let index = 0;
    playing = true;
    action('play').textContent = `■ ${t('Stop', '停止')}`;
    function tick(now: number) {
      playBeat = (now - start) * tempo;
      while (index < events.length && events[index].beat <= playBeat + 1e-6) {
        const event = events[index++];
        if (events.length === 1 || event.beat >= playBeat - Math.max(0.3, 150 * tempo)) options.audition(event.role, event.pitch);
      }
      if (playBeat >= end) { stopPlayback(); return; }
      paintPlayhead();
      frame = requestAnimationFrame(tick);
    }
    tick(start);
  }

  function save() {
    const title = field('title').value.trim();
    if (!title) { message(t('Give your song a title before saving.', '请为曲子填写曲名后再保存。'), true); field('title').focus(); return; }
    if (!draft.tracks.some(lane => lane.notes.length)) { message(t('Add at least one note before saving.', '请至少添加一个音符后再保存。'), true); return; }
    stopPlayback();
    const snapshot = copySong({ ...draft, title });
    if (options.save(snapshot)) {
      dirty = false;
      draft.title = title;
      if (!disposed) message(t('Song saved.', '曲子已保存。'));
    } else {
      message(t('Could not save on this device. Keep editing or export a MIDI copy.', '无法保存在此设备上。你可以继续编辑，或导出 MIDI 副本。'), true);
    }
  }
  async function importMidi() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { message(t('Choose a MIDI file smaller than 8 MB.', '请选择小于 8 MB 的 MIDI 文件。'), true, 'midi-status'); return; }
    const run = ++importRun;
    try {
      const bytes = await readMidiFile(file);
      if (disposed || run !== importRun) return;
      const name = file.name.replace(/\.midi?$/i, '').trim().slice(0, 150) || t('Imported tune', '导入的曲子');
      const next = copySong(decodeMidi(bytes, newId(), name));
      if (!Number.isFinite(next.beats) || next.beats <= 0 || next.beats > maxBeats || !Number.isFinite(next.bpm) || next.bpm < 1 || next.bpm > 600 ||
        next.tracks.length > 128 || !next.tracks.some(lane => lane.notes.length) || next.tracks.some(lane => lane.notes.length > 50000)) throw new Error('Unsupported MIDI score');
      if (dirty && !window.confirm(t('Replace the unsaved draft with this MIDI file?', '用此 MIDI 文件替换未保存的草稿吗？'))) return;
      stopPlayback();
      draft = next;
      trackIndex = 0;
      pitch = homePitch[track().role];
      octave = Math.floor(pitch / 12) - 1;
      cursor = page = 0;
      selected = undefined;
      setDirty();
      renderSongFields();
      render(true);
      message(t('MIDI opened as a new draft. Save it to keep it in your songs.', 'MIDI 已作为新草稿打开。保存后即可在曲库中找到它。'), false, 'midi-status');
    } catch {
      if (!disposed && run === importRun) message(t('Could not open this file. Choose a supported MIDI file with notes.', '无法打开文件。请选择受支持且包含音符的 MIDI 文件。'), true, 'midi-status');
    }
  }
  function exportMidi() {
    if (!draft.tracks.some(lane => lane.notes.length)) { message(t('Add a note before exporting MIDI.', '请先添加音符，再导出 MIDI。'), true, 'midi-status'); return; }
    try {
      const title = field('title').value.trim() || t('Untitled tune', '未命名曲子');
      const bytes = new Uint8Array(encodeMidi(copySong({ ...draft, title })));
      const url = URL.createObjectURL(new Blob([bytes.buffer], { type: 'audio/midi' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')}.mid`;
      downloads.set(url, window.setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); }, 1000));
      root.append(link);
      link.click();
      link.remove();
      message(t('MIDI download started.', '已开始下载 MIDI。'), false, 'midi-status');
    } catch { message(t('Could not export this song as MIDI.', '无法将这首曲子导出为 MIDI。'), true, 'midi-status'); }
  }

  function change(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input === fileInput) { void importMidi(); return; }
    const name = input.dataset.field;
    const value = input.valueAsNumber;
    if (name === 'step') {
      step = Number(input.value);
      if (selected) selectNote(selected, false);
      else moveCursor(cursor);
    } else if (name === 'length') noteLength = Number(input.value);
    else if (name === 'page') moveCursor(Number.isFinite(value) ? (cap(Math.round(value), 1, lastPage() + 1) - 1) * bar : page * bar);
    else if (name === 'bpm' || name === 'beats') {
      const old = draft[name];
      if (!Number.isFinite(value) || value < (name === 'bpm' ? 1 : minimumNote) || value > (name === 'bpm' ? 600 : maxBeats)) { input.value = String(old); return; }
      if (name === 'beats' && draft.tracks.some(lane => lane.notes.some(note => note.beat + note.length > value + 1e-9))) {
        input.value = String(old);
        message(t('Some notes extend past that beat. Move or remove them before shortening the song.', '有音符超出此拍。请先移动或移除这些音符，再缩短曲子。'), true);
        return;
      }
      stopPlayback();
      draft[name] = value;
      if (old !== value) setDirty();
      if (name === 'beats') { if (selected) selectNote(selected, false); else moveCursor(cursor); }
    } else if (name === 'note') {
      const note = input.value === '' ? undefined : notesInCursor()[Number(input.value)];
      if (note) selectNote(note);
    } else if (name === 'track-name') {
      const next = input.value.trim() || roleNames[track().role];
      if (next !== track().name) { track().name = next; setDirty(); }
      render();
    } else if (name === 'role') {
      stopPlayback();
      track().role = input.value as Role;
      pitch = homePitch[track().role];
      octave = Math.floor(pitch / 12) - 1;
      setDirty();
      render();
    } else if (selected && (name === 'pitch' || name === 'beat' || name === 'duration')) {
      if (!Number.isFinite(value) || (name === 'duration' && value <= 0)) { renderInspector(); return; }
      stopPlayback();
      if (name === 'pitch') selected.pitch = cap(Math.round(value), 0, 127);
      if (name === 'beat') {
        selected.beat = snapBeat(value - 1);
        selected.length = Math.min(selected.length, draft.beats - selected.beat);
      }
      if (name === 'duration') selected.length = Math.min(Math.max(minimumNote, value), draft.beats - selected.beat);
      track().notes.sort(compareNotes);
      setDirty();
      selectNote(selected, name === 'pitch');
    }
  }

  function click(event: MouseEvent) {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-act]');
    if (!button || button.disabled) return;
    const ti = Number(button.dataset.track);
    switch (button.dataset.act) {
      case 'close':
        if (!dirty || window.confirm(t('Leave without saving this draft?', '不保存草稿就离开吗？'))) { stopPlayback(); options.close(); }
        break;
      case 'play': listen(); break;
      case 'save': save(); break;
      case 'import': fileInput.click(); break;
      case 'export': exportMidi(); break;
      case 'prev': moveCursor((page - 1) * bar); if (action('prev').disabled) field('page').focus(); break;
      case 'next': moveCursor((page + 1) * bar); if (action('next').disabled) field('page').focus(); break;
      case 'mode': stepMode = !stepMode; renderKeys(); break;
      case 'rest': advance(); break;
      case 'lower': case 'higher':
        octave += button.dataset.act === 'lower' ? -1 : 1;
        pitch = cap((octave + 1) * 12 + pitch % 12, 0, 127);
        renderKeys();
        break;
      case 'key': {
        pitch = Number(button.dataset.pitch);
        options.audition(track().role, pitch);
        if (stepMode) {
          const note = putNote(cursor, pitch);
          if (!note) { renderKeys(); break; }
          if (cursor < lastSlot()) advance();
          else { selectNote(note, false); advance(); }
        } else renderKeys();
        break;
      }
      case 'track': selectTrack(ti); render(true); break;
      case 'note': selectTrack(ti); selectNote(track().notes[Number(button.dataset.index)]); break;
      case 'chord':
        selectTrack(ti);
        moveCursor(page * bar + Number(button.dataset.slot) * step);
        field<HTMLSelectElement>('note').focus();
        break;
      case 'place': {
        selectTrack(ti);
        const note = putNote(page * bar + Number(button.dataset.slot) * step, pitch);
        if (note) selectNote(note);
        break;
      }
      case 'hear-note': if (selected) options.audition(track().role, selected.pitch); break;
      case 'remove-note':
        if (!selected) break;
        stopPlayback();
        track().notes = track().notes.filter(note => note !== selected);
        selected = undefined;
        setDirty();
        render();
        if (notesInCursor().length) field<HTMLSelectElement>('note').focus(); else focusCursor();
        break;
      case 'snap':
        stopPlayback();
        for (const note of track().notes) {
          note.beat = snapBeat(note.beat);
          note.length = Math.min(note.length, draft.beats - note.beat);
        }
        track().notes.sort(compareNotes);
        setDirty();
        if (selected) selectNote(selected, false); else render();
        message(t('Track notes aligned to the current grid.', '本轨音符已对齐当前网格。'));
        break;
      case 'add-track': {
        const role = roles.find(role => !draft.tracks.some(lane => lane.role === role)) ?? 'piano';
        draft.tracks.push({ name: `${roleNames[role]} ${draft.tracks.length + 1}`, role, notes: [] });
        selectTrack(draft.tracks.length - 1);
        setDirty();
        render(true);
        field('track-name').focus();
        field('track-name').select();
        break;
      }
      case 'remove-track':
        if (track().notes.length && !window.confirm(t('Remove this track and its notes?', '移除此轨道和其中的音符吗？'))) break;
        stopPlayback();
        const removed = trackIndex;
        draft.tracks.splice(removed, 1);
        trackIndex = -1;
        selectTrack(Math.min(removed, draft.tracks.length - 1));
        setDirty();
        render(true);
        field('track-name').focus();
        break;
      case 'backing': {
        if (!draft.tracks.some(lane => lane.role !== 'drums' && lane.notes.length)) { message(t('Add a melody before making backing tracks.', '请先写一段旋律，再添加伴奏。'), true); break; }
        if (draft.tracks.length > 124 || draft.beats > 8192) { message(t('Backing needs four free tracks and a song of at most 8,192 beats.', '添加伴奏需要四条空余轨道，曲长最多为 8192 拍。'), true); break; }
        stopPlayback();
        const names = [t('Backing chords', '伴奏和弦'), t('Backing pad', '氛围伴奏'), t('Backing bass', '贝斯伴奏'), t('Backing drums', '鼓组伴奏')];
        const parts: Track[] = accompany(draft).map((lane, index) => ({ ...lane, name: names[index], notes: lane.notes.sort(compareNotes) }));
        const first = draft.tracks.length;
        draft.tracks.push(...parts);
        selectTrack(first);
        setDirty();
        render(true);
        message(t('Four backing tracks added. Your original notes are unchanged.', '已添加四条伴奏轨道，原有音符保持不变。'));
        break;
      }
    }
  }

  function keydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (!timeline.contains(target) || !target.matches('[data-act="place"], [data-act="note"]')) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const ti = Number(target.dataset.track);
    const at = page * bar + Number(target.closest<HTMLElement>('[data-slot-column]')?.dataset.slotColumn) * step;
    const nextTrack = cap(ti + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0), 0, draft.tracks.length - 1);
    selectTrack(nextTrack);
    moveCursor(at + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0));
    focusCursor();
  }
  function input(event: Event) {
    if (event.target !== field('title')) return;
    draft.title = field('title').value;
    if (!dirty) setDirty();
  }
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  root.addEventListener('input', input);
  root.addEventListener('keydown', keydown);
  renderSongFields();
  render();
  root.querySelector('h1')?.focus({ preventScroll: true });
  return () => {
    disposed = true;
    root.removeEventListener('click', click);
    root.removeEventListener('change', change);
    root.removeEventListener('input', input);
    root.removeEventListener('keydown', keydown);
    stopPlayback();
    for (const [url, timer] of downloads) { window.clearTimeout(timer); URL.revokeObjectURL(url); }
    downloads.clear();
    root.remove();
  };
}
