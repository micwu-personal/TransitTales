import { describe, expect, it } from 'vitest';
import { act, createGame, getActions } from '../src/economic/model';
import { balanceNarration, choiceNarration, outcomeNarration } from '../src/economic/narration-guidance';
import { AUDIO_PREFERENCE_KEY, loadAudioPreferences, saveAudioPreferences } from '../src/economic/audio-preferences';

describe('concise child-facing narration', () => {
  it('keeps choices focused on the selected action rather than reading the whole wallet', () => {
    const state = createGame({ gender: 'boy', children: 1 });
    const offer = getActions(state, 'shop').find(o => o.id === 'buy-apple')!;
    const cues = choiceNarration(state, offer, 'zh').flat();
    for (const id of ['ui.pocket', 'ui.owed', 'legacy.common.savings', 'legacy.common.digital', 'ui.company-cash']) expect(cues).not.toContain(id);
    expect(cues).toContain('legacy.common.total');
  });
  it('reads actual cash and apple changes, without repeating unchanged accounts', () => {
    const before = act(createGame({ gender: 'girl', children: 1 }), 'read-tags').state;
    const result = act(before, 'buy-apple');
    const cues = outcomeNarration(before, result.state, result.message, 'zh').flat();
    expect(cues).toContain('money.home.80');
    expect(cues).toContain('ui.bag-item');
    for (const id of ['ui.owed', 'legacy.common.savings', 'legacy.common.digital', 'legacy.common.current-day']) expect(cues).not.toContain(id);
    expect(balanceNarration(before, 'zh').flat()).toContain('ui.pocket');
  });
});

describe('persistent audio preferences', () => {
  it('keeps voice and effects independently switchable across reloads', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(saveAudioPreferences(storage, { voice: false, effects: true })).toBe(true);
    expect(loadAudioPreferences(storage)).toEqual({ voice: false, effects: true });
    expect(data.has(AUDIO_PREFERENCE_KEY)).toBe(true);
  });
  it('tolerates corrupt or unavailable storage without blocking play', () => {
    expect(loadAudioPreferences({ getItem: () => '{' })).toEqual({ voice: false, effects: true });
    expect(loadAudioPreferences({ getItem: () => '{"voice":"false","effects":true}' })).toEqual({ voice: false, effects: true });
    expect(saveAudioPreferences(undefined, { voice: false, effects: false })).toBe(false);
    expect(loadAudioPreferences({ getItem: () => { throw new Error('blocked'); } }).voice).toBe(false);
    expect(loadAudioPreferences(undefined)).toEqual({ voice: false, effects: true });
    expect(loadAudioPreferences({ getItem: () => '{"voice":true,"effects":false}' })).toEqual({ voice: true, effects: false });
  });
});
