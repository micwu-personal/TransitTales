import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CONTINENTS, cosmicRandom, universeScene, type CosmicScene } from './renderer';
import { FLIGHT_STARS, dopplerTint, flightFrame, flightStar, type FlightFrame } from './flight';
import { freezeSnapshot } from './view';
import { COSMIC_KNOTS, cosmicKnot, routeFrame, type RouteFrame, type RouteObject } from './route';
import type { UniverseRenderer, UniverseSnapshot } from './view';

type Star = { position: Vector3; size: number; color: Color3 };
type World = { scene: Scene; camera: ArcRotateCamera; root: TransformNode };
type Layer = { root: TransformNode; meshes: Mesh[]; field: boolean };
type RenderSnapshot = UniverseSnapshot & {
  effectTime?: number; coordinateView?: boolean;
  inspection?: { yaw: number; pitch: number; roll: number; offset: readonly [number, number, number] };
};
const bounded = (value: number | undefined, limit: number) => Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value!)) : 0;
const ivory = Color3.FromHexString('#fff0cf');
const blue = Color3.FromHexString('#b2d6e7');
const TAU = Math.PI * 2;

function material(scene: Scene, name: string, color: string, luminous = false, alpha = 1): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(color);
  result.specularColor = luminous ? Color3.Black() : new Color3(.12, .15, .17);
  result.emissiveColor = luminous ? result.diffuseColor : result.diffuseColor.scale(.05);
  result.disableLighting = luminous;
  result.alpha = alpha;
  return result;
}
function orb(scene: Scene, root: TransformNode, name: string, position: Vector3, radius: number, mat: StandardMaterial, segments = 40): Mesh {
  const mesh = CreateSphere(name, { diameter: radius * 2, segments }, scene);
  mesh.position = position; mesh.parent = root; mesh.material = mat; mesh.isPickable = false;
  return mesh;
}

// One bounded, vertex-colored mesh: tiny solid stars, not hundreds of material/draw-call pairs.
function starMesh(scene: Scene, root: TransformNode, name: string, stars: Star[]): Mesh {
  const mesh = new Mesh(name, scene), data = new VertexData();
  const positions: number[] = [], indices: number[] = [], colors: number[] = [];
  const vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  stars.forEach(({ position, size, color }, i) => {
    for (const [x, y, z] of vertices) { positions.push(position.x + x * size, position.y + y * size, position.z + z * size); colors.push(color.r, color.g, color.b, 1); }
    for (const index of [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]) indices.push(i * 4 + index);
  });
  data.positions = positions; data.indices = indices; data.colors = colors;
  data.applyToMesh(mesh); mesh.parent = root; mesh.isPickable = false;
  const mat = material(scene, `${name}-light`, '#ffffff', true); mat.backFaceCulling = false; mesh.material = mat;
  return mesh;
}
function textured(scene: Scene, kind: 'earth' | 'moon' | 'rock' | 'gas' | 'ring' | 'ice' | 'sun' | 'giant' | 'scorched', destinationId = ''): StandardMaterial {
  const luminous = kind === 'sun' || kind === 'giant';
  const mat = material(scene, `${kind}-surface`, '#ffffff', luminous);
  const texture = new DynamicTexture(`${kind}-original-map`, { width: 512, height: 256 }, scene, false);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  const random = cosmicRandom(62), w = 512, h = 256;
  const colors = { earth: '#287cb2', moon: '#bab7ab', rock: '#b48063', gas: '#e0c39b', ring: '#d9c49f', ice: '#7cbac8', sun: '#ffc46e', giant: '#d47b4e', scorched: '#775448' };
  const variants: Readonly<Record<string, string>> = { mercury: '#ada99d', venus: '#dcc99e', mars: '#bc7355', neptune: '#4874b8', europa: '#cfbb98', titan: '#d4a364', pluto: '#c9b4a3', sirius: '#d6e8f5', 'proxima-b': '#817d8b' };
  context.fillStyle = variants[destinationId] ?? colors[kind]; context.fillRect(0, 0, w, h);
  if (kind === 'earth' || kind === 'scorched') {
    context.save(); context.scale(w / 1000, h / 620);
    context.fillStyle = kind === 'earth' ? '#8ca586' : '#6c5541'; context.strokeStyle = '#c5b78f'; context.lineWidth = 3;
    for (const coastline of CONTINENTS) { const path = new Path2D(coastline); context.fill(path); context.stroke(path); }
    context.restore();
    context.fillStyle = kind === 'earth' ? '#e1eee0' : '#ab7856'; context.fillRect(0, 0, w, 14); context.fillRect(0, h - 16, w, 16);
  }
  if (kind === 'gas' || kind === 'ring' || kind === 'ice') {
    for (let row = 0; row < 38; row++) {
      const y = row / 38 * h;
      context.fillStyle = (kind === 'ice' ? (destinationId === 'neptune' ? ['#7194d1', '#2d5fa4', '#5982c3'] : ['#aad8d7', '#5b9cb4', '#83b9c2']) : ['#f2dec0', '#bb9374', '#d2ad8a', '#a78470'])[row % (kind === 'ice' ? 3 : 4)];
      context.globalAlpha = kind === 'ice' ? .12 : .42;
      context.beginPath(); context.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) context.lineTo(x, y + Math.sin(x / 92 + row) * 4);
      for (let x = w; x >= 0; x -= 16) context.lineTo(x, y + 7 + Math.sin(x / 92 + row) * 4);
      context.fill();
    }
    context.globalAlpha = 1;
    if (kind === 'gas') { context.fillStyle = '#b2755d'; context.beginPath(); context.ellipse(w * .615, h * .645, w * .047, h * .033, .05, 0, TAU); context.fill(); }
  }
  for (let i = 0; i < (luminous ? 700 : 450); i++) {
    const x = random() * w, y = random() * h, r = .5 + random() * (kind === 'moon' || kind === 'rock' ? 10 : 2.8);
    context.globalAlpha = luminous ? .08 : .065;
    context.fillStyle = i % 2 === 0 ? '#fff1c9' : '#23364b';
    context.beginPath(); context.ellipse(x, y, r, r * .7, 0, 0, TAU); context.fill();
  }
  if (kind === 'earth') {
    context.globalAlpha = .44; context.strokeStyle = '#ffffed'; context.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const x = random() * w, y = h * (.088 + random() * .8); context.lineWidth = 2 + random() * 8; context.beginPath(); context.moveTo(x, y); context.bezierCurveTo(x + 30, y - 10, x + 70, y + 14, x + 115, y - 5); context.stroke(); }
  }
  context.globalAlpha = 1; texture.update(); mat.diffuseTexture = texture;
  if (luminous) mat.emissiveTexture = texture;
  return mat;
}
function atmosphere(scene: Scene, root: TransformNode, position: Vector3, radius: number, color = '#82c5e2', alpha = .12): Mesh {
  const mat = material(scene, 'scattering-shell', color, true, alpha);
  mat.backFaceCulling = false; mat.disableDepthWrite = true;
  const mesh = orb(scene, root, 'atmosphere', position.clone(), radius * 1.035, mat, 40);
  return mesh;
}
function ring(scene: Scene, root: TransformNode, position: Vector3, radius: number, color: string, thickness: number, alpha: number, tilt = .24): Mesh {
  const mesh = CreateTorus('orbital-ring', { diameter: radius * 2, thickness, tessellation: 48 }, scene);
  mesh.parent = root; mesh.position = position; mesh.rotation.z = tilt; mesh.material = material(scene, 'ring-light', color, true, alpha); mesh.isPickable = false;
  return mesh;
}
function tube(scene: Scene, root: TransformNode, name: string, path: Vector3[], radius: number, color: string, alpha = 1): Mesh {
  const mesh = CreateTube(name, { path, radius, tessellation: 8, cap: Mesh.CAP_ALL }, scene);
  mesh.parent = root; mesh.material = material(scene, `${name}-material`, color, true, alpha); mesh.isPickable = false;
  return mesh;
}
function cloudVolumes(scene: Scene, root: TransformNode, count: number, seed: number, spread = 1, colors = ['#bd8887', '#739aad', '#bfa38f']): void {
  const random = cosmicRandom(seed);
  const mats = colors.map((color, i) => { const mat = material(scene, `gas-volume-${i}`, color, true, .065); mat.backFaceCulling = false; mat.disableDepthWrite = true; return mat; });
  for (let i = 0; i < count; i++) {
    const mesh = orb(scene, root, 'diffuse-gas-volume', new Vector3((random() - .5) * 11 * spread, (random() - .5) * 7 * spread, (random() - .5) * 5 * spread), .6 + random() * 1.9, mats[i % mats.length], 12);
    mesh.scaling.set(1.1 + random(), .4 + random() * .6, .6 + random()); mesh.rotation.z = random() * Math.PI;
  }
}
function spiralStars(scene: Scene, root: TransformNode, position: Vector3, radius: number, seed: number, count = 1100, tilt = .22): void {
  const random = cosmicRandom(seed), stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(random()) * radius, a = (i % 4) * Math.PI / 2 + r / radius * 5.8 + (random() - .5) * .45;
    stars.push({ position: new Vector3(Math.cos(a) * r, (random() - .5) * .15, Math.sin(a) * r), size: .008 + random() * .027, color: i % 9 === 0 ? Color3.FromHexString('#cf927e') : i % 3 === 0 ? blue : ivory });
  }
  for (let i = 0; i < 240; i++) {
    const a = random() * TAU, r = Math.pow(random(), 2) * radius * .3;
    stars.push({ position: new Vector3(Math.cos(a) * r, (random() - .5) * radius * .11, Math.sin(a) * r), size: .009 + random() * .023, color: ivory });
  }
  const galaxy = new TransformNode('galaxy-disk', scene); galaxy.parent = root; galaxy.position = position; galaxy.rotation.z = tilt;
  starMesh(scene, galaxy, 'spiral-arms-and-bulge', stars);
  atmosphere(scene, galaxy, Vector3.Zero(), radius * .09, '#ead5a7', .11);
}
function flowParticles(scene: Scene, root: TransformNode, mode: 'infall' | 'jet'): Mesh {
  const count = mode === 'infall' ? 96 : 24;
  const mesh = starMesh(scene, root, `${mode}-particles`, Array.from({ length: count }, (_, i) => ({ position: Vector3.Zero(), size: mode === 'infall' ? .034 : .055, color: i % 3 ? ivory : blue })));
  const positions = new Float32Array(count * 12);
  mesh.setVerticesData(VertexBuffer.PositionKind, positions, true); mesh.alwaysSelectAsActiveMesh = true;
  mesh.metadata = { motion: mode, positions, count, illustration: 'time-compressed representative flow, not tracked matter' };
  return mesh;
}
function jetPair(scene: Scene, root: TransformNode): void {
  const jets = new TransformNode('active-jet-axis', scene); jets.parent = root; jets.rotation.z = -.19;
  for (const direction of [-1, 1]) {
    const mesh = CreateCylinder('illustrative-jet-sheath', { height: 5.4, diameterTop: direction === 1 ? .55 : .09, diameterBottom: direction === 1 ? .09 : .55, tessellation: 12 }, scene);
    mesh.parent = jets; mesh.position.y = direction * 3.45; mesh.material = material(scene, 'jet-sheath', '#86cce9', true, .16); mesh.isPickable = false;
    tube(scene, jets, 'jet-spine', [new Vector3(0, direction * .8, 0), new Vector3(.07, direction * 5.7, .1)], .037, '#e9f7ef', .65);
  }
  flowParticles(scene, jets, 'jet');
}
function accretion(scene: Scene, root: TransformNode, active: boolean, binary = false): Mesh {
  const core = orb(scene, root, 'event-horizon', Vector3.Zero(), 1, material(scene, 'horizon-darkness', '#02050a', true), 24);
  const disk = new TransformNode('accretion-plane', scene); disk.parent = root; disk.rotation.z = -.28;
  for (let i = 0; i < 4; i++) ring(scene, disk, Vector3.Zero(), 1.34 + i * .24, i % 2 ? '#e8a369' : '#ffe1a4', .035, active ? .48 : .13, 0);
  const flow = flowParticles(scene, disk, 'infall'); (flow.material as StandardMaterial).alpha = active ? .9 : .28;
  // A displaced far-side disk and photon ring suggest lensing; no GR ray tracing.
  const photon = ring(scene, root, Vector3.Zero(), 1.065, '#fff0cd', .032, active ? .85 : .45, 0); photon.rotation.x = Math.PI / 2;
  const arc = Array.from({ length: 33 }, (_, i) => { const a = i / 32 * Math.PI; return new Vector3(Math.cos(a) * 2.1, Math.sin(a) * 1.5, .08); });
  tube(scene, root, 'lensed-far-side', arc, .035, '#f5c99a', active ? .65 : .22);
  if (active) jetPair(scene, root);
  if (binary) {
    orb(scene, root, 'accreting-binary-donor', new Vector3(4, .3, 0), 1.12, material(scene, 'hot-donor', '#accfe9', true), 24);
    tube(scene, root, 'binary-mass-transfer', [new Vector3(3, .3, 0), new Vector3(2.5, .1, .45), new Vector3(1.75, 0, .6)], .085, '#f5d9a5', .6);
  }
  return core;
}
function pulsar(scene: Scene, root: TransformNode): Mesh {
  const spin = new TransformNode('spin-axis', scene); spin.parent = root; spin.rotation.z = -.32;
  const core = orb(scene, spin, 'neutron-star', Vector3.Zero(), 1, material(scene, 'neutron-emission', '#d9eef1', true), 24);
  const poles = new TransformNode('oblique-magnetic-axis', scene); poles.parent = spin; poles.rotation.z = .52; poles.metadata = { motion: 'pulsar' };
  for (const sign of [-1, 1]) {
    const beam = CreateCylinder('magnetic-pole-beam', { height: 4.8, diameterTop: sign === 1 ? .9 : .12, diameterBottom: sign === 1 ? .12 : .9, tessellation: 12 }, scene);
    beam.parent = poles; beam.position.y = sign * 3.2; beam.material = material(scene, 'pole-emission', '#a3d0e5', true, .22); beam.isPickable = false;
    tube(scene, poles, 'magnetic-field', Array.from({ length: 33 }, (_, i) => { const a = i / 32 * TAU; return new Vector3(sign * Math.sin(a) * 1.6, Math.cos(a) * 2.5, 0); }), .022, '#91b3c8', .25);
  }
  return core;
}
function updateEffects(root: TransformNode, time: number): void {
  if (root.metadata?.effectTime === time) return;
  root.metadata = { ...root.metadata, effectTime: time, animation: 'time-compressed illustrative activity; not measured rates or galaxy rotation' };
  for (const node of root.getDescendants()) {
    if (node instanceof TransformNode && node.metadata?.motion === 'pulsar') node.rotation.y = time * 1.8;
    if (!(node instanceof Mesh) || !node.metadata?.motion) continue;
    const meta = node.metadata;
    if (meta.motion === 'infall' || meta.motion === 'jet') {
      const tetra = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
      for (let i = 0; i < meta.count; i++) {
        const phase = ((i / meta.count + time * (meta.motion === 'infall' ? .12 : .2)) % 1 + 1) % 1;
        const angle = i * 2.39996 + time * .8 + phase * 5;
        const r = 2.6 - phase * 1.5, sign = i % 2 ? 1 : -1;
        const center = meta.motion === 'infall' ? [Math.cos(angle) * r, .025 * Math.sin(angle * 2), Math.sin(angle) * r] : [Math.sin(i * 3) * phase * .16, sign * (1.1 + phase * 4.7), Math.cos(i * 3) * phase * .16];
        for (let j = 0; j < 4; j++) for (let axis = 0; axis < 3; axis++) meta.positions[i * 12 + j * 3 + axis] = center[axis] + tetra[j][axis] * (meta.motion === 'infall' ? .034 : .055);
      }
      node.updateVerticesData(VertexBuffer.PositionKind, meta.positions, true);
    } else if (meta.motion === 'newborn') {
      node.scaling.setAll(1 + .08 * Math.sin(time * .7 + meta.phase));
    } else if (meta.motion === 'instability') {
      node.scaling.setAll(1 + .04 * Math.sin(time * .5));
      node.rotation.y = .035 * Math.sin(time * .3);
    }
  }
}
function cosmicWeb(scene: Scene, root: TransformNode, speculative: boolean): void {
  const random = cosmicRandom(714), nodes = Array.from({ length: 46 }, () => new Vector3((random() - .5) * 13, (random() - .5) * 7, (random() - .5) * 8));
  const positions: number[] = [], indices: number[] = [];
  const radius = speculative ? .012 : .024;
  nodes.forEach((position, i) => {
    for (let j = i + 1; j < nodes.length; j++) if (Vector3.Distance(position, nodes[j]) < 2.7) {
      const middle = position.add(nodes[j]).scale(.5); middle.y += .16;
      for (const [a, b] of [[position, middle], [middle, nodes[j]]]) {
        const direction = b.subtract(a).normalize();
        const side = Vector3.Cross(direction, Math.abs(direction.y) > .9 ? Vector3.Right() : Vector3.Up()).normalize().scale(radius);
        const up = Vector3.Cross(direction, side).normalize().scale(radius), base = positions.length / 3;
        for (const point of [a.add(side), a.subtract(side), b.add(up), b.subtract(up)]) positions.push(point.x, point.y, point.z);
        for (const vertex of [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]) indices.push(base + vertex);
      }
    }
  });
  const mesh = new Mesh('batched-matter-filaments', scene), data = new VertexData();
  data.positions = positions; data.indices = indices; data.applyToMesh(mesh); mesh.parent = root; mesh.isPickable = false;
  mesh.material = material(scene, 'filament-light', '#899ab4', true, speculative ? .13 : .25);
  starMesh(scene, root, 'galaxy-nodes', nodes.map(position => ({ position, size: .035 + random() * .085, color: ivory.scale(speculative ? .3 : .8) })));
  if (speculative) cloudVolumes(scene, root, 16, 634, 1, ['#8d829a', '#78959d']);
}
function earlyField(scene: Scene, root: TransformNode, kind: CosmicScene): void {
  if (kind === 'hot' || kind === 'plasma-field' || kind === 'cmb') {
    const texture = new DynamicTexture('whole-sky-original-field', { width: 1024, height: 512 }, scene, false);
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.fillStyle = kind === 'hot' ? '#efc292' : kind === 'plasma-field' ? '#b76143' : '#aa8e7e'; context.fillRect(0, 0, 1024, 512);
    const random = cosmicRandom(395);
    for (let i = 0; i < 460; i++) {
      const r = kind === 'cmb' ? 5 + random() * 30 : 25 + random() * 115;
      const x = random() * 1024, y = random() * 512;
      const gradient = context.createRadialGradient(x, y, 0, x, y, r);
      const rgb = kind === 'cmb' ? (random() > .5 ? '207,158,113' : '111,149,170') : random() > .5 ? '255,227,173' : '228,131,84';
      gradient.addColorStop(0, `rgba(${rgb},.35)`); gradient.addColorStop(1, `rgba(${rgb},0)`);
      context.fillStyle = gradient; context.fillRect(x - r, y - r, r * 2, r * 2);
    }
    texture.update();
    const mat = material(scene, 'whole-field-emission', '#ffffff', true); mat.diffuseTexture = texture; mat.emissiveTexture = texture; mat.backFaceCulling = false;
    orb(scene, root, 'whole-sky-no-explosion-center', Vector3.Zero(), 45, mat, 48);
    return;
  }
  if (kind === 'dark-field') { cloudVolumes(scene, root, 26, 37, 1.6, ['#344254', '#293b52']); return; }
  cloudVolumes(scene, root, kind === 'early-stars' ? 24 : 40, 573, 1, ['#897b94', '#768f9b', '#ad9291']);
  if (kind === 'early-stars') {
    const mat = material(scene, 'primordial-star-light', '#d6edee', true);
    for (const [x, y, z, r] of [[-2.4, .4, 0, .22], [1.1, -.7, 1.3, .13], [3.6, 1.8, -1, .09]]) { const p = new Vector3(x, y, z); orb(scene, root, 'first-generation-star', p, r, mat); atmosphere(scene, root, p, r * 2, '#b5ddeb', .1); }
  }
}
function buildWorld(world: World, snapshot: UniverseSnapshot): Layer {
  const { scene } = world;
  const root = new TransformNode('astronomical-scene', scene), kind = universeScene(snapshot);
  const primordial = ['hot', 'plasma-field', 'cmb', 'dark-field', 'early-stars', 'protogalaxies'].includes(kind);
  if (primordial) earlyField(scene, root, kind);
  else if (['earth', 'moon', 'scorched'].includes(kind)) {
    const earth = kind !== 'moon';
    const p = new Vector3(earth ? -.7 : -3.8, earth ? -.15 : 1.65, 0), radius = earth ? 2.8 : .65;
    const globe = orb(scene, root, 'blue-marble', p, radius, textured(scene, kind === 'scorched' ? 'scorched' : 'earth'), 64);
    globe.rotation.z = -.18; globe.rotation.y = .72;
    if (kind !== 'scorched') atmosphere(scene, root, p, radius);
    orb(scene, root, 'cratered-moon', new Vector3(earth ? 4.25 : 0, earth ? 1.8 : 0, earth ? .9 : 0), earth ? .56 : 2.5, textured(scene, 'moon'), 48);
    if (kind === 'scorched') orb(scene, root, 'distant-aged-sun', new Vector3(5, 2.7, -4), .45, textured(scene, 'giant'));
  } else if (['rock', 'gas', 'ring', 'ice'].includes(kind)) {
    const planet = orb(scene, root, `${kind}-planet`, Vector3.Zero(), 2.5, textured(scene, kind as 'rock' | 'gas' | 'ring' | 'ice', snapshot.destinationId), 56);
    planet.rotation.z = snapshot.destinationId === 'uranus' ? 1.45 : -.18;
    if (snapshot.destinationId === 'venus') atmosphere(scene, root, Vector3.Zero(), 2.5, '#dec99b', .09);
    if (kind === 'gas' || kind === 'ice') atmosphere(scene, root, Vector3.Zero(), 2.5, kind === 'ice' ? '#8fcedc' : '#d6c2a1', .035);
    if (kind === 'ring') for (let i = 0; i < 20; i++) ring(scene, root, Vector3.Zero(), 3.1 + i * .058, i % 3 === 0 ? '#e5d6b4' : '#af9b7c', .036, i === 11 ? .07 : .52, -.28);
  } else if (kind === 'sun' || kind === 'giant') {
    const radius = kind === 'giant' ? 3.35 : 2.7;
    const star = orb(scene, root, kind === 'giant' ? 'aged-red-giant' : 'photosphere', Vector3.Zero(), radius, textured(scene, kind), 32);
    if (/betelgeuse|eta-carinae/.test(snapshot.destinationId)) star.metadata = { motion: 'instability', illustration: 'time-compressed giant variability, not a predicted eruption' };
    if (/sirius/.test(snapshot.destinationId)) orb(scene, root, 'sirius-white-dwarf-companion', new Vector3(4.8, 1, .4), .14, material(scene, 'white-dwarf', '#cde8ff', true), 16);
    if (/eta-carinae/.test(snapshot.destinationId)) {
      orb(scene, root, 'massive-binary-companion', new Vector3(4.4, .5, .6), .48, material(scene, 'hot-companion', '#cde6f4', true), 16);
      for (const sign of [-1, 1]) { const lobe = atmosphere(scene, root, new Vector3(0, sign * 2.8, 0), 2.1, '#d7a884', .08); lobe.scaling.set(.75, 1.5, .8); }
    }
    atmosphere(scene, root, Vector3.Zero(), radius * 1.06, '#ffc97d', .06);
    atmosphere(scene, root, Vector3.Zero(), radius * 1.17, '#e9ac68', .035);
    const random = cosmicRandom(624);
    starMesh(scene, root, 'solar-wind-particles', Array.from({ length: 150 }, () => { const a = random() * TAU, h = random() * 2 - 1, r = radius + .4 + random() * 2.8; return { position: new Vector3(Math.cos(a) * r * Math.sqrt(1 - h * h), h * r, Math.sin(a) * r * Math.sqrt(1 - h * h)), size: .01 + random() * .02, color: ivory.scale(.45) }; }));
    const loop = Array.from({ length: 35 }, (_, i) => { const a = i / 34 * Math.PI; return new Vector3(-.85 + Math.cos(a) * .65, radius - .08 + Math.sin(a) * .65, .4); });
    tube(scene, root, 'solar-prominence', loop, .045, '#ffd593', .45);
  } else if (kind === 'belt' || kind === 'comet') {
    const random = cosmicRandom(125), icy = /kuiper|oort/i.test(snapshot.destinationId), spherical = /oort/i.test(snapshot.destinationId);
    if (kind === 'belt') {
      const debris = starMesh(scene, root, 'batched-small-debris', Array.from({ length: spherical ? 65 : 48 }, () => {
        const a = random() * TAU, r = 2.3 + random() * 3.8;
        return { position: new Vector3(Math.cos(a) * r, spherical ? (random() - .5) * 6 : (random() - .5) * .5, Math.sin(a) * r), size: .025 + random() * .085, color: Color3.FromHexString(icy ? '#bab7ab' : '#b48063') };
      }));
      const normals: number[] = [];
      VertexData.ComputeNormals(debris.getVerticesData(VertexBuffer.PositionKind)!, debris.getIndices()!, normals);
      debris.setVerticesData(VertexBuffer.NormalKind, normals);
      const mat = debris.material as StandardMaterial; mat.disableLighting = false; mat.emissiveColor.copyFrom(Color3.Black());
    } else {
      const body = orb(scene, root, 'small-debris', new Vector3(1.2, -.8, 0), .32, textured(scene, 'moon'), 8);
      body.scaling.set(1.3, .7, .9); body.rotation.set(random() * TAU, random() * TAU, random() * TAU);
    }
    if (kind === 'comet') {
      const tail = CreateCylinder('comet-dust-tail', { height: 7, diameterTop: 1.6, diameterBottom: .12, tessellation: 24 }, scene);
      tail.parent = root; tail.position.set(-1.7, .9, 0); tail.rotation.z = 1.04; tail.material = material(scene, 'comet-dust', '#cddbd0', true, .12); tail.isPickable = false;
      tube(scene, root, 'comet-ion-tail', [new Vector3(1.2, -.8, 0), new Vector3(-1.4, 1.6, .15), new Vector3(-4.6, 2.6, .35)], .065, '#a9dce8', .23);
    }
  } else if (kind === 'triple') {
    if (/sirius|eta-carinae/.test(snapshot.destinationId)) {
      const eta = /eta-carinae/.test(snapshot.destinationId);
      const primary = orb(scene, root, 'binary-primary', new Vector3(-.7, 0, 0), eta ? 2 : 1.5, textured(scene, eta ? 'giant' : 'sun', snapshot.destinationId), 32);
      orb(scene, root, 'binary-companion', new Vector3(3, .5, .4), eta ? .48 : .08, material(scene, 'binary-companion-light', '#cde6f4', true), 16);
      if (eta) {
        primary.metadata = { motion: 'instability', illustration: 'time-compressed massive-star variability, not a predicted eruption' };
        for (const sign of [-1, 1]) { const lobe = atmosphere(scene, root, new Vector3(-.7, sign * 2.2, 0), 1.8, '#d7a884', .08); lobe.scaling.set(.75, 1.5, .8); }
      }
    } else {
      orb(scene, root, 'alpha-a', new Vector3(-1.4, 0, 0), .86, textured(scene, 'sun'));
      orb(scene, root, 'alpha-b', new Vector3(.55, .1, .25), .66, textured(scene, 'sun'));
      orb(scene, root, 'distant-proxima', new Vector3(5, 2, -3), .18, textured(scene, 'giant'));
      ring(scene, root, new Vector3(-.4, 0, 0), 2.2, '#adbfce', .009, .13);
    }
  } else if (kind === 'nebula') {
    cloudVolumes(scene, root, 24, 87, .9);
    for (let i = 0; i < 3; i++) {
      const star = orb(scene, root, 'forming-protostar', new Vector3(-2 + i * 1.8, -.5 + i * .6, .4), .09 + i * .02, material(scene, `newborn-${i}`, '#ffd8a1', true), 12);
      star.metadata = { motion: 'newborn', phase: i * 2, illustration: 'restrained time-compressed protostellar variability' };
      atmosphere(scene, root, star.position, .22, '#edba93', .07);
    }
    const dust = material(scene, 'opaque-dust-columns', '#142238', false, .63);
    for (let i = 0; i < 6; i++) { const mesh = orb(scene, root, 'dust-pillar', new Vector3(-1.4 + i * .45, -.8 + i * .18, 1.2), .7, dust, 12); mesh.scaling.set(.45, 2.3 - i * .18, .6); mesh.rotation.z = -.25; }
    const random = cosmicRandom(782);
    starMesh(scene, root, 'embedded-young-stars', Array.from({ length: 45 }, () => ({ position: new Vector3((random() - .5) * 9, (random() - .5) * 6, (random() - .5) * 3), size: .012 + random() * .025, color: ivory })));
  } else if (kind === 'cluster') {
    const random = cosmicRandom(951);
    starMesh(scene, root, 'globular-stars', Array.from({ length: 1800 }, () => { const a = random() * TAU, h = random() * 2 - 1, r = Math.pow(random(), 1.8) * 4.4; return { position: new Vector3(Math.cos(a) * Math.sqrt(1 - h * h) * r, h * r, Math.sin(a) * Math.sqrt(1 - h * h) * r), size: .009 + random() * .019, color: ivory.scale(.6 + random() * .4) }; }));
  } else if (kind === 'neutron') pulsar(scene, root);
  else if (kind === 'blackhole' || kind === 'quasar') accretion(scene, root, kind === 'quasar' || /cygnus|m87|centaurus-a/.test(snapshot.destinationId), /cygnus/.test(snapshot.destinationId));
  else if (kind === 'galaxy') {
    if (/m87|centaurus-a/.test(snapshot.destinationId)) {
      const random = cosmicRandom(891);
      starMesh(scene, root, 'elliptical-galaxy-stars', Array.from({ length: 900 }, () => {
        const a = random() * TAU, h = random() * 2 - 1, r = Math.pow(random(), 1.5) * 4.8;
        return { position: new Vector3(Math.cos(a) * Math.sqrt(1 - h * h) * r, h * r * .7, Math.sin(a) * Math.sqrt(1 - h * h) * r * .75), size: .012 + random() * .018, color: ivory };
      }));
      if (/centaurus-a/.test(snapshot.destinationId)) {
        const dust = orb(scene, root, 'centaurus-dust-lane', Vector3.Zero(), 4, material(scene, 'galactic-dust', '#142238', false, .55), 16);
        dust.scaling.set(1, .06, .7); dust.rotation.z = -.24;
      }
      const nucleus = new TransformNode('active-galactic-nucleus', scene); nucleus.parent = root; nucleus.scaling.setAll(.35);
      accretion(scene, nucleus, true);
    } else spiralStars(scene, root, Vector3.Zero(), 5.5, 891);
  }
  else if (kind === 'group') { spiralStars(scene, root, new Vector3(-3, -.5, 0), 2.8, 881, 580, -.3); spiralStars(scene, root, new Vector3(3.2, 1.3, -1.8), 2.1, 562, 450, .65); spiralStars(scene, root, new Vector3(3, -2.2, 2), .9, 112, 150); }
  else if (kind === 'horizon' || kind === 'beyond') cosmicWeb(scene, root, kind === 'beyond');
  else if (kind === 'remnants') { orb(scene, root, 'dim-white-dwarf', new Vector3(-.8, 0, 0), .18, material(scene, 'cooled-remnant', '#737d89', true)); orb(scene, root, 'dark-remnant', new Vector3(3.8, 1.2, 0), .12, material(scene, 'faint-remnant', '#283344', true)); }
  return { root, meshes: root.getChildMeshes() as Mesh[], field: primordial || kind === 'remnants' };
}

type RouteBody = { root: TransformNode; marker: Mesh; shape?: TransformNode; extent?: number; meshes: Mesh[] };
type CoordinateFlight = {
  root: TransformNode; camera: FreeCamera; bodies: Map<string, RouteBody>; environment: Mesh; knots: Mesh;
  positions: Float32Array; colors: Float32Array;
};
const routeFov = 2 * Math.atan(310 / 850);
const resolvedAngle = .002;
const compactKinds = new Set(['earth', 'moon', 'rock', 'gas', 'ring', 'ice', 'sun', 'triple', 'neutron', 'blackhole', 'quasar', 'comet']);
const regionKinds = new Set(['nebula', 'cluster', 'galaxy', 'group', 'belt', 'horizon', 'beyond']);

function createCoordinateFlight(world: World): CoordinateFlight {
  const { scene } = world, root = new TransformNode('coordinate-flight', scene);
  const camera = new FreeCamera('coordinate-flight-camera', Vector3.Zero(), scene);
  camera.minZ = .01; camera.maxZ = 256; camera.fov = routeFov; camera.setTarget(new Vector3(0, 0, 1));
  // One persistent enclosing field, never an epoch-specific central explosion.
  earlyField(scene, root, 'hot');
  const environment = root.getChildMeshes()[0] as Mesh; environment.scaling.setAll(125 / 45);
  // StandardMaterial adds emissive textures instead of tinting them. Keep only
  // the diffuse texture so the primordial pattern cannot glow orange at 2.7 K.
  (environment.material as StandardMaterial).emissiveTexture = null;
  environment.metadata = { illustration: 'whole-sky toy thermal history; not an explosion or measured CMB map' };
  const knots = starMesh(scene, root, 'fixed-comoving-illustrative-knots', COSMIC_KNOTS.map(() => ({ position: Vector3.Zero(), size: .02, color: ivory })));
  const positions = new Float32Array(COSMIC_KNOTS.length * 12), colors = new Float32Array(COSMIC_KNOTS.length * 16);
  knots.setVerticesData(VertexBuffer.PositionKind, positions, true); knots.setVerticesData(VertexBuffer.ColorKind, colors, true);
  knots.alwaysSelectAsActiveMesh = true;
  knots.metadata = { illustration: 'fixed procedural comoving knots, not measured corridor stars' };
  return { root, camera, bodies: new Map(), environment, knots, positions, colors };
}

function routeShape(world: World, body: RouteBody, object: RouteObject, snapshot: UniverseSnapshot): void {
  const { scene } = world;
  if (compactKinds.has(object.kind)) {
    const shape = new TransformNode(`physical-${object.id}`, scene); shape.parent = body.root; body.shape = shape;
    const textureKind = /betelgeuse|eta-carinae/.test(object.id) ? 'giant' : object.kind === 'triple' ? (/sirius/.test(object.id) ? 'sun' : 'giant') : ['earth', 'moon', 'rock', 'gas', 'ring', 'ice', 'sun'].includes(object.kind) ? object.kind as 'earth' | 'moon' | 'rock' | 'gas' | 'ring' | 'ice' | 'sun' : object.kind === 'comet' ? 'moon' : null;
    let globe: Mesh;
    if (object.kind === 'blackhole' || object.kind === 'quasar') globe = accretion(scene, shape, object.kind === 'quasar' || /cygnus|m87|centaurus-a/.test(object.id), /cygnus/.test(object.id));
    else if (object.kind === 'neutron') globe = pulsar(scene, shape);
    else globe = orb(scene, shape, `coordinate-sphere-${object.id}`, Vector3.Zero(), 1, textureKind ? textured(scene, textureKind, object.id) : material(scene, `${object.id}-surface`, object.color, true), 32);
    globe.name = `coordinate-sphere-${object.id}`;
    if (/betelgeuse|eta-carinae/.test(object.id)) globe.metadata = { motion: 'instability', illustration: 'time-compressed giant variability, not a prediction' };
    if (/sirius|eta-carinae/.test(object.id)) orb(scene, shape, 'stellar-binary-companion', new Vector3(2.3, .5, .4), /sirius/.test(object.id) ? .055 : .22, material(scene, 'binary-companion-light', '#cde6f4', true), 16);
    if (/eta-carinae/.test(object.id)) for (const sign of [-1, 1]) { const lobe = atmosphere(scene, shape, new Vector3(0, sign * 1.1, 0), .8, '#d7a884', .08); lobe.scaling.set(.75, 1.5, .8); }
    globe.rotation.set(0, object.kind === 'earth' ? .72 : 0, object.id === 'uranus' ? 1.45 : -.18);
    if (object.id === 'saturn') for (let i = 0; i < 8; i++) ring(scene, shape, Vector3.Zero(), 1.3 + i * .11, i % 3 === 0 ? '#e5d6b4' : '#af9b7c', .022, .52, -.28);
    shape.metadata = { physicalBody: object.id, surface: object.id === 'proxima-b' ? 'imagined surface; not measured' : 'original illustrative surface texture', radiusModel: 'present-reference angular size; future Sun enlargement is artistic, not a predicted radius', evolution: 'toy future evolution, not a prediction' };
  } else if (regionKinds.has(object.kind)) {
    // Only a resolved region gets a local morphology, not invented nearby corridor objects.
    const local = buildWorld(world, { ...snapshot, destinationId: object.id, kind: object.kind, color: object.color, epoch: 'present', travelling: false });
    local.root.parent = body.root; local.root.name = `local-morphology-${object.id}`;
    body.shape = local.root;
    // Normalize exactly once by the actual local geometry, not a second assumed /8.
    let extent = 1;
    const inverse = local.root.computeWorldMatrix(true).clone().invert();
    for (const mesh of local.meshes) {
      const matrix = mesh.computeWorldMatrix(true).multiply(inverse), vertices = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
      for (let i = 0; i < vertices.length; i += 3) extent = Math.max(extent, Vector3.TransformCoordinates(Vector3.FromArray(vertices, i), matrix).length());
    }
    body.extent = extent;
    local.root.metadata = { illustration: 'local morphology, not measured individual members', region: object.id, normalizedExtent: extent };
  }
  body.meshes = body.root.getChildMeshes() as Mesh[];
  for (const mesh of body.meshes) mesh.metadata = { ...mesh.metadata, surfaceBase: (mesh.material as StandardMaterial).diffuseColor.asArray() };
}

function updateCoordinateFlight(world: World, flight: CoordinateFlight, frame: RouteFrame, snapshot: UniverseSnapshot): void {
  const { scene } = world;
  scene.metadata = { cameraAU: [...frame.cameraAU], ageGyr: frame.ageGyr, routeItinerary: [...frame.itinerary], leg: frame.leg, legProgress: frame.legProgress, expansion: frame.expansion, temperatureK: frame.temperatureK, structure: frame.structure, floatingOrigin: true, coordinates: 'heliocentric J2000 AU; bounded direction-preserving GPU shells', evolution: 'toy expansion and future evolution' };
  const selected = [...frame.objects].sort((a, b) => Number(frame.itinerary.includes(b.id)) - Number(frame.itinerary.includes(a.id)) || b.angularRadius - a.angularRadius).slice(0, 28);
  const active = new Set(selected.map(object => object.id));
  for (const [id, body] of flight.bodies) if (!active.has(id)) { body.root.dispose(false, true); flight.bodies.delete(id); }
  const future = Math.max(0, Math.min(1, (frame.ageGyr - 13.8) / 5));
  const stellarFade = 1 / (1 + Math.max(0, frame.ageGyr - 18.8) / 60);
  for (const object of selected) {
    let body = flight.bodies.get(object.id);
    if (!body) {
      const root = new TransformNode(`coordinate-body-${object.id}`, scene); root.parent = flight.root;
      const marker = orb(scene, root, `coordinate-glyph-${object.id}`, Vector3.Zero(), 1, material(scene, `${object.id}-glyph-light`, object.color, true), 8);
      marker.metadata = { glyph: 'unresolved luminous locator; radius is a screen glyph, not the physical body' };
      body = { root, marker, meshes: [marker] }; flight.bodies.set(object.id, body);
    }
    const angularRadius = Math.max(0, Math.min(.6, object.angularRadius));
    const canResolve = compactKinds.has(object.kind) || regionKinds.has(object.kind);
    const blendAt = Math.max(0, Math.min(1, (angularRadius - resolvedAngle * .65) / (resolvedAngle * .7)));
    const blend = canResolve ? blendAt * blendAt * (3 - 2 * blendAt) : 0;
    const resolved = blend > 0;
    if (resolved && !body.shape) routeShape(world, body, object, snapshot);
    // AU coordinates never enter a float vertex buffer. Only the relative direction
    // and angular radius are mapped to a bounded shell (10..74 GPU units).
    const shell = 10 + Math.min(64, Math.log1p(Math.max(0, object.distanceAU)) * 1.4);
    body.root.position.set(object.direction[0] * shell, object.direction[1] * shell, object.direction[2] * shell);
    body.root.metadata = { id: object.id, direction: [...object.direction], distanceAU: object.distanceAU, angularRadius, shell, factor: object.factor, formed: object.formed, evidence: object.evidence, resolved };
    body.root.setEnabled(object.formed > 0);
    body.marker.setEnabled(blend < 1);
    body.marker.scaling.setAll(shell * .0012);
    if (body.shape) {
      body.shape.setEnabled(resolved);
      const growth = object.id === 'sun' ? 1 + future * .7 : 1;
      body.shape.scaling.setAll(shell * Math.sin(angularRadius) * growth / (body.extent ?? 1));
    }
    const tint = dopplerTint(object.factor);
    for (const mesh of body.meshes) {
      mesh.visibility = mesh === body.marker ? 1 - blend : blend;
      const mat = mesh.material as StandardMaterial;
      const base = mesh === body.marker ? Color3.FromHexString(object.color) : mesh.metadata?.surfaceBase ? Color3.FromArray(mesh.metadata.surfaceBase) : Color3.White();
      const darkness = object.id === 'earth' ? 1 - future * .8 : 1;
      const stellar = ['sun', 'triple', 'neutron', 'quasar'].includes(object.kind) || mesh === body.marker ? stellarFade : 1;
      const strength = object.formed * Math.min(1.5, object.brightness) * darkness * stellar;
      const color = new Color3(base.r * tint[0], base.g * tint[1], base.b * tint[2]).scale(strength);
      if (object.id === 'sun') { color.g *= 1 - future * .4; color.b *= 1 - future * .7; }
      mat.diffuseColor.copyFrom(color); mat.emissiveColor.copyFrom(mat.disableLighting ? color : color.scale(.05));
    }
  }
  const heat = Math.max(0, Math.min(1, Math.log10(Math.max(2.7255, frame.temperatureK) / 2.7255) / 4));
  const thermalColor = new Color3(.012 + heat * .96, .023 + heat * .66, .04 + heat * .38);
  const field = flight.environment.material as StandardMaterial;
  field.diffuseColor.copyFrom(thermalColor); field.emissiveColor.copyFrom(thermalColor);
  scene.clearColor = new Color4(thermalColor.r, thermalColor.g, thermalColor.b, 1);
  const tetra = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  COSMIC_KNOTS.forEach((point, i) => {
    const knot = cosmicKnot(point, frame);
    const relative = [frame.right, frame.up, frame.forward].map(axis => axis[0] * knot[0] + axis[1] * knot[1] + axis[2] * knot[2]);
    for (let j = 0; j < 4; j++) {
      const at = i * 12 + j * 3, colorAt = i * 16 + j * 4;
      for (let k = 0; k < 3; k++) flight.positions[at + k] = relative[k] * 2 + tetra[j][k] * .025;
      const light = .73 * frame.structure * stellarFade;
      flight.colors[colorAt] = ivory.r * light; flight.colors[colorAt + 1] = ivory.g * light; flight.colors[colorAt + 2] = ivory.b * light; flight.colors[colorAt + 3] = 1;
    }
  });
  flight.knots.updateVerticesData(VertexBuffer.PositionKind, flight.positions, true);
  flight.knots.updateVerticesData(VertexBuffer.ColorKind, flight.colors);
  flight.knots.visibility = 1;
  flight.root.metadata = { cacheSize: flight.bodies.size, proceduralField: 'illustrative, not measured route objects' };
}

async function preloadDefaultShaders(): Promise<void> {
  await Promise.all([
    import('@babylonjs/core/Shaders/default.vertex'),
    import('@babylonjs/core/Shaders/default.fragment'),
  ]);
}

export function createUniverse3dRenderer(options: { onUnavailable: () => void; onReady?: () => void; pixelRatio?: number; createEngine?: (canvas: HTMLCanvasElement) => Engine; loadShaders?: () => void | Promise<unknown> }): UniverseRenderer {
  let engine: Engine | null = null, canvas: HTMLCanvasElement | null = null, world: World | null = null, observer: ResizeObserver | null = null;
  let latest: RenderSnapshot | null = null, failed = false, ready = false, effectTime = 0, radius = 13.8, alpha = -Math.PI / 2, beta = 1.18;
  const layers = new Map<string, Layer>();
  let coordinateFlight: CoordinateFlight | null = null, coordinateKey = '', readyPending = false, shadersReady = false, generation = 0;
  let sky: Mesh | null = null, positions = new Float32Array(0), colors = new Float32Array(0), skyKey = '';
  const cleanup: (() => void)[] = [], pointers = new Map<number, { x: number; y: number }>();
  const dispose = () => {
    generation++; shadersReady = false;
    cleanup.splice(0).forEach(fn => fn()); pointers.clear(); observer?.disconnect(); observer = null;
    engine?.stopRenderLoop(); world?.scene.dispose(); world = null; engine?.dispose(); engine = null;
    canvas?.remove(); canvas = null; layers.clear(); coordinateFlight = null; coordinateKey = ''; readyPending = false; sky = null; skyKey = '';
  };
  const unavailable = () => { if (failed) return; failed = true; dispose(); options.onUnavailable(); };
  const isCoordinateFlight = () => Boolean(latest?.origin && (latest.travelling || latest.coordinateView));
  const applyCamera = () => {
    if (!world) return;
    const inspection = latest?.inspection;
    const yaw = bounded(inspection?.yaw, .6), pitch = bounded(inspection?.pitch, .35), roll = bounded(inspection?.roll, .25);
    const offset = [0, 1, 2].map(axis => bounded(inspection?.offset?.[axis], .2));
    world.camera.radius = radius; world.camera.alpha = alpha - yaw; world.camera.beta = Math.max(.22, Math.min(2.85, beta + pitch));
    world.camera.target.set(offset[0], offset[1], offset[2]); world.camera.upVector.set(-Math.sin(roll), Math.cos(roll), 0);
    if (coordinateFlight && isCoordinateFlight()) {
      coordinateFlight.camera.position.set(offset[0], offset[1], offset[2]);
      coordinateFlight.camera.rotation.set(beta - 1.18 + pitch, -alpha - Math.PI / 2 + yaw, roll);
      coordinateFlight.camera.fov = 2 * Math.atan(Math.tan(routeFov / 2) * radius / 13.8);
    }
  };
  const updateSky = (frame: FlightFrame) => {
    if (!world || !sky || !latest) return;
    const next = `${frame.progress}|${frame.visualBeta}|${frame.skyTravel}`;
    if (skyKey !== next) {
      skyKey = next;
      FLIGHT_STARS.forEach((star, i) => {
        const point = flightStar(star, frame), tint = dopplerTint(point.factor);
        const opacity = .65 * Math.sin(Math.PI * (Math.hypot(point.x, point.y, point.z) - 1)) ** 2;
        // Solid tetrahedra stretch radially only while moving. Vertex updates
        // are bounded to 160 stars; astronomical geometry is never rebuilt per tick.
        const size = star.size * .012;
        const vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
        for (let j = 0; j < 4; j++) {
          const at = (i * 4 + j) * 3, colorAt = (i * 4 + j) * 4;
          const stretch = j === 0 ? 1 + point.trail * 8 : 1;
          positions[at] = point.x * 24 * stretch + vertices[j][0] * size;
          positions[at + 1] = point.y * 24 * stretch + vertices[j][1] * size;
          positions[at + 2] = point.z * 24 * stretch + vertices[j][2] * size;
          colors[colorAt] = tint[0] * opacity; colors[colorAt + 1] = tint[1] * opacity; colors[colorAt + 2] = tint[2] * opacity; colors[colorAt + 3] = 1;
        }
      });
      sky.updateVerticesData(VertexBuffer.PositionKind, positions, true);
      sky.updateVerticesData(VertexBuffer.ColorKind, colors);
    }
    world.camera.getViewMatrix(true);
    sky.position.copyFrom(world.camera.position);
    sky.visibility = Math.max(0, 1 - frame.layers.reduce((sum, layer) => sum + (layers.get(layerKey({ ...latest!, ...layer.location }))?.field ? layer.opacity : 0), 0));
  };
  const layerKey = (snapshot: UniverseSnapshot) => `${snapshot.destinationId}|${snapshot.epoch}|${universeScene(snapshot)}`;
  const display = () => {
    if (!world || !latest || document.hidden || !shadersReady) return;
    // Rendering is demand-driven. The caller owns the sole animation clock and cadence.
    try {
      if (!isCoordinateFlight()) updateSky(flightFrame(latest));
      const wasReady = world.scene.isReady();
      world.scene.render();
      if (world.scene.materials.some(mat => mat.getEffect()?.getCompilationError())) { unavailable(); return; }
      if (!ready && wasReady && world.scene.isReady()) {
        ready = true;
        if (canvas) canvas.style.visibility = 'visible';
        options.onReady?.();
      } else if (!ready && options.onReady && !readyPending) {
        // A one-shot shader readiness check, not a GPU animation loop. Disposal
        // cancels Babylon's check; the host bounds startup with its timeout.
        const waitingScene = world.scene; readyPending = true;
        waitingScene.executeWhenReady(() => {
          if (world?.scene !== waitingScene) return;
          readyPending = false; display();
        });
      }
    } catch { unavailable(); }
  };
  const render = (snapshot: UniverseSnapshot) => {
    const input = snapshot as RenderSnapshot, initial = latest === null || world === null;
    latest = { ...freezeSnapshot(snapshot), effectTime: input.effectTime, coordinateView: input.coordinateView, inspection: input.inspection ? { ...input.inspection, offset: [...input.inspection.offset] } : undefined };
    if (!engine || failed || document.hidden) return;
    if ((initial || (!latest.paused && !latest.reducedMotion)) && Number.isFinite(input.effectTime)) effectTime = Math.max(0, Math.min(1e9, input.effectTime!));
    try {
      if (!world) {
        const scene = new Scene(engine); scene.clearColor = Color4.FromHexString('#101d30ff');
        const camera = new ArcRotateCamera('observatory-orbit', -Math.PI / 2, 1.18, 13.8, Vector3.Zero(), scene);
        camera.minZ = .05; camera.maxZ = 160; camera.fov = .66; camera.lowerRadiusLimit = 5.3; camera.upperRadiusLimit = 35; camera.lowerBetaLimit = .22; camera.upperBetaLimit = 2.85;
        const ambient = new HemisphericLight('sky-fill', new Vector3(0, 1, 0), scene); ambient.intensity = .3; ambient.groundColor = Color3.FromHexString('#263549');
        const keyLight = new DirectionalLight('sunlight', new Vector3(.8, -.35, .6), scene); keyLight.intensity = 1.4;
        world = { scene, camera, root: new TransformNode('flight-sky', scene) };
        sky = starMesh(scene, world.root, 'angular-relativistic-sky', FLIGHT_STARS.map(() => ({ position: Vector3.Zero(), size: .01, color: ivory })));
        positions = new Float32Array(FLIGHT_STARS.length * 12); colors = new Float32Array(FLIGHT_STARS.length * 16);
        sky.setVerticesData(VertexBuffer.PositionKind, positions, true); sky.setVerticesData(VertexBuffer.ColorKind, colors, true);
        sky.alwaysSelectAsActiveMesh = true;
        applyCamera();
      }
      if (isCoordinateFlight()) {
        for (const layer of layers.values()) layer.root.dispose(false, true);
        layers.clear(); sky!.setEnabled(false);
        coordinateFlight ??= createCoordinateFlight(world);
        coordinateFlight.root.setEnabled(true); world.scene.activeCamera = coordinateFlight.camera;
        const { effectTime: _time, inspection: _inspection, ...routeSnapshot } = latest;
        const nextCoordinateKey = JSON.stringify(routeSnapshot);
        if (coordinateKey !== nextCoordinateKey) {
          coordinateKey = nextCoordinateKey;
          const route = routeFrame(latest);
          updateCoordinateFlight(world, coordinateFlight, route, latest);
          canvas?.setAttribute('data-camera-au', route.cameraAU.join(','));
          canvas?.setAttribute('data-age-gyr', String(route.ageGyr));
          canvas?.setAttribute('data-route-leg', String(route.leg));
        }
        for (const body of coordinateFlight.bodies.values()) if (body.shape?.isEnabled()) updateEffects(body.shape, effectTime);
        applyCamera(); display(); return;
      }
      coordinateKey = ''; coordinateFlight?.root.setEnabled(false); sky!.setEnabled(true);
      for (const attribute of ['data-camera-au', 'data-age-gyr', 'data-route-leg']) canvas?.removeAttribute(attribute);
      world.scene.activeCamera = world.camera; world.scene.metadata = { floatingOrigin: false, observatory: true };
      world.scene.clearColor = Color4.FromHexString('#101d30ff'); applyCamera();
      const frame = flightFrame(latest), active = new Set<string>();
      frame.layers.forEach((flight, index) => {
        const view = { ...latest!, ...flight.location }, id = layerKey(view); active.add(id);
        let layer = layers.get(id);
        if (!layer) { layer = buildWorld(world!, view); layers.set(id, layer); }
        layer.root.scaling.setAll(layer.field ? 1 : flight.scale);
        layer.root.position.x = layer.field ? 0 : flight.offset;
        layer.meshes.forEach(mesh => { mesh.visibility = flight.opacity; mesh.alphaIndex = index; });
      });
      for (const [id, layer] of layers) if (!active.has(id)) { layer.root.dispose(false, true); layers.delete(id); }
      for (const layer of layers.values()) updateEffects(layer.root, effectTime);
      updateSky(frame); display();
    } catch { unavailable(); }
  };
  return {
    mount(host) {
      dispose(); failed = false; ready = false;
      try {
        if (!options.createEngine && !Engine.isSupported()) { unavailable(); return; }
        canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'; host.append(canvas);
        if (options.onReady) canvas.style.visibility = 'hidden';
        engine = options.createEngine ? options.createEngine(canvas) : new Engine(canvas, false, { preserveDrawingBuffer: false, stencil: false, powerPreference: 'low-power' });
        // Catch downloads before material readiness can start Babylon's unhandled
        // lazy shader initialization. Tests may supply already-loaded shaders.
        const downloadingGeneration = generation;
        const shaderDownload = (options.loadShaders ?? preloadDefaultShaders)();
        if (shaderDownload) {
          Promise.resolve(shaderDownload).then(() => {
            if (generation !== downloadingGeneration) return;
            shadersReady = true; display();
          }, () => {
            if (generation === downloadingGeneration) unavailable();
          });
        } else shadersReady = true;
        const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
        const requestedRatio = Number.isFinite(options.pixelRatio) && options.pixelRatio! > 0 ? options.pixelRatio! : touch ? 1 : window.devicePixelRatio;
        const pixelRatio = Number.isFinite(requestedRatio) && requestedRatio! > 0 ? Math.max(.5, Math.min(1.5, requestedRatio!)) : 1;
        engine.setHardwareScalingLevel(1 / pixelRatio);
        const resize = () => { engine?.resize(); display(); };
        if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(resize); observer.observe(host); }
        else { window.addEventListener('resize', resize); cleanup.push(() => window.removeEventListener('resize', resize)); }
        const target = canvas;
        const listen = (type: string, fn: EventListener, options?: AddEventListenerOptions) => { target.addEventListener(type, fn, options); cleanup.push(() => target.removeEventListener(type, fn, options)); };
        listen('webglcontextlost', ((event: Event) => { event.preventDefault(); unavailable(); }) as EventListener);
        listen('pointerdown', ((event: PointerEvent) => { if (event.button !== 0) return; pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); target.setPointerCapture?.(event.pointerId); }) as EventListener);
        listen('pointermove', ((event: PointerEvent) => {
          const previous = pointers.get(event.pointerId); if (!previous) return;
          const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
          if (other) { const before = Math.hypot(previous.x - other.x, previous.y - other.y), after = Math.hypot(event.clientX - other.x, event.clientY - other.y); if (after > 2 && before > 2) radius = Math.max(5.3, Math.min(35, radius * before / after)); }
          else { alpha -= (event.clientX - previous.x) * .006; beta = Math.max(.22, Math.min(2.85, beta - (event.clientY - previous.y) * .006)); }
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); applyCamera(); display();
        }) as EventListener);
        const end = ((event: PointerEvent) => { pointers.delete(event.pointerId); if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId); }) as EventListener;
        listen('pointerup', end); listen('pointercancel', end); listen('lostpointercapture', end);
        listen('wheel', ((event: WheelEvent) => { event.preventDefault(); if (event.deltaY) { radius = Math.max(5.3, Math.min(35, radius * Math.exp(Math.max(-1, Math.min(1, event.deltaY / 400))))); applyCamera(); display(); } }) as EventListener, { passive: false });
        const visibility = () => { pointers.clear(); }; document.addEventListener('visibilitychange', visibility); cleanup.push(() => document.removeEventListener('visibilitychange', visibility));
        if (latest) render(latest); resize();
      } catch { unavailable(); }
    }, render,
    zoom(direction) { if (!Number.isFinite(direction)) return; radius = Math.max(5.3, Math.min(35, radius * Math.pow(.84, Math.sign(direction)))); applyCamera(); display(); },
    reset() { radius = 13.8; alpha = -Math.PI / 2; beta = 1.18; applyCamera(); display(); }, dispose,
  };
}
