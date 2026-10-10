import { describe, expect, it } from 'vitest';
import { createGame, NETWORK, SCENARIOS, step, type Network } from '../src/rush/model';
import { COASTAL_LAYOUT } from '../src/rush/city';
import { createCitySnapshot, type ViewOptions } from '../src/rush/view';

const options: ViewOptions = { selected: 'market', language: 'en', interpolationSeconds: 0, animate: true, layout: COASTAL_LAYOUT };

describe('renderer-neutral city adapter', () => {
  it('returns deeply frozen detached values without changing simulation state', () => {
    const game = createGame(); game.phase = 'playing'; step(game);
    const before = JSON.stringify(game);
    const snapshot = createCitySnapshot(game, options);
    const visit = (value: unknown) => {
      if (value !== null && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(visit);
      }
    };
    visit(snapshot);
    expect(JSON.stringify(game)).toBe(before);
    expect(snapshot.lines[0].stops).not.toBe(game.network.lines[0].stops);
    const saved = JSON.stringify(snapshot);
    step(game); game.trains[0].riders.length = 0;
    expect(JSON.stringify(snapshot)).toBe(saved);
    expect(() => { (snapshot.stations[0].position as { x: number }).x = 0; }).toThrow();
  });

  it('interpolates normalized segment positions and clamps the view without modifying train progress', () => {
    const game = createGame(); game.phase = 'playing';
    const train = game.trains[0]; train.moving = true; train.progress = 0.25;
    const snapshot = createCitySnapshot(game, { ...options, interpolationSeconds: 2.25 });
    const view = snapshot.trains[0];
    expect(view.from).toBe('harbor'); expect(view.to).toBe('market'); expect(view.progress).toBe(0.5);
    expect(view.position.x).toBeCloseTo((COASTAL_LAYOUT.harbor.x + COASTAL_LAYOUT.market.x) / 2);
    expect(view.position.y).toBeCloseTo((COASTAL_LAYOUT.harbor.y + COASTAL_LAYOUT.market.y) / 2);
    expect(train.progress).toBe(0.25);
    expect(createCitySnapshot(game, { ...options, interpolationSeconds: 999 }).trains[0].progress).toBe(1);
    expect(createCitySnapshot(game, { ...options, interpolationSeconds: -1 }).trains[0].progress).toBe(0.25);
  });

  it('freezes interpolation when paused, reduced-motion, ready, finished, or dwelling', () => {
    const game = createGame(); game.trains[0].moving = true; game.trains[0].progress = 0.4;
    for (const phase of ['ready', 'finished'] as const) {
      game.phase = phase;
      expect(createCitySnapshot(game, { ...options, interpolationSeconds: 0.9 }).trains[0].progress).toBe(0.4);
    }
    game.phase = 'playing';
    expect(createCitySnapshot(game, { ...options, animate: false, interpolationSeconds: 0.9 }).trains[0].progress).toBe(0.4);
    game.trains[0].moving = false;
    expect(createCitySnapshot(game, { ...options, interpolationSeconds: 0.9 }).trains[0].progress).toBe(0);
  });

  it('remaps presentation independently of topology and supports unknown station IDs without model coordinates', () => {
    const network: Network = {
      segmentSeconds: 4,
      stations: [{ id: 'one', name: 'One', icon: '1', x: -999, y: -999 }, { id: 'two', name: 'Two', icon: '2', x: 999, y: 999 }],
      lines: [{ id: 'blue', name: 'Blue', color: '#286cb1', stops: ['one', 'two'] }],
    };
    const game = createGame({ ...SCENARIOS[0], hot: 'one', events: [] }, network); game.phase = 'playing';
    game.trains[0].moving = true;
    const layout = { one: { x: 0.2, y: 0.3 }, two: { x: 0.8, y: 0.7 } };
    const snapshot = createCitySnapshot(game, { ...options, selected: 'two', layout, interpolationSeconds: 2 });
    expect(snapshot.lines).toHaveLength(1); expect(snapshot.stations.map(s => s.id)).toEqual(['one', 'two']);
    expect(snapshot.stations[1].selected).toBe(true); expect(snapshot.stations[0].label).toBe('One');
    expect(snapshot.trains[0].position.x).toBeCloseTo(0.5); expect(snapshot.trains[0].position.y).toBeCloseTo(0.5);
    layout.one.x = 0.9; expect(snapshot.stations[0].position.x).toBe(0.2);
    const fallback = createCitySnapshot(game, { ...options, layout: {} });
    for (const station of fallback.stations) {
      expect(station.position.x).toBeGreaterThanOrEqual(0); expect(station.position.x).toBeLessThanOrEqual(1);
      expect(station.position.y).toBeGreaterThanOrEqual(0); expect(station.position.y).toBeLessThanOrEqual(1);
    }
    const changedCoordinates = structuredClone(NETWORK);
    changedCoordinates.stations.forEach(s => { s.x *= 100; s.y *= -50; });
    expect(createCitySnapshot(createGame(SCENARIOS[0], changedCoordinates), options)).toEqual(createCitySnapshot(createGame(), options));
  });

  it('switches snapshot copy and station selection without resetting running game or geometry', () => {
    const game = createGame(); game.phase = 'playing'; for (let i = 0; i < 12; i++) step(game);
    const before = JSON.stringify(game);
    const english = createCitySnapshot(game, options);
    const chinese = createCitySnapshot(game, { ...options, language: 'zh-CN', selected: 'airport' });
    expect(chinese.stations[0].label).toBe('港口站'); expect(chinese.accessibleName).toMatch(/小湾/);
    expect(chinese.stations.find(s => s.id === 'airport')!.selected).toBe(true);
    expect(chinese.trains.map(({accessibleName: _, ...train}) => train)).toEqual(english.trains.map(({accessibleName: _, ...train}) => train));
    expect(chinese.trains[0].accessibleName).toContain('查看车厢'); expect(chinese.lines).toEqual(english.lines);
    for (const language of ['ja', 'mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
      const localized = createCitySnapshot(game, { ...options, language });
      expect(localized.trains.map(({ accessibleName: _, ...train }) => train)).toEqual(english.trains.map(({ accessibleName: _, ...train }) => train));
      expect(localized.trains[0].accessibleName).not.toBe(english.trains[0].accessibleName);
      expect(localized.stations[0].label).not.toBe(english.stations[0].label);
    }
    expect(JSON.stringify(game)).toBe(before);
  });
});
