import { afterEach, describe, it, expect, vi } from 'vitest';
import { AnnouncementQueue, DeviceVoice, type VoicePort, type BeijingAnnouncementContext } from '../src/beijing/voice';
import { beijingAnnouncement } from '../src/beijing/announcements';
import { createRecordedVoicePlayer } from '../src/beijing/voice-player';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
class Media extends EventTarget {
  src = ''; currentTime = 0; preload = ''; muted = false;
  play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn(() => { this.currentTime = 0; });
  removeAttribute = vi.fn(() => { this.src = ''; });
  emit(type: string) { this.dispatchEvent(new Event(type)); }
}
const context: BeijingAnnouncementContext = { kind: 'ride', stationId: 'beijing-railway-station', lineId: '2' };
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function device(timeoutMs = 1000) {
  vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', { setItem: vi.fn() });
  const media = new Media();
  const createAudio = vi.fn(() => media as unknown as HTMLAudioElement);
  const voice = new DeviceVoice('en', vi.fn(), { createAudio, timeoutMs });
  return { voice, media, createAudio };
}
async function finish(media: Media, count: number) { for (let i = 0; i < count; i++) { media.emit('ended'); await flush(); } }
function setup() {
  const calls:{text:string;done:()=>void;failed:()=>void}[]=[];
  const port:VoicePort={speak:(text,done,failed)=>{calls.push({text,done,failed});},cancel:vi.fn()};
  const queue=new AnnouncementQueue(port); return {queue,calls,port};
}
describe('Bundled Beijing voice is gesture-driven and independent of installed voices', () => {
  it('retains the latest context while off, then synchronously plays it on activation at any game speed', async () => {
    const { voice, media, createAudio } = device();
    voice.offer('Station caption', 1, 15, context);
    expect(media.play).not.toHaveBeenCalled(); expect(voice.status).toBe('off');
    voice.enable(); expect(media.play).toHaveBeenCalledOnce();
    expect(media.src).toContain('/phrases/en/ride.mp3'); expect(voice.queue.active).toBe('Station caption');
    await flush(); expect(voice.status).toBe('ready');
    media.emit('ended'); await flush(); expect(media.src).toContain('/stations/beijing-railway-station.mp3');
    await finish(media, beijingAnnouncement('en', context).clips.length - 1);
    expect(voice.queue.active).toBe(''); expect(createAudio).toHaveBeenCalledOnce();
    voice.mute(); expect(localStorage.setItem).toHaveBeenCalledWith('beijing-voice-muted', 'true'); voice.dispose();
  });
  it('plays a welcome notice without a journey and a destination announcement without a segment', async () => {
    const { voice, media } = device();
    voice.offer('Welcome', 0, 15, { kind: 'ready' }); voice.enable();
    expect(media.src).toContain('/ready.mp3'); await finish(media, 1);
    voice.offer('Complete', 0, 15, { kind: 'complete', stationId: context.stationId });
    expect(media.src).toContain('/complete.mp3'); await finish(media, 3); expect(voice.queue.active).toBe(''); voice.dispose();
  });
  it('finishes all logical sentence parts before starting only the newest pending event', async () => {
    const { voice, media } = device();
    voice.offer('First', 1, 15, context); voice.enable();
    voice.offer('Old', 1, 15, { ...context, kind: 'stop' });
    voice.offer('Newest', 1, 15, { ...context, kind: 'complete' });
    expect(voice.queue.pending).toBe('Newest'); expect(media.play).toHaveBeenCalledOnce();
    const clips = beijingAnnouncement('en', context).clips;
    await finish(media, clips.length - 1);
    expect(voice.queue.active).toBe('First'); expect(media.src).toBe(clips.at(-1));
    await finish(media, 1); expect(voice.queue.active).toBe('Newest'); expect(media.src).toContain('/complete.mp3');
    await finish(media, beijingAnnouncement('en', { ...context, kind: 'complete' }).clips.length);
    expect(voice.queue.active).toBe(''); expect(media.play).toHaveBeenCalledTimes(10); voice.dispose();
  });
  it('blocked or missing assets preserve visual captions, disable automatic retries, and allow explicit replay', async () => {
    const { voice, media } = device();
    media.play.mockRejectedValueOnce({ name: 'NotAllowedError' });
    voice.offer('Caption remains', 1, 15, context); voice.enable();
    voice.offer('Latest caption', 1, 15, { ...context, kind: 'stop' }); await flush();
    expect(voice.status).toBe('unavailable'); expect(voice.queue.enabled).toBe(false); expect(voice.queue.pending).toBe('');
    voice.offer('Retry this caption', 1, 15, context); expect(media.play).toHaveBeenCalledOnce();
    voice.replay('Retry this caption'); expect(media.play).toHaveBeenCalledTimes(2); await flush(); expect(voice.status).toBe('ready');
    media.emit('error'); await flush(); expect(voice.status).toBe('unavailable'); expect(voice.queue.enabled).toBe(false); voice.dispose();
  });
  it('explicit replay replaces active speech, clears pending parts, and uses the last context', async () => {
    const { voice, media } = device(); voice.offer('First', 1, 15, context); voice.enable();
    voice.offer('Last caption', 1, 15, { ...context, kind: 'stop' }); voice.replay('Replay last');
    expect(voice.queue.active).toBe('Replay last'); expect(voice.queue.pending).toBe(''); expect(media.src).toContain('/arrival.mp3');
    await finish(media, 5); expect(media.play).toHaveBeenCalledTimes(6); expect(voice.queue.active).toBe(''); voice.dispose();
  });
  it('language changes cancel both active and pending announcements without requiring a new automatic gesture', async () => {
    const { voice, media, createAudio } = device(); voice.offer('English', 1, 15, context); voice.enable();
    voice.offer('Stale English', 1, 15, context); voice.setLanguage('mn-Mong-CN'); await flush();
    expect(voice.queue.active).toBe(''); expect(voice.queue.pending).toBe(''); expect(voice.queue.enabled).toBe(true);
    voice.offer('Traditional caption', 1, 15, context); expect(media.src).toContain('/mn-Cyrl-MN/ride.mp3');
    expect(voice.recordingText).toContain('北京站'); expect(createAudio).toHaveBeenCalledOnce(); voice.dispose();
  });
  it.each(['mute', 'suspend', 'dispose'] as const)('%s cancels all parts and ignores late playback failures', async action => {
    const { voice, media } = device(); let reject!: (reason: unknown) => void;
    media.play.mockImplementationOnce(() => new Promise((_, failed) => { reject = failed; }));
    voice.offer('Active', 1, 15, context); voice.enable(); voice.offer('Pending', 1, 15, { ...context, kind: 'stop' });
    voice[action](); reject({ name: 'NotAllowedError' }); media.emit('ended'); await flush();
    expect(voice.status).toBe('off'); expect(voice.queue.enabled).toBe(false); expect(voice.queue.active).toBe('');
    expect(media.play).toHaveBeenCalledOnce(); voice.dispose();
  });
  it('fails safely for unsupported factories, invalid identities, and never-settling play promises', async () => {
    const broken = new DeviceVoice('en', vi.fn(), { createAudio: () => { throw new Error('No Audio'); } });
    expect(() => broken.enable()).not.toThrow(); await flush(); expect(broken.status).toBe('unavailable'); expect(broken.queue.enabled).toBe(false); broken.dispose();
    const { voice, media } = device(100); voice.offer('Still readable', 1, 15, { ...context, stationId: 'unknown' });
    expect(() => voice.enable()).not.toThrow(); expect(voice.status).toBe('unavailable'); expect(media.play).not.toHaveBeenCalled();
    vi.useFakeTimers(); media.play.mockImplementation(() => new Promise(() => {}));
    voice.offer('Valid', 1, 15, context); voice.replay(); await vi.advanceTimersByTimeAsync(100);
    expect(voice.status).toBe('unavailable'); expect(voice.queue.enabled).toBe(false); voice.dispose();
  });
});

describe('Logical prerecorded player', () => {
  it('starts the first clip in the gesture, completes in order, and exposes only final ended', async () => {
    const media = new Media(); const factory = vi.fn(() => media as unknown as HTMLAudioElement); const states: string[] = [];
    const player = createRecordedVoicePlayer({ createAudio: factory, onState: state => states.push(state) });
    const completion = player.play(['/first.mp3', '/second.mp3']); expect(media.src).toBe('/first.mp3');
    media.emit('ended'); await flush(); expect(media.src).toBe('/second.mp3'); expect(states).not.toContain('ended');
    media.emit('ended'); expect(await completion).toBe('ended'); expect(states.filter(state => state === 'ended')).toHaveLength(1);
    expect(factory).toHaveBeenCalledOnce(); player.dispose();
  });
  it('a failed part aborts the complete announcement instead of playing a misleading tail', async () => {
    const media = new Media(); const player = createRecordedVoicePlayer({ createAudio: () => media as unknown as HTMLAudioElement });
    const completion = player.play(['/first.mp3', '/identity.mp3', '/tail.mp3']);
    media.emit('ended'); await flush(); media.emit('error'); expect(await completion).toBe('error');
    expect(media.play).toHaveBeenCalledTimes(2); player.dispose();
  });
  it('actual media progress renews the stall watchdog, while waiting/playing events alone do not', async () => {
    vi.useFakeTimers(); const media = new Media(); const player = createRecordedVoicePlayer({ createAudio: () => media as unknown as HTMLAudioElement, timeoutMs: 100 });
    const completion = player.play(['/first.mp3', '/second.mp3']); await flush();
    await vi.advanceTimersByTimeAsync(80); media.currentTime = 1; media.emit('timeupdate');
    await vi.advanceTimersByTimeAsync(80); expect(player.state).toBe('playing'); media.emit('waiting'); media.emit('playing');
    await vi.advanceTimersByTimeAsync(20); expect(await completion).toBe('error'); expect(media.play).toHaveBeenCalledOnce(); player.dispose();
  });
  it('stop and disposal invalidate delayed part completion and prohibit future playback after disposal', async () => {
    const media = new Media(); const player = createRecordedVoicePlayer({ createAudio: () => media as unknown as HTMLAudioElement });
    const first = player.play(['/a.mp3', '/b.mp3']); media.emit('ended'); player.stop(); expect(await first).toBe('idle');
    expect(media.play).toHaveBeenCalledOnce(); const second = player.play(['/c.mp3', '/d.mp3']); player.dispose();
    expect(await second).toBe('idle'); expect(await player.play(['/e.mp3'])).toBe('idle'); expect(media.play).toHaveBeenCalledTimes(2);
  });
});
describe('Optional prerecorded announcements never overlap normal progress', () => {
  it('copies queued identities and preserves the newest context even when captions match', () => {
    const calls: { context?: BeijingAnnouncementContext; done: () => void }[] = [];
    const queue = new AnnouncementQueue({ speak: (_text, done, _failed, context) => calls.push({ context, done }), cancel: vi.fn() });
    queue.enable();
    const active = { ...context }; queue.offer('Same caption', true, active); active.stationId = 'mutated';
    const pending = { ...context, kind: 'stop' as const }; queue.offer('Same caption', true, pending); pending.stationId = 'mutated';
    expect(calls[0].context).toEqual(context); expect(queue.pending).toBe('Same caption');
    calls[0].done(); expect(calls[1].context).toEqual({ ...context, kind: 'stop' });
    calls[1].done(); expect(queue.active).toBe('');
  });
  it('does nothing before explicit activation or when explicitly ineligible', () => {
    const {queue,calls}=setup();queue.offer('A');expect(calls).toEqual([]);
    queue.enable();queue.offer('B',false);expect(calls).toEqual([]);
  });
  it('finishes the active sentence and speaks only the newest pending caption', () => {
    const {queue,calls,port}=setup();queue.enable();queue.offer('First');queue.offer('Old pending');queue.offer('Newest pending');
    expect(calls).toHaveLength(1);expect(queue.active).toBe('First');expect(queue.pending).toBe('Newest pending');expect(port.cancel).not.toHaveBeenCalled();
    calls[0].done();expect(calls.map(call=>call.text)).toEqual(['First','Newest pending']);
    calls[1].done();expect(queue.active).toBe('');expect(queue.pending).toBe('');
  });
  it('returning to the active caption drops a stale pending announcement', () => {
    const {queue,calls}=setup();queue.enable();queue.offer('Current');queue.offer('Stale');queue.offer('Current');
    expect(queue.pending).toBe('');calls[0].done();expect(calls).toHaveLength(1);
  });
  it('mute cancels only by explicit action and ignores stale completion callbacks', () => {
    const {queue,calls,port}=setup();queue.enable();queue.offer('First');queue.offer('Pending');queue.stop();
    calls[0].done();expect(calls).toHaveLength(1);expect(queue.enabled).toBe(false);expect(port.cancel).toHaveBeenCalledOnce();
    queue.enable();queue.offer('Fresh');calls[0].done();expect(queue.active).toBe('Fresh');
  });
  it('speech errors and thrown ports stop safely, with captions outside the queue unaffected', () => {
    const {queue,calls}=setup();queue.enable();queue.offer('First');queue.offer('Pending');calls[0].failed();
    expect(queue.enabled).toBe(false);expect(queue.active).toBe('');expect(calls).toHaveLength(1);
    const broken=new AnnouncementQueue({speak:()=>{throw new Error('voice unavailable');},cancel:vi.fn()});broken.enable();expect(()=>broken.offer('Caption')).not.toThrow();expect(broken.enabled).toBe(false);
  });
});
