import { describe, expect, it, vi } from 'vitest';
import { CELEBRATION_MS, createRoundFeedback } from '../src/escalator/round-feedback';
import { routeIssues } from '../src/escalator/access';
import { issueText, problemMarkup, shopperLabel } from '../src/escalator/feedback';
import { advanceWave, createBoard, startWave, verifiedSolution, type Board, type Puzzle, type Wave } from '../src/escalator/model';
import { PUZZLES } from '../src/escalator/puzzles';
import { snapshot } from '../src/escalator/view';
import { copy, landingName, type Language } from '../src/escalator/locale';
import { experienceCopy } from '../src/escalator/experience-copy';

const p = PUZZLES[0], board = verifiedSolution(p);
const end = (puzzle: Puzzle = p, placed: Board = board) => advanceWave(startWave(puzzle, placed), 100);
const diagnostic: Puzzle = { ...p, lowCeilings: [{ x: .3, y: .2, w: .3, h: .4 }], requests: [
  { id: 'walking', start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, destination: 'cafe' },
  { id: 'wheelchair', start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, destination: 'books', wheelchair: true },
  { id: 'balloon', start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, destination: 'garden', balloon: true },
  { id: 'both', start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, destination: 'garden', wheelchair: true, balloon: true },
  { id: 'missing', start: { x: 0, y: 0 }, goal: { x: 2, y: 2 }, destination: 'cafe' },
] };
const short: Board = { ...createBoard(), pieces: [{ id: 'short', type: 'short', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } }] };

describe('once-per-round bounded celebration', () => {
  it('waits until every rider has arrived and the wave is settled, then emits exactly once', () => {
    const happy = vi.fn(), feedback = createRoundFeedback(happy), wave = startWave(p, board);
    expect(feedback.complete(wave, 100)).toBe(false);
    expect(feedback.complete({ ...end(), complete: false }, 100)).toBe(false);
    expect(happy).not.toHaveBeenCalled(); expect(feedback.celebrating(100)).toBe(false);
    expect(feedback.complete(end(), 100)).toBe(true); expect(happy).toHaveBeenCalledOnce();
    expect(feedback.complete(end(), 200)).toBe(false); expect(happy).toHaveBeenCalledOnce();
    expect(feedback.celebrating(99)).toBe(false); expect(feedback.celebrating(100)).toBe(true);
    expect(feedback.celebrating(100 + CELEBRATION_MS - 1)).toBe(true); expect(feedback.celebrating(100 + CELEBRATION_MS)).toBe(false);
  });
  it('does not celebrate empty, unfinished, failed or partially successful waves', () => {
    const partial = end(diagnostic, short);
    expect(partial.riders.some(rider => rider.path !== null)).toBe(true);
    const incompleteArrival: Wave = { ...end(), elapsed: 0 };
    for (const wave of [end(p, createBoard()), partial, incompleteArrival, { ...end(), riders: [] }]) {
      const happy = vi.fn(), feedback = createRoundFeedback(happy);
      expect(feedback.complete(wave, 0)).toBe(false); expect(feedback.celebrating(0)).toBe(false); expect(happy).not.toHaveBeenCalled();
    }
  });
  it('clears on hide without replaying a settled wave, but a genuinely new round may celebrate', () => {
    const happy = vi.fn(), feedback = createRoundFeedback(happy); feedback.complete(end(), 0); feedback.clear();
    expect(feedback.celebrating(1)).toBe(false); expect(feedback.complete(end(), 1)).toBe(false);
    feedback.begin(); expect(feedback.complete(end(), 4000)).toBe(true); expect(happy).toHaveBeenCalledTimes(2);
  });
  it('a native audio/callback error cannot suppress the visible success or replay it', () => {
    const happy = vi.fn(() => { throw Error('Native device failure'); }), feedback = createRoundFeedback(happy);
    expect(feedback.complete(end(), 0)).toBe(true); expect(feedback.celebrating(0)).toBe(true);
    expect(feedback.complete(end(), 1)).toBe(false); expect(happy).toHaveBeenCalledOnce();
  });
});

describe('actionable unhappy shoppers, not false in-progress failures', () => {
  it('distinguishes missing directed routes, steps, headroom and combined needs', () => {
    expect(diagnostic.requests.map(request => routeIssues(diagnostic, short.pieces, request))).toEqual([[], ['steps'], ['headroom'], ['steps', 'headroom'], ['missingRoute']]);
    const reversed = short.pieces.map(piece => ({ ...piece, a: piece.b, b: piece.a }));
    expect(routeIssues(diagnostic, reversed, diagnostic.requests[0])).toEqual(['missingRoute']);
    expect(routeIssues(diagnostic, [], diagnostic.requests[3])).toEqual(['missingRoute']);
  });
  it('does not show unhappy shoppers before a wave, or label valid travelling shoppers unhappy', () => {
    const before = snapshot(diagnostic, short, null, 'en', null, null, true, false, false);
    expect(before.riders.every(rider => !rider.stuck && !rider.arrived && rider.issues.length === 0)).toBe(true); expect(problemMarkup(before)).toBe('');
    const wave = advanceWave(startWave(diagnostic, short), .5);
    const travelling = snapshot(diagnostic, short, wave, 'en', null, null, false, true, false);
    expect(travelling.riders.find(rider => rider.requestId === 'walking')).toMatchObject({ arrived: false, stuck: false, issues: [] });
    expect(travelling.riders.filter(rider => rider.stuck)).toHaveLength(4);
    const problems = problemMarkup(travelling); expect(problems).not.toContain('data-request-issue="walking"'); expect(problems).toContain('data-request-issue="missing"');
  });
  it('keeps only unreachable riders unhappy after a failed partial wave, with frozen identity/reasons', () => {
    const view = snapshot(diagnostic, short, end(diagnostic, short), 'en', null, null, false, false, true);
    expect(view.riders.filter(rider => rider.arrived)).toHaveLength(3); expect(view.riders.filter(rider => rider.stuck)).toHaveLength(12);
    const blocked = view.riders.find(rider => rider.requestId === 'both')!;
    expect(blocked).toMatchObject({ start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, wheelchair: true, balloon: true, issues: ['steps', 'headroom'] });
    expect(Object.isFrozen(blocked.issues)).toBe(true); expect(Object.isFrozen(blocked.start)).toBe(true); expect(() => blocked.issues.push('missingRoute')).toThrow();
    expect(view.celebrating).toBe(false);
  });
  it.each(Object.keys(experienceCopy) as Language[])('%s identifies the affected destination, shopper, landings and reason during and after failure', language => {
    for (const wave of [startWave(diagnostic, short), end(diagnostic, short)]) {
      const view = snapshot(diagnostic, short, wave, language, null, null, false, !wave.complete, false), markup = problemMarkup(view), t = copy[language], x = experienceCopy[language];
      expect(markup).toContain(x.needsHelp); expect(markup).toContain(x.retryHelp);
      for (const request of diagnostic.requests.slice(1)) {
        expect(markup).toContain(`data-request-issue="${request.id}"`); expect(markup).toContain(t[request.destination]);
        expect(markup).toContain(`${landingName(request.start)} → ${landingName(request.goal)}`);
        expect(markup).toContain(issueText(language, routeIssues(diagnostic, short.pieces, request)));
      }
      const rider = view.riders.find(rider => rider.requestId === 'both')!;
      expect(shopperLabel(language, rider)).toContain(t.wheelchair); expect(shopperLabel(language, rider)).toContain(t.balloon);
    }
  });
  it('correction and retry clear failure indicators and carry the same celebration state to either renderer', () => {
    const failed = snapshot(p, createBoard(), end(p, createBoard()), 'en', null, null, false, false, false);
    expect(problemMarkup(failed)).not.toBe('');
    const feedback = createRoundFeedback(vi.fn()); feedback.complete(end(p, createBoard()), 0); feedback.begin(); feedback.complete(end(), 10);
    for (const reducedMotion of [false, true]) {
      const fixed = snapshot(p, board, end(), 'en', null, null, false, false, reducedMotion, feedback.celebrating(10));
      expect(fixed.celebrating).toBe(true); expect(Object.isFrozen(fixed)).toBe(true);
      expect(fixed.routes.every(route => route.ready && route.issues.length === 0)).toBe(true);
      expect(fixed.riders.every(rider => rider.arrived && !rider.stuck && rider.issues.length === 0)).toBe(true); expect(problemMarkup(fixed)).toBe('');
    }
  });
  it('a zero-length valid route is not diagnosed as missing', () => {
    const request = { ...diagnostic.requests[0], goal: diagnostic.requests[0].start, wheelchair: true, balloon: true };
    expect(routeIssues(diagnostic, [], request)).toEqual([]);
  });
});
