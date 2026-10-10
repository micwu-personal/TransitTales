/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import source from '../src/main.ts?raw';
import { BuildHistory, constructionCopies, constructionText, evaluate, kindNames, modeNames, type Mode, type Piece } from '../src/model';
import { copy, languageIndex } from '../src/escalator/locale';
import { PUZZLES } from '../src/escalator/puzzles';
import { advanceWave, startWave, verifiedSolution } from '../src/escalator/model';
import { snapshot } from '../src/escalator/view';
const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const piece = (kind: Piece['kind'], x = 0, y = 0): Piece => ({ id: `${kind}-${x}-${y}`, kind, x, y, z: 0, rotation: 0, color: '#ff6f61' });
describe('construction localization', () => {
  it('covers every translation and keeps template placeholders intact', () => {
    for (const [english, translations] of Object.entries(constructionCopies)) {
      expect(translations).toHaveLength(4);
      expect(translations[2]).toMatch(/[\u0400-\u04ff]/);
      expect(translations[3]).toMatch(/[\u1820-\u18aa]/);
      expect(translations[3]).not.toMatch(/[\u0400-\u04ff\u3400-\u9fff]/);
      for (const translation of translations) {
        expect(translation.trim()).not.toBe('');
        expect(slots(translation)).toEqual(slots(english));
      }
    }
    const markup = source.split('app.innerHTML = `')[1].split('`;')[0].replace(/<style>.*?<\/style>/s, '');
    const staticStrings = [...markup.matchAll(/>([^<>]+)</g), ...markup.matchAll(/(?:aria-label|title)="([^"]+)"/g)].map(m => m[1].trim());
    for (const english of staticStrings) {
      if (/[A-Za-z]/.test(english) && !english.includes('${') && !['English', '0 pieces', 'Level 1'].includes(english)) expect(constructionCopies, english).toHaveProperty(english);
    }
    for (const name of [...Object.values(kindNames), ...Object.values(modeNames)]) {
      expect(constructionText('ja', name)).not.toBe(name);
      expect(constructionText('zh-CN', name)).not.toBe(name);
      for (const language of ['mn-Cyrl-MN', 'mn-Mong-CN'] as const) expect(constructionText(language, name)).not.toBe(name);
    }
    expect(constructionText('ja', '{count} pieces', { count: 3 })).not.toMatch(/\{\w+\}|pieces/);
  });
  it('translates every evaluation branch without mutating pieces or undo history', () => {
    const cases: [Mode, Piece[]][] = [
      ['rescue', []], ['rescue', [-2,-1,0,1,2].map(x => piece('tile', x))],
      ['rescue', [...[-2,-1,0,1,2].map(x => piece('tile', x)), piece('pillar', 0, 2)]],
      ['park', []], ['park', [piece('wheel'), piece('habitat'), piece('path'), piece('path', 3)]],
      ['solar', []], ['solar', [piece('sun'), piece('planet'), piece('planet', 2), piece('moon'), piece('comet')]],
      ['parade', []], ['parade', [piece('body'), piece('head', 0, 1), piece('hat', 0, 2), piece('star')]],
      ['studio', []], ['studio', [piece('tile')]],
    ];
    for (const [mode, pieces] of cases) {
      const history = new BuildHistory(); history.set(pieces); history.set([]); history.undo();
      const before = JSON.stringify(history.pieces);
      const english = evaluate(mode, pieces);
      for (const language of ['ja', 'zh-CN', 'mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
        const localized = evaluate(mode, history.pieces, language);
        expect(localized.success).toBe(english.success);
        expect(localized.message).not.toBe(english.message);
        expect(localized.hint).not.toBe(english.hint);
        expect(JSON.stringify(history.pieces)).toBe(before);
        expect(history.canRedo).toBe(true);
      }
    }
  });
  it('refreshes presentation without rebuilding the scene, stopping playback or resetting history', () => {
    const refresh = source.slice(source.indexOf('function localize()'), source.indexOf("$<HTMLSelectElement>('construction-language').addEventListener"));
    expect(refresh).not.toMatch(/world\.|render\(|switchMode\(|history\s*=|testing\s*=/);
    expect(refresh).toContain('resultCopy');
    expect(refresh).toContain('toastCopy');
    expect(refresh).toContain('updateHint()');
  });
});
describe('Multilingual escalator presentation', () => {
  it('covers every UI key and all eight puzzle names and hints', () => {
    expect(Object.keys(copy.ja)).toEqual(Object.keys(copy.en));
    expect(Object.values(copy.ja).every(s => s.trim())).toBe(true);
    for (const language of ['mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
      expect(Object.keys(copy[language])).toEqual(Object.keys(copy.en));
      for (const [key, phrase] of Object.entries(copy[language])) {
        expect(phrase, key).not.toBe(copy.en[key as keyof typeof copy.en]);
        expect(slots(phrase)).toEqual(slots(copy.en[key as keyof typeof copy.en]));
        expect(phrase).toMatch(language === 'mn-Cyrl-MN' ? /[\u0400-\u04ff]/ : /[\u1820-\u18aa]/);
      }
    }
    expect(languageIndex('mn-Cyrl-MN')).toBe(3); expect(languageIndex('mn-Mong-CN')).toBe(4);
    expect(languageIndex('en')).toBe(0); expect(languageIndex('zh-CN')).toBe(1); expect(languageIndex('ja')).toBe(2);
    for (const puzzle of PUZZLES) {
      expect(puzzle.name).toHaveLength(5); expect(puzzle.hint).toHaveLength(5);
      expect(puzzle.name[2]).not.toBe(puzzle.name[0]); expect(puzzle.hint[2]).not.toBe(puzzle.hint[0]);
      for (const language of ['mn-Cyrl-MN', 'mn-Mong-CN'] as const) {
        const index = languageIndex(language);
        for (const phrases of [puzzle.name, puzzle.hint]) {
          expect(slots(phrases[index])).toEqual(slots(phrases[0]));
          expect(phrases[index]).toMatch(language === 'mn-Cyrl-MN' ? /[\u0400-\u04ff]/ : /[\u1820-\u18aa]/);
        }
      }
      const board = verifiedSolution(puzzle), wave = advanceWave(startWave(puzzle, board), 2);
      const before = JSON.stringify({ board, wave });
      for (const language of ['en', 'ja', 'zh-CN', 'mn-Cyrl-MN', 'mn-Mong-CN'] as const) snapshot(puzzle, board, wave, language, null, null, true, true, false);
      expect(JSON.stringify({ board, wave })).toBe(before);
    }
  });
});
