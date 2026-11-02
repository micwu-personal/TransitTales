import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { createUniverse3dRenderer } from '../src/universe/renderer3d';
import { universeMarkup } from '../src/universe/renderer';
import type { UniverseSnapshot } from '../src/universe/view';

const view = (patch: Partial<UniverseSnapshot> = {}): UniverseSnapshot => ({ destinationId: 'saturn', kind: 'ring', color: '#dcba89', epoch: 'present', beta: .85, travelling: true, progress: 0, paused: false, reducedMotion: false, origin: { destinationId: 'earth', kind: 'earth', color: '#abcdef', epoch: 'present' }, ...patch });
class CanvasStub {
  style = { cssText: '' }; listeners = new Map<string, EventListener>(); attributes = new Map<string, string>(); width = 1000; height = 620; removed = false;
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
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

describe('real Babylon geometry flight lifecycle (NullEngine)', () => {
  it('retains departure, moves through a shared sky, approaches gradually, and caches celestial geometry', () => {
    const h = harness(); h.renderer.render(view());
    expect(h.unavailable).not.toHaveBeenCalled();
    const scene = h.engine.scenes[0], earth = scene.getMeshByName('blue-marble')!;
    expect(earth).not.toBeNull(); expect(scene.getMeshByName('ring-planet')).toBeNull();
    const sky = scene.getMeshByName('angular-relativistic-sky')!;
    h.renderer.render(view({ progress: .1 })); expect(scene.getMeshByName('blue-marble')).toBe(earth);
    expect(earth.visibility).toBeLessThan(1); expect((earth.parent as TransformNode).scaling.x).toBeLessThan(1);
    h.renderer.zoom(1); const camera = scene.activeCamera!; const radius = (camera as unknown as { radius: number }).radius;
    h.renderer.render(view({ progress: .5 }));
    expect(scene.getMeshByName('blue-marble')).toBeNull(); expect(scene.getMeshByName('ring-planet')).toBeNull(); expect(sky.visibility).toBe(1);
    h.renderer.render(view({ progress: .7 }));
    const ring = scene.getMeshByName('ring-planet')!; expect(ring).not.toBeNull(); expect(ring.visibility).toBeLessThan(.3);
    expect((ring.parent as TransformNode).scaling.x).toBeLessThan(.5); expect((camera as unknown as { radius: number }).radius).toBe(radius);
    h.renderer.render(view({ progress: .75 })); expect(scene.getMeshByName('ring-planet')).toBe(ring);
    h.renderer.render(view({ progress: 1, travelling: false })); expect(ring.visibility).toBe(1); expect((ring.parent as TransformNode).scaling.x).toBe(1);
    h.renderer.reset(); expect((camera as unknown as { radius: number }).radius).toBe(13.8);
    expect(h.unavailable).not.toHaveBeenCalled(); h.renderer.dispose(); expect(h.canvas.removed).toBe(true); expect(h.canvas.listeners.size).toBe(0);
  });
  it('renders intermediate epochs with whole-sky fields, keeps pause free of wall-clock drift, and recreates the identical flight', () => {
    const h = harness(), state = view({ destinationId: 'earth', kind: 'earth', epoch: 'bang', progress: .8 });
    h.renderer.render(state); expect(h.unavailable).not.toHaveBeenCalled();
    const scene = h.engine.scenes[0]; expect(scene.getMeshByName('blue-marble')).toBeNull();
    expect(scene.getMeshByName('whole-sky-no-explosion-center')).not.toBeNull();
    const sky = scene.getMeshByName('angular-relativistic-sky')!;
    const before = Array.from(sky.getVerticesData(VertexBuffer.PositionKind)!);
    h.renderer.render({ ...state, paused: true }); h.display(); h.display();
    expect(Array.from(sky.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(before);
    expect(h.unavailable).not.toHaveBeenCalled();
    h.renderer.dispose();
    const next = harness(); next.renderer.render({ ...state, paused: true });
    const restored = next.engine.scenes[0].getMeshByName('angular-relativistic-sky')!;
    expect(Array.from(restored.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(before); next.renderer.dispose();
  });
  it('reduced motion blends complete scenes without streaks, zoom or relativistic beaming', () => {
    const h = harness(); h.renderer.render(view({ progress: .5, reducedMotion: true }));
    expect(h.unavailable).not.toHaveBeenCalled(); const scene = h.engine.scenes[0];
    for (const name of ['blue-marble', 'ring-planet']) {
      const mesh = scene.getMeshByName(name)!; expect(mesh.visibility).toBe(.5); expect((mesh.parent as TransformNode).scaling.x).toBe(1); expect((mesh.parent as TransformNode).position.x).toBe(0);
    }
    const sky = scene.getMeshByName('angular-relativistic-sky')!, values = Array.from(sky.getVerticesData(VertexBuffer.PositionKind)!);
    h.renderer.render(view({ progress: .7, reducedMotion: true, paused: true })); h.display();
    expect(Array.from(sky.getVerticesData(VertexBuffer.PositionKind)!)).toEqual(values); h.renderer.dispose();
  });
  it('a real context-loss event disposes GPU state, calls fallback once and leaves identical SVG flight available', () => {
    const h = harness(), state = view({ progress: .71, paused: true }); h.renderer.render(state);
    const loss = h.canvas.listeners.get('webglcontextlost')!, event = { preventDefault: vi.fn() };
    loss(event as unknown as Event); loss(event as unknown as Event);
    expect(event.preventDefault).toHaveBeenCalled(); expect(h.unavailable).toHaveBeenCalledTimes(1); expect(h.canvas.removed).toBe(true);
    const markup = universeMarkup(state); expect(markup).toContain('ring-planet'); expect(markup).not.toContain('blue-marble');
    expect(markup).toBe(universeMarkup(JSON.parse(JSON.stringify(state))));
  });
});
