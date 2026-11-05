import type { HubLanguage } from './locale';
const en = { title: 'Little Economy', body: 'Pick a family, step into a cosy town and turn pocket money into little adventures. Shop, save, keep promises—and travel to Shell Island together.', note: '24 childhood stories · English / 简体中文 · no timer', action: 'Start a family story' };
const zh: typeof en = { title: '小小经济家', body: '选一个家庭，走进温馨的小镇。从买点心、赚零花钱、攒钱和守约，到全家一起去贝壳岛旅行，让每一次选择都变成生活里的小故事。', note: '24 个儿童期关卡 · 简体中文 / English · 不限时', action: '开启一家人的小冒险' };
const ja: typeof en = { title: '小さな経済の冒険', body: '家族を選び、あたたかな街へ。買い物、おこづかい、貯金、約束、そして家族でシェル島への旅行を楽しもう。', note: '子ども時代の24の物語 · English / 简体中文 · 時間制限なし', action: '家族の物語を始める' };
const mnCyrl: typeof en = { title: 'Бяцхан эдийн засагч', body: 'Гэр бүлээ сонгоод тухтай хотод зочлоорой. Худалдан авалт, халаасны мөнгө, хадгаламж, амлалт, гэр бүлээрээ Арал руу аялах бяцхан түүхүүд.', note: 'Хүүхэд насны 24 түүх · English / 简体中文 · хугацааны хязгааргүй', action: 'Гэр бүлийн түүхийг эхлүүлэх' };
const mnMong: typeof en = { title: 'ᠪᠢᠴᠢᠬᠠᠨ ᠡᠳ᠋ ᠦᠨ ᠵᠠᠰᠠᠭ', body: 'ᠭᠡᠷ ᠪᠦᠯᠡ ᠪᠡᠨ ᠰᠣᠩᠭᠣᠵᠤ᠂ ᠪᠢᠴᠢᠬᠠᠨ ᠬᠣᠲᠠ ᠳᠤ ᠠᠶᠠᠯᠠᠶ᠎ᠠ᠃', note: '24 · English / 简体中文', action: 'ᠲᠡᠦᠬᠡ ᠪᠡᠨ ᠡᠬᠢᠯᠡᠶ᠎ᠡ' };
export const economicHubCopy = (language: HubLanguage) => ({ en, 'zh-CN': zh, ja, 'mn-Cyrl-MN': mnCyrl, 'mn-Mong-CN': mnMong })[language];
