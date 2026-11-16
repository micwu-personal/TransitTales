import { act, getPrices, type GameState, type Result, type Text } from './model';
import { denominations } from './money-interaction';

export type Good = 'apple' | 'bread' | 'toy';
export type OpeningDraft = {
  basket: Partial<Record<Good, number>>;
  origin?: string;
  tender: number[];
  change: number[];
  plan: Good[];
  packets: Good[][];
};
export const GOODS: Good[] = ['apple', 'bread', 'toy'];
export function emptyOpening(): OpeningDraft {
  return { basket: {}, tender: [], change: [], plan: [], packets: [] };
}
export function openingBudget(state: GameState): number {
  return state.family.children * (state.level === 0 ? 100 : 250);
}
export function pursePieces(state: GameState): number[] {
  if (state.level === 2) return state.cash >= 500 ? [500] : [];
  const available = Math.max(0, Math.min(state.cash, openingBudget(state) - (state.flags.spent ?? 0)));
  const yuan = Math.floor(available / 100);
  const pieces = Array.from({ length: Math.max(0, yuan - 1) }, () => 100);
  return [...pieces, ...denominations(available % 100), ...Array.from({ length: yuan ? 10 : 0 }, () => 10)].sort((a, b) => b - a);
}
export function counterPieces(state: GameState): number[] {
  const pending = state.flags.pendingChange ?? 0;
  return pending === 380 ? [100, 100, 100, 50, 10, 10, 10, 10, 10] : pending === 80 ? [50, 10, 10, 10, 10] : [];
}
export function selectedTotal(pieces: number[], indices: number[]): number {
  return pieces.reduce((sum, value, index) => sum + (indices.includes(index) ? value : 0), 0);
}
export function togglePiece(indices: number[], index: number, pieces: number[]): number[] {
  if (!Number.isSafeInteger(index) || index < 0 || index >= pieces.length) return indices;
  return indices.includes(index) ? indices.filter(i => i !== index) : [...indices, index];
}
export function basketTotal(state: GameState, draft: OpeningDraft): number {
  return getPrices(state).reduce((sum, price) => sum + price.price * (draft.basket[price.id as Good] ?? 0), 0);
}
export function moveBasket(state: GameState, draft: OpeningDraft, item: Good, delta: 1 | -1): OpeningDraft {
  const price = getPrices(state).find(p => p.id === item);
  const current = draft.basket[item] ?? 0;
  const limit = state.level === 2 ? 1 : item === 'toy' ? price?.stock ?? 0 : Math.min(price?.stock ?? 0, state.family.children - (state.flags[`bought_${item}`] ?? 0));
  if (!price || !GOODS.includes(item) || current + delta < 0 || current + delta > limit) return draft;
  return { ...draft, origin: JSON.stringify(state), basket: { ...draft.basket, [item]: current + delta }, tender: [] };
}
export function movePacket(state: GameState, draft: OpeningDraft, item: Good, child: number, remove = false): OpeningDraft {
  const recipients = state.level === 2 ? 1 : state.family.children;
  const required = state.level === 0 ? ['apple'] : state.level === 1 ? ['apple', 'bread'] : ['bread'];
  if (!Number.isSafeInteger(child) || child < 0 || child >= recipients || !required.includes(item)) return draft;
  const packets = Array.from({ length: recipients }, (_, i) => [...(draft.packets[i] ?? [])]);
  const index = packets[child].indexOf(item);
  if (remove) {
    if (index < 0) return draft;
    packets[child].splice(index, 1);
  } else {
    if (index >= 0 || packets.flat().filter(g => g === item).length >= (state.inventory[item] ?? 0)) return draft;
    packets[child].push(item);
  }
  return { ...draft, packets };
}
export function packetsReady(state: GameState, draft: OpeningDraft): boolean {
  const recipients = state.level === 2 ? 1 : state.family.children;
  const required = state.level === 0 ? ['apple'] : state.level === 1 ? ['apple', 'bread'] : ['bread'];
  return draft.packets.length === recipients && draft.packets.every(packet => packet.length === required.length && required.every(item => packet.includes(item as Good))) && required.every(item => draft.packets.flat().filter(g => g === item).length <= (state.inventory[item] ?? 0));
}
const failure = (state: GameState, message: Text): Result => ({ state, ok: false, message });
const invalid = { zh: '这次操作没有完成，钱还在钱包里。请重新试试。', en: 'Nothing was paid. Please try again.' };
export function payOpening(state: GameState, draft: OpeningDraft, messages: { empty: Text; budget: Text; exact: Text }): Result {
  if (state.level > 2 || state.completed || state.level === 2 && state.flags.paid || draft.origin !== undefined && draft.origin !== JSON.stringify(state)) return failure(state, invalid);
  const prices = getPrices(state);
  if (Object.entries(draft.basket).some(([item, qty]) => !prices.some(p => p.id === item) || !Number.isSafeInteger(qty) || qty! < 0)) return failure(state, invalid);
  const total = basketTotal(state, draft);
  if (!total) return failure(state, messages.empty);
  if (draft.origin !== JSON.stringify(state)) return failure(state, invalid);
  const due = state.level === 2 ? 500 : total;
  if (selectedTotal(pursePieces(state), draft.tender) !== due) return failure(state, messages.exact);
  if (state.level < 2) {
    const required = state.level === 0 ? ['apple'] : ['apple', 'bread'];
    const stillNeeded = required.reduce((sum, item) => sum + Math.max(0, state.family.children - (state.flags[`bought_${item}`] ?? 0) - (draft.basket[item as Good] ?? 0)) * prices.find(p => p.id === item)!.price, 0);
    if ((state.flags.spent ?? 0) + total + stillNeeded > openingBudget(state)) return failure(state, messages.budget);
  }
  let next = state;
  if (!next.flags.tags && (state.level === 0 || state.level === 2)) {
    const prepared = act(next, state.level === 0 ? 'read-tags' : 'check-price');
    if (!prepared.ok) return failure(state, prepared.message);
    next = prepared.state;
  }
  if (state.level === 2) {
    if (draft.basket.bread !== 1 || (draft.basket.apple ?? 0) || (draft.basket.toy ?? 0)) return failure(state, invalid);
    const paid = act(next, 'pay-note');
    return paid.ok ? paid : failure(state, paid.message);
  }
  for (const item of GOODS) {
    const quantity = draft.basket[item] ?? 0;
    if (!quantity) continue;
    const result = act(next, `buy-${item}`, quantity);
    if (!result.ok) return failure(state, result.message);
    next = result.state;
  }
  return { state: next, ok: true, message: { zh: '买好了！东西进背包，钱付给店主。', en: 'Paid! Your purchases are in your bag.' } };
}
export function collectOpening(state: GameState, draft: OpeningDraft, wrong: Text): Result {
  if (state.level !== 2 || state.completed) return failure(state, invalid);
  const pending = state.flags.pendingChange ?? 0;
  const total = selectedTotal(counterPieces(state), draft.change);
  const id = pending === 380 && total === 380 ? 'collect-change' : pending === 380 && total === 300 ? 'leave-change' : pending === 80 && total === 80 ? 'collect-rest' : undefined;
  return id ? act(state, id) : failure(state, wrong);
}
export function deliverOpening(state: GameState, draft: OpeningDraft, incomplete: Text): Result {
  if (state.level > 2 || !packetsReady(state, draft)) return failure(state, incomplete);
  return act(state, ['share-apples', 'pack-lunch', 'deliver-bread'][state.level]);
}
