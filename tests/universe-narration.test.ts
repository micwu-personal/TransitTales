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
describe('Optional browser cosmic voice', () => {
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
  it('replaces stale speech instead of queuing flybys, and stale callbacks cannot change new speech state', () => {
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
