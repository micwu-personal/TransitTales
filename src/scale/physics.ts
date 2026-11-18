export type Vec = readonly [number, number];
interface Body { p: Vec; v: Vec; mass: number }
const add = (a: Vec,b: Vec,k=1): Vec => [a[0]+k*b[0],a[1]+k*b[1]];
const sub = (a: Vec,b: Vec): Vec => add(a,b,-1);
const polar = (r:number,a:number): Vec => [r*Math.cos(a),r*Math.sin(a)];
export const SOFTENING = .12;
export function gravity(point: Vec, center: Vec, mu: number): Vec {
  const [x,y] = sub(center,point);
  const k = mu / (x*x+y*y+SOFTENING**2)**1.5;
  return [x*k,y*k];
}

// Velocity Verlet keeps nearly circular test orbits from spiraling under numerical drift.
function step(bodies: readonly Body[], h: number) {
  const force = (p:Vec, state:readonly Body[], index:number) => state.reduce<Vec>((a,b,j) =>
    index === j || !b.mass ? a : add(a,gravity(p,b.p,b.mass)), [0,0]);
  const half = bodies.map((b,i) => {
    const v = add(b.v,force(b.p,bodies,i),h/2);
    return {...b,v,p:add(b.p,v,h)};
  });
  return half.map((b,i) => ({...b,v:add(b.v,force(b.p,half,i),h/2)}));
}
const disk = (radii: number[], count: number, p: Vec, v: Vec, mu:number): Body[] =>
  radii.flatMap((r,i) => Array.from({length:count},(_,j) => {
    const a=2*Math.PI*(j+i*.43)/count;
    const speed=Math.sqrt(mu*r*r/(r*r+SOFTENING**2)**1.5);
    return {p:add(p,polar(r,a)),v:add(v,polar(speed,a+Math.PI/2)),mass:0};
  }));
const integrate = (bodies: Body[], frames:number,h:number) => {
  const result = [bodies.map(b=>b.p)];
  for(let i=1;i<=frames;i++) {
    for(let j=0;j<4;j++) bodies=step(bodies,h);
    result.push(bodies.map(b=>b.p));
  }
  return result;
};
export const GRAVITY_FRAMES = 100;
export function orbitFrames(offset: number) {
  const p: Vec = [offset,0];
  return integrate([{p,v:[0,0],mass:1},...disk([.42,.58,.8,1.09,1.48,1.9],12,[0,0],[0,0],1)],GRAVITY_FRAMES,.003);
}
export function encounterFrames(close:boolean) {
  const b = close ? .5 : 2.45;
  const aPos:Vec=[-2.8,-b/2], bPos:Vec=[2.8,b/2];
  const aVel:Vec=[.47,0], bVel:Vec=[-.47,0];
  return integrate([{p:aPos,v:aVel,mass:1},{p:bPos,v:bVel,mass:1},
    ...disk([.27,.42,.6,.82,1.01],9,aPos,aVel,1),...disk([.27,.42,.6,.82,1.01],9,bPos,bVel,1)],GRAVITY_FRAMES,.011);
}
export const expectedRemaining = (halfLives: number) => 2 ** -halfLives;
export const carbon = (electrons:number, neutrons:number) => ({protons:6, charge:6-electrons,mass:6+neutrons});
export const LIGHT_SPEED = 299_792_458;
export const frequency = (wavelengthMeters:number) => LIGHT_SPEED / wavelengthMeters;
export const scaleRatio = (from:number,to:number) => to/from;
export const density1s = (radiusInBohr:number) => Math.exp(-2*radiusInBohr)/Math.PI;
export function rng(seed: number) {
  return () => {
    seed = (Math.imul(1664525,seed)+1013904223) >>> 0;
    return (seed+.5)/4294967296;
  };
}

export function hydrogenSamples(count:number): Vec[] {
  const random=rng(7317);
  return Array.from({length:count},() => {
    // The 1s radial PDF is Gamma(shape=3, scale=a0/2); draw isotropic directions, then project.
    const r = -.5*Math.log(random()*random()*random());
    return polar(r*Math.sqrt(1-(2*random()-1)**2),random()*Math.PI*2);
  });
}
