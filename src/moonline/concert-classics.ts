import { bundledSong } from './bundled-midi';
import type { Route } from './repertoire';

const pianoHands: Route['partNames'] = [['Piano right hand', '钢琴右手'], ['Piano left hand', '钢琴左手']];

export const concertClassics: Route[] = [
  {
    song: bundledSong('fur-elise', 'Für Elise'),
    titleZh: '致爱丽丝',
    composer: ['Ludwig van Beethoven · WoO 59 · Breitkopf & Härtel edition', '路德维希·范·贝多芬 · WoO 59 · 布赖特科普夫与黑特尔版'],
    partNames: pianoHands,
    sections: [
      {at: 0, scene: 0, title: ['The Unsent Letter', '未寄出的信'], story: ['Two neighboring notes flicker like candlelight on the station desk. Nobody knows for sure who Beethoven’s Elise was.', '相邻的两个音像站台书桌上的烛光，忽明忽暗。贝多芬笔下的爱丽丝究竟是谁，至今没有定论。']},
      {at: 37, scene: 2, title: ['The Conservatory', '玻璃花房'], story: ['Beyond the glass doors, a brighter tune opens out over the garden.', '玻璃门外，一段更明亮的旋律在花园里舒展开来。']},
      {at: 88, scene: 4, title: ['Under the Arches', '拱桥之下'], story: ['Listen for the repeated bass as the train enters the dark arches.', '列车驶入幽暗的桥洞，留意反复响起的低音。']},
      {at: 130, scene: 3, title: ['The Candle in the Window', '窗前烛光'], story: ['The familiar tune is waiting at the windows again. Carry it home.', '熟悉的旋律又在窗前等候。带着它回家吧。']},
    ],
  },
  {
    song: bundledSong('mozart-k545-allegro', 'Sonata Facile · Allegro'),
    titleZh: 'C大调钢琴奏鸣曲 · 第一乐章（K. 545）',
    composer: ['Wolfgang Amadeus Mozart · K. 545, I · Alejandro Sierra / Mutopia edition', '沃尔夫冈·阿马德乌斯·莫扎特 · K. 545 第一乐章 · Alejandro Sierra / Mutopia 版'],
    partNames: pianoHands,
    sections: [
      {at: 0, scene: 0, title: ['The Apprentice’s Departure', '学徒的启程'], story: ['A clear tune floats above the little revolving figures of the left hand. Mozart listed this sonata as a work for beginners.', '清澈的旋律浮在左手循环的音型上。莫扎特曾把这首奏鸣曲登记为写给初学者的作品。']},
      {at: 112, scene: 4, title: ['The Mountain Detour', '山间岔路'], story: ['The exposition has run twice. Now the familiar figures take a darker turn into the hills.', '呈示部奏了两遍。现在，熟悉的音型转向较暗的色彩，驶入群山。']},
      {at: 164, scene: 2, title: ['A Different Door', '另一扇门'], story: ['The opening idea comes back in F major, as if the train had reached the same garden through a different gate.', '开头的乐思在F大调中回归，就像列车从另一扇门驶进了同一座花园。']},
      {at: 272, scene: 3, title: ['The C Major Platform', 'C大调站台'], story: ['The last passage leads back to C major. Follow the left-hand figures into the final cadence.', '最后一段回到C大调。随着左手的音型驶向终止式。']},
    ],
  },
  {
    song: bundledSong('bach-air-bwv1068', 'Air · BWV 1068'),
    titleZh: 'D大调第三管弦乐组曲 · 咏叹调',
    composer: ['Johann Sebastian Bach · BWV 1068, II · Bach-Gesellschaft edition', '约翰·塞巴斯蒂安·巴赫 · BWV 1068 第二乐章 · 巴赫协会版'],
    partNames: [['Violin I', '第一小提琴'], ['Violin II', '第二小提琴'], ['Viola', '中提琴'], ['Continuo bass', '通奏低音']],
    sections: [
      {at: 0, scene: 1, title: ['The Floating Bridge', '浮桥'], story: ['The first violin holds a single note as the bass walks below. Let the water carry the long phrase.', '第一小提琴拉出一个长音，低音在下方缓缓行走。任流水托起悠长的乐句。']},
      {at: 24, scene: 5, title: ['Four Reflections', '四道倒影'], story: ['Listen between the melody and bass: the second violin and viola each leave their own ripple.', '听听旋律与低音之间：第二小提琴与中提琴各自在水面留下涟漪。']},
      {at: 64, scene: 3, title: ['The River at Rest', '静水终点站'], story: ['The four parts come to rest together as the lights settle on the far bank.', '对岸灯光渐静，四个声部一起落定。']},
    ],
  },
  {
    song: bundledSong('brahms-waltz-op39-no15', 'Waltz in A-flat · Op. 39 No. 15'),
    titleZh: '降A大调圆舞曲（Op. 39 第15首）',
    composer: ['Johannes Brahms · Op. 39 No. 15 · Rafael Joseffy edition', '约翰内斯·勃拉姆斯 · Op. 39 第15首 · 拉斐尔·约瑟菲版'],
    partNames: [['Melody', '主旋律'], ['Right-hand harmony', '右手和声'], ['Left-hand accompaniment', '左手伴奏']],
    sections: [
      {at: 0, scene: 2, title: ['The Garden Waltz', '花园圆舞曲'], story: ['The bass takes the first step, the chords the next two. You can lead the dance with just the top line.', '低音踏出第一步，和弦接上第二、第三步。只奏最高声部，也能领着大家起舞。']},
      {at: 48, scene: 5, title: ['Petals in Triple Time', '三拍子的花瓣'], story: ['The gentle turning steps give way to quicker notes over the canal.', '轻柔的舞步转成更细密的音符，掠过运河。']},
      {at: 108, scene: 3, title: ['The Last Turn', '最后一个回旋'], story: ['The waltz rises toward its final flourish before the platform lights go still.', '圆舞曲攀向最后一串华彩，月台灯光随之归于静谧。']},
    ],
  },
  {
    song: bundledSong('blue-danube-theme', 'The Blue Danube · Main Theme'),
    titleZh: '蓝色多瑙河 · 主主题',
    composer: ['Johann Strauss II · Op. 314 · Nikos Kouremenos piano arrangement', '小约翰·施特劳斯 · Op. 314 · Nikos Kouremenos 钢琴改编'],
    partNames: [['Melody', '主旋律'], ['Waltz chords', '圆舞曲和弦'], ['Waltz bass', '圆舞曲低音']],
    sections: [
      {at: 0, scene: 1, title: ['Danube Embankment', '多瑙河堤岸'], story: ['The waltz starts with a short pickup. Follow the melody as it climbs over the river.', '圆舞曲从弱起开始。跟着旋律，在河面上方一点点升高。']},
      {at: 25, scene: 2, title: ['The Riverside Pavilion', '河畔舞亭'], story: ['The answering phrase takes the dance around the pavilion. Try the bass for the first step of each bar.', '应答的乐句带着舞步绕过舞亭。试试切换到低音，踏出每小节的第一步。']},
      {at: 49, scene: 5, title: ['Silver Water', '银色水面'], story: ['The opening tune returns in the reflections, with the waltz chords rocking beneath it.', '开头的旋律在倒影中回归，圆舞曲和弦在下方轻轻摇晃。']},
      {at: 73, scene: 3, title: ['The Riverside Terminus', '河畔终点站'], story: ['The last answering phrase carries this main-theme excerpt to its close.', '最后一段应答为这段主主题选编画上句号。']},
    ],
  },
];
