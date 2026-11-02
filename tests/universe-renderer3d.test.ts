import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { routeFrame, COSMIC_KNOTS, cosmicKnot } from '../src/universe/route';
import { createUniverse3dRenderer } from '../src/universe/renderer3d';
import { universeMarkup } from '../src/universe/renderer';
import type { UniverseSnapshot } from '../src/universe/view';

const view = (patch: Partial<UniverseSnapshot> = {}): UniverseSnapshot => ({ destinationId: 'saturn', kind: 'ring', color: '#dcba89', epoch: 'present', beta: .85, travelling: true, progress: 0, paused: false, reducedMotion: false, origin: { destinationId: 'earth', kind: 'earth', color: '#abcdef', epoch: 'present' }, ...patch });
class CanvasStub {
  style = { cssText: '' }; listeners = new Map<string, EventListener>(); attributes = new Map<string, string>(); width = 1000; height = 620; removed = false;
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  removeAttribute(key: string) { this.attributes.delete(key); }
  addEventListener(key: string, fn: EventListener) { this.listeners.set(key, fn); }
  removeEventListener(key: string) { this.listeners.delete(key); }
  remove() { this.removed = true; }
  getContext() {
    return new Proxy({}, { get: (_target, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  }
}
function harness() {
  const canvas = new CanvasStub();
  vi.stubGlobal('document', { hidden: false, createElement: () => canvas, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('Path2D', class { constructor(_path: string) {} });
  const engine = new NullEngine({ renderWidth: 1000, renderHeight: 620, textureSize: 1024, deterministicLockstep: true, lockstepMaxSteps: 4 });
  let display = () => {};
  vi.spyOn(engine, 'runRenderLoop').mockImplementation(fn => { display = fn; });
  const unavailable = vi.fn(), renderer = createUniverse3dRenderer({ onUnavailable: unavailable, createEngine: () => engine });
  renderer.mount({ append() {} } as unknown as HTMLElement);
  return { engine, renderer, canvas, unavailable, display: () => display() };
}
afterEach(() => vi.unstubAllGlobals());

describe('coordinate Babylon flight lifecycle (NullEngine)', () => {
  it('moves measured camera coordinates and parallax, never crossfades endpoint dioramas, and caches full-opacity bodies', () => {
    const h = harness(); h.renderer.render(view({ beta: 0 }));
    expect(h.unavailable).not.toHaveBeenCalled();
    const scene = h.engine.scenes[0], earth = scene.getTransformNodeByName('coordinate-body-earth')!;
    const sphere = scene.getMeshByName('coordinate-sphere-earth')!;
    const start = [...scene.metadata.cameraAU], initialDirection = [...earth.metadata.direction];
    expect(sphere).not.toBeNull(); expect(scene.activeCamera).toBeInstanceOf(FreeCamera);
    expect(scene.activeCamera!.position.asArray()).toEqual([0, 0, 0]);
    expect(scene.activeCamera!.fov).toBeCloseTo(2 * Math.atan(310 / 850));
    expect(scene.getMeshByName('blue-marble')).toBeNull(); expect(scene.getMeshByName('ring-planet')).toBeNull();
    const cachedRoots = scene.transformNodes.filter(node => node.name.startsWith('coordinate-body-'));
    for (const progress of [.03, .15, .3, .5, .7, .85, 1]) {
      const state = view({ progress, beta: 0 }); h.renderer.render(state);
      expect(scene.getTransformNodeByName('coordinate-body-earth')).toBe(earth);
      expect(scene.getMeshByName('coordinate-sphere-earth')).toBe(sphere);
      expect(scene.metadata.cameraAU).toEqual(routeFrame(state).cameraAU);
      expect(scene.metadata.routeItinerary).toEqual(routeFrame(state).itinerary);
      expect(h.canvas.attributes.get('data-camera-au')).toBe(routeFrame(state).cameraAU.join(','));
      expect(h.canvas.attributes.get('data-age-gyr')).toBe(String(routeFrame(state).ageGyr));
      expect(h.canvas.attributes.get('data-route-leg')).toBe(String(routeFrame(state).leg));
      for (const root of cachedRoots) {
        expect(scene.getTransformNodeByName(root.name)).toBe(root);
        for (const mesh of root.getChildMeshes()) expect(mesh.visibility).toBe(1);
      }
      expect(scene.getTransformNodeByName('coordinate-flight')!.metadata.cacheSize).toBeLessThanOrEqual(28);
    }
    expect(scene.metadata.cameraAU).not.toEqual(start); expect(earth.metadata.direction).not.toEqual(initialDirection);
    expect(earth.position.asArray()).toEqual(earth.metadata.direction.map((v: number) => v * earth.metadata.shell));
    expect(scene.getMeshByName('coordinate-sphere-saturn')).not.toBeNull();
    expect(h.unavailable).not.toHaveBeenCalled(); h.renderer.dispose();
  });

  it('uses physical angular size at Earth and Moon observations, not enlarged false nearby planets', () => {
    const h = harness();
    for (const progress of [0, .03, .5, .97, 1]) {
      const state = view({ destinationId: 'moon', kind: 'moon', progress, beta: 0 }); h.renderer.render(state);
      expect(h.unavailable).not.toHaveBeenCalled(); const scene = h.engine.scenes[0];
      for (const id of ['earth', 'moon']) {
        const body = scene.getTransformNodeByName(`coordinate-body-${id}`)!;
        const object = routeFrame(state).objects.find(object => object.id === id)!;
        expect(body.metadata.angularRadius).toBeCloseTo(object.angularRadius, 12);
        const physical = scene.getTransformNodeByName(`physical-${id}`);
        if (physical?.isEnabled()) expect(physical.scaling.x / body.position.length()).toBeCloseTo(Math.sin(object.angularRadius), 12);
      }
      const distant = scene.getMeshByName('coordinate-glyph-proxima')!;
      expect(distant.isEnabled()).toBe(true); expect(distant.metadata.glyph).toContain('not the physical body');
      expect(scene.getMeshByName('alpha-a')).toBeNull(); expect(scene.getMeshByName('alpha-b')).toBeNull();
    }
    h.renderer.dispose();
  });

  it('keeps all geometry finite and bounded across solar, stellar and cosmological scales', () => {
    const h = harness();
    for (const destinationId of ['sun', 'proxima', 'nebula', 'andromeda', 'quasar', 'beyond']) {
      for (const progress of [0, .15, .5, .85, 1]) {
        h.renderer.render(view({ destinationId, progress, epoch: destinationId === 'beyond' ? 'far' : 'present' }));
        expect(h.unavailable).not.toHaveBeenCalled(); const scene = h.engine.scenes[0];
        expect(scene.getTransformNodeByName('coordinate-flight')!.metadata.cacheSize).toBeLessThanOrEqual(28);
        expect(scene.meshes.length).toBeLessThan(220);
        for (const node of scene.transformNodes.filter(node => node.name.startsWith('coordinate-body-'))) {
          expect(node.position.asArray().every(Number.isFinite)).toBe(true); expect(node.position.length()).toBeLessThanOrEqual(74.000001);
          expect(node.metadata.distanceAU).toBeGreaterThan(0); expect(Number.isFinite(node.metadata.angularRadius)).toBe(true);
          expect(node.scaling.asArray()).toEqual([1, 1, 1]);
        }
        for (const mesh of scene.meshes) expect(Array.from(mesh.getVerticesData(VertexBuffer.PositionKind) ?? []).every(Number.isFinite)).toBe(true);
      }
    }
    const scene = h.engine.scenes[0], count = scene.meshes.length;
    for (let i = 0; i < 20; i++) h.renderer.render(view({ destinationId: 'beyond', epoch: 'far', progress: 1, paused: true }));
    expect(scene.meshes.length).toBe(count); h.renderer.dispose();
  });

  it('moves coherent fixed knots with cosmic expansion while bound-system distances and camera stay fixed', () => {
    const h = harness(), state = view({ destinationId: 'earth', kind: 'earth', epoch: 'bang', progress: .5, beta: 0 });
    h.renderer.render(state); expect(h.unavailable).not.toHaveBeenCalled(); const scene = h.engine.scenes[0];
    const knots = scene.getMeshByName('fixed-comoving-illustrative-knots')!, environment = scene.getMeshByName('whole-sky-no-explosion-center')!;
    const before = Array.from(knots.getVerticesData(VertexBuffer.PositionKind)!);
    const camera = [...scene.metadata.cameraAU], distance = scene.getTransformNodeByName('coordinate-body-moon')!.metadata.distanceAU;
    const color = scene.clearColor.asArray();
    const next = { ...state, progress: .8 }; h.renderer.render(next);
    expect(scene.metadata.cameraAU).toEqual(camera); expect(scene.getTransformNodeByName('coordinate-body-moon')!.metadata.distanceAU).toBe(distance);
    expect(scene.getMeshByName('whole-sky-no-explosion-center')).toBe(environment); expect(environment.visibility).toBe(1);
    expect(scene.clearColor.asArray()).not.toEqual(color); expect(Array.from(knots.getVerticesData(VertexBuffer.PositionKind)!)).not.toEqual(before);
    const frame = routeFrame(next), point = cosmicKnot(COSMIC_KNOTS[0], frame), positions = knots.getVerticesData(VertexBuffer.PositionKind)!;
    const center = [0, 1, 2].map(axis => (positions[axis] + positions[axis + 3] + positions[axis + 6] + positions[axis + 9]) / 4);
    expect(Math.hypot(...center)).toBeCloseTo(Math.hypot(...point) * 2, 5);
    h.renderer.render({ ...state, progress: 1 });
    expect(scene.getTransformNodeByName('coordinate-body-earth')!.isEnabled()).toBe(false);
    expect(environment.position.asArray()).toEqual([0, 0, 0]); h.renderer.dispose();
  });

  it('continuously ages Earth and the Sun with explicit toy-model color, growth and far-future fading', () => {
    const h = harness(), state = view({ destinationId: 'earth', kind: 'earth', epoch: 'future', progress: 0, beta: 0 });
    h.renderer.render(state); expect(h.unavailable).not.toHaveBeenCalled(); const scene = h.engine.scenes[0];
    const sun = scene.getMeshByName('coordinate-sphere-sun')!, earth = scene.getMeshByName('coordinate-sphere-earth')!;
    const sunShape = scene.getTransformNodeByName('physical-sun')!;
    const sunMaterial = sun.material as StandardMaterial, earthMaterial = earth.material as StandardMaterial;
    const startRadius = sunShape.scaling.x, startEarth = earthMaterial.diffuseColor.r, startSun = sunMaterial.emissiveColor.clone();
    h.renderer.render({ ...state, progress: .5 });
    const middleRadius = sunShape.scaling.x, middleEarth = earthMaterial.diffuseColor.r, middleSun = sunMaterial.emissiveColor.clone();
    h.renderer.render({ ...state, progress: 1 });
    expect(middleRadius).toBeGreaterThan(startRadius); expect(sunShape.scaling.x).toBeGreaterThan(middleRadius);
    expect(middleEarth).toBeLessThan(startEarth); expect(earthMaterial.diffuseColor.r).toBeLessThan(middleEarth);
    expect(middleSun.b / middleSun.r).toBeLessThan(startSun.b / startSun.r);
    expect(sunMaterial.emissiveColor.b / sunMaterial.emissiveColor.r).toBeLessThan(middleSun.b / middleSun.r);
    expect(sunShape.metadata.radiusModel).toContain('not a predicted radius'); expect(scene.metadata.evolution).toContain('toy');
    const nearFuture = sunMaterial.emissiveColor.r;
    h.renderer.render({ ...state, epoch: 'far', progress: 1 });
    expect(sunMaterial.emissiveColor.r).toBeLessThan(nearFuture); expect(sun.visibility).toBe(1); expect(earth.visibility).toBe(1);
    expect(scene.getMeshByName('coordinate-sphere-earth')).toBe(earth); expect(scene.getMeshByName('coordinate-sphere-sun')).toBe(sun);
    expect(h.unavailable).not.toHaveBeenCalled(); h.renderer.dispose();
  });

  it('preserves paused pixels and exact recreated vertices, and does not draw while hidden', () => {
    const h = harness(), state = view({ progress: .71, paused: true }); h.renderer.render(state);
    expect(h.unavailable).not.toHaveBeenCalled(); const scene = h.engine.scenes[0];
    const knots = scene.getMeshByName('fixed-comoving-illustrative-knots')!, before = Array.from(knots.getVerticesData(VertexBuffer.PositionKind)!);
    const body = scene.getTransformNodeByName('coordinate-body-saturn')!, position = body.position.asArray();
    h.display(); h.display();
    expect(Array.from(knots.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(before); expect(body.position.asArray()).toEqual(position);
    const draw = vi.spyOn(scene, 'render'); Object.defineProperty(document, 'hidden', { configurable: true, value: true }); h.display(); expect(draw).not.toHaveBeenCalled();
    h.renderer.dispose();
    const next = harness(); next.renderer.render(state);
    expect(Array.from(next.engine.scenes[0].getMeshByName('fixed-comoving-illustrative-knots')!.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(before);
    expect(next.engine.scenes[0].getTransformNodeByName('coordinate-body-saturn')!.position.asArray()).toEqual(position);
    expect(next.unavailable).not.toHaveBeenCalled(); next.renderer.dispose();
  });

  it('reduced motion uses discrete stationary route observations without beaming or endpoint fades', () => {
    const h = harness(); h.renderer.render(view({ progress: .05, reducedMotion: true }));
    expect(h.unavailable).not.toHaveBeenCalled(); const scene = h.engine.scenes[0];
    const start = [...scene.metadata.cameraAU], earth = scene.getTransformNodeByName('coordinate-body-earth')!, position = earth.position.asArray();
    h.renderer.render(view({ progress: .15, reducedMotion: true }));
    expect(scene.metadata.cameraAU).toEqual(start); expect(earth.position.asArray()).toEqual(position);
    for (const root of scene.transformNodes.filter(root => root.name.startsWith('coordinate-body-'))) {
      expect(root.metadata.factor).toBe(1); for (const mesh of root.getChildMeshes()) expect(mesh.visibility).toBe(1);
    }
    h.renderer.render(view({ progress: .8, reducedMotion: true })); expect(scene.metadata.cameraAU).not.toEqual(start);
    expect(scene.getMeshByName('blue-marble')).toBeNull(); h.renderer.dispose();
  });

  it('retains travel head-look/zoom/reset and restores observatory orbit at arrival and legacy scenes', () => {
    const h = harness(); h.renderer.render(view({ progress: .4 })); const scene = h.engine.scenes[0], camera = scene.activeCamera as FreeCamera;
    const fov = camera.fov; h.renderer.zoom(1); expect(camera.fov).toBeLessThan(fov);
    const down = h.canvas.listeners.get('pointerdown')!, move = h.canvas.listeners.get('pointermove')!;
    down({ button: 0, pointerId: 1, clientX: 10, clientY: 10 } as unknown as Event);
    move({ pointerId: 1, clientX: 50, clientY: 30 } as unknown as Event);
    expect(camera.rotation.y).not.toBe(0); expect(camera.position.asArray()).toEqual([0, 0, 0]);
    h.renderer.reset(); expect(camera.rotation.asArray()).toEqual([0, 0, 0]); expect(camera.fov).toBeCloseTo(fov);
    h.renderer.render(view({ progress: 1, travelling: false }));
    expect(scene.activeCamera).toBeInstanceOf(ArcRotateCamera); expect(scene.getMeshByName('ring-planet')!.visibility).toBe(1);
    expect(scene.getTransformNodeByName('coordinate-flight')!.isEnabled()).toBe(false);
    for (const attribute of ['data-camera-au', 'data-age-gyr', 'data-route-leg']) expect(h.canvas.attributes.has(attribute)).toBe(false);
    h.renderer.zoom(1); expect((scene.activeCamera as ArcRotateCamera).radius).toBeLessThan(13.8); h.renderer.reset(); expect((scene.activeCamera as ArcRotateCamera).radius).toBe(13.8);
    h.renderer.render(view({ origin: undefined, travelling: true, progress: .5 })); expect(scene.activeCamera).toBeInstanceOf(ArcRotateCamera);
    expect(h.unavailable).not.toHaveBeenCalled(); h.renderer.dispose(); expect(h.canvas.removed).toBe(true); expect(h.canvas.listeners.size).toBe(0);
  });

  it('context loss disposes GPU state and calls deterministic fallback exactly once', () => {
    const h = harness(), state = view({ progress: .71, paused: true }); h.renderer.render(state);
    expect(h.unavailable).not.toHaveBeenCalled();
    const loss = h.canvas.listeners.get('webglcontextlost')!, event = { preventDefault: vi.fn() };
    loss(event as unknown as Event); loss(event as unknown as Event); h.renderer.render(state);
    expect(event.preventDefault).toHaveBeenCalled(); expect(h.unavailable).toHaveBeenCalledTimes(1); expect(h.canvas.removed).toBe(true); expect(h.engine.scenes.length).toBe(0);
    expect(universeMarkup(state)).toBe(universeMarkup(JSON.parse(JSON.stringify(state))));
  });
});
