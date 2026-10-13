import { describe, expect, it } from 'vitest';
import { advanceWave, createBoard, deletePiece, placePiece, result, route, startWave, undo, transformPiece, touchesZone, validatePiece, verifiedSolution, type Piece, type Puzzle } from '../src/escalator/model';
import { PUZZLES } from '../src/escalator/puzzles';
import { snapshot } from '../src/escalator/view';
import { LANGUAGE_KEY, preferredLanguage } from '../src/escalator/locale';
import { readScores, saveScore } from '../src/escalator/storage';
const piece=(type:Piece['type'],x:number,y:number,bx:number,by:number):Omit<Piece,'id'>=>({type,a:{x,y},b:{x:bx,y:by}});
const flexible: Puzzle={...PUZZLES[0],inventory:{short:10,long:10,bridge:10,elevator:10}};
describe('Escalator Orchestra handcrafted solutions',()=>{
 it.each(PUZZLES.map(p=>[p.id,p] as const))('%s has a legal complete solution',(_id,p)=>{const board=verifiedSolution(p);for(const r of p.requests)expect(route(p,board.pieces,r)).not.toBeNull();const wave=startWave(p,board),end=advanceWave(wave,100);expect(result(p,board,end)).toMatchObject({success:true,stars:3,delivered:p.requests.length*3});expect(result(p,board,wave).success).toBe(false);});
 it.each(PUZZLES.map(p=>[p.id,p] as const))('%s never falsely succeeds on an empty board',(_id,p)=>{const board=createBoard(),wave=advanceWave(startWave(p,board),100);expect(result(p,board,wave)).toMatchObject({success:false,delivered:0,stars:0});});
});
describe('directed piece graph rules',()=>{
 it('requires marked landings and correct dimensions',()=>{expect(validatePiece(flexible,createBoard(),piece('short',0,0,9,9))).toBe('landing');expect(validatePiece(flexible,createBoard(),piece('short',0,0,2,1))).toBe('shape');expect(validatePiece(flexible,createBoard(),piece('bridge',0,0,1,1))).toBe('shape');expect(validatePiece(flexible,createBoard(),piece('elevator',0,0,0,2))).toBe('shape');});
 it('limits inventory without mutating the board',()=>{let board=createBoard();board=placePiece(PUZZLES[0],board,piece('short',0,0,1,1)).board;board=placePiece(PUZZLES[0],board,piece('short',1,1,2,2)).board;const bad=placePiece(PUZZLES[0],board,piece('short',2,2,3,3));expect(bad.error).toBe('inventory');expect(bad.board).toBe(board);});
 it('allows end-to-end joints, rejects crossing, duplicate and partial overlaps',()=>{const board=placePiece(flexible,createBoard(),piece('long',0,0,2,1)).board;expect(validatePiece(flexible,board,piece('short',2,1,3,2))).toBeNull();expect(validatePiece(flexible,board,piece('long',0,1,2,0))).toBe('overlap');expect(validatePiece(flexible,board,piece('long',2,1,0,0))).toBe('overlap');const bridgeBoard=placePiece(flexible,createBoard(),piece('bridge',0,0,1,0)).board;expect(validatePiece(flexible,bridgeBoard,piece('bridge',1,0,2,0))).toBeNull();expect(validatePiece(flexible,bridgeBoard,piece('bridge',1,0,0,0))).toBe('overlap');});
 it('checks solid architecture clearance',()=>{const p={...flexible,obstacles:[{x:.3,y:.1,w:.4,h:.7}]};expect(validatePiece(p,createBoard(),piece('short',0,0,1,1))).toBe('clearance');});
 it('routes only in arrow direction and not through merely nearby endpoints',()=>{const board=placePiece(flexible,createBoard(),piece('short',0,0,1,1)).board;const request={...flexible.requests[0],goal:{x:1,y:1}};expect(route(flexible,board.pieces,request)?.length).toBe(1);expect(route(flexible,board.pieces,{...request,start:request.goal,goal:request.start})).toBeNull();expect(route(flexible,board.pieces,{...request,goal:{x:2,y:1}})).toBeNull();});
 it('wheelchairs never use short or long escalators',()=>{for(const type of ['short','long'] as const){const bx=type==='long'?2:1;const board=placePiece(flexible,createBoard(),piece(type,0,0,bx,1)).board;const request={...flexible.requests[0],goal:{x:bx,y:1},wheelchair:true};expect(route(flexible,board.pieces,request)).toBeNull();}const p=PUZZLES[4],board=verifiedSolution(p),r=p.requests.find(r=>r.wheelchair)!;expect(route(p,board.pieces,r)?.every(p=>p.type==='bridge'||p.type==='elevator')).toBe(true);});
 it('balloon riders avoid low canopies without blocking ordinary shoppers',()=>{const p={...flexible,lowCeilings:[{x:.3,y:.1,w:.4,h:.7}]},board=placePiece(p,createBoard(),piece('short',0,0,1,1)).board,r={...p.requests[0],goal:{x:1,y:1}};expect(route(p,board.pieces,r)).not.toBeNull();expect(route(p,board.pieces,{...r,balloon:true})).toBeNull();});
 it('undo restores placement and deletion precisely',()=>{const empty=createBoard(),one=placePiece(flexible,empty,piece('short',0,0,1,1)).board,two=placePiece(flexible,one,piece('short',1,1,2,2)).board;expect(undo(two).pieces).toEqual(one.pieces);const deleted=deletePiece(two,two.pieces[0].id);expect(undo(deleted).pieces).toEqual(two.pieces);expect(undo(one).pieces).toEqual([]);expect(undo(empty)).toBe(empty);});
 it('reverses and mirrors travel meaningfully, with undo and validation',()=>{const b=placePiece(flexible,createBoard(),piece('short',2,1,3,2)).board;const id=b.pieces[0].id;const reversed=transformPiece(flexible,b,id,'reverse');expect(reversed.error).toBeNull();expect(reversed.board.pieces[0].a).toEqual({x:3,y:2});expect(undo(reversed.board).pieces).toEqual(b.pieces);const mirrored=transformPiece(flexible,b,id,'mirror');expect(mirrored.error).toBeNull();expect(mirrored.board.pieces[0].b).toEqual({x:1,y:2});const edge=placePiece(flexible,createBoard(),piece('short',0,0,1,1)).board;expect(transformPiece(flexible,edge,edge.pieces[0].id,'mirror').error).toBe('landing');});
 it('detects even tiny clearance intrusions and allows boundary contact',()=>{const p=piece('long',0,0,2,1);expect(touchesZone(p,{x:.101,y:.05,w:.001,h:.01})).toBe(true);expect(touchesZone(piece('bridge',0,0,1,0),{x:0,y:0,w:1,h:1})).toBe(false);});
 it.each(PUZZLES.map(p=>[p.id,p] as const))('%s preserves scoring at low-frame-rate quarter-second updates',(_id,p)=>{const b=verifiedSolution(p);let wave=startWave(p,b);for(let n=0;n<400;n++)wave=advanceWave(wave,.25);expect(wave).toEqual(advanceWave(startWave(p,b),100));expect(result(p,b,wave)).toMatchObject({success:true,stars:3});});
 it('produces identical deterministic waves and results for different time slices',()=>{const p=PUZZLES[7],b=verifiedSolution(p),a=startWave(p,b);expect(startWave(p,b)).toEqual(a);let sliced=a;for(let n=0;n<200;n++)sliced=advanceWave(sliced,.2);const direct=advanceWave(a,40);expect(sliced).toEqual(direct);expect(result(p,b,sliced)).toEqual(result(p,b,direct));expect(advanceWave(a,-3)).toEqual(a);});
});
describe('renderer snapshot boundary',()=>{
 it('shows waiting shoppers and both access requirements before a wave without mutating simulation',()=>{
  const p=structuredClone(PUZZLES[0]);p.requests[0].wheelchair=true;p.requests[0].balloon=true;
  const view=snapshot(p,createBoard(),null,'en',null,null,true,false,false);
  expect(view.riders).toHaveLength(p.requests.length);expect(view.riders[0]).toMatchObject({point:p.requests[0].start,wheelchair:true,balloon:true,stuck:false,arrived:false});
  expect(view.riders[0].point).not.toBe(p.requests[0].start);expect(Object.isFrozen(view.riders[0])).toBe(true);
 });
 it('detaches and deeply freezes puzzle, pieces, preview paths and selection',()=>{
  const p=structuredClone(PUZZLES[0]),board=verifiedSolution(p),first={x:0,y:0};
  const view=snapshot(p,board,startWave(p,board),'en',first,null,false,true,false);
  expect(view.puzzle).not.toBe(p);expect(view.pieces[0].a).not.toBe(board.pieces[0].a);
  expect(view.routes[0].points[0]).not.toBe(p.requests[0].start);
  expect(Object.isFrozen(view)).toBe(true);expect(Object.isFrozen(view.puzzle.requests[0].start)).toBe(true);
  expect(Object.isFrozen(view.pieces[0].b)).toBe(true);expect(Object.isFrozen(view.routes[0].points)).toBe(true);
  expect(()=>{view.puzzle.requests[0].goal.x=6;}).toThrow();
  first.x=4;p.requests[0].start.x=5;board.pieces[0].a.x=3;
  expect(view.first?.x).toBe(0);expect(view.puzzle.requests[0].start.x).toBe(0);expect(view.pieces[0].a.x).toBe(0);
 });
});
describe('safe bilingual persistence',()=>{
 it('uses shared language key and handles storage denial',()=>{expect(preferredLanguage({getItem:key=>key===LANGUAGE_KEY?'zh-CN':null},['en'])).toBe('zh-CN');expect(preferredLanguage({getItem:()=>{throw Error();}},['zh-CN'])).toBe('zh-CN');expect(preferredLanguage(undefined,['fr','en'])).toBe('en');});
 it('validates scores and safely retains bests',()=>{const scores={};expect(saveScore({setItem:()=>{throw Error();}},scores,'first',{score:1200,stars:3})).toBe(false);saveScore(undefined,scores,'first',{score:20,stars:1});expect(scores).toEqual({first:{score:1200,stars:3}});expect(readScores({getItem:()=>'{bad'})).toEqual({});expect(readScores({getItem:()=>JSON.stringify({a:{score:200,stars:2},b:{score:-1,stars:7}})})).toEqual({a:{score:200,stars:2}});});
});
