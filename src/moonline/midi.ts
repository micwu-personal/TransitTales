import type { Note, Role, Song, Track } from './score';

const PPQ = 960;
const MAX_DELTA = 0x0FFFFFFF;
const PROGRAM: Record<Role, number> = { piano: 0, guitar: 24, bass: 33, pad: 89, drums: 0 };
const encoder = new TextEncoder();
const decoder = new TextDecoder();
// Keep source-track EOT positions for direct re-export without expanding the score model.
const trackEnds = new WeakMap<Track, number>();

function vlq(value: number): number[] {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_DELTA) throw new RangeError('MIDI delta out of range');
  const bytes = [value & 127];
  for (value >>>= 7; value; value >>>= 7) bytes.unshift((value & 127) | 128);
  return bytes;
}

function uint(value: number, length: number): number[] {
  return Array.from({ length }, (_, i) => (value >>> (8 * (length - i - 1))) & 255);
}

function chunk(tag: string, body: number[]): Uint8Array {
  const result = new Uint8Array(8 + body.length);
  result.set(encoder.encode(tag));
  result.set(uint(body.length, 4), 4);
  result.set(body, 8);
  return result;
}

function textEvent(body: number[], type: number, value: string) {
  const text = encoder.encode(value);
  body.push(0, 0xFF, type, ...vlq(text.length));
  for (const byte of text) body.push(byte);
}

function tick(beat: number): number {
  const value = Math.round(beat * PPQ);
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Invalid MIDI beat');
  return value;
}

/** SMF type 1, constant tempo, 960 ticks/beat, General MIDI instruments and percussion. */
export function encodeMidi(song: Song): Uint8Array {
  const tempo = Math.round(60_000_000 / song.bpm);
  if (!Number.isInteger(tempo) || tempo < 1 || tempo > 0xFFFFFF) throw new RangeError('BPM outside MIDI tempo range');
  if (song.tracks.length >= 0xFFFF) throw new RangeError('Too many MIDI tracks');
  const end = tick(song.beats);
  const conductor: number[] = [];
  if (song.midiCopyright) textEvent(conductor, 0x02, song.midiCopyright);
  textEvent(conductor, 0x03, song.title);
  conductor.push(0, 0xFF, 0x51, 3, ...uint(tempo, 3), ...vlq(end), 0xFF, 0x2F, 0);
  const chunks = [chunk('MThd', [0, 1, ...uint(song.tracks.length + 1, 2), ...uint(PPQ, 2)]), chunk('MTrk', conductor)];
  const free = Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 9);
  const primary = new Map<Role, number>();
  // Reserve one channel per role before allocating duplicates. Very large scores reuse
  // channels within a role; percussion always shares GM channel 10.
  for (const { role } of song.tracks) {
    if (role !== 'drums' && !primary.has(role)) primary.set(role, free.shift()!);
  }
  const used = new Set<Role>();
  for (const track of song.tracks) {
    const channel = track.role === 'drums' ? 9 : used.has(track.role)
      ? free.shift() ?? primary.get(track.role)! : primary.get(track.role)!;
    used.add(track.role);
    const body: number[] = [];
    textEvent(body, 0x03, track.name);
    body.push(0, 0xFF, 0x20, 1, channel);
    if (channel !== 9) body.push(0, 0xC0 | channel, PROGRAM[track.role]);
    const events: { at: number; on: boolean; pitch: number; velocity: number }[] = [];
    for (const note of track.notes) {
      if (!Number.isInteger(note.pitch) || note.pitch < 0 || note.pitch > 127
        || !Number.isInteger(note.velocity) || note.velocity < 1 || note.velocity > 127
        || !Number.isFinite(note.length) || note.length <= 0 || note.beat < 0) {
        throw new RangeError('Invalid MIDI note');
      }
      const at = tick(note.beat);
      events.push({ at, on: true, pitch: note.pitch, velocity: note.velocity },
        { at: Math.max(at + 1, tick(note.beat + note.length)), on: false, pitch: note.pitch, velocity: 0 });
    }
    events.sort((a, b) => a.at - b.at || Number(a.on) - Number(b.on));
    let previous = 0;
    for (const event of events) {
      body.push(...vlq(event.at - previous), (event.on ? 0x90 : 0x80) | channel, event.pitch, event.velocity);
      previous = event.at;
    }
    const importedEnd = trackEnds.get(track);
    const trackEnd = importedEnd === undefined ? end : tick(Math.min(song.beats, importedEnd));
    body.push(...vlq(Math.max(trackEnd, previous) - previous), 0xFF, 0x2F, 0);
    chunks.push(chunk('MTrk', body));
  }
  const file = new Uint8Array(chunks.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of chunks) {
    file.set(part, offset);
    offset += part.length;
  }
  return file;
}

class Reader {
  private offset = 0;
  constructor(private readonly data: Uint8Array) {}
  get remaining(): number { return this.data.length - this.offset; }
  byte(): number {
    if (!this.remaining) throw new Error('Truncated MIDI file');
    return this.data[this.offset++];
  }
  bytes(length: number): Uint8Array {
    if (length > this.remaining) throw new Error('Truncated MIDI chunk');
    const start = this.offset;
    this.offset += length;
    return this.data.subarray(start, this.offset);
  }
  uint(length: number): number {
    let result = 0;
    for (let i = 0; i < length; i++) result = 256 * result + this.byte();
    return result;
  }
  vlq(): number {
    let result = 0;
    for (let i = 0; i < 4; i++) {
      const byte = this.byte();
      result = 128 * result + (byte & 127);
      if (byte < 128) return result;
    }
    throw new Error('Invalid MIDI variable-length quantity');
  }
}

type Tempo = { tick: number; micros: number };
const DEFAULT_TEMPO = 500_000;

function roleFor(channel: number, program: number): Role {
  if (channel === 9) return 'drums';
  if (program >= 24 && program < 32) return 'guitar';
  if (program >= 32 && program < 40) return 'bass';
  if ((program >= 40 && program < 56) || (program >= 88 && program < 96)) return 'pad';
  return 'piano';
}

function readTrack(reader: Reader, tempos: Tempo[], index: number): { end: number; tracks: Track[] } {
  const programs = new Uint8Array(16);
  const declared = new Set<number>();
  const active = new Map<number, { notes: Note[]; cursor: number }>();
  const parts = new Map<string, { role: Role; channel: number; notes: Note[] }>();
  let name: string | undefined;
  let at = 0;
  let running = 0;
  while (reader.remaining) {
    at += reader.vlq();
    let status = reader.byte();
    let first: number | undefined;
    if (status < 128) {
      if (!running) throw new Error('MIDI data without running status');
      first = status;
      status = running;
    }
    if (status === 0xFF) {
      running = 0;
      const kind = reader.byte();
      const bytes = reader.bytes(reader.vlq());
      if (kind === 0x2F) break;
      if (kind === 0x03) name = decoder.decode(bytes);
      if (kind === 0x20 && bytes.length === 1 && bytes[0] < 16) declared.add(bytes[0]);
      if (kind === 0x51 && bytes.length === 3) {
        const micros = bytes[0] * 65536 + bytes[1] * 256 + bytes[2];
        if (micros > 0) tempos.push({ tick: at, micros });
      }
      continue;
    }
    if (status === 0xF0 || status === 0xF7) {
      running = 0;
      reader.bytes(reader.vlq());
      continue;
    }
    if (status >= 0xF0) throw new Error('Unsupported MIDI system event');
    running = status;
    const kind = status & 0xF0;
    const channel = status & 15;
    const a = first ?? reader.byte();
    const b = kind === 0xC0 || kind === 0xD0 ? 0 : reader.byte();
    if (a > 127 || b > 127) throw new Error('Invalid MIDI channel data');
    if (kind === 0xC0) { programs[channel] = a; declared.add(channel); }
    const key = (channel << 7) + a;
    if (kind === 0x90 && b > 0) {
      const role = roleFor(channel, programs[channel]);
      const partKey = `${channel}:${role}`;
      let part = parts.get(partKey);
      if (!part) parts.set(partKey, part = { role, channel, notes: [] });
      const note: Note = { pitch: a, beat: at, length: 0, velocity: b };
      part.notes.push(note);
      let queue = active.get(key);
      if (!queue) active.set(key, queue = { notes: [], cursor: 0 });
      queue.notes.push(note);
    } else if (kind === 0x80 || kind === 0x90) {
      const queue = active.get(key);
      if (queue) {
        const note = queue.notes[queue.cursor++];
        note.length = at - note.beat;
        if (queue.cursor === queue.notes.length) active.delete(key);
      }
    }
  }
  for (const { notes, cursor } of active.values()) {
    for (let i = cursor; i < notes.length; i++) notes[i].length = at - notes[i].beat;
  }
  const represented = new Set(Array.from(parts.values(), part => part.channel));
  for (const channel of declared) {
    if (!represented.has(channel)) parts.set(`${channel}:empty`, { role: roleFor(channel, programs[channel]), channel, notes: [] });
  }
  const sameChannel = new Map<number, number>();
  for (const { channel } of parts.values()) sameChannel.set(channel, (sameChannel.get(channel) ?? 0) + 1);
  const base = name ?? `Track ${index + 1}`;
  return { end: at, tracks: Array.from(parts.values(), ({ role, channel, notes }) => ({
    role, name: parts.size === 1 ? base : `${base} (ch ${channel + 1}${sameChannel.get(channel)! > 1 ? ` ${role}` : ''})`,
    notes: notes.filter(note => note.length > 0),
  })) };
}

/**
 * Reads SMF types 0/1 with PPQ timing. Tempo changes are flattened to the initial BPM
 * (120 if absent at tick zero), preserving elapsed time, not musical bar positions.
 * Channels/program families are reduced to Moonline roles per source track. Controls
 * (including sustain), bends, sysex, meters, and other metadata are not represented.
 * Overlapping unisons on one channel/pitch are paired FIFO; zero-length notes are dropped.
 * Direct re-export retains per-track end ticks after tempo normalization; cloning tracks
 * keeps only the overall song duration. SMPTE timing and type 2 are unsupported.
 */
export function decodeMidi(data: Uint8Array, id: string, title: string): Song {
  const file = new Reader(data);
  if (decoder.decode(file.bytes(4)) !== 'MThd') throw new Error('Not a Standard MIDI File');
  const header = new Reader(file.bytes(file.uint(4)));
  const format = header.uint(2);
  const count = header.uint(2);
  const ppq = header.uint(2);
  if (format > 1 || count === 0 || (format === 0 && count !== 1) || ppq === 0 || ppq >= 0x8000) {
    throw new Error('Only MIDI types 0/1 with PPQ timing are supported');
  }
  const tempos: Tempo[] = [{ tick: 0, micros: DEFAULT_TEMPO }];
  const tracks: Track[] = [];
  const trackEndTicks: number[] = [];
  let end = 0;
  for (let i = 0; i < count;) {
    const tag = decoder.decode(file.bytes(4));
    const bytes = file.bytes(file.uint(4));
    if (tag !== 'MTrk') continue;
    const parsed = readTrack(new Reader(bytes), tempos, i++);
    end = Math.max(end, parsed.end);
    for (const track of parsed.tracks) {
      tracks.push(track);
      trackEndTicks.push(parsed.end);
    }
  }
  tempos.sort((a, b) => a.tick - b.tick);
  let initial = DEFAULT_TEMPO;
  for (const tempo of tempos) {
    if (tempo.tick !== 0) break;
    initial = tempo.micros;
  }
  let beats = 0;
  let previous: Tempo = tempos[0];
  const map = tempos.map(tempo => {
    beats += (tempo.tick - previous.tick) * previous.micros / (initial * ppq);
    previous = tempo;
    return { ...tempo, beat: beats };
  });
  const normalize = (at: number) => {
    let left = 0;
    let right = map.length;
    while (left + 1 < right) {
      const mid = (left + right) >>> 1;
      if (map[mid].tick <= at) left = mid;
      else right = mid;
    }
    const tempo = map[left];
    return tempo.beat + (at - tempo.tick) * tempo.micros / (initial * ppq);
  };
  tracks.forEach((track, index) => {
    trackEnds.set(track, normalize(trackEndTicks[index]));
    for (const note of track.notes) {
      const finish = normalize(note.beat + note.length);
      note.beat = normalize(note.beat);
      note.length = finish - note.beat;
    }
  });
  return { id, title, bpm: 60_000_000 / initial, beats: normalize(end), tracks };
}
