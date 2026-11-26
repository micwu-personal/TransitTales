import { describe, expect, it } from 'vitest';
import { earthSites, solarHour } from '../src/explorer/earth-site';
import { dot, unit, sub } from '../src/explorer/camera';
import { solarSystem } from '../src/explorer/catalog';

describe('Earth observing sites', () => {
  it('preserves the local solar day across UTC day boundaries', () => {
    const date = new Date('2026-02-14T03:00:00Z');
    expect(solarHour(date, -150, 12).toISOString()).toBe('2026-02-13T22:00:00.000Z');
    expect(solarHour(date, 150, 0).toISOString()).toBe('2026-02-13T14:00:00.000Z');
  });
  it('places the Sun above the Mauna Kea horizon at solar noon and below at midnight', () => {
    const { lat, lon } = earthSites.maunakea;
    function altitude(hour: number) {
      const scene = solarSystem(solarHour(new Date('2026-02-14T15:00:00Z'), lon, hour), lat, lon);
      return dot(scene.up, unit(sub([0, 0, 0], scene.observer)));
    }
    expect(altitude(12)).toBeGreaterThan(.8);
    expect(altitude(0)).toBeLessThan(-.8);
  });
});
