const nasa = 'https://science.nasa.gov/';
const messier = `${nasa}mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/`;

export const arrivalFacts: Record<string, { en: string; zh: string; source: string; agency: string }> = {
  sun: { en: 'G-type main-sequence star · about 4.6 billion years old · one solar mass', zh: 'G 型主序星 · 约 46 亿年 · 1 个太阳质量', source: `${nasa}sun/facts/`, agency: 'NASA' },
  earth: { en: 'Rocky planet · about 4.5 billion years old · one natural moon', zh: '岩石行星 · 约 45 亿年 · 有一颗天然卫星', source: `${nasa}earth/facts/`, agency: 'NASA' },
  moon: { en: 'Earth’s only natural satellite · mean radius about 1,740 km', zh: '地球唯一的天然卫星 · 平均半径约 1,740 千米', source: `${nasa}moon/facts/`, agency: 'NASA' },
  mars: { en: 'Rocky planet · two moons · iron oxide gives the surface its reddish color', zh: '岩石行星 · 有两颗卫星 · 表面因氧化铁而呈红色', source: `${nasa}mars/facts/`, agency: 'NASA' },
  jupiter: { en: 'Gas giant · more than twice as massive as all the other planets combined', zh: '气态巨行星 · 质量超过太阳系其余行星总和的两倍', source: `${nasa}jupiter/facts/`, agency: 'NASA' },
  saturn: { en: 'Gas giant · rings made largely of ice and rock', zh: '气态巨行星 · 行星环主要由冰和岩石组成', source: `${nasa}saturn/facts/`, agency: 'NASA' },
  'hip-27989': { en: 'Red supergiant · estimated 15 solar masses · about 10 million years old', zh: '红超巨星 · 估计约 15 个太阳质量 · 约 1,000 万年', source: `${nasa}universe/what-is-betelgeuse-inside-the-strange-volatile-star/`, agency: 'NASA' },
  'hip-70890': { en: 'Red dwarf · the closest star to the Sun, about 4.24 light-years away', zh: '红矮星 · 距太阳最近的恒星，约 4.24 光年', source: 'https://esahubble.org/images/potw1343a/', agency: 'ESA/Hubble' },
  m1: { en: 'Supernova remnant · the explosion was recorded in 1054 · a pulsar powers the nebula', zh: '超新星遗迹 · 爆发记录于公元 1054 年 · 星云由一颗脉冲星供能', source: `${messier}messier-1/`, agency: 'NASA/Hubble' },
  m42: { en: 'Stellar nursery · ultraviolet light from young stars illuminates the gas', zh: '恒星诞生区 · 年轻恒星发出的紫外线照亮气体', source: `${messier}messier-42/`, agency: 'NASA/Hubble' },
  m45: { en: 'Open star cluster · blue starlight reflects off dust', zh: '疏散星团 · 尘埃反射出蓝色星光', source: `${messier}messier-45/`, agency: 'NASA/Hubble' },
  m31: { en: 'Spiral galaxy · about 2.5 million light-years from Earth', zh: '旋涡星系 · 距地球约 250 万光年', source: `${messier}messier-31/`, agency: 'NASA/Hubble' },
  'sgr-a': { en: 'Supermassive black hole at the Milky Way’s center · about 4 million solar masses', zh: '银河系中心的超大质量黑洞 · 约 400 万个太阳质量', source: 'https://www.eso.org/public/news/eso2208/', agency: 'ESO / EHT' },
  '3c273': { en: 'Quasar · an active galactic nucleus with a bright, one-sided jet', zh: '类星体 · 带有明亮单侧喷流的活动星系核', source: 'https://esahubble.org/images/potw1346a/', agency: 'ESA/Hubble' },
  'voyager-1': { en: 'Interstellar probe · launched in 1977 · photographed Earth as the Pale Blue Dot in 1990', zh: '星际探测器 · 1977 年发射 · 1990 年拍下「暗淡蓝点」', source: `${nasa}mission/voyager/voyager-1s-pale-blue-dot/`, agency: 'NASA' },
  'voyager-2': { en: 'Interstellar probe · launched in 1977 · the only spacecraft to fly by both Uranus and Neptune', zh: '星际探测器 · 1977 年发射 · 唯一飞掠过天王星和海王星的探测器', source: `${nasa}mission/voyager/voyager-2/`, agency: 'NASA' },
  'new-horizons': { en: 'Kuiper Belt probe · flew by Pluto in 2015 and Arrokoth in 2019', zh: '柯伊伯带探测器 · 2015 年飞掠冥王星，2019 年飞掠阿罗科斯', source: `${nasa}mission/new-horizons/`, agency: 'NASA' },
};
