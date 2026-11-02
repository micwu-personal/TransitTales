import { describe, expect, it } from 'vitest';
import type { Language } from '../src/rush/locale';
import { destinationName, encounterText, epochName, epochText, factText, universeCopy } from '../src/universe/locale';
import { mapCopy, mapObjectName, mapScopeName } from '../src/universe/minimap-locale';
import { MAP_SCOPES } from '../src/universe/minimap';

const languages: Language[] = ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'];
const uiKeys = [
  'title', 'intro', 'home', 'language', 'atlas', 'earthGroup', 'solarGroup', 'starsGroup', 'galaxyGroup', 'deepGroup',
  'depart', 'travelling', 'pause', 'resume', 'epoch', 'timeMachine', 'timeNote', 'speed', 'speedNote', 'observerClock',
  'crewClock', 'shield', 'energy', 'research', 'friendship', 'journal', 'emptyJournal', 'encounter', 'choose', 'success',
  'retry', 'ready', 'arrived', 'music', 'musicOn', 'musicOff', 'volume', 'audioUnavailable', 'saved', 'saveUnavailable',
  'view2d', 'view3d', 'fallback', 'zoomIn', 'zoomOut', 'resetCamera', 'science', 'imagination', 'illustration', 'notFormed',
  'futureNote', 'lookback', 'localEpoch', 'distance', 'crew', 'crewLine', 'help', 'helpBody', 'close', 'resetJourney',
  'resetConfirm', 'confirmed', 'candidate', 'unknownSurface', 'safeBubble', 'completed', 'flightTime', 'pausedTab',
  'allDiscovered', 'destination', 'lightCone', 'simulationNote', 'sources', 'epochApply', 'betaLabel', 'gammaLabel',
  'dopplerLabel', 'formationNote', 'itinerary', 'routeGuide', 'routeAnchor', 'reconstruction', 'coordinateNote', 'coordinateEvidence',
] as const;
const destinationIds = [
  'earth', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'asteroids', 'comet',
  'kuiper', 'oort', 'proxima', 'proxima-b', 'nebula', 'cluster', 'neutron', 'stellar-hole', 'sagittarius', 'milky-way',
  'magellanic', 'andromeda', 'local-group', 'quasar', 'horizon', 'beyond',
];
const epochIds = ['bang', 'plasma', 'recombination', 'dark', 'first', 'quasar', 'present', 'future', 'far'];
const kinds = ['debris', 'radiation', 'gravity', 'signal'] as const;
const choiceIds = ['shield', 'detour', 'scan', 'rush', 'approach', 'listen', 'trade', 'compete'];
const scripts: Partial<Record<Language, RegExp>> = {
  'zh-CN': /[\u3400-\u9fff]/,
  ja: /[\u3040-\u30ff\u3400-\u9fff]/,
  'mn-Cyrl-MN': /[\u0400-\u04ff]/,
  'mn-Mong-CN': /[\u1820-\u18aa]/,
};
const slots = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

function expectTranslated(value: string, english: string, language: Language): void {
  expect(typeof value).toBe('string');
  expect(value.trim()).not.toBe('');
  expect(value).not.toMatch(/undefined|\[object Object\]/);
  expect(slots(value)).toEqual(slots(english));
  if (language !== 'en') {
    expect(value).not.toBe(english);
    expect(value).toMatch(scripts[language]!);
  }
  if (language === 'mn-Mong-CN') expect(value).not.toMatch(/[\u0400-\u04ff\u3400-\u9fff]/);
}

describe('Cosmic Transit localization', () => {
  it.each(languages)('translates map controls, nine scopes and additional catalogue anchors in %s', language => {
    const copy = mapCopy(language), english = mapCopy('en');
    const keys = ['title', 'scope', 'adaptive', 'nearby', 'earthMoon', 'solar', 'milkyWay', 'localGroup', 'virgo', 'laniakea', 'universe', 'radius', 'location', 'outside', 'plane', 'anchors', 'empty', 'span', 'unknown', 'note'];
    expect(Object.keys(copy).sort()).toEqual(keys.sort());
    for (const key of Object.keys(copy) as (keyof typeof copy)[]) expectTranslated(copy[key], english[key], language);
    for (const scope of MAP_SCOPES) expectTranslated(mapScopeName(scope, language), mapScopeName(scope, 'en'), language);
    for (const id of ['m33', 'smc', 'virgo-cluster', 'norma-cluster', 'centaurus-cluster', 'hydra-cluster']) {
      expectTranslated(mapObjectName(id, language), mapObjectName(id, 'en'), language);
      expect(mapObjectName(id, language)).not.toBe(universeCopy(language).destination);
    }
    expect(mapObjectName('earth', language)).toBe(destinationName('earth', language));
  });

  it.each(languages)('provides exactly the complete string-only UI shape in %s', language => {
    const copy = universeCopy(language);
    const english = universeCopy('en');
    expect(Object.keys(copy).sort()).toEqual([...uiKeys].sort());
    for (const key of uiKeys) expectTranslated(copy[key], english[key], language);
  });

  it.each(languages)('translates every destination name and scientific fact in %s', language => {
    for (const id of destinationIds) {
      const name = destinationName(id, language);
      expect(name).not.toBe(universeCopy(language).destination);
      expectTranslated(name, destinationName(id, 'en'), language);
      const fact = factText(id, language);
      expect(fact).not.toBe(universeCopy(language).science);
      expectTranslated(fact, factText(id, 'en'), language);
    }
    expect(destinationName('cluster', language)).toContain('47');
  });

  it.each(languages)('translates all cosmic era names and explanations in %s', language => {
    for (const id of epochIds) {
      const name = epochName(id, language);
      expect(name).not.toBe(universeCopy(language).epoch);
      expectTranslated(name, epochName(id, 'en'), language);
      const description = epochText(id, language);
      expect(description).not.toBe(universeCopy(language).formationNote);
      expectTranslated(description, epochText(id, 'en'), language);
    }
  });

  it.each(languages)('keeps all eight model choice IDs in every encounter in %s', language => {
    for (const kind of kinds) {
      const encounter = encounterText(kind, language);
      const english = encounterText(kind, 'en');
      expect(Object.keys(encounter).sort()).toEqual(['choices', 'prompt']);
      expectTranslated(encounter.prompt, english.prompt, language);
      expect(Object.keys(encounter.choices).sort()).toEqual([...choiceIds].sort());
      for (const id of choiceIds) expectTranslated(encounter.choices[id], english.choices[id], language);
    }
  });

  it('keeps scientific constraints separate from the fictional seven-second jumps', () => {
    const copy = universeCopy('en');
    expect(copy.timeNote).toMatch(/fiction.*7 game seconds.*not a real journey/);
    expect(copy.speedNote).toMatch(/β = v\/c.*below 1/);
    expect(copy.speedNote).toMatch(/inertial special relativity/);
    expect(copy.speedNote).toMatch(/separate from fictional jumps/);
    expect(copy.speedNote).toContain('no realistic general-relativity simulation');
    expect(copy.flightTime).toContain('not jump duration');
    expect(copy.illustration).toMatch(/false colors.*logarithmic.*not to scale/);
    expect(copy.notFormed).toMatch(/not formed.*future location, not the object/);
    expect(copy.formationNote).toMatch(/approximate.*before formation/);
    expect(copy.lookback).toContain('emission era');
    expect(copy.localEpoch).toContain('not the arriving ancient light');
    expect(copy.safeBubble).toMatch(/Fictional.*real radiation and gravity remain hazardous/);
    expect(copy.simulationNote).toMatch(/simplified physics.*not a navigation or general-relativity simulator/);
    expect(copy.futureNote).toMatch(/possible story branches.*not predictions/);
  });

  it('discloses unknown surfaces, inferred structures, false color, and observer-dependent horizons', () => {
    expect(factText('proxima-b', 'en')).toMatch(/confirmed planet.*surface, atmosphere, and habitability are unknown/);
    expect(factText('proxima-b', 'en')).toContain('no aliens are proved');
    expect(factText('oort', 'en')).toMatch(/inferred.*not directly observed.*not a photograph/);
    expect(factText('sagittarius', 'en')).toMatch(/accretion is dim, not quasar-bright/);
    expect(factText('sagittarius', 'en')).toMatch(/false color, not visible-eye appearance/);
    expect(factText('horizon', 'en')).toMatch(/depends on the observer/);
    expect(factText('horizon', 'en')).toMatch(/present radius.*46\.5 billion light-years.*cosmic expansion/);
    expect(factText('horizon', 'en')).toContain('not a physical edge');
    expect(factText('beyond', 'en')).toMatch(/unknown.*speculation, not evidence/);
    expect(factText('andromeda', 'en')).toMatch(/merger is uncertain.*not guaranteed.*speculative branches/);
    expect(factText('cluster', 'en')).toContain('globular star cluster');
  });

  it('distinguishes quasar light emission from the present local scene without relegating all quasars to the past', () => {
    const fact = factText('quasar', 'en');
    expect(fact).toMatch(/emission era, not the present local scene/);
    expect(fact).toMatch(/ancient bright phase, change era with the fictional time machine/);
    expect(fact).toMatch(/quasars also exist in more recent eras/);
    expect(epochText('quasar', 'en')).toMatch(/not confined to that era/);
    expect(epochText('quasar', 'en')).toContain('choose this past era');
    expect(epochText('plasma', 'en')).toMatch(/not formed.*future location/);
    expect(epochText('first', 'en')).toContain('Solar System did not yet exist');
    for (const id of ['bang', 'future', 'far']) expect(epochText(id, 'en')).toMatch(/uncertain/);
    expect(epochText('future', 'en')).toMatch(/speculative story branch.*not a guaranteed forecast/);
    expect(epochText('far', 'en')).toMatch(/speculation, not observation/);
  });

  it('uses original ordinary companions, original synthesized music, and recoverable friendly choices', () => {
    const copy = universeCopy('en');
    expect(copy.title).toContain('Milo & Pip');
    expect(copy.crewLine).toMatch(/Milo.*ordinary.*boy.*Pip.*ordinary cat/);
    expect(copy.crewLine).toContain('no gadgets or superpowers');
    expect(copy.musicOn).toContain('original synthesized electronic music');
    expect(copy.helpBody).toMatch(/original calm electronic synthesis.*no external recordings/);
    expect(copy.retry).toMatch(/Rest, recharge, and try another way/);
    const signal = encounterText('signal', 'en');
    expect(signal.prompt).toContain('no aliens are proved');
    expect(signal.choices.trade).toContain('Milo and Pip');
    expect(signal.choices.compete).toContain('friendly pattern challenge');
    expect(encounterText('radiation', 'en').prompt).toMatch(/Real radiation is hazardous.*not a real protection method/);
    expect(encounterText('gravity', 'en').prompt).toContain('not a general-relativity calculation');
  });

  it.each(languages)('handles absent and prototype-property IDs without leaking English or throwing in %s', language => {
    const copy = universeCopy(language);
    for (const id of ['', 'missing', 'constructor', '__proto__', 'toString']) {
      expect(destinationName(id, language)).toBe(copy.destination);
      expect(epochName(id, language)).toBe(copy.epoch);
      expect(factText(id, language)).toBe(copy.science);
      expect(epochText(id, language)).toBe(copy.formationNote);
    }
  });

  it('returns independent presentation objects so callers cannot overwrite future translations', () => {
    const copy = universeCopy('en');
    copy.title = 'changed';
    expect(universeCopy('en').title).toBe('Milo & Pip — Cosmic Transit');
    const encounter = encounterText('signal', 'en');
    encounter.prompt = 'changed';
    encounter.choices.listen = 'changed';
    expect(encounterText('signal', 'en').prompt).not.toBe('changed');
    expect(encounterText('signal', 'en').choices.listen).not.toBe('changed');
    expect(encounterText('debris', 'en').choices.listen).not.toBe('changed');
  });
});
