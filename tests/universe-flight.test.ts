import { describe, expect, it } from 'vitest';
import { angularDoppler, aberratedCosine, dopplerTint, flightFrame, FLIGHT_STARS, flightStar } from '../src/universe/flight';
import { createJourney, beginJump, tickJourney, readJourney, writeJourney } from '../src/universe/model';
import { universeMarkup } from '../src/universe/renderer';
import { freezeSnapshot, type UniverseSnapshot } from '../src/universe/view';
import { EPOCHS } from '../src/universe/catalog';

const view = (patch: Partial<UniverseSnapshot> = {}): UniverseSnapshot => ({ destinationId: 'saturn', kind: 'ring', color: '#dcba89', epoch: 'present', beta: .85, travelling: true, progress: 0, paused: false, reducedMotion: false, origin: { destinationId: 'earth', kind: 'earth', color: '#abcdef', epoch: 'present' }, ...patch });

describe('progress-driven flight and exact angular SR', () => {
  it.each([0, .1, .65, .9999])('has correct forward, rear and transverse frequency ratios at beta %s', beta => {
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    expect(angularDoppler(beta, 1)).toBeCloseTo(Math.sqrt((1 + beta) / (1 - beta)), 8);
    expect(angularDoppler(beta, -1)).toBeCloseTo(Math.sqrt((1 - beta) / (1 + beta)), 8);
    expect(angularDoppler(beta, -beta)).toBeCloseTo(1 / gamma, 8);
    for (const mu of [-1, -.8, 0, .6, 1]) {
      const observed = aberratedCosine(beta, mu);
      expect(observed).toBeGreaterThanOrEqual(mu - 1e-12);
      expect(angularDoppler(beta, mu)).toBeCloseTo(1 / (gamma * (1 - beta * observed)), 7);
      expect(aberratedCosine(0, mu)).toBe(mu);
      expect(angularDoppler(0, mu)).toBe(1);
    }
  });
  it('bounds invalid inputs and maps rear red/forward blue without uniformly tinting the sky', () => {
    for (const beta of [NaN, Infinity, -1, 1, 500]) for (const mu of [NaN, -5, 0, 5]) {
      expect(Number.isFinite(angularDoppler(beta, mu))).toBe(true);
      expect(Math.abs(aberratedCosine(beta, mu))).toBeLessThanOrEqual(1);
    }
    const forward = dopplerTint(angularDoppler(.85, 1)), rear = dopplerTint(angularDoppler(.85, -1));
    expect(forward[2]).toBeGreaterThan(forward[0]); expect(rear[0]).toBeGreaterThan(rear[2]);
    expect(dopplerTint(1)).toEqual([1, 1, 1]);
  });
  it('starts exactly at origin, cruises without full destination, and settles exactly at destination', () => {
    const start = flightFrame(view()), mid = flightFrame(view({ progress: .5 })), end = flightFrame(view({ progress: 1 }));
    expect(start.layers).toEqual([{ location: view().origin, opacity: 1, scale: 1, offset: 0 }]);
    expect(start.visualBeta).toBe(0); expect(mid.visualBeta).toBe(.85); expect(mid.layers).toEqual([]);
    expect(end.layers).toEqual([{ location: { destinationId: 'saturn', kind: 'ring', color: '#dcba89', epoch: 'present' }, opacity: 1, scale: 1, offset: 0 }]);
    expect(end.visualBeta).toBe(0);
    const near = flightFrame(view({ progress: .7 })).layers.find(layer => layer.location.destinationId === 'saturn')!;
    expect(near.opacity).toBeGreaterThan(0); expect(near.opacity).toBeLessThan(.3); expect(near.scale).toBeLessThan(.5);
    expect(universeMarkup(view())).toContain('blue-marble'); expect(universeMarkup(view())).not.toContain('ring-planet');
    expect(universeMarkup(view({ progress: .5 }))).toContain('data-scene="transit"');
    expect(universeMarkup(view({ progress: 1 }))).toContain('ring-planet');
  });
  it('travels through intermediate eras in either direction, at the same place for time-only jumps', () => {
    const forward = view({ destinationId: 'earth', kind: 'earth', epoch: 'far', origin: { ...view().origin!, epoch: 'bang' } });
    const backward = view({ destinationId: 'earth', kind: 'earth', epoch: 'bang', origin: { ...view().origin!, epoch: 'far' } });
    for (const p of [.15, .3, .5, .7, .85]) {
      const a = flightFrame({ ...forward, progress: p }), b = flightFrame({ ...backward, progress: 1 - p });
      expect(a.space).toBe(false); expect(a.time).toBe(true); expect(a.skyTravel).toBe(0); expect(a.visualBeta).toBe(0);
      expect(a.layers.map(layer => layer.location.epoch)).toEqual(b.layers.map(layer => layer.location.epoch));
      a.layers.forEach(layer => { expect(layer.scale).toBe(1); expect(layer.offset).toBe(0); });
      expect(a.layers.reduce((sum, layer) => sum + layer.opacity, 0)).toBeCloseTo(1);
    }
    expect(flightFrame({ ...forward, progress: .5 }).layers[0].location.epoch).toBe('first');
  });
  it('gates late-forming modern objects during quasar-to-present interpolation', () => {
    const base = view({ destinationId: 'earth', kind: 'earth', origin: { ...view().origin!, epoch: 'quasar' } });
    expect(universeMarkup({ ...base, progress: .5 })).not.toContain('blue-marble');
    expect(universeMarkup({ ...base, progress: .8 })).toContain('blue-marble');
    for (const epoch of EPOCHS.slice(0, 5)) {
      const markup = universeMarkup(view({ epoch: epoch.id, origin: { ...view().origin!, epoch: epoch.id }, progress: .8 }));
      expect(markup).not.toContain('ring-planet'); expect(markup).not.toContain('blue-marble');
    }
  });
  it('is stateless across paused/recreated views and reduced-motion removes optical sweep, streaks and scales', () => {
    const state = view({ progress: .73 });
    expect(flightFrame({ ...state, paused: true })).toEqual(flightFrame(state));
    const frozen = freezeSnapshot(state);
    expect(flightFrame(frozen)).toEqual(flightFrame(JSON.parse(JSON.stringify(frozen))));
    const reduced = flightFrame({ ...state, reducedMotion: true });
    expect(reduced.visualBeta).toBe(0); expect(reduced.skyTravel).toBe(0); expect(reduced.layers).toHaveLength(2);
    expect(reduced.layers.reduce((sum, layer) => sum + layer.opacity, 0)).toBeCloseTo(1);
    reduced.layers.forEach(layer => { expect(layer.scale).toBe(1); expect(layer.offset).toBe(0); });
    FLIGHT_STARS.forEach(star => expect(flightStar(star, reduced).trail).toBe(0));
  });
  it('makes sky endpoints continuous and bounds deterministic stars at every progress', () => {
    const start = flightFrame(view()), end = flightFrame(view({ progress: 1 }));
    const arrived = flightFrame(view({ progress: 1, travelling: false, origin: undefined }));
    expect(arrived.visualBeta).toBe(0);
    for (const star of FLIGHT_STARS) {
      const a = flightStar(star, start), b = flightStar(star, end);
      expect(a.x).toBeCloseTo(b.x); expect(a.y).toBeCloseTo(b.y); expect(a.z).toBeCloseTo(b.z);
      const settled = flightStar(star, arrived);
      expect(b.x).toBeCloseTo(settled.x); expect(b.y).toBeCloseTo(settled.y); expect(b.z).toBeCloseTo(settled.z);
      for (const progress of [0, .01, .5, .99, 1]) {
        const point = flightStar(star, flightFrame(view({ progress })));
        Object.values(point).forEach(value => expect(Number.isFinite(value)).toBe(true));
      }
    }
  });
  it('deeply freezes and clones origin, while accepting the legacy flat snapshot', () => {
    const input = view(), copy = freezeSnapshot(input);
    expect(copy.origin).not.toBe(input.origin); expect(Object.isFrozen(copy)).toBe(true); expect(Object.isFrozen(copy.origin)).toBe(true);
    expect(flightFrame(view({ origin: undefined })).layers[0].location.destinationId).toBe('saturn');
    expect(universeMarkup(view({ origin: undefined }))).toContain('ring-planet');
  });
});

describe('persisted departure scenes', () => {
  it('captures current reached scene, keeps jumps immutable, and preserves departures through arrival and reload', () => {
    const original = createJourney(), first = beginJump(original, 'moon', 'dark');
    expect(original.destinationId).toBe('earth'); expect(first.departureDestinationId).toBe('earth'); expect(first.departureEpochId).toBe('present');
    const reached = tickJourney(first, 7), second = tickJourney(beginJump(reached, 'sun', 'future'), 3);
    expect(second.departureDestinationId).toBe('moon'); expect(second.departureEpochId).toBe('dark');
    let raw = ''; const storage = { setItem: (_: string, value: string) => { raw = value; }, getItem: () => raw };
    expect(writeJourney(storage, second)).toBe(true);
    expect(readJourney(storage)).toEqual({ ...second, paused: true });
    expect(tickJourney(readJourney(storage), 4)).toEqual({ ...second, paused: true });
  });
  it('accepts legacy v1 without departure fields, but rejects malformed provided departures and unknown extra fields', () => {
    const state = beginJump(createJourney(), 'moon', 'dark');
    const { departureDestinationId: _id, departureEpochId: _epoch, ...legacy } = state;
    const read = (value: unknown) => readJourney({ getItem: () => JSON.stringify({ version: 1, state: value }) });
    expect(read(legacy)).toEqual({ ...state, departureDestinationId: 'moon', departureEpochId: 'dark', paused: true });
    for (const patch of [{ departureDestinationId: null }, { departureDestinationId: '__proto__' }, { departureEpochId: 'nope' }, { departureEpochId: 1 }, { extra: 'field' }]) {
      expect(read({ ...state, ...patch })).toEqual(createJourney());
    }
  });
});
