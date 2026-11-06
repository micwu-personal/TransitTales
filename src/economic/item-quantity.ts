export function itemUnit(id: string): string {
  if (['book', 'shared-book'].includes(id)) return '本';
  if (['juice', 'park-juice'].includes(id)) return '杯';
  if (id === 'umbrella') return '把';
  if (id === 'coat') return '件';
  if (['ticket', 'bus', 'sticker', 'qr-sticker'].includes(id)) return '张';
  if (['supplies', 'kit'].includes(id)) return '套';
  if (['room', 'snack', 'card-snack'].includes(id)) return '份';
  return '个';
}
const unitIds: Record<string, string> = { 个: 'item', 本: 'book', 杯: 'cup', 把: 'handle', 件: 'garment', 张: 'sheet', 套: 'set', 份: 'portion' };
export const unitScript = (id: string): string => `ui.item-unit.${unitIds[itemUnit(id)]}`;
export const smallQuantityScript = (id: string, count: number): string | undefined => count === 1 || count === 2 ? `ui.item-count.${unitIds[itemUnit(id)]}.${count}` : undefined;
