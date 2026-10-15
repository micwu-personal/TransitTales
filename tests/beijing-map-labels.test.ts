import { describe, expect, it } from 'vitest';
import { boxesOverlap, placeMapLabels, segmentCrossesBox, type MapLabel } from '../src/beijing/map-labels';

const label = (id: string, x: number, y: number, priority = 3): MapLabel => ({ id, x, y, width: 70, height: 25, priority });
describe('Screen-space subway map label layout', () => {
  it('keeps bilingual labels inside the viewport and separates dense station names', () => {
    const labels = Array.from({ length: 24 }, (_, i) => label(String(i), 180 + i % 6 * 7, 180 + Math.floor(i / 6) * 8));
    const placed = placeMapLabels(labels, [], labels, 400, 400);
    expect(placed.length).toBeGreaterThan(1); expect(placed.length).toBeLessThan(labels.length);
    for (const item of placed) {
      expect(item.box.x).toBeGreaterThanOrEqual(4); expect(item.box.y).toBeGreaterThanOrEqual(4);
      expect(item.box.x + item.box.width).toBeLessThanOrEqual(396);
      expect(item.box.y + item.box.height).toBeLessThanOrEqual(396);
      for (const other of placed) if (item !== other) expect(boxesOverlap(item.box, other.box)).toBe(false);
    }
  });
  it('prioritizes selected/current stations over interchange and ordinary names regardless of input order', () => {
    const labels = [label('ordinary', 160, 160, 4), label('transfer', 160, 160), label('current', 160, 160, 1), label('selected', 160, 160, 0)];
    const placed = placeMapLabels(labels, [], labels, 360, 360);
    expect(placed[0].id).toBe('selected'); expect(placed[1].id).toBe('current');
    expect(placed).toEqual(placeMapLabels([...labels].reverse(), [], labels, 360, 360));
  });
  it('places names away from track corridors and station markers instead of painting over the network', () => {
    const labels = [label('station', 120, 120)];
    const segments = [{ from: { x: 0, y: 120 }, to: { x: 400, y: 120 } }];
    const placed = placeMapLabels(labels, segments, labels, 400, 400);
    expect(placed).toHaveLength(1); expect(segmentCrossesBox(segments[0], placed[0].box)).toBe(false);
  });
  it('defers ordinary labels with no clear space but retains a selected station name', () => {
    const labels = [label('ordinary', 90, 90, 4), label('selected', 180, 180, 0)];
    const segments = Array.from({ length: 40 }, (_, i) => ({ from: { x: 0, y: i * 10 }, to: { x: 400, y: i * 10 } }));
    const placed = placeMapLabels(labels, segments, [], 400, 400);
    expect(placed.map(item => item.id)).toEqual(['selected']);
  });
  it('omits offscreen and impossibly wide labels without changing the inputs', () => {
    const labels = [label('left', -1, 100), label('bottom', 100, 401), { ...label('wide', 100, 100), width: 500 }];
    const before = structuredClone(labels); expect(placeMapLabels(labels, [], [], 400, 400)).toEqual([]); expect(labels).toEqual(before);
  });
  it('handles horizontal, vertical, diagonal, degenerate and distant track segments', () => {
    const box = { x: 10, y: 10, width: 20, height: 20 };
    for (const segment of [
      { from: { x: 0, y: 20 }, to: { x: 40, y: 20 } },
      { from: { x: 20, y: 0 }, to: { x: 20, y: 40 } },
      { from: { x: 0, y: 0 }, to: { x: 40, y: 40 } },
      { from: { x: 20, y: 20 }, to: { x: 20, y: 20 } },
    ]) expect(segmentCrossesBox(segment, box)).toBe(true);
    expect(segmentCrossesBox({ from: { x: 0, y: 0 }, to: { x: 5, y: 0 } }, box)).toBe(false);
    expect(segmentCrossesBox({ from: { x: 0, y: 40 }, to: { x: 40, y: 40 } }, box)).toBe(false);
  });
});
