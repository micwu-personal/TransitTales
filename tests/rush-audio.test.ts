import { afterEach, describe, expect, it, vi } from 'vitest';
// This browser-first project does not require @types/node; Vitest runs asset checks in Node.
const fileSystemModule: string = 'node:fs';
const { readFileSync, statSync } = await import(fileSystemModule) as {
  readFileSync(path: URL, encoding: 'utf8'): string;
  readFileSync(path: URL): Uint8Array & { subarray(start: number, end: number): Uint8Array & { toString(): string } };
  statSync(path: URL): { size: number };
};
import { ANNOUNCEMENT_COPY, ANNOUNCEMENT_STOPS, announcementAsset, announcementCatalog, announcementText, announcementRecordingLanguage, announcementRecordingText, type Announcement } from '../src/rush/announcements';
import { createAnnouncementPlayer, type AudioState } from '../src/rush/audio';

const canonicalAsset = (asset: string) => '/' + asset.slice(import.meta.env.BASE_URL.length);

const next: Announcement = { kind: 'next', station: 'central', line: 'coral', transferLine: 'blue' };
class FakeAudio extends EventTarget {
  src = ''; preload = ''; muted = false; currentTime = 0;
  play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  pause = vi.fn(); load = vi.fn();
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  emit(type: string) { this.dispatchEvent(new Event(type)); }
}
function fixture(options: { timeoutMs?: number; muted?: boolean } = {}) {
  const audio: FakeAudio[] = [];
  const states: AudioState[] = [];
  const player = createAnnouncementPlayer({ ...options, onState: state => states.push(state), createAudio: () => {
    const value = new FakeAudio(); audio.push(value); return value as unknown as HTMLAudioElement;
  } });
  return { player, audio, states };
}
afterEach(() => { vi.useRealTimers(); });

describe('recorded announcement scripts', () => {
  it('covers every valid station and line with complete multilingual captions and stable assets', () => {
    const catalog = announcementCatalog();
    expect(catalog).toHaveLength(54);
    for (const language of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
      const assets = new Set<string>();
      for (const descriptor of catalog) {
        const caption = announcementText(language, descriptor);
        expect(caption).not.toMatch(/\{\w+\}/);
        expect(caption.length).toBeGreaterThan(20);
        if (!['safety', 'pass-through'].includes(descriptor.kind)) expect(caption).toContain(ANNOUNCEMENT_COPY[language].stations[descriptor.station]);
        const asset = canonicalAsset(announcementAsset(language, descriptor));
        expect(asset).toMatch(new RegExp(`^/audio/transit/${announcementRecordingLanguage(language)}/[a-z-]+\\.mp3$`));
        assets.add(asset);
      }
      expect(assets.size).toBe(54);
    }
    expect(ANNOUNCEMENT_STOPS.blue).toContain('airport');
  });
  it('bundles a verified MP3 and matching full-sentence manifest entry for every descriptor', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/audio/transit/manifest.json', import.meta.url), 'utf8')) as {
      recordings: Record<string, { text: string; recordingText: string; recordingLanguage: string; voice: string; bytes: number; durationSeconds: number }>;
      locales: Record<string, { recordingLanguage: string; fallback: boolean; notice: string; announcements: Record<string, { captionText: string; asset: string }> }>;
    };
    expect(Object.keys(manifest.recordings)).toHaveLength(216);
    for (const language of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'] as const) for (const descriptor of announcementCatalog()) {
      const url = canonicalAsset(announcementAsset(language, descriptor));
      const entry = manifest.recordings[url];
      expect(entry.text).toBe(announcementRecordingText(language, descriptor));
      expect(entry.recordingText).toBe(entry.text);
      expect(entry.recordingLanguage).toBe(announcementRecordingLanguage(language));
      expect(entry.voice).toBe(ANNOUNCEMENT_COPY[entry.recordingLanguage as keyof typeof ANNOUNCEMENT_COPY].voice);
      const locale = manifest.locales[language];
      expect(locale.recordingLanguage).toBe(entry.recordingLanguage);
      expect(locale.fallback).toBe(language === 'mn-Mong-CN');
      const key = url.split('/').at(-1)!.replace('.mp3', '');
      expect(locale.announcements[key]).toEqual({ captionText: announcementText(language, descriptor), asset: url });
      if (language === 'mn-Mong-CN') {
        expect(entry.text).not.toBe(announcementText(language, descriptor));
        expect(entry.text).toMatch(/[А-Яа-яӨөҮү]/u);
        expect(entry.text).not.toMatch(/[\u1800-\u18af\u4e00-\u9fff]/u);
        expect(locale.notice).toContain('Mongolia Mongolian');
        expect(locale.notice).toContain('not an Inner Mongolia regional voice');
      }
      expect(entry.durationSeconds).toBeGreaterThan(0);
      expect(entry.bytes).toBeGreaterThan(1000);
      const file = new URL(`../public${url}`, import.meta.url);
      expect(statSync(file).size).toBe(entry.bytes);
      const header = readFileSync(file).subarray(0, 3);
      expect(header.toString() === 'ID3' || (header[0] === 255 && (header[1] & 224) === 224)).toBe(true);
    }
  });
  it('localizes full Mongolian captions while explicitly sharing Mongolia Mongolian recordings', () => {
    for (const descriptor of announcementCatalog()) {
      const cyrillic = announcementText('mn-Cyrl-MN', descriptor);
      const traditional = announcementText('mn-Mong-CN', descriptor);
      expect(cyrillic).toMatch(/[А-Яа-яӨөҮү]/u);
      expect(traditional).toMatch(/[\u1820-\u18af]/u);
      expect(traditional).not.toMatch(/[А-Яа-яӨөҮү\u4e00-\u9fff]/u);
      expect(cyrillic).toContain('.');
      expect(traditional).toContain('᠃');
      expect(announcementAsset('mn-Mong-CN', descriptor)).toBe(announcementAsset('mn-Cyrl-MN', descriptor));
      expect(announcementRecordingText('mn-Mong-CN', descriptor)).toBe(cyrillic);
      if (!['safety', 'pass-through'].includes(descriptor.kind)) {
        expect(cyrillic).toContain(ANNOUNCEMENT_COPY['mn-Cyrl-MN'].lines[descriptor.line]);
        expect(traditional).toContain(ANNOUNCEMENT_COPY['mn-Mong-CN'].lines[descriptor.line]);
      }
      if (descriptor.kind === 'arriving') {
        expect(cyrillic).toContain(`${ANNOUNCEMENT_COPY['mn-Cyrl-MN'].stations[descriptor.station]} руу явах`);
        expect(traditional).toContain(`${ANNOUNCEMENT_COPY['mn-Mong-CN'].stations[descriptor.station]} ᠷᠤᠭᠤ ᠶᠠᠪᠤᠬᠤ`);
      }
      if (descriptor.transferLine) {
        expect(cyrillic).toContain('сэлгэн сууна уу.');
        expect(traditional).toContain('ᠰᠡᠯᠭᠡᠨ ᠰᠠᠭᠤᠨ᠎ᠠ ᠤᠤ᠃');
      }
    }
    expect(announcementRecordingLanguage('mn-Mong-CN')).toBe('mn-Cyrl-MN');
    expect(ANNOUNCEMENT_COPY['mn-Cyrl-MN'].voice).toBe('mn-MN-YesuiNeural');
  });
  it('provides transfers only at Central and generic safety/pass-through recordings', () => {
    expect(announcementText('en', next)).toContain('Change here for the Blue line.');
    expect(announcementText('ja', next)).toContain('ブルー線は、お乗り換えです。');
    expect(announcementText('zh-CN', next)).toContain('换乘蓝线');
    expect(() => announcementAsset('en', { ...next, station: 'airport' })).toThrow(RangeError);
    expect(() => announcementText('en', { ...next, transferLine: 'coral' })).toThrow(RangeError);
    expect(canonicalAsset(announcementAsset('en', { kind: 'safety', station: 'airport', line: 'blue' }))).toBe('/audio/transit/en/safety.mp3');
  });
});

describe('gesture-driven announcement player', () => {
  it('plays immediately and transitions from loading through playing to ended with cleanup', async () => {
    const { player, audio, states } = fixture();
    const completion = player.play('en', next);
    expect(audio[0].play).toHaveBeenCalledOnce();
    expect(audio[0].src).toContain('next-coral-central-transfer-blue.mp3');
    expect(player.state).toBe('loading');
    await Promise.resolve(); expect(player.state).toBe('playing');
    audio[0].emit('ended'); expect(await completion).toBe('ended');
    expect(states).toEqual(['loading', 'playing', 'ended']);
    expect(audio[0].pause).toHaveBeenCalledOnce(); expect(audio[0].src).toBe('');
  });
  it('accepts the parent URL-based playback API and callback construction', async () => {
    const { player, audio } = fixture();
    const completion = player.play(announcementAsset('ja', next));
    expect(audio[0].src).toBe(announcementAsset('ja', next));
    audio[0].emit('ended'); expect(await completion).toBe('ended');
    const states: AudioState[] = [];
    const callbackPlayer = createAnnouncementPlayer(state => states.push(state));
    callbackPlayer.setMuted(true);
    expect(await callbackPlayer.play('/audio/transit/en/safety.mp3')).toBe('muted');
    expect(states).toEqual(['muted', 'muted']); callbackPlayer.dispose();
  });
  it.each(['NotAllowedError', 'NotSupportedError'])('handles %s promise rejection', async name => {
    const audio = new FakeAudio(); audio.play.mockRejectedValue({ name });
    const player = createAnnouncementPlayer({ createAudio: () => audio as unknown as HTMLAudioElement });
    expect(await player.play('en', next)).toBe(name === 'NotAllowedError' ? 'blocked' : 'error');
    expect(audio.pause).toHaveBeenCalledOnce();
  });
  it('handles synchronous play and factory errors', async () => {
    const audio = new FakeAudio(); audio.play.mockImplementation(() => { throw { name: 'NotAllowedError' }; });
    const player = createAnnouncementPlayer({ createAudio: () => audio as unknown as HTMLAudioElement });
    expect(await player.play('en', next)).toBe('blocked');
    const broken = createAnnouncementPlayer({ createAudio: () => { throw new Error('Missing Audio'); } });
    expect(await broken.play('ja', next)).toBe('error');
  });
  it('isolates late events and rejected play promises after replacement or stop', async () => {
    const { player, audio } = fixture();
    let reject!: (reason: unknown) => void;
    const first = player.play('en', next);
    // Replace the initial play with a pending promise for a separate session.
    player.stop(); expect(await first).toBe('idle');
    const fake = new FakeAudio(); fake.play.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    const candidates = [fake, new FakeAudio()];
    const replacement = createAnnouncementPlayer({ createAudio: () => candidates.shift()! as unknown as HTMLAudioElement });
    const old = replacement.play('en', next);
    const fresh = replacement.play('ja', next);
    expect(await old).toBe('idle'); await Promise.resolve();
    fake.emit('ended'); fake.emit('error'); reject({ name: 'NotAllowedError' });
    await Promise.resolve(); expect(replacement.state).toBe('playing');
    replacement.stop(); expect(await fresh).toBe('idle');
    audio[0].emit('error'); expect(player.state).toBe('idle');
  });
  it('persists mute within the controller, cancels active playback, and allows unmute', async () => {
    const { player, audio } = fixture({ muted: true });
    expect(await player.play('en', next)).toBe('muted'); expect(audio).toHaveLength(0);
    player.setMuted(false); const active = player.play('en', next);
    player.setMuted(true); expect(await active).toBe('muted'); expect(player.state).toBe('muted');
    audio[0].emit('ended'); await Promise.resolve(); expect(player.state).toBe('muted');
    player.setMuted(false); expect(player.state).toBe('idle'); player.dispose();
  });
  it('times out broken media and stalled playback, but actual progress renews the deadline', async () => {
    vi.useFakeTimers();
    const audio = new FakeAudio(); audio.play.mockImplementation(() => new Promise(() => {}));
    const player = createAnnouncementPlayer({ createAudio: () => audio as unknown as HTMLAudioElement, timeoutMs: 100 });
    const pending = player.play('en', next);
    await vi.advanceTimersByTimeAsync(100); expect(await pending).toBe('error');
    const { player: moving, audio: media } = fixture({ timeoutMs: 100 });
    const progressing = moving.play('en', next); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(80); media[0].currentTime = 1; media[0].emit('timeupdate');
    await vi.advanceTimersByTimeAsync(80); expect(moving.state).toBe('playing');
    await vi.advanceTimersByTimeAsync(20); expect(await progressing).toBe('error');
  });
  it('does not let repeated waiting events keep broken media alive', async () => {
    vi.useFakeTimers();
    const { player, audio } = fixture({ timeoutMs: 100 });
    const completion = player.play('en', next); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(60); audio[0].emit('waiting'); audio[0].emit('playing');
    await vi.advanceTimersByTimeAsync(40); expect(await completion).toBe('error');
  });
  it('honors cancellation from the loading state callback before starting media', async () => {
    const audio = new FakeAudio();
    const player = createAnnouncementPlayer({ createAudio: () => audio as unknown as HTMLAudioElement, onState: state => {
      if (state === 'loading') player.stop();
    } });
    expect(await player.play('en', next)).toBe('idle'); expect(audio.play).not.toHaveBeenCalled();
  });
  it('handles media errors, disposal, and no playback after disposal', async () => {
    const { player, audio, states } = fixture();
    const failure = player.play('en', next); audio[0].emit('error'); expect(await failure).toBe('error');
    const pending = player.play('en', next); player.dispose(); expect(await pending).toBe('idle');
    const count = states.length; audio[1].emit('playing'); await Promise.resolve();
    expect(states).toHaveLength(count); expect(await player.play('ja', next)).toBe('idle'); expect(audio).toHaveLength(2);
  });
});
