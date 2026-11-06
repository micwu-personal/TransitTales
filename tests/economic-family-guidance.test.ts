import { describe, expect, it } from 'vitest';
import { act, advance, CAMPAIGN_LEVELS, createGame, getActions, getLevel, getProgress, LEVELS, netWorth, type GameState, type Text } from '../src/economic/model';
import { getGoalSpeech, getGuidance } from '../src/economic/family-guidance';
import { familyText } from '../src/economic/family-copy';
import { scriptIds } from '../src/economic/narration';
import catalog from '../src/economic/narration-catalog.json';
import content from '../src/economic/legacy-content.json';

const locales = ['zh', 'en', 'ja', 'mn', 'mn-Mong'] as const;
const familyLevels = [0, 1, 3, 6, 7, 9, 10, 17, 18, 19, 20, 22, 23];
function registered(value: Text) {
  for (const locale of locales) expect(value[locale]?.trim().length, locale).toBeGreaterThan(0);
  for (const id of scriptIds([value])) expect(catalog.scripts.some(row => row.id === id), id).toBe(true);
}
function step(state: GameState, id: string) {
  const result = act(state, id);
  expect(result.ok, `${state.level}: ${id}: ${result.message.en}`).toBe(true);
  return result.state;
}

describe('household-aware copy and short next-step guidance', () => {
  it('adapts family goals in all five written locales and registers only the goal cue', () => {
    const original = JSON.stringify(LEVELS);
    for (const level of familyLevels) {
      const goals = ([1, 2, 3] as const).map(children => {
        const state = { ...createGame({ children, gender: 'girl' }), level };
        const goal = getGoalSpeech(state);
        registered(goal);
        expect(scriptIds([goal])).toEqual([`family.${LEVELS[level].id}.goal.${children}`]);
        expect(getProgress(state).description).toEqual(goal);
        return goal;
      });
      for (const locale of locales) expect(new Set(goals.map(goal => goal[locale])).size, `${level}/${locale}`).toBe(3);
    }
    expect(JSON.stringify(LEVELS)).toBe(original);
    expect(CAMPAIGN_LEVELS).toHaveLength(65);
  });
  it('gives an only child a singular snack goal and includes the protagonist in larger households', () => {
    const single = createGame({ children: 1, gender: 'boy' });
    expect(getLevel(single).goal.zh).toBe('买一个苹果，最多花1元，再回家吃点心。');
    expect(scriptIds([getLevel(single).intro])).toEqual(['family.first-snack.intro']);
    for (const children of [2, 3] as const) {
      const goal = getLevel(createGame({ children, gender: 'boy' })).goal;
      expect(goal.zh).toContain('你和兄弟姐妹');
      expect(goal.en).toContain('you and your siblings');
    }
    expect(getLevel(single).goal.zh).not.toContain('每个孩子');
  });
  it('does not invent younger siblings or shared chores for an only child', () => {
    const state = { ...createGame({ children: 1, gender: 'girl' }), level: 3 };
    expect(getLevel(state).intro.zh).not.toMatch(/弟弟|妹妹|兄弟姐妹|不抢/);
    expect(scriptIds([getLevel(state).intro])).toEqual(['family.chores.intro.1']);
    for (const action of getActions(state, 'home').filter(row => ['assign-chores', 'sort-socks', 'sweep-room'].includes(row.id))) {
      expect(action.label.zh + action.detail.zh).not.toMatch(/弟弟|妹妹|兄弟姐妹|合作|分配/);
      expect(scriptIds([action.detail])).toEqual([`family.action.${action.id}.1`]);
      registered(action.detail);
    }
  });
  it('adapts lunch, juice, bread, picnic and travel action wording without losing accounting facts', () => {
    for (const children of [1, 2, 3] as const) {
      const state = createGame({ children, gender: 'girl' });
      for (const [level, place, id] of [[1, 'school', 'pack-lunch'], [7, 'school', 'deliver-juice'], [9, 'home', 'serve-bread'], [17, 'home', 'assign-picnic'], [18, 'home', 'travel-envelope'], [19, 'park', 'ride-island-bus'], [20, 'park', 'pack-souvenirs']] as const) {
        const offer = getActions({ ...state, level }, place).find(row => row.id === id)!;
        registered(offer.label); registered(offer.detail);
        expect(scriptIds([offer.detail])).toEqual([`family.action.${id}.${children}`]);
        if (children === 1) expect(offer.label.zh + offer.detail.zh).not.toMatch(/孩子们|每个孩子|兄弟姐妹/);
      }
      const tagged = step(state, 'read-tags');
      const purchase = getActions(tagged, 'shop').find(row => row.id === 'buy-apple')!;
      expect(purchase.facts).toEqual(expect.arrayContaining([{ id: 'quantity', value: children }, { id: 'unit-price', value: 80, money: 'home' }, { id: 'total', value: 80 * children, money: 'home' }, { id: 'budget', value: 100 * children, money: 'home' }]));
      const list = getActions({ ...state, level: 1 }, 'home').find(row => row.id === 'make-list')!;
      expect(list.facts).toContainEqual({ id: 'total', value: 250 * children, money: 'home' });
    }
  });
  it('points to the unfinished prerequisite, then immediately home/school after shopping', () => {
    let state = createGame({ children: 1, gender: 'girl' });
    expect(getGuidance(state)).toMatchObject({ place: 'shop', actionId: 'read-tags' });
    state = step(step(state, 'read-tags'), 'buy-apple');
    const snapshot = JSON.stringify(state), worth = netWorth(state);
    expect(getGuidance(state)).toMatchObject({ place: 'home', actionId: 'share-apples' });
    expect(scriptIds([getGuidance(state).message])).toEqual(['family.next.home-snack']);
    expect(JSON.stringify(state)).toBe(snapshot); expect(netWorth(state)).toBe(worth);
    state = advance(step(state, 'share-apples'));
    expect(getGuidance(state)).toMatchObject({ place: 'home', actionId: 'make-list' });
    state = step(state, 'make-list');
    expect(getGuidance(state)).toMatchObject({ place: 'shop', actionId: 'buy-apple' });
    state = step(state, 'buy-apple');
    expect(getGuidance(state)).toMatchObject({ place: 'shop', actionId: 'buy-bread' });
    state = step(state, 'buy-bread');
    expect(getGuidance(state)).toMatchObject({ place: 'school', actionId: 'pack-lunch' });
    expect(scriptIds([getGuidance(state).message])).toEqual(['family.next.school-lunch']);
  });
  it('registers goal-only cues throughout the existing campaign, including household-neutral chapters', () => {
    const state = createGame({ children: 1, gender: 'boy' });
    for (let level = 0; level < 24; level++) {
      const goal = getGoalSpeech({ ...state, level });
      registered(goal);
      expect(scriptIds([goal])[0]).toMatch(/^family\..*\.goal(?:\.1)?$/);
      expect(scriptIds([goal])[0]).not.toContain('.body');
    }
  });
  it('recovers partial change and spoiled bread, and respects alternate juice purchases', () => {
    const initial = createGame({ children: 1, gender: 'girl' });
    let change = { ...initial, level: 2 };
    for (const id of ['check-price', 'pay-note', 'leave-change']) change = step(change, id);
    expect(getGuidance(change)).toMatchObject({ place: 'shop', actionId: 'collect-rest' });
    expect(getGuidance(step(change, 'collect-rest'))).toMatchObject({ place: 'school', actionId: 'deliver-bread' });
    let bread = { ...initial, level: 9 };
    for (const id of ['compare-bread', 'buy-markdown', 'leave-bread']) bread = step(bread, id);
    expect(getGuidance(bread)).toMatchObject({ place: 'shop', actionId: 'buy-markdown' });
    expect(getGuidance(step(bread, 'buy-markdown'))).toMatchObject({ place: 'home', actionId: 'serve-bread' });
    const juice = step(step({ ...initial, level: 7 }, 'compare-stalls'), 'buy-park-juice');
    expect(getGuidance(juice)).toMatchObject({ place: 'school', actionId: 'deliver-juice' });
    let picnic = { ...initial, level: 17 };
    for (const id of ['assign-picnic', 'picnic-work', 'parent-bank', 'buy-apple', 'buy-bread', 'buy-juice']) picnic = step(picnic, id);
    expect(getGuidance(picnic)).toMatchObject({ place: 'park', actionId: 'start-picnic' });
  });
  for (const children of [1, 2, 3] as const) it(`guides all 24 existing economic stories for ${children} children without changing actions`, () => {
    let state = createGame({ children, gender: 'girl' });
    for (let level = 0; level < 24; level++) {
      let steps = 0;
      while (!state.completed && steps++ < 30) {
        const before = JSON.stringify(state), guidance = getGuidance(state);
        registered(guidance.message);
        expect(JSON.stringify(state)).toBe(before);
        expect(guidance.actionId, `${level}: ${guidance.message.en}`).toBeDefined();
        expect(getActions(state, guidance.place).find(row => row.id === guidance.actionId)?.disabled).toBeUndefined();
        state = step(state, guidance.actionId!);
        for (const key of ['cash', 'savings', 'debt', 'digital'] as const) expect(state.ledger.reduce((sum, row) => sum + (row[key] ?? 0), 0)).toBe(state[key]);
      }
      expect(state.completed, `level ${level} did not finish`).toBe(true);
      expect(getGuidance(state).actionId).toBeUndefined();
      state = advance(state);
    }
    expect(state.level).toBe(24); expect(state.debt).toBe(0);
    expect(state.inventory['foreign-souvenir']).toBe(children);
  });
  it('fixes every static Chinese home-currency tens-of-fen clause but preserves true fen and shell units', () => {
    for (const row of catalog.scripts) expect(row.text.zh, row.id).not.toMatch(/[零一二三四五六七八九十百]+元[一二三四五六七八九]十分/);
    const text = (id: string) => catalog.scripts.find(row => row.id === id)!.text.zh;
    expect(text('legacy.school-list.body')).toContain('两元五角');
    expect(text('legacy.foreign-exchange.body')).toContain('两角');
    expect(text('legacy.travel-prices.body')).toContain('两元六角');
    expect(text('legacy.loan-interest.body')).toContain('四分');
    expect(text('legacy.bank-term.body')).toContain('六分利息');
    expect(text('legacy.action.read-exchange')).toContain('每贝币有一百分');
    for (const id of Object.keys(content.family)) {
      registered(familyText(id.slice('family.'.length)));
      expect(catalog.scripts.find(row => row.id === id)?.text.zh).not.toMatch(/[{}\d]/);
    }
  });
});
