import { createAnnouncementPlayer, type AnnouncementPlayerOptions, type AudioState } from './audio';

export interface BroadcastRecording { readonly url: string; readonly caption: string }
export interface BroadcastOptions extends Omit<AnnouncementPlayerOptions, 'onState'> {
  onState?: (state: AudioState) => void;
  onCurrent?: (recording: BroadcastRecording | undefined) => void;
  onPending?: (recording: BroadcastRecording | undefined) => void;
}

/** One speaking voice and one newest pending event, rather than an ever-growing stale timetable. */
export function createBroadcastQueue(options: BroadcastOptions = {}) {
  let media: HTMLAudioElement | undefined;
  let current: BroadcastRecording | undefined;
  let pending: BroadcastRecording | undefined;
  let enabled = false;
  let muted = options.muted ?? false;
  let disposed = false;
  let generation = 0;
  const player = createAnnouncementPlayer({ ...options, onState: options.onState,
    createAudio: () => media ??= options.createAudio?.() ?? new Audio(),
  });
  function setPending(value: BroadcastRecording | undefined) { pending = value; options.onPending?.(value); }
  function start(recording: BroadcastRecording) {
    const session = ++generation;
    current = recording; options.onCurrent?.(recording);
    // Keep play in the gesture's stack; reuse the same media element on subsequent events for mobile browsers.
    const completion = player.play(recording.url);
    void completion.then(result => {
      if (disposed || session !== generation) return;
      current = undefined;
      if (result === 'blocked') { enabled = false; setPending(undefined); return; }
      if (result !== 'ended' && result !== 'error') { setPending(undefined); return; }
      const next = pending; setPending(undefined);
      if (next && enabled && !muted) start(next);
    });
  }
  function stop() {
    generation++; enabled = false; current = undefined; setPending(undefined); player.stop(); options.onCurrent?.(undefined);
  }
  return {
    get state() { return player.state; },
    get current() { return current; },
    get pending() { return pending; },
    /** Explicit replay/context changes may replace audio; call from a user gesture. */
    playNow(recording: BroadcastRecording) {
      if (disposed || muted) return;
      enabled = true; setPending(undefined); start(recording);
    },
    /** Automatic events never interrupt an in-flight sentence or unlock blocked sound. */
    enqueue(recording: BroadcastRecording) {
      if (disposed || !enabled || muted) return;
      if (current?.url === recording.url) { setPending(undefined); return; }
      if (current) setPending(recording);
      else start(recording);
    },
    stop,
    setMuted(value: boolean) { muted = value; stop(); player.setMuted(value); },
    dispose() { if (disposed) return; stop(); disposed = true; enabled = false; player.dispose(); media = undefined; },
  };
}
