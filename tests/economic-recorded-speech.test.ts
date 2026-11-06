import { describe, expect, it } from 'vitest';
import { speechSamples, speechWav } from '../src/economic/recorded-speech';
function buffer(samples: Float32Array, sampleRate = 1000): AudioBuffer {
  return { length: samples.length, sampleRate, numberOfChannels: 1, getChannelData: () => samples } as unknown as AudioBuffer;
}
describe('continuous prerecorded Chinese clauses', () => {
  it('removes long edge padding, preserves quiet speech margins and internal pauses', () => {
    const source = new Float32Array(1600);
    source.fill(.2, 500, 600); source.fill(.001, 600, 620); source.fill(.2, 900, 1000);
    const trimmed = speechSamples(buffer(source));
    expect(trimmed.length).toBe(570);
    expect(trimmed[35]).toBeCloseTo(.2);
    expect(trimmed[135]).toBeCloseTo(.001);
    expect(trimmed[200]).toBe(0);
    const quiet = new Float32Array(400); quiet.fill(.0005, 100, 200);
    expect(speechSamples(buffer(quiet)).length).toBe(170);
    expect(() => speechSamples(buffer(new Float32Array(100)))).toThrow('Silent');
  });
  it('encodes one playable mono PCM WAV with a bounded 105 ms fragment-boundary gap', async () => {
    const source = new Float32Array(1600); source.fill(.2, 500, 1000);
    const part = speechSamples(buffer(source)), blob = speechWav([part, part], 1000);
    const bytes = await blob.arrayBuffer(), view = new DataView(bytes);
    expect(blob.type).toBe('audio/wav');
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1); expect(view.getUint32(24, true)).toBe(1000);
    expect(view.getUint32(40, true)).toBe((570 * 2 + 35) * 2);
    const pcm = new Int16Array(bytes.slice(44));
    let gap = 0;
    for (let i = 535; i < 640; i++) if (pcm[i] === 0) gap++;
    expect(gap).toBe(105);
    expect(pcm[640]).toBeGreaterThan(0);
  });
  it('clips samples safely and refuses empty or unbounded compositions', async () => {
    const bytes = await speechWav([new Float32Array([-2, 2])], 1000).arrayBuffer(), view = new DataView(bytes);
    expect(view.getInt16(44, true)).toBe(-32768); expect(view.getInt16(46, true)).toBe(32767);
    expect(() => speechWav([], 1000)).toThrow();
    expect(() => speechWav([new Float32Array(60001)], 1000)).toThrow('too long');
  });
});
