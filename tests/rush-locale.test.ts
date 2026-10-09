import { describe, expect, it } from 'vitest';
import { createGame, dispatch, holdConnection, NETWORK, SCENARIOS, sendCrew, stats, step, type Notice } from '../src/rush/model';
import { createLanguageController, LANGUAGE_KEY, messages, noticeText, preferredLanguage, scenarioCopy, stationNames, text, type Language } from '../src/rush/locale';

const languages: Language[] = ['en', 'zh-CN'];
const slots = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

describe('Transit Tales localization', () => {
  it('covers every message, substitution, station, scenario and event in both languages', () => {
    expect(Object.keys(messages['zh-CN']).sort()).toEqual(Object.keys(messages.en).sort());
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
      expect(messages['zh-CN'][key].trim()).not.toBe('');
      expect(slots(messages['zh-CN'][key])).toEqual(slots(messages.en[key]));
    }
    for (const language of languages) {
      expect(Object.keys(stationNames[language]).sort()).toEqual(NETWORK.stations.map(s => s.id).sort());
      expect(Object.keys(scenarioCopy[language]).sort()).toEqual(SCENARIOS.map(s => s.id).sort());
      for (const scenario of SCENARIOS) {
        const copy = scenarioCopy[language][scenario.id];
        expect(copy.name).toBeTruthy(); expect(copy.subtitle).toBeTruthy(); expect(copy.briefing).toBeTruthy();
        expect(copy.events).toHaveLength(scenario.events.length);
        expect(copy.events.every(event => event.trim().length > 0)).toBe(true);
      }
      expect(Object.values(stationNames[language]).every(name => name.trim().length > 0)).toBe(true);
    }
  });

  it('substitutes numbers and localized names without leaving template tokens', () => {
    expect(text('en', 'toward', { station: 'Garden', capacity: 24 })).toBe('Toward Garden · 24 seats');
    expect(text('zh-CN', 'toward', { station: '花园站', capacity: 24 })).toBe('开往花园站 · 24 个座位');
    expect(text('zh-CN', 'stationAccessible', { station: '集市站', count: 32 })).toBe('集市站，32 人候车。选择此车站');
    expect(text('en', 'queueOne', { count: 1 })).toBe('1 person waiting');
    expect(text('en', 'queueMany', { count: 2 })).toBe('2 people waiting');
    expect(text('zh-CN', 'resultStats', { delivered: 220, transfers: 40, wait: 12 })).toBe('220 人到家 · 完成 40 次换乘 · 平均站台等待 12 秒');
  });

  it('relocalizes all neutral notices, including historical events and actions', () => {
    const notices: Notice[] = [
      { kind: 'dispatch', station: 'market' }, { kind: 'helpers' }, { kind: 'hold' }, { kind: 'spare' }, { kind: 'finished' },
      ...SCENARIOS.flatMap(scenario => [
        { kind: 'briefing', scenario: scenario.id } as Notice,
        ...scenario.events.map((_, index): Notice => ({ kind: 'event', scenario: scenario.id, index })),
      ]),
    ];
    for (const notice of notices) {
      for (const language of languages) {
        const value = noticeText(language, notice);
        expect(value).toBeTruthy(); expect(value).not.toMatch(/undefined|\{\w+\}/);
      }
      expect(noticeText('zh-CN', notice)).not.toEqual(noticeText('en', notice));
    }
    expect(noticeText('zh-CN', { kind: 'dispatch', station: 'market' })).toContain('集市站');
  });

  it('loads saved language, falls back to browser preference, and tolerates denied storage', () => {
    expect(preferredLanguage({ getItem: () => 'en' }, ['zh-CN'])).toBe('en');
    expect(preferredLanguage({ getItem: () => 'zh-CN' }, ['en-US'])).toBe('zh-CN');
    expect(preferredLanguage({ getItem: () => 'invalid' }, ['zh-SG'])).toBe('zh-CN');
    expect(preferredLanguage(undefined, ['zh-TW'])).toBe('zh-CN');
    expect(preferredLanguage(undefined, ['en-US', 'zh-CN'])).toBe('en');
    expect(preferredLanguage(undefined, ['fr-FR'])).toBe('en');
    expect(preferredLanguage(undefined, [])).toBe('en');
    const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    const rendered: Language[] = [];
    const locale = createLanguageController(denied, ['zh-CN'], language => rendered.push(language));
    expect(locale.language).toBe('zh-CN');
    expect(() => locale.setLanguage('en')).not.toThrow();
    expect(rendered).toEqual(['en']);
  });

  it('switches presentation without changing active, paused, or finished simulation state', () => {
    const game = createGame(SCENARIOS[2]); game.phase = 'playing';
    dispatch(game, 'central', 'coral'); holdConnection(game, game.trains.at(-1)!.id); sendCrew(game, 'central');
    for (let i = 0; i < 30; i++) step(game);
    const view = { selected: 'airport', paused: false, speed: 3, accumulator: 0.75, helpOpen: true };
    const store = new Map<string, string>([['rush-best-connections', '1234']]);
    let rendered = '';
    const locale = createLanguageController({ getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); } }, ['en'], language => {
      rendered = noticeText(language, game.notices.at(-1)!);
      text(language, 'hintRunning', { count: game.trains.length });
      scenarioCopy[language][game.scenario.id]; stationNames[language][view.selected]; stats(game);
    });
    for (const phase of ['playing', 'finished'] as const) {
      game.phase = phase;
      for (const paused of [false, true]) {
        view.paused = paused;
        const before = JSON.stringify({ game, view });
        locale.setLanguage('zh-CN'); expect(rendered).toMatch(/[\u3400-\u9fff]/);
        expect(JSON.stringify({ game, view })).toBe(before);
        locale.setLanguage('en'); expect(JSON.stringify({ game, view })).toBe(before);
      }
    }
    expect(store.get(LANGUAGE_KEY)).toBe('en');
    expect(store.get('rush-best-connections')).toBe('1234');
  });
});
