import { type GameState, type Lang, type Place, type Text, getPrices } from './model';
import { escapeHtml as esc, text, money, copy } from './copy';
import { icon, portrait } from './art';
import { itemArtwork, moneyArtwork, presentationText, salesUnitText } from './action-presentation';
import { itemText } from './legacy-localization';
import { transferReceipt, type ReceiptChange } from './money-interaction';
import { basketTotal, counterPieces, openingBudget, packetsReady, pursePieces, selectedTotal, GOODS, type Good, type OpeningDraft } from './opening-play';

const words = {
  basket: ['购物篮', 'Basket', '買い物かご', 'Сагс', 'ᠰᠠᠭᠰᠤ'],
  shelf: ['货架', 'Shelf', '棚', 'Тавиур', 'ᠲᠠᠪᠢᠭᠤᠷ'],
  purse: ['这次的零钱', 'Mission money', '今回のお金', 'Энэ удаагийн мөнгө', 'ᠡᠨᠡ ᠤᠳᠠᠭ᠎ᠠ ᠶᠢᠨ ᠮᠥᠩᠭᠥ'],
  tender: ['放到这里付款', 'Money to pay', '支払うお金', 'Төлөх мөнгө', 'ᠲᠥᠯᠦᠬᠦ ᠮᠥᠩᠭᠥ'],
  choose: ['拿进篮子，也能放回货架。', 'Pick goods. Put them back whenever you like.', 'かごに入れてみよう。棚に戻してもいいよ。', 'Бараагаа сагсанд хий. Хүсвэл буцааж тавь.', 'ᠪᠠᠷᠠᠭ᠎ᠠ ᠪᠠᠨ ᠰᠠᠭᠰᠤᠨ ᠳᠤ ᠬᠢᠭᠡᠭᠡᠷᠡᠢ᠃ ᠪᠤᠴᠠᠭᠠᠵᠤ ᠪᠠᠰᠠ ᠪᠣᠯᠣᠨ᠎ᠠ᠃'],
  payHint: ['凑好钱，再确认付款。钱也能放回去。', 'Build your payment, then confirm. Money can go back too.', 'お金をそろえてから支払いを確認。お金も戻せるよ。', 'Мөнгөө тоолоод төлбөрөө батлаарай. Буцааж тавьж болно.', 'ᠮᠥᠩᠭᠥ ᠪᠡᠨ ᠲᠣᠭᠠᠯᠠᠭᠠᠳ ᠲᠥᠯᠪᠦᠷᠢ ᠪᠡᠨ ᠪᠠᠲᠤᠯᠠᠭᠠᠷᠠᠢ᠃'],
  changeHint: ['店主多摆了几枚硬币。数清楚，别多拿，也别少拿。', 'A few extra coins are on the counter. Take just the right change.', '余分な硬貨もあるよ。多すぎず、少なすぎず、おつりを取ろう。', 'Лангуун дээр илүү зоос бий. Зөв хариултаа тоолж аваарай.', 'ᠯᠠᠩᠭᠤᠨ ᠳᠡᠭᠡᠷ᠎ᠡ ᠢᠯᠡᠭᠦᠦ ᠵᠣᠭᠣᠰ ᠪᠤᠢ᠃ ᠵᠥᠪ ᠬᠠᠷᠢᠭᠤᠯᠲᠠ ᠪᠠᠨ ᠲᠣᠭᠠᠯᠠᠵᠤ ᠠᠪᠤᠭᠠᠷᠠᠢ᠃'],
  packingHint: ['把食物放到每个位置。放错了也能拿回来。', 'Give each place its food. You can take it back and try again.', 'それぞれの場所に食べ物を入れよう。取り出してやり直せるよ。', 'Хүн бүрийн хоолыг тавиарай. Буцааж аваад дахин оролдож болно.', 'ᠬᠥᠮᠦᠨ ᠪᠦᠷᠢ ᠶᠢᠨ ᠬᠣᠭᠣᠯ ᠢ ᠲᠠᠯᠪᠢᠭᠠᠷᠠᠢ᠃ ᠪᠤᠴᠠᠭᠠᠵᠤ ᠠᠪᠴᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃'],
  dragHint: ['拖过去，或点选物品再点目标。', 'Drag, or pick an item and tap its destination.', 'ドラッグ、または品物と行き先をタップ。', 'Чирэх эсвэл бараа, очих газрыг товшино.', 'ᠴᠢᠷᠦᠬᠦ ᠪᠤᠶᠤ ᠪᠠᠷᠠᠭ᠎ᠠ ᠪᠠ ᠣᠴᠢᠬᠤ ᠭᠠᠵᠠᠷ ᠢ ᠲᠣᠪᠰᠢᠭᠠᠷᠠᠢ᠃'],
  plan: ['购物单', 'Shopping list', '買い物リスト', 'Худалдан авах жагсаалт', 'ᠬᠤᠳᠠᠯᠳᠤᠨ ᠠᠪᠬᠤ ᠵᠢᠭᠰᠠᠭᠠᠯᠲᠠ'],
  planHint: ['每人一份水果、一份面包。购物单上放哪两种？', 'Fruit and bread for everyone. Which two goods belong on your list?', 'みんなに果物とパン。リストに入れる二つはどれ？', 'Хүн бүрд жимс, талх авна. Жагсаалтад ямар хоёр бараа орох вэ?', 'ᠬᠥᠮᠦᠨ ᠪᠦᠷᠢ ᠳᠦ ᠵᠢᠮᠢᠰ ᠪᠠ ᠲᠠᠯᠬ᠎ᠠ ᠠᠪᠤᠨ᠎ᠠ᠃ ᠶᠠᠮᠠᠷ ᠬᠣᠶᠠᠷ ᠪᠠᠷᠠᠭ᠎ᠠ ᠬᠡᠷᠡᠭᠲᠡᠢ ᠪᠤᠢ᠃'],
  planWrong: ['午餐还需要水果和面包。玩具留到下次吧。', 'Lunch needs fruit and bread. Toys can wait.', 'お昼には果物とパン。おもちゃはまた今度。', 'Өдрийн хоолонд жимс, талх хэрэгтэй. Тоглоомыг дараа авъя.', 'ᠥᠳᠦᠷ ᠦᠨ ᠬᠣᠭᠣᠯ ᠳᠤ ᠵᠢᠮᠢᠰ ᠪᠠ ᠲᠠᠯᠬ᠎ᠠ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃'],
  empty: ['篮子还是空的。先拿点东西吧。', 'Your basket is empty. Pick some goods first.', 'かごが空だよ。まず品物を選ぼう。', 'Сагс хоосон байна. Эхлээд бараагаа сонго.', 'ᠰᠠᠭᠰᠤ ᠬᠣᠭᠣᠰᠣᠨ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠡᠬᠢᠯᠡᠵᠦ ᠪᠠᠷᠠᠭ᠎ᠠ ᠪᠠᠨ ᠰᠣᠩᠭᠣᠭᠠᠷᠠᠢ᠃'],
  budget: ['这样买，预算就不够买齐食物了。试着放回一些。', 'This leaves too little for the food you still need. Try putting something back.', 'これでは必要な食べ物をそろえられないよ。何か戻してみよう。', 'Үлдсэн хоолоо авах мөнгө хүрэхгүй. Заримыг нь буцааж тавья.', 'ᠦᠯᠡᠳᠡᠭᠰᠡᠨ ᠬᠣᠭᠣᠯ ᠢᠶᠠᠨ ᠠᠪᠬᠤ ᠮᠥᠩᠭᠥ ᠬᠦᠷᠦᠯᠴᠡᠬᠦ ᠦᠭᠡᠢ᠃'],
  exact: ['钱还没凑对。看看篮子的合计，再调一调。', 'Your payment does not match yet. Check the total and try again.', '金額がまだ合わないよ。合計を見て調整しよう。', 'Төлөх мөнгө таарахгүй байна. Нийт үнийг шалгаад дахин тоол.', 'ᠲᠥᠯᠦᠬᠦ ᠮᠥᠩᠭᠥ ᠲᠠᠭᠠᠷᠠᠬᠤ ᠦᠭᠡᠢ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠳᠠᠬᠢᠨ ᠲᠣᠭᠠᠯᠠᠭᠠᠷᠠᠢ᠃'],
  exactNote: ['这次用5元纸币付款，再自己数找零。', 'Pay with the ¥5 note, then count your change.', '今回は5元札で払って、おつりを数えよう。', 'Энэ удаа 5 юаниар төлөөд хариултаа тоолъё.', 'ᠡᠨᠡ ᠤᠳᠠᠭ᠎ᠠ 5 ᠶᠤᠸᠠᠨ ᠢᠶᠠᠷ ᠲᠥᠯᠦᠭᠡᠳ ᠬᠠᠷᠢᠭᠤᠯᠲᠠ ᠪᠠᠨ ᠲᠣᠭᠠᠯᠠᠶ᠎ᠠ᠃'],
  wrongChange: ['这份找零还不对。放回或补拿，再数一次。', 'That change is not right yet. Put some back or take more, then recount.', 'おつりがまだ合わないよ。戻すか足すかして、もう一度数えよう。', 'Хариулт таарахгүй байна. Нэмж эсвэл буцааж тавиад дахин тоол.', 'ᠬᠠᠷᠢᠭᠤᠯᠲᠠ ᠲᠠᠭᠠᠷᠠᠬᠤ ᠦᠭᠡᠢ᠃ ᠳᠠᠬᠢᠨ ᠲᠣᠭᠠᠯᠠᠭᠠᠷᠠᠢ᠃'],
  incomplete: ['还有位置没装好。看看空着的小图案。', 'Some food is still missing. Check the empty outlines.', 'まだ空いている場所があるよ。小さな形を見てね。', 'Зарим хоол дутуу байна. Хоосон дүрсийг хараарай.', 'ᠵᠠᠷᠢᠮ ᠬᠣᠭᠣᠯ ᠳᠤᠲᠠᠭᠤ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠬᠣᠭᠣᠰᠣᠨ ᠳᠦᠷᠰᠦ ᠶᠢ ᠦᠵᠡᠭᠡᠷᠡᠢ᠃'],
  paid: ['买好了！东西进背包，钱付给店主。', 'Paid! Your purchases are in your bag.', '買えたよ！品物はバッグへ、お金は店主へ。', 'Авчихлаа! Бараа цүнхэнд, мөнгө худалдагчид очлоо.', 'ᠠᠪᠴᠢᠬᠠᠯ᠎ᠠ᠃ ᠪᠠᠷᠠᠭ᠎ᠠ ᠴᠦᠩᠬᠡᠨ ᠳᠦ ᠣᠷᠣᠯ᠎ᠠ᠃'],
  remaining: ['预算还剩', 'Budget left', '残りの予算', 'Үлдсэн төсөв', 'ᠦᠯᠡᠳᠡᠭᠰᠡᠨ ᠲᠥᠰᠦᠪ'],
  changeDue: ['付出 − 面包价', 'Paid − bread price', '払った額 − パンの値段', 'Төлсөн мөнгө − талхны үнэ', 'ᠲᠥᠯᠦᠭᠰᠡᠨ ᠮᠥᠩᠭᠥ − ᠲᠠᠯᠬ᠎ᠠ ᠶᠢᠨ ᠦᠨ᠎ᠡ'],
  finish: ['送到了！', 'Delivered!', '届けたよ！', 'Хүргэлээ!', 'ᠬᠦᠷᠭᠡᠯ᠎ᠡ᠃'],
  deliver: ['分享食物', 'Share the food', '食べ物を分けよう', 'Хоолоо хуваалцах', 'ᠬᠣᠭᠣᠯ ᠢᠶᠠᠨ ᠬᠤᠪᠢᠶᠠᠯᠴᠠᠬᠤ'],
  lunch: ['装好午餐', 'Pack the lunches', 'お昼ごはんを詰める', 'Өдрийн хоолоо бэлдэх', 'ᠥᠳᠦᠷ ᠦᠨ ᠬᠣᠭᠣᠯ ᠢᠶᠠᠨ ᠪᠡᠯᠡᠳᠬᠡᠬᠦ'],
  breadDelivery: ['把面包交给同学', 'Give your friend the bread', '友だちにパンを渡す', 'Найздаа талхаа өгөх', 'ᠨᠠᠢᠵᠠ ᠳᠠᠭᠠᠨ ᠲᠠᠯᠬ᠎ᠠ ᠪᠠᠨ ᠥᠭᠬᠦ'],
  partial: ['先收好了3元，还有零钱没拿齐。', 'You collected ¥3. Some change is still missing.', '3元受け取ったよ。まだ残りのおつりがあるね。', '3 юань авлаа. Хариулт дутуу байна.', '3 ᠶᠤᠸᠠᠨ ᠠᠪᠤᠯ᠎ᠠ᠃ ᠬᠠᠷᠢᠭᠤᠯᠲᠠ ᠳᠤᠲᠠᠭᠤ ᠪᠠᠢᠨ᠎ᠠ᠃'],
} as const;
export type OpeningWord = keyof typeof words;
export function openingText(id: OpeningWord): Text {
  const row = words[id];
  return { zh: row[0], en: row[1], ja: row[2], mn: row[3], 'mn-Mong': row[4] };
}
export function openingPhase(state: GameState, place: Place): 'shop' | 'change' | 'pack' | 'plan' | 'travel' {
  if (state.level === 1 && place === 'home' && !state.flags.list) return 'plan';
  if (state.level === 2 && place === 'shop' && state.flags.pendingChange) return 'change';
  if (place === 'shop' && (state.level < 2 && (state.level === 0 || state.flags.list) || state.level === 2 && !state.flags.paid)) return 'shop';
  const destination = state.level === 0 ? 'home' : 'school';
  const ready = state.level === 0 ? state.flags.bought_apple === state.family.children : state.level === 1 ? state.flags.bought_apple === state.family.children && state.flags.bought_bread === state.family.children : Boolean(state.flags.change);
  return place === destination && ready ? 'pack' : 'travel';
}
export function openingDestination(state: GameState): Place {
  if (state.level === 1 && !state.flags.list) return 'home';
  const ready = state.level === 0 ? state.flags.bought_apple === state.family.children : state.level === 1 ? state.flags.bought_apple === state.family.children && state.flags.bought_bread === state.family.children : Boolean(state.flags.change);
  return ready ? state.level === 0 ? 'home' : 'school' : 'shop';
}
export function openingScene(state: GameState, lang: Lang, place: Place, draft: OpeningDraft, held: Good | undefined, feedback?: Text, ok = true, changes: ReceiptChange[] = []): string {
  const word = (id: OpeningWord) => esc(text(openingText(id), lang));
  const label = (id: Good) => esc(text(itemText(id), lang));
  const amount = (cents: number) => `${money(cents, lang)} <small>${copy(lang).yuan}</small>`;
  const phase = openingPhase(state, place), destination = openingDestination(state);
  const required: Good[] = state.level === 0 ? ['apple'] : state.level === 1 ? ['apple', 'bread'] : ['bread'];
  const recipients = state.level === 2 ? 1 : state.family.children;
  const token = (source: string, item: Good, content = itemArtwork(item), extra = '') => `<button id="opening-${source.replaceAll(':', '-')}-${item}" data-play-token="${source}:${item}" class="opening-object ${held === item && source === 'food' ? 'object-held' : ''}" aria-label="${label(item)} · ${source === 'shelf' || source === 'list' ? esc(presentationText('more', lang)) : source === 'food' ? esc(presentationText('choose', lang)) : esc(presentationText('less', lang))}" ${extra}>${content}</button>`;
  const checklist = `<div class="opening-needs" aria-label="${copy(lang).goal}">${required.map(item => `<span class="${(state.flags[`bought_${item}`] ?? 0) >= recipients ? 'need-done' : ''}">${itemArtwork(item)}<b>${state.level === 2 ? Number(Boolean(state.flags.paid)) : state.flags[`bought_${item}`] ?? 0}/${recipients}</b></span>`).join('')}</div>`;
  const coinTray = (pieces: number[], picked: number[], source: 'purse' | 'counter', destination: 'tender' | 'hand') => {
    const row = (selected: boolean) => pieces.map((value, i) => picked.includes(i) === selected ? `<button id="opening-coin-${i}" data-play-token="${selected ? destination : source}:${i}" class="opening-money" aria-pressed="${selected}" aria-label="${esc(presentationText(selected ? 'putBack' : 'takeMoney', lang))} ${money(value, lang)} ${copy(lang).yuan}">${moneyArtwork(value, lang)}</button>` : '').join('');
    return `<div class="opening-money-table"><section data-play-zone="${source}" class="opening-money-source"><h3>${source === 'counter' ? esc(presentationText('counter', lang)) : word('purse')}</h3><div class="opening-coins">${row(false)}</div></section><section data-play-zone="${destination}" class="opening-money-target"><h3>${destination === 'hand' ? esc(presentationText('inHand', lang)) : word('tender')}</h3><div class="opening-coins">${row(true)}</div><output id="opening-hand-total" aria-live="polite">${amount(selectedTotal(pieces, picked))}</output></section></div>`;
  };
  let play = '', hint = '', action = '';
  if (phase === 'shop') {
    const prices = getPrices(state).filter(price => state.level !== 2 || price.id === 'bread');
    const total = basketTotal(state, draft), left = openingBudget(state) - (state.flags.spent ?? 0) - total;
    const complete = required.every(item => (state.flags[`bought_${item}`] ?? 0) >= recipients);
    play = `<div class="opening-shop"><section class="opening-shelf" data-play-zone="shelf" aria-label="${word('shelf')}">${prices.map(price => {
      const item = price.id as Good, limit = state.level === 2 ? 1 : item === 'toy' ? price.stock : Math.min(price.stock, recipients - (state.flags[`bought_${item}`] ?? 0));
      return `<div class="opening-shelf-item">${token('shelf', item, itemArtwork(item), (draft.basket[item] ?? 0) >= limit || complete ? 'disabled' : '')}<div class="opening-price"><b>${label(item)}</b><strong>${amount(price.price)}</strong><small>${esc(salesUnitText(item, lang))}</small></div></div>`;
    }).join('')}</section><section class="opening-basket" data-play-zone="basket" aria-label="${word('basket')}"><h3>${word('basket')}</h3><div class="opening-basket-items">${GOODS.flatMap(item => Array.from({ length: draft.basket[item] ?? 0 }, (_, i) => token(`basket:${i}`, item))).join('') || `<span class="opening-empty">${icon('bag')}<span>${word('choose')}</span></span>`}</div><output id="opening-basket-total" aria-live="polite">${esc(presentationText('total', lang))} <b>${amount(total)}</b></output></section></div>`;
    if (!complete) {
      play += `<div class="opening-budget ${left < 0 ? 'budget-low' : ''}">${state.level === 2 ? `${word('changeDue')} <b>${amount(500)} − ${amount(120)}</b>` : `${word('remaining')} <b>${amount(left)}</b>`}</div>${coinTray(pursePieces(state), draft.tender, 'purse', 'tender')}`;
      hint = state.level === 2 ? word('exactNote') : draft.tender.length || total ? word('payHint') : word('choose');
      action = `<button id="opening-pay" data-play-command="pay" class="primary" ${!total || !draft.tender.length ? 'disabled' : ''}>${icon('wallet')}${esc(presentationText('confirm', lang))}${state.level === 2 ? ` · ${amount(500)}` : ''}</button>`;
    } else {
      hint = `${word('paid')} ${copy(lang).travel} · ${copy(lang).locations[destination]}`;
      action = `<button id="opening-go" data-place="${destination}" class="primary">${copy(lang).travel} · ${copy(lang).locations[destination]}${icon('arrow')}</button>`;
    }
  } else if (phase === 'change') {
    play = `<div class="opening-change-receipt">${itemArtwork('bread')}<div><small>${word('changeDue')}</small><b>${amount(500)} − ${amount(120)}${state.flags.pendingChange === 80 ? ` − ${amount(300)}` : ''} = ?</b></div></div>${coinTray(counterPieces(state), draft.change, 'counter', 'hand')}`;
    hint = word('changeHint');
    action = `<button id="opening-collect" data-play-command="collect" class="primary" ${!draft.change.length ? 'disabled' : ''}>${icon('wallet')}${esc(presentationText('collectMoney', lang))}</button>`;
  } else if (phase === 'plan') {
    play = `<div class="opening-list-desk"><section class="opening-list-goods" data-play-zone="list">${GOODS.map(item => `<div>${token('list', item, itemArtwork(item), draft.plan.includes(item) ? 'disabled' : '')}<b>${label(item)}</b></div>`).join('')}</section><section data-play-zone="plan" class="opening-plan"><h3>${word('plan')}</h3><div>${[0, 1].map(i => `<span>${draft.plan[i] ? token(`plan:${i}`, draft.plan[i]) : '<i>?</i>'}<b>× ${recipients}</b></span>`).join('')}</div></section></div>`;
    hint = word('planHint');
    action = `<button id="opening-plan-ready" data-play-command="plan" class="primary" ${draft.plan.length !== 2 ? 'disabled' : ''}>${copy(lang).travel} · ${copy(lang).locations.shop}${icon('arrow')}</button>`;
  } else if (phase === 'pack') {
    const remaining = (item: Good) => Math.max(0, recipients - draft.packets.flat().filter(g => g === item).length);
    play = `<section class="opening-food" data-play-zone="food">${required.map(item => `<div>${token('food', item, itemArtwork(item), `aria-pressed="${held === item}" ${!remaining(item) ? 'disabled' : ''}`)}<b>× ${remaining(item)}</b></div>`).join('')}</section><div class="opening-packets">${Array.from({ length: recipients }, (_, child) => `<section class="opening-packet ${state.level === 0 ? 'picnic-plate' : ''} ${required.every(item => draft.packets[child]?.includes(item)) ? 'packet-ready' : ''}" data-play-zone="packet:${child}"><div class="packet-person">${portrait(state.level === 2 ? 'friend' : child ? child % 2 ? 'boy' : 'girl' : state.family.gender)}<span>${child + 1}</span></div><button id="opening-packet-${child}" data-play-packet="${child}" class="packet-drop" ${!held ? 'disabled' : ''} aria-label="${copy(lang).locations[place]} ${child + 1} · ${held ? label(held) : word('packingHint')}">${required.map(item => `<span class="packet-outline ${draft.packets[child]?.includes(item) ? 'filled-outline' : ''}">${itemArtwork(item)}</span>`).join('')}</button><div class="packet-content">${(draft.packets[child] ?? []).map(item => token(`packet:${child}`, item)).join('')}</div></section>`).join('')}</div>`;
    hint = word('packingHint');
    action = `<button id="opening-deliver" data-play-command="deliver" class="primary" ${!packetsReady(state, draft) ? 'disabled' : ''}>${icon('heart')}${word(state.level === 0 ? 'deliver' : state.level === 1 ? 'lunch' : 'breadDelivery')}</button>`;
  } else {
    play = `<div class="opening-travel">${portrait(place === 'home' ? 'parent' : 'friend')}<div>${required.map(item => itemArtwork(item)).join('')}${icon('arrow')}${icon(destination === 'home' ? 'home' : destination === 'school' ? 'school' : 'bag')}</div></div>`;
    hint = `${copy(lang).travel} · ${copy(lang).locations[destination]}`;
    action = `<button id="opening-go" data-place="${destination}" class="primary">${hint}${icon('arrow')}</button>`;
  }
  return `<section class="conversation opening-scene" data-opening-phase="${phase}" aria-label="${copy(lang).locations[place]}"><header class="opening-scene-head"><h2>${icon(place === 'shop' ? 'bag' : place === 'home' ? 'home' : 'school')}${copy(lang).locations[place]}</h2>${checklist}</header><div class="opening-scroll">${feedback && ok ? transferReceipt(changes, lang) : ''}${play}</div><footer class="opening-cue"><div><p class="${feedback && !ok ? 'choice-error' : ''}">${feedback ? esc(text(feedback, lang)) : hint}</p>${phase !== 'travel' ? `<details><summary>${esc(presentationText('details', lang))}</summary><p>${hint}</p><small>${word('dragHint')}</small></details>` : ''}</div>${action}</footer></section>`;
}
