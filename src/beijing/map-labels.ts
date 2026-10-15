export interface MapPoint { x: number; y: number }
export interface LabelBox extends MapPoint { width: number; height: number }
export interface MapLabel extends LabelBox { id: string; priority: number }
export interface MapSegment { from: MapPoint; to: MapPoint }
export interface LabelPlacement { id: string; box: LabelBox }

export function boxesOverlap(a: LabelBox, b: LabelBox, gap = 3): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

export function segmentCrossesBox(segment: MapSegment, box: LabelBox, gap = 3): boolean {
  let near = 0, far = 1;
  for (const [start, delta, min, max] of [
    [segment.from.x, segment.to.x - segment.from.x, box.x - gap, box.x + box.width + gap],
    [segment.from.y, segment.to.y - segment.from.y, box.y - gap, box.y + box.height + gap],
  ]) {
    if (delta === 0) { if (start < min || start > max) return false; }
    else {
      const a = (min - start) / delta, b = (max - start) / delta;
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      if (near > far) return false;
    }
  }
  return true;
}

export function placeMapLabels(labels: MapLabel[], segments: MapSegment[], dots: MapPoint[], width: number, height: number): LabelPlacement[] {
  const placed: LabelPlacement[] = [];
  const sorted = [...labels].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  for (const label of sorted) {
    if (label.x < 0 || label.y < 0 || label.x > width || label.y > height || label.width > width - 8 || label.height > height - 8) continue;
    const candidates: LabelBox[] = [];
    for (const gap of label.priority < 2 ? [10, 26, 50, 82] : [10, 22]) {
      for (const [x, y] of [
        [label.x + gap, label.y - label.height / 2], [label.x - gap - label.width, label.y - label.height / 2],
        [label.x + gap, label.y - gap - label.height], [label.x - gap - label.width, label.y - gap - label.height],
        [label.x + gap, label.y + gap], [label.x - gap - label.width, label.y + gap],
        [label.x - label.width / 2, label.y - gap - label.height], [label.x - label.width / 2, label.y + gap],
      ]) candidates.push({ x, y, width: label.width, height: label.height });
    }
    const available = candidates.filter(box => box.x >= 4 && box.y >= 4 && box.x + box.width <= width - 4 && box.y + box.height <= height - 4 && !placed.some(other => boxesOverlap(box, other.box)));
    const obstruction = (box: LabelBox) => segments.filter(segment => segmentCrossesBox(segment, box)).length + dots.filter(dot => boxesOverlap(box, { ...dot, width: 0, height: 0 }, 5)).length * 2;
    let best: LabelBox | undefined, cost = Infinity;
    for (const box of available) {
      const score = obstruction(box);
      if (score < cost) { best = box; cost = score; }
      if (score === 0) break;
    }
    // Selected/current names stay available; ordinary labels wait for enough clear space.
    if (best && (cost === 0 || label.priority < 2)) placed.push({ id: label.id, box: best });
  }
  return placed;
}
