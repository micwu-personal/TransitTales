const first=-35, last=27;
export const scalePosition = (meters:number) => (Math.log10(meters)-first)/(last-first);
export function nearestStop(percent:number, stops:readonly {meters:number}[]) {
  return stops.reduce((best,stop,i)=>Math.abs(scalePosition(stop.meters)-percent)<Math.abs(scalePosition(stops[best].meters)-percent)?i:best,0);
}
