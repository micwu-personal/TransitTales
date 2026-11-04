import type { SceneKind, UniverseSnapshot } from './view';

export interface Destination {
  readonly id: string;
  readonly group: string;
  readonly kind: SceneKind;
  readonly color: string;
  readonly distanceLy: number;
  readonly lookbackGyr: number;
  readonly formedGyr: number;
  readonly hazard: 'debris' | 'radiation' | 'gravity' | 'signal';
  readonly fact: string;
  readonly factZh: string;
  readonly name: string;
  readonly nameZh: string;
}
export interface Epoch {
  readonly id: UniverseSnapshot['epoch'];
  readonly ageGyr: number;
  readonly name: string;
  readonly nameZh: string;
  readonly description: string;
  readonly descriptionZh: string;
  readonly speculative: boolean;
}

function destination(id: string, group: string, kind: SceneKind, name: string, nameZh: string, distanceLy: number, formedGyr: number, hazard: Destination['hazard'], color: string, fact: string, factZh: string, lookbackGyr = distanceLy / 1e9): Destination {
  return Object.freeze({ id, group, kind, name, nameZh, distanceLy, formedGyr, hazard, color, fact, factZh, lookbackGyr });
}

// Distances and formation ages are rounded educational approximations, not navigation data.
export const DESTINATIONS: readonly Destination[] = Object.freeze([
  destination('earth', 'earth', 'earth', 'Earth', '地球', 0, 9.26, 'debris', '#4b9ee8', 'Earth formed about 4.54 billion years ago. The boy, cat and time machine are fiction.', '地球约在45.4亿年前形成。男孩、猫和时间机器属于虚构。'),
  destination('moon', 'earth', 'moon', 'Moon', '月球', 4.06e-8, 9.3, 'debris', '#b7bfce', 'The Moon likely formed after a giant impact early in Earth’s history.', '月球很可能在地球早期的一次巨大撞击后形成。'),
  destination('sun', 'solar', 'sun', 'Sun', '太阳', 1.58e-5, 9.2, 'radiation', '#ffca62', 'The Sun is a fusion-powered star; a heat-proof time machine is fiction.', '太阳由核聚变供能；耐受太阳高温的时间机器是虚构的。'),
  destination('mercury', 'solar', 'rock', 'Mercury', '水星', 1.2e-5, 9.2, 'radiation', '#ada6a0', 'Mercury has a very thin exosphere and extreme temperature differences.', '水星的外逸层极薄，温差巨大。'),
  destination('venus', 'solar', 'rock', 'Venus', '金星', 7e-6, 9.2, 'radiation', '#e8c47f', 'Venus has a dense carbon-dioxide atmosphere and a strong greenhouse effect.', '金星有浓厚的二氧化碳大气和强烈的温室效应。'),
  destination('mars', 'solar', 'rock', 'Mars', '火星', 1.2e-5, 9.2, 'debris', '#df7959', 'Mars preserves evidence of ancient liquid water; life has not been confirmed.', '火星保存了古代液态水的证据；尚未确认存在生命。'),
  destination('jupiter', 'solar', 'gas', 'Jupiter', '木星', 8.2e-5, 9.2, 'radiation', '#d6b18a', 'Jupiter is a gas giant with powerful radiation belts, not a solid landing surface.', '木星是拥有强大辐射带的气态巨行星，没有可着陆的固体表面。'),
  destination('saturn', 'solar', 'ring', 'Saturn', '土星', 0.00015, 9.2, 'debris', '#e6cf93', 'Saturn’s rings are many separate icy particles, not a solid disk.', '土星环由大量独立的冰粒组成，并非固体圆盘。'),
  destination('uranus', 'solar', 'ice', 'Uranus', '天王星', 0.0003, 9.2, 'gravity', '#87d9dc', 'Uranus is an ice giant whose rotation axis is tilted almost sideways.', '天王星是自转轴几乎横倒的冰巨星。'),
  destination('neptune', 'solar', 'ice', 'Neptune', '海王星', 0.00047, 9.2, 'gravity', '#537edf', 'Neptune is an ice giant with fast atmospheric winds.', '海王星是拥有高速大气风的冰巨星。'),
  destination('asteroids', 'solar', 'belt', 'Asteroid belt', '小行星带', 4e-5, 9.2, 'debris', '#b4a394', 'The asteroid belt is mostly empty space between widely separated rocks.', '小行星带中的岩石相距很远，大部分空间是空的。'),
  destination('comet', 'solar', 'comet', 'Comet', '彗星', 0.0001, 9.2, 'debris', '#a8e5ef', 'A comet’s gas and dust tails develop near the Sun and point generally away from it.', '彗星靠近太阳时形成气体和尘埃尾，整体指向远离太阳的方向。'),
  destination('kuiper', 'solar', 'belt', 'Kuiper belt', '柯伊伯带', 0.00063, 9.2, 'debris', '#91b9cf', 'The Kuiper belt beyond Neptune contains icy bodies, including Pluto.', '海王星外的柯伊伯带包含冥王星等冰质天体。'),
  destination('oort', 'solar', 'belt', 'Oort cloud', '奥尔特云', 1, 9.2, 'debris', '#bfd7e8', 'The Oort cloud is inferred from comet orbits; it has not been directly imaged.', '奥尔特云由彗星轨道推断而来，尚未被直接成像。'),
  destination('proxima', 'stars', 'triple', 'Alpha Centauri system', '半人马座α星系统', 4.24, 8, 'radiation', '#ff8e6c', 'Alpha Centauri A and B form a close binary; the red dwarf Proxima orbits much farther away.', '半人马座α星A和B组成紧密双星；红矮星比邻星在远处运行。'),
  destination('proxima-b', 'stars', 'rock', 'Proxima b', '比邻星b', 4.24, 8, 'signal', '#ac8fca', 'Proxima b is confirmed, but its surface and habitability are unknown. Planet scenery and aliens are imagination, not evidence.', '比邻星b已获确认，但表面和宜居性未知。行星景观和外星角色是想象，并非证据。'),
  destination('nebula', 'stars', 'nebula', 'Orion nebula', '猎户座星云', 1344, 13.79, 'radiation', '#d98fce', 'The Orion nebula is a nearby region of ongoing star formation; colors are illustrative.', '猎户座星云是附近正在形成恒星的区域；颜色仅作示意。'),
  destination('cluster', 'stars', 'cluster', '47 Tucanae globular cluster', '杜鹃座47球状星团', 15000, 1.8, 'signal', '#8baeff', '47 Tucanae is a dense globular cluster of old stars, roughly 12 billion years old; its formation age and distance are rounded.', '杜鹃座47是由古老恒星组成的致密球状星团，约有120亿年历史；形成时间和距离均为近似值。'),
  destination('neutron', 'stars', 'neutron', 'Neutron star', '中子星', 1000, 1, 'radiation', '#c0eaff', 'A representative neutron star is a compact stellar remnant; distance is illustrative, and safe close travel is fiction.', '代表性的中子星是致密恒星遗骸；距离仅作示意，安全近距离旅行是虚构。'),
  destination('stellar-hole', 'stars', 'blackhole', 'Stellar black hole', '恒星级黑洞', 1500, 1, 'gravity', '#b99cff', 'Stellar black holes form from stellar evolution. Escape from inside an event horizon is not possible in established physics.', '恒星级黑洞由恒星演化形成。按已知物理，从事件视界内逃出是不可能的。'),
  destination('sagittarius', 'galaxy', 'blackhole', 'Sagittarius A*', '人马座A*', 26000, 1, 'gravity', '#e0a078', 'Sagittarius A* has dim accretion, not a huge active quasar. Lensing here is stylized false color; gravity shields are fiction.', '人马座A*的吸积较暗，并非巨大的活跃类星体。引力透镜是风格化伪彩色；引力护盾是虚构。'),
  destination('milky-way', 'galaxy', 'galaxy', 'Milky Way', '银河系', 26000, 0.8, 'signal', '#9cb5f1', 'The Milky Way grew over billions of years; the modern spiral is not its early form.', '银河系经历数十亿年的成长；早期形态不是如今的旋臂。'),
  destination('magellanic', 'galaxy', 'galaxy', 'Large Magellanic Cloud', '大麦哲伦云', 163000, 1, 'signal', '#91d9d7', 'The Magellanic Clouds and Milky Way gravitationally interact.', '麦哲伦云与银河系之间存在引力相互作用。'),
  destination('andromeda', 'galaxy', 'galaxy', 'Andromeda', '仙女座星系', 2.54e6, 1, 'signal', '#bac8ff', 'Andromeda and the Milky Way interact gravitationally; a future merger is possible, not guaranteed.', '仙女座星系与银河系存在引力相互作用；未来可能合并，但并非必然。'),
  destination('local-group', 'deep', 'group', 'Local Group', '本星系群', 5e6, 1, 'signal', '#9bcae6', 'The Local Group contains gravitationally interacting galaxies; its size is a representative distance.', '本星系群包含引力相互作用的星系；这里的距离代表其尺度。'),
  destination('quasar', 'deep', 'quasar', 'Distant quasar', '遥远类星体', 25e9, 0.8, 'radiation', '#eea9f9', 'A representative high-redshift quasar is powered by accretion. Present distance differs from its roughly 12.8-billion-year light lookback.', '代表性的高红移类星体由吸积供能。当前距离不同于约128亿年的光回溯时间。', 12.8),
  destination('horizon', 'deep', 'horizon', 'Observable horizon', '可观测宇宙边界', 46.5e9, 0.00038, 'radiation', '#f4bf86', 'The observable radius is about 46.5 billion light-years today due to expansion; oldest visible light has about 13.8 billion years of lookback. It is not a wall.', '由于宇宙膨胀，如今可观测半径约465亿光年；最古老可见光回溯约138亿年。这里不是墙。', 13.79962),
  destination('beyond', 'deep', 'beyond', 'Beyond the horizon (speculation)', '边界之外（推测）', 50e9, 0, 'signal', '#bca3e8', 'Beyond our observable horizon is unobserved. Any scenery or alien encounter here is speculation and imagination.', '可观测边界之外尚未被观测。这里的景观或外星相遇都属于推测和想象。', 0),
  // Appended IDs preserve saved journeys. Young-star/galaxy formation gates are
  // schematic, not dated reconstructions; the Crab gate represents its young remnant.
  destination('europa', 'solar', 'moon', 'Europa', '木卫二', 8.2e-5, 9.2, 'radiation', '#d9ccb6', 'Europa’s fractured water-ice crust covers a strongly inferred salty ocean. Neither ocean life nor persistent plumes are confirmed.', '木卫二破裂的水冰外壳下，很可能存在咸水海洋。海洋生命与持续喷流都尚未确认。'),
  destination('titan', 'solar', 'moon', 'Titan', '土卫六', 0.00015, 9.2, 'signal', '#d8a35d', 'Titan has a nitrogen-rich atmosphere and surface lakes of liquid methane and ethane. Huygens landed in 2005; life remains unconfirmed.', '土卫六有富氮大气与液态甲烷、乙烷湖泊。惠更斯探测器于2005年着陆；生命尚未确认。'),
  destination('pluto', 'solar', 'ice', 'Pluto', '冥王星', 0.00062, 9.2, 'debris', '#d8b7a2', 'New Horizons revealed Pluto’s nitrogen-ice plain and water-ice mountains in 2015. This Kuiper-belt dwarf planet is not a gas giant.', '新视野号于2015年揭示冥王星的氮冰平原与水冰山脉。这颗柯伊伯带矮行星不是气态巨行星。'),
  destination('sirius', 'stars', 'triple', 'Sirius A and B', '天狼星双星', 8.6, 13.55, 'gravity', '#c5dcff', 'Sirius pairs a bright main-sequence star with a faint white dwarf. Sirius B’s gravitational redshift has been measured; it is not a neutron star.', '天狼星由明亮主序星和暗淡白矮星组成。天狼星伴星的引力红移已被测量；它不是中子星。'),
  destination('betelgeuse', 'stars', 'sun', 'Betelgeuse', '参宿四', 550, 13.79, 'radiation', '#ef9567', 'Betelgeuse is a red supergiant with uncertain distance, roughly 500–700 light-years. Its 2019–2020 dimming involved expelled material and dust, not an observed supernova.', '参宿四是红超巨星，距离仍不确定，约500至700光年。2019至2020年的变暗涉及抛出物质与尘埃，并非已观测到的超新星。'),
  destination('crab-pulsar', 'stars', 'neutron', 'Crab pulsar', '蟹状星云脉冲星', 6500, 13.8 - 1000 / 1e9, 'radiation', '#94dcf1', 'The Crab pulsar spins about 30 times per second and powers a particle-wind nebula. Its supernova light was recorded in 1054; the beams sweep, rather than switch on and off.', '蟹状星云脉冲星每秒自转约30次，为粒子风星云供能。其超新星光于1054年被记录；辐射束扫过视线，而非不断开关。'),
  destination('cygnus-x1', 'stars', 'blackhole', 'Cygnus X-1', '天鹅座Ｘ一', 7200, 13.795, 'gravity', '#e5b9f2', 'Cygnus X-1 is a wind-fed black-hole binary, roughly 7,200 light-years away. Hot accreting gas emits X-rays outside the horizon; the system also produces a radio jet.', '天鹅座Ｘ一是靠伴星恒星风供给物质的黑洞双星，约7200光年远。炽热吸积气体在视界外发出Ｘ射线；系统也产生射电喷流。'),
  destination('eta-carinae', 'stars', 'triple', 'Eta Carinae', '海山二', 7500, 13.797, 'radiation', '#e7b27e', 'Eta Carinae’s massive binary survived its nineteenth-century Great Eruption, which formed the bipolar Homunculus nebula. Colliding stellar winds produce shocks; this was not a terminal supernova.', '海山二大质量双星在十九世纪大爆发后幸存，喷出物形成双极人形星云。碰撞恒星风产生激波；这不是终结恒星生命的超新星。'),
  destination('tarantula', 'galaxy', 'nebula', 'Tarantula Nebula', '蜘蛛星云', 161000, 13.795, 'radiation', '#e598bb', 'The Tarantula Nebula in the Large Magellanic Cloud is an intense stellar nursery. Massive young stars carve cavities while dense dusty pillars shelter forming stars; colors are illustrative.', '大麦哲伦云中的蜘蛛星云是旺盛的恒星诞生区。大质量年轻恒星塑造空腔，致密尘埃柱内孕育新星；颜色为示意。'),
  destination('m33', 'galaxy', 'galaxy', 'Triangulum galaxy / M33', '三角座星系', 3e6, 1, 'signal', '#a8c7ef', 'M33 is the Local Group’s third-largest galaxy, about 3 million light-years away. Its spiral arms contain NGC 604, a vast star-forming region.', '三角座星系是本星系群第三大星系，约300万光年远。其旋臂中有巨大的恒星诞生区NGC 604。'),
  destination('m87', 'galaxy', 'galaxy', 'Messier 87', '室女座Ｍ八十七', 54e6, 1, 'gravity', '#e6bc98', 'M87 is an elliptical galaxy with an accreting central black hole and a relativistic jet. The 2019 Event Horizon Telescope image traced emission around its shadow, not light from inside the horizon.', '室女座Ｍ八十七是椭圆星系，中心黑洞有吸积活动与相对论性喷流。2019年事件视界望远镜图像描绘阴影周围的辐射，并非视界内部的光。'),
  destination('centaurus-a', 'galaxy', 'galaxy', 'Centaurus A', '半人马座Ａ', 13e6, 1, 'gravity', '#cfb09b', 'Centaurus A is a nearby active galaxy with a prominent dust lane, jets and radio lobes. A past galaxy merger is strongly indicated; the central black hole itself does not shine.', '半人马座Ａ是附近的活跃星系，拥有显著尘埃带、喷流与射电瓣。有强证据表明它经历过星系合并；中心黑洞本身不发光。'),
]);

export const EPOCHS: readonly Epoch[] = Object.freeze([
  { id: 'bang', ageGyr: 0, name: 'Big Bang concept', nameZh: '大爆炸概念', description: 'No established visualization of t=0 exists. Imagine a spatially extended hot dense field, not an explosion at one point; spatial infinity is not established.', descriptionZh: 't=0没有已确立的可视化。可想象遍布空间的炽热致密场，而不是某一点的爆炸；空间是否无限尚未确定。', speculative: true },
  { id: 'plasma', ageGyr: 1e-12, name: 'Early plasma', nameZh: '早期等离子体', description: 'A hot dense expanding universe, with no modern stars or planets. The scene is a simplified educational illustration.', descriptionZh: '炽热致密的宇宙正在膨胀，尚无现代恒星或行星。场景是简化的科普示意。', speculative: false },
  { id: 'recombination', ageGyr: 0.00038, name: 'First transparent light', nameZh: '最初的透明光', description: 'About 380,000 years after the Big Bang, neutral atoms formed and light could travel freely.', descriptionZh: '大爆炸约38万年后，中性原子形成，光可以自由传播。', speculative: false },
  { id: 'dark', ageGyr: 0.05, name: 'Cosmic dark ages', nameZh: '宇宙黑暗时代', description: 'Diffuse gas filled space before the first stars; no modern galaxies or planets yet.', descriptionZh: '第一批恒星出现之前，弥散气体充满空间；尚无现代星系或行星。', speculative: false },
  { id: 'first', ageGyr: 0.2, name: 'First stars', nameZh: '第一批恒星', description: 'The first stars began illuminating gas; the exact timing is uncertain.', descriptionZh: '最早的恒星开始照亮气体；确切时间仍不确定。', speculative: false },
  { id: 'quasar', ageGyr: 2, name: 'Growing galaxies', nameZh: '成长中的星系', description: 'Young galaxies and accreting black holes developed; modern planetary systems need not exist.', descriptionZh: '年轻星系和吸积黑洞发展；现代行星系统未必已经存在。', speculative: false },
  { id: 'present', ageGyr: 13.8, name: 'Present', nameZh: '现在', description: 'Our universe is about 13.8 billion years old. Distant light shows past events, not a simultaneous present.', descriptionZh: '宇宙约有138亿年历史。遥远的光展示过去事件，而非同一时刻的现在。', speculative: false },
  { id: 'future', ageGyr: 18.8, name: 'Five billion years ahead', nameZh: '五十亿年后', description: 'A speculative future: the Sun evolves and galaxies may interact or merge; modern planet surfaces are not predictions.', descriptionZh: '推测的未来：太阳演化，星系可能相互作用或合并；现代行星表面并非预言。', speculative: true },
  { id: 'far', ageGyr: 1000, name: 'Far future', nameZh: '遥远未来', description: 'A speculative trillion-year future under extrapolated physics; modern stars and planets cannot be assumed unchanged.', descriptionZh: '按物理推演的万亿年未来属于推测；不能假设现代恒星和行星保持不变。', speculative: true },
].map(epoch => Object.freeze(epoch as Epoch)));
