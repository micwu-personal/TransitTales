import { describe, expect, it } from 'vitest';
import {
  CHILDHOOD_STORIES, CHILDHOOD_SCRIPT_ENTRIES, CHILDHOOD_DESTINATIONS,
  createChildhood, childhoodView, actChildhood, validateChildhood, saveChildhood, loadChildhood, childhoodItemText,
  type ChildhoodState, type ChildhoodStoryId,
} from '../src/economic/childhood';
import { speechFor } from '../src/economic/speech-cues';
import type { Family, Text } from '../src/economic/model';

const families: Family[] = [1, 2, 3].flatMap(children => ['boy', 'girl'].map(gender => ({ gender, children }) as Family));
function run(s: ChildhoodState, ...ids: string[]): ChildhoodState {
  for (const id of ids) {
    const before = JSON.stringify(s);
    const result = actChildhood(s, id);
    expect(result.ok, `${s.storyId}/${s.stage}: ${id}`).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(speechFor(result.message)?.[0]).toMatch(/^childhood\./);
    s = result.state;
  }
  return s;
}
const checkedItemLabels = new Set<string>();
function assertItemLabel(key: string) {
  if (checkedItemLabels.has(key)) return;
  const label = childhoodItemText(key);
  assertText(label);
  for (const id of speechFor(label)!) expect(CHILDHOOD_SCRIPT_ENTRIES.some(script => script.id === id)).toBe(true);
  checkedItemLabels.add(key);
}
function assertLedger(s: ChildhoodState, itemKeys?: Set<string>) {
  const sums = Object.fromEntries(Object.keys(s.envelope).map(key => [key, 0]));
  const goods: Record<string, number> = {};
  for (const entry of s.ledger) {
    expect(speechFor(entry.label)?.[0]).toBe(entry.scriptId);
    for (const [key, change] of Object.entries(entry.accounts)) {
      expect(Number.isSafeInteger(change)).toBe(true); sums[key] += change;
      expect(sums[key], key).toBeGreaterThanOrEqual(0);
    }
    for (const [key, change] of Object.entries(entry.items)) {
      if (change !== 0) { assertItemLabel(key); itemKeys?.add(key); }
      goods[key] = (goods[key] ?? 0) + change;
      expect(goods[key], key).toBeGreaterThanOrEqual(0);
    }
  }
  for (const [key, count] of Object.entries(s.inventory)) {
    if (count !== 0) { assertItemLabel(key); itemKeys?.add(key); }
  }
  expect(sums).toEqual(s.envelope); expect(goods).toEqual(s.inventory);
  expect(s.envelope.debt).toBeGreaterThanOrEqual(0);
}
function assertText(text: Text) {
  for (const lang of ['zh', 'en', 'ja', 'mn', 'mn-Mong'] as const) expect(text[lang]?.trim().length).toBeGreaterThan(0);
  expect(speechFor(text)?.[0]).toMatch(/^childhood\./);
}
function assertView(s: ChildhoodState) {
  const v = childhoodView(s);
  [v.title, v.goal, v.speaker, v.message, v.nextStep].forEach(assertText);
  for (const choice of v.choices) { assertText(choice.label); assertText(choice.detail); if (choice.disabled) assertText(choice.disabled); }
  v.quotes.forEach(q => { assertText(q.label); expect(Number.isSafeInteger(q.value)).toBe(true); });
  expect(new Set(v.choices.map(choice => choice.id)).size).toBe(v.choices.length);
  expect(v.progress.current).toBeLessThanOrEqual(v.progress.total);
}
const safe: Record<ChildhoodStoryId, string[]> = {
  market: ['fruit-ripe', 'check-change', 'keep'], family: ['equal', 'sort', 'wash', 'collect'], wishes: ['wish-reserve', 'finish'],
  money: ['swap', 'shell-buy', 'copper', 'inspect', 'paper-buy', 'digital-buy'], insurance: ['none', 'ordinary-bag', 'claim', 'restore'],
  travel: ['shell', 'local', 'cash', 'finish'],
};

describe('isolated childhood stories', () => {
  it('has six prerequisite descriptors without replacing campaign chapters', () => {
    expect(CHILDHOOD_STORIES.map(s => s.id)).toEqual(['market', 'family', 'wishes', 'money', 'insurance', 'travel']);
    expect(CHILDHOOD_STORIES.every(s => s.minLevel >= 0 && s.minLevel < 24 && s.age >= 7 && s.age <= 12)).toBe(true);
    const state = createChildhood('market', families[0]);
    expect(state).not.toHaveProperty('level'); expect(state).not.toHaveProperty('life'); expect(state).not.toHaveProperty('cash');
  });
  it.each(families)('every theme has a parent-supported debt-free completion for $gender/$children', family => {
    for (const descriptor of CHILDHOOD_STORIES) {
      const steps = [...safe[descriptor.id]];
      if (descriptor.id === 'family' && family.children === 3) steps.splice(3, 0, 'pack');
      const s = run(createChildhood(descriptor.id, family, 1), ...steps);
      expect(s.completed).toBe(true); expect(s.envelope.debt).toBe(0); expect(s.envelope.cardPending).toBe(0);
      expect(s.family).toEqual(family); assertLedger(s); assertView(s); expect(validateChildhood(s)).toBe(true);
      expect(actChildhood(s, 'finish').ok).toBe(false);
      expect(s.achievements.filter(a => a === `childhood.${descriptor.id}`)).toHaveLength(1);
    }
  });
  it('every reasonable branch can finish, has accounting and five-language speech cues', () => {
    const itemKeys = new Set<string>();
    let terminals = 0;
    for (const family of families) for (const seed of [0, 1]) for (const story of CHILDHOOD_STORIES) {
      const queue = [createChildhood(story.id, family, seed)];
      let visits = 0;
      while (queue.length) {
        const s = queue.pop()!; visits++; expect(visits).toBeLessThan(10_000);
        assertLedger(s, itemKeys); assertView(s);
        if (s.completed) { terminals++; expect(s.envelope.debt + s.envelope.cardPending + s.envelope.change).toBe(0); expect(validateChildhood(s)).toBe(true); continue; }
        const choices = childhoodView(s).choices.filter(choice => !choice.disabled);
        expect(choices.length).toBeGreaterThan(0);
        for (const c of choices) {
          const next = actChildhood(s, c.id); expect(next.ok).toBe(true);
          expect(next.state.history.length).toBeLessThan(40);
          expect(next.state.decisions.at(-1)?.choiceId).toBe(c.id);
          expect(next.state.decisions.at(-1)?.quotes.length).toBeGreaterThan(0);
          queue.push(next.state);
        }
      }
    }
    expect(terminals).toBeGreaterThan(1000);
    expect([...itemKeys].sort()).toEqual([
      'sticker', 'brokenToy', 'book', 'toy', 'fruit', 'repairedToy', 'usedToy', 'repairHelp',
      'sharedSnack', 'freshTomorrow', 'sort', 'wash', 'pack', 'wish-toy', 'wish-gift', 'wish-book',
      'apple', 'rejectedProp', 'basket', 'authenticityCheck', 'paperReplaced', 'paperTicket',
      'digitalTicket', 'dryBag', 'wetBook', 'wetToy', 'travelPass', 'familyInvitation',
      'visitorPermission', 'travelBook',
    ].sort());
  }, 60_000);
  it('rejects unknown and prototype item keys instead of returning an unregistered fallback', () => {
    for (const key of ['', 'unknown', 'wish-reserve', '__proto__', 'constructor', 'toString']) {
      expect(() => childhoodItemText(key)).toThrow('Unknown childhood item:');
    }
    expect(childhoodItemText('wetBook').zh).not.toBe(childhoodItemText('wetToy').zh);
  });
  it('registers every script with four spoken languages and traditional Mongolian writing', () => {
    expect(new Set(CHILDHOOD_SCRIPT_ENTRIES.map(e => e.id)).size).toBe(CHILDHOOD_SCRIPT_ENTRIES.length);
    for (const script of CHILDHOOD_SCRIPT_ENTRIES) {
      expect(script.id).toMatch(/^childhood\./);
      ['zh', 'en', 'ja', 'mn'].forEach(lang => expect(script.text[lang as keyof typeof script.text].length).toBeGreaterThan(0));
      expect(script.writing['mn-Mong']).toMatch(/[\u1800-\u18af]/);
      expect(script.text.zh).not.toMatch(/\d/);
    }
  });
  it('does not mutate inputs, reject invalid choices, and normalizes seeds', () => {
    expect(() => createChildhood('missing' as ChildhoodStoryId, families[0])).toThrow();
    expect(() => createChildhood('market', { gender: 'other', children: 5 } as unknown as Family)).toThrow();
    expect(createChildhood('market', families[0], NaN).seed).toBe(2026);
    expect(createChildhood('market', families[0], -1).seed).toBe(0xffffffff);
    const s = createChildhood('market', families[0]);
    expect(actChildhood(s, 'unknown')).toMatchObject({ ok: false, state: s });
  });
});

describe('market quality, time, warranty, change and returns', () => {
  for (const offer of ['fruit-fresh', 'fruit-ripe', 'repair-near', 'repair-far', 'toy-warranty', 'toy-inspected']) {
    it(`${offer}: correct change and receipt refund retain only the travel cost`, () => {
      let s = run(createChildhood('market', families[5], 1), offer, 'accept-short');
      expect(s.envelope.change).toBe(20); expect(s.stage).toBe('short');
      s = run(s, 'check-change');
      expect(s.envelope.cash).toBe(500 - Number(s.flags.price) - Number(s.flags.fare));
      s = run(s, 'refund'); expect(s.envelope.cash).toBe(500 - Number(s.flags.fare)); assertLedger(s); expect(validateChildhood(s)).toBe(true);
    });
  }
  it('quality creates a real fresh-tomorrow route, while ripe fruit is eaten today', () => {
    const fresh = run(createChildhood('market', families[5]), 'fruit-fresh', 'check-change');
    const ripe = run(createChildhood('market', families[5]), 'fruit-ripe', 'check-change');
    expect(childhoodView(ripe).choices.find(c => c.id === 'save-snack')).toBeUndefined();
    const kept = run(fresh, 'save-snack'); expect(kept.inventory.freshTomorrow).toBe(1); expect(kept.day).toBe(fresh.day + 1);
    expect(run(ripe, 'keep').inventory.sharedSnack).toBe(3);
  });
  it('warranty repair is available only with cover; parent help recovers the uncovered toy', () => {
    const covered = run(createChildhood('market', families[0], 1), 'toy-warranty', 'check-change');
    const basic = run(createChildhood('market', families[0], 1), 'toy-inspected', 'check-change');
    expect(basic.day).toBe(covered.day + 1);
    expect(actChildhood(basic, 'warranty-repair').ok).toBe(false);
    const fixed = run(basic, 'parent-repair'); expect(fixed.flags.defect).toBe(0); expect(fixed.envelope.cash).toBe(basic.envelope.cash);
    expect(run(covered, 'warranty-repair').inventory.repairHelp).toBe(1);
    expect(run(createChildhood('market', families[0]), 'leave').envelope.cash).toBe(500);
  });
});

describe('family agreements and gift wishes', () => {
  it.each(families)('both agreements pay once, respecting original household $gender/$children', family => {
    for (const division of ['equal', 'effort']) {
      let s = run(createChildhood('family', family), division);
      expect(actChildhood(s, 'collect').ok).toBe(false);
      s = run(s, 'wash', 'sort'); if (family.children === 3) s = run(s, 'pack');
      const shares = Array.from({ length: family.children }, (_, i) => Number(s.flags[`share${i}`]));
      expect(shares.reduce((a, b) => a + b)).toBe(600);
      s = run(s, 'collect'); expect(s.envelope.cash).toBe(shares[0]); expect(s.envelope.siblings).toBe(600 - shares[0]);
      expect(actChildhood(s, 'collect').ok).toBe(false); assertLedger(s);
    }
  });
  it('each wish is independently valid, can combine wishes, and shortage never traps the story', () => {
    for (const wish of ['wish-toy', 'wish-reserve', 'wish-gift', 'wish-book']) {
      const s = run(createChildhood('wishes', families[0]), wish, 'finish'); expect(s.completed).toBe(true); expect(s.achievements).toContain(`childhood.${wish}`);
    }
    let s = run(createChildhood('wishes', families[0]), 'wish-toy', 'wish-gift', 'wish-book');
    expect(s.envelope.cash).toBe(0); expect(actChildhood(s, 'wish-reserve').ok).toBe(false);
    s = run(s, 'finish'); expect(s.completed).toBe(true); expect(s.envelope.debt).toBe(0);
  });
});

describe('money journey', () => {
  it('all negotiated metal choices spend different counts and carry different weights, not a universal peg', () => {
    for (const [metal, amount, weight] of [['copper', 10, 100], ['silver', 2, 20], ['gold', 1, 10]] as const) {
      const s = run(createChildhood('money', families[0], 1), 'counteroffer', 'shell-barter', metal, 'replace-worn', 'paper-replace', 'digital-buy');
      expect(s.flags.weight).toBe(weight); expect(s.flags.counterfeitRejected).toBe(1); expect(s.flags.wornReplaced).toBe(1);
      expect(s.inventory.rejectedProp).toBe(1); expect(s.inventory.paperReplaced).toBe(1);
      expect(s.ledger.find(e => e.scriptId === 'childhood.replace-worn')?.accounts[metal]).toBe(-amount);
      expect(s.envelope.paper).toBe(0); expect(s.envelope.prepaid).toBe(200); expect(s.envelope.cash).toBe(0);
      expect(s.envelope.shells).toBe(3); expect(s.inventory.sticker).toBe(0); assertLedger(s);
    }
  });
});

describe('shared insurance pool', () => {
  for (const seed of [0, 1, 2, 3, 4]) for (const policy of ['none', 'book', 'all']) for (const bag of ['ordinary-bag', 'dry-bag']) {
    it(`seed ${seed}, ${policy}, ${bag}: bounded claim and recoverable loss`, () => {
      const start = createChildhood('insurance', families[5], seed);
      const event = run(start, policy, bag);
      const claimQuote = childhoodView(event).quotes.find(q => speechFor(q.label)?.[0] === 'childhood.claim')!.value;
      const s = run(event, 'claim', 'restore'); const rain = seed % 3 !== 0;
      const loss = rain ? bag === 'dry-bag' ? 400 : 500 : 0;
      const premium = policy === 'none' ? 0 : policy === 'book' ? 100 : 180;
      const limit = policy === 'none' ? 0 : policy === 'book' ? 150 : 300;
      const covered = !rain || policy === 'none' ? 0 : policy === 'book' ? 200 : loss;
      const claim = Math.min(Math.max(0, covered - (policy === 'none' ? 0 : 100)), limit, 400 + premium);
      expect(claimQuote).toBe(claim); expect(s.flags.claim).toBe(claim); expect(s.envelope.pool).toBe(400 + premium - claim);
      expect(s.envelope.cash).toBe(1000 - premium - (bag === 'dry-bag' ? 60 : 0) + claim - loss);
      expect(s.inventory.book).toBe(1); expect(s.inventory.toy).toBe(1); expect(s.envelope.debt).toBe(0);
      expect(actChildhood(s, 'claim').ok).toBe(false); assertLedger(s); expect(validateChildhood(s)).toBe(true);
      expect(run(createChildhood('insurance', families[5], seed), policy, bag, 'claim', 'restore')).toEqual(s);
    });
  }
});

function travel(dest: 'shell' | 'lantern', funding: string, conversion = 'issuer', route = 'foreign') {
  let s = run(createChildhood('travel', families[5], 1), dest, route, funding);
  if (route === 'foreign') s = run(s, conversion);
  return s;
}
describe('fictional travel conversion and funding', () => {
  for (const dest of ['shell', 'lantern'] as const) for (const funding of ['cash', 'debit', 'prepaid', 'credit']) {
    it(`${dest}/${funding}: funds are owned unless credit, all costs and reserve are counted`, () => {
      const d = CHILDHOOD_DESTINATIONS[dest]; let s = travel(dest, funding);
      const cost = Math.round(d.foreignPrice * d.rate / 100) + d.tax + d.shipping + d.fee;
      expect(s.inventory.travelBook).toBe(1); expect(s.envelope.reserve).toBe(400);
      if (funding === 'credit') {
        expect(s.envelope.cash).toBe(1600 - d.fare); expect(s.envelope.cardPending).toBe(cost);
        expect(actChildhood(s, 'finish').ok).toBe(false); s = run(s, 'settle');
        const bill = Math.round(d.foreignPrice * d.settlementRate / 100) + d.tax + d.shipping + d.fee;
        expect(s.envelope.debt).toBe(bill); expect(s.day).toBe(2); expect(s.flags.dueDay).toBe(3);
        s = run(s, 'repay'); expect(s.day).toBe(3); expect(s.envelope.cash).toBe(1600 - d.fare - bill);
      } else { expect(s.envelope.cash).toBe(1600 - d.fare - cost); expect(s.envelope.cardPending + s.envelope.debt).toBe(0); }
      s = run(s, 'finish'); assertLedger(s); expect(validateChildhood(s)).toBe(true);
    });
    it(`${dest}/${funding}: refund follows the funding source and cannot be repeated`, () => {
      const d = CHILDHOOD_DESTINATIONS[dest]; let s = travel(dest, funding);
      if (funding === 'credit') s = run(s, 'settle');
      s = run(s, 'refund'); expect(s.inventory.travelBook).toBe(0); expect(actChildhood(s, 'refund').ok).toBe(false);
      if (funding === 'cash') { expect(s.envelope.foreignCash).toBe(d.foreignPrice); s = run(s, 'exchange-back'); }
      else if (funding === 'credit') { expect(s.envelope.debt).toBe(d.shipping + d.fee); s = run(s, 'repay'); }
      else expect(s.envelope[funding as 'debit' | 'prepaid']).toBe(Math.round(d.foreignPrice * d.rate / 100) + d.tax);
      s = run(s, 'finish'); expect(s.envelope.reserve).toBe(400); assertLedger(s); expect(validateChildhood(s)).toBe(true);
    });
  }
  it('same-spec landed prices differ by destination; merchant conversion locks the home amount', () => {
    for (const dest of ['shell', 'lantern'] as const) {
      const d = CHILDHOOD_DESTINATIONS[dest]; const s = run(createChildhood('travel', families[0]), dest);
      expect(childhoodView(s).quotes.find(q => speechFor(q.label)?.[0] === 'childhood.landed')?.value).toBe(dest === 'shell' ? 490 : 570);
      const credit = run(travel(dest, 'credit', 'merchant'), 'settle');
      expect(credit.envelope.debt).toBe(d.merchantPrice + d.tax + d.shipping);
      expect(credit.envelope.debt).not.toBe(Math.round(d.foreignPrice * d.settlementRate / 100) + d.tax + d.shipping + d.fee);
      const done = run(credit, 'repay', 'refund', 'finish'); expect(done.envelope.cash).toBe(1600 - d.fare - d.shipping);
      expect(done.envelope.debt).toBe(0); assertLedger(done);
    }
  });
  it('an early credit return cancels the pending purchase, but still owes disclosed nonrefundable costs', () => {
    let s = run(travel('shell', 'credit'), 'refund'); expect(s.envelope.cardPending).toBe(0); expect(s.envelope.debt).toBe(70);
    expect(s.flags.refundAmount).toBe(420); s = run(s, 'repay', 'finish'); expect(s.completed).toBe(true); assertLedger(s);
  });
  it('over-reserving has explicit owned-funding shortage recovery and a recoverable credit bill', () => {
    let owned = run(createChildhood('travel', families[0]), 'lantern', 'reserve-more', 'foreign');
    expect(owned.envelope.cash).toBe(480); expect(owned.envelope.reserve).toBe(1400);
    expect(actChildhood(owned, 'cash').ok).toBe(false);
    owned = run(owned, 'use-reserve', 'cash', 'issuer', 'finish');
    expect(owned.completed).toBe(true); expect(owned.envelope.debt).toBe(0); expect(owned.envelope.reserve).toBe(1000);
    let borrowed = run(createChildhood('travel', families[0]), 'lantern', 'reserve-more', 'foreign', 'credit', 'merchant', 'settle');
    expect(actChildhood(borrowed, 'repay').ok).toBe(false);
    borrowed = run(borrowed, 'use-reserve', 'repay', 'finish'); expect(borrowed.envelope.debt).toBe(0);
    expect(validateChildhood(borrowed)).toBe(true); assertLedger(borrowed);
  });
  it('local route supports all funding sources without foreign tax, shipping or exchange', () => {
    for (const funding of ['cash', 'debit', 'prepaid', 'credit']) {
      let s = travel('lantern', funding, 'issuer', 'local'); expect(s.flags.paid).toBe(500);
      if (funding === 'credit') s = run(s, 'settle', 'repay');
      s = run(s, 'refund', 'finish'); expect(s.completed).toBe(true); expect(s.envelope.foreignCash + s.envelope.debt).toBe(0); assertLedger(s);
    }
  });
});

describe('save validation and deterministic memory replay', () => {
  function storage() { const values = new Map<string, string>(); return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } }; }
  it('persists in an explicit independent key and restores speech cues', () => {
    const store = storage(); store.setItem('main', 'campaign untouched');
    const s = run(travel('shell', 'credit'), 'settle'); expect(saveChildhood(store, 'separate-childhood', s)).toBe(true);
    const restored = loadChildhood(store, 'separate-childhood')!; expect(restored).toEqual(s); assertView(restored); assertLedger(restored);
    expect(run(restored, 'repay', 'finish')).toEqual(run(s, 'repay', 'finish'));
    expect(store.getItem('main')).toBe('campaign untouched'); expect(loadChildhood(store, 'missing')).toBeUndefined();
  });
  it('rejects tampered budgets, debts, rates, pool, inventory, family, seed, claims, ledger and decisions', () => {
    const valid = run(createChildhood('insurance', families[5], 1), 'all', 'dry-bag', 'claim');
    const mutations = [
      (s: ChildhoodState) => { s.envelope.cash++; }, (s: ChildhoodState) => { s.envelope.debt = -1; },
      (s: ChildhoodState) => { s.envelope.pool++; }, (s: ChildhoodState) => { s.inventory.toy = 999; },
      (s: ChildhoodState) => { s.flags.limit = 999; }, (s: ChildhoodState) => { s.flags.claim = 999; },
      (s: ChildhoodState) => { s.ledger.pop(); }, (s: ChildhoodState) => { s.decisions[0].quotes[0].value++; },
      (s: ChildhoodState) => { s.seed = 0; }, (s: ChildhoodState) => { s.day++; },
      (s: ChildhoodState) => { s.history.push('claim'); }, (s: ChildhoodState) => { s.family.gender = 'invalid' as Family['gender']; },
      (s: ChildhoodState) => { s.completed = true; }, (s: ChildhoodState) => { s.achievements.push('free-money'); },
    ];
    for (const mutate of mutations) { const bad = JSON.parse(JSON.stringify(valid)) as ChildhoodState; mutate(bad); expect(validateChildhood(bad)).toBe(false); expect(saveChildhood(storage(), 'side', bad)).toBe(false); }
    const orderChanged = Object.fromEntries(Object.entries(valid).reverse()); expect(validateChildhood(orderChanged)).toBe(true);
    expect(validateChildhood(null)).toBe(false); expect(validateChildhood({ version: 1 })).toBe(false);
  });
  it('handles malformed, oversized and inaccessible storage without affecting the main game', () => {
    const s = createChildhood('wishes', families[0]); const store = storage();
    for (const raw of ['no json', 'null', '{}', 'x'.repeat(200001)]) { store.setItem('side', raw); expect(loadChildhood(store, 'side')).toBeUndefined(); }
    const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
    expect(loadChildhood(blocked, 'side')).toBeUndefined(); expect(saveChildhood(blocked, 'side', s)).toBe(false);
    expect(saveChildhood(store, '', s)).toBe(false); expect(loadChildhood(store, '')).toBeUndefined();
    const badHistory = { ...s, history: Array(41).fill('finish') }; expect(validateChildhood(badHistory)).toBe(false);
  });
});
