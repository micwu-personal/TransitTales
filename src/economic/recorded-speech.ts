// Join prerecorded fragments at clause boundaries; never synthesize speech.
export function speechSamples(buffer: AudioBuffer): Float32Array {
  const samples = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const input = buffer.getChannelData(channel);
    for (let i = 0; i < input.length; i++) samples[i] += input[i] / buffer.numberOfChannels;
  }
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (!peak) throw new Error('Silent narration fragment');
  const threshold = Math.min(0.004, peak * 0.015);
  let start = 0, end = samples.length;
  while (start < end && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end - 1]) < threshold) end--;
  const margin = Math.ceil(buffer.sampleRate * 0.035);
  return samples.slice(Math.max(0, start - margin), Math.min(samples.length, end + margin));
}
export function speechWav(parts: Float32Array[], sampleRate: number): Blob {
  if (!parts.length || !Number.isSafeInteger(sampleRate) || sampleRate <= 0) throw new Error('Invalid narration audio');
  const gap = Math.round(sampleRate * 0.035);
  const count = parts.reduce((sum, part) => sum + part.length, 0) + gap * (parts.length - 1);
  if (count > sampleRate * 60) throw new Error('Narration clause is too long');
  const bytes = new ArrayBuffer(44 + count * 2), view = new DataView(bytes);
  const word = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  word(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); word(8, 'WAVE'); word(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, 'data'); view.setUint32(40, count * 2, true);
  let offset = 44;
  parts.forEach((part, index) => {
    if (index) offset += gap * 2;
    for (const sample of part) {
      const value = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, Math.round(value * (value < 0 ? 32768 : 32767)), true); offset += 2;
    }
  });
  return new Blob([bytes], { type: 'audio/wav' });
}
export class RecordedSpeech {
  private context?: AudioContext;
  private fragments = new Map<string, Float32Array>();
  private clauses = new Map<string, string>();
  private disposed = false;
  async join(urls: readonly string[], active: () => boolean = () => true): Promise<string> {
    if (this.disposed || !active()) throw new Error('Narration audio was stopped');
    const key = urls.join('|'), cached = this.clauses.get(key);
    if (cached) { this.clauses.delete(key); this.clauses.set(key, cached); return cached; }
    const context = this.context ?? (this.context = new AudioContext({ sampleRate: 24000 }));
    const parts: Float32Array[] = [];
    // Sequential decoding bounds memory and keeps fetches on our own origin.
    for (const url of urls) {
      if (this.disposed || !active()) throw new Error('Narration audio was stopped');
      let samples = this.fragments.get(url);
      if (!samples) {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Missing narration fragment');
        samples = speechSamples(await context.decodeAudioData(await response.arrayBuffer()));
        if (this.disposed || !active()) throw new Error('Narration audio was stopped');
        this.fragments.set(url, samples);
        while (this.fragments.size > 32 || [...this.fragments.values()].reduce((bytes, part) => bytes + part.byteLength, 0) > 8 * 1024 * 1024) this.fragments.delete(this.fragments.keys().next().value!);
      }
      parts.push(samples);
    }
    if (this.disposed || !active()) throw new Error('Narration audio was stopped');
    const url = URL.createObjectURL(speechWav(parts, context.sampleRate));
    const previous = this.clauses.get(key);
    if (previous) URL.revokeObjectURL(previous);
    this.clauses.set(key, url);
    while (this.clauses.size > 16) {
      const oldest = this.clauses.keys().next().value!;
      URL.revokeObjectURL(this.clauses.get(oldest)!); this.clauses.delete(oldest);
    }
    return url;
  }
  dispose(): void {
    this.disposed = true;
    for (const url of this.clauses.values()) URL.revokeObjectURL(url);
    this.clauses.clear(); this.fragments.clear();
    void this.context?.close().catch(() => {});
  }
}
