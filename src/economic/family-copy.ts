import content from './legacy-content.json';
import { withSpeech } from './speech-cues';
import type { GameState, Level, Offer, Text } from './model';

const rows: Record<string, Text> = content.family;
export function familyText(id: string): Text {
  const key = `family.${id}`;
  const value = rows[key];
  if (!value) throw new Error(`Missing family copy: ${key}`);
  return withSpeech({ ...value }, key);
}
function variant(id: string, state: GameState): Text | undefined {
  const key = `${id}.${state.family.children}`;
  return rows[`family.${key}`] ? familyText(key) : rows[`family.${id}`] ? familyText(id) : undefined;
}

export function familyLevel(level: Level, state: GameState): Level {
  if (state.level >= 24) return level;
  return { ...level, goal: variant(`${level.id}.goal`, state) ?? level.goal, intro: variant(`${level.id}.intro`, state) ?? level.intro };
}

export function familyOffer(offer: Offer, state: GameState): Offer {
  const action = variant(`action.${offer.id}`, state);
  if (action) return { ...offer, label: action, detail: action };
  if (offer.id === 'make-list') return { ...offer, detail: familyText(`school-list.goal.${state.family.children}`) };
  if (offer.id === 'plan-trip') return { ...offer, detail: familyText(`travel-budget.goal.${state.family.children}`) };
  return offer;
}
