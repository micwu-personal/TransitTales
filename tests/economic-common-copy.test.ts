import { describe, expect, it } from 'vitest';
import catalog from '../src/economic/narration-catalog.json';
import legacy from '../src/economic/legacy-content.json';
import { common, legacyResult } from '../src/economic/legacy-localization';
import { speechFor as scriptCue } from '../src/economic/speech-cues';

const ids = ['complete', 'work', 'purchase', 'purchase-result'] as const;
const languages = ['zh', 'en', 'ja', 'mn', 'mn-Mong'] as const;

describe('plain shared economic outcomes', () => {
  it.each(ids)('keeps %s in all five written languages and its existing recorded cue', id => {
    const row = catalog.scripts.find(script => script.id === `legacy.common.${id}`)!;
    expect(row).toBeDefined();
    for (const lang of languages) {
      expect(common(id)[lang]).toBe(legacy.common[id][lang]);
      expect(legacy.common[id][lang].trim()).not.toBe('');
      if (lang !== 'mn-Mong') expect(row.text[lang]).toBe(legacy.common[id][lang]);
    }
    expect(scriptCue(common(id))).toEqual([`legacy.common.${id}`]);
  });

  it('does not attach recurring story jokes or metaphors to shared outcomes', () => {
    const copy = ids.map(id => legacy.common[id]);
    expect(copy.map(row => row.zh).join(' ')).not.toMatch(/消失|怪兽|偷懒|笑容|偷偷/);
    expect(copy.map(row => row.en).join(' ')).not.toMatch(/monster|sneak|smile|disappear/i);
    expect(copy.map(row => row.ja).join(' ')).not.toMatch(/怪獣|サボ|笑顔|こっそり/);
    expect(copy.map(row => row.mn).join(' ')).not.toMatch(/мангас|залхуур|инээмсэглэл/);
    expect(legacy.family['family.chores.intro.1'].zh).toContain('袜子怪兽');
    expect(legacy.family['family.school-list.intro'].zh).toContain('玩具恐龙');
  });

  it.each(['collect-pay', 'allowance', 'receive-gift', 'travel-envelope'])('uses a neutral money receipt for %s, not a claim of paid work', id => {
    const result = legacyResult({ zh: '具体到账说明。', en: 'Specific receipt.' }, id, true, false);
    expect(scriptCue(result)).toEqual(['legacy.common.work']);
    expect(result.ja).toBe(legacy.common.work.ja);
    expect(legacy.common.work.zh).toBe('这笔钱已收到，账本也记好了。');
    expect(legacy.common.work.en).not.toMatch(/work|wage|job/i);
  });

  it('does not promise that booking a service puts a physical item in the bag', () => {
    const result = legacyResult({ zh: '预订完成。', en: 'Booking complete.' }, 'book-room', true, false);
    expect(scriptCue(result)).toEqual(['legacy.common.purchase-result']);
    expect(legacy.common['purchase-result'].zh).not.toMatch(/背包|卖家|消失/);
    expect(legacy.common['purchase-result'].en).not.toMatch(/bag|seller|received/i);
  });

  it('keeps the prepaid versus repayable credit distinction factual', () => {
    expect(legacy.common.purchase.zh).toContain('预付用自己的钱');
    expect(legacy.common.purchase.zh).toContain('信用付款的欠款要还');
    expect(legacy.common.purchase.en).toContain('Prepaid uses your own money');
    expect(legacy.common.purchase.en).toContain('credit creates debt to repay');
  });
});
