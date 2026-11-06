import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import catalog from '../src/economic/narration-catalog.json';

const require = createRequire(import.meta.url);
const { spoken, legacyBodyZh } = require('../src/economic/catalog-speech.cjs') as {
  spoken(text: string, lang: string): string;
  legacyBodyZh(id: string, intro: string, goal: string): string;
};

describe('durable catalog speech sources without generating recordings', () => {
  it.each([
    ['0', '零元'], ['0.00', '零元'], ['2.50', '二元五角钱'],
    ['0.80', '八角钱'], ['.80', '八角钱'], ['1.05', '一元零五分钱'],
    ['0.04', '四分钱'], ['0.06', '六分钱'], ['0.20', '二角钱'],
    ['1.50', '一元五角钱'], ['2.60', '二元六角钱'], ['2.55', '二元五角五分钱'],
    ['1.01', '一元零一分钱'], ['0.01', '一分钱'], ['10', '十元'],
    ['100.05', '一百元零五分钱'],
  ])('reads %s yuan using native yuan/jiao/fen', (amount, expected) => {
    expect(spoken(`${amount}元`, 'zh')).toBe(expected);
    expect(spoken(`${amount}元钱`, 'zh')).toBe(expected.endsWith('钱') ? expected : `${expected}钱`);
    expect(spoken(`¥${amount}`, 'zh')).toBe(expected);
    expect(spoken(`费用${amount}元，继续。`, 'zh')).toBe(`费用${expected}，继续。`);
  });
  it('keeps integer yuan natural in prose and preserves explicitly supplied 钱', () => {
    expect(spoken('领取6元零花钱，买1元用品，留2.00元。', 'zh')).toBe('领取六元零花钱，买一元用品，留二元。');
    expect(spoken('有6元钱、2.00元钱和0元钱。', 'zh')).toBe('有六元钱、二元钱和零元钱。');
    expect(spoken('¥6零花钱；¥1用品；¥2钱。', 'zh')).toBe('六元零花钱；一元用品；二元钱。');
  });
  it('preserves existing English, Japanese, Mongolian and non-money conversion', () => {
    expect(spoken('¥2.50 / 0.80元 / ¥1.05 / ¥0', 'en')).toBe('two yuan and fifty cents / zero yuan and eighty cents / one yuan and five cents / zero yuan');
    expect(spoken('¥2.50 / 0.80元 / ¥1.05 / ¥0', 'ja')).toBe('二元五十分 / 零元八十分 / 一元五分 / 零元');
    expect(spoken('2.50元', 'mn')).toBe('2.50元');
    expect(spoken('4分、6分利息、1%和1.05贝币', 'zh')).toBe('四分、六分利息、百分之一和一点零五贝币');
    expect(spoken('每贝币有一百分。', 'zh')).toBe('每贝币有一百分。');
  });
  it.each(['school-list', 'change', 'foreign-exchange', 'travel-prices', 'toy-customs'])('keeps the approved %s body authoritative over raw model prose', id => {
    const approved = catalog.scripts.find(row => row.id === `legacy.${id}.body`)!.text.zh;
    const source = legacyBodyZh(id, '旧介绍2.50元。', '旧目标0.80元。');
    expect(source).toBe(approved);
    expect(spoken(source, 'zh')).toBe(approved);
    expect(source).not.toMatch(/元[一二三四五六七八九]十分/);
  });
  it('keeps model prose as the fallback and wires the builder to both source helpers', () => {
    expect(spoken(legacyBodyZh('other-story', '价格1.05元。', '付0.80元。'), 'zh')).toBe('价格一元零五分钱。 付八角钱。');
    const builder = readFileSync(new URL('../src/economic/build-catalog.cjs', import.meta.url), 'utf8');
    expect(builder).toContain("const {spoken,legacyBodyZh}=require('./catalog-speech.cjs')");
    expect(builder).toContain('zh:legacyBodyZh(r[0],r[5],r[3])');
  });
});
