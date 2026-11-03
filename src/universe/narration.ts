import type { Language } from '../rush/locale';

export type NarrationStatus = 'off' | 'ready' | 'speaking' | 'unavailable' | 'no-voice' | 'error';
interface Request { text: string; short: boolean; expiresAt: number; onStart?: () => void; }
interface SpeechOptions { automatic?: boolean; onStart?: () => void; }
// Pending flybys must not survive a typical route leg; active lines have no time limit.
const FLYBY_MAX_WAIT_MS = 2500;

function voiceRank(voice: SpeechSynthesisVoice, language: Language): number {
  const tag = voice.lang.toLowerCase().replace(/_/g, '-');
  const exact = tag === language.toLowerCase();
  const natural = /natural|neural|xiaoxiao|xiaoyi|yunxi|xiaomeng|xiaohan|yunyang/i.test(voice.name);
  const american = language === 'en' && /^en-us(?:-|$)/.test(tag);
  const ana = american && voice.name === 'Microsoft Ana Online (Natural) - English (United States)';
  return (ana ? 1000 : 0) + (american ? 200 : 0) + (exact ? 100 : 0) + (natural ? 40 : 0) + (voice.default ? 5 : 0) + (voice.localService ? 1 : 0);
}
export function narrationVoices(voices: readonly SpeechSynthesisVoice[], language: Language): SpeechSynthesisVoice[] {
  return voices.filter(voice => {
    const tag = voice.lang.toLowerCase().replace(/_/g, '-');
    if (language === 'zh-CN') return !tag.includes('-hk') && (tag === 'zh' || /^(?:zh-(?:cn|tw|sg|hans|hant)|cmn)(?:-|$)/.test(tag));
    if (language === 'mn-Mong-CN') return /^mn-mong(?:-|$)/.test(tag);
    if (language === 'mn-Cyrl-MN') return /^mn(?:-|$)/.test(tag) && !tag.includes('mong');
    return tag.split('-')[0] === language;
  }).sort((a, b) => voiceRank(b, language) - voiceRank(a, language) || a.name.localeCompare(b.name));
}

export function createNarration(onChange: () => void) {
  const synth = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
  const supported = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
  const preferences = new Map<Language, string>();
  let language: Language = 'en', enabled = false, disposed = false, paused = false;
  let status: NarrationStatus = supported ? 'off' : 'unavailable';
  let utterance: SpeechSynthesisUtterance | null = null, active: Request | null = null, pending: Request | null = null;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  function voices() {
    if (!supported) return [];
    try { return narrationVoices(synth!.getVoices?.() ?? [], language); }
    catch { return []; }
  }
  function voice() { const choices = voices(); return choices.find(v => v.voiceURI === preferences.get(language)) ?? choices[0]; }
  function notify(next: NarrationStatus) { status = next; onChange(); }
  function cancel() {
    clearTimeout(startTimer); startTimer = undefined;
    const owned = utterance;
    utterance = null; active = null;
    if (owned) { owned.onstart = null; owned.onend = null; owned.onerror = null; synth!.cancel(); }
  }
  function rest(): NarrationStatus { return !supported ? 'unavailable' : !enabled ? 'off' : voices().length ? 'ready' : 'no-voice'; }
  function drain() {
    if (utterance || paused || disposed || !enabled) return;
    const request = pending;
    if (!request) return;
    if (request.expiresAt <= Date.now()) { pending = null; notify(rest()); return; }
    start(request);
  }
  function finish(item: SpeechSynthesisUtterance, failed = false) {
    if (utterance !== item) return;
    clearTimeout(startTimer); startTimer = undefined;
    item.onstart = null; item.onend = null; item.onerror = null;
    utterance = null; active = null;
    // Native speech cannot reliably fade. Complete the current line, then
    // start only the newest still-relevant automatic cue, never a backlog.
    if (pending) drain();
    if (!utterance) notify(failed ? 'error' : rest());
  }
  function start(request: Request) {
    pending = null;
    if (disposed || !enabled || !supported || !request.text.trim()) { notify(rest()); return; }
    if (paused) { pending = request; notify(rest()); return; }
    const selected = voice();
    if (!selected) { pending = request; notify('no-voice'); return; }
    const item = new SpeechSynthesisUtterance(request.text);
    utterance = item; active = request;
    item.voice = selected; item.lang = selected.lang; item.volume = .85;
    item.rate = request.short ? 1.06 : language === 'zh-CN' ? .94 : .98;
    item.pitch = 1;
    item.onstart = () => { if (utterance === item) { clearTimeout(startTimer); request.onStart?.(); notify('speaking'); } };
    item.onend = () => finish(item);
    item.onerror = () => finish(item, true);
    notify('ready');
    // Some browsers silently reject speech without a fresh user gesture.
    startTimer = setTimeout(() => { if (utterance === item && status !== 'speaking') { pending = null; cancel(); notify('error'); } }, 3500);
    try { synth!.speak(item); } catch { pending = null; cancel(); notify('error'); }
  }
  function voicesChanged() {
    if (disposed) return;
    if (pending && !utterance && !paused && enabled && voice()) { drain(); return; }
    if (!utterance) status = rest();
    onChange();
  }
  let listening = false;
  let previousVoicesChanged: SpeechSynthesis['onvoiceschanged'] = null;
  let fallbackVoicesChanged: SpeechSynthesis['onvoiceschanged'] = null;
  if (supported) {
    try {
      if (typeof synth!.addEventListener === 'function') {
        synth!.addEventListener('voiceschanged', voicesChanged); listening = true;
      } else {
        previousVoicesChanged = synth!.onvoiceschanged;
        fallbackVoicesChanged = event => { try { previousVoicesChanged?.call(synth!, event); } finally { voicesChanged(); } };
        synth!.onvoiceschanged = fallbackVoicesChanged;
      }
    } catch { /* Voice controls remain usable when browser event registration fails. */ }
  }
  return {
    get supported() { return supported; },
    get enabled() { return enabled; },
    get status() { return status; },
    get busy() { return !!utterance || !!pending; },
    get selectedVoice() { return preferences.get(language) ?? ''; },
    get voiceName() { return utterance?.voice?.name ?? voice()?.name ?? ''; },
    voices,
    setEnabled(value: boolean) { if (disposed) return; enabled = value && supported; if (!enabled) { pending = null; cancel(); } notify(rest()); },
    setLanguage(value: Language) { if (value === language || disposed) return; pending = null; cancel(); language = value; notify(rest()); },
    setVoice(uri: string) { if (disposed) return; pending = null; cancel(); if (voices().some(v => v.voiceURI === uri)) preferences.set(language, uri); else preferences.delete(language); notify(rest()); },
    speak(text: string, short = false, options: SpeechOptions = {}) {
      if (disposed || !enabled || !supported || !text.trim()) return;
      const request = { text, short, onStart: options.onStart, expiresAt: options.automatic && short ? Date.now() + FLYBY_MAX_WAIT_MS : Infinity };
      if (!options.automatic) cancel();
      pending = request;
      drain();
    },
    setPaused(value: boolean) {
      if (value === paused || disposed) return;
      paused = value;
      if (paused) {
        pending = pending ?? active;
        // The journey is frozen too: its latest interrupted line remains valid.
        if (pending) pending.expiresAt = Infinity;
        cancel(); notify(rest());
      } else drain();
    },
    stop() { pending = null; cancel(); if (!disposed) notify(rest()); },
    dispose() {
      disposed = true; enabled = false; pending = null; cancel();
      try {
        if (listening) synth!.removeEventListener?.('voiceschanged', voicesChanged);
        if (fallbackVoicesChanged && synth!.onvoiceschanged === fallbackVoicesChanged) synth!.onvoiceschanged = previousVoicesChanged;
      } catch { /* Disposal must not prevent the rest of the app from cleaning up. */ }
    },
  };
}
