import type { Language } from './rush/locale';

export const cameraCopy: Record<Language, { controls: string; zoomIn: string; zoomOut: string; hint: string }> = {
  en: { controls: 'Camera controls', zoomIn: 'Zoom in', zoomOut: 'Zoom out', hint: 'On open space, use the mouse wheel or pinch with two fingers to zoom. The + / − buttons work too.' },
  'zh-CN': { controls: '视角控制', zoomIn: '放大', zoomOut: '缩小', hint: '在空白处滚动鼠标滚轮或双指开合即可缩放，也可使用 + / − 按钮。' },
  ja: { controls: 'カメラ操作', zoomIn: '拡大', zoomOut: '縮小', hint: '空いている場所でマウスホイールか2本指のピンチで拡大・縮小。+ / − ボタンも使えます。' },
  'mn-Cyrl-MN': { controls: 'Камерын удирдлага', zoomIn: 'Томруулах', zoomOut: 'Жижигрүүлэх', hint: 'Хоосон зайд хулганы дугуйг эргүүлэх эсвэл хоёр хуруугаа ойртуулж, холдуулж хэмжээг өөрчилнө. + / − товчийг бас ашиглаж болно.' },
  'mn-Mong-CN': { controls: 'ᠬᠠᠷᠠᠬᠤ ᠥᠨᠴᠥᠭ', zoomIn: 'ᠲᠣᠮᠣᠷᠤᠭᠤᠯᠬᠤ', zoomOut: 'ᠪᠠᠭᠠᠰᠬᠠᠬᠤ', hint: 'ᠬᠣᠭᠣᠰᠣᠨ ᠵᠠᠢ ᠳᠤ ᠬᠣᠶᠠᠷ ᠬᠤᠷᠤᠭᠤ ᠪᠠᠷ ᠲᠣᠮᠣᠷᠤᠭᠤᠯᠵᠤ ᠪᠠᠭᠠᠰᠬᠠ᠃ + / − ᠲᠣᠪᠴᠢ ᠶᠢ ᠪᠠᠰᠠ ᠬᠡᠷᠡᠭᠯᠡᠵᠦ ᠪᠣᠯᠣᠨ᠎ᠠ᠃' },
};
