import { describe, expect, it } from 'vitest';
import { DESTINATIONS } from '../src/universe/catalog';
import { coordinateBodies, coordinateBody } from '../src/universe/coordinates';
import { routeFrame, routeItinerary, subtract, length, dot, projectDirection } from '../src/universe/route';
import { universeMarkup } from '../src/universe/renderer';
import type { UniverseSnapshot } from '../src/universe/view';

function snapshot(to: string, progress: number, from = 'earth', epoch: UniverseSnapshot['epoch'] = 'present'): UniverseSnapshot {
  const a = DESTINATIONS.find(d => d.id === from)!, b = DESTINATIONS.find(d => d.id === to)!;
  return { destinationId: to, kind: b.kind, color: b.color, epoch, origin: { destinationId: from, kind: a.kind, color: a.color, epoch: 'present' }, beta: .6, travelling: true, progress, paused: true, reducedMotion: false };
}

describe('continuous coordinate routes', () => {
  it('declares actual guided detours and keeps the Moon trip local', () => {
    expect(routeItinerary('earth', 'moon')).toEqual(['earth', 'moon']);
    expect(routeItinerary('moon', 'earth')).toEqual(['moon', 'earth']);
    expect(routeItinerary('earth', 'saturn')).toEqual(['earth', 'mars', 'jupiter', 'saturn']);
    expect(routeItinerary('earth', 'proxima')).toEqual(['earth', 'jupiter', 'oort', 'proxima']);
    expect(routeItinerary('earth', 'earth')).toEqual(['earth']);
    expect(routeItinerary('oort', 'proxima')).toEqual(['oort', 'proxima']);
    expect(routeItinerary('saturn', 'proxima')).toEqual(['saturn', 'oort', 'proxima']);
  });
  it('moves continuously in AU, with angular approach and recession rather than endpoint opacity', () => {
    const start = routeFrame(snapshot('moon', 0)), middle = routeFrame(snapshot('moon', .5)), end = routeFrame(snapshot('moon', 1));
    expect(length(subtract(start.cameraAU, middle.cameraAU))).toBeGreaterThan(coordinateBody('earth').radiusAU);
    expect(length(subtract(end.cameraAU, middle.cameraAU))).toBeGreaterThan(coordinateBody('moon').radiusAU);
    const earth = (frame: typeof start) => frame.objects.find(o => o.id === 'earth')!;
    const moon = (frame: typeof start) => frame.objects.find(o => o.id === 'moon')!;
    expect(earth(start).angularRadius).toBeGreaterThan(earth(end).angularRadius * 10);
    expect(moon(end).angularRadius).toBeGreaterThan(moon(start).angularRadius * 10);
    expect(moon(end).formed).toBe(1);
    expect(projectDirection(moon(end).direction).visible).toBe(true);
    expect(routeFrame(snapshot('moon', .5))).toEqual(middle);
  });
  it('passes each promised waypoint, retaining position and facing continuity at leg joins', () => {
    const count = routeItinerary('earth', 'saturn').length - 1;
    for (let leg = 1; leg < count; leg++) {
      const p = leg / count, left = routeFrame(snapshot('saturn', p - 1e-7)), center = routeFrame(snapshot('saturn', p)), right = routeFrame(snapshot('saturn', p + 1e-7));
      const stop = center.itinerary[leg], body = coordinateBody(stop);
      expect(length(subtract(center.cameraAU, body.position))).toBeCloseTo(body.radiusAU * 4.2, 7);
      expect(length(subtract(left.cameraAU, right.cameraAU))).toBeLessThan(body.radiusAU / 100);
      expect(dot(left.forward, right.forward)).toBeGreaterThan(.999);
    }
  });
  it('keeps camera roll continuous at polar crossings and every guided leg join', () => {
    for (const destination of DESTINATIONS) {
      for (let i = 1; i < 100; i++) {
        const p = i / 100, center = routeFrame(snapshot(destination.id, p));
        if (Math.abs(center.forward[2]) < .96) continue;
        const left = routeFrame(snapshot(destination.id, p - 1e-7)), right = routeFrame(snapshot(destination.id, p + 1e-7));
        expect(dot(left.right, right.right), `${destination.id}, ${p}`).toBeGreaterThan(.999);
      }
      const count = routeItinerary('earth', destination.id).length - 1;
      for (let leg = 1; leg < count; leg++) {
        const left = routeFrame(snapshot(destination.id, leg / count - 1e-7)), right = routeFrame(snapshot(destination.id, leg / count + 1e-7));
        expect(dot(left.right, right.right)).toBeGreaterThan(.999);
      }
    }
  });
  it('keeps physical solar bodies outside the camera along both directions of every solar route', () => {
    const solar = DESTINATIONS.filter(d => ['earth', 'solar'].includes(d.group) && !['oort', 'kuiper', 'asteroids', 'comet'].includes(d.id));
    const physical = coordinateBodies().filter(body => ['planet', 'star'].includes(body.kind) && body.evidence === 'ephemeris');
    for (const a of solar) for (const b of solar) for (let i = 0; i <= 30; i++) {
      const frame = routeFrame(snapshot(b.id, i / 30, a.id));
      expect(frame.cameraAU.every(Number.isFinite)).toBe(true);
      for (const body of physical) expect(length(subtract(frame.cameraAU, body.position)), `${a.id} to ${b.id}, ${i}, ${body.id}`).toBeGreaterThan(body.radiusAU);
    }
  });
  it('evolves one world continuously across cosmic time with honest reconstruction limits', () => {
    const early = routeFrame(snapshot('earth', 1, 'earth', 'plasma'));
    const midway = routeFrame(snapshot('earth', .5, 'earth', 'plasma'));
    const now = routeFrame(snapshot('earth', 0, 'earth', 'plasma'));
    expect(early.ageGyr).toBeLessThan(midway.ageGyr);
    expect(midway.ageGyr).toBeLessThan(now.ageGyr);
    expect(early.temperatureK).toBeGreaterThan(midway.temperatureK);
    expect(early.objects.find(o => o.id === 'earth')!.formed).toBe(0);
    expect(now.objects.find(o => o.id === 'earth')!.formed).toBe(1);
    expect(early.beta).toBe(0);
    expect(routeFrame(snapshot('earth', 1, 'earth', 'far')).expansion).toBeGreaterThan(now.expansion);
    const a = routeFrame(snapshot('earth', .321, 'earth', 'plasma')), b = routeFrame(snapshot('earth', .322, 'earth', 'plasma'));
    expect(Math.abs(a.ageGyr - b.ageGyr)).toBeLessThan(.1);
  });
  it('keeps Local Group anchors bound and follows the reconstructed distant comoving observer', () => {
    const now = routeFrame(snapshot('earth', 0, 'earth', 'far')), future = routeFrame(snapshot('earth', 1, 'earth', 'far'));
    for (const id of ['moon', 'andromeda', 'magellanic', 'local-group']) expect(future.objects.find(o => o.id === id)!.distanceAU).toBe(now.objects.find(o => o.id === id)!.distanceAU);
    const distantNow = routeFrame(snapshot('quasar', 0, 'quasar', 'far')), distantFuture = routeFrame(snapshot('quasar', 1, 'quasar', 'far'));
    expect(distantFuture.objects.find(o => o.id === 'quasar')!.angularRadius).toBeCloseTo(distantNow.objects.find(o => o.id === 'quasar')!.angularRadius, 4);
  });
  it('stays finite for every destination and compact-body observation across all scales', () => {
    for (const d of DESTINATIONS) for (const progress of [0, .1, .33, .5, .66, .9, 1]) {
      const frame = routeFrame(snapshot(d.id, progress));
      expect([...frame.cameraAU, ...frame.forward, ...frame.right, ...frame.up, frame.beta].every(Number.isFinite)).toBe(true);
      for (const body of frame.objects) expect([...body.direction,body.distanceAU,body.angularRadius,body.factor].every(Number.isFinite)).toBe(true);
    }
    expect(routeFrame({...snapshot('moon', .5), beta: NaN}).beta).toBe(0);
  });
  it('provides stable reduced-motion stops without moving the view between them', () => {
    const a = { ...snapshot('saturn', .38), reducedMotion: true }, b = { ...a, progress: .39 };
    expect(routeFrame(a).cameraAU).toEqual(routeFrame(b).cameraAU);
    expect(routeFrame(a).beta).toBe(0);
  });
  it('projects bounded full-opacity SVG bodies without endpoint fade layers or false companions', () => {
    const html = universeMarkup(snapshot('moon', .4));
    expect(html).not.toMatch(/NaN|Infinity|data-layer=/);
    expect(html.match(/data-route-body=/g)).toHaveLength(DESTINATIONS.length);
    expect(html).toMatch(/data-route-body="earth"[^>]*opacity="1.00"/);
    expect(html).toMatch(/data-route-body="moon"[^>]*opacity="1.00"/);
    expect(html).not.toContain('cx="798" cy="171"');
    expect(universeMarkup(snapshot('moon', .4))).toBe(html);
    expect(universeMarkup(snapshot('moon', .8))).not.toBe(html);
  });
});
