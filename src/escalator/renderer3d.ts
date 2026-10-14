import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3,
} from '../babylon';
import { Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { copy, destinationColor, destinationIcon, landingName } from './locale';
import type { Piece, Point } from './model';
import { clearanceCutaways, type MallRenderer } from './renderer';
import type { MallSnapshot } from './view';
import { issueText, shopperLabel } from './feedback';
import { experienceCopy } from './experience-copy';
import { attachCameraControls, cameraAnchorVisible, clearCameraInertia, fitCameraZoom, zoomCamera, type CameraControls } from '../camera-controls';

const COLUMN = 2.65;
const FLOOR = 3.15;
const PLATFORM = 0.5;
const INK = '#284d47';
type Position = { x: number; y: number; z: number };
type RiderView = MallSnapshot['riders'][number];

export function mallPoint3d(point: Point): Position {
  return { x: (point.x - 3) * COLUMN, y: PLATFORM + point.y * FLOOR, z: 0 };
}

export function isConstructionTap(distance: number, duration: number, multiplePointers: boolean): boolean {
  return !multiplePointers && distance < 7 && duration >= 0 && duration < 550;
}

export const MALL_CAMERA = Object.freeze({ alpha: -1.33, beta: 1.16, fov: .64,
  minAlpha: -2.75, maxAlpha: -.35, minBeta: .72, maxBeta: 1.42 });

export function mallCameraRadius(width: number, height: number, alpha: number = MALL_CAMERA.alpha, beta: number = MALL_CAMERA.beta): number {
  const w = Math.max(90, width), h = Math.max(90, height), padding = Math.min(26, w * .12, h * .12);
  const tangent = Math.tan(MALL_CAMERA.fov / 2), tx = tangent * (w - 2 * padding) / h, ty = tangent * (h - 2 * padding) / h;
  const radial = new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
  const right = new Vector3(-Math.sin(alpha), 0, Math.cos(alpha));
  const up = new Vector3(-Math.cos(alpha) * Math.cos(beta), Math.sin(beta), -Math.sin(alpha) * Math.cos(beta));
  let radius = 23;
  for (const x of [-10, 10]) for (const y of [-.5, 13]) for (const z of [-2.1, 4.8]) {
    const p = new Vector3(x, y - 5.9, z - 1.15);
    radius = Math.max(radius, Vector3.Dot(p, radial) + Math.max(Math.abs(Vector3.Dot(p, right)) / tx, Math.abs(Vector3.Dot(p, up)) / ty));
  }
  return radius;
}

export function mallStaticSignature(view: MallSnapshot): string {
  const p = view.puzzle;
  return JSON.stringify([p.id, p.landings, p.obstacles, p.lowCeilings, p.requests]);
}

export interface ProjectedLabel {
  id: string; x: number; y: number; width: number; height: number; priority: number;
}
export interface PositionedLabel extends ProjectedLabel { left: number; top: number }

// Native targets remain in the viewport; leaders retain their exact world anchors.
export function layout3dLabels(labels: readonly ProjectedLabel[], width: number, height: number): PositionedLabel[] {
  const placed: PositionedLabel[] = [];
  const offsets = [[0, 0], [0, -28], [0, 28], [-28, 0], [28, 0], [0, -56], [0, 56],
    [-56, -28], [56, -28], [-56, 28], [56, 28], [0, -84], [0, 84], [-84, 0], [84, 0],
    [-112, -56], [112, -56], [-112, 56], [112, 56], [0, -140], [0, 140]];
  for (const label of [...labels].sort((a, b) => a.priority - b.priority)) {
    const w = Math.min(label.width, Math.max(1, width - 8));
    const h = Math.min(label.height, Math.max(1, height - 8));
    let best = { left: 4, top: 4 }, bestScore = Infinity, bestOverlap = Infinity;
    const consider = (x: number, y: number) => {
      const left = Math.max(4, Math.min(width - w - 4, x));
      const top = Math.max(4, Math.min(height - h - 4, y));
      let overlap = 0;
      for (const other of placed) {
        const ox = Math.max(0, Math.min(left + w + 3, other.left + other.width) - Math.max(left - 3, other.left));
        const oy = Math.max(0, Math.min(top + h + 3, other.top + other.height) - Math.max(top - 3, other.top));
        overlap += ox * oy;
      }
      const score = overlap * 1000 + Math.hypot(left + w / 2 - label.x, top + h / 2 - label.y);
      if (score < bestScore) { bestScore = score; bestOverlap = overlap; best = { left, top }; }
    };
    for (const [dx, dy] of offsets) {
      consider(label.x - w / 2 + dx, label.y - h / 2 + dy);
      if (bestOverlap === 0 && dx === 0 && dy === 0) break;
    }
    // Crowded phone frames can use the remaining space without shrinking touch targets.
    if (bestOverlap > 0) {
      for (let top = 4; top <= height - h - 4; top += 12) {
        for (let left = 4; left <= width - w - 4; left += 12) consider(left, top);
      }
    }
    placed.push({ ...label, width: w, height: h, ...best });
  }
  return placed;
}

export function anchored3dLabel(label: ProjectedLabel, width: number, height: number): PositionedLabel {
  const w = Math.min(label.width, Math.max(1, width - 8)), h = Math.min(label.height, Math.max(1, height - 8));
  return { ...label, width: w, height: h, left: Math.max(4, Math.min(width - w - 4, label.x - w / 2)),
    top: Math.max(4, Math.min(height - h - 4, label.y - h / 2)) };
}

// Retain each target's local offset through an orbit; collision correction never switches lanes in one frame.
export function stable3dTargets(input: readonly ProjectedLabel[], width: number, height: number,
  previous: ReadonlyMap<string, PositionedLabel>): { labels: PositionedLabel[]; settling: boolean } {
  if (!previous.size) return { labels: layout3dLabels(input, width, height), settling: false };
  const shifted = input.map(label => {
    const old = previous.get(label.id);
    return anchored3dLabel(old ? { ...label, x: label.x + old.left + old.width / 2 - old.x,
      y: label.y + old.top + old.height / 2 - old.y } : label, width, height);
  }).map((label, i) => ({ ...label, x: input[i].x, y: input[i].y }));
  const crowded = shifted.some((a, i) => shifted.slice(i + 1).some(b =>
    a.left < b.left + b.width + 2 && b.left < a.left + a.width + 2 && a.top < b.top + b.height + 2 && b.top < a.top + a.height + 2));
  if (!crowded) return { labels: shifted, settling: false };
  const desired = new Map(layout3dLabels(input, width, height).map(label => [label.id, label]));
  let settling = false;
  const labels = shifted.map(label => {
    const to = desired.get(label.id)!;
    const dx = to.left - label.left, dy = to.top - label.top;
    if (Math.abs(dx) > .1 || Math.abs(dy) > .1) settling = true;
    return { ...label, left: label.left + Math.max(-3, Math.min(3, dx)), top: label.top + Math.max(-3, Math.min(3, dy)) };
  });
  return { labels, settling };
}

const CSS = `
.mall-3d { position:relative; isolation:isolate; container-type:inline-size; width:100%; min-width:0; height:clamp(420px,43vw,680px); background:#c9ded3; overflow:hidden; }
.mall-3d #escalator-3d-canvas { display:block; width:100%; height:100%; position:absolute; inset:0; touch-action:none; outline:none; }
.mall-3d-labels { position:absolute; inset:0; pointer-events:none; z-index:2; overflow:hidden; }
.mall-3d-leaders { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:1; }
.mall-3d-label { position:absolute; left:0; top:0; margin:0; box-sizing:border-box; line-height:1.3; font-family:inherit; }
.mall-3d button.mall-3d-label { min-height:44px; min-width:44px; padding:3px 5px; pointer-events:auto; border:1px solid #799986; border-radius:50%; color:#284d47; background:#faf8e9ee; font-size:11px; font-weight:700; touch-action:manipulation; writing-mode:horizontal-tb; }
.mall-3d button.mall-3d-label:hover:not(:disabled) { background:#d2e6da; border-color:#284d47; }
.mall-3d button.mall-3d-label:focus-visible { outline:3px solid #326fa0; outline-offset:2px; z-index:10; background:#fffdf1; }
.mall-3d button.mall-3d-label:active:not(:disabled) { filter:brightness(.94); }
.mall-3d button.mall-3d-label[aria-pressed="true"] { background:#b14d37; color:#fff9ed; border:2px solid #fff9ed; }
.mall-3d button.mall-3d-label:disabled { color:#52685d; background:#f4f4e6c9; opacity:.76; cursor:default; }
.mall-3d button.mall-3d-piece-label { border-radius:7px; font-size:10px; background:#ecf3e9f2; }
.mall-3d .mall-3d-sign { max-width:160px; padding:5px 8px; border-radius:5px; color:#fff9ed; font-size:12px; font-weight:650; text-align:center; white-space:normal; overflow-wrap:anywhere; box-shadow:2px 3px 5px #284d4720; }
@container (max-width:560px) {
  .mall-3d-labels .mall-3d-sign { max-width:86px; padding:3px 5px; font-size:10px; }
  .mall-3d-labels .mall-3d-selected-label { max-width:130px; }
  .mall-3d-labels button.mall-3d-piece-label { max-width:70px; white-space:normal; font-size:9px; }
}
.mall-3d .mall-3d-entrance, .mall-3d .mall-3d-floor { background:#fbf8e9e8; color:#284d47; box-shadow:none; }
.mall-3d .mall-3d-selected-label { max-width:200px; border:1px solid #b14d37; background:#fff9ed; color:#784031; font-size:11px; }
.mall-3d[lang="mn-Mong-CN"] .mall-3d-sign:not(.mall-3d-floor) { writing-mode:vertical-lr; text-orientation:mixed; max-height:146px; max-width:62px; overflow-wrap:normal; }
.mall-3d .mall-3d-rider-label { font-size:17px; color:#284d47; padding:1px 4px; background:#fff9ed; border-radius:5px; }
.mall-3d .mall-3d-rider-label.is-unhappy { color:#983e2d; background:#fff7e5; border:2px solid #983e2d; font-size:20px; font-weight:700; }
.mall-3d-a11y { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
`;

interface LabelNode {
  element: HTMLElement; line: SVGLineElement; anchor: Vector3; offsetY: number; priority: number;
  width: number; height: number; fullText?: string; compactText?: string;
}
interface PieceNode { root: TransformNode; signature: string; highlight: Mesh[]; cabin?: TransformNode }
interface RiderNode { root: TransformNode; signature: string; balloon?: TransformNode; note: TransformNode }
interface PickTarget { kind: 'landing'; point: Point }
interface PieceTarget { kind: 'piece'; id: string }

export function create3dRenderer(onUnavailable?: () => void): MallRenderer & CameraControls {
  let host: HTMLElement | null = null, wrapper: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null, labelsHost: HTMLDivElement | null = null;
  let leaders: SVGSVGElement | null = null, descriptions: HTMLDivElement | null = null;
  let engine: Engine | null = null, scene: Scene | null = null, camera: ArcRotateCamera | null = null;
  let resizeObserver: ResizeObserver | null = null, world: TransformNode | null = null, previews: TransformNode | null = null;
  let snapshot: MallSnapshot | null = null;
  let landingCallback: (point: Point) => void = () => {}, pieceCallback: (id: string) => void = () => {};
  let staticSignature = '', routeSignature = '', labelsSignature = '', lastProjection = '';
  let labelsDirty = true, metricsDirty = true, metricsWidth = 0, animationTime = 0, unavailable = false, active = false, fitRadius = 0;
  const targetPlacement = new Map<string, PositionedLabel>();
  let pointer: { id: number; x: number; y: number; time: number; distance: number; multiple: boolean } | null = null;
  let suppressClickUntil = 0;
  const pointers = new Set<number>();
  const materials = new Map<string, StandardMaterial>();
  const labels = new Map<string, LabelNode>();
  const landingDots = new Map<string, Mesh>();
  const pieceNodes = new Map<string, PieceNode>();
  const riderNodes = new Map<string, RiderNode>();
  const identity = Matrix.Identity();
  const up = new Vector3(0, 1, 0);
  let serial = 0;
  const name = (prefix: string) => `mall-${prefix}-${serial++}`;
  const vector = (p: Position) => new Vector3(p.x, p.y, p.z);
  const position = (p: Point) => vector(mallPoint3d(p));

  function material(hex: string, alpha = 1, glow = false): StandardMaterial {
    const key = `${hex}:${alpha}:${glow}`;
    let result = materials.get(key);
    if (!result) {
      result = new StandardMaterial(name('material'), scene!);
      result.diffuseColor = Color3.FromHexString(hex);
      result.specularColor = Color3.Black();
      result.ambientColor = result.diffuseColor.scale(0.2);
      result.alpha = alpha;
      if (alpha < 1) { result.backFaceCulling = false; result.disableDepthWrite = true; }
      if (glow) result.emissiveColor = result.diffuseColor.scale(0.6);
      result.freeze();
      materials.set(key, result);
    }
    return result;
  }

  function finish(mesh: Mesh, root: TransformNode, hex: string, alpha = 1, glow = false): Mesh {
    mesh.parent = root; mesh.material = material(hex, alpha, glow); mesh.isPickable = false;
    return mesh;
  }
  function box(root: TransformNode, at: Position, size: Position, hex: string, alpha = 1, glow = false): Mesh {
    const mesh = finish(MeshBuilder.CreateBox(name('box'), { width: size.x, height: size.y, depth: size.z }, scene!), root, hex, alpha, glow);
    mesh.position.copyFromFloats(at.x, at.y, at.z); return mesh;
  }
  function sphere(root: TransformNode, at: Position, size: Position, hex: string): Mesh {
    const mesh = finish(MeshBuilder.CreateSphere(name('sphere'), { diameter: 1, segments: 6 }, scene!), root, hex);
    mesh.position.copyFromFloats(at.x, at.y, at.z); mesh.scaling.copyFromFloats(size.x, size.y, size.z); return mesh;
  }
  function cylinder(root: TransformNode, at: Position, diameter: number, height: number, hex: string, top = diameter): Mesh {
    const mesh = finish(MeshBuilder.CreateCylinder(name('cylinder'), { diameterBottom: diameter, diameterTop: top, height, tessellation: 12 }, scene!), root, hex);
    mesh.position.copyFromFloats(at.x, at.y, at.z); return mesh;
  }
  function bar(root: TransformNode, a: Vector3, b: Vector3, thickness: number, hex: string): Mesh {
    const delta = b.subtract(a), mesh = cylinder(root, a.add(b).scale(0.5), thickness, delta.length(), hex);
    const direction = delta.normalize(), dot = Vector3.Dot(up, direction);
    mesh.rotationQuaternion = dot < -0.9999 ? Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI)
      : dot > 0.9999 ? Quaternion.Identity() : Quaternion.RotationAxis(Vector3.Cross(up, direction).normalize(), Math.acos(dot));
    return mesh;
  }
  function shadow(root: TransformNode, at: Position, width: number, depth: number): void {
    for (let i = 0; i < 3; i++) {
      const mesh = finish(MeshBuilder.CreateDisc(name('shadow'), { radius: 0.5, tessellation: 20 }, scene!), root, INK, 0.045);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.copyFromFloats(at.x + 0.04 * i, at.y + 0.003 * i, at.z + 0.06 * i);
      mesh.scaling.copyFromFloats(width * (1 - i * 0.15), depth * (1 - i * 0.15), 1);
    }
  }
  function plant(root: TransformNode, at: Position, scale = 1): void {
    shadow(root, { ...at, y: at.y + 0.01 }, 0.95 * scale, 0.7 * scale);
    cylinder(root, { ...at, y: at.y + 0.21 * scale }, 0.5 * scale, 0.42 * scale, '#b38a63', 0.66 * scale);
    cylinder(root, { ...at, y: at.y + 0.42 * scale }, 0.62 * scale, 0.06 * scale, '#e2c5a1');
    bar(root, new Vector3(at.x, at.y + 0.4 * scale, at.z), new Vector3(at.x, at.y + 1.25 * scale, at.z), 0.055 * scale, '#476e50');
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const leaf = sphere(root, { x: at.x + Math.cos(angle) * 0.23 * scale, y: at.y + (0.86 + i * 0.09) * scale, z: at.z + Math.sin(angle) * 0.18 * scale },
        { x: 0.27 * scale, y: 0.74 * scale, z: 0.16 * scale }, i % 2 ? '#75956c' : '#4d795c');
      leaf.rotation.z = Math.cos(angle) * 0.64; leaf.rotation.x = Math.sin(angle) * 0.48;
    }
  }

  // Each material becomes one draw call; interactive pieces keep separate ownership.
  function batch(root: TransformNode): Mesh[] {
    const buckets = new Map<StandardMaterial, Mesh[]>();
    for (const mesh of root.getChildMeshes(true)) {
      if (!(mesh instanceof Mesh) || !mesh.material) continue;
      const key = mesh.material as StandardMaterial;
      const bucket = buckets.get(key) ?? []; bucket.push(mesh); buckets.set(key, bucket);
    }
    const result: Mesh[] = [];
    for (const bucket of buckets.values()) {
      if (bucket.length === 1) { result.push(bucket[0]); continue; }
      const merged = Mesh.MergeMeshes(bucket, true, true);
      if (merged) { merged.parent = root; merged.isPickable = false; result.push(merged); }
    }
    for (const mesh of result) mesh.freezeWorldMatrix();
    return result;
  }

  function createWorld(view: MallSnapshot): void {
    world?.dispose(); landingDots.clear();
    world = new TransformNode(name('architecture'), scene!);
    const decor = new TransformNode(name('decor'), scene!); decor.parent = world;
    shadow(decor, { x: 0.35, y: -0.48, z: 1.8 }, 22, 8.5);
    box(decor, { x: 0, y: -0.32, z: 1.55 }, { x: 20.2, y: 0.28, z: 7.3 }, '#95b6a0');
    box(decor, { x: 0, y: -0.12, z: 1.55 }, { x: 19.8, y: 0.12, z: 6.9 }, '#d4ddbe');
    box(decor, { x: 0, y: 5.5, z: 4.5 }, { x: 18.7, y: 11.5, z: 0.25 }, '#e6e5cb');
    for (const x of [-9.35, 9.35]) {
      box(decor, { x, y: 6, z: 4.23 }, { x: 0.36, y: 12.6, z: 0.44 }, '#7d9e87');
      box(decor, { x: x - 0.08, y: 6, z: 3.96 }, { x: 0.12, y: 12.6, z: 0.08 }, '#f5f1d9');
    }
    for (let floor = 0; floor < 4; floor++) {
      const y = PLATFORM + floor * FLOOR;
      // Rear concourse plates are separated from the marked construction islands.
      box(decor, { x: 0, y: y - 0.17, z: 2.85 }, { x: 18.7, y: 0.34, z: 3.3 }, '#f7f2dd');
      box(decor, { x: 0, y: y - 0.23, z: 1.19 }, { x: 18.7, y: 0.18, z: 0.12 }, '#b4b69b');
      box(decor, { x: 0, y: y + 0.64, z: 1.46 }, { x: 18.1, y: 0.035, z: 0.055 }, '#729683');
      for (let x = -8.7; x < 9; x += 2.9) {
        box(decor, { x, y: y + 0.32, z: 1.46 }, { x: 0.045, y: 0.64, z: 0.045 }, '#a6bdab');
      }
      for (let bay = 0; bay < 3; bay++) {
        const x = -4.8 + bay * 4.8, color = ['#b98969', '#8da5a0', '#a1ac7b'][(bay + floor) % 3];
        box(decor, { x, y: y + 0.96, z: 4.18 }, { x: 3.1, y: 1.92, z: 0.4 }, color);
        box(decor, { x, y: y + 0.95, z: 3.94 }, { x: 2.65, y: 1.52, z: 0.09 }, '#c3ddd0');
        box(decor, { x, y: y + 1.25, z: 3.88 }, { x: 2.5, y: 0.07, z: 0.055 }, '#f9f0d2');
        for (const dx of [-0.88, 0, 0.88]) box(decor, { x: x + dx, y: y + 0.94, z: 3.86 }, { x: 0.055, y: 1.53, z: 0.08 }, '#f9f0d2');
        box(decor, { x, y: y + 2, z: 3.93 }, { x: 3.35, y: 0.18, z: 0.82 }, '#eee2be');
        box(decor, { x, y: y + 1.87, z: 3.48 }, { x: 2.95, y: 0.035, z: 0.13 }, '#f5d49a', 1, true);
        box(decor, { x, y: y + 0.19, z: 3.78 }, { x: 2.6, y: 0.17, z: 0.14 }, '#789483');
        if (bay === 1) {
          for (let book = 0; book < 6; book++) box(decor, { x: x - 0.95 + book * 0.37, y: y + 0.54, z: 3.68 }, { x: 0.19, y: 0.42 + (book % 2) * 0.13, z: 0.14 }, book % 2 ? '#be9c64' : '#648c7a');
        } else if (bay === 0) {
          cylinder(decor, { x: x + 0.6, y: y + 0.62, z: 3.63 }, 0.25, 0.32, '#f9f0d2');
          box(decor, { x: x - 0.65, y: y + 0.47, z: 3.68 }, { x: 0.53, y: 0.23, z: 0.25 }, '#ba805c');
        }
      }
      plant(decor, { x: -8.35, y, z: 2.1 }, 0.71);
      plant(decor, { x: 8.1, y, z: 2.5 }, 0.8);
    }
    const roof = 12.28;
    for (const z of [1.15, 4.55]) box(decor, { x: 0, y: roof, z }, { x: 19.1, y: 0.18, z: 0.17 }, '#557d6b');
    for (let x = -9.2; x <= 9.3; x += 2.3) {
      bar(decor, new Vector3(x, roof, 1.15), new Vector3(x, roof + 0.66, 2.85), 0.11, '#c5d3b8');
      bar(decor, new Vector3(x, roof + 0.66, 2.85), new Vector3(x, roof, 4.55), 0.11, '#c5d3b8');
    }
    box(decor, { x: 0, y: roof + 0.66, z: 2.85 }, { x: 19.1, y: 0.1, z: 0.12 }, '#759784');
    for (const x of [-5.8, 0, 5.8]) {
      bar(decor, new Vector3(x, roof + 0.5, 2.85), new Vector3(x, roof - 0.69, 2.85), 0.045, '#8f9d7d');
      cylinder(decor, { x, y: roof - 0.77, z: 2.85 }, 0.9, 0.2, '#c3a16b', 0.36);
      const glow = cylinder(decor, { x, y: roof - 0.89, z: 2.85 }, 0.72, 0.04, '#ffdea1');
      glow.material = material('#ffdea1', 1, true);
      shadow(decor, { x: x + 0.12, y: PLATFORM + 3 * FLOOR + 0.01, z: 2.7 }, 2, 1.2);
    }
    plant(decor, { x: -9.05, y: -0.03, z: -0.55 }, 1.1);
    plant(decor, { x: 9.05, y: -0.03, z: -0.35 }, 1.2);
    for (let i = 0; i < 3; i++) box(decor, { x: 8.5, y: 0.36, z: 2.2 + i * 0.18 }, { x: 1.4, y: 0.07, z: 0.12 }, '#bc9368');
    for (const x of [7.95, 9.05]) box(decor, { x, y: 0.16, z: 2.35 }, { x: 0.08, y: 0.35, z: 0.5 }, '#668672');

    for (const zone of view.puzzle.obstacles) {
      const p = mallPoint3d({ x: zone.x + zone.w / 2, y: zone.y });
      const height = zone.h * FLOOR, width = zone.w * COLUMN;
      box(decor, { x: p.x, y: p.y + height / 2, z: 0.05 }, { x: width, y: height, z: 1.3 }, '#91a679');
      box(decor, { x: p.x, y: p.y + 0.16, z: -0.05 }, { x: width + 0.12, y: 0.32, z: 1.45 }, '#708766');
      for (let i = 0; i < Math.ceil(zone.w * 2); i++) {
        plant(decor, { x: p.x - width / 2 + 0.55 + i * (width - 1.1) / Math.max(1, Math.ceil(zone.w * 2) - 1), y: p.y + height, z: 0.05 }, 0.75);
      }
    }
    for (const zone of view.puzzle.lowCeilings) for (const cutaway of clearanceCutaways(zone, view.puzzle.landings)) {
      const left = mallPoint3d({ x: zone.x, y: cutaway.floor });
      const width = zone.w * COLUMN, top = PLATFORM + cutaway.roof * FLOOR, height = top - left.y;
      // A shallow open-front canopy and a floor-rooted gauge cannot be mistaken for the next concourse.
      box(decor, { x: left.x + width, y: left.y + height / 2, z: .65 }, { x: .1, y: height, z: .13 }, '#b28f61');
      box(decor, { x: left.x + width / 2, y: top, z: .22 }, { x: width + .18, y: .18, z: 1.05 }, '#f3dfab');
      for (let x = left.x + .12; x < left.x + width; x += .38) {
        const stripe = box(decor, { x, y: top, z: -.32 }, { x: .13, y: .19, z: .035 }, '#a0834f'); stripe.rotation.z = -.34;
      }
      for (const landing of cutaway.anchors) {
        const foot = mallPoint3d(landing), gaugeX = foot.x - .48, signX = foot.x + .58, signY = foot.y + height / 2;
        bar(decor, new Vector3(gaugeX, foot.y + .05, -.61), new Vector3(gaugeX, top - .1, -.61), .045, '#966d36');
        for (const y of [foot.y + .05, top - .1]) bar(decor, new Vector3(gaugeX - .12, y, -.61), new Vector3(gaugeX + .12, y, -.61), .045, '#966d36');
        bar(decor, new Vector3(foot.x, foot.y + .09, -.48), new Vector3(signX, signY, -.71), .035, '#b14d37');
        const ring = finish(MeshBuilder.CreateTorus(name('clearance-landing'), { diameter: 1.08, thickness: .045, tessellation: 24 }, scene!), decor, '#b14d37');
        ring.position.copyFromFloats(foot.x, foot.y + .055, 0);
        box(decor, { x: signX, y: signY, z: -.62 }, { x: .66, y: .74, z: .1 }, '#fcf5db');
        sphere(decor, { x: signX, y: signY + .08, z: -.69 }, { x: .25, y: .33, z: .055 }, '#d4a14d');
        bar(decor, new Vector3(signX, signY - .07, -.73), new Vector3(signX - .05, signY - .27, -.73), .025, '#8d784f');
        bar(decor, new Vector3(signX - .24, signY + .25, -.76), new Vector3(signX + .24, signY - .25, -.76), .055, '#b14d37');
      }
    }
    batch(decor);
    for (const landing of view.puzzle.landings) {
      const p = mallPoint3d(landing);
      cylinder(world, { ...p, y: p.y - 0.09 }, 0.92, 0.18, '#cad5b9');
      const pad = cylinder(world, { ...p, y: p.y + 0.006 }, 0.83, 0.03, '#f8f3dd');
      pad.isPickable = true; pad.metadata = { kind: 'landing', point: { ...landing } } satisfies PickTarget;
      const dot = cylinder(world, { ...p, y: p.y + 0.025 }, 0.22, 0.035, '#557d6b');
      dot.isPickable = true; dot.metadata = pad.metadata; landingDots.set(`${landing.x},${landing.y}`, dot);
    }
  }

  function arrow(root: TransformNode, a: Vector3, b: Vector3, t: number, z: number): void {
    const direction = b.subtract(a).normalize(), center = Vector3.Lerp(a, b, t);
    center.z = z; center.y += 0.34;
    const tip = center.add(direction.scale(0.25)), tail = center.subtract(direction.scale(0.25));
    const perpendicular = new Vector3(-direction.y, direction.x, 0);
    bar(root, tail, tip, 0.06, INK);
    for (const side of [-1, 1]) bar(root, tip, center.add(perpendicular.scale(0.16 * side)), 0.06, INK);
  }

  function createPiece(piece: Piece): PieceNode {
    const root = new TransformNode(name('piece'), scene!);
    const a = position(piece.a), b = position(piece.b), delta = b.subtract(a), length = delta.length();
    const angle = Math.atan2(delta.y, delta.x);
    let cabin: TransformNode | undefined;
    if (piece.type === 'elevator') {
      const bottom = Math.min(a.y, b.y), top = Math.max(a.y, b.y), x = a.x;
      for (const z of [-0.56, 0.56]) for (const dx of [-0.67, 0.67]) {
        box(root, { x: x + dx, y: (bottom + top) / 2 + 1.15, z }, { x: 0.07, y: top - bottom + 2.48, z: 0.07 }, '#628773');
      }
      for (const y of [bottom - 0.08, top + 2.39]) box(root, { x, y, z: 0 }, { x: 1.41, y: 0.14, z: 1.2 }, '#b7cdbb');
      for (const side of [-1, 1]) box(root, { x: x + side * 0.67, y: (bottom + top) / 2 + 1.15, z: 0 }, { x: 0.035, y: top - bottom + 2.3, z: 1 }, '#b9ded0', 0.24);
      cabin = new TransformNode(name('cabin'), scene!); cabin.parent = root;
      box(cabin, { x: 0, y: -0.07, z: 0 }, { x: 1.22, y: 0.14, z: 1.03 }, '#e9edda');
      box(cabin, { x: 0, y: 2.28, z: 0 }, { x: 1.22, y: 0.11, z: 1.03 }, '#d4dbc4');
      box(cabin, { x: 0, y: 1.1, z: 0.49 }, { x: 1.18, y: 2.2, z: 0.06 }, '#accdbb', 0.35);
      for (const x of [-0.58, 0.58]) box(cabin, { x, y: 1.1, z: 0 }, { x: 0.045, y: 2.2, z: 0.94 }, '#7a9b85');
      box(cabin, { x: 0.47, y: 0.7, z: -0.52 }, { x: 0.1, y: 0.12, z: 0.04 }, '#e4bd72', 1, true);
      batch(cabin).forEach(mesh => mesh.unfreezeWorldMatrix());
      cabin.position.copyFrom(a);
      arrow(root, a, b, 0.55, -0.64);
    } else {
      const deck = box(root, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 0.115, z: 0 }, { x: length, y: 0.23, z: 1.04 }, piece.type === 'bridge' ? '#b99970' : '#789a86');
      deck.rotation.z = angle;
      if (piece.type === 'bridge') {
        box(root, { x: (a.x + b.x) / 2, y: a.y - 0.008, z: 0 }, { x: length, y: 0.05, z: 0.91 }, '#f4edd4');
        for (let t = 0.13; t < 1; t += 0.13) {
          const p = Vector3.Lerp(a, b, t); box(root, { x: p.x, y: p.y + 0.02, z: p.z }, { x: 0.035, y: 0.015, z: 0.87 }, '#c9bb97');
        }
      } else {
        const count = piece.type === 'long' ? 20 : 15;
        const tread = Math.abs(delta.x) / count;
        for (let i = 0; i < count; i++) {
          const p = Vector3.Lerp(a, b, (i + 0.5) / count);
          box(root, { x: p.x, y: p.y - 0.045, z: 0 }, { x: tread + 0.025, y: 0.1, z: 0.82 }, i % 2 ? '#dbe2c9' : '#eef0d8');
          box(root, { x: p.x, y: p.y + 0.009, z: -0.38 }, { x: tread * 0.82, y: 0.018, z: 0.035 }, '#acaf82');
        }
      }
      for (const z of [-0.5, 0.5]) {
        const start = a.add(new Vector3(0, 0.57, z)), end = b.add(new Vector3(0, 0.57, z));
        bar(root, start, end, 0.09, '#446f5d');
        bar(root, start.add(new Vector3(0, 0.035, 0)), end.add(new Vector3(0, 0.035, 0)), 0.025, '#bfd9c4');
        for (const t of [0.09, 0.5, 0.91]) {
          const p = Vector3.Lerp(a, b, t); p.z = z;
          bar(root, p, p.add(new Vector3(0, 0.55, 0)), 0.035, '#9fb8a0');
        }
      }
      for (const t of [0.35, 0.7]) arrow(root, a, b, t, -0.59);
    }
    const meshes = batch(root);
    for (const mesh of meshes) { mesh.isPickable = true; mesh.metadata = { kind: 'piece', id: piece.id } satisfies PieceTarget; }
    if (cabin) for (const mesh of cabin.getChildMeshes()) { mesh.isPickable = true; mesh.metadata = { kind: 'piece', id: piece.id } satisfies PieceTarget; }
    const highlight: Mesh[] = [];
    for (const z of [-0.65, 0.65]) {
      const start = a.add(new Vector3(0, 0.025, z)), end = b.add(new Vector3(0, 0.025, z));
      highlight.push(bar(root, start, end, 0.08, '#b14d37'));
    }
    highlight.forEach(mesh => { mesh.isPickable = false; mesh.setEnabled(false); });
    return { root, signature: JSON.stringify(piece), highlight, cabin };
  }

  function updatePieces(view: MallSnapshot): void {
    const present = new Set(view.pieces.map(piece => piece.id));
    for (const [id, node] of pieceNodes) if (!present.has(id)) { node.root.dispose(); pieceNodes.delete(id); }
    for (const piece of view.pieces) {
      let node = pieceNodes.get(piece.id);
      if (!node || node.signature !== JSON.stringify(piece)) {
        node?.root.dispose(); node = createPiece(piece); pieceNodes.set(piece.id, node);
      }
      node.highlight.forEach(mesh => mesh.setEnabled(view.selected === piece.id));
      if (node.cabin) {
        const rider = view.riders.find(rider => !rider.arrived && !rider.stuck && Math.abs(rider.point.x - piece.a.x) < 0.001
          && rider.point.y >= Math.min(piece.a.y, piece.b.y) && rider.point.y <= Math.max(piece.a.y, piece.b.y));
        node.cabin.position.copyFrom(position(rider?.point ?? piece.a));
      }
    }
    for (const [key, mesh] of landingDots) {
      const selected = !!view.first && `${view.first.x},${view.first.y}` === key;
      mesh.material = material(selected ? '#b14d37' : '#557d6b');
      mesh.scaling.setAll(selected ? 1.45 : 1);
    }
  }

  function createRider(rider: RiderView): RiderNode {
    const root = new TransformNode(name('rider'), scene!);
    const color = destinationColor[rider.destination], skin = '#b48260';
    let balloon: TransformNode | undefined;
    shadow(root, { x: 0.06, y: 0.017, z: 0.05 }, rider.wheelchair ? 0.7 : 0.46, 0.38);
    const head = rider.wheelchair ? 0.94 : 1.06;
    sphere(root, { x: 0, y: head, z: 0 }, { x: 0.23, y: 0.27, z: 0.23 }, skin);
    sphere(root, { x: 0, y: head + 0.085, z: 0.018 }, { x: 0.25, y: 0.14, z: 0.24 }, '#576757');
    cylinder(root, { x: 0, y: head - 0.28, z: 0 }, 0.26, 0.34, color, 0.2);
    if (rider.wheelchair) {
      box(root, { x: 0, y: 0.43, z: 0.04 }, { x: 0.34, y: 0.07, z: 0.36 }, '#466e68');
      box(root, { x: 0, y: 0.62, z: 0.18 }, { x: 0.35, y: 0.41, z: 0.06 }, '#466e68');
      for (const x of [-0.25, 0.25]) {
        const wheel = finish(MeshBuilder.CreateTorus(name('wheel'), { diameter: 0.49, thickness: 0.055, tessellation: 16 }, scene!), root, '#345d5b');
        wheel.rotation.z = Math.PI / 2; wheel.position.copyFromFloats(x, 0.26, 0.045);
        for (const y of [-0.18, 0.18]) bar(root, new Vector3(x, 0.26, 0.045), new Vector3(x, 0.26 + y, 0.045), 0.022, '#85a39b');
        sphere(root, { x, y: 0.085, z: -0.29 }, { x: 0.1, y: 0.14, z: 0.14 }, '#345d5b');
        bar(root, new Vector3(x, 0.46, 0.15), new Vector3(x, 0.2, -0.3), 0.035, '#75948b');
      }
      for (const x of [-0.08, 0.08]) {
        bar(root, new Vector3(x, 0.56, 0), new Vector3(x, 0.49, -0.24), 0.09, '#425d50');
        bar(root, new Vector3(x, 0.49, -0.24), new Vector3(x, 0.25, -0.28), 0.08, '#425d50');
      }
      box(root, { x: 0, y: 0.18, z: -0.31 }, { x: 0.28, y: 0.04, z: 0.18 }, '#8ea798');
    } else {
      for (const x of [-0.065, 0.065]) {
        bar(root, new Vector3(x, 0.64, 0), new Vector3(x, 0.14, x * 0.6), 0.08, '#425d50');
        box(root, { x, y: 0.075, z: -0.045 }, { x: 0.11, y: 0.1, z: 0.2 }, '#31554b');
      }
    }
    for (const side of [-1, 1]) bar(root, new Vector3(side * 0.12, head - 0.2, 0), new Vector3(side * 0.19, head - 0.47, -0.04), 0.075, skin);
    if (rider.balloon) {
      balloon = new TransformNode(name('balloon'), scene!); balloon.parent = root;
      sphere(balloon, { x: 0.32, y: 1.9, z: 0 }, { x: 0.4, y: 0.55, z: 0.39 }, '#d4a14d');
      cylinder(balloon, { x: 0.32, y: 1.615, z: 0 }, 0.08, 0.09, '#d4a14d', 0);
      bar(balloon, new Vector3(0.18, head - 0.36, -0.04), new Vector3(0.32, 1.59, 0), 0.013, '#8a795c');
      batch(balloon).forEach(mesh => mesh.unfreezeWorldMatrix());
    }
    const note = new TransformNode(name('arrival-note'), scene!); note.parent = root;
    sphere(note, { x: 0.02, y: 1.54, z: -0.13 }, { x: 0.18, y: 0.12, z: 0.08 }, color);
    bar(note, new Vector3(0.09, 1.53, -0.13), new Vector3(0.09, 1.93, -0.13), 0.035, color);
    bar(note, new Vector3(0.09, 1.93, -0.13), new Vector3(0.27, 1.85, -0.13), 0.045, color);
    batch(note).forEach(mesh => mesh.unfreezeWorldMatrix());
    batch(root).forEach(mesh => mesh.unfreezeWorldMatrix());
    return { root, signature: JSON.stringify([rider.destination, rider.wheelchair, rider.balloon]), balloon, note };
  }

  function updateRiders(view: MallSnapshot): void {
    const present = new Set(view.riders.map(rider => rider.id));
    for (const [id, node] of riderNodes) if (!present.has(id)) { node.root.dispose(); riderNodes.delete(id); }
    const groups = new Map<string, number>();
    for (const rider of view.riders) {
      let node = riderNodes.get(rider.id);
      const signature = JSON.stringify([rider.destination, rider.wheelchair, rider.balloon]);
      if (!node || node.signature !== signature) { node?.root.dispose(); node = createRider(rider); riderNodes.set(rider.id, node); }
      const p = position(rider.point), key = `${rider.point.x.toFixed(3)},${rider.point.y.toFixed(3)}`;
      const count = groups.get(key) ?? 0; groups.set(key, count + 1);
      // Queue lanes use depth, never a different logical column or floor.
      p.z = -0.19 - (count % 3) * 0.23; p.x += count >= 3 ? 0.14 * Math.floor(count / 3) : 0;
      node.root.position.copyFrom(p);
      node.note.setEnabled(rider.arrived && !rider.balloon);
    }
  }

  function updatePreview(view: MallSnapshot): void {
    const signature = JSON.stringify(view.routes);
    if (signature === routeSignature) return;
    routeSignature = signature; previews?.dispose(); previews = new TransformNode(name('routes'), scene!);
    view.routes.filter(route => route.ready).forEach((route, index) => {
      for (let segment = 1; segment < route.points.length; segment++) {
        const a = position(route.points[segment - 1]), b = position(route.points[segment]);
        const count = Math.ceil(Vector3.Distance(a, b) / 0.3);
        for (let i = 1; i < count; i++) {
          const p = Vector3.Lerp(a, b, i / count); p.y += 0.13 + index * 0.065; p.z = -0.75 - index * 0.07;
          sphere(previews!, p, { x: 0.05, y: 0.05, z: 0.05 }, destinationColor[route.destination]);
        }
      }
    });
    batch(previews);
  }

  function addLabel(id: string, button: boolean, className: string, anchor: Vector3, offsetY: number, priority: number): LabelNode {
    let node = labels.get(id);
    if (!node) {
      const element = document.createElement(button ? 'button' : 'span');
      element.className = `mall-3d-label ${className}`;
      if (element instanceof HTMLButtonElement) element.type = 'button';
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', '#557a6980'); line.setAttribute('stroke-width', '1');
      leaders!.append(line); labelsHost!.append(element);
      node = { element, line, anchor, offsetY, priority, width: 44, height: 44 }; labels.set(id, node);
    }
    node.anchor.copyFrom(anchor); node.offsetY = offsetY; node.priority = priority;
    return node;
  }

  function updateLabels(view: MallSnapshot): void {
    wrapper!.classList.toggle('is-celebrating',view.celebrating);
    const signature = JSON.stringify([staticSignature, view.pieces, view.language, view.first, view.selected, view.building, view.running,
      view.riders.map(r => [r.id, r.destination, r.wheelchair, r.balloon, r.arrived, r.stuck, r.issues])]);
    if (signature === labelsSignature) {
      for (const rider of view.riders) {
        const node = labels.get(`rider:${rider.id}`);
        if (node) {
          const at = position(rider.point); at.y += rider.balloon ? 2.3 : 1.5;
          if (!node.anchor.equals(at)) { node.anchor.copyFrom(at); labelsDirty = true; }
        }
      }
      return;
    }
    labelsSignature = signature; labelsDirty = true; metricsDirty = true;
    const t = copy[view.language], wanted = new Set<string>();
    wrapper!.lang = view.language; wrapper!.setAttribute('aria-label', t.mall);
    canvas!.setAttribute('aria-label', t.mall);
    const keep = (id: string, button: boolean, className: string, anchor: Vector3, offsetY: number, priority: number) => {
      wanted.add(id); return addLabel(id, button, className, anchor, offsetY, priority);
    };
    for (const p of view.puzzle.landings) {
      const node = keep(`landing:${p.x},${p.y}`, true, 'mall-3d-landing', position(p), 22, 0);
      const button = node.element as HTMLButtonElement;
      button.dataset.landing = `${p.x},${p.y}`; button.textContent = landingName(p); button.removeAttribute('aria-describedby');
      button.setAttribute('aria-label', `${t.landing} ${landingName(p)}`);
      button.setAttribute('aria-pressed', String(!!view.first && view.first.x === p.x && view.first.y === p.y));
      button.disabled = !view.building;
    }
    for (const piece of view.pieces) {
      const at = Vector3.Lerp(position(piece.a), position(piece.b), 0.5); at.z = -0.55; at.y += 0.2;
      const node = keep(`piece:${piece.id}`, true, 'mall-3d-piece-label', at, -24, 1);
      const button = node.element as HTMLButtonElement;
      button.dataset.piece = piece.id;
      node.fullText = `${landingName(piece.a)} → ${landingName(piece.b)}`;
      node.compactText = `${view.pieces.indexOf(piece) + 1}${piece.type === 'elevator' ? '↕' : piece.type === 'bridge' ? '→' : piece.b.y > piece.a.y ? '↗' : '↘'}`;
      button.textContent = canvas!.clientWidth <= 560 ? node.compactText : node.fullText;
      button.setAttribute('aria-label', `${t[piece.type]} ${landingName(piece.a)} → ${landingName(piece.b)}`);
      button.setAttribute('aria-pressed', String(view.selected === piece.id)); button.disabled = !view.building;
      if (view.selected === piece.id) {
        const selected = keep(`selected:${piece.id}`, false, 'mall-3d-sign mall-3d-selected-label', at, -71, 2);
        selected.element.textContent = `${t.selected}: ${t[piece.type]} ${landingName(piece.a)} → ${landingName(piece.b)}`;
      }
    }
    for (const request of view.puzzle.requests) {
      const goal = position(request.goal); goal.y += 1.45;
      const destination = keep(`goal:${request.id}`, false, 'mall-3d-sign', goal, -7, 2);
      destination.element.textContent = `${destinationIcon[request.destination]} ${t[request.destination]} · ${landingName(request.goal)}`;
      destination.element.style.backgroundColor = destinationColor[request.destination];
      const start = position(request.start); start.y += request.balloon ? 2.25 : 1.35;
      const entrance = keep(`entrance:${request.id}`, false, 'mall-3d-sign mall-3d-entrance', start, -12, 3);
      entrance.element.textContent = `${request.wheelchair ? '♿' : request.balloon ? '◯' : '↓'} ${t.departure} · ${landingName(request.start)}`;
      entrance.element.setAttribute('aria-label', `${t.departure} ${landingName(request.start)} · ${t[request.wheelchair ? 'wheelchair' : request.balloon ? 'balloon' : 'walking']} · ${t[request.destination]}`);
    }
    view.puzzle.lowCeilings.forEach((zone, index) => {
      for (const landing of clearanceCutaways(zone, view.puzzle.landings).flatMap(cutaway => cutaway.anchors)) {
        const coordinate = landingName(landing), id = `clearance:${index}:${coordinate}`;
        const node = keep(id, false, 'mall-3d-sign mall-3d-selected-label', position(landing), -68, 2);
        node.element.textContent = `${coordinate} ↑ · ◯̸ ${experienceCopy[view.language].lowRoof}`;
        node.element.dataset.clearanceLanding = coordinate;
        node.element.setAttribute('aria-label', `${coordinate} ↑ · ${experienceCopy[view.language].lowRoof}`);
        node.line.setAttribute('stroke', '#a44834'); node.line.setAttribute('stroke-width', '2');
        labels.get(`landing:${landing.x},${landing.y}`)?.element.setAttribute('aria-describedby', `mall-${id}`);
        node.element.id = `mall-${id}`;
      }
    });
    for (let floor = 0; floor < 4; floor++) {
      const at = new Vector3(-9.3, PLATFORM + floor * FLOOR, 1.7);
      keep(`floor:${floor}`, false, 'mall-3d-sign mall-3d-floor', at, 0, 4).element.textContent = `${t.floor} ${floor + 1}`;
    }
    for (const rider of view.riders) if (rider.arrived || rider.stuck) {
      const at = position(rider.point); at.y += rider.balloon ? 2.3 : 1.5;
      const node = keep(`rider:${rider.id}`, false, 'mall-3d-rider-label', at, -7, 5);
      node.element.textContent = rider.arrived ? '♪' : '☹ !';
      node.element.classList.toggle('is-unhappy',rider.stuck);node.element.dataset.shopper=rider.id;
      const description=`${shopperLabel(view.language,rider)} · ${rider.arrived ? t.delivered : `${experienceCopy[view.language].unhappy}: ${issueText(view.language,rider.issues)}`}`;
      node.element.setAttribute('aria-label',description);node.element.title=description;
    }
    for (const [id, node] of labels) if (!wanted.has(id)) { node.element.remove(); node.line.remove(); labels.delete(id); targetPlacement.delete(id); }
    descriptions!.replaceChildren();
    for (const rider of view.riders) {
      const text = document.createElement('span');
      text.textContent = `${t[rider.wheelchair ? 'wheelchair' : rider.balloon ? 'balloon' : 'walking']} · ${t[rider.destination]} · ${rider.arrived ? t.delivered : rider.stuck ? `${experienceCopy[view.language].unhappy}: ${issueText(view.language,rider.issues)} · ${landingName(rider.start)} → ${landingName(rider.goal)}` : view.building ? t.ready : view.running ? t.running : t.paused}. `;
      descriptions!.append(text);
    }
  }

  function measureLabels(width: number): void {
    if (!metricsDirty && metricsWidth === width) return;
    metricsDirty = false; metricsWidth = width;
    // Batch writes before intrinsic reads, including labels previously hidden outside the frustum.
    for (const node of labels.values()) {
      if (node.fullText && node.compactText) node.element.textContent = width <= 560 ? node.compactText : node.fullText;
      node.element.style.visibility = 'hidden'; node.element.hidden = false;
    }
    for (const node of labels.values()) {
      const minimum = node.element instanceof HTMLButtonElement ? 44 : 1;
      node.width = Math.max(minimum, node.element.offsetWidth); node.height = Math.max(minimum, node.element.offsetHeight);
    }
    for (const node of labels.values()) node.element.style.visibility = '';
  }

  function projectLabels(): void {
    if (!camera || !scene || !engine || !canvas || !leaders) return;
    const target = camera.getTarget();
    const key = [camera.alpha, camera.beta, camera.radius, target.x, target.y, target.z,
      canvas.clientWidth, canvas.clientHeight, engine.getRenderWidth(), engine.getRenderHeight()].join(',');
    if (!labelsDirty && key === lastProjection) return;
    labelsDirty = false; lastProjection = key;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    leaders.setAttribute('viewBox', `0 0 ${width} ${height}`);
    measureLabels(width);
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const projected = new Map<string, { x: number; y: number }>();
    const targets: ProjectedLabel[] = [], signs: PositionedLabel[] = [];
    for (const [id, node] of labels) {
      const p = Vector3.Project(node.anchor, identity, scene.getTransformMatrix(), viewport);
      const x = p.x * width / engine.getRenderWidth(), y = p.y * height / engine.getRenderHeight();
      const visible = cameraAnchorVisible(x, y, p.z, width, height);
      if (node.element.hidden !== !visible) node.element.hidden = !visible;
      if (!visible) { node.line.style.display = 'none'; continue; }
      projected.set(id, { x, y });
      const label = { id, x, y: y + node.offsetY, width: node.width, height: node.height, priority: node.priority };
      if (node.element instanceof HTMLButtonElement) targets.push(label);
      else signs.push(anchored3dLabel(label, width, height));
    }
    const stable = stable3dTargets(targets, width, height, targetPlacement);
    labelsDirty = stable.settling;
    for (const placed of stable.labels) targetPlacement.set(placed.id, placed);
    for (const placed of [...stable.labels, ...signs]) {
      const node = labels.get(placed.id)!, original = projected.get(placed.id)!;
      node.element.style.transform = `translate(${placed.left.toFixed(1)}px, ${placed.top.toFixed(1)}px)`;
      node.line.setAttribute('x1', String(original.x)); node.line.setAttribute('y1', String(original.y));
      node.line.setAttribute('x2', String(placed.left + placed.width / 2)); node.line.setAttribute('y2', String(placed.top + placed.height / 2));
      node.line.style.display = Math.hypot(placed.left + placed.width / 2 - original.x, placed.top + placed.height / 2 - original.y) > 20 ? '' : 'none';
    }
  }

  function activate(event: MouseEvent): void {
    if (event.detail > 0 && event.timeStamp <= suppressClickUntil) return;
    if (!snapshot?.building || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-landing],button[data-piece]');
    if (!button || button.disabled) return;
    if (button.dataset.landing) {
      const [x, y] = button.dataset.landing.split(',').map(Number); landingCallback({ x, y });
    } else if (button.dataset.piece) pieceCallback(button.dataset.piece);
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
    pointers.delete(event.pointerId);
    if (!pointer || pointer.id !== event.pointerId) return;
    const gesture = pointer; pointer = null;
    gesture.distance = Math.max(gesture.distance, Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y));
    if (gesture.distance >= 7 || gesture.multiple) suppressClickUntil = event.timeStamp + 700;
    if (!snapshot?.building || !scene || !canvas || !isConstructionTap(gesture.distance, event.timeStamp - gesture.time, gesture.multiple)
      || event.button !== 0 || event.target !== canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const hit = scene.pick(event.clientX - bounds.left, event.clientY - bounds.top, mesh => mesh.isPickable && !!mesh.metadata, false, camera);
    const action = hit?.pickedMesh?.metadata as PickTarget | PieceTarget | undefined;
    if (action?.kind === 'landing') landingCallback({ ...action.point });
    else if (action?.kind === 'piece') pieceCallback(action.id);
  }
  function pointerCancel(event: PointerEvent): void {
    pointers.delete(event.pointerId); if (pointer) pointer.multiple = true;
    if (pointer?.id === event.pointerId) pointer = null;
    suppressClickUntil = event.timeStamp + 700;
  }
  function fail(): void {
    if (!active || unavailable) return;
    unavailable = true; engine?.stopRenderLoop(renderFrame); onUnavailable?.();
  }
  function contextLost(event: Event): void { event.preventDefault(); fail(); }
  function fitCamera(): void {
    if (!canvas || !camera) return;
    const reference = mallCameraRadius(canvas.clientWidth, canvas.clientHeight, camera.alpha, camera.beta) + 2.5;
    if (Math.abs(reference - fitRadius) < .001) return;
    fitCameraZoom(camera, reference, fitRadius);
    fitRadius = reference; camera.maxZ = Math.max(90, fitRadius * 2 + 35); labelsDirty = true;
  }
  function resize(): void {
    if (!engine || !canvas || !camera) return;
    engine.setHardwareScalingLevel(1 / Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5)));
    engine.resize(); fitCamera(); metricsDirty = true; labelsDirty = true;
  }
  function resetCamera(): void {
    if (!camera) return;
    camera.setTarget(new Vector3(0, 5.9, 1.15));
    camera.alpha = MALL_CAMERA.alpha; camera.beta = MALL_CAMERA.beta; fitRadius = 0; fitCamera();
    clearCameraInertia(camera); targetPlacement.clear(); labelsDirty = true;
  }
  function renderFrame(): void {
    if (!active || unavailable || !engine || !scene) return;
    if (snapshot?.running && !snapshot.reducedMotion) animationTime += Math.min(engine.getDeltaTime(), 80) / 1000;
    for (const node of riderNodes.values()) if (node.balloon) {
      node.balloon.position.y = snapshot?.reducedMotion ? 0 : Math.sin(animationTime * 1.8) * 0.035;
    }
    try { fitCamera(); scene.render(); projectLabels(); } catch { fail(); }
  }

  function dispose(): void {
    active = false;
    resizeObserver?.disconnect(); resizeObserver = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerup', pointerUp); window.removeEventListener('pointercancel', pointerCancel);
    }
    wrapper?.removeEventListener('pointerdown', pointerDown); wrapper?.removeEventListener('pointermove', pointerMove);
    canvas?.removeEventListener('webglcontextlost', contextLost);
    labelsHost?.removeEventListener('click', activate);
    engine?.stopRenderLoop(renderFrame); camera?.detachControl(); scene?.dispose(); engine?.dispose();
    wrapper?.remove();
    host = null; wrapper = null; canvas = null; labelsHost = null; leaders = null; descriptions = null;
    engine = null; scene = null; camera = null; world = null; previews = null; snapshot = null;
    materials.clear(); labels.clear(); landingDots.clear(); pieceNodes.clear(); riderNodes.clear(); pointers.clear(); pointer = null;
    staticSignature = ''; routeSignature = ''; labelsSignature = ''; lastProjection = ''; animationTime = 0; fitRadius = 0; suppressClickUntil = 0;
    targetPlacement.clear(); metricsDirty = true; metricsWidth = 0; labelsDirty = true;
  }

  return {
    mount(container, onLanding, onPiece) {
      if (active || wrapper) dispose();
      host = container; landingCallback = onLanding; pieceCallback = onPiece; unavailable = false; serial = 0;
      wrapper = document.createElement('div'); wrapper.className = 'mall-3d'; wrapper.setAttribute('role', 'group');
      wrapper.style.position = 'relative'; wrapper.style.width = '100%'; wrapper.style.minWidth = '0';
      wrapper.style.maxWidth = '100%'; wrapper.style.boxSizing = 'border-box';
      const style = document.createElement('style'); style.textContent = CSS; wrapper.append(style);
      canvas = document.createElement('canvas'); canvas.id = 'escalator-3d-canvas'; canvas.setAttribute('aria-hidden', 'true'); canvas.tabIndex = -1;
      canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.position = 'absolute'; canvas.style.inset = '0'; canvas.style.touchAction = 'none';
      leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leaders.classList.add('mall-3d-leaders'); leaders.setAttribute('aria-hidden', 'true');
      labelsHost = document.createElement('div'); labelsHost.className = 'mall-3d-labels';
      labelsHost.style.position = 'absolute'; labelsHost.style.inset = '0'; labelsHost.style.pointerEvents = 'none';
      descriptions = document.createElement('div'); descriptions.className = 'mall-3d-a11y';
      wrapper.append(canvas, leaders, labelsHost, descriptions); host.replaceChildren(wrapper);
      try {
        engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power', doNotHandleContextLost: true }, false);
        scene = new Scene(engine); scene.clearColor = new Color4(0.79, 0.87, 0.83, 1);
        scene.skipPointerMovePicking = true; scene.skipPointerDownPicking = true; scene.skipPointerUpPicking = true;
        camera = new ArcRotateCamera(name('camera'), -1.33, 1.16, 25.5, new Vector3(0, 5.9, 1.15), scene);
        camera.fov = 0.64; camera.minZ = 0.1; camera.maxZ = 90;
        camera.lowerAlphaLimit = MALL_CAMERA.minAlpha; camera.upperAlphaLimit = MALL_CAMERA.maxAlpha;
        camera.lowerBetaLimit = MALL_CAMERA.minBeta; camera.upperBetaLimit = MALL_CAMERA.maxBeta;
        attachCameraControls(camera, canvas);
        const sky = new HemisphericLight(name('daylight'), new Vector3(0.2, 1, -0.4), scene);
        sky.intensity = 0.9; sky.groundColor = Color3.FromHexString('#79957c');
        const sun = new DirectionalLight(name('sun'), new Vector3(-0.6, -1, 0.4), scene);
        sun.intensity = 0.55; sun.diffuse = Color3.FromHexString('#fff0d0');
        labelsHost.addEventListener('click', activate);
        wrapper.addEventListener('pointerdown', pointerDown); wrapper.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp); window.addEventListener('pointercancel', pointerCancel);
        canvas.addEventListener('webglcontextlost', contextLost); window.addEventListener('resize', resize);
        if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(wrapper); }
        active = true; resize(); resetCamera();
        document.fonts?.ready.then(() => { if (active) { metricsDirty = true; labelsDirty = true; } });
        engine.runRenderLoop(renderFrame);
      } catch (error) { dispose(); throw error; }
    },
    render(view) {
      if (!active || unavailable || !scene) return;
      snapshot = view;
      const signature = mallStaticSignature(view);
      if (signature !== staticSignature) { staticSignature = signature; targetPlacement.clear(); createWorld(view); }
      updatePieces(view); updatePreview(view); updateRiders(view); updateLabels(view);
    },
    resetCamera,
    zoomCamera(direction) { if (camera) { zoomCamera(camera, direction); labelsDirty = true; } },
    dispose,
  };
}
