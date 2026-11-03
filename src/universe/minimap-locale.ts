import type { Language } from '../rush/locale';
import { destinationName } from './locale';
import type { MapScope } from './minimap';

type Row = readonly [string, string, string, string, string];
const index: Record<Language, number> = { en: 0, 'zh-CN': 1, ja: 2, 'mn-Cyrl-MN': 3, 'mn-Mong-CN': 4 };
const text = {
  title: ['Navigation map', '航行地图', '航行マップ', 'Аяллын газрын зураг', 'ᠠᠶᠠᠯᠠᠯ ᠤᠨ ᠭᠠᠵᠠᠷ ᠤᠨ ᠵᠢᠷᠤᠭ'],
  scope: ['Map scope', '地图范围', '地図の範囲', 'Зургийн хүрээ', 'ᠵᠢᠷᠤᠭ ᠤᠨ ᠬᠦᠷᠢᠶ᠎ᠡ'],
  adaptive: ['Journey · adaptive', '旅程范围·自适应', '経路に合わせる', 'Маршрут · автомат', 'ᠵᠠᠮ · ᠠᠦ᠋ᠲ᠋ᠣᠮᠠᠲ'],
  nearby: ['Around our location', '当前位置周围', '現在地の周辺', 'Одоогийн байрлал орчим', 'ᠣᠳᠣᠬᠢ ᠪᠠᠶᠢᠷᠢ ᠶᠢᠨ ᠣᠷᠴᠢᠮ'],
  earthMoon: ['Earth–Moon system', '地月系统', '地球と月', 'Дэлхий–Сар', 'ᠳᠡᠯᠡᠬᠡᠢ–ᠰᠠᠷᠠ'],
  solar: ['Solar System', '太阳系', '太陽系', 'Нарны аймаг', 'ᠨᠠᠷᠠᠨ ᠤ ᠠᠶᠢᠮᠠᠭ'],
  milkyWay: ['Milky Way', '银河系', '天の川銀河', 'Сүүн зам', 'ᠰᠦᠨ ᠵᠠᠮ'],
  localGroup: ['Local Group', '本星系群', '局所銀河群', 'Орон нутгийн бүлэг', 'ᠣᠷᠣᠨ ᠨᠤᠲᠤᠭ ᠤᠨ ᠪᠦᠯᠦᠭ'],
  virgo: ['Virgo Supercluster', '室女座超星系团', 'おとめ座超銀河団', 'Охины хэт бөөгнөрөл', 'ᠣᠬᠢᠨ ᠤ ᠬᠡᠲᠦ ᠪᠥᠭᠡᠭᠨᠡᠷᠡᠯ'],
  laniakea: ['Laniakea', '拉尼亚凯亚超星系团', 'ラニアケア超銀河団', 'Ланиакеа', 'ᠯᠠᠨᠢᠠᠺᠡᠠ'],
  universe: ['Observable universe · era sketch', '可观测宇宙·时代示意', '観測可能な宇宙・時代の模式図', 'Ажиглагдах ертөнц · эрин', 'ᠠᠵᠢᠭᠯᠠᠵᠤ ᠪᠣᠯᠬᠤ ᠣᠷᠴᠢᠯᠠᠩ · ᠡᠷᠢᠨ'],
  radius: ['Radius (light-years)', '半径（光年）', '半径（光年）', 'Радиус (гэрлийн жил)', 'ᠷᠠᠳᠢᠦᠰ (ᠭᠡᠷᠡᠯ ᠦᠨ ᠵᠢᠯ)'],
  location: ['We are here', '我们在这里', '現在地', 'Бид энд байна', 'ᠪᠢᠳᠡ ᠡᠨᠳᠡ ᠪᠠᠶᠢᠨ᠎ᠠ'],
  outside: ['Our location is outside this scope ↗', '当前位置在此范围之外 ↗', '現在地はこの範囲の外 ↗', 'Бид энэ хүрээний гадна ↗', 'ᠪᠢᠳᠡ ᠡᠨᠡ ᠬᠦᠷᠢᠶ᠎ᠡ ᠶᠢᠨ ᠭᠠᠳᠠᠨ᠎ᠠ ↗'],
  plane: ['Ecliptic XY projection · depth omitted', '黄道XY投影·省略纵深', '黄道XY投影・奥行きは省略', 'Шар замын XY · гүнийг орхисон', 'ᠰᠢᠷ᠎ᠠ ᠵᠠᠮ ᠤᠨ XY · ᠭᠦᠨ ᠢ ᠣᠷᠬᠢᠪᠠ'],
  anchors: ['Hollow: inferred / future anchors', '空心：推断区域或未来锚点', '白抜き：推定・未来の基準点', 'Хоосон: таамаг / ирээдүйн тулгуур', 'ᠬᠣᠭᠣᠰᠣᠨ: ᠲᠠᠭᠠᠮᠠᠭ / ᠢᠷᠡᠭᠡᠳᠦᠶ'],
  empty: ['No catalogue objects in this scope', '此范围内没有星表天体', 'この範囲に星表の天体はありません', 'Энэ хүрээнд каталогийн биет алга', 'ᠡᠨᠡ ᠬᠦᠷᠢᠶ᠎ᠡ ᠳᠦ ᠪᠢᠶᠡᠲᠡ ᠠᠯᠭ᠎ᠠ'],
  span: ['Map width', '地图宽度', '地図の幅', 'Зургийн өргөн', 'ᠵᠢᠷᠤᠭ ᠤᠨ ᠥᠷᠭᠡᠨ'],
  unknown: ['Beyond the observable horizon is unknown; this is not an edge of all space.', '可观测视界之外未知；这不是整个空间的边缘。', '観測の地平線の外は不明です。全空間の端ではありません。', 'Ажиглагдах хаяаны цаана үл мэдэгдэнэ; бүх орон зайн зах биш.', 'ᠠᠵᠢᠭᠯᠠᠬᠤ ᠬᠠᠶᠠᠭ᠎ᠠ ᠶᠢᠨ ᠴᠠᠭᠠᠨ᠎ᠠ ᠦᠯᠦ ᠮᠡᠳᠡᠭᠳᠡᠨ᠎ᠡ᠃ ᠪᠦᠬᠦ ᠣᠷᠣᠨ ᠵᠠᠢ ᠶᠢᠨ ᠵᠠᠬ᠎ᠠ ᠪᠢᠰᠢ᠃'],
  note: ['The map shares the journey’s AU coordinates. Distances use a linear XY projection; dots are enlarged and depth is omitted. Adaptive bounds include the guided path, not just endpoints. Fixed scopes are approximate viewing windows, not exact membership boundaries. The universe view shows a present 46.5-billion-light-year horizon, rescaled by our toy expansion for other eras—not a calculated past/future particle horizon. Unformed objects are hollow future anchors; beyond the observable universe remains unknown. Sparse catalogue markers are not a complete census.', '地图与旅程共享天文单位坐标。距离采用线性XY投影；光点放大并省略纵深。自适应范围涵盖完整导览路线，而非仅含起终点。固定范围是近似观察窗口，不是精确成员边界。宇宙视图采用现今465亿光年视界，其他时代按简化膨胀模型缩放，并非计算出的过去或未来粒子视界。未形成天体用空心未来锚点表示；可观测宇宙之外仍未知。稀疏星表标记并非完整普查。', '地図は旅と同じAU座標を使い、距離は線形XY投影です。点は拡大し、奥行きは省略します。自動範囲には経路全体を含みます。固定範囲は近似的な観測窓で、所属の厳密な境界ではありません。宇宙図は現在の465億光年の地平線を他の時代の簡易膨張で拡縮し、過去・未来の粒子地平線の計算ではありません。未形成の天体は白抜きの未来基準点。観測範囲外は不明で、星表は完全な一覧ではありません。', 'Зураг аяллын AU координатыг ашиглана. Зай шугаман XY проекцтой; цэгийг томруулж, гүнийг орхисон. Автомат хүрээ бүх маршрутыг хамарна. Тогтмол хүрээ нь ойролцоо харах цонх, гишүүнчлэлийн нарийн хил биш. Ертөнцийн зураг өнөөгийн 46.5 тэрбум гэрлийн жилийн хаяаг бусад эринд хялбаршуулсан тэлэлтээр өөрчилнө; бодит эртний/ирээдүйн бөөмийн хаяаг тооцоолоогүй. Үүсээгүй биет хоосон тулгуур; цаадах нь үл мэдэгдэнэ. Каталог бүрэн биш.', 'ᠵᠢᠷᠤᠭ ᠠᠶᠠᠯᠠᠯ ᠤᠨ AU ᠪᠠᠶᠢᠷᠢ ᠶᠢ ᠠᠰᠢᠭᠯᠠᠨ᠎ᠠ᠃ XY ᠳᠦ ᠭᠦᠨ ᠢ ᠣᠷᠬᠢᠵᠠᠢ᠃ ᠠᠦ᠋ᠲ᠋ᠣᠮᠠᠲ ᠬᠦᠷᠢᠶ᠎ᠡ ᠪᠦᠬᠦ ᠵᠠᠮ ᠢ ᠬᠠᠮᠤᠷᠤᠨ᠎ᠠ᠃ ᠲᠣᠭᠲᠠᠮᠠᠯ ᠬᠦᠷᠢᠶ᠎ᠡ ᠨᠢ ᠣᠶᠢᠷᠠᠯᠴᠠᠭ᠎ᠠ ᠴᠣᠩᠬᠣ᠃ ᠣᠷᠴᠢᠯᠠᠩ ᠤᠨ ᠵᠢᠷᠤᠭ ᠨᠢ ᠣᠳᠣᠬᠢ 46.5 ᠲᠡᠷᠪᠤᠮ ᠭᠡᠷᠡᠯ ᠦᠨ ᠵᠢᠯ ᠦᠨ ᠬᠠᠶᠠᠭ᠎ᠠ ᠶᠢ ᠡᠩ ᠦᠨ ᠵᠠᠭᠪᠤᠷ ᠪᠠᠷ ᠬᠤᠪᠢᠷᠠᠭᠤᠯᠵᠠᠢ᠃ ᠢᠷᠡᠭᠡᠳᠦᠶ ᠶᠢᠨ ᠪᠣᠳᠠᠲᠤ ᠬᠠᠶᠠᠭ᠎ᠠ ᠪᠢᠰᠢ᠃ ᠦᠭᠦᠰᠦᠭᠡᠳᠦᠢ ᠪᠢᠶᠡᠲᠡ ᠬᠣᠭᠣᠰᠣᠨ ᠲᠤᠯᠭᠤᠭᠤᠷ᠃ ᠬᠠᠶᠠᠭ᠎ᠠ ᠶᠢᠨ ᠴᠠᠭᠠᠨ᠎ᠠ ᠦᠯᠦ ᠮᠡᠳᠡᠭᠳᠡᠨ᠎ᠡ᠃'],
} satisfies Record<string, Row>;

const names = {
  m33: ['Triangulum · M33', '三角座星系 · M33', 'さんかく座銀河 · M33', 'Гурвалжин · M33', 'ᠭᠤᠷᠪᠠᠯᠵᠢᠨ · M33'],
  smc: ['Small Magellanic Cloud', '小麦哲伦云', '小マゼラン雲', 'Бага Магелланы үүл', 'ᠪᠠᠭ᠎ᠠ ᠮᠠᠭᠡᠯᠯᠠᠨ ᠤ ᠡᠭᠦᠯᠡ'],
  'virgo-cluster': ['Virgo Cluster · M87', '室女座星系团 · M87', 'おとめ座銀河団 · M87', 'Охины бөөгнөрөл · M87', 'ᠣᠬᠢᠨ ᠤ ᠪᠥᠭᠡᠭᠨᠡᠷᠡᠯ · M87'],
  'norma-cluster': ['Norma Cluster · Great Attractor region', '矩尺座星系团·巨引源区域', 'じょうぎ座銀河団・巨大引力源の領域', 'Шугамын бөөгнөрөл · Их татагч', 'ᠨᠣᠷᠮᠠ ᠶᠢᠨ ᠪᠥᠭᠡᠭᠨᠡᠷᠡᠯ'],
  'centaurus-cluster': ['Centaurus Cluster', '半人马座星系团', 'ケンタウルス座銀河団', 'Кентаврын бөөгнөрөл', 'ᠺᠡᠨᠲ᠋ᠠᠦᠷ ᠤᠨ ᠪᠥᠭᠡᠭᠨᠡᠷᠡᠯ'],
  'hydra-cluster': ['Hydra Cluster', '长蛇座星系团', 'うみへび座銀河団', 'Усны могойн бөөгнөрөл', 'ᠤᠰᠤᠨ ᠮᠣᠭᠣᠢ ᠶᠢᠨ ᠪᠥᠭᠡᠭᠨᠡᠷᠡᠯ'],
} satisfies Record<string, Row>;

export function mapCopy(language: Language) {
  return Object.fromEntries(Object.entries(text).map(([key, row]) => [key, row[index[language]]])) as Record<keyof typeof text, string>;
}
export function mapScopeName(scope: MapScope, language: Language): string {
  const keys = { adaptive: 'adaptive', nearby: 'nearby', 'earth-moon': 'earthMoon', solar: 'solar', 'milky-way': 'milkyWay', 'local-group': 'localGroup', virgo: 'virgo', laniakea: 'laniakea', universe: 'universe' } as const;
  return mapCopy(language)[keys[scope]];
}
export function mapObjectName(id: string, language: Language): string {
  return Object.prototype.hasOwnProperty.call(names, id) ? names[id as keyof typeof names][index[language]] : destinationName(id, language);
}
