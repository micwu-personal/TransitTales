import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { ArcRotateCamera, Mesh, Scene, Vector3, type StandardMaterial } from '../src/babylon';
import {
  CITY_CAMERA, cityCameraRadius, cityFramingPoints, cityPoint3d, cityStaticSignature, cityTrainPose,
  coastalIslandGeometry, create3dCityRenderer, layoutCityLabels,
} from '../src/rush/renderer3d';
import { COASTAL_LAYOUT } from '../src/rush/city';
import { createGame, dispatch, step } from '../src/rush/model';
import { createCitySnapshot, type CitySnapshot } from '../src/rush/view';

const harness = vi.hoisted(() => ({ failInit: false, width: 390, height: 440, engines: [] as unknown[] }));

vi.mock('../src/babylon', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/babylon')>();
  const { NullEngine: HeadlessEngine } = await import('@babylonjs/core/Engines/nullEngine');
  class TestEngine extends HeadlessEngine {
    frame: (() => void) | undefined;
    stops = 0;
    releases = 0;
    requestedScaling = 1;
    constructor() {
      super({ renderWidth: harness.width, renderHeight: harness.height, textureSize: 256, deterministicLockstep: false, lockstepMaxSteps: 4 });
      harness.engines.push(this);
      if (harness.failInit) { super.dispose(); throw new Error('WebGL unavailable'); }
    }
    override setHardwareScalingLevel(level: number): void { this.requestedScaling = level; super.setHardwareScalingLevel(level); }
    override runRenderLoop(frame: () => void): void { this.frame = frame; }
    override stopRenderLoop(): void { this.frame = undefined; this.stops++; }
    override dispose(): void { this.releases++; super.dispose(); }
  }
  return { ...actual, Engine: TestEngine };
});

type TestEngine = NullEngine & { frame?: () => void; stops: number; releases: number; requestedScaling: number };
const view = (language: 'en' | 'zh-CN' | 'mn-Mong-CN' = 'en'): CitySnapshot => createCitySnapshot(createGame(), {
  language, layout: COASTAL_LAYOUT, selected: 'market', interpolationSeconds: 0, animate: true,
});
const headless = (width: number, height: number) => new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 256, deterministicLockstep: false, lockstepMaxSteps: 4 });

class DomNode {
  children: DomNode[] = [];
  parent: DomNode | null = null;
  attributes = new Map<string, string>();
  listeners = new Map<string, Set<(event: any) => void>>();
  dataset: Record<string, string> = {};
  className = '';
  textContent = '';
  title = '';
  id = '';
  type = '';
  hidden = false;
  disabled = false;
  tabIndex = 0;
  clientWidth = harness.width;
  clientHeight = harness.height;
  style: Record<string, any> = { setProperty: (name: string, value: string) => { this.style[name] = value; } };
  classList = {
    add: (...names: string[]) => { this.className += ` ${names.join(' ')}`; },
    toggle: (name: string, on: boolean) => {
      const names = new Set(this.className.split(' ').filter(Boolean));
      if (on) names.add(name); else names.delete(name);
      this.className = [...names].join(' ');
    },
  };
  constructor(readonly tagName = 'div') {}
  append(...nodes: DomNode[]): void { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  remove(): void { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; }
  setAttribute(key: string, value: string): void { this.attributes.set(key, value); }
  getAttribute(key: string): string | null { return this.attributes.get(key) ?? null; }
  addEventListener(name: string, listener: (event: any) => void): void {
    const set = this.listeners.get(name) ?? new Set(); set.add(listener); this.listeners.set(name, set);
  }
  removeEventListener(name: string, listener: (event: any) => void): void { this.listeners.get(name)?.delete(listener); }
  emit(name: string, event: any): void { for (const listener of this.listeners.get(name) ?? []) listener(event); }
  closest(): DomNode | null { return this.tagName === 'button' ? this : this.parent?.closest() ?? null; }
  all(): DomNode[] { return [this, ...this.children.flatMap(node => node.all())]; }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}

function mountHarness() {
  const window = new DomNode('window');
  const observers: { disconnected: boolean }[] = [];
  vi.stubGlobal('window', Object.assign(window, { devicePixelRatio: 3 }));
  vi.stubGlobal('document', Object.assign(new DomNode('document'), { createElement: (tag: string) => new DomNode(tag), createElementNS: (_ns: string, tag: string) => new DomNode(tag), hidden: false }));
  vi.stubGlobal('ResizeObserver', class {
    disconnected = false;
    constructor(_callback: () => void) { observers.push(this); }
    observe(): void {}
    disconnect(): void { this.disconnected = true; }
  });
  const host = new DomNode(), unavailable = vi.fn(), select = vi.fn(), trainSelect = vi.fn();
  const renderer = create3dCityRenderer(unavailable);
  renderer.mount(host as unknown as HTMLElement, select, trainSelect);
  const engine = harness.engines.at(-1) as TestEngine;
  return { host, engine, renderer, unavailable, select, trainSelect, window, observers };
}

afterEach(() => { vi.unstubAllGlobals(); harness.failInit = false; harness.engines = []; vi.restoreAllMocks(); });

describe('3D coastal geometry and responsive projection', () => {
  it('maps the original fictional layout without reading simulation coordinates', () => {
    expect(cityPoint3d({ x: 0, y: 0 })).toEqual({ x: -14, y: 0.48, z: 9.5 });
    expect(cityPoint3d({ x: 1, y: 1 })).toEqual({ x: 14, y: 0.48, z: -9.5 });
    const a = cityPoint3d(COASTAL_LAYOUT.harbor), b = cityPoint3d(COASTAL_LAYOUT.airport);
    const middle = cityPoint3d({ x: (COASTAL_LAYOUT.harbor.x + COASTAL_LAYOUT.airport.x) / 2, y: (COASTAL_LAYOUT.harbor.y + COASTAL_LAYOUT.airport.y) / 2 });
    expect(middle.x).toBeCloseTo((a.x + b.x) / 2); expect(middle.z).toBeCloseTo((a.z + b.z) / 2);
  });

  it('transforms fractional train positions, lane offsets and headings in world proportions', () => {
    const position = { x: 0.5, y: 0.5 };
    const right = cityTrainPose({ position, heading: 0 }), left = cityTrainPose({ position, heading: Math.PI });
    expect(right.yaw).toBe(0); expect(right.z).toBeCloseTo(-0.15); expect(left.z).toBeCloseTo(0.15);
    const diagonal = cityTrainPose({ position, heading: Math.PI / 4 });
    expect(diagonal.yaw).toBeCloseTo(Math.atan2(19, 28));
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(0.15);
  });

  it('builds solid island surfaces with positive top normals and independent shore edges', () => {
    const outline = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }];
    const data = coastalIslandGeometry(outline, { x: 0.5, y: 0.5 }, -0.1, 0.28);
    expect(data.positions.length / 3).toBe(21); expect(data.indices).toHaveLength(36);
    expect(data.indices.every(index => index >= 0 && index < data.positions.length / 3)).toBe(true);
    for (let i = 0; i < data.indices.length; i += 9) {
      const [a, b, c] = data.indices.slice(i, i + 3).map(index => Vector3.FromArray(data.positions, index * 3));
      expect(Vector3.Cross(b.subtract(a), c.subtract(a)).y).toBeGreaterThan(0);
    }
  });

  it('keeps network geometry signatures stable through selection, queues, motion and language', () => {
    const initial = view();
    expect(cityStaticSignature(view('zh-CN'))).toBe(cityStaticSignature(initial));
    expect(cityStaticSignature({ ...initial, stations: initial.stations.map(station => ({ ...station, selected: !station.selected, helped: true, waiting: 100 })), trains: [] })).toBe(cityStaticSignature(initial));
    expect(cityStaticSignature({ ...initial, stations: initial.stations.map(station => ({ ...station, position: { x: station.position.x + 0.01, y: station.position.y } })) })).not.toBe(cityStaticSignature(initial));
  });

  it.each([[280, 440], [320, 440], [364, 440], [390, 440], [720, 486], [1280, 680]])('fits playable tracks, train bounds, skyline and selected station at %i×%i without cropping', (width, height) => {
    const engine = headless(width, height), scene = new Scene(engine);
    try {
      for (const [alpha, beta] of [[CITY_CAMERA.alpha, CITY_CAMERA.beta], [-1.91, 0.65], [-1.1, 1.02]]) {
        const camera = new ArcRotateCamera('fit', alpha, beta, cityCameraRadius(width, height, alpha, beta, view().stations.map(station => station.position)), new Vector3(0, CITY_CAMERA.targetY, 0), scene);
        camera.fov = CITY_CAMERA.fov; camera.minZ = 0.1; camera.maxZ = 200; scene.activeCamera = camera; scene.render();
        const viewport = camera.viewport.toGlobal(width, height);
        const project = (p: Vector3) => Vector3.Project(p, Matrix.Identity(), scene.getTransformMatrix(), viewport);
        for (const point of cityFramingPoints(view().stations.map(station => station.position))) {
          const p = project(new Vector3(point.x, point.y, point.z));
          expect(p.x).toBeGreaterThan(25); expect(p.x).toBeLessThan(width - 25);
          expect(p.y).toBeGreaterThan(25); expect(p.y).toBeLessThan(height - 25);
        }
        const labels = view().stations.map(station => {
          const at = cityPoint3d(station.position, 0.61), p = project(new Vector3(at.x, at.y, at.z));
          return { id: station.id, x: p.x, y: p.y, width: width <= 560 ? 64 : 86, height: 48, priority: 1, selected: station.selected };
        });
        const positioned = layoutCityLabels(labels, width, height);
        for (const label of positioned) {
          expect(label.width).toBeGreaterThanOrEqual(44); expect(label.height).toBeGreaterThanOrEqual(44);
          expect(label.left).toBeGreaterThanOrEqual(0); expect(label.top).toBeGreaterThanOrEqual(0);
          expect(label.left + label.width).toBeLessThanOrEqual(width); expect(label.top + label.height).toBeLessThanOrEqual(height);
        }
        const selected = positioned.find(label => label.selected)!;
        expect(selected.left + selected.width / 2).toBeCloseTo(selected.x); expect(selected.top + selected.height / 2).toBeCloseTo(selected.y);
        for (let i = 0; i < positioned.length; i++) for (let j = i + 1; j < positioned.length; j++) {
          const a = positioned[i], b = positioned[j];
          expect(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top).toBe(true);
        }
        camera.dispose();
      }
    } finally { scene.dispose(); engine.dispose(); }
  });

  it('gives selection its exact anchor and resolves collisions deterministically without mutating input', () => {
    const labels = ['one', 'two', 'three', 'four'].map((id, index) => ({ id, x: 180, y: 170, width: 64, height: 48, priority: index, selected: id === 'three' }));
    const original = structuredClone(labels), positioned = layoutCityLabels(labels, 390, 440);
    expect(labels).toEqual(original); expect(positioned[0].id).toBe('three');
    expect(positioned[0].left).toBe(148); expect(positioned[0].top).toBe(146);
    expect(layoutCityLabels(labels, 390, 440)).toEqual(positioned);
  });
});

describe('3D renderer lifecycle and native controls', () => {
  it('is lazy and can reset/dispose repeatedly without a DOM or callback', () => {
    const unavailable = vi.fn(), renderer = create3dCityRenderer(unavailable);
    renderer.zoomCamera('in'); renderer.resetCamera(); renderer.dispose(); renderer.zoomCamera('out'); renderer.dispose(); renderer.render(view());
    expect(harness.engines).toHaveLength(0); expect(unavailable).not.toHaveBeenCalled();
  });

  it('mounts actual original geometry, caches dynamic updates, localizes controls and releases every resource', () => {
    const { host, engine, renderer, unavailable, select, trainSelect, window, observers } = mountHarness();
    try {
      renderer.render(view()); engine.frame?.();
      const scene = engine.scenes[0];
      expect(scene.meshes.length).toBeGreaterThan(60);
      expect(scene.meshes.filter(mesh => mesh.name.startsWith('rush-source')).length).toBeLessThanOrEqual(6);
      expect(scene.meshes.filter(mesh => mesh.name.startsWith('rush-island'))).toHaveLength(2);
      expect(engine.requestedScaling).toBeCloseTo(1 / 1.5);
      const meshCount = scene.meshes.length, geometries = new Set(scene.geometries), materialCount = scene.materials.length;
      const people = scene.meshes.filter(mesh => mesh.name.startsWith('rush-passenger'));
      expect(people).toHaveLength(160); expect(people.every(mesh => mesh.getClassName() === 'InstancedMesh')).toBe(true);
      expect(scene.meshes.filter(mesh => mesh.name.startsWith('rush-crowd-source'))).toHaveLength(4);
      const controls = host.all().filter(node => node.tagName === 'button'), station = controls.find(node => node.dataset.station === 'market')!;
      expect(controls.filter(node => node.dataset.station)).toHaveLength(10);
      expect(station.attributes.get('aria-pressed')).toBe('true');
      expect(station.attributes.get('aria-label')).toBe(view().stations.find(s => s.id === 'market')!.accessibleName);
      const wrapper = host.children[0]; wrapper.emit('click', { target: station }); expect(select).toHaveBeenCalledWith('market');
      const train = controls.find(node => node.dataset.train)!; wrapper.emit('click', { target: train }); expect(trainSelect).toHaveBeenCalledWith(Number(train.dataset.train));
      renderer.render(view('zh-CN')); engine.frame?.();
      expect(station.children[0].textContent).toBe('集市站');
      expect(scene.meshes.length).toBe(meshCount); expect(new Set(scene.geometries)).toEqual(geometries); expect(scene.materials).toHaveLength(materialCount);
      expect(train.attributes.get('aria-label')).toContain('查看车厢');
      const changed = { ...view(), stations: view().stations.map(s => ({ ...s, selected: s.id === 'airport', helped: true, waiting: 25 })) };
      renderer.render(changed); engine.frame?.();
      expect(station.className).toContain('is-helped'); expect(station.className).toContain('is-busy');
      expect(scene.meshes.length).toBe(meshCount);
      const roots = scene.transformNodes.filter(node => node.name.startsWith('rush-train:'));
      const initialPose = cityTrainPose(view().trains[0]); expect(roots[0].position.x).toBeCloseTo(initialPose.x);
      renderer.render({ ...view(), trains: view().trains.map(train => ({ ...train, position: { x: 0.5, y: 0.5 }, moving: false })) }); engine.frame?.();
      const frozen = roots[0].position.clone(); engine.frame?.(); expect(roots[0].position.equals(frozen)).toBe(true);
      renderer.render({ ...view(), lines: view().lines.map(line => ({ ...line, color: '#775948' })), trains: view().trains.map(train => ({ ...train, spare: !train.spare })) }); engine.frame?.();
      const recoloredPose = cityTrainPose(view().trains[0]); expect(roots[0].position.x).toBeCloseTo(recoloredPose.x);
      for (const mesh of roots[0].getChildMeshes()) {
        mesh.computeWorldMatrix(true);
        const center = mesh.getBoundingInfo().boundingBox.centerWorld;
        expect(Vector3.Distance(center, roots[0].position)).toBeLessThan(1.4);
      }
      const camera = scene.activeCamera as ArcRotateCamera; camera.alpha = -1.8; camera.beta = 1; renderer.resetCamera();
      expect(camera.alpha).toBe(CITY_CAMERA.alpha); expect(camera.beta).toBe(CITY_CAMERA.beta);
      expect(unavailable).not.toHaveBeenCalled();
      const nodes = host.all(); renderer.dispose(); renderer.dispose();
      expect(host.children).toHaveLength(0); expect(engine.scenes).toHaveLength(0); expect(engine.releases).toBe(1); expect(engine.frame).toBeUndefined();
      expect(observers.every(observer => observer.disconnected)).toBe(true);
      for (const node of [...nodes, window]) for (const listeners of node.listeners.values()) expect(listeners.size).toBe(0);
    } finally { renderer.dispose(); }
  });

  it('keeps batched train triangles valid without corrupting shared scenery primitives', () => {
    const { renderer, engine, trainSelect } = mountHarness();
    try {
      const initial = view(); renderer.render(initial); engine.frame?.();
      const scene = engine.scenes[0], active = new Set(scene.getActiveMeshes().data);
      for (const train of initial.trains) {
        const root = scene.getTransformNodeByName(`rush-train:${train.id}`)!;
        const parts = root.getChildMeshes();
        expect(parts).toHaveLength(6);
        const color = initial.lines.find(line => line.id === train.line)!.color.toLowerCase();
        const body = parts.find(mesh => (mesh.material as StandardMaterial).diffuseColor.toHexString().toLowerCase() === color)!;
        expect(body.getTotalVertices()).toBe(72); expect(body.getTotalIndices()).toBe(108);
        for (const mesh of parts) {
          expect(mesh.isEnabled() && mesh.isVisible && active.has(mesh)).toBe(true);
          expect(mesh.isPickable).toBe(true); expect(mesh.metadata).toEqual({ train: train.id });
          expect(mesh.getIndices()!.every(index => Number.isInteger(index) && index >= 0 && index < mesh.getTotalVertices())).toBe(true);
        }
        const hit = scene.pickWithRay(new Ray(root.position.add(new Vector3(0, 3, 0)), Vector3.Down()), mesh => mesh.metadata?.train === train.id);
        expect(hit?.hit).toBe(true); expect(hit?.pickedMesh?.metadata.train).toBe(train.id);
      }
      for (const mesh of scene.meshes.filter(mesh => mesh.name.startsWith('rush-source'))) {
        expect(mesh.getIndices()!.every(index => index >= 0 && index < mesh.getTotalVertices())).toBe(true);
      }
      expect(trainSelect).not.toHaveBeenCalled();
    } finally { renderer.dispose(); }
  });

  it('moves actual carriage meshes with the running snapshot and holds them steady while paused', () => {
    const { renderer, engine } = mountHarness();
    try {
      const game = createGame(); game.phase = 'playing';
      const options = { language: 'en' as const, layout: COASTAL_LAYOUT, selected: 'market', interpolationSeconds: 0, animate: true };
      const render = (interpolationSeconds = 0, animate = true) => {
        const snapshot = createCitySnapshot(game, { ...options, interpolationSeconds, animate });
        renderer.render(snapshot); engine.frame?.(); return snapshot;
      };
      render();
      const scene = engine.scenes[0], geometries = new Set(scene.geometries);
      const carriages = game.trains.map(train => scene.getTransformNodeByName(`rush-train:${train.id}`)!.getChildMeshes());
      const initial = carriages.map(parts => parts[0].getBoundingInfo().boundingBox.centerWorld.clone());
      for (let i = 0; i < 6; i++) step(game);
      const running = render(0.5);
      running.trains.forEach((train, index) => {
        const pose = cityTrainPose(train), root = scene.getTransformNodeByName(`rush-train:${train.id}`)!;
        expect(Vector3.Distance(carriages[index][0].getBoundingInfo().boundingBox.centerWorld, initial[index])).toBeGreaterThan(0.1);
        expect(root.position.equalsWithEpsilon(new Vector3(pose.x, pose.y, pose.z))).toBe(true);
        expect(root.rotation.y).toBeCloseTo(pose.yaw);
        expect(root.getChildMeshes()).toEqual(carriages[index]);
      });
      expect(new Set(scene.geometries)).toEqual(geometries);
      render(0, false);
      const paused = carriages.map(parts => parts.map(mesh => mesh.getWorldMatrix().clone()));
      for (let frame = 0; frame < 5; frame++) render(0.9, false);
      carriages.forEach((parts, train) => parts.forEach((mesh, part) => expect(mesh.getWorldMatrix().equals(paused[train][part])).toBe(true)));
      expect(dispatch(game, 'market', 'coral')).toBe(true);
      render();
      const relief = scene.getTransformNodeByName(`rush-train:${game.trains.at(-1)!.id}`)!;
      expect(relief.getChildMeshes()).toHaveLength(6);
      for (const mesh of relief.getChildMeshes()) {
        expect(mesh.getIndices()!.every(index => index >= 0 && index < mesh.getTotalVertices())).toBe(true);
        expect(scene.getActiveMeshes().data).toContain(mesh);
      }
    } finally { renderer.dispose(); }
  });

  it('zooms without changing selection or snapshots and preserves magnification through resizing', () => {
    const { host, renderer, engine, window, select, trainSelect } = mountHarness();
    try {
      renderer.render(view()); engine.frame?.();
      const camera = engine.scenes[0].activeCamera as ArcRotateCamera, radius = camera.radius;
      const canvas = host.all().find(node => node.tagName === 'canvas')!;
      const meshes = engine.scenes[0].meshes.length;
      renderer.zoomCamera('in'); engine.frame?.(); expect(camera.radius).toBeCloseTo(radius / 1.2);
      canvas.clientWidth = 820; canvas.clientHeight = 480; window.emit('resize', {}); engine.frame?.();
      expect(camera.radius).toBeCloseTo(cityCameraRadius(820, 480) / 1.2);
      expect(engine.scenes[0].meshes.length).toBe(meshes); expect(select).not.toHaveBeenCalled(); expect(trainSelect).not.toHaveBeenCalled();
      renderer.resetCamera(); engine.frame?.(); expect(camera.radius).toBeCloseTo(cityCameraRadius(820, 480));
      expect(camera.alpha).toBe(CITY_CAMERA.alpha); expect(camera.beta).toBe(CITY_CAMERA.beta);
      const labels = host.all().filter(node => node.dataset.station), framedLabels = labels.filter(node => !node.hidden).length;
      for (let i = 0; i < 30; i++) renderer.zoomCamera('in'); engine.frame?.(); expect(camera.radius).toBeCloseTo(camera.lowerRadiusLimit!);
      expect(labels.filter(node => !node.hidden).length).toBeLessThan(framedLabels);
      renderer.resetCamera(); engine.frame?.(); expect(labels.filter(node => !node.hidden)).toHaveLength(framedLabels);
      renderer.dispose(); renderer.zoomCamera('out');
    } finally { renderer.dispose(); }
  });

  it('rejects drag, multitouch and cancelled synthetic clicks on projected controls but keeps keyboard activation', () => {
    const { host, renderer, engine, window, select } = mountHarness();
    try {
      renderer.render(view()); engine.frame?.();
      const wrapper = host.children[0], station = host.all().find(node => node.dataset.station === 'market')!;
      const event = { pointerId: 1, clientX: 80, clientY: 90, timeStamp: 100, target: station, button: 0 };
      wrapper.emit('pointerdown', event); wrapper.emit('pointermove', { ...event, clientX: 100 });
      window.emit('pointerup', { ...event, timeStamp: 140, clientX: 100 });
      wrapper.emit('click', { target: station, timeStamp: 141, detail: 1 }); expect(select).not.toHaveBeenCalled();
      wrapper.emit('click', { target: station, timeStamp: 142, detail: 0 }); expect(select).toHaveBeenCalledTimes(1); select.mockClear();
      wrapper.emit('pointerdown', { ...event, timeStamp: 1000 }); wrapper.emit('pointerdown', { ...event, pointerId: 2 });
      window.emit('pointerup', { ...event, pointerId: 2, timeStamp: 1100 }); window.emit('pointerup', { ...event, timeStamp: 1110 });
      wrapper.emit('click', { target: station, timeStamp: 1111, detail: 1 }); expect(select).not.toHaveBeenCalled();
      wrapper.emit('pointerdown', { ...event, timeStamp: 2000 }); window.emit('pointercancel', { ...event, timeStamp: 2010 });
      wrapper.emit('click', { target: station, timeStamp: 2011, detail: 1 }); expect(select).not.toHaveBeenCalled();
      wrapper.emit('pointerdown', { ...event, timeStamp: 2020 }); window.emit('pointerup', { ...event, timeStamp: 2050 });
      wrapper.emit('click', { target: station, timeStamp: 2051, detail: 1 }); expect(select).toHaveBeenCalledTimes(1);
    } finally { renderer.dispose(); }
  });

  it('avoids per-frame DOM writes for unchanged controls and bounds the crowded scene draw groups', () => {
    const { host, renderer, engine } = mountHarness();
    try {
      renderer.render(view()); engine.frame?.();
      const initial = view(), scene = engine.scenes[0];
      const writes = host.all().map(node => vi.spyOn(node, 'setAttribute'));
      for (let i = 0; i < 12; i++) {
        renderer.render({ ...initial, trains: initial.trains.map(train => ({ ...train, position: { x: train.position.x + i * 0.00001, y: train.position.y } })) });
        engine.frame?.();
      }
      expect(writes.every(write => write.mock.calls.length === 0)).toBe(true);
      renderer.render({ ...initial, stations: initial.stations.map(station => ({ ...station, waiting: 99 })) }); engine.frame?.();
      const visible = scene.meshes.filter(mesh => mesh.isEnabled() && mesh.isVisible && mesh.getClassName() !== 'InstancedMesh');
      const crowdSources = scene.meshes.filter(mesh => mesh.name.startsWith('rush-crowd-source'));
      // Hardware instancing adds four shared passenger draws, rather than 160 per-person draws.
      expect(visible.length + crowdSources.length).toBeLessThan(140);
      expect(crowdSources.every(mesh => mesh instanceof Mesh && mesh.instances.length > 0)).toBe(true);
    } finally { renderer.dispose(); }
  });

  it('throws after cleaning partial initialization and never asks for reentrant fallback', () => {
    const { renderer, host } = mountHarness(); renderer.dispose(); harness.failInit = true;
    expect(() => renderer.mount(host as unknown as HTMLElement, () => {})).toThrow('WebGL unavailable');
    expect(host.children).toHaveLength(0); renderer.dispose();
  });

  it('throws and releases the engine if the first scene frame fails during mount', async () => {
    const { renderer, host, unavailable } = mountHarness(); renderer.dispose();
    vi.spyOn(Scene.prototype, 'render').mockImplementation(() => { throw new Error('first frame unavailable'); });
    expect(() => renderer.mount(host as unknown as HTMLElement, () => {})).toThrow('first frame unavailable');
    const engine = harness.engines.at(-1) as TestEngine;
    expect(host.children).toHaveLength(0); expect(engine.scenes).toHaveLength(0); expect(engine.releases).toBe(1);
    await Promise.resolve(); expect(unavailable).not.toHaveBeenCalled();
  });

  it('defers snapshot-update fallback so its owner can dispose without recursive rendering', async () => {
    const { renderer, host, unavailable, engine } = mountHarness();
    vi.spyOn(host.children[0], 'setAttribute').mockImplementation(() => { throw new Error('update unavailable'); });
    unavailable.mockImplementation(() => renderer.dispose());
    renderer.render(view()); renderer.render(view());
    expect(unavailable).not.toHaveBeenCalled(); expect(engine.frame).toBeUndefined();
    await Promise.resolve(); expect(unavailable).toHaveBeenCalledTimes(1); expect(host.children).toHaveLength(0); expect(engine.releases).toBe(1);
  });

  it('calls context-loss fallback once, after the handler, and allows owner disposal safely', async () => {
    const { host, renderer, engine, unavailable } = mountHarness(); renderer.render(view()); engine.frame?.();
    const canvas = host.all().find(node => node.tagName === 'canvas')!, preventDefault = vi.fn();
    unavailable.mockImplementation(() => renderer.dispose());
    canvas.emit('webglcontextlost', { preventDefault }); canvas.emit('webglcontextlost', { preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(2); expect(unavailable).not.toHaveBeenCalled(); expect(engine.frame).toBeUndefined();
    await Promise.resolve(); expect(unavailable).toHaveBeenCalledTimes(1); expect(host.children).toHaveLength(0);
    canvas.emit('webglcontextlost', { preventDefault }); await Promise.resolve(); expect(unavailable).toHaveBeenCalledTimes(1);
  });

  it('contains frame failures and suppresses stale fallback after explicit disposal', async () => {
    const { renderer, engine, unavailable } = mountHarness();
    const scene = engine.scenes[0]; vi.spyOn(scene, 'render').mockImplementation(() => { throw new Error('lost GPU'); });
    engine.frame?.(); expect(unavailable).not.toHaveBeenCalled();
    await Promise.resolve(); expect(unavailable).toHaveBeenCalledTimes(1);
    renderer.dispose();
    const next = mountHarness(), canvas = next.host.all().find(node => node.tagName === 'canvas')!;
    canvas.emit('webglcontextlost', { preventDefault: () => {} }); next.renderer.dispose(); await Promise.resolve();
    expect(next.unavailable).not.toHaveBeenCalled();
  });

  it('removes obsolete trains and rebuilds changed geometry without duplicating DOM controls', () => {
    const { host, renderer, engine } = mountHarness();
    try {
      renderer.render(view()); engine.frame?.();
      renderer.render({ ...view(), trains: [] }); engine.frame?.();
      expect(host.all().filter(node => node.dataset.train)).toHaveLength(0);
      expect(engine.scenes[0].transformNodes.filter(node => node.name.startsWith('rush-train:'))).toHaveLength(0);
      renderer.render({ ...view(), stations: view().stations.map(station => ({ ...station, position: { ...station.position, x: station.position.x + 0.01 } })) }); engine.frame?.();
      expect(host.all().filter(node => node.dataset.station)).toHaveLength(10);
      expect(engine.scenes[0].transformNodes.filter(node => node.name.startsWith('rush-station:'))).toHaveLength(10);
    } finally { renderer.dispose(); }
  });
});
