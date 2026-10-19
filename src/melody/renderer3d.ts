import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import type { JourneyRenderer, JourneySnapshot } from './renderer';

type RendererOptions = {
  onUnavailable?: () => void;
  labels?: { zoomIn: string; zoomOut: string; reset: string };
};
type Stop = { x: number; y: number; label: string; rest: boolean };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));

/** Procedural toy scenery: heights indicate contour, never semitone distance. */
export function createJourney3dRenderer(options: RendererOptions = {}): JourneyRenderer {
  let engine: Engine | undefined;
  let scene: Scene | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let wrapper: HTMLDivElement | undefined;
  let camera: ArcRotateCamera | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let motion: MediaQueryList | undefined;
  let shadow: ShadowGenerator | undefined;
  let route: TransformNode | undefined;
  let stops: Stop[] = [];
  let cars: TransformNode[] = [];
  let signs: Mesh[] = [];
  let signMaterials: StandardMaterial[] = [];
  let fingerprint = '';
  let unavailable = false;
  let latest: JourneySnapshot | undefined;
  const materials = new Map<string, StandardMaterial>();

  const material = (color: string): StandardMaterial => {
    const existing = materials.get(color);
    if (existing) return existing;
    const result = new StandardMaterial(`clay-${color}`, scene!);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor = Color3.Black();
    materials.set(color, result);
    return result;
  };

  const box = (name: string, size: Vector3, at: Vector3, color: string, parent?: TransformNode) => {
    const mesh = CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene!);
    mesh.position.copyFrom(at);
    mesh.material = material(color);
    mesh.parent = parent ?? null;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    shadow?.addShadowCaster(mesh);
    return mesh;
  };

  const pebble = (name: string, at: Vector3, size: Vector3, color: string, parent?: TransformNode) => {
    const mesh = CreateSphere(name, { diameter: 1, segments: 10 }, scene!);
    mesh.position.copyFrom(at);
    mesh.scaling.copyFrom(size);
    mesh.material = material(color);
    mesh.parent = parent ?? null;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    shadow?.addShadowCaster(mesh);
    return mesh;
  };

  const position = (x: number) => {
    if (!stops.length) return new Vector3(x, 1.05, 0);
    let previous = { ...stops[0], x: -7.3 };
    for (const next of [...stops, { ...stops[stops.length - 1], x: 7.3 }]) {
      if (x <= next.x) {
        const fraction = clamp((x - previous.x) / Math.max(0.001, next.x - previous.x), 0, 1);
        return new Vector3(x, previous.y + (next.y - previous.y) * fraction, 0);
      }
      previous = next;
    }
    return new Vector3(x, previous.y, 0);
  };

  const clearRoute = () => {
    for (const mesh of route?.getChildMeshes() ?? []) shadow?.removeShadowCaster(mesh);
    route?.dispose();
    signMaterials.forEach(value => value.dispose(false, true));
    signMaterials = [];
    signs = [];
  };

  const rebuild = (snapshot: JourneySnapshot) => {
    const stations = snapshot.stations.slice(0, 16).map(station => ({
      step: clamp(station.step, -16, 24), label: String(station.label).slice(0, 32), rest: Boolean(station.rest),
      startBeat: clamp(station.startBeat, 0, 1024), durationBeats: clamp(station.durationBeats, 0.0625, 64),
    }));
    const key = JSON.stringify(stations);
    if (key === fingerprint) return;
    fingerprint = key;
    clearRoute();
    route = new TransformNode('melodic-contour', scene!);
    const extent = Math.max(1, ...stations.map(station => station.startBeat + station.durationBeats));
    const low = Math.min(0, ...stations.filter(station => !station.rest).map(station => station.step));
    const high = Math.max(8, ...stations.filter(station => !station.rest).map(station => station.step));
    let previousY = 1.05;
    stops = stations.map(station => {
      const y = station.rest ? previousY : 0.75 + (station.step - low) / (high - low) * 1.6;
      previousY = y;
      return { x: -5.6 + station.startBeat / extent * 11.5, y, label: station.label, rest: station.rest };
    });
    const points = [position(-7.3), ...stops.map(stop => new Vector3(stop.x, stop.y, 0)), position(7.3)];
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1];
      const end = points[index];
      const delta = end.subtract(start);
      if (delta.lengthSquared() < 0.000001) continue;
      const deck = box('raised-garden-route', new Vector3(delta.length(), 0.16, 0.8), start.add(end).scale(0.5).add(new Vector3(0, -0.12, 0)), '#d8d4bd', route);
      deck.rotation.z = Math.atan2(delta.y, delta.x);
      for (const z of [-0.24, 0.24]) {
        const rail = box('rail', new Vector3(delta.length(), 0.055, 0.045), start.add(end).scale(0.5).add(new Vector3(0, 0.01, z)), '#284d47', route);
        rail.rotation.z = deck.rotation.z;
      }
    }
    for (let x = -7.2; x < 7.3; x += 0.34) box('sleeper', new Vector3(0.1, 0.055, 0.69), position(x).add(new Vector3(0, -0.035, 0)), '#aaa88c', route);
    stops.forEach((stop, index) => {
      const platform = box('station-platform', new Vector3(0.9, 0.18, 0.62), new Vector3(stop.x, stop.y - 0.09, 0.76), '#f5f3eb', route);
      for (const x of [-0.32, 0.32]) box('platform-pier', new Vector3(0.09, stop.y - 0.15, 0.09), new Vector3(stop.x + x, (stop.y - 0.15) / 2, 0.76), '#c8c4a9', route);
      box('sign-post', new Vector3(0.045, 0.64, 0.045), new Vector3(stop.x, stop.y + 0.34, 0.96), '#284d47', route);
      box('sign-frame', new Vector3(0.7, 0.39, 0.065), new Vector3(stop.x, stop.y + 0.76, 0.96), stop.rest ? '#739b80' : '#284d47', route);
      const texture = new DynamicTexture(`station-label-${index}`, { width: 256, height: 128 }, scene!, false);
      const context = texture.getContext() as CanvasRenderingContext2D;
      context.fillStyle = '#f5f3eb';
      context.fillRect(0, 0, 256, 128);
      context.fillStyle = '#284d47';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = 'bold 54px system-ui, sans-serif';
      context.fillText(stop.rest ? '—' : stop.label, 128, 64, 228);
      texture.update();
      const faceMaterial = new StandardMaterial(`station-ink-${index}`, scene!);
      faceMaterial.diffuseTexture = texture;
      faceMaterial.emissiveColor = new Color3(0.22, 0.22, 0.22);
      faceMaterial.specularColor = Color3.Black();
      faceMaterial.backFaceCulling = false;
      signMaterials.push(faceMaterial);
      const face = CreatePlane('station-label', { width: 0.63, height: 0.32, sideOrientation: Mesh.DOUBLESIDE }, scene!);
      face.position.set(stop.x, stop.y + 0.76, 0.921);
      face.material = faceMaterial;
      face.parent = route!;
      face.isPickable = false;
      signs.push(platform);
      pebble('station-planter', new Vector3(stop.x + 0.33, stop.y + 0.12, 0.76), new Vector3(0.17, 0.27, 0.17), '#739b80', route);
    });
  };

  const render = (snapshot: JourneySnapshot) => {
    snapshot = { ...snapshot, stations: snapshot.stations.slice(0, 16).map(station => ({ ...station })) };
    latest = snapshot;
    if (!scene || unavailable) return;
    try {
      rebuild(snapshot);
      const index = Math.trunc(clamp(snapshot.activeIndex, -1, stops.length - 1));
      const current = stops[index];
      const next = stops[index + 1];
      const fraction = motion?.matches ? 0 : clamp(snapshot.progress, 0, 1);
      const x = current ? current.x + ((next?.x ?? 7) - current.x) * fraction : -5.9;
      cars.forEach((car, carIndex) => {
        const at = position(x - carIndex * 0.78);
        car.position.copyFrom(at);
        const delta = position(at.x + 0.02).subtract(position(at.x - 0.02));
        car.rotation.z = Math.atan2(delta.y, delta.x);
      });
      signs.forEach((sign, signIndex) => { sign.material = material(signIndex === index ? '#a9cfca' : '#f5f3eb'); });
    } catch { fail(); }
  };

  const motionChanged = () => { if (latest) render(latest); };
  let framingRadius = 17;
  const resize = () => {
    if (!engine || !wrapper || !camera) return;
    engine.resize();
    const aspect = Math.max(0.5, wrapper.clientWidth / Math.max(1, wrapper.clientHeight));
    const nextFramingRadius = Math.max(8, 20 / aspect);
    const zoomRatio = camera.radius / framingRadius;
    framingRadius = nextFramingRadius;
    camera.lowerRadiusLimit = Math.max(5.5, framingRadius * 0.65);
    camera.upperRadiusLimit = framingRadius * 2.5;
    camera.radius = clamp(framingRadius * zoomRatio, camera.lowerRadiusLimit, camera.upperRadiusLimit);
  };
  const reset = () => {
    if (!camera || !wrapper) return;
    resize();
    camera.setTarget(new Vector3(0, 0.8, 0));
    camera.alpha = -Math.PI / 2;
    camera.beta = 1.12;
    camera.inertialAlphaOffset = 0;
    camera.inertialBetaOffset = 0;
    camera.inertialRadiusOffset = 0;
    camera.radius = framingRadius;
  };
  const contextLost = (event: Event) => { event.preventDefault(); fail(); };
  const dispose = () => {
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    window.removeEventListener('resize', resize);
    motion?.removeEventListener('change', motionChanged);
    motion = undefined;
    canvas?.removeEventListener('webglcontextlost', contextLost);
    engine?.stopRenderLoop();
    camera?.detachControl();
    clearRoute();
    shadow?.dispose();
    scene?.dispose();
    engine?.dispose();
    wrapper?.remove();
    engine = undefined;
    scene = undefined;
    canvas = undefined;
    wrapper = undefined;
    camera = undefined;
    route = undefined;
    shadow = undefined;
    cars = [];
    stops = [];
    materials.clear();
    fingerprint = '';
    latest = undefined;
  };
  const fail = () => {
    if (unavailable) return;
    unavailable = true;
    // Stop immediately; the owner swaps views using its retained game snapshot.
    dispose();
    options.onUnavailable?.();
  };

  return {
    mount(host) {
      dispose();
      unavailable = false;
      if (!Engine.isSupported()) throw new Error('WebGL is unavailable');
      try {
        wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#f5f3eb;';
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.tabIndex = -1;
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;outline:none;';
        wrapper.append(canvas);
        host.append(wrapper);
        canvas.addEventListener('webglcontextlost', contextLost);
        engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: false });
        engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
        engine.onEffectErrorObservable.add(() => fail());
        scene = new Scene(engine);
        scene.clearColor = Color4.FromHexString('#f5f3ebff');
        camera = new ArcRotateCamera('garden-camera', -Math.PI / 2, 1.12, 17, new Vector3(0, 0.8, 0), scene);
        camera.lowerAlphaLimit = -Math.PI / 2 - 0.55;
        camera.upperAlphaLimit = -Math.PI / 2 + 0.55;
        camera.lowerBetaLimit = 0.65;
        camera.upperBetaLimit = 1.35;
        camera.panningSensibility = 0;
        camera.wheelPrecision = 55;
        camera.pinchPrecision = 100;
        camera.attachControl(canvas, true);
        camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
        new HemisphericLight('soft-sky', new Vector3(0, 1, 0), scene).intensity = 0.85;
        const sunlight = new DirectionalLight('afternoon-sun', new Vector3(-0.6, -1.4, 0.5), scene);
        sunlight.position.set(5, 10, -5);
        sunlight.intensity = 1.1;
        shadow = new ShadowGenerator(512, sunlight);
        shadow.useBlurExponentialShadowMap = true;
        shadow.blurKernel = 12;
        shadow.setDarkness(0.18);
        pebble('clay-island', new Vector3(0, -0.4, 0), new Vector3(16.7, 0.9, 6.8), '#a9cfca');
        pebble('sunlit-lawn', new Vector3(0, -0.05, 0), new Vector3(16.3, 0.35, 6.3), '#c7d6b8');
        for (const [x, z, size] of [[-6.8, -1.5, 0.8], [-4.4, 2, 0.65], [-2.3, -1.8, 1], [1.2, -2, 0.7], [3.8, 1.9, 0.85], [6.4, -1.5, 0.9]]) {
          box('tree-trunk', new Vector3(0.12, size, 0.12), new Vector3(x, size / 2, z), '#857c58');
          pebble('tree-crown', new Vector3(x, size + 0.3, z), new Vector3(size * 0.8, size * 1.2, size * 0.8), '#739b80');
          pebble('low-shrub', new Vector3(x + 0.5, 0.2, z + 0.25), new Vector3(0.5, 0.4, 0.4), '#a9cfca');
          for (let flower = 0; flower < 3; flower++) pebble('coral-flower', new Vector3(x + 0.4 + flower * 0.13, 0.13, z + 0.6), new Vector3(0.09, 0.12, 0.09), '#ad4938');
        }
        const shelter = new TransformNode('welcome-shelter', scene);
        box('shelter-platform', new Vector3(1.2, 0.16, 0.85), new Vector3(-6, 0.12, -1.35), '#f5f3eb', shelter);
        for (const x of [-6.45, -5.55]) box('shelter-column', new Vector3(0.07, 0.9, 0.07), new Vector3(x, 0.62, -1.55), '#284d47', shelter);
        box('shelter-roof', new Vector3(1.4, 0.15, 1), new Vector3(-6, 1.15, -1.35), '#ad4938', shelter);
        box('station-bench', new Vector3(0.7, 0.12, 0.24), new Vector3(-6, 0.37, -1.55), '#e7cb83', shelter);
        cars = [0, 1, 2].map(index => {
          const car = new TransformNode(`car-${index}`, scene!);
          const color = index === 0 ? '#ad4938' : '#a9cfca';
          pebble('rounded-car-body', new Vector3(-0.28, 0.27, 0), new Vector3(0.72, 0.48, 0.46), color, car);
          box('car-body', new Vector3(0.54, 0.32, 0.44), new Vector3(-0.28, 0.29, 0), color, car);
          pebble('car-roof', new Vector3(-0.28, 0.49, 0), new Vector3(0.77, 0.16, 0.5), '#284d47', car);
          for (const x of [-0.45, -0.2]) for (const z of [-0.226, 0.226]) box('cream-window', new Vector3(0.14, 0.18, 0.015), new Vector3(x, 0.33, z), '#f5f3eb', car);
          for (const x of [-0.49, -0.09]) for (const z of [-0.24, 0.24]) {
            const wheel = CreateCylinder('wheel', { diameter: 0.17, height: 0.07, tessellation: 12 }, scene!);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(x, 0.1, z);
            wheel.parent = car;
            wheel.material = material('#284d47');
            wheel.isPickable = false;
          }
          if (index === 0) pebble('headlamp', new Vector3(0.075, 0.27, 0), new Vector3(0.07, 0.09, 0.18), '#e7cb83', car);
          box('coupler', new Vector3(0.15, 0.055, 0.08), new Vector3(-0.73, 0.14, 0), '#284d47', car);
          return car;
        });
        const controls = document.createElement('div');
        controls.style.cssText = 'position:absolute;right:8px;bottom:8px;display:flex;gap:4px;';
        const labels = options.labels ?? { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset view' };
        for (const [text, label, action] of [
          ['+', labels.zoomIn, () => { if (camera) camera.radius = clamp(camera.radius * 0.85, camera.lowerRadiusLimit!, camera.upperRadiusLimit!); }],
          ['−', labels.zoomOut, () => { if (camera) camera.radius = clamp(camera.radius / 0.85, camera.lowerRadiusLimit!, camera.upperRadiusLimit!); }],
          ['↺', labels.reset, reset],
        ] as const) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = text;
          button.setAttribute('aria-label', label);
          button.title = label;
          button.style.cssText = 'width:40px;height:40px;border:1px solid #284d47;border-radius:8px;background:#f5f3eb;color:#284d47;font:600 22px system-ui;cursor:pointer;';
          button.addEventListener('click', action);
          controls.append(button);
        }
        wrapper.append(controls);
        motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        motion.addEventListener('change', motionChanged);
        if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(wrapper); }
        window.addEventListener('resize', resize);
        reset();
        render({ stations: [], activeIndex: -1, progress: 0, totalBeats: 0, playing: false });
        engine?.runRenderLoop(() => {
          if (!scene || unavailable) return;
          try { scene.render(); } catch { fail(); }
        });
      } catch (error) {
        dispose();
        throw error;
      }
    },
    render,
    dispose,
  };
}
