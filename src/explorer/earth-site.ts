export const earthSites = {
  maunakea: { lat: 19.82, lon: -155.47, en: 'Mauna Kea, Hawaiʻi', zh: '夏威夷 · 冒纳凯阿山' },
  beijing: { lat: 39.9042, lon: 116.4074, en: 'Beijing', zh: '北京' },
  greenwich: { lat: 51.4779, lon: 0, en: 'Greenwich', zh: '格林尼治' },
  atacama: { lat: -23.029, lon: -67.755, en: 'Chajnantor, Atacama', zh: '阿塔卡马 · 查南托高原' },
  sydney: { lat: -33.8688, lon: 151.2093, en: 'Sydney', zh: '悉尼' },
} as const;

export function solarHour(date: Date, longitude: number, hour: number) {
  // Keep the selected local mean solar day, not the UTC calendar day.
  const offset = longitude * 240_000;
  const localDay = Math.floor((+date + offset) / 86_400_000) * 86_400_000;
  return new Date(localDay + hour * 3_600_000 - offset);
}
