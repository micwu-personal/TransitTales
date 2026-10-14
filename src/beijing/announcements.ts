import copy from './announcement-copy.json';
import { NETWORK } from './network';
import type { Language } from './locale';

export const BEIJING_ANNOUNCEMENT_KINDS = ['board', 'ride', 'transfer', 'walk', 'stop', 'ready', 'complete', 'boarding', 'arrival'] as const;
export type BeijingAnnouncementKind = typeof BEIJING_ANNOUNCEMENT_KINDS[number];
export interface BeijingAnnouncementContext {
  kind: BeijingAnnouncementKind;
  stationId?: string;
  lineId?: string;
}
export type BeijingRecordingLanguage = keyof typeof copy;
export interface BeijingRecording {
  readonly clips: readonly string[];
  /** Actual recorded speech, independent of the game's localized visual caption. */
  readonly recordingText: string;
}
const stations = new Map(NETWORK.stations.map(station => [station.id, station]));
const lines = new Map(NETWORK.lines.map(line => [line.id, line]));

export function beijingRecordingLanguage(language: Language): BeijingRecordingLanguage {
  return language === 'mn-Mong-CN' ? 'mn-Cyrl-MN' : language;
}
export function beijingAsset(relative: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base}audio/beijing/${relative}.mp3`;
}

/** Localized sentence parts and real Mandarin identities form one non-interruptible logical announcement. */
export function beijingAnnouncement(language: Language, context?: BeijingAnnouncementContext): BeijingRecording {
  const recordingLanguage = beijingRecordingLanguage(language);
  const script = copy[recordingLanguage].phrases;
  const clips: string[] = [];
  const text: string[] = [];
  function phrase(key: keyof typeof script) {
    clips.push(beijingAsset(`phrases/${recordingLanguage}/${key}`)); text.push(script[key]);
  }
  if (!context || context.kind === 'ready') { phrase('ready'); return { clips, recordingText: text.join(' ') }; }
  if (!BEIJING_ANNOUNCEMENT_KINDS.includes(context.kind)) throw new RangeError('Unknown Beijing announcement kind');
  const kind = context.kind === 'board' ? 'boarding' : context.kind === 'stop' ? 'arrival' : context.kind;
  const station = context.stationId ? stations.get(context.stationId) : undefined;
  const line = context.lineId ? lines.get(context.lineId) : undefined;
  if (context.stationId && !station) throw new RangeError('Unknown Beijing announcement station');
  if (context.lineId && !line) throw new RangeError('Unknown Beijing announcement service');
  if (context.kind !== 'complete' && !station) throw new RangeError('A Beijing station identity is required');
  if (station && line && (kind === 'ride' || kind === 'arrival' || kind === 'boarding') && !line.stops.includes(station.id)) {
    throw new RangeError('Station is not served by this Beijing service');
  }
  phrase(kind);
  if (station) { clips.push(beijingAsset(`stations/${station.id}`)); text.push(`${station.name}。`); }
  if (line) {
    phrase('service'); clips.push(beijingAsset(`lines/${line.id}`)); text.push(`${line.name}。`);
  }
  phrase(kind === 'boarding' ? 'rideEnd' : `${kind}End`);
  return { clips, recordingText: text.join(' ') };
}
