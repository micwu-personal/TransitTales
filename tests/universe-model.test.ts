import { describe, expect, it } from 'vitest';
import { DESTINATIONS, EPOCHS, type Epoch } from '../src/universe/catalog';
import { beginJump, canObserve, createJourney, dopplerFactor, encounterFor, lorentzFactor, readJourney, resolveEncounter, tickJourney, writeJourney, type JourneyState } from '../src/universe/model';

const destination = (id: string) => DESTINATIONS.find(item => item.id === id)!;
const epoch = (id: Epoch['id']) => EPOCHS.find(item => item.id === id)!;
const arrive = (id = 'earth', epochId: Epoch['id'] = 'present', state = createJourney()) => tickJourney(beginJump(state, id, epochId), 7);
function storage() {
  let raw: string | null = null;
  let key = '';
  return {
    getItem: (_key: string) => raw,
    setItem: (nextKey: string, value: string) => { key = nextKey; raw = value; },
    raw: () => raw!,
    key: () => key,
    corrupt: (value: string) => { raw = value; },
  };
}
function persisted(state: JourneyState) { return JSON.stringify({ version: 1, state }); }

describe('bounded educational universe catalog', () => {
  it('contains every required id exactly once, all scales, and valid bilingual metadata', () => {
    const required = 'earth moon sun mercury venus mars jupiter saturn uranus neptune asteroids comet kuiper oort proxima proxima-b nebula cluster neutron stellar-hole sagittarius milky-way magellanic andromeda local-group quasar horizon beyond'.split(' ');
    expect(DESTINATIONS.length).toBeGreaterThanOrEqual(28);
    expect(new Set(DESTINATIONS.map(item => item.id)).size).toBe(DESTINATIONS.length);
    expect(DESTINATIONS.map(item => item.id)).toEqual(expect.arrayContaining(required));
    expect(new Set(DESTINATIONS.map(item => item.group))).toEqual(new Set(['earth', 'solar', 'stars', 'galaxy', 'deep']));
    const kinds = 'earth moon sun rock gas ring ice comet belt triple nebula cluster neutron blackhole galaxy group quasar horizon beyond'.split(' ');
    for (const item of DESTINATIONS) {
      expect(kinds).toContain(item.kind);
      expect(['debris', 'radiation', 'gravity', 'signal']).toContain(item.hazard);
      expect(item.color).toMatch(/^#[\da-f]{6}$/i);
      for (const text of [item.name, item.nameZh, item.fact, item.factZh]) expect(text.length).toBeGreaterThan(0);
      for (const number of [item.distanceLy, item.lookbackGyr, item.formedGyr]) { expect(Number.isFinite(number)).toBe(true); expect(number).toBeGreaterThanOrEqual(0); }
      expect(item.formedGyr).toBeLessThanOrEqual(13.8);
    }
  });
  it('keeps present distances distinct from lookback times and unknown beyond observations', () => {
    expect(destination('horizon').distanceLy).toBe(46.5e9);
    expect(destination('horizon').lookbackGyr).toBeCloseTo(13.79962);
    expect(destination('quasar').lookbackGyr).toBe(12.8);
    expect(destination('quasar').distanceLy / 1e9).not.toBe(destination('quasar').lookbackGyr);
    expect(destination('proxima').lookbackGyr).toBeCloseTo(4.24 / 1e9, 15);
    expect(destination('beyond').fact).toMatch(/unobserved.*speculation/i);
  });
  it('states stellar hierarchy and confirmation without inventing observed surfaces', () => {
    expect(destination('proxima').kind).toBe('triple');
    expect(destination('proxima').fact).toMatch(/A and B.*close binary.*Proxima.*farther/i);
    expect(destination('proxima-b').fact).toMatch(/confirmed.*surface.*unknown.*imagination/i);
    expect(destination('oort').fact).toMatch(/inferred.*not.*imaged/i);
    expect(destination('sagittarius').fact).toMatch(/dim.*not.*active quasar.*stylized false color/i);
    expect(destination('andromeda').fact).toMatch(/possible, not guaranteed/i);
    expect(destination('magellanic').fact).toMatch(/gravitationally interact/i);
    expect(destination('stellar-hole').fact).toMatch(/inside.*event horizon.*not possible/i);
    expect(destination('cluster').fact).toMatch(/globular cluster.*12 billion/i);
    expect(canObserve(destination('cluster'), epoch('first'))).toBe(false);
    expect(canObserve(destination('cluster'), epoch('quasar'))).toBe(true);
  });
  it('uses renderer epoch ids, approximate ages, and marks speculative eras', () => {
    expect(EPOCHS.map(item => item.id)).toEqual(['bang', 'plasma', 'recombination', 'dark', 'first', 'quasar', 'present', 'future', 'far']);
    expect(EPOCHS.map(item => item.ageGyr)).toEqual([0, 1e-12, 0.00038, 0.05, 0.2, 2, 13.8, 18.8, 1000]);
    expect(epoch('bang').description).toMatch(/No established visualization.*spatially extended.*not an explosion at one point/i);
    for (const id of ['bang', 'future', 'far'] as const) expect(epoch(id).speculative).toBe(true);
    for (const item of EPOCHS) for (const text of [item.name, item.nameZh, item.description, item.descriptionZh]) expect(text).toBeTruthy();
    expect(Object.isFrozen(DESTINATIONS)).toBe(true);
    expect(Object.isFrozen(EPOCHS)).toBe(true);
  });
  it('never treats an object as formed before its formation age, including t=0', () => {
    for (const item of DESTINATIONS) {
      for (const era of EPOCHS) {
        if (era.ageGyr < item.formedGyr || era.ageGyr === 0 || item.id === 'beyond') expect(canObserve(item, era)).toBe(false);
      }
      if (item.id !== 'beyond') expect(canObserve(item, epoch('present'))).toBe(true);
    }
    expect(canObserve(destination('earth'), epoch('quasar'))).toBe(false);
    expect(canObserve(destination('milky-way'), epoch('first'))).toBe(false);
    expect(canObserve(destination('earth'), { ...epoch('present'), ageGyr: destination('earth').formedGyr })).toBe(true);
  });
});

describe('relativity and display-compressed travel', () => {
  it('starts ready with a sub-light beta, finite bounded resources, and independent arrays', () => {
    expect(createJourney()).toMatchObject({ destinationId: 'earth', epochId: 'present', beta: 0.65, phase: 'ready', progress: 0, elapsed: 0, properElapsed: 0 });
    expect(createJourney().visited).not.toBe(createJourney().visited);
    expect(lorentzFactor(0)).toBe(1);
    expect(lorentzFactor(0.6)).toBeCloseTo(1.25);
    expect(dopplerFactor(0)).toBe(1);
    expect(dopplerFactor(0.6)).toBeCloseTo(2);
    expect(lorentzFactor(0.9999)).toBeCloseTo(70.71244595);
    expect(dopplerFactor(0.9999)).toBeGreaterThan(100);
  });
  it.each([-1, -0.0001, 1, 0.99991, NaN, Infinity, -Infinity])('rejects invalid beta %s', beta => {
    expect(() => lorentzFactor(beta)).toThrow(RangeError);
    expect(() => dopplerFactor(beta)).toThrow(RangeError);
    expect(() => beginJump({ ...createJourney(), beta }, 'moon', 'present')).toThrow(RangeError);
  });
  it.each([-1, 60.01, NaN, Infinity, -Infinity])('rejects invalid tick %s even while paused', seconds => {
    expect(() => tickJourney({ ...createJourney(), paused: true }, seconds)).toThrow(RangeError);
  });
  it('validates ids and does not allow concurrent jumps, even while paused', () => {
    expect(() => beginJump(createJourney(), 'not-real', 'present')).toThrow(RangeError);
    expect(() => beginJump(createJourney(), 'earth', 'unknown' as Epoch['id'])).toThrow(RangeError);
    const flight = beginJump(createJourney(), 'moon', 'present');
    expect(beginJump(flight, 'sun', 'present')).toBe(flight);
    const paused = { ...flight, paused: true };
    expect(beginJump(paused, 'sun', 'present')).toBe(paused);
  });
  it('arrives in seven play seconds at the reference cruise, independent of physical distance; integrates proper elapsed', () => {
    let flight = beginJump({ ...createJourney(), beta: 0.65 }, 'horizon', 'present');
    flight = tickJourney(flight, 3);
    expect(flight.phase).toBe('travelling');
    expect(flight.progress).toBeCloseTo(3 / 7);
    expect(flight.elapsed).toBe(3);
    expect(flight.properElapsed).toBeCloseTo(3 * Math.sqrt(1 - .65 ** 2));
    flight = tickJourney(flight, 60);
    expect(flight.phase).toBe('encounter');
    expect(flight.progress).toBe(1);
    expect(flight.elapsed).toBe(7);
    expect(flight.properElapsed).toBeCloseTo(7 * Math.sqrt(1 - .65 ** 2));
    expect(flight.visited).toEqual(['horizon']);
    expect(tickJourney(flight, 7)).toBe(flight);
    expect(arrive('moon').elapsed).toBe(arrive('beyond').elapsed);
  });
  it('makes spatial cruise speed visible in progress, while time-only jumps can run at rest', () => {
    const slow = tickJourney(beginJump({ ...createJourney(), beta: .2 }, 'moon', 'present'), 2);
    const fast = tickJourney(beginJump({ ...createJourney(), beta: .8 }, 'moon', 'present'), 2);
    expect(fast.progress).toBeGreaterThan(slow.progress);
    const rest = beginJump({ ...createJourney(), beta: 0 }, 'moon', 'present');
    expect(tickJourney(rest, 2)).toBe(rest);
    const timeOnly = beginJump({ ...createJourney(), beta: 0 }, 'earth', 'bang');
    expect(tickJourney(timeOnly, 7).phase).toBe('encounter');
  });
  it('integrates varying beta per tick and preserves paused/zero/ready state', () => {
    const flight = beginJump(createJourney(), 'moon', 'present');
    expect(tickJourney(flight, 0)).toBe(flight);
    const paused = { ...flight, paused: true };
    expect(tickJourney(paused, 60)).toBe(paused);
    const ready = createJourney();
    expect(tickJourney(ready, 60)).toBe(ready);
    const first = tickJourney({ ...flight, beta: 0 }, 2);
    const second = tickJourney({ ...first, beta: 0.6 }, 5);
    expect(first.progress).toBe(0);
    expect(second.properElapsed).toBeCloseTo(4);
    expect(second.elapsed).toBe(5);
    expect(second.progress).toBeCloseTo(5 * .6 / .65 / 7);
  });
  it('does not mutate inputs or arrays and remains playable at the elapsed cap', () => {
    const original = createJourney();
    Object.freeze(original.visited); Object.freeze(original.completed); Object.freeze(original);
    const flight = beginJump(original, 'mars', 'present');
    const arrived = tickJourney(flight, 7);
    const completed = resolveEncounter(arrived, 'scan');
    expect(original.visited).toEqual([]);
    expect(flight.visited).toEqual([]);
    expect(arrived.completed).toEqual([]);
    expect(completed.completed).toEqual(['mars:present']);
    expect(tickJourney({ ...flight, elapsed: 1e9, properElapsed: 1e9 }, 7)).toMatchObject({ phase: 'encounter', elapsed: 1e9, properElapsed: 1e9 });
  });
});

describe('safe, temporal, deterministic encounters', () => {
  it('permits travel to an unformed object, but replaces its hazard with primordial radiation or gas', () => {
    for (const id of ['earth', 'neutron', 'stellar-hole', 'sagittarius', 'milky-way']) {
      const early = arrive(id, 'plasma');
      expect(early.phase).toBe('encounter');
      expect(encounterFor(early).kind).toBe('radiation');
      expect(encounterFor(early).prompt).toMatch(/has not formed.*primordial hot dense field/i);
      const gas = encounterFor(arrive(id, 'dark'));
      expect(gas.kind).toBe('debris');
      expect(gas.prompt).toMatch(/has not formed.*diffuse gas/i);
    }
    expect(encounterFor(arrive('earth', 'bang')).prompt).toMatch(/not a point explosion/);
    expect(encounterFor(arrive('sagittarius')).kind).toBe('gravity');
  });
  it('labels beyond, future, and every alien as speculation or fiction', () => {
    for (const era of EPOCHS) {
      const encounter = encounterFor(arrive('beyond', era.id));
      expect(encounter.kind).toBe('signal');
      expect(encounter.prompt).toMatch(/Unobserved.*imagination.*not detected life/i);
    }
    expect(encounterFor(arrive('earth', 'future')).prompt).toMatch(/speculative illustration.*not a prediction/i);
    expect(encounterFor(arrive('andromeda', 'far')).prompt).toMatch(/speculative illustration/i);
    expect(encounterFor(arrive('cluster')).prompt).toMatch(/fictional friendly alien/i);
  });
  it('uses only stable localized choice ids and distinct friendly nonviolent actions', () => {
    const allowed = ['shield', 'detour', 'scan', 'rush', 'approach', 'listen', 'trade', 'compete'];
    for (const item of DESTINATIONS) for (const era of EPOCHS) {
      const state = arrive(item.id, era.id);
      const encounter = encounterFor(state);
      expect(encounter).toEqual(encounterFor(state));
      expect(encounter.id).toBe(`${item.id}:${era.id}`);
      expect(encounter.promptZh).toBeTruthy();
      expect(encounter.choices.some(choice => choice.safe)).toBe(true);
      expect(encounter.choices.some(choice => !choice.safe)).toBe(true);
      for (const choice of encounter.choices) { expect(allowed).toContain(choice.id); expect(choice.labelZh).toBeTruthy(); }
    }
    const signal = arrive('proxima-b');
    for (const id of ['listen', 'trade', 'compete']) expect(resolveEncounter(signal, id)).toMatchObject({ choiceId: id, outcome: 'success', research: 10, friendship: 5 });
    expect(encounterFor(signal).choices.find(choice => choice.id === 'compete')!.label).toMatch(/nonviolent puzzle/);
  });
  it('rewards once per destination+epoch and preserves replay scores after reload', () => {
    const saved = storage();
    const first = resolveEncounter(arrive('proxima-b'), 'listen');
    expect(resolveEncounter(first, 'trade')).toBe(first);
    expect(writeJourney(saved, first)).toBe(true);
    const replay = resolveEncounter(arrive('proxima-b', 'present', readJourney(saved)), 'trade');
    expect(replay.research).toBe(10); expect(replay.friendship).toBe(5);
    expect(replay.completed).toEqual(['proxima-b:present']); expect(replay.visited).toEqual(['proxima-b']);
    const early = resolveEncounter(arrive('proxima-b', 'dark', replay), 'scan');
    expect(early.research).toBe(20); expect(early.friendship).toBe(5);
    expect(early.completed).toEqual(['proxima-b:present', 'proxima-b:dark']);
  });
  it('unsafe choices retry without killing, and safe choices work even after repeated mistakes', () => {
    let state = arrive('stellar-hole');
    for (let count = 0; count < 100; count++) state = resolveEncounter(state, 'rush');
    expect(state).toMatchObject({ phase: 'encounter', outcome: 'retry', shield: 20, research: 0, completed: [] });
    state = resolveEncounter(state, 'shield');
    expect(state).toMatchObject({ phase: 'encounter', outcome: 'success', research: 10 });
    const next = beginJump({ ...state, shield: 0, energy: 0 }, 'sun', 'present');
    expect(next.shield).toBeGreaterThanOrEqual(60); expect(next.energy).toBe(100);
    expect(next.outcome).toBeNull(); expect(next.choiceId).toBeNull();
  });
  it('keeps a resolved encounter phase and guarantees safe retry independently of beta or resources', () => {
    const arrival = arrive('moon', 'present', { ...createJourney(), beta: 0.999 });
    const unsafeId = encounterFor(arrival).choices.find(choice => !choice.safe)!.id;
    const retry = resolveEncounter(arrival, unsafeId);
    expect(retry).toMatchObject({ phase: 'encounter', outcome: 'retry', shield: 80, research: 0 });
    expect(retry.energy).toBeCloseTo(100 - 2 * 7 / 1.5);
    const saved = storage();
    expect(writeJourney(saved, retry)).toBe(true);
    for (const choice of encounterFor(retry).choices.filter(choice => choice.safe)) {
      const depleted = { ...readJourney(saved), shield: 0, energy: 0 };
      const success = resolveEncounter(depleted, choice.id);
      expect(success).toMatchObject({ phase: 'encounter', progress: 1, outcome: 'success', choiceId: choice.id, shield: 0, energy: 0, research: 10, completed: ['moon:present'] });
      expect(writeJourney(saved, success)).toBe(true);
      expect(readJourney(saved)).toEqual(success);
      expect(resolveEncounter(success, choice.id)).toBe(success);
      expect(writeJourney(saved, retry)).toBe(true);
    }
  });
  it('cannot resolve while travelling or paused and rejects unknown choices', () => {
    const flight = beginJump(createJourney(), 'earth', 'present');
    expect(resolveEncounter(flight, 'scan')).toBe(flight);
    const paused = { ...arrive(), paused: true };
    expect(resolveEncounter(paused, 'scan')).toBe(paused);
    expect(() => resolveEncounter(arrive(), 'invented')).toThrow(RangeError);
    expect(() => resolveEncounter(arrive(), 'listen')).toThrow(RangeError);
  });
  it('bounds scores and progress across completion of the entire catalog', () => {
    let state = createJourney();
    for (const item of DESTINATIONS) for (const era of EPOCHS) {
      state = arrive(item.id, era.id, state);
      state = resolveEncounter(state, encounterFor(state).choices.find(choice => choice.safe)!.id);
      for (const value of [state.shield, state.energy]) { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(100); }
      expect(state.progress).toBe(1);
    }
    expect(state.completed).toHaveLength(DESTINATIONS.length * EPOCHS.length);
    expect(state.visited).toHaveLength(DESTINATIONS.length);
    expect(state.research).toBe(state.completed.length * 10);
    const saved = storage(); expect(writeJourney(saved, state)).toBe(true);
    expect(readJourney(saved)).toEqual(state);
    expect(resolveEncounter(arrive('earth', 'present', state), 'scan').research).toBe(state.research);
  });
});

describe('strict versioned persistence', () => {
  it('roundtrips ready, retry, success and paused states; recovers interrupted travel paused', () => {
    const saved = storage();
    for (const state of [createJourney(), arrive(), resolveEncounter(arrive(), 'rush'), resolveEncounter(arrive(), 'scan'), { ...arrive(), paused: true }]) {
      expect(writeJourney(saved, state)).toBe(true); expect(readJourney(saved)).toEqual(state);
    }
    const flight = tickJourney(beginJump(createJourney(), 'sun', 'present'), 2);
    expect(writeJourney(saved, flight)).toBe(true);
    expect(saved.key()).toBe('universe-journey-v1');
    expect(JSON.parse(saved.raw()).version).toBe(1);
    const resumed = readJourney(saved);
    expect(resumed).toEqual({ ...flight, paused: true });
    expect(tickJourney(resumed, 60)).toBe(resumed);
    expect(tickJourney({ ...resumed, paused: false }, 5).phase).toBe('encounter');
  });
  it('handles absent/throwing/blocked storage, malformed JSON and unsupported versions safely', () => {
    expect(readJourney()).toEqual(createJourney());
    expect(readJourney({ getItem: () => { throw new Error('blocked'); } })).toEqual(createJourney());
    expect(writeJourney(undefined, createJourney())).toBe(false);
    expect(writeJourney({ setItem: () => { throw new Error('quota'); } }, createJourney())).toBe(false);
    for (const raw of ['', 'null', '[]', '{bad', '{}', JSON.stringify({ version: 2, state: createJourney() }), 'x'.repeat(40001)]) {
      expect(readJourney({ getItem: () => raw })).toEqual(createJourney());
    }
  });
  it.each([
    { beta: null }, { beta: 1 }, { beta: '0.65' }, { progress: -0.1 }, { progress: 1.1 },
    { elapsed: -1 }, { properElapsed: 1 }, { elapsed: 1e10 }, { shield: 101 }, { energy: -1 },
    { research: 10 }, { friendship: 5 }, { destinationId: '__proto__' }, { epochId: 'nope' },
    { phase: 'dead' }, { phase: ['ready'] }, { paused: 1 }, { choiceId: 'hack' }, { outcome: 'dead' },
    { visited: ['invalid'] }, { visited: ['earth', 1] }, { visited: 'earth' },
    { completed: ['earth:nope'] }, { completed: [null] }, { completed: ['earth:present'] },
    { visited: Array(DESTINATIONS.length + 1).fill('earth') }, { completed: Array(DESTINATIONS.length * EPOCHS.length + 1).fill('earth:present') },
    { phase: 'encounter', progress: 1 }, { phase: 'travelling', progress: 1 }, { progress: 0.1 },
    { choiceId: 'scan' }, { outcome: 'success' }, { extra: true },
  ])('rejects corrupted state %j', patch => {
    const state = { ...createJourney(), ...patch };
    expect(readJourney({ getItem: () => persisted(state as JourneyState) })).toEqual(createJourney());
    expect(writeJourney(storage(), state as JourneyState)).toBe(false);
  });
  it('rejects nonfinite JSON numbers and missing fields', () => {
    const raw = persisted(createJourney()).replace('"beta":0.65', '"beta":1e309');
    expect(readJourney({ getItem: () => raw })).toEqual(createJourney());
    const incomplete = { ...createJourney() } as Partial<JourneyState>; delete incomplete.energy;
    expect(readJourney({ getItem: () => persisted(incomplete as JourneyState) })).toEqual(createJourney());
  });
  it('deduplicates saved progress without multiplying scores or rewards', () => {
    const first = resolveEncounter(arrive('proxima-b'), 'listen');
    const duplicates = { ...first, visited: ['proxima-b', 'proxima-b'], completed: ['proxima-b:present', 'proxima-b:present'] };
    const loaded = readJourney({ getItem: () => persisted(duplicates) });
    expect(loaded).toEqual(first);
    expect(resolveEncounter(arrive('proxima-b', 'present', loaded), 'compete').research).toBe(10);
    expect(readJourney({ getItem: () => persisted({ ...duplicates, research: 20, friendship: 10 }) })).toEqual(createJourney());
  });
  it('rejects mismatched outcome/choice/completion and signal friendship accounting', () => {
    const success = resolveEncounter(arrive(), 'scan');
    for (const patch of [{ choiceId: 'rush' }, { choiceId: null }, { outcome: 'retry' }, { completed: [], research: 0 }, { friendship: 5 }]) {
      expect(readJourney({ getItem: () => persisted({ ...success, ...patch } as JourneyState) })).toEqual(createJourney());
    }
    const early = resolveEncounter(arrive('proxima-b', 'dark'), 'scan');
    expect(readJourney({ getItem: () => persisted({ ...early, friendship: 5 }) })).toEqual(createJourney());
  });
});
