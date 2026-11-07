import type { Lang } from './model';
import type { OutcomeChange } from './narration-guidance';
import { outcomeChangeText } from './narration-guidance';
import { escapeHtml as esc, copy, money } from './copy';
import { icon } from './art';
import { lifeText } from './life';
export type ReceiptChange = OutcomeChange & { physical?: boolean };
import { itemArtwork, moneyArtwork, presentationText } from './action-presentation';

export type ChangeSelection = { id: string; amount: number; picked: number[] };
export function denominations(cents: number): number[] {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100000) return [];
  const result: number[] = [];
  for (const value of [10000, 5000, 2000, 1000, 500, 100, 50, 10, 1]) {
    while (cents >= value) { result.push(value); cents -= value; }
  }
  return result;
}
export function toggleMoneyPiece(selection: ChangeSelection, index: number): ChangeSelection {
  if (!Number.isSafeInteger(index) || index < 0 || index >= denominations(selection.amount).length) return selection;
  return { ...selection, picked: selection.picked.includes(index) ? selection.picked.filter(i => i !== index) : [...selection.picked, index] };
}
export function pickedAmount(selection: ChangeSelection): number {
  return denominations(selection.amount).reduce((total, value, index) => total + (selection.picked.includes(index) ? value : 0), 0);
}
export function changeReady(selection: ChangeSelection): boolean {
  return Number.isSafeInteger(selection.amount) && selection.amount >= 0 && selection.amount <= 100000 && pickedAmount(selection) === selection.amount;
}
export function changeTray(selection: ChangeSelection, lang: Lang, childhood = false): string {
  const pieces = denominations(selection.amount), taken = pickedAmount(selection);
  const piece = (value: number, index: number) => `<button id="money-piece-${index}" data-money-piece="${index}" class="money-piece" aria-label="${esc(presentationText(selection.picked.includes(index) ? 'putBack' : 'takeMoney', lang))} ${money(value, lang)} ${copy(lang).yuan}" aria-pressed="${selection.picked.includes(index)}">${moneyArtwork(value, lang)}</button>`;
  return `<section class="change-tray" aria-label="${esc(presentationText('change', lang))}"><p class="tray-instruction">${esc(presentationText('pickCoins', lang))}</p><div class="money-counter"><div class="counter-side"><b>${esc(presentationText('counter', lang))}</b><div class="money-piece-grid">${pieces.map((value, index) => selection.picked.includes(index) ? '' : piece(value, index)).join('') || `<span class="empty-tray">${icon('check')}</span>`}</div></div><span class="tray-arrow">${icon('arrow')}</span><div class="counter-side receiving-pocket"><b>${icon('wallet')}${esc(presentationText('inHand', lang))}</b><div class="money-piece-grid">${pieces.map((value, index) => selection.picked.includes(index) ? piece(value, index) : '').join('')}</div><output id="picked-change" aria-live="polite">${money(taken, lang)} / ${money(selection.amount, lang)} ${copy(lang).yuan}</output></div></div><div class="purchase-controls"><button id="cancel-change" data-ui="cancel-change" class="secondary">${esc(presentationText('cancel', lang))}</button><button id="confirm-change" ${childhood ? 'data-childhood-action' : 'data-action'}="${esc(selection.id)}" class="primary" ${changeReady(selection) ? '' : 'disabled'}>${icon('wallet')}${esc(presentationText('collectMoney', lang))}</button></div></section>`;
}
export function transferReceipt(rows: ReceiptChange[], lang: Lang): string {
  if (!rows.length) return '';
  return `<section class="transfer-receipt" role="status" aria-label="${esc(presentationText('whatChanged', lang))}"><b>${icon('check')}${esc(presentationText('whatChanged', lang))}</b><div class="transfer-rows">${rows.map(row => { const physical = row.physical || row.item || row.label.zh === lifeText('ui.pocket').zh; return `<div class="transfer-row ${physical ? 'physical-transfer' : ''} ${row.value < 0 ? 'transfer-out' : 'transfer-in'}"><div class="transfer-picture" aria-hidden="true">${physical ? `<span class="transfer-home">${icon(row.item ? 'bag' : 'wallet')}</span><span class="transfer-object">${row.item ? itemArtwork(row.item) : icon('coin')}</span><span class="transfer-other">${icon('handshake')}</span>` : icon(row.money ? 'bank' : 'coin')}</div><span>${esc(outcomeChangeText(row, lang))}</span></div>`; }).join('')}</div></section>`;
}
