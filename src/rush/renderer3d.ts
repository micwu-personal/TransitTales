import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3,
} from '../babylon';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Meshes/instancedMesh';
import type { CityRenderer, StationSelection } from './renderer';
import type { MapId } from './model';
import { FESTIVAL_ISLANDS, festivalIslandAt } from './city';
import type { CitySnapshot, Point, StationView, TrainView } from './view';
import './renderer3d.css';
import { attachCameraControls, cameraAnchorVisible, clearCameraInertia, fitCameraZoom, zoomCamera, type CameraControls } from '../camera-controls';

const WIDTH = 28, DEPTH = 19, LAND = 0.28, TRACK = 0.48;
const ALPHA = -1.47, BETA = 0.79, FOV = 0.64;
const INK = '#284d47', IVORY = '#f5f3eb';
export const CITY_CAMERA = Object.freeze({ alpha: ALPHA, beta: BETA, fov: FOV, targetY: 0.35 });
type Position = { x: number; y: number; z: number };

export function cityPoint3d(point: Point, elevation = TRACK): Position {
  return { x: (point.x - 0.5) * WIDTH, y: elevation, z: (0.5 - point.y) * DEPTH };
}

export function cityTrainPose(train: Pick<TrainView, 'position' | 'heading'>): Position & { yaw: number } {
  const dx = Math.cos(train.heading) * WIDTH, dz = -Math.sin(train.heading) * DEPTH;
  const length = Math.hypot(dx, dz), at = cityPoint3d(train.position, TRACK + 0.22);
  // A consistent right-hand lane separates opposing trains and follows the non-square world projection.
  return { x: at.x + dz / length * 0.15, y: at.y, z: at.z - dx / length * 0.15, yaw: Math.atan2(-dz, dx) };
}

// Fit the real coastline and local skyline; empty water does not need a fictional tall corner building.
export function cityCameraRadius(width: number, height: number, alpha = ALPHA, beta = BETA,
  stations: readonly Point[] = [], mapId: MapId = 'little-bay'): number {
  const w = Math.max(90, width), h = Math.max(90, height), padding = Math.min(26, w * .12, h * .12);
  const tangent = Math.tan(FOV / 2);
  const tx = tangent * (w - padding * 2) / h, ty = tangent * (h - padding * 2) / h;
  const radial = new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
  const right = new Vector3(-Math.sin(alpha), 0, Math.cos(alpha));
  const up = new Vector3(-Math.cos(alpha) * Math.cos(beta), Math.sin(beta), -Math.sin(alpha) * Math.cos(beta));
  let radius = 24;
  for (const point of cityFramingPoints(stations, mapId)) {
    const p = new Vector3(point.x, point.y - CITY_CAMERA.targetY, point.z);
    radius = Math.max(radius, Vector3.Dot(p, radial) + Math.max(Math.abs(Vector3.Dot(p, right)) / tx, Math.abs(Vector3.Dot(p, up)) / ty));
  }
  return radius + .5;
}

export function cityStaticSignature(view: CitySnapshot): string {
  return JSON.stringify([view.mapId, view.stations.map(station => [station.id, station.position]), view.lines]);
}

export interface CityProjectedLabel {
  id: string; x: number; y: number; width: number; height: number; priority: number; selected: boolean;
}
export interface CityPositionedLabel extends CityProjectedLabel { left: number; top: number }

export function layoutCityLabels(input: readonly CityProjectedLabel[], width: number, height: number): CityPositionedLabel[] {
  const result: CityPositionedLabel[] = [];
  for (const label of [...input].sort((a, b) => Number(b.selected) - Number(a.selected) || a.priority - b.priority)) {
    const w = Math.max(44, Math.min(label.width, width - 8)), h = Math.max(44, Math.min(label.height, height - 8));
    const exact = { left: label.x - w / 2, top: label.y - h / 2 };
    if (label.selected) { result.push({ ...label, width: w, height: h, ...exact }); continue; }
    let best = exact, score = Infinity, overlap = Infinity;
    const consider = (x: number, y: number) => {
      const left = Math.max(4, Math.min(width - w - 4, x)), top = Math.max(4, Math.min(height - h - 4, y));
      let covered = 0;
      for (const other of result) {
        const ox = Math.max(0, Math.min(left + w + 3, other.left + other.width) - Math.max(left - 3, other.left));
        const oy = Math.max(0, Math.min(top + h + 3, other.top + other.height) - Math.max(top - 3, other.top));
        covered += ox * oy;
      }
      const candidate = covered * 10000 + Math.hypot(left + w / 2 - label.x, top + h / 2 - label.y);
      if (candidate < score) { best = { left, top }; score = candidate; overlap = covered; }
    };
    for (const [dx, dy] of [[0, 0], [0, -52], [0, 52], [-68, 0], [68, 0], [-68, -52], [68, -52], [-68, 52], [68, 52], [0, -104], [0, 104]]) {
      consider(exact.left + dx, exact.top + dy);
    }
    if (overlap > 0) {
      for (let top = 4; top <= height - h - 4; top += 8) for (let left = 4; left <= width - w - 4; left += 8) consider(left, top);
    }
    result.push({ ...label, width: w, height: h, ...best });
  }
  return result;
}

// These original coastlines retain the shipped harbor, northern park and southern airport island.
const MAIN_COAST: readonly Point[] = [
  { x: 0.05, y: 0.075 }, { x: 0.2, y: 0.045 }, { x: 0.37, y: 0.075 }, { x: 0.865, y: 0.085 },
  { x: 0.92, y: 0.2 }, { x: 0.9, y: 0.37 }, { x: 0.875, y: 0.505 }, { x: 0.79, y: 0.55 },
  { x: 0.66, y: 0.665 }, { x: 0.545, y: 0.65 }, { x: 0.42, y: 0.71 }, { x: 0.29, y: 0.735 },
  { x: 0.19, y: 0.72 }, { x: 0.07, y: 0.62 }, { x: 0.025, y: 0.49 },
];
const SOUTH_COAST: readonly Point[] = [
  { x: 0.59, y: 0.75 }, { x: 0.67, y: 0.69 }, { x: 0.83, y: 0.645 },
  { x: 0.96, y: 0.675 }, { x: 0.96, y: 0.96 }, { x: 0.63, y: 0.96 }, { x: 0.58, y: 0.87 },
];

const HOMES = [[100, 220, 1.2, .75, 1.5], [175, 215, 1.1, .75, 2.1], [255, 170, 1.3, .85, 1.8], [320, 220, 1.1, .7, 1.3],
  [575, 150, 1.35, .85, 2.35], [649, 184, 1.1, .75, 1.7], [785, 245, 1.2, .8, 1.9], [850, 190, 1.15, .75, 1.45],
  [210, 450, 1.3, .8, 1.6], [295, 463, 1.1, .75, 2.2], [419, 440, 1.4, .9, 1.4], [740, 450, 1.25, .75, 1.6]] as const;
const TREES = [[886, 138], [930, 111], [966, 157], [892, 217], [943, 210], [88, 110], [325, 101], [354, 144],
  [362, 454], [97, 485], [806, 430], [771, 407], [827, 559], [1000, 552]] as const;

function framingBox(center: Position, width: number, depth: number, bottom: number, top: number): Position[] {
  const points: Position[] = [];
  for (const x of [-width / 2, width / 2]) for (const z of [-depth / 2, depth / 2]) for (const y of [bottom, top])
    points.push({ x: center.x + x, y, z: center.z + z });
  return points;
}
const CITY_SCENERY_FRAME: readonly Position[] = [
  ...[...MAIN_COAST, ...SOUTH_COAST].flatMap(point => framingBox(cityPoint3d(point), .4, .4, -.25, LAND)),
  ...[...HOMES, [936, 695, 2.75, 1.05, .95] as const].flatMap(([x, y, w, d, h]) =>
    framingBox(cityPoint3d({ x: x / 1120, y: y / 760 }), w + .8, d + .8, LAND, LAND + h + .23)),
  ...TREES.flatMap(([x, y]) => framingBox(cityPoint3d({ x: x / 1120, y: y / 760 }), 1.2, 1.2, LAND, 1.7)),
  ...framingBox(cityPoint3d({ x: .655, y: .335 }), 2.75, 1.8, LAND, 1.95),
  ...framingBox(cityPoint3d({ x: .55, y: .55 }), 3.1, 2.2, LAND, .7),
  ...framingBox(cityPoint3d({ x: .035, y: .54 }), 1.8, 1.6, -.1, .5),
  ...framingBox(cityPoint3d({ x: .91, y: .79 }), 1, 3.2, LAND, .8),
  ...framingBox({ x: -3.8, y: 0, z: -6.7 }, 1.7, .7, -.15, 1.2),
];

const ISLAND_SCENERY_FRAME: readonly Position[] = [
  ...FESTIVAL_ISLANDS.flatMap(island => island.points.flatMap(point => framingBox(cityPoint3d(point), .4, .4, -.25, LAND))),
  ...[[.107,.43,1.3,1.3,3.4],[.65,.21,2.8,2.5,2.3],[.86,.265,2.5,1.7,2.3],
    [.36,.23,1.6,1.3,2.6],[.56,.40,1.8,1.6,2.5],[.48,.79,2.7,2,1.5],
    [.865,.62,1.1,1.1,3.2],[.91,.59,1.1,1.1,3.2],[.935,.64,1.1,1.1,3.2]].flatMap(([x,y,w,d,h]) => framingBox(cityPoint3d({x,y}),w,d,LAND,LAND+h)),
  ...[[.45,.125],[.49,.135],[.53,.14],[.08,.64],[.17,.73],[.27,.63],[.90,.45]].flatMap(([x,y]) => framingBox(cityPoint3d({x,y}),1.2,1.2,LAND,1.8)),
];
export function cityFramingPoints(stations: readonly Point[] = [], mapId: MapId = 'little-bay'): readonly Position[] {
  const scenery = mapId === 'lantern-isles' ? ISLAND_SCENERY_FRAME : CITY_SCENERY_FRAME;
  return stations.length ? [...scenery, ...stations.flatMap(point =>
    framingBox(cityPoint3d(point), 2.8, 2.8, TRACK - .12, TRACK + 2.2))] : scenery;
}

export function coastalIslandGeometry(outline: readonly Point[], center: Point, bottom: number, top: number): { positions: number[]; indices: number[] } {
  const positions: number[] = [], indices: number[] = [];
  const add = (p: Point, y: number) => { const at = cityPoint3d(p, y); positions.push(at.x, at.y, at.z); };
  add(center, top);
  for (const p of outline) add(p, top);
  // Top and sides have independent vertices to keep the shoreline edge crisp.
  for (let i = 0; i < outline.length; i++) {
    const next = (i + 1) % outline.length;
    indices.push(0, i + 1, next + 1);
    const start = positions.length / 3;
    add(outline[i], top); add(outline[i], bottom); add(outline[next], bottom); add(outline[next], top);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return { positions, indices };
}

interface StationNode {
  root: TransformNode; platform: Mesh; ring: Mesh; people: TransformNode[]; button: HTMLButtonElement;
  label: HTMLSpanElement; count: HTMLSpanElement; leader: SVGLineElement; anchor: Vector3; previous?: StationView;
}
interface TrainNode { root: TransformNode; button: HTMLButtonElement; count: HTMLSpanElement; signature: string; previous?: TrainView }

export function create3dCityRenderer(onUnavailable?: () => void): CityRenderer & CameraControls {
  let wrapper: HTMLDivElement | null = null, stage: HTMLDivElement | null = null, canvas: HTMLCanvasElement | null = null;
  let labelHost: HTMLDivElement | null = null, leaders: SVGSVGElement | null = null, trainStrip: HTMLDivElement | null = null;
  let engine: Engine | null = null, scene: Scene | null = null, camera: ArcRotateCamera | null = null;
  let scenery: TransformNode | null = null;
  let sceneryMap: MapId = 'little-bay';
  let observer: ResizeObserver | null = null, network: TransformNode | null = null, snapshot: CitySnapshot | null = null;
  let select: StationSelection | undefined, selectTrain: ((id: number) => void) | undefined;
  let active = false, unavailable = false, signature = '', serial = 0, projection = '', labelsDirty = true, fitRadius = 0, fitKey = '', generation = 0;
  let pointer: { id: number; x: number; y: number; time: number; distance: number; multiple: boolean } | null = null;
  let suppressClickUntil = 0;
  const pointers = new Set<number>(), materials = new Map<string, StandardMaterial>(), shapes = new Map<string, Mesh>(), crowd = new Map<string, Mesh>();
  const stations = new Map<string, StationNode>(), trains = new Map<number, TrainNode>();
  const identity = Matrix.Identity();
  const name = (kind: string) => `rush-${kind}-${serial++}`;
  const vector = (at: Position) => new Vector3(at.x, at.y, at.z);

  function material(color: string, alpha = 1): StandardMaterial {
    const key = `${color}:${alpha}`;
    let value = materials.get(key);
    if (!value) {
      value = new StandardMaterial(name('material'), scene!);
      value.diffuseColor = Color3.FromHexString(color); value.specularColor = Color3.Black();
      value.ambientColor = value.diffuseColor.scale(0.18); value.alpha = alpha;
      if (alpha < 1) { value.backFaceCulling = false; value.disableDepthWrite = true; }
      value.freeze(); materials.set(key, value);
    }
    return value;
  }

  function primitive(kind: string): Mesh {
    let source = shapes.get(kind);
    if (!source) {
      const id = name('source');
      source = kind === 'box' ? MeshBuilder.CreateBox(id, { size: 1 }, scene!)
        : kind === 'sphere' ? MeshBuilder.CreateSphere(id, { diameter: 1, segments: 6 }, scene!)
        : kind === 'disc' ? MeshBuilder.CreateDisc(id, { radius: 0.5, tessellation: 24 }, scene!)
        : kind === 'ring' ? MeshBuilder.CreateTorus(id, { diameter: 1, thickness: 0.06, tessellation: 32 }, scene!)
        : MeshBuilder.CreateCylinder(id, { diameter: 1, height: 1, tessellation: kind === 'triangle' ? 3 : 16 }, scene!);
      source.setEnabled(false); source.isPickable = false; shapes.set(kind, source);
    }
    return source;
  }

  function shape(root: TransformNode, kind: string, at: Position, size: Position, color: string, alpha = 1): Mesh {
    const mesh = primitive(kind).clone(name(kind), root)!;
    mesh.setEnabled(true); mesh.isPickable = false; mesh.material = material(color, alpha);
    mesh.position.copyFromFloats(at.x, at.y, at.z); mesh.scaling.copyFromFloats(size.x, size.y, size.z);
    return mesh;
  }
  const box = (root: TransformNode, at: Position, size: Position, color: string) => shape(root, 'box', at, size, color);
  const orb = (root: TransformNode, at: Position, size: Position, color: string) => shape(root, 'sphere', at, size, color);
  function cylinder(root: TransformNode, at: Position, diameter: number, height: number, color: string): Mesh {
    return shape(root, 'cylinder', at, { x: diameter, y: height, z: diameter }, color);
  }
  function passengerPart(root: TransformNode, kind: string, at: Position, size: Position, color: string): void {
    const key = `${kind}:${color}`;
    let source = crowd.get(key);
    if (!source) {
      source = primitive(kind).clone(name('crowd-source'))!;
      source.material = material(color); source.isVisible = false; source.isPickable = false; source.setEnabled(true);
      crowd.set(key, source);
    }
    const part = source.createInstance(name('passenger')); part.parent = root; part.isPickable = false;
    part.position.copyFromFloats(at.x, at.y, at.z); part.scaling.copyFromFloats(size.x, size.y, size.z);
  }
  function shadow(root: TransformNode, at: Position, width: number, depth: number): void {
    for (let layer = 0; layer < 3; layer++) {
      const mesh = shape(root, 'disc', { x: at.x + 0.16 + layer * 0.04, y: at.y + layer * 0.002, z: at.z + 0.2 + layer * 0.06 },
        { x: width + layer * 0.2, y: depth + layer * 0.2, z: 1 }, INK, 0.035);
      mesh.rotation.x = Math.PI / 2;
    }
  }
  function segment(root: TransformNode, a: Position, b: Position, width: number, height: number, color: string): Mesh {
    const dx = b.x - a.x, dz = b.z - a.z;
    const mesh = box(root, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 },
      { x: Math.hypot(dx, dz), y: height, z: width }, color);
    mesh.rotation.y = Math.atan2(-dz, dx); return mesh;
  }
  function batch(root: TransformNode): void {
    const buckets = new Map<StandardMaterial, Mesh[]>();
    for (const mesh of root.getChildMeshes()) {
      if (!(mesh instanceof Mesh) || !mesh.material) continue;
      const key = mesh.material as StandardMaterial, group = buckets.get(key) ?? [];
      group.push(mesh); buckets.set(key, group);
    }
    for (const group of buckets.values()) {
      // Keeping sources until after merging forces copied indices; mixed primitives otherwise corrupt the shared templates.
      const mesh = group.length > 1 ? Mesh.MergeMeshes(group, false, true) : group[0];
      if (mesh) {
        if (group.length > 1) group.forEach(source => source.dispose());
        mesh.parent = root; mesh.isPickable = false;
      }
    }
  }
  function island(root: TransformNode, points: readonly Point[], center: Point): void {
    for (const [bottom, top, color, scale] of [[-0.12, 0.2, IVORY, 1.015], [0.19, LAND, '#d9e2cd', 1]] as const) {
      const outline = points.map(p => ({ x: center.x + (p.x - center.x) * scale, y: center.y + (p.y - center.y) * scale }));
      const data = coastalIslandGeometry(outline, center, bottom, top), mesh = new Mesh(name('island'), scene!);
      const vertices = new VertexData(); vertices.positions = data.positions; vertices.indices = data.indices;
      vertices.uvs = Array.from({ length: data.positions.length / 3 * 2 }, () => 0);
      const normals: number[] = []; VertexData.ComputeNormals(data.positions, data.indices, normals); vertices.normals = normals;
      vertices.applyToMesh(mesh); mesh.parent = root; mesh.material = material(color); mesh.isPickable = false;
    }
  }
  function tree(root: TransformNode, x: number, z: number, size = 1): void {
    shadow(root, { x, y: LAND + 0.005, z }, 0.85 * size, 0.7 * size);
    cylinder(root, { x, y: LAND + 0.42 * size, z }, 0.1 * size, 0.84 * size, '#816e4f');
    orb(root, { x, y: LAND + 0.98 * size, z }, { x: 0.7 * size, y: 1.06 * size, z: 0.65 * size }, '#739d76');
    orb(root, { x: x - 0.18 * size, y: LAND + 1.12 * size, z: z - 0.08 * size }, { x: 0.45 * size, y: 0.75 * size, z: 0.48 * size }, '#8eb18a');
  }
  function building(root: TransformNode, px: number, py: number, width: number, depth: number, height: number, roof: string): void {
    const at = cityPoint3d({ x: px / 1120, y: py / 760 }, LAND);
    shadow(root, { ...at, y: LAND + 0.004 }, width + 0.3, depth + 0.3);
    box(root, { ...at, y: LAND + height / 2 }, { x: width, y: height, z: depth }, '#ece5d5');
    box(root, { ...at, y: LAND + height + 0.09 }, { x: width + 0.13, y: 0.18, z: depth + 0.13 }, roof);
    box(root, { x: at.x - 0.06, y: LAND + height + 0.2, z: at.z + 0.03 }, { x: width * 0.72, y: 0.06, z: depth * 0.65 }, '#d4d3bb');
    for (let floor = 0.45; floor < height - 0.12; floor += 0.48) for (let column = -width / 2 + 0.25; column < width / 2 - 0.1; column += 0.42) {
      box(root, { x: at.x + column, y: LAND + floor, z: at.z - depth / 2 - 0.012 }, { x: 0.18, y: 0.25, z: 0.025 }, '#557c79');
    }
    for (let floor = 0.45; floor < height - 0.12; floor += 0.48) {
      box(root, { x: at.x + width / 2 + 0.012, y: LAND + floor, z: at.z }, { x: 0.025, y: 0.25, z: depth * 0.55 }, '#88a7a0');
    }
    box(root, { x: at.x, y: LAND + 0.22, z: at.z - depth / 2 - 0.015 }, { x: 0.22, y: 0.44, z: 0.03 }, '#58736a');
  }

  function buildCoast(): void {
    const root = scenery = new TransformNode('rush-coast', scene!);
    box(root, { x: 0, y: -0.22, z: 0 }, { x: 29.2, y: 0.18, z: 20.2 }, '#a9cfca');
    for (let row = 0; row < 12; row++) for (let col = 0; col < 15; col++) {
      const x = -13.5 + col * 1.86 + (row % 2) * 0.35, z = -9.4 + row * 1.6;
      box(root, { x, y: -0.122, z }, { x: 0.5 + (col % 3) * 0.1, y: 0.005, z: 0.025 }, '#cee5dc');
    }
    island(root, MAIN_COAST, { x: 0.48, y: 0.36 }); island(root, SOUTH_COAST, { x: 0.78, y: 0.82 });
    const roads = [[84, 277, 344, 269], [344, 269, 609, 221], [609, 221, 939, 168], [168, 105, 219, 529],
      [539, 69, 617, 486], [81, 432, 354, 376], [354, 376, 964, 305], [711, 536, 1018, 686]];
    for (const [ax, ay, bx, by] of roads) {
      const a = cityPoint3d({ x: ax / 1120, y: ay / 760 }, LAND + 0.009), b = cityPoint3d({ x: bx / 1120, y: by / 760 }, LAND + 0.009);
      segment(root, a, b, 0.45, 0.016, '#f2efdf');
    }
    HOMES.forEach(([x, y, w, d, h], i) => building(root, x, y, w, d, h, ['#c08c73', '#829f9c', '#c2937c', '#a4aea0'][i % 4]));
    for (const [x, y] of TREES) {
      const at = cityPoint3d({ x: x / 1120, y: y / 760 }); tree(root, at.x, at.z, 0.85);
    }
    const park = cityPoint3d({ x: 0.81, y: 0.21 }, LAND);
    const lawn = cylinder(root, { ...park, y: LAND + 0.012 }, 2.65, 0.025, '#b4caa1'); lawn.scaling.z = 1.25;
    const path = shape(root, 'ring', { ...park, y: LAND + 0.038 }, { x: 1.9, y: 0.4, z: 1.5 }, '#ede5ca'); path.rotation.y = 0.2;
    const museum = cityPoint3d({ x: 0.655, y: 0.335 }, LAND);
    box(root, { ...museum, y: LAND + 0.65 }, { x: 2.05, y: 1.3, z: 1.1 }, '#efe8d6');
    for (const x of [-0.8, -0.27, 0.27, 0.8]) cylinder(root, { x: museum.x + x, y: LAND + 0.65, z: museum.z - 0.68 }, 0.12, 1.25, '#fcf7e8');
    const pediment = shape(root, 'triangle', { ...museum, y: LAND + 1.5 }, { x: 2.65, y: 0.28, z: 1.7 }, '#88a79e'); pediment.rotation.y = Math.PI;
    const stadium = cityPoint3d({ x: 0.55, y: 0.55 }, LAND);
    shape(root, 'ring', { ...stadium, y: LAND + 0.18 }, { x: 2.9, y: 5, z: 2 }, '#efe8d3');
    const field = cylinder(root, { ...stadium, y: LAND + 0.07 }, 2.1, 0.12, '#8fb294'); field.scaling.z = 0.6;
    box(root, { ...stadium, y: LAND + 0.135 }, { x: 1.9, y: 0.008, z: 0.035 }, '#e1e6cb');
    box(root, { ...stadium, y: LAND + 0.136 }, { x: 0.035, y: 0.008, z: 1.05 }, '#e1e6cb');
    const dock = cityPoint3d({ x: 0.035, y: 0.54 }, LAND);
    box(root, { ...dock, y: 0.16 }, { x: 1.8, y: 0.2, z: 1.6 }, '#c6b398');
    for (const x of [-0.7, 0.7]) cylinder(root, { x: dock.x + x, y: 0.2, z: dock.z - 0.65 }, 0.08, 0.5, '#816e4f');
    const boat = new TransformNode(name('sailboat'), scene!); boat.parent = root;
    orb(boat, { x: -3.8, y: -0.02, z: -6.7 }, { x: 1.5, y: 0.25, z: 0.48 }, IVORY);
    cylinder(boat, { x: -3.8, y: 0.5, z: -6.7 }, 0.04, 1.2, '#816e4f');
    const sail = shape(boat, 'triangle', { x: -3.95, y: 0.58, z: -6.7 }, { x: 1, y: 0.035, z: 1.1 }, '#fcf7e8'); sail.rotation.x = Math.PI / 2;
    building(root, 936, 695, 2.75, 1.05, 0.95, '#8ba5a0');
    const runway = cityPoint3d({ x: 0.91, y: 0.79 }, LAND);
    box(root, { ...runway, y: LAND + 0.014 }, { x: 0.65, y: 0.028, z: 3.2 }, '#a9b8aa');
    for (let z = -1.2; z <= 1.2; z += 0.5) box(root, { x: runway.x, y: LAND + 0.031, z: runway.z + z }, { x: 0.06, y: 0.007, z: 0.24 }, IVORY);
    const plane = new TransformNode(name('plane'), scene!); plane.parent = root;
    orb(plane, { ...runway, y: LAND + 0.23 }, { x: 0.18, y: 0.18, z: 1.05 }, IVORY);
    box(plane, { ...runway, y: LAND + 0.23 }, { x: 0.9, y: 0.05, z: 0.2 }, IVORY);
    box(plane, { x: runway.x, y: LAND + 0.3, z: runway.z + 0.38 }, { x: 0.035, y: 0.28, z: 0.18 }, '#829f9c');
    batch(root);
    for (const mesh of root.getChildMeshes()) mesh.freezeWorldMatrix();
  }

  function buildFestival(): void {
    const root = scenery = new TransformNode('rush-lantern-isles', scene!);
    box(root, { x: 0, y: -.22, z: 0 }, { x: 29.2, y: .18, z: 20.2 }, '#91c4ca');
    for (let row = 0; row < 12; row++) for (let col = 0; col < 15; col++)
      box(root, { x: -13.5 + col * 1.86, y: -.122, z: -9.4 + row * 1.6 }, { x: .55, y: .005, z: .025 }, '#d4efed');
    FESTIVAL_ISLANDS.forEach(i => island(root, i.points, i.center));
    const landmark = (id: string) => { const node = new TransformNode(`rush-place-${id}`, scene!); node.parent = root; return node; };
    for (const [ax,ay,bx,by] of [[.108,.63,.244,.28],[.244,.28,.323,.438],[.396,.54,.413,.2],[.413,.2,.58,.21],[.456,.816,.687,.906],[.687,.906,.88,.788],[.78,.46,.87,.258]])
      segment(root, cityPoint3d({ x: ax, y: ay }, LAND+.015), cityPoint3d({ x: bx, y: by }, LAND+.015), .28, .02, '#f2ebd7');
    const lighthouse = landmark('lighthouse'), at = cityPoint3d({x:.107,y:.43},LAND);
    box(lighthouse, {...at,y:LAND+.05}, {x:1.6,y:.1,z:1}, '#b5a388');
    cylinder(lighthouse, {...at,y:LAND+1.25}, .65, 2.5, '#fbf0da');
    for (const y of [.6,1.45,2.3]) cylinder(lighthouse, {...at,y:LAND+y}, .67, .22, '#c87059');
    cylinder(lighthouse, {...at,y:LAND+2.7}, .82, .4, '#638f9b');
    orb(lighthouse, {...at,y:LAND+2.7}, {x:.4,y:.28,z:.4}, '#ffe5a2');
    const roof = shape(lighthouse,'triangle',{...at,y:LAND+3.02},{x:1.05,y:.2,z:1.05},'#ad6755'); roof.rotation.x=Math.PI;
    const market = landmark('night-market');
    for (let i=0;i<3;i++) {
      const x=.22+i*.039,y=.35; building(market,x*1120,y*760,.8,.6,.65,'#cf7c63');
      const a=cityPoint3d({x,y},LAND+.64); box(market,{...a,z:a.z-.44},{x:.95,y:.12,z:.5},i%2?'#729e97':'#d7965d');
    }
    for (let i=0;i<9;i++) {
      const a=cityPoint3d({x:.192+i*.015,y:.307},LAND+1.24+Math.sin(i/2)*.15);
      orb(market,a,{x:.21,y:.3,z:.21},i%2?'#e9a746':'#cf6954');
      cylinder(market,{...a,y:a.y-.2},.025,.15,'#f6e3b5');
      if(i) segment(market,cityPoint3d({x:.192+(i-1)*.015,y:.307},LAND+1.5+Math.sin((i-1)/2)*.15),{...a,y:a.y+.25},.025,.025,'#8a7856');
    }
    const plaza=landmark('clock-plaza'), clock=cityPoint3d({x:.56,y:.40},LAND);
    cylinder(plaza,{...clock,y:LAND+.025},1.8,.05,'#ecddbd');
    building(plaza,.56*1120,.40*760,.55,.5,1.95,'#aa7962');
    const face=shape(plaza,'disc',{...clock,y:LAND+1.55,z:clock.z-.265},{x:.4,y:.4,z:1},'#fff7df'); face.rotation.y=Math.PI;
    box(plaza,{x:clock.x,y:LAND+1.62,z:clock.z-.28},{x:.025,y:.16,z:.02},'#425f5b');
    const hand=box(plaza,{x:clock.x+.055,y:LAND+1.52,z:clock.z-.28},{x:.14,y:.025,z:.02},'#425f5b'); hand.rotation.z=-.4;
    const observatory=landmark('observatory'), dome=cityPoint3d({x:.65,y:.21},LAND);
    cylinder(observatory,{...dome,y:LAND+.35},1.9,.7,'#e9dcca');
    orb(observatory,{...dome,y:LAND+.8},{x:2.1,y:1.4,z:1.9},'#789ea8');
    box(observatory,{...dome,y:LAND+.95},{x:.06,y:1.25,z:1.92},'#c9e0df');
    const telescope=cylinder(observatory,{x:dome.x+.8,y:LAND+1.65,z:dome.z-.2},.19,.85,'#466d77'); telescope.rotation.z=-.9;
    orb(observatory,{x:dome.x+1.12,y:LAND+1.95,z:dome.z-.2},{x:.23,y:.23,z:.23},'#ebd39d');
    const glasshouse=landmark('glasshouse'), glass=cityPoint3d({x:.86,y:.265},LAND);
    box(glasshouse,{...glass,y:LAND+.65},{x:2.1,y:1.3,z:1.25},'#c5dfcf');
    const glassRoof=shape(glasshouse,'triangle',{...glass,y:LAND+1.45},{x:2.15,y:.32,z:1.4},'#8dbbab'); glassRoof.rotation.y=Math.PI;
    for(const x of [-.8,-.4,0,.4,.8]) box(glasshouse,{x:glass.x+x,y:LAND+.67,z:glass.z-.636},{x:.045,y:1.3,z:.035},'#f2f0d8');
    box(glasshouse,{...glass,y:LAND+.67,z:glass.z-.66},{x:2.1,y:.04,z:.025},'#f2f0d8');
    tree(glasshouse,glass.x-.75,glass.z-.85,.5); tree(glasshouse,glass.x+.7,glass.z-.85,.5);
    const library=landmark('sky-story-tower'); building(library,.36*1120,.23*760,.65,.65,1.9,'#7192a0');
    const cap=cityPoint3d({x:.36,y:.23},LAND+2.05);
    shape(library,'triangle',cap,{x:.9,y:.35,z:.9},'#ba8067');
    const theatre=landmark('puppet-theatre'), stageAt=cityPoint3d({x:.48,y:.79},LAND);
    shape(theatre,'ring',{...stageAt,y:LAND+.11},{x:2.4,y:3,z:1.6},'#d5b992');
    box(theatre,{...stageAt,y:LAND+.6,z:stageAt.z+.35},{x:1.3,y:1.2,z:.3},'#9c6f5a');
    box(theatre,{...stageAt,y:LAND+.65,z:stageAt.z+.18},{x:1.1,y:.7,z:.03},'#e8bb80');
    for(const x of [-.48,.48]) box(theatre,{x:stageAt.x+x,y:LAND+.65,z:stageAt.z+.14},{x:.17,y:.7,z:.03},'#be6c65');
    orb(theatre,{...stageAt,y:LAND+.65,z:stageAt.z+.10},{x:.18,y:.18,z:.1},'#608b89');
    const boats=landmark('paper-boats');
    for(let i=0;i<4;i++) {
      const boat=cityPoint3d({x:.672+i*.029,y:.90+(i%2)*.019},LAND+.07);
      const hull=shape(boats,'triangle',boat,{x:.5,y:.08,z:.35},i%2?'#ebbb79':'#f8ecda'); hull.rotation.y=Math.PI/2;
      const sail=shape(boats,'triangle',{...boat,y:boat.y+.15},{x:.4,y:.025,z:.3},'#f8f0db'); sail.rotation.x=Math.PI/2;
    }
    const balloons=landmark('balloons');
    for(const [x,y,color] of [[.865,.62,'#ce776d'],[.91,.59,'#6595b0'],[.935,.64,'#e0b552']] as const) {
      const at=cityPoint3d({x,y},LAND);
      orb(balloons,{...at,y:LAND+2.1},{x:.95,y:1.25,z:.95},color);
      box(balloons,{...at,y:LAND+1.12},{x:.24,y:.2,z:.24},'#9b7854');
      for(const dx of [-.1,.1]) cylinder(balloons,{x:at.x+dx,y:LAND+1.42,z:at.z},.02,.45,'#fae9ca');
    }
    for(const [x,y] of [[.45,.125],[.49,.135],[.53,.14],[.08,.64],[.17,.73],[.27,.63],[.90,.45]]) {
      const at=cityPoint3d({x,y}); tree(root,at.x,at.z,.85);
    }
    batch(root); for(const mesh of root.getChildMeshes()) mesh.freezeWorldMatrix();
  }

  function buildRails(view: CitySnapshot): void {
    const points = new Map(view.stations.map(s => [s.id, s.position]));
    const decor = new TransformNode(name('rails'), scene!); decor.parent = network;
    for (const line of view.lines) for (let i = 1; i < line.stops.length; i++) {
      const pa = points.get(line.stops[i - 1]), pb = points.get(line.stops[i]); if (!pa || !pb) continue;
      const a = cityPoint3d(pa, TRACK - 0.06), b = cityPoint3d(pb, TRACK - 0.06), length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length < 0.001) continue;
      const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
      segment(decor, a, b, 0.65, 0.12, '#e9e4cf');
      segment(decor, { ...a, y: TRACK }, { ...b, y: TRACK }, 0.09, 0.025, line.color);
      for (const lane of [-0.23, 0.23]) segment(decor,
        { x: a.x + dz * lane, y: TRACK + 0.012, z: a.z - dx * lane },
        { x: b.x + dz * lane, y: TRACK + 0.012, z: b.z - dx * lane }, 0.025, 0.035, '#7f9691');
      for (let step = 0.12; step < length; step += 0.3) {
        const at = { x: a.x + dx * step, y: TRACK - 0.005, z: a.z + dz * step };
        const sleeper = box(decor, at, { x: 0.035, y: 0.04, z: 0.59 }, '#a6aa96'); sleeper.rotation.y = Math.atan2(-dz, dx);
      }
      const bridge = view.mapId === 'lantern-isles' ? festivalIslandAt(pa) !== festivalIslandAt(pb)
        : Math.max(pa.y, pb.y) > 0.74 && Math.min(pa.y, pb.y) < 0.7;
      if (bridge) {
        segment(decor, { ...a, y: TRACK - 0.14 }, { ...b, y: TRACK - 0.14 }, 0.85, 0.16, '#859c91');
        for (const lane of [-0.4, 0.4]) segment(decor,
          { x: a.x + dz * lane, y: TRACK + 0.28, z: a.z - dx * lane },
          { x: b.x + dz * lane, y: TRACK + 0.28, z: b.z - dx * lane }, 0.04, 0.05, '#b8c2b1');
        for (let step = 0.6; step < length; step += 0.9) {
          const x = a.x + dx * step, z = a.z + dz * step;
          cylinder(decor, { x, y: 0.11, z }, 0.19, 0.55, '#859c91');
          for (const lane of [-0.4, 0.4]) cylinder(decor, { x: x + dz * lane, y: TRACK + 0.12, z: z - dx * lane }, 0.035, 0.3, '#b8c2b1');
        }
      }
    }
    batch(decor); for (const mesh of decor.getChildMeshes()) mesh.freezeWorldMatrix();
  }

  function createStation(station: StationView, index: number): StationNode {
    const root = new TransformNode(`rush-station:${station.id}`, scene!); root.parent = network;
    const decor = new TransformNode(name('shelter'), scene!); decor.parent = root;
    const platform = cylinder(root, { x: 0, y: TRACK - 0.02, z: 0 }, 1.55, 0.14, '#fbf6e5');
    platform.scaling.z = 0.78; platform.isPickable = true; platform.metadata = { station: station.id };
    const ring = shape(root, 'ring', { x: 0, y: TRACK + 0.07, z: 0 }, { x: 1.9, y: 0.8, z: 1.6 }, '#b94432');
    const style = station.id === 'central' ? 0 : station.id === 'museum' ? 1 : station.id === 'harbor' ? 2
      : station.id === 'market' ? 3 : station.id === 'garden' ? 4 : index % 5;
    const color = ['#88a79e', '#a9b7a6', '#829f9c', '#c08c73', '#8eb18a'][style];
    box(decor, { x: 0, y: TRACK + 0.02, z: 0.48 }, { x: 1.65, y: 0.13, z: 0.6 }, IVORY);
    for (const x of [-0.65, 0.65]) cylinder(decor, { x, y: TRACK + 0.41, z: 0.5 }, 0.07, 0.78, '#7f9691');
    if (style === 0) {
      for (const x of [-0.45, 0.45]) {
        const wing = box(decor, { x, y: TRACK + 0.86, z: 0.5 }, { x: 0.95, y: 0.1, z: 0.82 }, color); wing.rotation.z = x > 0 ? 0.12 : -0.12;
      }
      cylinder(decor, { x: 0, y: TRACK + 0.6, z: 0.5 }, 0.07, 1.1, '#f5f3eb');
    } else if (style === 1) {
      const roof = shape(decor, 'triangle', { x: 0, y: TRACK + 0.84, z: 0.5 }, { x: 2.1, y: 0.18, z: 1 }, color); roof.rotation.y = Math.PI;
      for (const x of [-0.25, 0.25]) cylinder(decor, { x, y: TRACK + 0.41, z: 0.67 }, 0.065, 0.76, IVORY);
    } else {
      box(decor, { x: 0, y: TRACK + 0.83, z: 0.5 }, { x: 1.85, y: 0.13, z: 0.82 }, color);
      if (style === 3) for (const x of [-0.65, -0.25, 0.15, 0.55]) box(decor, { x, y: TRACK + 0.905, z: 0.5 }, { x: 0.16, y: 0.02, z: 0.81 }, '#f5f3eb');
      if (style === 4) for (const x of [-0.55, 0.55]) cylinder(decor, { x, y: TRACK + 0.12, z: 0.77 }, 0.22, 0.18, '#b38a63');
    }
    box(decor, { x: -0.22, y: TRACK + 0.17, z: 0.5 }, { x: 0.65, y: 0.08, z: 0.15 }, '#b3997e');
    cylinder(decor, { x: 0.85, y: TRACK + 0.31, z: -0.22 }, 0.05, 0.62, '#7f9691');
    box(decor, { x: 0.85, y: TRACK + 0.55, z: -0.22 }, { x: 0.22, y: 0.22, z: 0.05 }, INK);
    batch(decor);
    const people: TransformNode[] = [];
    for (let i = 0; i < 8; i++) {
      const person = new TransformNode(name('waiting'), scene!); person.parent = root;
      passengerPart(person, 'cylinder', { x: 0, y: 0.1, z: 0 }, { x: 0.085, y: 0.2, z: 0.085 }, ['#b58160', '#6e9381', '#668b9c'][i % 3]);
      passengerPart(person, 'sphere', { x: 0, y: 0.25, z: 0 }, { x: 0.1, y: 0.1, z: 0.1 }, '#e6caa5');
      person.position.copyFromFloats(-0.5 + (i % 4) * 0.27, TRACK + 0.055, -0.4 - Math.floor(i / 4) * 0.18); people.push(person);
    }
    const button = document.createElement('button'); button.type = 'button'; button.className = 'rush-3d-station'; button.dataset.station = station.id;
    const label = document.createElement('span'); label.className = 'rush-3d-station-name';
    const count = document.createElement('span'); count.className = 'rush-3d-queue'; count.setAttribute('aria-hidden', 'true');
    button.append(label, count); labelHost!.append(button);
    const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line'); leader.classList.add('rush-3d-leader'); leaders!.append(leader);
    const at = cityPoint3d(station.position); root.position.copyFromFloats(at.x, 0, at.z);
    return { root, platform, ring, people, button, label, count, leader, anchor: new Vector3(at.x, TRACK + 0.13, at.z) };
  }

  function rebuildNetwork(view: CitySnapshot): void {
    network?.dispose(); stations.forEach(node => { node.button.remove(); node.leader.remove(); }); stations.clear();
    network = new TransformNode('rush-network', scene!); buildRails(view);
    view.stations.forEach((station, index) => stations.set(station.id, createStation(station, index)));
    labelsDirty = true;
  }
  function updateStations(view: CitySnapshot): void {
    for (const station of view.stations) {
      const node = stations.get(station.id)!;
      const previous = node.previous;
      if (previous?.label !== station.label) { node.label.textContent = station.label; labelsDirty = true; }
      if (previous?.accessibleName !== station.accessibleName) { node.button.setAttribute('aria-label', station.accessibleName); node.button.title = station.accessibleName; }
      if (previous?.selected !== station.selected) {
        node.button.setAttribute('aria-pressed', String(station.selected)); node.ring.setEnabled(station.selected); labelsDirty = true;
      }
      if (!previous || (previous.waiting >= 20) !== (station.waiting >= 20)) { node.button.classList.toggle('is-busy', station.waiting >= 20); labelsDirty = true; }
      if (previous?.helped !== station.helped) {
        node.button.classList.toggle('is-helped', station.helped); node.platform.material = material(station.helped ? '#b8d7b7' : '#fbf6e5');
      }
      if (previous?.eventActive !== station.eventActive) node.button.classList.toggle('is-event', station.eventActive);
      if (previous?.waiting !== station.waiting) {
        node.count.textContent = String(station.waiting); node.people.forEach((person, index) => person.setEnabled(index < Math.min(8, station.waiting)));
      }
      node.previous = station;
    }
  }

  function trainGeometry(node: TrainNode, color: string, spare: boolean): void {
    node.root.getChildren().forEach(child => child.dispose());
    const art = new TransformNode(name('carriages'), scene!); art.parent = node.root;
    for (const x of [-0.78, 0, 0.78]) {
      box(art, { x, y: 0, z: 0 }, { x: 0.7, y: 0.3, z: 0.38 }, color);
      box(art, { x, y: 0.19, z: 0 }, { x: 0.66, y: 0.08, z: 0.35 }, IVORY);
      for (const z of [-0.195, 0.195]) {
        for (const window of [-0.21, 0, 0.21]) box(art, { x: x + window, y: 0.065, z }, { x: 0.12, y: 0.12, z: 0.018 }, '#d6e8df');
        box(art, { x, y: -0.09, z }, { x: 0.68, y: 0.04, z: 0.02 }, spare ? '#d8ad57' : '#426d69');
      }
      for (const wheel of [-0.23, 0.23]) for (const z of [-0.15, 0.15]) {
        const mesh = cylinder(art, { x: x + wheel, y: -0.18, z }, 0.12, 0.035, '#385b53'); mesh.rotation.x = Math.PI / 2;
      }
    }
    for (const x of [-0.39, 0.39]) box(art, { x, y: -0.07, z: 0 }, { x: 0.13, y: 0.05, z: 0.1 }, '#385b53');
    for (const x of [-1.14, 1.14]) box(art, { x, y: 0.035, z: 0 }, { x: 0.025, y: 0.12, z: 0.24 }, '#557c79');
    batch(art);
    for (const mesh of art.getChildMeshes()) { mesh.isPickable = true; mesh.metadata = { train: Number(node.button.dataset.train) }; }
  }
  function updateTrains(view: CitySnapshot): void {
    const alive = new Set(view.trains.map(train => train.id));
    for (const [id, node] of trains) if (!alive.has(id)) { node.root.dispose(); node.button.remove(); trains.delete(id); }
    for (const train of view.trains) {
      const color = view.lines.find(line => line.id === train.line)?.color ?? INK;
      let node = trains.get(train.id);
      if (!node) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'rush-3d-train'; button.dataset.train = String(train.id);
        const glyph = document.createElement('span'); glyph.className = 'rush-3d-train-glyph'; glyph.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 3; i++) glyph.append(document.createElement('i'));
        const id = document.createElement('span'); id.textContent = `№${train.id}`; id.setAttribute('aria-hidden', 'true');
        const count = document.createElement('span'); count.className = 'rush-3d-riders'; count.setAttribute('aria-hidden', 'true');
        button.append(glyph, id, count); trainStrip!.append(button);
        node = { root: new TransformNode(`rush-train:${train.id}`, scene!), button, count, signature: '' }; trains.set(train.id, node);
      }
      const next = `${color}:${train.spare}`, geometryChanged = node.signature !== next;
      if (geometryChanged) {
        node.signature = next;
        // Merge in local space, even when an existing train is recolored at a distant station.
        node.root.position.setAll(0); node.root.rotation.setAll(0); trainGeometry(node, color, train.spare);
        node.button.style.setProperty('--train-color', color); node.button.classList.toggle('is-spare', train.spare);
      }
      const previous = node.previous;
      if (geometryChanged || !previous || previous.position.x !== train.position.x || previous.position.y !== train.position.y || previous.heading !== train.heading) {
        const pose = cityTrainPose(train); node.root.position.copyFromFloats(pose.x, pose.y, pose.z); node.root.rotation.y = pose.yaw;
      }
      if (previous?.accessibleName !== train.accessibleName) { node.button.setAttribute('aria-label', train.accessibleName); node.button.title = train.accessibleName; }
      if (previous?.moving !== train.moving) node.button.dataset.moving = String(train.moving);
      if (previous?.riders !== train.riders) node.count.textContent = String(train.riders);
      if (node.button.disabled !== !selectTrain) node.button.disabled = !selectTrain;
      node.previous = train;
    }
    if (trainStrip!.hidden !== (trains.size === 0)) trainStrip!.hidden = trains.size === 0;
  }

  function projectLabels(): void {
    if (!scene || !camera || !engine || !canvas || !leaders || !snapshot) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (width < 44 || height < 44) return;
    const key = [camera.alpha, camera.beta, camera.radius, width, height, engine.getRenderWidth(), engine.getRenderHeight()].join(':');
    if (!labelsDirty && key === projection) return;
    projection = key; labelsDirty = false; leaders.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()), input: CityProjectedLabel[] = [];
    for (const station of snapshot.stations) {
      const node = stations.get(station.id)!;
      const p = Vector3.Project(node.anchor, identity, scene.getTransformMatrix(), viewport);
      const x = p.x * width / engine.getRenderWidth(), y = p.y * height / engine.getRenderHeight();
      const visible = cameraAnchorVisible(x, y, p.z, width, height);
      if (node.button.hidden !== !visible) node.button.hidden = !visible;
      if (!visible) { node.leader.style.display = 'none'; continue; }
      input.push({ id: station.id, x, y, width: width <= 560 ? 64 : 86, height: 48, priority: station.waiting >= 20 ? 0 : 1, selected: station.selected });
    }
    for (const placed of layoutCityLabels(input, width, height)) {
      const node = stations.get(placed.id)!;
      node.button.style.width = `${placed.width}px`; node.button.style.height = `${placed.height}px`;
      node.button.style.transform = `translate(${placed.left.toFixed(2)}px, ${placed.top.toFixed(2)}px)`;
      node.leader.setAttribute('x1', String(placed.x)); node.leader.setAttribute('y1', String(placed.y));
      node.leader.setAttribute('x2', String(placed.left + placed.width / 2)); node.leader.setAttribute('y2', String(placed.top + placed.height / 2));
      node.leader.style.display = Math.hypot(placed.left + placed.width / 2 - placed.x, placed.top + placed.height / 2 - placed.y) > 8 ? '' : 'none';
    }
  }

  function activate(event: MouseEvent): void {
    if (event.detail > 0 && event.timeStamp <= suppressClickUntil) return;
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('button[data-station], button[data-train]');
    if (!button || button.disabled) return;
    if (button.dataset.station) select?.(button.dataset.station);
    else if (button.dataset.train) selectTrain?.(Number(button.dataset.train));
  }
  function pointerDown(event: PointerEvent): void {
    if (pointers.size === 0) suppressClickUntil = 0;
    pointers.add(event.pointerId);
    if (pointer) { pointer.multiple = true; return; }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, distance: 0, multiple: pointers.size > 1 };
  }
  function pointerMove(event: PointerEvent): void {
    if (pointer?.id === event.pointerId) pointer.distance = Math.max(pointer.distance, Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y));
  }
  function pointerUp(event: PointerEvent): void {
    pointers.delete(event.pointerId); if (!pointer || pointer.id !== event.pointerId) return;
    const gesture = pointer; pointer = null;
    const distance = Math.max(gesture.distance, Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y));
    if (distance >= 7 || gesture.multiple) suppressClickUntil = event.timeStamp + 700;
    if (!active || unavailable || !scene || !canvas || distance >= 7 || gesture.multiple || event.button !== 0
      || event.timeStamp - gesture.time >= 550 || event.target !== canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const hit = scene.pick(event.clientX - bounds.left, event.clientY - bounds.top, mesh => mesh.isPickable && !!mesh.metadata, false, camera);
    const target = hit?.pickedMesh?.metadata as { station?: string; train?: number } | undefined;
    if (target?.station) select?.(target.station); else if (target?.train !== undefined) selectTrain?.(target.train);
  }
  function pointerCancel(event: PointerEvent): void {
    pointers.delete(event.pointerId); if (pointer) pointer.multiple = true;
    if (pointer?.id === event.pointerId) pointer = null;
    suppressClickUntil = event.timeStamp + 700;
  }
  function fail(): void {
    if (!active || unavailable) return;
    unavailable = true;
    try { engine?.stopRenderLoop(renderFrame); } catch { /* A lost engine must still notify the owner. */ }
    const failedGeneration = generation;
    // Fallback may remount/render synchronously: never call its owner inside an unfinished mount or update.
    queueMicrotask(() => { if (active && unavailable && generation === failedGeneration) onUnavailable?.(); });
  }
  function contextLost(event: Event): void { event.preventDefault(); fail(); }
  function fitCamera(): void {
    if (!camera || !canvas) return;
    const key = [canvas.clientWidth, canvas.clientHeight, camera.alpha, camera.beta, signature].join(',');
    if (key === fitKey) return;
    fitKey = key;
    const minimum = cityCameraRadius(canvas.clientWidth, canvas.clientHeight, camera.alpha, camera.beta,
      snapshot?.stations.map(station => station.position), snapshot?.mapId ?? 'little-bay');
    if (Math.abs(minimum - fitRadius) < 0.01) return;
    fitCameraZoom(camera, minimum, fitRadius);
    fitRadius = minimum; camera.maxZ = minimum * 2 + 40; labelsDirty = true;
  }
  function resize(): void {
    if (!engine || !canvas) return;
    try {
      engine.setHardwareScalingLevel(1 / Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5))); engine.resize(); fitCamera(); labelsDirty = true;
    } catch { fail(); }
  }
  function resetCamera(): void {
    if (!camera) return;
    camera.setTarget(new Vector3(0, CITY_CAMERA.targetY, 0));
    camera.alpha = ALPHA; camera.beta = BETA; fitRadius = 0; fitKey = ''; fitCamera();
    clearCameraInertia(camera); labelsDirty = true;
  }
  function renderFrame(): void {
    if (!active || unavailable || !scene) return;
    try { if (typeof document !== 'undefined' && document.hidden) return; fitCamera(); scene.render(); projectLabels(); } catch { fail(); }
  }
  function dispose(): void {
    active = false; generation++;
    observer?.disconnect(); observer = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resize); window.removeEventListener('pointerup', pointerUp); window.removeEventListener('pointercancel', pointerCancel);
    }
    wrapper?.removeEventListener('pointerdown', pointerDown); wrapper?.removeEventListener('pointermove', pointerMove); canvas?.removeEventListener('pointerup', pointerUp);
    canvas?.removeEventListener('webglcontextlost', contextLost); wrapper?.removeEventListener('click', activate);
    const cleanup = (action: () => void) => { try { action(); } catch { /* Continue releasing the other resources after a lost context. */ } };
    cleanup(() => engine?.stopRenderLoop(renderFrame)); cleanup(() => camera?.detachControl()); cleanup(() => scene?.dispose()); cleanup(() => engine?.dispose());
    wrapper?.remove(); wrapper = null; stage = null; canvas = null; labelHost = null; leaders = null; trainStrip = null;
    engine = null; scene = null; camera = null; network = null; scenery = null; sceneryMap = 'little-bay'; snapshot = null; select = undefined; selectTrain = undefined;
    materials.clear(); shapes.clear(); crowd.clear(); stations.clear(); trains.clear(); pointers.clear(); pointer = null;
    signature = ''; projection = ''; labelsDirty = true; fitRadius = 0; fitKey = ''; suppressClickUntil = 0;
  }

  return {
    mount(host, onStation, onTrain) {
      dispose(); unavailable = false; serial = 0; select = onStation; selectTrain = onTrain;
      try {
        wrapper = document.createElement('div'); wrapper.className = 'rush-3d'; wrapper.setAttribute('role', 'group');
        stage = document.createElement('div'); stage.className = 'rush-3d-stage';
        canvas = document.createElement('canvas'); canvas.id = 'rush-3d-canvas'; canvas.setAttribute('aria-hidden', 'true'); canvas.tabIndex = -1;
        leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leaders.classList.add('rush-3d-leaders'); leaders.setAttribute('aria-hidden', 'true');
        labelHost = document.createElement('div'); labelHost.className = 'rush-3d-labels';
        trainStrip = document.createElement('div'); trainStrip.className = 'rush-3d-trains'; trainStrip.hidden = true;
        stage.append(canvas, leaders, labelHost); wrapper.append(stage, trainStrip); host.append(wrapper);
        engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power', doNotHandleContextLost: true }, false);
        scene = new Scene(engine); scene.clearColor = Color4.FromHexString('#a9cfcaFF');
        scene.skipPointerMovePicking = true; scene.skipPointerDownPicking = true; scene.skipPointerUpPicking = true;
        camera = new ArcRotateCamera('rush-camera', ALPHA, BETA, 40, new Vector3(0, CITY_CAMERA.targetY, 0), scene);
        camera.fov = FOV; camera.minZ = 0.1; camera.lowerAlphaLimit = -1.91; camera.upperAlphaLimit = -1.1;
        camera.lowerBetaLimit = 0.65; camera.upperBetaLimit = 1.02; camera.panningSensibility = 0;
        attachCameraControls(camera, canvas);
        const daylight = new HemisphericLight(name('daylight'), new Vector3(0.15, 1, -0.3), scene);
        daylight.intensity = 0.94; daylight.groundColor = Color3.FromHexString('#799e8d');
        const sun = new DirectionalLight(name('sun'), new Vector3(-0.55, -1, 0.4), scene);
        sun.intensity = 0.52; sun.diffuse = Color3.FromHexString('#fff0d0');
        buildCoast(); wrapper.addEventListener('click', activate);
        wrapper.addEventListener('pointerdown', pointerDown); wrapper.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp);
        canvas.addEventListener('webglcontextlost', contextLost);
        window.addEventListener('pointerup', pointerUp); window.addEventListener('pointercancel', pointerCancel); window.addEventListener('resize', resize);
        if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(resize); observer.observe(stage); }
        engine.setHardwareScalingLevel(1 / Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5))); engine.resize(); resetCamera();
        scene.render(); active = true; engine.runRenderLoop(renderFrame);
      } catch (error) { dispose(); throw error; }
    },
    render(view) {
      if (!active || unavailable || !scene || !wrapper) return;
      try {
        if (snapshot?.accessibleName !== view.accessibleName) wrapper.setAttribute('aria-label', view.accessibleName);
        snapshot = view;
        wrapper.dataset.map = view.mapId;
        if (sceneryMap !== view.mapId) {
          scenery?.dispose(); sceneryMap = view.mapId;
          if (view.mapId === 'lantern-isles') buildFestival(); else buildCoast();
          scene.clearColor = Color4.FromHexString(view.mapId === 'lantern-isles' ? '#91c4caFF' : '#a9cfcaFF');
          resetCamera();
        }
        const next = cityStaticSignature(view);
        if (next !== signature) { signature = next; rebuildNetwork(view); }
        updateStations(view); updateTrains(view);
      } catch { fail(); }
    },
    resetCamera,
    zoomCamera(direction) { if (camera) { zoomCamera(camera, direction); labelsDirty = true; } },
    dispose,
  };
}
