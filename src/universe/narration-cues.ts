import type { Language } from '../rush/locale';
import { DESTINATIONS, EPOCHS } from './catalog';
import { destinationName } from './locale';
import { narrationCopy, objectNarration } from './narration-locale';
import { routeFrame } from './route';
import type { UniverseSnapshot } from './view';

export function narrationText(id: string, language: Language, ageGyr = 13.8, short = false): string {
  const object = DESTINATIONS.find(d => d.id === id);
  if (!object) return '';
  const copy = narrationCopy(language), name = language === 'zh-CN' && id === 'sagittarius' ? '人马座A星' : destinationName(id, language);
    if (ageGyr < object.formedGyr) return `${name}. ${short ? copy.notFormedShort : copy.notFormed}`;
    if (ageGyr > 13.8) return short ? `${name}. ${copy.futureShort}` : `${copy.future} ${objectNarration(id, language)}`;
    if (short && ageGyr < 13.8) return `${name}. ${copy.reconstructionShort}`;
    const text = objectNarration(id, language, short);
    return ageGyr < 13.8 ? `${copy.reconstruction} ${text}` : text;
}
export function epochNarration(id: string, epoch: UniverseSnapshot['epoch'], language: Language): string {
  return narrationText(id, language, EPOCHS.find(e => e.id === epoch)!.ageGyr);
}
export function flybyCue(snapshot: UniverseSnapshot): { id: string; key: string; ageGyr: number } | null {
  if (!snapshot.travelling || snapshot.paused) return null;
  const frame = routeFrame(snapshot);
  const index = snapshot.reducedMotion ? frame.leg : frame.leg + 1;
  // Announce intermediate anchors on their near approach; reduced-motion routes
  // announce the stationary stop itself. Neither uses wall-clock timers.
  if (index <= 0 || index >= frame.itinerary.length - 1 || (!snapshot.reducedMotion && frame.legProgress < .72)) return null;
  return { id: frame.itinerary[index], key: `${index}:${frame.itinerary[index]}`, ageGyr: frame.ageGyr };
}
