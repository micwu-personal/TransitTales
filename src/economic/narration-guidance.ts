import { common, itemText } from './legacy-localization';
import { amountIds, numberIds, scriptIds, type NarrationCue } from './narration';
import { itemUnit, unitScript, smallQuantityScript } from './item-quantity';
import { text, money, copy } from './copy';
const clause = (ids: string[], lang: Lang): NarrationCue[] => lang === 'zh' ? [ids] : ids;
import { balance, lifeText as catalogText } from './life';
import { getPrices, type GameState, type Lang, type Offer, type Place } from './model';
export function balanceNarration(state:GameState,lang:Lang):NarrationCue[] {
  const ids=['ui.pocket',...amountIds(state.life?balance(state.life,'house.cash'):state.cash,lang),'legacy.common.digital',...amountIds(state.life?balance(state.life,'house.digital'):state.digital,lang),'legacy.common.savings',...amountIds(state.life?balance(state.life,'house.savings'):state.savings,lang),'ui.owed',...amountIds(state.life?-balance(state.life,'house.loan')-balance(state.life,'house.loanInterest')-balance(state.life,'house.mortgage')-balance(state.life,'house.mortgageInterest')-balance(state.life,'house.legacyDebt'):state.debt,lang)];
  const f=state.flags;
  if(state.level>=18&&!state.life)ids.push('legacy.common.foreign-cash',...amountIds(f.foreignCash??0,lang,'foreign'),'legacy.common.foreign-debt',...amountIds(f.foreignDebt??0,lang,'foreign'),'legacy.common.fx',...amountIds(f.fxRate??200,lang));
  if(f.pendingChange)ids.push('legacy.common.change-money',...amountIds(f.pendingChange,lang));
  for(const [id,count] of Object.entries(state.inventory)){if(count>0)ids.push(...scriptIds([itemText(id)]),'legacy.common.quantity',...numberIds(count,lang));}
  if(state.life){const l=state.life;ids.push('ui.company-cash',...amountIds(balance(l,'company.cash'),lang),'legacy.common.company-debt',...amountIds(-balance(l,'company.loan')-balance(l,'company.loanInterest'),lang),'legacy.common.supplier-debt',...amountIds(-balance(l,'company.supplierDebt'),lang),'legacy.common.foreign-cash',...amountIds(l.foreign,lang,'foreign'),'legacy.common.receivable',...amountIds(l.foreignReceivable,lang,'foreign'),'legacy.common.delivered',...numberIds(l.goods.delivered??0,lang),'legacy.common.damaged',...numberIds(l.goods.lostInTransit??0,lang),'legacy.common.ownership',...numberIds(l.ownership,lang));}
  if(lang!=='zh')return ids;
  const clauses:string[][]=[];
  for(const id of ids){
    if(!id.startsWith('number.')&&!id.startsWith('money.')&&!['ui.yuan','ui.jiao','ui.cents','ui.money-ending','ui.shells','ui.shell-cents','ui.and','legacy.common.quantity'].includes(id))clauses.push([]);
    (clauses[clauses.length-1]??(clauses[0]=[])).push(id);
  }
  return clauses;
}
export function choiceNarration(state:GameState,offer:Offer,lang:Lang):NarrationCue[] {
  const ids:NarrationCue[]=scriptIds([offer.label,offer.detail,...(offer.disabled?[offer.disabled]:[])]);
  for(const fact of offer.facts??[])ids.push(...clause([...scriptIds([common(fact.id as keyof typeof import('./legacy-content.json').common)]),...(fact.money?amountIds(fact.value,lang,fact.money):numberIds(fact.value,lang))],lang));
  return [...ids,...balanceNarration(state,lang)];
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
  if(before.day!==after.day||before.life?.turn!==after.life?.turn)ids.push(...clause(['legacy.common.current-day',...numberIds(after.life?.turn??after.day,lang)],lang));
  return [...ids,...balanceNarration(after,lang)];
}
