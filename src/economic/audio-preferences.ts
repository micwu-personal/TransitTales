export const AUDIO_PREFERENCE_KEY = 'transit-tales-economic-audio-v1';
export type AudioPreferences = { voice: boolean; effects: boolean };
export function loadAudioPreferences(storage?: Pick<Storage, 'getItem'>): AudioPreferences {
  try {
    const value: unknown = JSON.parse(storage?.getItem(AUDIO_PREFERENCE_KEY) ?? 'null');
    if (value && typeof value === 'object' && 'voice' in value && 'effects' in value && typeof value.voice === 'boolean' && typeof value.effects === 'boolean') return { voice: value.voice, effects: value.effects };
  } catch { /* Audio preferences are optional when storage is unavailable. */ }
  return { voice: false, effects: true };
}
export function saveAudioPreferences(storage: Pick<Storage, 'setItem'> | undefined, preferences: AudioPreferences): boolean {
  try { if (!storage) return false; storage.setItem(AUDIO_PREFERENCE_KEY, JSON.stringify(preferences)); return true; } catch { return false; }
}
