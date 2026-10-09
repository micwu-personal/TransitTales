import { type Game, type LineId } from './model';
import { stationNames, text, type Language } from './locale';

export interface Point { readonly x: number; readonly y: number }
export type CityLayout = Readonly<Record<string, Point>>;
export interface StationView { readonly id: string; readonly label: string; readonly accessibleName: string; readonly position: Point; readonly waiting: number; readonly selected: boolean; readonly helped: boolean }
export interface LineView { readonly id: LineId; readonly color: string; readonly stops: readonly string[] }
export interface TrainView { readonly id: number; readonly line: LineId; readonly from: string; readonly to: string; readonly progress: number; readonly position: Point; readonly heading: number; readonly riders: number; readonly spare: boolean; readonly moving: boolean }
export interface CitySnapshot { readonly stations: readonly StationView[]; readonly lines: readonly LineView[]; readonly trains: readonly TrainView[]; readonly accessibleName: string; readonly riverLabel: string }
export interface ViewOptions { readonly selected: string; readonly language: Language; readonly interpolationSeconds: number; readonly animate: boolean; readonly layout: CityLayout }

const clamp = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
// Coordinates belong to the presentation, not the simulation. Unknown stations get a neutral circular layout.
export function createCitySnapshot(game: Game, options: ViewOptions): CitySnapshot {
  const points = new Map(game.network.stations.map((station, index) => {
    const point = options.layout[station.id];
    const angle = index / Math.max(1, game.network.stations.length) * Math.PI * 2;
    return [station.id, Object.freeze(point ? { x: clamp(point.x), y: clamp(point.y) } : { x: 0.5 + Math.cos(angle) * 0.35, y: 0.5 + Math.sin(angle) * 0.35 })] as const;
  }));
  const stations = game.network.stations.map(station => {
    const label = stationNames[options.language][station.id] ?? station.name;
    const waiting = game.queues[station.id].length;
    return Object.freeze({ id: station.id, label, accessibleName: text(options.language, 'stationAccessible', { station: label, count: waiting }), position: points.get(station.id)!, waiting, selected: options.selected === station.id, helped: (game.crewUntil[station.id] ?? 0) > game.time });
  });
  const lines = game.network.lines.map(line => Object.freeze({ id: line.id, color: line.color, stops: Object.freeze([...line.stops]) }));
  const trains = game.trains.map(train => {
    const line = game.network.lines.find(line => line.id === train.line)!;
    const from = line.stops[train.index]; const to = line.stops[train.index + train.direction] ?? from;
    const a = points.get(from)!; const b = points.get(to)!;
    const extra = options.animate && game.phase === 'playing' && train.moving ? Math.max(0, options.interpolationSeconds) / game.network.segmentSeconds : 0;
    const progress = train.moving ? clamp(train.progress + extra) : 0;
    return Object.freeze({ id: train.id, line: train.line, from, to, progress, position: Object.freeze({ x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress }), heading: Math.atan2(b.y - a.y, b.x - a.x), riders: train.riders.length, spare: train.spare, moving: train.moving });
  });
  return Object.freeze({ stations: Object.freeze(stations), lines: Object.freeze(lines), trains: Object.freeze(trains), accessibleName: text(options.language, 'mapName'), riverLabel: text(options.language, 'river') });
}
