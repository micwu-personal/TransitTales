import { describe, expect, it } from 'vitest';
import { beijingAnnouncement, beijingAsset, beijingRecordingLanguage, BEIJING_ANNOUNCEMENT_KINDS } from '../src/beijing/announcements';
import copy from '../src/beijing/announcement-copy.json';
import { NETWORK } from '../src/beijing/network';
import { languages } from '../src/beijing/locale';

const fsModule: string = 'node:fs';
const { readFileSync, statSync } = await import(fsModule) as {
  readFileSync(path: URL, encoding: 'utf8'): string;
  readFileSync(path: URL): Uint8Array;
  statSync(path: URL): { size: number };
};
const cryptoModule: string = 'node:crypto';
const { createHash } = await import(cryptoModule) as {
  createHash(kind: string): { update(bytes: Uint8Array): { digest(encoding: 'hex'): string } };
};
const canonical = (url: string) => '/' + url.slice(import.meta.env.BASE_URL.length);

interface Recording { recordingText: string; recordingLanguage: string; voice: string; bytes: number; durationSeconds: number; sha256: string }
interface Manifest {
  complete: boolean; stationCount: number; serviceCount: number;
  recordings: Record<string, Recording>;
  stations: Record<string, string>; lines: Record<string, string>;
  locales: Record<string, { phraseRecordingLanguage: string; identityRecordingLanguage: string }>;
  notice: string;
}

describe('Full-network prerecorded Beijing catalog', () => {
  it('provides audible station and service identities for the entire real network in every caption language', () => {
    expect(NETWORK.stations).toHaveLength(426); expect(NETWORK.lines).toHaveLength(28);
    for (const language of languages) {
      for (const station of NETWORK.stations) {
        const announcement = beijingAnnouncement(language, { kind: 'stop', stationId: station.id });
        expect(announcement.clips.map(canonical)).toContain(`/audio/beijing/stations/${station.id}.mp3`);
        expect(announcement.recordingText).toContain(station.name);
      }
      for (const line of NETWORK.lines) {
        for (const kind of BEIJING_ANNOUNCEMENT_KINDS.filter(kind => kind !== 'ready')) {
          const announcement = beijingAnnouncement(language, { kind, stationId: line.stops[0], lineId: line.id });
          expect(announcement.clips.map(canonical)).toContain(`/audio/beijing/lines/${line.id}.mp3`);
          expect(announcement.recordingText).toContain(line.name);
          expect(announcement.recordingText).not.toMatch(/\{\w+\}/);
          expect(announcement.clips).toHaveLength(5);
        }
      }
    }
  });
  it('supports segment-native kinds, context-free activation, and completion without a segment', () => {
    expect(beijingAnnouncement('en').clips.map(canonical)).toEqual(['/audio/beijing/phrases/en/ready.mp3']);
    expect(beijingAnnouncement('en', { kind: 'ready' })).toEqual(beijingAnnouncement('en'));
    expect(beijingAnnouncement('en', { kind: 'complete' }).clips).toHaveLength(2);
    const context = { stationId: 'beijing-railway-station', lineId: '2' };
    expect(beijingAnnouncement('en', { ...context, kind: 'board' })).toEqual(beijingAnnouncement('en', { ...context, kind: 'boarding' }));
    expect(beijingAnnouncement('en', { ...context, kind: 'stop' })).toEqual(beijingAnnouncement('en', { ...context, kind: 'arrival' }));
    expect(beijingAsset('stations/pingguoyuan')).toBe(`${import.meta.env.BASE_URL}audio/beijing/stations/pingguoyuan.mp3`);
  });
  it('explicitly shares Mandarin public names and Mongolia Mongolian phrases across both Mongolian scripts', () => {
    const context = { kind: 'ride' as const, stationId: 'beijing-railway-station', lineId: '2' };
    const cyrillic = beijingAnnouncement('mn-Cyrl-MN', context);
    expect(beijingRecordingLanguage('mn-Mong-CN')).toBe('mn-Cyrl-MN');
    expect(beijingAnnouncement('mn-Mong-CN', context)).toEqual(cyrillic);
    expect(cyrillic.recordingText).toMatch(/[А-Яа-яӨөҮү]/u);
    expect(cyrillic.recordingText).toContain('北京站');
    expect(cyrillic.recordingText).not.toMatch(/[\u1820-\u18af]/u);
    expect(copy['mn-Cyrl-MN'].voice).toBe('mn-MN-YesuiNeural');
    for (const language of Object.keys(copy) as (keyof typeof copy)[]) for (const text of Object.values(copy[language].phrases)) {
      expect(text).not.toMatch(/\{\w+\}/); expect(text.length).toBeGreaterThan(2);
      if (language === 'mn-Cyrl-MN') expect(text).not.toMatch(/[\u4e00-\u9fff\u1820-\u18af]/u);
    }
  });
  it('rejects unknown identities, missing station contexts, and fabricated station/service pairings', () => {
    expect(() => beijingAnnouncement('en', { kind: 'ride', stationId: 'harbor' })).toThrow(RangeError);
    expect(() => beijingAnnouncement('en', { kind: 'walk' })).toThrow(RangeError);
    expect(() => beijingAnnouncement('en', { kind: 'ride', stationId: 'pingguoyuan', lineId: 'blue' })).toThrow(RangeError);
    expect(() => beijingAnnouncement('en', { kind: 'stop', stationId: 'pingguoyuan', lineId: '2' })).toThrow(RangeError);
  });
  it('bundles every actual MP3 with exact text, byte size, duration, and integrity hash in the offline manifest', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/audio/beijing/manifest.json', import.meta.url), 'utf8')) as Manifest;
    expect(manifest.complete).toBe(true); expect(manifest.stationCount).toBe(426); expect(manifest.serviceCount).toBe(28);
    const expected = new Map<string, { text: string; language: keyof typeof copy }>();
    for (const language of Object.keys(copy) as (keyof typeof copy)[]) for (const [key, text] of Object.entries(copy[language].phrases)) {
      expected.set(`/audio/beijing/phrases/${language}/${key}.mp3`, { text, language });
    }
    for (const station of NETWORK.stations) {
      const url = `/audio/beijing/stations/${station.id}.mp3`;
      expected.set(url, { text: station.name + '。', language: 'zh-CN' }); expect(manifest.stations[station.id]).toBe(url);
    }
    for (const line of NETWORK.lines) {
      const url = `/audio/beijing/lines/${line.id}.mp3`;
      expected.set(url, { text: line.name + '。', language: 'zh-CN' }); expect(manifest.lines[line.id]).toBe(url);
    }
    expect(expected.size).toBe(506); expect(Object.keys(manifest.recordings).sort()).toEqual([...expected.keys()].sort());
    for (const [url, script] of expected) {
      const entry = manifest.recordings[url];
      expect(entry.recordingText).toBe(script.text); expect(entry.recordingLanguage).toBe(script.language);
      expect(entry.voice).toBe(copy[script.language].voice); expect(entry.durationSeconds).toBeGreaterThan(0); expect(entry.bytes).toBeGreaterThan(1000);
      const file = new URL(`../public${url}`, import.meta.url); const bytes = readFileSync(file);
      expect(statSync(file).size).toBe(entry.bytes); expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      expect((bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) || (bytes[0] === 255 && (bytes[1] & 224) === 224)).toBe(true);
    }
    expect(Object.keys(manifest.stations)).toHaveLength(426); expect(Object.keys(manifest.lines)).toHaveLength(28);
    for (const language of languages) {
      expect(manifest.locales[language].phraseRecordingLanguage).toBe(beijingRecordingLanguage(language));
      expect(manifest.locales[language].identityRecordingLanguage).toBe('zh-CN');
    }
    expect(manifest.notice).toContain('not an Inner Mongolia regional voice');
  });
});
