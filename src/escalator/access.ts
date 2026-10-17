import { route, touchesZone, type Piece, type Puzzle, type Request } from './model';
export function accessWarnings(puzzle:Puzzle,pieces:readonly Piece[],request:Request):{wheelchair:boolean;balloon:boolean}{
 if(route(puzzle,pieces,request)!==null)return {wheelchair:false,balloon:false};
 const unrestricted=route(puzzle,pieces,{...request,wheelchair:false,balloon:false,need:undefined});
 return {
  wheelchair:!!request.wheelchair&&!!unrestricted?.some(p=>p.type==='short'||p.type==='long'),
  balloon:!!request.balloon&&!!unrestricted?.some(p=>puzzle.lowCeilings.some(z=>touchesZone(p,z))),
 };
}
export type RouteIssue = 'missingRoute' | 'steps' | 'headroom' | 'needs';
export function routeIssues(puzzle:Puzzle,pieces:readonly Piece[],request:Request):RouteIssue[]{
 if(route(puzzle,pieces,request)!==null)return [];
 const warnings=accessWarnings(puzzle,pieces,request);
 const issues:RouteIssue[]=[];
 if(warnings.wheelchair)issues.push('steps');
 if(warnings.balloon)issues.push('headroom');
 if(request.need) {
  const unrestricted=route(puzzle,pieces,{...request,wheelchair:false,balloon:false,need:undefined});
  if(unrestricted?.some(p=>request.need==='stroller'?(p.type==='short'||p.type==='long'):request.need==='courier'?p.type==='elevator':Math.max(p.a.y,p.b.y)>=3))issues.push('needs');
 }
 return issues.length?issues:['missingRoute'];
}
