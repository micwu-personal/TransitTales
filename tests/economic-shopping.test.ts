import { describe, expect, it } from 'vitest';
import { act, advance, createGame, getActions, getProgress, type GameState } from '../src/economic/model';
import { actionTitle, groupOffers, salesUnitText } from '../src/economic/action-presentation';
import { choiceNarration } from '../src/economic/narration-guidance';
import { createChildhood, childhoodView } from '../src/economic/childhood';
import { childhoodConversation } from '../src/economic/childhood-ui';

function step(state: GameState, id: string, quantity?: number): GameState {
  const result = act(state, id, quantity);
  expect(result.ok, `${id}: ${result.message.zh}`).toBe(true);
  return result.state;
}
function shop(children: 1 | 2 | 3): GameState {
  return step(createGame({ gender: 'girl', children }), 'read-tags');
}

describe('reversible shopping previews and quantity transactions', () => {
  for (const children of [1, 2, 3] as const) {
    it(`finishes both shopping missions with one-at-a-time purchases for ${children} child(ren)`, () => {
      let state = shop(children);
      const startCash = state.cash;
      for (let i = 1; i <= children; i++) {
        state = step(state, 'buy-apple', 1);
        expect(state.inventory.apple).toBe(i);
        expect(state.cash).toBe(startCash - 80 * i);
        expect(getProgress(state).current).toBe(i < children ? 1 : 2);
        expect(act(state, 'share-apples').ok).toBe(i === children);
      }
      expect(act(state, 'buy-apple', 1).ok).toBe(false);
      state = step(state, 'share-apples');
      state = step(advance(state), 'make-list');
      for (const item of ['apple', 'bread']) {
        for (let i = 1; i <= children; i++) {
          state = step(state, `buy-${item}`, 1);
          if (i < children) expect(act(state, 'pack-lunch').ok).toBe(false);
        }
      }
      state = step(state, 'pack-lunch');
      expect(state.completed).toBe(true);
      expect(state.ledger.filter(row => row.cash < 0)).toHaveLength(children * 3);
    });
  }
  it('previews exact costs without mutating cash, inventory, flags or ledger', () => {
    const state = shop(3), before = JSON.stringify(state);
    for (const quantity of [1, 2, 3]) {
      const offer = getActions(state, 'shop', { id: 'buy-apple', quantity }).find(o => o.id === 'buy-apple')!;
      expect(offer.purchase?.quantity).toBe(quantity);
      expect(offer.facts?.find(fact => fact.id === 'total')?.value).toBe(80 * quantity);
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('allows an affordable partial purchase when the whole remaining quantity is unaffordable', () => {
    const state = { ...shop(3), cash: 100 };
    expect(getActions(state, 'shop').find(o => o.id === 'buy-apple')?.disabled).toBeDefined();
    expect(getActions(state, 'shop', { id: 'buy-apple', quantity: 1 }).find(o => o.id === 'buy-apple')?.disabled).toBeUndefined();
    expect(step(state, 'buy-apple', 1).cash).toBe(20);
  });
  it('rejects invalid, overstock, fixed and non-purchase quantities without changing the state', () => {
    const state = shop(3), before = JSON.stringify(state);
    for (const quantity of [0, -1, 0.5, 4, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const result = act(state, 'buy-apple', quantity);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(state);
      expect(getActions(state, 'shop', { id: 'buy-apple', quantity }).find(o => o.id === 'buy-apple')?.purchase?.quantity).toBe(3);
    }
    for (const id of ['read-tags', 'talk-shop', 'share-apples', 'buy-toy']) {
      const result = act(state, id, 2);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(state);
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('narrates the selected quantity rather than a stale family-sized purchase sentence', () => {
    const state = shop(3);
    const offer = getActions(state, 'shop', { id: 'buy-apple', quantity: 1 }).find(o => o.id === 'buy-apple')!;
    const cues = choiceNarration(state, offer, 'zh').flat();
    expect(cues).toContain('number.1');
    expect(cues).toContain('money.home.80');
    expect(cues.some(cue => cue.includes('buy3') || cue.includes('buy-3'))).toBe(false);
    expect(cues).not.toContain('legacy.common.stock-count');
  });
});

describe('illustrated action presentation', () => {
  it('keeps observation and shopping distinct and uses native sales units', () => {
    const state = createGame({ gender: 'boy', children: 1 });
    expect(groupOffers(getActions(state, 'shop')).map(group => group.kind)).toEqual(['observe', 'choose']);
    expect(salesUnitText('apple', 'zh')).toBe('按个卖');
    expect(salesUnitText('juice', 'zh')).toBe('按杯卖');
    expect(actionTitle(getActions(state, 'shop').find(o => o.id === 'read-tags')!, 'zh')).toBe('看价签');
  });
  it('pairs each optional market offer with its own price and terms, with a noncommitting selection', () => {
    const state = createChildhood('market', { gender: 'boy', children: 1 });
    const before = JSON.stringify(state);
    const html = childhoodConversation(state, 'zh', undefined, true, 'fruit-fresh', false, 'fruit-fresh');
    expect(html).toContain('data-childhood-select="fruit-fresh"');
    expect(html).toContain('id="confirm-childhood-choice" data-childhood-action="fruit-fresh"');
    expect(html).toContain('story-option-terms');
    expect(html).not.toContain('data-childhood-quote=');
    expect(html).not.toContain('childhood-ledger');
    expect(childhoodConversation(state, 'zh', undefined, true, 'fruit-fresh')).not.toContain('id="confirm-childhood-choice"');
    expect(JSON.stringify(state)).toBe(before);
  });
  for (const story of ['market', 'insurance', 'travel'] as const) {
    it(`preserves common cash and reserve quotes outside the ${story} alternatives`, () => {
      const state = createChildhood(story, { gender: 'girl', children: 1 });
      const html = childhoodConversation(state, 'zh');
      expect(html).toContain('story-current-terms');
      for (const quote of childhoodView(state).quotes.slice(-2)) expect(html).toContain(quote.label.zh);
    });
  }
});
