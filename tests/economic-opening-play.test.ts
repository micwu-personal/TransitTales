import { describe, expect, it } from 'vitest';
import { act, advance, createGame, getActions, getProgress, netWorth, type GameState, type Result, type Text } from '../src/economic/model';
import { loadGame, saveGame, SAVE_KEY } from '../src/economic/storage';
import {
  GOODS, basketTotal, collectOpening, counterPieces, deliverOpening, emptyOpening,
  moveBasket, movePacket, openingBudget, packetsReady, payOpening, pursePieces,
  selectedTotal, togglePiece, type Good, type OpeningDraft,
} from '../src/economic/opening-play';

const EMPTY: Text = { zh: '请先装入商品。', en: 'Put goods in the basket first.' };
const BUDGET: Text = { zh: '请给必需品留够钱。', en: 'Keep enough money for necessities.' };
const EXACT: Text = { zh: '请选择正好的付款。', en: 'Select the exact tender.' };
const WRONG: Text = { zh: '请重新数找零。', en: 'Count the change again.' };
const INCOMPLETE: Text = { zh: '请装好每份包裹。', en: 'Pack every delivery.' };
const MESSAGES = { empty: EMPTY, budget: BUDGET, exact: EXACT };
const SOLUTIONS = [
  ['read-tags', 'buy-apple', 'share-apples'],
  ['make-list', 'buy-apple', 'buy-bread', 'pack-lunch'],
  ['check-price', 'pay-note', 'collect-change', 'deliver-bread'],
];

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function step(state: GameState, id: string): GameState {
  const result = act(freeze(state), id);
  expect(result.ok, `${id}: ${result.message.en}`).toBe(true);
  return result.state;
}
function entry(level: number, children: 1 | 2 | 3 = 1): GameState {
  let state = createGame({ gender: 'girl', children }, 87);
  for (let i = 0; i < level; i++) state = advance(SOLUTIONS[i].reduce(step, state));
  return state;
}
function subset(pieces: number[], total: number): number[] {
  const sums = new Map<number, number[]>([[0, []]]);
  pieces.forEach((piece, index) => {
    for (const [sum, indices] of [...sums]) {
      if (sum + piece <= total && !sums.has(sum + piece)) sums.set(sum + piece, [...indices, index]);
    }
  });
  const indices = sums.get(total);
  expect(indices, `physical subset of ${pieces.join(',')} for ${total}`).toBeDefined();
  return indices!;
}
function basketDraft(state: GameState, basket: OpeningDraft['basket']): OpeningDraft {
  let draft = emptyOpening();
  for (const item of GOODS) {
    for (let i = 0; i < (basket[item] ?? 0); i++) draft = moveBasket(state, draft, item, 1);
    expect(draft.basket[item] ?? 0).toBe(basket[item] ?? 0);
  }
  return draft;
}
function tender(state: GameState, basket: OpeningDraft['basket']): OpeningDraft {
  const draft = basketDraft(state, basket);
  return { ...draft, tender: subset(pursePieces(state), state.level === 2 ? 500 : basketTotal(state, draft)) };
}
function paid(state: GameState, draft: OpeningDraft): GameState {
  const before = JSON.stringify(state), draftBefore = JSON.stringify(draft);
  const result = payOpening(freeze(state), freeze(draft), MESSAGES);
  expect(result.ok, result.message.en).toBe(true);
  expect(JSON.stringify(state)).toBe(before);
  expect(JSON.stringify(draft)).toBe(draftBefore);
  return result.state;
}
function unchanged(state: GameState, operation: () => Result, message?: Text): void {
  const before = JSON.stringify(state);
  freeze(state);
  const result = operation();
  expect(result.ok).toBe(false);
  expect(result.state).toBe(state);
  expect(JSON.stringify(state)).toBe(before);
  if (message) expect(result.message).toEqual(message);
}
function pack(state: GameState): OpeningDraft {
  let draft = emptyOpening();
  const count = state.level === 2 ? 1 : state.family.children;
  const goods: Good[] = state.level === 0 ? ['apple'] : state.level === 1 ? ['apple', 'bread'] : ['bread'];
  for (let child = 0; child < count; child++) for (const good of goods) draft = movePacket(state, draft, good, child);
  return draft;
}
function ledgerMatches(state: GameState): void {
  for (const key of ['cash', 'savings', 'debt', 'digital'] as const) {
    expect(state.ledger.reduce((sum, row) => sum + (row[key] ?? 0), 0)).toBe(state[key]);
  }
}

describe('opening drafts and physical money', () => {
  it('creates independent empty drafts with all three goods', () => {
    expect(GOODS).toEqual(['apple', 'bread', 'toy']);
    const first = emptyOpening(), second = emptyOpening();
    expect(first).toEqual({ basket: {}, tender: [], change: [], plan: [], packets: [] });
    first.basket.apple = 1;
    first.tender.push(0);
    first.change.push(1);
    first.plan.push('apple');
    first.packets.push(['apple']);
    expect(second).toEqual({ basket: {}, tender: [], change: [], plan: [], packets: [] });
  });

  it('adds and retracts a mixed basket without losing other draft fields', () => {
    const state = freeze(entry(1, 3));
    const original = freeze({ ...emptyOpening(), tender: [0], change: [1], plan: ['apple'] as Good[], packets: [['bread']] as Good[][] });
    let draft = moveBasket(state, original, 'apple', 1);
    draft = moveBasket(state, draft, 'bread', 1);
    draft = moveBasket(state, draft, 'toy', 1);
    expect(draft.basket).toEqual({ apple: 1, bread: 1, toy: 1 });
    expect(basketTotal(state, draft)).toBe(400);
    expect(draft.tender).toEqual([]);
    expect(draft.change).toBe(original.change);
    expect(draft.plan).toBe(original.plan);
    expect(draft.packets).toBe(original.packets);
    draft = moveBasket(state, draft, 'toy', -1);
    draft = moveBasket(state, draft, 'bread', -1);
    draft = moveBasket(state, draft, 'apple', -1);
    expect(basketTotal(state, draft)).toBe(0);
    expect(original.basket).toEqual({});
    expect(original.tender).toEqual([0]);
  });

  it('drafting leaves the whole game, checkpoint and persisted save unchanged', () => {
    const state = freeze(entry(1, 3)), checkpoint = state;
    const data = new Map<string, string>();
    const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(saveGame(store, { state, checkpoint, lang: 'en' })).toBe(true);
    const before = JSON.stringify(state), saved = store.getItem(SAVE_KEY);
    let draft = moveBasket(state, emptyOpening(), 'apple', 1);
    draft = moveBasket(state, draft, 'bread', 1);
    draft = { ...draft, tender: togglePiece(draft.tender, 0, pursePieces(state)) };
    draft = moveBasket(state, draft, 'bread', -1);
    draft = movePacket(state, draft, 'apple', 0);
    openingBudget(state); basketTotal(state, draft); packetsReady(state, draft); counterPieces(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(checkpoint).toBe(state);
    expect(store.getItem(SAVE_KEY)).toBe(saved);
    expect(loadGame(store)).toEqual({ state, checkpoint, lang: 'en' });
    expect(state).not.toHaveProperty('basket');
    expect(state).not.toHaveProperty('tender');
    expect(state).not.toHaveProperty('packets');
  });

  for (const children of [1, 2, 3] as const) {
    it(`uses the family budget and available purse for ${children} child(ren)`, () => {
      for (const level of [0, 1, 2]) {
        const state = freeze(entry(level, children));
        expect(openingBudget(state)).toBe(children * (level === 0 ? 100 : 250));
        const pieces = pursePieces(state);
        expect(pieces.reduce((sum, value) => sum + value, 0)).toBe(level === 2 ? 500 : openingBudget(state));
        expect(pieces).toEqual([...pieces].sort((a, b) => b - a));
        if (level < 2) expect(pieces.filter(value => value === 10).length).toBeGreaterThanOrEqual(10);
      }
    });
  }

  it('caps purse pieces at remaining budget or cash and exposes a note only when affordable', () => {
    const state = entry(1, 3);
    expect(pursePieces({ ...state, cash: 87 }).reduce((sum, value) => sum + value, 0)).toBe(87);
    expect(pursePieces({ ...state, flags: { ...state.flags, spent: 670 } })).toEqual([50, 10, 10, 10]);
    expect(pursePieces({ ...state, flags: { ...state.flags, spent: 751 } })).toEqual([]);
    expect(pursePieces({ ...state, cash: 0 })).toEqual([]);
    expect(pursePieces({ ...entry(2), cash: 499 })).toEqual([]);
    expect(pursePieces({ ...entry(2), cash: 500 })).toEqual([500]);
  });

  it('selects distinct physical indices even when denominations repeat', () => {
    const pieces = freeze([100, 100, 100, 50, 10, 10, 10, 10, 10]);
    let indices: number[] = [];
    for (const index of [0, 1, 2, 4, 5, 6]) indices = togglePiece(freeze(indices), index, pieces);
    expect(selectedTotal(pieces, indices)).toBe(330);
    const retracted = togglePiece(freeze(indices), 1, pieces);
    expect(retracted).toEqual([0, 2, 4, 5, 6]);
    expect(selectedTotal(pieces, retracted)).toBe(230);
    expect(selectedTotal(pieces, [0, 0, 1, -1, 99, 0.5, NaN])).toBe(200);
    expect(selectedTotal([], [0])).toBe(0);
    expect(selectedTotal(pieces, [])).toBe(0);
  });

  it.each([-1, 9, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('ignores invalid piece index %s without allocating a selection', index => {
    const indices = freeze([0]);
    expect(togglePiece(indices, index, [100, 100])).toBe(indices);
  });

  it('enforces remaining stock, family quantities, valid goods and reversible lower bounds', () => {
    const state = freeze(entry(0, 2)), empty = freeze(emptyOpening());
    expect(moveBasket(state, empty, 'apple', -1)).toBe(empty);
    expect(moveBasket(state, empty, 'bread', 1)).toBe(empty);
    expect(moveBasket(state, empty, 'unknown' as Good, 1)).toBe(empty);
    let draft = moveBasket(state, empty, 'apple', 1);
    draft = freeze(moveBasket(state, draft, 'apple', 1));
    expect(moveBasket(state, draft, 'apple', 1)).toBe(draft);
    const toy = freeze(moveBasket(state, empty, 'toy', 1));
    expect(moveBasket(state, toy, 'toy', 1)).toBe(toy);
    const partial = paid(state, tender(state, { apple: 1 }));
    const lastApple = freeze(moveBasket(partial, emptyOpening(), 'apple', 1));
    expect(moveBasket(partial, lastApple, 'apple', 1)).toBe(lastApple);
    const bread = freeze(moveBasket(entry(2, 3), emptyOpening(), 'bread', 1));
    expect(moveBasket(entry(2, 3), bread, 'bread', 1)).toBe(bread);
  });
});

describe('exact opening payments and atomic rejection', () => {
  for (const children of [1, 2, 3] as const) {
    it(`purchases and delivers the first three missions for ${children} child(ren)`, () => {
      let state = createGame({ gender: 'boy', children });
      const initialCash = state.cash;
      for (const level of [0, 1, 2]) {
        expect(state.level).toBe(level);
        expect(advance(state)).toBe(state);
        const checkpoint = state;
        if (level === 1) state = step(state, 'make-list');
        const basket = level === 0 ? { apple: children } : level === 1 ? { apple: children, bread: children } : { bread: 1 };
        const draft = tender(state, basket);
        state = paid(state, draft);
        expect(state.completed).toBe(false);
        expect(state.cash).toBe(checkpoint.cash - (level === 2 ? 500 : level === 0 ? 80 * children : 200 * children));
        expect(getProgress(state).current).toBeLessThan(getProgress(state).total);
        if (level === 2) {
          const result = collectOpening(freeze(state), { ...emptyOpening(), change: subset(counterPieces(state), 380) }, WRONG);
          expect(result.ok).toBe(true);
          state = result.state;
          expect(state.cash).toBe(checkpoint.cash - 120);
        }
        const delivery = pack(state), before = JSON.stringify(state);
        expect(packetsReady(state, delivery)).toBe(true);
        const result = deliverOpening(freeze(state), freeze(delivery), INCOMPLETE);
        expect(result.ok, result.message.en).toBe(true);
        expect(JSON.stringify(state)).toBe(before);
        state = result.state;
        expect(state.completed).toBe(true);
        expect(state.inventory.apple ?? 0).toBe(0);
        expect(state.inventory.bread ?? 0).toBe(0);
        expect(getProgress(state).current).toBe(getProgress(state).total);
        ledgerMatches(state);
        unchanged(state, () => payOpening(state, draft, MESSAGES));
        unchanged(state, () => deliverOpening(state, delivery, INCOMPLETE));
        state = advance(state);
      }
      expect(state.level).toBe(3);
      expect(state.cash).toBe(initialCash - children * 280 - 120);
      expect(state.rewards).toEqual(['pocket-badge']);
    });
  }

  it('supports genuine mixed partial baskets and successive exact payments', () => {
    let state = step(entry(1, 3), 'make-list');
    const startCash = state.cash, startLedger = state.ledger.length;
    state = paid(state, tender(state, { apple: 1, bread: 2 }));
    expect(state.cash).toBe(startCash - 320);
    expect(state.inventory).toMatchObject({ apple: 1, bread: 2 });
    expect(state.flags).toMatchObject({ bought_apple: 1, bought_bread: 2, spent: 320 });
    unchanged(state, () => deliverOpening(state, pack(state), INCOMPLETE), INCOMPLETE);
    state = paid(state, tender(state, { apple: 2, bread: 1 }));
    expect(state.cash).toBe(startCash - 600);
    expect(state.ledger).toHaveLength(startLedger + 4);
    expect(state.ledger.slice(startLedger).map(row => row.cash)).toEqual([-80, -240, -160, -120]);
    expect(packetsReady(state, pack(state))).toBe(true);
    ledgerMatches(state);
  });

  it('accepts a cash-affordable partial purchase without spending the whole family budget', () => {
    const state = { ...entry(0, 3), cash: 100 };
    const next = paid(state, tender(state, { apple: 1 }));
    expect(next.cash).toBe(20);
    expect(next.flags.spent).toBe(80);
    expect(next.inventory.apple).toBe(1);
    expect(next.completed).toBe(false);
  });

  it('allows optional price preparation exactly once as part of the transaction', () => {
    for (const level of [0, 2]) {
      const fresh = entry(level);
      const basket = level === 0 ? { apple: 1 } : { bread: 1 };
      const automatic = paid(fresh, tender(fresh, basket));
      const prepared = step(fresh, level === 0 ? 'read-tags' : 'check-price');
      const explicit = paid(prepared, tender(prepared, basket));
      expect(automatic).toEqual(explicit);
      expect(automatic.flags.tags).toBe(1);
      expect(automatic.ledger).toHaveLength(fresh.ledger.length + 1);
    }
  });

  it('requires level-one shopping-list preparation and rolls back an unprepared purchase', () => {
    const state = entry(1, 2), draft = tender(state, { apple: 1, bread: 1 });
    unchanged(state, () => payOpening(state, draft, MESSAGES));
    const prepared = step(state, 'make-list');
    expect(paid(prepared, tender(prepared, { apple: 1, bread: 1 })).flags.spent).toBe(200);
  });

  it.each([0, 1, 2])('rejects an empty or zero basket at level %s with supplied copy', level => {
    const state = entry(level);
    const prepared = basketDraft(state, level === 0 ? { apple: 1 } : { bread: 1 });
    for (const basket of [{}, level === 0 ? { apple: 0 } : { bread: 0 }]) {
      unchanged(state, () => payOpening(state, { ...prepared, basket }, MESSAGES), EMPTY);
    }
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid basket quantity %s atomically', quantity => {
    const state = entry(0, 3);
    unchanged(state, () => payOpening(state, { ...emptyOpening(), basket: { apple: quantity }, tender: [0] }, MESSAGES));
    expect(state.flags.tags).toBeUndefined();
  });

  it('rejects unpriced goods and invalid extra keys even when another item is valid', () => {
    const state = entry(0, 3);
    for (const basket of [{ bread: 1 }, { apple: 1, unknown: 0 }, { apple: 1, toy: -1 }]) {
      unchanged(state, () => payOpening(state, { ...emptyOpening(), basket, tender: [0] }, MESSAGES));
    }
  });

  it('requires an exact physical subset, rejecting empty, short, excessive and stale tender', () => {
    const state = entry(0), draft = tender(state, { apple: 1 });
    expect(selectedTotal(pursePieces(state), draft.tender)).toBe(80);
    for (const indices of [[], draft.tender.slice(1), [...draft.tender, 8], [100], [-1], [0, 0]]) {
      unchanged(state, () => payOpening(state, { ...draft, tender: indices }, MESSAGES), EXACT);
    }
    expect(paid(state, { ...draft, tender: [...draft.tender, draft.tender[0]] }).cash).toBe(state.cash - 80);
  });

  it('rejects an affordable toy that would leave the required apples unfunded', () => {
    const state = entry(0, 3), draft = tender(state, { toy: 1 });
    expect(basketTotal(state, draft)).toBe(180);
    expect(basketTotal(state, draft)).toBeLessThan(openingBudget(state));
    unchanged(state, () => payOpening(state, draft, MESSAGES), BUDGET);
    expect(state.flags.tags).toBeUndefined();
  });

  it('rejects a mixed toy basket and reserves unfinished lunch purchases after partial payment', () => {
    let state = step(entry(1, 3), 'make-list');
    unchanged(state, () => payOpening(state, tender(state, { apple: 1, bread: 1, toy: 1 }), MESSAGES), BUDGET);
    state = paid(state, tender(state, { apple: 1, bread: 1 }));
    unchanged(state, () => payOpening(state, tender(state, { toy: 1 }), MESSAGES), BUDGET);
    expect(state.flags.spent).toBe(200);
  });

  it('rejects an over-budget basket rather than charging unrelated pocket money', () => {
    const state = step(entry(1), 'make-list');
    expect(state.cash).toBeGreaterThan(400);
    const draft = { ...basketDraft(state, { apple: 1, bread: 1, toy: 1 }), tender: pursePieces(state).map((_, i) => i) };
    unchanged(state, () => payOpening(state, draft, MESSAGES), EXACT);
  });

  it('atomically rolls back an earlier item when a later purchase exceeds stock', () => {
    const state = step(entry(1, 3), 'make-list');
    const draft = { ...basketDraft(state, { apple: 1, bread: 3 }), basket: { apple: 1, bread: 4 }, tender: subset(pursePieces(state), 560) };
    expect(selectedTotal(pursePieces(state), draft.tender)).toBe(560);
    unchanged(state, () => payOpening(state, draft, MESSAGES));
    expect(state.inventory.apple ?? 0).toBe(0);
    expect(state.flags.spent).toBeUndefined();
  });

  it('does not charge twice for a fully bought basket with stale tender', () => {
    const state = entry(0), draft = tender(state, { apple: 1 }), next = paid(state, draft);
    unchanged(next, () => payOpening(next, draft, MESSAGES));
    expect(next.cash).toBe(state.cash - 80);
    expect(next.ledger).toHaveLength(state.ledger.length + 1);
  });

  it('rejects an otherwise valid literal payment without a transaction origin', () => {
    const state = entry(0), valid = tender(state, { apple: 1 });
    const literal = { ...emptyOpening(), basket: valid.basket, tender: valid.tender };
    unchanged(state, () => payOpening(state, literal, MESSAGES));
  });

  it('rejects a draft when cash changes after selecting exact tender', () => {
    const state = entry(0), draft = tender(state, { apple: 1 });
    const changed = { ...state, cash: state.cash - 10 };
    expect(selectedTotal(pursePieces(changed), draft.tender)).toBe(80);
    unchanged(changed, () => payOpening(changed, draft, MESSAGES));
  });

  it('does not replay the same partial payment draft twice', () => {
    const state = step(entry(1, 2), 'make-list');
    const draft = tender(state, { apple: 1 });
    const next = paid(state, draft);
    expect(selectedTotal(pursePieces(next), draft.tender)).toBe(80);
    unchanged(next, () => payOpening(next, draft, MESSAGES));
  });
});

describe('five-yuan tender and recoverable change', () => {
  it('hands over 500, adds one bread and preserves pending change as wealth', () => {
    const state = entry(2, 3), next = paid(state, tender(state, { bread: 1 }));
    expect(next.cash).toBe(state.cash - 500);
    expect(next.inventory.bread).toBe(1);
    expect(next.flags).toMatchObject({ tags: 1, paid: 1, pendingChange: 380 });
    expect(next.flags.change).toBeUndefined();
    expect(netWorth(next)).toBe(netWorth(state) - 120);
    expect(next.ledger.slice(state.ledger.length).map(row => row.cash)).toEqual([-500]);
    unchanged(next, () => payOpening(next, tender(state, { bread: 1 }), MESSAGES));
    unchanged(next, () => deliverOpening(next, pack(next), INCOMPLETE));
    ledgerMatches(next);
  });

  it('rejects wrong tender, insufficient cash and invalid bread quantities without preparing or paying', () => {
    const state = entry(2), draft = tender(state, { bread: 1 });
    for (const indices of [[], [1], [-1]]) {
      unchanged(state, () => payOpening(state, { ...draft, tender: indices }, MESSAGES), EXACT);
    }
    unchanged(state, () => payOpening(state, { ...draft, basket: { bread: 2 } }, MESSAGES));
    expect(state.flags.tags).toBeUndefined();
    const poor = { ...state, cash: 499 };
    unchanged(poor, () => payOpening(poor, { ...basketDraft(poor, { bread: 1 }), tender: [0] }, MESSAGES), EXACT);
  });

  it('offers exact change pieces only for a pending 380 or 80', () => {
    const state = entry(2);
    expect(counterPieces(state)).toEqual([]);
    const full = counterPieces({ ...state, flags: { ...state.flags, pendingChange: 380 } });
    const rest = counterPieces({ ...state, flags: { ...state.flags, pendingChange: 80 } });
    expect(full).toEqual([100, 100, 100, 50, 10, 10, 10, 10, 10]);
    expect(rest).toEqual([50, 10, 10, 10, 10]);
    expect(selectedTotal(full, subset(full, 380))).toBe(380);
    expect(selectedTotal(rest, subset(rest, 80))).toBe(80);
    expect(counterPieces({ ...state, flags: { ...state.flags, pendingChange: 120 } })).toEqual([]);
  });

  it('wrong, extra and short change selections preserve all economics and pending money', () => {
    const state = paid(entry(2), tender(entry(2), { bread: 1 }));
    const pieces = counterPieces(state);
    const selections = [[], ...[100, 250, 310, 370].map(total => subset(pieces, total)), [99], [0, 0, 1]];
    const all = pieces.map((_, i) => i);
    if (selectedTotal(pieces, all) > 380) selections.push(all);
    for (const change of selections) unchanged(state, () => collectOpening(state, { ...emptyOpening(), change }, WRONG), WRONG);
    expect(state.flags.pendingChange).toBe(380);
    const partial = collectOpening(state, { ...emptyOpening(), change: [0, 1, 2] }, WRONG).state;
    for (const change of [[], [0], [0, 1, 2], [1, 2], [0, 0]]) {
      unchanged(partial, () => collectOpening(partial, { ...emptyOpening(), change }, WRONG), WRONG);
    }
    expect(partial.flags.pendingChange).toBe(80);
  });

  it('collects 300 then the recoverable 80 without paying again or inventing a reward', () => {
    const original = entry(2, 2), state = paid(original, tender(original, { bread: 1 }));
    const first = collectOpening(freeze(state), freeze({ ...emptyOpening(), change: [0, 1, 2] }), WRONG);
    expect(first.ok).toBe(true);
    const partial = first.state;
    expect(partial.cash).toBe(original.cash - 200);
    expect(partial.flags.pendingChange).toBe(80);
    expect(partial.flags.change).toBeUndefined();
    expect(netWorth(partial)).toBe(netWorth(state));
    unchanged(partial, () => deliverOpening(partial, pack(partial), INCOMPLETE));
    const restDraft = { ...emptyOpening(), change: subset(counterPieces(partial), 80) };
    const rest = collectOpening(freeze(partial), freeze(restDraft), WRONG);
    expect(rest.ok).toBe(true);
    expect(rest.state.cash).toBe(original.cash - 120);
    expect(rest.state.flags).toMatchObject({ pendingChange: 0, change: 1 });
    expect(rest.state.inventory.bread).toBe(1);
    expect(rest.state.rewards).toEqual(original.rewards);
    expect(rest.state.ledger.slice(original.ledger.length).map(row => row.cash)).toEqual([-500, 300, 80]);
    expect(netWorth(rest.state)).toBe(netWorth(state));
    unchanged(rest.state, () => collectOpening(rest.state, restDraft, WRONG), WRONG);
    ledgerMatches(rest.state);
  });

  it('takes exactly 380 using distinct repeated coin indices', () => {
    const original = entry(2), state = paid(original, tender(original, { bread: 1 }));
    const change = subset(counterPieces(state), 380);
    expect(selectedTotal(counterPieces(state), change)).toBe(380);
    const draft = freeze({ ...emptyOpening(), change: [...change, 0, 4] });
    const before = JSON.stringify(state);
    const result = collectOpening(freeze(state), draft, WRONG);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.state.cash).toBe(original.cash - 120);
    expect(result.state.flags).toMatchObject({ pendingChange: 0, change: 1 });
    expect(result.state.ledger.slice(original.ledger.length).map(row => row.cash)).toEqual([-500, 380]);
    unchanged(result.state, () => collectOpening(result.state, draft, WRONG), WRONG);
    ledgerMatches(result.state);
  });
});

describe('packing, delivery and stale calls', () => {
  it('retracts packets, prevents duplicates and never allocates unowned goods', () => {
    const state = paid(entry(0, 3), tender(entry(0, 3), { apple: 1 }));
    const draft = freeze(movePacket(state, emptyOpening(), 'apple', 0));
    expect(draft.packets).toEqual([['apple'], [], []]);
    expect(movePacket(state, draft, 'apple', 0)).toBe(draft);
    expect(movePacket(state, draft, 'apple', 1)).toBe(draft);
    expect(movePacket(state, draft, 'toy', 0)).toBe(draft);
    expect(movePacket(state, draft, 'bread', 0)).toBe(draft);
    expect(movePacket(state, draft, 'apple', 1, true)).toBe(draft);
    const retracted = freeze(movePacket(state, draft, 'apple', 0, true));
    expect(retracted.packets).toEqual([[], [], []]);
    expect(draft.packets).toEqual([['apple'], [], []]);
    const transferred = movePacket(state, retracted, 'apple', 2);
    expect(transferred.packets).toEqual([[], [], ['apple']]);
    expect(packetsReady(state, transferred)).toBe(false);
  });

  it.each([-1, 3, 0.5, NaN, Infinity])('rejects invalid recipient %s without changing the draft', child => {
    const state = entry(0, 3), draft = freeze(emptyOpening());
    expect(movePacket(state, draft, 'apple', child)).toBe(draft);
    expect(movePacket(state, draft, 'apple', child, true)).toBe(draft);
  });

  it('requires exactly the family-dependent recipients but only one classmate for bread', () => {
    for (const children of [1, 2, 3] as const) {
      for (const level of [0, 1, 2]) {
        const state = { ...entry(level, children), inventory: { apple: children, bread: children } };
        const draft = pack(state);
        expect(draft.packets).toHaveLength(level === 2 ? 1 : children);
        expect(packetsReady(state, draft)).toBe(true);
        expect(packetsReady(state, { ...draft, packets: draft.packets.slice(1) })).toBe(false);
        expect(packetsReady(state, { ...draft, packets: [...draft.packets, draft.packets[0]] })).toBe(false);
        if (level === 2) expect(movePacket(state, draft, 'bread', 1)).toBe(draft);
      }
    }
  });

  it('rejects malformed packets, missing items, extra goods and inventory over-allocation', () => {
    const state = { ...entry(1, 2), inventory: { apple: 2, bread: 2 } };
    const packets: Good[][][] = [[], [['apple', 'bread']], [['apple'], ['apple', 'bread']], [['apple', 'apple'], ['apple', 'bread']], [['apple', 'bread', 'toy'], ['apple', 'bread']]];
    for (const value of packets) {
      const draft = { ...emptyOpening(), packets: value };
      expect(packetsReady(state, draft)).toBe(false);
      unchanged(state, () => deliverOpening(state, draft, INCOMPLETE), INCOMPLETE);
    }
    const short = { ...state, inventory: { apple: 1, bread: 2 } };
    expect(packetsReady(short, { ...emptyOpening(), packets: [['apple', 'bread'], ['apple', 'bread']] })).toBe(false);
  });

  it('does not finish with inventory alone when the legacy purchase prerequisites are absent', () => {
    const state = { ...entry(0), inventory: { apple: 1 } }, draft = pack(state);
    expect(packetsReady(state, draft)).toBe(true);
    unchanged(state, () => deliverOpening(state, draft, INCOMPLETE));
  });

  it('rejects stale stock, stale recipient counts and cross-level goods', () => {
    const state = entry(0), draft = tender(state, { apple: 1 });
    const next = paid(state, draft);
    unchanged(next, () => payOpening(next, draft, MESSAGES));
    const stalePackets = pack(next);
    const largerFamily = { ...next, family: { ...next.family, children: 2 as const } };
    unchanged(largerFamily, () => deliverOpening(largerFamily, stalePackets, INCOMPLETE), INCOMPLETE);
    const levelTwo = entry(2);
    unchanged(levelTwo, () => payOpening(levelTwo, draft, MESSAGES));
    unchanged(levelTwo, () => deliverOpening(levelTwo, stalePackets, INCOMPLETE), INCOMPLETE);
    const firstLevel = entry(0);
    unchanged(firstLevel, () => collectOpening(firstLevel, { ...emptyOpening(), change: [0] }, WRONG));
  });

  it('does not run opening actions on completed or later legacy levels', () => {
    const finished = SOLUTIONS[2].reduce(step, entry(2));
    const later = advance(finished);
    for (const state of [finished, later]) {
      unchanged(state, () => payOpening(state, { ...emptyOpening(), basket: { bread: 1 }, tender: [0] }, MESSAGES));
      unchanged(state, () => collectOpening(state, { ...emptyOpening(), change: [0, 1, 2] }, WRONG));
      unchanged(state, () => deliverOpening(state, emptyOpening(), INCOMPLETE), INCOMPLETE);
    }
  });

  it('leaves unrelated legacy chores, one-time wages and level advancement unaffected', () => {
    const state = entry(3, 2), before = JSON.stringify(state), offers = getActions(state, 'home');
    unchanged(state, () => payOpening(state, emptyOpening(), MESSAGES));
    unchanged(state, () => collectOpening(state, emptyOpening(), WRONG));
    unchanged(state, () => deliverOpening(state, emptyOpening(), INCOMPLETE));
    expect(getActions(state, 'home')).toEqual(offers);
    expect(JSON.stringify(state)).toBe(before);
    let next = ['assign-chores', 'sort-socks', 'sweep-room', 'collect-pay'].reduce(step, state);
    expect(next.cash).toBe(state.cash + 600);
    unchanged(next, () => act(next, 'collect-pay'));
    next = step(next, 'show-room');
    expect(next.completed).toBe(true);
    expect(advance(next).level).toBe(4);
    ledgerMatches(next);
  });
});
