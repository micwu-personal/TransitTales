export type PieceType = 'short' | 'long' | 'bridge' | 'elevator';
export interface Point { x: number; y: number }
export interface Piece { id: string; type: PieceType; a: Point; b: Point }
export interface Request { id: string; start: Point; goal: Point; destination: 'cafe' | 'books' | 'garden'; wheelchair?: boolean; balloon?: boolean }
export interface Zone { x: number; y: number; w: number; h: number }
export interface Puzzle { id: string; name: [string,string,string,string,string]; hint: [string,string,string,string,string]; landings: Point[]; inventory: Record<PieceType,number>; requests: Request[]; solution: Omit<Piece,'id'>[]; obstacles: Zone[]; lowCeilings: Zone[] }
export type RuleError = 'landing' | 'shape' | 'inventory' | 'overlap' | 'clearance';
export interface Board { pieces: Piece[]; history: Piece[][]; serial: number }
export const same = (a: Point,b: Point) => a.x === b.x && a.y === b.y;
export const key = (p: Point) => `${p.x},${p.y}`;
export function createBoard(): Board { return { pieces: [], history: [], serial: 0 }; }
function cross(a: Point,b: Point,c: Point) { return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x); }
function onSegment(a: Point,b: Point,p: Point) { return cross(a,b,p) === 0 && p.x >= Math.min(a.x,b.x) && p.x <= Math.max(a.x,b.x) && p.y >= Math.min(a.y,b.y) && p.y <= Math.max(a.y,b.y); }
function intersects(a: Point,b: Point,c: Point,d: Point) { return (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) || onSegment(a,b,c) || onSegment(a,b,d) || onSegment(c,d,a) || onSegment(c,d,b); }
function conflict(p: Omit<Piece,'id'>,q: Omit<Piece,'id'>) {
  if (!intersects(p.a,p.b,q.a,q.b)) return false;
  const shared = [p.a,p.b].filter(a => same(a,q.a) || same(a,q.b));
  if (shared.length !== 1) return true;
  const joint = shared[0], otherP = same(p.a,joint) ? p.b : p.a, otherQ = same(q.a,joint) ? q.b : q.a;
  return cross(joint,otherP,otherQ) === 0 && (otherP.x-joint.x)*(otherQ.x-joint.x)+(otherP.y-joint.y)*(otherQ.y-joint.y)>0;
}
export function touchesZone(p: Omit<Piece,'id'>,z: Zone): boolean {
  let enter=0,exit=1;
  for(const [start,delta,min,max] of [[p.a.x,p.b.x-p.a.x,z.x,z.x+z.w],[p.a.y,p.b.y-p.a.y,z.y,z.y+z.h]]) {
    if(delta===0) {if(start<=min||start>=max)return false;continue;}
    const a=(min-start)/delta,b=(max-start)/delta;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
  }
  return enter<exit && exit>0 && enter<1;
}
export function transformPiece(puzzle:Puzzle,board:Board,id:string,mode:'reverse'|'mirror'): {board:Board;error:RuleError|null} {
  const piece=board.pieces.find(p=>p.id===id);if(!piece)return {board,error:'landing'};
  if(mode==='mirror'&&piece.type!=='short'&&piece.type!=='long')return {board,error:'shape'};
  const replacement=mode==='mirror'?{...piece,b:{x:2*piece.a.x-piece.b.x,y:piece.b.y}}:{...piece,a:piece.b,b:piece.a};
  const error=validatePiece(puzzle,{...board,pieces:board.pieces.filter(p=>p.id!==id)},replacement);
  if(error)return {board,error};
  return {board:{...board,pieces:board.pieces.map(p=>p.id===id?replacement:p),history:[...board.history,board.pieces]},error:null};
}
export function validatePiece(puzzle: Puzzle,board: Board,p: Omit<Piece,'id'>): RuleError | null {
  if (![p.a,p.b].every(a => puzzle.landings.some(b => same(a,b)))) return 'landing';
  const dx=Math.abs(p.a.x-p.b.x),dy=Math.abs(p.a.y-p.b.y);
  if (!(p.type==='short' ? dx===1&&dy===1 : p.type==='long' ? dx===2&&dy===1 : p.type==='bridge' ? dx===1&&dy===0 : dx===0&&dy===1)) return 'shape';
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
      if(!same(current.point,p.a) || (request.wheelchair && (p.type==='short'||p.type==='long')) || (request.balloon&&puzzle.lowCeilings.some(z=>touchesZone(p,z)))) continue;
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
  for(const p of r.path) { const d=travelTime(p); if(t<d) return {x:p.a.x+(p.b.x-p.a.x)*t/d,y:p.a.y+(p.b.y-p.a.y)*t/d}; t-=d; } return r.request.goal;
}
export function result(puzzle: Puzzle,board: Board,wave: Wave) {
  const delivered=wave.riders.filter(r=>r.path!==null&&wave.elapsed>=r.arrival).length,total=wave.riders.length,success=wave.complete&&delivered===total;
  const stars=success ? (board.pieces.length<=puzzle.solution.length ? 3 : 2) : 0;
  const combos=wave.complete ? wave.riders.filter((r,i)=>r.path&&wave.riders.slice(0,i).some(q=>q.path&&Math.abs(q.arrival-r.arrival)<0.05&&q.request.destination!==r.request.destination)).length : 0;
  return {delivered,total,success,stars,combos,score:delivered*100+combos*25+(success?stars*100:0)};
}
export function verifiedSolution(puzzle: Puzzle): Board { let board=createBoard(); for(const piece of puzzle.solution) { const placed=placePiece(puzzle,board,piece); if(placed.error) throw new Error(`${puzzle.id}: ${placed.error}`); board=placed.board; } if(puzzle.requests.some(r=>!route(puzzle,board.pieces,r))) throw new Error(`${puzzle.id}: unreachable`); return board; }
