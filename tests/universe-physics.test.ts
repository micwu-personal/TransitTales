import { describe, expect, it } from 'vitest';
import { AU_METERS, LIGHT_SPEED, YEAR_SECONDS, cruiseEstimate, gravitationalFrequency, sourceFrequency } from '../src/universe/physics';
import { updateInstruments, instrumentCopy } from '../src/universe/instruments';
import { DESTINATIONS } from '../src/universe/catalog';
import type { UniverseSnapshot } from '../src/universe/view';

const snapshot = (id = 'moon'): UniverseSnapshot => {
  const destination = DESTINATIONS.find(item => item.id === id)!;
  return { destinationId: id, kind: destination.kind, color: destination.color, epoch: 'present', beta: .6, progress: .5, travelling: true, paused: false, reducedMotion: false, coordinateView: true, origin: { destinationId: 'earth', kind: 'earth', color: '#6699aa', epoch: 'present' } };
};

describe('explicit physical estimates', () => {
  it('converts AU to constant-cruise observer and proper time, not play seconds', () => {
    const estimate = cruiseEstimate(LIGHT_SPEED * YEAR_SECONDS / AU_METERS, .6);
    expect(estimate.observerSeconds).toBeCloseTo(YEAR_SECONDS / .6);
    expect(estimate.travelerSeconds / estimate.observerSeconds).toBeCloseTo(.8);
    expect(cruiseEstimate(0, 0)).toEqual({ observerSeconds: 0, travelerSeconds: 0 });
    expect(cruiseEstimate(1, 0).observerSeconds).toBe(Infinity);
  });
  it.each([-1, NaN, Infinity])('rejects invalid distances %s without emitting invalid estimates', distance => {
    expect(cruiseEstimate(distance, .6)).toEqual({ observerSeconds: 0, travelerSeconds: 0 });
  });
  it.each([-1, 1, NaN, Infinity])('rejects invalid cruise speeds %s', beta => {
    expect(cruiseEstimate(1, beta)).toEqual({ observerSeconds: 0, travelerSeconds: 0 });
  });
  it('uses the static Schwarzschild frequency ratio between valid sites', () => {
    const radius = 2953.25;
    expect(gravitationalFrequency(1, radius * 3, radius * 12)).toBeCloseTo(Math.sqrt((1 - 1 / 3) / (1 - 1 / 12)));
    expect(gravitationalFrequency(1, radius * 3, radius * 3)).toBe(1);
    expect(gravitationalFrequency(1, radius * 3, radius * 100)).toBeLessThan(gravitationalFrequency(1, radius * 3, radius * 12));
    expect(gravitationalFrequency(0, 10, 20)).toBe(1);
  });
  it.each([[1, 0, 10], [1, 10, 0], [-1, 10, 20], [NaN, 10, 20], [1, Infinity, 20]])('guards invalid GR sites (%s, %s, %s)', (mass, source, observer) => {
    expect(gravitationalFrequency(mass, source, observer)).toBe(1);
  });
  it('keeps GR, cosmology and SR separate and does not redshift ordinary local bodies', () => {
    expect(sourceFrequency('moon', 'moon', .1, 0)).toEqual({ gravitational: 1, cosmological: 1 });
    expect(sourceFrequency('crab-pulsar', 'neutron', 1, .0000065).gravitational).toBeLessThan(1);
    expect(sourceFrequency('quasar', 'quasar', 1e12, 10).cosmological).toBeLessThan(1);
    expect(sourceFrequency('andromeda', 'galaxy', 1e11, .0025).cosmological).toBe(1);
  });
  it('does not mistake present-Earth lookback for the nearby traveler or another era', () => {
    const far = sourceFrequency('quasar', 'quasar', 1e12, 10, 13.8, 1e12);
    const near = sourceFrequency('quasar', 'quasar', 10, 10, 13.8, 1e12);
    expect(near.cosmological).toBeCloseTo(1);
    expect(far.cosmological).toBeLessThan(near.cosmological);
    expect(sourceFrequency('quasar', 'quasar', 1e12, 10, 1).cosmological).toBe(1);
    expect(sourceFrequency('quasar', 'quasar', 1e12, 10, 14).cosmological).toBe(1);
    expect(Math.abs(sourceFrequency('quasar', 'quasar', 1e12, 10, 13.8999).cosmological - 1)).toBeLessThan(.00001);
  });
  it('renders finite HUD values and no stopped-spatial warning for a zero-speed time-only jump', () => {
    const nodes = new Map<string, { textContent: string; dataset: Record<string, string> }>();
    const host = { querySelector(selector: string) { if (!nodes.has(selector)) nodes.set(selector, { textContent: '', dataset: {} }); return nodes.get(selector); } } as unknown as HTMLElement;
    updateInstruments(host, { ...snapshot(), beta: 0 }, 'zh-CN', value => String(value));
    expect([...nodes.values()].map(node => node.textContent).join(' ')).not.toMatch(/NaN|Infinity/);
    expect(nodes.get('#flight-stationary')!.textContent).toBe(instrumentCopy('zh-CN').stopped);
    updateInstruments(host, { ...snapshot('earth'), beta: 0, epoch: 'bang' }, 'en', value => String(value));
    expect(nodes.get('#flight-stationary')!.textContent).toBe('');
  });
});
