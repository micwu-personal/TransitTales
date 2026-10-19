import type { Language } from '../rush/locale';
import type { Clef, Duration } from './model';
import type { LessonId } from './lessons';

const en = {
  title: 'Melody Train', home: 'All journeys', language: 'Language', intro: 'Build a little melody. Let the train sing it back.',
  lessons: 'Choose a journey', studio: 'Free composition', ear: 'Pitch listening', score: 'Your real music score', contour: 'The train follows the melody; the staff below is the real notation.',
  listen: 'Hear the destination', play: 'Depart with my score', stop: 'Stop', check: 'Check my journey', hint: 'Show destination score', hideHint: 'Hide destination score', next: 'Next journey', reset: 'Start again', undo: 'Undo', add: 'Add note', remove: 'Remove selected',
  clef: 'Clef', key: 'Key signature', meter: 'Time signature', tempo: 'Tempo · quarter notes/min', selected: 'Selected stop', letter: 'Note letter', octave: 'Octave', accidental: 'Accidental', duration: 'Note value', dotted: 'Dotted · ×1.5', rest: 'Rest · time without sound', inherit: 'Use key / previous accidental', sharp: 'Sharp +1 semitone', flat: 'Flat −1 semitone', natural: 'Natural',
  view2d: '2D journey', view3d: '3D journey', zoomIn: 'Zoom in', zoomOut: 'Zoom out', cameraReset: 'Reset view', audio: 'Sound & tuning', volume: 'Volume', mute: 'Mute', tuning: 'A4 = 440 Hz · twelve-tone equal temperament',
  precision: 'Each tone is a pure sine at 440 × 2^((MIDI−69)/12) Hz. No vibrato, detuning, backing track or pitch shifting. Device clocks and speakers limit physical accuracy.',
  disclaimer: 'Stable pitch practice, not a promise of absolute pitch. Start quietly; take listening breaks. Ear practice needs audible sound; all building lessons can be checked visually.',
  guide: 'How to build', guideText: 'Select a note on the staff or in the stop list. Change its pitch and duration below. Add notes or rests, listen, and try again. Line and space steps are letter steps, not equal semitone distances. Up/Down moves a selected note one staff step; Delete removes it.',
  ready: 'Choose a stop, change a note, and hear what happens.', success: 'Everyone arrived! Your pitch and rhythm match.', retry: 'Not quite the same journey yet. Compare the destination score, then change one stop.',
  playing: 'The train is singing your score.', finished: 'Journey complete. Listen again or change a note.', stopped: 'Stopped. Your score is still here.', unavailable: 'Sound could not start. Check device sound, then press Play to retry.', fallback: '3D is unavailable. Your journey continues in 2D.',
  saved: 'Progress and free compositions stay in this browser.', unsaved: 'Saving is unavailable; you can still play.', empty: 'Add a note or rest first.', overflow: 'A note crosses a bar line. Shorten it or change the meter; ties are not available yet.', incomplete: 'The last bar is not full yet. Add notes or rests before checking.', limit: 'Up to 16 stops per score.', range: 'That pitch is outside the supported MIDI range.',
  earIntro: 'Listen without a reference note. Choose its exact pitch and octave. The answer stays hidden until you choose.', earStart: 'Play a mystery pitch', earReplay: 'Replay mystery pitch', earNext: 'New mystery pitch', earCorrect: 'You recognised it!', earWrong: 'Listen to the answer, then try a new pitch.', earNeedSound: 'Unmute and raise the volume to practise listening.', answer: 'Answer', earStats: 'correct / attempts', note: 'Note', silent: 'Rest', beats: 'quarter-note beats', completed: 'completed',
};
export type MelodyCopy = typeof en;
const zh: MelodyCopy = {
  title: '旋律列车', home: '所有旅程', language: '语言', intro: '搭一段小旋律，让列车唱给你听。', lessons: '选择旅程', studio: '自由作曲', ear: '音高听辨', score: '你的真实乐谱', contour: '列车跟随旋律起伏；下方五线谱才是真正的记谱。',
  listen: '听听目标旋律', play: '带着我的乐谱出发', stop: '停止', check: '检查我的旅程', hint: '显示目标乐谱', hideHint: '隐藏目标乐谱', next: '下一段旅程', reset: '重新开始', undo: '撤销', add: '添加音符', remove: '删除所选',
  clef: '谱号', key: '调号', meter: '拍号', tempo: '速度 · 每分钟四分音符数', selected: '所选站点', letter: '音名', octave: '八度组', accidental: '临时记号', duration: '音符时值', dotted: '附点 · ×1.5', rest: '休止 · 时间继续，声音暂停', inherit: '沿用调号／本小节记号', sharp: '升号 +1 半音', flat: '降号 −1 半音', natural: '还原号',
  view2d: '2D 旅程', view3d: '3D 旅程', zoomIn: '放大', zoomOut: '缩小', cameraReset: '重置视角', audio: '声音与调音', volume: '音量', mute: '静音', tuning: 'A4 = 440 Hz · 十二平均律',
  precision: '每个音采用 440 × 2^((MIDI−69)/12) Hz 的纯正弦波。不加颤音、失谐、背景音乐或移调。实际声音的精度受设备时钟与扬声器限制。', disclaimer: '提供稳定音高练习，不保证培养绝对音感。从低音量开始，适时休息。听辨需要可听声音；搭建关卡也可通过乐谱完成。',
  guide: '怎样搭建', guideText: '点击五线谱或站点列表中的音符，在下方修改音高和时值。添加音符或休止符，试听，再试一次。线与间对应相邻音名，并非等距半音。上下方向键让所选音符移动一个线／间；Delete 删除。',
  ready: '选一个站点，改一个音，听听变化。', success: '大家都到站啦！音高和节奏都吻合。', retry: '还不是同一段旅程。对照目标乐谱，试着改一个站点。', playing: '列车正在唱你的乐谱。', finished: '旅程结束。再听一次，或修改一个音。', stopped: '已停止，乐谱仍保留。', unavailable: '声音未能启动。检查设备声音，再按播放重试。', fallback: '3D 暂不可用，已保留旅程并切换到 2D。',
  saved: '进度与自由作曲保存在此浏览器。', unsaved: '暂时无法保存，但仍可游玩。', empty: '先添加一个音符或休止符。', overflow: '一个音跨过了小节线。请缩短时值或修改拍号；目前还不支持延音线。', incomplete: '最后一小节还没填满。检查前请补上音符或休止符。', limit: '每段乐谱最多 16 个站点。', range: '此音高超出支持的 MIDI 范围。',
  earIntro: '不先播放参考音。听后选择准确的音名和八度；选择前不显示答案。', earStart: '播放神秘音高', earReplay: '再听神秘音高', earNext: '换一个神秘音高', earCorrect: '你认出来了！', earWrong: '听听答案，再试一个新音。', earNeedSound: '请取消静音并提高音量，再练习听辨。', answer: '答案', earStats: '答对／尝试', note: '音符', silent: '休止', beats: '四分音符拍长', completed: '已完成',
};
const ja: MelodyCopy = {
  title: 'メロディー列車', home: 'すべての旅', language: '言語', intro: '小さな旋律を作って、列車に歌ってもらおう。', lessons: '旅を選ぶ', studio: '自由に作曲', ear: '音の高さを聴く', score: '本物の楽譜', contour: '列車は旋律の上下をたどります。下の五線が実際の楽譜です。',
  listen: 'お手本を聴く', play: '自分の楽譜で出発', stop: '停止', check: '旅を確認', hint: 'お手本の楽譜を表示', hideHint: 'お手本を隠す', next: '次の旅', reset: 'やり直す', undo: '元に戻す', add: '音符を追加', remove: '選択した音を削除', clef: '音部記号', key: '調号', meter: '拍子記号', tempo: '速度 · 毎分の四分音符', selected: '選択した駅', letter: '音名', octave: 'オクターブ', accidental: '臨時記号', duration: '音価', dotted: '付点 · ×1.5', rest: '休符 · 時間は進み、音は休む', inherit: '調号／小節内の記号に従う', sharp: 'シャープ +1 半音', flat: 'フラット −1 半音', natural: 'ナチュラル', view2d: '2D の旅', view3d: '3D の旅', zoomIn: '拡大', zoomOut: '縮小', cameraReset: '視点を戻す', audio: '音と調律', volume: '音量', mute: '消音', tuning: 'A4 = 440 Hz · 十二平均律',
  precision: '各音は 440 × 2^((MIDI−69)/12) Hz の正弦波です。ビブラート、離調、伴奏、移調はありません。実際の精度は機器の時計とスピーカーに依存します。', disclaimer: '安定した音高の練習であり、絶対音感を保証しません。小さい音から始め、休憩を。聴音には音が必要ですが、作曲課題は楽譜でも確認できます。', guide: '作り方', guideText: '五線か駅の一覧で音符を選び、下で高さと長さを変えます。音符や休符を追加して聴き直そう。線と間は音名の順で、等しい半音間隔ではありません。上下キーで一段移動、Delete で削除。', ready: '駅を選び、一つの音を変えて聴こう。', success: 'みんな到着！音高とリズムが合いました。', retry: 'もう少し。お手本を見て一つの駅を変えよう。', playing: '列車が楽譜を歌っています。', finished: '到着。もう一度聴くか、音を変えよう。', stopped: '停止しました。楽譜は残っています。', unavailable: '音を開始できません。機器の音を確認して再生で再試行。', fallback: '3D が使えないため、旅を保ったまま 2D に切り替えました。', saved: '進行と自由作曲はこのブラウザーに保存。', unsaved: '保存できませんが、遊べます。', empty: '音符か休符を追加しよう。', overflow: '音が小節線をまたいでいます。短くするか拍子を変更。タイはまだ使えません。', incomplete: '最後の小節に音符か休符を足そう。', limit: '楽譜は最大16駅です。', range: '対応する MIDI 音域を超えています。', earIntro: '基準音なしで聴き、音名とオクターブを選びます。選ぶまで答えは見えません。', earStart: '秘密の音を聴く', earReplay: 'もう一度聴く', earNext: '新しい秘密の音', earCorrect: 'わかったね！', earWrong: '答えを聴いて、新しい音に挑戦。', earNeedSound: '消音を解除して音量を上げてください。', answer: '答え', earStats: '正解／挑戦', note: '音符', silent: '休符', beats: '四分音符の拍長', completed: '完了',
};
// Mongolian copy is a draft translation, not certified: native speakers should review
// terminology, grammar and traditional-script spelling before a public release.
const mn: MelodyCopy = {
  title: 'Аялгуут галт тэрэг', home: 'Бүх аялал', language: 'Хэл', intro: 'Бяцхан аялгуу бүтээгээд галт тэргээр дуулуулаарай.',
  lessons: 'Аялал сонгох', studio: 'Чөлөөтэй ая зохиох', ear: 'Авианы өндөр сонсож таних', score: 'Таны жинхэнэ нот бичлэг', contour: 'Галт тэрэг аялгууны өгсөж уруудахыг дагана. Доорх таван шугам нь жинхэнэ нот бичлэг юм.',
  listen: 'Зорьсон аялгууг сонсох', play: 'Өөрийн нотоор аялах', stop: 'Зогсоох', check: 'Аяллаа шалгах', hint: 'Зорьсон нотыг харуулах', hideHint: 'Зорьсон нотыг нуух', next: 'Дараагийн аялал', reset: 'Дахин эхлэх', undo: 'Өмнөх үйлдлийг буцаах', add: 'Нот нэмэх', remove: 'Сонгосныг хасах',
  clef: 'Нотын түлхүүр', key: 'Тональ тэмдэг', meter: 'Тактын хэмжээ', tempo: 'Хурд · минут дахь дөрөвт нотын тоо', selected: 'Сонгосон буудал', letter: 'Нотын үсгэн нэр', octave: 'Октав', accidental: 'Түр өөрчлөх тэмдэг', duration: 'Нотын үргэлжлэх хугацаа', dotted: 'Цэгтэй · ×1.5', rest: 'Завсарлага · хугацаа явна, авиа дуугарахгүй', inherit: 'Тональ／энэ тактын өмнөх тэмдгийг дагах', sharp: 'Диез ♯ · 1 хагас өнгөөр дээш', flat: 'Бемоль ♭ · 1 хагас өнгөөр доош', natural: 'Бекар ♮ · өөрчлөлтийг цуцлах',
  view2d: '2D аялал', view3d: '3D аялал', zoomIn: 'Томруулах', zoomOut: 'Жижигрүүлэх', cameraReset: 'Харагдацыг сэргээх', audio: 'Дуу ба хөг', volume: 'Дууны хэмжээ', mute: 'Дууг хаах', tuning: 'A4 = 440 Hz · октавыг 12 тэнцүү хагас өнгөд хуваасан хөг',
  precision: 'Авиа бүр 440 × 2^((MIDI−69)/12) Hz давтамжтай цэвэр синус долгион. Чичиргээ, хөг зөрүүлэх, дагалдах хөгжим, авианы өндөр шилжүүлэх боловсруулалт байхгүй. Бодит дууны нарийвчлал төхөөрөмжийн цаг ба чанга яригчаар хязгаарлагдана.',
  disclaimer: 'Энэ нь тогтвортой авианы өндөр таних дасгал болохоос үнэмлэхүй сонсголтой болгох амлалт биш. Бага дуугаар эхэлж, сонсохдоо завсарлаж амраарай. Сонсголын дасгалд сонсогдох дуу хэрэгтэй; нот бүтээх бүх хичээлийг нүдээр шалгаж болно.',
  guide: 'Хэрхэн бүтээх вэ', guideText: 'Таван шугам эсвэл буудлын жагсаалтаас нот сонгоод доор нь авианы өндөр, хугацааг өөрчил. Нот эсвэл завсарлага нэмж, сонсоод дахин туршаарай. Шугам ба завсрын нэг алхам нь дараагийн нотын нэр рүү шилжих бөгөөд үргэлж ижил хагас өнгийн зай биш. Дээш／доош сум сонгосон нотыг нэг шугам эсвэл завсраар шилжүүлнэ; устгах товч сонгосон нотыг хасна.',
  ready: 'Буудал сонгож, нэг нотыг өөрчлөөд ялгааг сонсоорой.', success: 'Бүгд хүрлээ! Авианы өндөр ба хэмнэл таарлаа.', retry: 'Аялал хараахан адил болоогүй байна. Зорьсон ноттой харьцуулж, нэг буудлыг өөрчлөөрэй.',
  playing: 'Галт тэрэг таны нотыг дуулж байна.', finished: 'Аялал дууслаа. Дахин сонсох эсвэл нэг нот өөрчилж болно.', stopped: 'Зогслоо. Таны нот хэвээр байна.', unavailable: 'Дууг эхлүүлж чадсангүй. Төхөөрөмжийн дууг шалгаад тоглуулах товчийг дахин дараарай.', fallback: '3D боломжгүй байна. Таны аялал 2D хэлбэрээр үргэлжилнэ.',
  saved: 'Ахиц ба чөлөөт ая зохиол энэ хөтөчид хадгалагдана.', unsaved: 'Хадгалах боломжгүй байна; тоглож болно.', empty: 'Эхлээд нот эсвэл завсарлага нэмээрэй.', overflow: 'Нэг нот тактын зураасыг давж байна. Хугацааг богиносгох эсвэл тактын хэмжээг өөрчлөөрэй; ижил авиаг холбох нум хараахан дэмжигдээгүй.', incomplete: 'Сүүлийн такт дүүрээгүй байна. Шалгахын өмнө нот эсвэл завсарлага нэмээрэй.', limit: 'Нэг нот бичлэгт 16 хүртэл буудал байж болно.', range: 'Энэ авианы өндөр дэмжигдэх MIDI хүрээнээс гадуур байна.',
  earIntro: 'Эхлээд жишиг авиа сонсохгүй. Нууц авиаг сонсоод яг тохирох нотын нэр ба октавыг сонгоорой. Сонгох хүртэл хариу нуугдана.', earStart: 'Нууц авиа тоглуулах', earReplay: 'Нууц авиаг дахин сонсох', earNext: 'Шинэ нууц авиа', earCorrect: 'Чи танилаа!', earWrong: 'Зөв хариуны авиаг сонсоод шинэ авиа туршаарай.', earNeedSound: 'Сонсголын дасгал хийхийн тулд дууг нээж, хэмжээг нь нэмээрэй.', answer: 'Хариу', earStats: 'зөв хариулт／оролдлого', note: 'Нот', silent: 'Завсарлага', beats: 'дөрөвт нотын цохилт', completed: 'дууссан',
};
const traditional: MelodyCopy = {
  title: 'ᠠᠶᠠᠯᠭᠤᠲᠤ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ', home: 'ᠪᠦᠬᠦ ᠠᠶᠠᠯᠠᠯ', language: 'ᠬᠡᠯᠡ', intro: 'ᠪᠢᠴᠢᠬᠠᠨ ᠠᠶᠠᠯᠭᠤ ᠪᠦᠲᠦᠭᠡᠵᠦ᠂ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠪᠡᠷ ᠳᠠᠭᠤᠯᠠᠭᠤᠯᠤᠭᠠᠷᠠᠢ᠃',
  lessons: 'ᠠᠶᠠᠯᠠᠯ ᠰᠣᠩᠭᠣᠬᠤ', studio: 'ᠴᠢᠯᠥᠭᠡᠲᠡᠢ ᠠᠶ᠎ᠠ ᠵᠣᠬᠢᠶᠠᠬᠤ', ear: 'ᠠᠪᠢᠶ᠎ᠠ ᠶᠢᠨ ᠥᠨᠳᠥᠷ ᠢ ᠰᠣᠨᠣᠰᠴᠤ ᠲᠠᠨᠢᠬᠤ', score: 'ᠲᠠᠨ ᠤ ᠵᠢᠩᠬᠢᠨᠢ ᠨᠣᠲ᠋ ᠤᠨ ᠪᠢᠴᠢᠯᠭᠡ', contour: 'ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠠᠶᠠᠯᠭᠤ ᠶᠢᠨ ᠥᠭᠰᠥᠵᠦ ᠪᠠᠭᠤᠬᠤ ᠶᠢ ᠳᠠᠭᠠᠨ᠎ᠠ᠃ ᠳᠣᠣᠷᠠᠬᠢ ᠲᠠᠪᠤᠨ ᠱᠤᠭᠤᠮ ᠪᠣᠯ ᠵᠢᠩᠬᠢᠨᠢ ᠨᠣᠲ᠋ ᠤᠨ ᠪᠢᠴᠢᠯᠭᠡ ᠶᠤᠮ᠃',
  listen: 'ᠵᠣᠷᠢᠭᠰᠠᠨ ᠠᠶᠠᠯᠭᠤ ᠶᠢ ᠰᠣᠨᠣᠰᠬᠤ', play: 'ᠥᠪᠡᠷ ᠦᠨ ᠨᠣᠲ᠋ ᠢᠶᠠᠷ ᠠᠶᠠᠯᠠᠬᠤ', stop: 'ᠵᠣᠭᠰᠣᠭᠠᠬᠤ', check: 'ᠠᠶᠠᠯᠠᠯ ᠢᠶᠠᠨ ᠰᠢᠯᠭᠠᠬᠤ', hint: 'ᠵᠣᠷᠢᠭᠰᠠᠨ ᠨᠣᠲ᠋ ᠢ ᠬᠠᠷᠠᠭᠤᠯᠬᠤ', hideHint: 'ᠵᠣᠷᠢᠭᠰᠠᠨ ᠨᠣᠲ᠋ ᠢ ᠨᠢᠭᠤᠬᠤ', next: 'ᠳᠠᠷᠠᠭᠠᠴᠢ ᠶᠢᠨ ᠠᠶᠠᠯᠠᠯ', reset: 'ᠳᠠᠬᠢᠨ ᠡᠬᠢᠯᠡᠬᠦ', undo: 'ᠥᠮᠦᠨᠡᠬᠢ ᠦᠢᠯᠡᠳᠦᠯ ᠢ ᠪᠤᠴᠠᠭᠠᠬᠤ', add: 'ᠨᠣᠲ᠋ ᠨᠡᠮᠡᠬᠦ', remove: 'ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠢ ᠬᠠᠰᠤᠬᠤ',
  clef: 'ᠨᠣᠲ᠋ ᠤᠨ ᠲᠦᠯᠬᠢᠭᠦᠷ', key: 'ᠲᠣᠨᠠᠯ ᠲᠡᠮᠳᠡᠭ', meter: 'ᠲᠠᠺᠲ᠋ ᠤᠨ ᠬᠡᠮᠵᠢᠶ᠎ᠡ', tempo: 'ᠬᠤᠷᠳᠤ · ᠮᠢᠨᠦᠲ ᠳᠠᠬᠢ ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠲᠣᠭ᠎ᠠ', selected: 'ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠪᠤᠭᠤᠳᠠᠯ', letter: 'ᠨᠣᠲ᠋ ᠤᠨ ᠦᠰᠦᠭᠡᠨ ᠨᠡᠷ᠎ᠡ', octave: 'ᠣᠺᠲ᠋ᠠᠸ', accidental: 'ᠲᠦᠷ ᠥᠭᠡᠷᠴᠢᠯᠡᠬᠦ ᠲᠡᠮᠳᠡᠭ', duration: 'ᠨᠣᠲ᠋ ᠤᠨ ᠦᠷᠭᠦᠯᠵᠢᠯᠡᠬᠦ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ', dotted: 'ᠴᠡᠭ ᠲᠡᠢ · ×1.5', rest: 'ᠵᠠᠪᠰᠠᠷᠯᠠᠭ᠎ᠠ · ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ ᠶᠠᠪᠤᠨ᠎ᠠ᠂ ᠠᠪᠢᠶ᠎ᠠ ᠳᠠᠭᠤᠭᠠᠷᠬᠤ ᠦᠭᠡᠢ', inherit: 'ᠲᠣᠨᠠᠯ／ᠡᠨᠡ ᠲᠠᠺᠲ᠋ ᠤᠨ ᠥᠮᠦᠨᠡᠬᠢ ᠲᠡᠮᠳᠡᠭ ᠢ ᠳᠠᠭᠠᠬᠤ', sharp: 'ᠳᠢᠶᠧᠽ ♯ · 1 ᠬᠠᠭᠠᠰ ᠥᠩᠭᠡ ᠪᠡᠷ ᠳᠡᠭᠡᠭᠰᠢ', flat: 'ᠪᠧᠮᠣᠯᠢ ♭ · 1 ᠬᠠᠭᠠᠰ ᠥᠩᠭᠡ ᠪᠡᠷ ᠳᠣᠣᠭᠰᠢ', natural: 'ᠪᠧᠺᠠᠷ ♮ · ᠥᠭᠡᠷᠴᠢᠯᠡᠯᠲᠡ ᠶᠢ ᠴᠤᠴᠠᠯᠠᠬᠤ',
  view2d: '2D ᠠᠶᠠᠯᠠᠯ', view3d: '3D ᠠᠶᠠᠯᠠᠯ', zoomIn: 'ᠲᠣᠮᠣᠷᠠᠭᠤᠯᠬᠤ', zoomOut: 'ᠵᠢᠵᠢᠭᠡᠷᠡᠭᠦᠯᠬᠦ', cameraReset: 'ᠬᠠᠷᠠᠭᠳᠠᠴᠠ ᠶᠢ ᠰᠡᠷᠭᠦᠭᠡᠬᠦ', audio: 'ᠳᠠᠭᠤ ᠪᠠ ᠬᠥᠭ', volume: 'ᠳᠠᠭᠤ ᠶᠢᠨ ᠬᠡᠮᠵᠢᠶ᠎ᠡ', mute: 'ᠳᠠᠭᠤ ᠶᠢ ᠬᠠᠭᠠᠬᠤ', tuning: 'A4 = 440 Hz · ᠣᠺᠲ᠋ᠠᠸ ᠢ 12 ᠲᠡᠩᠴᠡᠭᠦ ᠬᠠᠭᠠᠰ ᠥᠩᠭᠡ ᠳᠦ ᠬᠤᠪᠢᠶᠠᠭᠰᠠᠨ ᠬᠥᠭ',
  precision: 'ᠠᠪᠢᠶ᠎ᠠ ᠪᠦᠷᠢ 440 × 2^((MIDI−69)/12) Hz ᠳᠠᠪᠲᠠᠮᠵᠢ ᠲᠠᠢ ᠴᠡᠪᠡᠷ ᠰᠢᠨᠦᠰ ᠳᠣᠯᠭᠢᠶᠠᠨ ᠶᠤᠮ᠃ ᠴᠢᠴᠢᠷᠡᠭᠡ᠂ ᠬᠥᠭ ᠵᠥᠷᠢᠭᠦᠯᠬᠦ᠂ ᠳᠠᠭᠠᠯᠳᠤᠬᠤ ᠬᠥᠭᠵᠢᠮ᠂ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢᠨ ᠥᠨᠳᠥᠷ ᠢ ᠰᠢᠯᠵᠢᠭᠦᠯᠬᠦ ᠪᠣᠯᠪᠠᠰᠤᠷᠠᠭᠤᠯᠤᠯᠲᠠ ᠪᠠᠢᠬᠤ ᠦᠭᠡᠢ᠃ ᠪᠣᠳᠠᠲᠤ ᠳᠠᠭᠤ ᠶᠢᠨ ᠨᠠᠷᠢᠨ ᠵᠥᠪ ᠪᠠᠢᠳᠠᠯ ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ ᠶᠢᠨ ᠴᠠᠭ ᠪᠠ ᠴᠢᠩᠭ᠎ᠠ ᠶᠠᠷᠢᠭᠴᠢ ᠪᠠᠷ ᠬᠢᠵᠠᠭᠠᠷᠯᠠᠭᠳᠠᠨ᠎ᠠ᠃',
  disclaimer: 'ᠡᠨᠡ ᠪᠣᠯ ᠲᠣᠭᠲᠠᠪᠤᠷᠢᠲᠠᠢ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢᠨ ᠥᠨᠳᠥᠷ ᠢ ᠲᠠᠨᠢᠬᠤ ᠳᠠᠰᠬᠠᠯ᠂ ᠦᠨᠡᠮᠯᠡᠬᠦᠢ ᠰᠣᠨᠣᠰᠬᠤᠯ ᠲᠠᠢ ᠪᠣᠯᠭᠠᠬᠤ ᠠᠮᠠᠯᠠᠯᠲᠠ ᠪᠢᠰᠢ᠃ ᠪᠠᠭ᠎ᠠ ᠳᠠᠭᠤ ᠪᠠᠷ ᠡᠬᠢᠯᠡᠵᠦ᠂ ᠰᠣᠨᠣᠰᠬᠤ ᠳᠠᠭᠠᠨ ᠵᠠᠪᠰᠠᠷᠯᠠᠵᠤ ᠠᠮᠠᠷᠠᠭᠠᠷᠠᠢ᠃ ᠰᠣᠨᠣᠰᠬᠤᠯ ᠤᠨ ᠳᠠᠰᠬᠠᠯ ᠳᠤ ᠰᠣᠨᠣᠰᠲᠠᠬᠤ ᠳᠠᠭᠤ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃ ᠨᠣᠲ᠋ ᠪᠦᠲᠦᠭᠡᠬᠦ ᠪᠦᠬᠦ ᠬᠢᠴᠢᠶᠡᠯ ᠢ ᠨᠢᠳᠦ ᠪᠡᠷ ᠰᠢᠯᠭᠠᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃',
  guide: 'ᠬᠡᠷᠬᠢᠨ ᠪᠦᠲᠦᠭᠡᠬᠦ ᠪᠤᠢ', guideText: 'ᠲᠠᠪᠤᠨ ᠱᠤᠭᠤᠮ ᠪᠤᠶᠤ ᠪᠤᠭᠤᠳᠠᠯ ᠤᠨ ᠵᠢᠭᠰᠠᠭᠠᠯᠲᠠ ᠠᠴᠠ ᠨᠣᠲ᠋ ᠰᠣᠩᠭᠣᠵᠤ᠂ ᠳᠣᠣᠷ᠎ᠠ ᠨᠢ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢᠨ ᠥᠨᠳᠥᠷ ᠪᠠ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ ᠶᠢ ᠥᠭᠡᠷᠴᠢᠯᠡᠭᠡᠷᠡᠢ᠃ ᠨᠣᠲ᠋ ᠪᠤᠶᠤ ᠵᠠᠪᠰᠠᠷᠯᠠᠭ᠎ᠠ ᠨᠡᠮᠡᠵᠦ᠂ ᠰᠣᠨᠣᠰᠴᠤ᠂ ᠳᠠᠬᠢᠨ ᠲᠤᠷᠰᠢᠭᠠᠷᠠᠢ᠃ ᠱᠤᠭᠤᠮ ᠪᠠ ᠵᠠᠪᠰᠠᠷ ᠤᠨ ᠨᠢᠭᠡ ᠠᠯᠬᠤᠮ ᠪᠣᠯ ᠳᠠᠷᠠᠭᠠᠴᠢ ᠨᠣᠲ᠋ ᠤᠨ ᠨᠡᠷ᠎ᠡ ᠳᠦ ᠰᠢᠯᠵᠢᠬᠦ ᠠᠯᠬᠤᠮ᠂ ᠦᠷᠭᠦᠯᠵᠢ ᠲᠡᠩᠴᠡᠭᠦ ᠬᠠᠭᠠᠰ ᠥᠩᠭᠡ ᠶᠢᠨ ᠵᠠᠢ ᠪᠢᠰᠢ᠃ ᠳᠡᠭᠡᠭᠰᠢ／ᠳᠣᠣᠭᠰᠢ ᠰᠤᠮᠤ ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠨᠣᠲ᠋ ᠢ ᠨᠢᠭᠡ ᠱᠤᠭᠤᠮ ᠪᠤᠶᠤ ᠵᠠᠪᠰᠠᠷ ᠢᠶᠠᠷ ᠰᠢᠯᠵᠢᠭᠦᠯᠦᠨ᠎ᠡ᠃ ᠤᠰᠠᠳᠬᠠᠬᠤ ᠲᠣᠪᠴᠢ ᠰᠣᠩᠭᠣᠭᠰᠠᠨ ᠨᠣᠲ᠋ ᠢ ᠬᠠᠰᠤᠨ᠎ᠠ᠃',
  ready: 'ᠪᠤᠭᠤᠳᠠᠯ ᠰᠣᠩᠭᠣᠵᠤ᠂ ᠨᠢᠭᠡ ᠨᠣᠲ᠋ ᠢ ᠥᠭᠡᠷᠴᠢᠯᠡᠭᠡᠳ ᠢᠯᠭᠠᠭ᠎ᠠ ᠶᠢ ᠰᠣᠨᠣᠰᠤᠭᠠᠷᠠᠢ᠃', success: 'ᠪᠦᠭᠦᠳᠡ ᠬᠦᠷᠦᠯ᠎ᠡ! ᠠᠪᠢᠶ᠎ᠠ ᠶᠢᠨ ᠥᠨᠳᠥᠷ ᠪᠠ ᠬᠡᠮᠨᠡᠯ ᠲᠣᠬᠢᠷᠠᠯ᠎ᠠ᠃', retry: 'ᠠᠶᠠᠯᠠᠯ ᠬᠠᠷᠠᠬᠠᠨ ᠠᠳᠠᠯᠢ ᠪᠣᠯᠣᠭᠠᠳᠤᠢ᠃ ᠵᠣᠷᠢᠭᠰᠠᠨ ᠨᠣᠲ᠋ ᠲᠠᠢ ᠬᠠᠷᠢᠴᠠᠭᠤᠯᠵᠤ᠂ ᠨᠢᠭᠡ ᠪᠤᠭᠤᠳᠠᠯ ᠢ ᠥᠭᠡᠷᠴᠢᠯᠡᠭᠡᠷᠡᠢ᠃',
  playing: 'ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠲᠠᠨ ᠤ ᠨᠣᠲ᠋ ᠢ ᠳᠠᠭᠤᠯᠠᠵᠤ ᠪᠠᠢᠨ᠎ᠠ᠃', finished: 'ᠠᠶᠠᠯᠠᠯ ᠳᠠᠭᠤᠰᠤᠯ᠎ᠠ᠃ ᠳᠠᠬᠢᠨ ᠰᠣᠨᠣᠰᠬᠤ ᠪᠤᠶᠤ ᠨᠢᠭᠡ ᠨᠣᠲ᠋ ᠢ ᠥᠭᠡᠷᠴᠢᠯᠡᠵᠦ ᠪᠣᠯᠣᠨ᠎ᠠ᠃', stopped: 'ᠵᠣᠭᠰᠣᠯ᠎ᠠ᠃ ᠲᠠᠨ ᠤ ᠨᠣᠲ᠋ ᠬᠡᠪ ᠢᠶᠡᠷ ᠪᠠᠢᠨ᠎ᠠ᠃', unavailable: 'ᠳᠠᠭᠤ ᠶᠢ ᠡᠬᠢᠯᠡᠭᠦᠯᠵᠦ ᠴᠢᠳᠠᠭᠰᠠᠨ ᠦᠭᠡᠢ᠃ ᠲᠥᠬᠥᠭᠡᠷᠦᠮᠵᠢ ᠶᠢᠨ ᠳᠠᠭᠤ ᠶᠢ ᠰᠢᠯᠭᠠᠭᠠᠳ᠂ ᠲᠣᠭᠯᠠᠭᠤᠯᠬᠤ ᠲᠣᠪᠴᠢ ᠶᠢ ᠳᠠᠬᠢᠨ ᠳᠠᠷᠤᠭᠠᠷᠠᠢ᠃', fallback: '3D ᠪᠣᠯᠣᠮᠵᠢ ᠦᠭᠡᠢ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠲᠠᠨ ᠤ ᠠᠶᠠᠯᠠᠯ 2D ᠬᠡᠯᠪᠡᠷ ᠢᠶᠡᠷ ᠦᠷᠭᠦᠯᠵᠢᠯᠡᠨ᠎ᠡ᠃',
  saved: 'ᠠᠬᠢᠴᠠ ᠪᠠ ᠴᠢᠯᠥᠭᠡᠲᠦ ᠠᠶ᠎ᠠ ᠵᠣᠬᠢᠶᠠᠯ ᠡᠨᠡ ᠬᠥᠲᠥᠴᠢ ᠳᠦ ᠬᠠᠳᠠᠭᠠᠯᠠᠭᠳᠠᠨ᠎ᠠ᠃', unsaved: 'ᠬᠠᠳᠠᠭᠠᠯᠠᠬᠤ ᠪᠣᠯᠣᠮᠵᠢ ᠦᠭᠡᠢ᠂ ᠲᠣᠭᠯᠠᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃', empty: 'ᠡᠬᠢᠯᠡᠭᠡᠳ ᠨᠣᠲ᠋ ᠪᠤᠶᠤ ᠵᠠᠪᠰᠠᠷᠯᠠᠭ᠎ᠠ ᠨᠡᠮᠡᠭᠡᠷᠡᠢ᠃', overflow: 'ᠨᠢᠭᠡ ᠨᠣᠲ᠋ ᠲᠠᠺᠲ᠋ ᠤᠨ ᠵᠢᠷᠤᠭᠠᠰᠤ ᠶᠢ ᠳᠠᠪᠠᠵᠤ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ ᠶᠢ ᠪᠣᠭᠢᠨᠢᠰᠬᠠᠬᠤ ᠪᠤᠶᠤ ᠲᠠᠺᠲ᠋ ᠤᠨ ᠬᠡᠮᠵᠢᠶ᠎ᠡ ᠶᠢ ᠥᠭᠡᠷᠴᠢᠯᠡᠭᠡᠷᠡᠢ᠃ ᠠᠳᠠᠯᠢ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢ ᠬᠣᠯᠪᠣᠬᠤ ᠨᠤᠮᠤ ᠬᠠᠷᠠᠬᠠᠨ ᠳᠡᠮᠵᠢᠭᠳᠡᠭᠡᠳᠦᠢ᠃', incomplete: 'ᠰᠡᠭᠦᠯ ᠦᠨ ᠲᠠᠺᠲ᠋ ᠳᠦᠭᠦᠷᠦᠭᠡᠳᠦᠢ᠃ ᠰᠢᠯᠭᠠᠬᠤ ᠠᠴᠠ ᠥᠮᠦᠨ᠎ᠡ ᠨᠣᠲ᠋ ᠪᠤᠶᠤ ᠵᠠᠪᠰᠠᠷᠯᠠᠭ᠎ᠠ ᠨᠡᠮᠡᠭᠡᠷᠡᠢ᠃', limit: 'ᠨᠢᠭᠡ ᠨᠣᠲ᠋ ᠤᠨ ᠪᠢᠴᠢᠯᠭᠡ ᠳᠦ 16 ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠪᠤᠭᠤᠳᠠᠯ ᠪᠠᠢᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠃', range: 'ᠡᠨᠡ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢᠨ ᠥᠨᠳᠥᠷ ᠳᠡᠮᠵᠢᠭᠳᠡᠬᠦ MIDI ᠬᠦᠷᠢᠶ᠎ᠡ ᠶᠢᠨ ᠭᠠᠳᠠᠨ᠎ᠠ ᠪᠠᠢᠨ᠎ᠠ᠃',
  earIntro: 'ᠡᠬᠢᠯᠡᠭᠡᠳ ᠵᠢᠰᠢᠭ ᠠᠪᠢᠶ᠎ᠠ ᠰᠣᠨᠣᠰᠬᠤ ᠦᠭᠡᠢ᠃ ᠨᠢᠭᠤᠴᠠ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢ ᠰᠣᠨᠣᠰᠴᠤ᠂ ᠶᠠᠭ ᠲᠣᠬᠢᠷᠠᠬᠤ ᠨᠣᠲ᠋ ᠤᠨ ᠨᠡᠷ᠎ᠡ ᠪᠠ ᠣᠺᠲ᠋ᠠᠸ ᠢ ᠰᠣᠩᠭᠣᠭᠠᠷᠠᠢ᠃ ᠰᠣᠩᠭᠣᠬᠤ ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠬᠠᠷᠢᠭᠤ ᠨᠢᠭᠤᠭᠳᠠᠨ᠎ᠠ᠃', earStart: 'ᠨᠢᠭᠤᠴᠠ ᠠᠪᠢᠶ᠎ᠠ ᠲᠣᠭᠯᠠᠭᠤᠯᠬᠤ', earReplay: 'ᠨᠢᠭᠤᠴᠠ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢ ᠳᠠᠬᠢᠨ ᠰᠣᠨᠣᠰᠬᠤ', earNext: 'ᠰᠢᠨ᠎ᠡ ᠨᠢᠭᠤᠴᠠ ᠠᠪᠢᠶ᠎ᠠ', earCorrect: 'ᠴᠢ ᠲᠠᠨᠢᠯ᠎ᠠ!', earWrong: 'ᠵᠥᠪ ᠬᠠᠷᠢᠭᠤ ᠶᠢᠨ ᠠᠪᠢᠶ᠎ᠠ ᠶᠢ ᠰᠣᠨᠣᠰᠴᠤ᠂ ᠰᠢᠨ᠎ᠡ ᠠᠪᠢᠶ᠎ᠠ ᠲᠤᠷᠰᠢᠭᠠᠷᠠᠢ᠃', earNeedSound: 'ᠰᠣᠨᠣᠰᠬᠤᠯ ᠤᠨ ᠳᠠᠰᠬᠠᠯ ᠬᠢᠬᠦ ᠶᠢᠨ ᠲᠤᠯᠠ ᠳᠠᠭᠤ ᠶᠢ ᠨᠡᠭᠡᠵᠦ᠂ ᠬᠡᠮᠵᠢᠶ᠎ᠡ ᠶᠢ ᠨᠢ ᠨᠡᠮᠡᠭᠡᠷᠡᠢ᠃', answer: 'ᠬᠠᠷᠢᠭᠤ', earStats: 'ᠵᠥᠪ ᠬᠠᠷᠢᠭᠤ／ᠣᠷᠣᠯᠳᠣᠯᠭ᠎ᠠ', note: 'ᠨᠣᠲ᠋', silent: 'ᠵᠠᠪᠰᠠᠷᠯᠠᠭ᠎ᠠ', beats: 'ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠴᠣᠬᠢᠯᠲᠠ', completed: 'ᠳᠠᠭᠤᠰᠤᠭᠰᠠᠨ',
};
export function melodyCopy(language: Language): MelodyCopy { return ({ en, 'zh-CN': zh, ja, 'mn-Cyrl-MN': mn, 'mn-Mong-CN': traditional })[language]; }
const titles = {
  en: ['Three little stations', 'Long and short', 'A quiet stop', 'Three beats to a carriage', 'Six eighth-note steps', 'The bass-clef line', 'Middle C: alto clef', 'Middle C: tenor clef', 'Sharps live for a bar', 'G major and naturals', 'F major and flats', 'The dotted journey'],
  'zh-CN': ['三座小站', '长音与短音', '安静的一站', '每节车厢三拍', '六个八分音符', '低音谱号线路', '中音谱号的中央 C', '次中音谱号的中央 C', '升号在小节内延续', 'G 大调与还原号', 'F 大调与降号', '附点旅程'],
  ja: ['三つの小さな駅', '長い音と短い音', '静かな駅', '一車両に三拍', '六つの八分音符', 'ヘ音記号の路線', 'ハ音記号：アルト', 'ハ音記号：テノール', '小節内のシャープ', 'ト長調とナチュラル', 'ヘ長調とフラット', '付点の旅'],
  'mn-Cyrl-MN': ['Гурван бяцхан буудал', 'Урт ба богино нот', 'Чимээгүй буудал', 'Нэг вагонд гурван цохилт', 'Зургаан наймт нотын алхам', 'Фа түлхүүрийн зам', 'Төвийн C: альтын түлхүүр', 'Төвийн C: тенорын түлхүүр', 'Диез тактын турш үйлчилнэ', 'G мажор ба бекар', 'F мажор ба бемоль', 'Цэгтэй аялал'],
  'mn-Mong-CN': ['ᠭᠤᠷᠪᠠᠨ ᠪᠢᠴᠢᠬᠠᠨ ᠪᠤᠭᠤᠳᠠᠯ', 'ᠤᠷᠲᠤ ᠪᠠ ᠪᠣᠭᠢᠨᠢ ᠨᠣᠲ᠋', 'ᠴᠢᠮᠡᠭᠡ ᠦᠭᠡᠢ ᠪᠤᠭᠤᠳᠠᠯ', 'ᠨᠢᠭᠡ ᠸᠠᠭᠣᠨ ᠳᠤ ᠭᠤᠷᠪᠠᠨ ᠴᠣᠬᠢᠯᠲᠠ', 'ᠵᠢᠷᠭᠤᠭᠠᠨ ᠨᠠᠢᠮᠠᠲᠤ ᠨᠣᠲ᠋ ᠤᠨ ᠠᠯᠬᠤᠮ', 'ᠹᠠ ᠲᠦᠯᠬᠢᠭᠦᠷ ᠦᠨ ᠵᠠᠮ', 'ᠲᠥᠪ ᠦᠨ C: ᠠᠯᠲ᠋ ᠤᠨ ᠲᠦᠯᠬᠢᠭᠦᠷ', 'ᠲᠥᠪ ᠦᠨ C: ᠲ᠋ᠧᠨᠣᠷ ᠤᠨ ᠲᠦᠯᠬᠢᠭᠦᠷ', 'ᠳᠢᠶᠧᠽ ᠲᠠᠺᠲ᠋ ᠤᠨ ᠲᠤᠷᠰᠢ ᠦᠢᠯᠡᠴᠢᠯᠡᠨ᠎ᠡ', 'G ᠮᠠᠵᠣᠷ ᠪᠠ ᠪᠧᠺᠠᠷ', 'F ᠮᠠᠵᠣᠷ ᠪᠠ ᠪᠧᠮᠣᠯᠢ', 'ᠴᠡᠭ ᠲᠡᠢ ᠠᠶᠠᠯᠠᠯ'],
};
const explainEn = [
  'Play the destination: C4, E4, G4. The treble clef locates G4 on the second line from the bottom. Move the first stop down to C4; notice its ledger line.',
  'C4 lasts two quarter-note beats; E4 and G4 last one each. A half note has an open head and stem. A whole note has no stem and lasts four.',
  'C4, one quarter rest, E4, G4. A rest takes time without playing a pitch. The train keeps going while the sound pauses.',
  '3/4 means three quarter-note beats per bar. Copy C4–E4–G4, then G4–E4–C4: two full bars.',
  '6/8 contains six eighth notes per bar, usually grouped 3+3 (two dotted-quarter pulses). Here the tempo control still counts quarter notes per minute.',
  'C3, E3, then a half-note G3. The bass clef dots surround F3 on the fourth line from the bottom. Changing clef changes how positions are read, not a note’s sound.',
  'C4, D4, then a half-note E4. The centre of the alto C clef marks C4 on the third line.',
  'C4, B3, then a half-note A3. The centre of the tenor C clef marks C4 on the fourth line.',
  'F♯4, F♯4, F4, F4 | F4. Write a sharp on the first F, a natural on the third. A written accidental applies to the same letter and octave until the bar line.',
  'G major has F♯ in its key signature: F♯4, F4, F4, F♯4 | F♯4. A natural cancels it within this bar; the key signature returns in the next.',
  'F major has B♭: B♭4, B4, B4, B♭4 | B♭4. Add a natural, then a flat; hear each exact semitone change.',
  'A dotted quarter C4 (1.5), an eighth D4 (0.5), and a half E4 (2) fill 4/4. A dot adds half of the original value.',
];
const explainZh = [
  '先听 C4、E4、G4。高音谱号把 G4 定在从下数第二线。把第一站移到 C4，看看它的下加线。', 'C4 持续两拍，E4、G4 各一拍。二分音符有空心符头和符干；全音符没有符干，长四拍。', 'C4、一个四分休止符、E4、G4。休止符占时间但没有音高；列车继续走，声音暂停。', '3/4 表示每小节三拍，以四分音符为一拍。搭 C4–E4–G4，再搭 G4–E4–C4，共两小节。', '6/8 每小节六个八分音符，通常分成 3+3 两组，即两个附点四分音符大拍。本页面速度仍按每分钟四分音符数标记。', 'C3、E3，再接二分音符 G3。低音谱号两点夹住从下数第四线的 F3。换谱号改变位置的读法，不改变同一个音的声音。', 'C4、D4、二分音符 E4。中音 C 谱号的中心把 C4 定在第三线。', 'C4、B3、二分音符 A3。次中音 C 谱号的中心把 C4 定在第四线。', 'F♯4、F♯4、F4、F4｜F4。第一个 F 写升号，第三个写还原号。临时记号对本小节同音名、同八度的音有效，过小节线失效。', 'G 大调的调号有 F♯：F♯4、F4、F4、F♯4｜F♯4。还原号在本小节取消升音；下一小节重新遵循调号。', 'F 大调的调号有 B♭：B♭4、B4、B4、B♭4｜B♭4。先写还原号，再写降号，听每次精确的半音变化。', '附点四分 C4（1.5 拍）、八分 D4（0.5 拍）、二分 E4（2 拍），正好填满 4/4。附点增加原时值的一半。',
];
const explainJa = ['C4、E4、G4 を聴こう。ト音記号は下から二本目に G4 を置きます。最初の音を C4 にして加線を見よう。', 'C4 は二拍、E4 と G4 は一拍。二分音符は白い頭と棒、全音符は棒なしで四拍。', 'C4、四分休符、E4、G4。休符は時間を使い、音は鳴りません。', '3/4 は一小節に四分音符三拍。C4–E4–G4、G4–E4–C4 の二小節。', '6/8 は八分音符六つ、通常 3+3 に分ける複合二拍子。速度は毎分の四分音符数です。', 'C3、E3、二分音符 G3。ヘ音記号の二点は下から四本目の F3 を挟みます。音部記号を変えても同じ音高は同じ音です。', 'C4、D4、二分音符 E4。アルトのハ音記号は三本目に C4。', 'C4、B3、二分音符 A3。テノールのハ音記号は四本目に C4。', 'F♯4、F♯4、F4、F4｜F4。最初にシャープ、三つ目にナチュラル。同じ音名とオクターブの臨時記号は小節線まで有効。', 'ト長調は F♯。F♯4、F4、F4、F♯4｜F♯4。ナチュラルで取り消しても次の小節では調号に戻ります。', 'ヘ長調は B♭。B♭4、B4、B4、B♭4｜B♭4。ナチュラルとフラットで半音の違いを聴こう。', '付点四分 C4（1.5拍）、八分 D4（0.5拍）、二分 E4（2拍）。付点は元の長さの半分を加えます。'];
const explainMn = [
  'Зорьсон аялгуу болох C4, E4, G4-ийг сонсоорой. Соль түлхүүр G4-ийг доороос хоёр дахь шугам дээр заана. Эхний буудлын нотыг C4 хүртэл доошлуулж, түүний нэмэлт шугамыг ажиглаарай.',
  'C4 хоёр дөрөвт нотын цохилт, E4 ба G4 тус бүр нэг цохилт үргэлжилнэ. Хагас нот будалтгүй толгой ба иштэй. Бүтэн нот ишгүй бөгөөд дөрвөн дөрөвт нотын цохилт үргэлжилнэ.',
  'C4, нэг дөрөвт завсарлага, E4, G4-ийг бүтээгээрэй. Завсарлага хугацаа эзэлдэг боловч авианы өндөр дуугаргахгүй. Дуу түр зогсоход галт тэрэг цааш явсаар байна.',
  '3/4 гэдэг нь нэг тактад гурван дөрөвт нотын цохилт багтана гэсэн үг. C4–E4–G4, дараа нь G4–E4–C4-ийг хуулж, хоёр бүтэн такт бүтээгээрэй.',
  '6/8 хэмжээнд нэг тактад зургаан наймт нот багтана. Ихэвчлэн 3+3-аар бүлэглэж, хоёр цэгтэй дөрөвт нотын үндсэн цохилтоор мэдэрдэг. Харин энд хурдны тохиргоо минут дахь дөрөвт нотын тоог заасан хэвээр байна.',
  'C3, E3, дараа нь хагас нот G3-ийг бүтээгээрэй. Фа түлхүүрийн хоёр цэг доороос дөрөв дэх шугамын F3-ийг хоёр талаас нь хүрээлнэ. Түлхүүр солих нь байрлалыг унших аргыг өөрчилдөг болохоос ижил өндөртэй нотын дууг өөрчлөхгүй.',
  'C4, D4, дараа нь хагас нот E4-ийг бүтээгээрэй. Альтын До түлхүүрийн төв гурав дахь шугам дээрх төвийн C буюу C4-ийг заана. Шугамыг доороос нь тоолоорой.',
  'C4, B3, дараа нь хагас нот A3-ийг бүтээгээрэй. Тенорын До түлхүүрийн төв дөрөв дэх шугам дээрх төвийн C буюу C4-ийг заана. Шугамыг доороос нь тоолоорой.',
  'F♯4, F♯4, F4, F4 | F4-ийг бүтээгээрэй. Эхний F дээр диез ♯, гурав дахь дээр бекар ♮ тавиарай. Бичсэн түр өөрчлөх тэмдэг нь ижил үсгэн нэр, ижил октавтай дараагийн нотуудад тактын зураас хүртэл үйлчилнэ; бекар өмнөх диезийг цуцална.',
  'G мажорын тональ тэмдэг F♯-ийг заана: F♯4, F4, F4, F♯4 | F♯4. Хоёр дахь нотын бекар ♮ энэ тактад F♯-ийг цуцална. Дөрөв дэх нот дээр диез ♯ тавьж буцаагаарай. Дараагийн такт эхлэхэд тональ тэмдгийн F♯ дахин үйлчилнэ.',
  'F мажорын тональ тэмдэг B♭-ийг заана: B♭4, B4, B4, B♭4 | B♭4. Хоёр дахь нотод бекар ♮, дөрөв дэх нотод бемоль ♭ нэмээрэй. Өөрчлөлт бүрийн яг нэг хагас өнгийн ялгааг сонсоорой. Дараагийн тактад тональ тэмдгийн B♭ дахин үйлчилнэ.',
  'Цэгтэй дөрөвт C4 (1.5 цохилт), наймт D4 (0.5 цохилт), хагас E4 (2 цохилт) нийлээд 4/4 тактыг дүүргэнэ. Энд нэг цохилт нь дөрөвт нотын хугацаа. Цэг нь нотын анхны хугацааны хагасыг нэмж, нийт хугацааг 1.5 дахин уртасгана.',
];
const explainTraditional = [
  'ᠵᠣᠷᠢᠭᠰᠠᠨ ᠠᠶᠠᠯᠭᠤ C4, E4, G4 ᠢ ᠰᠣᠨᠣᠰᠤᠭᠠᠷᠠᠢ᠃ ᠰᠣᠯᠢ ᠲᠦᠯᠬᠢᠭᠦᠷ G4 ᠢ ᠳᠣᠣᠷ᠎ᠠ ᠠᠴᠠ ᠬᠣᠶᠠᠷ ᠳᠠᠬᠢ ᠱᠤᠭᠤᠮ ᠳᠡᠭᠡᠷ᠎ᠡ ᠵᠢᠭᠠᠨ᠎ᠠ᠃ ᠡᠬᠢᠨ ᠦ ᠪᠤᠭᠤᠳᠠᠯ ᠤᠨ ᠨᠣᠲ᠋ ᠢ C4 ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠳᠣᠣᠭᠰᠢᠯᠠᠭᠤᠯᠵᠤ᠂ ᠲᠡᠭᠦᠨ ᠦ ᠨᠡᠮᠡᠯᠲᠡ ᠱᠤᠭᠤᠮ ᠢ ᠠᠵᠢᠭᠯᠠᠭᠠᠷᠠᠢ᠃',
  'C4 ᠬᠣᠶᠠᠷ ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠴᠣᠬᠢᠯᠲᠠ᠂ E4 ᠪᠠ G4 ᠲᠤᠰ ᠪᠦᠷᠢ ᠨᠢᠭᠡ ᠴᠣᠬᠢᠯᠲᠠ ᠦᠷᠭᠦᠯᠵᠢᠯᠡᠨ᠎ᠡ᠃ ᠬᠠᠭᠠᠰ ᠨᠣᠲ᠋ ᠪᠤᠳᠤᠯᠲᠠ ᠦᠭᠡᠢ ᠲᠣᠯᠣᠭᠠᠢ ᠪᠠ ᠢᠰᠢ ᠲᠡᠢ᠃ ᠪᠦᠲᠦᠨ ᠨᠣᠲ᠋ ᠢᠰᠢ ᠦᠭᠡᠢ ᠪᠥᠭᠡᠳ ᠳᠥᠷᠪᠡᠨ ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠴᠣᠬᠢᠯᠲᠠ ᠦᠷᠭᠦᠯᠵᠢᠯᠡᠨ᠎ᠡ᠃',
  'C4᠂ ᠨᠢᠭᠡ ᠳᠥᠷᠪᠡᠲᠦ ᠵᠠᠪᠰᠠᠷᠯᠠᠭ᠎ᠠ᠂ E4᠂ G4 ᠢ ᠪᠦᠲᠦᠭᠡᠭᠡᠷᠡᠢ᠃ ᠵᠠᠪᠰᠠᠷᠯᠠᠭ᠎ᠠ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ ᠡᠵᠡᠯᠡᠳᠡᠭ ᠪᠣᠯᠪᠠᠴᠤ ᠠᠪᠢᠶ᠎ᠠ ᠳᠠᠭᠤᠭᠠᠷᠭᠠᠬᠤ ᠦᠭᠡᠢ᠃ ᠳᠠᠭᠤ ᠲᠦᠷ ᠵᠣᠭᠰᠣᠬᠤ ᠳᠤ ᠭᠠᠯᠲᠤ ᠲᠡᠷᠭᠡ ᠴᠠᠭᠠᠰᠢ ᠶᠠᠪᠤᠭᠰᠠᠭᠠᠷ ᠪᠠᠢᠨ᠎ᠠ᠃',
  '3/4 ᠭᠡᠳᠡᠭ ᠨᠢ ᠨᠢᠭᠡ ᠲᠠᠺᠲ᠋ ᠲᠤ ᠭᠤᠷᠪᠠᠨ ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠴᠣᠬᠢᠯᠲᠠ ᠪᠠᠭᠲᠠᠨ᠎ᠠ ᠭᠡᠰᠡᠨ ᠦᠭᠡ᠃ C4–E4–G4᠂ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ G4–E4–C4 ᠢ ᠬᠠᠭᠤᠯᠵᠤ᠂ ᠬᠣᠶᠠᠷ ᠪᠦᠲᠦᠨ ᠲᠠᠺᠲ᠋ ᠪᠦᠲᠦᠭᠡᠭᠡᠷᠡᠢ᠃',
  '6/8 ᠬᠡᠮᠵᠢᠶ᠎ᠡ ᠳᠦ ᠨᠢᠭᠡ ᠲᠠᠺᠲ᠋ ᠲᠤ ᠵᠢᠷᠭᠤᠭᠠᠨ ᠨᠠᠢᠮᠠᠲᠤ ᠨᠣᠲ᠋ ᠪᠠᠭᠲᠠᠨ᠎ᠠ᠃ ᠢᠬᠡᠪᠴᠢᠯᠡᠨ 3+3 ᠪᠠᠷ ᠪᠦᠯᠦᠭᠯᠡᠵᠦ᠂ ᠬᠣᠶᠠᠷ ᠴᠡᠭ ᠲᠡᠢ ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠦᠨᠳᠦᠰᠦᠨ ᠴᠣᠬᠢᠯᠲᠠ ᠪᠠᠷ ᠮᠡᠳᠡᠷᠡᠳᠡᠭ᠃ ᠬᠠᠷᠢᠨ ᠡᠨᠳᠡ ᠬᠤᠷᠳᠤ ᠶᠢᠨ ᠲᠣᠬᠢᠷᠠᠭᠤᠯᠭ᠎ᠠ ᠮᠢᠨᠦᠲ ᠳᠠᠬᠢ ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠲᠣᠭ᠎ᠠ ᠶᠢ ᠵᠢᠭᠠᠭᠰᠠᠨ ᠬᠡᠪ ᠢᠶᠡᠷ ᠪᠠᠢᠨ᠎ᠠ᠃',
  'C3᠂ E3᠂ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠬᠠᠭᠠᠰ ᠨᠣᠲ᠋ G3 ᠢ ᠪᠦᠲᠦᠭᠡᠭᠡᠷᠡᠢ᠃ ᠹᠠ ᠲᠦᠯᠬᠢᠭᠦᠷ ᠦᠨ ᠬᠣᠶᠠᠷ ᠴᠡᠭ ᠳᠣᠣᠷ᠎ᠠ ᠠᠴᠠ ᠳᠥᠷᠪᠡ ᠳᠡᠬᠢ ᠱᠤᠭᠤᠮ ᠤᠨ F3 ᠢ ᠬᠣᠶᠠᠷ ᠲᠠᠯ᠎ᠠ ᠠᠴᠠ ᠨᠢ ᠬᠦᠷᠢᠶᠡᠯᠡᠨ᠎ᠡ᠃ ᠲᠦᠯᠬᠢᠭᠦᠷ ᠰᠣᠯᠢᠬᠤ ᠨᠢ ᠪᠠᠢᠷᠢᠯᠠᠯ ᠢ ᠤᠩᠰᠢᠬᠤ ᠠᠷᠭ᠎ᠠ ᠶᠢ ᠥᠭᠡᠷᠴᠢᠯᠡᠳᠡᠭ᠂ ᠠᠳᠠᠯᠢ ᠥᠨᠳᠥᠷ ᠲᠡᠢ ᠨᠣᠲ᠋ ᠤᠨ ᠳᠠᠭᠤ ᠶᠢ ᠥᠭᠡᠷᠴᠢᠯᠡᠬᠦ ᠦᠭᠡᠢ᠃',
  'C4᠂ D4᠂ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠬᠠᠭᠠᠰ ᠨᠣᠲ᠋ E4 ᠢ ᠪᠦᠲᠦᠭᠡᠭᠡᠷᠡᠢ᠃ ᠠᠯᠲ᠋ ᠤᠨ ᠳᠣ ᠲᠦᠯᠬᠢᠭᠦᠷ ᠦᠨ ᠲᠥᠪ ᠭᠤᠷᠪᠠ ᠳᠠᠬᠢ ᠱᠤᠭᠤᠮ ᠳᠡᠭᠡᠷᠡᠬᠢ ᠲᠥᠪ ᠦᠨ C ᠪᠤᠶᠤ C4 ᠢ ᠵᠢᠭᠠᠨ᠎ᠠ᠃ ᠱᠤᠭᠤᠮ ᠢ ᠳᠣᠣᠷ᠎ᠠ ᠠᠴᠠ ᠨᠢ ᠲᠣᠭᠠᠯᠠᠭᠠᠷᠠᠢ᠃',
  'C4᠂ B3᠂ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ ᠬᠠᠭᠠᠰ ᠨᠣᠲ᠋ A3 ᠢ ᠪᠦᠲᠦᠭᠡᠭᠡᠷᠡᠢ᠃ ᠲ᠋ᠧᠨᠣᠷ ᠤᠨ ᠳᠣ ᠲᠦᠯᠬᠢᠭᠦᠷ ᠦᠨ ᠲᠥᠪ ᠳᠥᠷᠪᠡ ᠳᠡᠬᠢ ᠱᠤᠭᠤᠮ ᠳᠡᠭᠡᠷᠡᠬᠢ ᠲᠥᠪ ᠦᠨ C ᠪᠤᠶᠤ C4 ᠢ ᠵᠢᠭᠠᠨ᠎ᠠ᠃ ᠱᠤᠭᠤᠮ ᠢ ᠳᠣᠣᠷ᠎ᠠ ᠠᠴᠠ ᠨᠢ ᠲᠣᠭᠠᠯᠠᠭᠠᠷᠠᠢ᠃',
  'F♯4, F♯4, F4, F4 | F4 ᠢ ᠪᠦᠲᠦᠭᠡᠭᠡᠷᠡᠢ᠃ ᠡᠬᠢᠨ ᠦ F ᠳᠡᠭᠡᠷ᠎ᠡ ᠳᠢᠶᠧᠽ ♯᠂ ᠭᠤᠷᠪᠠ ᠳᠠᠬᠢ ᠳᠡᠭᠡᠷ᠎ᠡ ᠪᠧᠺᠠᠷ ♮ ᠲᠠᠪᠢᠭᠠᠷᠠᠢ᠃ ᠪᠢᠴᠢᠭᠰᠡᠨ ᠲᠦᠷ ᠥᠭᠡᠷᠴᠢᠯᠡᠬᠦ ᠲᠡᠮᠳᠡᠭ ᠨᠢ ᠠᠳᠠᠯᠢ ᠦᠰᠦᠭᠡᠨ ᠨᠡᠷ᠎ᠡ᠂ ᠠᠳᠠᠯᠢ ᠣᠺᠲ᠋ᠠᠸ ᠲᠠᠢ ᠳᠠᠷᠠᠭᠠᠴᠢ ᠨᠣᠲ᠋ ᠤᠳ ᠲᠤ ᠲᠠᠺᠲ᠋ ᠤᠨ ᠵᠢᠷᠤᠭᠠᠰᠤ ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠦᠢᠯᠡᠴᠢᠯᠡᠨ᠎ᠡ᠃ ᠪᠧᠺᠠᠷ ᠥᠮᠦᠨᠡᠬᠢ ᠳᠢᠶᠧᠽ ᠢ ᠴᠤᠴᠠᠯᠠᠨ᠎ᠠ᠃',
  'G ᠮᠠᠵᠣᠷ ᠤᠨ ᠲᠣᠨᠠᠯ ᠲᠡᠮᠳᠡᠭ F♯ ᠢ ᠵᠢᠭᠠᠨ᠎ᠠ: F♯4, F4, F4, F♯4 | F♯4᠃ ᠬᠣᠶᠠᠷ ᠳᠠᠬᠢ ᠨᠣᠲ᠋ ᠤᠨ ᠪᠧᠺᠠᠷ ♮ ᠡᠨᠡ ᠲᠠᠺᠲ᠋ ᠲᠤ F♯ ᠢ ᠴᠤᠴᠠᠯᠠᠨ᠎ᠠ᠃ ᠳᠥᠷᠪᠡ ᠳᠡᠬᠢ ᠨᠣᠲ᠋ ᠳᠡᠭᠡᠷ᠎ᠡ ᠳᠢᠶᠧᠽ ♯ ᠲᠠᠪᠢᠵᠤ ᠪᠤᠴᠠᠭᠠᠭᠠᠷᠠᠢ᠃ ᠳᠠᠷᠠᠭᠠᠴᠢ ᠲᠠᠺᠲ᠋ ᠡᠬᠢᠯᠡᠬᠦ ᠳᠦ ᠲᠣᠨᠠᠯ ᠲᠡᠮᠳᠡᠭ ᠦᠨ F♯ ᠳᠠᠬᠢᠨ ᠦᠢᠯᠡᠴᠢᠯᠡᠨ᠎ᠡ᠃',
  'F ᠮᠠᠵᠣᠷ ᠤᠨ ᠲᠣᠨᠠᠯ ᠲᠡᠮᠳᠡᠭ B♭ ᠢ ᠵᠢᠭᠠᠨ᠎ᠠ: B♭4, B4, B4, B♭4 | B♭4᠃ ᠬᠣᠶᠠᠷ ᠳᠠᠬᠢ ᠨᠣᠲ᠋ ᠲᠤ ᠪᠧᠺᠠᠷ ♮᠂ ᠳᠥᠷᠪᠡ ᠳᠡᠬᠢ ᠨᠣᠲ᠋ ᠲᠤ ᠪᠧᠮᠣᠯᠢ ♭ ᠨᠡᠮᠡᠭᠡᠷᠡᠢ᠃ ᠥᠭᠡᠷᠴᠢᠯᠡᠯᠲᠡ ᠪᠦᠷᠢ ᠶᠢᠨ ᠶᠠᠭ ᠨᠢᠭᠡ ᠬᠠᠭᠠᠰ ᠥᠩᠭᠡ ᠶᠢᠨ ᠢᠯᠭᠠᠭ᠎ᠠ ᠶᠢ ᠰᠣᠨᠣᠰᠤᠭᠠᠷᠠᠢ᠃ ᠳᠠᠷᠠᠭᠠᠴᠢ ᠲᠠᠺᠲ᠋ ᠲᠤ ᠲᠣᠨᠠᠯ ᠲᠡᠮᠳᠡᠭ ᠦᠨ B♭ ᠳᠠᠬᠢᠨ ᠦᠢᠯᠡᠴᠢᠯᠡᠨ᠎ᠡ᠃',
  'ᠴᠡᠭ ᠲᠡᠢ ᠳᠥᠷᠪᠡᠲᠦ C4 (1.5 ᠴᠣᠬᠢᠯᠲᠠ)᠂ ᠨᠠᠢᠮᠠᠲᠤ D4 (0.5 ᠴᠣᠬᠢᠯᠲᠠ)᠂ ᠬᠠᠭᠠᠰ E4 (2 ᠴᠣᠬᠢᠯᠲᠠ) ᠨᠡᠢᠯᠡᠭᠡᠳ 4/4 ᠲᠠᠺᠲ᠋ ᠢ ᠳᠦᠭᠦᠷᠭᠡᠨ᠎ᠡ᠃ ᠡᠨᠳᠡ ᠨᠢᠭᠡ ᠴᠣᠬᠢᠯᠲᠠ ᠨᠢ ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋ ᠤᠨ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ᠃ ᠴᠡᠭ ᠨᠣᠲ᠋ ᠤᠨ ᠠᠩᠬᠠᠨ ᠤ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ ᠶᠢᠨ ᠬᠠᠭᠠᠰ ᠢ ᠨᠡᠮᠡᠵᠦ᠂ ᠨᠡᠢᠲᠡ ᠬᠤᠭᠤᠴᠠᠭ᠎ᠠ ᠶᠢ 1.5 ᠳᠠᠬᠢᠨ ᠤᠷᠲᠤᠰᠬᠠᠨ᠎ᠠ᠃',
];
export function lessonTitle(language: Language, id: LessonId): string { return titles[language][(['first','length','quiet','waltz','six','bass','alto','tenor','sharp','natural','flat','dots'] as LessonId[]).indexOf(id)]; }
export function lessonExplanation(language: Language, id: LessonId): string {
  const index = (['first','length','quiet','waltz','six','bass','alto','tenor','sharp','natural','flat','dots'] as LessonId[]).indexOf(id);
  if (language === 'zh-CN') return explainZh[index];
  if (language === 'ja') return explainJa[index];
  if (language === 'mn-Cyrl-MN') return explainMn[index];
  if (language === 'mn-Mong-CN') return explainTraditional[index];
  return explainEn[index];
}
export function clefName(language: Language, clef: Clef): string {
  const labels = language === 'zh-CN' ? ['高音谱号 · G','低音谱号 · F','中音谱号 · C','次中音谱号 · C'] : language === 'ja' ? ['ト音記号','ヘ音記号','ハ音記号（アルト）','ハ音記号（テノール）'] : language === 'mn-Cyrl-MN' ? ['Соль түлхүүр · G','Фа түлхүүр · F','До түлхүүр · альт','До түлхүүр · тенор'] : language === 'mn-Mong-CN' ? ['ᠰᠣᠯᠢ ᠲᠦᠯᠬᠢᠭᠦᠷ · G','ᠹᠠ ᠲᠦᠯᠬᠢᠭᠦᠷ · F','ᠳᠣ ᠲᠦᠯᠬᠢᠭᠦᠷ · ᠠᠯᠲ᠋','ᠳᠣ ᠲᠦᠯᠬᠢᠭᠦᠷ · ᠲ᠋ᠧᠨᠣᠷ'] : ['Treble · G','Bass · F','Alto · C','Tenor · C'];
  return labels[(['treble','bass','alto','tenor'] as Clef[]).indexOf(clef)];
}
export function durationName(language: Language, duration: Duration): string {
  const labels = language === 'zh-CN' ? ['全音符','二分音符','四分音符','八分音符','十六分音符'] : language === 'ja' ? ['全音符','二分音符','四分音符','八分音符','十六分音符'] : language === 'mn-Cyrl-MN' ? ['Бүтэн нот','Хагас нот','Дөрөвт нот','Наймт нот','Арван зургаат нот'] : language === 'mn-Mong-CN' ? ['ᠪᠦᠲᠦᠨ ᠨᠣᠲ᠋','ᠬᠠᠭᠠᠰ ᠨᠣᠲ᠋','ᠳᠥᠷᠪᠡᠲᠦ ᠨᠣᠲ᠋','ᠨᠠᠢᠮᠠᠲᠤ ᠨᠣᠲ᠋','ᠠᠷᠪᠠᠨ ᠵᠢᠷᠭᠤᠭᠠᠲᠤ ᠨᠣᠲ᠋'] : ['Whole','Half','Quarter','Eighth','Sixteenth'];
  return labels[(['whole','half','quarter','eighth','sixteenth'] as Duration[]).indexOf(duration)];
}
