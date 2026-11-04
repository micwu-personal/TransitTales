import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { routeFrame, COSMIC_KNOTS, cosmicKnot } from '../src/universe/route';
import * as routes from '../src/universe/route';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createUniverse3dRenderer } from '../src/universe/renderer3d';
import { universeMarkup } from '../src/universe/renderer';
import type { UniverseSnapshot } from '../src/universe/view';

type RenderSnapshot = UniverseSnapshot & { effectTime?: number; coordinateView?: boolean; inspection?: { yaw: number; pitch: number; roll: number; offset: readonly [number, number, number] } };
const view = (patch: Partial<RenderSnapshot> = {}): RenderSnapshot => ({ destinationId: 'saturn', kind: 'ring', color: '#dcba89', epoch: 'present', beta: .85, travelling: true, progress: 0, paused: false, reducedMotion: false, origin: { destinationId: 'earth', kind: 'earth', color: '#abcdef', epoch: 'present' }, ...patch });
class CanvasStub {
  style = { cssText: '', visibility: '' }; listeners = new Map<string, EventListener>(); attributes = new Map<string, string>(); width = 1000; height = 620; removed = false;
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  removeAttribute(key: string) { this.attributes.delete(key); }
  addEventListener(key: string, fn: EventListener) { this.listeners.set(key, fn); }
  removeEventListener(key: string) { this.listeners.delete(key); }
  remove() { this.removed = true; }
  getContext() {
    return new Proxy({}, { get: (_target, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  }
}
function harness(options: Partial<Parameters<typeof createUniverse3dRenderer>[0]> = {}, device: { dpr?: number; touch?: boolean } = {}, mount = true) {
  const canvas = new CanvasStub(), windowListeners = new Map<string, EventListener>();
  vi.stubGlobal('document', { hidden: false, createElement: () => canvas, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('window', { devicePixelRatio: device.dpr ?? 1, addEventListener: (key: string, fn: EventListener) => windowListeners.set(key, fn), removeEventListener: (key: string) => windowListeners.delete(key) });
  vi.stubGlobal('navigator', { maxTouchPoints: device.touch ? 5 : 0 });
  vi.stubGlobal('Path2D', class { constructor(_path: string) {} });
  const engine = new NullEngine({ renderWidth: 1000, renderHeight: 620, textureSize: 1024, deterministicLockstep: true, lockstepMaxSteps: 4 });
  const runLoop = vi.spyOn(engine, 'runRenderLoop').mockImplementation(() => {});
  const scaling = vi.spyOn(engine, 'setHardwareScalingLevel');
  const unavailable = vi.fn(), renderer = createUniverse3dRenderer({ onUnavailable: unavailable, createEngine: () => engine, loadShaders: () => {}, ...options });
  if (mount) renderer.mount({ append() {} } as unknown as HTMLElement);
  return { engine, renderer, canvas, unavailable, runLoop, scaling, windowListeners, display: () => renderer.zoom(0) };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('coordinate Babylon flight lifecycle (NullEngine)', () => {
  it('does not add an untinted orange primordial texture to present-era travel', () => {
    const h = harness(); h.renderer.render(view());
    const scene = h.engine.scenes[0], field = scene.getMeshByName('whole-sky-no-explosion-center')!.material as StandardMaterial;
    expect(field.diffuseTexture).not.toBeNull();
    expect(field.emissiveTexture).toBeNull();
    expect(field.emissiveColor.b).toBeGreaterThan(field.emissiveColor.r);
    expect(scene.clearColor.r).toBeLessThan(.02);
    for (const progress of [.1, .5, .9]) {
      h.renderer.render(view({ progress }));
      expect(field.emissiveTexture).toBeNull();
      expect(field.emissiveColor.b).toBeGreaterThan(field.emissiveColor.r);
    }
    h.renderer.render(view({ epoch: 'bang', progress: 1 }));
    expect(field.emissiveColor.r).toBeGreaterThan(field.emissiveColor.b);
    expect(scene.clearColor.r).toBeGreaterThan(.7);
    h.renderer.dispose();
  });

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
    for (const progress of [.03, .15, .3, .5, .7, .85, 1]) {
      const state = view({ progress, beta: 0 }); h.renderer.render(state);
      expect(scene.getTransformNodeByName('coordinate-body-earth') === earth).toBe(true);
      expect(scene.getMeshByName('coordinate-sphere-earth') === sphere).toBe(true);
      expect(scene.metadata.cameraAU).toEqual(routeFrame(state).cameraAU);
      expect(scene.metadata.routeItinerary).toEqual(routeFrame(state).itinerary);
      expect(h.canvas.attributes.get('data-camera-au')).toBe(routeFrame(state).cameraAU.join(','));
      expect(h.canvas.attributes.get('data-age-gyr')).toBe(String(routeFrame(state).ageGyr));
      expect(h.canvas.attributes.get('data-route-leg')).toBe(String(routeFrame(state).leg));
      for (const root of scene.transformNodes.filter(node => node.name.startsWith('coordinate-body-'))) {
        const glyph = root.getChildMeshes().find(mesh => mesh.name.startsWith('coordinate-glyph-'))!;
        for (const mesh of root.getChildMeshes().filter(mesh => mesh !== glyph)) expect(mesh.visibility + glyph.visibility).toBeCloseTo(1);
        expect(glyph.visibility).toBeGreaterThanOrEqual(0); expect(glyph.visibility).toBeLessThanOrEqual(1);
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
      expect(root.metadata.factor).toBeCloseTo(routeFrame(view({ progress: .15, reducedMotion: true })).objects.find(object => object.id === root.metadata.id)!.factor, 12);
      const glyph = root.getChildMeshes().find(mesh => mesh.name.startsWith('coordinate-glyph-'))!;
      for (const mesh of root.getChildMeshes().filter(mesh => mesh !== glyph)) expect(mesh.visibility + glyph.visibility).toBeCloseTo(1);
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

describe('efficient active Babylon observatory', () => {
  it('never registers a continuous engine loop and draws once per demand, including controls and resize', () => {
    const h = harness(); expect(h.runLoop).not.toHaveBeenCalled();
    h.renderer.render(view()); const scene = h.engine.scenes[0], draw = vi.spyOn(scene, 'render');
    h.renderer.render(view()); expect(draw).toHaveBeenCalledTimes(1);
    h.renderer.zoom(1); h.renderer.reset(); h.windowListeners.get('resize')!(new Event('resize'));
    h.canvas.listeners.get('pointerdown')!({ button: 0, pointerId: 1, clientX: 10, clientY: 10 } as unknown as Event);
    h.canvas.listeners.get('pointermove')!({ pointerId: 1, clientX: 40, clientY: 20 } as unknown as Event);
    h.canvas.listeners.get('wheel')!({ deltaY: 40, preventDefault() {} } as unknown as Event);
    expect(draw).toHaveBeenCalledTimes(6); expect(h.runLoop).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    h.renderer.render(view({ progress: .8 })); h.renderer.zoom(1); h.renderer.reset();
    expect(draw).toHaveBeenCalledTimes(6); h.renderer.dispose();
  });

  it('reveals only after readiness and a successful frame, without needing a host animation loop', () => {
    const onReady = vi.fn(), h = harness({ onReady });
    expect(h.canvas.style.visibility).toBe('hidden'); expect(onReady).not.toHaveBeenCalled();
    h.renderer.render(view()); const scene = h.engine.scenes[0];
    // NullEngine has no GPU shader compiler; emulate completion, but keep actual scene.render.
    const isReady = vi.spyOn(scene, 'isReady').mockReturnValue(false), draw = vi.spyOn(scene, 'render');
    h.renderer.render(view()); expect(onReady).not.toHaveBeenCalled(); expect(h.canvas.style.visibility).toBe('hidden');
    isReady.mockReturnValue(true); h.display();
    expect(draw).toHaveBeenCalled(); expect(onReady).toHaveBeenCalledTimes(1);
    expect(draw.mock.invocationCallOrder.at(-1)!).toBeLessThan(onReady.mock.invocationCallOrder[0]);
    expect(h.canvas.style.visibility).toBe('visible');
    h.renderer.render(view()); h.renderer.zoom(1);
    expect(onReady).toHaveBeenCalledTimes(1); expect(h.runLoop).not.toHaveBeenCalled(); h.renderer.dispose();
  });

  it('does not signal readiness for unready shaders or a failed render', () => {
    const onReady = vi.fn(), next = harness({ onReady }); next.renderer.render(view()); const nextScene = next.engine.scenes[0];
    vi.spyOn(nextScene, 'isReady').mockReturnValue(false);
    vi.spyOn(nextScene, 'executeWhenReady').mockImplementation(() => {});
    next.renderer.render(view()); next.renderer.zoom(1);
    expect(onReady).not.toHaveBeenCalled(); expect(next.canvas.style.visibility).toBe('hidden');
    vi.spyOn(nextScene, 'isReady').mockReturnValue(true);
    vi.spyOn(nextScene, 'render').mockImplementation(() => { throw new Error('GPU draw failed'); });
    next.renderer.render(view());
    expect(onReady).not.toHaveBeenCalled(); expect(next.unavailable).toHaveBeenCalledTimes(1); expect(next.canvas.removed).toBe(true);
  });

  it('delivers readiness from a single shader-completion callback and rejects compilation errors', () => {
    const readiness = vi.spyOn(Scene.prototype, 'isReady').mockReturnValue(false);
    let complete = () => {};
    const waiting = vi.spyOn(Scene.prototype, 'executeWhenReady').mockImplementation(fn => { complete = fn; });
    const onReady = vi.fn(), next = harness({ onReady }); next.renderer.render(view());
    const draw = vi.spyOn(next.engine.scenes[0], 'render');
    next.renderer.render(view()); expect(onReady).not.toHaveBeenCalled(); expect(waiting).toHaveBeenCalledTimes(1);
    readiness.mockReturnValue(true); complete(); expect(onReady).toHaveBeenCalledTimes(1);
    expect(draw.mock.invocationCallOrder.at(-1)!).toBeLessThan(onReady.mock.invocationCallOrder[0]);
    expect(next.canvas.style.visibility).toBe('visible'); next.renderer.dispose();
    readiness.mockReturnValue(false);
    const failedReady = vi.fn(), failure = harness({ onReady: failedReady }); failure.renderer.render(view()); const failedScene = failure.engine.scenes[0];
    vi.spyOn(failedScene, 'render').mockImplementation(() => {});
    vi.spyOn(failedScene.materials[0], 'getEffect').mockReturnValue({ getCompilationError: () => 'shader compilation failed' } as ReturnType<StandardMaterial['getEffect']>);
    failure.display(); expect(failure.unavailable).toHaveBeenCalledTimes(1); expect(failure.canvas.removed).toBe(true);
    expect(failedReady).not.toHaveBeenCalled();
  });

  it('preserves the warm hidden canvas and never invokes Babylon readiness or render during shader downloads', async () => {
    let finish!: () => void;
    const download = new Promise<void>(resolve => { finish = resolve; });
    const loadShaders = vi.fn(() => download), onReady = vi.fn(), h = harness({ loadShaders, onReady });
    const readiness = vi.spyOn(Scene.prototype, 'isReady').mockReturnValue(true);
    const draw = vi.spyOn(Scene.prototype, 'render');
    h.renderer.render(view()); h.renderer.zoom(1); h.renderer.render(view({ progress: .4 }));
    await Promise.resolve();
    expect(loadShaders).toHaveBeenCalledTimes(1); expect(readiness).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled();
    expect(h.canvas.removed).toBe(false); expect(h.canvas.style.visibility).toBe('hidden'); expect(onReady).not.toHaveBeenCalled();
    const scene = h.engine.scenes[0], camera = scene.activeCamera;
    finish(); await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(draw).toHaveBeenCalledTimes(1); expect(scene.activeCamera === camera).toBe(true);
    expect(h.canvas.removed).toBe(false); expect(h.canvas.style.visibility).toBe('visible');
    expect(h.unavailable).not.toHaveBeenCalled(); h.renderer.dispose();
  });

  it('preloads the actual default shader modules before rendering when no loader is supplied', async () => {
    const readiness = vi.spyOn(Scene.prototype, 'isReady').mockReturnValue(true);
    const onReady = vi.fn(), h = harness({ loadShaders: undefined, onReady });
    h.renderer.render(view()); expect(readiness).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(h.canvas.style.visibility).toBe('visible'); expect(h.unavailable).not.toHaveBeenCalled(); h.renderer.dispose();
  });

  it('keeps an obsolete shader failure from disposing a newly mounted generation', async () => {
    let rejectOld!: (error: Error) => void, finishNew!: () => void;
    const oldDownload = new Promise<void>((_resolve, reject) => { rejectOld = reject; });
    const newDownload = new Promise<void>(resolve => { finishNew = resolve; });
    const loadShaders = vi.fn().mockReturnValueOnce(oldDownload).mockReturnValueOnce(newDownload);
    const engines: NullEngine[] = [], onReady = vi.fn();
    const h = harness({ loadShaders, onReady, createEngine: () => {
      const engine = new NullEngine(); engines.push(engine); return engine;
    } });
    vi.spyOn(Scene.prototype, 'isReady').mockReturnValue(true);
    h.renderer.render(view()); h.renderer.mount({ append() {} } as unknown as HTMLElement);
    const draw = vi.spyOn(engines[1].scenes[0], 'render');
    rejectOld(new TypeError('Importing a module script failed.'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(h.unavailable).not.toHaveBeenCalled(); expect(onReady).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled();
    finishNew(); await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(draw).toHaveBeenCalledTimes(1); expect(h.unavailable).not.toHaveBeenCalled();
    h.renderer.dispose(); h.engine.dispose();
  });

  it('handles rejected shader imports before Babylon can start an uncaught lazy loader', async () => {
    let reject!: (error: Error) => void;
    const download = new Promise<void>((_resolve, fail) => { reject = fail; });
    const onReady = vi.fn(), h = harness({ loadShaders: () => download, onReady });
    const readiness = vi.spyOn(Scene.prototype, 'isReady'), draw = vi.spyOn(Scene.prototype, 'render');
    h.renderer.render(view()); await Promise.resolve();
    reject(new TypeError('Importing a module script failed.'));
    await vi.waitFor(() => expect(h.unavailable).toHaveBeenCalledTimes(1));
    expect(readiness).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled();
    expect(onReady).not.toHaveBeenCalled(); expect(h.canvas.style.visibility).toBe('hidden'); expect(h.canvas.removed).toBe(true);
    h.renderer.zoom(1); h.renderer.render(view()); expect(h.unavailable).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('ignores shader completion after disposal, including rejection: %j', async rejectDownload => {
    let finish!: () => void, reject!: (error: Error) => void;
    const download = new Promise<void>((resolve, fail) => { finish = resolve; reject = fail; });
    const onReady = vi.fn(), h = harness({ loadShaders: () => download, onReady });
    h.renderer.render(view()); const draw = vi.spyOn(h.engine.scenes[0], 'render');
    await Promise.resolve(); h.renderer.dispose();
    if (rejectDownload) reject(new TypeError('Importing a module script failed.')); else finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(draw).not.toHaveBeenCalled(); expect(onReady).not.toHaveBeenCalled(); expect(h.unavailable).not.toHaveBeenCalled();
    expect(h.canvas.removed).toBe(true); expect(h.canvas.style.visibility).toBe('hidden');
  });

  it.each([
    [{}, { dpr: 3, touch: true }, 1], [{}, { dpr: 3 }, 1.5],
    [{ pixelRatio: .75 }, { dpr: 3, touch: true }, .75], [{ pixelRatio: 8 }, {}, 1.5],
    [{ pixelRatio: NaN }, { dpr: 3, touch: true }, 1], [{ pixelRatio: Infinity }, { dpr: 3, touch: true }, 1],
    [{ pixelRatio: -1 }, { dpr: 3, touch: true }, 1], [{ pixelRatio: 0 }, { dpr: 3, touch: true }, 1],
  ])('caps mobile/desktop GPU resolution and ignores malformed ratio: %j %j', (options, device, expected) => {
    const h = harness(options, device); expect(h.scaling).toHaveBeenLastCalledWith(1 / expected); h.renderer.dispose();
  });

  it('uses a deterministic explicit effect clock; pauses, reduced motion and hidden views freeze activity', () => {
    const state = view({ destinationId: 'quasar', kind: 'quasar', travelling: false, origin: undefined, effectTime: 2 });
    const h = harness(); h.renderer.render(state); const scene = h.engine.scenes[0];
    const particles = scene.getMeshByName('infall-particles')!;
    const vertices = () => Array.from(particles.getVerticesData(VertexBuffer.PositionKind)!);
    const start = vertices(), cache = [...scene.meshes];
    h.renderer.render({ ...state, effectTime: 3 }); const moving = vertices(); expect(moving).not.toEqual(start);
    h.renderer.render({ ...state, effectTime: 3 }); expect(vertices()).toEqual(moving);
    for (const patch of [{ paused: true }, { reducedMotion: true }]) {
      h.renderer.render({ ...state, ...patch, effectTime: 10 }); h.renderer.zoom(1); expect(vertices()).toEqual(moving);
    }
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    h.renderer.render({ ...state, effectTime: 11 }); expect(vertices()).toEqual(moving);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    h.renderer.render({ ...state, effectTime: 2 }); expect(vertices()).toEqual(start);
    expect(scene.meshes).toEqual(cache); expect(scene.meshes.length).toBeLessThan(24); h.renderer.dispose();
    const next = harness({}, {}, false); next.renderer.render({ ...state, paused: true });
    next.renderer.mount({ append() {} } as unknown as HTMLElement);
    expect(Array.from(next.engine.scenes[0].getMeshByName('infall-particles')!.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(start); next.renderer.dispose();
  });

  it('retains coordinate camera and cached morphology across departure and arrival', () => {
    const h = harness(), arrived = view({ progress: 1, travelling: false, coordinateView: true, beta: 0 });
    h.renderer.render({ ...arrived, travelling: true }); const scene = h.engine.scenes[0];
    const camera = scene.activeCamera, pose = [...scene.metadata.cameraAU], sphere = scene.getMeshByName('coordinate-sphere-saturn');
    h.renderer.render(arrived);
    expect(scene.activeCamera).toBe(camera); expect(scene.activeCamera).toBeInstanceOf(FreeCamera);
    scene.metadata.cameraAU.forEach((value: number, axis: number) => expect(value).toBeCloseTo(pose[axis], 12));
    expect(scene.getMeshByName('coordinate-sphere-saturn') === sphere).toBe(true);
    expect(scene.getMeshByName('ring-planet')).toBeNull(); expect(scene.getTransformNodeByName('coordinate-flight')!.isEnabled()).toBe(true);
    h.renderer.render({ ...arrived, travelling: true }); expect(scene.activeCamera).toBe(camera); h.renderer.dispose();
  });

  it('bounds inspection without changing measured coordinates, distances, directions or angular radii', () => {
    const h = harness(), state = view({ progress: .4 }); h.renderer.render(state); const scene = h.engine.scenes[0];
    const physical = JSON.stringify(scene.metadata), body = scene.getTransformNodeByName('coordinate-body-earth')!, metadata = JSON.stringify(body.metadata), position = body.position.asArray();
    const inspection = { yaw: 99, pitch: -99, roll: 99, offset: [99, -99, NaN] as const };
    h.renderer.render({ ...state, inspection });
    expect(scene.metadata).toEqual(JSON.parse(physical)); expect(body.metadata).toEqual(JSON.parse(metadata)); expect(body.position.asArray()).toEqual(position);
    expect(scene.activeCamera!.position.asArray()).toEqual([.2, -.2, 0]);
    expect((scene.activeCamera as FreeCamera).rotation.asArray()).toEqual([-.35, .6, .25]);
    expect(scene.activeCamera!.fov).toBeCloseTo(2 * Math.atan(310 / 850));
    inspection.offset = [0, 0, 0] as unknown as typeof inspection.offset;
    h.renderer.zoom(0); expect(scene.activeCamera!.position.asArray()).toEqual([.2, -.2, 0]); h.renderer.dispose();
  });

  it('smoothly blends unresolved locators into resolved bodies and normalizes region geometry once', () => {
    const actual = routeFrame(view()), earth = actual.objects.find(object => object.id === 'earth')!;
    const mock = vi.spyOn(routes, 'routeFrame').mockImplementation(snapshot => ({ ...actual, objects: [{ ...earth, angularRadius: snapshot.progress, formed: 1 }] }));
    const h = harness();
    const visibility: number[] = [];
    for (const angularRadius of [.00129, .00131, .0018, .002, .0022, .00269, .00271]) {
      h.renderer.render(view({ progress: angularRadius })); const scene = h.engine.scenes[0];
      const marker = scene.getMeshByName('coordinate-glyph-earth')!, sphere = scene.getMeshByName('coordinate-sphere-earth');
      visibility.push(marker.visibility); if (sphere) expect(sphere.visibility + marker.visibility).toBeCloseTo(1);
    }
    expect(visibility[0]).toBe(1); expect(visibility.at(-1)).toBe(0); expect(visibility[1]).toBeGreaterThan(.99);
    expect(visibility[3]).toBeCloseTo(.5); expect(visibility[5]).toBeLessThan(.01);
    mock.mockImplementation(() => ({ ...actual, objects: [{ ...earth, id: 'nebula', kind: 'nebula', angularRadius: .08, formed: 1 }] }));
    h.renderer.render(view({ progress: .1 })); const scene = h.engine.scenes[0], body = scene.getTransformNodeByName('coordinate-body-nebula')!;
    const shape = scene.getTransformNodeByName('local-morphology-nebula')!;
    expect(shape.scaling.x * shape.metadata.normalizedExtent).toBeCloseTo(body.metadata.shell * Math.sin(.08));
    const inverse = body.computeWorldMatrix(true).clone().invert(); let extent = 0;
    for (const mesh of shape.getChildMeshes()) {
      const matrix = mesh.computeWorldMatrix(true).multiply(inverse), positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
      for (let i = 0; i < positions.length; i += 3) extent = Math.max(extent, Vector3.TransformCoordinates(Vector3.FromArray(positions, i), matrix).length());
    }
    expect(extent).toBeCloseTo(body.metadata.shell * Math.sin(.08), 5); h.renderer.dispose();
  });

  it('shows identified binaries, giant instability, newborn stars and static elliptical radio galaxies', () => {
    const h = harness();
    for (const [destinationId, kind] of [['sirius', 'triple'], ['eta-carinae', 'triple'], ['betelgeuse', 'sun'], ['tarantula', 'nebula'], ['m87', 'galaxy'], ['centaurus-a', 'galaxy']] as const) {
      const state = view({ destinationId, kind, travelling: false, origin: undefined, effectTime: 1 }); h.renderer.render(state);
      const scene = h.engine.scenes[0]; expect(h.unavailable).not.toHaveBeenCalled();
      if (kind === 'triple') {
        expect(scene.getMeshByName('binary-primary')).not.toBeNull(); expect(scene.getMeshByName('binary-companion')).not.toBeNull();
        expect(scene.getMeshByName('distant-proxima')).toBeNull();
      }
      if (destinationId === 'eta-carinae' || destinationId === 'betelgeuse') {
        const giant = scene.meshes.find(mesh => mesh.metadata?.motion === 'instability')!;
        const scale = giant.scaling.x; h.renderer.render({ ...state, effectTime: 2 }); expect(giant.scaling.x).not.toBe(scale);
      }
      if (kind === 'nebula') expect(scene.meshes.filter(mesh => mesh.name === 'forming-protostar')).toHaveLength(3);
      if (kind === 'galaxy') {
        const stars = scene.getMeshByName('elliptical-galaxy-stars')!;
        expect(stars).not.toBeNull(); expect(scene.getMeshByName('spiral-arms-and-bulge')).toBeNull(); expect(scene.getMeshByName('jet-spine')).not.toBeNull();
        const geometry = Array.from(stars.getVerticesData(VertexBuffer.PositionKind)!); h.renderer.render({ ...state, effectTime: 3 });
        expect(Array.from(stars.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(geometry); expect(stars.rotation.asArray()).toEqual([0, 0, 0]);
      }
      expect(scene.meshes.length).toBeLessThan(44);
    }
    h.renderer.dispose();
  });

  it('uses active compact morphology in coordinates, with faint Sgr A* but jets only on active identities', () => {
    const actual = routeFrame(view()), reference = actual.objects.find(object => object.id === 'sun')!;
    const mock = vi.spyOn(routes, 'routeFrame');
    const h = harness();
    for (const [id, kind, jets] of [['blackhole', 'blackhole', false], ['cygnus-x1', 'blackhole', true], ['crab-pulsar', 'neutron', false], ['quasar', 'quasar', true]] as const) {
      mock.mockReturnValue({ ...actual, objects: [{ ...reference, id, kind, angularRadius: .035, formed: 1, factor: 1.5 }] });
      h.renderer.render(view({ destinationId: id, kind, progress: .8, effectTime: 2 })); const scene = h.engine.scenes[0];
      expect(scene.getMeshByName(`coordinate-sphere-${id}`)).not.toBeNull();
      expect(Boolean(scene.getMeshByName('jet-spine'))).toBe(jets);
      if (kind === 'neutron') expect(scene.getTransformNodeByName('oblique-magnetic-axis')!.rotation.y).toBeCloseTo(3.6);
      else {
        const particles = scene.getMeshByName('infall-particles')!;
        const before = Array.from(particles.getVerticesData(VertexBuffer.PositionKind)!);
        const knots = scene.getMeshByName('fixed-comoving-illustrative-knots')!, updateKnots = vi.spyOn(knots, 'updateVerticesData');
        const body = scene.getTransformNodeByName(`coordinate-body-${id}`)!, position = body.position.asArray();
        h.renderer.render(view({ destinationId: id, kind, progress: .8, effectTime: 3 }));
        expect(Array.from(particles.getVerticesData(VertexBuffer.PositionKind)!)).not.toEqual(before);
        expect(updateKnots).not.toHaveBeenCalled(); expect(body.position.asArray()).toEqual(position);
        const tint = particles.material as StandardMaterial; expect(tint.emissiveColor.b).toBeGreaterThan(tint.emissiveColor.r);
      }
      expect(scene.meshes.length).toBeLessThan(30);
    }
    h.renderer.dispose();
  });
});
