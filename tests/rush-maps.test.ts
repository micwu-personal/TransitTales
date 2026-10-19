import { describe, expect, it } from 'vitest';
import { MAPS, NETWORK, ISLAND_NETWORK, SCENARIOS, createGame, mapFor, nextScenario, sendCrew, step, type Scenario } from '../src/rush/model';
import { FESTIVAL_ISLANDS, ISLAND_LAYOUT, COASTAL_LAYOUT, festivalIslandAt, islandScenery, layoutFor } from '../src/rush/city';
import { createCitySnapshot } from '../src/rush/view';
import { mapText } from '../src/rush/adventure-copy';
import { stationNames, type Language } from '../src/rush/locale';
import { ANNOUNCEMENT_STOPS, announcementAsset } from '../src/rush/announcements';
import { createInteriorSnapshot, interiorAnnouncement } from '../src/rush/interior';

const languages: Language[] = ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'];
const snapshot = (game = createGame(mapFor('lantern-isles').scenarios[0])) => createCitySnapshot(game, { language: 'en', selected: game.scenario.hot, layout: layoutFor(game.network.mapId!), interpolationSeconds: 0, animate: false });

describe('two original districts with five rounds each', () => {
  it('offers ten unique seeded playable shifts, leaving the original three in place', () => {
    expect(MAPS.map(map => map.scenarios.length)).toEqual([5, 5]);
    expect(SCENARIOS.slice(0, 3).map(s => s.id)).toEqual(['first-shift', 'concert', 'connections']);
    expect(new Set(SCENARIOS.map(s => s.id)).size).toBe(10);
    expect(new Set(SCENARIOS.map(s => s.seed)).size).toBe(10);
    expect(new Set(SCENARIOS.map(s => JSON.stringify(s.events))).size).toBe(10);
    for (const map of MAPS) for (const scenario of map.scenarios) {
      const game = createGame(scenario);
      expect(game.network).toBe(map.network);
      expect(game.queues[scenario.hot]).toHaveLength(32);
      expect(scenario.events.length).toBeGreaterThanOrEqual(2);
      let previous = 0;
      for (const event of scenario.events) {
        expect(event.at).toBeGreaterThan(previous);
        expect(event.at).toBeLessThan(scenario.duration);
        expect(game.queues[event.station]).toBeDefined();
        previous = event.at;
      }
    }
  });

  it('advances through both five-round maps and wraps without an invalid selection', () => {
    let current = SCENARIOS[0];
    for (const scenario of SCENARIOS) { expect(current).toBe(scenario); current = nextScenario(current); }
    expect(current).toBe(SCENARIOS[0]);
    expect(nextScenario(mapFor('little-bay').scenarios[4])).toBe(mapFor('lantern-isles').scenarios[0]);
  });

  it('isolates mutable game state and honors custom-network callers', () => {
    const a = createGame(SCENARIOS[5]), b = createGame(SCENARIOS[5]), coast = createGame();
    a.phase = 'playing'; step(a);
    expect(b.time).toBe(0); expect(b.queues[b.scenario.hot]).toHaveLength(32);
    expect(a.queues).not.toBe(b.queues); expect(a.trains[0].riders).not.toBe(b.trains[0].riders);
    expect(coast.network).toBe(NETWORK);
    expect(createGame(SCENARIOS[5], NETWORK).network).toBe(NETWORK);
    expect(ISLAND_NETWORK.lines[0].stops).not.toBe(NETWORK.lines[0].stops);
  });

  it('keeps all station and line identities compatible with every existing recording', () => {
    for (const map of MAPS) for (const language of languages) {
      const game = createGame(map.scenarios[0]);
      for (const line of game.network.lines) {
        expect(line.stops).toEqual(ANNOUNCEMENT_STOPS[line.id]);
        for (const id of line.stops) {
          const interior = createInteriorSnapshot(game, { kind: 'station', id }, language, line.id)!;
          expect(interior.title).toBe(stationNames[language][id]);
          expect(announcementAsset(language, interiorAnnouncement(interior))).toMatch(/\.mp3$/);
        }
      }
    }
  });

  it.each(languages)('has complete distinct map/place and countdown copy in %s', language => {
    const coast = mapText(language, 'little-bay'), islands = mapText(language, 'lantern-isles');
    expect(coast.name).not.toBe(islands.name); expect(coast.description).not.toBe(islands.description);
    for (const copy of [coast, islands]) {
      expect(copy.countdown(35)).toContain('35');
      for (const id of Object.keys(ISLAND_LAYOUT)) expect(copy.places[id].length).toBeGreaterThan(2);
      const fields = [copy.choose, copy.round, copy.forecast, copy.finale, copy.description, ...Object.values(copy.places)];
      if (language === 'mn-Cyrl-MN') for (const field of fields) expect(field).toMatch(/[А-Яа-яӨөҮү]/);
      if (language === 'mn-Mong-CN') for (const field of fields) { expect(field).toMatch(/[\u1800-\u18af]/); expect(field).not.toMatch(/[А-Яа-я]/); }
    }
  });

  it('has four real islands, on-land stations and original recognizable landmarks', () => {
    expect(FESTIVAL_ISLANDS).toHaveLength(4); expect(layoutFor('little-bay')).toBe(COASTAL_LAYOUT);
    expect(ISLAND_LAYOUT).not.toEqual(COASTAL_LAYOUT);
    for (const point of Object.values(ISLAND_LAYOUT)) expect(festivalIslandAt(point)).toBeGreaterThanOrEqual(0);
    const svg = islandScenery();
    for (const place of ['lighthouse', 'night-market', 'clock-plaza', 'observatory', 'glasshouse', 'sky-story-tower', 'puppet-theatre', 'paper-boats', 'balloons']) expect(svg).toContain(`data-place="${place}"`);
    expect(svg).toContain('id="track-sleepers"');
  });

  it('detaches frozen island snapshots and shows the latest event briefly without changing identity', () => {
    const game = createGame(SCENARIOS[5]), initial = snapshot(game);
    expect(initial.mapId).toBe('lantern-isles'); expect(initial.riverLabel).toBe('Lantern lagoon');
    expect(initial.accessibleName).toContain('Lantern Isles');
    expect(initial.stations.find(s => s.id === 'harbor')!.accessibleName).toContain('Lighthouse pier');
    game.phase = 'playing'; while (game.time < 35) step(game);
    expect(snapshot(game).stations.find(s => s.id === 'harbor')!.eventActive).toBe(true);
    while (game.time < 47) step(game);
    expect(snapshot(game).stations.some(s => s.eventActive)).toBe(false);
    expect(initial.stations.find(s => s.id === 'market')!.waiting).toBe(32);
    expect(Object.isFrozen(initial.stations[0].position)).toBe(true);
  });
});

describe('deterministic festival assistance', () => {
  const scenario = (effect: 'helpers' | 'spare'): Scenario => ({ ...SCENARIOS[5], demand: 0, events: [{ at: 1, station: 'market', count: 12, message: 'Festival guests arrive', effect }] });
  it('adds helpers without consuming the manual cooldown and never shortens existing help', () => {
    const game = createGame(scenario('helpers')); game.phase = 'playing';
    expect(sendCrew(game, 'harbor')).toBe(true); const actions = game.actionCount;
    game.crewUntil.market = 40; step(game);
    expect(game.crewCooldown).toBe(29); expect(game.crewUntil.harbor).toBe(22); expect(game.crewUntil.market).toBe(40);
    expect(game.queues.market).toHaveLength(44); expect(game.actionCount).toBe(actions);
    const fresh = createGame(scenario('helpers')); fresh.phase = 'playing'; step(fresh);
    expect(fresh.crewUntil.market).toBe(23); expect(fresh.crewCooldown).toBe(0);
    step(fresh); expect(fresh.eventIndex).toBe(1); expect(fresh.queues.market).toHaveLength(44);
  });
  it('lends a spare exactly once, respecting the depot cap and refill schedule', () => {
    for (const spares of [1, 3]) {
      const game = createGame(scenario('spare')); game.phase = 'playing'; game.spares = spares; step(game);
      expect(game.spares).toBe(Math.min(3, spares + 1)); expect(game.nextSpare).toBe(28);
      step(game); expect(game.spares).toBe(Math.min(3, spares + 1));
    }
  });
});
