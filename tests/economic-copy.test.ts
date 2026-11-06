import { describe, expect, it } from 'vitest';
import { copy } from '../src/economic/copy';
import { act, createGame } from '../src/economic/model';
import { outcomeChanges, outcomeChangeText } from '../src/economic/narration-guidance';
import { itemText } from '../src/economic/legacy-localization';

describe('economic child-perspective copy', () => {
  it('describes siblings in the family without making the child a parent', () => {
    expect(copy('zh').familySize).toEqual(['我是独生子女', '我家有两个孩子', '我家有三个孩子']);
  });
  it.each([1, 2, 3] as const)('names both cash and purchased items for a %i-child family', children => {
    const before = act(createGame({ children, gender: 'boy' }), 'read-tags').state;
    const result = act(before, 'buy-apple');
    expect(result.ok).toBe(true);
    expect(result.message.zh).toContain(`背包里多了${children}个苹果`);
    const rows = outcomeChanges(before, result.state).map(row => outcomeChangeText(row, 'zh'));
    expect(rows).toContain(`口袋里的零钱减少了${(children * .8).toFixed(2)}元。`);
    expect(rows).toContain(`背包里的苹果增加了${children}个。`);
    expect(before.cash - result.state.cash).toBe(80 * children);
    expect(result.state.inventory.apple).toBe(children);
  });
  it('keeps the item and its classifier explicit for additions and removals', () => {
    for (const [id, unit] of [['book', '本'], ['juice', '杯'], ['umbrella', '把'], ['coat', '件'], ['ticket', '张'], ['kit', '套'], ['snack', '份']]) {
      for (const value of [2, -2]) {
        expect(outcomeChangeText({ label: itemText(id), item: id, value }, 'zh')).toBe(`背包里的${itemText(id).zh}${value > 0 ? '增加了' : '减少了'}2${unit}。`);
      }
    }
  });
  it('distinguishes digital payments, foreign payments and refunds from pocket cash', () => {
    const before = createGame({ children: 2, gender: 'girl' }), after = structuredClone(before);
    after.digital -= 150; after.flags.foreignCash = 30; after.inventory.apple = 1;
    const rows = outcomeChanges(before, after);
    expect(rows.some(row => row.label.zh.includes('零钱'))).toBe(false);
    expect(rows.filter(row => row.money).map(row => row.money)).toEqual(['home', 'foreign']);
    const refund = structuredClone(after); refund.cash += 80; delete refund.inventory.apple;
    expect(outcomeChanges(after, refund).map(row => outcomeChangeText(row, 'zh'))).toEqual(['口袋里的零钱增加了0.80元。', '背包里的苹果减少了1个。']);
  });
});
