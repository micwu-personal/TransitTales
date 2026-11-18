import type { Song } from './score';
import { ode, variations } from './classical-scores';

type Bilingual = [string, string];
type Route = {
  song: Song;
  composer: Bilingual;
  partNames?: Bilingual[];
  sections: { at: number; scene: number; title: Bilingual; story: Bilingual }[];
};

export const routes: Route[] = [
  {
    song: ode,
    composer: ['Ludwig van Beethoven · Symphony No. 9, IV, mm. 92–187 · Selected orchestral parts', '路德维希·范·贝多芬 · 第九交响曲第四乐章，第92–187小节 · 管弦乐选编'],
    partNames: [
      ['Cello', '大提琴'], ['Double bass', '低音提琴'], ['Bassoon I', '第一巴松'], ['Bassoon II', '第二巴松'],
      ['Violin I', '第一小提琴'], ['Violin II', '第二小提琴'], ['Viola', '中提琴'],
      ['Flutes I & II', '第一、第二长笛'], ['Horns I & II', '第一、第二圆号'], ['Timpani (pitched synth)', '定音鼓（合成音色）'],
    ],
    sections: [
      { at: 0, scene: 0, title: ['Copper Concert Quarter', '铜色音乐街区'], story: ['Vienna, 1824: Beethoven’s Ninth first sounded in a theatre. Tonight, our train sets out beneath the concert hall windows.', '1824年，贝多芬的第九交响曲在维也纳的一座剧院首演。今晚，我们的列车从音乐厅窗下启程。'] },
      { at: 32, scene: 1, title: ['The Frostwater Crossing', '霜河渡桥'], story: ['The tune returns as the wheels cross the glassy river. Watch for the little warm lights on the far bank.', '旋律再度响起，车轮驶过如镜的河面。留意对岸点点暖光。'] },
      { at: 64, scene: 4, title: ['Hush at the Viaduct', '静谧高架桥'], story: ['The melody climbs in shorter steps while the train follows the stone arches up into the hills.', '旋律踏着更短的音符向上攀登，列车沿着石拱桥驶入群山。'] },
      { at: 96, scene: 4, title: ['The Bassoon Crossing', '巴松渡桥'], story: ['The theme rises an octave, and the bassoons answer with two new lines.', '主题旋律升高一个八度，两支巴松以新的声部应答。'] },
      { at: 192, scene: 1, title: ['The Violin Promenade', '小提琴长廊'], story: ['The first violins take the tune while the second violins weave around it.', '第一小提琴接过旋律，第二小提琴奏出交织的声部。'] },
      { at: 288, scene: 3, title: ['Crownlight Terminus', '冠灯终点站'], story: ['Flutes carry the tune above horns, strings and timpani as the train rolls into the station.', '长笛在圆号、弦乐与定音鼓之上奏响主题，列车缓缓驶入终点站。'] },
    ],
  },
  {
    song: variations,
    composer: ['Wolfgang Amadeus Mozart · K. 265, Thema, mm. 1–24 · Moonline arrangement', '沃尔夫冈·阿马德乌斯·莫扎特 · K. 265 主题，第1–24小节 · 月光列车编曲'],
    partNames: [
      ['Piano right hand', '钢琴右手'], ['Piano left hand', '钢琴左手'],
      ['Inner strings (Moonline)', '弦乐内声部（月光列车）'], ['Plucked replies (Moonline)', '拨弦应答（月光列车）'],
      ['Bass accents (Moonline)', '低音点奏（月光列车）'],
    ],
    sections: [
      { at: 0, scene: 2, title: ['The Lantern Gardens', '灯笼花园'], story: ['Mozart used an old French tune for twelve piano variations. You may know the tune as “Twinkle, Twinkle, Little Star.”', '莫扎特用一首古老的法国曲调写成了十二首钢琴变奏。你也许听过这首《一闪一闪小星星》。'] },
      { at: 16, scene: 5, title: ['Canal of Petals', '落花运河'], story: ['Two answering phrases drift over the water. Follow the lamps through the floating petals.', '两句相呼应的旋律从水面飘过。跟着灯光，穿过漂浮的花瓣吧。'] },
      { at: 32, scene: 3, title: ['Crownlight Terminus', '冠灯终点站'], story: ['The opening tune returns just as the station clock comes into view.', '车站的钟楼刚映入眼帘，开头的旋律也回来了。'] },
    ],
  },
];
