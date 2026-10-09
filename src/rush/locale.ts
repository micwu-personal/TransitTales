import { SCENARIOS, type Notice } from './model';

export type Language = 'en' | 'zh-CN';
export const LANGUAGE_KEY = 'transit-tales-language';
const en = {
  title: 'Transit Tales — Rush Hour Rescue', gameName: 'Rush Hour Rescue', tagline: 'Tiny city, big heart',
  language: 'Language', concepts: 'All eight ideas ↗', building: 'Building game ↗', network: 'Metro network',
  heading: 'Let’s get everyone home.', intro: 'Tap a station. Send a train. Make someone’s day.', city: 'LITTLE BAY', fictional: 'FICTIONAL CITY',
  delivered: 'home happy', waiting: 'waiting', aboard: 'on board', remaining: 'shift left',
  mapPan: 'Swipe the city sideways to explore every station.', mapName: 'Little Bay network: Coral and Blue lines', coral: 'Coral', blue: 'Blue', coralLegend: 'C · Coral', blueLegend: 'B · Blue',
  queueLegend: '● Queue · number = riders', river: 'Little Bay river', controls: 'Dispatch controls', scenario: 'Your next little adventure',
  start: '▶ Start shift', replayShift: '↻ Play this shift again', resume: '▶ Resume shift', pause: 'Ⅱ Pause shift', speed: 'Change game speed; current speed {speed}×',
  spareCount: '{count} spare trains available', spareTrains: 'Spare trains', helpers: '♟ Send platform helpers', helperCooldown: '♟ Helpers ready in {seconds}s',
  helperExplanation: 'Helpers board twice as fast for 22 seconds. Spare trains refill automatically.',
  helpTitle: 'How to be a brilliant dispatcher', help1: 'Press Start shift. Trains already run by themselves.',
  help2: 'Select the biggest crowd. Send a spare train on its line.', help3: 'Send helpers when a train is boarding a busy platform.',
  help4: 'At Central, hold a stopped train for 6 seconds to catch transfers.',
  helpKeys: 'Space pauses. 1 / 2 / 3 changes speed. No crashes, no game over—just try a better route next time.',
  footer: 'Original prototype · simplified operations, not a professional simulator · offline-friendly',
  saved: 'Best scores stay in this browser.', storageUnavailable: 'Storage is unavailable; this shift still works.',
  stationAccessible: '{station}, {count} people waiting. Select station', queueOne: '{count} person waiting', queueMany: '{count} people waiting',
  queueBusy: ' · Let’s help!', queueCalm: ' · Nice and manageable', queueEmpty: ' · A happy, quiet platform', refill: 'Next in {seconds}s',
  startFirst: 'Start your shift first', depotRefilling: 'Depot is refilling', boarding: 'Train already boarding here', toward: 'Toward {station} · {capacity} seats',
  dispatch: '▣ Send {line} train', connection: 'Catch a connection', hold: '⇄ Hold {line} doors +6s',
  holdCooldown: 'Connection hold ready in {seconds}s', held: 'Doors already held on this train',
  connectionWait: 'Wait for a train to stop here. Then keep its doors open a little longer.', mission: 'Mission:', missionTarget: '{target} people home', missionProgress: 'Mission progress',
  hintReady: 'Start your shift. {station} has a crowd ready to ride!', hintPaused: 'Paused. Take your time and make a plan.',
  hintFinished: 'Nice work! Explore another shift below.', hintRunning: 'Train numbers = riders aboard · {count} trains running',
  resultGreat: 'You made the city’s day!', resultGood: 'Every ride makes a difference.',
  resultStats: '{delivered} people home · {transfers} transfers made · {wait}s average platform wait', resultLeft: '{count} riders chose another way home.',
  resultChallenge: 'Try another shift—or chase that third star!', resultTip: 'Try sending spares to the biggest crowds a little earlier.',
  resultScore: 'Shift score:', resultBest: 'Personal best:', replay: '↻ Try again', next: 'Next adventure →',
  noticeDispatch: 'Spare train sent to {station}. Watch it board!', noticeHelpers: 'Platform helpers are here! Boarding is twice as fast for 22 seconds.',
  noticeHold: 'Doors staying open for 6 extra seconds. Arriving riders can catch this train!', noticeSpare: 'A spare train is ready in the depot.',
  noticeFinished: 'Shift complete. Thanks for looking after the city!',
} as const;
type Messages = { [K in keyof typeof en]: string };
const zh: Messages = {
  title: 'Transit Tales 旅途故事 — 地铁调度室', gameName: '地铁调度室', tagline: '小小城市，暖暖旅途',
  language: '语言', concepts: '探索八种创意 ↗', building: '积木建造游戏 ↗', network: '地铁线路图',
  heading: '一起送大家回家吧。', intro: '选个车站，派出列车，让旅途更美好。', city: '小湾市', fictional: '虚构城市',
  delivered: '人开心到家', waiting: '人候车', aboard: '人在车上', remaining: '班次剩余',
  mapPan: '左右滑动城市地图，查看所有车站。', mapName: '小湾市地铁线路图：珊瑚线与蓝线', coral: '珊瑚线', blue: '蓝线', coralLegend: 'C · 珊瑚线', blueLegend: 'B · 蓝线',
  queueLegend: '● 候车人数', river: '小湾河', controls: '调度控制台', scenario: '下一段小小冒险',
  start: '▶ 开始班次', replayShift: '↻ 再玩这个班次', resume: '▶ 继续班次', pause: 'Ⅱ 暂停班次', speed: '切换游戏速度；当前为 {speed} 倍速',
  spareCount: '可用备用列车 {count} 列', spareTrains: '备用列车', helpers: '♟ 派出站台助手', helperCooldown: '♟ 助手将在 {seconds} 秒后就绪',
  helperExplanation: '助手使上车速度加倍，持续 22 秒。备用列车会自动补充。',
  helpTitle: '怎样成为出色的调度员', help1: '点击“开始班次”。列车会自动运行。',
  help2: '选择人最多的车站，在相应线路派出备用列车。', help3: '繁忙站台有列车正在上客时，派出助手。',
  help4: '在中心站，让停靠列车多等 6 秒，接上换乘乘客。',
  helpKeys: '空格键暂停，1 / 2 / 3 键切换速度。没有撞车，也没有失败出局，下次试试更好的调度方案吧。',
  footer: '原创原型 · 简化运营，非专业模拟器 · 支持离线游玩',
  saved: '最高分保存在此浏览器中。', storageUnavailable: '浏览器存储不可用，但仍可游玩此班次。',
  stationAccessible: '{station}，{count} 人候车。选择此车站', queueOne: '{count} 人候车', queueMany: '{count} 人候车',
  queueBusy: ' · 一起帮帮忙！', queueCalm: ' · 人数刚刚好', queueEmpty: ' · 安静又舒心的站台', refill: '{seconds} 秒后补充',
  startFirst: '请先开始班次', depotRefilling: '车库正在补充列车', boarding: '此处已有列车正在上客', toward: '开往{station} · {capacity} 个座位',
  dispatch: '▣ 派出{line}列车', connection: '接上换乘乘客', hold: '⇄ {line}车门多开 6 秒',
  holdCooldown: '{seconds} 秒后可再次延长停靠', held: '此列车已延长停靠',
  connectionWait: '等列车停靠后，再让车门多开一会儿。', mission: '任务：', missionTarget: '送 {target} 人回家', missionProgress: '任务进度',
  hintReady: '开始班次吧，{station}已有一群乘客等着出发！', hintPaused: '已暂停。慢慢想，规划一下吧。',
  hintFinished: '做得真棒！在下方探索另一个班次吧。', hintRunning: '列车数字为车上人数 · {count} 列车运行中',
  resultGreat: '你让整座城市都开心了！', resultGood: '每一段旅程都有意义。',
  resultStats: '{delivered} 人到家 · 完成 {transfers} 次换乘 · 平均站台等待 {wait} 秒', resultLeft: '{count} 位乘客选择了其他方式回家。',
  resultChallenge: '试试其他班次，或挑战第三颗星吧！', resultTip: '下次试着更早向人多的车站派出备用列车。',
  resultScore: '本次得分：', resultBest: '个人最高分：', replay: '↻ 再试一次', next: '下一段冒险 →',
  noticeDispatch: '备用列车已派往{station}，看看乘客上车吧！', noticeHelpers: '站台助手来了！上车速度加倍，持续 22 秒。',
  noticeHold: '车门多开 6 秒，让刚到站的乘客赶上这班车！', noticeSpare: '车库中已有一列备用列车就绪。',
  noticeFinished: '班次完成。感谢你照顾这座城市！',
};
export const messages = { en, 'zh-CN': zh };
type Slots<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | Slots<Rest> : never;
export type StaticMessageKey = { [K in keyof Messages]: Slots<(typeof en)[K]> extends never ? K : never }[keyof Messages];
export type MessageArgs<K extends keyof Messages> = Slots<(typeof en)[K]> extends never ? [] : [Record<Slots<(typeof en)[K]>, string | number>];
export function text<K extends keyof Messages>(language: Language, key: K, ...args: MessageArgs<K>): string {
  const params = args[0] as Record<string, string | number> | undefined;
  return messages[language][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params![name]));
}
export const stationNames: Record<Language, Record<string, string>> = {
  en: { harbor: 'Harbor', market: 'Market', central: 'Central', museum: 'Museum', garden: 'Garden', north: 'North Park', library: 'Library', stadium: 'Stadium', riverside: 'Riverside', airport: 'Airport' },
  'zh-CN': { harbor: '港口站', market: '集市站', central: '中心站', museum: '博物馆站', garden: '花园站', north: '北公园站', library: '图书馆站', stadium: '体育场站', riverside: '河畔站', airport: '机场站' },
};
interface ScenarioCopy { name: string; subtitle: string; briefing: string; events: string[] }
export const scenarioCopy: Record<Language, Record<string, ScenarioCopy>> = {
  en: Object.fromEntries(SCENARIOS.map(s => [s.id, { name: s.name, subtitle: s.subtitle, briefing: s.briefing, events: s.events.map(e => e.message) }])),
  'zh-CN': {
    'first-shift': { name: '第一个班次', subtitle: '熟悉调度', briefing: '集市站很热闹！选中它，派出备用列车，在班次结束前送 220 人回家。', events: ['野餐结束啦！花园站又来了一群乘客。', '北公园站附近的学校放学了，派辆备用列车帮帮忙吧！'] },
    concert: { name: '盛大的安可', subtitle: '接走演唱会人潮', briefing: '演唱会快结束了。留意体育场站，趁队伍变长之前派出增援列车。', events: ['安可结束！50 位乐迷来到体育场站。', '又一波观众来了！一起送大家回家吧。', '中心站的晚间换乘乘客越来越多了。'] },
    connections: { name: '中心站见', subtitle: '两条线路，一座小城', briefing: '许多乘客需要换乘。向繁忙站台派出备用列车，并让中心站的列车多等一会儿，接上刚到站的乘客。', events: ['航班落地了，机场站的乘客需要搭乘两条线路。', '轮渡乘客来到港口站！留意他们的换乘。', '中心站迎来最后一波人潮。你一定行！'] },
  },
};
export function noticeText(language: Language, notice: Notice): string {
  switch (notice.kind) {
    case 'briefing': return scenarioCopy[language][notice.scenario].briefing;
    case 'event': return scenarioCopy[language][notice.scenario].events[notice.index];
    case 'dispatch': return text(language, 'noticeDispatch', { station: stationNames[language][notice.station] });
    case 'helpers': return text(language, 'noticeHelpers');
    case 'hold': return text(language, 'noticeHold');
    case 'spare': return text(language, 'noticeSpare');
    case 'finished': return text(language, 'noticeFinished');
  }
}
interface LanguageStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function preferredLanguage(storage: Pick<LanguageStorage, 'getItem'> | undefined, browserLanguages: readonly string[]): Language {
  try { const saved = storage?.getItem(LANGUAGE_KEY); if (saved === 'en' || saved === 'zh-CN') return saved; } catch { /* Storage may be blocked. */ }
  for (const language of browserLanguages) {
    if (/^zh(?:-|$)/i.test(language)) return 'zh-CN';
    if (/^en(?:-|$)/i.test(language)) return 'en';
  }
  return 'en';
}
export function createLanguageController(storage: LanguageStorage | undefined, browserLanguages: readonly string[], onChange: (language: Language) => void) {
  let current = preferredLanguage(storage, browserLanguages);
  return {
    get language() { return current; },
    setLanguage(language: Language) {
      if (language === current) return;
      current = language;
      try { storage?.setItem(LANGUAGE_KEY, language); } catch { /* Switching still works without persistence. */ }
      onChange(language);
    },
  };
}
