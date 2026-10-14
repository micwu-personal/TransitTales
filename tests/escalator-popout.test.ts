import { describe, expect, it } from 'vitest';
import { popoutPosition } from '../src/escalator/info-popout';

describe('anchored shopper explanations', () => {
  const popup = { left: 0, top: 0, width: 320, height: 200 };
  it('opens below a top-of-screen access icon', () => {
    expect(popoutPosition({ left: 30, top: 70, width: 44, height: 44 }, popup, { left: 0, top: 0, width: 390, height: 844 })).toEqual({ left: 30, top: 122 });
  });
  it('opens above a shopping request near the bench', () => {
    expect(popoutPosition({ left: 12, top: 620, width: 150, height: 64 }, popup, { left: 0, top: 0, width: 390, height: 844 })).toEqual({ left: 12, top: 412 });
  });
  it('keeps right-column explanations inside the viewport', () => {
    expect(popoutPosition({ left: 1200, top: 160, width: 220, height: 64 }, popup, { left: 0, top: 0, width: 1440, height: 1100 })).toEqual({ left: 1112, top: 232 });
  });
  it('positions relative to the game rather than the document', () => {
    expect(popoutPosition({ left: 120, top: 240, width: 44, height: 44 }, popup, { left: 100, top: 200, width: 390, height: 844 })).toEqual({ left: 20, top: 92 });
  });
  it.each([{ left: -100, top: -100 }, { left: 2000, top: 2000 }, { left: 300, top: 120 }])('clamps both axes in a short viewport: %o', anchor => {
    const position = popoutPosition({ ...anchor, width: 44, height: 44 }, popup, { left: 0, top: 0, width: 390, height: 250 });
    expect(position.left).toBeGreaterThanOrEqual(8); expect(position.left + popup.width).toBeLessThanOrEqual(382);
    expect(position.top).toBeGreaterThanOrEqual(8); expect(position.top + popup.height).toBeLessThanOrEqual(242);
  });
});
