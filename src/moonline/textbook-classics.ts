import type { Song, Track } from './score';
import type { Route } from './repertoire';

// Each event lists offset, duration, and written pitches. Units are per quarter note.
type Bars = readonly (readonly (readonly [number, number, ...number[]])[])[];

function part(name: string, bars: Bars, ticksPerBeat: number, ticksPerBar: number, velocity: number): Track {
  return {
    name, role: 'piano', notes: bars.flatMap((bar, i) => bar.flatMap(([offset, duration, ...pitches]) => {
      const start = i * ticksPerBar + offset;
      const beat = start / ticksPerBeat;
      const length = (start + duration) / ticksPerBeat - beat;
      return pitches.map(pitch => ({ pitch, beat, length, velocity }));
    })),
  };
}

// Schubert D. 957 No. 4, mm. 1–16, from OpenScore Lieder lc5004835 (CC0).
const serenadeMelody: Bars = [
  [], [], [], [],
  [[0, 4, 69], [4, 4, 70], [8, 4, 69], [12, 18, 74], [30, 6, 69]],
  [[0, 4, 67], [4, 4, 69], [8, 4, 67], [12, 12, 74], [24, 6, 67]],
  [[0, 18, 69], [18, 6, 67], [24, 4, 67], [28, 4, 65], [32, 4, 64]],
  [[0, 24, 65]],
  [],
  [],
  [[0, 4, 69], [4, 4, 70], [8, 4, 69], [12, 18, 77], [30, 6, 69]],
  [[0, 4, 67], [4, 4, 69], [8, 4, 67], [12, 18, 76], [30, 6, 74]],
  [[0, 18, 72], [18, 6, 70], [24, 4, 70], [28, 4, 69], [32, 4, 67]],
  [[0, 24, 69]],
  [],
  [],
];

const serenadePiano: Bars = [
  [[0, 24, 50], [6, 6, 57, 62], [12, 6, 62, 65], [18, 6, 57, 62], [24, 6, 62, 65], [30, 6, 57, 62]],
  [[6, 6, 58, 62], [12, 6, 62, 65], [18, 6, 58, 62], [24, 6, 62, 65], [30, 6, 58, 62]],
  [[6, 6, 58, 62], [12, 6, 62, 64], [18, 6, 58, 62], [24, 6, 62, 64], [30, 6, 58, 62]],
  [[6, 6, 57, 61], [12, 6, 61, 64], [18, 6, 57, 61], [24, 6, 61, 64], [30, 6, 57, 61]],
  [[0, 24, 50], [6, 6, 57, 62], [12, 6, 62, 65], [18, 6, 57, 62], [24, 6, 62, 65], [30, 6, 57, 62]],
  [[6, 6, 55, 62], [12, 6, 62, 64], [18, 6, 55, 62], [24, 6, 62, 64], [30, 6, 55, 62]],
  [[6, 6, 55, 57, 61], [12, 6, 57, 61, 64], [18, 6, 55, 57, 61], [24, 6, 57, 61, 64], [30, 6, 55, 57, 61]],
  [[0, 24, 50], [6, 6, 53, 57, 62], [12, 6, 57, 62, 65], [18, 6, 53, 57, 62], [24, 6, 57, 62, 65], [30, 6, 53, 57, 62]],
  [[6, 6, 57, 64], [12, 6, 64, 67], [18, 6, 57, 64], [24, 6, 64, 67], [30, 6, 57, 64]],
  [[0, 6, 50], [6, 6, 57, 62], [12, 6, 62, 65], [18, 6, 57, 62], [24, 6, 62, 65], [30, 6, 57, 62]],
  [[0, 24, 50], [6, 6, 57, 62], [12, 6, 62, 65], [18, 6, 57, 62], [24, 6, 62, 65], [30, 6, 57, 62]],
  [[6, 6, 55, 62], [12, 6, 62, 64], [18, 6, 55, 62], [24, 6, 62, 64], [30, 6, 55, 62]],
  [[0, 24, 48], [6, 6, 55, 58, 60], [12, 6, 58, 60, 64], [18, 6, 55, 58, 60], [24, 6, 58, 60, 64], [30, 6, 55, 58, 60]],
  [[6, 6, 53, 57, 60], [12, 6, 57, 60, 65], [18, 6, 53, 57, 60], [24, 6, 57, 60, 65], [30, 6, 65, 74]],
  [[6, 6, 48, 55], [12, 6, 55, 58], [18, 6, 48, 55], [24, 6, 55, 58], [30, 6, 48, 55]],
  [[6, 6, 48, 53], [12, 6, 53, 57], [18, 6, 48, 53], [24, 6, 53, 57], [30, 6, 48, 53]],
];

const serenadeReplies: Bars = [
  [], [], [], [],
  [],
  [],
  [],
  [],
  [[0, 18, 73, 81], [18, 6, 76, 79], [24, 4, 76, 79], [28, 4, 74, 77], [32, 4, 73, 76]],
  [[0, 36, 74, 77]],
  [],
  [],
  [],
  [],
  [[0, 18, 64, 72], [18, 6, 67, 70], [24, 4, 67, 70], [28, 4, 65, 69], [32, 4, 64, 67]],
  [[0, 36, 65, 69]],
];

const serenadeBass: Bars = [
  [[0, 24, 38]], [[0, 24, 34, 46]], [[0, 24, 31, 43]], [[0, 24, 33, 45]],
  [[0, 24, 38]],
  [[0, 24, 34, 46]],
  [[0, 24, 33, 45]],
  [[0, 24, 38]],
  [[0, 6, 33, 45]],
  [[0, 6, 38]],
  [[0, 24, 38]],
  [[0, 24, 34, 46]],
  [[0, 24, 36]],
  [[0, 24, 29, 41]],
  [[0, 6, 36]],
  [[0, 6, 41]],
];

// Chopin Op. 9 No. 2, pickup and mm. 1–4, adapted from Mutopia #1590 (CC BY-SA 3.0).
// Rows are measured from the pickup; the first downbeat is half a beat later.
const nocturneMelody: Bars = [
  [[0, 2, 70], [2, 8, 79], [10, 2, 77], [12, 2, 79], [14, 6, 77], [20, 4, 75], [24, 2, 70]],
  [[2, 4, 79], [6, 2, 72], [8, 4, 84], [12, 2, 79], [14, 6, 82], [20, 4, 80], [24, 2, 79]],
  [[2, 6, 77], [8, 4, 79], [12, 2, 74], [14, 6, 75], [20, 6, 72]],
  [[2, 2, 70], [4, 2, 86], [6, 2, 84], [8, 1, 82], [9, 1, 80], [10, 1, 79], [11, 1, 80], [12, 1, 72], [13, 1, 74], [14, 6, 75]],
];

const nocturnePiano: Bars = [
  [[4, 2, 55, 63], [6, 2, 58, 63, 67], [10, 2, 56, 62], [12, 2, 68, 62, 59], [16, 2, 55, 63], [18, 2, 58, 63, 67], [22, 2, 55, 63], [24, 2, 67, 63, 58]],
  [[4, 2, 55, 64], [6, 2, 58, 64, 67], [10, 2, 55, 64], [12, 2, 70, 64, 60], [16, 2, 53, 61], [18, 2, 58, 61, 64], [22, 2, 53, 60], [24, 2, 65, 60, 56]],
  [[4, 2, 53, 62], [6, 2, 58, 62, 68], [10, 2, 55, 65], [12, 2, 67, 65, 62], [16, 2, 55, 63], [18, 2, 60, 63, 67], [22, 2, 54, 63], [24, 2, 66, 63, 60]],
  [[4, 2, 53, 63], [6, 2, 58, 63, 68], [10, 2, 53, 62], [12, 2, 68, 58], [16, 2, 55, 63], [18, 2, 58, 63, 67], [22, 2, 55, 63], [24, 2, 58, 63, 67]],
];

const nocturneBass: Bars = [
  [[2, 2, 39], [8, 2, 51], [14, 2, 39], [20, 2, 38]],
  [[2, 2, 36], [8, 2, 48], [14, 2, 41], [20, 2, 41]],
  [[2, 2, 46], [8, 2, 47], [14, 2, 48], [20, 2, 45]],
  [[2, 2, 46], [8, 2, 34], [14, 2, 39], [20, 2, 51]],
];

const serenade: Song = {
  id: 'schubert-serenade', title: 'Ständchen (Serenade)', bpm: 88, beats: 48,
  tracks: [
    part('Melody', serenadeMelody, 12, 36, 86),
    part('Piano accompaniment', serenadePiano, 12, 36, 50),
    part('Piano replies', serenadeReplies, 12, 36, 70),
    part('Piano bass', serenadeBass, 12, 36, 57),
  ],
};

const nocturne: Song = {
  id: 'chopin-nocturne-op-9-no-2', title: 'Nocturne in E-flat Major', bpm: 66, beats: 24.5,
  midiCopyright: 'Engraving (c) 2014 Renato Biolcati Rinaldi, Mutopia #1590 (https://mutopiaproject.org/cgibin/piece-info.cgi?id=1590). Moonline adaptation: opening excerpt, fixed tempo, new dynamics, split left hand. CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/',
  tracks: [
    part('Melody', nocturneMelody, 4, 24, 84),
    part('Piano chords', nocturnePiano, 4, 24, 48),
    part('Piano bass', nocturneBass, 4, 24, 58),
  ],
};

export const textbookClassics: Route[] = [
  {
    song: serenade,
    titleZh: '小夜曲（舒伯特）',
    composer: ['Franz Schubert · D. 957 No. 4, mm. 1–16 · OpenScore Lieder (CC0)', '弗朗茨·舒伯特 · D. 957 第4首，第1–16小节 · OpenScore Lieder（CC0）'],
    partNames: [['Melody', '主旋律'], ['Piano accompaniment', '钢琴伴奏'], ['Piano replies', '钢琴应答'], ['Piano bass', '钢琴低音']],
    sections: [
      { at: 0, scene: 2, title: ['The Garden Gate', '花园门前'], story: ['Listen to the piano’s four-bar introduction. Your first notes arrive as the train passes the gate.', '先听四小节钢琴前奏。列车穿过花园大门时，轮到你奏出第一句。'] },
      { at: 24, scene: 1, title: ['The Window Across the River', '彼岸的窗'], story: ['Leave room for the piano to echo your phrase across the river.', '为钢琴留一点空白，让它隔着河水回应你的乐句。'] },
      { at: 42, scene: 3, title: ['The Lamplit Platform', '灯下站台'], story: ['The piano answers one last time, coming to rest in F major.', '钢琴最后应答一次，在 F 大调中静静停下。'] },
    ],
  },
  {
    song: nocturne,
    titleZh: '降E大调夜曲（肖邦）',
    composer: ['Frédéric Chopin · Op. 9 No. 2, opening phrase · Adapted from Renato Biolcati Rinaldi / Mutopia (CC BY-SA 3.0)', '弗雷德里克·肖邦 · Op. 9 第2首，开头乐句 · 改编自 Renato Biolcati Rinaldi / Mutopia（CC BY-SA 3.0）'],
    partNames: [['Melody', '主旋律'], ['Piano chords', '钢琴和弦'], ['Piano bass', '钢琴低音']],
    sections: [
      { at: 0, scene: 1, title: ['The Blue Hour', '蓝色暮光'], story: ['The melody starts just before the wheels settle into the swaying accompaniment.', '旋律先一步响起，随后车轮轻轻摇曳，踏上伴奏的节拍。'] },
      { at: 12.5, scene: 5, title: ['Reflections on the Canal', '运河倒影'], story: ['Follow the turns in the melody as the lamps ripple in the canal.', '跟随旋律里的转折，看灯影在运河里荡开。'] },
      { at: 18.5, scene: 3, title: ['Silver Clock Station', '银钟站'], story: ['A quick flourish leads to E-flat. Let the piano finish the opening phrase.', '一串轻快的装饰音回到降 E。听钢琴把开头的乐句奏完。'] },
    ],
  },
];
