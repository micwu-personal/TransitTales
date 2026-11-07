import { describe, expect, it } from 'vitest';
import { denominations, toggleMoneyPiece, pickedAmount, changeReady, changeTray, transferReceipt } from '../src/economic/money-interaction';
import { childhoodConversation, childhoodOutcomeChanges, quoteAmount } from '../src/economic/childhood-ui';
import { actChildhood, childhoodView, createChildhood } from '../src/economic/childhood';
import { act, createGame } from '../src/economic/model';
import { outcomeChanges } from '../src/economic/narration-guidance';

describe('physical money interactions', () => {
  it('draws exact denominations, including repeat coins and small change', () => {
    expect(denominations(380)).toEqual([100, 100, 100, 50, 10, 10, 10]);
    expect(denominations(80)).toEqual([50, 10, 10, 10]);
    for (const amount of [0, 1, 8, 99, 500, 9999, 100000]) expect(denominations(amount).reduce((a,b) => a+b, 0)).toBe(amount);
    for (const amount of [-1, 0.1, NaN, Infinity, 100001]) expect(denominations(amount)).toEqual([]);
  });
  it('allows picking up, putting back and recounting without changing the original selection', () => {
    const original = { id: 'collect-change', amount: 380, picked: [] as number[] };
    let selected = toggleMoneyPiece(original, 0);
    expect(pickedAmount(selected)).toBe(100);
    expect(changeReady(selected)).toBe(false);
    selected = toggleMoneyPiece(selected, 0);
    expect(pickedAmount(selected)).toBe(0);
    for (let index = 0; index < denominations(selected.amount).length; index++) selected = toggleMoneyPiece(selected, index);
    expect(pickedAmount(selected)).toBe(380);
    expect(changeReady(selected)).toBe(true);
    expect(original.picked).toEqual([]);
    for (const index of [-1, 7, 0.5, NaN]) expect(toggleMoneyPiece(selected,index)).toBe(selected);
  });
  it('does not let duplicate or invalid indices manufacture money', () => {
    const selected = { id: 'collect-change', amount: 380, picked: [0, 0, 123] };
    expect(pickedAmount(selected)).toBe(100);
    expect(changeReady(selected)).toBe(false);
    expect(changeReady({ id: 'invalid', amount: 100001, picked: [] })).toBe(false);
  });
  it('keeps money in hand separate from a completed wallet transaction in every language', () => {
    for (const lang of ['zh','en','ja','mn','mn-Mong'] as const) {
      const selection = { id: 'collect-change', amount: 380, picked: [0] };
      const html = changeTray(selection,lang);
      expect(html).toContain('id="picked-change" aria-live="polite"');
      expect(html).toContain('id="confirm-change" data-action="collect-change" class="primary" disabled');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('id="cancel-change"');
      const complete = changeTray({ ...selection, picked: denominations(380).map((_,i) => i) },lang,true);
      expect(complete).toContain('data-childhood-action="collect-change" class="primary" >');
    }
  });
  it('offers reversible change collection in the optional market without mutating its ledger', () => {
    const start = createChildhood('market',{ gender:'girl', children:1 });
    const state = actChildhood(start,'fruit-fresh').state;
    const before = JSON.stringify(state), selection = { id:'check-change', amount:state.envelope.change, picked:[0] };
    const html = childhoodConversation(state,'zh',undefined,true,undefined,false,undefined,selection);
    expect(html).toContain('data-change-select="check-change"');
    expect(html).toContain('data-childhood-action="check-change" class="primary" disabled');
    expect(JSON.stringify(state)).toBe(before);
  });
  it('shows actual payment and inventory changes, without animating debt as cash', () => {
    let before = act(createGame({ gender:'boy', children:1 }),'read-tags').state;
    const after = act(before,'buy-apple',1).state;
    const html = transferReceipt(outcomeChanges(before,after),'zh');
    expect(html).toContain('physical-transfer transfer-out');
    expect(html).toContain('physical-transfer transfer-in');
    expect(html).toContain('0.80元');
    expect(html).toContain('苹果');
    expect(html).toContain('role="status"');
    const debt = transferReceipt([{ label:{zh:'欠款',en:'Debt'},value:-100,money:'home' }],'zh');
    expect(debt).not.toContain('physical-transfer');
    const storyBefore = createChildhood('wishes',{ gender:'boy', children:1 });
    const storyAfter = actChildhood(storyBefore,'wish-book').state;
    const rows = childhoodOutcomeChanges(storyBefore,storyAfter);
    expect(rows.find(row => row.physical)?.value).toBe(-200);
    expect(rows.find(row => row.item)?.value).toBe(1);
  });
  it('associates destination quotes explicitly and removes sentence punctuation from currency units', () => {
    const view = childhoodView(createChildhood('travel',{gender:'girl',children:1}));
    expect(view.quotes.filter(quote => quote.choiceId === 'shell')).toHaveLength(3);
    expect(view.quotes.filter(quote => quote.choiceId === 'lantern')).toHaveLength(3);
    expect(quoteAmount(view.quotes.find(quote => quote.unit === 'rate')!,'zh')).not.toMatch(/贝币。/);
  });
});
