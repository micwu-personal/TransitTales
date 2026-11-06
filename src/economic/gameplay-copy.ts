import type { Lang, Text } from './model';
import { withSpeech } from './speech-cues';
const labels = {
  voice: ['语音', 'Voice', '音声', 'Дуу хоолой', 'ᠳᠠᠭᠤ'],
  effects: ['小音效', 'Sound effects', '効果音', 'Дууны эффект', 'ᠳᠠᠭᠤᠨ ᠤ ᠨᠥᠯᠥᠭᠡ'],
  nextStep: ['接下来', 'Next step', 'つぎは', 'Дараагийн алхам', 'ᠳᠠᠷᠠᠭ᠎ᠠ ᠶᠢᠨ ᠠᠯᠬᠤᠮ'],
  moreHint: ['再给我一点提示', 'One more hint', 'もう少しヒント', 'Дахиад нэг сэжим', 'ᠳᠠᠬᠢᠨ ᠨᠢᠭᠡ ᠰᠡᠵᠢᠮ'],
  listenHint: ['听听提示', 'Hear the hint', 'ヒントを聞く', 'Сэжмийг сонсох', 'ᠰᠡᠵᠢᠮ ᠢ ᠰᠣᠨᠣᠰᠬᠤ'],
  childhood: ['童年的生活小故事', 'Childhood side stories', '子ども時代の小さなお話', 'Бага насны жижиг түүхүүд', 'ᠪᠠᠭ᠎ᠠ ᠨᠠᠰᠤᠨ ᠤ ᠪᠢᠴᠢᠬᠠᠨ ᠲᠡᠦᠬᠡ'],
  envelope: ['故事小信封', 'Story envelope', 'お話のお財布', 'Түүхийн дугтуй', 'ᠲᠡᠦᠬᠡ ᠶᠢᠨ ᠳᠤᠭᠲᠤᠢ'],
  envelopeNote: ['这是额外故事的小信封，不会动主线的零钱、欠条或年龄。', 'This extra story has its own envelope. Your main-story money, promises and age stay unchanged.', 'このお話には専用のお財布があるよ。本編のお金、約束、年齢は変わらない。', 'Энэ нэмэлт түүх өөрийн дугтуйтай. Үндсэн түүхийн мөнгө, өр, нас өөрчлөгдөхгүй.', 'ᠡᠨᠡ ᠨᠡᠮᠡᠯᠲᠡ ᠲᠡᠦᠬᠡ ᠥᠪᠡᠷ ᠦᠨ ᠳᠤᠭᠲᠤᠢ ᠲᠠᠢ᠃ ᠦᠨᠳᠦᠰᠦᠨ ᠲᠡᠦᠬᠡ ᠶᠢᠨ ᠮᠥᠩᠭᠥ ᠂ ᠥᠷᠢ ᠂ ᠨᠠᠰᠤ ᠥᠭᠡᠷᠴᠢᠯᠡᠭᠳᠡᠬᠦ ᠦᠭᠡᠢ᠃'],
  backStory: ['回到主线故事', 'Back to the main story', '本編に戻る', 'Үндсэн түүх рүү буцах', 'ᠦᠨᠳᠦᠰᠦᠨ ᠲᠡᠦᠬᠡ ᠳᠦ ᠪᠤᠴᠠᠬᠤ'],
  replayStory: ['重新体验这个小故事', 'Replay this side story', 'このお話をもう一度', 'Энэ түүхийг дахин тоглох', 'ᠡᠨᠡ ᠲᠡᠦᠬᠡ ᠶᠢ ᠳᠠᠬᠢᠨ ᠲᠣᠭᠯᠠᠬᠤ'],
} as const;
const spokenKeys = ['childhood', 'envelopeNote'] as const;
export const GAMEPLAY_SCRIPTS = spokenKeys.map(key => ({ id: `ui.gameplay.${key}`, text: { zh: labels[key][0], en: labels[key][1], ja: labels[key][2], mn: labels[key][3] } }));
export function gameplayText(key: typeof spokenKeys[number]): Text {
  const values = labels[key];
  return withSpeech({ zh: values[0], en: values[1], ja: values[2], mn: values[3], 'mn-Mong': values[4] }, `ui.gameplay.${key}`);
}
export function gameplayCopy(lang: Lang): Record<keyof typeof labels, string> {
  const column = (['zh', 'en', 'ja', 'mn', 'mn-Mong'] as const).indexOf(lang);
  return Object.fromEntries(Object.entries(labels).map(([key, values]) => [key, values[column]])) as Record<keyof typeof labels, string>;
}
