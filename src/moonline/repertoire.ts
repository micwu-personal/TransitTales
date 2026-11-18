import type { Song } from './score';
import { ode, variations } from './classical-scores';

type Bilingual = [string, string];
type Route = {
  song: Song;
  composer: Bilingual;
  sections: { at: number; scene: number; title: Bilingual; story: Bilingual }[];
};

export const routes: Route[] = [
  {
    song: ode,
    composer: ['Ludwig van Beethoven · Symphony No. 9, IV, mm. 92–139 · Lower strings, Breitkopf & Härtel [1864]', '路德维希·范·贝多芬 · 第九交响曲第四乐章，第92–139小节 · 低音弦乐，布赖特科普夫与黑特尔版［1864］'],
    sections: [
      { at: 0, scene: 0, title: ['Copper Concert Quarter', '铜色音乐街区'], story: ['Vienna, 1824: Beethoven’s Ninth first sounded in a theatre. Tonight, our train sets out beneath the concert hall windows.', '1824年，贝多芬的第九交响曲在维也纳的一座剧院首演。今晚，我们的列车从音乐厅窗下启程。'] },
      { at: 32, scene: 1, title: ['The Frostwater Crossing', '霜河渡桥'], story: ['The tune returns as the wheels cross the glassy river. Watch for the little warm lights on the far bank.', '旋律再度响起，车轮驶过如镜的河面。留意对岸点点暖光。'] },
      { at: 64, scene: 4, title: ['Hush at the Viaduct', '静谧高架桥'], story: ['The melody climbs in shorter steps while the train follows the stone arches up into the hills.', '旋律踏着更短的音符向上攀登，列车沿着石拱桥驶入群山。'] },
      { at: 96, scene: 3, title: ['Crownlight Terminus', '冠灯终点站'], story: ['The theme rises an octave as the bass takes up a new line. Every little window is lit for your arrival.', '旋律升高了一个八度，低音奏出新的声部。每扇小窗都为你的到来亮起。'] },
    ],
  },
  {
    song: variations,
    composer: ['Wolfgang Amadeus Mozart · K. 265, Thema, mm. 1–24 · Breitkopf & Härtel (1878)', '沃尔夫冈·阿马德乌斯·莫扎特 · K. 265 主题，第1–24小节 · 布赖特科普夫与黑特尔版（1878）'],
    sections: [
      { at: 0, scene: 2, title: ['The Lantern Gardens', '灯笼花园'], story: ['Mozart used an old French tune for twelve piano variations. You may know the tune as “Twinkle, Twinkle, Little Star.”', '莫扎特用一首古老的法国曲调写成了十二首钢琴变奏。你也许听过这首《一闪一闪小星星》。'] },
      { at: 16, scene: 5, title: ['Canal of Petals', '落花运河'], story: ['Two answering phrases drift over the water. Follow the lamps through the floating petals.', '两句相呼应的旋律从水面飘过。跟着灯光，穿过漂浮的花瓣吧。'] },
      { at: 32, scene: 3, title: ['Crownlight Terminus', '冠灯终点站'], story: ['The opening tune returns just as the station clock comes into view.', '车站的钟楼刚映入眼帘，开头的旋律也回来了。'] },
    ],
  },
];
