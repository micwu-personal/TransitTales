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
  const texture = new DynamicTexture(`${kind}-original-map`, { width: 1024, height: 512 }, scene, false);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  const random = cosmicRandom(62), w = 1024, h = 512;
  const colors = { earth: '#287cb2', moon: '#bab7ab', rock: '#b48063', gas: '#e0c39b', ring: '#d9c49f', ice: '#7cbac8', sun: '#ffc46e', giant: '#d47b4e', scorched: '#775448' };
  const variants: Readonly<Record<string, string>> = { mercury: '#ada99d', venus: '#dcc99e', mars: '#bc7355', neptune: '#4874b8', 'proxima-b': '#817d8b' };
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
    if (kind === 'gas') { context.fillStyle = '#b2755d'; context.beginPath(); context.ellipse(630, 330, 48, 17, .05, 0, TAU); context.fill(); }
  }
  for (let i = 0; i < (luminous ? 1900 : 1000); i++) {
    const x = random() * w, y = random() * h, r = .5 + random() * (kind === 'moon' || kind === 'rock' ? 10 : 2.8);
    context.globalAlpha = luminous ? .08 : .065;
    context.fillStyle = i % 2 === 0 ? '#fff1c9' : '#23364b';
    context.beginPath(); context.ellipse(x, y, r, r * .7, 0, 0, TAU); context.fill();
  }
  if (kind === 'earth') {
    context.globalAlpha = .44; context.strokeStyle = '#ffffed'; context.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const x = random() * w, y = 45 + random() * 410; context.lineWidth = 2 + random() * 8; context.beginPath(); context.moveTo(x, y); context.bezierCurveTo(x + 30, y - 10, x + 70, y + 14, x + 115, y - 5); context.stroke(); }
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
  const mesh = CreateTorus('orbital-ring', { diameter: radius * 2, thickness, tessellation: 128 }, scene);
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
function accretion(scene: Scene, root: TransformNode, quasar: boolean): void {
  orb(scene, root, 'event-horizon', Vector3.Zero(), .88, material(scene, 'horizon-darkness', '#02050a', true));
  const disk = new TransformNode('accretion-plane', scene); disk.parent = root; disk.rotation.z = -.28;
  for (let i = 0; i < 8; i++) ring(scene, disk, Vector3.Zero(), 1.34 + i * .135, i % 3 === 0 ? '#a58c7e' : '#d1b08c', quasar ? .065 : .019, quasar ? .55 : .18, 0);
  // False-color thin disk and displaced arc are a stylized lens, not ray tracing.
  const photon = ring(scene, root, Vector3.Zero(), .965, '#e8d7b2', .024, .7, 0); photon.rotation.x = Math.PI / 2;
  const arc = Array.from({ length: 55 }, (_, i) => { const a = i / 54 * Math.PI; return new Vector3(Math.cos(a) * 2.1, Math.sin(a) * 1.5, .08); });
  tube(scene, root, 'lensed-far-side', arc, .028, '#c8b294', .4);
  if (quasar) {
    const jets = new TransformNode('quasar-axis', scene); jets.parent = root; jets.rotation.z = -.19;
    for (const direction of [-1, 1]) {
      const mesh = CreateCylinder('historical-quasar-jet', { height: 5.4, diameterTop: direction === 1 ? .55 : .09, diameterBottom: direction === 1 ? .09 : .55, tessellation: 24 }, scene);
      mesh.parent = jets; mesh.position.y = direction * 3.45; mesh.material = material(scene, 'jet-sheath', '#b6dbea', true, .18); mesh.isPickable = false;
      tube(scene, jets, 'jet-spine', [new Vector3(0, direction * .8, 0), new Vector3(.07, direction * 5.7, .1)], .037, '#e9f7ef', .8);
    }
  }
}
function cosmicWeb(scene: Scene, root: TransformNode, speculative: boolean): void {
  const random = cosmicRandom(714), nodes = Array.from({ length: 46 }, () => new Vector3((random() - .5) * 13, (random() - .5) * 7, (random() - .5) * 8));
  nodes.forEach((position, i) => {
    for (let j = i + 1; j < nodes.length; j++) if (Vector3.Distance(position, nodes[j]) < 2.7) {
      const middle = position.add(nodes[j]).scale(.5); middle.y += .16;
      tube(scene, root, 'matter-filament', [position, middle, nodes[j]], speculative ? .012 : .024, '#899ab4', speculative ? .13 : .25);
    }
  });
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
    orb(scene, root, kind === 'giant' ? 'aged-red-giant' : 'photosphere', Vector3.Zero(), radius, textured(scene, kind), 56);
    atmosphere(scene, root, Vector3.Zero(), radius * 1.06, '#ffc97d', .06);
    atmosphere(scene, root, Vector3.Zero(), radius * 1.17, '#e9ac68', .035);
    const random = cosmicRandom(624);
    starMesh(scene, root, 'solar-wind-particles', Array.from({ length: 150 }, () => { const a = random() * TAU, h = random() * 2 - 1, r = radius + .4 + random() * 2.8; return { position: new Vector3(Math.cos(a) * r * Math.sqrt(1 - h * h), h * r, Math.sin(a) * r * Math.sqrt(1 - h * h)), size: .01 + random() * .02, color: ivory.scale(.45) }; }));
    const loop = Array.from({ length: 35 }, (_, i) => { const a = i / 34 * Math.PI; return new Vector3(-.85 + Math.cos(a) * .65, radius - .08 + Math.sin(a) * .65, .4); });
    tube(scene, root, 'solar-prominence', loop, .045, '#ffd593', .45);
  } else if (kind === 'belt' || kind === 'comet') {
    const random = cosmicRandom(125), icy = /kuiper|oort/i.test(snapshot.destinationId), spherical = /oort/i.test(snapshot.destinationId);
    const mat = textured(scene, icy || kind === 'comet' ? 'moon' : 'rock');
    const count = kind === 'comet' ? 1 : spherical ? 65 : 48;
    for (let i = 0; i < count; i++) {
      const a = random() * TAU, r = 2.3 + random() * 3.8;
      const position = kind === 'comet' ? new Vector3(1.2, -.8, 0) : new Vector3(Math.cos(a) * r, spherical ? (random() - .5) * 6 : (random() - .5) * .5, Math.sin(a) * r);
      const body = orb(scene, root, 'small-debris', position, kind === 'comet' ? .32 : .025 + random() * .085, mat, 8); body.scaling.set(1.3, .7, .9); body.rotation.set(random() * TAU, random() * TAU, random() * TAU);
    }
    if (kind === 'comet') {
      const tail = CreateCylinder('comet-dust-tail', { height: 7, diameterTop: 1.6, diameterBottom: .12, tessellation: 24 }, scene);
      tail.parent = root; tail.position.set(-1.7, .9, 0); tail.rotation.z = 1.04; tail.material = material(scene, 'comet-dust', '#cddbd0', true, .12); tail.isPickable = false;
      tube(scene, root, 'comet-ion-tail', [new Vector3(1.2, -.8, 0), new Vector3(-1.4, 1.6, .15), new Vector3(-4.6, 2.6, .35)], .065, '#a9dce8', .23);
    }
  } else if (kind === 'triple') {
    orb(scene, root, 'alpha-a', new Vector3(-1.4, 0, 0), .86, textured(scene, 'sun'));
    orb(scene, root, 'alpha-b', new Vector3(.55, .1, .25), .66, textured(scene, 'sun'));
    orb(scene, root, 'distant-proxima', new Vector3(5, 2, -3), .18, textured(scene, 'giant'));
    ring(scene, root, new Vector3(-.4, 0, 0), 2.2, '#adbfce', .009, .13);
  } else if (kind === 'nebula') {
    cloudVolumes(scene, root, 56, 87, .9);
    const dust = material(scene, 'opaque-dust-columns', '#142238', false, .63);
    for (let i = 0; i < 6; i++) { const mesh = orb(scene, root, 'dust-pillar', new Vector3(-1.4 + i * .45, -.8 + i * .18, 1.2), .7, dust, 12); mesh.scaling.set(.45, 2.3 - i * .18, .6); mesh.rotation.z = -.25; }
    const random = cosmicRandom(782);
    starMesh(scene, root, 'embedded-young-stars', Array.from({ length: 45 }, () => ({ position: new Vector3((random() - .5) * 9, (random() - .5) * 6, (random() - .5) * 3), size: .012 + random() * .025, color: ivory })));
  } else if (kind === 'cluster') {
    const random = cosmicRandom(951);
    starMesh(scene, root, 'globular-stars', Array.from({ length: 1800 }, () => { const a = random() * TAU, h = random() * 2 - 1, r = Math.pow(random(), 1.8) * 4.4; return { position: new Vector3(Math.cos(a) * Math.sqrt(1 - h * h) * r, h * r, Math.sin(a) * Math.sqrt(1 - h * h) * r), size: .009 + random() * .019, color: ivory.scale(.6 + random() * .4) }; }));
  } else if (kind === 'neutron') {
    const poles = new TransformNode('spin-axis', scene); poles.parent = root; poles.rotation.z = -.32;
    orb(scene, poles, 'neutron-star', Vector3.Zero(), .38, material(scene, 'neutron-emission', '#d9eef1', true));
    for (const sign of [-1, 1]) {
      const beam = CreateCylinder('magnetic-pole-beam', { height: 4.8, diameterTop: sign === 1 ? .7 : .1, diameterBottom: sign === 1 ? .1 : .7, tessellation: 20 }, scene);
      beam.parent = poles; beam.position.y = sign * 2.8; beam.material = material(scene, 'pole-emission', '#a3d0e5', true, .18); beam.isPickable = false;
      tube(scene, poles, 'magnetic-field', Array.from({ length: 55 }, (_, i) => { const a = i / 54 * TAU; return new Vector3(sign * Math.sin(a) * 1.3, Math.cos(a) * 2.3, 0); }), .018, '#91b3c8', .22);
    }
  } else if (kind === 'blackhole' || kind === 'quasar') accretion(scene, root, kind === 'quasar');
  else if (kind === 'galaxy') spiralStars(scene, root, Vector3.Zero(), 5.5, 891);
  else if (kind === 'group') { spiralStars(scene, root, new Vector3(-3, -.5, 0), 2.8, 881, 580, -.3); spiralStars(scene, root, new Vector3(3.2, 1.3, -1.8), 2.1, 562, 450, .65); spiralStars(scene, root, new Vector3(3, -2.2, 2), .9, 112, 150); }
  else if (kind === 'horizon' || kind === 'beyond') cosmicWeb(scene, root, kind === 'beyond');
  else if (kind === 'remnants') { orb(scene, root, 'dim-white-dwarf', new Vector3(-.8, 0, 0), .18, material(scene, 'cooled-remnant', '#737d89', true)); orb(scene, root, 'dark-remnant', new Vector3(3.8, 1.2, 0), .12, material(scene, 'faint-remnant', '#283344', true)); }
  return { root, meshes: root.getChildMeshes() as Mesh[], field: primordial || kind === 'remnants' };
}

type RouteBody = { root: TransformNode; marker: Mesh; shape?: TransformNode; meshes: Mesh[] };
type CoordinateFlight = {
  root: TransformNode; camera: FreeCamera; bodies: Map<string, RouteBody>; environment: Mesh; knots: Mesh;
  positions: Float32Array; colors: Float32Array;
};
const routeFov = 2 * Math.atan(310 / 850);
const resolvedAngle = .002;
const compactKinds = new Set(['earth', 'moon', 'rock', 'gas', 'ring', 'ice', 'sun', 'triple', 'neutron', 'blackhole', 'quasar', 'comet']);

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
    const textureKind = object.kind === 'triple' ? 'giant' : ['earth', 'moon', 'rock', 'gas', 'ring', 'ice', 'sun'].includes(object.kind) ? object.kind as 'earth' | 'moon' | 'rock' | 'gas' | 'ring' | 'ice' | 'sun' : object.kind === 'comet' ? 'moon' : null;
    const mat = textureKind ? textured(scene, textureKind, object.id) : material(scene, `${object.id}-surface`, object.kind === 'blackhole' || object.kind === 'quasar' ? '#02050a' : object.color, true);
    const globe = orb(scene, shape, `coordinate-sphere-${object.id}`, Vector3.Zero(), 1, mat, 40);
    globe.metadata = { surfaceBase: mat.diffuseColor.asArray() };
    globe.rotation.set(0, object.kind === 'earth' ? .72 : 0, object.id === 'uranus' ? 1.45 : -.18);
    if (object.id === 'saturn') for (let i = 0; i < 8; i++) ring(scene, shape, Vector3.Zero(), 1.3 + i * .11, i % 3 === 0 ? '#e5d6b4' : '#af9b7c', .022, .52, -.28);
    shape.metadata = { physicalBody: object.id, surface: object.id === 'proxima-b' ? 'imagined surface; not measured' : 'original illustrative surface texture', radiusModel: 'present-reference angular size; future Sun enlargement is artistic, not a predicted radius', evolution: 'toy future evolution, not a prediction' };
  } else if (['nebula', 'cluster', 'galaxy'].includes(object.kind)) {
    // Only a resolved region gets a local morphology, not invented nearby corridor objects.
    const local = buildWorld(world, { ...snapshot, destinationId: object.id, kind: object.kind, color: object.color, epoch: 'present', travelling: false });
    local.root.parent = body.root; local.root.name = `local-morphology-${object.id}`;
    local.root.scaling.setAll(1 / 8); body.shape = local.root;
    local.root.metadata = { illustration: 'local morphology, not measured individual members', region: object.id };
  }
  body.meshes = body.root.getChildMeshes() as Mesh[];
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
    const resolved = angularRadius >= resolvedAngle && (compactKinds.has(object.kind) || ['nebula', 'cluster', 'galaxy'].includes(object.kind));
    if (resolved && !body.shape) routeShape(world, body, object, snapshot);
    // AU coordinates never enter a float vertex buffer. Only the relative direction
    // and angular radius are mapped to a bounded shell (10..74 GPU units).
    const shell = 10 + Math.min(64, Math.log1p(Math.max(0, object.distanceAU)) * 1.4);
    body.root.position.set(object.direction[0] * shell, object.direction[1] * shell, object.direction[2] * shell);
    body.root.metadata = { id: object.id, direction: [...object.direction], distanceAU: object.distanceAU, angularRadius, shell, factor: object.factor, formed: object.formed, evidence: object.evidence, resolved };
    body.root.setEnabled(object.formed > 0);
    body.marker.setEnabled(!resolved);
    body.marker.scaling.setAll(shell * .0012);
    if (body.shape) {
      body.shape.setEnabled(resolved);
      const growth = object.id === 'sun' ? 1 + future * .7 : 1;
      body.shape.scaling.setAll(shell * Math.sin(angularRadius) * growth / (compactKinds.has(object.kind) ? 1 : 8));
    }
    const tint = dopplerTint(object.factor);
    for (const mesh of body.meshes) {
      mesh.visibility = 1;
      const mat = mesh.material as StandardMaterial;
      const base = mesh === body.marker ? Color3.FromHexString(object.color) : mesh.metadata?.surfaceBase ? Color3.FromArray(mesh.metadata.surfaceBase) : Color3.White();
      const darkness = object.id === 'earth' ? 1 - future * .8 : 1;
      const stellar = ['sun', 'triple', 'neutron', 'quasar'].includes(object.kind) || mesh === body.marker ? stellarFade : 1;
      const strength = object.formed * Math.min(1.5, object.brightness) * darkness * stellar;
      const color = new Color3(base.r * tint[0], base.g * tint[1], base.b * tint[2]).scale(strength);
      if (object.id === 'sun') { color.g *= 1 - future * .4; color.b *= 1 - future * .7; }
      if (mesh.name.startsWith('coordinate-sphere-') || mesh === body.marker) {
        mat.diffuseColor.copyFrom(color); mat.emissiveColor.copyFrom(mat.disableLighting ? color : color.scale(.05));
      }
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

export function createUniverse3dRenderer(options: { onUnavailable: () => void; createEngine?: (canvas: HTMLCanvasElement) => Engine }): UniverseRenderer {
  let engine: Engine | null = null, canvas: HTMLCanvasElement | null = null, world: World | null = null, observer: ResizeObserver | null = null;
  let latest: UniverseSnapshot | null = null, failed = false, radius = 13.8, alpha = -Math.PI / 2, beta = 1.18;
  const layers = new Map<string, Layer>();
  let coordinateFlight: CoordinateFlight | null = null;
  let sky: Mesh | null = null, positions = new Float32Array(0), colors = new Float32Array(0), skyKey = '';
  const cleanup: (() => void)[] = [], pointers = new Map<number, { x: number; y: number }>();
  const dispose = () => {
    cleanup.splice(0).forEach(fn => fn()); pointers.clear(); observer?.disconnect(); observer = null;
    engine?.stopRenderLoop(); world?.scene.dispose(); world = null; engine?.dispose(); engine = null;
    canvas?.remove(); canvas = null; layers.clear(); coordinateFlight = null; sky = null; skyKey = '';
  };
  const unavailable = () => { if (failed) return; failed = true; dispose(); options.onUnavailable(); };
  const isCoordinateFlight = () => Boolean(latest?.travelling && latest.origin);
  const applyCamera = () => {
    if (!world) return;
    world.camera.radius = radius; world.camera.alpha = alpha; world.camera.beta = beta;
    if (coordinateFlight && isCoordinateFlight()) {
      coordinateFlight.camera.position.setAll(0);
      coordinateFlight.camera.rotation.set(beta - 1.18, -alpha - Math.PI / 2, 0);
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
    if (!world || !latest || document.hidden) return;
    // There is deliberately no wall-clock animation, including on paused scenes.
    try { if (!isCoordinateFlight()) updateSky(flightFrame(latest)); world.scene.render(); } catch { unavailable(); }
  };
  const render = (snapshot: UniverseSnapshot) => {
    latest = freezeSnapshot(snapshot);
    if (!engine || failed) return;
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
        const route = routeFrame(latest);
        updateCoordinateFlight(world, coordinateFlight, route, latest);
        canvas?.setAttribute('data-camera-au', route.cameraAU.join(','));
        canvas?.setAttribute('data-age-gyr', String(route.ageGyr));
        canvas?.setAttribute('data-route-leg', String(route.leg));
        applyCamera(); return;
      }
      coordinateFlight?.root.setEnabled(false); sky!.setEnabled(true);
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
      updateSky(frame);
    } catch { unavailable(); }
  };
  return {
    mount(host) {
      dispose(); failed = false;
      try {
        if (!options.createEngine && !Engine.isSupported()) { unavailable(); return; }
        canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'; host.append(canvas);
        engine = options.createEngine ? options.createEngine(canvas) : new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: 'high-performance' });
        engine.setHardwareScalingLevel(1 / Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
        const resize = () => engine?.resize();
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
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); applyCamera();
        }) as EventListener);
        const end = ((event: PointerEvent) => { pointers.delete(event.pointerId); if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId); }) as EventListener;
        listen('pointerup', end); listen('pointercancel', end); listen('lostpointercapture', end);
        listen('wheel', ((event: WheelEvent) => { event.preventDefault(); if (event.deltaY) { radius = Math.max(5.3, Math.min(35, radius * Math.exp(Math.max(-1, Math.min(1, event.deltaY / 400))))); applyCamera(); } }) as EventListener, { passive: false });
        const visibility = () => { pointers.clear(); }; document.addEventListener('visibilitychange', visibility); cleanup.push(() => document.removeEventListener('visibilitychange', visibility));
        if (latest) render(latest); resize(); engine?.runRenderLoop(display);
      } catch { unavailable(); }
    }, render,
    zoom(direction) { if (!Number.isFinite(direction)) return; radius = Math.max(5.3, Math.min(35, radius * Math.pow(.84, Math.sign(direction)))); applyCamera(); },
    reset() { radius = 13.8; alpha = -Math.PI / 2; beta = 1.18; applyCamera(); }, dispose,
  };
}
