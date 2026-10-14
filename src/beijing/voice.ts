import { type Language, t } from './locale';
export interface VoicePort { speak(text: string, done: () => void, failed: () => void): void; cancel(): void }
export class AnnouncementQueue {
  active = ''; pending = ''; enabled = false; private generation = 0;
  constructor(private port: VoicePort, private changed: () => void = () => {}) {}
  enable() { this.enabled = true; this.changed(); }
  offer(text: string, eligible = true) { if (!this.enabled || !eligible || !text) return; if (this.active) { this.pending = text === this.active ? '' : text; this.changed(); return; } this.start(text); }
  private start(text: string) { const generation = ++this.generation; this.active = text; this.pending = ''; this.changed(); const done = () => { if (generation !== this.generation) return; this.active = ''; const pending = this.pending; this.pending = ''; this.changed(); if (pending && this.enabled) this.start(pending); }; try { this.port.speak(text, done, () => { if (generation !== this.generation) return; this.stop(); }); } catch { this.stop(); } }
  stop() { this.enabled = false; this.generation++; this.active = ''; this.pending = ''; try { this.port.cancel(); } catch { /* A failed voice must not remove captions. */ } this.changed(); }
}
export type VoiceStatus = 'off' | 'ready' | 'unavailable';
export class DeviceVoice {
  readonly queue: AnnouncementQueue; status: VoiceStatus = 'off'; private voice?: SpeechSynthesisVoice; private language: Language; private timeout?: ReturnType<typeof setTimeout>; private activated = false;
  constructor(language: Language, private changed: () => void) {
    this.language = language;
    this.queue = new AnnouncementQueue({ speak: (text, done, failed) => { try { this.speak(text, done, failed); } catch { this.status = 'unavailable'; failed(); this.changed(); } }, cancel: () => { clearTimeout(this.timeout); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } }, changed);
  }
  private choose() { try { if (!('speechSynthesis' in window)) return undefined; const tag = this.language === 'en' ? 'en' : this.language === 'zh-CN' ? 'zh' : this.language === 'ja' ? 'ja' : 'mn'; return window.speechSynthesis.getVoices().find(voice => voice.localService && voice.lang.toLowerCase().startsWith(tag)); } catch { return undefined; } }
  enable() { this.voice = this.choose(); this.activated = true; if (!this.voice) { this.status = 'unavailable'; this.changed(); return; } this.status = 'ready'; this.queue.enable(); try { localStorage.setItem('beijing-voice-muted','false'); } catch { /* Voice works without storage. */ } }
  mute() { this.queue.stop(); this.status = 'off'; try { localStorage.setItem('beijing-voice-muted','true'); } catch { /* Voice works without storage. */ } this.changed(); }
  offer(text: string, eventSeconds: number, speed: number) { this.queue.offer(text, eventSeconds / speed >= 8); }
  replay(text: string) { if (!this.queue.enabled) this.enable(); this.queue.offer(text); }
  setLanguage(language: Language) { const wasEnabled = this.queue.enabled; this.queue.stop(); this.language = language; this.voice = this.choose(); this.status = wasEnabled && this.voice ? 'ready' : wasEnabled ? 'unavailable' : 'off'; if (wasEnabled && this.voice) this.queue.enable(); this.changed(); }
  private speak(text: string, done: () => void, failed: () => void) {
    if (!this.voice || !this.activated) { this.status = 'unavailable'; failed(); return; }
    const utterance = new SpeechSynthesisUtterance(text); utterance.voice = this.voice; utterance.lang = this.voice.lang; utterance.rate = 1;
    const finish = () => { clearTimeout(this.timeout); done(); }; utterance.onend = finish; utterance.onerror = () => { clearTimeout(this.timeout); this.status = 'unavailable'; failed(); this.changed(); };
    this.timeout = setTimeout(() => { this.status = 'unavailable'; failed(); this.changed(); }, 45000);
    window.speechSynthesis.speak(utterance);
  }
  suspend() { this.queue.stop(); this.status = 'off'; this.changed(); }
  dispose() { this.queue.stop(); clearTimeout(this.timeout); }
}
