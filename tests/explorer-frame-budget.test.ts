import { describe, expect, it } from 'vitest';
import { FrameBudget } from '../src/explorer/frame-budget';

describe('Night Atlas frame budget', () => {
  it('ignores a one-off slow first render but notices persistent expensive draws', () => {
    const normal = new FrameBudget(), slow = new FrameBudget();
    for (const [i, work] of [50, 3, 4].entries()) normal.sample(i * 17, work, false);
    for (const [i, work] of [50, 3, 24].entries()) slow.sample(i * 17, work, false);
    expect(normal.warming).toBe(false);
    expect(normal.suggested).toBe(false);
    expect(slow.suggested).toBe(true);
  });

  it('notices sustained dropped frames without changing the motion preference itself', () => {
    const budget = new FrameBudget();
    for (let i = 1; i <= 17; i++) budget.sample(i * 33, 6, true);
    expect(budget.suggested).toBe(true);
  });

  it('ignores hidden-tab gaps and stops collecting after the first full animation', () => {
    const budget = new FrameBudget();
    for (let i = 1; i <= 6; i++) {
      budget.pause();
      budget.sample(i * 1000, 2, true);
    }
    for (let i = 1; i <= 17; i++) budget.sample(6000 + i * 17, 2, true);
    budget.finishAnimation();
    for (let i = 1; i <= 50; i++) budget.sample(8000 + i * 45, 20, true);
    expect(budget.suggested).toBe(false);
  });
});
