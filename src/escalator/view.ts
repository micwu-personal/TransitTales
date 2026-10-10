import { type Board, type Point, type Puzzle, type Wave, riderPosition, route } from './model';
import { type Language } from './locale';
export interface MallSnapshot { puzzle: Puzzle; pieces: Board['pieces']; language: Language; first: Point|null; selected: string|null; building: boolean; running: boolean; reducedMotion: boolean; routes: { id:string; points:Point[]; destination: 'cafe'|'books'|'garden'; ready:boolean }[]; riders: { id:string; point:Point; destination:'cafe'|'books'|'garden'; wheelchair:boolean; balloon:boolean; arrived:boolean; stuck:boolean }[] }
function frozenCopy<T>(value:T):T {
  const detached=structuredClone(value);
  function freeze(node:unknown):void {
    if(node&&typeof node==='object') {
      Object.values(node).forEach(freeze);
      Object.freeze(node);
    }
  }
  freeze(detached);
  return detached;
}
export function snapshot(puzzle:Puzzle,board:Board,wave:Wave|null,language:Language,first:Point|null,selected:string|null,building:boolean,running:boolean,reducedMotion:boolean):MallSnapshot {
  return frozenCopy({puzzle,pieces:board.pieces.map(p=>({...p,a:{...p.a},b:{...p.b}})),language,first,selected,building,running,reducedMotion,
    routes:puzzle.requests.map(r=>{const path=route(puzzle,board.pieces,r);return {id:r.id,points:path?[r.start,...path.map(p=>p.b)]:[r.start],destination:r.destination,ready:path!==null};}),
    riders:wave?wave.riders.filter(r=>wave.elapsed>=r.departure).map(r=>({id:r.id,point:riderPosition(r,wave.elapsed),destination:r.request.destination,wheelchair:!!r.request.wheelchair,balloon:!!r.request.balloon,arrived:!!r.path&&wave.elapsed>=r.arrival,stuck:!r.path})):[],
  });
}
