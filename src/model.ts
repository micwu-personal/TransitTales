import type { Language } from './rush/locale';
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
const evaluateEnglish = (mode: Mode, pieces: Piece[]): { success: boolean; message: string; hint: string } => {
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

export const evaluate = (mode: Mode, pieces: Piece[], language: Language = 'en') => {
  const result = evaluateEnglish(mode, pieces);
  return { ...result, message: constructionText(language, result.message), hint: constructionText(language, result.hint) };
};

export const constructionCopies: Record<string, readonly [string, string, string, string]> = {
  "Build a World": [
    "搭建小世界",
    "世界を作ろう",
    "Ертөнц бүтээе",
    "ᠶᠢᠷᠲᠢᠨᠴᠦ ᠪᠦᠲᠦᠭᠡᠶ᠎ᠡ"
  ],
  "Build a World — return to Transit Tales": [
    "搭建小世界 — 返回旅途故事",
    "世界を作ろう — Transit Talesに戻る",
    "Ертөнц бүтээе — Аяллын түүхүүд рүү буцах",
    "ᠶᠢᠷᠲᠢᠨᠴᠦ ᠪᠦᠲᠦᠭᠡᠶ᠎ᠡ — ᠠᠶᠠᠯᠠᠯ ᠤᠨ ᠲᠡᠦᠬᠡ ᠵᠦᠭ ᠪᠤᠴᠠᠬᠤ"
  ],
  "Interactive 3D building area. Choose a shape, then tap the stage to place it. Drag to orbit the camera.": [
    "互动 3D 搭建区。选择形状，再点舞台放置。拖动可环绕观察。",
    "3D組み立てエリア。形を選び、ステージを押して置こう。ドラッグでカメラを回せます。",
    "Харилцан үйлдэлтэй 3D барилгын талбар. Дүрс сонгоод тайзан дээр дарж байрлуул. Чирж камерыг тойруул.",
    "ᠬᠠᠷᠢᠯᠴᠠᠨ ᠦᠢᠯᠡᠳᠦᠯ ᠲᠡᠢ 3D ᠪᠠᠷᠢᠯᠭ᠎ᠠ ᠶᠢᠨ ᠲᠠᠯᠪᠤᠷᠢ᠃ ᠳᠦᠷᠰᠦ ᠰᠣᠩᠭᠣᠭᠠᠳ ᠲᠠᠢᠵᠠᠨ ᠳᠡᠭᠡᠷ᠎ᠡ ᠳᠠᠷᠤᠵᠤ ᠪᠠᠢᠷᠢᠯᠠᠭᠤᠯ᠃ ᠴᠢᠷᠦᠵᠦ ᠺᠠᠮᠧᠷ᠎ᠠ ᠶᠢ ᠲᠣᠭᠣᠷᠢᠭᠤᠯ᠃"
  ],
  "Choose a different world": [
    "选择其他世界",
    "別の世界を選ぶ",
    "Өөр ертөнц сонгох",
    "ᠥᠭᠡᠷ᠎ᠡ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠰᠣᠩᠭᠣᠬᠤ"
  ],
  "Worlds": [
    "世界",
    "世界",
    "Ертөнцүүд",
    "ᠶᠢᠷᠲᠢᠨᠴᠦ ᠨᠦᠭᠦᠳ"
  ],
  "How to play": [
    "玩法说明",
    "遊び方",
    "Тоглох заавар",
    "ᠲᠣᠭᠯᠠᠬᠤ ᠵᠠᠭᠠᠪᠤᠷᠢ"
  ],
  "Help": [
    "帮助",
    "ヘルプ",
    "Тусламж",
    "ᠲᠤᠰᠠᠯᠠᠮᠵᠢ"
  ],
  "Current world": [
    "当前世界",
    "今の世界",
    "Одоогийн ертөнц",
    "ᠣᠳᠣᠬᠠᠨ ᠤ ᠶᠢᠷᠲᠢᠨᠴᠦ"
  ],
  "Let's build": [
    "一起搭建吧",
    "作ってみよう",
    "Барилгаа эхэлье",
    "ᠪᠠᠷᠢᠯᠭ᠎ᠠ ᠪᠠᠨ ᠡᠬᠢᠯᠡᠶ᠎ᠡ"
  ],
  "Skyline Rescue": [
    "天际救援",
    "街の展望台レスキュー",
    "Өндөр цамхгийн аврал",
    "ᠥᠨᠳᠥᠷ ᠴᠠᠮᠬᠠᠭ ᠤᠨ ᠠᠪᠤᠷᠠᠯ"
  ],
  "Wonder Park": [
    "奇妙乐园",
    "わくわく公園",
    "Гайхамшгийн хүрээлэн",
    "ᠭᠠᠢᠬᠠᠮᠰᠢᠭ ᠤᠨ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ"
  ],
  "Pocket Solar System": [
    "口袋太阳系",
    "ポケット太陽系",
    "Бяцхан нарны аймаг",
    "ᠪᠢᠴᠢᠬᠠᠨ ᠨᠠᠷᠠᠨ ᠤ ᠠᠢᠮᠠᠭ"
  ],
  "Story Parade": [
    "故事巡游",
    "物語のパレード",
    "Үлгэрийн жагсаал",
    "ᠦᠯᠢᠭᠡᠷ ᠦᠨ ᠵᠢᠭᠰᠠᠭᠠᠯ"
  ],
  "Creative Studio": [
    "创意工作室",
    "創作スタジオ",
    "Бүтээлч урлан",
    "ᠪᠦᠲᠦᠭᠡᠯᠴᠢ ᠤᠷᠠᠯᠠᠨ"
  ],
  "Test my world": [
    "测试我的世界",
    "世界を動かしてみる",
    "Ертөнцөө турших",
    "ᠶᠢᠷᠲᠢᠨᠴᠦ ᠪᠡᠨ ᠲᠤᠷᠰᠢᠬᠤ"
  ],
  "Bring it to life": [
    "让它动起来",
    "動かしてみよう",
    "Амилуулах",
    "ᠠᠮᠢᠯᠠᠭᠤᠯᠬᠤ"
  ],
  "Drag to look around · Scroll or pinch to zoom": [
    "拖动环绕观察 · 滚轮或双指缩放",
    "ドラッグで見回す · スクロールやピンチで拡大縮小",
    "Чирж эргэн харах · Гүйлгэж эсвэл хоёр хуруугаар томруулах",
    "ᠴᠢᠷᠦᠵᠦ ᠡᠷᠭᠢᠨ ᠬᠠᠷᠠᠬᠤ · ᠭᠦᠶᠦᠯᠭᠡᠵᠦ ᠡᠰᠡᠪᠡᠯ ᠬᠣᠶᠠᠷ ᠬᠤᠷᠤᠭᠤ ᠪᠠᠷ ᠲᠣᠮᠣᠷᠤᠭᠤᠯᠬᠤ"
  ],
  "Building tools": [
    "搭建工具",
    "組み立てツール",
    "Барилгын хэрэгсэл",
    "ᠪᠠᠷᠢᠯᠭ᠎ᠠ ᠶᠢᠨ ᠬᠡᠷᠡᠭᠰᠡᠯ"
  ],
  "MY WORKBENCH": [
    "我的搭建台",
    "組み立て台",
    "МИНИЙ АЖЛЫН ШИРЭЭ",
    "ᠮᠢᠨᠦ ᠠᠵᠢᠯ ᠤᠨ ᠰᠢᠷᠡᠭᠡ"
  ],
  "Shapes": [
    "形状",
    "形",
    "Дүрсүүд",
    "ᠳᠦᠷᠰᠦ ᠨᠦᠭᠦᠳ"
  ],
  "Color": [
    "颜色",
    "色",
    "Өнгө",
    "ᠥᠩᠭᠡ"
  ],
  "Piece color": [
    "零件颜色",
    "パーツの色",
    "Хэсгийн өнгө",
    "ᠬᠡᠰᠡᠭ ᠦᠨ ᠥᠩᠭᠡ"
  ],
  "Make it yours": [
    "随心创作",
    "自分らしく作ろう",
    "Өөрийнхөөрөө бүтээ",
    "ᠥᠪᠡᠷ ᠦᠨᠬᠢ ᠪᠡᠷ ᠪᠦᠲᠦᠭᠡ"
  ],
  "Rotate selected or next piece (R)": [
    "旋转所选或下一个零件（R）",
    "選んだパーツや次のパーツを回す（R）",
    "Сонгосон эсвэл дараагийн хэсгийг эргүүлэх (R)",
    "ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠡᠰᠡᠪᠡᠯ ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠬᠡᠰᠡᠭ ᠢ ᠡᠷᠭᠢᠭᠦᠯᠬᠦ (R)"
  ],
  "Rotate piece": [
    "旋转零件",
    "パーツを回す",
    "Хэсгийг эргүүлэх",
    "ᠬᠡᠰᠡᠭ ᠢ ᠡᠷᠭᠢᠭᠦᠯᠬᠦ"
  ],
  "Rotate": [
    "旋转",
    "回す",
    "Эргүүлэх",
    "ᠡᠷᠭᠢᠭᠦᠯᠬᠦ"
  ],
  "Lower placement level": [
    "降低放置层级",
    "置く高さを下げる",
    "Байрлуулах түвшнийг бууруулах",
    "ᠪᠠᠢᠷᠢᠯᠠᠭᠤᠯᠬᠤ ᠲᠦᠪᠰᠢᠨ ᠢ ᠪᠠᠭᠤᠷᠠᠭᠤᠯᠬᠤ"
  ],
  "Raise placement level": [
    "升高放置层级",
    "置く高さを上げる",
    "Байрлуулах түвшнийг нэмэх",
    "ᠪᠠᠢᠷᠢᠯᠠᠭᠤᠯᠬᠤ ᠲᠦᠪᠰᠢᠨ ᠢ ᠨᠡᠮᠡᠬᠦ"
  ],
  "Remove selected piece (Delete)": [
    "删除所选零件（Delete）",
    "選んだパーツを削除（Delete）",
    "Сонгосон хэсгийг устгах (Delete)",
    "ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠬᠡᠰᠡᠭ ᠢ ᠤᠰᠠᠳᠬᠠᠬᠤ (Delete)"
  ],
  "Remove selected piece": [
    "删除所选零件",
    "選んだパーツを削除",
    "Сонгосон хэсгийг устгах",
    "ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠬᠡᠰᠡᠭ ᠢ ᠤᠰᠠᠳᠬᠠᠬᠤ"
  ],
  "Remove": [
    "删除",
    "削除",
    "Устгах",
    "ᠤᠰᠠᠳᠬᠠᠬᠤ"
  ],
  "History and saves": [
    "历史与存档",
    "履歴と保存",
    "Үйлдлийн түүх ба хадгалалт",
    "ᠦᠢᠯᠡᠳᠦᠯ ᠦᠨ ᠲᠡᠦᠬᠡ ᠪᠠ ᠬᠠᠳᠠᠭᠠᠯᠠᠯᠲᠠ"
  ],
  "Undo (Ctrl+Z)": [
    "撤销（Ctrl+Z）",
    "元に戻す（Ctrl+Z）",
    "Буцаах (Ctrl+Z)",
    "ᠪᠤᠴᠠᠭᠠᠬᠤ (Ctrl+Z)"
  ],
  "Redo (Ctrl+Y)": [
    "重做（Ctrl+Y）",
    "やり直す（Ctrl+Y）",
    "Дахин хийх (Ctrl+Y)",
    "ᠳᠠᠬᠢᠨ ᠬᠢᠬᠦ (Ctrl+Y)"
  ],
  "Undo": [
    "撤销",
    "元に戻す",
    "Буцаах",
    "ᠪᠤᠴᠠᠭᠠᠬᠤ"
  ],
  "Redo": [
    "重做",
    "やり直す",
    "Дахин хийх",
    "ᠳᠠᠬᠢᠨ ᠬᠢᠬᠦ"
  ],
  "Save this world in this browser": [
    "将世界保存在此浏览器",
    "このブラウザーに世界を保存",
    "Энэ ертөнцийг энэ хөтөчид хадгалах",
    "ᠡᠨᠡ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠶᠢ ᠡᠨᠡ ᠬᠥᠲᠥᠴᠢ ᠳᠦ ᠬᠠᠳᠠᠭᠠᠯᠠᠬᠤ"
  ],
  "Load your last saved world": [
    "加载上次保存的世界",
    "最後に保存した世界を読み込む",
    "Сүүлд хадгалсан ертөнцөө нээх",
    "ᠰᠡᠭᠦᠯ ᠳᠦ ᠬᠠᠳᠠᠭᠠᠯᠠᠭᠰᠠᠨ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠪᠡᠨ ᠨᠡᠭᠡᠭᠡᠬᠦ"
  ],
  "Start this world over": [
    "重新搭建这个世界",
    "この世界を最初から作る",
    "Энэ ертөнцийг шинээр эхлэх",
    "ᠡᠨᠡ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠶᠢ ᠰᠢᠨ᠎ᠡ ᠪᠡᠷ ᠡᠬᠢᠯᠡᠬᠦ"
  ],
  "Save": [
    "保存",
    "保存",
    "Хадгалах",
    "ᠬᠠᠳᠠᠭᠠᠯᠠᠬᠤ"
  ],
  "Load": [
    "加载",
    "読み込む",
    "Нээх",
    "ᠨᠡᠭᠡᠭᠡᠬᠦ"
  ],
  "Clear": [
    "清空",
    "消す",
    "Цэвэрлэх",
    "ᠴᠡᠪᠡᠷᠯᠡᠬᠦ"
  ],
  "What shall we make?": [
    "我们来搭建什么？",
    "何を作ろう？",
    "Юу бүтээх вэ?",
    "ᠶᠠᠭᠤ ᠪᠦᠲᠦᠭᠡᠬᠦ ᠪᠤᠢ？"
  ],
  "A little idea can become a whole world.": [
    "一个小点子，也能变成一整个世界。",
    "小さなアイデアが、ひとつの世界に。",
    "Бяцхан санаа бүхэл бүтэн ертөнц болж чадна.",
    "ᠪᠢᠴᠢᠬᠠᠨ ᠰᠠᠨᠠᠭ᠎ᠠ ᠪᠦᠬᠦᠯᠢ ᠪᠦᠲᠦᠨ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠪᠣᠯᠵᠤ ᠴᠢᠳᠠᠨ᠎ᠠ᠃"
  ],
  "No rules in the studio. In the other worlds, build anything and see what happens when you press": [
    "工作室里没有规则。在其他世界里，也可以随心搭建，看看按下这个按钮会发生什么：",
    "スタジオにはルールなし。他の世界でも自由に作って、このボタンを押して何が起きるか見てみよう：",
    "Урланд дүрэм байхгүй. Өөр ертөнцөд ч дуртайгаа бариад дараах товчийг дарж юу болохыг үз:",
    "ᠤᠷᠠᠯᠠᠨ ᠳᠤ ᠳᠦᠷᠢᠮ ᠪᠠᠢᠬᠤᠭᠦᠢ᠃ ᠥᠭᠡᠷ᠎ᠡ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠳᠦ ᠴᠦ ᠳᠤᠷᠠᠲᠠᠢ ᠪᠠᠨ ᠪᠠᠷᠢᠭᠠᠳ ᠳᠠᠷᠠᠭᠠᠬᠢ ᠲᠣᠪᠴᠢ ᠶᠢ ᠳᠠᠷᠤᠵᠤ ᠶᠠᠭᠤ ᠪᠣᠯᠬᠤ ᠶᠢ ᠦᠵᠡ᠄"
  ],
  "Close world chooser": [
    "关闭世界选择",
    "世界の選択を閉じる",
    "Ертөнц сонгох цонхыг хаах",
    "ᠶᠢᠷᠲᠢᠨᠴᠦ ᠰᠣᠩᠭᠣᠬᠤ ᠴᠣᠩᠬᠣ ᠶᠢ ᠬᠠᠭᠠᠬᠤ"
  ],
  "Close help": [
    "关闭帮助",
    "ヘルプを閉じる",
    "Тусламжийг хаах",
    "ᠲᠤᠰᠠᠯᠠᠮᠵᠢ ᠶᠢ ᠬᠠᠭᠠᠬᠤ"
  ],
  "Your hands make the magic.": [
    "用双手创造奇迹。",
    "その手で、魔法を作ろう。",
    "Чиний гар гайхамшгийг бүтээнэ.",
    "ᠴᠢᠨᠦ ᠭᠠᠷ ᠭᠠᠢᠬᠠᠮᠰᠢᠭ ᠢ ᠪᠦᠲᠦᠭᠡᠨ᠎ᠡ᠃"
  ],
  "1. Choose a shape": [
    "1. 选择形状",
    "1. 形を選ぼう",
    "1. Дүрс сонго",
    "1. ᠳᠦᠷᠰᠦ ᠰᠣᠩᠭᠣ"
  ],
  "Tap a shape below, then tap the stage to place it. Or drag a shape onto the stage.": [
    "先点下方的形状，再点舞台放置。也可以把形状拖到舞台上。",
    "下の形を選んで、ステージを押して置こう。形をステージへドラッグしても置けます。",
    "Доорх дүрсийг дараад тайзан дээр дарж байрлуул. Эсвэл дүрсийг тайз руу чир.",
    "ᠳᠣᠣᠷᠠᠬᠢ ᠳᠦᠷᠰᠦ ᠶᠢ ᠳᠠᠷᠤᠭᠠᠳ ᠲᠠᠢᠵᠠᠨ ᠳᠡᠭᠡᠷ᠎ᠡ ᠳᠠᠷᠤᠵᠤ ᠪᠠᠢᠷᠢᠯᠠᠭᠤᠯ᠃ ᠡᠰᠡᠪᠡᠯ ᠳᠦᠷᠰᠦ ᠶᠢ ᠲᠠᠢᠵᠠ ᠵᠦᠭ ᠴᠢᠷᠦ᠃"
  ],
  "2. Make it yours": [
    "2. 随心创作",
    "2. 自分らしく作ろう",
    "2. Өөрийнхөөрөө бүтээ",
    "2. ᠥᠪᠡᠷ ᠦᠨᠬᠢ ᠪᠡᠷ ᠪᠦᠲᠦᠭᠡ"
  ],
  "Choose a color. Use Rotate, change the level to stack pieces, or tap a piece to select, recolor, rotate, or remove it.": [
    "选个颜色。旋转零件、调节层级叠放，或点选零件来换色、旋转和删除。",
    "色を選ぼう。回したり、高さを変えて積んだりできます。パーツを押して選ぶと、色の変更、回転、削除ができます。",
    "Өнгө сонго. Эргүүлэх товч хэрэглэж, түвшнийг өөрчлөн хэсгүүдийг давхарла. Хэсгийг дарж сонгоод өнгийг солих, эргүүлэх, устгах боломжтой.",
    "ᠥᠩᠭᠡ ᠰᠣᠩᠭᠣ᠃ ᠡᠷᠭᠢᠭᠦᠯᠬᠦ ᠲᠣᠪᠴᠢ ᠬᠡᠷᠡᠭᠯᠡᠵᠦ᠂ ᠲᠦᠪᠰᠢᠨ ᠢ ᠥᠥᠷᠴᠢᠯᠡᠨ ᠬᠡᠰᠡᠭ ᠦᠳ ᠢ ᠳᠠᠪᠬᠤᠷᠯᠠ᠃ ᠬᠡᠰᠡᠭ ᠢ ᠳᠠᠷᠤᠵᠤ ᠰᠣᠩᠭᠣᠭᠠᠳ ᠥᠩᠭᠡ ᠶᠢ ᠰᠣᠯᠢᠬᠤ᠂ ᠡᠷᠭᠢᠭᠦᠯᠬᠦ᠂ ᠤᠰᠠᠳᠬᠠᠬᠤ ᠪᠣᠯᠣᠮᠵᠢᠲᠠᠢ᠃"
  ],
  "3. Bring it to life": [
    "3. 让世界动起来",
    "3. 動かしてみよう",
    "3. Амилуул",
    "3. ᠠᠮᠢᠯᠠᠭᠤᠯ"
  ],
  "Press Test my world. Keep trying until your creation makes the world react!": [
    "按下“测试我的世界”。不断尝试，让你的创作带来惊喜！",
    "「世界を動かしてみる」を押そう。世界が反応するまで何度でも試せるよ！",
    "«Ертөнцөө турших»-ыг дар. Бүтээл чинь ертөнцийг хөдөлгөх хүртэл туршсаар бай!",
    "«ᠶᠢᠷᠲᠢᠨᠴᠦ ᠪᠡᠨ ᠲᠤᠷᠰᠢᠬᠤ» ᠶᠢ ᠳᠠᠷᠤ᠃ ᠪᠦᠲᠦᠭᠡᠯ ᠴᠢᠨᠢ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠶᠢ ᠬᠥᠳᠡᠯᠭᠡᠬᠦ ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠲᠤᠷᠰᠢᠭᠰᠠᠭᠠᠷ ᠪᠠᠢ！"
  ],
  "Drag the stage to orbit · Scroll or pinch to zoom · R rotate · Delete remove · Ctrl/⌘ + Z undo · Escape close": [
    "拖动环绕 · 滚轮或双指缩放 · R 旋转 · Delete 删除 · Ctrl/⌘ + Z 撤销 · Escape 关闭",
    "ドラッグで見回す · スクロールやピンチで拡大縮小 · R 回転 · Delete 削除 · Ctrl/⌘ + Z 元に戻す · Escape 閉じる",
    "Тайзыг чирж тойрох · Гүйлгэж эсвэл хоёр хуруугаар томруулах · R эргүүлэх · Delete устгах · Ctrl/⌘ + Z буцаах · Escape хаах",
    "ᠲᠠᠢᠵᠠ ᠶᠢ ᠴᠢᠷᠦᠵᠦ ᠲᠣᠭᠣᠷᠢᠬᠤ · ᠭᠦᠶᠦᠯᠭᠡᠵᠦ ᠡᠰᠡᠪᠡᠯ ᠬᠣᠶᠠᠷ ᠬᠤᠷᠤᠭᠤ ᠪᠠᠷ ᠲᠣᠮᠣᠷᠤᠭᠤᠯᠬᠤ · R ᠡᠷᠭᠢᠭᠦᠯᠬᠦ · Delete ᠤᠰᠠᠳᠬᠠᠬᠤ · Ctrl/⌘ + Z ᠪᠤᠴᠠᠭᠠᠬᠤ · Escape ᠬᠠᠭᠠᠬᠤ"
  ],
  "Got it! Let's build →": [
    "明白啦！开始搭建 →",
    "わかった！作ろう →",
    "Ойлголоо! Барилгаа эхэлье →",
    "ᠣᠢᠯᠠᠭᠠᠯ᠎ᠠ！ ᠪᠠᠷᠢᠯᠭ᠎ᠠ ᠪᠠᠨ ᠡᠬᠢᠯᠡᠶ᠎ᠡ →"
  ],
  "Back to building →": [
    "返回搭建 →",
    "組み立てに戻る →",
    "Барих горимд буцах →",
    "ᠪᠠᠷᠢᠬᠤ ᠭᠣᠷᠢᠮ ᠳᠤ ᠪᠤᠴᠠᠬᠤ →"
  ],
  "Your browser needs 3D graphics": [
    "此浏览器需要启用 3D 图形",
    "ブラウザーで3Dグラフィックスが必要です",
    "Хөтөчид 3D график шаардлагатай",
    "ᠬᠥᠲᠥᠴᠢ ᠳᠦ 3D ᠭᠷᠠᠹᠢᠺ ᠱᠠᠭᠠᠷᠳᠠᠯᠭ᠎ᠠ ᠲᠠᠢ"
  ],
  "Turn on hardware acceleration or try a recent browser with WebGL support, then reload the page.": [
    "请开启硬件加速，或使用支持 WebGL 的新版浏览器，再刷新页面。",
    "ハードウェアアクセラレーションを有効にするか、WebGL対応の新しいブラウザーを使って、ページを再読み込みしてください。",
    "Төхөөрөмжийн хурдатгалыг асаах эсвэл WebGL дэмждэг шинэ хөтөч ашиглаад хуудсыг дахин ачаал.",
    "ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ ᠶᠢᠨ ᠬᠤᠷᠳᠤᠰᠬᠠᠯ ᠢ ᠠᠰᠠᠭᠠᠬᠤ ᠡᠰᠡᠪᠡᠯ WebGL ᠳᠡᠮᠵᠢᠳᠡᠭ ᠰᠢᠨ᠎ᠡ ᠬᠥᠲᠥᠴᠢ ᠠᠰᠢᠭᠯᠠᠭᠠᠳ ᠬᠠᠭᠤᠳᠠᠰᠤ ᠶᠢ ᠳᠠᠬᠢᠨ ᠠᠴᠢᠶᠠᠯᠠ᠃"
  ],
  "The neighbors need a way across the river — and a tall place to wave from.": [
    "邻居们需要过河的路，还有一个高高的瞭望台。",
    "近所のみんなに川を渡る道と、手を振れる高い展望台を作ろう。",
    "Хөршүүдэд гол гатлах зам, гараа даллах өндөр газар хэрэгтэй.",
    "ᠬᠥᠷᠰᠢ ᠨᠦᠭᠦᠳ ᠲᠦ ᠭᠣᠣᠯ ᠭᠠᠲᠤᠯᠬᠤ ᠵᠠᠮ᠂ ᠭᠠᠷ ᠢᠶᠠᠨ ᠳᠠᠯᠠᠯᠬᠤ ᠥᠨᠳᠥᠷ ᠭᠠᠵᠠᠷ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃"
  ],
  "Make a joyful park with places to play, wander, and wonder.": [
    "搭建欢乐乐园，让大家游玩、漫步和探索。",
    "遊んで、歩いて、発見できる楽しい公園を作ろう。",
    "Тоглож, зугаалж, гайхах газартай баяр хөөртэй хүрээлэн бүтээ.",
    "ᠲᠣᠭᠯᠠᠵᠤ᠂ ᠵᠤᠭᠠᠯᠵᠤ᠂ ᠭᠠᠢᠬᠠᠬᠤ ᠭᠠᠵᠠᠷᠲᠠᠢ ᠪᠠᠶᠠᠷ ᠬᠥᠭᠡᠷ ᠲᠡᠢ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ ᠪᠦᠲᠦᠭᠡ᠃"
  ],
  "Build a tiny cosmos and set its celestial neighbors in motion.": [
    "搭建微型宇宙，让天体伙伴们动起来。",
    "小さな宇宙を作って、星の仲間たちを動かそう。",
    "Бяцхан сансар бүтээж, тэнгэрийн биетүүдийг нь хөдөлгө.",
    "ᠪᠢᠴᠢᠬᠠᠨ ᠰᠠᠩᠰᠠᠷ ᠪᠦᠲᠦᠭᠡᠵᠦ᠂ ᠲᠡᠩᠭᠡᠷᠢ ᠶᠢᠨ ᠪᠡᠶᠡᠲᠡᠰ ᠢ ᠨᠢ ᠬᠥᠳᠡᠯᠭᠡ᠃"
  ],
  "Make a character and a scene. Then let the little show begin.": [
    "搭建角色和场景，让小小演出开场吧。",
    "キャラクターと舞台を作って、小さなショーを始めよう。",
    "Дүр болон тайз бүтээ. Дараа нь бяцхан тоглолтоо эхлүүл.",
    "ᠳᠦᠷᠢ ᠪᠣᠯᠤᠨ ᠲᠠᠢᠵᠠ ᠪᠦᠲᠦᠭᠡ᠃ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠪᠢᠴᠢᠬᠠᠨ ᠲᠣᠭᠯᠠᠯᠲᠠ ᠪᠠᠨ ᠡᠬᠢᠯᠡᠭᠦᠯ᠃"
  ],
  "No mission. No limits. This whole little universe is yours.": [
    "没有任务，没有限制。这个小宇宙由你做主。",
    "ミッションも制限もなし。この小さな宇宙はあなたのもの。",
    "Даалгаваргүй. Хязгааргүй. Энэ бяцхан орчлон тэр чигээрээ чинийх.",
    "ᠳᠠᠭᠠᠯᠭᠠᠪᠤᠷᠢ ᠦᠭᠡᠢ᠃ ᠬᠢᠵᠠᠭᠠᠷ ᠦᠭᠡᠢ᠃ ᠡᠨᠡ ᠪᠢᠴᠢᠬᠠᠨ ᠣᠷᠴᠢᠯᠠᠩ ᠪᠦᠬᠦᠯᠢ ᠪᠡᠷ ᠴᠢᠨᠦᠬᠢ᠃"
  ],
  "Bridge the blue river": [
    "架桥跨越蓝色河流",
    "青い川に橋をかけよう",
    "Хөх голд гүүр тавь",
    "ᠬᠥᠬᠡ ᠭᠣᠣᠯ ᠳᠤ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠯᠪᠢ"
  ],
  "A place for everyone": [
    "每个人的乐园",
    "みんなの居場所",
    "Хүн бүрийн газар",
    "ᠬᠦᠮᠦᠨ ᠪᠦᠷᠢ ᠶᠢᠨ ᠭᠠᠵᠠᠷ"
  ],
  "Set the skies spinning": [
    "让天空转起来",
    "空を回そう",
    "Тэнгэрийг эргэлдүүл",
    "ᠲᠡᠩᠭᠡᠷᠢ ᠶᠢ ᠡᠷᠭᠢᠯᠳᠦᠭᠦᠯ"
  ],
  "Curtain up, creator!": [
    "创作者，开演啦！",
    "幕を開けよう、クリエイター！",
    "Бүтээгч ээ, хөшгөө нээ!",
    "ᠪᠦᠲᠦᠭᠡᠭᠴᠢ ᠡ᠂ ᠬᠥᠰᠢᠭᠡ ᠪᠡᠨ ᠨᠡᠭᠡᠭᠡ！"
  ],
  "Anything is possible": [
    "一切皆有可能",
    "なんでもできる",
    "Бүх зүйл боломжтой",
    "ᠪᠦᠬᠦ ᠵᠦᠢᠯ ᠪᠣᠯᠣᠮᠵᠢᠲᠠᠢ"
  ],
  "FREE PLAY": [
    "自由搭建",
    "自由に遊ぼう",
    "ЧӨЛӨӨТ ТОГЛООМ",
    "ᠴᠢᠯᠥᠭᠡᠲᠦ ᠲᠣᠭᠯᠠᠭᠠᠮ"
  ],
  "THE LITTLE MISSION": [
    "小小任务",
    "小さなミッション",
    "БЯЦХАН ДААЛГАВАР",
    "ᠪᠢᠴᠢᠬᠠᠨ ᠳᠠᠭᠠᠯᠭᠠᠪᠤᠷᠢ"
  ],
  "Create anything you imagine": [
    "搭建你想象的一切",
    "想像したものを何でも作ろう",
    "Төсөөлсөн бүхнээ бүтээ",
    "ᠲᠥᠰᠥᠭᠡᠯᠦᠭᠰᠡᠨ ᠪᠦᠬᠦᠨ ᠢᠶᠡᠨ ᠪᠦᠲᠦᠭᠡ"
  ],
  "River crossing {crossing}/5 squares · lookout level 3": [
    "过河通道 {crossing}/5 格 · 瞭望台第 3 层",
    "川の道 {crossing}/5 マス · 展望台は高さ3",
    "Гол гатлах {crossing}/5 нүд · харуулын цамхаг 3-р түвшинд",
    "ᠭᠣᠣᠯ ᠭᠠᠲᠤᠯᠬᠤ {crossing}/5 ᠨᠦᠳᠦ · ᠬᠠᠷᠠᠭᠤᠯ ᠤᠨ ᠴᠠᠮᠬᠠᠭ 3 ᠳᠤᠭᠠᠷ ᠲᠦᠪᠰᠢᠨ ᠳᠦ"
  ],
  "Ride {ride}  Habitat {habitat}  Paths {paths}/2": [
    "游乐设施 {ride}  栖息屋 {habitat}  小路 {paths}/2",
    "遊具 {ride}  すみか {habitat}  小道 {paths}/2",
    "Тоглоомын төхөөрөмж {ride}  Амьдрах орчин {habitat}  Зам {paths}/2",
    "ᠲᠣᠭᠯᠠᠭᠠᠮ ᠤᠨ ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ {ride}  ᠠᠮᠢᠳᠤᠷᠠᠬᠤ ᠣᠷᠴᠢᠨ {habitat}  ᠵᠠᠮ {paths}/2"
  ],
  "Sun {sun}  Planets {planets}/2  Moon {moon}  Comet {comet}": [
    "太阳 {sun}  行星 {planets}/2  月亮 {moon}  彗星 {comet}",
    "太陽 {sun}  惑星 {planets}/2  月 {moon}  彗星 {comet}",
    "Нар {sun}  Гараг {planets}/2  Сар {moon}  Сүүлт од {comet}",
    "ᠨᠠᠷᠠ {sun}  ᠭᠠᠷᠠᠭ {planets}/2  ᠰᠠᠷᠠ {moon}  ᠰᠡᠭᠦᠯᠲᠦ ᠣᠳᠣ {comet}"
  ],
  "Body {body}  Head {head}  Hat {hat}  Scene {scene} · Stack your character": [
    "身体 {body}  头部 {head}  帽子 {hat}  场景 {scene} · 叠出你的角色",
    "体 {body}  頭 {head}  帽子 {hat}  舞台 {scene} · キャラクターを積もう",
    "Бие {body}  Толгой {head}  Малгай {hat}  Тайз {scene} · Дүрээ давхарлаж бүтээ",
    "ᠪᠡᠶ᠎ᠡ {body}  ᠲᠣᠯᠣᠭᠠᠢ {head}  ᠮᠠᠯᠭᠠᠢ {hat}  ᠲᠠᠢᠵᠠ {scene} · ᠳᠦᠷᠢ ᠪᠡᠨ ᠳᠠᠪᠬᠤᠷᠯᠠᠵᠤ ᠪᠦᠲᠦᠭᠡ"
  ],
  "Level {level}": [
    "第 {level} 层",
    "高さ {level}",
    "Түвшин {level}",
    "ᠲᠦᠪᠰᠢᠨ {level}"
  ],
  "{count} piece": [
    "{count} 个零件",
    "{count} 個のパーツ",
    "{count} хэсэг",
    "{count} ᠬᠡᠰᠡᠭ"
  ],
  "{count} pieces": [
    "{count} 个零件",
    "{count} 個のパーツ",
    "{count} хэсэг",
    "{count} ᠬᠡᠰᠡᠭ"
  ],
  "Choose {kind}": [
    "选择{kind}",
    "{kind}を選ぶ",
    "{kind} сонгох",
    "{kind} ᠰᠣᠩᠭᠣᠬᠤ"
  ],
  "Color {color}": [
    "颜色：{color}",
    "色：{color}",
    "Өнгө {color}",
    "ᠥᠩᠭᠡ {color}"
  ],
  "coral": [
    "珊瑚色",
    "コーラル",
    "шүрэн",
    "ᠰᠢᠷᠦ"
  ],
  "sunshine": [
    "阳光黄",
    "ひまわり色",
    "нарлаг шар",
    "ᠨᠠᠷᠠᠯᠢᠭ ᠰᠢᠷ᠎ᠠ"
  ],
  "mint": [
    "薄荷绿",
    "ミント",
    "гааны ногоон",
    "ᠭᠠᠭ᠎ᠠ ᠶᠢᠨ ᠨᠣᠭᠣᠭᠠᠨ"
  ],
  "blue": [
    "蓝色",
    "青",
    "хөх",
    "ᠬᠥᠬᠡ"
  ],
  "violet": [
    "紫色",
    "紫",
    "нил ягаан",
    "ᠨᠢᠯ ᠶᠠᠭᠠᠭᠠᠨ"
  ],
  "pink": [
    "粉色",
    "ピンク",
    "ягаан",
    "ᠶᠠᠭᠠᠭᠠᠨ"
  ],
  "cream": [
    "奶油色",
    "クリーム",
    "цөцгийн өнгө",
    "ᠴᠥᠴᠡᠭᠡᠢ ᠶᠢᠨ ᠥᠩᠭᠡ"
  ],
  "ink": [
    "墨色",
    "墨色",
    "бэхэн хар",
    "ᠪᠡᠬᠡᠨ ᠬᠠᠷ᠎ᠠ"
  ],
  "Square brick": [
    "方形积木",
    "四角いブロック",
    "Дөрвөлжин тоосго",
    "ᠳᠥᠷᠪᠡᠯᠵᠢᠨ ᠲᠣᠭᠣᠰᠬ᠎ᠠ"
  ],
  "Long beam": [
    "长梁",
    "長い梁",
    "Урт дам нуруу",
    "ᠤᠷᠲᠤ ᠳᠠᠮ ᠨᠢᠷᠤᠭᠤ"
  ],
  "Arch": [
    "拱门",
    "アーチ",
    "Нуман хаалга",
    "ᠨᠤᠮᠤᠨ ᠬᠠᠭᠠᠯᠭ᠎ᠠ"
  ],
  "Slope": [
    "斜坡",
    "坂",
    "Налуу",
    "ᠨᠠᠯᠠᠭᠤ"
  ],
  "Pillar": [
    "柱子",
    "柱",
    "Багана",
    "ᠪᠠᠭᠠᠨ᠎ᠠ"
  ],
  "Dome": [
    "圆顶",
    "ドーム",
    "Бөмбөгөр орой",
    "ᠪᠥᠮᠪᠥᠭᠡᠷ ᠣᠷᠣᠢ"
  ],
  "Path": [
    "小路",
    "小道",
    "Зам",
    "ᠵᠠᠮ"
  ],
  "Spinning ride": [
    "旋转游乐设施",
    "回る遊具",
    "Эргэдэг тоглоомын төхөөрөмж",
    "ᠡᠷᠭᠢᠳᠡᠭ ᠲᠣᠭᠯᠠᠭᠠᠮ ᠤᠨ ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ"
  ],
  "Tree": [
    "树",
    "木",
    "Мод",
    "ᠮᠣᠳᠣ"
  ],
  "Flower": [
    "花",
    "花",
    "Цэцэг",
    "ᠴᠡᠴᠡᠭ"
  ],
  "Habitat": [
    "栖息屋",
    "すみか",
    "Амьдрах орчин",
    "ᠠᠮᠢᠳᠤᠷᠠᠬᠤ ᠣᠷᠴᠢᠨ"
  ],
  "Sun": [
    "太阳",
    "太陽",
    "Нар",
    "ᠨᠠᠷᠠ"
  ],
  "Planet": [
    "行星",
    "惑星",
    "Гараг",
    "ᠭᠠᠷᠠᠭ"
  ],
  "Moon": [
    "月亮",
    "月",
    "Сар",
    "ᠰᠠᠷᠠ"
  ],
  "Comet": [
    "彗星",
    "彗星",
    "Сүүлт од",
    "ᠰᠡᠭᠦᠯᠲᠦ ᠣᠳᠣ"
  ],
  "Character body": [
    "角色身体",
    "キャラクターの体",
    "Дүрийн бие",
    "ᠳᠦᠷᠢ ᠶᠢᠨ ᠪᠡᠶ᠎ᠡ"
  ],
  "Character head": [
    "角色头部",
    "キャラクターの頭",
    "Дүрийн толгой",
    "ᠳᠦᠷᠢ ᠶᠢᠨ ᠲᠣᠯᠣᠭᠠᠢ"
  ],
  "Party hat": [
    "派对帽",
    "パーティー帽子",
    "Баярын малгай",
    "ᠪᠠᠶᠠᠷ ᠤᠨ ᠮᠠᠯᠭᠠᠢ"
  ],
  "Star": [
    "星星",
    "星",
    "Од",
    "ᠣᠳᠣ"
  ],
  "Piece": [
    "零件",
    "パーツ",
    "Хэсэг",
    "ᠬᠡᠰᠡᠭ"
  ],
  "This browser could not save your world. Check available storage.": [
    "浏览器无法保存世界，请检查可用存储空间。",
    "世界を保存できませんでした。空き容量を確かめてください。",
    "Энэ хөтөч ертөнцийг хадгалж чадсангүй. Сул зайг шалга.",
    "ᠡᠨᠡ ᠬᠥᠲᠥᠴᠢ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠶᠢ ᠬᠠᠳᠠᠭᠠᠯᠠᠵᠤ ᠴᠢᠳᠠᠭᠰᠠᠨ ᠦᠭᠡᠢ᠃ ᠰᠤᠯᠠ ᠵᠠᠢ ᠶᠢ ᠰᠢᠯᠭᠠ᠃"
  ],
  "Welcome back! Your {mode} is here.": [
    "欢迎回来！你的{mode}在这里。",
    "おかえり！あなたの{mode}が待っているよ。",
    "Эргээд тавтай морил! Чиний {mode} энд байна.",
    "ᠡᠷᠭᠢᠭᠡᠳ ᠲᠠᠪᠲᠠᠢ ᠮᠣᠷᠢᠯ！ ᠴᠢᠨᠦ {mode} ᠡᠨᠳᠡ ᠪᠠᠢᠨ᠎ᠠ᠃"
  ],
  "Ready to place {kind}. Tap the stage!": [
    "准备放置{kind}，点舞台吧！",
    "{kind}を置く準備ができたよ。ステージを押そう！",
    "{kind} байрлуулахад бэлэн. Тайзыг дар!",
    "{kind} ᠪᠠᠢᠷᠢᠯᠠᠭᠤᠯᠬᠤ ᠳᠤ ᠪᠡᠯᠡᠨ᠃ ᠲᠠᠢᠵᠠ ᠶᠢ ᠳᠠᠷᠤ！"
  ],
  "A fresh color for your piece!": [
    "零件换上新颜色啦！",
    "パーツが新しい色になったよ！",
    "Хэсэг чинь шинэ өнгөтэй боллоо!",
    "ᠬᠡᠰᠡᠭ ᠴᠢᠨᠢ ᠰᠢᠨ᠎ᠡ ᠥᠩᠭᠡ ᠲᠡᠢ ᠪᠣᠯᠯ᠎ᠠ！"
  ],
  "This spot is full or outside the stage. Try another place or level.": [
    "这里已放满或超出舞台，请试试其他位置或层级。",
    "ここはいっぱいか、ステージの外です。別の場所や高さを試そう。",
    "Энд зайгүй эсвэл тайзны гадна байна. Өөр газар эсвэл түвшин туршаарай.",
    "ᠡᠨᠳᠡ ᠵᠠᠢ ᠦᠭᠡᠢ ᠡᠰᠡᠪᠡᠯ ᠲᠠᠢᠵᠠ ᠶᠢᠨ ᠭᠠᠳᠠᠨ᠎ᠠ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠥᠭᠡᠷ᠎ᠡ ᠭᠠᠵᠠᠷ ᠡᠰᠡᠪᠡᠯ ᠲᠦᠪᠰᠢᠨ ᠲᠤᠷᠰᠢᠭᠠᠷᠠᠢ᠃"
  ],
  "{kind} placed. Keep going!": [
    "{kind}放好了。继续搭建吧！",
    "{kind}を置いたよ。続けよう！",
    "{kind} байрлалаа. Үргэлжлүүл!",
    "{kind} ᠪᠠᠢᠷᠢᠯᠠᠯ᠎ᠠ᠃ ᠦᠷᠭᠦᠯᠵᠢᠯᠡᠭᠦᠯ！"
  ],
  "{kind} selected. Change its color, rotate it, or remove it.": [
    "已选{kind}，可以换色、旋转或删除。",
    "{kind}を選んだよ。色を変えたり、回したり、削除できます。",
    "{kind} сонгогдлоо. Өнгийг солих, эргүүлэх эсвэл устгах боломжтой.",
    "{kind} ᠰᠣᠩᠭᠣᠭᠳᠠᠯ᠎ᠠ᠃ ᠥᠩᠭᠡ ᠶᠢ ᠰᠣᠯᠢᠬᠤ᠂ ᠡᠷᠭᠢᠭᠦᠯᠬᠦ ᠡᠰᠡᠪᠡᠯ ᠤᠰᠠᠳᠬᠠᠬᠤ ᠪᠣᠯᠣᠮᠵᠢᠲᠠᠢ᠃"
  ],
  "Not enough room to turn this piece.": [
    "空间不够，无法旋转这个零件。",
    "このパーツを回す空間が足りません。",
    "Энэ хэсгийг эргүүлэх зай хүрэлцэхгүй.",
    "ᠡᠨᠡ ᠬᠡᠰᠡᠭ ᠢ ᠡᠷᠭᠢᠭᠦᠯᠬᠦ ᠵᠠᠢ ᠬᠦᠷᠦᠯᠴᠡᠬᠦᠭᠦᠢ᠃"
  ],
  "Next shape turned a quarter turn.": [
    "下一个零件已旋转四分之一圈。",
    "次の形を4分の1回転したよ。",
    "Дараагийн дүрс дөрөвний нэг эргэлт хийлээ.",
    "ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠳᠦᠷᠰᠦ ᠳᠥᠷᠪᠡᠨ ᠦ ᠨᠢᠭᠡ ᠡᠷᠭᠢᠯᠲᠡ ᠬᠢᠯ᠎ᠡ᠃"
  ],
  "{kind} removed.": [
    "已删除{kind}。",
    "{kind}を削除しました。",
    "{kind} устгагдлаа.",
    "{kind} ᠤᠰᠠᠳᠬᠠᠭᠳᠠᠯ᠎ᠠ᠃"
  ],
  "One step back.": [
    "撤销一步。",
    "ひとつ前に戻ったよ。",
    "Нэг алхам буцлаа.",
    "ᠨᠢᠭᠡ ᠠᠯᠬᠤᠮ ᠪᠤᠴᠠᠯ᠎ᠠ᠃"
  ],
  "One step forward.": [
    "重做一步。",
    "ひとつ先に進んだよ。",
    "Нэг алхам урагшиллаа.",
    "ᠨᠢᠭᠡ ᠠᠯᠬᠤᠮ ᠤᠷᠤᠭᠰᠢᠯᠠᠯ᠎ᠠ᠃"
  ],
  "Snapshot saved! You can bring it back with Load.": [
    "快照已保存！可以点击“加载”找回来。",
    "保存できたよ！「読み込む」で戻せます。",
    "Хадгаллаа! «Нээх»-ээр буцааж авч болно.",
    "ᠬᠠᠳᠠᠭᠠᠯᠠᠯ᠎ᠠ！ «ᠨᠡᠭᠡᠭᠡᠬᠦ» ᠪᠡᠷ ᠪᠤᠴᠠᠭᠠᠵᠤ ᠠᠪᠴᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃"
  ],
  "No saved world found here yet. Build something and press Save.": [
    "还没有存档。先搭建，再点击“保存”吧。",
    "まだ保存した世界はありません。作って「保存」を押そう。",
    "Энд хадгалсан ертөнц хараахан алга. Юм бариад «Хадгалах»-ыг дар.",
    "ᠡᠨᠳᠡ ᠬᠠᠳᠠᠭᠠᠯᠠᠭᠰᠠᠨ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠬᠠᠷᠠᠬᠠᠨ ᠠᠯᠭ᠎ᠠ᠃ ᠶᠠᠭᠤᠮ᠎ᠠ ᠪᠠᠷᠢᠭᠠᠳ «ᠬᠠᠳᠠᠭᠠᠯᠠᠬᠤ» ᠶᠢ ᠳᠠᠷᠤ᠃"
  ],
  "Saved world loaded!": [
    "已加载保存的世界！",
    "保存した世界を読み込んだよ！",
    "Хадгалсан ертөнц нээгдлээ!",
    "ᠬᠠᠳᠠᠭᠠᠯᠠᠭᠰᠠᠨ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠨᠡᠭᠡᠭᠡᠭᠳᠡᠯ᠎ᠡ！"
  ],
  "The stage is already clear.": [
    "舞台已经清空啦。",
    "ステージにはまだ何もありません。",
    "Тайз аль хэдийн хоосон байна.",
    "ᠲᠠᠢᠵᠠ ᠠᠯᠢ ᠬᠡᠳᠦᠢᠨ ᠬᠣᠭᠣᠰᠣᠨ ᠪᠠᠢᠨ᠎ᠠ᠃"
  ],
  "Clear every piece from this world? You can Undo afterward.": [
    "清空这个世界的所有零件吗？之后可以撤销。",
    "この世界のパーツをすべて消しますか？後から元に戻せます。",
    "Энэ ертөнцийн бүх хэсгийг арилгах уу? Дараа нь буцааж болно.",
    "ᠡᠨᠡ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠶᠢᠨ ᠪᠦᠬᠦ ᠬᠡᠰᠡᠭ ᠢ ᠠᠷᠢᠯᠭᠠᠬᠤ ᠤᠤ？ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠪᠤᠴᠠᠭᠠᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃"
  ],
  "A fresh stage! Undo if you change your mind.": [
    "舞台焕然一新！改变主意可以撤销。",
    "新しいステージ！気が変わったら元に戻せるよ。",
    "Шинэ тайз! Бодлоо өөрчилбөл буцаагаарай.",
    "ᠰᠢᠨ᠎ᠡ ᠲᠠᠢᠵᠠ！ ᠪᠣᠳᠣᠯ ᠢᠶᠠᠨ ᠥᠥᠷᠴᠢᠯᠡᠪᠡᠯ ᠪᠤᠴᠠᠭᠠᠭᠠᠷᠠᠢ᠃"
  ],
  "Your world is alive!": [
    "你的世界动起来啦！",
    "あなたの世界が動き出した！",
    "Ертөнц чинь амиллаа!",
    "ᠶᠢᠷᠲᠢᠨᠴᠦ ᠴᠢᠨᠢ ᠠᠮᠢᠯᠠᠯ᠎ᠠ！"
  ],
  "You did it!": [
    "你做到了！",
    "できたね！",
    "Чи чадлаа!",
    "ᠴᠢ ᠴᠢᠳᠠᠯ᠎ᠠ！"
  ],
  "Almost there!": [
    "就快完成了！",
    "あと少し！",
    "Бараг боллоо!",
    "ᠪᠠᠷᠤᠭ ᠪᠣᠯᠯ᠎ᠠ！"
  ],
  "The bridge holds! The neighbors cross and cheer for your tall lookout.": [
    "桥搭好了！邻居们过河，为高高的瞭望台欢呼。",
    "橋ができた！みんなが川を渡って、高い展望台に歓声を上げています。",
    "Гүүр бат бөх байна! Хөршүүд гатлаад өндөр харуулын цамхагт чинь баяр хүргэж байна.",
    "ᠭᠦᠭᠦᠷᠭᠡ ᠪᠠᠲᠤ ᠪᠥᠬᠡ ᠪᠠᠢᠨ᠎ᠠ！ ᠬᠥᠷᠰᠢ ᠨᠦᠭᠦᠳ ᠭᠠᠲᠤᠯᠤᠭᠠᠳ ᠥᠨᠳᠥᠷ ᠬᠠᠷᠠᠭᠤᠯ ᠤᠨ ᠴᠠᠮᠬᠠᠭ ᠲᠤ ᠴᠢᠨᠢ ᠪᠠᠶᠠᠷ ᠬᠦᠷᠭᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ᠃"
  ],
  "The neighbors need a continuous crossing over the blue river.": [
    "邻居们需要一条连续跨越蓝色河流的通道。",
    "青い川を渡れる、つながった道が必要です。",
    "Хөршүүдэд хөх голыг гатлах тасралтгүй зам хэрэгтэй.",
    "ᠬᠥᠷᠰᠢ ᠨᠦᠭᠦᠳ ᠲᠦ ᠬᠥᠬᠡ ᠭᠣᠣᠯ ᠢ ᠭᠠᠲᠤᠯᠬᠤ ᠲᠠᠰᠤᠷᠠᠯᠲᠠ ᠦᠭᠡᠢ ᠵᠠᠮ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃"
  ],
  "The crossing is ready! Add a lookout at level 3 or higher.": [
    "过河通道已就绪！在第 3 层或更高处搭个瞭望台吧。",
    "川の道ができた！高さ3以上に展望台を作ろう。",
    "Гатлах зам бэлэн! 3-р түвшин эсвэл түүнээс дээш харуулын цамхаг нэм.",
    "ᠭᠠᠲᠤᠯᠬᠤ ᠵᠠᠮ ᠪᠡᠯᠡᠨ！ 3 ᠳᠤᠭᠠᠷ ᠲᠦᠪᠰᠢᠨ ᠡᠰᠡᠪᠡᠯ ᠲᠡᠭᠦᠨ ᠡᠴᠡ ᠳᠡᠭᠡᠭᠰᠢ ᠬᠠᠷᠠᠭᠤᠯ ᠤᠨ ᠴᠠᠮᠬᠠᠭ ᠨᠡᠮᠡ᠃"
  ],
  "Cover every river square from −2 to 2 at the center, then stack a lookout 3 levels high.": [
    "覆盖中心从 −2 到 2 的每个河流格子，再叠出三层高的瞭望台。",
    "中央の−2から2までの川のマスをすべて覆い、高さ3の展望台を積もう。",
    "Төвийн −2-оос 2 хүртэлх голын нүд бүрийг хучаад 3 түвшин өндөр харуулын цамхаг давхарла.",
    "ᠲᠥᠪ ᠦᠨ −2 ᠠᠴᠠ 2 ᠬᠦᠷᠲᠡᠯᠡᠬᠢ ᠭᠣᠣᠯ ᠤᠨ ᠨᠦᠳᠦ ᠪᠦᠷᠢ ᠶᠢ ᠬᠤᠴᠢᠭᠠᠳ 3 ᠲᠦᠪᠰᠢᠨ ᠥᠨᠳᠥᠷ ᠬᠠᠷᠠᠭᠤᠯ ᠤᠨ ᠴᠠᠮᠬᠠᠭ ᠳᠠᠪᠬᠤᠷᠯᠠ᠃"
  ],
  "The park opens! Visitors follow your paths, wave at the ride and stop by the habitat.": [
    "乐园开门啦！游客沿小路走，向游乐设施挥手，再到栖息屋看看。",
    "公園がオープン！お客さんが小道を歩き、遊具に手を振って、すみかに立ち寄ります。",
    "Хүрээлэн нээгдлээ! Зочид замаар чинь явж, тоглоомын төхөөрөмж рүү даллан, амьдрах орчныг сонирхоно.",
    "ᠬᠦᠷᠢᠶᠡᠯᠡᠩ ᠨᠡᠭᠡᠭᠡᠭᠳᠡᠯ᠎ᠡ！ ᠵᠣᠴᠢᠳ ᠵᠠᠮ ᠢᠶᠠᠷ ᠴᠢᠨᠢ ᠶᠠᠪᠤᠵᠤ᠂ ᠲᠣᠭᠯᠠᠭᠠᠮ ᠤᠨ ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ ᠵᠦᠭ ᠳᠠᠯᠠᠯᠠᠨ᠂ ᠠᠮᠢᠳᠤᠷᠠᠬᠤ ᠣᠷᠴᠢᠨ ᠢ ᠰᠣᠨᠢᠷᠬᠠᠨ᠎ᠠ᠃"
  ],
  "Visitors are waiting for a ride, a habitat, and two paths to connect their day.": [
    "游客正等着游乐设施、栖息屋和两条小路，串起美好的一天。",
    "お客さんは遊具とすみか、そして一日をつなぐ2本の小道を待っています。",
    "Зочид өдрөө сайхан өнгөрүүлэх тоглоомын төхөөрөмж, амьдрах орчин, хоёр зам хүлээж байна.",
    "ᠵᠣᠴᠢᠳ ᠥᠳᠥᠷ ᠢᠶᠡᠨ ᠰᠠᠢᠬᠠᠨ ᠥᠩᠭᠡᠷᠡᠭᠦᠯᠬᠦ ᠲᠣᠭᠯᠠᠭᠠᠮ ᠤᠨ ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ᠂ ᠠᠮᠢᠳᠤᠷᠠᠬᠤ ᠣᠷᠴᠢᠨ᠂ ᠬᠣᠶᠠᠷ ᠵᠠᠮ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ᠃"
  ],
  "Place a spinning ride, a habitat, and at least two paths.": [
    "放置一个旋转游乐设施、一个栖息屋和至少两条小路。",
    "回る遊具、すみか、小道を2本以上置こう。",
    "Эргэдэг тоглоомын төхөөрөмж, амьдрах орчин, хоёроос доошгүй зам байрлуул.",
    "ᠡᠷᠭᠢᠳᠡᠭ ᠲᠣᠭᠯᠠᠭᠠᠮ ᠤᠨ ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ᠂ ᠠᠮᠢᠳᠤᠷᠠᠬᠤ ᠣᠷᠴᠢᠨ᠂ ᠬᠣᠶᠠᠷ ᠠᠴᠠ ᠳᠣᠣᠰᠢ ᠦᠭᠡᠢ ᠵᠠᠮ ᠪᠠᠢᠷᠢᠯᠠᠭᠤᠯ᠃"
  ],
  "Your solar system comes alive: planets orbit, a moon circles, and the comet sweeps past!": [
    "太阳系动起来了：行星公转，月亮环绕，彗星划过天空！",
    "太陽系が動き出した！惑星が回り、月が巡り、彗星が通り過ぎます！",
    "Нарны аймаг чинь амиллаа: гарагууд тойрч, сар эргэлдэн, сүүлт од өнгөрнө!",
    "ᠨᠠᠷᠠᠨ ᠤ ᠠᠢᠮᠠᠭ ᠴᠢᠨᠢ ᠠᠮᠢᠯᠠᠯ᠎ᠠ᠄ ᠭᠠᠷᠠᠭ ᠤᠳ ᠲᠣᠭᠣᠷᠢᠵᠤ᠂ ᠰᠠᠷᠠ ᠡᠷᠭᠢᠯᠳᠦᠨ᠂ ᠰᠡᠭᠦᠯᠲᠦ ᠣᠳᠣ ᠥᠩᠭᠡᠷᠡᠨ᠎ᠡ！"
  ],
  "The observatory needs a sun, two planets, a moon, and a comet.": [
    "天文台需要太阳、两颗行星、月亮和彗星。",
    "天文台には太陽、惑星2つ、月、彗星が必要です。",
    "Одон орон судлах төвд нар, хоёр гараг, сар, сүүлт од хэрэгтэй.",
    "ᠣᠳᠣᠨ ᠣᠷᠣᠨ ᠰᠤᠳᠤᠯᠬᠤ ᠲᠥᠪ ᠲᠦ ᠨᠠᠷᠠ᠂ ᠬᠣᠶᠠᠷ ᠭᠠᠷᠠᠭ᠂ ᠰᠠᠷᠠ᠂ ᠰᠡᠭᠦᠯᠲᠦ ᠣᠳᠣ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃"
  ],
  "Make a sun, two planets, one moon, and one comet.": [
    "搭建太阳、两颗行星、一颗月亮和一颗彗星。",
    "太陽、惑星2つ、月1つ、彗星1つを作ろう。",
    "Нар, хоёр гараг, нэг сар, нэг сүүлт од бүтээ.",
    "ᠨᠠᠷᠠ᠂ ᠬᠣᠶᠠᠷ ᠭᠠᠷᠠᠭ᠂ ᠨᠢᠭᠡ ᠰᠠᠷᠠ᠂ ᠨᠢᠭᠡ ᠰᠡᠭᠦᠯᠲᠦ ᠣᠳᠣ ᠪᠦᠲᠦᠭᠡ᠃"
  ],
  "Curtain up! Your character dances and takes a bow in the scene you created.": [
    "开演啦！角色在你搭建的场景中跳舞、鞠躬。",
    "幕が上がった！キャラクターがあなたの舞台で踊り、おじぎをします。",
    "Хөшиг нээгдлээ! Дүр чинь бүтээсэн тайзан дээр бүжиглэж, мэхийн ёслоно.",
    "ᠬᠥᠰᠢᠭᠡ ᠨᠡᠭᠡᠭᠡᠭᠳᠡᠯ᠎ᠡ！ ᠳᠦᠷᠢ ᠴᠢᠨᠢ ᠪᠦᠲᠦᠭᠡᠭᠰᠡᠨ ᠲᠠᠢᠵᠠᠨ ᠳᠡᠭᠡᠷ᠎ᠡ ᠪᠦᠵᠢᠭᠯᠡᠵᠦ᠂ ᠮᠡᠬᠢᠶᠡᠨ ᠶᠣᠰᠣᠯᠠᠨ᠎ᠠ᠃"
  ],
  "The stage needs a stacked body, head, hat, and one scene decoration.": [
    "舞台需要叠好的身体、头部、帽子，以及一个场景装饰。",
    "体、頭、帽子を積んだキャラクターと、舞台の飾りが1つ必要です。",
    "Тайзанд давхарласан бие, толгой, малгай, нэг чимэглэл хэрэгтэй.",
    "ᠲᠠᠢᠵᠠᠨ ᠳᠤ ᠳᠠᠪᠬᠤᠷᠯᠠᠭᠰᠠᠨ ᠪᠡᠶ᠎ᠡ᠂ ᠲᠣᠯᠣᠭᠠᠢ᠂ ᠮᠠᠯᠭᠠᠢ᠂ ᠨᠢᠭᠡ ᠴᠢᠮᠡᠭᠯᠡᠯ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃"
  ],
  "Stack a head one level above a body, a hat one level above the head, then add a decoration.": [
    "在身体上方一层放头部，再往上一层放帽子，最后加个装饰。",
    "体のひとつ上に頭、そのひとつ上に帽子を積み、飾りを加えよう。",
    "Биеэс нэг түвшин дээр толгой, толгойноос нэг түвшин дээр малгай давхарлаад чимэглэл нэм.",
    "ᠪᠡᠶ᠎ᠡ ᠡᠴᠡ ᠨᠢᠭᠡ ᠲᠦᠪᠰᠢᠨ ᠳᠡᠭᠡᠷ᠎ᠡ ᠲᠣᠯᠣᠭᠠᠢ᠂ ᠲᠣᠯᠣᠭᠠᠢ ᠠᠴᠠ ᠨᠢᠭᠡ ᠲᠦᠪᠰᠢᠨ ᠳᠡᠭᠡᠷ᠎ᠡ ᠮᠠᠯᠭᠠᠢ ᠳᠠᠪᠬᠤᠷᠯᠠᠭᠠᠳ ᠴᠢᠮᠡᠭᠯᠡᠯ ᠨᠡᠮᠡ᠃"
  ],
  "Your world is alive! Keep building and make it yours.": [
    "你的世界动起来啦！继续搭建，让它更有你的风格。",
    "あなたの世界が動き出した！もっと作って、自分らしくしよう。",
    "Ертөнц чинь амиллаа! Барилгаа үргэлжлүүлж, өөрийнхөөрөө болго.",
    "ᠶᠢᠷᠲᠢᠨᠴᠦ ᠴᠢᠨᠢ ᠠᠮᠢᠯᠠᠯ᠎ᠠ！ ᠪᠠᠷᠢᠯᠭ᠎ᠠ ᠪᠠᠨ ᠦᠷᠭᠦᠯᠵᠢᠯᠡᠭᠦᠯᠵᠦ᠂ ᠥᠪᠡᠷ ᠦᠨᠬᠢ ᠪᠡᠷ ᠪᠣᠯᠭᠠ᠃"
  ],
  "An empty stage is full of possibilities. Place a piece to begin!": [
    "空舞台有无限可能，放个零件开始吧！",
    "空っぽのステージは可能性がいっぱい。パーツを置いて始めよう！",
    "Хоосон тайз боломжоор дүүрэн. Эхлэхийн тулд нэг хэсэг байрлуул!",
    "ᠬᠣᠭᠣᠰᠣᠨ ᠲᠠᠢᠵᠠ ᠪᠣᠯᠣᠮᠵᠢ ᠪᠠᠷ ᠳᠦᠭᠦᠷᠡᠩ᠃ ᠡᠬᠢᠯᠡᠬᠦ ᠶᠢᠨ ᠲᠤᠯᠠ ᠨᠢᠭᠡ ᠬᠡᠰᠡᠭ ᠪᠠᠢᠷᠢᠯᠠᠭᠤᠯ！"
  ],
  "Anything goes. Make a little world of your own.": [
    "随心创作，搭建属于你的小世界。",
    "何でも自由。自分だけの小さな世界を作ろう。",
    "Дуртайгаа хий. Өөрийн бяцхан ертөнцийг бүтээ.",
    "ᠳᠤᠷᠠᠲᠠᠢ ᠪᠠᠨ ᠬᠢ᠃ ᠥᠪᠡᠷ ᠦᠨ ᠪᠢᠴᠢᠬᠠᠨ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠶᠢ ᠪᠦᠲᠦᠭᠡ᠃"
  ],
  "Language": [
    "语言",
    "言語",
    "Хэл",
    "ᠬᠡᠯᠡ"
  ]
};
export function constructionText(language: Language, english: string, params: Record<string, string | number> = {}): string {
  const value = language === 'en' ? english : constructionCopies[english]?.[({ 'zh-CN': 0, ja: 1, 'mn-Cyrl-MN': 2, 'mn-Mong-CN': 3 } as const)[language]] ?? english;
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
}
