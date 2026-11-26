import { describe, expect, it } from 'vitest';
import type { Vec } from '../src/explorer/catalog';
import { paleBlueDotDate, paleBlueDotPosition, spacecraftDestinations, spacecraftEpoch, spacecraftPosition } from '../src/explorer/spacecraft';

// Independently queried Horizons KM-S, VEC_TABLE=1, discrete UTC TLIST, Sun center,
// ICRF, no light-time correction; not copied from the AU-D trajectory bundle.
const KM_PER_PC = 3.0856775814913673e13;
const errorKm = (position: Vec, km: Vec) => Math.hypot(...position.map((axis, i) => axis * KM_PER_PC - km[i]));
const at = (epoch: string) => new Date(epoch);

const missions = [
  { id: 'voyager-1', first: '1990-01-01', lastKm: [-5.346106760253412e9, -2.893406547238028e10, 6.383764163233771e9] },
  { id: 'voyager-2', first: '1990-01-01', lastKm: [7.062859285996289e9, -1.019205240420439e10, -2.225141087226186e10] },
  { id: 'new-horizons', first: '2020-01-01', lastKm: [4.491824017919726e9, -1.168433976765606e10, -4.554313135643908e9] },
] as const;

const interior = [
  { id: 'voyager-1', epoch: '2001-07-19T12:34:00Z', km: [-3.151644500119346e9, -1.153571442638869e10, 2.555731696381391e9] },
  { id: 'voyager-2', epoch: '1990-04-09T06:30:00Z', km: [9.881553921931826e8, -4.193596299571405e9, -1.994810091125139e9] },
  { id: 'voyager-2', epoch: '2026-09-17T01:30:00Z', km: [5.962438325134297e9, -9.132497536284086e9, -1.857093141467702e10] },
  { id: 'new-horizons', epoch: '2020-06-21T18:00:00Z', km: [2.055765126929426e9, -6.348765844823634e9, -2.486349624542138e9] },
  { id: 'new-horizons', epoch: '2026-11-26T01:31:00Z', km: [3.144398633187915e9, -8.740311151580980e9, -3.413318966054859e9] },
] as const;

describe('Night Atlas spacecraft ephemerides', () => {
  it('provides three localized destination snapshots from one common epoch', () => {
    expect(spacecraftDestinations.map(d => d.id)).toEqual(missions.map(m => m.id));
    for (const d of spacecraftDestinations) {
      expect(d.kind).toBe('spacecraft');
      expect(d.zh).toMatch(/[\u4e00-\u9fff]/);
      expect(d.position).toEqual(spacecraftPosition(d.id, at('2026-01-01')));
    }
  });

  it('recreates the exact Pale Blue Dot spacecraft epoch and geometry, not an image/light-time simulation', () => {
    expect(at(paleBlueDotDate).toISOString()).toBe('1990-02-14T04:48:00.000Z');
    expect(spacecraftPosition('voyager-1', at(paleBlueDotDate))).toEqual(paleBlueDotPosition);
    expect(errorKm(paleBlueDotPosition, [-2.354909069990771e9, -5.426143480437775e9, 1.211357200033456e9])).toBeLessThan(0.01);
    const earthKm = [-1.215594140195626e8, 7.702650255258043e7, 3.339722135589105e7];
    const earthDistanceKm = Math.hypot(...paleBlueDotPosition.map((axis, i) => axis * KM_PER_PC - earthKm[i]));
    expect(earthDistanceKm / 1e9).toBeCloseTo(6.05, 2);
    for (const offset of [-1, 1]) {
      const adjacent = spacecraftPosition('voyager-1', new Date(at(paleBlueDotDate).getTime() + offset * 1000))!;
      const shiftKm = Math.hypot(...adjacent.map((axis, i) => (axis - paleBlueDotPosition[i]) * KM_PER_PC));
      expect(shiftKm).toBeGreaterThan(10);
      expect(shiftKm).toBeLessThan(20);
    }
  });

  it.each(missions)('clamps $id to its own endpoints and reports the matching scene epoch', ({ id, first, lastKm }) => {
    const end = at('2035-01-01');
    const start = at(first);
    expect(spacecraftEpoch(id, at('1970-01-01'))).toEqual(start);
    expect(spacecraftEpoch(id, at('2100-01-01'))).toEqual(end);
    expect(spacecraftPosition(id, at('1970-01-01'))).toEqual(spacecraftPosition(id, start));
    const final = spacecraftPosition(id, end)!;
    expect(spacecraftPosition(id, at('2100-01-01'))).toEqual(final);
    expect(errorKm(final, lastKm)).toBeLessThan(0.01);
  });

  it.each(interior)('agrees with independent $id query at $epoch within 10,000 km', ({ id, epoch, km }) => {
    const date = at(epoch);
    expect(spacecraftEpoch(id, date)).toEqual(date);
    expect(errorKm(spacecraftPosition(id, date)!, km)).toBeLessThan(10_000);
  });

  it('does not return a fabricated state for unknown IDs or invalid dates', () => {
    for (const lookup of [spacecraftEpoch, spacecraftPosition]) {
      expect(lookup('earth', at('2026-01-01'))).toBeUndefined();
      expect(lookup('toString', at('2026-01-01'))).toBeUndefined();
      expect(lookup('voyager-1', new Date(NaN))).toBeUndefined();
    }
  });
});
