import type { Text } from './model';
const cues = new WeakMap<Text, string[]>();
export function withSpeech<T extends Text>(value:T,...ids:string[]):T { cues.set(value,ids); return value; }
export function speechFor(value:Text):string[]|undefined { return cues.get(value); }
