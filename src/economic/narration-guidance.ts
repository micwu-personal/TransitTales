import { common, itemText } from './legacy-localization';
import { amountIds, numberIds, scriptIds, type NarrationCue } from './narration';
import { itemUnit, unitScript, smallQuantityScript } from './item-quantity';
import { text, money, copy } from './copy';
const clause = (ids: string[], lang: Lang): NarrationCue[] => lang === 'zh' ? [ids] : ids;
import { balance, lifeText as catalogText } from './life';
import { getPrices, type GameState, type Lang, type Offer, type Place } from './model';
export function balanceNarration(state:GameState,lang:Lang):NarrationCue[] {
  const result:NarrationCue[]=[], l=state.life;
  const add=(id:string,value:number,unit:'home'|'foreign'='home')=>result.push(...clause([id,...amountIds(value,lang,unit)],lang));
  add('ui.pocket',l?balance(l,'house.cash'):state.cash);
  const digital=l?balance(l,'house.digital'):state.digital;
  const savings=l?balance(l,'house.savings'):state.savings;
  const debt=l?-balance(l,'house.loan')-balance(l,'house.loanInterest')-balance(l,'house.mortgage')-balance(l,'house.mortgageInterest')-balance(l,'house.legacyDebt'):state.debt;
  if(digital)add('legacy.common.digital',digital);
  if(savings||state.bankTerm)add('legacy.common.savings',savings);
  if(debt||state.loan)add('ui.owed',debt);
  const f=state.flags;
  if(f.foreignCash&&!l)add('legacy.common.foreign-cash',f.foreignCash,'foreign');
  if(f.foreignDebt&&!l)add('legacy.common.foreign-debt',f.foreignDebt,'foreign');
  if(f.pendingChange)add('legacy.common.change-money',f.pendingChange);
  for(const [id,count] of Object.entries(state.inventory))if(count>0)result.push(...clause([...scriptIds([itemText(id)]),'legacy.common.quantity',...numberIds(count,lang)],lang));
  if(l){
    for(const [id,value] of [['ui.company-cash',balance(l,'company.cash')],['legacy.common.company-debt',-balance(l,'company.loan')-balance(l,'company.loanInterest')],['legacy.common.supplier-debt',-balance(l,'company.supplierDebt')]] as const)if(value)add(id,value);
    if(l.foreign)add('legacy.common.foreign-cash',l.foreign,'foreign');
    if(l.foreignReceivable)add('legacy.common.receivable',l.foreignReceivable,'foreign');
  }
  return result;
}
export function choiceNarration(state:GameState,offer:Offer,lang:Lang):NarrationCue[] {
  const ids:NarrationCue[]=scriptIds(offer.purchase ? [itemText(offer.purchase.item),common(offer.purchase.payment==='prepaid'?'prepaid-purchase':offer.purchase.currency==='foreign'?'foreign-purchase':'cash-purchase'),...(offer.disabled?[offer.disabled]:[])] : [offer.label,offer.detail,...(offer.disabled?[offer.disabled]:[])]);
  const facts=offer.purchase?(offer.facts??[]).filter(fact=>['quantity','unit-price','total'].includes(fact.id)):offer.facts??[];
  for(const fact of facts)ids.push(...clause([...scriptIds([common(fact.id as keyof typeof import('./legacy-content.json').common)]),...(fact.money?amountIds(fact.value,lang,fact.money):numberIds(fact.value,lang))],lang));
  return ids;
}
export function priceNarration(state:GameState,place:Place,lang:Lang):NarrationCue[] {return (place==='shop'?getPrices(state):[]).flatMap(p=>[...clause([...scriptIds([p.label]),'legacy.common.unit-price',...amountIds(p.price,lang,p.currency==='foreign'?'foreign':'home')],lang),...clause(['legacy.common.stock-count',...numberIds(p.stock,lang)],lang)]);}

export type OutcomeChange={label:import('./model').Text,value:number,money?:'home'|'foreign',item?:string};
export function outcomeChangeText(row:OutcomeChange,lang:Lang):string {
  const label=text(row.label,lang).replace(/[:：,，]\s*$/,'');
  const direction=text(common(row.value<0?'change-down':'change-up'),lang);
  const value=Math.abs(row.value);
  const currency=row.money==='foreign'?text(catalogText('ui.shells'),lang).replace(/[。.]$/,''):copy(lang).yuan;
  const quantity=row.money?`${money(value,lang)}${lang==='zh'?'':' '}${currency}`:String(value);
  if(lang==='zh')return `${row.item?'背包里的':''}${label}${direction}${quantity}${row.item?itemUnit(row.item):''}。`;
  return `${label}: ${direction} ${quantity}`;
}
export function outcomeChanges(before:GameState,after:GameState):OutcomeChange[]{
  const rows:OutcomeChange[]=[],add=(label:import('./model').Text,old:number,current:number,money?:'home'|'foreign',item?:string)=>{if(old!==current)rows.push({label,value:current-old,...(money?{money}:{}),...(item?{item}:{})});};
  for(const [label,field] of [['pocket','cash'],['owed','debt']] as const){const value=(s:GameState)=>s.life?field==='cash'?balance(s.life,'house.cash'):-balance(s.life,'house.loan')-balance(s.life,'house.loanInterest')-balance(s.life,'house.mortgage')-balance(s.life,'house.mortgageInterest')-balance(s.life,'house.legacyDebt'):s[field];add({...catalogText(`ui.${label}`)},value(before),value(after),'home');}
  for(const field of ['savings','digital'] as const)add(common(field),before.life?balance(before.life,`house.${field}`):before[field],after.life?balance(after.life,`house.${field}`):after[field],'home');
  for(const [label,field] of [['foreign-cash','foreignCash'],['foreign-debt','foreignDebt'],['change-money','pendingChange']] as const)if(!after.life)add(common(label),before.flags[field]??0,after.flags[field]??0,field==='pendingChange'?'home':'foreign');
  for(const id of new Set([...Object.keys(before.inventory),...Object.keys(after.inventory)]))add(itemText(id),before.inventory[id]??0,after.inventory[id]??0,undefined,id);
  if(before.life&&after.life){for(const [label,field] of [['company-owner','company.cash'],['supplier-debt','company.supplierDebt'],['reserves','bankA.reserves']] as const)add(common(label),balance(before.life,field)*(field==='company.supplierDebt'?-1:1),balance(after.life,field)*(field==='company.supplierDebt'?-1:1),'home');add(common('foreign-cash'),before.life.foreign,after.life.foreign,'foreign');add(common('receivable'),before.life.foreignReceivable,after.life.foreignReceivable,'foreign');for(const [label,field] of [['delivered','delivered'],['delivered','ordersDelivered'],['damaged','lostInTransit']] as const)add(common(label),before.life.goods[field]??0,after.life.goods[field]??0);}
  return rows;
}
export function outcomeNarration(before:GameState,after:GameState,message:import('./model').Text,lang:Lang):NarrationCue[]{
  const ids:NarrationCue[]=scriptIds([message]),changes=outcomeChanges(before,after);if(changes.length)ids.push('legacy.common.changes');
  for(const row of changes){
    const value=Math.abs(row.value),wholeQuantity=lang==='zh'&&row.item?smallQuantityScript(row.item,value):undefined;
    const quantity=wholeQuantity?[wholeQuantity]:[...numberIds(value,lang),...(lang==='zh'&&row.item?[unitScript(row.item)]:[])];
    ids.push(...clause([...(lang==='zh'&&row.item?['ui.bag-item']:[]),...scriptIds([row.label]),row.value<0?'legacy.common.change-down':'legacy.common.change-up',...(row.money?amountIds(value,lang,row.money):quantity)],lang));
  }
  return ids;
}
