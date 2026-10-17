import { describe, expect, it } from 'vitest';
import { advanceWave, createBoard, key, result, route, same, startWave, touchesZone, verifiedSolution, type PieceType, type Puzzle } from '../src/escalator/model';
import { copy as copies, languageIndex } from '../src/escalator/locale';
import { experienceCopy } from '../src/escalator/experience-copy';
import { PUZZLES } from '../src/escalator/puzzles';

const originalIds = ['first-notes','long-lunch','homeward','duet','everyone','courtyard','balloon','grand-finale','rooftop-lanterns','step-free-home','atrium-chorus','ribbon-switchbacks','garden-labyrinth','sky-parade'];
const creativeIds = ['one-way-gallery','borrowed-floor','ten-piece-town','three-kinds-of-sky','roof-reunion','low-roof-lullaby'];
const rounds = PUZZLES.slice(14, 20);
const languages = ['en','zh-CN','ja','mn-Cyrl-MN','mn-Mong-CN'] as const;
const scripts = [/[A-Za-z]/, /[\u4e00-\u9fff]/, /[\u3040-\u30ff]/, /[\u0400-\u04ff]/, /[\u1820-\u18aa]/];
const find = (id: string) => rounds.find(p => p.id === id)!;
const countInventory = (p: Puzzle) => Object.values(p.inventory).reduce((sum, n) => sum + n, 0);

function expectSharedBottleneck(p: Puzzle, from: string, to: string) {
  const board = verifiedSolution(p);
  const bottleneck = board.pieces.find(q => key(q.a) === from && key(q.b) === to)!;
  expect(bottleneck).toBeDefined();
  for (const request of p.requests) {
    expect(route(p, board.pieces, request)!.some(q => q.id === bottleneck.id)).toBe(true);
    expect(route(p, board.pieces.filter(q => q.id !== bottleneck.id), request)).toBeNull();
  }
}

describe('six creative rounds beyond the original fourteen', () => {
  it('preserves all fourteen existing round IDs and appends six distinct challenges', () => {
    expect(PUZZLES).toHaveLength(40);
    expect(PUZZLES.slice(0, 14).map(p => p.id)).toEqual(originalIds);
    expect(rounds.map(p => p.id)).toEqual(creativeIds);
    expect(new Set(PUZZLES.map(p => p.id)).size).toBe(40);
    expect(rounds.map(p => p.solution.length)).toEqual([6,7,10,10,12,12]);
  });

  it.each(rounds.map(p => [p.id,p] as const))('%s has localized names and actionable hints in all five scripts', (_id, p) => {
    expect(p.name).toHaveLength(5);
    expect(p.hint).toHaveLength(5);
    for (const language of languages) {
      const index = languageIndex(language);
      for (const text of [p.name[index],p.hint[index]]) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).toMatch(scripts[index]);
        expect(text).not.toContain('\uFFFD');
      }
      const labels = p.hint[index].match(/\b[A-G][1-4]\b/g) ?? [];
      expect(labels.length).toBeGreaterThanOrEqual(2);
      for (const label of labels) {
        const landing = { x:label.charCodeAt(0) - 65, y:Number(label[1]) - 1 };
        expect(p.landings.some(point => same(point, landing)), `${language}: ${label}`).toBe(true);
        expect(p.solution.some(q => same(q.a, landing) || same(q.b, landing))).toBe(true);
      }
    }
    expect(p.name[4] + p.hint[4]).not.toMatch(/[\u0400-\u04ff]/);
  });

  it.each(rounds.map(p => [p.id,p] as const))('%s has a legal, inventory-constrained reference solution delivering all riders with three stars', (_id, p) => {
    const board = verifiedSolution(p);
    const counts: Record<PieceType, number> = { short:0,long:0,bridge:0,elevator:0 };
    for (const q of board.pieces) {
      counts[q.type]++;
      expect(p.obstacles.some(zone => touchesZone(q, zone))).toBe(false);
    }
    expect(countInventory(p)).toBe(p.solution.length);
    expect(counts).toEqual(p.inventory);
    for (const request of p.requests) {
      const path = route(p, board.pieces, request)!;
      expect(path[0].a).toEqual(request.start);
      expect(path.at(-1)!.b).toEqual(request.goal);
      if (request.wheelchair) expect(path.every(q => q.type === 'elevator' || q.type === 'bridge')).toBe(true);
      if (request.balloon) expect(path.every(q => !p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(true);
    }
    const wave = startWave(p, board);
    const finished = advanceWave(wave, wave.duration);
    expect(result(p, board, finished)).toMatchObject({ success:true, stars:3, delivered:p.requests.length * 3, total:p.requests.length * 3 });
    let stepped = wave;
    for (let i = 0; i < 29; i++) stepped = advanceWave(stepped, wave.duration / 29);
    stepped = advanceWave(stepped, 0.001);
    expect(result(p, board, stepped)).toEqual(result(p, board, finished));
    const empty = createBoard();
    expect(result(p, empty, advanceWave(startWave(p, empty), 100))).toMatchObject({ success:false, delivered:0 });
  });

  it('keeps all experience copy keys and overrides consistent across languages', () => {
    for (const language of languages) {
      expect(Object.keys(experienceCopy[language])).toEqual(Object.keys(experienceCopy.en));
      expect(copies[language].footer).toBe(experienceCopy[language].footer);
      expect(copies[language].allDone).toBe(experienceCopy[language].allDone);
      expect(experienceCopy[language].musicNote).toMatch(scripts[languageIndex(language)]);
    }
    expect(experienceCopy.en.footer).toContain('twenty');
    expect(experienceCopy['zh-CN'].footer).toContain('二十');
    expect(experienceCopy.ja.footer).toContain('20');
    expect(experienceCopy['mn-Cyrl-MN'].footer).toContain('хорин');
    expect(experienceCopy['mn-Mong-CN'].footer).toContain('ᠬᠣᠷᠢᠨ');
  });
});

describe('new route mechanics using existing directed pieces', () => {
  it('uses a six-piece step-free loop for outward, returning, and mid-circuit trips', () => {
    const p = find('one-way-gallery'), board = verifiedSolution(p);
    expect(board.pieces.every(q => q.type === 'bridge' || q.type === 'elevator')).toBe(true);
    for (const landing of p.landings) {
      expect(board.pieces.filter(q => same(q.a, landing))).toHaveLength(1);
      expect(board.pieces.filter(q => same(q.b, landing))).toHaveLength(1);
    }
    const outward = p.requests[0], returning = p.requests[1];
    expect(outward.start).toEqual(returning.goal);
    expect(outward.goal).toEqual(returning.start);
    expect(route(p, board.pieces, outward)).toHaveLength(3);
    expect(route(p, board.pieces, returning)).toHaveLength(3);
    expect(route(p, board.pieces, p.requests[2])).toHaveLength(3);
  });

  it('borrows two upper floors for a same-floor trip around a solid courtyard', () => {
    const p = find('borrowed-floor'), board = verifiedSolution(p), request = p.requests[0];
    expect(request.start.y).toBe(request.goal.y);
    const path = route(p, board.pieces, request)!;
    expect(path.filter(q => q.b.y > q.a.y)).toHaveLength(2);
    expect(path.filter(q => q.b.y < q.a.y)).toHaveLength(2);
    expect(Math.max(...path.map(q => q.b.y))).toBe(2);
    expect(path).toHaveLength(7);
    expect(p.obstacles).toHaveLength(1);
  });

  it('fits three origins and three destinations into an exact ten-piece shared-lift budget', () => {
    const p = find('ten-piece-town'), board = verifiedSolution(p);
    expect(new Set(p.requests.map(q => key(q.start))).size).toBe(3);
    expect(new Set(p.requests.map(q => key(q.goal))).size).toBe(3);
    expect(p.inventory).toEqual({ short:0,long:1,bridge:6,elevator:3 });
    expectSharedBottleneck(p, '3,1', '3,2');
    for (const piece of board.pieces) {
      expect(p.requests.some(request => route(p, board.pieces.filter(q => q.id !== piece.id), request) === null)).toBe(true);
    }
  });

  it('splits a common origin into ordinary, balloon, and combined-access rooftop branches', () => {
    const p = find('three-kinds-of-sky'), board = verifiedSolution(p);
    expect(new Set(p.requests.map(q => key(q.start))).size).toBe(1);
    const [walker,balloon,combined] = p.requests;
    const paths = p.requests.map(q => route(p, board.pieces, q)!);
    expect(paths.map(path => path.length)).toEqual([3,3,4]);
    expect(paths[0].some(q => p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(true);
    expect(route(p, board.pieces, { ...walker, balloon:true })).toBeNull();
    expect(paths[1].some(q => q.type === 'long' || q.type === 'short')).toBe(true);
    expect(route(p, board.pieces, { ...balloon, wheelchair:true })).toBeNull();
    expect(combined).toMatchObject({ wheelchair:true, balloon:true });
    expect(paths[2].every(q => q.type === 'bridge' || q.type === 'elevator')).toBe(true);
    expect(new Set(paths.map(path => path[0].id)).size).toBe(3);
  });

  it('converges three roof origins on a descending trunk before splitting to ground stops', () => {
    const p = find('roof-reunion'), board = verifiedSolution(p);
    expect(new Set(p.requests.map(q => key(q.start))).size).toBe(3);
    expect(new Set(p.requests.map(q => key(q.goal))).size).toBe(3);
    expect(p.requests.every(q => q.start.y === 3 && q.goal.y === 0)).toBe(true);
    expect(board.pieces.every(q => q.b.y <= q.a.y)).toBe(true);
    expectSharedBottleneck(p, '3,2', '3,1');
  });

  it('gives combined-access balloons a low-floor dip while walkers use a sheltered shortcut', () => {
    const p = find('low-roof-lullaby'), board = verifiedSolution(p);
    const [combined,walker] = p.requests;
    const accessible = route(p, board.pieces, combined)!, shortcut = route(p, board.pieces, walker)!;
    expect(accessible).toHaveLength(11);
    expect(shortcut).toHaveLength(6);
    expect(accessible.map(q => q.b.y - q.a.y)).toContain(-1);
    expect(shortcut.some(q => q.type === 'long' && p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(true);
    expect(route(p, board.pieces, { ...walker, wheelchair:true, balloon:true })).toHaveLength(10);
    expect(accessible.every(q => !p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(true);
    expect(accessible.slice(0,3).map(q => q.id)).toEqual(shortcut.slice(0,3).map(q => q.id));
  });
});
