import * as B from './babylon';
import { footprint, type Piece, type Mode } from './model';

const unit = 1.28;
const hex = (s: string) => B.Color3.FromHexString(s);
export class World {
  readonly engine: B.Engine; readonly scene: B.Scene; readonly camera: B.ArcRotateCamera; readonly canvas: HTMLCanvasElement;
  private roots = new Map<string, B.TransformNode>(); private ghost?: B.TransformNode;
  private materials = new Map<string, B.StandardMaterial>();
  private actors: B.TransformNode[] = []; private scenery: B.TransformNode[] = [];
  private pieces: Piece[] = []; private mode: Mode = 'rescue'; private playing = false; private successful = false; private time = 0;
  private sun?: Piece;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true }, true);
    this.scene = new B.Scene(this.engine); this.scene.clearColor = new B.Color4(.53, .83, .94, 1);
    this.scene.ambientColor = new B.Color3(.55, .58, .65);
    this.camera = new B.ArcRotateCamera('orbit camera', -Math.PI / 4, 1.02, 24, new B.Vector3(0, 0, 0), this.scene);
    this.camera.lowerRadiusLimit = 10; this.camera.upperRadiusLimit = 42; this.camera.lowerBetaLimit = .22; this.camera.upperBetaLimit = 1.47;
    this.camera.wheelPrecision = 36; this.camera.pinchPrecision = 55; this.camera.panningSensibility = 95; this.camera.attachControl(canvas, true);
    const hemi = new B.HemisphericLight('sky fill', new B.Vector3(0, 1, 0), this.scene); hemi.intensity = 1.18; hemi.groundColor = hex('#718ca6');
    const sun = new B.DirectionalLight('warm sunlight', new B.Vector3(-.55, -1, .4), this.scene); sun.intensity = 1.5; sun.diffuse = hex('#fff1ca');
    this.scene.onBeforeRenderObservable.add(() => this.animate(this.engine.getDeltaTime() / 1000));
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener('resize', () => this.engine.resize());
  }
  private mat(color: string) {
    let m = this.materials.get(color);
    if (!m) { m = new B.StandardMaterial('clay ' + color, this.scene); m.diffuseColor = hex(color); m.specularColor = hex('#23394f').scale(.15); this.materials.set(color, m); }
    return m;
  }
  private attach(mesh: B.Mesh, parent: B.TransformNode, color: string, pickId?: string) {
    mesh.parent = parent; mesh.material = this.mat(color); mesh.isPickable = !!pickId; if (pickId) mesh.metadata = { pieceId: pickId }; return mesh;
  }
  private box(parent: B.TransformNode, name: string, w: number, h: number, d: number, x: number, y: number, z: number, color: string, id?: string) {
    const m = this.attach(B.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene), parent, color, id); m.position.set(x, y, z); return m;
  }
  private sphere(parent: B.TransformNode, name: string, diameter: number, x: number, y: number, z: number, color: string, id?: string) {
    const m = this.attach(B.MeshBuilder.CreateSphere(name, { diameter, segments: 16 }, this.scene), parent, color, id); m.position.set(x, y, z); return m;
  }
  private cylinder(parent: B.TransformNode, name: string, diameter: number, height: number, x: number, y: number, z: number, color: string, id?: string, top?: number) {
    const m = this.attach(B.MeshBuilder.CreateCylinder(name, { diameter, diameterTop: top ?? diameter, height, tessellation: 20 }, this.scene), parent, color, id); m.position.set(x, y, z); return m;
  }
  private torus(parent: B.TransformNode, name: string, diameter: number, thickness: number, x: number, y: number, z: number, color: string, id?: string) {
    const m = this.attach(B.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 32 }, this.scene), parent, color, id); m.position.set(x, y, z); return m;
  }
  private node(name: string) { return new B.TransformNode(name, this.scene); }
  private makePiece(p: Piece, ghost = false) {
    const root = this.node(p.kind + ' ' + p.id); const [w, d] = footprint(p); root.position.set((p.x + (w - 1) / 2) * unit, p.y * .86, (p.z + (d - 1) / 2) * unit); root.rotation.y = (p.rotation % 4) * Math.PI / 2;
    const c = p.color, id = ghost ? undefined : p.id;
    const block = (width = .99, height = .67, depth = .99, y = .37) => this.box(root, 'smooth clay block', width * unit, height, depth * unit, 0, y, 0, c, id);
    switch (p.kind) {
      case 'tile': block(); for (let x of [-.25, .25]) for (let z of [-.25, .25]) this.cylinder(root, 'round peg', .26, .11, x, .76, z, c, id); break;
      case 'beam': block(2.96, .46, .92, .3); for (let x of [-1.2, 0, 1.2]) this.cylinder(root, 'beam dot', .26, .1, x, .58, 0, c, id); break;
      case 'path': block(2.95, .12, .95, .09); for (let x of [-1.15, 0, 1.15]) this.box(root, 'stepping stone', .55, .035, .27, x, .17, 0, '#fff2d2'); break;
      case 'pillar': this.cylinder(root, 'column', .66, 1.33, 0, .7, 0, c, id); this.cylinder(root, 'column cap', .91, .16, 0, 1.4, 0, c, id); break;
      case 'arch': this.box(root, 'arch left', .29, 1.1, .52, -.43, .55, 0, c, id); this.box(root, 'arch right', .29, 1.1, .52, .43, .55, 0, c, id); this.box(root, 'arch top', 1.15, .29, .52, 0, 1.18, 0, c, id); break;
      case 'ramp': { const m = this.attach(B.MeshBuilder.CreateCylinder('sloping wedge', { diameter: 1.2, diameterTop: 0, height: 1.08, tessellation: 3 }, this.scene), root, c, id); m.rotation.set(0, Math.PI / 2, Math.PI / 2); m.position.y = .45; break; }
      case 'dome': this.sphere(root, 'dome canopy', 1.28, 0, .37, 0, c, id); this.cylinder(root, 'dome foot', .95, .12, 0, .07, 0, '#f7e6ba', id); break;
      case 'wheel': this.box(root, 'ride stand', .65, .4, .68, 0, .2, 0, c, id); this.cylinder(root, 'ride support', .14, 1.65, 0, 1.17, 0, '#354965', id); { const spin = this.node('spinning wheel'); spin.parent = root; spin.position.y = 1.85; const hoop = this.torus(spin, 'ride wheel', 1.48, .16, 0, 0, 0, c, id); hoop.rotation.x = Math.PI / 2; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; this.sphere(spin, 'ride seat', .29, Math.sin(a) * .72, Math.cos(a) * .72, 0, ['#ff6f61', '#ffc857', '#57c9b3'][i % 3], id); } } break;
      case 'tree': this.cylinder(root, 'tree stem', .22, .8, 0, .45, 0, '#8b6654', id); this.sphere(root, 'tree crown', 1.12, 0, 1.24, 0, c, id); this.sphere(root, 'tree crown tuft', .78, .28, 1.5, .14, c, id); break;
      case 'flower': this.cylinder(root, 'flower stem', .1, .7, 0, .4, 0, '#438c73', id); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; this.sphere(root, 'petal', .33, Math.sin(a) * .26, .82 + Math.cos(a) * .26, 0, c, id); } this.sphere(root, 'flower center', .27, 0, .82, .12, '#ffc857', id); break;
      case 'habitat': this.box(root, 'habitat floor', 2.32, .18, 2.32, 0, .13, 0, '#dbba89', id); for (let x of [-.95, .95]) for (let z of [-.95, .95]) this.cylinder(root, 'habitat post', .13, .88, x, .59, z, c, id); this.sphere(root, 'habitat roof', 2.0, 0, 1.1, 0, c, id); break;
      case 'sun': this.sphere(root, 'sun heart', 1.35, 0, 1.07, 0, c, id); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; this.sphere(root, 'sun ray', .28, Math.sin(a) * .9, 1.07 + Math.cos(a) * .9, 0, '#ffc857', id); } break;
      case 'planet': this.sphere(root, 'planet', 1.13, 0, .78, 0, c, id); { const ring = this.torus(root, 'planet ring', 1.66, .085, 0, .78, 0, '#f7e6ba', id); ring.rotation.x = .34; } break;
      case 'moon': this.sphere(root, 'little moon', .65, 0, .65, 0, c, id); break;
      case 'comet': this.sphere(root, 'comet head', .66, .18, .83, 0, c, id); for (let i = 0; i < 3; i++) this.sphere(root, 'comet tail', .28 - i * .055, -.23 - i * .24, .83 + i * .11, 0, '#f7f1df', id); break;
      case 'body': this.cylinder(root, 'costume', .87, 1.02, 0, .58, 0, c, id, .58); this.sphere(root, 'left hand', .26, -.52, .68, 0, '#f7d8ab', id); this.sphere(root, 'right hand', .26, .52, .68, 0, '#f7d8ab', id); break;
      case 'head': this.sphere(root, 'round face', .94, 0, .66, 0, c, id); for (let x of [-.18, .18]) this.sphere(root, 'bright eye', .105, x, .75, -.42, '#354965', id); this.sphere(root, 'nose', .13, 0, .55, -.45, '#ffb38e', id); break;
      case 'hat': this.cylinder(root, 'hat brim', .95, .13, 0, .1, 0, c, id); this.cylinder(root, 'party hat', .8, .95, 0, .61, 0, c, id, .025); this.sphere(root, 'pom', .19, 0, 1.12, 0, '#ffc857', id); break;
      case 'star': for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; this.sphere(root, 'star point', .3, Math.sin(a) * .34, .76 + Math.cos(a) * .34, 0, c, id); } this.sphere(root, 'star center', .48, 0, .76, 0, c, id); break;
    }
    if (ghost) root.getChildMeshes().forEach(m => { m.visibility = .48; m.isPickable = false; });
    return root;
  }
  setPieces(pieces: Piece[]) {
    for (const root of this.roots.values()) root.dispose(false, true); this.roots.clear(); this.pieces = pieces;
    for (const piece of pieces) this.roots.set(piece.id, this.makePiece(piece));
    this.sun = pieces.find(p => p.kind === 'sun');
  }
  select(id: string | null) { this.roots.forEach((root, key) => root.getChildMeshes().forEach(mesh => { mesh.renderOutline = id === key; mesh.outlineWidth = .05; mesh.outlineColor = hex('#fff7ce'); })); }
  setGhost(piece?: Piece, valid = true) { this.ghost?.dispose(false, true); this.ghost = undefined; if (piece) { this.ghost = this.makePiece({ ...piece, color: valid ? piece.color : '#e75b72' }, true); } }
  pickPiece(x: number, y: number): string | undefined { return this.scene.pick(x, y, mesh => !!mesh.metadata?.pieceId)?.pickedMesh?.metadata?.pieceId; }
  pickGrid(x: number, y: number): { x: number; z: number } | undefined {
    const ray = this.scene.createPickingRay(x, y, null, this.camera);
    if (ray.direction.y >= -.001) return;
    const distance = (-.03 - ray.origin.y) / ray.direction.y;
    const px = ray.origin.x + ray.direction.x * distance;
    const pz = ray.origin.z + ray.direction.z * distance;
    if (distance <= 0 || Math.abs(px) > 12.8 || Math.abs(pz) > 11.5) return;
    return { x: Math.round(px / unit), z: Math.round(pz / unit) };
  }
  private decor(fn: (root: B.TransformNode) => void) { const root = this.node('scenery'); fn(root); root.getChildMeshes().forEach(m => m.isPickable = false); this.scenery.push(root); return root; }
  setMode(mode: Mode) {
    this.stop(); this.mode = mode; this.setPieces([]);
    this.scenery.forEach(n => n.dispose(false, true)); this.scenery = [];
    this.scene.clearColor = B.Color4.FromHexString(mode === 'solar' ? '#162840ff' : mode === 'parade' ? '#97c7e8ff' : '#88d9f0ff');
    this.decor(r => {
      this.box(r, 'floating worktable shadow', 26.3, .32, 23.7, 0, -.6, 0, mode === 'solar' ? '#273652' : '#668ca8');
      this.box(r, 'scalloped stage slab', 25.5, .26, 22.9, 0, -.32, 0, mode === 'solar' ? '#314263' : mode === 'parade' ? '#e9af91' : '#e6d0a3');
      this.box(r, 'stage top', 25.3, .08, 22.7, 0, -.15, 0, mode === 'solar' ? '#263a5d' : mode === 'parade' ? '#f9dcbc' : '#f5e9cf');
      for (let x = -9; x <= 9; x++) for (let z = -8; z <= 8; z++) this.cylinder(r, 'grid pip', .035, .012, x * unit, -.1, z * unit, mode === 'solar' ? '#607395' : '#d7c6a6');
      if (mode === 'rescue') {
        this.box(r, 'blue winding river', 6.05, .045, 22.4, 0, -.08, 0, '#60c9df');
        for (let z of [-6, -2.5, 2.5, 6]) for (let x of [-3.2, 3.2]) { this.cylinder(r, 'river bank', .45, .12, x * unit, .01, z * unit, '#92c98f'); this.sphere(r, 'bank bush', .55, x * unit, .27, z * unit, '#6baf88'); }
        this.box(r, 'arrival platform', 2.1, .19, 2.9, -5.1, .01, 0, '#ffc857'); this.box(r, 'destination platform', 2.1, .19, 2.9, 5.1, .01, 0, '#ffc857');
      } else if (mode === 'park') {
        this.cylinder(r, 'park center lawn', 10, .025, 0, -.07, 0, '#a2d6a1');
        for (let x of [-7, 7]) for (let z of [-5, 5]) { this.sphere(r, 'park hedge', .8, x * unit, .24, z * unit, '#70ae82'); this.sphere(r, 'park blossom', .25, x * unit, .67, z * unit, '#ffe2a6'); }
      } else if (mode === 'solar') {
        for (let radius of [3, 5.4, 8]) { const ring = this.torus(r, 'orbital guide', radius * 2, .035, 0, -.055, 0, '#7084aa'); ring.rotation.x = Math.PI / 2; }
        for (let i = 0; i < 25; i++) this.sphere(r, 'stardust', .055, Math.sin(i * 12.78) * 11, .04, Math.cos(i * 9.37) * 9, '#f3dda6');
      } else if (mode === 'parade') {
        this.box(r, 'performance floor', 11.3, .1, 7, 0, -.05, 0, '#ef9d8a');
        for (let x of [-5.5, 5.5]) { this.cylinder(r, 'curtain pole', .18, 4, x, 1.65, -3.55, '#e47374'); this.sphere(r, 'curtain finial', .3, x, 3.7, -3.55, '#ffc857'); }
        this.box(r, 'stage back', 11.5, 3.5, .15, 0, 1.6, 3.56, '#e7b9b2');
      } else {
        for (let x of [-8, 8]) for (let z of [-7, 7]) this.sphere(r, 'corner cloud', .68, x * unit, .35, z * unit, '#f4bfc0');
      }
    });
    this.camera.setTarget(new B.Vector3(0, .4, 0)); this.camera.radius = mode === 'solar' ? 29 : 25;
  }
  private makeActor(color: string) {
    const root = this.node('little neighbor'); this.sphere(root, 'neighbor body', .43, 0, .4, 0, color); this.sphere(root, 'neighbor head', .48, 0, .88, 0, '#f6d1aa');
    for (let x of [-.1, .1]) this.sphere(root, 'neighbor eye', .055, x, .92, -.22, '#354965'); root.getChildMeshes().forEach(m => m.isPickable = false); this.actors.push(root); return root;
  }
  play(success: boolean) {
    this.stop(); this.playing = true; this.successful = success; this.time = 0;
    if (this.mode === 'rescue') for (let i = 0; i < (success ? 4 : 2); i++) this.makeActor(['#ff6f61', '#6487df', '#b77ce0', '#57c9b3'][i]);
    if (this.mode === 'park') for (let i = 0; i < (success ? 6 : 2); i++) this.makeActor(['#ff6f61', '#6487df', '#b77ce0', '#57c9b3'][i % 4]);
  }
  stop() { this.playing = false; this.actors.forEach(a => a.dispose(false, true)); this.actors = []; this.roots.forEach((root, id) => { const p = this.pieces.find(p => p.id === id); if (p) { const [w, d] = footprint(p); root.position.set((p.x + (w - 1) / 2) * unit, p.y * .86, (p.z + (d - 1) / 2) * unit); root.rotation.set(0, (p.rotation % 4) * Math.PI / 2, 0); root.getChildren().forEach(child => { if (child.name === 'spinning wheel') (child as B.TransformNode).rotation.z = 0; }); } }); }
  private animate(dt: number) {
    if (!this.playing || document.hidden) return; this.time += Math.min(dt, .05); const t = this.time;
    if (this.mode === 'rescue') this.actors.forEach((a, i) => { const step = this.successful ? Math.max(0, (t * .78 - i * 1.25) % 12) : .3 + i * .36; a.position.set(-6.9 + Math.min(step, 10) * 1.38, .16 + (this.successful && step > 2 && step < 8 ? .66 : 0) + Math.abs(Math.sin(t * 9 + i)) * .08, .05 + i * .28); });
    if (this.mode === 'park') { this.actors.forEach((a, i) => { const angle = t * .4 + i * Math.PI / 3; a.position.set(this.successful ? Math.sin(angle) * 5.5 : -7 + i, .1 + Math.abs(Math.sin(t * 7 + i)) * .09, this.successful ? Math.cos(angle) * 3.4 : -5); }); this.roots.forEach((r, id) => { const p = this.pieces.find(p => p.id === id); if (p?.kind === 'wheel') r.getChildren().forEach(child => { if (child.name === 'spinning wheel') (child as B.TransformNode).rotation.z = this.successful ? t * .6 : 0; }); }); }
    if (this.mode === 'solar' && this.successful && this.sun) { const center = this.roots.get(this.sun.id)?.position; if (center) { let orbit = 0; this.pieces.forEach(p => { const r = this.roots.get(p.id); if (!r || p.kind === 'sun') return; if (p.kind === 'planet') { const angle = t * (.48 - orbit * .09) + orbit * 2.7; const radius = 3 + orbit * 2.1; r.position.x = center.x + Math.cos(angle) * radius; r.position.z = center.z + Math.sin(angle) * radius; r.rotation.y += dt * .45; orbit++; } else if (p.kind === 'moon') { const planet = this.pieces.find(v => v.kind === 'planet'); const origin = planet ? this.roots.get(planet.id)?.position : center; if (origin) { r.position.x = origin.x + Math.cos(t * 2.4) * 1.35; r.position.z = origin.z + Math.sin(t * 2.4) * 1.35; } } else if (p.kind === 'comet') { r.position.x = center.x + Math.cos(t * .45) * 8; r.position.z = center.z + Math.sin(t * .45) * 6; } }); } }
    if (this.mode === 'parade' && this.successful) {
      const body = this.pieces.find(p => p.kind === 'body' && this.pieces.some(h => h.kind === 'head' && h.x === p.x && h.z === p.z && h.y === p.y + 1 && this.pieces.some(hat => hat.kind === 'hat' && hat.x === p.x && hat.z === p.z && hat.y === p.y + 2)));
      if (body) this.pieces.filter(p => (p.kind === 'body' && p.id === body.id) || ((p.kind === 'head' && p.y === body.y + 1 || p.kind === 'hat' && p.y === body.y + 2) && p.x === body.x && p.z === body.z)).forEach(p => {
        const root = this.roots.get(p.id); if (!root) return;
        root.position.x = body.x * unit + Math.sin(t * 1.8) * 1.7;
        root.position.y = p.y * .86 + Math.abs(Math.sin(t * 3.6)) * .18;
        root.rotation.z = Math.sin(t * 1.8) * .09;
      });
    }
    if (this.mode === 'studio') this.roots.forEach((r, id) => { if (this.pieces.find(p => p.id === id)?.kind === 'star') r.rotation.y += dt; });
  }
}
