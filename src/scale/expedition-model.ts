import type { Text } from './stops';

export type Point = readonly [x: number, y: number, z: number];
export type Shape =
  | { kind:'orb'; at:Point; r:number; color:string; light?:string; alpha?:number; flat?:boolean }
  | { kind:'line'; points:readonly Point[]; color:string; width?:number; alpha?:number; closed?:boolean }
  | { kind:'face'; points:readonly Point[]; color:string; alpha?:number };

export interface Mission {
  title:Text;
  guide:Text;
  handle:Text;
  accent:string;
  initial:number;
  /** Upper bound in seconds for the time-evolving part after a release. */
  duration?:number;
  frame(value:number, elapsed:number, baseline:number|null): { shapes:readonly Shape[]; grip:Point };
  result(value:number, elapsed:number):Text;
}
