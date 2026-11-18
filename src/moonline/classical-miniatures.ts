import type { Note, Song, Track } from './score';

type Bilingual = [string, string];
type Miniature = {
  song: Song;
  titleZh: string;
  composer: Bilingual;
  partNames: Bilingual[];
  sections: { at: number; scene: number; title: Bilingual; story: Bilingual }[];
};

// Successive [MIDI pitch or chord, quarter-note beats] events; null advances through a rest.
type Bar = readonly (readonly [pitches: number | readonly number[] | null, beats: number])[];
type Phrasing = (bar: number, offset: number, length: number) => number;

function piano(name: string, meter: number, bars: readonly Bar[], velocity: Phrasing, gate: Phrasing = (_bar, _beat, length) => length): Track {
  const notes: Note[] = [];
  bars.forEach((bar, index) => {
    let offset = 0;
    for (const [pitches, length] of bar) {
      if (pitches !== null) {
        for (const pitch of typeof pitches === 'number' ? [pitches] : pitches) {
          notes.push({ pitch, beat: index * meter + offset, length: gate(index, offset, length), velocity: velocity(index, offset, length) });
        }
      }
      offset += length;
    }
  });
  return { name, role: 'piano', notes };
}

const quarterNotes = (...pitches: number[]): Bar => pitches.map(pitch => [pitch, 1] as const);
const eighthNotes = (...pitches: number[]): Bar => pitches.map(pitch => [pitch, .5] as const);
const minuetFigure = (quarter: number, ...eighths: number[]): Bar => [[quarter, 1], ...eighthNotes(...eighths)];

// Bach-Gesellschaft via Mutopia #75. Both staves, mm. 1–32; write out each strain once.
// Use the principal notes without grace notes or mordent/prall realizations.
const minuetFirstPhrase: readonly Bar[] = [
  minuetFigure(74, 67, 69, 71, 72), quarterNotes(74, 67, 67),
  minuetFigure(76, 72, 74, 76, 78), quarterNotes(79, 67, 67),
  minuetFigure(72, 74, 72, 71, 69), minuetFigure(71, 72, 71, 69, 67),
];
const minuetRight: readonly Bar[] = [
  ...minuetFirstPhrase, minuetFigure(66, 67, 69, 71, 67), [[69, 3]], // mm. 1–8
  ...minuetFirstPhrase, minuetFigure(69, 71, 69, 67, 66), [[67, 3]], // mm. 9–16
  minuetFigure(83, 79, 81, 83, 79), minuetFigure(81, 74, 76, 78, 74), // mm. 17–18
  minuetFigure(79, 76, 78, 79, 74), [[73, 1], [71, .5], [73, .5], [69, 1]],
  eighthNotes(69, 71, 73, 74, 76, 78), quarterNotes(79, 78, 76), quarterNotes(78, 69, 73), [[74, 3]],
  [[74, 1], [67, .5], [66, .5], [67, 1]], [[76, 1], [67, .5], [66, .5], [67, 1]], // mm. 25–26
  quarterNotes(74, 72, 71), [...eighthNotes(69, 67, 66, 67), [69, 1]],
  eighthNotes(62, 64, 66, 67, 69, 71), quarterNotes(72, 71, 69),
  [...eighthNotes(71, 74), ...quarterNotes(67, 66)], [[[59, 62, 67], 3]],
];
const minuetLeft: readonly Bar[] = [
  [[[55, 59, 62], 2], [57, 1]], [[59, 3]], [[60, 3]], [[59, 3]], // mm. 1–4
  [[57, 3]], [[55, 3]], quarterNotes(62, 59, 55), minuetFigure(62, 50, 60, 59, 57),
  [[59, 2], [57, 1]], quarterNotes(55, 59, 55), [[60, 3]], minuetFigure(59, 60, 59, 57, 55), // mm. 9–12
  [[57, 2], [54, 1]], [[55, 2], [59, 1]], quarterNotes(60, 62, 50), [[55, 2], [43, 1]],
  [[55, 3]], [[54, 3]], quarterNotes(52, 55, 52), [[57, 2], [45, 1]], // mm. 17–20
  [[57, 3]], quarterNotes(59, 62, 61), quarterNotes(62, 54, 57), quarterNotes(62, 50, 60),
  [[59, 2], [59, 1]], [[60, 2], [60, 1]], quarterNotes(59, 57, 55), [[62, 2]], // mm. 25–28
  [[50, 3]], quarterNotes(52, 55, 54), quarterNotes(55, 47, 50), quarterNotes(55, 50, 43),
];
const minuetLift = [3, 0, 4, 2, 2, 0, 1, -5];
const minuetBass = piano('Piano left hand', 3, minuetLeft, (bar, offset) => 53 + minuetLift[bar % 8] - 2 * offset);
// Independent notes in the lower staff overlap the bass at mm. 25, 26 and 29.
minuetBass.notes.push(
  { pitch: 62, beat: 73, length: 2, velocity: 54 },
  { pitch: 64, beat: 76, length: 2, velocity: 55 },
  { pitch: 54, beat: 86, length: 1, velocity: 53 },
);
minuetBass.notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
const minuet: Song = {
  id: 'minuet-in-g', title: 'Minuet in G Major', bpm: 112, beats: 96,
  tracks: [
    piano('Piano right hand', 3, minuetRight, (bar, offset, length) =>
      Math.round(72 + minuetLift[bar % 8] + (bar >= 16 && bar < 24 ? 3 : 0) - offset - (length === .5 ? 2 : 0))),
    minuetBass,
  ],
};

// Dover reproduction via Mutopia #37. Start at printed m. 3, play through the
// D-major first ending (m. 39), and stop before jumping back for the second ending.
// Long melody notes span empty bars where the printed score ties them across barlines.
const satieMotif: readonly Bar[] = [
  [[null, 1], [78, 1], [81, 1]], quarterNotes(79, 78, 73), quarterNotes(71, 73, 74), [[69, 3]],
];
const satieMelody: readonly Bar[] = [
  [], [], // mm. 3–4: accompaniment alone
  ...satieMotif, [[66, 12]], [], [], [], // mm. 5–12
  ...satieMotif, [[73, 3]], [[78, 3]], [[64, 9]], [], [], // mm. 13–21
  quarterNotes(69, 71, 72), quarterNotes(76, 74, 71), quarterNotes(74, 72, 71), // mm. 22–24
  [[74, 5]], [[null, 2], [74, 1]], quarterNotes(76, 77, 79), quarterNotes(81, 72, 74),
  quarterNotes(76, 74, 71), [[74, 5]], [[null, 2], [74, 1]],
  [[79, 3]], [[78, 3]], quarterNotes(71, 69, 71), quarterNotes(73, 74, 76), // mm. 32–35
  quarterNotes(73, 74, 76), [[66, 3]], [[72, 3]], [[74, 3]],
];
const gMajor7 = [59, 62, 66], dMajor7 = [57, 61, 66];
const satieOffbeat = (chord: readonly number[]): Bar => [[null, 1], [chord, 2]];
const satieRockingPair = [satieOffbeat(gMajor7), satieOffbeat(dMajor7)];
const satieChords: readonly Bar[] = [
  ...satieRockingPair, ...satieRockingPair, ...satieRockingPair, ...satieRockingPair,
  ...satieRockingPair, ...satieRockingPair, ...satieRockingPair, // mm. 3–16
  ...[dMajor7, gMajor7, [55, 59], [59, 62, 67], [53, 57, 62], // mm. 17–21
    [57, 60, 64], [55, 59, 64], [50, 55, 59, 64], [48, 52, 57, 62], [48, 54, 57, 62],
    [57, 60, 65], [57, 60, 64], [50, 55, 59, 64], [48, 52, 57, 62], [48, 54, 57, 62],
    [59, 64, 67], dMajor7, gMajor7, [61, 64, 69], [57, 61, 66, 69], // mm. 32–36
  ].map(satieOffbeat),
  [[null, 1], [[47, 57, 62], 1], [[52, 59, 62, 67], 1]],
  [[[60, 64, 69], 3]], [[[62, 66, 69], 3]],
];
const satieBass = [
  43, 38, 43, 38, 43, 38, 43, 38, 43, 38, 43, 38, 43, 38, // mm. 3–16
  42, 35, 40, 40, 38, 33, 38, 38, 38, 38, 38, 38, 38, 38, 38, // mm. 17–31
  40, 42, 35, 40, 40, 40, [45, 55], [38, 45, 50], // mm. 32–39
].map((pitches): Bar => [[pitches, 3]]);
const gymnopedie: Song = {
  id: 'gymnopedie-no-1', title: 'Gymnopédie No. 1', bpm: 76, beats: 111,
  tracks: [
    piano('Melody', 3, satieMelody, (bar, offset, length) =>
      67 + ([3, 4, 11, 12, 20, 32].includes(bar) ? 5 : 0) + (offset === 1 ? 2 : 0) - (length >= 5 || bar >= 34 ? 5 : 0)),
    piano('Inner harmony', 3, satieChords, (bar, offset) =>
      (bar < 2 ? 56 : bar >= 29 ? 50 : 48) + (offset === 2 ? 2 : 0) + (bar === 6 ? 3 : 0)),
    piano('Bass line', 3, satieBass, bar => bar < 2 ? 56 : bar % 2 === 0 ? 51 : 48),
  ],
};

// Grieg’s piano version, The University Society (1918) via Mutopia #1888.
// Opening call and the first three theme groups, mm. 1–25, at a steady march tempo.
function mountainTheme(b: number, octaveCadence: boolean): readonly Bar[] {
  const first = eighthNotes(b, b + 2, b + 3, b + 5, b + 7, b + 3);
  return [
    [...first, [b + 7, 1]],
    [...eighthNotes(b + 6, b + 2), [b + 6, 1], ...eighthNotes(b + 5, b + 1), [b + 5, 1]],
    [...first, ...eighthNotes(b + 7, b + 12)],
    [...eighthNotes(b + 10, b + 7, b + 3, b + 7), [octaveCadence ? [b - 2, b + 10] : b + 10, 2]],
  ];
}
function mountainAnswer(fSharp: number, octaveCadence: boolean): readonly Bar[] {
  const first: Bar = [...eighthNotes(fSharp, fSharp + 2, fSharp + 4, fSharp + 5, fSharp + 7, fSharp + 4), [fSharp + 7, 1]];
  const reply: Bar = [...eighthNotes(fSharp + 8, fSharp + 4), [fSharp + 8, 1]];
  return [
    first, [...reply, ...eighthNotes(fSharp + 7, fSharp + 4), [fSharp + 7, 1]],
    first, [...reply, [octaveCadence ? [fSharp - 5, fSharp + 7] : fSharp + 7, 2]],
  ];
}
const mountainRight: readonly Bar[] = [
  [[[54, 66], 4]], // m. 1: unaccompanied horn-like call
  ...mountainTheme(35, false), ...mountainTheme(47, true), // mm. 2–9
  ...mountainAnswer(42, false), ...mountainAnswer(54, true), // mm. 10–17
  ...mountainTheme(35, false), ...mountainTheme(47, true), // mm. 18–25
];
const mountainPulse = quarterNotes(23, 30, 23, 30), mountainTurn = quarterNotes(26, 33, 26, 33);
const mountainShadow = quarterNotes(30, 37, 30, 37), mountainReply = quarterNotes(26, 34, 30, 37);
const mountainLeft: readonly Bar[] = [
  [], // m. 1
  mountainPulse, mountainPulse, mountainPulse, mountainTurn,
  mountainPulse, mountainPulse, mountainPulse, mountainTurn,
  mountainShadow, mountainReply, mountainShadow, mountainReply,
  mountainShadow, mountainReply, mountainShadow, mountainReply,
  mountainPulse, mountainPulse, mountainPulse, mountainTurn,
  mountainPulse, mountainPulse, quarterNotes(23, 35, 33, 31), quarterNotes(30, 28, 25, 23),
];
const mountainKing: Song = {
  id: 'in-the-hall-of-the-mountain-king', title: 'In the Hall of the Mountain King', bpm: 124, beats: 100,
  tracks: [
    piano('Piano right hand', 4, mountainRight,
      (bar, offset, length) => bar === 0 ? 65 : 59 + 3 * Math.floor((bar - 1) / 4) + (offset === 0 || offset === 2 ? 6 : 0) + (length === 2 ? 5 : 0),
      (bar, _offset, length) => bar === 0 || length === 2 ? length : length * .5),
    piano('Piano left hand', 4, mountainLeft,
      (bar, offset) => 51 + 2 * Math.floor((bar - 1) / 4) + (offset % 2 === 0 ? 4 : 0),
      (bar, _offset, length) => length * (bar >= 9 && bar < 17 ? .875 : .5)),
  ],
};

const pianoHands: Bilingual[] = [['Piano right hand', '钢琴右手'], ['Piano left hand', '钢琴左手']];

export const classicalMiniatures: Miniature[] = [
  {
    song: minuet,
    titleZh: 'G大调小步舞曲',
    composer: ['Christian Petzold · BWV Anh. 114 · Both keyboard staves', '克里斯蒂安·佩措尔德 · BWV Anh. 114 · 键盘双声部'],
    partNames: pianoHands,
    sections: [
      { at: 0, scene: 0, title: ['The Ballroom Windows', '舞厅窗畔'], story: ['Through the open windows, dancers take the first three steps of the minuet. Our train sets off in time with them.', '透过敞开的窗户，舞者踏出小步舞曲的前三拍。列车也跟着舞步启程。'] },
      { at: 24, scene: 2, title: ['A Turn in the Gardens', '花园回旋'], story: ['The opening steps return, but this time the phrase comes to rest as we round the garden bend.', '开头的舞步再度响起；这一次，列车绕过花园的弯道，乐句也安稳地落下。'] },
      { at: 48, scene: 1, title: ['The Bright Crossing', '明亮渡桥'], story: ['The new strain begins higher and heads toward D major. Across the river, the windows look like stars.', '新乐段从更高的音区出发，转向D大调。河对岸的灯窗宛如点点星光。'] },
      { at: 72, scene: 3, title: ['The Courtyard Platform', '庭院站台'], story: ['Listen for the lower voice answering beneath the tune. The dance finds its way back to G as we arrive.', '听，低声部在旋律下方应答。列车进站时，舞曲回到了G大调。'] },
    ],
  },
  {
    song: gymnopedie,
    titleZh: '第一号吉姆诺佩迪舞曲',
    composer: ['Erik Satie · Gymnopédie No. 1, mm. 3–39 · Through the first ending', '埃里克·萨蒂 · 第一号吉姆诺佩迪舞曲，第3–39小节 · 至第一结尾'],
    partNames: [['Melody', '旋律'], ['Inner harmony', '内声部和弦'], ['Bass line', '低音声部']],
    sections: [
      { at: 0, scene: 5, title: ['The Empty Canal', '静水运河'], story: ['A low note and a quiet chord set the pace before the tune enters. Watch their reflections ripple in the canal.', '旋律尚未响起，低音与轻柔的和弦已定下步调。看它们的倒影在运河上泛起涟漪。'] },
      { at: 6, scene: 5, title: ['A Light on the Water', '水上一灯'], story: ['A single melody rises over the same two chords, like a lamp drifting out from under a bridge.', '一条旋律从交替的两个和弦中升起，像一盏灯缓缓漂出桥洞。'] },
      { at: 30, scene: 2, title: ['The Sound Hangs in the Air', '余音未散'], story: ['The tune begins again, then holds a low E while the harmony moves underneath it.', '旋律再次响起，随后停留在一个低些的E音上，任下方的和声继续流动。'] },
      { at: 57, scene: 1, title: ['Along the Still River', '静河沿岸'], story: ['The melody begins to move again while a repeated D anchors the harmony, as steady as the far bank.', '旋律重新流动起来，反复出现的D音像远处的河岸一样稳稳托住和声。'] },
      { at: 87, scene: 3, title: ['The Platform at Dusk', '暮色站台'], story: ['The bass starts to move again. Two full chords lead the train to the first ending in D major.', '低音重新迈步。两个饱满的和弦将列车引向D大调的第一结尾。'] },
    ],
  },
  {
    song: mountainKing,
    titleZh: '在山魔王的宫殿里',
    composer: ['Edvard Grieg · Peer Gynt Suite No. 1, Op. 46 No. 4 · Piano version, mm. 1–25', '爱德华·格里格 · 《培尔·金特》第一组曲，作品46之4 · 钢琴版，第1–25小节'],
    partNames: pianoHands,
    sections: [
      { at: 0, scene: 4, title: ['The Mountain Gate', '山门'], story: ['One long call sounds across the gorge. Then the first quiet footsteps approach the mountain hall.', '一声长鸣越过峡谷。随后，一阵轻轻的脚步声向山中大厅靠近。'] },
      { at: 36, scene: 4, title: ['An Answer in the Dark', '黑暗中的回声'], story: ['The footsteps start on a different note. Their clipped rhythm echoes back from the stone arches.', '脚步换了一个起音。短促的节奏从石拱间回荡而来。'] },
      { at: 68, scene: 1, title: ['The Last Bridge', '最后一座桥'], story: ['The opening tune returns. When the bass runs down the steps, our train slips across the bridge and out of sight.', '开头的旋律回来了。低音沿阶而下，列车悄悄驶过桥，消失在夜色中。'] },
    ],
  },
];
