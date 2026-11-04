export type SceneKind = 'earth' | 'moon' | 'sun' | 'rock' | 'gas' | 'ring' | 'ice' | 'comet' | 'belt' | 'triple' | 'nebula' | 'cluster' | 'neutron' | 'blackhole' | 'galaxy' | 'group' | 'quasar' | 'horizon' | 'beyond';
export interface UniverseLocation {
  readonly destinationId: string;
  readonly kind: SceneKind;
  readonly color: string;
  readonly epoch: 'bang' | 'plasma' | 'recombination' | 'dark' | 'first' | 'quasar' | 'present' | 'future' | 'far';
}
export interface UniverseSnapshot extends UniverseLocation {
  readonly origin?: UniverseLocation;
  readonly beta: number;
  readonly travelling: boolean;
  readonly progress: number;
  readonly paused: boolean;
  readonly reducedMotion: boolean;
  readonly coordinateView?: boolean;
  readonly effectTime?: number;
  readonly inspection?: { readonly yaw: number; readonly pitch: number; readonly roll: number; readonly offset: readonly [number, number, number] };
}
export interface UniverseRenderer {
  mount(host: HTMLElement): void;
  render(snapshot: UniverseSnapshot): void;
  zoom(direction: number): void;
  reset(): void;
  dispose(): void;
}
export function freezeSnapshot(snapshot: UniverseSnapshot): UniverseSnapshot {
  const copy = { ...snapshot };
  if (snapshot.origin) copy.origin = Object.freeze({ destinationId: snapshot.origin.destinationId, kind: snapshot.origin.kind, color: snapshot.origin.color, epoch: snapshot.origin.epoch });
  if (snapshot.inspection) copy.inspection = Object.freeze({ ...snapshot.inspection, offset: Object.freeze([...snapshot.inspection.offset]) as readonly [number, number, number] });
  return Object.freeze(copy);
}
