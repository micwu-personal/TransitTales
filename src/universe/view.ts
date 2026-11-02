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
  return Object.freeze(copy);
}
