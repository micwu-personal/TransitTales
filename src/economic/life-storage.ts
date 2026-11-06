import { auditLife, balance, LIFE_STORIES, type LifeState } from './life';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const int = (v: unknown, min = 0, max = 100_000_000): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const numericMap = (v: unknown, signed = false) => object(v) && Object.keys(v).length < 1000 && Object.entries(v).every(([k,n]) => /^[a-z][a-zA-Z0-9.]*$/.test(k) && !['constructor','prototype'].includes(k) && int(n,signed?-100_000_000:0));
export function validLife(v: unknown, level: number, children: number): v is LifeState {
  if (!object(v) || !keys(v,['version','turn','age','parentsAge','elderAge','siblingAges','childrenAges','photos','accounts','journal','decisions','goods','ownership','organization','contracts','loan','bond','mortgage','insurance','bank','basket','basketHistory','foreign','foreignReceivable','fx'])) return false;
  if(v.version!==1||!int(v.turn,0,100000)||v.age!==LIFE_STORIES[level-24]?.[1]||v.parentsAge!==38+(v.age as number)-13||v.elderAge!==68+(v.age as number)-13)return false;
  if(!Array.isArray(v.siblingAges)||v.siblingAges.length!==children-1||!v.siblingAges.every((a,i)=>a===11-i*2+(v.age as number)-13)||!Array.isArray(v.childrenAges)||v.childrenAges.length>2||!v.childrenAges.every(a=>int(a,0,80)))return false;
  if(!Array.isArray(v.photos)||v.photos.length>50||!v.photos.every(p=>object(p)&&keys(p,['age','story'])&&int(p.age,7,100)&&typeof p.story==='string'&&p.story.length<80))return false;
  if(!numericMap(v.accounts,true)||!numericMap(v.goods)||!object(v.decisions)||Object.keys(v.decisions).length>1000||!Object.entries(v.decisions).every(([k,s])=>/^[a-z][a-zA-Z0-9.]*$/.test(k)&&!['constructor','prototype'].includes(k)&&typeof s==='string'&&s.length<200))return false;
  if(!int(v.ownership,0,100)||!['sole','partnership','limited'].includes(v.organization as string)||!int(v.foreign)||!int(v.foreignReceivable)||!int(v.fx,100,300))return false;
  for(const [name,allowed] of Object.entries({loan:['principal','interest','due','collateral'],bond:['principal','coupon','due','quote','owner'],mortgage:['principal','interest','due'],insurance:['premium','deductible','limit','active'],bank:['rate','reserveRatio','demand','risk','capital','policyPending','policyDue']})){
    const item=v[name];if(!object(item)||!keys(item,allowed)||!allowed.every(k=>k in item))return false;
    for(const [k,n] of Object.entries(item)){if(k==='active'){if(typeof n!=='boolean')return false;}else if(k==='owner'){if(!['house','market'].includes(n as string))return false;}else if(!int(n))return false;}
  }
  if(!Array.isArray(v.contracts)||v.contracts.length>50||!v.contracts.every(c=>object(c)&&keys(c,['entity','principal','rate','due','lastTurn','accrued','collateral'])&&['house','company'].includes(c.entity as string)&&['principal','rate','due','lastTurn','accrued','collateral'].every(k=>int(c[k]))&&(c.lastTurn as number)<= (v.turn as number)))return false;
  if(!Array.isArray(v.basket)||v.basket.length!==3||!v.basket.every(n=>int(n,1,10000))||!Array.isArray(v.basketHistory)||v.basketHistory.length>50||!v.basketHistory.every(b=>Array.isArray(b)&&b.length===3&&b.every(n=>int(n,1,10000))))return false;
  if(!Array.isArray(v.journal)||!v.journal.every(e=>object(e)&&keys(e,['turn','id','postings'])&&int(e.turn,0,v.turn as number)&&typeof e.id==='string'&&e.id.length<100&&Array.isArray(e.postings)&&e.postings.every(p=>object(p)&&keys(p,['account','amount'])&&typeof p.account==='string'&&/^[a-z][a-zA-Z0-9.]*$/.test(p.account)&&!['constructor','prototype'].includes(p.account)&&int(p.amount,-100_000_000))))return false;
  const l=v as unknown as LifeState;
  if(!auditLife(l))return false;
  for(let step=24;step<level;step++)if(!['safe','bold'].includes(l.decisions[`step.${step}`]))return false;
  for(const [key,value] of Object.entries(l.decisions))if(key.startsWith('step.')&&(!/^step\.\d+$/.test(key)||Number(key.slice(5))<24||Number(key.slice(5))>level||!['safe','bold'].includes(value)))return false;
  for(const a of ['house.cash','house.savings','house.deposit','house.depositB','company.cash','company.deposit','bankA.reserves','bankB.reserves','government.cash','insurer.cash'])if(balance(l,a)<0)return false;
  if(balance(l,'bankA.deposits')!==-balance(l,'house.deposit')-balance(l,'company.deposit')||balance(l,'bankB.deposits')!==-balance(l,'house.depositB'))return false;
  if(balance(l,'bankA.loans')!==-balance(l,'house.loan')-balance(l,'company.loan'))return false;
  for(const entity of ['house','company'])if(l.contracts.filter(c=>c.entity===entity).reduce((n,c)=>n+c.principal,0)!==-balance(l,`${entity}.loan`))return false;
  if(l.loan.principal!==l.contracts.reduce((n,c)=>n+c.principal,0))return false;
  if(balance(l,'bankA.mortgages')!==-balance(l,'house.mortgage')||l.mortgage.principal!==-balance(l,'house.mortgage'))return false;
  if(balance(l,'bankA.interestReceivable')!==-balance(l,'house.loanInterest')-balance(l,'company.loanInterest'))return false;
  if(balance(l,'bankA.mortgageInterest')!==-balance(l,'house.mortgageInterest'))return false;
  if(l.contracts.reduce((n,c)=>n+c.accrued,0)!==balance(l,'bankA.interestReceivable'))return false;
  if(!Object.keys(l.goods).every(k=>['basketDemand','basketSupply','bread','bufferDue','capacity','delivered','deliveryDamage','deliveryDue','escrowForeign','exported','facilityDue','inTransit','lostInTransit','materials','ordersDelivered','paymentDue','policyDelivered','prepaidOrders','publicBondDue','publicCouponDue','townABoxes','townABread','townALabor','townBBoxes','townBBread','townBLabor','townDeliveredBoxes','townDeliveredBread','tradedBoxes','tradedBread','waste'].includes(k)))return false;
  if((l.goods.prepaidOrders??0)+(l.goods.ordersDelivered??0)>5||balance(l,'company.orderLiability')!==-(l.goods.prepaidOrders??0)*100||balance(l,'external.orderClaim')!==-balance(l,'company.orderLiability'))return false;
  if(balance(l,'company.foreignClaim')!==(l.foreign+l.foreignReceivable)*2||balance(l,'external.escrow')!==(l.goods.escrowForeign??0)*2)return false;
  if(balance(l,'company.supplierDebt')!==-balance(l,'external.supplierClaim')||balance(l,'central.bankLoan')!==-balance(l,'bankA.centralLoan')||balance(l,'bankA.facility')!==-balance(l,'central.facility'))return false;
  if((l.goods.inTransit??0)>10||(l.goods.deliveryDamage??0)>2||(l.goods.delivered??0)+(l.goods.lostInTransit??0)>10)return false;
  if(l.goods.inTransit&&(!l.goods.deliveryDue||l.goods.deliveryDue<=l.turn||balance(l,'company.inTransit')<=0))return false;
  if(!l.goods.inTransit&&balance(l,'company.inTransit'))return false;
  if(l.foreignReceivable&&!l.goods.inTransit&&(!l.goods.paymentDue||l.goods.paymentDue<=l.turn))return false;
  if(balance(l,'bankA.settlementBuffer')<0||balance(l,'bankA.settlementBuffer')>0&&(!l.goods.bufferDue||l.goods.bufferDue<=l.turn||l.decisions.facilityDistress!=='liquidityHeld'))return false;
  return true;
}
