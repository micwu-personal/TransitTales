import type { Song, Track } from './score';

const melody: Track = { name: 'Melody', role: 'piano', notes: [] };
const plucks: Track = { name: 'Plucked strings', role: 'guitar', notes: [] };
const strings: Track = { name: 'Soft strings', role: 'pad', notes: [] };
const bass: Track = { name: 'Bass', role: 'bass', notes: [] };

// Hüttner’s melody as printed by John Barrow (1804), here in C as in the linked
// re-engraving. Principal notes only; the printed slurs are not separate events.
const A = 57, C = 60, D = 62, E = 64, G = 67, a = 69, c = 72;
const bars: readonly (readonly (readonly [pitch: number | null, length: number])[])[] = [
  [[E, 1], [E, .5], [G, .5], [a, .5], [c, .5], [c, .5], [a, .5]],
  [[G, 1], [G, .5], [a, .5], [G, 1], [null, 1]],
  [[E, 1], [E, .5], [G, .5], [a, .5], [c, .5], [c, .5], [a, .5]],
  [[G, 1], [G, .5], [a, .5], [G, 1], [null, 1]],
  [[G, 1], [G, 1], [G, 1], [E, .5], [G, .5]],
  [[a, 1], [a, 1], [G, 2]],
  [[E, 1], [D, .5], [E, .5], [G, 1], [E, .5], [D, .5]],
  [[C, 1], [C, .5], [D, .5], [C, 2]],
  [[E, .5], [D, .5], [C, .5], [E, .5], [D, 1.5], [E, .5]],
  [[G, 1], [a, .5], [c, .5], [G, 2]],
  [[D, 1], [E, .5], [G, .5], [D, .5], [E, .5], [C, .5], [A, .5]],
  [[A, 2], [A, 1], [C, 1]],
  [[D, 1.5], [E, .5], [C, .5], [D, .5], [C, .5], [A, .5]],
  [[A, 2], [null, 2]],
];

bars.forEach((bar, index) => {
  let beat = index * 4;
  for (const [pitch, length] of bar) {
    if (pitch !== null) melody.notes.push({ pitch, beat, length, velocity: beat % 4 === 0 ? 91 : 82 });
    beat += length;
  }
});

// Original accompaniment: open fifths under the first statements, split bass
// movement where the tune turns, and a softer modal cadence rather than a V–I.
const harmony: readonly [beat: number, length: number, low: number, voicing: readonly [number, number, number]][] = [
  [0, 4, 48, [55, 60, 64]], [4, 4, 43, [50, 55, 60]],
  [8, 4, 45, [52, 55, 60]], [12, 4, 43, [50, 55, 60]],
  [16, 4, 48, [55, 60, 64]], [20, 2, 41, [53, 57, 60]], [22, 2, 43, [50, 55, 62]],
  [24, 2, 45, [52, 57, 60]], [26, 2, 43, [50, 55, 62]], [28, 4, 48, [52, 55, 60]],
  [32, 2, 48, [52, 55, 60]], [34, 2, 43, [50, 55, 62]], [36, 4, 48, [55, 60, 64]],
  [40, 2, 43, [50, 55, 59]], [42, 2, 45, [52, 57, 60]], [44, 4, 45, [52, 57, 60]],
  [48, 2, 50, [53, 57, 62]], [50, 2, 45, [52, 57, 60]], [52, 3.5, 45, [52, 57, 60]],
];
for (const [beat, length, low, [bottom, middle, top]] of harmony) {
  bass.notes.push({ pitch: low, beat, length: length - .25, velocity: 59 });
  if (beat >= 8) {
    for (const pitch of [bottom, middle]) {
      strings.notes.push({ pitch, beat, length: length - .25, velocity: 44 });
    }
  }
  const figure = beat === 52 ? [[bottom, .5], [top, 1.5]] : length === 2
    ? [[middle, .5], [top, 1.25]] : [[bottom, .5], [middle, 1.25], [top, 2.5], [middle, 3.25]];
  for (const [pitch, offset] of figure) {
    plucks.notes.push({ pitch, beat: beat + offset, length: .5, velocity: pitch === top ? 57 : 51 });
  }
}

const song: Song = {
  id: 'jasmine-flower-1804', title: 'Jasmine Flower (1804 variant)', bpm: 92, beats: 56,
  tracks: [melody, plucks, strings, bass],
};

export const jasmineRoute = {
  song,
  titleZh: '茉莉花（1804 年记谱异本）',
  composer: ['Traditional Chinese · Hüttner / Barrow, 1804 · Moonline arrangement', '中国传统民歌 · 赫特纳记谱、巴罗刊载（1804） · 月光列车编曲'],
  partNames: [['Melody', '主旋律'], ['Plucked strings', '拨弦'], ['Soft strings', '柔弦'], ['Bass', '低音']],
  sections: [
    { at: 0, scene: 2, title: ['Jasmine Courtyard', '茉莉小院'], story: ['The first phrase drifts over a garden wall. This old written version differs from the tune commonly sung in class.', '第一句旋律飘过花墙。这份早期记谱与今天课堂上常唱的曲调不同。'] },
    { at: 16, scene: 5, title: ['Canal of Petals', '落花运河'], story: ['The train follows the canal. Hear the plucked strings answer across the water.', '列车沿运河前行，拨弦声隔水应答。'] },
    { at: 32, scene: 1, title: ['The Ink Bridge', '墨影桥'], story: ['By the bridge, the tune descends as if someone were putting the last notes to paper.', '桥边，旋律渐渐落下，仿佛有人正把最后几个音符写在纸上。'] },
    { at: 48, scene: 3, title: ['Last Light Station', '余灯站'], story: ['The last note settles on a low A. Let it ring as the carriage lights go out.', '最后一个音落在低音 A。车厢灯缓缓熄灭，余音仍在。'] },
  ],
} satisfies {
  song: Song;
  titleZh: string;
  composer: [string, string];
  partNames: [string, string][];
  sections: { at: number; scene: number; title: [string, string]; story: [string, string] }[];
};
