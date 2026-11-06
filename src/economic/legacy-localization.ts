import content from './legacy-content.json';
import { familyOffer } from './family-copy';
import { speechFor } from './speech-cues';
const scriptCue=(value:Text)=>speechFor(value)??[];
import { withSpeech } from './speech-cues';
import type { GameState, Lang, Level, Offer, Place, Text } from './model';
import { text } from './copy';
import { copy } from './copy';
export function common(id:keyof typeof content.common):Text {return withSpeech({...content.common[id]},`legacy.common.${id}`);}
export function itemText(id:string,original?:Text):Text {
  const names=content.items[id as keyof typeof content.items];
  if(!names)throw new Error(`Missing localized item ${id}`);
  return withSpeech({...names,...(original?{zh:original.zh,en:original.en}:{})},`legacy.item.${id}`);
}
export function legacyLevel(level:Level,index:number):Level {
  const scene=content.stories[index],localized=(original:Text,field:'title'|'body',id:string)=>withSpeech({...original,ja:scene.ja[field],mn:scene.mn[field],'mn-Mong':scene['mn-Mong'][field]},id);
  return {...level,title:localized(level.title,'title',`legacy.${level.id}.title`),goal:localized(level.goal,'body',`legacy.${level.id}.body`),intro:localized(level.intro,'body',`legacy.${level.id}.body`),person:{...level.person,ja:'お話のなかま',mn:'Түүхийн найз','mn-Mong':'ᠲᠡᠦᠬᠡ ᠶᠢᠨ ᠨᠠᠢᠵᠠ'},topic:localized(level.topic,'title',`legacy.${level.id}.title`)};
}
export function legacyOffer(offer:Offer,state?:GameState,destination?:Place):Offer {
  if(offer.id.startsWith('talk-')){const guidance=state?.completed?common('complete'):state?common(`visit-${destination??'home'}` as keyof typeof content.common):common('visit');return {...offer,label:withSpeech({...guidance,zh:offer.label.zh,en:offer.label.en},...scriptCue(guidance)),detail:withSpeech({...guidance,zh:offer.detail.zh,en:offer.detail.en},...scriptCue(guidance))};}
  const guidance=content.actions[offer.id as keyof typeof content.actions];
  if(!guidance)throw new Error(`Missing localized action ${offer.id}`);
  const local=(original:Text,label=false)=>withSpeech({...original,ja:label?guidance.ja.split('。')[0]:guidance.ja,mn:label?guidance.mn.split('.')[0]:guidance.mn,'mn-Mong':label?guidance['mn-Mong'].split('᠃')[0]:guidance['mn-Mong']},`legacy.action.${offer.id}`);
  let disabled:Text|undefined;
  if(offer.disabled){const reason=offer.disabled.zh;const kind=reason.includes('不够')||reason.includes('预算')?'funds':reason.includes('已经')||reason.includes('完成，不会')?'already':reason.includes('售完')||reason.includes('买过')?'stock':'prepare';disabled=withSpeech({...common(kind),zh:reason,en:offer.disabled.en},`legacy.common.${kind}`);}
  const item=offer.id==='buy-loan-item'&&state?['shared-book','supplies','kit'][state.level-12]:offer.id.startsWith('buy-')?offer.id.slice(4):undefined;
  const contextual=item&&item in content.items?itemText(item,offer.label):undefined;
  const payment=offer.facts?.some(f=>f.money==='foreign')?'foreign-purchase':offer.id==='pay-digital'||offer.id==='pay-bus-qr'||offer.id==='pay-sticker-qr'?'prepaid-purchase':'cash-purchase';
  const localized = {...offer,label:contextual??local(offer.label,true),detail:contextual?common(payment):local(offer.detail),...(disabled?{disabled}:{})};
  return state ? familyOffer(localized, state) : localized;
}
export function legacyResult(message:Text,id:string,ok:boolean,completed:boolean):Text {
  let kind:keyof typeof content.common=completed?'complete':!ok?'prepare':'ready';
  if(typeof id!=='string')return common('prepare');
  if(id.startsWith('talk-'))kind=completed?'complete':'visit';
  else if(id.startsWith('wait-')||id==='delay-card'||id==='fly-home')kind='time';
  else if(id.includes('work')||['collect-pay','allowance','receive-gift','travel-envelope'].includes(id))kind='work';
  else if(id.startsWith('buy-')||id.startsWith('book-')||['pay-note','pay-digital','pay-bus-qr','pay-sticker-qr','order-home-souvenir'].includes(id))kind='purchase-result';
  else if(id==='borrow'||id==='pay-parent-card')kind='borrow-result';
  else if(id==='repay'||id==='settle-parent-card')kind='repay-result';
  else if(id==='deposit')kind='deposit-result';
  else if(id==='reserve-two'||id==='seal-reserve')kind='reserve-result';
  else if(id==='withdraw')kind='withdraw-result';
  else if(id==='load-wallet'||id==='cash-out-wallet')kind='wallet-result';
  else if(id==='return-plush'||id==='refund-card-snacks')kind='refund-result';
  else if(id.startsWith('exchange-'))kind='fx-result';
  else if(id==='collect-change'||id==='collect-rest')kind='change-result';
  else if(id==='accept-swap')kind='swap-result';
  else if(['share-apples','pack-lunch','deliver-bread','deliver-juice','share-swap-snack','start-picnic','serve-bread'].includes(id)&&ok)kind='consume-result';
  if(message.zh.includes('变质')||message.zh.includes('不能给孩子吃'))kind='spoiled-result';
  if(id==='refund-card-snacks')kind='card-refund-result';
  if(id==='withdraw'&&message.zh.includes('提前'))kind='early-result';
  if(id==='wait-bank'&&message.zh.includes('到期，利息'))kind='matured';
  if(!ok)kind=message.zh.includes('不够')?'funds':'prepare';
  if(completed)kind='complete';
  return withSpeech({...common(kind),zh:message.zh,en:message.en},`legacy.common.${kind}`);
}
export function ledgerText(label:Text):Text {
  if(label.ja&&label.mn&&label['mn-Mong'])return label;
  const kind:keyof typeof content.common=label.zh.includes('利息')?'interest':label.zh.includes('借款')||label.zh.includes('欠款')?'principal':label.zh.includes('存')?'savings':label.zh.includes('数字')?'digital':label.zh.includes('汇率')||label.zh.includes('贝币')?'fx':label.zh.includes('找零')?'change-money':'entry';
  return {...common(kind),zh:label.zh,en:label.en};
}
export function accountText(account:string,lang:Lang):string {
  const [entity,asset]=account.split('.');
  const owner=entity==='house'?common('household'):entity==='company'?common('company-owner'):entity==='bankA'?common('bank-a'):entity==='bankB'?common('bank-b'):entity==='central'?common('central'):entity==='government'?common('government'):entity==='insurer'?common('insurer'):common('counterparty');
  const category=asset.toLowerCase().includes('interest')?common('interest'):asset.toLowerCase().includes('loan')||asset==='mortgage'?common('principal'):asset==='reserves'?common('reserves'):asset==='notes'?common('notes'):asset==='capital'||asset==='equity'?common('capital'):asset==='cash'?{zh:copy('zh').cash,en:copy('en').cash,ja:copy('ja').cash,mn:copy('mn').cash,'mn-Mong':copy('mn-Mong').cash}:common('asset-claim');
  return `${text(owner,lang)} · ${text(category,lang)}`;
}
