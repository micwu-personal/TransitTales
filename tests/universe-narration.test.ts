import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNarration, narrationVoices } from '../src/universe/narration';
const voice = (name: string, lang: string, localService = true): SpeechSynthesisVoice => ({name,lang,voiceURI:name,localService,default:false});
class Utterance {
  text: string; lang = ''; voice: SpeechSynthesisVoice | null = null; volume = 1; rate = 1; pitch = 1;
  onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}
function speech(initial: SpeechSynthesisVoice[] = [voice('English','en-US'),voice('Microsoft Huihui','zh-CN'),voice('Microsoft Xiaoxiao Natural','zh-CN',false)]) {
  const synth = Object.assign(new EventTarget(), { getVoices: vi.fn(() => initial), cancel: vi.fn(), speak: vi.fn((item: Utterance) => { item.onstart?.(); }) });
  vi.stubGlobal('speechSynthesis',synth); vi.stubGlobal('SpeechSynthesisUtterance',Utterance);
  return synth;
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
// Mock utterances verify scheduling and settings, not audible quality or accents.
describe('Optional browser cosmic voice', () => {
  it('prefers exact US Ana, then every US voice ahead of other English accents', () => {
    const nigeria = { ...voice('Microsoft Abeo Online (Natural) - English (Nigeria)', 'en-NG', false), default: true };
    const ana = voice('Microsoft Ana Online (Natural) - English (United States)', 'en-US', false);
    const american = voice('Samantha', 'en_US');
    const choices = [nigeria, voice('British Natural', 'en-GB'), voice('Generic Natural', 'en'), american, ana];
    expect(narrationVoices(choices, 'en').slice(0, 2)).toEqual([ana, american]);
    const synth = speech(choices), narrator = createNarration(vi.fn()); narrator.setEnabled(true);
    narrator.speak('Earth'); expect(synth.speak.mock.calls[0][0].voice).toBe(ana);
    narrator.setVoice(nigeria.voiceURI); narrator.speak('Moon'); expect(synth.speak.mock.calls[1][0].voice).toBe(nigeria);
    synth.dispatchEvent(new Event('voiceschanged'));
    narrator.setLanguage('zh-CN'); narrator.setLanguage('en'); narrator.speak('Mars');
    expect(synth.speak.mock.calls[2][0].voice).toBe(nigeria);
    narrator.setVoice(''); narrator.speak('Sun'); expect(synth.speak.mock.calls[3][0].voice).toBe(ana); narrator.dispose();
    expect(narrationVoices([nigeria, american], 'en')[0]).toBe(american);
    expect(narrationVoices([nigeria], 'en')[0]).toBe(nigeria);
  });
  it('lets long automatic lines finish across flybys, replaces only one pending cue, and prioritizes arrival', () => {
    vi.useFakeTimers(); const synth = speech(), narrator = createNarration(vi.fn()), started = vi.fn(); narrator.setEnabled(true);
    narrator.speak('Long departure sentence', true, { automatic: true });
    const departure = synth.speak.mock.calls[0][0];
    vi.advanceTimersByTime(1800); narrator.speak('Mars', true, { automatic: true });
    vi.advanceTimersByTime(2400); narrator.speak('Jupiter', true, { automatic: true, onStart: started });
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(synth.speak).toHaveBeenCalledOnce(); expect(synth.cancel).not.toHaveBeenCalled(); expect(started).not.toHaveBeenCalled();
    departure.onend?.(); expect(synth.speak.mock.calls[1][0].text).toBe('Jupiter'); expect(started).toHaveBeenCalledOnce();
    narrator.speak('Another short flyby', true, { automatic: true });
    narrator.speak('Full arrival story', false, { automatic: true });
    vi.advanceTimersByTime(20000); expect(synth.cancel).not.toHaveBeenCalled();
    synth.speak.mock.calls[1][0].onend?.(); expect(synth.speak.mock.calls[2][0].text).toBe('Full arrival story');
    synth.speak.mock.calls[2][0].onend?.(); expect(synth.speak).toHaveBeenCalledTimes(3); expect(narrator.busy).toBe(false);
    expect(synth.cancel).not.toHaveBeenCalled(); narrator.dispose();
  });
  it('drops expired automatic flybys instead of narrating a passed object after a long line', () => {
    vi.useFakeTimers(); const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true);
    narrator.speak('Departure', true, { automatic: true }); narrator.speak('Mars', true, { automatic: true });
    vi.advanceTimersByTime(2501); synth.speak.mock.calls[0][0].onend?.();
    expect(synth.speak).toHaveBeenCalledOnce(); expect(narrator.busy).toBe(false); expect(narrator.status).toBe('ready'); narrator.dispose();
  });
  it('retains only arrival when voices arrive late and does not expire full stories', () => {
    vi.useFakeTimers(); const synth = speech([]), narrator = createNarration(vi.fn()); narrator.setEnabled(true);
    narrator.speak('Mars', true, { automatic: true }); narrator.speak('Arrival', false, { automatic: true });
    vi.advanceTimersByTime(30000); synth.getVoices.mockReturnValue([voice('US', 'en-US')]); synth.dispatchEvent(new Event('voiceschanged'));
    expect(synth.speak.mock.calls[0][0].text).toBe('Arrival'); narrator.dispose();
  });
  it.each(['stop', 'disable', 'language', 'voice', 'dispose'] as const)('clears active and queued automatic narration on %s', action => {
    const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true);
    narrator.speak('Departure', true, { automatic: true }); const staleEnd = synth.speak.mock.calls[0][0].onend!;
    narrator.speak('Queued flyby', true, { automatic: true });
    if (action === 'stop') narrator.stop();
    if (action === 'disable') narrator.setEnabled(false);
    if (action === 'language') narrator.setLanguage('zh-CN');
    if (action === 'voice') narrator.setVoice('English');
    if (action === 'dispose') narrator.dispose();
    staleEnd(); synth.dispatchEvent(new Event('voiceschanged')); narrator.setPaused(true); narrator.setPaused(false);
    expect(synth.speak).toHaveBeenCalledOnce(); expect(synth.cancel).toHaveBeenCalledOnce(); expect(narrator.busy).toBe(false); narrator.dispose();
  });
  it('resumes the newest pending automatic line after pause, never an older interrupted one', () => {
    vi.useFakeTimers(); const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true);
    narrator.speak('Departure', true, { automatic: true }); narrator.speak('Mars', true, { automatic: true }); narrator.setPaused(true);
    vi.advanceTimersByTime(10000); narrator.setPaused(false);
    expect(synth.speak.mock.calls[1][0].text).toBe('Mars'); expect(synth.cancel).toHaveBeenCalledOnce(); narrator.dispose();
  });
  it('explicit user replacement removes a queued flyby immediately', () => {
    const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true);
    narrator.speak('Departure', true, { automatic: true }); narrator.speak('Queued flyby', true, { automatic: true });
    narrator.speak('Manual story'); expect(synth.speak.mock.calls[1][0].text).toBe('Manual story'); expect(synth.cancel).toHaveBeenCalledOnce();
    synth.speak.mock.calls[1][0].onend?.(); expect(synth.speak).toHaveBeenCalledTimes(2); narrator.dispose();
  });
  it('normalizes voice locale tags without requiring String.replaceAll', () => {
    const descriptor = Object.getOwnPropertyDescriptor(String.prototype, 'replaceAll')!;
    let choices: SpeechSynthesisVoice[];
    try {
      Object.defineProperty(String.prototype, 'replaceAll', { ...descriptor, value: undefined });
      choices = narrationVoices([voice('Nigeria Natural', 'en_NG'), voice('US', 'en_US')], 'en');
    } finally { Object.defineProperty(String.prototype, 'replaceAll', descriptor); }
    expect(choices!.map(v => v.name)).toEqual(['US', 'Nigeria Natural']);
  });
  it('survives throwing or absent getVoices and retries the latest story when voices recover', () => {
    const synth = speech(); synth.getVoices.mockImplementation(() => { throw Error('Unavailable voice registry'); });
    const narrator = createNarration(vi.fn()); narrator.setEnabled(true); narrator.speak('Old'); narrator.speak('Latest');
    expect(narrator.voices()).toEqual([]); expect(narrator.status).toBe('no-voice');
    synth.getVoices.mockReturnValue([voice('US', 'en-US')]); synth.dispatchEvent(new Event('voiceschanged'));
    expect(synth.speak.mock.calls[0][0].text).toBe('Latest'); narrator.dispose();
    Object.defineProperty(synth, 'getVoices', { value: undefined });
    const missing = createNarration(vi.fn()); missing.setEnabled(true); missing.speak('No voices');
    expect(missing.status).toBe('no-voice'); missing.dispose();
  });
  it('supports old onvoiceschanged callbacks without add/removeEventListener and restores the previous handler', () => {
    const synth = speech([]), previous = vi.fn();
    Object.defineProperties(synth, { addEventListener: { value: undefined }, removeEventListener: { value: undefined }, onvoiceschanged: { value: previous, writable: true } });
    const legacy = synth as unknown as SpeechSynthesis, narrator = createNarration(vi.fn()); narrator.setEnabled(true); narrator.speak('Latest');
    synth.getVoices.mockReturnValue([voice('US', 'en-US')]); legacy.onvoiceschanged?.call(legacy, new Event('voiceschanged'));
    expect(previous).toHaveBeenCalledOnce(); expect(synth.speak.mock.calls[0][0].text).toBe('Latest');
    narrator.dispose(); expect(legacy.onvoiceschanged).toBe(previous);
  });
  it('tolerates absent removal APIs and throwing voice event registration', () => {
    const synth = speech(); Object.defineProperty(synth, 'addEventListener', { value: () => { throw Error('Registration unavailable'); } });
    const narrator = createNarration(vi.fn()); narrator.setEnabled(true); narrator.speak('Still available'); narrator.dispose();
    expect(synth.speak).toHaveBeenCalledOnce();
    const removable = speech(), other = createNarration(vi.fn());
    Object.defineProperty(removable, 'removeEventListener', { value: undefined });
    expect(() => other.dispose()).not.toThrow();
  });
  it('prioritizes natural Mainland Mandarin, accepts Mandarin alternatives but never Cantonese or unrelated languages', () => {
    const voices = [voice('Cantonese','zh-HK'),voice('English','en-US'),voice('Taiwan Natural','zh-TW'),voice('Huihui','zh-CN'),voice('Xiaoxiao Natural','zh-CN'),voice('Yue','yue-CN')];
    expect(narrationVoices(voices,'zh-CN').map(v=>v.name)).toEqual(['Xiaoxiao Natural','Huihui','Taiwan Natural']);
    expect(narrationVoices([voice('Mongolian','mn-MN')],'mn-Mong-CN')).toEqual([]);
  });
  it('is silent until opted in and uses expressive but restrained Mandarin settings', () => {
    const synth = speech(), changed = vi.fn(), narrator = createNarration(changed);
    expect(synth.speak).not.toHaveBeenCalled(); narrator.speak('安静的星空。'); expect(synth.speak).not.toHaveBeenCalled();
    narrator.setLanguage('zh-CN'); narrator.setEnabled(true); narrator.speak('地球，是我们故事的起点。');
    const item = synth.speak.mock.calls[0][0];
    expect(item.voice?.name).toBe('Microsoft Xiaoxiao Natural'); expect(item.lang).toBe('zh-CN');
    expect(item.rate).toBe(.94); expect(item.pitch).toBe(1); expect(item.volume).toBe(.85); expect(narrator.status).toBe('speaking');
    item.onend?.(); expect(narrator.status).toBe('ready'); expect(narrator.busy).toBe(false); narrator.dispose();
  });
  it('keeps explicit per-language voice choices through renderer-like updates and locale changes', () => {
    const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true); narrator.setLanguage('zh-CN'); narrator.setVoice('Microsoft Huihui'); narrator.speak('月球。');
    expect(synth.speak.mock.calls[0][0].voice?.name).toBe('Microsoft Huihui');
    narrator.setLanguage('en'); narrator.setLanguage('zh-CN'); expect(narrator.selectedVoice).toBe('Microsoft Huihui');
    narrator.speak('木星。',true); expect(synth.speak.mock.calls[1][0].rate).toBe(1.06); narrator.dispose();
  });
  it('immediately replaces speech for explicit user requests, and stale callbacks cannot change new speech state', () => {
    const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true); narrator.speak('Mars');
    const staleEnd = synth.speak.mock.calls[0][0].onend!; narrator.speak('Jupiter',true);
    expect(synth.cancel).toHaveBeenCalledOnce(); staleEnd(); expect(narrator.status).toBe('speaking');
    narrator.setEnabled(false); expect(narrator.busy).toBe(false); expect(narrator.status).toBe('off'); narrator.dispose();
  });
  it('pauses by cancelling owned speech, resumes only the latest request and does not replay completed speech', () => {
    const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true); narrator.speak('Mars',true); narrator.setPaused(true);
    expect(synth.cancel).toHaveBeenCalledOnce(); expect(narrator.status).toBe('ready'); narrator.speak('Jupiter',true);
    expect(synth.speak).toHaveBeenCalledOnce(); narrator.setPaused(false);
    expect(synth.speak.mock.calls[1][0].text).toBe('Jupiter'); synth.speak.mock.calls[1][0].onend?.(); narrator.setPaused(true); narrator.setPaused(false);
    expect(synth.speak).toHaveBeenCalledTimes(2); narrator.dispose();
  });
  it('handles late voice loading, with only the latest still-valid cue and no cross-language fallback', () => {
    const synth = speech([]), narrator = createNarration(vi.fn()); narrator.setLanguage('zh-CN'); narrator.setEnabled(true); narrator.speak('火星。'); narrator.speak('木星。',true);
    expect(narrator.status).toBe('no-voice'); synth.getVoices.mockReturnValue([voice('English','en-US')]); synth.dispatchEvent(new Event('voiceschanged')); expect(synth.speak).not.toHaveBeenCalled();
    synth.getVoices.mockReturnValue([voice('Mandarin','zh-CN')]); synth.dispatchEvent(new Event('voiceschanged'));
    expect(synth.speak.mock.calls[0][0].text).toBe('木星。'); narrator.stop(); narrator.dispose();
  });
  it('cancels delayed voice requests on stop/locale changes/disposal and removes its listener', () => {
    const synth = speech([]), narrator = createNarration(vi.fn()); narrator.setEnabled(true); narrator.speak('Old'); narrator.stop();
    synth.getVoices.mockReturnValue([voice('English','en-US')]); synth.dispatchEvent(new Event('voiceschanged')); expect(synth.speak).not.toHaveBeenCalled();
    narrator.speak('New'); const removed = vi.spyOn(synth,'removeEventListener'); narrator.dispose();
    expect(removed).toHaveBeenCalledWith('voiceschanged',expect.any(Function)); expect(synth.cancel).toHaveBeenCalled();
  });
  it('reports unsupported, thrown, callback and silent autoplay failures without preventing exploration', () => {
    vi.stubGlobal('speechSynthesis',undefined); const unavailable = createNarration(vi.fn()); unavailable.setEnabled(true); expect(unavailable.status).toBe('unavailable'); expect(unavailable.enabled).toBe(false); unavailable.dispose();
    vi.useFakeTimers(); const synth = speech(), narrator = createNarration(vi.fn()); narrator.setEnabled(true);
    synth.speak.mockImplementationOnce(()=>{throw Error('blocked');}); narrator.speak('Blocked'); expect(narrator.status).toBe('error');
    narrator.speak('Error'); synth.speak.mock.calls[1][0].onerror?.(); expect(narrator.status).toBe('error');
    synth.speak.mockImplementationOnce(()=>{}); narrator.speak('Silent'); vi.advanceTimersByTime(3501); expect(narrator.status).toBe('error'); expect(narrator.busy).toBe(false); narrator.dispose();
  });
});
