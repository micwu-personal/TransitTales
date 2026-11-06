import { describe, expect, it } from 'vitest';
import { act, advance, createGame, getActions, getLevel, getPrices, getProgress, getWeather, LEVELS, LEVEL_COUNT, netWorth, type Family, type GameState, type Place } from '../src/economic/model';
import { loadGame, saveGame, SAVE_KEY, type Save } from '../src/economic/storage';

export const SOLUTIONS: string[][] = [
  ['read-tags', 'buy-apple', 'share-apples'],
  ['make-list', 'buy-apple', 'buy-bread', 'pack-lunch'],
  ['check-price', 'pay-note', 'collect-change', 'deliver-bread'],
  ['assign-chores', 'sort-socks', 'sweep-room', 'collect-pay', 'show-room'],
  ['allowance', 'reserve-two', 'seal-reserve', 'buy-book', 'check-jars'],
  ['receive-gift', 'gift-plan', 'buy-gift', 'give-present'],
  ['observe-shelf', 'wait-delivery', 'unload-truck', 'buy-apple', 'share-apples'],
  ['compare-stalls', 'wait-crowd', 'check-quiet-price', 'buy-juice', 'deliver-juice'],
  ['read-forecast', 'buy-umbrella', 'wait-weather', 'pack-weather'],
  ['compare-bread', 'buy-markdown', 'serve-bread'],
  ['sort-stickers', 'offer-swap', 'accept-swap', 'buy-apple', 'share-swap-snack'],
  ['change-coins', 'parent-wallet', 'load-wallet', 'pay-digital', 'cash-out-wallet'],
  ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-due', 'repay', 'close-loan'],
  ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-due', 'repay', 'close-loan'],
  ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-due', 'repay', 'close-loan'],
  ['parent-bank', 'deposit', 'wait-bank', 'wait-bank', 'withdraw', 'buy-bank-paper', 'check-bank'],
  ['allowance', 'parent-bank', 'deposit', 'buy-book', 'wait-bank', 'keep-picnic-savings'],
  ['assign-picnic', 'picnic-work', 'parent-bank', 'withdraw', 'buy-apple', 'buy-bread', 'buy-juice', 'start-picnic'],
  ['travel-envelope', 'plan-trip', 'book-tickets', 'book-room', 'seal-trip-budget'],
  ['read-exchange', 'exchange-shells', 'pay-bus-qr', 'ride-island-bus'],
  ['compare-fx-prices', 'buy-foreign-souvenir', 'pack-souvenirs'],
  ['read-customs', 'declare-gifts', 'pay-customs', 'customs-stamp'],
  ['parent-card-terms', 'pay-parent-card', 'fly-home', 'review-card-bill'],
  ['read-home-bill', 'exchange-home', 'settle-parent-card', 'finish-travel'],
];
const places: Place[] = ['home', 'shop', 'school', 'bank', 'park'];
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
function step(s: GameState, id: string): GameState {
  const before = JSON.stringify(s);
  const offer = places.flatMap(p => getActions(s, p)).find(a => a.id === id);
  expect(offer, `level ${s.level}: action ${id} exposed`).toBeDefined();
  expect(offer?.disabled, `level ${s.level}: action ${id} enabled`).toBeUndefined();
  const result = act(freeze(s), id);
  expect(result.ok, `level ${s.level}: ${id}: ${result.message.en}`).toBe(true);
  expect(JSON.stringify(s)).toBe(before);
  expect(result.state.cash).toBeGreaterThanOrEqual(0);
  expect(result.state.savings).toBeGreaterThanOrEqual(0);
  expect(result.state.debt).toBeGreaterThanOrEqual(0);
  return result.state;
}
function run(s: GameState, ids: string[]): GameState { return ids.reduce(step, s); }
function entry(level: number, children: 1 | 2 | 3 = 1, seed = 2026): GameState {
  let s = createGame({ gender: 'girl', children }, seed);
  for (let i = 0; i < level; i++) s = advance(run(s, SOLUTIONS[i]));
  return s;
}
function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
function ledgerMatches(s: GameState) {
  for (const key of ['cash', 'savings', 'debt', 'digital'] as const) expect(s.ledger.reduce((sum, e) => sum + (e[key] ?? 0), 0)).toBe(s[key]);
}

describe('continuous childhood economy campaign', () => {
  it('has 24 coherent multi-step missions, four chapters and childhood-only ages', () => {
    expect(LEVEL_COUNT).toBe(24);
    expect(SOLUTIONS).toHaveLength(LEVEL_COUNT);
    expect(LEVELS).toHaveLength(LEVEL_COUNT);
    expect(new Set(LEVELS.map(l => l.id)).size).toBe(LEVEL_COUNT);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      expect(LEVELS[i].chapter).toBe(1 + Math.floor(i / 6));
      expect(LEVELS[i].age).toBeLessThanOrEqual(12);
      expect(SOLUTIONS[i].length).toBeGreaterThan(2);
      expect(LEVELS[i].intro.zh.length).toBeGreaterThan(15);
    }
  });
  for (const gender of ['boy', 'girl'] as const) for (const children of [1, 2, 3] as const) {
    it(`solves all 24 levels for ${gender}, ${children} children, with mid-action saves`, () => {
      let s = createGame({ gender, children }, 87);
      const store = memory();
      for (let i = 0; i < LEVEL_COUNT; i++) {
        const checkpoint = s;
        expect(getLevel(s)).toBe(LEVELS[i]);
        expect(advance(s)).toBe(s);
        expect(getProgress(s).current).toBeLessThan(getProgress(s).total);
        for (const id of SOLUTIONS[i]) {
          s = step(s, id);
          ledgerMatches(s);
          expect(Number.isInteger(netWorth(s))).toBe(true);
          expect(saveGame(store, { state: s, checkpoint, lang: 'zh' }), `save level ${i} after ${id}`).toBe(true);
          const restored = loadGame(store);
          expect(restored, `load level ${i} after ${id}`).toEqual({ state: s, checkpoint, lang: 'zh' });
          s = restored!.state;
        }
        expect(s.completed).toBe(true);
        expect(getProgress(s).current).toBe(getProgress(s).total);
        expect(act(s, SOLUTIONS[i][0])).toMatchObject({ state: s, ok: false });
        const next = advance(s);
        if (i < LEVEL_COUNT - 1) {
          expect(next.level).toBe(i + 1);
          expect(next.cash).toBe(s.cash);
          expect(next.debt).toBe(s.debt);
          expect(next.flags).not.toHaveProperty(SOLUTIONS[i][0]);
          expect(next.rewards).toEqual(s.rewards);
        } else {expect(next.level).toBe(24);expect(next.life?.age).toBe(13);expect(next.cash).toBe(s.cash);}
        s = next;
      }
      expect(s.level).toBe(24);
      expect(s.debt).toBe(0);
      expect(s.digital).toBe(0);
      expect(s.flags.foreignCash).toBe(0);
      expect(s.flags.foreignDebt).toBe(0);
      expect(s.rewards).toHaveLength(8);
      expect(s.inventory['foreign-souvenir']).toBe(children);
    });
  }
  it('also completes a larger-family recovery route without resetting finances between levels', () => {
    let s = createGame({ gender: 'girl', children: 3 }, 1);
    const variants: Record<number, string[]> = {
      2: ['check-price', 'pay-note', 'leave-change', 'collect-rest', 'deliver-bread'],
      5: ['receive-gift', 'gift-plan', 'buy-plush', 'return-plush', 'buy-gift', 'give-present'],
      6: ['observe-shelf', 'buy-apple', 'share-apples'],
      7: ['compare-stalls', 'buy-park-juice', 'deliver-juice'],
      8: ['read-forecast', 'wait-weather', 'buy-coat', 'pack-weather'],
      9: ['compare-bread', 'buy-markdown', 'leave-bread', 'buy-fresh', 'serve-bread'],
      13: ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-late', 'repay', 'repair-trust', 'close-loan'],
      14: ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-late', 'repay', 'repair-trust', 'close-loan'],
      15: ['parent-bank', 'deposit', 'wait-bank', 'withdraw', 'deposit', 'wait-bank', 'wait-bank', 'withdraw', 'buy-bank-paper', 'check-bank'],
      20: ['compare-fx-prices', 'order-home-souvenir', 'pack-souvenirs'],
      21: ['read-customs', 'hide-gifts', 'correct-declaration', 'pay-customs', 'customs-stamp'],
      22: ['parent-card-terms', 'pay-sticker-qr', 'pay-parent-card', 'refund-card-snacks', 'pay-parent-card', 'fly-home', 'review-card-bill'],
      23: ['read-home-bill', 'delay-card', 'exchange-home', 'settle-parent-card', 'finish-travel'],
    };
    const store = memory();
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const checkpoint = s;
      for (const id of variants[i] ?? SOLUTIONS[i]) {
        s = step(s, id);
        expect(saveGame(store, { state: s, checkpoint, lang: 'en' }), `${i} ${id}`).toBe(true);
        expect(loadGame(store)?.state).toEqual(s);
      }
      expect(s.completed).toBe(true);
      s = advance(s);
    }
    expect(s.debt).toBe(0);
    expect(s.trust).toBe(3);
    expect(s.inventory['home-souvenir']).toBe(3);
  });
  it('family size changes consumed quantities, real bills and shared chores', () => {
    const one = run(createGame({ gender: 'boy', children: 1 }), SOLUTIONS[0]);
    const three = run(createGame({ gender: 'boy', children: 3 }), SOLUTIONS[0]);
    expect(one.cash - three.cash).toBe(160);
    expect(one.inventory.apple).toBe(0);
    expect(three.inventory.apple).toBe(0);
    expect(getActions(entry(3, 3), 'home')[0].detail.en).toContain('3 children');
    expect(getPrices(entry(18, 3))[0].stock).toBe(3);
  });
  it('unknown and disabled actions are immutable, idempotent, never progress-skipping', () => {
    const s = freeze(createGame({ gender: 'girl', children: 1 }));
    for (const id of ['buy-apple', 'continue', 'borrow', 'free-money', 'talk-moon', '__proto__']) {
      const result = act(s, id);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(s);
      expect(act(result.state, id)).toEqual(result);
    }
    const tags = step(s, 'read-tags');
    expect(act(tags, 'read-tags').state).toBe(tags);
    expect(getActions(s, 'park')[0].detail.en).toContain('shop');
    expect(act(s, 'talk-park').state).toBe(s);
    expect(getActions(s, 'moon' as Place)).toEqual([]);
    expect(act(s, undefined as unknown as string).ok).toBe(false);
  });
  it('wrong shopping decisions recover exactly by replaying the immutable checkpoint', () => {
    const checkpoint = entry(1);
    const wrong = run(checkpoint, ['make-list', 'buy-toy']);
    expect(getActions(wrong, 'shop').find(a => a.id === 'buy-bread')?.disabled).toBeDefined();
    expect(advance(wrong)).toBe(wrong);
    const correct = run(checkpoint, SOLUTIONS[1]);
    expect(correct.completed).toBe(true);
    expect(correct.cash).toBe(checkpoint.cash - 200);
  });
  it('change is the unpaid remainder, not an additional reward; short change is recoverable', () => {
    const s = entry(2);
    const paid = run(s, ['check-price', 'pay-note']);
    expect(paid.cash).toBe(s.cash - 500);
    expect(paid.flags.pendingChange).toBe(380);
    expect(netWorth(paid)).toBe(netWorth(s) - 120);
    const short = step(paid, 'leave-change');
    expect(short.cash).toBe(s.cash - 200);
    expect(short.flags.pendingChange).toBe(80);
    expect(netWorth(short)).toBe(netWorth(paid));
    const recovered = step(short, 'collect-rest');
    expect(recovered.cash).toBe(s.cash - 120);
    expect(recovered.flags.pendingChange).toBe(0);
    expect(netWorth(recovered)).toBe(netWorth(paid));
    expect(act(recovered, 'collect-rest').state).toBe(recovered);
    expect(step(recovered, 'deliver-bread').completed).toBe(true);
    const full = step(paid, 'collect-change');
    expect(full.cash).toBe(s.cash - 120);
    expect(full.flags.pendingChange).toBe(0);
    expect(netWorth(full)).toBe(netWorth(paid));
    expect(act(full, 'collect-change').state).toBe(full);
  });
  it('chores and allowances pay once; reserved allowance constrains opportunity costs', () => {
    let s = run(entry(3, 3), SOLUTIONS[3].slice(0, 4));
    expect(s.ledger.at(-1)?.cash).toBe(600);
    expect(act(s, 'collect-pay').state).toBe(s);
    s = run(entry(4), SOLUTIONS[4].slice(0, 3));
    expect(s.flags.reserve).toBe(200);
    expect(getActions(s, 'shop').find(a => a.id === 'buy-toy')?.disabled).toBeDefined();
    expect(act(s, 'allowance').state).toBe(s);
  });
  it('gift money is spendable; an unopened wrong gift refunds only its exact price once', () => {
    const s = entry(5);
    const plush = run(s, ['receive-gift', 'gift-plan', 'buy-plush']);
    expect(plush.cash).toBe(s.cash);
    expect(act(plush, 'give-present').ok).toBe(false);
    const refund = step(plush, 'return-plush');
    expect(refund.cash).toBe(s.cash + 400);
    expect(act(refund, 'return-plush').state).toBe(refund);
    const end = run(refund, ['buy-gift', 'give-present']);
    expect(end.completed).toBe(true);
    expect(end.cash).toBe(s.cash + 250);
  });
});

describe('observable market, weather, exchange and money forms', () => {
  it('restocking lowers prices before purchase; buying early is still a valid choice', () => {
    const checkpoint = entry(6, 3);
    expect(getPrices(checkpoint)[0]).toMatchObject({ price: 150, stock: 3 });
    const delivered = run(checkpoint, ['observe-shelf', 'wait-delivery', 'unload-truck']);
    expect(getPrices(delivered)[0]).toMatchObject({ price: 80, stock: 7 });
    expect(step(delivered, 'buy-apple').cash).toBe(checkpoint.cash - 240);
    const early = run(checkpoint, ['observe-shelf', 'buy-apple', 'share-apples']);
    expect(early.completed).toBe(true);
    expect(early.cash).toBe(checkpoint.cash - 450);
  });
  it('lower demand visibly changes a tag; comparison also permits another seller', () => {
    const s = entry(7);
    const quiet = run(s, ['compare-stalls', 'wait-crowd', 'check-quiet-price']);
    expect(getPrices(s)[0].price).toBe(180);
    expect(getPrices(quiet)[0].price).toBe(100);
    const park = run(s, ['compare-stalls', 'buy-park-juice', 'deliver-juice']);
    expect(park.cash).toBe(s.cash - 110);
    expect(park.completed).toBe(true);
  });
  it('seeded forecasts match observed weather and tags, never charge owned goods again', () => {
    const observed = new Set<string>();
    const otherLevel = createGame({ gender: 'girl', children: 1 });
    expect(getWeather(otherLevel)).toBe('sunny');
    expect(getWeather({ ...otherLevel, flags: { ...otherLevel.flags, weatherChanged: 1 } })).toBe('sunny');
    for (const seed of [0, 1, 2, 87, 2026]) {
      const a = entry(8, 1, seed);
      const b = entry(8, 1, seed);
      expect(a).toEqual(b);
      expect(getActions(a, 'home')).toEqual(getActions(b, 'home'));
      expect(getWeather(a)).toBe('sunny');
      expect(getPrices(a)[0].price).toBe(200);
      const bought = run(a, ['read-forecast', 'buy-umbrella']);
      expect(getWeather(bought)).toBe('sunny');
      const later = step(bought, 'wait-weather');
      expect(later.cash).toBe(bought.cash);
      const forecast = getActions(a, 'home')[0].detail.en;
      const expectedWeather = forecast.includes('rain tomorrow') ? 'rainy' : 'sunny';
      expect(getWeather(later)).toBe(expectedWeather);
      expect(getPrices(later)[0].price).toBe(getWeather(later) === 'rainy' ? 300 : 200);
      const beforeWeatherRead = JSON.stringify(later);
      observed.add(getWeather(freeze(later)));
      expect(JSON.stringify(later)).toBe(beforeWeatherRead);
      expect(run(a, SOLUTIONS[8])).toEqual(run(b, SOLUTIONS[8]));
    }
    expect(observed).toEqual(new Set(['sunny', 'rainy']));
  });
  it('perishable markdown saves money today but spoils tomorrow; replacement costs money', () => {
    const s = entry(9, 2);
    const today = run(s, ['compare-bread', 'buy-markdown']);
    expect(today.cash).toBe(s.cash - 120);
    const spoiled = step(today, 'leave-bread');
    expect(spoiled.inventory.markdown).toBe(0);
    expect(spoiled.flags.spoiled).toBe(2);
    expect(act(spoiled, 'serve-bread').ok).toBe(false);
    const fixed = run(spoiled, ['buy-fresh', 'serve-bread']);
    expect(fixed.completed).toBe(true);
    expect(fixed.cash).toBe(s.cash - 360);
    const fresh = run(s, ['compare-bread', 'buy-fresh', 'leave-bread', 'serve-bread']);
    expect(fresh.completed).toBe(true);
    expect(fresh.cash).toBe(s.cash - 240);
  });
  it('barter requires agreement and reciprocal delivery, without generating cash', () => {
    const s = entry(10);
    const offered = run(s, ['sort-stickers', 'offer-swap']);
    expect(offered.inventory.sticker).toBe(2);
    expect(offered.inventory.apple ?? 0).toBe(0);
    const swap = step(offered, 'accept-swap');
    expect(swap.cash).toBe(s.cash);
    expect(swap.inventory.sticker).toBe(1);
    expect(swap.inventory.apple).toBe(1);
    expect(act(swap, 'accept-swap').state).toBe(swap);
  });
  it('notes, coins and digital are equivalent; wallet loading, payment and cash-out conserve value', () => {
    const s = entry(11);
    const coins = step(s, 'change-coins');
    expect(netWorth(coins)).toBe(netWorth(s));
    expect(act(coins, 'load-wallet').ok).toBe(false);
    const loaded = run(coins, ['parent-wallet', 'load-wallet']);
    expect(loaded.cash).toBe(s.cash - 500);
    expect(loaded.digital).toBe(500);
    expect(netWorth(loaded)).toBe(netWorth(s));
    const paid = step(loaded, 'pay-digital');
    expect(paid.digital).toBe(400);
    expect(netWorth(paid)).toBe(netWorth(s) - 100);
    const end = step(paid, 'cash-out-wallet');
    expect(end.cash).toBe(s.cash - 100);
    expect(end.digital).toBe(0);
    expect(netWorth(end)).toBe(netWorth(paid));
    ledgerMatches(end);
  });
});

describe('loans, dates, trust and supervised toy bank', () => {
  it('borrow and repayment move cash and liabilities equally; borrowing is not income', () => {
    const s = entry(12);
    const borrowed = run(s, ['read-loan', 'borrow']);
    expect(borrowed.cash).toBe(s.cash + 200);
    expect(borrowed.debt).toBe(200);
    expect(netWorth(borrowed)).toBe(netWorth(s));
    expect(act(borrowed, 'borrow').state).toBe(borrowed);
    const ready = run(borrowed, ['buy-loan-item', 'loan-work', 'wait-due']);
    const repaid = step(ready, 'repay');
    expect(repaid.cash).toBe(ready.cash - 200);
    expect(repaid.debt).toBe(0);
    expect(netWorth(repaid)).toBe(netWorth(ready));
  });
  it('lateness reduces trust once, repayment and an action plan restore it without cash rewards', () => {
    const s = run(entry(13), ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-late']);
    expect(s.day).toBe(s.loan!.dueDay + 1);
    expect(s.trust).toBe(2);
    expect(s.debt).toBe(300);
    const repaid = step(s, 'repay');
    expect(act(repaid, 'close-loan').ok).toBe(false);
    const fixed = step(repaid, 'repair-trust');
    expect(fixed.cash).toBe(repaid.cash);
    expect(fixed.trust).toBe(3);
    expect(act(fixed, 'repair-trust').state).toBe(fixed);
    expect(step(fixed, 'close-loan').completed).toBe(true);
  });
  it('loan interest is exact integer cents on principal, once per game-day, not per click', () => {
    const s = run(entry(14), ['read-loan', 'borrow', 'buy-loan-item', 'loan-work']);
    expect(s.debt).toBe(400);
    const next = step(s, 'wait-due');
    expect(next.debt).toBe(404);
    expect(netWorth(next)).toBe(netWorth(s) - 4);
    expect(act(next, 'wait-due').state).toBe(next);
    for (const p of places) getActions(next, p);
    expect(next.debt).toBe(404);
    const late = step(next, 'wait-late');
    expect(late.debt).toBe(412);
    expect(late.ledger.filter(e => e.label.en.includes('Loan interest'))).toHaveLength(3);
    expect(step(late, 'repay').debt).toBe(0);
  });
  it('bank entry needs a parent; early withdrawal returns exact principal and can be redeposited', () => {
    const s = entry(15);
    expect(act(s, 'deposit').ok).toBe(false);
    const deposit = run(s, ['parent-bank', 'deposit']);
    expect(netWorth(deposit)).toBe(netWorth(s));
    expect(deposit.cash).toBe(s.cash - 300);
    expect(deposit.savings).toBe(300);
    const early = step(step(deposit, 'wait-bank'), 'withdraw');
    expect(early.cash).toBe(s.cash);
    expect(early.savings).toBe(0);
    expect(early.bankTerm).toBeUndefined();
    expect(act(early, 'withdraw').state).toBe(early);
    const mature = run(early, ['deposit', 'wait-bank', 'wait-bank']);
    expect(mature.savings).toBe(306);
    expect(act(mature, 'wait-bank').state).toBe(mature);
    const end = run(mature, ['withdraw', 'buy-bank-paper', 'check-bank']);
    expect(end.cash).toBe(s.cash - 94);
    expect(end.completed).toBe(true);
  });
  it('maturity credits simple interest once and preserves a real bank balance for the next goal', () => {
    const s = run(entry(16), SOLUTIONS[16]);
    expect(s.savings).toBe(202);
    const next = advance(s);
    expect(next.savings).toBe(202);
    expect(next.bankTerm?.settled).toBe(true);
    expect(next.flags).not.toHaveProperty('bankMatured');
    const withdrew = run(next, ['parent-bank', 'withdraw']);
    expect(netWorth(withdrew)).toBe(netWorth(next));
    expect(withdrew.cash).toBe(next.cash + 202);
    expect(withdrew.savings).toBe(0);
  });
});

describe('parent-accompanied fictional foreign travel', () => {
  it('exchange has an explicit fee and inverse conversion conserves value minus the displayed fee', () => {
    const s = entry(19);
    const exchanged = run(s, ['read-exchange', 'exchange-shells']);
    expect(exchanged.flags.fxRate).toBe(200);
    expect(exchanged.flags.foreignCash).toBe(500);
    expect(exchanged.cash).toBe(s.cash - 1020);
    expect(netWorth(exchanged)).toBe(netWorth(s) - 20);
    expect(act(exchanged, 'exchange-shells').state).toBe(exchanged);
    const home = step(entry(23), 'read-home-bill');
    const before = netWorth(home);
    const cashOut = step(home, 'exchange-home');
    expect(cashOut.flags.foreignCash).toBe(0);
    expect(netWorth(cashOut)).toBe(before - 20);
    expect(act(cashOut, 'exchange-home').state).toBe(cashOut);
  });
  it('prepaid QR payment uses owned foreign money; credit uses debt, not the QR balance', () => {
    const busReady = run(entry(19, 3), ['read-exchange', 'exchange-shells']);
    expect(getPrices(busReady)[0].currency).toBe('foreign');
    const bus = step(busReady, 'pay-bus-qr');
    expect(bus.flags.foreignCash).toBe(410);
    expect(bus.debt).toBe(0);
    expect(netWorth(bus)).toBe(netWorth(busReady) - 180);
    const cardReady = step(entry(22, 3), 'parent-card-terms');
    const qr = step(cardReady, 'pay-sticker-qr');
    expect(qr.flags.foreignCash).toBe(cardReady.flags.foreignCash - 30);
    expect(qr.debt).toBe(0);
    const card = step(qr, 'pay-parent-card');
    expect(card.flags.foreignCash).toBe(qr.flags.foreignCash);
    expect(card.cash).toBe(qr.cash);
    expect(card.flags.foreignDebt).toBe(450);
    expect(card.debt).toBe(900);
    expect(netWorth(card)).toBe(netWorth(qr) - 900);
  });
  it('compares identical products with FX and the whole exchange fee, permits either country', () => {
    const s = entry(20, 3);
    const compared = step(s, 'compare-fx-prices');
    expect(getActions(compared, 'shop')[0].detail.en).toContain('¥0.20');
    expect(getPrices(s).map(p => [p.price, p.currency ?? 'home'])).toEqual([[260, 'home'], [100, 'foreign']]);
    const foreign = run(compared, ['buy-foreign-souvenir', 'pack-souvenirs']);
    const home = run(compared, ['order-home-souvenir', 'pack-souvenirs']);
    expect(foreign.completed).toBe(true);
    expect(home.completed).toBe(true);
    expect(netWorth(home)).toBe(netWorth(s) - 780);
    expect(netWorth(foreign)).toBe(netWorth(s) - 600);
    expect(act(home, 'buy-foreign-souvenir').ok).toBe(false);
  });
  it('toy customs costs depend on actual imports; declaration and handling charges occur once', () => {
    const one = run(entry(21, 1), ['read-customs', 'declare-gifts']);
    const three = run(entry(21, 3), ['read-customs', 'declare-gifts']);
    expect(one.flags.customsCharge).toBe(0);
    expect(three.flags.customsCharge).toBe(60);
    const paid = step(three, 'pay-customs');
    expect(paid.cash).toBe(three.cash - 60);
    expect(act(paid, 'pay-customs').state).toBe(paid);
    const corrected = run(entry(21, 3), ['read-customs', 'hide-gifts', 'correct-declaration', 'pay-customs', 'customs-stamp']);
    expect(corrected.completed).toBe(true);
    expect(corrected.flags.customsCharge).toBe(80);
  });
  it('a parent-card refund reverses only debt, never creates cash or duplicate credit', () => {
    const s = step(entry(22, 2), 'parent-card-terms');
    const bought = step(s, 'pay-parent-card');
    const refund = step(bought, 'refund-card-snacks');
    expect(refund.cash).toBe(s.cash);
    expect(refund.flags.foreignCash).toBe(s.flags.foreignCash);
    expect(refund.debt).toBe(0);
    expect(refund.flags.foreignDebt).toBe(0);
    expect(netWorth(refund)).toBe(netWorth(s));
    expect(act(refund, 'refund-card-snacks').state).toBe(refund);
    const rebuy = step(refund, 'pay-parent-card');
    expect(rebuy.debt).toBe(600);
    expect(act(rebuy, 'refund-card-snacks').state).toBe(rebuy);
    expect(act(rebuy, 'pay-parent-card').state).toBe(rebuy);
  });
  it('FX updates before bill decisions, revalues wallet and liability, then settles in home money', () => {
    const s = run(entry(22, 3), ['parent-card-terms', 'pay-parent-card']);
    const oldForeign = s.flags.foreignCash;
    const home = step(s, 'fly-home');
    expect(home.flags.fxRate).toBe(220);
    expect(home.flags.foreignDebt).toBe(450);
    expect(home.debt).toBe(990);
    expect(home.ledger.at(-1)?.debt).toBe(90);
    expect(netWorth(home) - netWorth(s)).toBe(Math.floor(oldForeign * 220 / 100) - Math.floor(oldForeign * 200 / 100) - 90);
    const next = advance(step(home, 'review-card-bill'));
    expect(next.debt).toBe(990);
    expect(next.day).toBe(next.flags.cardDueDay);
    const ready = step(next, 'read-home-bill');
    const settled = step(ready, 'settle-parent-card');
    expect(settled.cash).toBe(ready.cash - 990);
    expect(settled.flags.foreignCash).toBe(ready.flags.foreignCash);
    expect(settled.debt).toBe(0);
    expect(netWorth(settled)).toBe(netWorth(ready));
    expect(act(settled, 'settle-parent-card').state).toBe(settled);
    expect(run(settled, ['exchange-home', 'finish-travel']).completed).toBe(true);
  });
  it('a missed card date creates one visible toy charge and can still be repaid', () => {
    const s = step(entry(23, 2), 'read-home-bill');
    const late = step(s, 'delay-card');
    expect(late.debt).toBe(s.debt + 20);
    expect(late.flags.cardLateFee).toBe(20);
    expect(act(late, 'delay-card').state).toBe(late);
    const end = run(late, ['exchange-home', 'settle-parent-card', 'finish-travel']);
    expect(end.completed).toBe(true);
    expect(end.debt).toBe(0);
    expect(end.flags.foreignDebt).toBe(0);
  });
});

describe('bounded robust persistence', () => {
  it('round trips a midlevel wallet and loan and independently replays the checkpoint', () => {
    for (const [level, prefix] of [[11, 3], [14, 5], [15, 3], [22, 3], [23, 2]]) {
      const checkpoint = entry(level);
      const state = run(checkpoint, SOLUTIONS[level].slice(0, prefix));
      const storage = memory();
      const save: Save = { state, checkpoint, lang: 'en' };
      expect(saveGame(storage, save)).toBe(true);
      const loaded = loadGame(storage)!;
      expect(loaded).toEqual(save);
      expect(run(loaded.state, SOLUTIONS[level].slice(prefix))).toEqual(run(checkpoint, SOLUTIONS[level]));
      expect(run(loaded.checkpoint, SOLUTIONS[level])).toEqual(run(checkpoint, SOLUTIONS[level]));
    }
  });
  it('handles missing storage, unavailable storage, malformed JSON and throwing getters', () => {
    const state = createGame({ gender: 'boy', children: 1 });
    const save: Save = { state, checkpoint: state, lang: 'zh' };
    expect(loadGame(undefined)).toBeUndefined();
    expect(saveGame(undefined, save)).toBe(false);
    expect(loadGame({ getItem: () => { throw new Error('denied'); } })).toBeUndefined();
    expect(saveGame({ setItem: () => { throw new Error('full'); } }, save)).toBe(false);
    for (const raw of ['', '{', 'null', '[]', '42', '{"version":1}', 'x'.repeat(4_000_001)]) expect(loadGame({ getItem: () => raw })).toBeUndefined();
    const getter = { get state(): GameState { throw new Error('getter'); }, checkpoint: state, lang: 'zh' as const };
    expect(saveGame(memory(), getter)).toBe(false);
    const storageGetter = { get getItem(): (key: string) => string | null { throw new Error('getter'); } };
    expect(loadGame(storageGetter)).toBeUndefined();
  });
  it('rejects invalid family configuration at creation', () => {
    for (const family of [{ gender: 'cat', children: 1 }, { gender: 'boy', children: 0 }, { gender: 'girl', children: 4 }]) expect(() => createGame(family as Family)).toThrow();
    expect(createGame({ gender: 'girl', children: 1 }, NaN).seed).toBe(2026);
  });
  it('rejects malformed versions, bounds, schemas, money, ledger, checkpoint and foreign balances', () => {
    const c = entry(22, 2);
    const valid: Save = { state: run(c, SOLUTIONS[22].slice(0, 3)), checkpoint: c, lang: 'zh' };
    const mutate = (change: (s: Save) => void) => {
      const bad: Save = JSON.parse(JSON.stringify(valid));
      change(bad);
      const raw = JSON.stringify(bad);
      expect(loadGame({ getItem: () => raw })).toBeUndefined();
      expect(saveGame(memory(), bad)).toBe(false);
    };
    for (const level of [-1, 24, 0.5]) mutate(s => { s.state.level = level; });
    mutate(s => { s.state.version = 3 as 1; });
    mutate(s => { s.state.family.gender = 'cat' as 'girl'; });
    mutate(s => { s.state.family.children = 4 as 3; });
    for (const amount of [-1, 0.5, 100_000_001, Infinity, NaN]) mutate(s => { s.state.cash = amount; });
    mutate(s => { s.state.trust = 4; });
    mutate(s => { s.state.day = 0; });
    mutate(s => { s.state.seed = 0x1_0000_0000; });
    mutate(s => { s.state.inventory.apple = -1; });
    mutate(s => { s.state.flags.hacked = NaN; });
    mutate(s => { Object.defineProperty(s.state.flags, 'constructor', { value: 5, enumerable: true }); });
    mutate(s => { s.state.ledger[0].label = { zh: 1, en: '' } as unknown as { zh: string; en: string }; });
    mutate(s => { s.state.ledger[0].cash += 1; });
    mutate(s => { s.state.ledger[0].day = s.state.day + 1; });
    mutate(s => { s.state.flags.foreignDebt += 1; });
    mutate(s => { s.state.flags.fxRate = 201; });
    mutate(s => { s.state.rewards.push('free-money'); });
    mutate(s => { s.checkpoint.completed = true; });
    mutate(s => { s.checkpoint.level--; });
    mutate(s => { s.checkpoint.seed++; });
    mutate(s => { s.checkpoint.family.children = 1; });
    mutate(s => { s.checkpoint.flags.cheat = 1; });
    mutate(s => { s.lang = 'fr' as 'en'; });
    mutate(s => { (s.state as unknown as Record<string, unknown>).unrecognized = 1; });
    expect(SAVE_KEY).toBe('transit-tales-economic-v2');
  });
});
