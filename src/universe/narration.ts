import type { Language } from '../rush/locale';

export type NarrationStatus = 'off' | 'ready' | 'speaking' | 'unavailable' | 'no-voice' | 'error';
interface Request { text: string; short: boolean; }

function voiceRank(voice: SpeechSynthesisVoice, language: Language): number {
  const tag = voice.lang.toLowerCase().replaceAll('_', '-');
  const exact = tag === language.toLowerCase();
  const natural = /natural|neural|xiaoxiao|xiaoyi|yunxi|xiaomeng|xiaohan|yunyang/i.test(voice.name);
  return (exact ? 100 : 0) + (natural ? 40 : 0) + (voice.default ? 5 : 0) + (voice.localService ? 1 : 0);
}
export function narrationVoices(voices: readonly SpeechSynthesisVoice[], language: Language): SpeechSynthesisVoice[] {
  return voices.filter(voice => {
    const tag = voice.lang.toLowerCase().replaceAll('_', '-');
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
  function voices() { return supported ? narrationVoices(synth!.getVoices(), language) : []; }
  function voice() { const choices = voices(); return choices.find(v => v.voiceURI === preferences.get(language)) ?? choices[0]; }
  function notify(next: NarrationStatus) { status = next; onChange(); }
  function cancel() {
    clearTimeout(startTimer); startTimer = undefined;
    const owned = utterance;
    utterance = null; active = null;
    if (owned) { owned.onstart = null; owned.onend = null; owned.onerror = null; synth!.cancel(); }
  }
  function rest(): NarrationStatus { return !supported ? 'unavailable' : !enabled ? 'off' : voices().length ? 'ready' : 'no-voice'; }
  function speak(request: Request) {
    cancel(); pending = null;
    if (disposed || !enabled || !supported || !request.text.trim()) { notify(rest()); return; }
    if (paused) { pending = request; notify(rest()); return; }
    const selected = voice();
    if (!selected) { pending = request; notify('no-voice'); return; }
    const item = new SpeechSynthesisUtterance(request.text);
    utterance = item; active = request;
    item.voice = selected; item.lang = selected.lang; item.volume = .85;
    item.rate = request.short ? 1.06 : language === 'zh-CN' ? .94 : .98;
    item.pitch = 1;
    item.onstart = () => { if (utterance === item) { clearTimeout(startTimer); notify('speaking'); } };
    item.onend = () => { if (utterance === item) { cancel(); notify(rest()); } };
    item.onerror = () => { if (utterance === item) { cancel(); notify('error'); } };
    notify('ready');
    // Some browsers silently reject speech without a fresh user gesture.
    startTimer = setTimeout(() => { if (utterance === item && status !== 'speaking') { cancel(); notify('error'); } }, 3500);
    try { synth!.speak(item); } catch { cancel(); notify('error'); }
  }
  function voicesChanged() {
    if (disposed) return;
    if (pending && !paused && enabled && voice()) { speak(pending); return; }
    if (!utterance) status = rest();
    onChange();
  }
  if (supported) synth!.addEventListener('voiceschanged', voicesChanged);
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
    speak(text: string, short = false) { if (!disposed) speak({ text, short }); },
    setPaused(value: boolean) {
      if (value === paused || disposed) return;
      paused = value;
      if (paused) { pending = active ?? pending; cancel(); notify(rest()); }
      else if (pending && enabled) speak(pending);
    },
    stop() { pending = null; cancel(); if (!disposed) notify(rest()); },
    dispose() { disposed = true; enabled = false; pending = null; cancel(); if (supported) synth!.removeEventListener('voiceschanged', voicesChanged); },
  };
}
