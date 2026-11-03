import { describe, expect, it } from 'vitest';
import type { Language } from '../src/rush/locale';
import { DESTINATIONS } from '../src/universe/catalog';
import { narrationCopy, objectNarration } from '../src/universe/narration-locale';

const languages: readonly Language[] = ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'];
const copyKeys = [
  'on', 'off', 'listen', 'stop', 'title', 'unavailable', 'noVoice', 'speaking', 'ready',
  'voice', 'automatic', 'note', 'notFormed', 'reconstruction', 'future', 'flyby',
  'notFormedShort', 'reconstructionShort', 'futureShort',
].sort();
const sentenceEnd: Record<Language, RegExp> = {
  en: /[.!?](?:\s|$)/g,
  'zh-CN': /[。！？]/g,
  ja: /[。！？]/g,
  'mn-Cyrl-MN': /[.!?](?:\s|$)/g,
  'mn-Mong-CN': /᠃/g,
};

// Each expression locks a scientific distinction in the language being spoken.
const caveats: Record<Language, Record<string, readonly RegExp[]>> = {
  en: {
    oort: [/inferred/, /not directly imaged/],
    'proxima-b': [/confirmed planet/, /surface, atmosphere, water and habitability remain unknown/, /imagination, not a discovery/],
    horizon: [/not a physical wall/, /expansion/, /distance/, /light travel time/],
    'stellar-hole': [/inside its event horizon/, /light cannot escape/, /not a material wall/, /safe close travel here is fiction/],
    sagittarius: [/dim accretion/, /rather than.*quasar/, /light cannot escape/, /visit.*fiction/],
    quasar: [/accretes/, /before crossing the horizon/, /lookback time differs from present distance/, /expands/],
    beyond: [/no observation/, /speculation, not evidence/],
  },
  'zh-CN': {
    oort: [/彗星轨道推断/, /尚未被直接成像/, /不是一张实拍/],
    'proxima-b': [/已经得到确认/, /表面、大气、是否有水/, /宜居，仍然未知/, /不是观测证据/],
    horizon: [/不是一堵实体墙/, /不等于整个宇宙的尽头/, /空间膨胀/, /距离不能只用光走过的时间/],
    'stellar-hole': [/进入事件视界，连光也无法逃出/, /不是实体墙壁/, /安全近访.*虚构/],
    sagittarius: [/人马座A星/, /吸积活动较暗/, /并不是.*类星体/, /光也无法从内部逃出/, /近访.*只存在于故事/],
    quasar: [/吸积/, /视界之外/, /不是黑洞内部透出的光/, /回溯的时间与今天的距离/, /宇宙不断膨胀/],
    beyond: [/没有观测/, /推测和想象，而不是证据/],
  },
  ja: {
    oort: [/推定/, /直接撮影されていません/],
    'proxima-b': [/確認済み/, /地表、大気、水、住みやすさはまだ不明/, /発見ではなく想像/],
    horizon: [/物理的な壁でも全空間の端でもありません/, /膨張/, /距離.*時間/],
    'stellar-hole': [/地平面は物質の壁ではありません/, /光も逃げられず/, /安全な接近は空想/],
    sagittarius: [/降着は暗く/, /クエーサーではありません/, /光は逃げられず/, /訪問.*空想/],
    quasar: [/降着/, /地平面の外/, /時間と現在の距離は異なり/, /膨張/],
    beyond: [/未観測/, /証拠ではなく推測/],
  },
  'mn-Cyrl-MN': {
    oort: [/таамагласан/, /шууд зураглагдаагүй/],
    'proxima-b': [/батлагдсан гараг/, /гадарга, агаар, ус, амьдрах боломж нь тодорхойгүй/, /нээлт биш төсөөлөл/],
    horizon: [/биет хана.*биш/, /Тэлэлт/, /зайг гэрлийн хугацаагаар/],
    'stellar-hole': [/хаяа нь биет хана биш/, /гэрэл ч зугтаж чадахгүй/, /аюулгүй ойртох нь зохиомол/],
    sagittarius: [/уналт нь бүдэг/, /квазар биш/, /гэрэл гарч чадахгүй/, /аялал.*зохиомол/],
    quasar: [/бодис унахдаа/, /хаяаны гадна/, /хугацаа өнөөгийн зайнаас ялгаатай/, /тэлдэг/],
    beyond: [/ажиглалт байхгүй/, /нотолгоо биш таамаглал/],
  },
  'mn-Mong-CN': {
    oort: [/ᠲᠠᠭᠠᠮᠠᠭᠯᠠᠭᠰᠠᠨ/, /ᠰᠢᠭᠤᠳ ᠵᠢᠷᠤᠭᠯᠠᠭᠳᠠᠭ᠎ᠠ ᠦᠭᠡᠢ/],
    'proxima-b': [/ᠨᠣᠲᠠᠯᠠᠭᠳᠠᠭᠰᠠᠨ ᠭᠠᠷᠠᠭ/, /ᠠᠭᠠᠭᠠᠷ᠂ ᠤᠰᠤ/, /ᠲᠣᠳᠣᠷᠬᠠᠢ ᠦᠭᠡᠢ/, /ᠨᠡᠭᠡᠭᠡᠯᠲᠡ ᠪᠢᠰᠢ ᠲᠥᠰᠦᠭᠡᠯ/],
    horizon: [/ᠪᠢᠶᠡᠲᠦ ᠬᠠᠨ᠎ᠠ ᠪᠢᠰᠢ/, /ᠲᠡᠯᠡᠯᠲᠡ/, /ᠵᠠᠢ ᠶᠢ ᠭᠡᠷᠡᠯ ᠦᠨ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ/],
    'stellar-hole': [/ᠪᠢᠶᠡᠲᠦ ᠬᠠᠨ᠎ᠠ ᠪᠢᠰᠢ/, /ᠭᠡᠷᠡᠯ ᠴᠦ ᠭᠠᠷᠴᠤ ᠴᠢᠳᠠᠬᠤᠭᠦᠢ/, /ᠣᠶᠢᠷᠠᠲᠤᠬᠤ ᠨᠢ ᠵᠣᠬᠢᠶᠠᠮᠠᠯ/],
    sagittarius: [/ᠤᠨᠠᠯᠲᠠ ᠨᠢ ᠪᠦᠳᠡᠭ/, /ᠺᠸᠠᠽᠠᠷ ᠪᠢᠰᠢ/, /ᠭᠡᠷᠡᠯ ᠭᠠᠷᠴᠤ ᠴᠢᠳᠠᠬᠤᠭᠦᠢ/, /ᠠᠶᠠᠯᠠᠯ ᠪᠣᠯ ᠵᠣᠬᠢᠶᠠᠮᠠᠯ/],
    quasar: [/ᠬᠠᠶᠠᠭ᠎ᠠ ᠶᠢᠨ ᠭᠠᠳᠠᠨ᠎ᠠ/, /ᠤᠨᠠᠬᠤ/, /ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ ᠣᠳᠣᠬᠠᠨ ᠤ ᠵᠠᠢ ᠡᠴᠡ ᠶᠠᠯᠭᠠᠭᠠᠲᠠᠢ/, /ᠲᠡᠯᠡᠳᠡᠭ/],
    beyond: [/ᠠᠵᠢᠭᠯᠠᠯᠲᠠ ᠦᠭᠡᠢ/, /ᠨᠣᠲᠠᠯᠠᠭ᠎ᠠ ᠪᠢᠰᠢ ᠲᠠᠭᠠᠮᠠᠭᠯᠠᠯ/],
  },
};

describe('localized cosmic narration', () => {
  it.each(languages)('covers all 28 destinations with distinct paragraphs and brief cues in %s', language => {
    expect(DESTINATIONS).toHaveLength(28);
    for (const { id } of DESTINATIONS) {
      const paragraph = objectNarration(id, language);
      const short = objectNarration(id, language, true);
      expect(paragraph.trim(), id).not.toBe('');
      expect(short.trim(), id).not.toBe('');
      expect(objectNarration(id, language, false), id).toBe(paragraph);
      expect(short.length, id).toBeLessThan(paragraph.length);
      const sentences = paragraph.match(sentenceEnd[language]) ?? [];
      expect(sentences.length, id).toBeGreaterThanOrEqual(2);
      expect(sentences.length, id).toBeLessThanOrEqual(3);
      expect(short.match(sentenceEnd[language]), id).toHaveLength(1);
      if (language === 'zh-CN') {
        expect(Array.from(short).length, id).toBeGreaterThanOrEqual(8);
        expect(Array.from(short).length, id).toBeLessThanOrEqual(18);
      }
      if (language === 'en') expect(short.split(/\s+/).length, id).toBeLessThanOrEqual(7);
    }
  });

  it('has independent translations instead of falling back to another language', () => {
    for (const { id } of DESTINATIONS) {
      expect(new Set(languages.map(language => objectNarration(id, language))).size, id).toBe(5);
      expect(new Set(languages.map(language => objectNarration(id, language, true))).size, id).toBe(5);
    }
  });

  it.each(languages)('returns empty text for unknown and inherited ids in %s', language => {
    for (const id of ['', 'unknown-world', '__proto__', 'constructor', 'toString']) {
      expect(objectNarration(id, language)).toBe('');
      expect(objectNarration(id, language, true)).toBe('');
    }
  });

  it.each(languages)('exposes the same complete set of localized UI keys in %s', language => {
    const localized = narrationCopy(language);
    expect(Object.keys(localized).sort()).toEqual(copyKeys);
    for (const text of Object.values(localized)) expect(text.trim()).not.toBe('');
    expect(localized.flyby).not.toBe(localized.speaking);
    for (const { id } of DESTINATIONS) expect(objectNarration(id, language, true)).not.toContain(localized.flyby);
  });

  it.each(languages)('provides separate, compact era clauses in %s', language => {
    const localized = narrationCopy(language);
    for (const [short, full] of [
      [localized.notFormedShort, localized.notFormed],
      [localized.reconstructionShort, localized.reconstruction],
      [localized.futureShort, localized.future],
    ]) {
      expect(short.length).toBeLessThan(full.length);
      expect(short.match(sentenceEnd[language])).toHaveLength(1);
      if (language === 'zh-CN') expect(Array.from(short).length).toBeLessThanOrEqual(10);
      if (language === 'en') expect(short.split(/\s+/).length).toBeLessThanOrEqual(4);
    }
  });

  it('explains optional, device-dependent speech without an English fallback promise', () => {
    const english = narrationCopy('en');
    const chinese = narrationCopy('zh-CN');
    expect(english.note).toMatch(/quality depends on your device and browser/);
    expect(english.note).toMatch(/optional.*text remains readable/);
    expect(english.noVoice).toMatch(/No voice.*this language/);
    expect(chinese.note).toMatch(/取决于设备与浏览器/);
    expect(chinese.note).toMatch(/自由开关.*完整阅读/);
    expect(chinese.noVoice).toMatch(/尚无此语言的声音/);
    for (const language of languages) expect(narrationCopy(language).noVoice).not.toMatch(/English|英语|英語|Англи|ᠠᠩᠭᠯᠢ/i);
  });

  it('keeps present-day reference separate from reconstructed past and speculative future', () => {
    const english = narrationCopy('en');
    const chinese = narrationCopy('zh-CN');
    expect(english.notFormed).toMatch(/not formed in this era.*outline is a reconstruction/);
    expect(english.reconstruction).toMatch(/present-day observations.*Past scenery is a simplified reconstruction/);
    expect(english.future).toMatch(/speculative.*only a present-day observational reference/);
    expect(chinese.notFormed).toMatch(/尚未形成.*轮廓只是示意重建/);
    expect(chinese.reconstruction).toMatch(/当下观测.*过去.*简化重建.*不代表/);
    expect(chinese.future).toMatch(/推测.*只以当下观测作为参考.*不是.*预言/);
    expect(chinese.notFormedShort).toBe('尚未形成。');
    expect(chinese.reconstructionShort).toBe('早期位置仅为重建。');
    expect(chinese.futureShort).toBe('未来景象是假想。');
  });

  it.each(languages)('preserves observation, gravity and distance caveats in %s', language => {
    for (const [id, patterns] of Object.entries(caveats[language])) {
      for (const pattern of patterns) expect(objectNarration(id, language), `${id}: ${pattern}`).toMatch(pattern);
    }
  });

  it('uses natural Chinese spoken names and nuclear fusion rather than chemical burning', () => {
    expect(objectNarration('sun', 'zh-CN')).toMatch(/核聚变.*氢.*氦/);
    expect(objectNarration('sun', 'zh-CN')).toContain('并非像木柴那样燃烧');
    expect(objectNarration('sagittarius', 'zh-CN')).toContain('人马座A星');
    expect(objectNarration('sagittarius', 'zh-CN', true)).toContain('人马座A星');
    for (const { id } of DESTINATIONS) {
      for (const short of [false, true]) {
        const text = objectNarration(id, 'zh-CN', short);
        expect(text, id).not.toContain('*');
        expect(text.replaceAll('人马座A星', ''), id).not.toMatch(/[A-Za-zα]/);
      }
    }
    expect(objectNarration('oort', 'zh-CN', true)).toContain('推断');
    expect(objectNarration('proxima-b', 'zh-CN', true)).toContain('未知');
    expect(objectNarration('beyond', 'zh-CN', true)).toContain('推测');
    expect(objectNarration('horizon', 'zh-CN', true)).toContain('并非墙壁');
  });

  it.each(['mn-Cyrl-MN', 'mn-Mong-CN'] as const)('uses native Mongolian script without Chinese or Latin leakage in %s', language => {
    const native = language === 'mn-Cyrl-MN' ? /\p{Script=Cyrillic}/u : /\p{Script=Mongolian}/u;
    const texts = [
      ...Object.values(narrationCopy(language)),
      ...DESTINATIONS.flatMap(({ id }) => [objectNarration(id, language), objectNarration(id, language, true)]),
    ];
    for (const text of texts) {
      expect(text).toMatch(native);
      expect(text).not.toMatch(/\p{Script=Han}|[A-Za-z]/u);
    }
  });
});
