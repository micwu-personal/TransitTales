/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import hubEntry from '../index.html?raw';
import worldEntry from '../build-world.html?raw';
import universeEntry from '../universe.html?raw';
import economicEntry from '../economic.html?raw';
import { economicHubCopy } from '../src/hub/economic-copy';
import hubSource from '../src/hub/main.ts?raw';
import buildConfig from '../vite.config.ts?raw';
import rushEntry from '../src/rush/main.ts?raw';
import { hubCopy } from '../src/hub/locale';
import { concourseScene } from '../src/hub/scene';

describe('Transit Tales collection', () => {
  it('preserves distinct hub and construction entries in the multi-page build', () => {
    expect(hubEntry).toContain('/src/hub/main.ts');
    expect(worldEntry).toContain('/src/main.ts');
    expect(buildConfig).toContain("'build-world.html'");
    expect(buildConfig).toContain("'escalator.html'");
    expect(buildConfig).toContain("'universe.html'");
    expect(universeEntry).toContain('/src/universe/main.ts');
    expect(hubSource).toMatch(/id="play-universe"[^>]*href="universe\.html"/);
    expect(hubSource).toContain('universeCopy(lang)');
    expect(buildConfig).toContain("'economic.html'");
    expect(economicEntry).toContain('/src/economic/main.ts');
    expect(hubSource).toMatch(/id="play-economic"[^>]*href="economic\.html"/);
    expect(hubSource).toContain('economicHubCopy(lang)');
    for (const language of ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
      const entry = economicHubCopy(language);
      expect(Object.keys(entry)).toEqual(Object.keys(economicHubCopy('en')));
      for (const value of Object.values(entry)) expect(value.trim()).not.toBe('');
      expect(entry.note).toContain('24');
      expect(entry.note).toContain('English');
      expect(entry.note).toContain('简体中文');
    }
    expect(rushEntry).toContain('href="build-world.html"');
    expect(rushEntry).toContain("label('home')");
  });
  it('has complete nonempty copy in all five languages', () => {
    const en = hubCopy('en');
    const zh = hubCopy('zh-CN');
    const ja = hubCopy('ja');
    expect(Object.keys(ja)).toEqual(Object.keys(en));
    for (const value of Object.values(ja)) expect(value.trim().length).toBeGreaterThan(0);
    expect(Object.keys(zh)).toEqual(Object.keys(en));
    for (const value of Object.values(zh)) expect(value.trim().length).toBeGreaterThan(0);
    for (const language of ['mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
      const localized = hubCopy(language);
      expect(Object.keys(localized)).toEqual(Object.keys(en));
      for (const [key, phrase] of Object.entries(localized)) {
        expect(phrase).not.toBe(en[key as keyof typeof en]);
        expect(phrase).toMatch(language === 'mn-Cyrl-MN' ? /[\u0400-\u04ff]/ : /[\u1820-\u18aa]/);
      }
    }
    expect(zh.escalator).toBe('扶梯拼拼乐');
    expect(zh.future).toContain('尚未开放');
    expect(en.future).toContain('not playable yet');
  });
  it('localizes the same original concourse geometry', () => {
    const en = concourseScene('en');
    const zh = concourseScene('zh-CN');
    expect(en).toContain(`↑ ${hubCopy('en').atrium}`);
    expect(zh).toContain(`↑ ${hubCopy('zh-CN').atrium}`);
    const geometry = (s: string) => s.replace(/<g class="concourse-sign"[^>]*>.*?<\/g>/g, '').replace(/<text[^>]*>.*?<\/text>/g, '');
    expect(geometry(en)).toBe(geometry(zh));
    expect(concourseScene('ja')).toContain('↑ アトリウム');
    expect(geometry(en)).toBe(geometry(concourseScene('ja')));
    for (const language of ['mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
      const scene = concourseScene(language), labels = hubCopy(language);
      if (language === 'mn-Mong-CN') {
        expect(scene.match(/writing-mode:vertical-lr/g)).toHaveLength(2);
        expect(scene.match(/font-family="Noto Sans Mongolian,sans-serif"/g)).toHaveLength(2);
        expect(scene.match(/lang="mn-Mong-CN" xml:lang="mn-Mong-CN"/g)).toHaveLength(2);
        for (const word of `${labels.atrium} ${labels.platform}`.split(' ')) expect(scene).toContain(`>${word}</tspan>`);
        expect(scene).not.toContain(`↑ ${labels.atrium}`);
      } else {
        expect(scene).toContain(`↑ ${labels.atrium}`);
        expect(scene).toContain(`↓ ${labels.platform}`);
      }
      expect(geometry(scene)).toBe(geometry(en));
    }
    expect(en).not.toContain('<image');
  });
});
