import type { HubLanguage } from '../hub/locale';

export const moonlineHubCopy = (lang: HubLanguage) => ({
  en: ['Moonline', 'Ride a night train through classical music. Catch the notes on the cab’s piano, strings or drums, then write a route of your own.', 'English and Simplified Chinese', 'Board Moonline'],
  'zh-CN': ['月光列车', '乘坐夜车穿越古典乐曲。在车厢里弹琴或敲鼓，接住飞来的音符，再创作一条自己的音乐线路。', '简体中文与英语', '登上月光列车'],
  ja: ['月光列車', '夜行列車でクラシック音楽の旅へ。流れてくる音符を楽器で奏で、自分の曲も作ってみよう。', 'ゲームは英語・簡体字中国語に対応', '月光列車に乗る'],
  'mn-Cyrl-MN': ['Саран галт тэрэг', 'Шөнийн галт тэргээр сонгодог хөгжмийн аялалд гараарай. Нисэн ирэх нотыг тоглож, өөрийн аяыг зохио.', 'Англи, хялбаршуулсан хятад хэлээр', 'Галт тэргэнд суух'],
  'mn-Mong-CN': ['ᠰᠠᠷᠠᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ', 'ᠰᠥᠨᠢ ᠶᠢᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠪᠡᠷ ᠬᠥᠭᠵᠢᠮ ᠦᠨ ᠠᠶᠠᠯᠠᠯ ᠳᠤ ᠭᠠᠷᠤᠶ᠎ᠠ᠃', 'English · 简体中文', 'ᠲᠡᠷᠭᠡᠨ ᠳᠦ ᠰᠠᠭᠤᠬᠤ'],
} as const)[lang];
