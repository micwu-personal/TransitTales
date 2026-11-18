import { macroMissions } from './macro-missions';
import { microMissions } from './micro-missions';
import { SceneView, type View } from './projection';
import type { Mission } from './expedition-model';
import type { Locale, Text } from './stops';

export const missions:Readonly<Record<string,Mission>> = {...macroMissions,...microMissions};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const modeKey='scale-render-mode-v1';

export class Fieldwork {
  readonly scene:SceneView;
  view:View='2d';
  private opened=false;
  private mission?:Mission;
  private locale:Locale='en';
  private value=0;
  private baseline:number|null=null;
  private elapsed=0;
  private start?:number;
  private frameId=0;
  private moving?:{id:number;x:number;y:number;value:number;changed:boolean};
  private project?:NonNullable<ReturnType<SceneView['draw']>>['project'];
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private result:HTMLElement;
  private grip:HTMLElement;

  constructor(private root:HTMLElement, private canvas:HTMLCanvasElement, private onDiscovery:()=>void) {
    this.scene=new SceneView(canvas);
    this.grip=root.querySelector<HTMLElement>('#grip')!;
    this.result=root.querySelector<HTMLElement>('#mission-result')!;
    try { if(this.scene.available && localStorage.getItem(modeKey)==='3d') this.view='3d'; } catch { /* Optional preference. */ }
    this.grip.addEventListener('pointerdown',e=>{
      if(!e.isPrimary || e.button!==0) return;
      this.moving={id:e.pointerId,x:e.clientX,y:e.clientY,value:this.value,changed:false};
      this.grip.setPointerCapture(e.pointerId);
    });
    this.grip.addEventListener('pointermove',e=>{
      const drag=this.moving;
      if(!drag || drag.id!==e.pointerId || !this.mission) return;
      const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
      if(!drag.changed && Math.hypot(dx,dy)<4) return;
      const lo=clamp(this.value-.025), hi=clamp(this.value+.025);
      const a=this.project?.(this.mission.frame(lo,0,null).grip), b=this.project?.(this.mission.frame(hi,0,null).grip);
      let delta=dx/Math.min(240,this.canvas.clientWidth*.6);
      if(a && b){
        const vx=(b.x-a.x)/(hi-lo),vy=(b.y-a.y)/(hi-lo),length=Math.hypot(vx,vy);
        if(length>38) delta=(dx*vx+dy*vy)/(length*Math.max(90,length));
      }
      drag.x=e.clientX;drag.y=e.clientY;
      const next=clamp(this.value+Math.max(-.2,Math.min(.2,delta)));
      if(next===this.value) return;
      drag.changed=true;this.root.dataset.hand='held';this.start=undefined;this.elapsed=0;
      this.value=next;this.schedule();
    });
    const release=(e:PointerEvent,commit:boolean)=>{
      if(this.moving?.id!==e.pointerId) return;
      const {value,changed}=this.moving; this.moving=undefined;
      delete this.root.dataset.hand;
      if(changed){
        if(commit) this.release(value);
        else {this.value=value;this.schedule();}
      }
    };
    this.grip.addEventListener('pointerup',e=>release(e,true));
    this.grip.addEventListener('pointercancel',e=>release(e,false));
    this.grip.addEventListener('lostpointercapture',e=>release(e,false));
    this.grip.addEventListener('keydown',e=>{
      const before=this.value;
      switch(e.key){
        case 'ArrowLeft':case 'ArrowDown': this.value=clamp(before-.08);break;
        case 'ArrowRight':case 'ArrowUp': this.value=clamp(before+.08);break;
        case 'Home':this.value=0;break;
        case 'End':this.value=1;break;
        default:return;
      }
      e.preventDefault(); if(before!==this.value) this.release(before);
    });
    root.querySelector('#mission-reset')!.addEventListener('click',()=>this.reset());
  }

  get active() { return this.scene.available && (this.view==='3d' || this.opened); }
  private text(v:Text) { return v[this.locale==='zh'?0:1]; }
  enter(id:string) { this.mission=missions[id];this.reset(); }
  private reset() {
    this.moving=undefined; delete this.root.dataset.hand;
    this.value=this.mission?.initial ?? 0;this.baseline=null;this.start=undefined;this.elapsed=0;this.result.textContent='';this.schedule();
  }
  toggleView() {
    if(!this.scene.available) return;
    this.view=this.view==='3d'?'2d':'3d';this.opened=false;this.scene.recenter();
    try {localStorage.setItem(modeKey,this.view);} catch { /* Optional preference. */ }
    this.schedule();
  }
  togglePlay() { this.opened=!this.opened;this.schedule(); }
  paint(locale:Locale) {
    this.locale=locale;
    if(!this.mission) return;
    this.root.style.setProperty('--exhibit-accent',this.mission.accent);
    this.root.querySelector('#mission-title')!.textContent=this.text(this.mission.title);
    this.root.querySelector('#mission-guide')!.textContent=this.text(this.mission.guide);
    this.root.querySelector('#mission-reset')!.textContent=this.text(['重置','Reset']);
    this.grip.setAttribute('aria-label',this.text(this.mission.handle));
    this.schedule();
  }
  private release(before:number) {
    this.baseline=before;
    this.elapsed=this.reduced.matches?(this.mission?.duration ?? 0):0;
    this.start=this.reduced.matches?undefined:performance.now();
    this.onDiscovery(); this.schedule();
  }
  schedule() {
    this.root.dataset.view=this.view;
    this.root.dataset.fieldwork=String(this.active);
    if(this.active && !this.frameId && !document.hidden) this.frameId=requestAnimationFrame(this.draw);
  }
  suspend() { cancelAnimationFrame(this.frameId);this.frameId=0;this.start=undefined; }
  private draw=(now:number)=>{
    this.frameId=0;
    if(!this.mission || !this.active) return;
    const duration=this.mission.duration ?? 0;
    if(this.start!==undefined) {
      this.elapsed=Math.min(duration,(now-this.start)/1000);
      if(this.elapsed>=duration) this.start=undefined;
    }
    const {shapes,grip}=this.mission.frame(this.value,this.elapsed,this.baseline);
    const rendered=this.scene.draw(this.view,shapes,grip,this.mission.accent);
    if(rendered) {
      this.project=rendered.project;
      this.grip.style.left=`${Math.max(26,Math.min(rendered.width-26,rendered.point.x))}px`;
      this.grip.style.top=`${Math.max(116,Math.min(rendered.height-114,rendered.point.y))}px`;
    }
    const value=Math.round(this.value*100).toString();
    if(this.grip.getAttribute('aria-valuenow')!==value) this.grip.setAttribute('aria-valuenow',value);
    const outcome=this.baseline!==null || this.moving?.changed ? this.text(this.mission.result(this.value,this.elapsed)) : '';
    if(this.result.textContent!==outcome) this.result.textContent=outcome;
    if(this.start!==undefined) this.schedule();
  };
}
