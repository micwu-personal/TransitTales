import { CHILDHOOD_STORIES, childhoodView, childhoodItemText, type ChildhoodState, type ChildhoodQuote } from './childhood';
import type { Lang } from './model';
import { icon, portrait } from './art';
import { copy, escapeHtml as esc, money, text } from './copy';
import { gameplayCopy } from './gameplay-copy';
import { common } from './legacy-localization';
import { lifeText } from './life';

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
function amount(value: number, lang: Lang, foreign = false): string { return `${money(value, lang)} ${foreign ? text(lifeText('ui.shells'), lang) : copy(lang).yuan}`; }
function accountAmount(key: string, value: number, lang: Lang): string {
  return ['shells','copper','silver','gold','paper'].includes(key) ? String(value) : amount(value, lang, key === 'foreignCash' || key === 'cardPending');
}
export function quoteAmount(quote: ChildhoodQuote, lang: Lang): string {
  if (quote.unit === 'home' || quote.unit === 'foreign') return amount(quote.value, lang, quote.unit === 'foreign');
  if (quote.unit === 'rate') return `1 ${text(lifeText('ui.shells'),lang)} = ${amount(quote.value,lang)}`;
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
export function childhoodConversation(state: ChildhoodState, lang: Lang, feedback?: import('./model').Text, ok = true): string {
  const v = childhoodView(state), c = copy(lang), ui = gameplayCopy(lang);
  const t = (value: import('./model').Text) => esc(text(value,lang));
  return `<section class="conversation childhood-conversation" aria-label="${c.speak}"><div class="speaker">${portrait('parent')}<div><h2>${t(v.speaker)}</h2><p class="spoken ${!ok?'choice-error':''}">${t(feedback??v.message)}</p></div></div>${childhoodEnvelope(state,lang)}${v.quotes.length?`<div class="childhood-quotes">${v.quotes.map((quote,index)=>`<div class="childhood-quote"><b>${t(quote.label)}</b><p>${esc(quoteAmount(quote,lang))}</p><button id="childhood-quote-${index}" data-childhood-quote="${index}" class="choice-listen" aria-label="${c.speak}: ${t(quote.label)}">${icon('sound')}</button></div>`).join('')}</div>`:''}${!v.completed?`<aside class="next-step">${icon('arrow')}<div><b>${esc(ui.nextStep)}</b><p>${t(v.nextStep)}</p></div></aside><div class="choices">${v.choices.map(offer=>`<div class="choice-pair"><button id="childhood-action-${offer.id}" data-childhood-action="${offer.id}" class="choice" ${offer.disabled?'disabled':''}>${icon(offer.icon)}<span><b>${t(offer.label)}</b><small>${t(offer.detail)}</small>${offer.disabled?`<em>${t(offer.disabled)}</em>`:''}</span>${icon('arrow')}</button><button id="childhood-listen-${offer.id}" data-childhood-listen="${offer.id}" class="choice-listen" aria-label="${t(lifeText('ui.listen-choice'))}: ${t(offer.label)}">${icon('sound')}</button></div>`).join('')}</div>`:`<div class="completion-actions"><span><span class="completion-keepsake" aria-hidden="true">${icon('heart')}</span>${c.done}</span><button id="leave-childhood-result" data-ui="leave-childhood" class="primary">${esc(ui.backStory)}${icon('arrow')}</button><button id="replay-childhood" data-ui="retry" class="secondary">${esc(ui.replayStory)}</button></div>`}${childhoodLedger(state,lang)}</section>`;
}
