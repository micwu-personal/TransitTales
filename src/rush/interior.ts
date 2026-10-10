import { CAPACITY, lineFor, type Game, type LineId } from './model';
import { stationNames, text, type Language } from './locale';
import { STATION_IDS, type Announcement, type AnnouncementKind } from './announcements';

export type InteriorSelection = { kind: 'station'; id: string } | { kind: 'train'; id: number };
const copy = {
  en: { station: 'Inside the station', train: 'Inside the train', close: 'Back to the city', live: 'Live passenger view', waiting: 'waiting on the platform', aboard: 'on board', empty: 'A little breathing room.', sampling: 'Each figure represents one passenger. Extra passengers are counted below.', toward: 'Bound for', next: 'Next stop', stopped: 'Doors open at', transfer: 'Change lines here', sound: 'Announcements', replay: 'Play announcement', mute: 'Mute', unmute: 'Enable sound', preview: 'Broadcast studio', previewHelp: 'Try future-service announcements. These are previews, not events in this shift.', approaching: 'Approaching', terminus: 'Terminus', arriving: 'Arriving train', pass: 'Non-stopping service', safety: 'Friendly reminder', idle: 'Tap Play to hear the announcement.', loading: 'Loading recording…', playing: 'Announcement playing', ended: 'Announcement finished. Play it again anytime.', blocked: 'Audio was blocked. Tap Play again to enable it.', error: 'Recording unavailable. Check your connection and tap Play to retry. Captions remain available.', muted: 'Sound muted. Captions remain available.', unavailable: 'This train has completed its journey.', direction: 'Direction', platform: 'Platform', service: 'Service', liveBroadcast: 'Live broadcast', seats: 'capacity', chooseLine: 'Choose a platform line', inspect: 'Look inside', more: 'more passengers', atTerminus: 'At the terminus', travelling: 'Travelling toward' },
  'zh-CN': { station: '走进车站', train: '走进车厢', close: '返回城市', live: '实时乘客视图', waiting: '人在站台候车', aboard: '人在车上', empty: '静静享受宽敞的旅途。', sampling: '每个人物代表一位乘客，其余人数显示在下方。', toward: '开往', next: '下一站', stopped: '正在停靠', transfer: '本站可换乘', sound: '车站广播', replay: '播放广播', mute: '静音', unmute: '开启声音', preview: '广播试音室', previewHelp: '试听未来运营情景。这些仅为示例，并非本班次实际事件。', approaching: '即将到站', terminus: '终点站', arriving: '列车进站', pass: '通过不停车', safety: '温馨提示', idle: '点击播放，收听广播。', loading: '正在载入录音…', playing: '正在播放广播', ended: '广播结束，可随时重播。', blocked: '声音被浏览器阻止，请再次点击播放。', error: '录音暂不可用，请检查网络后重试。字幕仍可阅读。', muted: '已静音，字幕仍可阅读。', unavailable: '这列车已经完成旅程。', direction: '方向', platform: '站台', service: '线路', liveBroadcast: '实时广播', seats: '载客上限', chooseLine: '选择站台线路', inspect: '看看里面', more: '位其他乘客', atTerminus: '当前为终点站', travelling: '正在开往' },
  ja: { station: '駅の中へ', train: '車内へ', close: '街へ戻る', live: '乗客のライブビュー', waiting: '人がホームで待っています', aboard: '人が乗車中', empty: 'ゆったりした旅のひととき。', sampling: '人物一つが乗客一人です。残りの人数は下に表示します。', toward: '行き', next: '次の駅', stopped: '停車中', transfer: 'ここで乗り換え', sound: '車内・駅放送', replay: '放送を再生', mute: 'ミュート', unmute: '音声を有効にする', preview: '放送スタジオ', previewHelp: '今後の運行情景を試聴できます。現在のシフトの出来事ではなく、サンプルです。', approaching: 'まもなく到着', terminus: '終点', arriving: '電車が到着', pass: '通過列車', safety: 'ご案内', idle: '再生を押すと放送が流れます。', loading: '録音を読み込み中…', playing: '放送を再生中', ended: '放送が終了しました。いつでも再生できます。', blocked: '音声がブロックされました。もう一度再生を押してください。', error: '録音を再生できません。接続を確認して再試行してください。字幕は表示されます。', muted: 'ミュート中です。字幕は表示されます。', unavailable: 'この電車の運行は終了しました。', direction: '方面', platform: 'ホーム', service: '路線', liveBroadcast: 'ライブ放送', seats: '定員', chooseLine: 'ホームの路線を選ぶ', inspect: '中を見る', more: '人の乗客', atTerminus: '終点に停車中', travelling: '走行中・次の駅' },
  'mn-Cyrl-MN': {
    station: 'Өртөөний дотор', train: 'Галт тэрэгний дотор', close: 'Хот руу буцах', live: 'Зорчигчдын бодит цагийн дүр зураг',
    waiting: 'хүн тавцан дээр хүлээж байна', aboard: 'хүн галт тэргэнд байна', empty: 'Тайван, уужимхан аялал.',
    sampling: 'Дүрс бүр нэг зорчигчийг төлөөлнө. Үлдсэн зорчигчдын тоог доор харуулна.', toward: 'Чиглэл', next: 'Дараагийн өртөө',
    stopped: 'Хаалга нээлттэй өртөө', transfer: 'Энд шугам сольж сууна', sound: 'Зарлал', replay: 'Зарлал сонсох', mute: 'Дууг хаах', unmute: 'Дууг нээх',
    preview: 'Зарлалын туршилтын өрөө', previewHelp: 'Ирээдүйн үйлчилгээний зарлалыг сонсож үзээрэй. Эдгээр нь жишээ бөгөөд энэ ээлжид болж буй үйл явдал биш.',
    approaching: 'Өртөөнд ойртож байна', terminus: 'Эцсийн өртөө', arriving: 'Галт тэрэг ирж байна', pass: 'Зогсолтгүй өнгөрөх галт тэрэг', safety: 'Аюулгүй байдлын санамж',
    idle: 'Зарлал сонсох товчийг дарна уу.', loading: 'Бичлэгийг ачаалж байна…', playing: 'Зарлал тоглож байна', ended: 'Зарлал дууслаа. Хүссэн үедээ дахин сонсож болно.',
    blocked: 'Хөтөч дууг хориглолоо. Зарлал сонсох товчийг дахин дарна уу.', error: 'Бичлэгийг тоглуулах боломжгүй байна. Сүлжээний холболтоо шалгаад дахин оролдоно уу. Зарлалын бичвэрийг уншиж болно.',
    muted: 'Дуу хаалттай. Зарлалын бичвэрийг уншиж болно.', unavailable: 'Энэ галт тэрэг аяллаа дуусгасан.', direction: 'Чиглэл', platform: 'Тавцан', service: 'Шугам',
    liveBroadcast: 'Бодит цагийн зарлал', seats: 'багтаамж', chooseLine: 'Тавцангийн шугамыг сонгох', inspect: 'Дотор нь харах', more: 'бусад зорчигч', atTerminus: 'Эцсийн өртөөнд байна', travelling: 'Чиглэн явж байна',
    voiceNote: 'Монгол бичгийн хоёр хувилбарын бичлэг хоёулаа Монгол Улсын монгол хэлний дуудлагатай. Өвөр Монголын тусгай хоолой ашиглаагүй.',
  },
  'mn-Mong-CN': {
    station: 'ᠥᠷᠲᠡᠭᠡᠨ ᠦ ᠳᠣᠲᠣᠷ᠎ᠠ', train: 'ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡᠨ ᠦ ᠳᠣᠲᠣᠷ᠎ᠠ', close: 'ᠬᠣᠲᠠ ᠷᠤᠭᠤ ᠪᠤᠴᠠᠬᠤ', live: 'ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠤᠨ ᠪᠣᠳᠠᠲᠤ ᠴᠠᠭ ᠤᠨ ᠳᠦᠷᠦ ᠵᠢᠷᠤᠭ',
    waiting: 'ᠬᠦᠮᠦᠨ ᠲᠠᠪᠴᠠᠩ ᠳᠡᠭᠡᠷ᠎ᠡ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠶᠢᠨ᠎ᠠ', aboard: 'ᠬᠦᠮᠦᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡᠨ ᠳᠦ ᠪᠠᠶᠢᠨ᠎ᠠ', empty: 'ᠲᠠᠶᠢᠪᠤᠩ᠂ ᠠᠭᠤᠵᠢᠮ ᠠᠶᠠᠯᠠᠯ᠃',
    sampling: 'ᠳᠦᠷᠰᠦ ᠪᠦᠷᠢ ᠨᠢᠭᠡ ᠵᠣᠷᠴᠢᠭᠴᠢ ᠶᠢ ᠲᠥᠯᠥᠭᠡᠯᠡᠨ᠎ᠡ᠃ ᠪᠤᠰᠤᠳ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠤᠨ ᠲᠣᠭ᠎ᠠ ᠶᠢ ᠳᠣᠣᠷ᠎ᠠ ᠬᠠᠷᠠᠭᠤᠯᠤᠨ᠎ᠠ᠃', toward: 'ᠴᠢᠭᠯᠡᠯ', next: 'ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠥᠷᠲᠡᠭᠡ',
    stopped: 'ᠬᠠᠭᠠᠯᠭ᠎ᠠ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠲᠡᠢ ᠥᠷᠲᠡᠭᠡ', transfer: 'ᠡᠨᠳᠡ ᠱᠤᠭᠤᠮ ᠰᠣᠯᠢᠵᠤ ᠰᠠᠭᠤᠨ᠎ᠠ', sound: 'ᠵᠠᠷᠯᠠᠯ', replay: 'ᠵᠠᠷᠯᠠᠯ ᠰᠣᠨᠣᠰᠬᠤ', mute: 'ᠳᠠᠭᠤ ᠶᠢ ᠬᠠᠭᠠᠬᠤ', unmute: 'ᠳᠠᠭᠤ ᠶᠢ ᠨᠡᠭᠡᠭᠡᠬᠦ',
    preview: 'ᠵᠠᠷᠯᠠᠯ ᠤᠨ ᠲᠤᠷᠰᠢᠯᠲᠠ ᠶᠢᠨ ᠥᠷᠥᠭᠡ', previewHelp: 'ᠢᠷᠡᠭᠡᠳᠦᠶ ᠶᠢᠨ ᠦᠢᠯᠡᠴᠢᠯᠭᠡᠨ ᠦ ᠵᠠᠷᠯᠠᠯ ᠢ ᠰᠣᠨᠣᠰᠴᠤ ᠦᠵᠡᠭᠡᠷᠡᠢ᠃ ᠡᠳᠡᠭᠡᠷ ᠪᠣᠯ ᠵᠢᠱᠢᠶ᠎ᠡ᠂ ᠡᠨᠡ ᠡᠭᠡᠯᠵᠢᠨ ᠳᠦ ᠪᠣᠯᠵᠤ ᠪᠤᠢ ᠦᠢᠯᠡ ᠶᠠᠪᠤᠳᠠᠯ ᠪᠢᠰᠢ᠃',
    approaching: 'ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠣᠶᠢᠷᠠᠲᠤᠵᠤ ᠪᠠᠶᠢᠨ᠎ᠠ', terminus: 'ᠡᠴᠦᠰ ᠦᠨ ᠥᠷᠲᠡᠭᠡ', arriving: 'ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠢᠷᠡᠵᠦ ᠪᠠᠶᠢᠨ᠎ᠠ', pass: 'ᠵᠣᠭᠰᠣᠯᠲᠠ ᠦᠭᠡᠢ ᠥᠩᠭᠡᠷᠡᠬᠦ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ', safety: 'ᠠᠶᠤᠯᠭᠦᠢ ᠪᠠᠶᠢᠳᠠᠯ ᠤᠨ ᠰᠠᠨᠠᠮᠵᠢ',
    idle: 'ᠵᠠᠷᠯᠠᠯ ᠰᠣᠨᠣᠰᠬᠤ ᠲᠣᠪᠴᠢ ᠶᠢ ᠳᠠᠷᠤᠨ᠎ᠠ ᠤᠤ᠃', loading: 'ᠪᠢᠴᠢᠯᠭᠡ ᠶᠢ ᠠᠴᠢᠶᠠᠯᠠᠵᠤ ᠪᠠᠶᠢᠨ᠎ᠠ…', playing: 'ᠵᠠᠷᠯᠠᠯ ᠲᠣᠭᠯᠠᠵᠤ ᠪᠠᠶᠢᠨ᠎ᠠ', ended: 'ᠵᠠᠷᠯᠠᠯ ᠳᠠᠭᠤᠰᠤᠯ᠎ᠠ᠃ ᠬᠦᠰᠡᠭᠰᠡᠨ ᠴᠠᠭ ᠲᠤ ᠪᠠᠨ ᠳᠠᠬᠢᠨ ᠰᠣᠨᠣᠰᠴᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃',
    blocked: 'ᠬᠥᠲᠥᠴᠢ ᠳᠠᠭᠤ ᠶᠢ ᠬᠣᠷᠢᠭᠯᠠᠯ᠎ᠠ᠃ ᠵᠠᠷᠯᠠᠯ ᠰᠣᠨᠣᠰᠬᠤ ᠲᠣᠪᠴᠢ ᠶᠢ ᠳᠠᠬᠢᠨ ᠳᠠᠷᠤᠨ᠎ᠠ ᠤᠤ᠃', error: 'ᠪᠢᠴᠢᠯᠭᠡ ᠶᠢ ᠲᠣᠭᠯᠠᠭᠤᠯᠬᠤ ᠪᠣᠯᠣᠮᠵᠢ ᠦᠭᠡᠢ᠃ ᠰᠦᠯᠵᠢᠶᠡᠨ ᠦ ᠬᠣᠯᠪᠣᠭ᠎ᠠ ᠪᠠᠨ ᠱᠠᠯᠭᠠᠭᠠᠳ ᠳᠠᠬᠢᠨ ᠲᠤᠷᠰᠢᠨ᠎ᠠ ᠤᠤ᠃ ᠵᠠᠷᠯᠠᠯ ᠤᠨ ᠪᠢᠴᠢᠭ ᠢ ᠤᠩᠰᠢᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃',
    muted: 'ᠳᠠᠭᠤ ᠬᠠᠭᠠᠯᠲᠠᠲᠠᠢ᠃ ᠵᠠᠷᠯᠠᠯ ᠤᠨ ᠪᠢᠴᠢᠭ ᠢ ᠤᠩᠰᠢᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃', unavailable: 'ᠡᠨᠡ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠠᠶᠠᠯᠠᠯ ᠢᠶᠠᠨ ᠳᠠᠭᠤᠰᠬᠠᠭᠰᠠᠨ᠃', direction: 'ᠴᠢᠭᠯᠡᠯ', platform: 'ᠲᠠᠪᠴᠠᠩ', service: 'ᠱᠤᠭᠤᠮ',
    liveBroadcast: 'ᠪᠣᠳᠠᠲᠤ ᠴᠠᠭ ᠤᠨ ᠵᠠᠷᠯᠠᠯ', seats: 'ᠪᠠᠭᠲᠠᠭᠠᠮᠵᠢ', chooseLine: 'ᠲᠠᠪᠴᠠᠩ ᠤᠨ ᠱᠤᠭᠤᠮ ᠢ ᠰᠣᠩᠭᠣᠬᠤ', inspect: 'ᠳᠣᠲᠣᠷ᠎ᠠ ᠨᠢ ᠬᠠᠷᠠᠬᠤ', more: 'ᠪᠤᠰᠤᠳ ᠵᠣᠷᠴᠢᠭᠴᠢ', atTerminus: 'ᠡᠴᠦᠰ ᠦᠨ ᠥᠷᠲᠡᠭᠡᠨ ᠳᠦ ᠪᠠᠶᠢᠨ᠎ᠠ', travelling: 'ᠴᠢᠭᠯᠡᠨ ᠶᠠᠪᠤᠵᠤ ᠪᠠᠶᠢᠨ᠎ᠠ',
    voiceNote: 'ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ ᠦᠨ ᠬᠣᠶᠠᠷ ᠬᠤᠪᠢᠯᠪᠤᠷᠢ ᠶᠢᠨ ᠪᠢᠴᠢᠯᠭᠡ ᠬᠣᠶᠠᠭᠤᠯᠠ ᠮᠣᠩᠭᠣᠯ ᠤᠯᠤᠰ ᠤᠨ ᠮᠣᠩᠭᠣᠯ ᠬᠡᠯᠡᠨ ᠦ ᠳᠠᠭᠤᠳᠠᠯᠭ᠎ᠠ ᠲᠠᠢ᠃ ᠥᠪᠥᠷ ᠮᠣᠩᠭᠣᠯ ᠤᠨ ᠲᠤᠰᠬᠠᠢ ᠬᠣᠭᠣᠯᠠᠢ ᠠᠰᠢᠭᠯᠠᠭ᠎ᠠ ᠦᠭᠡᠢ᠃',
  },
} as const;
export const interiorText = (language: Language) => copy[language];
export interface InteriorSnapshot {
  readonly kind: 'station' | 'train'; readonly title: string; readonly count: number; readonly passengerIds: readonly number[];
  readonly lines: readonly LineId[]; readonly line: LineId; readonly station: string; readonly next: string; readonly terminal: string;
  readonly moving: boolean; readonly serviceAvailable: boolean; readonly terminus: boolean; readonly capacity: number;
}
export function createInteriorSnapshot(game: Game, selection: InteriorSelection, language: Language, platformLine?: LineId): InteriorSnapshot | null {
  const train = selection.kind === 'train' ? game.trains.find(t => t.id === selection.id) : undefined;
  if (selection.kind === 'train' && !train) return null;
  const station = train ? lineFor(game, train.line).stops[train.index] : String(selection.id);
  const lines = game.network.lines.filter(l => l.stops.includes(station)).map(l => l.id);
  if (!lines.length) return null;
  const lineId = train?.line ?? (platformLine && lines.includes(platformLine) ? platformLine : lines[0]);
  const line = lineFor(game, lineId);
  const relevantTrain = train ?? game.trains.filter(t => t.line === lineId && ((!t.moving && line.stops[t.index] === station) || (t.moving && line.stops[t.index + t.direction] === station))).sort((a,b) => Number(a.moving) - Number(b.moving))[0];
  const direction = relevantTrain?.direction ?? (station === line.stops.at(-1) ? -1 : 1);
  const next = train ? line.stops[train.index + direction] ?? station : station;
  const terminal = direction === 1 ? line.stops.at(-1)! : line.stops[0];
  const passengers = train?.riders ?? game.queues[station];
  return Object.freeze({ kind: selection.kind, title: train ? `${text(language, train.line)} · ${train.id}` : stationNames[language][station] ?? station,
    count: passengers.length, passengerIds: Object.freeze(passengers.slice(0, 24).map(p => p.id)), lines: Object.freeze(lines), line: lineId,
    station, next, terminal, moving: train?.moving ?? relevantTrain?.moving ?? false, serviceAvailable: Boolean(relevantTrain),
    terminus: (train?.moving || game.time >= game.network.segmentSeconds) && ((train?.moving ? next : station) === line.stops[0] || (train?.moving ? next : station) === line.stops.at(-1)), capacity: CAPACITY });
}
export function interiorAnnouncement(view: InteriorSnapshot, preview?: AnnouncementKind): Announcement {
  const kind = preview ?? (view.kind === 'train' ? view.moving ? 'next' : view.terminus ? 'terminus' : 'approaching' : !view.serviceAvailable ? 'safety' : view.moving ? 'arriving' : view.terminus ? 'terminus' : 'approaching');
  const station = kind === 'arriving' ? view.terminal : view.kind === 'train' && view.moving ? view.next : view.station;
  if (!STATION_IDS.includes(station as typeof STATION_IDS[number])) throw new RangeError('Unknown interior station');
  return { kind, station: station as typeof STATION_IDS[number], line: view.line,
    ...(station === 'central' && kind !== 'arriving' ? { transferLine: view.line === 'coral' ? 'blue' as const : 'coral' as const } : {}) };
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function interiorScene(view: InteriorSnapshot, language: Language): string {
  const label = stationNames[language][view.kind === 'train' && view.moving ? view.next : view.station] ?? view.station;
  const color = view.line === 'coral' ? '#b94432' : '#286cb1';
  const people = view.passengerIds.map((id, i) => {
    const x = 54 + (i % 12) * 42, y = 222 + Math.floor(i / 12) * 34;
    const outfit = ['#b94432','#286cb1','#397455','#92633c','#77628a'][id % 5];
    return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="23" rx="10" ry="3" fill="#284d47" opacity=".17"/><path d="M-4 14l-2 8m10-8 2 8" stroke="#284d47" stroke-width="3" stroke-linecap="round"/><path d="M-9 13l3-10h12l3 10" fill="${outfit}"/><circle cy="-3" r="5" fill="${['#d6a477','#a77050','#e2bb96'][id % 3]}"/>${id % 7 === 0 ? '<path d="M6 9h8v11H6z" fill="#d6ac55"/>' : ''}</g>`;
  }).join('');
  const windows = [40,210,380].map(x => `<g><rect x="${x}" y="92" width="134" height="84" rx="12" fill="#91c8c6" stroke="#607f77" stroke-width="4"/><path d="M${x+5} 164l29-31 24 14 29-40 42 57" fill="#aac8a6"/><path d="M${x+14} 102h106" stroke="#dcece7" stroke-width="6"/></g>`).join('');
  const structure = view.kind === 'train' ? `${windows}<path d="M20 187h520v18H20z" fill="${color}"/><path d="M65 52v25m105-25v25m105-25v25m105-25v25m105-25v25" stroke="#7b968b" stroke-width="3"/><path d="M30 52h500" stroke="#7b968b" stroke-width="4"/><path d="M180 85v140m170-140v140" stroke="#a6b6a4" stroke-width="5"/>` : `<path d="M20 98h520v105H20z" fill="#e3ece0"/><path d="M20 199h520" stroke="${color}" stroke-width="9"/>${[34,470].map(x => `<path d="M${x} 57h27v156h-27z" fill="#9eb5a3"/><path d="M${x} 57h7v156h-7z" fill="#bfd0b6"/>`).join('')}<path d="M86 160h343v35H86z" fill="#91c8c6"/><path d="M92 171h330" stroke="#e5f0ec" stroke-width="8"/><path d="M20 270h520" stroke="#bd934a" stroke-width="7" stroke-dasharray="5 5"/>`;
  // A narrow side sign leaves the passenger rows clear; native vertical layout preserves Mongolian shaping.
  const sign = String(language) === 'mn-Mong-CN'
    ? `<rect x="498" y="22" width="44" height="182" rx="7" fill="#284d47"/><foreignObject x="503" y="30" width="34" height="166"><div xmlns="http://www.w3.org/1999/xhtml" lang="mn-Mong-CN" style="writing-mode:vertical-lr;text-orientation:mixed;font-family:'Noto Sans Mongolian',sans-serif;font-size:18px;line-height:17px;height:166px;color:#fff9e8">${escape(label)}</div></foreignObject>`
    : `<rect x="115" y="22" width="330" height="43" rx="7" fill="#284d47"/><text x="280" y="49" text-anchor="middle" fill="#fff9e8" font-family="system-ui,sans-serif" font-size="18">${escape(label)}</text>`;
  return `<svg viewBox="0 0 560 315" role="img" aria-label="${escape(label)}"><path d="M12 42l536-19v276H12z" fill="#c8d9c0"/><path d="M20 55h520v228H20z" fill="#f2f0df"/><path d="M20 212h520v72H20z" fill="#d4d9c3"/>${structure}${sign}${people}<path d="M12 298h536" stroke="#769382" stroke-width="8"/></svg>`;
}
