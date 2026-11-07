import type { Lang, Offer } from './model';
import { itemUnit } from './item-quantity';
import { icon } from './art';

// Chinese is the authored source; the other rows adapt its intent, not its syntax.
const labels = {
  observe: ['先看一看', 'Look first', 'まず確認', 'Эхлээд ажиглая', 'ᠡᠬᠢᠯᠡᠵᠦ ᠠᠵᠢᠭᠯᠠᠶ᠎ᠠ'],
  choose: ['选东西', 'Choose goods', '品物を選ぶ', 'Бараагаа сонгоё', 'ᠪᠠᠷᠠᠭ᠎ᠠ ᠪᠠᠨ ᠰᠣᠩᠭᠣᠶ᠎ᠠ'],
  confirm: ['确认付款', 'Confirm payment', '支払いを確認', 'Төлбөрөө баталъя', 'ᠲᠥᠯᠦᠪᠦᠷᠢ ᠪᠡᠨ ᠪᠠᠲᠤᠯᠠᠶ᠎ᠠ'],
  confirmChoice: ['确认这次选择', 'Confirm this choice', 'この選択を確認', 'Сонголтоо батлах', 'ᠰᠣᠩᠭᠣᠯᠲᠠ ᠪᠠᠨ ᠪᠠᠲᠤᠯᠠᠬᠤ'],
  change: ['核对找零', 'Check your change', 'おつりを確かめる', 'Хариултаа шалгая', 'ᠬᠠᠷᠢᠭᠤᠯᠲᠠ ᠪᠠᠨ ᠰᠢᠯᠭᠠᠶ᠎ᠠ'],
  work: ['动手做一做', 'Give it a try', 'やってみよう', 'Хийж үзье', 'ᠬᠢᠵᠦ ᠦᠵᠡᠶ᠎ᠡ'],
  money: ['安排这笔钱', 'Manage this money', 'お金を動かす', 'Мөнгөө зохицуулъя', 'ᠮᠥᠩᠭᠥ ᠪᠡᠨ ᠵᠣᠬᠢᠴᠠᠭᠤᠯᠤᠶ᠎ᠠ'],
  finish: ['把事情办好', 'Finish the mission', '最後までやろう', 'Даалгавраа дуусгая', 'ᠳᠠᠰᠬᠠᠯ ᠢᠶᠠᠨ ᠳᠠᠭᠤᠰᠬᠠᠶ᠎ᠠ'],
  current: ['现在做什么', 'What to do now', '今すること', 'Одоо юу хийх вэ', 'ᠣᠳᠣᠣ ᠶᠠᠭᠤ ᠬᠢᠬᠦ ᠪᠤᠢ'],
  details: ['看看说明', 'See guidance', '説明を見る', 'Тайлбар харах', 'ᠲᠠᠢᠯᠪᠤᠷᠢ ᠦᠵᠡᠬᠦ'],
  cancel: ['取消选择', 'Clear selection', '選択を取り消す', 'Сонголт цуцлах', 'ᠰᠣᠩᠭᠣᠯᠲᠠ ᠴᠤᠴᠠᠯᠠᠬᠤ'],
  total: ['合计', 'Total', '合計', 'Нийт', 'ᠨᠡᠶᠢᠲᠡ'],
  quantity: ['数量', 'Quantity', '個数', 'Тоо ширхэг', 'ᠲᠣᠭ᠎ᠠ'],
  less: ['少一个', 'One fewer', '一つ減らす', 'Нэгээр цөөлөх', 'ᠨᠢᠭᠡ ᠪᠡᠷ ᠬᠣᠷᠣᠭᠳᠤᠭᠤᠯᠬᠤ'],
  more: ['多一个', 'One more', '一つ増やす', 'Нэгээр нэмэх', 'ᠨᠢᠭᠡ ᠪᠡᠷ ᠨᠡᠮᠡᠬᠦ'],
  selectHint: ['先选一种东西，再选数量。确认付款前都可以改。', 'Choose an item and quantity. Nothing is paid until you confirm.', '品物と個数を選ぼう。支払いの確認までは変更できるよ。', 'Бараа, тоогоо сонгоорой. Батлах хүртэл төлбөр хийгдэхгүй.', 'ᠪᠠᠷᠠᠭ᠎ᠠ ᠪᠣᠯᠣᠨ ᠲᠣᠭ᠎ᠠ ᠪᠠᠨ ᠰᠣᠩᠭᠣᠭᠠᠷᠠᠢ᠃ ᠪᠠᠲᠤᠯᠠᠬᠤ ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠲᠥᠯᠪᠦᠷᠢ ᠬᠢᠬᠦ ᠦᠭᠡᠢ᠃'],
  counter: ['柜台', 'Counter', 'カウンター', 'Лангуу', 'ᠯᠠᠩᠭᠤᠤ'],
  inHand: ['手里拿着', 'In your hand', '手に取ったお金', 'Гартаа авсан', 'ᠭᠠᠷ ᠲᠠᠭᠠᠨ ᠠᠪᠤᠭᠰᠠᠨ'],
  pickCoins: ['点一点柜台上的钱，拿到手里。点手里的钱可以放回去，数好后再收进钱包。', 'Tap money to pick it up. Tap it again to put it back. Count it, then collect it.', 'お金をタップして手に取ろう。もう一度タップすると戻せるよ。数えてから財布へ。', 'Мөнгийг товшиж аваарай. Дахин товшвол буцаана. Тоолоод хэтэвчиндээ хийгээрэй.', 'ᠮᠥᠩᠭᠥ ᠶᠢ ᠲᠣᠪᠰᠢᠵᠦ ᠠᠪᠤᠭᠠᠷᠠᠢ᠃ ᠳᠠᠬᠢᠨ ᠲᠣᠪᠰᠢᠪᠠᠯ ᠪᠤᠴᠠᠭᠠᠨ᠎ᠠ᠃ ᠲᠣᠭᠠᠯᠠᠭᠠᠳ ᠬᠡᠲᠡᠪᠴᠢ ᠳᠡᠭᠡᠨ ᠬᠢᠭᠡᠭᠡᠷᠡᠢ᠃'],
  takeMoney: ['拿起', 'Pick up', '手に取る', 'Авах', 'ᠠᠪᠬᠤ'],
  putBack: ['放回柜台', 'Put back', 'カウンターに戻す', 'Буцааж тавих', 'ᠪᠤᠴᠠᠭᠠᠵᠤ ᠲᠠᠯᠪᠢᠬᠤ'],
  collectMoney: ['收进钱包', 'Collect into wallet', '財布に入れる', 'Хэтэвчиндээ хийх', 'ᠬᠡᠲᠡᠪᠴᠢ ᠳᠡᠭᠡᠨ ᠬᠢᠬᠦ'],
  whatChanged: ['刚才发生了什么', 'What just happened', '今どう変わった？', 'Юу өөрчлөгдсөн бэ', 'ᠶᠠᠭᠤ ᠥᠭᠡᠷᠴᠢᠯᠡᠭᠳᠡᠪᠡ'],
  oneChoice: ['这几种做法，选一种就好。', 'Choose one of these options.', 'この中から一つ選ぼう。', 'Эдгээрээс нэгийг сонгоорой.', 'ᠡᠳᠡᠭᠡᠷ ᠡᠴᠡ ᠨᠢᠭᠡ ᠶᠢ ᠰᠣᠩᠭᠣᠭᠠᠷᠠᠢ᠃'],
} as const;
export function presentationText(id: keyof typeof labels, lang: Lang): string {
  return labels[id][(['zh', 'en', 'ja', 'mn', 'mn-Mong'] as const).indexOf(lang)];
}
const actionNames: Record<string, readonly string[]> = {
  'read-tags': ['看价签', 'Check price tags', '値札を見る', 'Үнийн шошго харах', 'ᠦᠨ᠎ᠡ ᠶᠢᠨ ᠱᠣᠰᠢᠭ᠎ᠠ ᠦᠵᠡᠬᠦ'],
  'make-list': ['写购物单', 'Make a shopping list', '買い物リストを書く', 'Худалдан авах жагсаалт', 'ᠬᠤᠳᠠᠯᠳᠤᠨ ᠠᠪᠬᠤ ᠵᠢᠭᠰᠠᠭᠠᠯᠲᠠ'],
  'check-price': ['看面包的价格', 'Check the bread price', 'パンの値段を見る', 'Талхны үнэ харах', 'ᠲᠠᠯᠬ᠎ᠠ ᠶᠢᠨ ᠦᠨ᠎ᠡ ᠦᠵᠡᠬᠦ'],
  'pay-note': ['付5元纸币', 'Pay with a ¥5 note', '5元の紙幣で払う', '5 юанийн дэвсгэрт өгөх', '5 ᠶᠤᠸᠠᠨ ᠤ ᠲᠡᠮᠳᠡᠭᠲᠦ ᠥᠭᠬᠦ'],
  'collect-change': ['拿回3元8角', 'Take ¥3.80', '3.80元を受け取る', '3.80 юань авах', '3.80 ᠶᠤᠸᠠᠨ ᠠᠪᠬᠤ'],
  'leave-change': ['先拿回3元', 'Take ¥3 first', 'まず3元受け取る', 'Эхлээд 3 юань авах', 'ᠡᠬᠢᠯᠡᠵᠦ 3 ᠶᠤᠸᠠᠨ ᠠᠪᠬᠤ'],
  'collect-rest': ['补拿8角', 'Collect the other ¥0.80', '残りの0.80元を受け取る', 'Үлдсэн 0.80 юань авах', 'ᠦᠯᠡᠳᠡᠭᠰᠡᠨ 0.80 ᠶᠤᠸᠠᠨ ᠠᠪᠬᠤ'],
};
export function actionTitle(offer: Offer, lang: Lang): string {
  return actionNames[offer.id]?.[(['zh', 'en', 'ja', 'mn', 'mn-Mong'] as const).indexOf(lang)] ?? offer.label[lang] ?? offer.label.zh;
}
export type ActionKind = 'observe' | 'choose' | 'change' | 'work' | 'money' | 'finish';
export function actionKind(offer: Offer): ActionKind {
  if (offer.purchase) return 'choose';
  if (['collect-change', 'collect-rest', 'leave-change'].includes(offer.id)) return 'change';
  if (/^(share-|pack-|deliver-|serve-|finish-|close-loan|show-room|check-jars|check-bank|start-picnic|seal-trip-budget)/.test(offer.id) || /^(complete|finish)$/.test(offer.id)) return 'finish';
  if (/^(read-|check-|compare-|observe-|plan-|assign-|make-list|parent-|.*-terms$)/.test(offer.id)) return 'observe';
  if (/^(pay-|collect-|deposit|withdraw|borrow|repay|exchange-|load-|cash-out|allowance|receive-gift|reserve-|seal-reserve)/.test(offer.id) || ['bank', 'wallet', 'card', 'coin'].includes(offer.icon)) return 'money';
  return 'work';
}
export function groupOffers(offers: Offer[]): { kind: ActionKind; offers: Offer[] }[] {
  const groups: { kind: ActionKind; offers: Offer[] }[] = [];
  for (const offer of offers) {
    if (offer.id.startsWith('talk-')) continue;
    const kind = actionKind(offer), group = groups.find(g => g.kind === kind);
    if (group) group.offers.push(offer);
    else groups.push({ kind, offers: [offer] });
  }
  return groups;
}
const salesUnits: Record<string, readonly string[]> = {
  '个': ['按个卖', 'Each', '1個ずつ', 'Ширхгээр', 'ᠰᠢᠷᠬᠡᠭ ᠢᠶᠡᠷ'],
  '本': ['按本卖', 'Per book', '1冊ずつ', 'Номоор', 'ᠨᠣᠮ ᠢᠶᠠᠷ'],
  '杯': ['按杯卖', 'Per cup', '1杯ずつ', 'Аягаар', 'ᠠᠶᠠᠭ᠎ᠠ ᠪᠠᠷ'],
  '把': ['按把卖', 'Each', '1本ずつ', 'Ширхгээр', 'ᠰᠢᠷᠬᠡᠭ ᠢᠶᠡᠷ'],
  '件': ['按件卖', 'Each', '1着ずつ', 'Ширхгээр', 'ᠰᠢᠷᠬᠡᠭ ᠢᠶᠡᠷ'],
  '张': ['按张卖', 'Each', '1枚ずつ', 'Ширхгээр', 'ᠰᠢᠷᠬᠡᠭ ᠢᠶᠡᠷ'],
  '套': ['按套卖', 'Per set', '1セットずつ', 'Багцаар', 'ᠪᠠᠭᠴᠠ ᠪᠠᠷ'],
  '份': ['按份卖', 'Per portion', '1人分ずつ', 'Хэсгээр', 'ᠬᠡᠰᠡᠭ ᠢᠶᠡᠷ'],
};
export function salesUnitText(item: string, lang: Lang): string {
  return salesUnits[itemUnit(item)][(['zh', 'en', 'ja', 'mn', 'mn-Mong'] as const).indexOf(lang)];
}
export function itemArtwork(item: string): string {
  if (item.includes('juice')) return `<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="#593d32" stroke-width="3" stroke-linejoin="round"><path d="M30 32H70L65 85Q50 93 35 85Z" fill="#ffeeb8"/><path d="M33 48H67L63 81Q50 87 37 81Z" fill="#ebad64"/><path d="M59 12L51 65" fill="none" stroke="#438c87" stroke-width="6"/><ellipse cx="50" cy="32" rx="20" ry="5" fill="#fff8e8"/><path d="M59 12L51 32" fill="none" stroke="#438c87" stroke-width="6"/></g><circle cx="43" cy="65" r="3" fill="#fff8e8"/></svg>`;
  const glyph = item.includes('book') ? 'book' : ['bread','fresh','markdown'].includes(item) ? 'bread' : ['toy','plush'].includes(item) ? 'toy' : item.includes('souvenir') ? 'shell' : item === 'coat' ? 'shirt' : item === 'umbrella' ? 'umbrella' : item === 'apple' ? 'apple' : item === 'gift' ? 'gift' : 'bag';
  return icon(glyph);
}
export function moneyArtwork(cents: number, lang: Lang = 'zh'): string {
  if (!Number.isSafeInteger(cents) || cents < 0) return '';
  let remaining = cents;
  const pieces: string[] = [];
  for (const unit of [10000, 5000, 2000, 1000, 500, 100, 50, 10, 1]) {
    const count = Math.floor(remaining / unit); remaining %= unit;
    if (!count) continue;
    const face = lang === 'zh' ? unit >= 100 ? `${unit / 100}元` : unit >= 10 ? `${unit / 10}角` : '1分' : `¥${unit >= 100 ? unit / 100 : (unit / 100).toFixed(2)}`;
    const shape = unit >= 500 ? `<rect x="3" y="14" width="74" height="40" rx="5" fill="#bcd8bd"/><rect x="9" y="20" width="62" height="28" rx="3" fill="none"/><text x="40" y="40">${face}</text>` : `<circle cx="40" cy="34" r="23" fill="#efd078"/><circle cx="40" cy="34" r="17" fill="none"/><text x="40" y="40">${face}</text>`;
    pieces.push(`<svg viewBox="0 0 80 78" aria-hidden="true"><g stroke="#725333" stroke-width="1.8">${shape}</g><text x="40" y="73" fill="#593d32">×${count}</text></svg>`);
  }
  return `<span class="money-pieces" aria-hidden="true">${pieces.join('')}</span>`;
}
