import type { Point, Shape } from './expedition-model';

export type View = '2d' | '3d';
type Screen = { x:number; y:number; z:number; scale:number };
export const wrapAngle = (a:number) => (a % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
export function projectPoint(point:Point, yaw:number, pitch:number, distance:number, focal:number, cx:number, cy:number):Screen {
  const [x,y,z]=point;
  const a=x*Math.cos(yaw)-z*Math.sin(yaw), b=x*Math.sin(yaw)+z*Math.cos(yaw);
  const up=y*Math.cos(pitch)-b*Math.sin(pitch), depth=y*Math.sin(pitch)+b*Math.cos(pitch);
  const scale=focal/Math.max(.6,distance+depth);
  return {x:cx+a*scale,y:cy-up*scale,z:depth,scale};
}

const stars = Array.from({length:118},(_,i):Point => {
  const y=2*(i+.5)/118-1, az=i*2.39996323, r=Math.sqrt(1-y*y);
  return [r*Math.cos(az),y,r*Math.sin(az)];
});

export class SceneView {
  private ctx:CanvasRenderingContext2D|null;
  yaw=0;
  pitch=.16;
  zoom=1;
  tiltX=0;
  tiltY=0;
  constructor(private canvas:HTMLCanvasElement) { this.ctx=canvas.getContext('2d'); }
  get available() { return !!this.ctx; }
  orbit(dx:number,dy:number) {
    this.yaw=wrapAngle(this.yaw-dx*.009);
    this.pitch=Math.max(-1.56,Math.min(1.56,this.pitch-dy*.008));
  }
  recenter() { this.yaw=0;this.pitch=.16;this.zoom=1;this.tiltX=0;this.tiltY=0; }
  draw(view:View, shapes:readonly Shape[], grip:Point, accent:string) {
    const ctx=this.ctx;
    if(!ctx) return null;
    const {clientWidth:w,clientHeight:h}=this.canvas;
    if(!w || !h) return null;
    const dpi=Math.min(devicePixelRatio || 1,1.6);
    const width=Math.round(w*dpi),height=Math.round(h*dpi);
    if(this.canvas.width!==width || this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,w,h);
    const portrait=w<650 && h>w, short=h<490;
    const cx=w*(portrait?.50:short?.61:.57),cy=h*(portrait?.47:short?.46:.47);
    const units=Math.min(w*(portrait?.151:.116),h*(short?.118:.125))*this.zoom;
    const yaw=view==='3d'?this.yaw+this.tiltX:0;
    const pitch=view==='3d'?Math.max(-1.56,Math.min(1.56,this.pitch+this.tiltY)):.16;
    const cosY=Math.cos(yaw),sinY=Math.sin(yaw),cosP=Math.cos(pitch),sinP=Math.sin(pitch);
    const map=([x,y,z]:Point):Screen=>{
      const a=x*cosY-z*sinY,b=x*sinY+z*cosY,up=y*cosP-b*sinP,depth=y*sinP+b*cosP;
      const scale=view==='3d'?units*7/Math.max(.6,7+depth):units;
      return {x:cx+a*scale,y:cy-up*scale,z:depth,scale};
    };
    const light=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.68);
    light.addColorStop(0,`${accent}25`);light.addColorStop(.48,'#0b202b42');light.addColorStop(1,'#071823');
    ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
    if(view==='3d') {
      ctx.fillStyle='#d7e7d7';
      stars.forEach(([x,y,z],i)=>{
        const b=x*sinY+z*cosY,depth=y*sinP+b*cosP;
        if(depth<.23) return;
        const sx=cx+(x*cosY-z*sinY)*w*.51/depth,sy=cy-(y*cosP-b*sinP)*w*.51/depth;
        ctx.globalAlpha=.18+(i%7)*.075;ctx.fillRect(sx,sy,i%8===0?2:1,i%8===0?2:1);
      });
      ctx.globalAlpha=1;
    }
    const projected=shapes.map(shape=>{
      const p=(shape.kind==='orb'?[shape.at]:shape.points).map(map);
      return {shape,p,depth:p.reduce((sum,v)=>sum+v.z,0)/p.length};
    }).sort((a,b)=>b.depth-a.depth);
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const {shape,p} of projected) {
      if(!p.length) continue;
      ctx.globalAlpha=shape.alpha ?? 1;
      if(shape.kind==='orb') {
        const {x,y,scale}=p[0], r=Math.max(.65,shape.r*scale);
        if(x+r<0 || x-r>w || y+r<0 || y-r>h) continue;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle=shape.color;
        if(!shape.flat && r>=3) {
          const grad=ctx.createRadialGradient(x-r*.26,y-r*.35,0,x,y,r);
          grad.addColorStop(0,shape.light ?? '#ecedd5');grad.addColorStop(.35,shape.color);grad.addColorStop(1,'#101b2d');
          ctx.fillStyle=grad;
        }
        ctx.fill();
      } else {
        ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
        for(let i=1;i<p.length;i++) ctx.lineTo(p[i].x,p[i].y);
        if(shape.kind==='face'){ctx.closePath();ctx.fillStyle=shape.color;ctx.fill();}
        else {if(shape.closed) ctx.closePath();ctx.strokeStyle=shape.color;ctx.lineWidth=shape.width ?? 1;ctx.stroke();}
      }
    }
    ctx.globalAlpha=1;
    return {point:map(grip),project:map,width:w,height:h};
  }
}
