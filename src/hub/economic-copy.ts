import type { HubLanguage } from './locale';
const en = { title: 'Little Economy', body: 'Pick a family, step into a cosy town and turn pocket money into little adventures. Shop, travel, grow up, run a bakery and explore how banks and towns work.', note: '65 life stories · Chinese-first · no timer', action: 'Start a family story' };
const zh: typeof en = { title: '小小经济家', body: '选一个家庭，走进温馨的小镇。从买点心、赚零花钱、攒钱和守约，到旅行、长大经营面包店，再一起发现银行和城镇怎样运转。', note: '65 段人生故事 · 中文优先 · 不限时', action: '开启一家人的小冒险' };
const ja: typeof en = { title: '小さな経済の冒険', body: '家族を選び、あたたかな街へ。買い物、おこづかい、貯金、約束、そして家族でシェル島への旅行を楽しもう。', note: '人生をたどる65の物語 · 中国語が中心 · 時間制限なし', action: '家族の物語を始める' };
const mnCyrl: typeof en = { title: 'Бяцхан эдийн засагч', body: 'Гэр бүлээ сонгоод тухтай хотод зочлоорой. Худалдан авалт, халаасны мөнгө, хадгаламж, амлалт, гэр бүлээрээ Арал руу аялах бяцхан түүхүүд.', note: 'Амьдралын 65 түүх · хятад хэл үндсэн · хугацааны хязгааргүй', action: 'Гэр бүлийн түүхийг эхлүүлэх' };
const mnMong: typeof en = { title: 'ᠪᠢᠴᠢᠬᠠᠨ ᠡᠳ᠋ ᠦᠨ ᠵᠠᠰᠠᠭ', body: 'ᠭᠡᠷ ᠪᠦᠯᠡ ᠪᠡᠨ ᠰᠣᠩᠭᠣᠵᠤ᠂ ᠪᠢᠴᠢᠬᠠᠨ ᠬᠣᠲᠠ ᠳᠤ ᠠᠶᠠᠯᠠᠶ᠎ᠠ᠃', note: '65 ᠠᠮᠢᠳᠤᠷᠠᠯ ᠤᠨ ᠲᠡᠦᠬᠡ · ᠬᠢᠲᠠᠳ ᠬᠡᠯᠡ ᠭᠣᠣᠯ · ᠴᠠᠭ ᠤᠨ ᠬᠢᠵᠠᠭᠠᠷ ᠦᠭᠡᠢ', action: 'ᠲᠡᠦᠬᠡ ᠪᠡᠨ ᠡᠬᠢᠯᠡᠶ᠎ᠡ' };
export const economicHubCopy = (language: HubLanguage) => ({ en, 'zh-CN': zh, ja, 'mn-Cyrl-MN': mnCyrl, 'mn-Mong-CN': mnMong })[language];
