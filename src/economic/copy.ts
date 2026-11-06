import { localeUI } from './locale-ui';
import legacy from './legacy-content.json';
import type { Lang, Place, Text } from './model';

const zh = {
  title: '小小经济家', subtitle: '一枚零花钱，一家人的小冒险', homeLink: '返回游戏大厅',
  cash: '口袋里', savings: '银行里', debt: '要还的', worth: '真正属于我的', yuan: '元',
  wallet: '我的小账本', walletNote: '平时是孩子的零花钱；旅行时是家长交给你管理的小预算，不是全家的资产。',
  map: '回到小镇', chapter: '成长手帐', close: '收起来', visit: '去看看',
  locations: { home: '暖暖的家', shop: '橘子小铺', school: '向日葵小学', bank: '松果银行', park: '河边公园' } as Record<Place, string>,
  newGame: '开始我的故事', resume: '接着玩', chooseFamily: '这次，你是谁？',
  setupIntro: '今天，家里有一项小任务等着你。挑好角色，就出门吧！',
  boy: '小禾 · 男孩', girl: '小麦 · 女孩', children: '家里有几个孩子？',
  familySize: ['我是独生子女', '我家有两个孩子', '我家有三个孩子'],
  familyNote: '每个家庭都很棒。一起吃点心、分担家务时，人数会真的影响你的选择。',
  age: '岁', day: '第', dayEnd: '天', goal: '今天的小愿望', progress: '已经做到',
  next: '新的小冒险', finale: '把一家的故事放进相册！', finaleBody: '从小时候的小任务，到工作、经营、照顾家人和退休。不同的选择，连起了你的一生。',
  ending: '一生的故事 · 完成', endingNote: '这是缩小的虚构经济故事，不是收益保证，也不是真实投资建议。',
  retry: '重玩这一关', retryTitle: '从这关出发时重新来？',
  retryBody: '这一关的钱、物品和天数都会回到出发时。以前的关卡不受影响。',
  confirmRetry: '重新试一次', cancel: '还是接着玩', reset: '新的家庭故事',
  resetTitle: '开启一段新的故事？', resetBody: '这会替换本浏览器中的存档。现在的家庭和进度将不再保留。',
  confirmReset: '选择新家庭', saved: '故事已保存', unsaved: '当前不能保存；离开或刷新会丢失本次进度。',
  saveNote: '自动保存在这个浏览器。没有账号，也不会上传。',
  history: '最近的钱去了哪里', noHistory: '小账本的第一页，还等着你来写。',
  inventory: '我的小背包', emptyBag: '现在轻轻的。新买的东西会放在这里。',
  trust: '朋友的信任', trustNote: '钱要还，答应的日子也要记住。',
  wardrobe: '成长小衣橱', outfit: ['舒服的日常装', '新背包与小外套', '野餐日的漂亮衣服'],
  wardrobeNote: '完成一段故事，衣橱就会多一点颜色。不是谁钱多，谁就更好。',
  settings: '小镇设置', sound: '录音和小音效', soundOn: '开着', soundOff: '关着',
  soundNote: '讲故事用本地预录音。不把文字发到网上，也不用浏览器合成声音。录音未就绪时，会如实提示。',
  help: '怎么玩', helpBody: '点亮着小脚印的地方，和那里的人聊聊。选一件事，看看口袋和世界怎么变。遇到难题，随时重玩这一关。没有倒计时。',
  helpBank: '银行里的利息按游戏天计算，是缩小的故事模型，不是真实收益承诺。未成年人由家长陪同。',
  stock: '还剩', price: '今日价签', emptyStock: '今天卖完啦', transaction: '小账本动了一下',
  future: '还没走到的故事', locked: '前面的故事完成后开放', done: '完成啦',
  chapterNames: ['零花钱的第一站', '热闹的小小市场', '约定与存钱罐', '全家的贝壳岛假期'],
    chapterDescriptions: ['买东西、找零钱，攒下自己的小愿望。', '货架、天气、交换，让价签悄悄改变。', '记住承诺，让存款陪你准备全家的野餐。', '收拾行李、换贝币，带着家长一起管理旅行预算和回家的账单。'],
  travel: '出发吧', speak: '和这里的人聊聊', leave: '先逛逛小镇',
  locationHint: '小脚印指着今天的故事。也可以去别的地方看看。',
  continueHint: '这个小愿望实现了。出发，看看下一件有趣的事。',
};
const en: typeof zh = {
  title: 'Little Economy', subtitle: 'One little coin. A family adventure.', homeLink: 'Back to Transit Tales',
  cash: 'In my pocket', savings: 'At the bank', debt: 'To give back', worth: 'Really mine', yuan: 'yuan',
  wallet: 'My little money book', walletNote: 'Your pocket money, or the small travel budget a parent lets you manage. Not your whole family’s wealth.',
  map: 'Back to town', chapter: 'My storybook', close: 'Put away', visit: 'Visit',
  locations: { home: 'Our cosy home', shop: 'Orange Corner', school: 'Sunflower School', bank: 'Pinecone Bank', park: 'Riverside Park' },
  newGame: 'Start my story', resume: 'Keep playing', chooseFamily: 'Who will you be?',
  setupIntro: 'A little family errand is waiting for you today. Pick your character, then head outside!',
  boy: 'Milo · boy', girl: 'Mia · girl', children: 'How many children in your family?',
  familySize: ['Just me', 'Two of us', 'Three of us'],
  familyNote: 'Every family belongs here. Sharing snacks and chores really changes with the number of children.',
  age: 'years old', day: 'Day', dayEnd: '', goal: 'My little wish', progress: 'So far',
  next: 'Another little adventure', finale: 'Bringing our memories home!', finaleBody: 'Pocket money, promises, savings and a Shell Island bill: you cared for them all. The next adventure is waiting!',
  ending: 'Life story · complete', endingNote: 'A small fictional economic model, not guaranteed returns or real investment advice.',
  retry: 'Try this story again', retryTitle: 'Return to the start of this story?',
  retryBody: 'Money, items and days return to their starting point for this story. Earlier stories stay completed.',
  confirmRetry: 'Try again', cancel: 'Keep playing', reset: 'A new family story',
  resetTitle: 'Start a new story?', resetBody: 'This replaces the save in this browser. Your current family and progress will not be kept.',
  confirmReset: 'Choose a new family', saved: 'Story saved', unsaved: 'Saving is unavailable. Leaving or refreshing will lose this session’s progress.',
  saveNote: 'Saved automatically in this browser. No account and no uploads.',
  history: 'Where my money went', noHistory: 'A blank first page, ready for your story.',
  inventory: 'My little backpack', emptyBag: 'Light for now. New purchases will go here.',
  trust: 'Friends’ trust', trustNote: 'Remember the money, and the day you promised.',
  wardrobe: 'My growing wardrobe', outfit: ['Comfy everyday clothes', 'A new backpack and jacket', 'A special picnic outfit'],
  wardrobeNote: 'Finish a chapter to add a little colour. Having more money never makes someone better.',
  settings: 'Town settings', sound: 'Little sound effects', soundOn: 'On', soundOff: 'Off',
  soundNote: 'Original short notes, only when you make a choice.',
  help: 'How to play', helpBody: 'Visit the place with the little footprints and talk to someone. Choose something to do, then watch your pocket and the world change. You can always restart this story. No timer.',
  helpBank: 'Interest uses game days in a small story model, not a promise of real returns. A parent accompanies children to the bank.',
  stock: 'left', price: 'Today’s price tags', emptyStock: 'Sold out today', transaction: 'Your money book changed',
  future: 'Stories still ahead', locked: 'Finish the earlier stories to unlock', done: 'Done!',
  chapterNames: ['The first pocket-money journey', 'The little lively market', 'Promises and a savings jar', 'Our Shell Island holiday'],
    chapterDescriptions: ['Shop, count change and save for a little wish.', 'Shelves, weather and swaps make price tags move.', 'Keep promises and let savings help prepare a family picnic.', 'Pack, exchange shell coins and manage a travel budget and homecoming bill with a parent.'],
  travel: 'Let’s go', speak: 'Talk to someone here', leave: 'Explore the town first',
  locationHint: 'Little footprints point to today’s story. You can visit somewhere else, too.',
  continueHint: 'You made this little wish happen. Let’s see what comes next.',
};
export const copy = (lang: Lang): typeof zh => lang === 'zh' ? zh : lang === 'en' ? en : {...localeUI[lang],chapterNames:[0,6,12,18].map(i=>legacy.stories[i][lang].title),chapterDescriptions:[0,6,12,18].map(i=>legacy.stories[i][lang].body)};
export const text = (value: Text, lang: Lang): string => {
  const localized=value[lang];
  if(localized===undefined)throw new Error(`Missing written ${lang} text: ${value.en}`);
  return localized;
};
export const itemNames: Record<string, Text> = legacy.items;
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
export function money(cents: number, lang: Lang): string {
  return (cents / 100).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
}
