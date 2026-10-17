export type PieceType = 'short' | 'long' | 'bridge' | 'elevator';
export interface Point { x: number; y: number; z?: number }
export interface Piece { id: string; type: PieceType; a: Point; b: Point }
export type RiderNeed = 'stroller' | 'courier' | 'acrophobia';
export interface Request { id: string; start: Point; goal: Point; destination: 'cafe' | 'books' | 'garden'; wheelchair?: boolean; balloon?: boolean; need?: RiderNeed }
// Without z/d a legacy zone extends through every depth. Bounded volumes default to z=0, d=1.
export interface Zone { x: number; y: number; w: number; h: number; z?: number; d?: number }
export interface Puzzle { id: string; building?: 'sky-atrium'; name: [string,string,string,string,string]; hint: [string,string,string,string,string]; landings: Point[]; inventory: Record<PieceType,number>; requests: Request[]; solution: Omit<Piece,'id'>[]; obstacles: Zone[]; lowCeilings: Zone[] }
export type RuleError = 'landing' | 'shape' | 'inventory' | 'overlap' | 'clearance';
export interface Board { pieces: Piece[]; history: Piece[][]; serial: number }
export const same = (a: Point,b: Point) => a.x === b.x && a.y === b.y && (a.z??0) === (b.z??0);
export const key = (p: Point) => (p.z??0) === 0 ? `${p.x},${p.y}` : `${p.x},${p.y},${p.z}`;
export function createBoard(): Board { return { pieces: [], history: [], serial: 0 }; }
type Vector = [number,number,number];
const difference = (a:Point,b:Point):Vector => [a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)];
const cross = (a:Vector,b:Vector):Vector => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a:Vector,b:Vector) => a.reduce((sum,n,i)=>sum+n*b[i],0);
function intersects(a: Point,b: Point,c: Point,d: Point) {
  const u=difference(b,a),v=difference(d,c),w=difference(c,a),normal=cross(u,v),length=dot(normal,normal);
  if(length===0) {
    if(dot(cross(w,u),cross(w,u))!==0)return false;
    const axis=u.findIndex(n=>n!==0);
    if(axis<0)return same(a,c)||same(a,d);
    const start=w[axis]/u[axis],end=(w[axis]+v[axis])/u[axis];
    return Math.max(0,Math.min(start,end))<=Math.min(1,Math.max(start,end));
  }
  if(dot(w,normal)!==0)return false;
  const t=dot(cross(w,v),normal)/length,s=dot(cross(w,u),normal)/length;
  return t>=0&&t<=1&&s>=0&&s<=1;
}
function conflict(p: Omit<Piece,'id'>,q: Omit<Piece,'id'>) {
  if (!intersects(p.a,p.b,q.a,q.b)) return false;
  const shared = [p.a,p.b].filter(a => same(a,q.a) || same(a,q.b));
  if (shared.length !== 1) return true;
  const joint = shared[0],u=difference(same(p.a,joint)?p.b:p.a,joint),v=difference(same(q.a,joint)?q.b:q.a,joint);
  return dot(cross(u,v),cross(u,v))===0&&dot(u,v)>0;
}
export function touchesZone(p: Omit<Piece,'id'>,z: Zone): boolean {
  let enter=0,exit=1;
  const axes=[[p.a.x,p.b.x-p.a.x,z.x,z.x+z.w],[p.a.y,p.b.y-p.a.y,z.y,z.y+z.h]];
  if(z.z!==undefined||z.d!==undefined)axes.push([p.a.z??0,(p.b.z??0)-(p.a.z??0),z.z??0,(z.z??0)+(z.d??1)]);
  for(const [start,delta,min,max] of axes) {
    if(delta===0) {if(start<=min||start>=max)return false;continue;}
    const a=(min-start)/delta,b=(max-start)/delta;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
  }
  return enter<exit && exit>0 && enter<1;
}
export function transformPiece(puzzle:Puzzle,board:Board,id:string,mode:'reverse'|'mirror'): {board:Board;error:RuleError|null} {
  const piece=board.pieces.find(p=>p.id===id);if(!piece)return {board,error:'landing'};
  if(mode==='mirror'&&piece.type!=='short'&&piece.type!=='long')return {board,error:'shape'};
  const mirrored=piece.a.x!==piece.b.x?{...piece.b,x:2*piece.a.x-piece.b.x}:{...piece.b,z:2*(piece.a.z??0)-(piece.b.z??0)};
  const replacement=mode==='mirror'?{...piece,b:mirrored}:{...piece,a:piece.b,b:piece.a};
  const error=validatePiece(puzzle,{...board,pieces:board.pieces.filter(p=>p.id!==id)},replacement);
  if(error)return {board,error};
  return {board:{...board,pieces:board.pieces.map(p=>p.id===id?replacement:p),history:[...board.history,board.pieces]},error:null};
}
export function validatePiece(puzzle: Puzzle,board: Board,p: Omit<Piece,'id'>): RuleError | null {
  if (![p.a,p.b].every(a => puzzle.landings.some(b => same(a,b)))) return 'landing';
  const dx=Math.abs(p.a.x-p.b.x),dy=Math.abs(p.a.y-p.b.y),dz=Math.abs((p.a.z??0)-(p.b.z??0));
  const span=dx+dz,axisAligned=dx===0||dz===0;
  if (!axisAligned || !(p.type==='short' ? span===1&&dy===1 : p.type==='long' ? span===2&&dy===1 : p.type==='bridge' ? span===1&&dy===0 : span===0&&dy===1)) return 'shape';
  if (board.pieces.filter(q=>q.type===p.type).length>=puzzle.inventory[p.type]) return 'inventory';
  if (board.pieces.some(q=>conflict(p,q))) return 'overlap';
  if (puzzle.obstacles.some(z=>touchesZone(p,z))) return 'clearance';
  return null;
}
export function placePiece(puzzle: Puzzle,board: Board,p: Omit<Piece,'id'>): { board: Board; error: RuleError | null } {
  const error=validatePiece(puzzle,board,p); if(error) return {board,error};
  const piece: Piece = {...p,a:{...p.a},b:{...p.b},id:`p${board.serial+1}`};
  return {board:{pieces:[...board.pieces,piece],history:[...board.history,board.pieces],serial:board.serial+1},error:null};
}
export function deletePiece(board: Board,id: string): Board { if(!board.pieces.some(p=>p.id===id)) return board; return {...board,pieces:board.pieces.filter(p=>p.id!==id),history:[...board.history,board.pieces]}; }
export function undo(board: Board): Board { if(!board.history.length) return board; return {...board,pieces:board.history[board.history.length-1],history:board.history.slice(0,-1)}; }
export function route(puzzle: Puzzle,pieces: readonly Piece[],request: Request): Piece[] | null {
  const queue: {point: Point; path: Piece[]}[]=[{point:request.start,path:[]}], visited=new Set<string>([key(request.start)]);
  while(queue.length) { const current=queue.shift()!; if(same(current.point,request.goal)) return current.path;
    for(const p of [...pieces].sort((a,b)=>a.id.localeCompare(b.id))) {
      if(!same(current.point,p.a) || ((request.wheelchair||request.need==='stroller') && (p.type==='short'||p.type==='long')) || (request.need==='courier'&&p.type==='elevator') || (request.need==='acrophobia'&&Math.max(p.a.y,p.b.y)>=3) || (request.balloon&&puzzle.lowCeilings.some(z=>touchesZone(p,z)))) continue;
      if(!visited.has(key(p.b))) {visited.add(key(p.b));queue.push({point:p.b,path:[...current.path,p]});}
    }
  } return null;
}
export interface Rider { id: string; request: Request; path: Piece[] | null; departure: number; arrival: number }
export interface Wave { riders: Rider[]; elapsed: number; duration: number; complete: boolean }
export const travelTime = (p: Piece) => p.type==='long' ? 2.8 : p.type==='elevator' ? 2.4 : p.type==='bridge' ? 1.3 : 2;
export function startWave(puzzle: Puzzle,board: Board): Wave {
  const riders: Rider[]=[];
  for(let n=0;n<3;n++) for(const request of puzzle.requests) { const path=route(puzzle,board.pieces,request),departure=n*1.1;
    riders.push({id:`${request.id}-${n}`,request,path,departure,arrival:path ? departure+path.reduce((s,p)=>s+travelTime(p),0) : departure+2});
  }
  return {riders,elapsed:0,duration:Math.max(0,...riders.map(r=>r.arrival))+0.6,complete:false};
}
export function advanceWave(wave: Wave,seconds: number): Wave { const elapsed=Math.min(wave.duration,wave.elapsed+Math.max(0,seconds)); return {...wave,elapsed,complete:elapsed>=wave.duration}; }
export function riderPosition(r: Rider,time: number): Point { if(!r.path || time<r.departure) return r.request.start; let t=time-r.departure;
  for(const p of r.path) { const d=travelTime(p); if(t<d) return {x:p.a.x+(p.b.x-p.a.x)*t/d,y:p.a.y+(p.b.y-p.a.y)*t/d,...(p.a.z!==undefined||p.b.z!==undefined?{z:(p.a.z??0)+((p.b.z??0)-(p.a.z??0))*t/d}:{})}; t-=d; } return r.request.goal;
}
export function result(puzzle: Puzzle,board: Board,wave: Wave) {
  const delivered=wave.riders.filter(r=>r.path!==null&&wave.elapsed>=r.arrival).length,total=wave.riders.length,success=wave.complete&&delivered===total;
  const stars=success ? (board.pieces.length<=puzzle.solution.length ? 3 : 2) : 0;
  const combos=wave.complete ? wave.riders.filter((r,i)=>r.path&&wave.riders.slice(0,i).some(q=>q.path&&Math.abs(q.arrival-r.arrival)<0.05&&q.request.destination!==r.request.destination)).length : 0;
  return {delivered,total,success,stars,combos,score:delivered*100+combos*25+(success?stars*100:0)};
}
export function verifiedSolution(puzzle: Puzzle): Board { let board=createBoard(); for(const piece of puzzle.solution) { const placed=placePiece(puzzle,board,piece); if(placed.error) throw new Error(`${puzzle.id}: ${placed.error}`); board=placed.board; } if(puzzle.requests.some(r=>!route(puzzle,board.pieces,r))) throw new Error(`${puzzle.id}: unreachable`); return board; }
