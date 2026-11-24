import { decodeMidi } from './midi';

const clips = import.meta.glob<string>('./scores/*.mid', { eager: true, query: '?inline', import: 'default' });
export const midiClip = (id: string) => clips[`./scores/${id}.mid`];

export function bundledSong(id: string, title: string) {
  const url = midiClip(id);
  return decodeMidi(Uint8Array.from(atob(url.slice(url.indexOf(',') + 1)), char => char.charCodeAt(0)), id, title);
}
