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
  let pitch = draft.tracks[0].notes[0]?.pitch ?? homePitch[draft.tracks[0].role];
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
  root.innerHTML = `
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
    <section class="ml-studio-arrangement" aria-labelledby="ml-roll-title">
      <div class="ml-studio-heading"><h2 id="ml-roll-title">${t('Piano roll', '钢琴卷帘')}</h2><div class="ml-studio-pager">
        ${button('prev', '←', `aria-label="${t('Previous 4 beats', '前 4 拍')}"`)}
        <label>${t('Page', '页')}<input data-field="page" type="number" min="1" step="1"></label><span data-part="pages"></span>
        ${button('next', '→', `aria-label="${t('Next 4 beats', '后 4 拍')}"`)}
      </div></div>
      <div class="ml-studio-roll-tools ml-studio-entry-tools">
        <label>${t('Track', '轨道')}<select data-field="track"></select></label>
        <label>${t('Snap', '对齐网格')}<select data-field="step"><option value="1">${t('1 beat', '1 拍')}</option><option value="0.5" selected>${t('½ beat', '½ 拍')}</option><option value="0.25">${t('¼ beat', '¼ 拍')}</option></select></label>
        <label>${t('New note length', '新音符时长')}<select data-field="length"><option value="0.25">${t('¼ beat', '¼ 拍')}</option><option value="0.5" selected>${t('½ beat', '½ 拍')}</option><option value="1">${t('1 beat', '1 拍')}</option><option value="2">${t('2 beats', '2 拍')}</option><option value="4">${t('4 beats', '4 拍')}</option></select></label>
      </div>
      <div class="ml-studio-roll">
        <div class="ml-studio-timeline" data-part="timeline" role="region" aria-label="${t('Pitches and beats', '音高和拍点')}"></div>
        <div class="ml-studio-note-dock">
          <p class="ml-studio-hint" data-part="roll-hint">${t('Tap an empty square to write. Tap a note to hear or edit it. Scroll for more pitches.', '点空格写入音符，点音符试听或编辑。滚动查看更多音高。')}</p>
          <div data-part="note-tools" role="group" aria-label="${t('Selected note actions', '所选音符操作')}" hidden>
            <p data-part="inspection" role="status"></p>
            <div class="ml-studio-actions">
              ${button('hear-note', t('Hear', '试听'))}${button('shorter', t('Shorter', '缩短'))}${button('longer', t('Longer', '延长'))}
              ${button('remove-note', t('Delete', '删除'), `aria-label="${t('Delete note', '删除音符')}"`)}
              ${button('clear-note', '×', `aria-label="${t('Deselect note', '取消选择音符')}"`)}
            </div>
            <details class="ml-studio-precision">
              <summary>${t('Precise edit', '精确编辑')}</summary>
              <fieldset>
                <label>${t('Pitch (MIDI)', '音高 (MIDI)')}<input data-field="pitch" type="number" min="0" max="127" step="1"></label>
                <label>${t('Start beat', '起始拍')}<input data-field="beat" type="number" min="1" step="any"></label>
                <label>${t('Length (beats)', '时长 (拍)')}<input data-field="duration" type="number" min="0.001" step="any"></label>
              </fieldset>
            </details>
          </div>
        </div>
      </div>
    </section>
    <details class="ml-studio-keys-section">
      <summary>${t('On-screen keys & step entry', '屏幕琴键和逐步输入')}</summary>
      <div class="ml-studio-heading"><h2>${t('Note keys', '音符琴键')} <span data-part="instrument"></span></h2><div class="ml-studio-entry-tools">
        ${button('mode', t('Step entry', '逐步输入'), 'aria-pressed="true"')}${button('rest', t('Skip step', '跳过一步'))}
      </div></div>
      <div class="ml-studio-keybed"><div data-part="keys"></div><div class="ml-studio-register" data-part="register"></div></div>
      <p class="ml-studio-hint" data-part="entry-hint"></p>
    </details>
    <section class="ml-studio-controls" aria-label="${t('Edit tracks', '编辑轨道')}">
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

  function lanePitches() {
    return track().role === 'drums'
      ? [...new Set([...drums, ...track().notes.map(note => note.pitch), pitch])]
      : Array.from({ length: 128 }, (_, i) => 127 - i);
  }

  function renderTimeline() {
    const oldFocus = focusWithin(timeline);
    const scrollTop = timeline.scrollTop;
    const scrollLeft = timeline.scrollLeft;
    const start = page * bar;
    const end = Math.min(start + bar, draft.beats);
    const span = end - start;
    const slots = slotsOnPage();
    const beats = Array.from({ length: slots }, (_, i) => start + i * step);
    const pct = (beat: number) => (beat - start) / span * 100;
    const lane = track();
    const byPitch = new Map<number, string[]>();
    const last = firstNoteAt(lane.notes, end);
    for (let i = 0; i < last; i++) {
      const note = lane.notes[i];
      const finish = note.beat + note.length;
      if (finish <= start) continue;
      const name = labelPitch(lane.role, note.pitch);
      const left = pct(Math.max(start, note.beat));
      const width = pct(Math.min(end, finish)) - left;
      const block = button('note', name, `class="ml-studio-note ${note.beat < start ? 'is-held' : ''} ${finish > end ? 'is-tied' : ''}" data-index="${i}" data-focus="note-${i}" aria-pressed="${selected === note}" aria-label="${name} · ${t('Beat', '拍')} ${displayBeat(note.beat)} · ${Number(note.length.toFixed(3))} ${t('beats', '拍')}" tabindex="-1" style="--ml-left:${left}%;--ml-width:${width}%"`);
      const blocks = byPitch.get(note.pitch);
      if (blocks) blocks.push(block); else byPitch.set(note.pitch, [block]);
    }
    timeline.style.setProperty('--ml-slots', String(slots));
    timeline.innerHTML = `<div class="ml-studio-sheet ml-studio-lane-${lane.role}">
      <div class="ml-studio-row ml-studio-ruler"><span>${t('Beat', '拍')}</span><div>${beats.filter(Number.isInteger).map(beat => `<span style="--ml-left:${pct(beat)}%">${displayBeat(beat)}</span>`).join('')}</div></div>
      ${lanePitches().map(midi => {
        const name = labelPitch(lane.role, midi);
        const tone = lane.role === 'drums' ? 'is-drum' : blackKeys.includes(midi % 12) ? 'is-sharp' : midi % 12 === 0 ? 'is-c' : '';
        return `<div class="ml-studio-row ml-studio-lane ${tone}">
          ${button('pitch-key', name, `class="ml-studio-lane-label" data-pitch="${midi}" tabindex="-1" aria-label="${t('Hear', '试听')} ${name}"`)}
          <div class="ml-studio-lane-grid">${beats.map((beat, i) => {
            const active = midi === pitch && beat === cursor;
            return button('place', '', `class="ml-studio-place ${Number.isInteger(beat) ? 'is-beat' : ''} ${active ? 'is-cursor' : ''}" data-pitch="${midi}" data-slot="${i}" data-focus="cell-${midi}-${i}" aria-label="${name} · ${t('Beat', '拍')} ${displayBeat(beat)}" tabindex="${active ? 0 : -1}" style="--ml-left:${pct(beat)}%;--ml-width:${pct(Math.min(end, beat + step)) - pct(beat)}%"`);
          }).join('')}${byPitch.get(midi)?.join('') ?? ''}</div></div>`;
      }).join('')}
      <div class="ml-studio-playhead" data-part="playhead" hidden><div></div></div>
    </div>`;
    timeline.scrollTop = scrollTop;
    timeline.scrollLeft = scrollLeft;
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
    timeline.querySelector<HTMLElement>('.is-cursor')?.focus({ preventScroll: true });
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

  function renderInspector() {
    part('roll-hint').hidden = Boolean(selected);
    part('note-tools').hidden = !selected;
    part('inspection').textContent = selected
      ? `${labelPitch(track().role, selected.pitch)} · ${t('Beat', '拍')} ${displayBeat(selected.beat)} · ${Number(selected.length.toFixed(3))} ${t('beats', '拍')}` : '';
    field('pitch').value = selected ? String(selected.pitch) : '';
    field('beat').value = selected ? String(selected.beat + 1) : '';
    field('duration').value = selected ? String(selected.length) : '';
    action('shorter').disabled = !selected || selected.length <= step;
    action('longer').disabled = !selected || selected.beat + selected.length >= draft.beats;
    const picker = field<HTMLSelectElement>('track');
    picker.replaceChildren(...draft.tracks.map((lane, i) => new Option(lane.name || roleNames[lane.role], String(i))));
    picker.value = String(trackIndex);
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
    pitch = track().notes[firstNoteAt(track().notes, page * bar)]?.pitch ?? track().notes[0]?.pitch ?? homePitch[track().role];
    octave = Math.floor(pitch / 12) - 1;
    selected = undefined;
  }
  function selectNote(note: Note, hear = true, keepPage = false) {
    selected = note;
    const pageStart = page * bar;
    const staysVisible = keepPage && note.beat < pageStart + bar && note.beat + note.length > pageStart;
    cursor = staysVisible ? Math.max(pageStart, slotOf(note.beat)) : slotOf(note.beat);
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
    const head = part('playhead');
    const start = page * bar;
    const span = Math.min(bar, draft.beats - start);
    head.hidden = !playing || playBeat < start || playBeat >= start + span;
    if (!head.hidden) head.style.setProperty('--ml-left', `${(playBeat - start) / span * 100}%`);
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
      pitch = track().notes[0]?.pitch ?? homePitch[track().role];
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
    } else if (name === 'track') {
      selectTrack(Number(input.value));
      render(true);
    } else if (name === 'track-name') {
      const next = input.value.trim() || roleNames[track().role];
      if (next !== track().name) { track().name = next; setDirty(); }
      render();
    } else if (name === 'role') {
      stopPlayback();
      track().role = input.value as Role;
      pitch = homePitch[track().role];
      octave = Math.floor(pitch / 12) - 1;
      selected = undefined;
      setDirty();
      render(true);
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
      case 'pitch-key': options.audition(track().role, Number(button.dataset.pitch)); break;
      case 'note': {
        const note = track().notes[Number(button.dataset.index)];
        selectNote(note, true, true);
        timeline.querySelector<HTMLElement>('[data-act="note"][aria-pressed="true"]')?.focus({ preventScroll: true });
        break;
      }
      case 'place': {
        const midi = Number(button.dataset.pitch);
        const at = page * bar + Number(button.dataset.slot) * step;
        const existing = event.detail === 0 ? track().notes.slice(0, firstNoteAt(track().notes, at + step)).find(note => note.pitch === midi && note.beat + note.length > at) : undefined;
        const note = existing ?? putNote(at, midi);
        if (note) {
          selectNote(note, true, true);
          timeline.querySelector<HTMLElement>('[data-act="note"][aria-pressed="true"]')?.focus({ preventScroll: true });
        }
        break;
      }
      case 'hear-note': if (selected) options.audition(track().role, selected.pitch); break;
      case 'shorter': case 'longer':
        if (selected) {
          stopPlayback();
          selected.length = Math.min(draft.beats - selected.beat, Math.max(minimumNote, selected.length + (button.dataset.act === 'longer' ? step : -step)));
          setDirty();
          selectNote(selected, false, true);
          if (button.disabled) action('hear-note').focus({ preventScroll: true });
        }
        break;
      case 'clear-note': case 'remove-note':
        if (!selected) break;
        if (button.dataset.act === 'remove-note') {
          stopPlayback();
          track().notes = track().notes.filter(note => note !== selected);
          setDirty();
        }
        selected = undefined;
        render(true);
        focusCursor();
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
    if (selected && (timeline.contains(target) || part('note-tools').contains(target)) && event.key === 'Escape') {
      event.preventDefault();
      action('clear-note').click();
      return;
    }
    if (!timeline.contains(target) || !target.matches('[data-act="place"], [data-act="note"]')) return;
    if (event.key === 'Delete' && selected) { event.preventDefault(); action('remove-note').click(); return; }
    if (event.key === 'Tab' && !event.shiftKey && selected) {
      event.preventDefault();
      action('hear-note').focus();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const pitches = lanePitches();
    const at = target.dataset.slot === undefined ? cursor : page * bar + Number(target.dataset.slot) * step;
    const midi = target.dataset.pitch === undefined ? pitch : Number(target.dataset.pitch);
    pitch = pitches[cap(pitches.indexOf(midi) + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0), 0, pitches.length - 1)];
    octave = Math.floor(pitch / 12) - 1;
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
  const initial = timeline.querySelector<HTMLElement>('.is-cursor');
  if (initial) timeline.scrollTop += initial.getBoundingClientRect().top - timeline.getBoundingClientRect().top - timeline.clientHeight / 2;
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
