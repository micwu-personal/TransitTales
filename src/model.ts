export type Mode = 'rescue' | 'park' | 'solar' | 'parade' | 'studio';
export type Kind = 'tile' | 'beam' | 'arch' | 'ramp' | 'pillar' | 'dome' | 'path' | 'wheel' | 'tree' | 'flower' | 'habitat' | 'sun' | 'planet' | 'moon' | 'comet' | 'body' | 'head' | 'hat' | 'star';
export type Piece = { id: string; kind: Kind; x: number; z: number; y: number; rotation: number; color: string };
export type Snapshot = { mode: Mode; pieces: Piece[] };
export const palette = ['#ff6f61', '#ffc857', '#57c9b3', '#6487df', '#b77ce0', '#f6a8c2', '#f7f1df', '#354965'];
export const tools: Record<Mode, Kind[]> = {
  rescue: ['tile', 'beam', 'arch', 'ramp', 'pillar', 'dome', 'star'],
  park: ['path', 'wheel', 'habitat', 'tree', 'flower', 'arch', 'tile'],
  solar: ['sun', 'planet', 'moon', 'comet', 'star', 'dome', 'pillar'],
  parade: ['body', 'head', 'hat', 'star', 'tree', 'flower', 'arch', 'tile'],
  studio: ['tile', 'beam', 'arch', 'ramp', 'pillar', 'dome', 'path', 'wheel', 'tree', 'flower', 'habitat', 'sun', 'planet', 'moon', 'comet', 'body', 'head', 'hat', 'star']
};
export const modeNames: Record<Mode, string> = { rescue: 'Skyline Rescue', park: 'Wonder Park', solar: 'Pocket Solar System', parade: 'Story Parade', studio: 'Creative Studio' };
export const kindNames: Record<Kind, string> = { tile: 'Square brick', beam: 'Long beam', arch: 'Arch', ramp: 'Slope', pillar: 'Pillar', dome: 'Dome', path: 'Path', wheel: 'Spinning ride', tree: 'Tree', flower: 'Flower', habitat: 'Habitat', sun: 'Sun', planet: 'Planet', moon: 'Moon', comet: 'Comet', body: 'Character body', head: 'Character head', hat: 'Party hat', star: 'Star' };
export const icons: Record<Kind, string> = { tile: '▦', beam: '▬', arch: '◠', ramp: '◢', pillar: '▮', dome: '◕', path: '▤', wheel: '✺', tree: '♣', flower: '✿', habitat: '⌂', sun: '☀', planet: '◉', moon: '☾', comet: '☄', body: '♟', head: '●', hat: '▲', star: '✦' };
export const footprint = (piece: Pick<Piece, 'kind' | 'rotation'>): [number, number] => {
  const base: [number, number] = piece.kind === 'beam' || piece.kind === 'path' ? [3, 1] : piece.kind === 'habitat' ? [2, 2] : [1, 1];
  return piece.rotation % 2 ? [base[1], base[0]] : base;
};
const footprintCells = (p: Piece) => {
  const [w, d] = footprint(p); const cells: string[] = [];
  for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < d; dz++) cells.push(`${p.x + dx},${p.z + dz},${p.y}`);
  return cells;
};
export const canPlace = (pieces: Piece[], piece: Piece) => {
  const [w, d] = footprint(piece);
  if (!Number.isInteger(piece.x) || !Number.isInteger(piece.z) || !Number.isInteger(piece.y) || piece.y < 0 || piece.y > 6 || piece.x < -9 || piece.z < -8 || piece.x + w > 10 || piece.z + d > 9) return false;
  const occupied = new Set(pieces.filter(p => p.id !== piece.id).flatMap(footprintCells));
  return footprintCells(piece).every(cell => !occupied.has(cell));
};
export const evaluate = (mode: Mode, pieces: Piece[]): { success: boolean; message: string; hint: string } => {
  const count = (kind: Kind) => pieces.filter(p => p.kind === kind).length;
  if (mode === 'rescue') {
    const crossing = [-2, -1, 0, 1, 2].every(x => pieces.some(p => (p.kind === 'tile' || p.kind === 'beam' || p.kind === 'path') && p.z <= 0 && p.z + footprint(p)[1] > 0 && p.x <= x && p.x + footprint(p)[0] > x));
    const tower = pieces.some(p => p.y >= 2 && ['pillar', 'tile', 'dome', 'arch'].includes(p.kind));
    return { success: crossing && tower, message: crossing && tower ? 'The bridge holds! The neighbors cross and cheer for your tall lookout.' : !crossing ? 'The neighbors need a continuous crossing over the blue river.' : 'The crossing is ready! Add a lookout at level 3 or higher.', hint: 'Cover every river square from −2 to 2 at the center, then stack a lookout 3 levels high.' };
  }
  if (mode === 'park') { const ok = count('wheel') >= 1 && count('habitat') >= 1 && count('path') >= 2; return { success: ok, message: ok ? 'The park opens! Visitors follow your paths, wave at the ride and stop by the habitat.' : 'Visitors are waiting for a ride, a habitat, and two paths to connect their day.', hint: 'Place a spinning ride, a habitat, and at least two paths.' }; }
  if (mode === 'solar') { const ok = count('sun') >= 1 && count('planet') >= 2 && count('moon') >= 1 && count('comet') >= 1; return { success: ok, message: ok ? 'Your solar system comes alive: planets orbit, a moon circles, and the comet sweeps past!' : 'The observatory needs a sun, two planets, a moon, and a comet.', hint: 'Make a sun, two planets, one moon, and one comet.' }; }
  if (mode === 'parade') {
    const character = pieces.some(body => body.kind === 'body' && pieces.some(head => head.kind === 'head' && head.x === body.x && head.z === body.z && head.y === body.y + 1 && pieces.some(hat => hat.kind === 'hat' && hat.x === body.x && hat.z === body.z && hat.y === body.y + 2)));
    const ok = character && (count('star') + count('flower') + count('tree') + count('arch') >= 1);
    return { success: ok, message: ok ? 'Curtain up! Your character dances and takes a bow in the scene you created.' : 'The stage needs a stacked body, head, hat, and one scene decoration.', hint: 'Stack a head one level above a body, a hat one level above the head, then add a decoration.' };
  }
  return { success: true, message: pieces.length ? 'Your world is alive! Keep building and make it yours.' : 'An empty stage is full of possibilities. Place a piece to begin!', hint: 'Anything goes. Make a little world of your own.' };
};
export const parseSave = (value: string | null, mode: Mode): Piece[] | null => {
  if (!value) return null;
  try {
    const data: Snapshot = JSON.parse(value);
    if (data.mode !== mode || !Array.isArray(data.pieces) || data.pieces.length > 500) return null;
    const result: Piece[] = [];
    for (const p of data.pieces) {
      if (!p || typeof p.id !== 'string' || p.id.length > 100 || !tools.studio.includes(p.kind) || ![p.x, p.z, p.y, p.rotation].every(Number.isInteger) || p.rotation < 0 || p.rotation > 3 || typeof p.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(p.color) || !canPlace(result, p)) return null;
      result.push({ id: p.id, kind: p.kind, x: p.x, z: p.z, y: p.y, rotation: p.rotation, color: p.color });
    }
    return result;
  } catch { return null; }
};
export class BuildHistory {
  private states: Piece[][] = [[]]; private index = 0;
  get pieces(): Piece[] { return this.states[this.index].map(p => ({ ...p })); }
  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.states.length - 1; }
  set(pieces: Piece[]) { this.states = this.states.slice(0, this.index + 1); this.states.push(pieces.map(p => ({ ...p }))); this.index++; if (this.states.length > 60) { this.states.shift(); this.index--; } }
  undo() { if (this.canUndo) this.index--; return this.pieces; }
  redo() { if (this.canRedo) this.index++; return this.pieces; }
}
