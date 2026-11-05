export type Text = { zh: string; en: string };
export type Lang = 'zh' | 'en';
export type Place = 'home' | 'shop' | 'school' | 'bank' | 'park';
export type IconName = 'coin' | 'bag' | 'apple' | 'toy' | 'broom' | 'gift' | 'handshake' | 'bank' | 'calendar' | 'heart' | 'book' | 'shirt' | 'bread' | 'wallet' | 'arrow';
export type Family = { gender: 'boy' | 'girl'; children: 1 | 2 | 3 };
export type LedgerEntry = { day: number; label: Text; cash: number; savings: number; debt: number; digital?: number };
export type BankTerm = { principal: number; startDay: number; maturityDay: number; rate: number; settled: boolean };
export type GameState = {
  version: 1; family: Family; level: number; day: number; cash: number; savings: number;
  debt: number; trust: number; inventory: Record<string, number>; flags: Record<string, number>;
  seed: number; completed: boolean; ledger: LedgerEntry[];
  digital: number; rewards: string[]; bankTerm?: BankTerm;
  loan?: { principal: number; startDay: number; dueDay: number; rate: number; lastInterestDay: number; late: boolean };
};
export type Level = { id: string; title: Text; goal: Text; intro: Text; person: Text; place: Place; age: number; chapter: number; topic: Text };
export type Offer = { id: string; label: Text; detail: Text; icon: IconName; disabled?: Text };
export type Price = { id: string; label: Text; price: number; stock: number; currency?: 'home' | 'foreign' };
export type Progress = { current: number; total: number; description: Text };
export type Result = { state: GameState; ok: boolean; message: Text };
export const LEVEL_COUNT = 24;
const text = (zh: string, en: string): Text => ({ zh, en });
const money = (cents: number) => (cents / 100).toFixed(2);
const rows: [string, string, string, string, string, string, string, string, Place, string, string][] = [
  ['first-snack', '小钱包出发', 'A pocket-money outing', '每个孩子一份苹果，花费不超过每人1元，再一起吃。', 'Buy an apple for each child within ¥1 each, then share them.', '苹果叔把苹果摆成了一条毛毛虫：先看价签，再决定买什么！', 'Apple Uncle made a fruit caterpillar: check the price before choosing!', '苹果叔', 'shop', '购物与预算', 'Shopping and budgets'],
  ['school-list', '书包里的购物单', 'The school shopping list', '给每个孩子买苹果和面包，购物单预算是每人2.50元。', 'Pack an apple and bread for each child within ¥2.50 each.', '小熊文具店长说：玩具恐龙也想进书包，但午饭不能变成恐龙。', 'Bear the shopkeeper says: a toy dinosaur wants in, but lunch cannot be a dinosaur.', '小熊店长', 'shop', '需要与想要', 'Needs and wants'],
  ['change', '找零小侦探', 'The change detective', '用5元付款买1.20元的面包，拿回正确找零，交给同学。', 'Pay ¥5 for ¥1.20 bread, collect the right change, and deliver it.', '面包阿姨忙得把计算器当电话了。你可以帮她检查找零！', 'Baker Bee tried calling her calculator. Help check your change!', '面包阿姨', 'shop', '付款与找零', 'Payment and change'],
  ['chores', '袜子怪兽的工资', 'The sock monster job', '分配家务，完成整理和打扫两项约定工作，领取一次报酬。', 'Assign shared chores, sort and sweep, then collect one agreed payment.', '家长说：袜子怪兽占领了沙发！分工合作，不抢弟弟妹妹的任务。', 'A parent says: the sock monster took the sofa! Share jobs, not sibling jobs.', '家长', 'home', '劳动与约定', 'Work and agreements'],
  ['allowance', '零花钱三只罐', 'Three pocket-money jars', '领取本周6元零花钱，留出2元，买2元的书，再检查计划。', 'Collect this week’s ¥6, reserve ¥2, buy a ¥2 book, then check the plan.', '家长摆出花费、留存、分享三个罐子：钱不会每天自动长出来哦。', 'A parent sets out spend, keep and share jars: money does not grow daily.', '家长', 'home', '零花钱与机会成本', 'Allowance and opportunity cost'],
  ['birthday', '生日礼物的秘密', 'The birthday gift envelope', '领取4元礼金，用礼金买礼物，并留下至少1元给未来的自己。', 'Receive ¥4 gift money, buy a present from it, and keep at least ¥1.', '奶奶说：礼金归你决定。大玩偶会把信封吃光，小礼物也能带来笑容。', 'Grandma says: you choose. A giant plush eats the envelope; a small gift brings smiles too.', '奶奶', 'home', '礼金与选择', 'Gifts and choices'],
  ['supply', '苹果车迟到了', 'The late apple truck', '观察少量苹果的高价，等补货或现在购买，备齐每个孩子的苹果。', 'Notice scarce apples cost more; wait for delivery or buy now, then share one each.', '苹果叔：送货车被一群鸭子堵住了！货架变空，今天价签也变了。', 'Apple Uncle: ducks blocked the truck! Empty shelves changed today’s price.', '苹果叔', 'shop', '供给与价格', 'Supply and prices'],
  ['demand', '运动会的果汁队', 'The sports-day juice queue', '看看排队人数，比较果汁价格，给每个孩子买一杯并送到操场。', 'Check the queue, compare juice prices, buy a cup each and deliver them.', '果汁姐姐：比赛刚结束，大家都渴了！等人少再买，还是现在喝？', 'Juice Jo: the race ended and everyone is thirsty! Buy now or after the rush?', '果汁姐姐', 'school', '需求与比较', 'Demand and comparison'],
  ['weather', '会变脸的天空', 'The sky changes its mind', '查看明天预报，选购雨具，再按天气准备去公园。', 'Read tomorrow’s forecast, buy rain protection and prepare for the park.', '云朵邮递员送来预报：今天晴，明天可能下雨。伞的价签会随天气改变。', 'Cloud the courier brings a forecast: sunny today, maybe rain tomorrow. Umbrella prices change.', '云朵邮递员', 'shop', '天气与价格', 'Weather and prices'],
  ['markdown', '面包的最后一班车', 'Bread’s last bus', '比较新鲜面包和今日折价面包，为每个孩子准备能吃的点心。', 'Compare fresh and same-day markdown bread; prepare edible snacks for every child.', '面包阿姨：打折面包今天吃很香，明天就只能给堆肥桶开派对啦。', 'Baker Bee: markdown bread is tasty today; tomorrow it parties in the compost bin.', '面包阿姨', 'shop', '折价与保质期', 'Markdowns and perishability'],
  ['barter', '贴纸交换站', 'The sticker swap', '整理两张贴纸，和同学互换一张贴纸与一个苹果，再补买每人一个苹果。', 'Sort two stickers, trade one for an apple, then buy one extra apple per child.', '小乐有苹果，你有重复贴纸。两个人都愿意，交换才算握手成功。', 'Le has apples; you have duplicate stickers. A swap needs two happy yeses.', '小乐', 'school', '互惠交换与货币', 'Reciprocal barter and money'],
  ['currency', '硬币纸币小队', 'Coins, notes and a tap', '把5元换成硬币，再由家长陪同转入数字钱包，付款1元，把余款转回。', 'Change ¥5 into coins, load it into a digital wallet with a parent, pay ¥1 and return the rest.', '硬币队长：五个1元和一张5元一样多！数字余额也不是免费钱。', 'Captain Coin: five ¥1 coins equal one ¥5 note! Digital balance is not free money.', '硬币队长', 'shop', '货币形式与等值', 'Equivalent money forms'],
  ['borrow', '借来的书角', 'A borrowed book corner', '约定借2元，合资买3元书，完成小工作，明天归还本金。', 'Agree to borrow ¥2, buy a ¥3 shared book, do a job and repay tomorrow.', '小乐说：我借你2元，明天还就好。这是借钱，不是礼物。', 'Le says: borrow ¥2 and return it tomorrow. A loan is not a gift.', '小乐', 'school', '借款与归还', 'Borrowing and repayment'],
  ['due-date', '日历上的红圈', 'The red circle on the calendar', '借3元买用品，完成约定工作，按日期还款；晚还也能修复信任。', 'Borrow ¥3 for supplies, do the agreed job and repay by the date; repair trust if late.', '小乐的日历画了一个番茄：红圈是明天，不是永远以后的明天。', 'Le drew a tomato on the calendar: the red circle means tomorrow, not forever-tomorrow.', '小乐', 'school', '到期日与信任', 'Due dates and trust'],
  ['loan-interest', '借钱也有小尾巴', 'A loan with a little tail', '看清约定后借4元买工具，做工作，过一个游戏日后还本金和利息。', 'Read terms, borrow ¥4 for a kit, work, then repay principal plus interest after a game-day.', '家长陪你看约定：玩具规则每游戏日按本金收1%，4元一天4分，不是真实借贷。', 'A parent reads the toy terms: 1% of principal per game-day, ¥4 costs 4 cents a day, not a real loan.', '家长与小乐', 'home', '本金与游戏日利息', 'Principal and game-day interest'],
  ['bank-term', '银行里的睡钱', 'Money’s bank nap', '家长陪同存3元，等两个游戏日，取回本金和6分利息，买1元用品。', 'With a parent, deposit ¥3 for two game-days, withdraw ¥3.06, then buy ¥1 supplies.', '河狸柜员：这是玩具银行，每游戏日1%单利。提前取只有本金，真实银行不是这个收益。', 'Beaver Banker: toy bank, 1% simple interest per game-day. Early withdrawal returns principal only; not real returns.', '河狸柜员与家长', 'bank', '存款与到期', 'Deposits and maturity'],
  ['bank-plan', '留给野餐的钱', 'Keep some for the picnic', '领取6元零花钱，家长陪同存2元，买2元书，等一个游戏日准备野餐。', 'Collect ¥6 allowance, deposit ¥2 with a parent, buy a ¥2 book and wait one game-day.', '家长：这是你的小钱包，不是全家资产。留2元给明天，今天也可以读新书。', 'A parent: this is your pocket, not the family’s wealth. Keep ¥2 for tomorrow and read today.', '家长', 'bank', '储蓄与选择', 'Saving and choices'],
  ['picnic', '没有欠条的野餐', 'The debt-free family picnic', '分工完成野餐准备，取出可用存款，为每个孩子买苹果、面包和果汁，不留欠款。', 'Share preparation, withdraw available savings, buy each child apple, bread and juice, and leave no debt.', '全家出发！家长负责自己的餐费，你的小钱包负责孩子们的点心。袜子怪兽只带纸巾。', 'Family outing! Parents pay their own meals; your pocket buys the children’s snacks. Sock Monster brings napkins.', '全家', 'park', '家庭目标与回顾', 'A family goal and reflection'],
];
rows.push(
  ['travel-budget', '全家的贝壳岛计划', 'A family Shell Island plan', '家长陪同安排孩子们的旅行信封，买车票和住宿份额，留出下一程经费。', 'With a parent, budget the children’s travel envelope, book transport and a room share, and reserve next-leg funds.', '家长：去虚构的贝壳岛旅行！这里只管孩子们的旅行信封，大人的机票不是从你的零花钱扣。', 'Parent: let’s visit fictional Shell Island! This envelope covers children, not adult flights.', '家长', 'home', '旅行经费与家庭人数', 'Travel budgets and family size'],
  ['foreign-exchange', '贝币不是免费贝壳', 'Shell coins are not free shells', '看清虚构汇率和费用，兑换5贝币，再用预付钱包支付孩子们的巴士票。', 'Read fictional rates and fees, exchange for 5 shell coins, then pay children’s bus fares from the prepaid wallet.', '鹦鹉兑换员：1贝币＝2元，兑换一次收0.20元。扫码也能只是花自己的钱，不等于借款！', 'Parrot Teller: 1 shell = ¥2, with ¥0.20 per exchange. A QR payment can spend your own money, not borrow!', '鹦鹉兑换员与家长', 'bank', '汇率、费用与预付支付', 'Exchange rates, fees and prepaid payments'],
  ['travel-prices', '同一只小海螺', 'The same little shell souvenir', '把同款纪念品的国内价和贝币价换算比较，给每个孩子选一份。', 'Convert home and shell prices for the same souvenir; choose one for each child.', '海螺店长：国内同款2.60元，岛上1贝币；兑换整笔还有0.20元费用。这只是今天的虚构价格，不保证哪里永远便宜。', 'Shell Seller: the same item is ¥2.60 at home, 1 shell here; the exchange has a ¥0.20 fee. Fictional prices today, not a universal bargain rule.', '海螺店长', 'shop', '换算后的价格比较', 'Comparing converted prices'],
  ['toy-customs', '海关章不是贴纸', 'A customs stamp is not a sticker', '查看虚构海关规则，如实申报纪念品，支付显示的费用，拿到通行章。', 'Read fictional customs rules, declare souvenirs, pay the displayed charge and obtain a stamp.', '螃蟹关员：这是游戏规则，不是现实海关政策。国外买的礼物换算超过4元，这个信封收0.60元；主动申报，别装成袜子！', 'Crab Officer: toy rules, not real customs policy. Overseas gifts above ¥4 cost this envelope ¥0.60. Declare them; do not disguise them as socks!', '螃蟹关员与家长', 'school', '申报与虚构通关费用', 'Declaration and toy customs charges'],
  ['parent-card', '家长卡的小账单', 'The parent card’s little bill', '家长陪同用模拟信用卡买外币点心，回家查看汇率变化后的本币账单。', 'With a parent, use a simulated parent credit card for foreign snacks and inspect the home-currency bill after returning.', '家长：这张是我的模拟信用卡，不是儿童开户。信用支付是借款；支付宝或PayPal等名字本身不代表借钱，要看资金来源。', 'Parent: this is my simulated card, not a child credit account. Credit borrows; names like Alipay or PayPal alone do not say whether a payment borrows. Check its funding source.', '家长', 'shop', '外币信用支付与账单换算', 'Foreign credit payments and converted bills'],
  ['travel-finale', '回家，账单也回家', 'Home again, bills too', '把余下贝币换回本币，按当前账单还清家长模拟卡，给每个孩子留一份纪念品。', 'Exchange leftover shells back, settle the parent’s simulated card at the displayed rate, and keep one souvenir per child.', '鹦鹉邮差：回国后用元还款，不是把贝币欠条扔掉！每个孩子都能翻开自己的旅行纪念页。', 'Parrot Post: repay in yuan at home; do not throw away shell IOUs! Every child gets a souvenir page.', '家长与鹦鹉邮差', 'home', '回国结算与无债旅行', 'Home settlement and debt-free travel'],
);
export const LEVELS: Level[] = rows.map((r, i) => ({ id: r[0], title: text(r[1], r[2]), goal: text(r[3], r[4]), intro: text(r[5], r[6]), person: text(r[7], ['Apple Uncle', 'Bear', 'Baker Bee', 'Parent', 'Parent', 'Grandma', 'Apple Uncle', 'Juice Jo', 'Cloud', 'Baker Bee', 'Le', 'Captain Coin', 'Le', 'Le', 'Parent and Le', 'Beaver and parent', 'Parent', 'Family', 'Parent', 'Parrot and parent', 'Shell Seller', 'Crab and parent', 'Parent', 'Parent and Parrot'][i]), place: r[8], age: Math.min(12, 7 + Math.floor(i / 3)), chapter: 1 + Math.floor(i / 6), topic: text(r[9], r[10]) }));
const f = (s: GameState, key: string) => s.flags[key] ?? 0;
const count = (s: GameState, key: string) => s.inventory[key] ?? 0;
const set = (s: GameState, key: string, value = 1) => { s.flags[key] = value; };
const addItem = (s: GameState, key: string, amount: number) => { s.inventory[key] = count(s, key) + amount; };
const weatherRain = (s: GameState) => ((s.seed ^ (s.level * 2654435761)) >>> 0) % 3 !== 0;
const record = (s: GameState, label: Text, cash = 0, savings = 0, debt = 0, digital = 0) => {
  cash ||= 0; savings ||= 0; debt ||= 0; digital ||= 0;
  s.cash += cash; s.savings += savings; s.debt += debt; s.digital += digital;
  s.ledger.push({ day: s.day, label, cash, savings, debt, ...(digital ? { digital } : {}) });
};
function finish(s: GameState) {
  s.completed = true;
  const reward = ['pocket-badge', 'helper-apron', 'market-hat', 'swap-badge', 'promise-scarf', 'picnic-crown', 'travel-bag', 'passport-badge'][Math.floor(s.level / 3)];
  if (s.level % 3 === 2 && !s.rewards.includes(reward)) s.rewards.push(reward);
}
export const TRAVEL_FINANCE_FLAGS = ['foreignCash', 'fxRate', 'foreignDebt', 'cardDueDay', 'cardLateFee'] as const;
function startLevel(s: GameState) {
  const finances = Object.fromEntries(TRAVEL_FINANCE_FLAGS.filter(key => key in s.flags).map(key => [key, s.flags[key]]));
  s.flags = { entryCash: s.cash, entryDay: s.day, ...finances };
  s.completed = false;
}
export function createGame(family: Family, seed = 2026): GameState {
  if (!family || !['boy', 'girl'].includes(family.gender) || ![1, 2, 3].includes(family.children)) throw new Error('Invalid family');
  const s: GameState = { version: 1, family: { ...family }, level: 0, day: 1, cash: 0, savings: 0, digital: 0, debt: 0, trust: 3, inventory: {}, flags: {}, seed: Number.isFinite(seed) ? (seed >>> 0) : 2026, completed: false, ledger: [], rewards: [] };
  record(s, text('起始小钱包（不是全家资产）', 'Starting pocket money, not family wealth'), 3000);
  startLevel(s);
  return s;
}
export function getLevel(state: GameState): Level { return LEVELS[state.level]; }
const foreignValue = (s: GameState, foreignCents: number) => Math.floor(foreignCents * f(s, 'fxRate') / 100);
export function netWorth(state: GameState): number { return state.cash + state.savings + state.digital + f(state, 'pendingChange') + foreignValue(state, f(state, 'foreignCash')) - state.debt; }
export function getWeather(state: GameState): 'sunny' | 'rainy' {
  return state.level === 8 && f(state, 'weatherChanged') && weatherRain(state) ? 'rainy' : 'sunny';
}
function nextDay(s: GameState, days = 1) {
  for (let i = 0; i < days; i++) {
    s.day++;
    if (s.loan && s.debt > 0) {
      const loan = s.loan;
      if (s.day > loan.lastInterestDay) {
        const interest = Math.floor(loan.principal * loan.rate / 100);
        if (interest) record(s, text('借款利息：每游戏日按本金计算', 'Loan interest: per game-day on principal'), 0, 0, interest);
        loan.lastInterestDay = s.day;
      }
      if (s.day > loan.dueDay && !loan.late) { loan.late = true; s.trust = Math.max(0, s.trust - 1); }
    }
    if (f(s, 'foreignDebt') > 0 && s.day > f(s, 'cardDueDay') && !f(s, 'cardLateFee')) {
      record(s, text('模拟家长卡逾期费用：玩具规则0.20元一次', 'Simulated parent-card late fee: toy ¥0.20 once'), 0, 0, 20);
      set(s, 'cardLateFee', 20);
    }
    if (s.bankTerm && !s.bankTerm.settled && s.day >= s.bankTerm.maturityDay) {
      const t = s.bankTerm;
      const interest = Math.floor(t.principal * t.rate * (t.maturityDay - t.startDay) / 100);
      record(s, text('玩具银行到期利息（不是现实收益）', 'Toy bank maturity interest, not real returns'), 0, interest);
      t.settled = true; set(s, 'bankMatured');
    }
    if (f(s, 'markdownBought') && !f(s, 'breadUsed') && f(s, 'breadDay') < s.day) {
      const amount = count(s, 'markdown');
      addItem(s, 'markdown', -amount); set(s, 'spoiled', amount); set(s, 'markdownBought', 0);
    }
  }
}
export function advance(state: GameState): GameState {
  if (!state.completed || state.level >= LEVEL_COUNT - 1) return state;
  const s = clone(state);
  nextDay(s); s.level++; startLevel(s);
  return s;
}
function clone(s: GameState): GameState {
  return { ...s, family: { ...s.family }, flags: { ...s.flags }, inventory: { ...s.inventory }, ledger: s.ledger.map(e => ({ ...e, label: { ...e.label } })), rewards: [...s.rewards], ...(s.loan ? { loan: { ...s.loan } } : {}), ...(s.bankTerm ? { bankTerm: { ...s.bankTerm } } : {}) };
}
export function getPrices(s: GameState): Price[] {
  const n = s.family.children;
  const price = (id: string, zh: string, en: string, cost: number, stock: number): Price => ({ id, label: text(zh, en), price: cost, stock: Math.max(0, stock) });
  const stock = (id: string, total: number = n) => total - f(s, `bought_${id}`);
  switch (s.level) {
    case 0: return [price('apple', '苹果／个', 'Apple / each', 80, stock('apple')), price('toy', '会打嗝的玩具', 'A hiccuping toy', 180, stock('toy', 1))];
    case 1: return [price('apple', '苹果／个', 'Apple / each', 80, stock('apple')), price('bread', '面包／个', 'Bread / each', 120, stock('bread')), price('toy', '玩具恐龙', 'Toy dinosaur', 200, stock('toy', 1))];
    case 2: return [price('bread', '面包（付5元找零）', 'Bread (¥5 tender)', 120, f(s, 'paid') ? 0 : 1)];
    case 4: case 16: return [price('book', '故事书', 'Storybook', 200, stock('book', 1)), price('toy', '遥控小鸭', 'Remote-control duck', 500, stock('toy', 1))];
    case 5: return [price('gift', '手作小礼物', 'Handmade present', 150, stock('gift', 1)), price('plush', '巨大玩偶', 'Giant plush present', 400, stock('plush', 1))];
    case 6: return [price('apple', f(s, 'delivery') ? '苹果：鸭子让路，补货啦' : '苹果：货架少，送货车迟到', f(s, 'delivery') ? 'Apple: ducks moved; delivery arrived' : 'Apple: scarce shelf; late delivery', f(s, 'delivery') ? 80 : 150, stock('apple', f(s, 'delivery') ? n + 4 : n))];
    case 7: return [price('juice', f(s, 'quiet') ? '果汁：人少了' : '果汁：运动会排长队', f(s, 'quiet') ? 'Juice: quiet queue' : 'Juice: sports-day rush', f(s, 'quiet') ? 100 : 180, stock('juice')), price('park-juice', '公园摊果汁（走过去）', 'Park stall juice (walk there)', 110, stock('juice'))];
    case 8: return [price('umbrella', getWeather(s) === 'rainy' ? '雨伞：雨天需求高' : '雨伞：晴天价', getWeather(s) === 'rainy' ? 'Umbrella: rainy demand' : 'Umbrella: sunny price', getWeather(s) === 'rainy' ? 300 : 200, stock('umbrella', 1)), price('coat', '结实雨衣', 'Sturdy raincoat', 250, stock('coat', 1))];
    case 9: return [price('fresh', '新鲜面包：可留到明天', 'Fresh bread: keeps until tomorrow', 120, stock('fresh')), price('markdown', '今日折价面包：今天吃', 'Markdown bread: eat today', 60, f(s, 'markdownBought') ? 0 : n)];
    case 10: return [price('apple', '苹果（不接受贴纸）', 'Apple (no stickers accepted)', 80, stock('apple'))];
    case 11: return [price('snack', '数字钱包点心', 'Digital-wallet snack', 100, stock('snack', 1))];
    case 12: return [price('shared-book', '合资的故事书', 'Shared storybook', 300, stock('shared-book', 1))];
    case 13: return [price('supplies', '班级用品', 'Class supplies', 300, stock('supplies', 1))];
    case 14: return [price('kit', '小手工工具', 'Craft kit', 400, stock('kit', 1))];
    case 15: return [price('supplies', '手工纸', 'Craft paper', 100, stock('supplies', 1))];
    case 17: return [price('apple', '野餐苹果／人', 'Picnic apple / child', 80, stock('apple')), price('bread', '野餐面包／人', 'Picnic bread / child', 120, stock('bread')), price('juice', '野餐果汁／人', 'Picnic juice / child', 80, stock('juice'))];
    case 18: return [price('ticket', '孩子车票／人', 'Child transport ticket / each', 100, stock('ticket')), price('room', '孩子住宿份额／人', 'Child room share / each', 120, stock('room'))];
    case 19: return [{ ...price('bus', '岛上巴士（预付扫码）／人', 'Island bus (prepaid QR) / child', 30, stock('bus')), currency: 'foreign' }];
    case 20: return [price('home-souvenir', '国内同款小海螺／份', 'Same shell souvenir at home / each', 260, f(s, 'souvenirChosen') ? 0 : n), { ...price('foreign-souvenir', '岛上同款小海螺／份', 'Same shell souvenir on island / each', 100, f(s, 'souvenirChosen') ? 0 : n), currency: 'foreign' }];
    case 22: return [{ ...price('card-snack', '外币点心（家长模拟信用卡）／人', 'Foreign snack (simulated parent credit card) / child', 150, count(s, 'card-snack') ? 0 : n), currency: 'foreign' }, { ...price('qr-sticker', '贴纸（自己的预付钱包）', 'Sticker (your prepaid wallet)', 30, stock('qr-sticker', 1)), currency: 'foreign' }];
    default: return [];
  }
}
type Action = Offer & { place: Place; run: (s: GameState) => Text };
function actions(s: GameState): Action[] {
  const list: Action[] = [];
  const n = s.family.children;
  const need = text('先完成前面的准备。', 'Finish the preparation first.');
  const done = text('这件事已经完成，不会重复发钱。', 'Already done; no repeated payments.');
  const funds = text('小钱包不够。可检查其他工作，或从本关检查点重试。', 'Not enough pocket money. Check jobs or retry this level’s checkpoint.');
  const at = (place: Place, id: string, zh: string, en: string, detailZh: string, detailEn: string, icon: IconName, allowed: boolean, run: (s: GameState) => Text, reason = need) => {
    list.push({ place, id, label: text(zh, en), detail: text(detailZh, detailEn), icon, ...(!allowed ? { disabled: reason } : {}), run });
  };
  const mark = (place: Place, id: string, key: string, zh: string, en: string, detailZh: string, detailEn: string, icon: IconName, allowed = true, outcome = text('准备好了！', 'Ready!')) => at(place, id, zh, en, detailZh, detailEn, icon, allowed && !f(s, key), t => { set(t, key); return outcome; }, f(s, key) ? done : need);
  const buy = (place: Place, id: string, item: string, amount: number, allowed = true, budget = Infinity, digital = false) => {
    const p = getPrices(s).find(v => v.id === item)!;
    const cost = p.price * amount;
    const foreign = p.currency === 'foreign';
    const available = foreign ? f(s, 'foreignCash') : digital ? s.digital : s.cash;
    const unitZh = foreign ? '贝币' : '元';
    const unitEn = foreign ? 'shells ' : '¥';
    const inBudget = f(s, 'spent') + cost <= budget;
    at(place, id, `买${amount}份：${p.label.zh}`, `Buy ${amount}: ${p.label.en}`, `共${money(cost)}${unitZh}；货架${p.stock}份。付款后商品进背包。`, `Total ${unitEn}${money(cost)}; ${p.stock} in stock. Paid goods enter your bag.`, ['bread', 'fresh', 'markdown'].includes(item) ? 'bread' : item.includes('book') ? 'book' : item === 'toy' || item === 'plush' ? 'toy' : item === 'gift' ? 'gift' : 'bag', allowed && p.stock >= amount && available >= cost && inBudget, t => {
      record(t, text(`购买：${p.label.zh} × ${amount}，${money(cost)}${unitZh}`, `Purchase: ${p.label.en} × ${amount}, ${unitEn}${money(cost)}`), foreign || digital ? 0 : -cost, 0, 0, digital ? -cost : 0);
      if (foreign) set(t, 'foreignCash', f(t, 'foreignCash') - cost);
      if (item === 'home-souvenir' || item === 'foreign-souvenir') set(t, 'souvenirChosen');
      addItem(t, item === 'park-juice' ? 'juice' : item, amount);
      set(t, `bought_${item === 'park-juice' ? 'juice' : item}`, f(t, `bought_${item === 'park-juice' ? 'juice' : item}`) + amount);
      set(t, 'spent', f(t, 'spent') + cost);
      if (item === 'markdown') { set(t, 'markdownBought'); set(t, 'breadDay', t.day); }
      if (s.level === 5) { set(t, 'giftSpent', f(t, 'giftSpent') + cost); }
      return text(`付了${money(cost)}${unitZh}，钱少了，背包多了${amount}份。店长说：我的价签没有偷偷换！`, `Paid ${unitEn}${money(cost)}: less money, ${amount} more in your bag. The price tag did not sneak away!`);
    }, !allowed ? need : p.stock < amount ? done : available < cost ? funds : text('超过本关的小预算；玩具会挤掉需要的东西。可从检查点重试。', 'Over this mission’s budget; a toy crowds out needs. Retry the checkpoint if needed.'));
  };
  const end = (place: Place, id: string, zh: string, en: string, allowed: boolean, run?: (t: GameState) => void) => at(place, id, zh, en, getLevel(s).goal.zh, getLevel(s).goal.en, 'heart', allowed, t => { run?.(t); finish(t); return text('完成！钱包里的选择变成了生活里的笑容。新徽章会留在衣柜里。', 'Complete! Pocket decisions became real smiles. Earned badges stay in your wardrobe.'); });
  const wait = (place: Place, id: string, days: number, allowed: boolean, zh: string, en: string) => at(place, id, zh, en, '游戏时间前进；价签、到期日和每游戏日利息会先更新，再让你做决定。', 'Game time moves; price tags, due dates and per-game-day interest update before your next decision.', 'calendar', allowed, t => { nextDay(t, days); set(t, id); return text(`过了${days}个游戏日。先看新的价签与日期，不要急着付款！`, `${days} game-day(s) passed. Check updated tags and dates before paying!`); });
  const earn = (place: Place, id: string, amount: number, zh: string, en: string, allowed = true) => at(place, id, zh, en, `约定${money(amount)}元，只支付一次。`, `Agreed ¥${money(amount)}, paid once only.`, 'broom', allowed && !f(s, id), t => { record(t, text(zh, en), amount); set(t, id); return text('约定工作完成，报酬到账。袜子怪兽说：这次我没偷懒！', 'Agreed job done, payment received. Sock Monster says: no sneaky naps this time!'); }, f(s, id) ? done : need);
  const reserve = f(s, 'reserve');
  switch (s.level) {
    case 0:
      mark('shop', 'read-tags', 'tags', '看价签，选每人1元预算', 'Check tags; budget ¥1 per child', `苹果0.80元，玩具1.80元。${n}个孩子的预算共${money(n * 100)}元。`, `Apple ¥0.80, toy ¥1.80. ${n} children have ¥${money(n * 100)} total budget.`, 'wallet');
      buy('shop', 'buy-apple', 'apple', n, !!f(s, 'tags'), n * 100);
      buy('shop', 'buy-toy', 'toy', 1, !!f(s, 'tags'), n * 100);
      end('home', 'share-apples', '回家分苹果', 'Share apples at home', f(s, 'bought_apple') === n, t => addItem(t, 'apple', -n));
      break;
    case 1:
      mark('home', 'make-list', 'list', '写购物单：苹果和面包', 'Write list: apples and bread', `每人2.50元；${n}个孩子共${money(n * 250)}元。`, `¥2.50 each; ¥${money(n * 250)} for ${n} children.`, 'book');
      buy('shop', 'buy-apple', 'apple', n, !!f(s, 'list'), n * 250);
      buy('shop', 'buy-bread', 'bread', n, !!f(s, 'list'), n * 250);
      buy('shop', 'buy-toy', 'toy', 1, !!f(s, 'list'), n * 250);
      end('school', 'pack-lunch', '把午饭放进每个书包', 'Pack each child’s lunch', f(s, 'bought_apple') === n && f(s, 'bought_bread') === n, t => { addItem(t, 'apple', -n); addItem(t, 'bread', -n); });
      break;
    case 2:
      mark('shop', 'check-price', 'tags', '确认面包1.20元', 'Check bread costs ¥1.20', '准备付5元；商家应把未花的钱找回来。', 'Tender ¥5; the shop returns what you did not spend.', 'coin');
      at('shop', 'pay-note', '交5元纸币', 'Hand over a ¥5 note', '面包1.20元，等待找零；此时钱包先少5元。', 'Bread ¥1.20; await change. Your pocket first loses ¥5.', 'wallet', !!f(s, 'tags') && !f(s, 'paid') && s.cash >= 500, t => { record(t, text('交5元，面包1.20元，找零待领取', '¥5 tender for ¥1.20 bread; change pending'), -500); set(t, 'paid'); set(t, 'pendingChange', 380); addItem(t, 'bread', 1); return text('阿姨摆出了硬币。把未花的3.80元装回钱包，别把付款再减一次。', 'Bee lays out coins. Put the unspent ¥3.80 back; do not deduct the price twice.'); }, f(s, 'paid') ? done : s.cash < 500 ? funds : need);
      at('shop', 'collect-change', '拿回3元＋8角', 'Take ¥3 plus 80 cents', '5.00 − 1.20 = 3.80元；拿回真实找零。', '¥5.00 − ¥1.20 = ¥3.80; collect actual change.', 'coin', f(s, 'pendingChange') === 380, t => { record(t, text('面包找零', 'Bread change'), 380); set(t, 'pendingChange', 0); set(t, 'change'); return text('钱包只少了1.20元！阿姨终于把计算器挂回收银台。', 'Your pocket lost only ¥1.20! Bee finally hangs up the calculator.'); });
      at('shop', 'leave-change', '只拿3元就走', 'Leave with just ¥3', '会少8角；你可以选择回来取齐，不会永久丢失。', '80 cents short; you can come back for the rest.', 'arrow', f(s, 'pendingChange') === 380, t => { record(t, text('先取部分找零', 'Partial change collected'), 300); set(t, 'pendingChange', 80); return text('少了8角！阿姨把钱放进“等你回来”小盒子。', '80 cents missing! Bee keeps it in the come-back box.'); });
      at('shop', 'collect-rest', '回来取剩下8角', 'Return for the last 80 cents', '核对收据，找零不会变成新奖励。', 'Check the receipt: change is not a new reward.', 'coin', f(s, 'pendingChange') === 80, t => { record(t, text('补齐找零', 'Remaining change'), 80); set(t, 'pendingChange', 0); set(t, 'change'); return text('找零齐了，侦探帽扶正！', 'Change complete. Detective hat straight!'); });
      end('school', 'deliver-bread', '把面包送给同学', 'Deliver bread to a classmate', !!f(s, 'change'), t => addItem(t, 'bread', -1));
      break;
    case 3:
      mark('home', 'assign-chores', 'assigned', '一起分配家务', 'Share the chores', `${n}个孩子各有小任务；整理和打扫都要完成，总报酬6元。`, `${n} children each take a task. Sorting and sweeping together earn ¥6 total.`, 'handshake');
      mark('home', 'sort-socks', 'sorted', '整理袜子和书本', 'Sort socks and books', '有弟弟妹妹时，给他们能完成的小任务，不抢功劳。', 'Give younger siblings manageable jobs; share the credit.', 'broom', !!f(s, 'assigned'));
      mark('home', 'sweep-room', 'swept', '合作打扫房间', 'Sweep together', '工作不是点一下就每天自动领钱，约定只有这一次。', 'This agreement pays once, not every day forever.', 'broom', !!f(s, 'assigned'));
      earn('home', 'collect-pay', 600, '领取约定报酬', 'Collect agreed payment', !!f(s, 'sorted') && !!f(s, 'swept'));
      end('home', 'show-room', '请家长验收房间', 'Show the room to a parent', !!f(s, 'collect-pay'));
      break;
    case 4:
      earn('home', 'allowance', 600, '领取本周零花钱', 'Collect this week’s allowance');
      mark('home', 'reserve-two', 'reserveSet', '把2元留在留存罐', 'Keep ¥2 in the save-for-later jar', '这2元仍在小钱包里，但本关买东西不能动它。不是银行利息。', 'This ¥2 stays in your pocket but cannot be spent this mission. It earns no bank interest.', 'wallet', !!f(s, 'allowance'));
      at('home', 'seal-reserve', '给留存罐贴标签', 'Label the reserve jar', '明确锁住2元；买书会用掉另2元，鸭子就要以后再买。', 'Earmark ¥2; a book uses another ¥2, so the duck waits.', 'coin', !!f(s, 'reserveSet') && !reserve, t => { set(t, 'reserve', 200); return text('留存标签贴好了，遥控鸭说：我下周再嘎。', 'Reserve labelled. Remote duck says: quack again next week.'); });
      buy('shop', 'buy-book', 'book', 1, reserve === 200, 400);
      buy('shop', 'buy-toy', 'toy', 1, !!f(s, 'allowance'), 600 - reserve);
      end('home', 'check-jars', '检查留存和新书', 'Check the reserve and book', reserve === 200 && !!f(s, 'bought_book') && f(s, 'spent') <= 400);
      break;
    case 5:
      earn('home', 'receive-gift', 400, '收下奶奶的礼金', 'Receive Grandma’s gift money');
      mark('home', 'gift-plan', 'giftPlan', '决定留1元给未来', 'Plan to keep ¥1 for later', '礼金可购物，不是必须存着；本关只使用这4元信封的钱。', 'Gift money can buy things; it is not locked savings. Use only this ¥4 envelope.', 'gift', !!f(s, 'receive-gift'));
      buy('shop', 'buy-gift', 'gift', 1, !!f(s, 'giftPlan'), 400);
      buy('shop', 'buy-plush', 'plush', 1, !!f(s, 'giftPlan'), 400);
      at('shop', 'return-plush', '退回未拆封的大玩偶', 'Return the unopened giant plush', '全额退4元；可以重新选择小礼物，没有额外奖励。', 'Refund exactly ¥4; choose a smaller gift. No extra reward.', 'arrow', !!f(s, 'bought_plush') && !f(s, 'returnedPlush'), t => { addItem(t, 'plush', -1); record(t, text('退回大玩偶（原价退款）', 'Unopened plush refund at purchase price'), 400); set(t, 'spent', f(t, 'spent') - 400); set(t, 'giftSpent', f(t, 'giftSpent') - 400); set(t, 'returnedPlush'); return text('信封又有4元了。大玩偶挤进退货箱：我真的太大啦！', 'The envelope has ¥4 again. Plush squeezes into the box: I really was too big!'); });
      end('home', 'give-present', '送出礼物，留下零钱', 'Give the present, keep the rest', !!f(s, 'bought_gift') && f(s, 'giftSpent') <= 300, t => addItem(t, 'gift', -1));
      break;
    case 6:
      mark('shop', 'observe-shelf', 'observed', '看空货架和新价签', 'Observe the scarce shelf and price', '供货少，苹果每个1.50元；车到后可能便宜，等待也花时间。', 'Scarce apples cost ¥1.50 each. Delivery may lower prices; waiting takes time.', 'apple');
      wait('shop', 'wait-delivery', 1, !!f(s, 'observed') && !f(s, 'delivery'), '等送货车（1个游戏日）', 'Wait for delivery (1 game-day)');
      at('shop', 'unload-truck', '帮忙打开补货箱', 'Open the delivery crates', '只是观察补货，不发钱；价签将从1.50变0.80元。', 'Observe restocking, no payment; tags change from ¥1.50 to ¥0.80.', 'bag', !!f(s, 'wait-delivery') && !f(s, 'delivery'), t => { set(t, 'delivery'); return text('鸭子让路！苹果多了，价签现在是0.80元，买之前看清楚。', 'Ducks moved! More apples; tags now say ¥0.80. Check before buying.'); });
      buy('shop', 'buy-apple', 'apple', n, !!f(s, 'observed'));
      end('home', 'share-apples', '把苹果分给孩子们', 'Share apples with the children', f(s, 'bought_apple') === n, t => addItem(t, 'apple', -n));
      break;
    case 7:
      mark('school', 'compare-stalls', 'compared', '看队伍，比较两个摊位', 'Check the queue; compare stalls', '操场1.80元，公园1.10元；等队伍变短，操场会降到1元。', 'School ¥1.80, park ¥1.10. After the queue shrinks, school charges ¥1.', 'bag');
      wait('school', 'wait-crowd', 1, !!f(s, 'compared') && !f(s, 'quiet'), '等运动会人群散去', 'Wait until the crowd leaves');
      at('school', 'check-quiet-price', '看人少后的价签', 'Read the quieter-stall tag', '需求变少了；买之前把新的1元价格看清楚。', 'Less demand: read the new ¥1 price before paying.', 'coin', !!f(s, 'wait-crowd') && !f(s, 'quiet'), t => { set(t, 'quiet'); return text('队伍短了，果汁1元。果汁姐姐的嗓子终于能休息啦！', 'Shorter queue, juice ¥1. Jo’s shouting voice finally rests!'); });
      buy('school', 'buy-juice', 'juice', n, !!f(s, 'compared'));
      buy('park', 'buy-park-juice', 'park-juice', n, !!f(s, 'compared'));
      end('school', 'deliver-juice', '给每个孩子一杯果汁', 'Deliver juice to every child', f(s, 'bought_juice') === n, t => addItem(t, 'juice', -n));
      break;
    case 8:
      mark('home', 'read-forecast', 'forecast', '查看明天预报', 'Read tomorrow’s forecast', weatherRain(s) ? '今天晴，明天下雨。明天伞会涨到3元；雨衣2.50元不变。' : '今天晴，明天仍晴。伞保持2元；雨衣2.50元。', weatherRain(s) ? 'Sunny today, rain tomorrow. Umbrellas become ¥3; raincoats stay ¥2.50.' : 'Sunny today and tomorrow. Umbrellas stay ¥2; raincoats ¥2.50.', 'calendar');
      buy('shop', 'buy-umbrella', 'umbrella', 1, !!f(s, 'forecast') && !f(s, 'bought_coat'));
      buy('shop', 'buy-coat', 'coat', 1, !!f(s, 'forecast') && !f(s, 'bought_umbrella'));
      at('home', 'wait-weather', '睡一晚看天空', 'Sleep and check the sky', '明天的天气和价签先显示，再决定买什么；已买的雨具不会补收差价。', 'Tomorrow’s weather and tags appear before buying; owned rain gear is not charged again.', 'calendar', !!f(s, 'forecast') && !f(s, 'weatherChanged'), t => { nextDay(t); set(t, 'weatherChanged'); return weatherRain(t) ? text('滴答，下雨了！伞3元，雨衣2.50元；早买的伞仍然属于你。', 'Pitter-patter, rain! Umbrella ¥3, coat ¥2.50; your earlier umbrella stays yours.') : text('太阳没请假！价签保持不变，雨具留着以后也能用。', 'Sun did not take leave! Tags stay unchanged; rain gear keeps for later.'); });
      end('park', 'pack-weather', '带雨具去公园', 'Take rain gear to the park', !!f(s, 'weatherChanged') && (!!f(s, 'bought_umbrella') || !!f(s, 'bought_coat')));
      break;
    case 9:
      mark('shop', 'compare-bread', 'compared', '比较价格和保质期', 'Compare price and freshness', '新鲜1.20元，今日面包0.60元；折价买多了明天不能吃。', 'Fresh ¥1.20; same-day ¥0.60. Extra markdown bread is inedible tomorrow.', 'bread');
      buy('shop', 'buy-markdown', 'markdown', n, !!f(s, 'compared') && !f(s, 'bought_fresh'));
      buy('shop', 'buy-fresh', 'fresh', n, !!f(s, 'compared') && !f(s, 'breadUsed'));
      at('home', 'leave-bread', '把点心留到明天', 'Leave the snacks until tomorrow', '今日面包会变质；新鲜面包能留一天。可以补买，但损失不会凭空退回。', 'Same-day bread spoils; fresh bread lasts one more day. Replacement costs real money.', 'calendar', (count(s, 'markdown') >= n || f(s, 'bought_fresh') === n) && !f(s, 'leave-bread'), t => { nextDay(t); set(t, 'leave-bread'); return f(t, 'spoiled') ? text('面包变质了，不能给孩子吃。先补买，再从这个决定中学习；也能重试检查点。', 'Bread spoiled; do not feed it to children. Buy replacement or retry the checkpoint.') : text('新鲜面包仍能吃。保质期也有价值！', 'Fresh bread is still edible. Shelf life has value too!'); });
      end('home', 'serve-bread', '今天把点心分好', 'Serve edible snacks', count(s, 'markdown') >= n || f(s, 'bought_fresh') === n, t => { addItem(t, count(t, 'markdown') >= n ? 'markdown' : 'fresh', -n); set(t, 'breadUsed'); });
      break;
    case 10:
      mark('home', 'sort-stickers', 'stickers', '整理两张重复贴纸', 'Sort two duplicate stickers', '自己的重复贴纸，不是印钱；每关仅整理一次。', 'Your existing duplicate stickers, not printed money; sort once this mission.', 'gift');
      at('school', 'offer-swap', '提出：一张贴纸换一个苹果', 'Offer: one sticker for one apple', '你保留一张，小乐喜欢这张；苹果还没有交给你，要等对方同意。', 'You keep one; Le likes this sticker. Wait for agreement before taking the apple.', 'handshake', !!f(s, 'stickers') && !f(s, 'offered'), t => { addItem(t, 'sticker', 2); set(t, 'offered'); return text('小乐看了贴纸说：愿意！还要一起交东西，不能只拿苹果。', 'Le checks the sticker: yes! Now exchange together, not just take the apple.'); });
      at('school', 'accept-swap', '双方一起交换', 'Exchange together', '一张贴纸换一个苹果，现金不变；不是所有商家都接受贴纸。', 'One sticker for one apple; cash unchanged. Not every seller takes stickers.', 'handshake', !!f(s, 'offered') && !f(s, 'swapped') && count(s, 'sticker') >= 1, t => { addItem(t, 'sticker', -1); addItem(t, 'apple', 1); set(t, 'swapped'); return text('握手成功！两个人都得到想要的东西，苹果叔可不收贴纸哦。', 'Happy handshake! Both got something wanted. Apple Uncle still takes money, not stickers.'); });
      buy('shop', 'buy-apple', 'apple', n, !!f(s, 'swapped'));
      end('school', 'share-swap-snack', '分享苹果，留一张贴纸', 'Share apples; keep a sticker', !!f(s, 'swapped') && f(s, 'bought_apple') === n, t => addItem(t, 'apple', -(n + 1)));
      break;
    case 11:
      at('shop', 'change-coins', '把5元纸币换成5个1元硬币', 'Change a ¥5 note into five ¥1 coins', '钱的样子改变，钱包总额不变；这不是5元奖励。', 'Different form, same wallet total: not a ¥5 reward.', 'coin', s.cash >= 500 && !f(s, 'coins'), t => { record(t, text('等值换币：5元纸币→5枚1元', 'Equivalent change: ¥5 note → five ¥1 coins')); set(t, 'coins'); return text('硬币叮当响，总额没有长大！', 'Coins jingle; the total did not grow!'); }, f(s, 'coins') ? done : funds);
      mark('home', 'parent-wallet', 'walletParent', '请家长陪同使用数字钱包', 'Ask a parent to help with the digital wallet', '不创建儿童支付账户；这里是家长陪同的玩具演示。', 'No child payment account; this is a supervised toy demonstration.', 'heart', !!f(s, 'coins'));
      at('shop', 'load-wallet', '把5元转入数字钱包', 'Load ¥5 into the digital wallet', '现金少5元，数字余额多5元，总额不变。', 'Cash −¥5; digital +¥5; total unchanged.', 'wallet', !!f(s, 'walletParent') && !f(s, 'loaded') && s.cash >= 500, t => { record(t, text('现金转数字余额', 'Cash to digital wallet'), -500, 0, 0, 500); set(t, 'loaded'); return text('看见数字5.00了吗？它来自你的5元，不是屏幕送的钱。', 'See 5.00? It came from your ¥5, not a screen giveaway.'); }, f(s, 'loaded') ? done : s.cash < 500 ? funds : need);
      buy('shop', 'pay-digital', 'snack', 1, !!f(s, 'loaded'), Infinity, true);
      at('home', 'cash-out-wallet', '把剩下4元转回现金', 'Return the remaining ¥4 to cash', '数字余额归零，现金增加4元，点心实际花1元。', 'Digital becomes zero, cash +¥4; the snack really cost ¥1.', 'wallet', !!f(s, 'bought_snack') && s.digital === 400 && !f(s, 'cashedOut'), t => { record(t, text('数字余款转回现金', 'Digital remainder to cash'), 400, 0, 0, -400); set(t, 'cashedOut'); finish(t); return text('纸币、硬币、数字都一样值钱；钱包只为点心少了1元。', 'Notes, coins and digital money share value; your pocket lost only ¥1 for the snack.'); });
      break;
    case 12: case 13: case 14: {
      const loanAmount = s.level === 12 ? 200 : s.level === 13 ? 300 : 400;
      const rate = s.level === 14 ? 1 : 0;
      const place: Place = s.level === 14 ? 'home' : 'school';
      mark(place, 'read-loan', 'loanRead', '一起看借款约定', 'Read the loan agreement together', `借${money(loanAmount)}元，明天到期；${rate ? '每游戏日按本金1%收利息（玩具规则）' : '朋友约定不收利息'}。借钱不会增加净值。`, `Borrow ¥${money(loanAmount)}, due tomorrow; ${rate ? '1% of principal per game-day (toy rules)' : 'friend agrees to no interest'}. Borrowing does not increase net worth.`, 'book');
      at(place, 'borrow', `借${money(loanAmount)}元，记下明天日期`, `Borrow ¥${money(loanAmount)}; note tomorrow’s date`, '现金和欠款同时增加；必须归还，信任不是无限借款额度。', 'Cash and debt rise together; repay it. Trust is not an unlimited credit line.', 'handshake', !!f(s, 'loanRead') && !f(s, 'borrowed') && s.debt === 0, t => { record(t, text('约定借款（不是收入）', 'Agreed loan, not income'), loanAmount, 0, loanAmount); t.loan = { principal: loanAmount, startDay: t.day, dueDay: t.day + 1, rate, lastInterestDay: t.day, late: false }; set(t, 'borrowed'); return text('欠条写好了：明天归还。钱包变鼓，净值没有增加。', 'IOU written: repay tomorrow. Fatter pocket, unchanged net worth.'); }, f(s, 'borrowed') ? done : need);
      const item = s.level === 12 ? 'shared-book' : s.level === 13 ? 'supplies' : 'kit';
      buy('shop', 'buy-loan-item', item, 1, !!f(s, 'borrowed'));
      earn('home', 'loan-work', s.level === 12 ? 250 : s.level === 13 ? 350 : 500, '完成约定小工作', 'Complete the agreed small job', !!f(s, `bought_${item}`));
      wait('home', 'wait-due', 1, !!f(s, 'loan-work') && !f(s, 'wait-due') && !!s.loan, '过一个游戏日，到还款日', 'Wait one game-day to the due date');
      wait('park', 'wait-late', 2, !!s.loan && !f(s, 'wait-late') && !!f(s, 'loan-work'), '先去玩两天（会晚还）', 'Play for two days (repayment will be late)');
      at(place, 'repay', `归还全部${money(s.debt)}元`, `Repay all ¥${money(s.debt)}`, s.loan ? `今天第${s.day}天，到期第${s.loan.dueDay}天；${s.loan.late ? '已晚还，信任少一格，可以道歉修复' : '尚未晚还'}。本金与利息一起归还。` : '没有正在借的款。', s.loan ? `Today day ${s.day}, due day ${s.loan.dueDay}; ${s.loan.late ? 'late: trust lost one, repair with apology' : 'not overdue'}. Repay principal and interest together.` : 'No current loan.', 'handshake', s.debt > 0 && s.cash >= s.debt && !!f(s, 'loan-work') && !!s.loan && s.day > s.loan.startDay, t => { const late = t.loan!.late; record(t, text('还清借款本金与利息', 'Repaid loan principal and interest'), -t.debt, 0, -t.debt); delete t.loan; set(t, 'repaid'); set(t, 'needsApology', late ? 1 : 0); if (!late) t.trust = Math.min(3, t.trust + 1); return late ? text('钱还清了。小乐说：谢谢回来还钱，我们还要说说下次怎么记日期。', 'Repaid. Le says: thanks for coming back; let’s plan how to remember dates next time.') : text('按约归还，小乐的眉毛从问号变成笑脸！', 'Promise kept! Le’s question-mark eyebrows become smiles!'); }, s.debt === 0 ? done : s.cash < s.debt ? funds : need);
      at(place, 'repair-trust', '道歉，并一起标好下次日期', 'Apologize and mark the next date together', '先还钱，再用行动修复信任；不会因此发钱。', 'Repay first, then repair trust with a plan. No money reward.', 'heart', !!f(s, 'repaid') && !!f(s, 'needsApology') && !f(s, 'apologized'), t => { t.trust = Math.min(3, t.trust + 1); set(t, 'apologized'); set(t, 'needsApology', 0); return text('番茄日历贴上了冰箱。信任回升，下次可以做得更好。', 'Tomato calendar on the fridge. Trust improves; next time can be better.'); });
      end(place, 'close-loan', '收好没有欠款的约定本', 'Close the debt-free agreement book', !!f(s, 'repaid') && s.debt === 0 && !f(s, 'needsApology'));
      break;
    }
    case 15: case 16: case 17: {
      const primary: Place = s.level === 17 ? 'park' : 'bank';
      mark('home', 'parent-bank', 'bankParent', '请家长陪同去银行', 'Ask a parent to accompany you to the bank', '儿童不独自开户或投资；只管理自己的零花钱，家长的钱不在这里。', 'No independent child accounts or investments; manage only your pocket, not parent wealth.', 'heart');
      if (s.level !== 17) {
        const principal = s.level === 15 ? 300 : 200;
        const term = s.level === 15 ? 2 : 1;
        if (s.level === 16) earn('home', 'allowance', 600, '领取新一周零花钱', 'Collect the new week’s allowance');
        at('bank', 'deposit', `存${money(principal)}元，${term}游戏日到期`, `Deposit ¥${money(principal)} for ${term} game-day(s)`, `玩具银行单利每游戏日1%；到期利息${money(Math.floor(principal * term / 100))}元，非现实收益。现金减少，存款等额增加。`, `Toy bank simple interest 1% per game-day; maturity interest ¥${money(Math.floor(principal * term / 100))}, not real returns. Equal cash-to-savings transfer.`, 'bank', !!f(s, 'bankParent') && !s.bankTerm && !f(s, 'bankMatured') && s.cash >= principal && (s.level !== 16 || !!f(s, 'allowance')), t => { record(t, text('现金存入银行（转账，不是收入）', 'Cash deposited, transfer not income'), -principal, principal); t.bankTerm = { principal, startDay: t.day, maturityDay: t.day + term, rate: 1, settled: false }; set(t, 'deposited'); return text(`钱去银行睡觉了，第${t.day + term}天到期。现金＋存款没有变多。`, `Money’s bank nap ends on day ${t.day + term}. Cash plus savings did not grow.`); }, s.cash < principal ? funds : s.bankTerm || f(s, 'bankMatured') ? done : need);
        at('bank', 'wait-bank', '过一个游戏日，查看存单', 'Wait one game-day; check the deposit', s.bankTerm ? `今天第${s.day}天；到期第${s.bankTerm.maturityDay}天。到期只结算一次单利。` : '先存钱，才能等待存款到期。', s.bankTerm ? `Today day ${s.day}; maturity day ${s.bankTerm.maturityDay}. Simple interest settles once only.` : 'Deposit before waiting for maturity.', 'calendar', !!s.bankTerm && !s.bankTerm.settled, t => { nextDay(t); return t.bankTerm!.settled ? text('存单到期，利息到账一次！河狸柜员盖章：不是天天按按钮领钱。', 'Matured: interest credited once! Beaver stamps: not a daily button-money machine.') : text('还未到期。钱还在睡觉，明天再看。提前取会放弃利息。', 'Not mature yet; money naps on. Early withdrawal forfeits interest.'); });
      }
      at('bank', 'withdraw', `取回银行余额${money(s.savings)}元`, `Withdraw bank balance ¥${money(s.savings)}`, s.bankTerm && !s.bankTerm.settled ? '提前取回本金，放弃利息。可重新存，但不能赚取尚未到期的利息。' : '已到期的本金和利息一起转回现金；总额不会因取款增加。', s.bankTerm && !s.bankTerm.settled ? 'Early withdrawal returns principal and forfeits interest. You may redeposit, but unearned interest is not credited.' : 'Mature principal and interest move to cash; withdrawal does not grow your total.', 'bank', !!f(s, 'bankParent') && s.savings > 0, t => { const mature = !!t.bankTerm?.settled; const amount = t.savings; record(t, text('银行余额取回现金', 'Savings withdrawn to cash'), amount, -amount); delete t.bankTerm; set(t, 'withdrew', mature ? 1 : 0); if (!mature) set(t, 'deposited', 0); return mature ? text('现金回来了，存款少了同样多。没有印钞机！', 'Cash returned; savings fell equally. No money printer!') : text('提前取回本金，利息放弃。可以重新存一次耐心的午睡。', 'Principal returned early, interest forfeited. Try a more patient bank nap.'); });
      if (s.level === 15) {
        buy('shop', 'buy-bank-paper', 'supplies', 1, !!f(s, 'withdrew'));
        end(primary, 'check-bank', '检查存取记录', 'Check deposit and withdrawal records', !!f(s, 'bankMatured') && !!f(s, 'withdrew') && !!f(s, 'bought_supplies'));
      } else if (s.level === 16) {
        buy('shop', 'buy-book', 'book', 1, !!f(s, 'deposited'));
        end(primary, 'keep-picnic-savings', '把到期存款留给野餐', 'Keep mature savings for the picnic', !!s.bankTerm?.settled && s.savings >= 202 && !!f(s, 'bought_book'));
      } else {
        mark('home', 'assign-picnic', 'picnicAssigned', '分配孩子们的野餐任务', 'Share picnic jobs among the children', `${n}个孩子都参与：洗水果、装面包、带水杯；家长付自己的餐费。`, `${n} children help wash fruit, pack bread and bring cups. Parents fund their own meals.`, 'handshake');
        earn('home', 'picnic-work', 400 + 120 * n, '完成野餐准备，领取约定小帮手报酬', 'Finish picnic prep; collect agreed helper pay', !!f(s, 'picnicAssigned'));
        buy('shop', 'buy-apple', 'apple', n, !!f(s, 'picnic-work'));
        buy('shop', 'buy-bread', 'bread', n, !!f(s, 'picnic-work'));
        buy('shop', 'buy-juice', 'juice', n, !!f(s, 'picnic-work'));
        end('park', 'start-picnic', '一起享受没有欠条的野餐', 'Enjoy the debt-free picnic together', !!f(s, 'picnic-work') && f(s, 'bought_apple') === n && f(s, 'bought_bread') === n && f(s, 'bought_juice') === n && s.debt === 0 && s.savings === 0, t => { addItem(t, 'apple', -n); addItem(t, 'bread', -n); addItem(t, 'juice', -n); });
      }
      break;
    }
  }
  if (s.level === 18) {
    earn('home', 'travel-envelope', 600 + 400 * n, '家长交给孩子们旅行信封', 'Parent gives the children’s travel envelope');
    at('home', 'plan-trip', '和家长写旅行预算', 'Write the travel budget with a parent', `${n}个孩子的车票${money(n * 100)}元，住宿份额${money(n * 120)}元；另留至少${money(n * 300)}元给后续行程。大人自己付自己的部分。`, `For ${n} children: transport ¥${money(n * 100)}, room share ¥${money(n * 120)}; reserve at least ¥${money(n * 300)} for later. Adults fund their own share.`, 'book', !!f(s, 'travel-envelope') && !f(s, 'tripPlan'), t => { set(t, 'tripPlan'); set(t, 'travelBudget', 600 + 400 * n); set(t, 'fxRate', 200); set(t, 'foreignCash', 0); set(t, 'foreignDebt', 0); set(t, 'cardDueDay', 0); set(t, 'cardLateFee', 0); return text('计划写好了：贝壳岛是虚构国家，所有汇率和费用都是玩具规则。', 'Plan ready: Shell Island is fictional; all rates and fees are toy rules.'); });
    buy('shop', 'book-tickets', 'ticket', n, !!f(s, 'tripPlan'), 600 + 400 * n);
    buy('shop', 'book-room', 'room', n, !!f(s, 'tripPlan'), 600 + 400 * n);
    end('home', 'seal-trip-budget', '封好下一程经费，出发', 'Reserve next-leg funds and depart', f(s, 'bought_ticket') === n && f(s, 'bought_room') === n && f(s, 'travelBudget') - f(s, 'spent') >= 300 * n);
  }
  if (s.level === 19) {
    mark('bank', 'read-exchange', 'exchangeRead', '家长陪同看兑换牌', 'Read the exchange board with a parent', '1贝币＝2元。换5贝币需要10元＋0.20元一次费用；换回也按牌价减0.20元。贝币以百分之一为小单位。', '1 shell = ¥2. Buy 5 shells for ¥10 plus a ¥0.20 fee; conversion back uses the board rate minus ¥0.20 too. Each shell has 100 small units.', 'bank');
    at('bank', 'exchange-shells', '用10.20元换5贝币', 'Exchange ¥10.20 for 5 shells', '兑换等值部分不是支出，0.20元手续费才是净值减少；不送免费贝币。', 'Equivalent conversion is not a loss; the ¥0.20 fee reduces net worth. No free shells.', 'coin', !!f(s, 'exchangeRead') && !f(s, 'exchanged') && s.cash >= 1020, t => { record(t, text('兑换5贝币，汇率2元／贝币，手续费0.20元', 'Exchange 5 shells at ¥2/shell, fee ¥0.20'), -1020); set(t, 'foreignCash', f(t, 'foreignCash') + 500); set(t, 'exchanged'); return text('现金少10.20元，外币多5贝币；按牌价总值少0.20元，是手续费。', 'Cash −¥10.20, foreign +5 shells; total value lost ¥0.20, the fee.'); }, s.cash < 1020 ? funds : f(s, 'exchanged') ? done : need);
    buy('park', 'pay-bus-qr', 'bus', n, !!f(s, 'exchanged'));
    end('park', 'ride-island-bus', '带孩子们坐岛上巴士', 'Ride the island bus together', f(s, 'bought_bus') === n && s.debt === 0, t => addItem(t, 'bus', -n));
  }
  if (s.level === 20) {
    mark('shop', 'compare-fx-prices', 'fxCompared', '把两地价签换算成元', 'Convert both price tags to yuan', `国内${money(260 * n)}元；国外${n}贝币＝${money(200 * n)}元，之前整次兑换另有0.20元费用。对这次购买比较，不代表永远能套利。`, `Home ¥${money(260 * n)}; abroad ${n} shells = ¥${money(200 * n)}, with ¥0.20 for the earlier whole exchange. Compare this trip, not a permanent arbitrage claim.`, 'coin');
    buy('shop', 'buy-foreign-souvenir', 'foreign-souvenir', n, !!f(s, 'fxCompared'));
    buy('home', 'order-home-souvenir', 'home-souvenir', n, !!f(s, 'fxCompared'));
    end('park', 'pack-souvenirs', '给每个孩子装好一份纪念品', 'Pack one souvenir for each child', !!f(s, 'souvenirChosen'));
  }
  if (s.level === 21) {
    const imported = count(s, 'foreign-souvenir');
    const declaredValue = foreignValue(s, imported * 100);
    const duty = declaredValue > 400 ? 60 : 0;
    mark('school', 'read-customs', 'customsRead', '家长陪同看虚构海关牌', 'Read the toy customs board with a parent', `本游戏国外礼物总值超过4元，收0.60元；你的进口礼物${imported}份，换算${money(declaredValue)}元，基础费用${money(duty)}元。这不是现实规定。`, `Toy rule: overseas gifts above ¥4 cost ¥0.60. Yours: ${imported} imported gifts worth ¥${money(declaredValue)}, base charge ¥${money(duty)}. Not a real rule.`, 'book');
    at('school', 'declare-gifts', '如实申报进口礼物', 'Declare imported gifts honestly', '按物品数量和牌价计算，不会因点两次就重复收钱。', 'Based on goods and board rates, not repeated button charges.', 'bag', !!f(s, 'customsRead') && !f(s, 'declared') && !f(s, 'hidden'), t => { set(t, 'declared'); set(t, 'customsCharge', duty); return text(`关员数了${imported}份，显示应付${money(duty)}元。螃蟹有八只脚，收费仍只有一次。`, `Crab counts ${imported}; charge ¥${money(duty)}. Eight legs, still only one bill.`); });
    at('school', 'hide-gifts', '把礼物装成袜子（会被检查）', 'Disguise gifts as socks (inspection follows)', '游戏里会多0.20元处理费；仍能重新申报和支付，不是现实处罚规则。', 'Toy inspection adds ¥0.20 handling fee. Correct it and pay; not real penalty rules.', 'shirt', !!f(s, 'customsRead') && !f(s, 'declared') && !f(s, 'hidden'), t => { set(t, 'hidden'); return text('螃蟹说：会发光的袜子？请重新申报，玩具处理费0.20元。', 'Crab: glowing socks? Declare again; toy handling fee ¥0.20.'); });
    at('school', 'correct-declaration', '重新如实填写申报', 'Correct the declaration honestly', `一次基础费${money(duty)}元＋游戏处理费0.20元。`, `One base charge ¥${money(duty)} plus toy handling fee ¥0.20.`, 'book', !!f(s, 'hidden') && !f(s, 'declared'), t => { set(t, 'declared'); set(t, 'customsCharge', duty + 20); return text('填好了，出错后可以改正。先看费用，再付款。', 'Corrected; mistakes can be repaired. Check the charge before paying.'); });
    const charge = f(s, 'customsCharge');
    at('school', 'pay-customs', `支付显示的${money(charge)}元通关费`, `Pay the displayed ¥${money(charge)} customs charge`, '虚构费用只扣一次；免收时也要确认申报。', 'Toy charge deducted once; confirm declarations even when free.', 'coin', !!f(s, 'declared') && !f(s, 'customsPaid') && s.cash >= charge, t => { record(t, text('虚构海关：已申报费用', 'Toy customs: declared charge'), -charge); set(t, 'customsPaid'); return text('支付确认，螃蟹盖章：礼物不是袜子，欢迎通行！', 'Confirmed. Crab stamps: gifts are not socks. You may pass!'); }, s.cash < charge ? funds : f(s, 'customsPaid') ? done : need);
    end('school', 'customs-stamp', '收好申报单和通行章', 'Keep the declaration and passage stamp', !!f(s, 'customsPaid'));
  }
  if (s.level === 22) {
    mark('home', 'parent-card-terms', 'cardTerms', '和家长看模拟信用卡约定', 'Read simulated parent-card terms together', `每人点心1.50贝币。今天1贝币＝2元，预计账单${money(300 * n)}元；回家牌价可能变为2.20元，实际要${money(330 * n)}元。两游戏日后到期；晚还一次玩具费0.20元。`, `Snack 1.50 shells each. Today ¥2/shell, estimated ¥${money(300 * n)}; home rate may become ¥2.20, owing ¥${money(330 * n)}. Due after two game-days; one toy late fee ¥0.20.`, 'book');
    buy('shop', 'pay-sticker-qr', 'qr-sticker', 1, !!f(s, 'cardTerms') && !f(s, 'returnedHome'));
    at('shop', 'pay-parent-card', `家长信用卡买${n}份外币点心`, `Parent credit card: buy ${n} foreign snacks`, `借款${money(150 * n)}贝币；本币欠款按当前牌价${money(foreignValue(s, 150 * n))}元。自己的贝币钱包不会减少，这不是免费的点心。`, `Borrow ${money(150 * n)} shells; current home debt ¥${money(foreignValue(s, 150 * n))}. Your foreign wallet stays unchanged: not free snacks.`, 'wallet', !!f(s, 'cardTerms') && !f(s, 'returnedHome') && count(s, 'card-snack') === 0 && s.debt === 0, t => { const foreignDebt = 150 * n; set(t, 'foreignDebt', foreignDebt); set(t, 'cardDueDay', t.day + 2); set(t, 'cardLateFee', 0); record(t, text('家长模拟信用卡外币购物：借款，不是预付', 'Simulated parent-card foreign purchase: credit, not prepaid'), 0, 0, foreignValue(t, foreignDebt)); addItem(t, 'card-snack', n); set(t, 'cardBought'); return text('点心进背包，账单也来了；现金没少不等于没花钱。', 'Snacks in the bag, bill alongside; unchanged cash does not mean no spending.'); });
    at('shop', 'refund-card-snacks', '退未打开点心，撤销对应借款', 'Return unopened snacks; reverse their debt', '只撤销这一笔外币欠款，不给你现金或贝币；一次退款后可重新购买。', 'Reverse only this foreign debt; no cash or foreign-wallet payout. One refund, then you may rebuy.', 'arrow', count(s, 'card-snack') === n && !f(s, 'returnedHome') && !f(s, 'cardRefunded'), t => { record(t, text('模拟卡退款：撤销对应欠款，不发现金', 'Simulated card refund: debt reversed, no cash payout'), 0, 0, -t.debt); set(t, 'foreignDebt', 0); set(t, 'cardDueDay', 0); set(t, 'cardRefunded'); set(t, 'cardBought', 0); addItem(t, 'card-snack', -n); return text('未打开点心退回，欠款归零；没有拿到免费钱。可以重新选这笔模拟购买。', 'Unopened snacks returned, debt zero; no free money. You may choose the simulated purchase again.'); });
    at('park', 'fly-home', '和家长回家，先看新汇率账单', 'Return home; read the new rate and bill first', '过一个游戏日，1贝币从2元变2.20元。外币欠款数量不变，本币账单会重估；自己的外币余款也按新牌价计值。', 'One game-day: ¥2/shell becomes ¥2.20. Foreign debt quantity stays fixed; home bill is revalued. Your foreign wallet is valued at the new rate too.', 'calendar', !!f(s, 'cardBought') && !f(s, 'returnedHome') && f(s, 'foreignDebt') > 0, t => { nextDay(t); const oldValue = foreignValue(t, f(t, 'foreignDebt')); set(t, 'fxRate', 220); const newValue = foreignValue(t, f(t, 'foreignDebt')); record(t, text('汇率变化：外币欠款本币重估', 'FX change: foreign debt revalued in home currency'), 0, 0, newValue - oldValue); set(t, 'returnedHome'); return text(`贝币数量没变；新牌价1贝币＝2.20元，回国账单现在${money(t.debt)}元。先看，再还！`, `Same shell debt; new ¥2.20/shell rate. Home bill now ¥${money(t.debt)}. Check before settling!`); });
    end('home', 'review-card-bill', '和家长核对账单，准备还款', 'Review the bill with a parent; prepare repayment', !!f(s, 'returnedHome') && f(s, 'foreignDebt') === 150 * n && s.debt === 330 * n);
  }
  if (s.level === 23) {
    mark('home', 'read-home-bill', 'homeBill', '和家长核对到期日与资金来源', 'Review due date and funding with a parent', `今天第${s.day}天，到期第${f(s, 'cardDueDay')}天；1贝币＝${money(f(s, 'fxRate'))}元。用本币现金还款${money(s.debt)}元；不是从贝币钱包自动扣。`, `Today day ${s.day}, due day ${f(s, 'cardDueDay')}; 1 shell = ¥${money(f(s, 'fxRate'))}. Repay ¥${money(s.debt)} from home cash, not automatically from the shell wallet.`, 'calendar');
    const foreign = f(s, 'foreignCash');
    const value = foreignValue(s, foreign);
    const fee = Math.min(20, value);
    at('bank', 'exchange-home', `把${money(foreign)}贝币换回${money(value - fee)}元`, `Exchange ${money(foreign)} shells back for ¥${money(value - fee)}`, `当前汇率2.20元／贝币，等值${money(value)}元，扣一次手续费${money(fee)}元；剩余贝币归零。`, `Current ¥2.20/shell, equivalent ¥${money(value)}, one ¥${money(fee)} fee; foreign balance becomes zero.`, 'bank', !!f(s, 'homeBill') && foreign > 0, t => { record(t, text('余下贝币兑换本币，扣一次兑换费', 'Remaining shells to home cash, one exchange fee'), value - fee); set(t, 'foreignCash', 0); set(t, 'exchangedHome'); return text('贝币少了，本币增加；扣掉手续费，不会凭空变出钱。', 'Shells gone, yuan returned; fee deducted, no money created.'); });
    wait('park', 'delay-card', 2, !!f(s, 'homeBill') && s.debt > 0 && !f(s, 'delay-card'), '把账单忘在书包两天（有玩具逾期费）', 'Forget the bill for two days (toy late fee)');
    at('home', 'settle-parent-card', `用本币还清${money(s.debt)}元模拟卡账单`, `Settle the simulated card with ¥${money(s.debt)} home cash`, `本金${money(foreignValue(s, f(s, 'foreignDebt')))}元＋已显示玩具逾期费${money(f(s, 'cardLateFee'))}元。还款只会减少现金和对应欠款。`, `Principal ¥${money(foreignValue(s, f(s, 'foreignDebt')))} plus displayed toy late fee ¥${money(f(s, 'cardLateFee'))}. Repayment reduces cash and the matching debt.`, 'handshake', !!f(s, 'homeBill') && s.debt > 0 && s.cash >= s.debt, t => { const debt = t.debt; record(t, text('本币还清家长模拟卡外币账单', 'Home-currency settlement of simulated parent-card foreign bill'), -debt, 0, -debt); set(t, 'foreignDebt', 0); set(t, 'cardDueDay', 0); set(t, 'cardLateFee', 0); set(t, 'cardSettled'); return text('现金少了同样的欠款，账单结清！下次按日期还，就不用玩具逾期费。', 'Cash fell by the debt amount: settled! Next time, meet the date and avoid the toy late fee.'); }, s.cash < s.debt ? funds : s.debt === 0 ? done : need);
    end('home', 'finish-travel', '全家翻开没有欠款的旅行相册', 'Open the debt-free family travel album', !!f(s, 'cardSettled') && s.debt === 0 && f(s, 'foreignCash') === 0 && count(s, 'home-souvenir') + count(s, 'foreign-souvenir') === n, t => addItem(t, 'card-snack', -n));
  }
  return list;
}
const places: Place[] = ['home', 'shop', 'school', 'bank', 'park'];
export function getActions(state: GameState, place: Place): Offer[] {
  if (!places.includes(place)) return [];
  if (state.completed) return [{ id: `talk-${place}`, label: text('聊聊今天的选择', 'Talk about today’s choices'), detail: text(state.level === LEVEL_COUNT - 1 ? '童年旅程完成！可以重玩检查点；成年活动还没有开放。' : '本关完成；按“继续”开始下一关。不会跳过未完成的关卡。', state.level === LEVEL_COUNT - 1 ? 'Childhood campaign complete! Replay checkpoints; adult activities are not open yet.' : 'Mission complete; Continue starts the next. Unfinished levels cannot be skipped.'), icon: 'heart' }];
  const available = actions(state).filter(a => a.place === place).map(({ run: _run, place: _place, ...offer }) => offer);
  if (available.length) return available;
  const targets = [...new Set(actions(state).filter(a => !a.disabled).map(a => a.place))];
  const names: Record<Place, Text> = { home: text('家', 'home'), shop: text('商店', 'shop'), school: text('学校', 'school'), bank: text('银行', 'bank'), park: text('公园', 'park') };
  const targetZh = targets.map(p => names[p].zh).join('、') || '本关检查点';
  const targetEn = targets.map(p => names[p].en).join(', ') || 'the level checkpoint';
  return [{ id: `talk-${place}`, label: text('问问下一步去哪', 'Ask where to go next'), detail: text(`这里可以休息。下一步去${targetZh}；家务和准备动作也可能在别处。`, `Rest here. Next try ${targetEn}; preparation and jobs may be elsewhere.`), icon: 'arrow' }];
}
export function act(state: GameState, actionId: string): Result {
  if (typeof actionId !== 'string') return { state, ok: false, message: text('没有这个行动。', 'Unknown action.') };
  if (actionId.startsWith('talk-')) {
    const place = actionId.slice(5) as Place;
    const offer = getActions(state, place).find(o => o.id === actionId);
    if (offer) return { state, ok: true, message: offer.detail };
  }
  if (state.completed) return { state, ok: false, message: text('本关已完成，不能重复领取或购物。', 'Mission complete; no repeat purchases or rewards.') };
  const action = actions(state).find(a => a.id === actionId);
  if (!action) return { state, ok: false, message: text('没有这个行动；请使用当前地点的按钮。', 'Unknown action; use the current place’s buttons.') };
  if (action.disabled) return { state, ok: false, message: action.disabled };
  const s = clone(state);
  const message = action.run(s);
  return { state: s, ok: true, message };
}
const progressKeys = [
  ['tags', 'bought_apple', 'complete'], ['list', 'bought_apple', 'bought_bread', 'complete'], ['tags', 'paid', 'change', 'complete'],
  ['assigned', 'sorted', 'swept', 'collect-pay', 'complete'], ['allowance', 'reserveSet', 'reserve', 'bought_book', 'complete'], ['receive-gift', 'giftPlan', 'bought_gift', 'complete'],
  ['observed', 'bought_apple', 'complete'], ['compared', 'bought_juice', 'complete'], ['forecast', 'weatherChanged', 'protection', 'complete'], ['compared', 'edible', 'complete'],
  ['stickers', 'offered', 'swapped', 'bought_apple', 'complete'], ['coins', 'walletParent', 'loaded', 'bought_snack', 'complete'],
  ['loanRead', 'borrowed', 'bought_shared-book', 'loan-work', 'repaid', 'complete'], ['loanRead', 'borrowed', 'bought_supplies', 'loan-work', 'repaid', 'complete'], ['loanRead', 'borrowed', 'bought_kit', 'loan-work', 'repaid', 'complete'],
  ['bankParent', 'deposited', 'bankMatured', 'withdrew', 'bought_supplies', 'complete'], ['allowance', 'bankParent', 'deposited', 'bought_book', 'bankMatured', 'complete'], ['picnicAssigned', 'picnic-work', 'withdrawn', 'bought_apple', 'bought_bread', 'bought_juice', 'complete'],
  ['travel-envelope', 'tripPlan', 'bought_ticket', 'bought_room', 'complete'], ['exchangeRead', 'exchanged', 'bought_bus', 'complete'], ['fxCompared', 'souvenirChosen', 'complete'], ['customsRead', 'declared', 'customsPaid', 'complete'], ['cardTerms', 'cardBought', 'returnedHome', 'complete'], ['homeBill', 'foreignReturned', 'cardSettled', 'complete'],
];
export function getProgress(state: GameState): Progress {
  const keys = progressKeys[state.level];
  const complete = (key: string) => key === 'complete' ? state.completed : key === 'protection' ? f(state, 'bought_umbrella') || f(state, 'bought_coat') : key === 'edible' ? count(state, 'markdown') >= state.family.children || f(state, 'bought_fresh') || state.completed : key === 'withdrawn' ? state.savings === 0 : key === 'foreignReturned' ? f(state, 'foreignCash') === 0 : f(state, key);
  return { current: state.completed ? keys.length : keys.filter(complete).length, total: keys.length, description: getLevel(state).goal };
}
