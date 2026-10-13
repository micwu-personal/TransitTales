import { type Game, type LineId } from './model';
import { text, type Language } from './locale';
import { createInteriorSnapshot, interiorAnnouncement, interiorScene, interiorText, type InteriorSelection } from './interior';
import { announcementText, announcementAsset, type Announcement } from './announcements';
import { createBroadcastQueue, type BroadcastRecording } from './broadcast';
import { metroExperienceText } from './experience-copy';

export function createInteriorInspector(host: HTMLElement, getGame: () => Game, getLanguage: () => Language) {
  let selection: InteriorSelection | null = null;
  let platformLine: LineId | undefined;
  let descriptor: Announcement | undefined;
  let preview = '';
  let signature = '';
  let speechSignature = '';
  let speechLanguage = getLanguage();
  let state = 'idle';
  let muted = false;
  let returnFocus: Element | null = null;
  try { muted = localStorage.getItem('transit-tales-voice-muted') === 'true'; } catch { /* Sound preferences are optional. */ }
  state = muted ? 'muted' : 'idle';
  host.hidden = true;
  host.innerHTML = `<div class="interior-top"><div><h2 id="interior-title"></h2><p id="interior-subtitle"></p></div><button id="interior-close" class="secondary"></button></div><div class="interior-layout"><div><div id="interior-scene"></div><p id="interior-count"></p><p class="interior-caption" id="interior-caption"></p></div><div class="broadcast"><label id="platform-label" for="platform-line"></label><select id="platform-line"></select><h3 id="broadcast-title"></h3><p id="broadcast-mode"></p><blockquote id="broadcast-caption"></blockquote><p id="broadcast-pending" class="interior-caption" hidden></p><div class="broadcast-actions"><button id="broadcast-play" class="primary"></button><button id="broadcast-mute" class="secondary"></button></div><p id="broadcast-status" role="status" aria-live="polite"></p><p class="interior-caption" id="broadcast-voice-note" hidden></p><details><summary id="broadcast-studio"></summary><p id="broadcast-preview-help"></p><select id="broadcast-preview"></select></details></div></div>`;
  const $ = (id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
  function showStatus() {
    const c = interiorText(getLanguage());
    $('broadcast-status').textContent = c[state as keyof typeof c] ?? c.idle;
    $('broadcast-mute').textContent = muted ? c.unmute : c.mute;
    $('broadcast-mute').setAttribute('aria-pressed', String(muted));
  }
  const player = createBroadcastQueue({ muted,
    onState: next => { state = next; showStatus(); },
    onCurrent: recording => { if (recording) $('broadcast-caption').textContent = recording.caption; },
    onPending: recording => {
      $('broadcast-pending').hidden = !recording;
      $('broadcast-pending').textContent = recording ? `${metroExperienceText(getLanguage()).queued}: ${recording.caption}` : '';
    },
  });
  const recording = (): BroadcastRecording | undefined => descriptor ? { url: announcementAsset(getLanguage(), descriptor), caption: announcementText(getLanguage(), descriptor) } : undefined;
  function play() { const next = recording(); if (next) player.playNow(next); }
  function render(automatic = true) {
    if (!selection) return;
    const language = getLanguage(), c = interiorText(language);
    const view = createInteriorSnapshot(getGame(), selection, language, platformLine);
    if (!view) { close(); return; }
    const visualSignature = JSON.stringify([view, language]);
    if (visualSignature !== signature) {
      signature = visualSignature;
      $('interior-title').textContent = `${c[view.kind]} · ${view.title}`;
      $('interior-subtitle').textContent = c.live;
      $('interior-close').textContent = c.close;
      $('interior-scene').innerHTML = interiorScene(view, language);
      $('interior-count').textContent = `${view.count} ${view.kind === 'train' ? c.aboard : c.waiting}${view.count > 24 ? ` · +${view.count - 24} ${c.more}` : ''}${view.kind === 'train' ? ` · ${c.seats} ${view.capacity}` : ''}`;
      $('interior-caption').textContent = view.count ? c.sampling : c.empty;
      const select = $('platform-line') as HTMLSelectElement;
      select.replaceChildren(...view.lines.map(line => new Option(text(language, line), line)));
      select.value = view.line; select.hidden = view.kind === 'train'; $('platform-label').hidden = select.hidden;
      $('platform-label').textContent = c.chooseLine;
      $('broadcast-title').textContent = c.sound;
      $('broadcast-play').textContent = c.replay;
      $('broadcast-studio').textContent = c.preview;
      $('broadcast-preview-help').textContent = c.previewHelp;
      const voiceNote = $('broadcast-voice-note');
      voiceNote.hidden = !('voiceNote' in c);
      voiceNote.textContent = 'voiceNote' in c ? c.voiceNote : '';
      const choices = ['', 'next', 'approaching', 'terminus', 'arriving', 'pass-through', 'safety'];
      ($('broadcast-preview') as HTMLSelectElement).innerHTML = choices.map(kind => `<option value="${kind}">${kind === '' ? c.liveBroadcast : kind === 'pass-through' ? c.pass : c[kind as 'approaching']}</option>`).join('');
      ($('broadcast-preview') as HTMLSelectElement).value = preview;
      $('broadcast-preview').setAttribute('aria-label', c.preview);
      showStatus();
    }
    descriptor = interiorAnnouncement(view, preview ? preview as Announcement['kind'] : undefined);
    const nextSpeech = JSON.stringify([descriptor, language]);
    $('broadcast-mode').textContent = preview ? c.preview : c.liveBroadcast;
    const languageChanged = language !== speechLanguage;
    if (languageChanged) { player.stop(); speechLanguage = language; }
    if (!player.current) $('broadcast-caption').textContent = announcementText(language, descriptor);
    if (nextSpeech !== speechSignature) {
      const followJourney = automatic && Boolean(speechSignature) && !preview && getGame().phase === 'playing';
      speechSignature = nextSpeech;
      if (followJourney && !muted) player.enqueue(recording()!);
    }
    if (automatic && languageChanged && !muted) play();
    showStatus();
  }
  function close() {
    selection = null; host.hidden = true; player.stop();
    if (returnFocus instanceof HTMLElement || returnFocus instanceof SVGElement) returnFocus.focus();
  }
  function open(next: InteriorSelection) {
    returnFocus = document.activeElement; selection = next; platformLine = undefined; preview = ''; signature = ''; speechSignature = ''; host.hidden = false;
    render(false); play();
    $('interior-close').focus({ preventScroll: true });
    host.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
  }
  $('interior-close').onclick = close;
  $('broadcast-play').onclick = play;
  $('broadcast-mute').onclick = () => { muted = !muted; player.setMuted(muted); state = muted ? 'muted' : 'idle'; showStatus(); try { localStorage.setItem('transit-tales-voice-muted', String(muted)); } catch { /* Preference is optional. */ } };
  $('platform-line').onchange = e => { platformLine = (e.target as HTMLSelectElement).value as LineId; preview = ''; render(false); play(); };
  $('broadcast-preview').onchange = e => { preview = (e.target as HTMLSelectElement).value; render(false); play(); };
  const onKey = (event: KeyboardEvent) => { if (selection && event.key === 'Escape') { event.preventDefault(); close(); } };
  document.addEventListener('keydown', onKey);
  return { open, render, close, stop: () => player.stop(), dispose: () => { player.dispose(); document.removeEventListener('keydown', onKey); } };
}
