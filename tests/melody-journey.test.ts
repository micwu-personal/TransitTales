import { describe, expect, it } from 'vitest';
import { completesLesson, EAR_PITCHES as earPool, scoreForMidi as earScore, STUDIO_SCORE, LESSONS as lessons, readProgress, writeProgress, drawEarPitch as nextEarPitch, cloneScore } from '../src/melody/lessons';
const initialStudio = () => cloneScore(STUDIO_SCORE);
import { resolveScore, scoreIssues } from '../src/melody/model';
import { melodyCopy, lessonTitle, lessonExplanation } from '../src/melody/locale';
import { escapeText as escapeHtml, staffMarkup, staffNoteX } from '../src/melody/notation';
const scoreSvg = (score: Parameters<typeof staffMarkup>[0], interactive = false) => staffMarkup(score,'en',0,interactive);
import entry from '../melody.html?raw';
import config from '../vite.config.ts?raw';
import hub from '../src/hub/main.ts?raw';

const storage = () => {
  const values = new Map<string,string>();
  return { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => { values.set(key,value); } };
};

describe('Melody Train curriculum and saved compositions', () => {
  for (const lesson of lessons) {
    it(`${lesson.id} has complete valid bars and a correctable starting note`, () => {
      expect(scoreIssues(lesson.target)).toEqual([]);
      expect(scoreIssues(lesson.initial)).toEqual([]);
      expect(completesLesson(lesson.target,lesson)).toBe(true);
      expect(completesLesson(lesson.initial,lesson)).toBe(false);
      expect(lesson.initial.events.slice(1)).toEqual(lesson.target.events.slice(1));
      expect(completesLesson({...lesson.target,clef:lesson.target.clef === 'treble' ? 'bass' : 'treble'},lesson)).toBe(false);
    });
  }
  it('uses all four real clefs and real sharp/flat keys', () => {
    expect(new Set(lessons.map(l => l.target.clef))).toEqual(new Set(['treble','bass','alto','tenor']));
    expect(new Set(lessons.map(l => l.target.key))).toEqual(new Set(['C','G','F']));
    expect(scoreIssues(initialStudio())).toEqual([]);
  });
  it('does not repeat adjacent ear pitches and maps all chromatic C4–C5 answers', () => {
    expect(earPool).toEqual(Array.from({length:13},(_,i) => i+60));
    for (const previous of [null,...earPool]) for (const random of [0,.1,.5,.999999,1]) {
      const chosen = nextEarPitch(previous,() => random);
      expect(earPool).toContain(chosen);
      expect(chosen).not.toBe(previous);
    }
    for (const midi of earPool) expect(resolveScore(earScore(midi))[0].midi).toBe(midi);
  });
  it('preserves valid scores and known progress only', () => {
    const store = storage();
    const progress = { completed: ['first','sharp'] as const, ear:{attempts:4,correct:3},studio:lessons[8].target };
    expect(writeProgress(store,{...progress,completed:[...progress.completed]})).toBe(true);
    expect(readProgress(store)).toEqual(progress);
  });
  it('rejects malformed JSON, unsafe scores, and unbounded data', () => {
    for (const value of ['{', 'null','[]','"no"',JSON.stringify({...initialStudio(),events:Array(17).fill(initialStudio().events[0])}),JSON.stringify({...initialStudio(),clef:'fake'}),JSON.stringify({...initialStudio(),events:[{...initialStudio().events[0],octave:Infinity}]})]) {
      const store = {getItem: () => value};
      expect(readProgress(store).studio).toEqual(STUDIO_SCORE);
      expect(readProgress({getItem: () => JSON.stringify({studio:JSON.parse(value === '{' ? 'null' : value)})}).studio).toEqual(STUDIO_SCORE);
    }
    expect(readProgress({getItem: () => '{"completed":["first",42,"unknown","first"]}'}).completed).toEqual(['first']);
  });
  it('handles absent or blocked local storage without losing playability', () => {
    const blocked = {getItem: () => { throw Error('blocked'); },setItem: () => { throw Error('quota'); }};
    expect(readProgress().studio).toEqual(STUDIO_SCORE);
    expect(readProgress().completed).toEqual([]);
    expect(readProgress(blocked)).toEqual(readProgress());
    expect(writeProgress(blocked,readProgress())).toBe(false);
    expect(writeProgress(undefined,readProgress())).toBe(false);
  });
});

describe('Real score notation and integrated departure', () => {
  it('draws five staff lines with keyboard-operable named note targets', () => {
    const svg = scoreSvg(initialStudio(),true);
    expect(svg.match(/<path d="M25 /g)).toHaveLength(5);
    expect(svg).toContain('role="button" tabindex="0"');
    expect(svg).toContain('id="score-note-0"');
    expect(svg).toContain('class="score-cursor"');
    expect(svg).toContain('261.626 Hz');
    expect(staffNoteX(initialStudio(),1)).toBe(267);
  });
  it('keeps targets noninteractive and escapes user-facing labels', () => {
    const svg = scoreSvg(lessons[8].target);
    expect(svg).not.toContain('tabindex="0"');
    expect(svg).not.toContain('id="score-note-');
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
  it('renders all clefs, dots, rests, ledger lines, and written accidentals', () => {
    for (const lesson of lessons) expect(scoreSvg(lesson.target)).toContain('class="clef-symbol"');
    expect(scoreSvg(lessons[2].target)).toContain('Rest');
    expect(scoreSvg(lessons[8].target)).toContain('♯');
    expect(scoreSvg(lessons[8].target)).toContain('♮');
    expect(scoreSvg(lessons[10].target)).toContain('♭');
    expect(scoreSvg(lessons[11].target)).toContain('r="3"');
    expect(scoreSvg(initialStudio())).toContain('M168 190 H202');
  });
  it('has a production entry and an actually playable localized hub link', () => {
    expect(entry).toContain('/src/melody/main.ts');
    expect(config).toContain("'melody.html'");
    expect(hub).toContain('id="play-melody"');
    expect(hub).toContain('href="melody.html"');
  });
  it('provides complete UI and twelve lesson explanations in every supported language', () => {
    const english = melodyCopy('en');
    for (const language of ['en','zh-CN','ja','mn-Cyrl-MN','mn-Mong-CN'] as const) {
      const copy = melodyCopy(language);
      expect(Object.keys(copy)).toEqual(Object.keys(english));
      for (const value of Object.values(copy)) {
        if (typeof value === 'string') expect(value.trim().length).toBeGreaterThan(0);
      }
      for (const lesson of lessons) {
        expect(lessonTitle(language,lesson.id).trim().length).toBeGreaterThan(0);
        const text = lessonExplanation(language,lesson.id);
        expect(text.length).toBeGreaterThan(15);
        if (language === 'mn-Cyrl-MN') expect(text).toMatch(/[\u0400-\u04ff]/);
        if (language === 'mn-Mong-CN') { expect(text).toMatch(/[\u1820-\u18aa]/); expect(text).not.toMatch(/[\u0400-\u04ff]/); }
      }
    }
  });
});
