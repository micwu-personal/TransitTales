import type { Language } from '../rush/locale';

const en = {
  groups: 'Learning routes', foundations: 'Foundations', rhythm: 'Rhythm', harmony: 'Harmony', ensemble: 'Ensemble',
  notation: 'Notation', print: 'Professional print', handwritten: 'Standard handwriting',
  part: 'Staff', tone: 'Chord tone', primaryTone: 'First tone', addTone: 'Add chord tone', removeTone: 'Remove chord tone', addPart: 'Add staff', removePart: 'Remove staff',
  dynamics: 'Score dynamics', eventDynamic: 'Note dynamics', inheritDynamic: 'Follow previous marking / score', repeat: 'Repeat the whole score twice',
  triplet: 'Triplet group (3:2)', tripletHelp: 'Three adjacent notes share one duration and fit into the time of two. Start from the selected note; an existing triplet is edited together.',
  gesture: 'Click a note to select. Drag up or down to change pitch. On touch, hold before dragging; hold still for note controls. ↑ / ↓ also change pitch.',
  controls: 'Note controls', close: 'Close controls', openControls: 'More note controls',
  tuplet: 'Complete triplets in groups of three with equal durations; use the triplet checkbox.', voices: 'All staves must end together. Add notes or adjust durations on the shorter staff.',
  railway: 'Pitch shapes the track; chords travel together, each staff has its own route. Rhythm spaces departures and dynamics shape their strength.',
  targetPrivate: 'Listening only — the target score stays hidden until you choose to reveal it.', playingEvent: 'Playing note',
};
type AdvancedCopy = typeof en;
const zh: AdvancedCopy = {
  groups:'学习路线', foundations:'基础', rhythm:'节奏', harmony:'和声', ensemble:'合奏', notation:'谱面风格', print:'专业印刷谱', handwritten:'标准手写谱',
  part:'声部谱表', tone:'和弦音', primaryTone:'首音', addTone:'添加和弦音', removeTone:'移除和弦音', addPart:'添加谱表', removePart:'移除谱表',
  dynamics:'全曲力度', eventDynamic:'音符力度', inheritDynamic:'延续前一力度／全曲力度', repeat:'全曲重复演奏两遍', triplet:'三连音组（3:2）',
  tripletHelp:'相邻三个音符使用相同时值，在两个音符的时间内演奏。从选中的音符开始；已有三连音组会一起修改。',
  gesture:'点击音符可选中，上下拖拽可改变音高。触屏请长按后拖动，长按不动可打开音符控制。↑／↓ 也可改变音高。',
  controls:'音符控制', close:'关闭控制', openControls:'更多音符控制', tuplet:'请以三个相同时值的音符组成完整三连音组，可使用三连音复选框。', voices:'各谱表须同时结束，请为较短声部添加音符或调整时值。',
  railway:'音高塑造轨道，和弦一起出发，每个声部各有路线。节奏决定发车间距，力度决定表现强弱。', targetPrivate:'仅聆听——目标谱面保持隐藏，直到你手动展开。', playingEvent:'正在演奏音符',
};
const ja: AdvancedCopy = {
  groups:'学習ルート', foundations:'基礎', rhythm:'リズム', harmony:'和声', ensemble:'合奏', notation:'楽譜のスタイル', print:'標準の印刷譜', handwritten:'標準の手書き譜',
  part:'譜表', tone:'和音の構成音', primaryTone:'最初の音', addTone:'和音の音を追加', removeTone:'和音の音を削除', addPart:'譜表を追加', removePart:'譜表を削除',
  dynamics:'全体の強弱', eventDynamic:'音符の強弱', inheritDynamic:'前の強弱／全体に従う', repeat:'全曲を2回繰り返す', triplet:'3連符の組（3:2）',
  tripletHelp:'隣り合う3音を同じ音価で、2音分の時間に演奏します。選択した音から作成し、既存の3連符は組全体を編集します。',
  gesture:'音符をクリックして選択し、上下にドラッグして音高を変更します。タッチ操作は長押し後にドラッグ。動かさず長押しすると音符設定を開きます。↑／↓でも音高を変更できます。',
  controls:'音符の設定', close:'設定を閉じる', openControls:'音符の詳細設定', tuplet:'同じ音価の3音で3連符を完成させてください。3連符のチェックボックスを使えます。', voices:'すべての譜表を同時に終えてください。短い声部に音符を追加するか音価を調整します。',
  railway:'音高が線路を形作り、和音は一緒に出発し、各声部に別のルートがあります。リズムが発車間隔を、強弱が表情を決めます。', targetPrivate:'聴くだけなら目標の楽譜は表示されません。自分で表示を選べます。', playingEvent:'演奏中の音符',
};
const mn: AdvancedCopy = {
  groups:'Суралцах замууд', foundations:'Суурь', rhythm:'Хэмнэл', harmony:'Гармони', ensemble:'Хамтлаг', notation:'Нотны бичлэг', print:'Мэргэжлийн хэвлэмэл', handwritten:'Стандарт гар бичлэг',
  part:'Нотны шугам', tone:'Аккордын авиа', primaryTone:'Эхний авиа', addTone:'Аккордын авиа нэмэх', removeTone:'Аккордын авиа хасах', addPart:'Нотны шугам нэмэх', removePart:'Нотны шугам хасах',
  dynamics:'Бүтээлийн хүч', eventDynamic:'Нотны хүч', inheritDynamic:'Бүтээлийг дагах', repeat:'Бүтээлийг бүхэлд нь хоёр удаа тоглох', triplet:'Триоль бүлэг (3:2)',
  tripletHelp:'Зэрэгцээ гурван нот ижил урттай бөгөөд хоёр нотны хугацаанд тоглогдоно. Сонгосон нотноос эхэлнэ; байгаа триолийг бүлгээр нь засна.',
  gesture:'Нотыг дарж сонгоно. Дээш доош чирж өндрийг өөрчилнө. Мэдрэгч дэлгэц дээр удаан дарсны дараа чирнэ; хөдөлгөхгүй удаан дарвал тохиргоо нээгдэнэ. ↑ / ↓ мөн өндрийг өөрчилнө.',
  controls:'Нотны тохиргоо', close:'Тохиргоог хаах', openControls:'Нотны нэмэлт тохиргоо', tuplet:'Ижил урттай гурван нотоор бүтэн триоль үүсгэнэ үү. Триолийн сонголтыг ашиглаарай.', voices:'Бүх шугам зэрэг дуусах ёстой. Богино хоолойд нот нэмэх эсвэл уртыг нь өөрчилнө үү.',
  railway:'Өндөр нь замыг хэлбэржүүлж, аккорд хамт хөдөлж, хоолой бүр өөр замтай байна. Хэмнэл нь хөдлөх зайг, хүч нь илэрхийллийг тогтооно.', targetPrivate:'Зөвхөн сонсож байна — зорилтот нотыг та өөрөө нээх хүртэл нуусан хэвээр байна.', playingEvent:'Тоглож буй нот',
};
const mong: AdvancedCopy = {
  groups:'ᠰᠤᠷᠤᠯᠴᠠᠬᠤ ᠵᠠᠮ', foundations:'ᠰᠠᠭᠤᠷᠢ', rhythm:'ᠬᠡᠮᠨᠡᠯ', harmony:'ᠨᠠᠶᠢᠷᠠᠯ', ensemble:'ᠬᠠᠮᠲᠤ ᠲᠣᠭᠯᠠᠬᠤ', notation:'ᠨᠣᠲ᠋ ᠪᠢᠴᠢᠯᠭᠡ', print:'ᠬᠡᠪᠯᠡᠮᠡᠯ ᠨᠣᠲ᠋', handwritten:'ᠭᠠᠷ ᠪᠢᠴᠢᠮᠡᠯ ᠨᠣᠲ᠋',
  part:'ᠨᠣᠲ᠋ ᠤᠨ ᠱᠤᠭᠤᠮ', tone:'ᠨᠠᠶᠢᠷᠠᠯ ᠤᠨ ᠠᠪᠢᠶ᠎ᠠ', primaryTone:'ᠡᠬᠢᠨ ᠦ ᠠᠪᠢᠶ᠎ᠠ', addTone:'ᠠᠪᠢᠶ᠎ᠠ ᠨᠡᠮᠡᠬᠦ', removeTone:'ᠠᠪᠢᠶ᠎ᠠ ᠬᠠᠰᠤᠬᠤ', addPart:'ᠱᠤᠭᠤᠮ ᠨᠡᠮᠡᠬᠦ', removePart:'ᠱᠤᠭᠤᠮ ᠬᠠᠰᠤᠬᠤ',
  dynamics:'ᠠᠶ᠎ᠠ ᠶᠢᠨ ᠬᠦᠴᠦ', eventDynamic:'ᠨᠣᠲ᠋ ᠤᠨ ᠬᠦᠴᠦ', inheritDynamic:'ᠠᠶ᠎ᠠ ᠪᠠᠨ ᠳᠠᠭᠠᠬᠤ', repeat:'ᠪᠦᠬᠦ ᠠᠶ᠎ᠠ ᠶᠢ ᠬᠣᠶᠠᠷ ᠤᠳᠠᠭ᠎ᠠ ᠲᠣᠭᠯᠠᠬᠤ', triplet:'ᠭᠤᠷᠪᠠᠯ ᠪᠦᠯᠦᠭ (3:2)',
  tripletHelp:'ᠵᠡᠷᠭᠡᠴᠡᠭᠡ ᠭᠤᠷᠪᠠᠨ ᠨᠣᠲ᠋ ᠠᠳᠠᠯᠢ ᠤᠷᠲᠤ ᠲᠠᠢ ᠪᠠᠶᠢᠵᠤ ᠬᠣᠶᠠᠷ ᠨᠣᠲ᠋ ᠤᠨ ᠴᠠᠭ ᠲᠤ ᠲᠣᠭᠯᠠᠨ᠎ᠠ᠃ ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠨᠣᠲ᠋ ᠠᠴᠠ ᠡᠬᠢᠯᠡᠨ᠎ᠡ᠃ ᠪᠠᠶᠢᠭ᠎ᠠ ᠪᠦᠯᠦᠭ ᠢ ᠬᠠᠮᠲᠤ ᠵᠠᠰᠠᠨ᠎ᠠ᠃',
  gesture:'ᠨᠣᠲ᠋ ᠢ ᠳᠠᠷᠤᠵᠤ ᠰᠣᠩᠭᠣᠨ᠎ᠠ᠃ ᠳᠡᠭᠡᠭᠰᠢ ᠳᠣᠷᠣᠭᠰᠢ ᠴᠢᠷᠴᠦ ᠥᠨᠳᠥᠷ ᠢ ᠥᠥᠷᠴᠢᠯᠡᠨ᠎ᠡ᠃ ᠬᠦᠷᠦᠯᠴᠡᠬᠦ ᠳᠡᠯᠭᠡᠴᠡ ᠳᠡᠭᠡᠷ᠎ᠡ ᠤᠳᠠᠭᠠᠨ ᠳᠠᠷᠤᠭᠰᠠᠨ ᠤ ᠳᠠᠷᠠᠭ᠎ᠠ ᠴᠢᠷᠡᠨ᠎ᠡ᠃ ᠬᠥᠳᠡᠯᠭᠡᠬᠦ ᠦᠭᠡᠢ ᠤᠳᠠᠭᠠᠨ ᠳᠠᠷᠤᠪᠠᠯ ᠲᠣᠬᠢᠷᠠᠭᠤᠯᠭ᠎ᠠ ᠨᠡᠭᠡᠭᠳᠡᠨ᠎ᠡ᠃ ↑ / ↓ ᠪᠠᠰᠠ ᠥᠨᠳᠥᠷ ᠢ ᠥᠥᠷᠴᠢᠯᠡᠨ᠎ᠡ᠃',
  controls:'ᠨᠣᠲ᠋ ᠤᠨ ᠲᠣᠬᠢᠷᠠᠭᠤᠯᠭ᠎ᠠ', close:'ᠲᠣᠬᠢᠷᠠᠭᠤᠯᠭ᠎ᠠ ᠶᠢ ᠬᠠᠭᠠᠬᠤ', openControls:'ᠨᠣᠲ᠋ ᠤᠨ ᠨᠡᠮᠡᠯᠲᠡ ᠲᠣᠬᠢᠷᠠᠭᠤᠯᠭ᠎ᠠ',
  tuplet:'ᠠᠳᠠᠯᠢ ᠤᠷᠲᠤ ᠲᠠᠢ ᠭᠤᠷᠪᠠᠨ ᠨᠣᠲ᠋ ᠢᠶᠠᠷ ᠪᠦᠷᠢᠨ ᠭᠤᠷᠪᠠᠯ ᠪᠦᠯᠦᠭ ᠦᠦᠰᠭᠡᠭᠡᠷᠡᠢ᠃ ᠭᠤᠷᠪᠠᠯ ᠤᠨ ᠰᠣᠩᠭᠣᠯᠲᠠ ᠶᠢ ᠬᠡᠷᠡᠭᠯᠡᠭᠡᠷᠡᠢ᠃',
  voices:'ᠪᠦᠬᠦ ᠱᠤᠭᠤᠮ ᠵᠡᠷᠭᠡ ᠳᠠᠭᠤᠰᠬᠤ ᠶᠣᠰᠣᠲᠠᠢ᠃ ᠪᠣᠭᠣᠨᠢ ᠬᠣᠭᠣᠯᠠᠢ ᠳᠤ ᠨᠣᠲ᠋ ᠨᠡᠮᠡᠬᠦ ᠪᠤᠶᠤ ᠤᠷᠲᠤ ᠶᠢ ᠥᠥᠷᠴᠢᠯᠡᠭᠡᠷᠡᠢ᠃',
  railway:'ᠥᠨᠳᠥᠷ ᠵᠠᠮ ᠢ ᠬᠡᠯᠪᠡᠷᠢᠵᠡᠭᠦᠯᠵᠦ ᠨᠠᠶᠢᠷᠠᠯ ᠬᠠᠮᠲᠤ ᠬᠥᠳᠡᠯᠦᠨ᠎ᠡ᠃ ᠬᠣᠭᠣᠯᠠᠢ ᠪᠦᠷᠢ ᠥᠪᠡᠷ ᠦᠨ ᠵᠠᠮ ᠲᠠᠢ᠃ ᠬᠡᠮᠨᠡᠯ ᠬᠥᠳᠡᠯᠬᠦ ᠵᠠᠢ ᠶᠢ᠂ ᠬᠦᠴᠦ ᠢᠯᠡᠷᠬᠡᠶᠢᠯᠡᠯ ᠢ ᠲᠣᠭᠲᠠᠭᠠᠨ᠎ᠠ᠃',
  targetPrivate:'ᠵᠥᠪᠬᠡᠨ ᠰᠣᠨᠣᠰᠴᠤ ᠪᠠᠶᠢᠨ᠎ᠠ᠃ ᠲᠠ ᠥᠪᠡᠷ ᠢᠶᠡᠨ ᠨᠡᠭᠡᠭᠡᠬᠦ ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠵᠣᠷᠢᠯᠲᠠᠲᠤ ᠨᠣᠲ᠋ ᠨᠢᠭᠤᠭᠳᠠᠨ᠎ᠠ᠃', playingEvent:'ᠲᠣᠭᠯᠠᠵᠤ ᠪᠤᠢ ᠨᠣᠲ᠋',
};
export function advancedCopy(language: Language): AdvancedCopy {
  return ({ en, 'zh-CN': zh, ja, 'mn-Cyrl-MN': mn, 'mn-Mong-CN': mong })[language];
}
