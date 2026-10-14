import { Engine, Scene, FreeCamera, Vector3, Color3, Color4, MeshBuilder, StandardMaterial, HemisphericLight, TransformNode, type Mesh } from '../babylon';
import type { JourneyRenderer, JourneySnapshot } from './view';
export class Journey3D implements JourneyRenderer {
  private host?: HTMLElement; private engine?: Engine; private scene?: Scene; private camera?: FreeCamera; private resize?: ResizeObserver;
  private roots: Record<string, TransformNode> = {}; private pillars: Mesh[] = []; private people: TransformNode[] = []; private stripe?: StandardMaterial;
  private abort = new AbortController(); private phase = ''; private yaw = 0; private pitch = 0; private drag?: { id: number; x: number; y: number }; private snapshot?: JourneySnapshot;
  constructor(private onFailure: () => void) {}
  mount(host: HTMLElement) {
    if (!Engine.isSupported()) throw new Error('WebGL unavailable');
    this.host = host; host.innerHTML = '<canvas class="journey-canvas" aria-hidden="true"></canvas><div class="scene-board"><span></span><strong></strong></div><div class="scene-equivalent"></div>';
    const canvas = host.querySelector('canvas')!;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, powerPreference: 'low-power' });
    this.engine.setHardwareScalingLevel(Math.min(2, Math.max(1, window.devicePixelRatio / 1.5)));
    const scene = this.scene = new Scene(this.engine); scene.clearColor = new Color4(.66,.81,.79,1);
    this.camera = new FreeCamera('passenger-eyes', new Vector3(0,1.65,-4.5), scene); this.camera.minZ=.05; this.camera.maxZ=80; this.camera.fov=.95;
    const light = new HemisphericLight('station-daylight',new Vector3(0,1,0),scene); light.intensity=.95; light.groundColor=Color3.FromHexString('#6e897d');
    const material = (name:string,color:string) => { const mat=new StandardMaterial(name,scene); mat.diffuseColor=Color3.FromHexString(color); mat.specularColor=new Color3(.05,.05,.05); return mat; };
    const ivory=material('ivory-shell','#f5f3eb'), seafoam=material('seat-seafoam','#6c9c88'), floor=material('floor','#b7c6b0'), metal=material('handrails','#b0a876'), dark=material('tunnel','#47685f'), green=material('sign-ink','#284d47'), glass=material('window-sky','#a9cfca'), gold=material('platform-edge','#d3a345');
    this.stripe=material('operating-line','#315d50');
    const box=(name:string,root:TransformNode,mat:StandardMaterial,x:number,y:number,z:number,w:number,h:number,d:number)=>{ const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene); mesh.position.set(x,y,z);mesh.material=mat;mesh.parent=root; return mesh; };
    const root=(name:string)=>this.roots[name]=new TransformNode(name,scene);
    const cabin=root('cabin'); box('cabin-floor',cabin,floor,0,-.08,1,4.8,.16,16);box('cabin-ceiling',cabin,ivory,0,2.9,1,4.8,.15,16);
    box('cabin-end',cabin,ivory,0,1.4,8.8,4.8,2.8,.18); box('end-door',cabin,seafoam,0,1.15,8.67,1.4,2.3,.08);box('end-window',cabin,dark,0,1.7,8.6,1.05,.8,.05);
    box('line-sign',cabin,this.stripe,0,2.45,8.45,2.8,.4,.1);
    for(const side of [-1,1]) {
      box('lower-shell',cabin,ivory,side*2.4,.45,1,.14,.9,16);box('upper-shell',cabin,ivory,side*2.4,2.58,1,.14,.65,16);
      box('bench-seat',cabin,seafoam,side*1.93,.48,.7,.68,.25,10);box('bench-back',cabin,seafoam,side*2.23,.85,.7,.13,.85,10);
      box('outside-tunnel',cabin,dark,side*3.6,1.5,1,.12,4,30);
      for(let z=-6;z<=7;z+=3) {box('window-frame',cabin,ivory,side*2.4,1.65,z,.16,1.4,.12);box('window-sill',cabin,metal,side*2.35,1.03,z+1.4,.1,.08,2.9);}
      for(let z=-2;z<=5;z+=3.5) {const pole=MeshBuilder.CreateCylinder('upright-grip',{height:2.85,diameter:.055,tessellation:8},scene);pole.position.set(side*1.15,1.43,z);pole.parent=cabin;pole.material=metal;}
      for(let i=0;i<7;i++) this.pillars.push(box('tunnel-window-motion',cabin,glass,side*3.1,1.5,-8+i*3,.1,2.6,.35));
    }
    const platform=root('platform');box('platform-floor',platform,ivory,-1,-.1,3,7,.2,25);box('platform-ceiling',platform,floor,-1,3.2,3,7,.15,25);box('track',platform,dark,3,-.28,3,2,.18,25);box('yellow-safe-line',platform,gold,1.8,.02,3,.18,.035,25);box('station-wall',platform,ivory,-4,1.6,3,.2,3.2,25);box('station-line-strip',platform,this.stripe,-3.85,1.45,3,.06,.16,25);
    for(let z=-1;z<15;z+=5) {box('station-column',platform,floor,-2.8,1.5,z,.45,3,.45);box('station-light',platform,metal,0,3.02,z,3.8,.04,.13);}
    box('platform-board',platform,green,-.3,2.4,5,2.8,.55,.12);box('stopped-train',platform,ivory,3.5,1.3,2,2.5,2.6,17);box('train-stripe',platform,this.stripe,2.22,.6,2,.06,.2,17);
    for(let z=-4;z<10;z+=3) {box('train-window',platform,dark,2.22,1.6,z,.06,.85,1.6);box('train-door',platform,seafoam,2.2,1.1,z+1.3,.06,2.15,.7);}
    const walkway=root('walkway');box('walk-floor',walkway,floor,0,-.1,4,5,.2,27);box('walk-ceiling',walkway,ivory,0,3.1,4,5,.12,27);for(const side of [-1,1])box('walk-wall',walkway,ivory,side*2.5,1.5,4,.12,3,27);box('walk-sign',walkway,green,0,2.5,5,2.4,.5,.12);
    for(let z=-2;z<16;z+=4){box('walk-light',walkway,metal,0,3,z,2.6,.06,.16);box('walk-line',walkway,this.stripe,-2.4,1.1,z,.1,.16,4);box('direction-marker',walkway,green,0,.015,z,.18,.025,1.2);}
    const passengers=root('passengers'), skin=material('skin','#ba835f'), coats=['#b96148','#617b92','#65855c','#b19751'].map((c,i)=>material(`coat-${i}`,c));
    for(let i=0;i<12;i++) {const person=new TransformNode(`passenger-${i}`,scene);person.parent=passengers;const head=MeshBuilder.CreateSphere('head',{diameter:.25,segments:8},scene);head.parent=person;head.position.y=1.55;head.material=skin;box('coat',person,coats[i%4],0,1.08,0,.38,.7,.23);for(const side of [-1,1])box('leg',person,green,side*.1,.36,0,.12,.72,.13);this.people.push(person);}
    const wheel=MeshBuilder.CreateTorus('wheelchair-wheel',{diameter:.65,thickness:.055,tessellation:12},scene);wheel.parent=this.people[0];wheel.position.set(.26,.4,0);wheel.rotation.z=Math.PI/2;wheel.material=green;wheel.metadata={wheelchair:true};box('wheelchair-seat',this.people[0],green,0,.6,0,.5,.08,.45).metadata={wheelchair:true};
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.onFailure();},{signal:this.abort.signal});
    canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;this.drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);},{signal:this.abort.signal});
    canvas.addEventListener('pointermove',event=>{if(!this.drag||this.drag.id!==event.pointerId)return;this.yaw=Math.max(-.8,Math.min(.8,this.yaw+(event.clientX-this.drag.x)*.003));this.pitch=Math.max(-.2,Math.min(.2,this.pitch+(event.clientY-this.drag.y)*.002));this.drag={id:event.pointerId,x:event.clientX,y:event.clientY};this.look();},{signal:this.abort.signal});
    const end=()=>{this.drag=undefined;};canvas.addEventListener('pointerup',end,{signal:this.abort.signal});canvas.addEventListener('pointercancel',end,{signal:this.abort.signal});
    this.resize=new ResizeObserver(()=>this.engine?.resize());this.resize.observe(host);this.engine.resize();
  }
  private look(){if(this.camera)this.camera.setTarget(this.camera.position.add(new Vector3(Math.sin(this.yaw)*8,-.2+this.pitch*8,Math.cos(this.yaw)*8)));}
  render(snapshot: JourneySnapshot) {
    if(!this.scene||!this.host||!this.camera)return;this.snapshot=snapshot;
    const phase=snapshot.phase==='ride'?'cabin':snapshot.phase==='transfer'||snapshot.phase==='walk'?'walkway':'platform';
    if(phase!==this.phase){this.phase=phase;this.yaw=0;this.pitch=0;for(const key of ['cabin','platform','walkway'])this.roots[key].setEnabled(key===phase);this.camera.position.set(phase==='platform'?-.2:0,1.65,-4.5);this.look();}
    if(this.stripe)this.stripe.diffuseColor=Color3.FromHexString(snapshot.lineColor);
    this.host.querySelector('.scene-board span')!.textContent=snapshot.line;
    this.host.querySelector('.scene-board strong')!.textContent=snapshot.phase==='ride'||snapshot.phase==='walk'?snapshot.nextStation:snapshot.station;
    this.host.querySelector('.scene-equivalent')!.textContent=snapshot.caption;
    this.pillars.forEach((pillar,i)=>pillar.position.z=-8+((i%7)*3+(snapshot.reducedMotion?0:snapshot.elapsed*.16))%21);
    this.people.forEach((person,i)=>{person.setEnabled(i<(snapshot.crowded?12:4));person.position.set(i%2?1.1:-1.1,0,-.5+Math.floor(i/2)*2);if(phase==='platform')person.position.x=-1.8+(i%2)*1.5;if(phase==='walkway')person.position.z+=snapshot.reducedMotion?0:Math.sin(snapshot.progress*Math.PI)*1.2;});
    this.people[0].getChildMeshes().filter(mesh=>mesh.metadata?.wheelchair).forEach(mesh=>mesh.setEnabled(snapshot.wheelchair));
    if(!document.hidden)this.scene.render();
  }
  dispose(){this.abort.abort();this.resize?.disconnect();this.scene?.dispose();this.engine?.dispose();if(this.host)this.host.innerHTML='';this.scene=undefined;this.engine=undefined;this.host=undefined;this.pillars=[];this.people=[];this.roots={};}
}
