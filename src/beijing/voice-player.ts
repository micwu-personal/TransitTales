import { createAnnouncementPlayer, type AnnouncementPlayerOptions, type AudioState } from '../rush/audio';

export interface RecordedVoicePlayerOptions extends Omit<AnnouncementPlayerOptions, 'muted'> {}

/** One gesture-activated media element, kept for every part and subsequent queued announcement. */
export function createRecordedVoicePlayer(options: RecordedVoicePlayerOptions = {}) {
  let media: HTMLAudioElement | undefined;
  let generation = 0;
  let disposed = false;
  let state: AudioState = 'idle';
  const notify = (value: AudioState) => { state = value; options.onState?.(value); };
  const player = createAnnouncementPlayer({ ...options,
    createAudio: () => media ??= options.createAudio?.() ?? new Audio(),
    onState: value => { if (value !== 'ended' && !disposed) notify(value); },
  });
  function stop() { generation++; player.stop(); }
  function play(clips: readonly string[]): Promise<AudioState> {
    if (disposed) return Promise.resolve('idle');
    const session = ++generation;
    if (!clips.length) { player.stop(); notify('error'); return Promise.resolve('error'); }
    let index = 0;
    function advance(result: AudioState): AudioState | Promise<AudioState> {
      if (disposed || generation !== session) return 'idle';
      if (result !== 'ended') return result;
      index++;
      if (index === clips.length) { notify('ended'); return 'ended'; }
      return player.play(clips[index]).then(advance);
    }
    // Do not fetch, await, or defer the first play: it must stay in the button's gesture stack.
    return player.play(clips[0]).then(advance);
  }
  return {
    get state() { return state; }, play, stop,
    dispose() {
      if (disposed) return;
      generation++; disposed = true; player.dispose(); media = undefined; state = 'idle';
    },
  };
}
