import { type Board, type Point, type Puzzle, type Wave, riderPosition, route } from './model';
import { type Language } from './locale';
import { routeIssues, type RouteIssue } from './access';
export interface MallSnapshot { puzzle: Puzzle; pieces: Board['pieces']; language: Language; first: Point|null; selected: string|null; building: boolean; running: boolean; reducedMotion: boolean; celebrating: boolean; waveElapsed:number; routes: { id:string; points:Point[]; destination: 'cafe'|'books'|'garden'; ready:boolean; issues:RouteIssue[] }[]; riders: { id:string; requestId:string; start:Point; goal:Point; point:Point; destination:'cafe'|'books'|'garden'; wheelchair:boolean; balloon:boolean; need?:Puzzle['requests'][number]['need']; arrived:boolean; stuck:boolean; issues:RouteIssue[] }[] }
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
export function snapshot(puzzle:Puzzle,board:Board,wave:Wave|null,language:Language,first:Point|null,selected:string|null,building:boolean,running:boolean,reducedMotion:boolean,celebrating=false):MallSnapshot {
  const issues=new Map(puzzle.requests.map(r=>[r.id,routeIssues(puzzle,board.pieces,r)]));
  const identity=(r:Puzzle['requests'][number])=>({requestId:r.id,start:r.start,goal:r.goal,destination:r.destination,wheelchair:!!r.wheelchair,balloon:!!r.balloon,need:r.need});
  return frozenCopy({puzzle,pieces:board.pieces.map(p=>({...p,a:{...p.a},b:{...p.b}})),language,first,  selected,building,running,reducedMotion,celebrating,waveElapsed:wave?.elapsed??0,
    routes:puzzle.requests.map(r=>{const path=route(puzzle,board.pieces,r);return {id:r.id,points:path?[r.start,...path.map(p=>p.b)]:[r.start],destination:r.destination,ready:path!==null,issues:issues.get(r.id)!};}),
    riders:wave?wave.riders.filter(r=>wave.elapsed>=r.departure).map(r=>({...identity(r.request),id:r.id,point:riderPosition(r,wave.elapsed),arrived:r.path!==null&&wave.elapsed>=r.arrival,stuck:r.path===null,issues:r.path===null?issues.get(r.request.id)??['missingRoute']:[]})):puzzle.requests.map(r=>({...identity(r),id:r.id,point:r.start,arrived:false,stuck:false,issues:[]})),
  });
}
