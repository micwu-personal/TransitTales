import './style.css';
import { stops, type Locale, type Text } from './stops';
import { sceneArt } from './art';
import { Exhibits } from './exhibits';
import { scaleRatio } from './physics';
import { Fieldwork } from './fieldwork';
import { nearestStop, scalePosition } from './scale-ruler';

const $ = <T extends Element = HTMLElement>(selector:string) => document.querySelector<T>(selector)!;
const home = stops.findIndex(s=>s.id==='house');
const lang = new URLSearchParams(location.search).get('lang');
let locale:Locale = lang==='en' ? 'en' : lang==='zh' || /^zh\b/i.test(navigator.language) ? 'zh' : 'en';
const t = (zh: string,en: string) => locale==='zh' ? zh : en;
const text = (value:Text) => value[locale==='zh'?0:1];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const visited = new Set<string>();
try {
  const saved:unknown=JSON.parse(localStorage.getItem('scale-observations-v1') || '[]');
  if (Array.isArray(saved)) for(const id of saved) if(stops.some(s=>s.id===id)) visited.add(id);
} catch { /* The journal is still usable for the current visit. */ }

$('#scale').innerHTML=`<div id="world" aria-hidden="true">
  <div id="camera"><svg class="landscape" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"><g id="landscape-current"></g><g id="specimen"></g></svg></div>
  <svg class="landscape passage" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"></svg>
  <canvas id="field-view"></canvas>
  <div class="vignette"></div>
</div>
<header class="top"><a href="index.html" id="concourse"></a><span id="signature"></span><div class="tools"><button id="view-mode" aria-pressed="false">3D</button><button id="motion" aria-controls="motion-panel" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3"/><circle cx="12" cy="12" r="6"/></svg><span></span></button><button id="lang"></button></div></header>
<section class="location" aria-labelledby="stop-name"><h1 id="stop-name"></h1><div class="place-meta"><span id="scale-size"></span><span id="evidence"></span></div><p id="hook"></p></section>
<button id="pin" aria-controls="observation" aria-expanded="false"><span class="pin-dot" aria-hidden="true"></span><span id="pin-label"></span></button>
<button id="mission-toggle" aria-controls="mission" aria-expanded="false"><span aria-hidden="true">✦</span><span id="mission-label"></span></button>
<div id="grip" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span aria-hidden="true">⤧</span></div>
<section id="mission" aria-labelledby="mission-title"><div><h2 id="mission-title"></h2><p id="mission-guide"></p><p id="mission-result" role="status"></p></div><button id="mission-reset"></button></section>
<aside id="observation" class="folio" hidden aria-labelledby="observation-title">
  <div class="folio-top"><h2 id="observation-title"></h2><button id="close-observation" class="cross">×</button></div><p id="detail"></p><p id="fiber-memory" hidden></p><div id="lab" hidden></div><a id="source" target="_blank" rel="noopener noreferrer"></a>
</aside>
<aside id="atlas" class="folio" hidden aria-labelledby="atlas-title">
  <div class="folio-top"><h2 id="atlas-title" tabindex="-1"></h2><button id="close-atlas" class="cross">×</button></div><p id="atlas-note"></p><ol id="stops"></ol>
</aside>
<aside id="motion-panel" class="folio" hidden aria-labelledby="motion-title">
  <div class="folio-top"><h2 id="motion-title"></h2><button id="close-motion" class="cross">×</button></div><p id="motion-desc"></p><div class="lab-actions"><button id="sensors"></button><button id="step"></button><button id="recenter"></button></div><p id="sensor-status" role="status"></p>
</aside>
<footer class="trail">
  <div id="ratio" aria-live="polite"></div><div class="ruler" id="travel-ruler" role="slider" tabindex="0" aria-valuemin="1" aria-valuemax="${stops.length}"><span class="ruler-start" aria-hidden="true">10⁻³⁵ m</span><div class="ticks" aria-hidden="true">${stops.map(s=>`<b style="left:${scalePosition(s.meters)*100}%"></b>`).join('')}<i id="needle"></i></div><span class="ruler-end" aria-hidden="true">10²⁷ m</span></div>
  <nav class="gates"><button id="smaller" class="gate"><b aria-hidden="true">↙</b><span><small></small><strong></strong></span></button><button id="map" aria-controls="atlas" aria-expanded="false"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12"/><path d="M16 4v4m0 16v4M4 16h4m16 0h4m-4-7-4 11-11 4 4-11z"/></svg><span></span></button><button id="larger" class="gate"><span><small></small><strong></strong></span><b aria-hidden="true">↗</b></button></nav>
</footer>
<div id="live" class="sr-only" aria-live="polite"></div>`;

const stage = $('#world'), camera=$('#camera'), pin=$<HTMLButtonElement>('#pin');
const landscape=$<SVGGElement>('#landscape-current'), passage=$<SVGSVGElement>('.passage');
const panels=['observation','atlas','motion-panel'] as const;
type Panel=typeof panels[number];
const triggers:Record<Panel,string>={observation:'#pin',atlas:'#map','motion-panel':'#motion'};
const exhibits=new Exhibits($('#lab'),$<SVGGElement>('#specimen'));
const fieldwork=new Fieldwork($('#scale'),$<HTMLCanvasElement>('#field-view'),()=>mark());
let sceneArrival: Animation|undefined;
let index=home, panel:Panel|undefined, attempt=0;
let animation: Animation|undefined, arrival: Animation|undefined;
let x=0,y=0,depth=0, sx=0,sy=0;
const cameraPointers=new Map<number,{x:number;y:number}>();
function zoomBy(factor:number) {
  fieldwork.scene.zoom=Math.max(.68,Math.min(1.45,fieldwork.scene.zoom*factor));
  fieldwork.schedule();
}

function drawCamera() {
  const {width,height}=stage.getBoundingClientRect();
  const zoom=1.035+depth*.035+2*Math.max(Math.abs(x+sx)/Math.max(1,width),Math.abs(y+sy)/Math.max(1,height));
  camera.style.transform=`translate(${x+sx}px,${y+sy}px) scale(${zoom})`;
  const [px,py]=stops[index].point, factor=Math.max(width/1000,height/700);
  const markerX=width/2+(px-500)*factor*zoom+x+sx, markerY=height/2+(py-350)*factor*zoom+y+sy;
  pin.style.left=`${Math.max(68,Math.min(width-68,markerX))}px`;
  pin.style.top=`${Math.max(Math.min(153,height*.46),Math.min(height-113,markerY))}px`;
  fieldwork.schedule();
}
function recenter() { x=0;y=0;depth=0;sx=0;sy=0;reference=undefined;fieldwork.scene.recenter();drawCamera(); }
const clamp=(v:number,max:number) => Math.max(-max,Math.min(max,v));
function nudge(dx:number,dy:number) {
  if(fieldwork.view==='3d') { fieldwork.scene.orbit(dx,dy);fieldwork.schedule();return; }
  x=clamp(x+dx,48);y=clamp(y+dy,36);drawCamera();
}
function walk(){ depth=(depth+1)%5;fieldwork.scene.zoom=1+depth*.06;drawCamera(); }

function paint() {
  const s=stops[index];
  document.documentElement.lang=t('zh-CN','en');
  $('#concourse').textContent=t('← 大厅','← Concourse');
  $('#signature').textContent=t('尺度远征','Scale Expedition');
  $('#motion span').textContent=t('视角','View');
  $('#lang').textContent=t('EN','中文');
  $('#lang').setAttribute('aria-label',t('Play in English','切换到简体中文'));
  $('#stop-name').textContent=s.id==='house'?t('从家出发','It starts at home'):text(s.name);
  $('#scale-size').textContent=text(s.scale);
  $('#evidence').textContent=s.kind==='observed'?t('实证 · 绘景','Evidence · illustration'):s.kind==='model'?t('科学模型','Scientific model'):t('知识边界','Knowledge limit');
  $('#hook').textContent=text(s.hook);
  $('#pin-label').textContent=text(s.target);
  $('#needle').style.left=`${100*scalePosition(s.meters)}%`;
  const ruler=$('#travel-ruler'), rulerLabel=t('轻触尺度尺，跳到任意一站','Tap the scale ruler to jump');
  ruler.setAttribute('aria-label',rulerLabel);ruler.title=rulerLabel;
  ruler.setAttribute('aria-valuenow',String(index+1));
  ruler.setAttribute('aria-valuetext',`${text(s.name)} · ${text(s.scale)}`);
  const viewMode=$<HTMLButtonElement>('#view-mode');
  viewMode.disabled=!fieldwork.scene.available;
  viewMode.setAttribute('aria-label',t('3D 视图','3D view'));
  viewMode.setAttribute('aria-pressed',String(fieldwork.view==='3d'));
  viewMode.title=fieldwork.scene.available?t('切换 2D / 3D','Switch 2D / 3D'):t('此浏览器无法绘制立体场景','3D drawing is unavailable in this browser');
  const missionToggle=$<HTMLButtonElement>('#mission-toggle');
  missionToggle.hidden=fieldwork.view==='3d' || !fieldwork.scene.available;
  missionToggle.setAttribute('aria-expanded',String(fieldwork.active));
  $('#mission-label').textContent=fieldwork.active?t('返回绘景','Back to illustration'):t('动手探索','Try it here');
  $('#ratio').dataset.hint=t('轻触跳转','Tap to jump');
  fieldwork.paint(locale);
  const gate=(id:string,step:number,label:string,end:string) => {
    const btn=$<HTMLButtonElement>(id), stop=stops[index+step];
    btn.disabled=!stop;
    $(id+' small').textContent=label;
    $(id+' strong').textContent=stop ? text(stop.name) : end;
  };
  gate('#smaller',-1,t('向微观','Smaller worlds'),t('尺度边界','Scale limit'));
  gate('#larger',1,t('向宏观','Larger worlds'),t('观测边界','Horizon'));
  $('#map span').textContent=t('尺度图','Scale map');
  $('#observation-title').textContent=text(s.target);
  $('#detail').textContent=text(s.detail);
  $('#fiber-memory').hidden=!(exhibits.fiber && (s.id==='tissue'||s.id==='cat'));
  $('#fiber-memory').textContent=t('你的链模型笔记：你试过伸展形状。许多蛋白质链一起组装才形成一根毛发；改变模型没有改变这只猫。','Your chain note: you tried the extended shape. Many protein chains assemble into a hair; changing the model did not change this cat.');
  const source=$<HTMLAnchorElement>('#source');source.href=s.source.url;source.textContent=t('资料：','Source: ')+s.source.name+' ↗';
  $('#atlas-title').textContent=t('远征地图','Expedition map');
  $('#atlas-note').textContent=t(`观察笔记 ${visited.size} / ${stops.length}。从任意一站继续。` ,`${visited.size} of ${stops.length} observations recorded. Continue from any stop.`);
  $('#stops').innerHTML=stops.map((spot,i)=>`<li><button data-stop="${i}"${i===index?' aria-current="location"':''}><span>${visited.has(spot.id)?'✓':'·'} ${text(spot.name)}</span><small>${text(spot.scale)}</small></button></li>`).join('');
  $('#motion-title').textContent=t('看向四周','Look around');
  $('#motion-desc').textContent=t('在 3D 中拖动背景或按 WASD，绕展品转一整圈。双指捏合、滚轮或空格可缩放。传感器能转动视角，不会定位或测量距离。','In 3D, drag the background or use WASD to orbit the exhibit. Pinch, scroll, or press Space to zoom. Sensors can tilt the view without tracking location or distance.');
  $('#step').textContent=t('向前一步','Step in');
  $('#recenter').textContent=t('居中','Recenter');
  for(const id of ['close-observation','close-atlas','close-motion']) $('#'+id).setAttribute('aria-label',t('关闭','Close'));
  const lab=$('#lab');lab.hidden=!s.experiment;
  if(panel==='observation' && s.experiment) exhibits.open(s.experiment,locale);
  sensorCopy();
}
function mark() {
  visited.add(stops[index].id);
  try { localStorage.setItem('scale-observations-v1',JSON.stringify([...visited])); } catch { /* Optional persistence. */ }
}
function show(next?:Panel, focus=true) {
  const before=panel;
  panel=next===before?undefined:next;
  $('#scale').dataset.panel=panel ?? '';
  $('#grip').tabIndex=panel?-1:0;
  for(const id of panels) { $('#'+id).hidden=id!==panel; $(triggers[id]).setAttribute('aria-expanded',String(id===panel)); }
  if(panel==='observation') { mark();paint(); }
  else exhibits.close();
  if(panel==='atlas') { paint(); if(focus) $('#atlas-title').focus(); }
  if(focus && !panel && before) $(triggers[before]).focus();
}
function arrive(next:number,fromAtlas=false) {
  if(!stops[next] || next===index) { if(fromAtlas) show();return; }
  const old=stops[index], fresh=stops[next], sign=Math.sign(next-index);
  const wasOpen=!!panel;
  show(undefined,false);
  animation?.cancel();arrival?.cancel();sceneArrival?.cancel();passage.innerHTML='';
  if (!reduced.matches && !fieldwork.active && typeof passage.animate==='function') {
    // Use a separate copy of the departing scene above the new one for an optical zoom dissolve.
    passage.innerHTML=landscape.innerHTML;
    const from=sign>0?.87:1.23, entry=sign>0?1.21:.86;
    animation=passage.animate([{opacity:1,transform:'scale(1)'},{opacity:.9,offset:.24},{opacity:0,transform:`scale(${from})`}],{duration:740,easing:'cubic-bezier(.28,.65,.29,1)'});
    const current=animation;
    current.onfinish=()=>{ if(animation===current) passage.innerHTML=''; };
    arrival=landscape.animate([{transform:`scale(${entry})`,transformOrigin:'52.5% 48%'},{transform:'scale(1)',transformOrigin:'52.5% 48%'}],{duration:740,easing:'cubic-bezier(.22,.72,.22,1)'});
  }
  index=next;
  landscape.innerHTML=sceneArt(fresh.id);
  fieldwork.enter(fresh.id);recenter();paint();
  const fieldView=$('#field-view');
  if(fieldwork.active && !reduced.matches && typeof fieldView.animate==='function') {
    sceneArrival=fieldView.animate([{opacity:.35,transform:`scale(${sign>0?1.06:.95})`},{opacity:1,transform:'scale(1)'}],{duration:470,easing:'cubic-bezier(.2,.7,.25,1)'});
  }
  const ratio=scaleRatio(old.meters,fresh.meters);
  const factor=Math.max(ratio,1/ratio);
  const number=factor<1e6?Math.round(factor).toLocaleString(locale==='zh'?'zh-CN':'en'):factor.toExponential(1).replace('e+',' × 10^');
  $('#ratio').textContent=old.id==='field'||fresh.id==='field' ? t('场站使用参考标记','Field stop uses a reference marker') : t(`跨度约 ${number} 倍${sign>0?'更大':'更小'}`,`About ${number}× ${sign>0?'larger':'smaller'} in span`);
  $('#live').textContent=text(fresh.name);
  if(fromAtlas || wasOpen || $<HTMLButtonElement>('#smaller').disabled && document.activeElement===$('#smaller') || $<HTMLButtonElement>('#larger').disabled && document.activeElement===$('#larger')) pin.focus();
}

let sensorsOn=false, motionAllowed=false;
let sensorStatus:'idle'|'pending'|'active'|'empty'|'denied'|'unsupported'='idle';
let reference: { beta:number;gamma:number } | undefined;
let watchdog:number|undefined, lastStep=0, stepArmed=true;
type SensorClass = {requestPermission?:()=>Promise<string>};
function sensorCopy() {
  $('#sensors').textContent=sensorsOn?t('关闭传感器','Turn sensors off'):t('开启设备传感器','Enable device sensors');
  const messages:Record<typeof sensorStatus,Text>={idle:['也可以拖动场景，不必开启传感器。','You can also drag without turning on sensors.'],pending:['正在等待设备数据…','Waiting for device data…'],active:['视角已开启。轻轻转动设备；需要时可居中。','Motion view is on. Gently turn the device; recenter if needed.'],empty:['未收到朝向数据。仍可拖动或用键盘。','No orientation data arrived. Drag or use the keyboard instead.'],denied:['未获准访问。仍可拖动或用键盘。','Motion access was not granted. Drag or use the keyboard instead.'],unsupported:['此浏览器需要安全连接与设备支持。试试拖动。','This browser needs a secure connection and sensor support. Try dragging instead.']};
  $('#sensor-status').textContent=text(messages[sensorStatus]);
}
function orient(e:DeviceOrientationEvent) {
  if (e.gamma===null || e.beta===null) return;
  if(sensorStatus!=='active'){ clearTimeout(watchdog);sensorStatus='active';sensorCopy(); }
  if(!reference) reference={beta:e.beta,gamma:e.gamma};
  const angle=(screen.orientation?.angle ?? (window as Window & {orientation?:number}).orientation ?? 0)*Math.PI/180;
  const gx=e.gamma-reference.gamma, by=((e.beta-reference.beta+540)%360)-180;
  sx=clamp((gx*Math.cos(angle)-by*Math.sin(angle))*1.35,35);
  sy=clamp((by*Math.cos(angle)+gx*Math.sin(angle))*1.12,26);
  fieldwork.scene.tiltX=-sx*.017;fieldwork.scene.tiltY=sy*.015;
  drawCamera();
}
function senseStep(e:DeviceMotionEvent) {
  if(!motionAllowed || panel || reduced.matches) return;
  const a=e.acceleration;
  if(!a || a.x===null || a.y===null || a.z===null) return;
  const g=Math.hypot(a.x,a.y,a.z), now=performance.now();
  if(g<.68) stepArmed=true;
  if(g>2.4 && stepArmed && now-lastStep>550){ stepArmed=false;lastStep=now;walk(); }
}
function stopSensors(status:typeof sensorStatus='idle') {
  ++attempt;sensorsOn=false;motionAllowed=false;sensorStatus=status;clearTimeout(watchdog);
  window.removeEventListener('deviceorientation',orient);window.removeEventListener('devicemotion',senseStep);
  reference=undefined;sx=0;sy=0;fieldwork.scene.tiltX=0;fieldwork.scene.tiltY=0;drawCamera();sensorCopy();
}
async function startSensors() {
  if(sensorsOn || sensorStatus==='pending') { stopSensors();return; }
  if(!isSecureContext || !window.DeviceOrientationEvent) { sensorStatus='unsupported';sensorCopy();return; }
  const token=++attempt;sensorStatus='pending';sensorCopy();
  try {
    const o=DeviceOrientationEvent as unknown as SensorClass, m=window.DeviceMotionEvent as unknown as SensorClass|undefined;
    const orientation=o.requestPermission?.() ?? Promise.resolve('granted');
    const motion=m?.requestPermission?.().catch(()=>'denied') ?? Promise.resolve(m?'granted':'denied');
    const [allowed,walking]=await Promise.all([orientation,motion]);
    if(token!==attempt) return;
    if(allowed!=='granted'){ stopSensors('denied');return; }
    sensorsOn=true;motionAllowed=walking==='granted';
    window.addEventListener('deviceorientation',orient);if(motionAllowed) window.addEventListener('devicemotion',senseStep);
    watchdog=window.setTimeout(()=>stopSensors('empty'),2800);sensorCopy();
  } catch { if(token===attempt) stopSensors('denied'); }
}

stage.addEventListener('pointerdown',e=>{
  if(e.button!==0 || cameraPointers.size>=2 || !e.isPrimary && (fieldwork.view==='2d' || e.pointerType!=='touch')) return;
  cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  const before=cameraPointers.get(e.pointerId);
  if(!before) return;
  const point={x:e.clientX,y:e.clientY};cameraPointers.set(e.pointerId,point);
  if(cameraPointers.size===2 && fieldwork.view==='3d') {
    for(const [id,other] of cameraPointers) if(id!==e.pointerId) {
      const previous=Math.hypot(before.x-other.x,before.y-other.y);
      if(previous>4) zoomBy(Math.hypot(point.x-other.x,point.y-other.y)/previous);
    }
    return;
  }
  const factor=fieldwork.view==='3d'?1:.62;
  nudge((point.x-before.x)*factor,(point.y-before.y)*factor);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'] as const) {
  stage.addEventListener(event,e=>{cameraPointers.delete(e.pointerId);});
}
stage.addEventListener('wheel',e=>{
  if(fieldwork.view!=='3d') return;
  e.preventDefault();zoomBy(Math.exp(-e.deltaY*.001));
},{passive:false});
$('#view-mode').addEventListener('click',()=>{if(panel) show(undefined,false);fieldwork.toggleView();paint();});
$('#mission-toggle').addEventListener('click',()=>{if(panel) show(undefined,false);fieldwork.togglePlay();paint();});
const ruler=$('#travel-ruler');
ruler.addEventListener('click',e=>{
  const track=$('.ticks').getBoundingClientRect();
  arrive(nearestStop((e.clientX-track.left)/track.width,stops));ruler.focus({preventScroll:true});
});
ruler.addEventListener('keydown',e=>{
  let next=index;
  switch(e.key){
    case 'ArrowLeft':case 'ArrowDown':next--;break;
    case 'ArrowRight':case 'ArrowUp':next++;break;
    case 'Home':next=0;break;
    case 'End':next=stops.length-1;break;
    default:return;
  }
  e.preventDefault();e.stopPropagation();arrive(next);ruler.focus({preventScroll:true});
});
pin.addEventListener('click',()=>show('observation'));
$('#map').addEventListener('click',()=>show('atlas'));
$('#motion').addEventListener('click',()=>show('motion-panel'));
for(const id of ['close-observation','close-atlas','close-motion']) $('#'+id).addEventListener('click',()=>show());
$('#smaller').addEventListener('click',()=>arrive(index-1));
$('#larger').addEventListener('click',()=>arrive(index+1));
$('#stops').addEventListener('click', e=>{const b=(e.target as Element).closest<HTMLButtonElement>('button[data-stop]');if(b) arrive(Number(b.dataset.stop),true);});
$('#lang').addEventListener('click',()=>{locale=locale==='zh'?'en':'zh';$('#ratio').textContent='';paint();});
$('#sensors').addEventListener('click',()=>{void startSensors();});
$('#step').addEventListener('click',()=>walk());
$('#recenter').addEventListener('click',()=>recenter());
window.addEventListener('resize',()=>drawCamera());
window.addEventListener('orientationchange',()=>{reference=undefined;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSensors();exhibits.suspend();fieldwork.suspend();}else fieldwork.schedule();});
window.addEventListener('pagehide',()=>{stopSensors();exhibits.suspend();fieldwork.suspend();});
window.addEventListener('pageshow',()=>fieldwork.schedule());
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && panel){show();return;}
  if(e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.target as Element).closest('button,input,a,select,textarea,[role=slider]')) return;
  switch(e.key.toLowerCase()) {
    case 'arrowleft': arrive(index-1);break;
    case 'arrowright': arrive(index+1);break;
    case 'a': nudge(12,0);break;
    case 'd': nudge(-12,0);break;
    case 'w': nudge(0,12);break;
    case 's': nudge(0,-12);break;
    case ' ': walk();break;
    default:return;
  }
  e.preventDefault();
});
landscape.innerHTML=sceneArt(stops[index].id);fieldwork.enter(stops[index].id);paint();drawCamera();
