import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBroadcastQueue, type BroadcastRecording } from '../src/rush/broadcast';
import type { AudioState } from '../src/rush/audio';

class Media extends EventTarget {
  src = ''; currentTime = 0; preload = ''; muted = false;
  play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn(() => { this.currentTime = 0; });
  removeAttribute = vi.fn(() => { this.src = ''; });
  emit(type: string) { this.dispatchEvent(new Event(type)); }
}
const a = { url: '/a.mp3', caption: 'First complete sentence' };
const b = { url: '/b.mp3', caption: 'Approaching station' };
const c = { url: '/c.mp3', caption: 'Doors open' };
function fixture(timeoutMs = 1000) {
  const media = new Media(); const createAudio = vi.fn(() => media as unknown as HTMLAudioElement);
  const states: AudioState[] = []; const captions: (BroadcastRecording | undefined)[] = [];
  const queue = createBroadcastQueue({ createAudio, timeoutMs, onState: s => states.push(s), onCurrent: r => captions.push(r) });
  return { queue, media, states, captions, createAudio };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
afterEach(() => { vi.useRealTimers(); });

describe('live broadcast serialization', () => {
  it('finishes an active sentence before the newest event, without overlapping or stale backlog', async () => {
    const { queue, media, createAudio, captions } = fixture();
    queue.playNow(a); await flush();
    queue.enqueue(b); queue.enqueue(c);
    expect(media.pause).not.toHaveBeenCalled(); expect(media.play).toHaveBeenCalledOnce();
    expect(queue.current).toEqual(a); expect(queue.pending).toEqual(c); expect(captions).toEqual([a]);
    media.emit('ended'); await flush();
    expect(media.src).toBe(c.url); expect(queue.current).toEqual(c); expect(queue.pending).toBeUndefined();
    expect(media.play).toHaveBeenCalledTimes(2); expect(createAudio).toHaveBeenCalledOnce();
    expect(captions).toEqual([a, c]); media.emit('ended'); await flush();
    expect(queue.state).toBe('ended'); queue.dispose();
  });
  it('does not cancel audio when a new event is never enqueued or when a descriptor repeats', async () => {
    const { queue, media } = fixture(); queue.playNow(a); await flush();
    queue.enqueue(a); expect(media.pause).not.toHaveBeenCalled();
    media.emit('ended'); await flush(); expect(queue.state).toBe('ended'); expect(media.play).toHaveBeenCalledOnce();
    queue.enqueue(b); expect(media.src).toBe(b.url); queue.dispose();
  });
  it('clears a stale pending event if the live state returns to the current recording', async () => {
    const { queue, media } = fixture(); queue.playNow(a); queue.enqueue(b); queue.enqueue(a);
    expect(queue.pending).toBeUndefined(); media.emit('ended'); await flush(); expect(media.play).toHaveBeenCalledOnce(); queue.dispose();
  });
  it('requires a gesture before automatic events and stays blocked until explicit retry', async () => {
    const { queue, media } = fixture(); queue.enqueue(a); expect(media.play).not.toHaveBeenCalled();
    media.play.mockRejectedValueOnce({ name: 'NotAllowedError' }); queue.playNow(a); queue.enqueue(b); await flush();
    expect(queue.state).toBe('blocked'); expect(queue.pending).toBeUndefined();
    queue.enqueue(c); expect(media.play).toHaveBeenCalledOnce();
    queue.playNow(c); await flush(); expect(queue.state).toBe('playing'); queue.dispose();
  });
  it('advances pending events after a failed/stalled recording instead of falling silent', async () => {
    vi.useFakeTimers(); const { queue, media } = fixture(100);
    queue.playNow(a); queue.enqueue(b); media.emit('error'); await flush();
    expect(media.src).toBe(b.url); queue.enqueue(c);
    await vi.advanceTimersByTimeAsync(100); expect(media.src).toBe(c.url); expect(media.play).toHaveBeenCalledTimes(3); queue.dispose();
  });
  it('replay/context changes invalidate old completion callbacks and discard old pending audio', async () => {
    const { queue, media } = fixture(); queue.playNow(a); queue.enqueue(b); queue.playNow(c); await flush();
    expect(queue.current).toEqual(c); expect(queue.pending).toBeUndefined(); expect(media.play).toHaveBeenCalledTimes(2);
    media.emit('ended'); await flush(); expect(media.play).toHaveBeenCalledTimes(2); queue.dispose();
  });
  it('mute, close, and disposal prevent queued audio from starting after cancellation', async () => {
    const { queue, media } = fixture(); queue.playNow(a); queue.enqueue(b); queue.setMuted(true); await flush();
    expect(queue.state).toBe('muted'); expect(queue.pending).toBeUndefined(); queue.enqueue(c); queue.playNow(c);
    expect(media.play).toHaveBeenCalledOnce(); queue.setMuted(false); queue.playNow(a); queue.enqueue(b); queue.stop(); await flush();
    expect(queue.state).toBe('idle'); expect(media.play).toHaveBeenCalledTimes(2);
    queue.enqueue(c); expect(media.play).toHaveBeenCalledTimes(2);
    queue.playNow(a); queue.enqueue(c); queue.dispose(); await flush(); queue.enqueue(c); queue.playNow(c);
    expect(media.play).toHaveBeenCalledTimes(3);
  });
});
