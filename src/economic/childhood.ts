import content from './childhood-content.json';
import type { Family, IconName, Place, SpeechFact, Text } from './model';
import { speechFor, withSpeech } from './speech-cues';

export type ChildhoodStoryId = 'market' | 'family' | 'wishes' | 'money' | 'insurance' | 'travel';
export const CHILDHOOD_SCRIPT_ENTRIES = content.scripts;
export function childhoodText(key: string): Text {
  const entry = content.scripts.find(row => row.id === `childhood.${key}`);
  if (!entry) throw new Error(`Unknown childhood script: ${key}`);
  return withSpeech({ ...entry.text, 'mn-Mong': entry.writing['mn-Mong'] }, entry.id);
}
const t = childhoodText;
const itemScripts: Record<string, string> = {
  sort: 'sort', wash: 'wash', pack: 'pack', repairHelp: 'parent-repair',
  freshTomorrow: 'save-snack', rejectedProp: 'counterfeit.replaced',
  authenticityCheck: 'inspect', paperReplaced: 'paper-replace',
};
const itemLabels: Record<string, [string, string, string, string, string, string]> = {
  sticker: ['swap', '贴纸', 'Sticker', 'シール', 'Наалт', 'ᠨᠠᠭᠠᠯᠲᠠ'],
  brokenToy: ['defect.line', '待修的玩具', 'Toy awaiting repair', '修理待ちのおもちゃ', 'Засах тоглоом', 'ᠵᠠᠰᠠᠬᠤ ᠲᠣᠭᠯᠠᠭᠤᠷ'],
  book: ['book', '书', 'Book', '本', 'Ном', 'ᠨᠣᠮ'],
  toy: ['wish-toy', '玩具', 'Toy', 'おもちゃ', 'Тоглоом', 'ᠲᠣᠭᠯᠠᠭᠤᠷ'],
  fruit: ['market.line', '苹果篮', 'Apple basket', 'りんごのかご', 'Алимны сагс', 'ᠠᠯᠢᠮᠠᠨ ᠤ ᠰᠠᠭᠰᠤ'],
  repairedToy: ['parent-repair', '修好的玩具', 'Repaired toy', '直したおもちゃ', 'Зассан тоглоом', 'ᠵᠠᠰᠠᠭᠰᠠᠨ ᠲᠣᠭᠯᠠᠭᠤᠷ'],
  usedToy: ['toy-inspected', '二手玩具', 'Used toy', '中古のおもちゃ', 'Хуучин тоглоом', 'ᠬᠠᠭᠤᠴᠢᠨ ᠲᠣᠭᠯᠠᠭᠤᠷ'],
  sharedSnack: ['keep', '一起分享的点心', 'Shared snacks', '分け合うおやつ', 'Хуваалцсан зууш', 'ᠬᠤᠪᠢᠶᠠᠭᠰᠠᠨ ᠢᠳᠡᠭᠡ'],
  'wish-toy': ['wish-toy', '心爱的玩具', 'Favorite toy', 'お気に入りのおもちゃ', 'Дуртай тоглоом', 'ᠳᠤᠷᠠᠲᠠᠢ ᠲᠣᠭᠯᠠᠭᠤᠷ'],
  'wish-gift': ['wish-gift', '给爷爷的小礼物', 'Grandpa’s little gift', '祖父への小さな贈り物', 'Өвөөгийн жижиг бэлэг', 'ᠡᠪᠦᠭᠡ ᠳᠦ ᠪᠡᠯᠡᠭ'],
  'wish-book': ['wish-book', '捐给阅读角的书', 'Donated reading-corner book', '読書コーナーへの寄付本', 'Уншлагын буланд хандивласан ном', 'ᠬᠠᠨᠳᠢᠪᠯᠠᠭᠰᠠᠨ ᠨᠣᠮ'],
  apple: ['shell-buy', '苹果', 'Apple', 'りんご', 'Алим', 'ᠠᠯᠢᠮ᠎ᠠ'],
  basket: ['money.metal', '交换来的篮子', 'Traded basket', '交換したかご', 'Солилцсон сагс', 'ᠰᠣᠯᠢᠯᠴᠠᠭᠰᠠᠨ ᠰᠠᠭᠰᠤ'],
  paperTicket: ['paper-buy', '用纸币买的车票', 'Ticket bought with paper money', '紙幣で買った切符', 'Цаасан мөнгөөр авсан тасалбар', 'ᠴᠠᠭᠠᠰᠤᠨ ᠮᠥᠩᠭᠥ ᠪᠡᠷ ᠠᠪᠤᠭᠰᠠᠨ ᠲᠠᠰᠠᠯᠪᠤᠷᠢ'],
  digitalTicket: ['digital-buy', '用预付钱包买的车票', 'Ticket bought with the prepaid wallet', '前払い財布で買った切符', 'Урьдчилсан хэтэвчээр авсан тасалбар', 'ᠴᠦᠨᠭᠬᠡ ᠪᠡᠷ ᠠᠪᠤᠭᠰᠠᠨ ᠲᠠᠰᠠᠯᠪᠤᠷᠢ'],
  dryBag: ['dry-bag', '防水袋', 'Dry bag', '防水袋', 'Усны хамгаалалттай уут', 'ᠬᠠᠮᠠᠭᠠᠯᠠᠬᠤ ᠤᠭᠤᠲᠠ'],
  wetBook: ['rain.line', '淋湿的书', 'Wet book', 'ぬれた本', 'Норсон ном', 'ᠨᠣᠷᠣᠭᠰᠠᠨ ᠨᠣᠮ'],
  wetToy: ['rain.line', '淋湿的玩具', 'Wet toy', 'ぬれたおもちゃ', 'Норсон тоглоом', 'ᠨᠣᠷᠣᠭᠰᠠᠨ ᠲᠣᠭᠯᠠᠭᠤᠷ'],
  travelPass: ['declare.detail', '故事里的通行章', 'Story travel stamp', '物語の通行印', 'Түүхийн нэвтрэх тэмдэг', 'ᠨᠡᠪᠲᠡᠷᠡᠬᠦ ᠲᠡᠮᠳᠡᠭ'],
  familyInvitation: ['shell.entry', '家庭邀请页', 'Family invitation', '家族の招待状', 'Гэр бүлийн урилга', 'ᠭᠡᠷ ᠪᠦᠯᠢ ᠶᠢᠨ ᠤᠷᠢᠯᠭ᠎ᠠ'],
  visitorPermission: ['lantern.entry', '访客许可', 'Visitor permission', '訪問許可', 'Зочны зөвшөөрөл', 'ᠵᠣᠴᠢᠨ ᠤ ᠵᠥᠪᠰᠢᠶᠡᠷᠡᠯ'],
  travelBook: ['same.spec', '同款防水封面故事书', 'Matching waterproof-cover storybook', '同じ防水表紙の物語の本', 'Ижил усны хамгаалалттай хавтастай ном', 'ᠠᠳᠠᠯᠢ ᠨᠣᠮ'],
};
/** Short item labels reuse existing recorded descriptions; no additional audio scripts are needed. */
export function childhoodItemText(key: string): Text {
  if (Object.hasOwn(itemScripts, key)) return t(itemScripts[key]);
  if (!Object.hasOwn(itemLabels, key)) throw new Error(`Unknown childhood item: ${key}`);
  const [script, zh, en, ja, mn, mong] = itemLabels[key];
  return withSpeech({ zh, en, ja, mn, 'mn-Mong': mong }, ...speechFor(t(script))!);
}
export const CHILDHOOD_STORIES: { id: ChildhoodStoryId; minLevel: number; age: number; place: Place; title: Text; goal: Text }[] = [
  { id: 'market', minLevel: 2, age: 7, place: 'shop', title: t('market.title'), goal: t('market.goal') },
  { id: 'family', minLevel: 3, age: 8, place: 'home', title: t('family.title'), goal: t('family.goal') },
  { id: 'wishes', minLevel: 5, age: 8, place: 'home', title: t('wishes.title'), goal: t('wishes.goal') },
  { id: 'money', minLevel: 11, age: 10, place: 'shop', title: t('money.title'), goal: t('money.goal') },
  { id: 'insurance', minLevel: 8, age: 9, place: 'park', title: t('insurance.title'), goal: t('insurance.goal') },
  { id: 'travel', minLevel: 19, age: 12, place: 'shop', title: t('travel.title'), goal: t('travel.goal') },
];
export type ChildhoodAccount = 'cash' | 'debit' | 'prepaid' | 'foreignCash' | 'reserve' | 'debt' | 'cardPending' | 'pool' | 'siblings' | 'change' | 'shells' | 'copper' | 'silver' | 'gold' | 'paper';
/** Money uses integer cents. A rate of 180 means 180 home cents per 100 foreign cents; no real exchange rates. */
export type ChildhoodQuote = { label: Text; value: number; unit: 'home' | 'foreign' | 'count' | 'day' | 'gram' | 'rate'; facts: SpeechFact[] };
export type ChildhoodChoice = { id: string; label: Text; detail: Text; icon: IconName; disabled?: Text; facts?: SpeechFact[] };
export type ChildhoodLedgerEntry = { day: number; scriptId: string; label: Text; accounts: Partial<Record<ChildhoodAccount, number>>; items: Record<string, number> };
export type ChildhoodState = {
  version: 1; storyId: ChildhoodStoryId; family: Family; seed: number; day: number; stage: string; completed: boolean;
  envelope: Record<ChildhoodAccount, number>; inventory: Record<string, number>; flags: Record<string, number | string>;
  achievements: string[]; ledger: ChildhoodLedgerEntry[]; history: string[];
  decisions: { day: number; choiceId: string; quotes: { scriptId: string; value: number; unit: ChildhoodQuote['unit'] }[] }[];
};
export type ChildhoodView = { title: Text; goal: Text; speaker: Text; message: Text; nextStep: Text; choices: ChildhoodChoice[]; quotes: ChildhoodQuote[]; completed: boolean; progress: { current: number; total: number }; facts: SpeechFact[]; icon: IconName };
const accounts: ChildhoodAccount[] = ['cash', 'debit', 'prepaid', 'foreignCash', 'reserve', 'debt', 'cardPending', 'pool', 'siblings', 'change', 'shells', 'copper', 'silver', 'gold', 'paper'];
const n = (s: ChildhoodState, key: string) => Number(s.flags[key] ?? 0);
const item = (s: ChildhoodState, key: string) => s.inventory[key] ?? 0;
function record(s: ChildhoodState, key: string, changes: Partial<Record<ChildhoodAccount, number>> = {}, items: Record<string, number> = {}) {
  for (const [a, amount] of Object.entries(changes)) {
    const account = a as ChildhoodAccount;
    if (!Number.isSafeInteger(amount) || s.envelope[account] + amount < 0) throw new Error('Invalid story accounting');
    s.envelope[account] += amount;
  }
  for (const [key, amount] of Object.entries(items)) {
    if (!Number.isSafeInteger(amount) || item(s, key) + amount < 0) throw new Error('Invalid story inventory');
    s.inventory[key] = item(s, key) + amount;
  }
  s.ledger.push({ day: s.day, scriptId: `childhood.${key}`, label: t(key), accounts: changes, items });
}
function finish(s: ChildhoodState) { s.completed = true; s.stage = 'done'; s.achievements.push(`childhood.${s.storyId}`); }
export function createChildhood(id: ChildhoodStoryId, family: Family, seed = 2026): ChildhoodState {
  if (!CHILDHOOD_STORIES.some(story => story.id === id) || !family || !['boy', 'girl'].includes(family.gender) || ![1, 2, 3].includes(family.children)) throw new Error('Invalid childhood story or family');
  const state: ChildhoodState = { version: 1, storyId: id, family: { ...family }, seed: Number.isFinite(seed) ? seed >>> 0 : 2026, day: 1, stage: 'start', completed: false,
    envelope: Object.fromEntries(accounts.map(a => [a, 0])) as Record<ChildhoodAccount, number>, inventory: {}, flags: {}, achievements: [], ledger: [], history: [], decisions: [] };
  const cash = { market: 500, family: 0, wishes: 800, money: 0, insurance: 1000, travel: 2000 }[id];
  record(state, 'envelope', { cash }, id === 'money' ? { sticker: 2 } : id === 'market' ? { brokenToy: 1 } : {});
  if (id === 'insurance') record(state, 'neighbors', { pool: 400 }, { book: 1, toy: 1 });
  return state;
}
const marketOffers = {
  'fruit-fresh': { price: 120, fare: 0, time: 1, quality: 2, warranty: 0, kind: 'fruit', icon: 'apple' },
  'fruit-ripe': { price: 80, fare: 0, time: 1, quality: 1, warranty: 0, kind: 'fruit', icon: 'apple' },
  'repair-near': { price: 180, fare: 0, time: 1, quality: 2, warranty: 3, kind: 'repairedToy', icon: 'toy' },
  'repair-far': { price: 100, fare: 40, time: 2, quality: 1, warranty: 0, kind: 'repairedToy', icon: 'toy' },
  'toy-warranty': { price: 200, fare: 0, time: 1, quality: 2, warranty: 3, kind: 'usedToy', icon: 'toy' },
  'toy-inspected': { price: 100, fare: 40, time: 2, quality: 1, warranty: 0, kind: 'usedToy', icon: 'toy' },
} as const;
export const CHILDHOOD_DESTINATIONS = {
  shell: { rate: 180, settlementRate: 200, returnRate: 170, fee: 20, foreignPrice: 200, tax: 60, shipping: 50, merchantPrice: 460, fare: 100 },
  lantern: { rate: 260, settlementRate: 240, returnRate: 250, fee: 30, foreignPrice: 150, tax: 80, shipping: 70, merchantPrice: 470, fare: 120 },
} as const;
function destination(s: ChildhoodState) { return CHILDHOOD_DESTINATIONS[s.flags.destination as keyof typeof CHILDHOOD_DESTINATIONS]; }
function travelPrice(s: ChildhoodState, settlement = false) {
  if (s.flags.route === 'local') return 500;
  const d = destination(s);
  return s.flags.conversion === 'merchant' ? d.merchantPrice + d.tax + d.shipping : Math.round(d.foreignPrice * (settlement ? d.settlementRate : d.rate) / 100) + d.tax + d.shipping + d.fee;
}
function refundable(s: ChildhoodState) {
  if (s.flags.route === 'local') return 500;
  const d = destination(s);
  return (s.flags.conversion === 'merchant' ? d.merchantPrice : Math.round(d.foreignPrice * (n(s, 'posted') ? d.settlementRate : d.rate) / 100)) + d.tax;
}
function policyLoss(s: ChildhoodState) {
  if (!n(s, 'rain')) return 0;
  const reduction = n(s, 'dryBag') ? 100 : 0;
  return Math.max(0, 500 - reduction);
}
function claimAmount(s: ChildhoodState) {
  const covered = s.flags.policy === 'all' ? policyLoss(s) : s.flags.policy === 'book' && n(s, 'rain') ? 200 : 0;
  return Math.min(Math.max(0, covered - n(s, 'deductible')), n(s, 'limit'), s.envelope.pool);
}
function scene(s: ChildhoodState): string {
  if (s.completed) return 'done';
  if (s.storyId === 'market') return s.stage === 'start' ? 'market.line' : s.stage === 'change' ? 'change.line' : s.stage === 'short' ? 'short.line' : n(s, 'defect') ? 'defect.line' : 'aftercare.line';
  if (s.storyId === 'family') return s.stage === 'start' ? `family.${s.family.children}` : s.stage === 'work' ? 'work.line' : 'share.line';
  if (s.storyId === 'wishes') return 'wishes.line';
  if (s.storyId === 'money') return `money.${s.stage}`;
  if (s.storyId === 'insurance') return s.stage === 'start' ? 'insurance.line' : s.stage === 'pack' ? 'pack.line' : n(s, 'rain') ? 'rain.line' : 'sun.line';
  return s.stage === 'start' ? 'travel.line' : `travel.${s.stage}`;
}
export function childhoodView(s: ChildhoodState): ChildhoodView {
  const descriptor = CHILDHOOD_STORIES.find(story => story.id === s.storyId)!;
  const choices: ChildhoodChoice[] = [], quotes: ChildhoodQuote[] = [];
  const q = (key: string, value: number, unit: ChildhoodQuote['unit'] = 'home') => {
    quotes.push({ label: t(key), value, unit, facts: [{ id: `childhood.${key}`, value, ...(unit === 'home' || unit === 'foreign' ? { money: unit } : {}) }] });
  };
  const c = (id: string, key = id, icon: IconName = 'handshake', disabled = false, detail = 'choice.detail') => choices.push({ id, label: t(key), detail: t(detail), icon, ...(disabled ? { disabled: t('shortage') } : {}) });
  if (!s.completed) switch (s.storyId) {
    case 'market':
      if (s.stage === 'start') {
        for (const [id, offer] of Object.entries(marketOffers)) {
          q(id, offer.price); q('fare', offer.fare); q('time', offer.time, 'day'); q('quality', offer.quality, 'count'); q('warranty', offer.warranty, 'day');
          c(id, id, offer.icon, false, id === 'fruit-ripe' ? 'eat.today' : offer.warranty ? 'warranty.detail' : 'inspection.detail');
        }
        q('tender', 500); c('leave', 'leave', 'arrow');
      } else if (s.stage === 'change' || s.stage === 'short') {
        q('change', s.envelope.change); q('offered.change', Math.max(0, s.envelope.change - (s.stage === 'change' ? 20 : 0)));
        c('check-change', 'check-change', 'coin'); if (s.stage === 'change') c('accept-short', 'accept-short', 'coin');
      } else {
        q('refund', n(s, 'price')); q('fare.nonrefund', n(s, 'fare')); q('warranty', n(s, 'warranty'), 'day'); q('time', n(s, 'time'), 'day');
        c('keep', 'keep', 'bag'); c('refund', 'refund', 'wallet');
        if (s.flags.kind === 'fruit' && n(s, 'quality') === 2) c('save-snack', 'save-snack', 'apple');
        if (n(s, 'defect')) { c('warranty-repair', 'warranty-repair', 'toy', !n(s, 'warranty')); c('parent-repair', 'parent-repair', 'toy', false, 'parent-repair.detail'); }
      }
      break;
    case 'family':
      if (s.stage === 'start') { q('reward', 600); c('equal', 'equal', 'heart'); c('effort', 'effort', 'handshake'); }
      else if (s.stage === 'work') {
        c('sort', 'sort', 'broom', !!n(s, 'sort'), s.family.children === 1 ? 'parent.help' : 'protagonist.job');
        c('wash', 'wash', 'apple', !!n(s, 'wash'), s.family.children === 1 ? 'parent.help' : 'sibling.job');
        if (s.family.children === 3) c('pack', 'pack', 'bag', !!n(s, 'pack'), 'youngest.job');
      } else {
        for (let i = 0; i < s.family.children; i++) q(i === 0 ? 'your.share' : 'sibling.share', n(s, `share${i}`));
        c('collect', 'collect', 'coin');
      }
      break;
    case 'wishes':
      for (const [id, price, icon] of [['wish-toy', 400, 'toy'], ['wish-reserve', 200, 'wallet'], ['wish-gift', 200, 'gift'], ['wish-book', 200, 'book']] as const) {
        q(id, price); c(id, id, icon, !!n(s, id) || s.envelope.cash < price);
      }
      c('finish', 'finish', 'arrow', !n(s, 'wishes')); break;
    case 'money':
      if (s.stage === 'start') { c('swap', 'swap', 'handshake'); c('counteroffer', 'counteroffer', 'handshake'); }
      else if (s.stage === 'shells') { q('shell.price', 1, 'count'); c('shell-buy', 'shell-buy', 'apple'); c('shell-barter', 'shell-barter', 'handshake'); }
      else if (s.stage === 'metal') {
        for (const [id, count, weight] of [['copper', 10, 100], ['silver', 2, 20], ['gold', 1, 10]] as const) { q(id, count, 'count'); q('weight', weight, 'gram'); c(id, id, 'coin'); }
      } else if (s.stage === 'check') { c('inspect', 'inspect', 'coin'); c('replace-worn', 'replace-worn', 'coin'); }
      else if (s.stage === 'paper') { q('paper.price', 200); q('paper.tender', 500); c('paper-buy', 'paper-buy', 'wallet'); c('paper-replace', 'paper-replace', 'wallet'); }
      else { q('digital.price', 100); q('prepaid.balance', s.envelope.prepaid); c('digital-buy', 'digital-buy', 'wallet'); }
      break;
    case 'insurance':
      if (s.stage === 'start') {
        for (const [id, premium, deductible, limit] of [['none', 0, 0, 0], ['book', 100, 100, 150], ['all', 180, 100, 300]] as const) {
          q(id, premium); q('deductible', deductible); q('limit', limit); c(id, id, 'heart', false, 'policy.detail');
        }
        q('pool', s.envelope.pool);
      } else if (s.stage === 'pack') { q('dry-bag', 60); c('dry-bag', 'dry-bag', 'bag'); c('ordinary-bag', 'ordinary-bag', 'bag'); }
      else if (s.stage === 'weather') { q('loss', policyLoss(s)); q('claim', claimAmount(s)); q('pool', s.envelope.pool); c('claim', 'claim', 'heart'); }
      else { q('repair.cost', policyLoss(s)); q('claim.paid', n(s, 'claim')); q('pool', s.envelope.pool); c('restore', 'restore', 'book', s.envelope.cash < policyLoss(s)); }
      break;
    case 'travel':
      if (s.stage === 'start') {
        for (const [id, d] of Object.entries(CHILDHOOD_DESTINATIONS)) { q(`${id}.rate`, d.rate, 'rate'); q('fx.fee', d.fee); q('fare', d.fare);         c(id, id, 'bag', false, `${id}.entry`); }
        q('reserve', 400);
      } else if (s.stage === 'compare') {
        const d = destination(s);
        q('local.price', 500); q('foreign.price', d.foreignPrice, 'foreign'); q('rate', d.rate, 'rate'); q('tax', d.tax); q('shipping', d.shipping); q('fx.fee', d.fee);
        q('landed', Math.round(d.foreignPrice * d.rate / 100) + d.tax + d.shipping + d.fee);
        c('local', 'local', 'book', false, 'same.spec'); c('foreign', 'foreign', 'book', false, 'declare.detail');
                q('extra.reserve', 1000); if (!n(s, 'extraReserve')) c('reserve-more', 'reserve-more', 'wallet');
                if (n(s, 'extraReserve') && s.envelope.reserve > 400) c('use-reserve', 'use-reserve', 'wallet');
              } else if (s.stage === 'funding') {
                const short = s.envelope.cash < travelPrice(s);
                q('purchase.total', travelPrice(s));
                c('cash', 'cash', 'coin', short, 'cash.detail'); c('debit', 'debit', 'bank', short, 'debit.detail'); c('prepaid', 'prepaid', 'wallet', short, 'prepaid.detail'); c('credit', 'credit', 'calendar', false, 'credit.detail');
                if (short && s.envelope.reserve) c('use-reserve', 'use-reserve', 'wallet');
        q('settlement.day', s.day + 1, 'day'); q('due.day', s.day + 2, 'day');
      } else if (s.stage === 'conversion') {
        const d = destination(s);
        q('issuer.price', Math.round(d.foreignPrice * d.rate / 100) + d.tax + d.shipping + d.fee); q('merchant.price', d.merchantPrice + d.tax + d.shipping);
        q('settlement.rate', d.settlementRate, 'rate'); q('settlement.day', s.day + 1, 'day'); q('due.day', s.day + 2, 'day');
        const owned = s.flags.funding !== 'credit';
        const issuerPrice = Math.round(d.foreignPrice * d.rate / 100) + d.tax + d.shipping + d.fee;
        c('issuer', 'issuer', 'bank', owned && s.envelope.cash < issuerPrice, 'issuer.detail');
        if (s.flags.funding !== 'cash') c('merchant', 'merchant', 'bank', owned && s.envelope.cash < d.merchantPrice + d.tax + d.shipping, 'merchant.detail');
        if (owned && s.envelope.cash < Math.max(issuerPrice, d.merchantPrice + d.tax + d.shipping) && s.envelope.reserve) c('use-reserve', 'use-reserve', 'wallet');
      } else {
        q('paid.price', n(s, 'paid')); q('reserve', s.envelope.reserve);
        if (s.flags.funding === 'cash' && s.flags.route === 'foreign') { q('foreign.refund', destination(s).foreignPrice, 'foreign'); q('tax.refund', destination(s).tax); }
        else q('refund', n(s, 'refunded') ? n(s, 'refundAmount') : refundable(s));
        if (s.flags.route === 'foreign') { const d = destination(s); q('nonrefund', d.shipping + (s.flags.conversion === 'merchant' ? 0 : d.fee)); q('return.rate', d.returnRate, 'rate'); q('fx.fee', d.fee); }
        if (s.envelope.cardPending) c('settle', 'settle', 'calendar');
        if (s.envelope.debt) { q('bill', s.envelope.debt); q('due.day', n(s, 'dueDay'), 'day'); c('repay', 'repay', 'wallet', s.envelope.cash < s.envelope.debt); }
        if (!n(s, 'refunded')) c('refund', 'refund', 'wallet', false, 'refund.detail');
        if (s.envelope.foreignCash) c('exchange-back', 'exchange-back', 'coin');
        if (s.envelope.reserve && s.envelope.cash < s.envelope.debt) c('use-reserve', 'use-reserve', 'wallet');
        c('finish', 'finish', 'arrow', !!(s.envelope.debt || s.envelope.cardPending || s.envelope.foreignCash));
      }
      break;
  }
  if (choices.some(choice => choice.id === 'use-reserve')) q('reserve.release', Math.min(s.envelope.reserve, 400));
  q('cash.balance', s.envelope.cash); q('story.reserve', s.envelope.reserve);
  const total = { market: 3, family: s.family.children === 3 ? 5 : 4, wishes: 4, money: 6, insurance: 4, travel: 6 }[s.storyId];
  return { title: descriptor.title, goal: descriptor.goal, speaker: t(`speaker.${s.family.gender}`), message: t(scene(s)), nextStep: t(s.completed ? 'done' : 'next'), choices, quotes, completed: s.completed,
    progress: { current: s.completed ? total : Math.min(s.history.length, total - 1), total }, facts: quotes.flatMap(quote => quote.facts), icon: { market: 'apple', family: 'broom', wishes: 'gift', money: 'coin', insurance: 'heart', travel: 'bag' }[s.storyId] as IconName };
}
function transition(s: ChildhoodState, id: string) {
  switch (s.storyId) {
    case 'market': {
      if (id === 'leave') { finish(s); break; }
      if (s.stage === 'start') {
        const offer = marketOffers[id as keyof typeof marketOffers];
        Object.assign(s.flags, offer, { offer: id, defect: offer.kind !== 'fruit' && s.seed % 2 === 1 ? 1 : 0 });
        record(s, id, { cash: -500, change: 500 - offer.price - offer.fare }, { [offer.kind]: 1, ...(offer.kind === 'repairedToy' ? { brokenToy: -1 } : {}) });
        s.day += offer.time; s.stage = 'change';
      } else if (s.stage === 'change' || s.stage === 'short') {
        const amount = s.envelope.change - (id === 'accept-short' ? 20 : 0);
        record(s, id, { cash: amount, change: -amount }); s.stage = id === 'accept-short' ? 'short' : 'aftercare';
      } else if (id === 'refund') {
        record(s, id, { cash: n(s, 'price') }, { [String(s.flags.kind)]: -1, ...(s.flags.kind === 'repairedToy' ? { brokenToy: 1 } : {}) }); finish(s);
      } else if (id === 'warranty-repair' || id === 'parent-repair') {
        record(s, id, {}, { repairHelp: 1 }); s.flags.defect = 0; s.day++; finish(s);
      } else if (id === 'save-snack') { s.day++; record(s, id, {}, { fruit: -1, sharedSnack: s.family.children, freshTomorrow: 1 }); finish(s);
      } else if (n(s, 'defect')) { record(s, 'parent-repair', {}, { repairHelp: 1 }); s.flags.defect = 0; s.day++; finish(s);
      } else { record(s, 'keep', {}, s.flags.kind === 'fruit' ? { fruit: -1, sharedSnack: s.family.children } : {}); finish(s); }
      break;
    }
    case 'family':
      if (s.stage === 'start') {
        s.flags.division = id; const weights = Array.from({ length: s.family.children }, (_, i) => id === 'effort' && i === 0 ? 2 : 1);
        const sum = weights.reduce((a, b) => a + b, 0); let left = 600;
        weights.forEach((weight, i) => { const share = i === weights.length - 1 ? left : Math.floor(600 * weight / sum); s.flags[`share${i}`] = share; left -= share; }); s.stage = 'work';
      } else if (s.stage === 'work') {
        s.flags[id] = 1; record(s, id, {}, { [id]: 1 });
        if (n(s, 'sort') && n(s, 'wash') && (s.family.children !== 3 || n(s, 'pack'))) s.stage = 'share';
      } else { record(s, 'collect', { cash: n(s, 'share0'), siblings: 600 - n(s, 'share0') }); finish(s); }
      break;
    case 'wishes':
      if (id === 'finish') { finish(s); break; }
      { const price = id === 'wish-toy' ? 400 : 200;
        record(s, id, { cash: -price, ...(id === 'wish-reserve' ? { reserve: price } : {}) }, id === 'wish-reserve' ? {} : { [id]: 1 });
        s.flags[id] = 1; s.flags.wishes = n(s, 'wishes') + 1; s.achievements.push(`childhood.${id}`); }
      break;
    case 'money':
      if (s.stage === 'start') { if (id === 'counteroffer') s.day++; record(s, id, {}, { sticker: -1, apple: 1 }); record(s, 'accepted.shells', { shells: 3 }); s.stage = 'shells'; }
      else if (s.stage === 'shells') { record(s, id, id === 'shell-buy' ? { shells: -1 } : {}, { apple: 1, ...(id === 'shell-barter' ? { sticker: -1 } : {}) }); record(s, 'metal.props', { copper: 10, silver: 2, gold: 1 }); s.stage = 'metal'; }
      else if (s.stage === 'metal') { s.flags.metal = id; s.flags.weight = id === 'copper' ? 100 : id === 'silver' ? 20 : 10; s.stage = 'check'; }
      else if (s.stage === 'check') {
        const metal = s.flags.metal as 'copper' | 'silver' | 'gold';
        s.flags.counterfeitRejected = s.seed % 2; s.flags.wornReplaced = id === 'replace-worn' ? 1 : 0;
        if (n(s, 'counterfeitRejected')) record(s, 'counterfeit.replaced', {}, { rejectedProp: 1 });
        if (n(s, 'wornReplaced')) s.day++;
        record(s, id, { [metal]: -(metal === 'copper' ? 10 : metal === 'silver' ? 2 : 1) }, { basket: 1, authenticityCheck: 1 });
        record(s, 'paper.props', { paper: 500 }); s.stage = 'paper';
      } else if (s.stage === 'paper') {
        if (id === 'paper-replace') { s.day++; record(s, id, {}, { paperReplaced: 1 }); }
        record(s, id, { paper: -500, change: 300 }, { paperTicket: 1 }); record(s, 'check-change', { change: -300, paper: 300 });
        record(s, 'prepaid.load', { paper: -300, prepaid: 300 }); s.stage = 'digital';
      } else { record(s, id, { prepaid: -100 }, { digitalTicket: 1 }); finish(s); }
      break;
    case 'insurance':
      if (s.stage === 'start') {
        const premium = id === 'none' ? 0 : id === 'book' ? 100 : 180;
        Object.assign(s.flags, { policy: id, deductible: id === 'none' ? 0 : 100, limit: id === 'none' ? 0 : id === 'book' ? 150 : 300 });
        record(s, id, { cash: -premium, pool: premium }); s.stage = 'pack';
      } else if (s.stage === 'pack') {
        s.flags.dryBag = id === 'dry-bag' ? 1 : 0; record(s, id, { cash: id === 'dry-bag' ? -60 : 0 }, id === 'dry-bag' ? { dryBag: 1 } : {});
        s.flags.rain = s.seed % 3 === 0 ? 0 : 1; s.day++; record(s, n(s, 'rain') ? 'rain.line' : 'sun.line', {}, n(s, 'rain') ? { book: -1, toy: -1, wetBook: 1, wetToy: 1 } : {}); s.stage = 'weather';
      } else if (s.stage === 'weather') {
        const amount = claimAmount(s); s.flags.claim = amount; record(s, id, { cash: amount, pool: -amount }); s.stage = 'restore';
      } else {
        record(s, id, { cash: -policyLoss(s) }, n(s, 'rain') ? { wetBook: -1, wetToy: -1, book: 1, toy: 1 } : {}); finish(s);
      }
      break;
    case 'travel':
      if (id === 'reserve-more') { record(s, id, { cash: -1000, reserve: 1000 }); s.flags.extraReserve = 1; break; }
      if (id === 'use-reserve') { const amount = Math.min(s.envelope.reserve, 400); record(s, id, { cash: amount, reserve: -amount }); break; }
      if (s.stage === 'start') { s.flags.destination = id; record(s, id, { cash: -400 - destination(s).fare, reserve: 400 }, { travelPass: 1, [id === 'shell' ? 'familyInvitation' : 'visitorPermission']: 1 }); s.stage = 'compare'; }
      else if (s.stage === 'compare') { s.flags.route = id; s.stage = 'funding'; }
      else if (s.stage === 'funding') { s.flags.funding = id; if (s.flags.route === 'foreign') s.stage = 'conversion'; else { s.flags.conversion = 'home'; buyTravel(s); } }
      else if (s.stage === 'conversion') { s.flags.conversion = id; buyTravel(s); }
      else if (id === 'settle') {
        s.day = Math.max(s.day, n(s, 'settlementDay')); const bill = travelPrice(s, true);
        record(s, id, { cardPending: -s.envelope.cardPending, debt: bill }); s.flags.posted = 1; s.flags.paid = bill;
      } else if (id === 'repay') { s.day = Math.max(s.day, n(s, 'dueDay')); record(s, id, { cash: -s.envelope.debt, debt: -s.envelope.debt }); }
      else if (id === 'refund') { refundTravel(s); }
      else if (id === 'exchange-back') {
        const d = destination(s); record(s, id, { foreignCash: -s.envelope.foreignCash, cash: Math.max(0, Math.round(s.envelope.foreignCash * d.returnRate / 100) - d.fee) });
      } else finish(s);
      break;
  }
}
function buyTravel(s: ChildhoodState) {
  const price = travelPrice(s); const funding = String(s.flags.funding); s.flags.paid = price;
  s.flags.settlementDay = s.day + 1; s.flags.dueDay = s.day + 2;
  if (funding === 'credit') record(s, 'credit.purchase', { cardPending: price }, { travelBook: 1 });
  else if (funding === 'cash' && s.flags.route === 'foreign') {
    const d = destination(s); const base = Math.round(d.foreignPrice * d.rate / 100);
    record(s, 'exchange', { cash: -base - d.fee, foreignCash: d.foreignPrice });
    record(s, 'purchase', { foreignCash: -d.foreignPrice, cash: -d.tax - d.shipping }, { travelBook: 1 });
  } else if (funding === 'cash') record(s, 'purchase', { cash: -price }, { travelBook: 1 });
  else {
    const a = funding as 'debit' | 'prepaid'; record(s, funding === 'debit' ? 'debit.load' : 'prepaid.load', { cash: -price, [a]: price });
    record(s, 'purchase', { [a]: -price }, { travelBook: 1 });
  }
  s.stage = 'receipt';
}
function refundTravel(s: ChildhoodState) {
  const funding = s.flags.funding; const amount = refundable(s); s.flags.refunded = 1; s.flags.refundAmount = amount;
  if (funding === 'credit' && s.envelope.cardPending) {
    const nonrefundable = n(s, 'paid') - amount;
    record(s, 'refund', { cardPending: -s.envelope.cardPending, debt: nonrefundable }, { travelBook: -1 }); s.flags.posted = 1;
  } else if (funding === 'credit') {
    const debtReduction = Math.min(s.envelope.debt, amount); record(s, 'refund', { debt: -debtReduction, cash: amount - debtReduction }, { travelBook: -1 });
  } else if (funding === 'cash' && s.flags.route === 'foreign') {
    const d = destination(s); record(s, 'refund', { foreignCash: d.foreignPrice, cash: d.tax }, { travelBook: -1 });
  } else record(s, 'refund', { [funding as 'cash' | 'debit' | 'prepaid']: amount }, { travelBook: -1 });
}
function hydrate(s: ChildhoodState): ChildhoodState { s.ledger.forEach(entry => { entry.label = t(entry.scriptId.slice('childhood.'.length)); }); return s; }
export function actChildhood(state: ChildhoodState, id: string): { state: ChildhoodState; ok: boolean; message: Text } {
  const choice = childhoodView(state).choices.find(choice => choice.id === id);
  if (!choice || choice.disabled || state.completed) return { state, ok: false, message: t(choice?.disabled ? 'shortage' : 'unavailable') };
  const next = hydrate(JSON.parse(JSON.stringify(state)) as ChildhoodState);
  next.decisions.push({ day: next.day, choiceId: id, quotes: childhoodView(state).quotes.map(quote => ({ scriptId: speechFor(quote.label)![0], value: quote.value, unit: quote.unit })) });
  transition(next, id); next.history.push(id);
  return { state: next, ok: true, message: t(scene(next)) };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
/** Accept only a complete state reachable by replay. Saves cannot mint story funds or edit claim terms. */
export function validateChildhood(value: unknown): value is ChildhoodState {
  try {
    if (!value || typeof value !== 'object') return false;
    const s = value as ChildhoodState;
    if (s.version !== 1 || !Array.isArray(s.history) || s.history.length > 40 || !Number.isInteger(s.seed) || s.seed < 0 || s.seed > 0xffffffff || s.history.some(id => typeof id !== 'string')) return false;
    let replay = createChildhood(s.storyId, s.family, s.seed);
    for (const id of s.history) { const result = actChildhood(replay, id); if (!result.ok) return false; replay = result.state; }
    return canonical(replay) === canonical(s);
  } catch { return false; }
}
export type ChildhoodStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function saveChildhood(storage: ChildhoodStorage, key: string, state: ChildhoodState): boolean {
  if (!key || !validateChildhood(state)) return false;
  try { storage.setItem(key, JSON.stringify(state)); return true; } catch { return false; }
}
export function loadChildhood(storage: ChildhoodStorage, key: string): ChildhoodState | undefined {
  try { if (!key) return undefined; const raw = storage.getItem(key); if (!raw || raw.length > 200_000) return undefined; const state: unknown = JSON.parse(raw); return validateChildhood(state) ? hydrate(state) : undefined; } catch { return undefined; }
}
