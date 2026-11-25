export type LabelBox = { x: number; y: number; width: number };

export function stellarLabelBudget(level: number, width: number, height: number) {
  return level === 0 ? 0 : Math.min([0, 12, 30, 64][level], Math.max(4, Math.floor(width * height / [1, 36_000, 19_000, 10_000][level])));
}

export function labelFits(box: LabelBox, occupied: readonly LabelBox[], width: number, height: number) {
  return box.x >= 8 && box.x + box.width <= width - 8 && box.y >= 10 && box.y <= height - 10 &&
    !occupied.some(other => Math.abs(other.y - box.y) < 18 && box.x < other.x + other.width + 7 && box.x + box.width + 7 > other.x);
}
