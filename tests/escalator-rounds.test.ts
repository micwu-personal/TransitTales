import { describe, expect, it } from 'vitest';
import {
  advanceWave, createBoard, key, placePiece, result, riderPosition, route, same, startWave,
  touchesZone, validatePiece, verifiedSolution, type Piece, type PieceType, type Puzzle,
} from '../src/escalator/model';
import { languageIndex } from '../src/escalator/locale';
import { PUZZLES } from '../src/escalator/puzzles';

const originalIds = ['first-notes', 'long-lunch', 'homeward', 'duet', 'everyone', 'courtyard', 'balloon', 'grand-finale'];
const newIds = ['rooftop-lanterns', 'step-free-home', 'atrium-chorus', 'ribbon-switchbacks', 'garden-labyrinth', 'sky-parade'];
const rounds = PUZZLES.slice(8, 14);
const languages = ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'] as const;
const scripts = [/[A-Za-z]/, /[\u4e00-\u9fff]/, /[\u3040-\u30ff]/, /[\u0400-\u04ff]/, /[\u1800-\u18af]/];
const piece = (type: PieceType, x: number, y: number, bx: number, by: number): Omit<Piece, 'id'> =>
  ({ type, a: { x, y }, b: { x: bx, y: by } });
const findRound = (id: string) => rounds.find(p => p.id === id)!;
const build = (puzzle: Puzzle, pieces: Puzzle['solution']) => {
  let board = createBoard();
  for (const p of pieces) {
    const placed = placePiece(puzzle, board, p);
    expect(placed.error, `${puzzle.id}: ${p.type} ${key(p.a)} → ${key(p.b)}`).toBeNull();
    board = placed.board;
  }
  return board;
};

describe('six new Escalator Orchestra rounds', () => {
  it('keeps the first expansion and original eight in place as the collection grows', () => {
    expect(PUZZLES).toHaveLength(20);
    expect(PUZZLES.slice(0, 8).map(p => p.id)).toEqual(originalIds);
    expect(rounds.map(p => p.id)).toEqual(newIds);
    expect(new Set(PUZZLES.map(p => p.id)).size).toBe(PUZZLES.length);
  });

  it.each(rounds.map(p => [p.id, p] as const))('%s has five authored names and useful hints in the correct scripts', (_id, p) => {
    expect(p.name).toHaveLength(5);
    expect(p.hint).toHaveLength(5);
    for (const language of languages) {
      const index = languageIndex(language);
      for (const text of [p.name[index], p.hint[index]]) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).toMatch(scripts[index]);
        expect(text).not.toContain('\uFFFD');
      }
      const labels = p.hint[index].match(/\b[A-G][1-4]\b/g) ?? [];
      expect(labels.length).toBeGreaterThanOrEqual(2);
      for (const label of labels) {
        const landing = { x: label.charCodeAt(0) - 65, y: Number(label[1]) - 1 };
        expect(p.landings.some(point => same(point, landing)), `${language}: ${label}`).toBe(true);
        expect(p.solution.some(q => same(q.a, landing) || same(q.b, landing)), `${language}: useful ${label}`).toBe(true);
      }
    }
    for (const text of [p.name[4], p.hint[4]]) {
      expect(text).toMatch(/[\u1820-\u18aa]/);
      expect(text).not.toMatch(/[\u0400-\u04ff]/);
    }
  });

  it.each(rounds.map(p => [p.id, p] as const))('%s fits exact piece geometry and inventory and delivers every rider', (_id, p) => {
    const board = verifiedSolution(p);
    const counts: Record<PieceType, number> = { short: 0, long: 0, bridge: 0, elevator: 0 };
    for (const q of board.pieces) {
      counts[q.type]++;
      const dx = Math.abs(q.b.x - q.a.x), dy = Math.abs(q.b.y - q.a.y);
      const dimensions = { short: [1, 1], long: [2, 1], bridge: [1, 0], elevator: [0, 1] };
      expect([dx, dy]).toEqual(dimensions[q.type]);
      expect(p.obstacles.some(zone => touchesZone(q, zone))).toBe(false);
    }
    for (const type of Object.keys(counts) as PieceType[]) {
      expect(Number.isInteger(p.inventory[type])).toBe(true);
      expect(p.inventory[type]).toBeGreaterThanOrEqual(counts[type]);
    }
    expect(Object.values(p.inventory).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(p.solution.length);
    for (const request of p.requests) {
      const path = route(p, board.pieces, request)!;
      expect(path.length).toBeGreaterThan(0);
      expect(path[0].a).toEqual(request.start);
      expect(path.at(-1)!.b).toEqual(request.goal);
      if (request.wheelchair) expect(path.every(q => q.type === 'elevator' || q.type === 'bridge')).toBe(true);
      if (request.balloon) expect(path.every(q => !p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(true);
    }
    const wave = startWave(p, board), finished = advanceWave(wave, wave.duration);
    expect(result(p, board, wave).success).toBe(false);
    expect(finished.complete).toBe(true);
    expect(finished.riders).toHaveLength(p.requests.length * 3);
    for (const rider of finished.riders) {
      expect(rider.path).not.toBeNull();
      expect(finished.elapsed).toBeGreaterThanOrEqual(rider.arrival);
      expect(riderPosition(rider, finished.elapsed)).toEqual(rider.request.goal);
    }
    expect(result(p, board, finished)).toMatchObject({ success: true, stars: 3, delivered: p.requests.length * 3, total: p.requests.length * 3 });
    const empty = createBoard();
    expect(result(p, empty, advanceWave(startWave(p, empty), 100))).toMatchObject({ success: false, delivered: 0 });
  });
});

describe('distinct directed journeys', () => {
  it('lets walkers use the lantern shortcut but sends balloons along a separate detour', () => {
    const p = findRound('rooftop-lanterns'), board = verifiedSolution(p);
    const walker = p.requests.find(request => !request.balloon)!;
    const balloon = p.requests.find(request => request.balloon)!;
    const walkingPath = route(p, board.pieces, walker)!, balloonPath = route(p, board.pieces, balloon)!;
    expect(walkingPath).toHaveLength(3);
    expect(balloonPath).toHaveLength(5);
    expect(walkingPath.some(q => p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(true);
    expect(balloonPath.some(q => p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(false);
    const shortcut = build(p, p.solution.slice(0, 3));
    expect(route(p, shortcut.pieces, walker)).not.toBeNull();
    expect(route(p, shortcut.pieces, balloon)).toBeNull();
    expect(walkingPath.at(-1)!.id).toBe(balloonPath.at(-1)!.id);
  });

  it('takes the accessible return down three floors with only elevators and bridges', () => {
    const p = findRound('step-free-home'), board = verifiedSolution(p), request = p.requests[0];
    expect(request.wheelchair).toBe(true);
    expect(request.start.y).toBe(3);
    expect(request.goal.y).toBe(0);
    const path = route(p, board.pieces, request)!;
    expect(path.filter(q => q.type === 'elevator')).toHaveLength(3);
    expect(path.every(q => q.type === 'bridge' || (q.type === 'elevator' && q.b.y === q.a.y - 1))).toBe(true);
    expect(route(p, board.pieces, { ...request, start: request.goal, goal: request.start })).toBeNull();
  });

  it('merges opposite entrances into D2 and splits to all three destinations', () => {
    const p = findRound('atrium-chorus'), board = verifiedSolution(p), center = { x: 3, y: 1 };
    expect(board.pieces.filter(q => same(q.b, center))).toHaveLength(2);
    expect(board.pieces.filter(q => same(q.a, center))).toHaveLength(3);
    expect(new Set(p.requests.map(request => request.destination))).toEqual(new Set(['cafe', 'books', 'garden']));
    const west = p.requests.find(request => request.id === 'west-cafe')!;
    const east = p.requests.find(request => request.id === 'east-cafe')!;
    const westPath = route(p, board.pieces, west)!, eastPath = route(p, board.pieces, east)!;
    expect(west.start.x).toBeLessThan(center.x);
    expect(east.start.x).toBeGreaterThan(center.x);
    expect(westPath.at(-1)!.id).toBe(eastPath.at(-1)!.id);
  });

  it('makes the ribbon route switch horizontally without crossings or an available straight ascent', () => {
    const p = findRound('ribbon-switchbacks'), board = verifiedSolution(p);
    const path = route(p, board.pieces, p.requests[0])!;
    expect(path.map(q => Math.sign(q.b.x - q.a.x))).toEqual([1, -1, -1, 1, 1, 1]);
    expect(path.every(q => q.b.y >= q.a.y)).toBe(true);
    expect(p.landings).toHaveLength(7);
    expect(validatePiece(p, createBoard(), piece('short',1,0,2,1))).toBe('clearance');
    expect(validatePiece(p, createBoard(), piece('long',1,0,3,1))).toBeNull();
    expect(validatePiece(p, createBoard(), piece('short',2,1,3,2))).toBe('landing');
  });

  it('winds above and below garden obstacles instead of treating them as walkable scenery', () => {
    const p = findRound('garden-labyrinth'), board = verifiedSolution(p);
    expect(p.obstacles).toHaveLength(3);
    const path = route(p, board.pieces, p.requests[0])!;
    expect(path.map(q => q.b.y - q.a.y)).toContain(-1);
    for (const shortcut of [piece('long',0,0,2,1), piece('bridge',1,1,2,1), piece('short',3,2,4,3)]) {
      expect(validatePiece(p, createBoard(), shortcut)).toBe('clearance');
    }
    expect(validatePiece(p, createBoard(), piece('elevator',3,2,3,1))).toBeNull();
  });

  it('requires the finale guest to satisfy wheelchair and balloon restrictions simultaneously', () => {
    const p = findRound('sky-parade'), board = verifiedSolution(p);
    const special = p.requests.find(request => request.wheelchair && request.balloon)!;
    expect(special).toBeDefined();
    const path = route(p, board.pieces, special)!;
    expect(path.every(q => q.type === 'elevator' || q.type === 'bridge')).toBe(true);
    expect(path.every(q => !p.lowCeilings.some(zone => touchesZone(q, zone)))).toBe(true);

    const lowLift = build(p, [piece('elevator',3,1,3,2)]);
    const underCanopy = { ...special, start: { x: 3, y: 1 }, goal: { x: 3, y: 2 } };
    expect(route(p, lowLift.pieces, { ...underCanopy, balloon: false })).not.toBeNull();
    expect(route(p, lowLift.pieces, underCanopy)).toBeNull();

    const clearEscalator = build(p, [piece('long',4,1,6,2)]);
    const stepRoute = { ...special, start: { x: 4, y: 1 }, goal: { x: 6, y: 2 } };
    expect(route(p, clearEscalator.pieces, { ...stepRoute, wheelchair: false })).not.toBeNull();
    expect(route(p, clearEscalator.pieces, stepRoute)).toBeNull();
  });
});
