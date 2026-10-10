import type { Language } from './locale';
import type { LineId } from './model';

export const STATION_IDS = ['harbor', 'market', 'central', 'museum', 'garden', 'north', 'library', 'stadium', 'riverside', 'airport'] as const;
export type StationId = typeof STATION_IDS[number];
export const ANNOUNCEMENT_KINDS = ['next', 'approaching', 'terminus', 'arriving', 'pass-through', 'safety'] as const;
export type AnnouncementKind = typeof ANNOUNCEMENT_KINDS[number];
export interface Announcement { kind: AnnouncementKind; station: StationId; line: LineId; transferLine?: LineId }

// JSON-compatible copy is also the reproducible recording generator's input.
export const ANNOUNCEMENT_COPY = {
  "en": {
    "voice": "en-GB-SoniaNeural",
    "stations": {"harbor":"Harbor","market":"Market","central":"Central","museum":"Museum","garden":"Garden","north":"North Park","library":"Library","stadium":"Stadium","riverside":"Riverside","airport":"Airport"},
    "lines": {"coral":"Coral line","blue":"Blue line"},
    "next": "This is the {line}. The next station is {station}. Please mind the gap when leaving the train.",
    "approaching": "We are now approaching {station} on the {line}. Please prepare to leave the train.",
    "terminus": "This is {station}, the last stop on the {line}. All passengers, please leave the train. Thank you for travelling with us.",
    "arriving": "The {line} train bound for {station} is arriving. Please let passengers leave the train before boarding.",
    "pass-through": "A train is passing through this station without stopping. Please stand behind the platform safety line.",
    "safety": "For your safety, please stand behind the platform safety line, keep the doors clear, and hold the handrail while the train is moving.",
    "transfer": " Change here for the {transferLine}."
  },
  "zh-CN": {
    "voice": "zh-CN-XiaoxiaoNeural",
    "stations": {"harbor":"港口站","market":"集市站","central":"中心站","museum":"博物馆站","garden":"花园站","north":"北公园站","library":"图书馆站","stadium":"体育场站","riverside":"河畔站","airport":"机场站"},
    "lines": {"coral":"珊瑚线","blue":"蓝线"},
    "next": "欢迎乘坐{line}。下一站，{station}。下车时，请注意列车与站台之间的空隙。",
    "approaching": "您乘坐的是{line}。列车即将到达{station}，请提前做好下车准备。",
    "terminus": "{station}到了。本站是{line}的终点站，请所有乘客下车。感谢您的乘坐。",
    "arriving": "开往{station}方向的{line}列车即将进站。请先下后上，有序乘车。",
    "pass-through": "列车即将通过本站，不停车。请站在站台安全线以内，注意安全。",
    "safety": "为了您的安全，请站在站台安全线以内，不要阻挡车门。列车运行时，请握好扶手。",
    "transfer": "需要换乘{transferLine}的乘客，请在本站换乘。"
  },
  "ja": {
    "voice": "ja-JP-NanamiNeural",
    "stations": {"harbor":"港駅","market":"市場駅","central":"中央駅","museum":"博物館駅","garden":"庭園駅","north":"北公園駅","library":"図書館駅","stadium":"スタジアム駅","riverside":"川辺駅","airport":"空港駅"},
    "lines": {"coral":"コーラル線","blue":"ブルー線"},
    "next": "この電車は{line}です。次は、{station}です。お降りの際は、電車とホームの間にご注意ください。",
    "approaching": "この電車は{line}です。まもなく、{station}に到着します。お降りのお客様はご準備ください。",
    "terminus": "{station}です。この駅は{line}の終点です。どなた様もお降りください。ご乗車ありがとうございました。",
    "arriving": "まもなく、{station}行きの{line}の電車が到着します。降りるお客様を先にお通しください。",
    "pass-through": "まもなく、電車がこの駅を通過します。ホームの安全線の内側までお下がりください。",
    "safety": "安全のため、ホームでは安全線の内側でお待ちください。ドアをふさがないでください。走行中は手すりにおつかまりください。",
    "transfer": "{transferLine}は、お乗り換えです。"
  },
  "mn-Cyrl-MN": {
    "voice": "mn-MN-YesuiNeural",
    "recordingLanguage": "mn-Cyrl-MN",
    "stations": {"harbor":"Боомт буудал","market":"Зах буудал","central":"Төв буудал","museum":"Музей буудал","garden":"Цэцэрлэг буудал","north":"Хойд цэцэрлэгт хүрээлэн буудал","library":"Номын сан буудал","stadium":"Цэнгэлдэх хүрээлэн буудал","riverside":"Голын эрэг буудал","airport":"Нисэх буудал"},
    "lines": {"coral":"Шүрэн шугам","blue":"Хөх шугам"},
    "next": "Та {line}ын галт тэргээр зорчиж байна. Дараагийн буудал бол {station}. Буухдаа галт тэрэг болон тавцангийн хоорондох зайг анхаарна уу.",
    "approaching": "{line}ын галт тэрэг {station}д ойртож байна. Буух зорчигчид бэлтгэнэ үү.",
    "terminus": "{station}д ирлээ. Энэ бол {line}ын эцсийн буудал. Бүх зорчигч галт тэрэгнээс бууна уу. Манай галт тэргээр зорчсон танд баярлалаа.",
    "arriving": "{station} руу явах {line}ын галт тэрэг ирж байна. Эхлээд зорчигчдыг буулгаад, дараа нь сууна уу.",
    "pass-through": "Галт тэрэг энэ буудлаар зогсолгүй өнгөрнө. Тавцангийн аюулгүйн шугамын цаана зогсоно уу.",
    "safety": "Аюулгүй байдлын төлөө тавцангийн аюулгүйн шугамын цаана зогсож, хаалгыг чөлөөтэй байлгана уу. Галт тэрэг явж байх үед бариулаас барина уу.",
    "transfer": " {transferLine}д шилжих зорчигчид энэ буудалд сэлгэн сууна уу."
  },
  "mn-Mong-CN": {
    "voice": "mn-MN-YesuiNeural",
    "recordingLanguage": "mn-Cyrl-MN",
    "stations": {"harbor":"ᠪᠣᠭᠣᠮᠲᠠ ᠪᠤᠭᠤᠳᠠᠯ","market":"ᠵᠠᠬ᠎ᠠ ᠪᠤᠭᠤᠳᠠᠯ","central":"ᠲᠥᠪ ᠪᠤᠭᠤᠳᠠᠯ","museum":"ᠮᠦᠽᠧᠢ ᠪᠤᠭᠤᠳᠠᠯ","garden":"ᠴᠡᠴᠡᠷᠯᠢᠭ ᠪᠤᠭᠤᠳᠠᠯ","north":"ᠬᠣᠢᠲᠤ ᠴᠡᠴᠡᠷᠯᠢᠭᠲᠦ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ ᠪᠤᠭᠤᠳᠠᠯ","library":"ᠨᠣᠮ ᠤᠨ ᠰᠠᠩ ᠪᠤᠭᠤᠳᠠᠯ","stadium":"ᠴᠡᠩᠭᠡᠯᠳᠡᠬᠦ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ ᠪᠤᠭᠤᠳᠠᠯ","riverside":"ᠭᠣᠣᠯ ᠤᠨ ᠡᠷᠭᠢ ᠪᠤᠭᠤᠳᠠᠯ","airport":"ᠨᠢᠰᠬᠡᠬᠦ ᠪᠤᠭᠤᠳᠠᠯ"},
    "lines": {"coral":"ᠰᠢᠷᠦ ᠱᠤᠭᠤᠮ","blue":"ᠬᠥᠬᠡ ᠱᠤᠭᠤᠮ"},
    "next": "ᠲᠠ {line} ᠤᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠪᠡᠷ ᠵᠣᠷᠴᠢᠵᠤ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠳᠠᠷᠠᠭᠠ ᠶᠢᠨ ᠪᠤᠭᠤᠳᠠᠯ ᠪᠣᠯ {station}᠃ ᠪᠠᠭᠤᠬᠤ ᠳᠠᠭᠠᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠪᠣᠯᠣᠨ ᠲᠠᠪᠴᠠᠩ ᠤᠨ ᠬᠣᠭᠣᠷᠣᠨᠳᠣᠬᠢ ᠵᠠᠢ ᠶᠢ ᠠᠩᠬᠠᠷᠤᠨ᠎ᠠ ᠤᠤ᠃",
    "approaching": "{line} ᠤᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ {station} ᠳᠤ ᠣᠢᠷᠠᠲᠠᠵᠤ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠪᠠᠭᠤᠬᠤ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠪᠡᠯᠡᠳᠬᠡᠨ᠎ᠡ ᠦᠦ᠃",
    "terminus": "{station} ᠳᠤ ᠢᠷᠡᠯ᠎ᠡ᠃ ᠡᠨᠡ ᠪᠣᠯ {line} ᠤᠨ ᠡᠴᠦᠰ ᠦᠨ ᠪᠤᠭᠤᠳᠠᠯ᠃ ᠪᠦᠬᠦ ᠵᠣᠷᠴᠢᠭᠴᠢ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠡᠴᠡ ᠪᠠᠭᠤᠨ᠎ᠠ ᠤᠤ᠃ ᠮᠠᠨ ᠤ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠪᠡᠷ ᠵᠣᠷᠴᠢᠭᠰᠠᠨ ᠲᠠᠨ ᠳᠤ ᠪᠠᠶᠠᠷᠯᠠᠯ᠎ᠠ᠃",
    "arriving": "{station} ᠷᠤᠭᠤ ᠶᠠᠪᠤᠬᠤ {line} ᠤᠨ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠢᠷᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠡᠬᠢᠯᠡᠡᠳ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠢ ᠪᠠᠭᠤᠯᠭᠠᠭᠠᠳ᠂ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠰᠠᠭᠤᠨ᠎ᠠ ᠤᠤ᠃",
    "pass-through": "ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠡᠨᠡ ᠪᠤᠭᠤᠳᠠᠯ ᠢᠶᠠᠷ ᠵᠣᠭᠰᠣᠯᠭᠦᠢ ᠥᠩᠭᠡᠷᠡᠨ᠎ᠡ᠃ ᠲᠠᠪᠴᠠᠩ ᠤᠨ ᠠᠶᠤᠯᠭᠦᠢ ᠶᠢᠨ ᠱᠤᠭᠤᠮ ᠤᠨ ᠴᠠᠭᠠᠨ᠎ᠠ ᠵᠣᠭᠰᠣᠨ᠎ᠠ ᠤᠤ᠃",
    "safety": "ᠠᠶᠤᠯᠭᠦᠢ ᠪᠠᠢᠳᠠᠯ ᠤᠨ ᠲᠥᠯᠥᠭᠡ ᠲᠠᠪᠴᠠᠩ ᠤᠨ ᠠᠶᠤᠯᠭᠦᠢ ᠶᠢᠨ ᠱᠤᠭᠤᠮ ᠤᠨ ᠴᠠᠭᠠᠨ᠎ᠠ ᠵᠣᠭᠰᠣᠵᠤ᠂ ᠬᠠᠭᠠᠯᠭ᠎ᠠ ᠶᠢ ᠴᠢᠯᠥᠭᠡᠲᠡᠢ ᠪᠠᠢᠯᠭᠠᠨ᠎ᠠ ᠤᠤ᠃ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠶᠠᠪᠤᠵᠤ ᠪᠠᠢᠬᠤ ᠦᠶ᠎ᠡ ᠳᠦ ᠪᠠᠷᠢᠭᠤᠯ ᠠᠴᠠ ᠪᠠᠷᠢᠨ᠎ᠠ ᠤᠤ᠃",
    "transfer": " {transferLine} ᠳᠤ ᠰᠢᠯᠵᠢᠬᠦ ᠵᠣᠷᠴᠢᠭᠴᠢᠳ ᠡᠨᠡ ᠪᠤᠭᠤᠳᠠᠯ ᠳᠤ ᠰᠡᠯᠭᠡᠨ ᠰᠠᠭᠤᠨ᠎ᠠ ᠤᠤ᠃"
  }
} as const;

export const ANNOUNCEMENT_STOPS: Record<LineId, readonly StationId[]> = {
  coral: ['harbor', 'market', 'central', 'museum', 'garden'],
  blue: ['north', 'library', 'central', 'stadium', 'riverside', 'airport'],
};

function generic(a: Announcement): boolean { return a.kind === 'safety' || a.kind === 'pass-through'; }
function validate(a: Announcement): void {
  if (!ANNOUNCEMENT_KINDS.includes(a.kind) || !STATION_IDS.includes(a.station) || !ANNOUNCEMENT_STOPS[a.line]?.includes(a.station)) throw new RangeError('Unknown announcement or station/line pairing');
  if (a.transferLine && (a.station !== 'central' || a.transferLine === a.line || !ANNOUNCEMENT_STOPS[a.transferLine])) throw new RangeError('Transfers must connect the two lines at Central');
}

export function announcementText(language: Language, a: Announcement): string {
  validate(a);
  const copy = ANNOUNCEMENT_COPY[language];
  const sentence = copy[a.kind].replace('{station}', copy.stations[a.station]).replace('{line}', copy.lines[a.line]);
  return sentence + (a.transferLine && !generic(a) ? copy.transfer.replace('{transferLine}', copy.lines[a.transferLine]) : '');
}

export type AnnouncementRecordingLanguage = Exclude<keyof typeof ANNOUNCEMENT_COPY, 'mn-Mong-CN'>;

/** Traditional-script captions explicitly share Mongolia Mongolian speech, not a China-region voice. */
export function announcementRecordingLanguage(language: Language): AnnouncementRecordingLanguage {
  return language === 'mn-Mong-CN' ? 'mn-Cyrl-MN' : language;
}

/** Actual spoken script, which may differ from the localized caption's writing system. */
export function announcementRecordingText(language: Language, a: Announcement): string {
  return announcementText(announcementRecordingLanguage(language), a);
}

/** Stable bundled URL; the matching manifest records the actual spoken sentence and voice. */
export function announcementAsset(language: Language, a: Announcement): string {
  validate(a);
  const key = generic(a) ? a.kind : `${a.kind}-${a.line}-${a.station}${a.transferLine ? `-transfer-${a.transferLine}` : ''}`;
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base}audio/transit/${announcementRecordingLanguage(language)}/${key}.mp3`;
}

/** Includes future scenario previews; describing one does not change simulation behavior. */
export function announcementCatalog(): Announcement[] {
  const result: Announcement[] = [];
  for (const line of ['coral', 'blue'] as const) for (const station of ANNOUNCEMENT_STOPS[line]) {
    for (const kind of ['next', 'approaching', 'terminus', 'arriving'] as const) {
      result.push({ kind, station, line });
      if (station === 'central') result.push({ kind, station, line, transferLine: line === 'coral' ? 'blue' : 'coral' });
    }
  }
  result.push({ kind: 'pass-through', station: 'central', line: 'coral' }, { kind: 'safety', station: 'central', line: 'coral' });
  return result;
}
