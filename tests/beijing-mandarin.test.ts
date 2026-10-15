import { describe, expect, it } from 'vitest';
import { beijingAnnouncement } from '../src/beijing/announcements';
import { NETWORK } from '../src/beijing/network';
import copy from '../src/beijing/mandarin-copy.json';
import catalog from '../src/beijing/mandarin-announcements.json';

const spokenLines: Readonly<Record<string, string>> = copy.spokenLines;
const scripts: Readonly<Record<string, string>> = catalog.scripts;
const contexts: Readonly<Record<string, string>> = catalog.contexts;

describe('Natural complete-sentence Beijing Mandarin announcements', () => {
  it('records every next-stop and arrival as one coherent clip, without an isolated line label or duplicated station suffix', () => {
    for (const station of NETWORK.stations) {
      const identity = station.name.endsWith('站') ? station.name : `${station.name}站`;
      for (const kind of ['ride', 'arrival', 'walk'] as const) {
        const speech = beijingAnnouncement('zh-CN', { kind, stationId: station.id });
        expect(speech.clips).toHaveLength(1);
        expect(speech.clips[0]).toContain('/audio/beijing/mandarin/');
        expect(speech.recordingText).toContain(identity);
        expect(speech.recordingText).not.toMatch(/线路[。\s]|站站|\{\w+\}/);
        expect(speech.recordingText).toBe(scripts[contexts[`${kind}|${station.id}`]]);
      }
    }
    expect(beijingAnnouncement('zh-CN', { kind: 'ride', stationId: 'beijing-railway-station', lineId: '2' }).recordingText).toContain('列车运行前方是北京站');
    expect(beijingAnnouncement('zh-CN', { kind: 'arrival', stationId: 'beijing-railway-station' }).recordingText).toMatch(/^北京站到了。/);
  });
  it('announces only genuine same-node connecting services, never the current train or an external walking connection', () => {
    for (const incoming of NETWORK.lines) for (const stationId of new Set(incoming.stops)) {
      const speech = beijingAnnouncement('zh-CN', { kind: 'ride', stationId, lineId: incoming.id });
      const others = NETWORK.lines.filter(line => line.stops.includes(stationId) && line.serviceGroup !== incoming.serviceGroup);
      expect(speech.clips).toHaveLength(1);
      expect(speech.recordingText.includes('本站可以换乘')).toBe(others.length > 0);
      for (const line of others) expect(speech.recordingText).toContain(spokenLines[line.id]);
      // Public through-service labels can share characters, but the complete spoken name is never repeated as a current-line label.
      expect(speech.recordingText).not.toContain(spokenLines[incoming.id]);
    }
    expect(beijingAnnouncement('zh-CN', { kind: 'ride', stationId: 'muxidi', lineId: '1-batong' }).recordingText).not.toContain(spokenLines['16']);
  });
  it('welcomes riders onto their actual service and makes transfer instructions a full sentence, not a generic service tag', () => {
    for (const line of NETWORK.lines) for (const kind of ['boarding', 'transfer'] as const) {
      const speech = beijingAnnouncement('zh-CN', { kind, stationId: line.stops[0], lineId: line.id });
      expect(speech.clips).toHaveLength(1);
      expect(speech.recordingText).toContain(spokenLines[line.id]);
      expect(speech.recordingText).not.toContain('线路。');
      if (kind === 'boarding') expect(speech.recordingText).toMatch(/^欢迎乘坐/);
      else expect(speech.recordingText).toMatch(/^换乘/);
    }
    expect(beijingAnnouncement('zh-CN', { kind: 'boarding', stationId: 'beijing-railway-station', lineId: '2' }).recordingText).toContain('地铁二号线列车');
  });
  it('does not misreport the passenger destination or an intermediate arrival as a train terminus', () => {
    const complete = beijingAnnouncement('zh-CN', { kind: 'complete', stationId: 'beijing-railway-station', lineId: '2' });
    expect(complete.clips).toHaveLength(1);
    expect(complete.recordingText).toContain('本次行程的目的地');
    expect(complete.recordingText).not.toMatch(/终点站|全体乘客下车/);
    const arrival = beijingAnnouncement('zh-CN', { kind: 'stop', stationId: 'beijing-railway-station', lineId: '2' });
    expect(arrival.recordingText).not.toMatch(/终点站|全体乘客下车/);
    expect(beijingAnnouncement('zh-CN').clips).toHaveLength(1);
  });
  it('has a complete, deduplicated, deterministic recording catalog with no stray template placeholders', () => {
    expect(Object.keys(spokenLines).sort()).toEqual(NETWORK.lines.map(line => line.id).sort());
    expect(new Set(Object.values(contexts))).toEqual(new Set(Object.keys(scripts)));
    expect(Object.keys(scripts)).toHaveLength(1546);
    for (const [relative, text] of Object.entries(scripts)) {
      expect(relative).toMatch(/^mandarin\/[a-f0-9]{24}$/);
      expect(text).not.toMatch(/\{\w+\}/);
      expect(text).not.toMatch(/线路[。\s]/);
    }
  });
});
