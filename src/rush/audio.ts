import { announcementAsset, type Announcement } from './announcements';
import type { Language } from './locale';

export type AudioState = 'idle' | 'loading' | 'playing' | 'ended' | 'blocked' | 'error' | 'muted';
export interface AnnouncementPlayerOptions {
  onState?: (state: AudioState) => void;
  createAudio?: () => HTMLAudioElement;
  /** Maximum time without progress, including a stalled load or never-settling play promise. */
  timeoutMs?: number;
  muted?: boolean;
}
export interface AnnouncementPlayer {
  readonly state: AudioState;
  /** Call directly from a user gesture. Resolves on completion, failure, mute, or cancellation. */
  play(url: string): Promise<AudioState>;
  play(language: Language, announcement: Announcement): Promise<AudioState>;
  stop(): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

export function createAnnouncementPlayer(input: AnnouncementPlayerOptions | ((state: AudioState) => void) = {}): AnnouncementPlayer {
  const options: AnnouncementPlayerOptions = typeof input === 'function' ? { onState: input } : input;
  const createAudio = options.createAudio ?? (() => new Audio());
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError('Audio timeout must be positive');
  let muted = options.muted ?? false;
  let state: AudioState = muted ? 'muted' : 'idle';
  let disposed = false;
  let active: { cancel: (result: AudioState) => void } | undefined;
  function notify(next: AudioState) { state = next; options.onState?.(next); }
  function stop() { if (disposed) return; active?.cancel(muted ? 'muted' : 'idle'); notify(muted ? 'muted' : 'idle'); }

  function play(url: string): Promise<AudioState>;
  function play(language: Language, announcement: Announcement): Promise<AudioState>;
  function play(languageOrUrl: string, announcement?: Announcement): Promise<AudioState> {
    active?.cancel('idle');
    if (disposed) return Promise.resolve('idle');
    if (muted) { notify('muted'); return Promise.resolve('muted'); }
    let source: string;
    let audio: HTMLAudioElement;
    try { source = announcement ? announcementAsset(languageOrUrl as Language, announcement) : languageOrUrl; audio = createAudio(); }
    catch { notify('error'); return Promise.resolve('error'); }
    return new Promise(resolve => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let lastTime = 0;
      const listeners: [string, EventListener][] = [];
      const session = { cancel: (result: AudioState) => finish(result, false) };
      active = session;
      function finish(result: AudioState, publish = true) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        for (const [event, listener] of listeners) audio.removeEventListener(event, listener);
        if (active === session) active = undefined;
        // Detach listeners before pause/load: browsers may synchronously dispatch events here.
        try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch { /* Cleanup remains best effort. */ }
        if (publish && !disposed) notify(result);
        resolve(result);
      }
      function watchdog() {
        clearTimeout(timer);
        timer = setTimeout(() => finish('error'), timeoutMs);
      }
      function listen(event: string, callback: () => void) {
        const listener = () => { if (!settled && active === session) callback(); };
        listeners.push([event, listener]); audio.addEventListener(event, listener);
      }
      listen('playing', () => { notify('playing'); });
      listen('timeupdate', () => {
        if (audio.currentTime > lastTime) { lastTime = audio.currentTime; watchdog(); }
      });
      listen('waiting', () => { notify('loading'); });
      listen('ended', () => finish('ended'));
      listen('error', () => finish('error'));
      listen('abort', () => finish('error'));
      notify('loading');
      if (settled) return;
      watchdog();
      try {
        audio.preload = 'auto'; audio.src = source; audio.muted = false;
        // No await before play: retain the button's browser user activation.
        Promise.resolve(audio.play()).then(() => {
          if (!settled && active === session) { notify('playing'); }
        }, (error: unknown) => {
          if (settled) return;
          const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
          finish(name === 'NotAllowedError' ? 'blocked' : 'error');
        });
      } catch (error) {
        const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
        finish(name === 'NotAllowedError' ? 'blocked' : 'error');
      }
    });
  }
  return {
    get state() { return state; }, play, stop,
    setMuted(value: boolean) { muted = value; active?.cancel(value ? 'muted' : 'idle'); if (!disposed) notify(value ? 'muted' : 'idle'); },
    dispose() { disposed = true; active?.cancel('idle'); state = 'idle'; },
  };
}
