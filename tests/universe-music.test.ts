import { describe, expect, it, vi, afterEach } from 'vitest';
import { AMBIENT_DURATION, AMBIENT_SCORE, createAmbientMusic, scheduleAmbientTone } from '../src/universe/music';
import { freezeSnapshot } from '../src/universe/view';
class Source extends EventTarget {
  type = 'sine'; frequency = {value:0}; onended: (() => void) | null = null;
  connect = vi.fn(); disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
}
function audio() {
  const gain = {value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn(),setTargetAtTime:vi.fn()};
  const nodes: Source[] = [];
  const context = {state:'suspended',currentTime:0,destination:{},createGain:() => ({gain,connect:vi.fn(),disconnect:vi.fn()}),createOscillator:() => { const source = new Source(); nodes.push(source); return source; },resume:vi.fn(async () => {context.state = 'running';}),suspend:vi.fn(async () => {context.state = 'suspended';}),close:vi.fn(async () => {context.state = 'closed';})};
  return {context,gain,nodes};
}
afterEach(() => {vi.useRealTimers();vi.unstubAllGlobals();});
describe('Original cosmic ambience', () => {
  it('has an immutable evolving, bounded and time-ordered score with spacious rests', () => {
    expect(Object.isFrozen(AMBIENT_SCORE)).toBe(true);
    expect(AMBIENT_SCORE.length).toBe(72);
    expect(new Set(AMBIENT_SCORE.map(n => n.midi)).size).toBeGreaterThan(15);
    AMBIENT_SCORE.forEach((note,i) => {
      expect(Object.isFrozen(note)).toBe(true); expect(note.duration).toBeGreaterThan(0);
      expect(note.time + note.duration).toBeLessThan(AMBIENT_DURATION);
      if (i) expect(note.time).toBeGreaterThanOrEqual(AMBIENT_SCORE[i-1].time);
    });
    expect(AMBIENT_SCORE.filter(n => n.voice === 'bell')).toHaveLength(24);
  });
  it('synthesizes tuned, quietly enveloped tones with zero endpoints', () => {
    const {context,gain,nodes} = audio();
    scheduleAmbientTone(context as unknown as BaseAudioContext,{} as AudioNode,{time:0,midi:69,duration:4,voice:'bell'},2);
    expect(nodes[0].frequency.value).toBe(440); expect(nodes[0].type).toBe('sine');
    expect(gain.setValueAtTime).toHaveBeenCalledWith(0,2);
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(.045,2.04);
    expect(gain.setValueAtTime).toHaveBeenCalledWith(0,6.03);
    expect(nodes[0].stop).toHaveBeenCalledWith(6.04);
  });
  it('is opt-in, stops scheduling, recovers from mute and disposes context', async () => {
    vi.useFakeTimers(); const {context,nodes} = audio();
    vi.stubGlobal('document',{hidden:false}); vi.stubGlobal('AudioContext',function () {return context;});
    const failed = vi.fn(), music = createAmbientMusic(failed);
    expect(music.playing).toBe(false); expect(nodes).toHaveLength(0);
    expect(await music.start()).toBe(true); expect(music.playing).toBe(true);
    expect(nodes.some(n => n.type === 'triangle')).toBe(true);
    music.setVolume(0); music.stop(); expect(music.playing).toBe(false);
    const count = nodes.length; vi.advanceTimersByTime(2000); expect(nodes).toHaveLength(count);
    expect(await music.start()).toBe(true); music.dispose(); expect(context.close).toHaveBeenCalledOnce();
    expect(await music.start()).toBe(false); expect(failed).not.toHaveBeenCalled();
  });
  it('rejects hidden playback and does not claim success when audio fails', async () => {
    vi.stubGlobal('document',{hidden:true}); const failed = vi.fn(), music = createAmbientMusic(failed);
    expect(await music.start()).toBe(false);
    vi.stubGlobal('document',{hidden:false}); vi.stubGlobal('AudioContext',function () {throw new Error('blocked');});
    expect(await music.start()).toBe(false); expect(failed).toHaveBeenCalledOnce(); music.dispose();
  });
  it('cancels pending authorization when stopped', async () => {
    const {context} = audio(); let finish!: () => void;
    context.resume = vi.fn(() => new Promise<void>(resolve => {finish = () => {context.state='running';resolve();};}));
    vi.stubGlobal('document',{hidden:false}); vi.stubGlobal('AudioContext',function () {return context;});
    const music = createAmbientMusic(vi.fn()), pending = music.start(); music.stop(); finish();
    expect(await pending).toBe(false); expect(music.playing).toBe(false); expect(context.state).toBe('suspended'); music.dispose();
  });
});
describe('Universe snapshot isolation', () => {
  it('freezes a detached presentation snapshot', () => {
    const input = {destinationId:'earth',kind:'earth' as const,color:'#87c8dd',epoch:'present' as const,beta:.65,travelling:false,progress:0,paused:false,reducedMotion:false};
    const frozen = freezeSnapshot(input); input.beta = .999;
    expect(frozen.beta).toBe(.65); expect(Object.isFrozen(frozen)).toBe(true);
  });
  it('detaches and freezes the departure scene during travel', () => {
    const origin = {destinationId:'earth',kind:'earth' as const,color:'#87c8dd',epoch:'present' as const};
    const frozen = freezeSnapshot({destinationId:'moon',kind:'moon',color:'#ccc',epoch:'present',beta:.9,travelling:true,progress:.4,paused:true,reducedMotion:false,origin});
    origin.destinationId = 'sun'; origin.color = '#fff';
    expect(frozen.origin?.destinationId).toBe('earth'); expect(frozen.origin?.color).toBe('#87c8dd');
    expect(Object.isFrozen(frozen.origin)).toBe(true); expect(frozen.origin).not.toBe(origin);
  });
});
