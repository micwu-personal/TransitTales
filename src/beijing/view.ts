import { type Graph, type Journey, type Leg, journeyMetrics } from './model';
import { type Language, stationLabel, lineLabel, t } from './locale';
export interface JourneySnapshot { phase: 'ready' | 'board' | 'ride' | 'transfer' | 'walk' | 'stop' | 'complete'; station: string; nextStation: string; line: string; lineColor: string; caption: string; elapsed: number; progress: number; totalMinutes: number; paused: boolean; reducedMotion: boolean; crowded: boolean; wheelchair: boolean; interrupted: boolean }
export interface JourneyRenderer { mount(host: HTMLElement): void; render(snapshot: JourneySnapshot): void; dispose(): void }
export function createSnapshot(graph: Graph, journey: Journey | null, language: Language, reducedMotion = false): Readonly<JourneySnapshot> {
  const segment = journey?.segments[journey.index];
  const phase = journey?.status === 'complete' ? 'complete' : segment?.kind ?? 'ready';
  const station = graph.stations.get(segment?.station ?? journey?.currentStation ?? graph.network.stations[0].id)!;
  const next = graph.stations.get(segment?.nextStation ?? station.id)!;
  const line = graph.lines.get(segment?.nextLineId ?? journey?.currentLine ?? '');
  const values = { station: stationLabel(phase === 'ride' || phase === 'walk' ? next : station), line: line ? lineLabel(line) : '' };
  const caption = t(language, phase === 'ready' ? 'startScene' : phase === 'complete' ? 'complete' : phase === 'ride' ? 'riding' : phase === 'transfer' ? 'transferring' : phase === 'walk' ? 'walking' : phase === 'stop' ? 'arriving' : 'boarding', values);
  return Object.freeze({ phase, station: stationLabel(station), nextStation: stationLabel(next), line: line ? lineLabel(line) : '', lineColor: line?.color ?? '#315d50', caption, elapsed: journey?.elapsed ?? 0, progress: segment?.seconds ? (journey?.elapsed ?? 0) / segment.seconds : 0, totalMinutes: journey ? journeyMetrics(journey).minutes : 0, paused: journey?.status !== 'running', reducedMotion, crowded: Boolean(journey?.round.conditions.rush), wheelchair: Boolean(journey?.round.conditions.stepFree), interrupted: Boolean(journey?.interruption) });
}
export function detachedLegs(legs: Leg[]): readonly Readonly<Leg>[] { return Object.freeze(legs.map(leg => Object.freeze({ lineId: leg.lineId, stops: Object.freeze([...leg.stops]) as unknown as string[], ...(leg.walkToLineId ? { walkToLineId: leg.walkToLineId } : {}) }))); }
