import type { Language } from './locale';

const copy = {
  en: { view: 'City view', flat: '2D map', depth: '3D city', reset: 'Reset view', loading: 'Opening the 3D city…', fallback: '3D is unavailable. The 2D map keeps your shift going.', orbit: 'Drag open space to look around. Tap a station or train to look inside.', queued: 'Next broadcast', current: 'Now speaking' },
  'zh-CN': { view: '城市视图', flat: '2D 地图', depth: '3D 城市', reset: '重置视角', loading: '正在打开 3D 城市…', fallback: '3D 暂不可用，已切换至 2D 地图，班次进度保留。', orbit: '拖动空白处环顾城市，点击车站或列车看看里面。', queued: '下一条广播', current: '当前播报' },
  ja: { view: '街の表示', flat: '2D マップ', depth: '3D の街', reset: '視点を戻す', loading: '3D の街を開いています…', fallback: '3D は利用できません。シフトを保ったまま 2D に戻りました。', orbit: '空いている場所をドラッグして見回し、駅や電車を押して中を見ましょう。', queued: '次の放送', current: '放送中' },
  'mn-Cyrl-MN': { view: 'Хотын харагдац', flat: '2D газрын зураг', depth: '3D хот', reset: 'Харагдацыг сэргээх', loading: '3D хотыг нээж байна…', fallback: '3D боломжгүй. Ээлжээ үргэлжлүүлэхийн тулд 2D зураг руу шилжлээ.', orbit: 'Хоосон зайг чирж эргэн харна уу. Өртөө эсвэл галт тэргийг дарж дотор нь хараарай.', queued: 'Дараагийн зарлал', current: 'Одоо тоглож буй зарлал' },
  'mn-Mong-CN': { view: 'ᠬᠣᠲᠠ ᠶᠢᠨ ᠬᠠᠷᠠᠭᠳᠠᠴᠠ', flat: '2D ᠭᠠᠵᠠᠷ ᠤᠨ ᠵᠢᠷᠤᠭ', depth: '3D ᠬᠣᠲᠠ', reset: 'ᠬᠠᠷᠠᠭᠳᠠᠴᠠ ᠶᠢ ᠰᠡᠷᠭᠦᠭᠡᠬᠦ', loading: '3D ᠬᠣᠲᠠ ᠶᠢ ᠨᠡᠭᠡᠭᠡᠵᠦ ᠪᠠᠶᠢᠨ᠎ᠠ…', fallback: '3D ᠪᠣᠯᠣᠮᠵᠢ ᠦᠭᠡᠢ᠃ 2D ᠵᠢᠷᠤᠭ ᠷᠤᠭᠤ ᠰᠢᠯᠵᠢᠯ᠎ᠡ᠃', orbit: 'ᠬᠣᠭᠣᠰᠣᠨ ᠵᠠᠢ ᠶᠢ ᠴᠢᠷᠴᠦ ᠡᠷᠭᠢᠨ ᠬᠠᠷᠠᠨ᠎ᠠ ᠤᠤ᠃ ᠥᠷᠲᠡᠭᠡ ᠡᠰᠡᠪᠡᠯ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠢ ᠳᠠᠷᠤᠵᠤ ᠳᠣᠲᠣᠷ᠎ᠠ ᠨᠢ ᠬᠠᠷᠠᠭᠠᠷᠠᠢ᠃', queued: 'ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠵᠠᠷᠯᠠᠯ', current: 'ᠣᠳᠣ ᠲᠣᠭᠯᠠᠵᠤ ᠪᠤᠢ ᠵᠠᠷᠯᠠᠯ' },
} satisfies Record<Language, Record<string, string>>;
export const metroExperienceText = (language: Language) => copy[language];
