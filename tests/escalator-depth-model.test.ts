import { describe, expect, it } from 'vitest';
import {
  advanceWave, createBoard, key, placePiece, result, riderPosition, route, same, startWave,
  touchesZone, transformPiece, undo, validatePiece, verifiedSolution,
  type Piece, type Point, type Puzzle, type RiderNeed,
} from '../src/escalator/model';
import { PUZZLES } from '../src/escalator/puzzles';
import { SKY_LANDINGS } from '../src/escalator/sky-puzzles';
import { routeIssues } from '../src/escalator/access';
import { snapshot } from '../src/escalator/view';

const at=(x:number,y:number,z=0):Point=>({x,y,z});
const piece=(type:Piece['type'],a:Point,b:Point):Omit<Piece,'id'>=>({type,a,b});
const landings:Point[]=[];
for(let x=0;x<=6;x++)for(let y=0;y<=4;y++)for(let z=0;z<=2;z++)landings.push(at(x,y,z));
const flexible:Puzzle={...PUZZLES[20],landings,inventory:{short:30,long:30,bridge:30,elevator:30}};
const build=(p:Puzzle,solution:Puzzle['solution'])=>{
  let board=createBoard();
  for(const q of solution){const placed=placePiece(p,board,q);expect(placed.error,`${p.id}: ${key(q.a)} → ${key(q.b)}`).toBeNull();board=placed.board;}
  return board;
};
const sky=PUZZLES.slice(20);

describe('three-dimensional graph geometry',()=>{
  it('defaults omitted depth to zero without changing legacy points or keys',()=>{
    expect(same({x:1,y:2},at(1,2))).toBe(true);
    expect(key({x:1,y:2})).toBe(key(at(1,2)));
    expect(same(at(1,2),at(1,2,1))).toBe(false);
    expect(key(at(1,2,1))).not.toBe(key(at(1,2,2)));
    const legacy=verifiedSolution(PUZZLES[0]);
    expect(legacy.pieces.every(q=>q.a.z===undefined&&q.b.z===undefined)).toBe(true);
  });
  it('accepts bridges and both escalators on either horizontal axis, and only vertical lifts',()=>{
    for(const z of [0,1,2])expect(validatePiece(flexible,createBoard(),piece('short',at(0,0,z),at(1,1,z)))).toBeNull();
    for(const q of [piece('bridge',at(0,0),at(0,0,1)),piece('short',at(0,0),at(0,1,1)),piece('long',at(0,0),at(0,1,2)),piece('elevator',at(0,0,2),at(0,1,2))])expect(validatePiece(flexible,createBoard(),q)).toBeNull();
    for(const q of [piece('bridge',at(0,0),at(1,0,1)),piece('short',at(0,0),at(1,1,1)),piece('long',at(0,0),at(1,1,1)),piece('elevator',at(0,0),at(0,1,1)),piece('bridge',at(0,0),at(0,0,2))])expect(validatePiece(flexible,createBoard(),q)).toBe('shape');
  });
  it('permits projected crossings in separate layers but rejects actual 3D intersections',()=>{
    const front=build(flexible,[piece('long',at(0,0),at(2,1))]);
    expect(validatePiece(flexible,front,piece('long',at(0,1,2),at(2,0,2)))).toBeNull();
    const middle=build(flexible,[piece('long',at(0,0,1),at(2,1,1))]);
    expect(validatePiece(flexible,middle,piece('long',at(1,0),at(1,1,2)))).toBe('overlap');
    expect(validatePiece(flexible,middle,piece('long',at(1,1),at(1,2,2)))).toBeNull();
    // A crossing in x/z at different heights is a skew pair, not a joint.
    expect(validatePiece(flexible,middle,piece('bridge',at(1,2),at(1,2,1)))).toBeNull();
  });
  it('allows real endpoint joins on all three axes, not nearby projected joins',()=>{
    const board=build(flexible,[piece('bridge',at(1,1),at(1,1,1))]);
    for(const q of [piece('bridge',at(1,1,1),at(1,1,2)),piece('bridge',at(1,1,1),at(2,1,1)),piece('elevator',at(1,1,1),at(1,2,1)),piece('short',at(1,1,1),at(2,2,1))])expect(validatePiece(flexible,board,q)).toBeNull();
    expect(validatePiece(flexible,board,piece('bridge',at(1,1,1),at(1,1)))).toBe('overlap');
    const request={...flexible.requests[0],start:at(1,1),goal:at(2,1,2)};
    const disconnected=build(flexible,[...board.pieces,piece('bridge',at(1,1,2),at(2,1,2))]);
    expect(route(flexible,disconnected.pieces,request)).toBeNull();
  });
  it('rejects reversed duplicates, partial collinear overlaps and interior T joints in depth',()=>{
    const extras=[at(1,.5,1),at(1,1.5,3),at(2,.5,1)];
    const p={...flexible,landings:[...landings,...extras]};
    const board=build(p,[piece('long',at(1,0),at(1,1,2))]);
    expect(validatePiece(p,board,piece('long',at(1,1,2),at(1,0)))).toBe('overlap');
    expect(validatePiece(p,board,piece('long',at(1,.5,1),at(1,1.5,3)))).toBe('overlap');
    expect(validatePiece(p,board,piece('bridge',at(2,.5,1),at(1,.5,1)))).toBe('overlap');
  });
  it('mirrors the active axis, preserves the other coordinates and restores exact depth with undo',()=>{
    const board=build(flexible,[piece('short',at(2,1,1),at(2,2,2))]),id=board.pieces[0].id;
    const mirrored=transformPiece(flexible,board,id,'mirror');
    expect(mirrored.error).toBeNull();expect(mirrored.board.pieces[0].b).toEqual(at(2,2,0));
    expect(undo(mirrored.board).pieces).toEqual(board.pieces);
    const reversed=transformPiece(flexible,board,id,'reverse');
    expect(reversed.error).toBeNull();expect(reversed.board.pieces[0].a).toEqual(at(2,2,2));
    expect(reversed.board.pieces[0].b).toEqual(at(2,1,1));
    const horizontal=build(flexible,[piece('short',at(2,1,2),at(3,2,2))]);
    expect(transformPiece(flexible,horizontal,horizontal.pieces[0].id,'mirror').board.pieces[0].b).toEqual(at(1,2,2));
    const edge=build(flexible,[piece('short',at(0,0),at(0,1,1))]);
    expect(transformPiece(flexible,edge,edge.pieces[0].id,'mirror').error).toBe('landing');
  });
  it('interpolates depth and leaves legacy interpolated points two-dimensional',()=>{
    const p=PUZZLES[20],board=verifiedSolution(p),wave=startWave(p,board),rider=wave.riders[0];
    expect(riderPosition(rider,.65)).toEqual(at(0,0,.5));
    expect(riderPosition(rider,1.95).z).toBeCloseTo(1.5);
    expect(riderPosition(rider,100)).toEqual(rider.request.goal);
    expect(riderPosition(rider,-1)).toEqual(rider.request.start);
    const legacy=startWave(PUZZLES[0],verifiedSolution(PUZZLES[0])).riders[0];
    expect(riderPosition(legacy,1)).toEqual({x:.5,y:.5});
  });
});

describe('open depth-bounded clearance volumes',()=>{
  it('clips the segment against every dimension, not its projected rectangle',()=>{
    const zone={x:.8,y:.2,z:.8,w:.4,h:.6,d:.4};
    expect(touchesZone(piece('long',at(1,0),at(1,1,2)),zone)).toBe(true);
    expect(touchesZone(piece('long',at(0,0),at(2,1)),zone)).toBe(false);
    expect(touchesZone(piece('long',at(0,0,2),at(2,1,2)),zone)).toBe(false);
    const mismatched={x:.8,y:.2,z:1.8,w:.4,h:.1,d:.1};
    expect(touchesZone(piece('long',at(1,0),at(1,1,2)),mismatched)).toBe(false);
    expect(touchesZone(piece('bridge',at(0,1,1),at(1,1,1)),{x:.4,y:.9,z:1,w:.2,h:.2,d:1})).toBe(false);
    expect(touchesZone(piece('long',at(1,0),at(1,1,2)),{x:.99,y:.499,z:.999,w:.02,h:.002,d:.002})).toBe(true);
  });
  it('preserves unbounded legacy zones and defaults partially specified depth bounds',()=>{
    const legacy={x:.3,y:.1,w:.4,h:.7};
    for(const z of [0,1,2])expect(touchesZone(piece('short',at(0,0,z),at(1,1,z)),legacy)).toBe(true);
    expect(touchesZone(piece('short',at(0,0,.5),at(1,1,.5)),{...legacy,z:0})).toBe(true);
    expect(touchesZone(piece('short',at(0,0,1.5),at(1,1,1.5)),{...legacy,d:1})).toBe(false);
  });
  it('blocks architecture only inside its bay and balloons only under their own canopy',()=>{
    const zone={x:.3,y:.1,z:-.2,w:.4,h:.7,d:.4},q=piece('short',at(0,0),at(1,1));
    const p={...flexible,obstacles:[zone]};
    expect(validatePiece(p,createBoard(),q)).toBe('clearance');
    expect(validatePiece(p,createBoard(),piece('short',at(0,0,2),at(1,1,2)))).toBeNull();
    const canopy={...flexible,lowCeilings:[zone]},board=build(canopy,[q,piece('short',at(0,0,2),at(1,1,2))]);
    const request={...p.requests[0],start:at(0,0),goal:at(1,1),balloon:true};
    expect(route(canopy,board.pieces,request)).toBeNull();
    expect(route(canopy,board.pieces,{...request,start:at(0,0,2),goal:at(1,1,2)})).not.toBeNull();
  });
});

describe('forty authored rounds and stepped sky-atrium group',()=>{
  it('appends twenty unique rounds without replacing any legacy layouts',()=>{
    expect(PUZZLES).toHaveLength(40);expect(sky).toHaveLength(20);
    expect(PUZZLES.slice(0,20).every(p=>p.building===undefined&&p.landings.every(point=>point.z===undefined))).toBe(true);
    expect(sky.every(p=>p.building==='sky-atrium')).toBe(true);
    expect(new Set(PUZZLES.map(p=>p.id)).size).toBe(40);
    for(let index=0;index<5;index++)expect(new Set(sky.map(p=>p.name[index])).size).toBe(20);
    expect(new Set(sky.map(p=>JSON.stringify(p.solution))).size).toBe(20);
    expect(sky[0].solution.every(q=>q.type==='bridge'&&q.a.x===q.b.x&&q.a.y===q.b.y)).toBe(true);
    expect(sky[0].hint[0]).toContain('(0,0,0) → (0,0,1) → (0,0,2)');
    expect(sky.at(-1)!.solution.length).toBeGreaterThan(sky[0].solution.length*8);
  });
  it('uses a real three-depth stepped U-shaped silhouette with floor-four roofs',()=>{
    expect(new Set(SKY_LANDINGS.map(p=>p.z))).toEqual(new Set([0,1,2]));
    expect(SKY_LANDINGS.some(p=>p.z===1&&p.x===3)).toBe(false);
    expect(SKY_LANDINGS.some(p=>same(p,at(3,3,0)))).toBe(false);
    expect(SKY_LANDINGS.some(p=>same(p,at(3,4,2)))).toBe(true);
    expect(SKY_LANDINGS.some(p=>same(p,at(0,4,0)))).toBe(true);
    for(const point of SKY_LANDINGS){expect(point.x).toBeGreaterThanOrEqual(0);expect(point.x).toBeLessThanOrEqual(6);expect(point.y).toBeLessThanOrEqual(4);expect(point.z).toBeLessThanOrEqual(2);}
    expect(sky.some(p=>p.solution.some(q=>q.a.z!==q.b.z&&q.a.y!==q.b.y))).toBe(true);
    expect(sky.some(p=>p.requests.some(r=>r.start.y>r.goal.y))).toBe(true);
    expect(sky.some(p=>p.obstacles.length>1)).toBe(true);
  });
  it.each(sky.map(p=>[p.id,p] as const))('%s has useful localized copy, exact legal geometry and a complete solution',(_id,p)=>{
    const scripts=[/[A-Za-z]/,/[\u4e00-\u9fff]/,/[\u3040-\u30ff]/,/[\u0400-\u04ff]/,/[\u1820-\u18aa]/];
    for(let index=0;index<5;index++){expect(p.name[index]).toMatch(scripts[index]);expect(p.hint[index]).toMatch(scripts[index]);expect(p.hint[index].length).toBeGreaterThan(30);expect(p.hint[index]).not.toContain('\uFFFD');}
    const board=verifiedSolution(p);
    for(const q of board.pieces){expect(q.a.x===q.b.x||q.a.z===q.b.z).toBe(true);expect(p.obstacles.some(z=>touchesZone(q,z))).toBe(false);}
    const wave=startWave(p,board);
    expect(wave.riders).toHaveLength(p.requests.length*3);
    expect(result(p,board,advanceWave(wave,100))).toMatchObject({success:true,stars:3,delivered:p.requests.length*3});
    for(const rider of wave.riders)expect(riderPosition(rider,100)).toEqual(rider.request.goal);
    expect(result(p,createBoard(),advanceWave(startWave(p,createBoard()),100)).success).toBe(false);
  });
  it('does not share mutable request, route or landing objects between authored rounds',()=>{
    const first=sky.find(p=>p.id==='sky-stroller-lane')!,later=sky.find(p=>p.id==='sky-five-part-harmony')!;
    expect(first.solution[0]).not.toBe(later.solution[0]);expect(first.solution[0].a).not.toBe(later.solution[0].a);
    expect(first.landings[0]).not.toBe(later.landings[0]);
    const finale=sky.at(-1)!;expect(later.requests[0]).not.toBe(finale.requests[0]);
  });
});

describe('passenger needs cause meaningful detours',()=>{
  const needRounds:[RiderNeed,string][]=[['stroller','sky-stroller-lane'],['courier','sky-courier-loop'],['acrophobia','sky-quiet-refuge']];
  it.each(needRounds)('%s rejects its forbidden shortcut and chooses an authored alternative',(need,id)=>{
    const p=sky.find(p=>p.id===id)!,board=verifiedSolution(p),request=p.requests.find(r=>r.need===need)!;
    const unrestricted=route(p,board.pieces,{...request,need:undefined})!,restricted=route(p,board.pieces,request)!;
    expect(restricted.length).toBeGreaterThan(unrestricted.length);
    expect(restricted.map(q=>q.id)).not.toEqual(unrestricted.map(q=>q.id));
    expect(route(p,unrestricted,request)).toBeNull();
    expect(routeIssues(p,unrestricted,request)).toContain('needs');
    expect(routeIssues(p,restricted,request)).toEqual([]);
    if(need==='stroller')expect(restricted.every(q=>q.type==='bridge'||q.type==='elevator')).toBe(true);
    if(need==='courier')expect(restricted.every(q=>q.type!=='elevator')).toBe(true);
    if(need==='acrophobia')expect(restricted.every(q=>q.a.y<3&&q.b.y<3)).toBe(true);
  });
  it('combines stroller and balloon restrictions on a separate step-free open-air route',()=>{
    const p=sky.find(p=>p.id==='sky-family-canopy')!,board=verifiedSolution(p),request=p.requests.find(r=>r.need==='stroller')!;
    const path=route(p,board.pieces,request)!;
    expect(path.every(q=>q.type==='bridge'||q.type==='elevator')).toBe(true);
    expect(path.every(q=>!p.lowCeilings.some(z=>touchesZone(q,z)))).toBe(true);
    const ordinary=route(p,board.pieces,{...request,need:undefined,balloon:false})!;
    expect(ordinary.some(q=>p.lowCeilings.some(z=>touchesZone(q,z)))).toBe(true);
    expect(route(p,ordinary,request)).toBeNull();
    expect(routeIssues(p,ordinary,request)).toEqual(['headroom','needs']);
  });
  it('applies height restrictions to either endpoint and also to bridges and elevators',()=>{
    for(const q of [piece('bridge',at(0,3),at(0,3,1)),piece('elevator',at(0,2),at(0,3)),piece('short',at(0,3),at(1,2))]){
      const board=build(flexible,[q]),request={...flexible.requests[0],start:q.a,goal:q.b,need:'acrophobia' as const};
      expect(route(flexible,board.pieces,request)).toBeNull();expect(routeIssues(flexible,board.pieces,request)).toEqual(['needs']);
    }
    expect(routeIssues(flexible,[],{...flexible.requests[0],need:'courier'})).toEqual(['missingRoute']);
  });
  it('shares an actual merge and trunk for rear-gallery requests',()=>{
    const p=sky.find(p=>p.id==='sky-rear-chorus')!,board=verifiedSolution(p);
    const center=at(3,1,2),trunk=board.pieces.find(q=>same(q.a,center)&&q.type==='elevator')!;
    expect(board.pieces.filter(q=>same(q.b,center))).toHaveLength(2);
    for(const request of p.requests)expect(route(p,board.pieces,request)!.some(q=>q.id===trunk.id)).toBe(true);
    expect(route(p,board.pieces,{...p.requests[0],start:p.requests[0].goal,goal:p.requests[0].start})).toBeNull();
  });
});

describe('depth-aware immutable snapshots',()=>{
  it('exposes rider need and deterministic elapsed time before and during waves',()=>{
    const p=structuredClone(sky.find(p=>p.id==='sky-stroller-lane')!),board=verifiedSolution(p),first=at(0,0,1);
    const preview=snapshot(p,board,null,'en',first,null,true,false,false);
    expect(preview.waveElapsed).toBe(0);expect(preview.riders.find(r=>r.need==='stroller')).toBeDefined();
    const wave=advanceWave(startWave(p,board),.5),view=snapshot(p,board,wave,'en',first,board.pieces[0].id,false,true,false);
    expect(view.waveElapsed).toBe(.5);expect(view.riders.find(r=>r.requestId==='walking-parent')?.point.z).toBeCloseTo(.25);
    expect(view.routes.every(r=>r.points.every(point=>point.z!==undefined))).toBe(true);
    expect(Object.isFrozen(view.riders[0].point)).toBe(true);expect(Object.isFrozen(view.puzzle.landings[0])).toBe(true);
    first.z=2;p.requests[0].start.z=2;board.pieces[0].a.z=2;wave.elapsed=10;
    expect(view.first?.z).toBe(1);expect(view.puzzle.requests[0].start.z).toBe(0);expect(view.pieces[0].a.z).toBe(0);expect(view.waveElapsed).toBe(.5);
    expect(()=>{view.riders[0].point.z=2;}).toThrow();
  });
  it('reports a need-blocked rider without dropping their identity, depth or issue',()=>{
    const p=sky.find(p=>p.id==='sky-courier-loop')!,board=build(p,p.solution.slice(0,1));
    const wave=advanceWave(startWave(p,board),.2),view=snapshot(p,board,wave,'en',null,null,false,true,false);
    const courier=view.riders.find(r=>r.need==='courier')!;
    expect(courier).toMatchObject({requestId:'courier',need:'courier',stuck:true,issues:['needs'],point:at(6,0,0)});
    expect(view.routes.find(r=>r.id==='courier')?.issues).toEqual(['needs']);
  });
});
