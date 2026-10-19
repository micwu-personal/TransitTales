import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { ArcRotateCamera, Scene, Vector3 } from '../src/babylon';
import { create3dRenderer, mallCameraRadius, mallPoint3d, MALL_CAMERA } from '../src/escalator/renderer3d';
import { advanceWave, createBoard, startWave, verifiedSolution } from '../src/escalator/model';
import { PUZZLES } from '../src/escalator/puzzles';
import { snapshot } from '../src/escalator/view';

const harness = vi.hoisted(() => ({ engines: [] as unknown[], measurements: 0 }));
vi.mock('../src/babylon', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/babylon')>();
  const { NullEngine: HeadlessEngine } = await import('@babylonjs/core/Engines/nullEngine');
  class TestEngine extends HeadlessEngine {
    frame: (() => void) | undefined;
    constructor() {
      super({ renderWidth: 1024, renderHeight: 548, textureSize: 256, deterministicLockstep: false, lockstepMaxSteps: 4 });
      harness.engines.push(this);
    }
    override runRenderLoop(frame: () => void): void { this.frame = frame; }
    override stopRenderLoop(): void { this.frame = undefined; }
  }
  return { ...actual, Engine: TestEngine };
});

type TestEngine = NullEngine & { frame?: () => void };
class DomNode {
  children: DomNode[] = [];
  parent: DomNode | null = null;
  attributes = new Map<string, string>();
  listeners = new Map<string, Set<(event: any) => void>>();
  dataset: Record<string, string> = {};
  className = ''; textContent = ''; title = ''; id = ''; type = ''; lang = '';
  hidden = false; disabled = false; tabIndex = 0;
  clientWidth = 1024; clientHeight = 548;
  style: Record<string, any> = {};
  classList = {
    add: (...names: string[]) => { this.className += ` ${names.join(' ')}`; },
    toggle: (name: string, on: boolean) => {
      const names = new Set(this.className.split(' ').filter(Boolean));
      if (on) names.add(name); else names.delete(name);
      this.className = [...names].join(' ');
    },
  };
  constructor(readonly tagName = 'div') {}
  get offsetWidth(): number {
    harness.measurements++; return this.hidden ? 0 : this.tagName === 'button' ? 44 : Math.min(160, Math.max(30, this.textContent.length * 6));
  }
  get offsetHeight(): number { harness.measurements++; return this.hidden ? 0 : this.tagName === 'button' ? 44 : 32; }
  append(...nodes: DomNode[]): void { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes: DomNode[]): void { this.children.forEach(node => { node.parent = null; }); this.children = []; this.append(...nodes); }
  remove(): void { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  removeAttribute(name: string): void { this.attributes.delete(name); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  getAttributeNames(): string[] { return [...this.attributes.keys()]; }
  get childNodes(): DomNode[] { return this.children; }
  nodeType = 1;
  addEventListener(name: string, listener: (event: any) => void): void {
    const listeners = this.listeners.get(name) ?? new Set(); listeners.add(listener); this.listeners.set(name, listeners);
  }
  removeEventListener(name: string, listener: (event: any) => void): void { this.listeners.get(name)?.delete(listener); }
  emit(name: string, event: any): void { this.listeners.get(name)?.forEach(listener => listener(event)); }
  closest(): DomNode | null { return this.tagName === 'button' ? this : this.parent?.closest() ?? null; }
  all(): DomNode[] { return [this, ...this.children.flatMap(node => node.all())]; }
  querySelectorAll(selector: string): DomNode[] { return this.all().slice(1).filter(node => selector === 'button' && node.tagName === 'button'); }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}
class ButtonNode extends DomNode { constructor() { super('button'); } }
const puzzle = () => PUZZLES.find(puzzle => puzzle.id === 'sky-parade')!;
const view = (language: 'en' | 'zh-CN' = 'en') => snapshot(puzzle(), createBoard(), null, language, null, null, true, false, false);

function mountHarness() {
  const window = new DomNode('window');
  vi.stubGlobal('window', Object.assign(window, { devicePixelRatio: 1 }));
  vi.stubGlobal('document', Object.assign(new DomNode('document'), {
    createElement: (tag: string) => tag === 'button' ? new ButtonNode() : new DomNode(tag),
    createElementNS: (_namespace: string, tag: string) => new DomNode(tag), hidden: false,
    fonts: { ready: Promise.resolve() },
  }));
  vi.stubGlobal('Element', DomNode); vi.stubGlobal('HTMLElement', DomNode); vi.stubGlobal('HTMLButtonElement', ButtonNode);
  const host = new DomNode(), onLanding = vi.fn(), onPiece = vi.fn(), unavailable = vi.fn();
  const renderer = create3dRenderer(unavailable);
  renderer.mount(host as unknown as HTMLElement, onLanding, onPiece);
  const engine = harness.engines.at(-1) as TestEngine;
  return { renderer, host, window, engine, onLanding, onPiece, unavailable };
}
const coordinates = (node: DomNode) => node.style.transform.match(/[\d.-]+/g).map(Number) as number[];
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); harness.engines = []; harness.measurements = 0; });

describe('actual projected mall label updates', () => {
  it('keeps every merged tread, rail and deck on its own depth-spanning connection without corrupting later primitives', async () => {
    const { renderer, engine, unavailable } = mountHarness();
    try {
      await Promise.resolve();
      for (const atrium of PUZZLES.filter(p => p.building === 'sky-atrium')) {
        const board = verifiedSolution(atrium);
        renderer.render(snapshot(atrium, board, null, 'en', null, null, true, false, false)); engine.frame?.();
        for (const piece of board.pieces) {
          const from = mallPoint3d(piece.a), to = mallPoint3d(piece.b);
          const meshes = engine.scenes[0].meshes.filter(mesh => mesh.metadata?.kind === 'piece' && mesh.metadata.id === piece.id);
          expect(meshes.length, `${atrium.id}/${piece.id}`).toBeGreaterThan(0);
          for (const mesh of meshes) {
            const vertices = mesh.getVerticesData('position')!, indices = mesh.getIndices()!;
            expect([...indices].every(index => index >= 0 && index < vertices.length / 3), `${atrium.id}/${piece.id}: valid indices`).toBe(true);
            const matrix = mesh.computeWorldMatrix(true), min = new Vector3(Infinity, Infinity, Infinity), max = min.negate();
            for (let index = 0; index < vertices.length; index += 3) {
              const vertex = Vector3.TransformCoordinates(Vector3.FromArray(vertices, index), matrix);
              min.minimizeInPlace(vertex); max.maximizeInPlace(vertex);
            }
            for (const axis of ['x', 'z'] as const) {
              expect(min[axis], `${atrium.id}/${piece.id}: ${axis} stays by its endpoints`).toBeGreaterThanOrEqual(Math.min(from[axis], to[axis]) - .91);
              expect(max[axis], `${atrium.id}/${piece.id}: ${axis} stays by its endpoints`).toBeLessThanOrEqual(Math.max(from[axis], to[axis]) + .91);
            }
            expect(min.y).toBeGreaterThanOrEqual(Math.min(from.y, to.y) - .5);
            expect(max.y).toBeLessThanOrEqual(Math.max(from.y, to.y) + (piece.type === 'elevator' ? 2.5 : .9));
          }
        }
      }
      expect(unavailable).not.toHaveBeenCalled();
    } finally { renderer.dispose(); }
  }, 15_000);
  it('builds distinct depth decks, routes exact coordinates and yields camera tours to manual controls', async () => {
    const { renderer, host, engine, onLanding, unavailable } = mountHarness();
    try {
      await Promise.resolve();
      const atrium = PUZZLES.find(p => p.building === 'sky-atrium')!, board = verifiedSolution(atrium);
      const build = snapshot(atrium, board, null, 'en', null, null, true, false, false);
      renderer.render(build); engine.frame?.();
      const camera = engine.scenes[0].activeCamera as ArcRotateCamera;
      expect(camera.target.z).toBe(2.65); expect(camera.target.y).toBe(7.6);
      const deckButtons = host.all().filter(node => node.dataset.depth !== undefined);
      expect(deckButtons).toHaveLength(3);
      for (const button of deckButtons) {
        button.emit('click', {}); engine.frame?.();
        const landings = host.all().filter(node => node.dataset.landing);
        expect(landings.length).toBeGreaterThan(0);
        expect(landings.every(node => Number(node.dataset.landing.split(',')[2]) === Number(button.dataset.depth))).toBe(true);
        const landing = landings[0], [x, y, z] = landing.dataset.landing.split(',').map(Number);
        host.all().find(node => node.className === 'mall-3d-labels')!.emit('click', { target: landing, detail: 0, timeStamp: 0 });
        expect(onLanding).toHaveBeenLastCalledWith({ x, y, z });
      }
      let wave = startWave(atrium, board);
      const play = (seconds: number, running = true, reduced = false) => {
        wave = advanceWave(wave, seconds);
        renderer.render(snapshot(atrium, board, wave, 'en', null, null, false, running, reduced)); engine.frame?.();
      };
      const alpha = camera.alpha; play(0); play(3); expect(camera.alpha).not.toBe(alpha);
      const paused = camera.alpha; play(0, false); engine.frame?.(); expect(camera.alpha).toBe(paused);
      play(2, true, true); expect(camera.alpha).toBe(paused);
      renderer.zoomCamera('in'); play(2); expect(camera.alpha).toBe(paused);
      renderer.resetCamera(); play(1); expect(camera.alpha).toBe(MALL_CAMERA.alpha);
      expect(unavailable).not.toHaveBeenCalled();
    } finally { renderer.dispose(); }
  });
  it('measures once after content/font/host changes, never during Bookshop/Café rotation', async () => {
    const { renderer, host, window, engine, unavailable } = mountHarness();
    try {
      await Promise.resolve(); renderer.render(view()); engine.frame?.();
      const signs = host.all().filter(node => node.className.split(' ').includes('mall-3d-sign') && /Bookshop|Caf[eé]/.test(node.textContent));
      expect(signs).toHaveLength(2); expect(signs.every(node => !node.hidden)).toBe(true);
      const camera = engine.scenes[0].activeCamera as ArcRotateCamera;
      const measurements = harness.measurements;
      let old = signs.map(coordinates);
      for (let frame = 0; frame < 120; frame++) {
        camera.alpha += .00005; engine.frame?.();
        signs.forEach((node, index) => {
          const next = coordinates(node);
          expect(Math.abs(next[0] - old[index][0])).toBeLessThan(.5);
          expect(Math.abs(next[1] - old[index][1])).toBeLessThan(.5);
          old[index] = next;
        });
      }
      expect(harness.measurements).toBe(measurements);
      renderer.render(view('zh-CN')); engine.frame?.();
      expect(harness.measurements).toBeGreaterThan(measurements);
      const translated = harness.measurements;
      camera.alpha += .001; engine.frame?.(); expect(harness.measurements).toBe(translated);
      renderer.zoomCamera('in');
      const ratio = camera.radius / (mallCameraRadius(1024, 548, camera.alpha, camera.beta) + 2.5);
      const canvas = host.all().find(node => node.tagName === 'canvas')!;
      canvas.clientWidth = 768; canvas.clientHeight = 420; window.emit('resize', {}); engine.frame?.();
      expect(harness.measurements).toBeGreaterThan(translated);
      expect(camera.radius / (mallCameraRadius(768, 420, camera.alpha, camera.beta) + 2.5)).toBeCloseTo(ratio);
      const resized = harness.measurements;
      camera.alpha += .001; engine.frame?.(); expect(harness.measurements).toBe(resized);
      camera.setTarget(new Vector3(100, 100, 100)); engine.frame?.(); expect(signs.every(node => node.hidden)).toBe(true);
      renderer.resetCamera(); engine.frame?.(); expect(signs.every(node => !node.hidden)).toBe(true);
      expect(camera.alpha).toBe(MALL_CAMERA.alpha); expect(camera.beta).toBe(MALL_CAMERA.beta);
      expect(unavailable).not.toHaveBeenCalled();
    } finally { renderer.dispose(); }
  });
  it('connects the roof coordinate to D2 and preserves native >=44px controls and exact activation after an orbit', async () => {
    const { renderer, host, window, engine, onLanding, onPiece, unavailable } = mountHarness();
    try {
      await Promise.resolve(); renderer.render(view()); engine.frame?.();
      const nodes = host.all(), labels = nodes.find(node => node.className === 'mall-3d-labels')!;
      const clearance = nodes.find(node => node.dataset.clearanceLanding)!;
      expect(clearance.dataset.clearanceLanding).toBe('D2'); expect(clearance.textContent).toContain('D2 ↑');
      const landing = nodes.find(node => node.dataset.landing === '3,1')!;
      expect(landing.getAttribute('aria-describedby')).toBe(clearance.id);
      const camera = engine.scenes[0].activeCamera as ArcRotateCamera;
      expect(camera.lowerAlphaLimit).toBe(MALL_CAMERA.minAlpha); expect(camera.upperAlphaLimit).toBe(MALL_CAMERA.maxAlpha);
      const scene = engine.scenes[0] as Scene, p = mallPoint3d({ x: 3, y: 1 });
      const expected = Vector3.Project(new Vector3(p.x, p.y, p.z), Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(1024, 548));
      const leader = nodes.find(node => node.tagName === 'line' && node.getAttribute('stroke') === '#a44834')!;
      expect(Number(leader.getAttribute('x1'))).toBeCloseTo(expected.x); expect(Number(leader.getAttribute('y1'))).toBeCloseTo(expected.y);
      camera.alpha = -2.4; camera.beta = .85; engine.frame?.();
      const controls = nodes.filter(node => node.dataset.landing || node.dataset.piece);
      controls.forEach(node => { expect(node.offsetWidth).toBeGreaterThanOrEqual(44); expect(node.offsetHeight).toBeGreaterThanOrEqual(44); });
      labels.emit('click', { target: landing, timeStamp: 100, detail: 1 }); expect(onLanding).toHaveBeenLastCalledWith({ x: 3, y: 1 }); onLanding.mockClear();
      const wrapper = host.children[0], gesture = { pointerId: 1, clientX: 100, clientY: 100, timeStamp: 200, target: landing, button: 0 };
      wrapper.emit('pointerdown', gesture); wrapper.emit('pointermove', { ...gesture, clientX: 125 });
      window.emit('pointerup', { ...gesture, timeStamp: 250, clientX: 125 });
      labels.emit('click', { target: landing, timeStamp: 251, detail: 1 }); expect(onLanding).not.toHaveBeenCalled();
      labels.emit('click', { target: landing, timeStamp: 252, detail: 0 }); expect(onLanding).toHaveBeenCalledWith({ x: 3, y: 1 });
      expect(onPiece).not.toHaveBeenCalled(); expect(unavailable).not.toHaveBeenCalled();
    } finally { renderer.dispose(); }
  });
});
