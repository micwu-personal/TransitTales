import { route, touchesZone, type Piece, type Puzzle, type Request } from './model';
export function accessWarnings(puzzle:Puzzle,pieces:readonly Piece[],request:Request):{wheelchair:boolean;balloon:boolean}{
 if(route(puzzle,pieces,request)!==null)return {wheelchair:false,balloon:false};
 const unrestricted=route(puzzle,pieces,{...request,wheelchair:false,balloon:false});
 return {
  wheelchair:!!request.wheelchair&&!!unrestricted?.some(p=>p.type==='short'||p.type==='long'),
  balloon:!!request.balloon&&!!unrestricted?.some(p=>puzzle.lowCeilings.some(z=>touchesZone(p,z))),
 };
}
export type RouteIssue = 'missingRoute' | 'steps' | 'headroom';
export function routeIssues(puzzle:Puzzle,pieces:readonly Piece[],request:Request):RouteIssue[]{
 if(route(puzzle,pieces,request)!==null)return [];
 const warnings=accessWarnings(puzzle,pieces,request);
 const issues:RouteIssue[]=[];
 if(warnings.wheelchair)issues.push('steps');
 if(warnings.balloon)issues.push('headroom');
 return issues.length?issues:['missingRoute'];
}
