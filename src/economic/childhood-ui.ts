import { CHILDHOOD_STORIES, childhoodView, childhoodItemText, type ChildhoodState, type ChildhoodQuote } from './childhood';
import type { Lang } from './model';
import { icon, portrait } from './art';
import { copy, escapeHtml as esc, money, text } from './copy';
import { gameplayCopy } from './gameplay-copy';
import { common } from './legacy-localization';
import { lifeText } from './life';
import { actionKind, presentationText, moneyArtwork, type ActionKind } from './action-presentation';
import { changeTray, transferReceipt, type ChangeSelection, type ReceiptChange } from './money-interaction';

function storyActionKind(state: ChildhoodState, offer: import('./childhood').ChildhoodChoice): ActionKind {
  if (state.storyId === 'market' && state.stage === 'start' && offer.id !== 'leave' || state.storyId === 'wishes' && /^wish-(toy|gift|book)$/.test(offer.id) || /^(shell|paper|digital)-buy$/.test(offer.id)) return 'choose';
  if (['check-change', 'accept-short'].includes(offer.id)) return 'change';
  if (['inspect', 'replace-worn', 'equal', 'effort'].includes(offer.id)) return 'observe';
  return actionKind(offer);
}

const accountLabels = {
  cash: ['零钱', 'Cash', '現金', 'Бэлэн мөнгө', 'ᠪᠡᠯᠡᠨ ᠮᠥᠩᠭᠥ'],
  debit: ['银行卡里的钱', 'Debit balance', '銀行口座', 'Дансны мөнгө', 'ᠳᠠᠩᠰᠠᠨ ᠤ ᠮᠥᠩᠭᠥ'],
  prepaid: ['电子钱包', 'Prepaid wallet', '前払いのお財布', 'Урьдчилсан хэтэвч', 'ᠤᠷᠢᠳᠴᠢᠯᠠᠨ ᠲᠥᠯᠦᠭᠰᠡᠨ ᠬᠡᠲᠡᠪᠴᠢ'],
  foreignCash: ['外币零钱', 'Foreign cash', '外国のお金', 'Гадаад бэлэн мөнгө', 'ᠭᠠᠳᠠᠭᠠᠳᠤ ᠮᠥᠩᠭᠥ'],
  reserve: ['备用金', 'Reserve', '予備のお金', 'Нөөц мөнгө', 'ᠨᠥᠭᠡᠴᠡ ᠮᠥᠩᠭᠥ'],
  debt: ['待还本币账单', 'Home-currency bill', '自国通貨の支払い', 'Дотоод мөнгөөр төлөх', 'ᠳᠣᠲᠣᠭᠠᠳᠤ ᠮᠥᠩᠭᠥ ᠪᠡᠷ ᠲᠥᠯᠦᠬᠦ'],
  cardPending: ['待结算外币账单', 'Pending foreign bill', '未確定の外国通貨の支払い', 'Гадаад төлбөр хүлээгдэж байна', 'ᠭᠠᠳᠠᠭᠠᠳᠤ ᠲᠥᠯᠦᠪᠦᠷᠢ'],
  pool: ['共同保险金', 'Shared insurance pool', 'みんなの保険のお金', 'Хамтын даатгалын сан', 'ᠬᠠᠮᠲᠤ ᠶᠢᠨ ᠳᠠᠭᠠᠯᠭ᠎ᠠ ᠶᠢᠨ ᠰᠠᠩ'],
  siblings: ['分给家人的钱', 'Family reward share', '家族に分けたお金', 'Гэр бүлийн шагнал', 'ᠭᠡᠷ ᠪᠦᠯᠢ ᠶᠢᠨ ᠰᠠᠩ'],
  change: ['待领找零', 'Change to collect', '受け取るおつり', 'Авах хариулт', 'ᠠᠪᠬᠤ ᠬᠠᠷᠢᠭᠤᠯᠲᠠ'],
  shells: ['贝壳', 'Shells', '貝がら', 'Хясаа', 'ᠬᠠᠰᠠᠨ'],
  copper: ['铜币', 'Copper tokens', '銅のコイン', 'Зэс зоос', 'ᠵᠡᠰ ᠵᠣᠭᠣᠰ'],
  silver: ['银币', 'Silver tokens', '銀のコイン', 'Мөнгөн зоос', 'ᠮᠥᠩᠭᠥᠨ ᠵᠣᠭᠣᠰ'],
  gold: ['金币', 'Gold tokens', '金のコイン', 'Алтан зоос', 'ᠠᠯᠲᠠᠨ ᠵᠣᠭᠣᠰ'],
  paper: ['纸券', 'Paper tokens', '紙のお金', 'Цаасан тэмдэгт', 'ᠴᠠᠭᠠᠰᠤᠨ ᠲᠡᠮᠳᠡᠭ'],
} as const;
const glyphs = { market: 'apple', family: 'home', wishes: 'gift', money: 'coin', insurance: 'umbrella', travel: 'plane' };
function label(key: keyof typeof accountLabels, lang: Lang): string { return accountLabels[key][(['zh','en','ja','mn','mn-Mong'] as const).indexOf(lang)]; }
function amount(value: number, lang: Lang, foreign = false): string { return `${money(value, lang)} ${foreign ? text(lifeText('ui.shells'), lang).replace(/[。.]$/, '') : copy(lang).yuan}`; }
function accountAmount(key: string, value: number, lang: Lang): string {
  return ['shells','copper','silver','gold','paper'].includes(key) ? String(value) : amount(value, lang, key === 'foreignCash' || key === 'cardPending');
}
export function quoteAmount(quote: ChildhoodQuote, lang: Lang): string {
  if (quote.unit === 'home' || quote.unit === 'foreign') return amount(quote.value, lang, quote.unit === 'foreign');
  if (quote.unit === 'rate') return `1 ${text(lifeText('ui.shells'),lang).replace(/[。.]$/, '')} = ${amount(quote.value,lang)}`;
  return `${quote.value}${quote.unit === 'gram' ? ' g' : quote.unit === 'day' ? ` · ${text(common('day'),lang)}` : ''}`;
}
export function childhoodShelf(level: number, lang: Lang): string {
  const c = copy(lang), ui = gameplayCopy(lang);
  return `<section class="childhood-shelf"><h3>${icon('heart')}${esc(ui.childhood)}</h3><p>${esc(ui.envelopeNote)}</p><div class="childhood-cards">${[...CHILDHOOD_STORIES].sort((a,b)=>a.minLevel-b.minLevel).map(story=>`<button id="childhood-${story.id}" data-childhood="${story.id}" class="childhood-card" ${level<story.minLevel?'disabled':''}>${icon(glyphs[story.id])}<span><b>${esc(text(story.title,lang))}</b><small>${story.age} ${c.age} · ${level<story.minLevel?`${c.locked} · ${story.minLevel+1}`:esc(text(story.goal,lang))}</small></span>${icon(level<story.minLevel?'book':'arrow')}</button>`).join('')}</div></section>`;
}
export function childhoodEnvelope(state: ChildhoodState, lang: Lang, ledger = false): string {
  const ui = gameplayCopy(lang);
  const balances = Object.entries(state.envelope).filter(([key,value])=>value!==0||key==='cash');
  return `<div class="story-envelope">${icon('wallet')}<b>${esc(ui.envelope)}</b>${balances.map(([key,value])=>`<span>${esc(label(key as keyof typeof accountLabels,lang))}: <strong>${esc(accountAmount(key,value,lang))}</strong></span>`).join('')}<p class="envelope-note">${esc(ui.envelopeNote)}</p></div>${Object.values(state.inventory).some(value=>value>0)?`<div class="childhood-bag">${Object.entries(state.inventory).filter(([,value])=>value>0).map(([key,value])=>`<span>${icon('bag')}${esc(text(childhoodItemText(key),lang))} × ${value}</span>`).join('')}</div>`:''}${ledger?childhoodLedger(state,lang):''}`;
}
function childhoodLedger(state: ChildhoodState, lang: Lang): string {
  return `<details class="childhood-ledger"><summary>${copy(lang).history}</summary><ul>${state.ledger.slice(-12).reverse().map(entry=>`<li>${esc(text(entry.label,lang))}<div>${Object.entries(entry.accounts).filter(([,value])=>value!==0).map(([key,value])=>`<span>${esc(label(key as keyof typeof accountLabels,lang))} ${value!>0?'+':''}${esc(accountAmount(key,value!,lang))}</span>`).join(' · ')}${Object.entries(entry.items).filter(([,value])=>value!==0).map(([key,value])=>`<span> · ${esc(text(childhoodItemText(key),lang))} ${value>0?'+':''}${value}</span>`).join('')}</div></li>`).join('')}</ul></details>`;
}
export function childhoodOutcomeChanges(before: ChildhoodState, after: ChildhoodState): ReceiptChange[] {
  const rows: ReceiptChange[] = [];
  for (const key of Object.keys(accountLabels) as (keyof typeof accountLabels)[]) {
    const value = after.envelope[key] - before.envelope[key];
    if (value) rows.push({ label: Object.fromEntries(['zh','en','ja','mn','mn-Mong'].map((lang,index) => [lang, accountLabels[key][index]])) as import('./model').Text, value, ...(['shells','copper','silver','gold','paper'].includes(key) ? {} : { money: key === 'foreignCash' || key === 'cardPending' ? 'foreign' as const : 'home' as const }), physical: key === 'cash' || key === 'foreignCash' });
  }
  for (const item of new Set([...Object.keys(before.inventory), ...Object.keys(after.inventory)])) {
    const value = (after.inventory[item] ?? 0) - (before.inventory[item] ?? 0);
    if (value) rows.push({ label: childhoodItemText(item), value, item });
  }
  return rows;
}
export function childhoodConversation(state: ChildhoodState, lang: Lang, feedback?: import('./model').Text, ok = true, selected?: string, sound = false, purchase?: string, change?: ChangeSelection, changes: ReceiptChange[] = []): string {
  const v = childhoodView(state), c = copy(lang), ui = gameplayCopy(lang);
  const t = (value: import('./model').Text) => esc(text(value,lang));
  const focused = v.choices.find(offer => offer.id === (selected ?? change?.id));
  const groups: { kind: ActionKind; offers: typeof v.choices }[] = [];
  for (const offer of v.choices) {
    const kind = storyActionKind(state, offer), group = groups.find(group => group.kind === kind);
    if (group) group.offers.push(offer); else groups.push({ kind, offers: [offer] });
  }
  const quoteHtml = (quote: ChildhoodQuote) => `<span><b>${t(quote.label)}</b> ${esc(quoteAmount(quote, lang))}</span>`;
  const relatedQuote = (quote: ChildhoodQuote, offer: typeof v.choices[number]) => quote.choiceId ? quote.choiceId === offer.id : text(quote.label, lang) === text(offer.label, lang);
  const options = groups.map((group, index) => `<section class="action-step step-${group.kind}"><h3 class="step-heading"><span class="step-number">${index + 1}</span>${esc(presentationText(group.kind, lang))}</h3><div class="step-options ${group.kind === 'change' ? 'change-options' : ''}">${group.offers.map(offer => {
    const preview = group.kind === 'choose';
    const related = v.quotes.filter(quote => relatedQuote(quote, offer));
    return `<div class="story-option ${purchase === offer.id ? 'selected-story-option' : ''}"><div class="choice-pair"><button id="childhood-action-${offer.id}" ${preview ? `data-childhood-select="${offer.id}" aria-pressed="${purchase === offer.id}"` : group.kind === 'change' ? `data-change-select="${offer.id}" aria-pressed="${change?.id === offer.id}"` : `data-childhood-action="${offer.id}"`} class="choice" ${offer.disabled ? 'disabled' : ''}>${group.kind === 'change' ? moneyArtwork(Math.max(0, state.envelope.change - (offer.id === 'accept-short' ? 20 : 0)), lang) : icon(offer.icon)}<span><b>${t(offer.label)}</b></span>${icon('arrow')}</button><button id="childhood-explain-${offer.id}" data-childhood-explain="${offer.id}" class="choice-explain" aria-label="${esc(presentationText('details', lang))}: ${t(offer.label)}">${icon('help')}</button></div>${related.length ? `<div class="story-option-terms">${related.map(quoteHtml).join('')}</div>` : ''}</div>`;
  }).join('')}</div>${group.kind === 'change' && change && group.offers.some(offer => offer.id === change.id) ? changeTray(change, lang, true) : ''}</section>`).join('');
  const confirmed = v.choices.find(offer => offer.id === purchase && storyActionKind(state, offer) === 'choose');
  const quotes = v.quotes.filter(quote => !v.choices.some(offer => relatedQuote(quote, offer)));
  return `<section class="conversation childhood-conversation step-conversation" aria-label="${c.speak}"><div class="action-scroll"><div class="speaker compact-speaker">${portrait('parent')}<div><h2>${t(v.speaker)}</h2>${feedback ? `<p class="spoken ${!ok ? 'choice-error' : ''}">${t(feedback)}</p>` : ''}</div></div>${feedback ? transferReceipt(changes, lang) : ''}${quotes.length ? `<div class="story-current-terms">${quotes.map(quoteHtml).join('')}</div>` : ''}${!v.completed ? `<div class="choices stepped-choices">${options}${confirmed ? `<section class="action-step step-confirm"><div class="purchase-controls"><button id="cancel-childhood-choice" data-childhood-cancel="true" class="secondary">${esc(presentationText('cancel', lang))}</button><button id="confirm-childhood-choice" data-childhood-action="${confirmed.id}" class="primary" ${confirmed.disabled ? 'disabled' : ''}>${icon('wallet')}${esc(presentationText(state.storyId === 'money' ? 'confirmChoice' : 'confirm', lang))}</button></div></section>` : ''}</div>` : `<div class="completion-actions"><span><span class="completion-keepsake" aria-hidden="true">${icon('heart')}</span>${c.done}</span><button id="leave-childhood-result" data-ui="leave-childhood" class="primary">${esc(ui.backStory)}${icon('arrow')}</button><button id="replay-childhood" data-ui="retry" class="secondary">${esc(ui.replayStory)}</button></div>`}</div>${!v.completed ? `<aside class="step-detail"><div><b>${esc(presentationText('current', lang))}${focused ? ' · ' + t(focused.label) : ''}</b><p>${focused ? `${focused.disabled ? t(focused.disabled) + ' ' : ''}${t(focused.detail)}` : t(v.nextStep)}</p></div><button id="listen-childhood-current" ${focused ? `data-childhood-listen="${focused.id}"` : 'data-ui="replay"'} class="choice-listen" ${sound ? '' : 'disabled'} aria-label="${c.speak}">${icon('sound')}</button></aside>` : ''}</section>`;
}
