import type { Language } from './locale';

type Need = 'stroller' | 'courier' | 'acrophobia';
type Needs = Record<Need, { label: string; rule: string; icon: string }>;
export const passengerNeeds: Record<Language, Needs> = {
  en: {
    stroller: { label: 'Family with a stroller', rule: 'Strollers need a continuous step-free route: elevators and bridges only.', icon: '👶' },
    courier: { label: 'Express courier', rule: 'The courier keeps moving: bridges and escalators only, no waiting for elevators.', icon: '📦' },
    acrophobia: { label: 'Height-sensitive visitor', rule: 'Stay on floors 1–3. Any connection reaching floor 4 or above is too high.', icon: '🌿' },
  },
  'zh-CN': {
    stroller: { label: '推婴儿车的家庭', rule: '婴儿车需要连续的无障碍路线：只走电梯和连桥。', icon: '👶' },
    courier: { label: '快递员', rule: '快递员要一直前进：只走扶梯和连桥，不等待电梯。', icon: '📦' },
    acrophobia: { label: '怕高的游客', rule: '请留在第 1–3 层；任何到达第 4 层或更高处的连接都太高。', icon: '🌿' },
  },
  ja: {
    stroller: { label: 'ベビーカーの家族', rule: 'ベビーカーは段差のない道へ。エレベーターと橋だけを使います。', icon: '👶' },
    courier: { label: '急ぎの配達員', rule: '配達員は止まらず進みます。橋とエスカレーターを使い、エレベーターは待ちません。', icon: '📦' },
    acrophobia: { label: '高い所が苦手な人', rule: '1～3階に留まります。4階以上に届くパーツは使えません。', icon: '🌿' },
  },
  'mn-Cyrl-MN': {
    stroller: { label: 'Хүүхдийн тэрэгтэй гэр бүл', rule: 'Хүүхдийн тэрэг зөвхөн цахилгаан шат, гүүрээр тасралтгүй явна.', icon: '👶' },
    courier: { label: 'Шуурхай хүргэгч', rule: 'Хүргэгч зөвхөн урсдаг шат, гүүр хэрэглэнэ. Цахилгаан шат хүлээхгүй.', icon: '📦' },
    acrophobia: { label: 'Өндрөөс эмээдэг зочин', rule: '1–3-р давхарт байгаарай. 4-р давхар болон түүнээс дээш хүрэх холбоосыг хэрэглэхгүй.', icon: '🌿' },
  },
  'mn-Mong-CN': {
    stroller: { label: 'ᠬᠡᠦᠬᠡᠳ ᠦᠨ ᠲᠡᠷᠭᠡᠲᠡᠢ ᠭᠡᠷ ᠪᠦᠯᠢ', rule: 'ᠬᠡᠦᠬᠡᠳ ᠦᠨ ᠲᠡᠷᠭᠡ ᠵᠥᠪᠬᠡᠨ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ᠂ ᠭᠦᠭᠦᠷᠭᠡ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃', icon: '👶' },
    courier: { label: 'ᠲᠦᠷᠭᠡᠨ ᠬᠦᠷᠭᠡᠭᠴᠢ', rule: 'ᠬᠦᠷᠭᠡᠭᠴᠢ ᠤᠷᠤᠰᠳᠠᠭ ᠰᠢᠲᠤ᠂ ᠭᠦᠭᠦᠷᠭᠡ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠬᠦᠯᠢᠶᠡᠬᠦᠭᠦᠢ᠃', icon: '📦' },
    acrophobia: { label: 'ᠥᠨᠳᠥᠷ ᠡᠴᠡ ᠡᠮᠡᠭᠡᠳᠡᠭ ᠵᠣᠴᠢᠨ', rule: '1–3 ᠳᠠᠪᠬᠤᠷ ᠲᠤ ᠪᠠᠢ᠃ 4 ᠳᠠᠪᠬᠤᠷ ᠪᠠ ᠲᠡᠭᠦᠨ ᠡᠴᠡ ᠳᠡᠭᠡᠭᠦᠷ ᠣᠴᠢᠬᠤ ᠵᠠᠮ ᠢ ᠬᠡᠷᠡᠭᠯᠡᠬᠦᠭᠦᠢ᠃', icon: '🌿' },
  },
};

type SkyCopy = { group1: string; group2: string; front: string; middle: string; rear: string; depth: string; help: string; rules: string; allDone: string; footer: string; tour: string; special: string };
export const skyCopy: Record<Language, SkyCopy> = {
  en: { group1: 'Group 1 · Sunlit Mall', group2: 'Group 2 · Aurora Atrium', front: 'Front · F', middle: 'Middle · M', rear: 'Rear · R', depth: 'Depth deck', help: 'Choose a depth deck to select its landings. Keep your first landing selected, switch decks, then tap the end to build into the screen.', rules: 'F / M / R identify front, middle and rear. Bridges span one column OR one depth deck, level. Short / long escalators span one / two columns OR depth decks and one floor; never diagonally across both. Elevators stay at the same column and depth. Crossings at different depths do not connect or collide.', allDone: 'All forty journeys connected. Return to either building and create another beautiful day.', footer: 'Two original buildings · forty handmade journeys · no timers', tour: 'Successful journeys gently orbit the building. Drag the view to take over the camera.', special: 'A passenger needs a different kind of route. Check their shopping-list details.' },
  'zh-CN': { group1: '第 1 组 · 阳光商场', group2: '第 2 组 · 极光中庭', front: '前区 · F', middle: '中区 · M', rear: '后区 · R', depth: '进深区域', help: '选择一个进深区域来点击平台。保留起点，再切换区域点击终点，就能向屏幕深处搭建。', rules: 'F / M / R 表示前区、中区、后区。连桥水平跨一列或一个进深区。短 / 长扶梯跨一 / 两列或进深区，同时升降一层，不能同时沿列和进深斜跨。电梯保持同一列和进深。不同进深的交叉不会连接或碰撞。', allDone: '四十段旅程都连通啦。回到任一建筑，再创造美好的一天吧。', footer: '两座原创建筑 · 四十个手工关卡 · 无倒计时', tour: '路线全部连通时，视角会轻轻环绕建筑。拖动即可接管镜头。', special: '有乘客需要不同类型的路线，请查看购物清单中的详细说明。' },
  ja: { group1: '第1組 · 陽だまりの商場', group2: '第2組 · オーロラ・アトリウム', front: '手前 · F', middle: '中央 · M', rear: '奥 · R', depth: '奥行きデッキ', help: 'デッキを選んで踊り場を押そう。出発を選んだままデッキを切り替え、到着を押すと奥へつながります。', rules: 'F / M / R は手前・中央・奥。橋は横か奥行きに1マス、同じ階でつなぎます。短い / 長いエスカレーターは横か奥行きに1 / 2マス、上下1階。両方の軸を斜めに渡れません。エレベーターは同じ列・奥行き。異なる奥行きの交差はつながりません。', allDone: '40の旅がつながりました。どちらの建物でも、また素敵な一日を。', footer: '2つのオリジナル建物 · 40の手作りパズル · 時間制限なし', tour: '全ルートがつながると、カメラがゆっくり回ります。ドラッグで操作を引き継げます。', special: '別の種類の道が必要なお客さんがいます。買い物リストの詳細を見よう。' },
  'mn-Cyrl-MN': { group1: '1-р бүлэг · Нарлаг худалдааны төв', group2: '2-р бүлэг · Туйлын туяаны тосгуур', front: 'Урд · F', middle: 'Дунд · M', rear: 'Ард · R', depth: 'Гүний тавцан', help: 'Тавцан сонгоод буудлаа дар. Эхлэлийг сонгосны дараа гүний тавцанг сольж төгсгөлийг дарж болно.', rules: 'F / M / R нь урд, дунд, арын тавцан. Гүүр нэг багана эсвэл нэг гүний тавцан дамнана. Богино / урт урсдаг шат нэг / хоёр багана эсвэл гүний тавцан, нэг давхар дамнана. Хоёр хэвтээ тэнхлэгээр зэрэг ташуу явж болохгүй. Цахилгаан шат ижил багана, гүнд байна.', allDone: 'Дөчин аялал холбогдлоо. Аль ч барилгадаа дахин сайхан өдөр бүтээгээрэй.', footer: 'Хоёр барилга · дөчин гар хийцийн аялал · хугацааны хязгааргүй', tour: 'Бүх зам бэлэн бол камер аажмаар эргэнэ. Чирж өөрөө удирдаарай.', special: 'Зочинд өөр төрлийн зам хэрэгтэй. Худалдан авах жагсаалтын тайлбарыг үзээрэй.' },
  'mn-Mong-CN': { group1: '1 · ᠨᠠᠷᠠᠯᠢᠭ ᠬᠤᠳᠠᠯᠳᠤᠭ᠎ᠠ ᠨᠤ ᠲᠥᠪ', group2: '2 · ᠲᠤᠢᠯ ᠤᠨ ᠲᠤᠶᠠᠨ ᠤ ᠲᠣᠰᠤᠭᠤᠷ', front: 'ᠤᠷᠳᠤ · F', middle: 'ᠳᠤᠮᠳᠠ · M', rear: 'ᠠᠷᠤ · R', depth: 'ᠭᠦᠨ ᠦ ᠲᠠᠪᠴᠠᠩ', help: 'ᠡᠬᠢᠯᠡᠯ ᠢ ᠰᠣᠩᠭᠣ᠃ ᠭᠦᠨ ᠦ ᠲᠠᠪᠴᠠᠩ ᠢ ᠰᠣᠯᠢᠭᠠᠳ ᠲᠡᠭᠦᠰᠬᠡᠯ ᠢ ᠳᠠᠷᠤ᠃', rules: 'F / M / R · ᠤᠷᠳᠤ᠂ ᠳᠤᠮᠳᠠ᠂ ᠠᠷᠤ᠃ ᠭᠦᠭᠦᠷᠭᠡ ᠨᠢᠭᠡ ᠪᠠᠭᠠᠨ᠎ᠠ ᠡᠰᠡᠪᠡᠯ ᠨᠢᠭᠡ ᠭᠦᠨ ᠦ ᠲᠠᠪᠴᠠᠩ ᠢ ᠬᠣᠯᠪᠣᠨ᠎ᠠ᠃ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠢᠵᠢᠯ ᠪᠠᠭᠠᠨ᠎ᠠ᠂ ᠭᠦᠨ ᠳᠦ ᠪᠠᠢᠨ᠎ᠠ᠃', allDone: 'ᠳᠥᠴᠢᠨ ᠠᠶᠠᠯᠠᠯ ᠬᠣᠯᠪᠣᠭᠳᠠᠯ᠎ᠠ᠃ ᠳᠠᠬᠢᠵᠤ ᠰᠠᠢᠬᠠᠨ ᠡᠳᠦᠷ ᠪᠦᠲᠦᠭᠡᠭᠡᠷᠡᠢ᠃', footer: 'ᠬᠣᠶᠠᠷ ᠪᠠᠷᠢᠯᠭ᠎ᠠ · ᠳᠥᠴᠢᠨ ᠠᠶᠠᠯᠠᠯ · ᠴᠠᠭ ᠤᠨ ᠬᠢᠵᠠᠭᠠᠷ ᠦᠭᠡᠢ', tour: 'ᠪᠦᠬᠦ ᠵᠠᠮ ᠪᠡᠯᠡᠨ ᠪᠣᠯ ᠺᠠᠮᠧᠷ ᠠᠭᠠᠵᠢᠮ ᠡᠷᠭᠢᠨ᠎ᠡ᠃', special: 'ᠵᠣᠴᠢᠨ ᠳᠤ ᠥᠭᠡᠷ᠎ᠡ ᠵᠠᠮ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃ ᠲᠠᠢᠯᠪᠤᠷᠢ ᠢ ᠦᠵᠡᠭᠡᠷᠡᠢ᠃' },
};
