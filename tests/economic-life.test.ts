import { describe, it, expect } from 'vitest';
import { act, advance, createGame, getActions, getLevel, getProgress, netWorth, CAMPAIGN_COUNT, type GameState } from '../src/economic/model';
import { auditLife, balance, openLife, post, LIFE_STORIES } from '../src/economic/life';
import { saveGame, loadGame, migrateSave, SAVE_KEY, LEGACY_SAVE_KEY } from '../src/economic/storage';
import { text, copy } from '../src/economic/copy';
import { common } from '../src/economic/legacy-localization';
import { scriptIds } from '../src/economic/narration';
import { choiceNarration, balanceNarration, outcomeChanges, outcomeNarration } from '../src/economic/narration-guidance';
import catalog from '../src/economic/narration-catalog.json';
import { validLife } from '../src/economic/life-storage';
const sequences = [
['read-tags','buy-apple','share-apples'],['make-list','buy-apple','buy-bread','pack-lunch'],['check-price','pay-note','collect-change','deliver-bread'],['assign-chores','sort-socks','sweep-room','collect-pay','show-room'],['allowance','reserve-two','seal-reserve','buy-book','check-jars'],['receive-gift','gift-plan','buy-gift','give-present'],['observe-shelf','wait-delivery','unload-truck','buy-apple','share-apples'],['compare-stalls','wait-crowd','check-quiet-price','buy-juice','deliver-juice'],['read-forecast','buy-umbrella','wait-weather','pack-weather'],['compare-bread','buy-markdown','serve-bread'],['sort-stickers','offer-swap','accept-swap','buy-apple','share-swap-snack'],['change-coins','parent-wallet','load-wallet','pay-digital','cash-out-wallet'],...Array.from({length:3},()=>['read-loan','borrow','buy-loan-item','loan-work','wait-due','repay','close-loan']),['parent-bank','deposit','wait-bank','wait-bank','withdraw','buy-bank-paper','check-bank'],['allowance','parent-bank','deposit','buy-book','wait-bank','keep-picnic-savings'],['assign-picnic','picnic-work','parent-bank','withdraw','buy-apple','buy-bread','buy-juice','start-picnic'],['travel-envelope','plan-trip','book-tickets','book-room','seal-trip-budget'],['read-exchange','exchange-shells','pay-bus-qr','ride-island-bus'],['compare-fx-prices','buy-foreign-souvenir','pack-souvenirs'],['read-customs','declare-gifts','pay-customs','customs-stamp'],['parent-card-terms','pay-parent-card','fly-home','review-card-bill'],['read-home-bill','exchange-home','settle-parent-card','finish-travel']
];
function entry(children:1|2|3=1,gender:'boy'|'girl'='girl',seed=2026):GameState {
  let s=createGame({children,gender},seed);
  for(const sequence of sequences){for(const id of sequence){const result=act(s,id);expect(result.ok,`${s.level}:${id}`).toBe(true);s=result.state;}s=advance(s);}
  return s;
}
function choose(s:GameState,id:string):GameState {const result=act(s,id);expect(result.ok,`${s.level} ${id}: ${result.message.en}`).toBe(true);expect(auditLife(result.state.life!)).toBe(true);return result.state;}
function memory(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
function chapter(s:GameState,bold:boolean):GameState {
  const desired=bold?'life-bold':'life-safe';
  for(let attempt=0;attempt<40;attempt++){
    const offers=getActions(s,getLevel(s).place),offer=offers.find(o=>o.id===desired);
    if(offer&&!offer.disabled)return choose(s,desired);
    const refill=offers.find(o=>o.id==='life-wait-trade')??offers.find(o=>o.id==='life-contribute')??offers.find(o=>o.id==='life-shift'&&!o.disabled)??offers.find(o=>o.id==='life-reserve'&&!o.disabled)??offers.find(o=>o.id==='life-sell-home')??offers.find(o=>o.id==='life-retirement-work');
    if(!refill)throw new Error(`No recovery at ${s.level}: ${offers.map(o=>`${o.id}:${!!o.disabled}`).join()}`);
    s=choose(s,refill.id);
  }
  throw new Error(`Recovery exhausted ${s.level}`);
}
describe('economic life campaign',()=>{
  for(const gender of ['boy','girl'] as const)for(const children of [1,2,3] as const)for(const bold of [false,true])it(`completes ${gender}, ${children} children, ${bold?'adventurous':'careful'} route`,()=>{
    let s=entry(children,gender),previousAge=12;
    for(let level=24;level<CAMPAIGN_COUNT;level++){
      const checkpoint=structuredClone(s),store=memory();
      expect(s.life!.age).toBeGreaterThanOrEqual(previousAge);previousAge=s.life!.age;
      const before=JSON.stringify(s);getActions(s,getLevel(s).place);getProgress(s);netWorth(s);expect(JSON.stringify(s)).toBe(before);
      s=chapter(s,bold);expect(saveGame(store,{state:s,checkpoint,lang:'mn-Mong'}),`save level ${level}`).toBe(true);expect(loadGame(store)?.state).toEqual(s);
      for(let attempts=0;getActions(s,getLevel(s).place).find(o=>o.id==='life-observe')?.disabled&&attempts<40;attempts++){const offers=getActions(s,getLevel(s).place);const helper=offers.find(o=>o.id==='life-pay-supplier'&&!o.disabled)??offers.find(o=>o.id==='life-facility-recovery')??offers.find(o=>o.id==='life-wait-trade')??offers.find(o=>o.id==='life-contribute')??offers.find(o=>o.id==='life-retirement-work');if(!helper)throw new Error('Missing final recovery');s=choose(s,helper.id);}
      s=choose(s,'life-observe');expect(s.completed).toBe(true);expect(validLife(s.life,s.level,children),`validate level ${level}`).toBe(true);
      expect(Object.values(s.life!.accounts).every(Number.isSafeInteger)).toBe(true);
      s=advance(s);
    }
    expect(s.level).toBe(CAMPAIGN_COUNT-1);expect(s.life!.age).toBe(70);expect(s.life!.siblingAges).toHaveLength(children-1);expect(s.life!.childrenAges).toHaveLength(bold?2:1);expect(s.family).toEqual({gender,children});
  });
  it('imports legacy money without transition income or duplicated claims',()=>{
    const s=createGame({gender:'girl',children:2});s.flags.pendingChange=25;s.cash=140;s.savings=80;s.digital=30;s.debt=50;
    const l=openLife(s);expect(balance(l,'house.cash')).toBe(140);expect(balance(l,'house.savings')).toBe(80);expect(balance(l,'house.digital')).toBe(30);expect(balance(l,'house.receivable')).toBe(25);expect(balance(l,'house.legacyDebt')).toBe(-50);expect(auditLife(l)).toBe(true);
  });
  it('keeps v1 obligations and checkpoints during explicit migration',()=>{
    let s=createGame({gender:'boy',children:3});s.version=1;const original=structuredClone(s),m=migrateSave({state:s,checkpoint:structuredClone(s),lang:'zh'});
    expect(m.state).toEqual({...original,version:2});expect(s).toEqual(original);
    const store=memory();store.setItem(LEGACY_SAVE_KEY,JSON.stringify({state:s,checkpoint:s,lang:'zh'}));expect(loadGame(store)).toEqual(m);expect(saveGame(store,m)).toBe(true);expect(store.getItem(SAVE_KEY)).not.toBeNull();
  });
  it('rejects malicious life shape and forged journal totals',()=>{
    const s=entry(),check=structuredClone(s);for(const mutate of [(v:GameState)=>{v.life!.accounts['house.cash']++;},(v:GameState)=>{v.life!.turn=.5;},(v:GameState)=>{v.life!.bank.reserveRatio=NaN;},(v:GameState)=>{v.life!.childrenAges=[-1];},(v:GameState)=>{Object.defineProperty(v.life!.accounts,'constructor',{value:12,enumerable:true});}]){const bad=structuredClone(s);mutate(bad);expect(saveGame(memory(),{state:bad,checkpoint:check,lang:'ja'})).toBe(false);}
    expect(()=>post(s.life!,'bad',[{account:'house.cash',amount:1},{account:'external.cash',amount:0}])).toThrow();
  });
  it('creates paired bank deposits and loans without adding reserves or household wealth',()=>{
    let s=entry();while(s.level<53){s=advance(choose(chapter(s,false),'life-observe'));}
    expect(LIFE_STORIES[s.level-24][0]).toBe('credit');const before=structuredClone(s.life!),worth=netWorth(s);s=choose(s,'life-safe');const l=s.life!;
    expect(balance(l,'bankA.loans')-balance(before,'bankA.loans')).toBe(1000);expect(balance(l,'company.loan')-balance(before,'company.loan')).toBe(-1000);expect(balance(l,'company.deposit')-balance(before,'company.deposit')).toBe(1000);expect(balance(l,'bankA.deposits')-balance(before,'bankA.deposits')).toBe(-1000);expect(balance(l,'bankA.reserves')).toBe(balance(before,'bankA.reserves'));expect(netWorth(s)).toBe(worth);
    s=advance(choose(s,'life-observe'));const a=balance(s.life!,'bankA.reserves'),b=balance(s.life!,'bankB.reserves');s=choose(s,'life-safe');expect(balance(s.life!,'bankA.reserves')).toBe(a-500);expect(balance(s.life!,'bankB.reserves')).toBe(b+500);
  });
  it('fulfills safe33 prepayments independently after bold34 equity and blocks the final album until delivery',()=>{
    let s=entry();while(s.level<33)s=advance(choose(chapter(s,false),'life-observe'));
    s=advance(choose(chapter(s,false),'life-observe'));expect(s.life!.goods.prepaidOrders).toBe(5);expect(balance(s.life!,'company.orderLiability')).toBe(-500);
    s=chapter(s,true);expect(s.life!.ownership).toBe(80);
    const offer=getActions(s,getLevel(s).place).find(o=>o.id==='life-fulfill-orders')!;
    expect(offer.disabled).toBeUndefined();expect(offer.facts).toEqual([{id:'quantity',value:5},{id:'total',value:300,money:'home'}]);
    expect(choiceNarration(s,offer,'zh')).toContain('life.equity.safe');
    const immediate=choose(s,'life-fulfill-orders');expect(immediate.life!.ownership).toBe(80);expect(immediate.life!.goods.ordersDelivered).toBe(5);expect(balance(immediate.life!,'external.orderClaim')).toBe(0);
    s=advance(choose(s,'life-observe'));while(s.level<64)s=advance(choose(chapter(s,false),'life-observe'));
    const albumCheckpoint=structuredClone(s);s=chapter(s,false);expect(getActions(s,getLevel(s).place).find(o=>o.id==='life-observe')?.disabled).toBeDefined();
    const rejected=act(s,'life-observe');expect(rejected.ok).toBe(false);expect(rejected.state).toBe(s);
    const missing=structuredClone(s);missing.life!.goods.prepaidOrders=0;expect(validLife(missing.life,missing.level,1)).toBe(false);
    const cash=balance(s.life!,'company.cash');post(s.life!,'test.productionCost',[{account:'company.cash',amount:-cash},{account:'external.cash',amount:cash}]);
    expect(getActions(s,getLevel(s).place).find(o=>o.id==='life-fulfill-orders')?.disabled).toBeDefined();expect(act(s,'life-fulfill-orders').state).toBe(s);
    if(balance(s.life!,'house.cash')<1000)s=choose(s,'life-retirement-work');s=choose(s,'life-contribute');
    const before=structuredClone(s);s=choose(s,'life-fulfill-orders');expect(balance(s.life!,'company.cash')).toBe(balance(before.life!,'company.cash')-300);
    expect(s.life!.goods.prepaidOrders).toBe(0);expect(s.life!.goods.ordersDelivered).toBe(5);expect(balance(s.life!,'company.orderLiability')).toBe(0);expect(balance(s.life!,'external.orderClaim')).toBe(0);expect(s.life!.ownership).toBe(80);
    expect(outcomeChanges(before,s).some(row=>row.value===5)).toBe(true);expect(outcomeNarration(before,s,common('complete'),'zh').flat()).toContain('legacy.common.delivered');
    expect(saveGame(memory(),{state:s,checkpoint:albumCheckpoint,lang:'mn-Mong'})).toBe(true);expect(getActions(s,getLevel(s).place).some(o=>o.id==='life-fulfill-orders')).toBe(false);
    s=choose(s,'life-observe');expect(s.completed).toBe(true);
  });
  for(const depositFunded of [false,true])it(`settles accrued credit interest using ${depositFunded?'deposits without reserves':'cash received as reserves'}`,()=>{
    let s=entry();while(s.level<53)s=advance(choose(chapter(s,false),'life-observe'));
    const capital=balance(s.life!,'bankA.capital');s=advance(choose(chapter(s,depositFunded),'life-observe'));s=advance(choose(chapter(s,false),'life-observe'));
    const before=structuredClone(s.life!),worth=netWorth(s),interest=depositFunded?80:40;expect(balance(before,'bankA.reserves')).toBe(19500);expect(balance(before,'company.loanInterest')).toBe(-interest);expect(balance(before,'bankA.capital')).toBe(capital-interest);
    s=choose(s,'life-safe');const l=s.life!;
    expect(balance(l,'bankA.reserves')).toBe(19500+(depositFunded?0:40));expect(balance(l,'company.cash')).toBe(balance(before,'company.cash')-(depositFunded?0:40));
    expect(balance(l,'company.deposit')).toBe(balance(before,'company.deposit')-500-(depositFunded?80:0));expect(balance(l,'company.loanInterest')).toBe(0);expect(balance(l,'bankA.interestReceivable')).toBe(0);expect(l.loan.interest).toBe(0);expect(l.contracts.every(c=>c.accrued===0)).toBe(true);
    expect(balance(l,'bankA.income')).toBe(0);expect(balance(l,'bankA.capital')).toBe(balance(before,'bankA.capital'));expect(netWorth(s)).toBe(worth);
    expect(balance(l,'central.notes')-balance(before,'central.notes')).toBe(depositFunded?0:40);expect(balance(l,'central.reserves')-balance(before,'central.reserves')).toBe(depositFunded?0:-40);
    expect(saveGame(memory(),{state:s,checkpoint:s,lang:'zh'})).toBe(true);
  });
  for(const depositFunded of [false,true])it(`receives mortgage interest from ${depositFunded?'deposits':'cash'} without fictitious income assets`,()=>{
    let s=entry();while(s.level<40)s=advance(choose(chapter(s,false),'life-observe'));
    s=advance(choose(chapter(s,true),'life-observe'));expect(balance(s.life!,'house.mortgageInterest')).toBe(-160);
    if(depositFunded)post(s.life!,'test.cashDeposit',[{account:'house.cash',amount:-160},{account:'central.notes',amount:160},{account:'bankA.reserves',amount:160},{account:'central.reserves',amount:-160},{account:'house.deposit',amount:160},{account:'bankA.deposits',amount:-160}]);
    while(getActions(s,getLevel(s).place).find(o=>o.id==='life-safe')?.disabled)s=choose(s,'life-shift');
    const before=structuredClone(s.life!),interest=-balance(before,'house.mortgageInterest');s=choose(s,'life-safe');const l=s.life!;
    expect(balance(l,'bankA.reserves')-balance(before,'bankA.reserves')).toBe(500+interest-Math.min(interest,balance(before,'house.deposit')));expect(balance(l,'bankA.mortgageInterest')).toBe(0);expect(balance(l,'house.mortgageInterest')).toBe(0);expect(l.mortgage.principal).toBe(7500);expect(balance(l,'bankA.income')).toBe(0);expect(balance(l,'bankA.capital')).toBe(balance(before,'bankA.capital'));
    expect(saveGame(memory(),{state:s,checkpoint:s,lang:'ja'})).toBe(true);
  });
  it('pays household accrued interest before a three-turn collateral extension and recovers from insufficient cash',()=>{
    let s=entry();while(s.level<38)s=advance(choose(chapter(s,false),'life-observe'));s=advance(choose(chapter(s,true),'life-observe'));
    expect(balance(s.life!,'house.loan')).toBe(-1000);expect(balance(s.life!,'house.loanInterest')).toBe(-20);
    const before=structuredClone(s),paid=choose(s,'life-safe');expect(balance(paid.life!,'house.cash')).toBe(balance(s.life!,'house.cash')-20);expect(balance(paid.life!,'bankA.reserves')).toBe(balance(s.life!,'bankA.reserves')+20);expect(balance(paid.life!,'house.loan')).toBe(-1000);expect(balance(paid.life!,'house.loanInterest')).toBe(0);expect(paid.life!.loan.interest).toBe(0);expect(paid.life!.contracts.filter(c=>c.entity==='house').every(c=>c.accrued===0&&c.due===s.life!.turn+3)).toBe(true);
    const shortfall=balance(s.life!,'house.cash')-19;post(s.life!,'test.householdCost',[{account:'house.cash',amount:-shortfall},{account:'external.cash',amount:shortfall}]);
    const unavailable=getActions(s,getLevel(s).place).find(o=>o.id==='life-safe')!;expect(unavailable.disabled).toBeDefined();expect(unavailable.facts).toContainEqual({id:'interest',value:20,money:'home'});
    const serialized=JSON.stringify(s),rejected=act(s,'life-safe');expect(rejected.ok).toBe(false);expect(rejected.state).toBe(s);expect(JSON.stringify(s)).toBe(serialized);
    s=choose(s,'life-shift');expect(balance(s.life!,'house.loanInterest')).toBe(-40);const cash=balance(s.life!,'house.cash'),due=s.life!.turn+3;s=choose(s,'life-safe');expect(balance(s.life!,'house.cash')).toBe(cash-40);expect(balance(s.life!,'house.loanInterest')).toBe(0);expect(balance(s.life!,'house.loan')).toBe(-1000);expect(s.life!.loan.due).toBe(due);expect(saveGame(memory(),{state:s,checkpoint:before,lang:'en'})).toBe(true);
  });
  it('uses cash interest receipts for subsequent withdrawal liquidity, not an income-only balance',()=>{
    for(const reserves of [7980,7979]){
      let s=entry();while(s.level<38)s=advance(choose(chapter(s,false),'life-observe'));s=advance(choose(chapter(s,true),'life-observe'));
      const held=balance(s.life!,'bankA.reserves')-reserves;post(s.life!,'test.reservePlacement',[{account:'bankA.reserves',amount:-held},{account:'central.reserves',amount:held},{account:'bankA.facility',amount:held},{account:'central.facility',amount:-held}]);
      s=choose(s,'life-safe');expect(balance(s.life!,'bankA.reserves')).toBe(reserves+20);s=advance(choose(s,'life-observe'));
      const mortgage=getActions(s,getLevel(s).place).find(o=>o.id==='life-bold')!;
      if(reserves===7980){expect(mortgage.disabled).toBeUndefined();s=choose(s,'life-bold');expect(balance(s.life!,'bankA.reserves')).toBe(0);expect(balance(s.life!,'house.mortgage')).toBe(-8000);expect(balance(s.life!,'house.deposit')).toBe(0);}
      else{expect(mortgage.disabled).toBeDefined();const before=JSON.stringify(s),result=act(s,'life-bold');expect(result.ok).toBe(false);expect(result.state).toBe(s);expect(JSON.stringify(s)).toBe(before);}
      expect(validLife(s.life,s.level,1)).toBe(true);
    }
  });
  it('keeps seeded adverse market and insurance events deterministic after retry',()=>{
    for(const seed of [2026,2027]){let s=entry(2,'girl',seed);while(s.level<43)s=advance(choose(chapter(s,true),'life-observe'));const a=chapter(structuredClone(s),true),b=chapter(structuredClone(s),true);expect(a).toEqual(b);expect(a.life!.decisions.stormLoss).toBe(seed%2===0?'1500':'500');}
  });
  it('keeps inventory assets until sale or expiry and applies organization liability',()=>{
    let limited=entry();while(limited.level<28)limited=advance(choose(chapter(limited,false),'life-observe'));
    limited=advance(choose(chapter(limited,false),'life-observe'));
    while(limited.level<31)limited=advance(choose(chapter(limited,true),'life-observe'));
    limited=chapter(limited,true);expect(balance(limited.life!,'company.materials')).toBe(0);expect(balance(limited.life!,'company.bread')).toBe(1100);
    limited=advance(choose(limited,'life-observe'));const house=balance(limited.life!,'house.cash');limited=chapter(limited,true);
    expect(balance(limited.life!,'company.bread')).toBe(0);expect(balance(limited.life!,'house.cash')).toBe(house);expect(balance(limited.life!,'company.supplierDebt')).toBeLessThan(0);
    let sole=entry();while(sole.level<32)sole=advance(choose(chapter(sole,true),'life-observe'));const before=balance(sole.life!,'house.cash');sole=chapter(sole,true);expect(balance(sole.life!,'company.supplierDebt')).toBe(0);expect(balance(sole.life!,'house.cash')).toBeLessThan(before);
  });
  it('distinguishes public issuance, secondary sale, scheduled coupons and principal',()=>{
    let s=entry();while(s.level<52)s=advance(choose(chapter(s,false),'life-observe'));
    const initial=balance(s.life!,'government.cash');s=chapter(s,false);expect(balance(s.life!,'government.cash')).toBe(initial+1000);expect(balance(s.life!,'market.publicBond')).toBe(1000);expect(balance(s.life!,'house.publicBond')).toBe(0);
    s=advance(choose(s,'life-observe'));expect(balance(s.life!,'government.cash')).toBe(initial+970);
    for(let n=0;n<2;n++)s=advance(choose(chapter(s,false),'life-observe'));
    expect(balance(s.life!,'market.publicBond')).toBe(0);expect(balance(s.life!,'government.cash')).toBe(initial-30);
  });
  it('settles collateralized standing loans and interest without crediting household money',()=>{
    for(const bold of [false,true]){let s=entry();while(s.level<60)s=advance(choose(chapter(s,false),'life-observe'));
      const cash=balance(s.life!,'house.cash');s=chapter(s,bold);expect(balance(s.life!,'house.cash')).toBe(cash);
      expect(balance(s.life!,bold?'bankA.pledgedBonds':'bankA.facility')).toBe(500);
      s=advance(choose(s,'life-observe'));s=advance(choose(chapter(s,false),'life-observe'));if(balance(s.life!,'bankA.centralLoan')<0)s=choose(s,'life-facility-recovery');
      expect(balance(s.life!,'bankA.pledgedBonds')).toBe(0);expect(balance(s.life!,'bankA.facility')).toBe(0);expect(balance(s.life!,'central.bankLoan')).toBe(0);expect(auditLife(s.life!)).toBe(true);
    }
  });
  it('pools other families premiums and caps insurance payout after the deductible',()=>{
    let s=entry();while(s.level<42)s=advance(choose(chapter(s,false),'life-observe'));const pool=balance(s.life!,'insurer.cash');s=chapter(s,false);expect(balance(s.life!,'insurer.cash')).toBe(pool+400);
    s=advance(choose(s,'life-observe'));const cash=balance(s.life!,'house.cash');s=chapter(s,false);expect(balance(s.life!,'house.cash')).toBe(cash-500);expect(balance(s.life!,'insurer.cash')).toBe(pool-600);
  });

  it('rejects an invalid late posting atomically and keeps journal postings immutable',()=>{
    const l=openLife(entry()),before=structuredClone(l);expect(()=>post(l,'bad',[{account:'house.cash',amount:1},{account:'constructor',amount:-1}])).toThrow();expect(l).toEqual(before);
    const postings=[{account:'house.cash',amount:1},{account:'external.cash',amount:-1}];post(l,'valid',postings);postings[0].amount=999;expect(l.journal.at(-1)!.postings[0].amount).toBe(1);expect(auditLife(l)).toBe(true);
  });

  it('covers every reachable childhood/life offer, outcome and price in all five written locales and exact spoken IDs',()=>{
    const langs=['zh','en','ja','mn','mn-Mong'] as const,known=new Set(catalog.scripts.map(row=>row.id));
    const checkText=(value:import('../src/economic/model').Text)=>{for(const lang of langs){const prose=text(value,lang);expect(prose.trim()).not.toBe('');if(lang==='mn-Mong')expect(prose).not.toMatch(/[A-Za-z\u0400-\u04ff]/);}for(const id of scriptIds([value]))expect(known.has(id),id).toBe(true);};
    const inspect=(s:GameState)=>{const level=getLevel(s);for(const value of [level.title,level.goal,level.intro])checkText(value);for(const place of ['home','shop','school','bank','park'] as const)for(const offer of getActions(s,place)){checkText(offer.label);checkText(offer.detail);if(offer.disabled)checkText(offer.disabled);for(const lang of langs)for(const id of choiceNarration(s,offer,lang).flat())expect(known.has(id),id).toBe(true);}for(const lang of langs)for(const id of balanceNarration(s,lang).flat())expect(known.has(id),id).toBe(true);};
    for(const lang of langs){const ui=copy(lang);for(const [key,value] of Object.entries(ui)){if(typeof value==='string'){if(!['day','dayEnd'].includes(key))expect(value.trim(),key).not.toBe('');if(lang==='mn-Mong')expect(value).not.toMatch(/[A-Za-z\u0400-\u04ff]/);}}}
    let s=createGame({children:3,gender:'girl'});for(const sequence of sequences){for(const id of sequence){inspect(s);const r=act(s,id);checkText(r.message);s=r.state;}s=advance(s);}
    for(let level=24;level<CAMPAIGN_COUNT;level++){inspect(s);s=chapter(s,false);inspect(s);const r=act(s,'life-observe');checkText(r.message);s=advance(r.state);}
  },20000);
  it('settles delayed escrow and exposed-trade damage/default with observable paired goods and money',()=>{
    for(const seed of [2026,2027])for(const bold of [false,true]){let s=entry(2,'boy',seed);while(s.level<47)s=advance(choose(chapter(s,false),'life-observe'));s=chapter(s,bold);const l=s.life!;expect(l.goods.inTransit).toBe(10);expect(l.foreign).toBe(0);expect(balance(l,'company.inTransit')).toBeGreaterThan(0);expect(l.foreignReceivable).toBe(bold?400:0);s=advance(choose(s,'life-observe'));expect(LIFE_STORIES[s.level-24][0]).toBe('exchange');if(s.life!.goods.inTransit||s.life!.foreignReceivable)expect(getActions(s,getLevel(s).place).find(o=>o.id==='life-safe')?.disabled).toBeDefined();for(let n=0;(s.life!.goods.inTransit||s.life!.foreignReceivable)&&n<8;n++)s=choose(s,'life-wait-trade');expect(s.life!.goods.inTransit).toBe(0);expect(s.life!.foreignReceivable).toBe(0);expect(balance(s.life!,'company.inTransit')).toBe(0);expect(s.life!.goods.delivered).toBe(bold&&seed%5===1?8:10);const expected=bold?Math.floor((seed%5===1?320:400)*(seed%2===0?75:100)/100):300;expect(s.life!.foreign).toBe(expected);const cash=balance(s.life!,'company.cash');s=chapter(s,false);expect(balance(s.life!,'company.cash')).toBe(cash+Math.floor(expected*220/100));expect(s.life!.foreign).toBe(0);expect(balance(s.life!,'company.foreignClaim')).toBe(0);expect(auditLife(s.life!)).toBe(true);}
  });
  it('makes specialization observable with equal labor, extra goods, and actual reciprocal exchange',()=>{
    let base=entry();while(base.level<49)base=advance(choose(chapter(base,false),'life-observe'));
    const safe=chapter(structuredClone(base),false).life!,mixed=chapter(structuredClone(base),true).life!;
    for(const l of [safe,mixed]){expect(l.goods.townALabor).toBe(10);expect(l.goods.townBLabor).toBe(10);expect(l.journal.some(e=>e.id==='towns.barterBread')).toBe(true);expect(l.journal.some(e=>e.id==='towns.barterBoxes')).toBe(true);expect(auditLife(l)).toBe(true);}
    expect(safe.goods.townDeliveredBread).toBe(20);expect(mixed.goods.townDeliveredBread).toBe(15);expect(safe.goods.townDeliveredBoxes).toBe(20);expect(mixed.goods.townDeliveredBoxes).toBe(15);expect(safe.goods.tradedBread).toBe(8);expect(mixed.goods.tradedBread).toBe(2);
  });
  it('recovers a limited supplier shortfall and collateral-facility liquidity distress without state surgery',()=>{
    let s=entry();while(s.level<28)s=advance(choose(chapter(s,false),'life-observe'));s=advance(choose(chapter(s,false),'life-observe'));while(s.level<32)s=advance(choose(chapter(s,true),'life-observe'));s=chapter(s,true);expect(balance(s.life!,'company.supplierDebt')).toBeLessThan(0);while(getActions(s,getLevel(s).place).find(o=>o.id==='life-pay-supplier')?.disabled){s=choose(s,getActions(s,getLevel(s).place).some(o=>o.id==='life-contribute')?'life-contribute':'life-shift');}s=choose(s,'life-pay-supplier');expect(balance(s.life!,'company.supplierDebt')).toBe(0);expect(balance(s.life!,'external.supplierClaim')).toBe(0);
    s=advance(choose(s,'life-observe'));while(s.level<60)s=advance(choose(chapter(s,false),'life-observe'));s=chapter(s,true);while(s.life!.turn<s.life!.goods.facilityDue)s=choose(s,'life-test-credit');expect(balance(s.life!,'bankA.centralLoan')).toBe(-500);expect(balance(s.life!,'bankA.settlementBuffer')).toBeGreaterThan(0);expect(getActions(s,getLevel(s).place).some(o=>o.id==='life-facility-recovery')).toBe(true);s=choose(s,'life-facility-recovery');expect(s.life!.journal.some(e=>e.id==='standing.collateralSale')).toBe(true);expect(s.life!.journal.some(e=>e.id==='standing.investorDilution')).toBe(true);expect(balance(s.life!,'bankA.centralLoan')).toBe(0);expect(balance(s.life!,'central.bankLoan')).toBe(0);expect(auditLife(s.life!)).toBe(true);
  });

  it('rejects unknown inventory and forged transit, escrow, supplier and facility relations even with balanced journals',()=>{
    let s=entry();const checkpoint=structuredClone(s);const bag=structuredClone(s);bag.inventory.unknownItem=1;expect(saveGame(memory(),{state:bag,checkpoint,lang:'zh'})).toBe(false);
    while(s.level<47)s=advance(choose(chapter(s,false),'life-observe'));s=chapter(s,false);expect(validLife(s.life,s.level,1)).toBe(true);
    for(const change of [(l:NonNullable<GameState['life']>)=>{l.goods.inTransit=11;},(l:NonNullable<GameState['life']>)=>{l.goods.deliveryDue=l.turn;},(l:NonNullable<GameState['life']>)=>{l.goods.escrowForeign++;},(l:NonNullable<GameState['life']>)=>{post(l,'forgedClaim',[{account:'company.foreignClaim',amount:1},{account:'external.trade',amount:-1}]);},(l:NonNullable<GameState['life']>)=>{post(l,'forgedSupplier',[{account:'company.supplierDebt',amount:-1},{account:'external.cash',amount:1}]);},(l:NonNullable<GameState['life']>)=>{post(l,'forgedFacility',[{account:'bankA.centralLoan',amount:-1},{account:'external.cash',amount:1}]);}]){const bad=structuredClone(s);change(bad.life!);expect(validLife(bad.life,bad.level,1)).toBe(false);}
  });

});
