import type { Language } from './locale';
import { beijingAnnouncement, type BeijingAnnouncementContext } from './announcements';
import { createRecordedVoicePlayer, type RecordedVoicePlayerOptions } from './voice-player';
export type { BeijingAnnouncementContext } from './announcements';

export interface VoicePort {
  speak(text: string, done: () => void, failed: () => void, context?: BeijingAnnouncementContext): void;
  cancel(): void;
}
interface QueuedAnnouncement { text: string; context?: BeijingAnnouncementContext }
function same(a: QueuedAnnouncement, b: QueuedAnnouncement): boolean {
  return a.text === b.text && a.context?.kind === b.context?.kind && a.context?.stationId === b.context?.stationId && a.context?.lineId === b.context?.lineId;
}

export class AnnouncementQueue {
  active = ''; pending = ''; enabled = false;
  private current?: QueuedAnnouncement;
  private next?: QueuedAnnouncement;
  private generation = 0;
  constructor(private port: VoicePort, private changed: () => void = () => {}) {}
  enable() { this.enabled = true; this.changed(); }
  offer(text: string, eligible = true, context?: BeijingAnnouncementContext) {
    if (!this.enabled || !eligible || !text) return;
    const announcement = { text, context: context ? { ...context } : undefined };
    if (this.current) {
      this.next = same(announcement, this.current) ? undefined : announcement;
      this.pending = this.next?.text ?? ''; this.changed(); return;
    }
    this.start(announcement);
  }
  private start(announcement: QueuedAnnouncement) {
    const generation = ++this.generation;
    this.current = announcement; this.active = announcement.text; this.next = undefined; this.pending = ''; this.changed();
    if (!this.enabled || generation !== this.generation) return;
    const done = () => {
      if (generation !== this.generation) return;
      this.current = undefined; this.active = '';
      const pending = this.next; this.next = undefined; this.pending = ''; this.changed();
      if (pending && this.enabled && generation === this.generation) this.start(pending);
    };
    try {
      this.port.speak(announcement.text, done, () => { if (generation === this.generation) this.stop(); }, announcement.context);
    } catch { if (generation === this.generation) this.stop(); }
  }
  stop() {
    this.enabled = false; this.generation++; this.current = undefined; this.next = undefined; this.active = ''; this.pending = '';
    try { this.port.cancel(); } catch { /* A failed voice must not remove game captions. */ }
    this.changed();
  }
}

export type VoiceStatus = 'off' | 'ready' | 'unavailable';
/** Compatibility name: playback is bundled MP3 media, never an OS speech voice. */
export class DeviceVoice {
  readonly queue: AnnouncementQueue;
  status: VoiceStatus = 'off';
  recordingText = '';
  private language: Language;
  private activated = false;
  private disposed = false;
  private generation = 0;
  private last?: QueuedAnnouncement;
  private player: ReturnType<typeof createRecordedVoicePlayer>;
  constructor(language: Language, private changed: () => void, options: Omit<RecordedVoicePlayerOptions, 'onState'> = {}) {
    this.language = language;
    this.player = createRecordedVoicePlayer({ ...options, onState: state => {
      if (this.disposed) return;
      if (state === 'playing') this.status = 'ready';
      if (state === 'blocked' || state === 'error') this.status = 'unavailable';
      this.changed();
    } });
    this.queue = new AnnouncementQueue({
      speak: (_text, done, failed, context) => {
        if (!this.activated || this.disposed) { this.status = 'unavailable'; failed(); return; }
        const generation = ++this.generation;
        try {
          const recording = beijingAnnouncement(this.language, context);
          this.recordingText = recording.recordingText;
          void this.player.play(recording.clips).then(result => {
            if (generation !== this.generation || this.disposed) return;
            if (result === 'ended') done();
            else if (result === 'blocked' || result === 'error') { this.status = 'unavailable'; failed(); this.changed(); }
          });
        } catch { this.status = 'unavailable'; failed(); this.changed(); }
      },
      cancel: () => { this.generation++; this.player.stop(); this.recordingText = ''; },
    }, changed);
  }
  get audioState() { return this.player.state; }
  /** Call directly in a click/tap handler, after offering the current structured context. */
  enable(caption?: string) {
    if (this.disposed) return;
    this.queue.stop(); this.activated = true; this.queue.enable();
    try { localStorage.setItem('beijing-voice-muted', 'false'); } catch { /* Storage is optional. */ }
    this.queue.offer(caption || this.last?.text || beijingAnnouncement(this.language).recordingText, true, this.last?.context);
  }
  mute() {
    this.queue.stop(); this.activated = false; this.status = 'off';
    try { localStorage.setItem('beijing-voice-muted', 'true'); } catch { /* Storage is optional. */ }
    this.changed();
  }
  /** Fast simulation events coalesce; they never suppress station identity or interrupt active speech. */
  offer(text: string, _eventSeconds: number, _speed: number, context?: BeijingAnnouncementContext) {
    if (this.disposed || !text) return;
    this.last = { text, context: context ? { ...context } : undefined };
    this.queue.offer(text, true, context);
  }
  /** Explicit replay cancels the old logical announcement and retries blocked media within this gesture. */
  replay(caption?: string) { this.enable(caption); }
  setLanguage(language: Language) {
    if (this.disposed || language === this.language) return;
    const wasEnabled = this.queue.enabled;
    this.queue.stop(); this.language = language;
    this.status = wasEnabled ? 'ready' : this.status === 'unavailable' ? 'unavailable' : 'off';
    if (wasEnabled) this.queue.enable();
    this.changed();
  }
  suspend() { this.queue.stop(); this.activated = false; this.status = 'off'; this.last = undefined; this.changed(); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.queue.stop(); this.player.dispose(); this.activated = false; this.status = 'off'; this.last = undefined;
  }
}
