import type { Note, Song, Track } from './score';

type Bilingual = [string, string];
type Route = {
  song: Song;
  composer: Bilingual;
  sections: { at: number; scene: number; title: Bilingual; story: Bilingual }[];
};

type Tone = number | [pitch: number, beats: number];

function score(phrases: Tone[][]): Note[] {
  let beat = 0;
  return phrases.flatMap((phrase) => phrase.map((tone, index) => {
    const [pitch, duration] = typeof tone === 'number' ? [tone, 1] : tone;
    const note = { pitch, beat, length: duration - Math.min(.12, duration * .18), velocity: index === 0 ? 94 : (beat % 4 === 0 ? 88 : 82) };
    beat += duration;
    return note;
  }));
}

// Each voicing is one bar: bass note followed by the three upper voices.
const D = [50, 57, 62, 66];
const A7 = [45, 55, 61, 64];
const G = [43, 55, 59, 62];
const Bm = [47, 54, 59, 62];
const Em = [52, 55, 59, 64];
const C = [48, 55, 60, 64];
const F = [41, 53, 57, 60];
const G7 = [43, 53, 59, 62];
const Am = [45, 52, 57, 60];

function arrange(id: string, title: string, bpm: number, melody: Tone[][], harmony: number[][], texture: number[], brushed = false): Song {
  const keys: Track = { name: 'Theme', role: 'piano', notes: score(melody) };
  const bass: Track = { name: 'Cello', role: 'bass', notes: [] };
  const harp: Track = { name: 'Plucked strings', role: 'guitar', notes: [] };
  const strings: Track = { name: 'Muted strings', role: 'pad', notes: [] };
  harmony.forEach(([root, ...voicing], bar) => {
    const beat = bar * 4;
    const style = texture[bar];
    const last = bar === harmony.length - 1;
    bass.notes.push({ pitch: root, beat, length: style === 1 && !last ? 1.7 : 3.75, velocity: style === 2 ? 57 : 46 });
    if (style === 1 && !last) bass.notes.push({ pitch: voicing[0] - 12, beat: beat + 2, length: 1.7, velocity: 43 });
    if (!last && style === 1) {
      [0, .5, 1, 1.5, 2, 2.5, 3, 3.5].forEach((offset, i) => {
        harp.notes.push({ pitch: voicing[[0, 1, 2, 1][i % 4]], beat: beat + offset, length: .37, velocity: i % 4 === 0 ? 50 : 39 });
      });
    } else if (!last && style === 0) {
      harp.notes.push({ pitch: voicing[1], beat: beat + 1.5, length: .62, velocity: 42 },
        { pitch: voicing[2], beat: beat + 2.75, length: .67, velocity: 38 });
    } else {
      voicing.forEach((pitch, i) => strings.notes.push({ pitch, beat: beat + i * .07, length: 3.8 - i * .07, velocity: last ? 47 : 37 }));
    }
  });
  const tracks = [keys, harp, bass, strings];
  if (brushed) {
    const drums: Track = { name: 'Soft railway percussion', role: 'drums', notes: [] };
    harmony.forEach((_, bar) => {
      const beat = bar * 4;
      drums.notes.push({ pitch: 36, beat, length: .16, velocity: 48 });
      if (bar === harmony.length - 1) return;
      drums.notes.push({ pitch: 42, beat: beat + .5, length: .08, velocity: 35 },
        { pitch: 38, beat: beat + 1, length: .13, velocity: 43 },
        { pitch: 42, beat: beat + 1.5, length: .08, velocity: 32 });
      if (texture[bar] !== 0) drums.notes.push({ pitch: 36, beat: beat + 2, length: .15, velocity: 42 });
      drums.notes.push({ pitch: 42, beat: beat + 2.5, length: .08, velocity: 34 },
        { pitch: 38, beat: beat + 3, length: .13, velocity: 40 });
    });
    tracks.push(drums);
  }
  return { id, title, bpm, beats: harmony.length * 4, tracks };
}

// Beethoven's Ninth, Op. 125, final-movement theme, in the original D major.
const ode = arrange('ode-to-joy', 'Ode to Joy', 116, [
  [66, 66, 67, 69, 69, 67, 66, 64, 62, 62, 64, 66, [66, 1.5], [64, .5], [64, 2]],
  [66, 66, 67, 69, 69, 67, 66, 64, 62, 62, 64, 66, [64, 1.5], [62, .5], [62, 2]],
  [64, 64, 66, 62, 64, [66, .5], [67, .5], 66, 62, 64, [66, .5], [67, .5], 66, 64, 62, 64, [57, 2]],
  [66, 66, 67, 69, 69, 67, 66, 64, 62, 62, 64, 66, [64, 1.5], [62, .5], [62, 2]],
], [D, D, G, A7, D, A7, G, D, A7, D, Em, A7, D, Bm, A7, D], [0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 2, 2, 2, 2]);

// Mozart's K. 265 opens with this traditional French air; the rail accompaniment is original.
const variations = arrange('ah-vous-dirai-je-maman', 'Ah vous dirai-je, Maman', 108, [
  [60, 60, 67, 67, 69, 69, [67, 2], 65, 65, 64, 64, 62, 62, [60, 2]],
  [67, 67, 65, 65, 64, 64, [62, 2], 67, 67, 65, 65, 64, 64, [62, 2]],
  [60, 60, 67, 67, 69, 69, [67, 2], 65, 65, 64, 64, 62, 62, [60, 2]],
], [C, F, F, G7, G7, C, G7, C, C, Am, F, C], [1, 1, 1, 0, 0, 0, 1, 1, 2, 2, 2, 2], true);

export const routes: Route[] = [
  {
    song: ode,
    composer: ['Ludwig van Beethoven · Symphony No. 9, Op. 125', '路德维希·范·贝多芬 · 第九交响曲，作品125'],
    sections: [
      { at: 0, scene: 0, title: ['Copper Concert Quarter', '铜色音乐街区'], story: ['Vienna, 1824: Beethoven’s Ninth first sounded in a theatre. Tonight, our train sets out beneath the concert hall windows.', '1824年，贝多芬的第九交响曲在维也纳的一座剧院首演。今晚，我们的列车从音乐厅窗下启程。'] },
      { at: 16, scene: 1, title: ['The Frostwater Crossing', '霜河渡桥'], story: ['The tune returns as the wheels cross the glassy river. Watch for the little warm lights on the far bank.', '旋律再度响起，车轮驶过如镜的河面。留意对岸点点暖光。'] },
      { at: 32, scene: 4, title: ['Hush at the Viaduct', '静谧高架桥'], story: ['The melody climbs in shorter steps while the train follows the stone arches up into the hills.', '旋律踏着更短的音符向上攀登，列车沿着石拱桥驶入群山。'] },
      { at: 48, scene: 3, title: ['Crownlight Terminus', '冠灯终点站'], story: ['The familiar tune comes home. Every little window is lit for your arrival.', '熟悉的旋律回到了起点，每扇小窗都为你的到来亮起。'] },
    ],
  },
  {
    song: variations,
    composer: ['Wolfgang Amadeus Mozart · K. 265, theme (traditional French air)', '沃尔夫冈·阿马德乌斯·莫扎特 · K. 265 主题（法国民歌）'],
    sections: [
      { at: 0, scene: 2, title: ['The Lantern Gardens', '灯笼花园'], story: ['Mozart used an old French tune for twelve piano variations. You may know the tune as “Twinkle, Twinkle, Little Star.”', '莫扎特用一首古老的法国曲调写成了十二首钢琴变奏。你也许听过这首《一闪一闪小星星》。'] },
      { at: 16, scene: 5, title: ['Canal of Petals', '落花运河'], story: ['Two answering phrases drift over the water. Follow the lamps through the floating petals.', '两句相呼应的旋律从水面飘过。跟着灯光，穿过漂浮的花瓣吧。'] },
      { at: 32, scene: 3, title: ['Crownlight Terminus', '冠灯终点站'], story: ['The opening tune returns just as the station clock comes into view.', '车站的钟楼刚映入眼帘，开头的旋律也回来了。'] },
    ],
  },
];
