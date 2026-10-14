import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { ArcRotateCamera, Scene, Vector3 } from '../src/babylon';
import { clearanceCutaway, clearanceCutaways, clearanceSvgMarkup } from '../src/escalator/renderer';
import { anchored3dLabel, MALL_CAMERA, mallCameraRadius, stable3dTargets, type PositionedLabel, type ProjectedLabel } from '../src/escalator/renderer3d';
import { CITY_CAMERA, cityCameraRadius, cityFramingPoints, cityTrainPose } from '../src/rush/renderer3d';
import { COASTAL_LAYOUT } from '../src/rush/city';
import { createGame } from '../src/rush/model';
import { createCitySnapshot } from '../src/rush/view';
import { fitCameraZoom, zoomCamera } from '../src/camera-controls';
import { landingName } from '../src/escalator/locale';
import { PUZZLES } from '../src/escalator/puzzles';
import { touchesZone } from '../src/escalator/model';

const headless = (width: number, height: number) => new NullEngine({ renderWidth: width, renderHeight: height,
  textureSize: 256, deterministicLockstep: false, lockstepMaxSteps: 4 });
const stations = createCitySnapshot(createGame(), { language: 'en', layout: COASTAL_LAYOUT,
  selected: 'market', interpolationSeconds: 0, animate: true }).stations.map(station => station.position);
const sizes = [[280, 440], [320, 440], [364, 440], [390, 440], [720, 486], [1280, 680],
  [320, 420], [390, 624], [720, 320], [1024, 548], [1112, 300], [1440, 680]];
const trainCorners = stations.flatMap(position => [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI].flatMap(heading => {
  const pose = cityTrainPose({ position, heading }), points: Vector3[] = [];
  for (const x of [-1.16, 1.16]) for (const z of [-.21, .21]) for (const y of [-.24, .23]) points.push(new Vector3(
    pose.x + x * Math.cos(pose.yaw) + z * Math.sin(pose.yaw), pose.y + y,
    pose.z - x * Math.sin(pose.yaw) + z * Math.cos(pose.yaw)));
  return points;
}));

function oldCityRadius(width: number, height: number): number {
  const padding = Math.min(40, width * .2, height * .2), tangent = Math.tan(CITY_CAMERA.fov / 2);
  const tx = tangent * (width - 2 * padding) / height, ty = tangent * (height - 2 * padding) / height;
  const { alpha, beta } = CITY_CAMERA;
  const radial = new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
  const right = new Vector3(-Math.sin(alpha), 0, Math.cos(alpha));
  const up = new Vector3(-Math.cos(alpha) * Math.cos(beta), Math.sin(beta), -Math.sin(alpha) * Math.cos(beta));
  let radius = 24;
  for (const x of [-14.6, 14.6]) for (const y of [-.25, 3.5]) for (const z of [-10.1, 10.1]) {
    const point = new Vector3(x, y - CITY_CAMERA.targetY, z);
    radius = Math.max(radius, Vector3.Dot(point, radial) + Math.max(Math.abs(Vector3.Dot(point, right)) / tx,
      Math.abs(Vector3.Dot(point, up)) / ty));
  }
  return radius + 1;
}

describe('renderer-only clearance interpretation', () => {
  const landings = PUZZLES[0].landings, zone = { x: 2.6, y: 1.15, w: .8, h: .65 };
  it('roots the parade cutaway and headroom in D2, never D3', () => {
    const cutaway = clearanceCutaway(zone, landings);
    expect(cutaway.anchors.map(landingName)).toEqual(['D2']);
    expect(cutaway.floor).toBe(1);
    expect((cutaway.roof - cutaway.floor) * 3.15).toBeGreaterThan(1.2);
    expect((cutaway.roof - cutaway.floor) * 3.15).toBeLessThan(2.2);
    const markup = clearanceSvgMarkup(zone, landings, 'Low roof · balloon route blocked');
    expect(markup).toContain('data-clearance-landings="D2"');
    expect(markup).toContain('D2 ↑'); expect(markup).not.toContain('D3');
    expect(markup).toContain('M469 426');
    expect(markup).toContain('M0 4l-3 8M-11-11l22 22');
    expect(markup).toContain('Low roof · balloon route blocked');
  });
  it('covers every affected floor of broader zones while retaining exact coordinates', () => {
    const cutaways = clearanceCutaways({ x: .3, y: .1, w: 2.1, h: 1.6 }, landings);
    expect(cutaways.map(cutaway => cutaway.anchors.map(landingName))).toEqual([['B1', 'C1'], ['B2', 'C2']]);
    for (const cutaway of cutaways) expect(cutaway.roof - cutaway.floor).toBeCloseTo(.62);
    expect(clearanceCutaway({ x: 2.4, y: 1.1, w: .2, h: .6 }, landings).anchors.map(landingName)).toEqual(['C2']);
  });
  it('does not turn a headroom restriction into a blocked landing or horizontal bridge', () => {
    expect(touchesZone({ type: 'short', a: { x: 3, y: 1 }, b: { x: 4, y: 2 } }, zone)).toBe(true);
    expect(touchesZone({ type: 'bridge', a: { x: 3, y: 1 }, b: { x: 4, y: 1 } }, zone)).toBe(false);
  });
});

describe('stable projected tags and native targets', () => {
  const sign = (x: number, y: number): ProjectedLabel => ({ id: 'books', x, y, width: 132, height: 32, priority: 2 });
  it('keeps Bookshop/Café tags at continuous anchor-relative offsets even at viewport edges', () => {
    for (let frame = 0; frame < 200; frame++) {
      const a = anchored3dLabel(sign(180 + frame * .25, 100), 390, 440);
      const b = anchored3dLabel(sign(180 + (frame + 1) * .25, 100), 390, 440);
      expect(Math.abs(a.left - b.left)).toBeLessThanOrEqual(.25);
      expect(a.top).toBe(b.top);
      expect(a.left).toBeGreaterThanOrEqual(4); expect(a.left + a.width).toBeLessThanOrEqual(386);
    }
    expect(anchored3dLabel(sign(-10, 500), 390, 440)).toMatchObject({ left: 4, top: 404 });
  });
  it('preserves an established touch-target lane under small camera motion and bounds collision correction', () => {
    const input = [0, 1, 2, 3].map(index => ({ id: `landing:${index}`, x: 180, y: 170,
      width: 44, height: 44, priority: 0 }));
    let state = new Map<string, PositionedLabel>();
    const initial = stable3dTargets(input, 390, 440, state);
    state = new Map(initial.labels.map(label => [label.id, label]));
    const moved = stable3dTargets(input.map(label => ({ ...label, x: label.x + .2, y: label.y + .1 })), 390, 440, state);
    moved.labels.forEach(label => {
      const old = state.get(label.id)!;
      expect(label.left - old.left).toBeCloseTo(.2); expect(label.top - old.top).toBeCloseTo(.1);
      expect(label.width).toBe(44); expect(label.height).toBe(44);
    });
    const colliding = new Map(input.map(label => [label.id, { ...label, left: 158, top: 148 }]));
    const corrected = stable3dTargets(input, 390, 440, colliding);
    expect(corrected.settling).toBe(true);
    corrected.labels.forEach(label => {
      expect(Math.abs(label.left - 158)).toBeLessThanOrEqual(3);
      expect(Math.abs(label.top - 148)).toBeLessThanOrEqual(3);
    });
  });
});

describe('orientation- and viewport-aware scene fitting', () => {
  it('widens mall orbit to more than 130 degrees and retains a safe front cutaway', () => {
    expect((MALL_CAMERA.maxAlpha - MALL_CAMERA.minAlpha) * 180 / Math.PI).toBeGreaterThan(130);
    expect(MALL_CAMERA.minAlpha).toBeGreaterThan(-Math.PI); expect(MALL_CAMERA.maxAlpha).toBeLessThan(0);
    expect(MALL_CAMERA.minBeta).toBeLessThan(.8); expect(MALL_CAMERA.maxBeta).toBeGreaterThan(1.4);
  });
  it.each(sizes)('fits all mall architecture at default and wide endpoint orbits in %i×%i', (width, height) => {
    const engine = headless(width, height), scene = new Scene(engine);
    try {
      for (const [alpha, beta] of [[MALL_CAMERA.alpha, MALL_CAMERA.beta], [MALL_CAMERA.minAlpha, MALL_CAMERA.minBeta],
        [MALL_CAMERA.minAlpha, MALL_CAMERA.maxBeta], [MALL_CAMERA.maxAlpha, MALL_CAMERA.minBeta], [MALL_CAMERA.maxAlpha, MALL_CAMERA.maxBeta]]) {
        const camera = new ArcRotateCamera('mall-fit', alpha, beta, mallCameraRadius(width, height, alpha, beta) + 2.5,
          new Vector3(0, 5.9, 1.15), scene);
        camera.fov = MALL_CAMERA.fov; camera.maxZ = camera.radius * 2 + 35; scene.activeCamera = camera; scene.render();
        const viewport = camera.viewport.toGlobal(width, height);
        for (const x of [-10, 10]) for (const y of [-.5, 13]) for (const z of [-2.1, 4.8]) {
          const p = Vector3.Project(new Vector3(x, y, z), Matrix.Identity(), scene.getTransformMatrix(), viewport);
          expect(p.x).toBeGreaterThan(20); expect(p.x).toBeLessThan(width - 20);
          expect(p.y).toBeGreaterThan(20); expect(p.y).toBeLessThan(height - 20);
        }
        camera.dispose();
      }
    } finally { scene.dispose(); engine.dispose(); }
  });
  it.each(sizes)('fits Rush real coast, buildings and all station envelopes in %i×%i', (width, height) => {
    const engine = headless(width, height), scene = new Scene(engine);
    try {
      for (const [alpha, beta] of [[CITY_CAMERA.alpha, CITY_CAMERA.beta], [-1.91, .65], [-1.91, 1.02], [-1.1, .65], [-1.1, 1.02]]) {
        const camera = new ArcRotateCamera('city-fit', alpha, beta, cityCameraRadius(width, height, alpha, beta, stations),
          new Vector3(0, CITY_CAMERA.targetY, 0), scene);
        camera.fov = CITY_CAMERA.fov; camera.maxZ = camera.radius * 2 + 40; scene.activeCamera = camera; scene.render();
        const viewport = camera.viewport.toGlobal(width, height);
        for (const point of [...cityFramingPoints(stations), ...trainCorners]) {
          const p = Vector3.Project(new Vector3(point.x, point.y, point.z), Matrix.Identity(), scene.getTransformMatrix(), viewport);
          expect(p.x).toBeGreaterThan(25); expect(p.x).toBeLessThan(width - 25);
          expect(p.y).toBeGreaterThan(25); expect(p.y).toBeLessThan(height - 25);
        }
        camera.dispose();
      }
    } finally { scene.dispose(); engine.dispose(); }
  });
  it.each([[390, 624], [1024, 548], [1440, 680]])('makes the default Rush city at least ten percent larger at %i×%i', (width, height) => {
    const current = cityCameraRadius(width, height, CITY_CAMERA.alpha, CITY_CAMERA.beta, stations);
    expect(oldCityRadius(width, height) / current).toBeGreaterThan(1.1);
  });
  it('preserves relative zoom through arbitrary host resizing and orientation changes, then restores the default', () => {
    const engine = headless(1024, 548), scene = new Scene(engine);
    try {
      const camera = new ArcRotateCamera('zoom', MALL_CAMERA.alpha, MALL_CAMERA.beta, 25.5, new Vector3(0, 5.9, 1.15), scene);
      let reference = mallCameraRadius(1024, 548) + 2.5;
      fitCameraZoom(camera, reference); zoomCamera(camera, 'in');
      for (const [width, height, alpha, beta] of [[390, 624, -2.75, .72], [720, 320, -.35, 1.42], [1112, 300, -1.33, 1.16]]) {
        const next = mallCameraRadius(width, height, alpha, beta) + 2.5;
        fitCameraZoom(camera, next, reference); reference = next;
        expect(camera.radius / reference).toBeCloseTo(1 / 1.2);
      }
      fitCameraZoom(camera, mallCameraRadius(1112, 300) + 2.5);
      expect(camera.radius).toBeCloseTo(mallCameraRadius(1112, 300) + 2.5);
    } finally { scene.dispose(); engine.dispose(); }
  });
});
