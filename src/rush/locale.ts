import { SCENARIOS, type Notice } from './model';

export type Language = 'en' | 'zh-CN' | 'ja' | 'mn-Cyrl-MN' | 'mn-Mong-CN';
export const LANGUAGE_KEY = 'transit-tales-language';
const languageLabels: Record<Language, string> = {
  en: 'English', 'zh-CN': '简体中文', ja: '日本語',
  'mn-Cyrl-MN': 'Монгол', 'mn-Mong-CN': 'ᠮᠣᠩᠭᠣᠯ',
};
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(languageLabels, value);
}
export function languageOptions(selected?: Language): string {
  return (Object.entries(languageLabels) as [Language, string][]).map(([language, label]) =>
    `<option value="${language}" lang="${language}"${selected === language ? ' selected' : ''}>${label}</option>`).join('');
}
const en = {
  title: 'Transit Tales — Rush Hour Rescue', gameName: 'Rush Hour Rescue', tagline: 'Tiny city, big heart',
  home: 'All journeys', language: 'Language', concepts: 'All eight ideas ↗', building: 'Building game ↗', network: 'Metro network',
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
  home: '旅程大厅', language: '语言', concepts: '探索八种创意 ↗', building: '积木建造游戏 ↗', network: '地铁线路图',
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
const ja: Messages = {
  "title": "Transit Tales — ラッシュアワー・レスキュー",
  "gameName": "ラッシュアワー・レスキュー",
  "tagline": "小さな街に、大きな思いやり",
  "home": "旅のロビー",
  "language": "言語",
  "concepts": "8つのアイデアを見る ↗",
  "building": "建設ゲーム ↗",
  "network": "地下鉄路線図",
  "heading": "みんなを家まで送り届けよう。",
  "intro": "駅を選んで、列車を出そう。誰かの一日をちょっと素敵に。",
  "city": "リトルベイ",
  "fictional": "架空の街",
  "delivered": "人が無事に到着",
  "waiting": "人が待っています",
  "aboard": "人が乗車中",
  "remaining": "残り時間",
  "mapPan": "地図を左右にスワイプして、すべての駅を見てみよう。",
  "mapName": "リトルベイ地下鉄路線図：コーラル線とブルー線",
  "coral": "コーラル線",
  "blue": "ブルー線",
  "coralLegend": "C · コーラル線",
  "blueLegend": "B · ブルー線",
  "queueLegend": "● 待ち人数 · 数字は乗客数",
  "river": "リトルベイ川",
  "controls": "運行コントロール",
  "scenario": "次の小さな冒険",
  "start": "▶ 運行スタート",
  "replayShift": "↻ この運行をもう一度",
  "resume": "▶ 運行を再開",
  "pause": "Ⅱ 運行を一時停止",
  "speed": "ゲーム速度を変更：現在 {speed} 倍速",
  "spareCount": "予備列車が {count} 本あります",
  "spareTrains": "予備列車",
  "helpers": "♟ ホームのスタッフを派遣",
  "helperCooldown": "♟ あと {seconds} 秒でスタッフが準備完了",
  "helperExplanation": "スタッフがいると22秒間、乗車速度が2倍に。予備列車は自動で補充されます。",
  "helpTitle": "すてきな運行係になるには",
  "help1": "「運行スタート」を押そう。列車は自動で走ります。",
  "help2": "いちばん人が多い駅を選んで、その路線に予備列車を出そう。",
  "help3": "混んだホームで列車が乗客を乗せているとき、スタッフを派遣しよう。",
  "help4": "中央駅では、停車中の列車を6秒長く待たせて、乗り換えの人を迎えよう。",
  "helpKeys": "スペースで一時停止。1 / 2 / 3 で速度変更。衝突もゲームオーバーもありません。次はもっとよい運行を試してみよう。",
  "footer": "オリジナル試作版 · 運行を簡略化したゲームで、専門シミュレーターではありません · オフラインでも遊べます",
  "saved": "最高スコアはこのブラウザーに保存されます。",
  "storageUnavailable": "保存機能は使えませんが、この運行は遊べます。",
  "stationAccessible": "{station}、{count} 人が待っています。駅を選択",
  "queueOne": "{count} 人が待っています",
  "queueMany": "{count} 人が待っています",
  "queueBusy": " · お手伝いしよう！",
  "queueCalm": " · ちょうどよい人数",
  "queueEmpty": " · 静かで心地よいホーム",
  "refill": "あと {seconds} 秒で補充",
  "startFirst": "まず運行を始めよう",
  "depotRefilling": "車庫で列車を補充中",
  "boarding": "ここでは列車が乗客を乗せています",
  "toward": "{station}行き · {capacity} 席",
  "dispatch": "▣ {line}の列車を派遣",
  "connection": "乗り換えをつなごう",
  "hold": "⇄ {line}のドアを6秒長く開ける",
  "holdCooldown": "あと {seconds} 秒で停車時間を延長できます",
  "held": "この列車はすでに停車時間を延長しています",
  "connectionWait": "列車が停まるまで待ってから、ドアを少し長く開けておこう。",
  "mission": "ミッション：",
  "missionTarget": "{target} 人を家まで送ろう",
  "missionProgress": "ミッションの進み具合",
  "hintReady": "運行を始めよう。{station}で乗客が出発を待っています！",
  "hintPaused": "一時停止中。ゆっくり作戦を考えよう。",
  "hintFinished": "よくできました！下で別の運行を試してみよう。",
  "hintRunning": "列車の数字は車内の人数 · {count} 本が運行中",
  "resultGreat": "街のみんなが笑顔になったよ！",
  "resultGood": "どの旅にも意味があるよ。",
  "resultStats": "{delivered} 人が到着 · 乗り換え {transfers} 回 · ホームの平均待ち時間 {wait} 秒",
  "resultLeft": "{count} 人は別の方法で帰りました。",
  "resultChallenge": "別の運行に挑戦する？それとも星3つを目指そう！",
  "resultTip": "次は、混んだ駅に少し早めに予備列車を出してみよう。",
  "resultScore": "今回のスコア：",
  "resultBest": "自己ベスト：",
  "replay": "↻ もう一度",
  "next": "次の冒険 →",
  "noticeDispatch": "予備列車が{station}へ出発しました。乗車の様子を見てみよう！",
  "noticeHelpers": "ホームのスタッフが到着！22秒間、乗車速度が2倍になります。",
  "noticeHold": "ドアを6秒長く開けています。到着した乗客もこの列車に乗れます！",
  "noticeSpare": "車庫で予備列車1本の準備ができました。",
  "noticeFinished": "運行完了。街のお世話をしてくれてありがとう！"
};
const mnCyrl: Messages = {
  "title": "Аяллын түүхүүд — Оргил цагийн тусламж",
  "gameName": "Оргил цагийн тусламж",
  "tagline": "Бяцхан хот, уужим сэтгэл",
  "home": "Бүх аялал",
  "language": "Хэл",
  "concepts": "Найман санааг үзэх ↗",
  "building": "Барилгын тоглоом ↗",
  "network": "Метроны сүлжээ",
  "heading": "Бүгдийг гэрт нь хүргэе.",
  "intro": "Өртөөг сонго. Галт тэрэг явуул. Хэн нэгний өдрийг сайхан болго.",
  "city": "БЯЦХАН БУЛАН",
  "fictional": "ЗОХИОМОЛ ХОТ",
  "delivered": "гэртээ баяртай хүрсэн",
  "waiting": "хүлээж буй",
  "aboard": "галт тэргэнд буй",
  "remaining": "ээлжийн үлдсэн хугацаа",
  "mapPan": "Бүх өртөөг харахын тулд газрын зургийг хажуу тийш гулсуул.",
  "mapName": "Бяцхан Булангийн сүлжээ: Шүрэн ба Хөх шугам",
  "coral": "Шүрэн",
  "blue": "Хөх",
  "coralLegend": "C · Шүрэн",
  "blueLegend": "B · Хөх",
  "queueLegend": "● Дараалал · тоо нь зорчигчдын тоо",
  "river": "Бяцхан Булан гол",
  "controls": "Хөдөлгөөн зохицуулах удирдлага",
  "scenario": "Дараагийн бяцхан адал явдал",
  "start": "▶ Ээлж эхлүүлэх",
  "replayShift": "↻ Энэ ээлжийг дахин тоглох",
  "resume": "▶ Ээлж үргэлжлүүлэх",
  "pause": "Ⅱ Ээлж түр зогсоох",
  "speed": "Тоглоомын хурдыг өөрчлөх; одоогийн хурд {speed}×",
  "spareCount": "{count} нөөц галт тэрэг бэлэн",
  "spareTrains": "Нөөц галт тэрэг",
  "helpers": "♟ Тавцангийн туслагчид явуулах",
  "helperCooldown": "♟ Туслагчид {seconds} секундын дараа бэлэн",
  "helperExplanation": "Туслагчид 22 секундын турш суулгах хурдыг хоёр дахин нэмнэ. Нөөц галт тэрэг автоматаар нөхөгдөнө.",
  "helpTitle": "Чадварлаг зохицуулагч болох нь",
  "help1": "«Ээлж эхлүүлэх»-ийг дар. Галт тэрэг өөрөө явна.",
  "help2": "Хамгийн олон хүнтэй өртөөг сонго. Тэр шугамд нөөц галт тэрэг явуул.",
  "help3": "Хөл ихтэй тавцанд галт тэрэг хүн суулгаж байхад туслагчид явуул.",
  "help4": "Төв өртөөнд зогссон галт тэргийг 6 секунд хүлээлгэж, дамжин суух хүмүүсийг амжуул.",
  "helpKeys": "Зай товчоор түр зогсооно. 1 / 2 / 3 хурдыг өөрчилнө. Мөргөлдөхгүй, хасагдахгүй — дараа илүү сайн маршрут туршаарай.",
  "footer": "Анхны загвар · хялбаршуулсан ажиллагаа, мэргэжлийн симулятор биш · сүлжээгүй тоглож болно",
  "saved": "Шилдэг оноо энэ хөтөчид хадгалагдана.",
  "storageUnavailable": "Хадгалах боломжгүй ч энэ ээлжийг тоглож болно.",
  "stationAccessible": "{station}, {count} хүн хүлээж байна. Өртөө сонгох",
  "queueOne": "{count} хүн хүлээж байна",
  "queueMany": "{count} хүн хүлээж байна",
  "queueBusy": " · Тусалцгаая!",
  "queueCalm": " · Зохицуулахад амархан",
  "queueEmpty": " · Тав тухтай, тайван тавцан",
  "refill": "{seconds} секундын дараа нөхөгдөнө",
  "startFirst": "Эхлээд ээлжээ эхлүүл",
  "depotRefilling": "Депод галт тэрэг нөхөж байна",
  "boarding": "Энд галт тэрэг хүн суулгаж байна",
  "toward": "{station} руу · {capacity} суудал",
  "dispatch": "▣ {line} шугамын галт тэрэг явуулах",
  "connection": "Дамжин суухыг амжуулах",
  "hold": "⇄ {line} шугамын хаалгыг +6 секунд нээлттэй байлгах",
  "holdCooldown": "{seconds} секундын дараа дахин хүлээлгэж болно",
  "held": "Энэ галт тэргийг аль хэдийн хүлээлгэсэн",
  "connectionWait": "Галт тэрэг энд зогсохыг хүлээ. Дараа нь хаалгыг арай удаан нээлттэй байлга.",
  "mission": "Даалгавар:",
  "missionTarget": "{target} хүнийг гэрт нь хүргэх",
  "missionProgress": "Даалгаврын явц",
  "hintReady": "Ээлжээ эхлүүл. {station} өртөөнд олон хүн хүлээж байна!",
  "hintPaused": "Түр зогссон. Яаралгүй төлөвлөөрэй.",
  "hintFinished": "Сайн ажиллалаа! Доороос өөр ээлж сонгоорой.",
  "hintRunning": "Галт тэрэг дээрх тоо нь зорчигчдын тоо · {count} галт тэрэг явж байна",
  "resultGreat": "Чи хотынхны өдрийг сайхан болголоо!",
  "resultGood": "Аялал бүр үнэ цэнтэй.",
  "resultStats": "{delivered} хүн гэртээ хүрсэн · {transfers} удаа дамжин суусан · тавцанд дунджаар {wait} секунд хүлээсэн",
  "resultLeft": "{count} зорчигч гэртээ харих өөр арга сонгосон.",
  "resultChallenge": "Өөр ээлж турших уу, эсвэл гурав дахь одоо авах уу?",
  "resultTip": "Дараа нь хамгийн олон хүнтэй өртөөнд нөөц галт тэргийг арай эрт явуулаарай.",
  "resultScore": "Ээлжийн оноо:",
  "resultBest": "Хувийн дээд амжилт:",
  "replay": "↻ Дахин оролдох",
  "next": "Дараагийн адал явдал →",
  "noticeDispatch": "Нөөц галт тэргийг {station} өртөө рүү явууллаа. Хүмүүс суухыг хараарай!",
  "noticeHelpers": "Тавцангийн туслагчид ирлээ! 22 секундын турш суулгах хурд хоёр дахин нэмэгдэнэ.",
  "noticeHold": "Хаалга 6 секунд илүү нээлттэй байна. Шинээр ирсэн хүмүүс амжиж сууна!",
  "noticeSpare": "Депод нэг нөөц галт тэрэг бэлэн боллоо.",
  "noticeFinished": "Ээлж дууслаа. Хотынхонд санаа тавьсанд баярлалаа!"
};
const mnMong: Messages = {
  "title": "ᠠᠶᠠᠯᠠᠯ ᠤᠨ ᠲᠡᠦᠬᠡ — ᠢᠳᠡ ᠠᠴᠢᠶᠠᠯᠠᠯ ᠤᠨ ᠲᠤᠰᠠᠯᠠᠮᠵᠢ",
  "gameName": "ᠢᠳᠡ ᠠᠴᠢᠶᠠᠯᠠᠯ ᠤᠨ ᠲᠤᠰᠠᠯᠠᠮᠵᠢ",
  "tagline": "ᠪᠢᠴᠢᠬᠠᠨ ᠬᠣᠲᠠ᠂ ᠠᠭᠤᠳᠠᠮ ᠰᠡᠳᠬᠢᠯ",
  "home": "ᠪᠦᠬᠦ ᠠᠶᠠᠯᠠᠯ",
  "language": "ᠬᠡᠯᠡ",
  "concepts": "ᠨᠠᠢᠮᠠᠨ ᠰᠠᠨᠠᠭ᠎ᠠ ᠶᠢ ᠦᠵᠡᠬᠦ ↗",
  "building": "ᠪᠠᠷᠢᠯᠭ᠎ᠠ ᠶᠢᠨ ᠲᠣᠭᠯᠠᠭᠠᠮ ↗",
  "network": "ᠮᠧᠲ᠋ᠷᠣ ᠶᠢᠨ ᠰᠦᠯᠵᠢᠶ᠎ᠡ",
  "heading": "ᠪᠦᠭᠦᠳᠡ ᠶᠢ ᠭᠡᠷ ᠲᠦ ᠨᠢ ᠬᠦᠷᠭᠡᠶ᠎ᠡ᠃",
  "intro": "ᠥᠷᠲᠡᠭᠡ ᠶᠢ ᠰᠣᠩᠭᠣ᠃ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠭᠤᠯ᠃ ᠬᠡᠨ ᠨᠢᠭᠡᠨ ᠦ ᠥᠳᠥᠷ ᠢ ᠰᠠᠢᠬᠠᠨ ᠪᠣᠯᠭᠠ᠃",
  "city": "ᠪᠢᠴᠢᠬᠠᠨ ᠪᠤᠯᠤᠩ",
  "fictional": "ᠵᠣᠬᠢᠶᠠᠮᠠᠯ ᠬᠣᠲᠠ",
  "delivered": "ᠭᠡᠷ ᠲᠡᠭᠡᠨ ᠪᠠᠶᠠᠷᠲᠠᠢ ᠬᠦᠷᠦᠭᠰᠡᠨ",
  "waiting": "ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠤᠢ",
  "aboard": "ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡᠨ ᠳᠦ ᠪᠤᠢ",
  "remaining": "ᠡᠭᠡᠯᠵᠢ ᠶᠢᠨ ᠦᠯᠡᠳᠡᠭᠰᠡᠨ ᠴᠠᠭ",
  "mapPan": "ᠪᠦᠬᠦ ᠥᠷᠲᠡᠭᠡ ᠶᠢ ᠬᠠᠷᠠᠬᠤ ᠶᠢᠨ ᠲᠤᠯᠠ ᠭᠠᠵᠠᠷ ᠤᠨ ᠵᠢᠷᠤᠭ ᠢ ᠬᠠᠵᠠᠭᠤ ᠲᠡᠢᠰᠢ ᠭᠤᠯᠰᠤᠭᠤᠯ᠃",
  "mapName": "ᠪᠢᠴᠢᠬᠠᠨ ᠪᠤᠯᠤᠩ ᠤᠨ ᠰᠦᠯᠵᠢᠶ᠎ᠡ᠄ ᠰᠢᠷᠦ ᠪᠠ ᠬᠥᠬᠡ ᠱᠤᠭᠤᠮ",
  "coral": "ᠰᠢᠷᠦ",
  "blue": "ᠬᠥᠬᠡ",
  "coralLegend": "C · ᠰᠢᠷᠦ",
  "blueLegend": "B · ᠬᠥᠬᠡ",
  "queueLegend": "● ᠳᠠᠷᠠᠭᠠᠯᠠᠯ · ᠲᠣᠭ᠎ᠠ ᠨᠢ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠤᠨ ᠲᠣᠭ᠎ᠠ",
  "river": "ᠪᠢᠴᠢᠬᠠᠨ ᠪᠤᠯᠤᠩ ᠭᠣᠣᠯ",
  "controls": "ᠬᠥᠳᠡᠯᠭᠡᠭᠡᠨ ᠵᠣᠬᠢᠴᠠᠭᠤᠯᠬᠤ ᠵᠠᠯᠠᠭᠤᠷ",
  "scenario": "ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠪᠢᠴᠢᠬᠠᠨ ᠠᠳᠠᠯ ᠶᠠᠪᠤᠳᠠᠯ",
  "start": "▶ ᠡᠭᠡᠯᠵᠢ ᠡᠬᠢᠯᠡᠭᠦᠯᠬᠦ",
  "replayShift": "↻ ᠡᠨᠡ ᠡᠭᠡᠯᠵᠢ ᠶᠢ ᠳᠠᠬᠢᠨ ᠲᠣᠭᠯᠠᠬᠤ",
  "resume": "▶ ᠡᠭᠡᠯᠵᠢ ᠦᠷᠭᠦᠯᠵᠢᠯᠡᠭᠦᠯᠬᠦ",
  "pause": "Ⅱ ᠡᠭᠡᠯᠵᠢ ᠲᠦᠷ ᠵᠣᠭᠰᠣᠭᠠᠬᠤ",
  "speed": "ᠲᠣᠭᠯᠠᠭᠠᠮ ᠤᠨ ᠬᠤᠷᠳᠤ ᠶᠢ ᠥᠥᠷᠴᠢᠯᠡᠬᠦ᠄ ᠣᠳᠣᠬᠠᠨ ᠤ ᠬᠤᠷᠳᠤ {speed}×",
  "spareCount": "{count} ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠪᠡᠯᠡᠨ",
  "spareTrains": "ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ",
  "helpers": "♟ ᠲᠠᠪᠴᠠᠩ ᠤᠨ ᠲᠤᠰᠠᠯᠠᠭᠴᠢᠳ ᠶᠠᠪᠤᠭᠤᠯᠬᠤ",
  "helperCooldown": "♟ ᠲᠤᠰᠠᠯᠠᠭᠴᠢᠳ {seconds} ᠰᠧᠺᠦ᠋ᠨᠳ ᠦᠨ ᠳᠠᠷᠠᠭ᠎ᠠ ᠪᠡᠯᠡᠨ",
  "helperExplanation": "ᠲᠤᠰᠠᠯᠠᠭᠴᠢᠳ 22 ᠰᠧᠺᠦ᠋ᠨᠳ ᠦᠨ ᠲᠤᠷᠰᠢ ᠰᠠᠭᠤᠯᠭᠠᠬᠤ ᠬᠤᠷᠳᠤ ᠶᠢ ᠬᠣᠶᠠᠷ ᠳᠠᠬᠢᠨ ᠨᠡᠮᠡᠨ᠎ᠡ᠃ ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠠᠦ᠋ᠲ᠋ᠣᠮᠠᠲ ᠢᠶᠠᠷ ᠨᠥᠬᠥᠭᠳᠡᠨ᠎ᠡ᠃",
  "helpTitle": "ᠴᠢᠳᠠᠪᠤᠷᠢᠯᠢᠭ ᠵᠣᠬᠢᠴᠠᠭᠤᠯᠤᠭᠴᠢ ᠪᠣᠯᠬᠤ ᠨᠢ",
  "help1": "«ᠡᠭᠡᠯᠵᠢ ᠡᠬᠢᠯᠡᠭᠦᠯᠬᠦ» ᠶᠢ ᠳᠠᠷᠤ᠃ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠥᠪᠡᠷ ᠢᠶᠡᠨ ᠶᠠᠪᠤᠨ᠎ᠠ᠃",
  "help2": "ᠬᠠᠮᠤᠭ ᠤᠨ ᠣᠯᠠᠨ ᠬᠦᠮᠦᠨ ᠲᠡᠢ ᠥᠷᠲᠡᠭᠡ ᠶᠢ ᠰᠣᠩᠭᠣ᠃ ᠲᠡᠷᠡ ᠱᠤᠭᠤᠮ ᠳᠤ ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠭᠤᠯ᠃",
  "help3": "ᠬᠥᠯ ᠶᠡᠬᠡ ᠲᠡᠢ ᠲᠠᠪᠴᠠᠩ ᠳᠤ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠬᠦᠮᠦᠨ ᠰᠠᠭᠤᠯᠭᠠᠵᠤ ᠪᠠᠢᠬᠤ ᠳᠤ ᠲᠤᠰᠠᠯᠠᠭᠴᠢᠳ ᠶᠠᠪᠤᠭᠤᠯ᠃",
  "help4": "ᠲᠥᠪ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠵᠣᠭᠰᠣᠭᠰᠠᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠢ 6 ᠰᠧᠺᠦ᠋ᠨᠳ ᠬᠦᠯᠢᠶᠡᠯᠭᠡᠵᠦ᠂ ᠳᠠᠮᠵᠢᠨ ᠰᠠᠭᠤᠬᠤ ᠬᠦᠮᠦᠰ ᠢ ᠠᠮᠵᠢᠭᠤᠯ᠃",
  "helpKeys": "ᠵᠠᠢ ᠲᠣᠪᠴᠢ ᠪᠠᠷ ᠲᠦᠷ ᠵᠣᠭᠰᠣᠭᠠᠨ᠎ᠠ᠃ 1 / 2 / 3 ᠬᠤᠷᠳᠤ ᠶᠢ ᠥᠥᠷᠴᠢᠯᠡᠨ᠎ᠡ᠃ ᠮᠥᠷᠭᠥᠯᠳᠥᠬᠦᠭᠦᠢ᠂ ᠬᠠᠰᠠᠭᠳᠠᠬᠤᠭᠦᠢ — ᠳᠠᠷᠠᠭ᠎ᠠ ᠢᠯᠡᠭᠦᠦ ᠰᠠᠢᠨ ᠵᠠᠮ ᠲᠤᠷᠰᠢᠭᠠᠷᠠᠢ᠃",
  "footer": "ᠠᠩᠬᠠᠨ ᠤ ᠵᠠᠭᠪᠤᠷ · ᠬᠢᠯᠪᠠᠷᠴᠢᠯᠠᠭᠰᠠᠨ ᠠᠵᠢᠯᠯᠠᠭᠠᠨ᠂ ᠮᠡᠷᠭᠡᠵᠢᠯ ᠦᠨ ᠵᠠᠭᠪᠤᠷᠴᠢᠯᠠᠭᠤᠷ ᠪᠢᠰᠢ · ᠰᠦᠯᠵᠢᠶ᠎ᠡ ᠦᠭᠡᠢ ᠲᠣᠭᠯᠠᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ",
  "saved": "ᠰᠢᠯᠢᠳᠡᠭ ᠣᠨᠣᠭ᠎ᠠ ᠡᠨᠡ ᠬᠥᠲᠥᠴᠢ ᠳᠦ ᠬᠠᠳᠠᠭᠠᠯᠠᠭᠳᠠᠨ᠎ᠠ᠃",
  "storageUnavailable": "ᠬᠠᠳᠠᠭᠠᠯᠠᠬᠤ ᠪᠣᠯᠣᠮᠵᠢ ᠦᠭᠡᠢ ᠴᠦ ᠡᠨᠡ ᠡᠭᠡᠯᠵᠢ ᠶᠢ ᠲᠣᠭᠯᠠᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃",
  "stationAccessible": "{station}᠂ {count} ᠬᠦᠮᠦᠨ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠥᠷᠲᠡᠭᠡ ᠰᠣᠩᠭᠣᠬᠤ",
  "queueOne": "{count} ᠬᠦᠮᠦᠨ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ",
  "queueMany": "{count} ᠬᠦᠮᠦᠨ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ",
  "queueBusy": " · ᠲᠤᠰᠠᠯᠠᠴᠠᠭᠠᠶ᠎ᠠ！",
  "queueCalm": " · ᠵᠣᠬᠢᠴᠠᠭᠤᠯᠬᠤ ᠳᠤ ᠠᠮᠠᠷᠬᠠᠨ",
  "queueEmpty": " · ᠲᠠᠪ ᠲᠤᠬᠲᠠᠢ᠂ ᠲᠠᠢᠪᠤᠩ ᠲᠠᠪᠴᠠᠩ",
  "refill": "{seconds} ᠰᠧᠺᠦ᠋ᠨᠳ ᠦᠨ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠥᠬᠥᠭᠳᠡᠨ᠎ᠡ",
  "startFirst": "ᠡᠬᠢᠯᠡᠭᠡᠳ ᠡᠭᠡᠯᠵᠢ ᠪᠡᠨ ᠡᠬᠢᠯᠡᠭᠦᠯ",
  "depotRefilling": "ᠳᠧᠫᠣ ᠳᠤ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠨᠥᠬᠥᠵᠦ ᠪᠠᠢᠨ᠎ᠠ",
  "boarding": "ᠡᠨᠳᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠬᠦᠮᠦᠨ ᠰᠠᠭᠤᠯᠭᠠᠵᠤ ᠪᠠᠢᠨ᠎ᠠ",
  "toward": "{station} ᠵᠦᠭ · {capacity} ᠰᠠᠭᠤᠳᠠᠯ",
  "dispatch": "▣ {line} ᠱᠤᠭᠤᠮ ᠤᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠭᠤᠯᠬᠤ",
  "connection": "ᠳᠠᠮᠵᠢᠨ ᠰᠠᠭᠤᠬᠤ ᠶᠢ ᠠᠮᠵᠢᠭᠤᠯᠬᠤ",
  "hold": "⇄ {line} ᠱᠤᠭᠤᠮ ᠤᠨ ᠬᠠᠭᠠᠯᠭ᠎ᠠ ᠶᠢ +6 ᠰᠧᠺᠦ᠋ᠨᠳ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠪᠠᠢᠯᠭᠠᠬᠤ",
  "holdCooldown": "{seconds} ᠰᠧᠺᠦ᠋ᠨᠳ ᠦᠨ ᠳᠠᠷᠠᠭ᠎ᠠ ᠳᠠᠬᠢᠨ ᠬᠦᠯᠢᠶᠡᠯᠭᠡᠵᠦ ᠪᠣᠯᠣᠨ᠎ᠠ",
  "held": "ᠡᠨᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠢ ᠠᠯᠢ ᠬᠡᠳᠦᠢᠨ ᠬᠦᠯᠢᠶᠡᠯᠭᠡᠭᠰᠡᠨ",
  "connectionWait": "ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠡᠨᠳᠡ ᠵᠣᠭᠰᠣᠬᠤ ᠶᠢ ᠬᠦᠯᠢᠶᠡ᠃ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠬᠠᠭᠠᠯᠭ᠎ᠠ ᠶᠢ ᠠᠷᠠᠢ ᠤᠳᠠᠭᠠᠨ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠪᠠᠢᠯᠭᠠ᠃",
  "mission": "ᠳᠠᠭᠠᠯᠭᠠᠪᠤᠷᠢ᠄",
  "missionTarget": "{target} ᠬᠦᠮᠦᠨ ᠢ ᠭᠡᠷ ᠲᠦ ᠨᠢ ᠬᠦᠷᠭᠡᠬᠦ",
  "missionProgress": "ᠳᠠᠭᠠᠯᠭᠠᠪᠤᠷᠢ ᠶᠢᠨ ᠶᠠᠪᠤᠴᠠ",
  "hintReady": "ᠡᠭᠡᠯᠵᠢ ᠪᠡᠨ ᠡᠬᠢᠯᠡᠭᠦᠯ᠃ {station} ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠣᠯᠠᠨ ᠬᠦᠮᠦᠨ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ！",
  "hintPaused": "ᠲᠦᠷ ᠵᠣᠭᠰᠣᠭᠰᠠᠨ᠃ ᠶᠠᠭᠠᠷᠠᠯ ᠦᠭᠡᠢ ᠲᠥᠯᠥᠪᠯᠡᠭᠡᠷᠡᠢ᠃",
  "hintFinished": "ᠰᠠᠢᠨ ᠠᠵᠢᠯᠯᠠᠯ᠎ᠠ！ ᠳᠣᠣᠷ᠎ᠠ ᠠᠴᠠ ᠥᠭᠡᠷ᠎ᠡ ᠡᠭᠡᠯᠵᠢ ᠰᠣᠩᠭᠣᠭᠠᠷᠠᠢ᠃",
  "hintRunning": "ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠳᠡᠭᠡᠷᠡᠬᠢ ᠲᠣᠭ᠎ᠠ ᠨᠢ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠤᠨ ᠲᠣᠭ᠎ᠠ · {count} ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠵᠤ ᠪᠠᠢᠨ᠎ᠠ",
  "resultGreat": "ᠴᠢ ᠬᠣᠲᠠ ᠶᠢᠨᠬᠠᠨ ᠤ ᠥᠳᠥᠷ ᠢ ᠰᠠᠢᠬᠠᠨ ᠪᠣᠯᠭᠠᠯ᠎ᠠ！",
  "resultGood": "ᠠᠶᠠᠯᠠᠯ ᠪᠦᠷᠢ ᠦᠨ᠎ᠡ ᠴᠡᠨ ᠲᠡᠢ᠃",
  "resultStats": "{delivered} ᠬᠦᠮᠦᠨ ᠭᠡᠷ ᠲᠡᠭᠡᠨ ᠬᠦᠷᠦᠭᠰᠡᠨ · {transfers} ᠤᠳᠠᠭ᠎ᠠ ᠳᠠᠮᠵᠢᠨ ᠰᠠᠭᠤᠭᠰᠠᠨ · ᠲᠠᠪᠴᠠᠩ ᠳᠤ ᠳᠤᠮᠳᠠᠵᠢ ᠪᠠᠷ {wait} ᠰᠧᠺᠦ᠋ᠨᠳ ᠬᠦᠯᠢᠶᠡᠭᠰᠡᠨ",
  "resultLeft": "{count} ᠵᠣᠷᠴᠢᠭᠴᠢ ᠭᠡᠷ ᠲᠡᠭᠡᠨ ᠬᠠᠷᠢᠬᠤ ᠥᠭᠡᠷ᠎ᠡ ᠠᠷᠭ᠎ᠠ ᠰᠣᠩᠭᠣᠭᠰᠠᠨ᠃",
  "resultChallenge": "ᠥᠭᠡᠷ᠎ᠡ ᠡᠭᠡᠯᠵᠢ ᠲᠤᠷᠰᠢᠬᠤ ᠤᠤ᠂ ᠡᠰᠡᠪᠡᠯ ᠭᠤᠷᠪᠠᠳᠠᠬᠢ ᠣᠳᠣ ᠪᠠᠨ ᠠᠪᠬᠤ ᠤᠤ？",
  "resultTip": "ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠬᠠᠮᠤᠭ ᠤᠨ ᠣᠯᠠᠨ ᠬᠦᠮᠦᠨ ᠲᠡᠢ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠢ ᠠᠷᠠᠢ ᠡᠷᠲᠡ ᠶᠠᠪᠤᠭᠤᠯᠤᠭᠠᠷᠠᠢ᠃",
  "resultScore": "ᠡᠭᠡᠯᠵᠢ ᠶᠢᠨ ᠣᠨᠣᠭ᠎ᠠ᠄",
  "resultBest": "ᠬᠤᠪᠢ ᠶᠢᠨ ᠳᠡᠭᠡᠳᠦ ᠠᠮᠵᠢᠯᠲᠠ᠄",
  "replay": "↻ ᠳᠠᠬᠢᠨ ᠣᠷᠣᠯᠳᠣᠬᠤ",
  "next": "ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠠᠳᠠᠯ ᠶᠠᠪᠤᠳᠠᠯ →",
  "noticeDispatch": "ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠢ {station} ᠥᠷᠲᠡᠭᠡ ᠵᠦᠭ ᠶᠠᠪᠤᠭᠤᠯᠯ᠎ᠠ᠃ ᠬᠦᠮᠦᠰ ᠰᠠᠭᠤᠬᠤ ᠶᠢ ᠬᠠᠷᠠᠭᠠᠷᠠᠢ！",
  "noticeHelpers": "ᠲᠠᠪᠴᠠᠩ ᠤᠨ ᠲᠤᠰᠠᠯᠠᠭᠴᠢᠳ ᠢᠷᠡᠯ᠎ᠡ！ 22 ᠰᠧᠺᠦ᠋ᠨᠳ ᠦᠨ ᠲᠤᠷᠰᠢ ᠰᠠᠭᠤᠯᠭᠠᠬᠤ ᠬᠤᠷᠳᠤ ᠬᠣᠶᠠᠷ ᠳᠠᠬᠢᠨ ᠨᠡᠮᠡᠭᠳᠡᠨ᠎ᠡ᠃",
  "noticeHold": "ᠬᠠᠭᠠᠯᠭ᠎ᠠ 6 ᠰᠧᠺᠦ᠋ᠨᠳ ᠢᠯᠡᠭᠦᠦ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠰᠢᠨ᠎ᠡ ᠪᠡᠷ ᠢᠷᠡᠭᠰᠡᠨ ᠬᠦᠮᠦᠰ ᠠᠮᠵᠢᠵᠤ ᠰᠠᠭᠤᠨ᠎ᠠ！",
  "noticeSpare": "ᠳᠧᠫᠣ ᠳᠤ ᠨᠢᠭᠡ ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠪᠡᠯᠡᠨ ᠪᠣᠯᠯ᠎ᠠ᠃",
  "noticeFinished": "ᠡᠭᠡᠯᠵᠢ ᠳᠠᠭᠤᠰᠯ᠎ᠠ᠃ ᠬᠣᠲᠠ ᠶᠢᠨᠬᠠᠨ ᠳᠤ ᠰᠠᠨᠠᠭ᠎ᠠ ᠲᠠᠪᠢᠭᠰᠠᠨ ᠳᠤ ᠪᠠᠶᠠᠷᠯᠠᠯ᠎ᠠ！"
};
export const messages = { en, 'zh-CN': zh, ja, 'mn-Cyrl-MN': mnCyrl, 'mn-Mong-CN': mnMong };
type Slots<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | Slots<Rest> : never;
export type StaticMessageKey = { [K in keyof Messages]: Slots<(typeof en)[K]> extends never ? K : never }[keyof Messages];
export type MessageArgs<K extends keyof Messages> = Slots<(typeof en)[K]> extends never ? [] : [Record<Slots<(typeof en)[K]>, string | number>];
export function text<K extends keyof Messages>(language: Language, key: K, ...args: MessageArgs<K>): string {
  const params = args[0] as Record<string, string | number> | undefined;
  return messages[language][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params![name]));
}
export const stationNames: Record<Language, Record<string, string>> = {
  "mn-Cyrl-MN": {"harbor": "Боомт", "market": "Зах", "central": "Төв", "museum": "Музей", "garden": "Цэцэрлэг", "north": "Хойд цэцэрлэгт хүрээлэн", "library": "Номын сан", "stadium": "Цэнгэлдэх хүрээлэн", "riverside": "Голын эрэг", "airport": "Нисэх буудал"},
  "mn-Mong-CN": {"harbor": "ᠪᠣᠭᠣᠮᠲᠠ", "market": "ᠵᠠᠬ᠎ᠠ", "central": "ᠲᠥᠪ", "museum": "ᠮᠦᠽᠧᠢ", "garden": "ᠴᠡᠴᠡᠷᠯᠢᠭ", "north": "ᠬᠣᠢᠲᠤ ᠴᠡᠴᠡᠷᠯᠢᠭᠲᠦ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ", "library": "ᠨᠣᠮ ᠤᠨ ᠰᠠᠩ", "stadium": "ᠴᠡᠩᠭᠡᠯᠳᠡᠬᠦ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ", "riverside": "ᠭᠣᠣᠯ ᠤᠨ ᠡᠷᠭᠢ", "airport": "ᠨᠢᠰᠬᠡᠬᠦ ᠪᠤᠭᠤᠳᠠᠯ"},
  ja: { harbor: '港駅', market: '市場駅', central: '中央駅', museum: '博物館駅', garden: '庭園駅', north: '北公園駅', library: '図書館駅', stadium: 'スタジアム駅', riverside: '川辺駅', airport: '空港駅' },
  en: { harbor: 'Harbor', market: 'Market', central: 'Central', museum: 'Museum', garden: 'Garden', north: 'North Park', library: 'Library', stadium: 'Stadium', riverside: 'Riverside', airport: 'Airport' },
  'zh-CN': { harbor: '港口站', market: '集市站', central: '中心站', museum: '博物馆站', garden: '花园站', north: '北公园站', library: '图书馆站', stadium: '体育场站', riverside: '河畔站', airport: '机场站' },
};
interface ScenarioCopy { name: string; subtitle: string; briefing: string; events: string[] }
export const scenarioCopy: Record<Language, Record<string, ScenarioCopy>> = {
  "mn-Cyrl-MN": {
  "first-shift": {
    "name": "Анхны ээлж",
    "subtitle": "Зохицуулагч болж үзье",
    "briefing": "Зах өртөө хөл ихтэй байна! Өртөөг сонгож нөөц галт тэрэг явуулаад ээлж дуусахаас өмнө 220 хүнийг гэрт нь хүргэ.",
    "events": [
      "Зугаалга дууслаа! Цэцэрлэг өртөөнд шинэ зорчигчид ирлээ.",
      "Хойд цэцэрлэгт хүрээлэнгийн ойролцоох сургууль тарлаа. Нөөц галт тэрэг явуулж туслаарай!"
    ]
  },
  "concert": {
    "name": "Дахиад нэг дуу",
    "subtitle": "Тоглолтын дараах олныг хүргэх",
    "briefing": "Тоглолт удахгүй дуусна. Цэнгэлдэх хүрээлэн өртөөг ажиглаж, дараалал уртсахаас өмнө нэмэлт галт тэрэг явуул.",
    "events": [
      "Сүүлийн дуу дууслаа! 50 шүтэн бишрэгч Цэнгэлдэх хүрээлэн өртөөнд ирлээ.",
      "Дараагийн үзэгчид ирлээ! Бүгдийг гэрт нь хүргэе.",
      "Төв өртөөнд оройн дамжин суух зорчигчид нэмэгдэж байна."
    ]
  },
  "connections": {
    "name": "Төвд уулзъя",
    "subtitle": "Хоёр шугам, нэг хот",
    "briefing": "Олон зорчигч дамжин сууна. Хөл ихтэй тавцанд нөөц галт тэрэг явуулж, Төв өртөөнд галт тэргийг арай удаан хүлээлгэн шинээр ирсэн хүмүүсийг амжуул.",
    "events": [
      "Онгоц газардлаа. Нисэх буудлын зорчигчид хоёр шугамаар явна.",
      "Гатлага онгоцны зорчигчид Боомт өртөөнд ирлээ! Дамжин суухыг нь ажиглаарай.",
      "Төв өртөөнд сүүлчийн олон хүн ирлээ. Чи чадна!"
    ]
  }
},
  "mn-Mong-CN": {
  "first-shift": {
    "name": "ᠠᠩᠬᠠᠨ ᠤ ᠡᠭᠡᠯᠵᠢ",
    "subtitle": "ᠵᠣᠬᠢᠴᠠᠭᠤᠯᠤᠭᠴᠢ ᠪᠣᠯᠵᠤ ᠦᠵᠡᠶ᠎ᠡ",
    "briefing": "ᠵᠠᠬ᠎ᠠ ᠥᠷᠲᠡᠭᠡ ᠬᠥᠯ ᠶᠡᠬᠡ ᠲᠡᠢ ᠪᠠᠢᠨ᠎ᠠ！ ᠥᠷᠲᠡᠭᠡ ᠶᠢ ᠰᠣᠩᠭᠣᠵᠤ ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠭᠤᠯᠤᠭᠠᠳ ᠡᠭᠡᠯᠵᠢ ᠳᠠᠭᠤᠰᠬᠤ ᠠᠴᠠ ᠡᠮᠦᠨ᠎ᠡ 220 ᠬᠦᠮᠦᠨ ᠢ ᠭᠡᠷ ᠲᠦ ᠨᠢ ᠬᠦᠷᠭᠡ᠃",
    "events": [
      "ᠵᠤᠭᠠᠯᠭ᠎ᠠ ᠳᠠᠭᠤᠰᠯ᠎ᠠ！ ᠴᠡᠴᠡᠷᠯᠢᠭ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠰᠢᠨ᠎ᠡ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠢᠷᠡᠯ᠎ᠡ᠃",
      "ᠬᠣᠢᠲᠤ ᠴᠡᠴᠡᠷᠯᠢᠭᠲᠦ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ ᠦ ᠣᠢᠷᠠᠯᠴᠠᠭᠠᠬᠢ ᠰᠤᠷᠭᠠᠭᠤᠯᠢ ᠲᠠᠷᠠᠯ᠎ᠠ᠃ ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠭᠤᠯᠵᠤ ᠲᠤᠰᠠᠯᠠᠭᠠᠷᠠᠢ！"
    ]
  },
  "concert": {
    "name": "ᠳᠠᠬᠢᠭᠠᠳ ᠨᠢᠭᠡ ᠳᠠᠭᠤᠤ",
    "subtitle": "ᠲᠣᠭᠯᠠᠯᠲᠠ ᠶᠢᠨ ᠳᠠᠷᠠᠭᠠᠬᠢ ᠣᠯᠠᠨ ᠢ ᠬᠦᠷᠭᠡᠬᠦ",
    "briefing": "ᠲᠣᠭᠯᠠᠯᠲᠠ ᠤᠳᠠᠬᠤ ᠦᠭᠡᠢ ᠳᠠᠭᠤᠰᠤᠨ᠎ᠠ᠃ ᠴᠡᠩᠭᠡᠯᠳᠡᠬᠦ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ ᠥᠷᠲᠡᠭᠡ ᠶᠢ ᠠᠵᠢᠭᠯᠠᠵᠤ᠂ ᠳᠠᠷᠠᠭᠠᠯᠠᠯ ᠤᠷᠲᠤᠰᠬᠤ ᠠᠴᠠ ᠡᠮᠦᠨ᠎ᠡ ᠨᠡᠮᠡᠯᠲᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠭᠤᠯ᠃",
    "events": [
      "ᠰᠡᠭᠦᠯ ᠦᠨ ᠳᠠᠭᠤᠤ ᠳᠠᠭᠤᠰᠯ᠎ᠠ！ 50 ᠰᠢᠲᠦᠨ ᠪᠢᠰᠢᠷᠡᠭᠴᠢ ᠴᠡᠩᠭᠡᠯᠳᠡᠬᠦ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠢᠷᠡᠯ᠎ᠡ᠃",
      "ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠦᠵᠡᠭᠴᠢᠳ ᠢᠷᠡᠯ᠎ᠡ！ ᠪᠦᠭᠦᠳᠡ ᠶᠢ ᠭᠡᠷ ᠲᠦ ᠨᠢ ᠬᠦᠷᠭᠡᠶ᠎ᠡ᠃",
      "ᠲᠥᠪ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠣᠷᠣᠢ ᠶᠢᠨ ᠳᠠᠮᠵᠢᠨ ᠰᠠᠭᠤᠬᠤ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠨᠡᠮᠡᠭᠳᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ᠃"
    ]
  },
  "connections": {
    "name": "ᠲᠥᠪ ᠲᠦ ᠠᠭᠤᠯᠵᠠᠶ᠎ᠠ",
    "subtitle": "ᠬᠣᠶᠠᠷ ᠱᠤᠭᠤᠮ᠂ ᠨᠢᠭᠡ ᠬᠣᠲᠠ",
    "briefing": "ᠣᠯᠠᠨ ᠵᠣᠷᠴᠢᠭᠴᠢ ᠳᠠᠮᠵᠢᠨ ᠰᠠᠭᠤᠨ᠎ᠠ᠃ ᠬᠥᠯ ᠶᠡᠬᠡ ᠲᠡᠢ ᠲᠠᠪᠴᠠᠩ ᠳᠤ ᠨᠥᠭᠡᠴᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠭᠤᠯᠵᠤ᠂ ᠲᠥᠪ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠢ ᠠᠷᠠᠢ ᠤᠳᠠᠭᠠᠨ ᠬᠦᠯᠢᠶᠡᠯᠭᠡᠨ ᠰᠢᠨ᠎ᠡ ᠪᠡᠷ ᠢᠷᠡᠭᠰᠡᠨ ᠬᠦᠮᠦᠰ ᠢ ᠠᠮᠵᠢᠭᠤᠯ᠃",
    "events": [
      "ᠣᠩᠭᠣᠴᠠ ᠭᠠᠵᠠᠷᠳᠠᠯ᠎ᠠ᠃ ᠨᠢᠰᠬᠡᠬᠦ ᠪᠤᠭᠤᠳᠠᠯ ᠤᠨ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠬᠣᠶᠠᠷ ᠱᠤᠭᠤᠮ ᠢᠶᠠᠷ ᠶᠠᠪᠤᠨ᠎ᠠ᠃",
      "ᠭᠠᠲᠤᠯᠭ᠎ᠠ ᠣᠩᠭᠣᠴᠠ ᠶᠢᠨ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠪᠣᠭᠣᠮᠲᠠ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠢᠷᠡᠯ᠎ᠡ！ ᠳᠠᠮᠵᠢᠨ ᠰᠠᠭᠤᠬᠤ ᠶᠢ ᠨᠢ ᠠᠵᠢᠭᠯᠠᠭᠠᠷᠠᠢ᠃",
      "ᠲᠥᠪ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠰᠡᠭᠦᠯᠴᠢ ᠶᠢᠨ ᠣᠯᠠᠨ ᠬᠦᠮᠦᠨ ᠢᠷᠡᠯ᠎ᠡ᠃ ᠴᠢ ᠴᠢᠳᠠᠨ᠎ᠠ！"
    ]
  }
},
  ja: {"first-shift": {"name": "はじめての運行", "subtitle": "運行係になってみよう", "briefing": "市場駅はにぎやか！駅を選んで予備列車を出し、運行終了までに220人を家まで送ろう。", "events": ["ピクニックがおしまい！庭園駅に新しい乗客がやってきました。", "北公園駅の近くの学校が終わりました。予備列車でお手伝いしよう！"]}, "concert": {"name": "大きなアンコール", "subtitle": "コンサート帰りのお手伝い", "briefing": "コンサートがもうすぐ終わります。スタジアム駅を見守って、列が長くなる前に応援の列車を出そう。", "events": ["アンコール終了！50人のファンがスタジアム駅に到着しました。", "次の観客たちも到着！みんなを家まで送り届けよう。", "中央駅では夕方の乗り換え客が増えています。"]}, "connections": {"name": "中央駅で会おう", "subtitle": "2つの路線、1つの街", "briefing": "多くの乗客が乗り換えます。混んだホームに予備列車を出し、中央駅の列車を少し待たせて、到着した人を迎えよう。", "events": ["飛行機が到着。空港駅の乗客は2つの路線を使います。", "フェリーの乗客が港駅へ！乗り換えを見守ろう。", "中央駅に最後の人波がやってきました。きっとできるよ！"]}},
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
  try { const saved = storage?.getItem(LANGUAGE_KEY); if (isLanguage(saved)) return saved; } catch { /* Storage may be blocked. */ }
  for (const language of browserLanguages) {
    if (/^mn(?:-|$)/i.test(language)) {
      if (/(?:^|-)Mong(?:-|$)/i.test(language)) return 'mn-Mong-CN';
      if (/(?:^|-)Cyrl(?:-|$)/i.test(language)) return 'mn-Cyrl-MN';
      return /(?:^|-)CN(?:-|$)/i.test(language) ? 'mn-Mong-CN' : 'mn-Cyrl-MN';
    }
    if (/^ja(?:-|$)/i.test(language)) return 'ja';
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
