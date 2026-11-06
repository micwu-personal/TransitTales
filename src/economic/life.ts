import type { GameState, Level, Offer, Place, Progress, Result, Text } from './model';
import catalog from './narration-catalog.json';
import traditional from './traditional-copy.json';
import { common } from './legacy-localization';
import { withSpeech } from './speech-cues';

export type Posting = { account: string; amount: number };
export type LifeEntry = { turn: number; id: string; postings: Posting[] };
export type LifeState = {
  version: 1; turn: number; age: number; parentsAge: number; elderAge: number; siblingAges: number[];
  childrenAges: number[]; photos: { age: number; story: string }[];
  accounts: Record<string, number>; journal: LifeEntry[]; decisions: Record<string, string>;
  goods: Record<string, number>; ownership: number; organization: 'sole' | 'partnership' | 'limited';
  contracts: { entity: 'house' | 'company'; principal: number; rate: number; due: number; lastTurn: number; accrued: number; collateral: number }[];
  loan: { principal: number; interest: number; due: number; collateral: number };
  bond: { principal: number; coupon: number; due: number; quote: number; owner: 'house' | 'market' };
  mortgage: { principal: number; interest: number; due: number }; insurance: { premium: number; deductible: number; limit: number; active: boolean };
  bank: { rate: number; reserveRatio: number; demand: number; risk: number; capital: number; policyPending: number; policyDue: number };
  basket: number[]; basketHistory: number[][]; foreign: number; foreignReceivable: number; fx: number;
};
export const LIFE_START = 24;
export const lifeText = (id: string): Text => {
  const row = catalog.scripts.find(s => s.id === id);
  if (!row) throw new Error(`Missing narration: ${id}`);
  return withSpeech({...row.text,...(traditional[id as keyof typeof traditional]?{'mn-Mong':traditional[id as keyof typeof traditional]}:{})},id);
};
export const LIFE_STORIES = [
  ['stall',13,'school'],['profit',15,'school'],['job',18,'shop'],['budget',20,'home'],['organization',22,'school'],
  ['studio',22,'shop'],['materials',22,'shop'],['production',22,'shop'],['demand',22,'shop'],['finance',23,'bank'],
  ['equity',24,'shop'],['bond',25,'bank'],['bond-market',26,'bank'],['shares',27,'bank'],['leverage',28,'bank'],
  ['recovery',29,'bank'],['housing',30,'home'],['upkeep',31,'home'],['insurance',32,'home'],['claim',33,'home'],
  ['children',34,'home'],['elder',36,'home'],['sourcing',38,'shop'],['export',39,'shop'],['exchange',40,'bank'],
  ['towns',41,'shop'],['tax',42,'school'],['services',43,'school'],['public-bond',44,'bank'],['credit',45,'bank'],
  ['settlement',46,'bank'],['constraints',47,'bank'],['basket',48,'shop'],['rates',49,'bank'],['open-market',50,'bank'],
  ['reserves',51,'bank'],['facility',52,'bank'],['notes',53,'bank'],['retirement',60,'home'],['purchasing',65,'shop'],['album',70,'park'],
] as const;
export const CAMPAIGN_COUNT = LIFE_START + LIFE_STORIES.length;
export const LIFE_LEVELS: Level[] = LIFE_STORIES.map(([id,age,place],i) => ({
  id:`life-${id}`, age, place, chapter:5+Math.floor(i/6), title:lifeText(`life.${id}.title`),
  goal:lifeText(`life.${id}.goal`), intro:lifeText(`life.${id}.goal`), person:lifeText('ui.neighbor'), topic:lifeText(`life.${id}.title`),
}));
export function post(l: LifeState, id: string, postings: Posting[]): void {
  if (postings.length < 2 || postings.some(p => !Number.isSafeInteger(p.amount)) || postings.reduce((n,p)=>n+p.amount,0)!==0) throw new Error('Unbalanced transaction');
  const accounts={...l.accounts};
  for (const p of postings) {
    if (!/^[a-z][a-zA-Z0-9.]*$/.test(p.account)||['constructor','prototype'].includes(p.account)) throw new Error('Invalid account');
    const value=(accounts[p.account]??0)+p.amount;
    if (!Number.isSafeInteger(value) || Math.abs(value)>100_000_000) throw new Error('Account limit');
    accounts[p.account]=value;
  }
  l.accounts=accounts;
  l.journal.push({turn:l.turn,id,postings:postings.map(p=>({...p}))});
}
const transfer=(l:LifeState,id:string,from:string,to:string,amount:number)=> {
  if (!Number.isSafeInteger(amount)||amount<0||(l.accounts[from]??0)<amount) throw new Error('Insufficient balance');
  if (amount) post(l,id,[{account:from,amount:-amount},{account:to,amount}]);
};
export const balance=(l:LifeState,a:string)=>l.accounts[a]??0;
export function openLife(s: GameState): LifeState {
  const l:LifeState={version:1,turn:0,age:13,parentsAge:38,elderAge:68,siblingAges:Array.from({length:s.family.children-1},(_,i)=>11-i*2),childrenAges:[],photos:[{age:12,story:'travel-finale'}],accounts:{},journal:[],decisions:{},contracts:[],goods:{},ownership:100,organization:'partnership',loan:{principal:0,interest:0,due:0,collateral:0},bond:{principal:0,coupon:0,due:0,quote:0,owner:'market'},mortgage:{principal:0,interest:0,due:0},insurance:{premium:0,deductible:300,limit:1000,active:false},bank:{rate:2,reserveRatio:10,demand:1,risk:1,capital:20000,policyPending:0,policyDue:0},basket:[100,200,300],basketHistory:[[100,200,300]],foreign:0,foreignReceivable:0,fx:200};
  post(l,'opening.legacy',[{account:'house.cash',amount:s.cash},{account:'house.savings',amount:s.savings},{account:'house.digital',amount:s.digital},{account:'house.receivable',amount:s.flags.pendingChange??0},{account:'house.legacyDebt',amount:-s.debt},{account:'external.legacy',amount:-(s.cash+s.savings+s.digital+(s.flags.pendingChange??0)-s.debt)}]);
  for(const [account,amount] of [['external.cash',10000000],['bankA.reserves',20000],['bankB.reserves',20000],['government.cash',10000],['insurer.cash',10000]] as const) post(l,'opening.external',[{account,amount},{account:account==='external.cash'?'external.endowment':account.startsWith('bank')?`${account.split('.')[0]}.capital`:'external.capital',amount:-amount}]);
  for (const owner of ['bankA','central']) post(l,'opening.governmentBonds',[{account:`${owner}.bonds`,amount:2000},{account:'government.bonds',amount:-2000}]);
  return l;
}
export function lifeWorth(l:LifeState):number {
  const house=Object.entries(l.accounts).filter(([a])=>a.startsWith('house.')&&!a.includes('expense')).reduce((n,[,v])=>n+v,0);
  const company=Object.entries(l.accounts).filter(([a])=>a.startsWith('company.')&&a!=='company.equity'&&!a.includes('expense')).reduce((n,[,v])=>n+v,0);
  return house+Math.floor(company*l.ownership/100);
}
export function advanceLife(s:GameState):void {
  const l=s.life??(s.life=openLife(s));
  const age=LIFE_LEVELS[s.level-LIFE_START].age,delta=age-l.age;
  l.age=age;l.parentsAge+=delta;l.elderAge+=delta;l.siblingAges=l.siblingAges.map(a=>a+delta);l.childrenAges=l.childrenAges.map(a=>a+delta);
  l.photos.push({age,story:LIFE_LEVELS[s.level-LIFE_START].id});
}
export function lifeProgress(s:GameState):Progress {return {current:s.completed?2:s.life?.decisions[`step.${s.level}`]?1:0,total:2,description:LIFE_LEVELS[s.level-LIFE_START].goal};}
function idFor(s:GameState):string {return LIFE_STORIES[s.level-LIFE_START][0];}
export function lifeActions(s:GameState,place:Place):Offer[] {
  const level=LIFE_LEVELS[s.level-LIFE_START];if(place!==level.place||s.completed)return [];
  const id=idFor(s),l=s.life!;
  const decided=!!l.decisions[`step.${s.level}`];
  let offers:Offer[];
  if(decided){const after:Offer[]=[{id:'life-observe',label:lifeText('ui.observe'),detail:lifeText(`life.${id}.result`),icon:'book'}];if(['rates','open-market','reserves','facility','notes'].includes(id)){after.push({id:'life-test-credit',label:lifeText('ui.test-credit'),detail:lifeText('ui.test-credit'),icon:'bank'});after.push({id:'life-demand',label:lifeText('ui.demand'),detail:lifeText('ui.demand'),icon:'bread'});}offers=after;}
  else offers=['safe','bold'].map(choice=> {
    let disabled:Text|undefined;try {apply(JSON.parse(JSON.stringify(s)) as GameState,choice);}catch {disabled=lifeText(id==='exchange'&&(l.goods.inTransit||l.foreignReceivable)?'ui.trade-pending':'ui.unavailable');}
    return {id:`life-${choice}`,label:lifeText(`life.${id}.${choice}`),detail:lifeText(`life.${id}.${choice}`),icon:choice==='safe'?'heart':'handshake',...(disabled?{disabled}:{})};
  });
  if(l.age>=18&&l.age<60)offers.push({id:'life-shift',label:lifeText('ui.shift'),detail:lifeText('ui.shift'),icon:'broom'});
  if(l.age>=60){offers.push({id:'life-retirement-work',label:lifeText('ui.retirement-work'),detail:lifeText('ui.retirement-work'),icon:'broom'});if(balance(l,'house.home')>0)offers.push({id:'life-sell-home',label:lifeText('ui.sell-home'),detail:lifeText('ui.sell-home'),icon:'heart'});}
  if(l.age>=60)offers.push({id:'life-reserve',label:lifeText('ui.reserve'),detail:lifeText('ui.reserve'),icon:'bank',...(balance(l,'house.savings')<100?{disabled:lifeText('ui.unavailable')}:{})});
  const companyNeed=Math.max(1000,(l.goods.prepaidOrders??0)*60,l.bond.principal+-balance(l,'company.bondInterest'),-balance(l,'company.supplierDebt'),Math.max(0,-balance(l,'company.loan')-balance(l,'company.loanInterest')-balance(l,'company.deposit')));
  if(l.goods.prepaidOrders)offers.push({id:'life-fulfill-orders',label:lifeText('life.equity.safe'),detail:lifeText('life.finance.goal'),icon:'bread',facts:[{id:'quantity',value:l.goods.prepaidOrders},{id:'total',value:l.goods.prepaidOrders*60,money:'home'}],...(balance(l,'company.cash')<l.goods.prepaidOrders*60?{disabled:lifeText('ui.contribute')}:{})});
  if(balance(l,'company.cash')<companyNeed&&balance(l,'house.cash')>=1000)offers.push({id:'life-contribute',label:lifeText('ui.contribute'),detail:lifeText('ui.contribute'),icon:'handshake'});
  for(const entity of ['house','company'] as const)if(balance(l,`${entity}.loan`)<0){
    const principal=-balance(l,`${entity}.loan`),interest=-balance(l,`${entity}.loanInterest`),cashNeeded=Math.max(0,principal+interest-balance(l,`${entity}.deposit`));
    offers.push({id:`life-repay-${entity}`,label:lifeText(`ui.repay-${entity}`),detail:lifeText(`ui.repay-${entity}`),icon:'handshake',facts:[{id:'principal',value:principal,money:'home'},{id:'interest',value:interest,money:'home'},{id:'total',value:cashNeeded,money:'home'},...l.contracts.filter(c=>c.entity===entity&&c.principal).flatMap(c=>[{id:'rate',value:c.rate},{id:'due',value:c.due}])],...(balance(l,`${entity}.cash`)<cashNeeded?{disabled:lifeText('ui.unavailable')}:{})});
  }
  if(l.goods.inTransit||l.foreignReceivable)offers.push({id:'life-wait-trade',label:lifeText('ui.wait-trade'),detail:lifeText('ui.wait-trade-detail'),icon:'calendar'});
  if(balance(l,'company.supplierDebt')<0)offers.push({id:'life-pay-supplier',label:lifeText('ui.pay-supplier'),detail:lifeText('ui.pay-supplier-detail'),icon:'handshake',...(balance(l,'company.cash')<-balance(l,'company.supplierDebt')?{disabled:lifeText('ui.contribute')}: {})});
  if(balance(l,'bankA.centralLoan')<0&&l.turn>=l.goods.facilityDue)offers.push({id:'life-facility-recovery',label:lifeText('ui.facility-recovery'),detail:lifeText('ui.facility-recovery-detail'),icon:'bank'});
  if(id==='recovery'&&!decided){const offer=offers.find(o=>o.id==='life-safe');if(offer)offer.facts=[{id:'principal',value:-balance(l,'house.loan'),money:'home'},{id:'interest',value:-balance(l,'house.loanInterest'),money:'home'},{id:'due',value:l.turn+3}];}
  if(id==='album'&&(l.goods.prepaidOrders||balance(l,'company.orderLiability')<0||balance(l,'company.supplierDebt')<0||balance(l,'bankA.centralLoan')<0||l.goods.inTransit||l.foreignReceivable||l.bond.principal)){
    const observe=offers.find(o=>o.id==='life-observe');if(observe)observe.disabled=common('obligations-pending');
  }
  for(const offer of offers){
    if(offer.id==='life-pay-supplier')offer.facts=[{id:'supplier-debt',value:-balance(l,'company.supplierDebt'),money:'home'}];
    if(offer.id==='life-facility-recovery')offer.facts=[{id:'principal',value:-balance(l,'bankA.centralLoan'),money:'home'},{id:'interest',value:5,money:'home'},{id:'collateral',value:balance(l,'bankA.pledgedBonds'),money:'home'}];
    if(offer.id==='life-wait-trade')offer.facts=[{id:'delivery',value:l.goods.deliveryDue??0},{id:'due',value:l.goods.paymentDue??0},{id:'quantity',value:l.goods.inTransit??0},{id:'receivable',value:l.foreignReceivable,money:'foreign'}];
  }
  return offers;
}
function expense(l:LifeState,id:string,entity:'house'|'company',amount:number,to='external.cash'):void {
  const cash=`${entity}.cash`,have=balance(l,cash);
  if(have<amount) {
    throw new Error('Insufficient balance: choose a paid shift first');
  }
  transfer(l,id,cash,to,amount);
}
function lend(l:LifeState,amount:number,entity:'house'|'company',id:string):void {
  if(l.bank.demand===0||l.bank.risk>3||balance(l,'bankA.loans')+balance(l,'bankA.mortgages')+amount>Math.max(0,-balance(l,'bankA.capital'))*5||balance(l,'bankA.reserves')<Math.ceil((-balance(l,'bankA.deposits')+amount)*l.bank.reserveRatio/100))throw new Error('Credit review failed');
  post(l,id,[{account:'bankA.loans',amount},{account:`${entity}.loan`,amount:-amount},{account:'bankA.deposits',amount:-amount},{account:`${entity}.deposit`,amount}]);
  l.contracts.push({entity,principal:amount,rate:l.bank.rate,due:l.turn+3,lastTurn:l.turn,accrued:0,collateral:amount});
  l.loan={principal:l.loan.principal+amount,interest:Math.floor(amount*l.bank.rate/100),due:l.turn+3,collateral:amount};
}
function withdrawDeposit(l:LifeState,entity:'house'|'company',amount:number):void {
  if(balance(l,`${entity}.deposit`)<amount||balance(l,'bankA.reserves')<amount) throw new Error('Not enough settlement reserves');
  post(l,'deposit.withdraw',[{account:`${entity}.deposit`,amount:-amount},{account:'bankA.deposits',amount},{account:'bankA.reserves',amount:-amount},{account:'central.reserves',amount},{account:`${entity}.cash`,amount},{account:'central.notes',amount:-amount}]);
}
function fulfillOrders(l:LifeState):void {
  const quantity=l.goods.prepaidOrders??0,obligation=-balance(l,'company.orderLiability');
  expense(l,'prepaid.delivery','company',quantity*60);
  if(obligation)post(l,'order.fulfilled',[{account:'company.orderLiability',amount:obligation},{account:'external.orderClaim',amount:-obligation}]);
  l.goods.prepaidOrders=0;l.goods.ordersDelivered=(l.goods.ordersDelivered??0)+quantity;
}
function bankCashPayment(l:LifeState,id:string,entity:'house'|'company',amount:number):void {
  if(balance(l,`${entity}.cash`)<amount)throw new Error('Insufficient cash');
  if(amount)post(l,id,[{account:`${entity}.cash`,amount:-amount},{account:'central.notes',amount},{account:'bankA.reserves',amount},{account:'central.reserves',amount:-amount}]);
}
function payInterest(l:LifeState,entity:'house'|'company',mortgage=false):void {
  const liability=mortgage?'house.mortgageInterest':`${entity}.loanInterest`,receivable=mortgage?'bankA.mortgageInterest':'bankA.interestReceivable',interest=-balance(l,liability);
  if(interest<=0)return;
  const deposit=Math.min(interest,balance(l,`${entity}.deposit`)),cash=interest-deposit;
  if(balance(l,`${entity}.cash`)<cash)throw new Error('Insufficient interest payment');
  bankCashPayment(l,mortgage?'mortgage.interest':'loan.interestPayment',entity,cash);
  post(l,mortgage?'mortgage.interestPaid':'loan.interestClose',[{account:`${entity}.deposit`,amount:-deposit||0},{account:'bankA.deposits',amount:deposit},{account:liability,amount:interest},{account:receivable,amount:-interest}]);
  if(!mortgage){for(const c of l.contracts.filter(c=>c.entity===entity))c.accrued=0;l.loan.interest=l.contracts.reduce((n,c)=>n+c.accrued,0);}
}
function repay(l:LifeState,entity:'house'|'company',amount:number):void {
  const principal=Math.min(amount,-balance(l,`${entity}.loan`)); if(principal<=0)return;
  const deposit=balance(l,`${entity}.deposit`);
  if(deposit<principal){const refill=principal-deposit;bankCashPayment(l,'loan.depositCash',entity,refill);post(l,'loan.cashDeposit',[{account:`${entity}.deposit`,amount:refill},{account:'bankA.deposits',amount:-refill}]);}
  post(l,'loan.repay',[{account:`${entity}.deposit`,amount:-principal},{account:'bankA.deposits',amount:principal},{account:`${entity}.loan`,amount:principal},{account:'bankA.loans',amount:-principal}]);l.loan.principal-=principal;
  let remaining=principal;for(const c of l.contracts.filter(c=>c.entity===entity)){const paid=Math.min(c.principal,remaining);c.principal-=paid;remaining-=paid;}
  payInterest(l,entity);
}
function apply(s:GameState,choice:string):void {
  const l=s.life!,id=idFor(s),bold=choice==='bold',cash='house.cash';
  switch(id){
    case 'stall': {expense(l,id,'house',bold?600:400,'company.cash');l.ownership=bold?60:40;l.goods.materials=bold?6:4;const partner=bold?400:600;post(l,id,[{account:'company.partnerCash',amount:partner},{account:'external.partner',amount:-partner}]);transfer(l,'partner.contribution','company.partnerCash','company.cash',partner);break;}
    case 'profit': {expense(l,'stall.materials','company',200);expense(l,'stall.wage','company',100,cash);transfer(l,'stall.sales','external.cash','company.cash',bold?800:600);const profit=(bold?800:600)-300;const share=Math.floor(profit*l.ownership/100);expense(l,'stall.ownerProfit','company',share,cash);expense(l,'stall.partnerProfit','company',profit-share,'external.partner');break;}
    case 'job': transfer(l,'job.grossWage','external.cash',cash,bold?6000:4500);expense(l,'job.commute','house',bold?1500:300);expense(l,'job.tax','house',bold?600:450,'government.cash');break;
    case 'budget': expense(l,id,'house',1200+s.family.children*100);expense(l,'budget.emergency','house',bold?300:1000,'house.savings');break;
    case 'organization':{const partnerShare=Math.floor(balance(l,'company.cash')*(100-l.ownership)/100);expense(l,'partnership.buyout','house',partnerShare,'external.partner');l.organization=bold?'sole':'limited';l.ownership=100;break;}
    case 'studio':expense(l,'studio.capital','house',bold?2000:1000,'company.cash');expense(l,'studio.rent','company',bold?800:400);l.goods.capacity=bold?20:10;break;
    case 'materials':expense(l,id,'company',bold?800:400);post(l,'inventory.materials',[{account:'company.materials',amount:bold?800:400},{account:'external.inventory',amount:bold?-800:-400}]);l.goods.materials=bold?20:10;break;
    case 'production':{const quantity=Math.min(l.goods.materials??0,l.goods.capacity??10);const materialValue=Math.floor(balance(l,'company.materials')*quantity/Math.max(1,l.goods.materials));l.goods.materials-=quantity;l.goods.bread=quantity;post(l,'production.inventory',[{account:'company.materials',amount:-materialValue},{account:'company.bread',amount:materialValue+(bold?300:150)},{account:'external.inventory',amount:-(bold?300:150)}]);expense(l,'production.wage','company',bold?300:150,cash);break;}
    case 'demand':{const before=l.goods.bread??0,quantity=Math.min(before,bold?4:8),price=bold?160:100,bookValue=balance(l,'company.bread'),soldCost=Math.floor(bookValue*quantity/Math.max(1,before));post(l,'bread.costOfSales',[{account:'company.bread',amount:-soldCost},{account:'external.inventory',amount:soldCost}]);l.goods.bread-=quantity;transfer(l,'bread.sales','external.cash','company.cash',quantity*price);l.goods.waste=l.goods.bread;const wasted=balance(l,'company.bread');if(wasted)post(l,'bread.expiry',[{account:'company.bread',amount:-wasted},{account:'external.inventory',amount:wasted}]);l.goods.bread=0;
      if(bold&&l.goods.waste){const bill=2000;post(l,'supplier.cleanupBill',[{account:'company.supplierDebt',amount:-bill},{account:'external.supplierClaim',amount:bill}]);const paid=Math.min(bill,balance(l,'company.cash'));expense(l,'supplier.companyPayment','company',paid);post(l,'supplier.paid',[{account:'company.supplierDebt',amount:paid},{account:'external.supplierClaim',amount:-paid}]);const shortfall=bill-paid;if(shortfall&&l.organization==='sole'){expense(l,'sole.ownerLiability','house',shortfall);post(l,'sole.debtClosed',[{account:'company.supplierDebt',amount:shortfall},{account:'external.supplierClaim',amount:-shortfall}]);}l.decisions.liability=shortfall&&l.organization==='limited'?'companyDebtRemains':'paidByResponsibleOwner';}break;}

    case 'finance':if(bold){lend(l,2000,'company',id);withdrawDeposit(l,'company',2000);}else{transfer(l,'smallOrder.prepayment','external.cash','company.cash',500);l.goods.prepaidOrders=5;post(l,'order.deliveryObligation',[{account:'company.orderLiability',amount:-500},{account:'external.orderClaim',amount:500}]);}break;
    case 'equity':if(bold){transfer(l,id,'external.cash','company.cash',2000);l.ownership=Math.floor(l.ownership*100/125);post(l,'equity.issued',[{account:'investor.shares',amount:2000},{account:'company.equity',amount:-2000}]);}else fulfillOrders(l);break;
    case 'bond':if(bold){expense(l,'bond.issue','house',1000,'company.cash');post(l,'bond.claim',[{account:'house.bond',amount:1000},{account:'company.bond',amount:-1000}]);l.bond={principal:1000,coupon:50,due:l.turn+3,quote:1000,owner:'house'};}break;
    case 'bond-market':if(l.bond.owner==='house'){l.bond.quote=bold?900:1050;post(l,'bond.revalue',[{account:'house.bond',amount:l.bond.quote-balance(l,'house.bond')},{account:'external.valuation',amount:balance(l,'house.bond')-l.bond.quote}]);if(bold){transfer(l,'bond.secondary','external.cash',cash,l.bond.quote);post(l,'bond.ownerTransfer',[{account:'house.bond',amount:-l.bond.quote},{account:'market.bond',amount:l.bond.quote}]);l.bond.owner='market';}}break;
    case 'shares':expense(l,id,'house',bold?1000:500,'external.sellerCash');post(l,'shares.secondary',[{account:'house.shares',amount:bold?1000:500},{account:'external.shares',amount:-(bold?1000:500)}]);break;
    case 'leverage':if(bold){lend(l,1000,'house',id);withdrawDeposit(l,'house',1000);expense(l,'leveraged.buy','house',1000,'external.sellerCash');post(l,'leveraged.asset',[{account:'house.shares',amount:1000},{account:'external.shares',amount:-1000}]);}break;
    case 'recovery':{const shares=balance(l,'house.shares'),newValue=Math.floor(shares*((s.seed%2===0)?70:110)/100);post(l,'shares.price',[{account:'house.shares',amount:newValue-shares},{account:'external.valuation',amount:shares-newValue}]);if(balance(l,'house.loan')<0){if(bold){transfer(l,'shares.collateralSale','external.cash',cash,newValue);post(l,'shares.saleClose',[{account:'house.shares',amount:-newValue},{account:'external.shares',amount:newValue}]);repay(l,'house',-balance(l,'house.loan'));}else{payInterest(l,'house');l.loan.due=l.turn+3;l.loan.collateral=newValue;for(const c of l.contracts.filter(c=>c.entity==='house'&&c.principal)){c.due=l.turn+3;c.collateral=newValue;}l.decisions.collateral='renegotiated';}}break;}
    case 'housing':if(bold){expense(l,'housing.downpayment','house',2000,'external.sellerCash');post(l,'mortgage.credit',[{account:'bankA.mortgages',amount:8000},{account:'house.mortgage',amount:-8000},{account:'bankA.deposits',amount:-8000},{account:'house.deposit',amount:8000}]);withdrawDeposit(l,'house',8000);expense(l,'mortgage.sellerPayment','house',8000,'external.sellerCash');post(l,'mortgage.purchase',[{account:'house.home',amount:10000},{account:'external.property',amount:-10000}]);l.mortgage={principal:8000,interest:160,due:l.turn+4};}else expense(l,'housing.rent','house',500);break;
    case 'upkeep':if(l.mortgage.principal){expense(l,'housing.upkeep','house',300);payInterest(l,'house',true);bankCashPayment(l,'mortgage.principal','house',500);post(l,'mortgage.reduce',[{account:'house.mortgage',amount:500},{account:'bankA.mortgages',amount:-500}]);l.mortgage.principal-=500;const delta=bold?-1000:0;if(delta)post(l,'home.price',[{account:'house.home',amount:delta},{account:'external.valuation',amount:-delta}]);}else expense(l,'housing.rent','house',500);break;
    case 'insurance':if(!bold){transfer(l,'insurance.otherFamiliesPremiums','external.cash','insurer.cash',300);expense(l,id,'house',100,'insurer.cash');l.insurance={premium:100,deductible:300,limit:1000,active:true};}break;
    case 'claim':{const loss=s.seed%2===0?1500:500;expense(l,'storm.repair','house',loss);if(l.insurance.active){const payout=Math.min(l.insurance.limit,Math.max(0,loss-l.insurance.deductible),balance(l,'insurer.cash'));transfer(l,'insurance.claim','insurer.cash',cash,payout);l.insurance.active=false;}l.decisions.stormLoss=String(loss);break;}
    case 'children':l.childrenAges=Array.from({length:bold?2:1},()=>0);expense(l,'children.care','house',bold?600:300);break;
    case 'elder':expense(l,'elder.care','house',bold?400:200);l.decisions.elderTime=bold?'visitAndNurse':'sharedFamilyVisits';break;
    case 'sourcing':expense(l,'trade.sourcing','company',bold?500:600);post(l,'trade.materialInventory',[{account:'company.materials',amount:bold?700:600},{account:'external.inventory',amount:bold?-700:-600}]);if(bold){expense(l,'trade.shipping','company',100);expense(l,'trade.customs','company',100,'government.cash');}l.goods.materials=10;l.decisions.source=bold?'overseas':'local';break;
    case 'export':{expense(l,'export.production','company',400);expense(l,'export.freight','company',100);expense(l,'export.customs','company',50,'government.cash');const cost=balance(l,'company.materials');post(l,'export.loading',[{account:'company.materials',amount:-cost},{account:'company.inTransit',amount:cost+550},{account:'external.inventory',amount:-550}]);l.goods.materials=0;l.goods.exported=10;l.goods.inTransit=10;l.goods.deliveryDue=l.turn+1+(bold?s.seed%3:0);l.goods.deliveryDamage=bold&&s.seed%5===1?2:0;l.goods.paymentDue=0;l.decisions.paymentRisk=bold?'openAccount':'escrow';if(bold){l.foreignReceivable=400;post(l,'export.foreignReceivable',[{account:'company.foreignClaim',amount:800},{account:'external.trade',amount:-800}]);}else{transfer(l,'export.escrowFunded','external.cash','external.escrow',600);l.goods.escrowForeign=300;}break;}
    case 'exchange':{if(l.goods.inTransit||l.foreignReceivable)throw new Error('Delivery or payment pending');l.fx=bold?180:220;const amount=Math.floor(l.foreign*l.fx/100);const backing=balance(l,'company.foreignClaim');if(amount>backing)transfer(l,'export.fxDealerFunding','external.cash','external.fxBank',amount-backing);else if(backing>amount)transfer(l,'export.fxDealerRemainder','external.fxBank','external.cash',backing-amount);transfer(l,'export.fxSettlement','external.fxBank','company.cash',amount);if(balance(l,'company.foreignClaim'))post(l,'export.claimClose',[{account:'company.foreignClaim',amount:-balance(l,'company.foreignClaim')},{account:'external.trade',amount:balance(l,'company.foreignClaim')}]);l.foreign=0;break;}
    case 'towns':{expense(l,'towns.purchaseA','company',300,'townA.cash');expense(l,'towns.purchaseB','company',300,'townB.cash');transfer(l,'townA.production','townA.cash','external.cash',200);transfer(l,'townB.production','townB.cash','external.cash',200);l.goods.townALabor=10;l.goods.townBLabor=10;l.goods.townABread=bold?10:20;l.goods.townABoxes=bold?5:0;l.goods.townBBread=bold?5:0;l.goods.townBBoxes=bold?10:20;post(l,'towns.productionAssets',[{account:'townA.bread',amount:bold?100:200},{account:'townA.boxes',amount:bold?100:0},{account:'townB.bread',amount:bold?100:0},{account:'townB.boxes',amount:bold?100:200},{account:'external.inventory',amount:-400}]);const exchanged=bold?2:8;l.goods.townABread-=exchanged;l.goods.townBBread+=exchanged;l.goods.townBBoxes-=exchanged;l.goods.townABoxes+=exchanged;post(l,'towns.barterBread',[{account:'townA.bread',amount:-exchanged*10},{account:'townB.bread',amount:exchanged*10}]);post(l,'towns.barterBoxes',[{account:'townB.boxes',amount:-exchanged*10},{account:'townA.boxes',amount:exchanged*10}]);l.goods.tradedBread=exchanged;l.goods.tradedBoxes=exchanged;l.goods.townDeliveredBread=l.goods.townABread+l.goods.townBBread;l.goods.townDeliveredBoxes=l.goods.townABoxes+l.goods.townBBoxes;post(l,'towns.orderDelivery',[...['townA.bread','townA.boxes','townB.bread','townB.boxes'].map(account=>({account,amount:-balance(l,account)})),{account:'external.inventory',amount:400}]);transfer(l,'towns.delivery','external.cash','company.cash',bold?700:800);l.decisions.townChoice=bold?'mixedProduction':'specializeAndTrade';break;}
    case 'tax':transfer(l,'annual.wage','external.cash',cash,4000);expense(l,'income.tax','house',bold?800:400,'government.cash');break;
    case 'services':transfer(l,id,'government.cash','external.cash',bold?3000:2000);l.decisions.publicService=bold?'bridge':'clinic';l.bank.demand=bold?2:1;break;
    case 'public-bond':expense(l,id,'house',1000,'government.cash');post(l,'government.issue',[{account:'house.publicBond',amount:1000},{account:'government.bonds',amount:-1000}]);l.goods.publicBondDue=l.turn+3;l.goods.publicCouponDue=l.turn+1;if(!bold){transfer(l,'government.secondarySale','external.cash',cash,980);post(l,'government.secondaryHolder',[{account:'house.publicBond',amount:-1000},{account:'market.publicBond',amount:1000}]);}break;
    case 'credit':lend(l,bold?2000:1000,'company',id);break;
    case 'settlement':{const amount=Math.min(balance(l,'company.deposit'),bold?800:500);if(balance(l,'bankA.reserves')<amount)throw new Error('Settlement liquidity');post(l,'crossBank.wage',[{account:'company.deposit',amount:-amount},{account:'bankA.deposits',amount},{account:'house.depositB',amount},{account:'bankB.deposits',amount:-amount},{account:'bankA.reserves',amount:-amount},{account:'bankB.reserves',amount}]);break;}
    case 'constraints':if(bold){l.bank.risk=4;l.bank.demand=0;l.decisions.creditReview='declined';}else{l.bank.risk=1;l.bank.demand=1;repay(l,'company',Math.min(500,-balance(l,'company.loan')));}break;
    case 'basket':l.goods.basketDemand=bold?13:9;l.goods.basketSupply=10;l.basket=[100,200,300].map(price=>Math.floor(price*l.goods.basketDemand/l.goods.basketSupply));l.basketHistory.push([...l.basket]);break;
    case 'rates':l.bank.policyPending=bold?5:1;l.bank.policyDue=l.turn+2;break;
    case 'open-market':if(bold){if(balance(l,'bankA.bonds')<1000)throw new Error('No bonds to sell');post(l,'central.buyBond',[{account:'central.bonds',amount:1000},{account:'bankA.bonds',amount:-1000},{account:'bankA.reserves',amount:1000},{account:'central.reserves',amount:-1000}]);}else{const amount=Math.min(500,balance(l,'bankA.reserves'),balance(l,'central.bonds'));post(l,'central.sellBond',[{account:'central.bonds',amount:-amount},{account:'bankA.bonds',amount},{account:'bankA.reserves',amount:-amount},{account:'central.reserves',amount}]);}break;
    case 'reserves':l.bank.reserveRatio=bold?20:5;break;
    case 'facility':l.goods.facilityDue=l.turn+2;if(bold){if(balance(l,'bankA.bonds')<500)throw new Error('Insufficient collateral');post(l,'standing.pledge',[{account:'bankA.bonds',amount:-500},{account:'bankA.pledgedBonds',amount:500}]);post(l,'standing.lend',[{account:'central.bankLoan',amount:500},{account:'bankA.centralLoan',amount:-500},{account:'bankA.reserves',amount:500},{account:'central.reserves',amount:-500}]);if(s.seed%3===1){const held=balance(l,'bankA.reserves');post(l,'standing.reserveHold',[{account:'bankA.reserves',amount:-held},{account:'bankA.settlementBuffer',amount:held}]);l.goods.bufferDue=l.turn+4;l.decisions.facilityDistress='liquidityHeld';}}else{const amount=Math.min(500,balance(l,'bankA.reserves'));post(l,'standing.deposit',[{account:'bankA.reserves',amount:-amount},{account:'central.reserves',amount},{account:'bankA.facility',amount},{account:'central.facility',amount:-amount}]);}break;
    case 'notes':{const amount=100;if(!bold){if(balance(l,cash)<amount)throw new Error('No cash to deposit');post(l,'cash.deposit',[{account:cash,amount:-amount},{account:'central.notes',amount},{account:'bankA.reserves',amount},{account:'central.reserves',amount:-amount},{account:'house.deposit',amount},{account:'bankA.deposits',amount:-amount}]);}else{const deposit=balance(l,'house.deposit');if(deposit>=amount)withdrawDeposit(l,'house',amount);else l.decisions.notes='printedButNotIssued';}break;}
    case 'retirement':transfer(l,'pension','external.cash',cash,1000);expense(l,'retirement.life','house',bold?900:600);if(balance(l,'company.loan')<0){repay(l,'company',-balance(l,'company.loan'));}if(balance(l,'house.loan')<0)repay(l,'house',-balance(l,'house.loan'));if(l.mortgage.principal){const principal=l.mortgage.principal;payInterest(l,'house',true);bankCashPayment(l,'mortgage.retirementPayoff','house',principal);post(l,'mortgage.close',[{account:'house.mortgage',amount:principal},{account:'bankA.mortgages',amount:-principal}]);l.mortgage.principal=0;}break;
    case 'purchasing':{const amount=l.basket.reduce((a,b)=>a+b,0);expense(l,'retirement.basket','house',bold?amount:Math.floor(amount*2/3));l.decisions.retirementBasket=String(amount);break;}
    case 'album':l.decisions.familyPlan=bold?'familyPicnic':'gardenTogether';break;
  }
  l.decisions[`step.${s.level}`]=choice;
}
function tick(s:GameState):void {
  const l=s.life!;l.turn++;
  if(l.goods.inTransit&&l.turn>=l.goods.deliveryDue){const damage=l.goods.deliveryDamage??0;l.goods.delivered=l.goods.inTransit-damage;l.goods.lostInTransit=damage;l.goods.inTransit=0;const inventory=balance(l,'company.inTransit');post(l,'export.deliveryInventory',[{account:'company.inTransit',amount:-inventory},{account:'external.inventory',amount:inventory}]);l.decisions.delivery=damage?'partlyDamaged':'received';if(l.decisions.paymentRisk==='escrow'){const held=l.goods.escrowForeign??0;transfer(l,'export.escrowReleased','external.escrow','external.fxBank',held*2);l.foreign=held;l.goods.escrowForeign=0;post(l,'export.escrowForeignBalance',[{account:'company.foreignClaim',amount:held*2},{account:'external.trade',amount:-held*2}]);}else{const due=Math.floor(l.foreignReceivable*l.goods.delivered/10);const lost=(l.foreignReceivable-due)*2;if(lost)post(l,'export.damageClaimReduction',[{account:'company.foreignClaim',amount:-lost},{account:'external.trade',amount:lost}]);l.foreignReceivable=due;l.goods.paymentDue=l.turn+2;}}
  if(l.goods.paymentDue&&l.turn>=l.goods.paymentDue){const paid=Math.floor(l.foreignReceivable*(s.seed%2===0?75:100)/100),lost=l.foreignReceivable-paid;transfer(l,'export.buyerPayment','external.cash','external.fxBank',paid*2);l.foreign=paid;l.decisions.foreignLoss=String(lost);if(lost)post(l,'export.nonpaymentLoss',[{account:'company.foreignClaim',amount:-lost*2},{account:'external.trade',amount:lost*2}]);l.foreignReceivable=0;l.goods.paymentDue=0;}

  if(l.goods.bufferDue&&l.turn>=l.goods.bufferDue){const held=balance(l,'bankA.settlementBuffer');post(l,'standing.reserveRelease',[{account:'bankA.settlementBuffer',amount:-held},{account:'bankA.reserves',amount:held}]);l.goods.bufferDue=0;}
  if(l.goods.publicCouponDue&&l.turn>=l.goods.publicCouponDue){const owner=balance(l,'house.publicBond')>0?'house.cash':'external.cash';if(balance(l,'government.cash')>=30){transfer(l,'government.scheduledCoupon','government.cash',owner,30);l.goods.publicCouponDue=0;}}
  if(l.goods.publicBondDue&&l.turn>=l.goods.publicBondDue&&balance(l,'government.cash')>=1000){const owner=balance(l,'house.publicBond')>0?'house':'market';transfer(l,'government.scheduledRedemption','government.cash',owner==='house'?'house.cash':'external.cash',1000);post(l,'government.closeBond',[{account:`${owner}.publicBond`,amount:-1000},{account:'government.bonds',amount:1000}]);l.goods.publicBondDue=0;}
  if(l.goods.facilityDue&&l.turn>=l.goods.facilityDue){const principal=-balance(l,'bankA.centralLoan');if(principal>0&&balance(l,'bankA.reserves')>=principal+5){post(l,'standing.repay',[{account:'bankA.reserves',amount:-principal-5},{account:'central.reserves',amount:principal+5},{account:'bankA.centralLoan',amount:principal},{account:'central.bankLoan',amount:-principal},{account:'bankA.capital',amount:5},{account:'central.equity',amount:-5}]);const pledged=balance(l,'bankA.pledgedBonds');post(l,'standing.release',[{account:'bankA.pledgedBonds',amount:-pledged},{account:'bankA.bonds',amount:pledged}]);l.goods.facilityDue=0;}const deposit=balance(l,'bankA.facility');if(deposit>0){post(l,'standing.depositMatures',[{account:'bankA.reserves',amount:deposit+5},{account:'central.reserves',amount:-deposit-5},{account:'bankA.facility',amount:-deposit},{account:'central.facility',amount:deposit},{account:'bankA.capital',amount:-5},{account:'central.equity',amount:5}]);l.goods.facilityDue=0;}}
s.day++;
  for(const c of l.contracts){if(c.principal&&c.lastTurn<l.turn){const amount=Math.floor(c.principal*c.rate/100);if(amount)post(l,'loan.accrual',[{account:`${c.entity}.loanInterest`,amount:-amount},{account:`${c.entity}.expense.interest`,amount},{account:'bankA.interestReceivable',amount},{account:'bankA.capital',amount:-amount}]);c.accrued+=amount;}c.lastTurn=l.turn;}
  settleBond(l);
  const mortgageInterest=Math.floor(l.mortgage.principal*2/100);if(mortgageInterest)post(l,'mortgage.interestAccrual',[{account:'house.mortgageInterest',amount:-mortgageInterest},{account:'house.expense.interest',amount:mortgageInterest},{account:'bankA.mortgageInterest',amount:mortgageInterest},{account:'bankA.capital',amount:-mortgageInterest}]);
  l.loan.interest=l.contracts.reduce((n,c)=>n+c.accrued,0);
  if(l.bank.policyDue&&l.turn>=l.bank.policyDue){l.bank.rate=l.bank.policyPending;l.bank.policyDue=0;}
}
export function lifeAct(state:GameState,actionId:string):Result {
  const level=LIFE_LEVELS[state.level-LIFE_START];if(!level||!state.life)return {state,ok:false,message:lifeText('ui.unavailable')};
  const offer=lifeActions(state,level.place).find(o=>o.id===actionId);
  if(!offer)return {state,ok:false,message:lifeText('ui.unavailable')};
  const s=JSON.parse(JSON.stringify(state)) as GameState,l=s.life!;
  if(actionId==='life-test-credit'){tick(s);try{lend(l,500,'company','policy.newLoan');l.decisions.creditTest='approved';return {state:s,ok:true,message:lifeText('ui.credit-approved')};}catch{l.decisions.creditTest='declined';return {state:s,ok:true,message:lifeText('ui.credit-declined')};}}
  if(actionId==='life-demand'){if(!l.decisions.policyOrder){transfer(l,'policy.orderPayment','external.cash','company.cash',300);expense(l,'policy.orderProduction','company',200);l.goods.policyDelivered=3;l.decisions.policyOrder='delivered';}l.bank.demand=1;l.bank.risk=Math.max(1,l.bank.risk-1);tick(s);return {state:s,ok:true,message:lifeText('ui.demand')};}
  if(offer.disabled)return {state,ok:false,message:offer.disabled};
  if(actionId==='life-observe') {
    tick(s);
    s.completed=true;
    return {state:s,ok:true,message:lifeText(`life.${idFor(s)}.result`)};
  }
  if(actionId.startsWith('life-repay-')){const entity=actionId==='life-repay-house'?'house':'company';try{repay(l,entity,-balance(l,`${entity}.loan`));tick(s);return {state:s,ok:true,message:lifeText(`ui.repay-${entity}`)};}catch{return {state,ok:false,message:lifeText('ui.unavailable')};}}
  if(actionId==='life-wait-trade'){tick(s);return {state:s,ok:true,message:lifeText(l.goods.inTransit?'ui.delivery-pending':l.foreignReceivable?'ui.payment-pending':'ui.trade-arrived')};}
  if(actionId==='life-fulfill-orders'){fulfillOrders(l);tick(s);return {state:s,ok:true,message:common('complete')};}
  if(actionId==='life-pay-supplier'){const amount=-balance(l,'company.supplierDebt');expense(l,'supplier.recoveryPayment','company',amount);post(l,'supplier.recoveryClose',[{account:'company.supplierDebt',amount},{account:'external.supplierClaim',amount:-amount}]);tick(s);return {state:s,ok:true,message:lifeText('ui.supplier-paid')};}
  if(actionId==='life-facility-recovery'){const principal=-balance(l,'bankA.centralLoan'),interest=5,pledged=balance(l,'bankA.pledgedBonds'),price=Math.min(pledged,principal);if(price){transfer(l,'standing.collateralBuyer','external.cash','bankA.reserves',price);post(l,'standing.collateralSale',[{account:'bankA.pledgedBonds',amount:-price},{account:'market.centralCollateral',amount:price}]);}const shortfall=Math.max(0,principal+interest-balance(l,'bankA.reserves'));if(shortfall){const equity=shortfall;if(equity){transfer(l,'standing.newInvestorCash','external.cash','bankA.reserves',equity);post(l,'standing.investorDilution',[{account:'bankA.capital',amount:-equity},{account:'investor.bankEquity',amount:equity}]);}}tick(s);return {state:s,ok:true,message:lifeText('ui.facility-recovered')};}
  if(actionId==='life-retirement-work'){transfer(l,'retirement.optionalWork','external.cash','house.cash',2500);tick(s);return {state:s,ok:true,message:lifeText('ui.retirement-work')};}
  if(actionId==='life-sell-home'){const value=balance(l,'house.home');transfer(l,'retirement.homeSale','external.cash','house.cash',value);post(l,'home.sold',[{account:'house.home',amount:-value},{account:'external.property',amount:value}]);expense(l,'retirement.newRent','house',500);tick(s);return {state:s,ok:true,message:lifeText('ui.sell-home')};}
  if(actionId==='life-reserve'){transfer(l,'retirement.drawSavings','house.savings','house.cash',100);tick(s);return {state:s,ok:true,message:lifeText('ui.reserve')};}
  if(actionId==='life-contribute'){transfer(l,'business.ownerContribution','house.cash','company.cash',1000);tick(s);return {state:s,ok:true,message:lifeText('ui.contribute')};}
  if(actionId==='life-shift'){transfer(l,'recovery.paidShift','external.cash','house.cash',5000);tick(s);return {state:s,ok:true,message:lifeText('ui.shift')};}
  try {apply(s,actionId.slice(5));return {state:s,ok:true,message:idFor(s)==='facility'&&l.decisions.facilityDistress==='liquidityHeld'?common('liquidity-held'):lifeText(`life.${idFor(s)}.result`)};}catch{return {state,ok:false,message:lifeText('ui.unavailable')};}
}
export function auditLife(l:LifeState):boolean {
  if(l.journal.length>10000||!l.journal.every(e=>Number.isSafeInteger(e.turn)&&e.postings.length>=2&&e.postings.every(p=>/^[a-z][a-zA-Z0-9.]*$/.test(p.account)&&Number.isSafeInteger(p.amount)&&Math.abs(p.amount)<=100000000)&&e.postings.reduce((n,p)=>n+p.amount,0)===0))return false;
  const totals:Record<string,number>={};for(const e of l.journal)for(const p of e.postings)totals[p.account]=(totals[p.account]??0)+p.amount;
  return Object.keys(totals).length===Object.keys(l.accounts).length&&Object.entries(totals).every(([a,v])=>v===l.accounts[a])&&Object.values(l.accounts).reduce((a,b)=>a+b,0)===0;
}

function settleBond(l:LifeState):void {
  if(!l.bond.principal)return;
  const owner=l.bond.owner==='house'?'house':'market';
  post(l,'bond.couponAccrual',[{account:'company.bondInterest',amount:-l.bond.coupon},{account:`${owner}.bondInterest`,amount:l.bond.coupon}]);
  const interest=-balance(l,'company.bondInterest');
  if(balance(l,'company.cash')>=interest){transfer(l,'bond.coupon','company.cash',`${owner}.cash`,interest);post(l,'bond.couponSettled',[{account:'company.bondInterest',amount:interest},{account:`${owner}.bondInterest`,amount:-interest}]);}
  if(l.turn>=l.bond.due&&balance(l,'company.cash')>=l.bond.principal&&balance(l,'company.bondInterest')===0){
    const principal=l.bond.principal,quote=balance(l,`${owner}.bond`);
    if(quote!==principal)post(l,'bond.maturityPrice',[{account:`${owner}.bond`,amount:principal-quote},{account:'external.valuation',amount:quote-principal}]);
    transfer(l,'bond.redemption','company.cash',`${owner}.cash`,principal);
    post(l,'bond.principalClose',[{account:'company.bond',amount:principal},{account:`${owner}.bond`,amount:-principal}]);l.bond.principal=0;l.bond.quote=0;
  }
}
