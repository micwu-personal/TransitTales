import type { Language } from '../rush/locale';
import type { UniverseSnapshot } from './view';
import { routeFrame, routeTravelEstimate } from './route';
import { YEAR_SECONDS } from './physics';
import { lorentzFactor } from './model';
import { angularDoppler } from './flight';

const en = {
  title: 'Flight instruments', speed: 'Current speed', gamma: 'Lorentz factor', sr: 'SR · ahead / behind',
  gr: 'GR · clock / frequency', cosmos: 'Cosmic redshift · z', observer: 'Earth-frame estimate', traveler: 'Traveler estimate',
  note: 'Time-compressed, protected flight. Clocks estimate constant cruise along the path; exclude acceleration and time-machine jumps. GR uses static representative emitters, not ray tracing. Cosmic z is a toy matter-era illustration, not a measured spectrum.',
  stationary: 'Stationary · cruise setting takes effect during flight', stopped: 'Cruise is zero · increase speed to continue',
  quality: 'Rendering budget', eco: 'Power saving', balanced: 'Balanced', high: 'More detail',
  sensors: 'Device motion', enable: 'Enable motion', disable: 'Stop motion', look: 'Look around', inspect: 'Look + local inspection', recenter: 'Recenter',
  sensorNote: 'Opt-in only. Tilting can move the virtual inspection camera, never the astronomical route or map. Pointer controls remain available.',
  idle: 'Off', requesting: 'Awaiting permission', waiting: 'Waiting for sensor readings', active: 'Active', paused: 'Paused · enable to resume',
  denied: 'Permission denied', unavailable: 'Sensors unavailable', insecure: 'HTTPS required', 'no-events': 'No readings received · use pointer controls', disposed: 'Off',
  year: 'yr', hour: 'h', seconds: 's', unknown: '—',
};
type Copy = typeof en;
const copies: Record<Language, Copy> = {
  en,
  'zh-CN': {
    title: '飞行仪表', speed: '当前速度', gamma: '洛伦兹因子', sr: '狭义多普勒 · 前 / 后', gr: '广义相对论 · 钟速 / 频率', cosmos: '宇宙学红移 · z', observer: '地球视角估算', traveler: '旅行者视角估算',
    note: '受保护、时间压缩的演示。时钟按当前巡航速度和已走路径估算，不含加速及时间机器跳跃。引力效应采用静态代表性发光位置，不是光线追踪；宇宙学红移是物质主导时代的简化示意，并非实测光谱。',
    stationary: '当前静止 · 巡航设置在旅途中生效', stopped: '巡航速度为零 · 调高速度后继续',
    quality: '渲染预算', eco: '省电', balanced: '均衡', high: '更多细节', sensors: '设备感应', enable: '启用感应', disable: '停止感应', look: '转动视角', inspect: '视角与局部探察', recenter: '重新居中',
    sensorNote: '仅在主动开启后读取感应器。倾斜可移动虚拟探察镜头，不改变天文路线或地图坐标；鼠标和触屏拖动仍可用。', idle: '未开启', requesting: '等待授权', waiting: '等待感应数据', active: '已启用', paused: '已暂停 · 重新启用以继续', denied: '授权被拒绝', unavailable: '感应器不可用', insecure: '需要 HTTPS', 'no-events': '未收到数据 · 请用拖动操作', disposed: '已关闭', year: '年', hour: '小时', seconds: '秒', unknown: '—',
  },
  ja: {
    title: '飛行計器', speed: '現在の速度', gamma: 'ローレンツ因子', sr: '特殊相対論 · 前 / 後', gr: '重力 · 時計 / 周波数', cosmos: '宇宙赤方偏移 · z', observer: '地球側の推定時間', traveler: '旅行者の推定時間',
    note: '保護された時間圧縮の実演。時間は一定の巡航速度で進んだ経路から推定し、加速と時間移動は含みません。重力は静的な代表放射源の近似、宇宙赤方偏移は物質優勢時代の模式図で、光線追跡や実測光譜ではありません。',
    stationary: '停止中 · 巡航速度は旅行中に反映', stopped: '巡航速度がゼロ · 速度を上げて続行', quality: '描画予算', eco: '省電力', balanced: 'バランス', high: '詳細', sensors: '端末の動き', enable: '動きを有効にする', disable: '動きを停止', look: '見回す', inspect: '視点と局所探索', recenter: '中央に戻す',
    sensorNote: '明示的に有効にした場合のみ使用。傾けて仮想カメラを動かしても、天文の経路や地図の座標は変わりません。ポインター操作も使えます。', idle: '無効', requesting: '許可を待機', waiting: 'センサーを待機', active: '有効', paused: '一時停止 · 再有効化', denied: '許可が拒否されました', unavailable: 'センサー非対応', insecure: 'HTTPS が必要', 'no-events': '読み取りなし · ポインター操作を使用', disposed: '無効', year: '年', hour: '時間', seconds: '秒', unknown: '—',
  },
  'mn-Cyrl-MN': {
    title: 'Нислэгийн хэмжүүр', speed: 'Одоогийн хурд', gamma: 'Лоренцийн үржүүлэгч', sr: 'Доплер · урд / хойд', gr: 'Таталцал · цаг / давтамж', cosmos: 'Сансрын улаан шилжилт · z', observer: 'Дэлхийн цагийн тооцоо', traveler: 'Аялагчийн цагийн тооцоо',
    note: 'Хамгаалалттай, хугацааг шахсан үзүүлэн. Цагийг тогтмол аяллын хурд ба туулсан замаар тооцно; хурдатгал, цагийн аяллыг оруулаагүй. Таталцал нь төлөөлөх тогтмол эх үүсвэрийн загвар. Улаан шилжилт нь хялбаршуулсан дүрслэл, хэмжсэн спектр биш.',
    stationary: 'Зогсож байна · хурд аяллын үед үйлчилнэ', stopped: 'Хурд тэг · үргэлжлүүлэхийн тулд нэмнэ үү', quality: 'Дүрслэлийн төсөв', eco: 'Эрчим хүч хэмнэх', balanced: 'Тэнцвэртэй', high: 'Илүү дэлгэрэнгүй', sensors: 'Төхөөрөмжийн хөдөлгөөн', enable: 'Мэдрэгчийг асаах', disable: 'Мэдрэгчийг зогсоох', look: 'Эргэн харах', inspect: 'Харах ба ойрын шалгалт', recenter: 'Төвлөрүүлэх',
    sensorNote: 'Зөвхөн зөвшөөрсний дараа. Хазайлт виртуал камерыг хөдөлгөх боловч одон орны зам, газрын зурагт нөлөөлөхгүй. Чирэх удирдлага хэвээр.', idle: 'Унтраалттай', requesting: 'Зөвшөөрөл хүлээж байна', waiting: 'Мэдрэгчийн өгөгдөл хүлээж байна', active: 'Идэвхтэй', paused: 'Түр зогссон · дахин асаана уу', denied: 'Зөвшөөрөл татгалзсан', unavailable: 'Мэдрэгч байхгүй', insecure: 'HTTPS шаардлагатай', 'no-events': 'Өгөгдөл ирээгүй · чирэх удирдлага ашиглана уу', disposed: 'Унтраалттай', year: 'жил', hour: 'цаг', seconds: 'сек', unknown: '—',
  },
  'mn-Mong-CN': {
    title: 'ᠨᠢᠰᠦᠯᠲᠡ ᠶᠢᠨ ᠬᠡᠮᠵᠢᠭᠦᠷ', speed: 'ᠬᠤᠷᠳᠤ', gamma: 'ᠯᠣᠷᠧᠨᠼ ᠤᠨ ᠢᠯᠲᠡᠭᠡᠭᠴᠢ', sr: 'ᠳᠣᠫᠫᠯᠧᠷ · ᠤᠷᠳᠤ / ᠬᠣᠢᠨ᠎ᠠ', gr: 'ᠲᠠᠲᠠᠯᠴᠠᠯ · ᠴᠠᠭ / ᠳᠠᠪᠲᠠᠮᠵᠢ', cosmos: 'ᠤᠯᠠᠭᠠᠨ ᠰᠢᠯᠵᠢᠯᠲᠡ · z', observer: 'ᠳᠡᠯᠡᠬᠡᠢ ᠶᠢᠨ ᠴᠠᠭ', traveler: 'ᠠᠶᠠᠯᠠᠭᠴᠢ ᠶᠢᠨ ᠴᠠᠭ',
    note: 'ᠴᠠᠭ ᠢ ᠪᠣᠭᠣᠨᠢᠰᠬᠠᠭᠰᠠᠨ ᠦᠵᠡᠭᠦᠯᠦᠯᠭᠡ᠃ ᠲᠣᠭᠲᠠᠮᠠᠯ ᠬᠤᠷᠳᠤ ᠪᠠᠷ ᠴᠠᠭ ᠢ ᠲᠣᠭᠠᠴᠢᠨ᠎ᠠ᠃ ᠴᠠᠭ ᠤᠨ ᠠᠶᠠᠯᠠᠯ ᠪᠣᠯᠣᠨ ᠬᠤᠷᠳᠤᠰᠬᠠᠯ ᠢ ᠣᠷᠣᠭᠤᠯᠬᠤ ᠦᠭᠡᠢ᠃ ᠲᠠᠲᠠᠯᠴᠠᠯ ᠪᠣᠯᠣᠨ ᠰᠢᠯᠵᠢᠯᠲᠡ ᠨᠢ ᠬᠢᠯᠪᠠᠷ ᠵᠠᠭᠪᠤᠷ᠃ ᠪᠣᠳᠠᠲᠤ ᠰᠫᠧᠺᠲᠷ ᠪᠢᠰᠢ᠃',
    stationary: 'ᠵᠣᠭᠰᠣᠵᠤ ᠪᠠᠢᠨ᠎ᠠ', stopped: 'ᠬᠤᠷᠳᠤ ᠨᠡᠮᠡᠭᠡᠷᠡᠢ', quality: 'ᠵᠢᠷᠤᠭᠯᠠᠯ', eco: 'ᠡᠷᠴᠢᠮ ᠬᠦᠴᠦ ᠬᠡᠮᠨᠡᠬᠦ', balanced: 'ᠲᠡᠩᠴᠡᠪᠦᠷᠢ', high: 'ᠳᠡᠯᠭᠡᠷᠡᠩᠭᠦᠢ', sensors: 'ᠲᠥᠭᠥᠭᠡᠷᠦᠮᠵᠢ ᠶᠢᠨ ᠬᠥᠳᠡᠯᠭᠡᠭᠡᠨ', enable: 'ᠮᠡᠳᠡᠷᠡᠭᠴᠢ ᠠᠰᠠᠭᠠᠬᠤ', disable: 'ᠵᠣᠭᠰᠣᠭᠠᠬᠤ', look: 'ᠬᠠᠷᠠᠬᠤ', inspect: 'ᠣᠢᠷ᠎ᠠ ᠰᠢᠯᠭᠠᠬᠤ', recenter: 'ᠲᠥᠪᠯᠡᠷᠡᠭᠦᠯᠬᠦ',
    sensorNote: 'ᠵᠥᠪᠰᠢᠶᠡᠷᠡᠯ ᠢᠶᠡᠷ ᠠᠰᠠᠭᠠᠨ᠎ᠠ᠃ ᠺᠠᠮᠧᠷ ᠢ ᠬᠥᠳᠡᠯᠭᠡᠨ᠎ᠡ᠃ ᠭᠠᠵᠠᠷ ᠤᠨ ᠵᠢᠷᠤᠭ ᠪᠠᠭᠤ ᠵᠠᠮ ᠢ ᠥᠥᠷᠴᠢᠯᠡᠬᠦ ᠦᠭᠡᠢ᠃', idle: 'ᠤᠨᠲᠠᠷᠠᠭᠰᠠᠨ', requesting: 'ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ', waiting: 'ᠮᠡᠳᠡᠭᠡ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ', active: 'ᠠᠰᠠᠭᠰᠠᠨ', paused: 'ᠲᠦᠷ ᠵᠣᠭᠰᠣᠭᠰᠠᠨ', denied: 'ᠵᠥᠪᠰᠢᠶᠡᠷᠡᠭᠰᠡᠨ ᠦᠭᠡᠢ', unavailable: 'ᠮᠡᠳᠡᠷᠡᠭᠴᠢ ᠪᠠᠢᠬᠤ ᠦᠭᠡᠢ', insecure: 'HTTPS ᠬᠡᠷᠡᠭᠲᠡᠢ', 'no-events': 'ᠮᠡᠳᠡᠭᠡ ᠢᠷᠡᠭᠰᠡᠨ ᠦᠭᠡᠢ', disposed: 'ᠤᠨᠲᠠᠷᠠᠭᠰᠠᠨ', year: 'ᠵᠢᠯ', hour: 'ᠴᠠᠭ', seconds: 'ᠰᠧᠺ', unknown: '—',
  },
};
export const instrumentCopy = (language: Language) => copies[language];

export function updateInstruments(host: HTMLElement, snapshot: UniverseSnapshot, language: Language, format: (value: number, digits?: number) => string) {
  const copy = instrumentCopy(language), frame = routeFrame(snapshot), estimate = routeTravelEstimate(snapshot, frame);
  const anchor = frame.objects.find(object => object.id === frame.itinerary[Math.min(frame.leg + 1, frame.itinerary.length - 1)]);
  const duration = (seconds: number) => !Number.isFinite(seconds) ? copy.unknown : seconds >= YEAR_SECONDS
    ? `${format(seconds / YEAR_SECONDS, 2)} ${copy.year}` : seconds >= 3600 ? `${format(seconds / 3600, 2)} ${copy.hour}` : `${format(seconds, 1)} ${copy.seconds}`;
  const values = {
    'flight-speed': `${format(frame.beta * 100, 1)}% c`, 'flight-gamma': `${format(lorentzFactor(frame.beta), 3)}×`,
    'flight-sr': `${format(angularDoppler(frame.beta, 1), 2)} / ${format(angularDoppler(frame.beta, -1), 2)}`,
    'flight-gr': `${format(anchor?.gravitationalFactor ?? 1, 3)}×`,
    'flight-cosmos': format(1 / (anchor?.cosmologicalFactor ?? 1) - 1, 3),
    'flight-observer': duration(estimate.observerSeconds), 'flight-traveler': duration(estimate.travelerSeconds),
    'flight-stationary': snapshot.travelling && snapshot.beta === 0 && snapshot.origin?.destinationId !== snapshot.destinationId ? copy.stopped : !snapshot.travelling ? copy.stationary : '',
  };
  for (const [id, value] of Object.entries(values)) {
    const node = host.querySelector<HTMLElement>(`#${id}`);
    if (node && node.textContent !== value) node.textContent = value;
  }
  const panel = host.querySelector<HTMLElement>('.flight-instruments');
  if (panel) { panel.dataset.beta = String(frame.beta); panel.dataset.cameraAu = frame.cameraAU.join(','); panel.dataset.distanceAu = String(estimate.distanceAU); }
}
