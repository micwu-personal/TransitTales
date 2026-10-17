import { copy, destinationColor, destinationIcon, landingName } from './locale';
import { type Point, type Zone } from './model';
import { experienceCopy } from './experience-copy';
import { type MallSnapshot } from './view';
import { issueText, shopperLabel } from './feedback';
import { skyCopy, passengerNeeds } from './sky-copy';
export interface MallRenderer { mount(host:HTMLElement,onLanding:(p:Point)=>void,onPiece:(id:string)=>void):void; render(view:MallSnapshot):void; dispose():void }
const project=(p:Point)=>({x:145+p.x*108,y:556-p.y*126});
const coords=(p:Point)=>{const q=project(p);return `${q.x},${q.y}`;};

// The zone describes blocked travel, not a floor slab: root its headroom gauge on the landing below it.
export function clearanceCutaway(zone: Zone, landings: readonly Point[], floor=Math.floor(zone.y)): { anchors: Point[]; floor: number; roof: number } {
 const matchingDepth=landings.filter(p=>zone.z===undefined&&zone.d===undefined||((p.z??0)>=(zone.z??0)&&(p.z??0)<(zone.z??0)+(zone.d??1)));
 const anchors=matchingDepth.filter(p=>p.y===floor&&p.x>zone.x&&p.x<zone.x+zone.w).map(p=>({...p}));
 if(!anchors.length){
  const candidates=matchingDepth.filter(p=>p.y===floor).sort((a,b)=>Math.abs(a.x-zone.x-zone.w/2)-Math.abs(b.x-zone.x-zone.w/2));
  if(candidates[0])anchors.push({...candidates[0]});
 }
 return {anchors,floor,roof:floor+Math.min(.62,Math.max(.44,zone.y+zone.h-floor))};
}

export function clearanceCutaways(zone: Zone, landings: readonly Point[]): ReturnType<typeof clearanceCutaway>[] {
 const result: ReturnType<typeof clearanceCutaway>[]=[];
 for(let floor=Math.floor(zone.y);floor<Math.ceil(zone.y+zone.h);floor++){
  const cutaway=clearanceCutaway(zone,landings,floor);if(cutaway.anchors.length)result.push(cutaway);
 }
 return result;
}

export function clearanceSvgMarkup(zone: Zone, landings: readonly Point[], label: string): string {
 return clearanceCutaways(zone,landings).map(cutaway=>{
 const a=project({x:zone.x,y:cutaway.roof}),base=project({x:zone.x,y:cutaway.floor}),w=zone.w*108,h=base.y-a.y;
 const coordinate=cutaway.anchors.map(landingName).join(' / '),description=`${coordinate} ↑ · ${label}`;
 const gaugeX=a.x-9,signX=a.x+w+38,signY=a.y+h/2,pillWidth=Math.max(76,coordinate.length*8+32);
 return `<g class="mall-clearance-cutaway" data-clearance-landings="${coordinate}" role="img" aria-label="${description}"><title>${description}</title><path d="M${a.x} ${a.y}h${w}l9-8h-${w}z" fill="#f2e6bd" stroke="#957041" stroke-width="2"/><path d="M${a.x} ${a.y}h${w}v9h-${w}z" fill="url(#mall-canopy)" stroke="#957041" stroke-width="2"/><path d="M${a.x+w-3} ${a.y+9}V${base.y}" stroke="#b28f61" stroke-width="3"/><path d="M${gaugeX} ${a.y+9}V${base.y}m-5 0h10m-10 ${9-h}h10" fill="none" stroke="#966d36" stroke-width="2"/>${cutaway.anchors.map(p=>{const q=project(p);return `<path d="M${q.x} ${q.y-4}L${signX-18} ${signY}" fill="none" stroke="#a44834" stroke-width="2"/><circle cx="${q.x}" cy="${q.y}" r="13" fill="none" stroke="#a44834" stroke-width="2" stroke-dasharray="3 3"/>`;}).join('')}<g transform="translate(${signX} ${signY})"><circle r="17" fill="#fcf5df" stroke="#a44834" stroke-width="2"/><ellipse cy="-3" rx="5" ry="7" fill="#d7a64e"/><path d="M0 4l-3 8M-11-11l22 22" stroke="#a44834" stroke-width="2"/><rect x="${-pillWidth/2}" y="22" width="${pillWidth}" height="22" rx="4" fill="#fcf5df" stroke="#a44834"/><text x="0" y="38" text-anchor="middle" fill="#784031" font-size="13" font-weight="700">${coordinate} ↑</text></g></g>`;
  }).join('');
 }
const plant=(x:number,y:number,size=1)=>`<g transform="translate(${x} ${y}) scale(${size})"><ellipse cx="4" cy="7" rx="22" ry="7" fill="#476f5a" opacity=".16"/><path d="M-13-10h27l-4 20h-19z" fill="#c19269"/><path d="M0-9v-40M0-20q-28-28-25-32 27 3 25 22M0-29q25-30 28-26 2 26-28 31M0-38q-6-27 0-30 14 18 0 30" fill="#598367" stroke="#466f53" stroke-width="2"/></g>`;
function scenery():string {
 let floors='';for(let f=0;f<4;f++){const y=556-f*126;floors+=`<g><path d="M74 ${y+11}H920l28-19H102z" fill="#fcf6df"/><path d="M74 ${y+11}H920v14H74z" fill="#bcbba1"/><path d="M920 ${y+11}l28-19v14l-28 19z" fill="#879b8c"/><path d="M106 ${y-3}H918" stroke="#e4d7b8" stroke-width="3"/><path d="M834 ${y-77}h83v71h-83z" fill="${['#ad6d51','#73979a','#bd9b63','#7a9370'][f]}"/><path d="M841 ${y-67}h66v51h-66z" fill="#c6dfd3"/><path d="M865 ${y-67}v51m20-51v51" stroke="#f8edd2" stroke-width="3"/><path d="M828 ${y-82}h92v10h-92z" fill="#f3e3bd"/><path d="M839 ${y-7}h72" stroke="#69817a" stroke-width="4"/>${plant(807,y-5,.55)}</g>`;}
 let rafters='';for(let x=110;x<920;x+=72)rafters+=`<path d="M${x} 112l23-53v39l-23 55" fill="none" stroke="#d7d9bc" stroke-width="3"/>`;
 return `<defs><linearGradient id="mall-sky" x2="0" y2="1"><stop stop-color="#bad9d0"/><stop offset="1" stop-color="#e3e8cc"/></linearGradient><linearGradient id="mall-wall" x2="1" y2="1"><stop stop-color="#f4efdc"/><stop offset="1" stop-color="#e3ddc1"/></linearGradient><pattern id="mall-canopy" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="14" height="14" fill="#f4da9e"/><rect width="5" height="14" fill="#b89056"/></pattern><filter id="mall-shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="9"/></filter></defs>
 <g aria-hidden="true" class="architecture"><rect width="1000" height="650" fill="url(#mall-sky)"/><path d="M0 607q255-35 507 0t493-4v47H0z" fill="#abc3ac"/><ellipse cx="505" cy="614" rx="448" ry="20" fill="#57786a" opacity=".22" filter="url(#mall-shadow)"/><path d="M72 150l30-39h842v458l-30 32H72z" fill="#b7bba0"/><path d="M74 150H920v439H74z" fill="url(#mall-wall)"/><path d="M920 150l28-38v459l-28 30z" fill="#929f8c"/><path d="M109 158h687v374H109z" fill="#e9e9d5"/>
 <path d="M76 151l28-51h843l-27 51z" fill="#bed6ca"/><path d="M74 137l28-49h846v14H103l-27 49z" fill="#557969"/><path d="M74 138H920v14H74z" fill="#789582"/>${rafters}<path d="M99 108h833M86 127h835" stroke="#ecedd6" stroke-width="3"/>
 <path d="M61 151h21v449H61zM914 151h18v449h-18z" fill="#c7cbb0"/><path d="M61 151h7v449h-7zM914 151h5v449h-5z" fill="#eff0d4"/>${floors}
 <path d="M494 151v37m-30 0h60l-9 10h-42zM265 151v31m-24 0h48l-7 10h-34zM709 151v45m-24 0h48l-7 10h-34z" fill="#c6a775" stroke="#927d5a" stroke-width="2"/>
 <path d="M47 602h903l25 12H74z" fill="#e6d9b5"/><path d="M74 614h900v11H74z" fill="#879c83"/>
 ${plant(46,593,1.1)}${plant(955,588,1.3)}${plant(879,81,.6)}
 <g transform="translate(838 573)"><rect width="73" height="16" rx="3" fill="#b88053"/><path d="M8 16v14m57-14v14" stroke="#786e50" stroke-width="4"/><path d="M0 2h73m-73 5h73m-73 5h73" stroke="#e3b37e"/></g>
 <path d="M107 72h63v13h-63z" fill="#e9efd7"/><path d="M116 60v12m19-12v12m18-12v12" stroke="#578172" stroke-width="4"/>
 </g><g id="mall-geometry"></g><g id="mall-routes" pointer-events="none"></g><g id="mall-people" pointer-events="none"></g><g id="mall-landings"></g><g id="mall-clearance" pointer-events="none"></g>`;
}
function pieceMarkup(p:MallSnapshot['pieces'][number],v:MallSnapshot,projection:(p:Point)=>Point=project):string {
 const a=projection(p.a),b=projection(p.b),chosen=v.selected===p.id,t=copy[v.language];
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
 const arrows=`<path d="M${len*.55-7} -25l10 5-10 5" fill="none" stroke="#284d47" stroke-width="2.5"/>`;
 const body=p.type==='elevator'?`<path d="M-18 0H18V${len}H-18z" fill="#c3d5cd" stroke="#6b8f7e" stroke-width="2" transform="rotate(-90)"/><path d="M0 0H${len}" stroke="#789988" stroke-width="3"/><rect x="${len*.45-20}" y="-20" width="40" height="40" rx="3" fill="#e4eddc" stroke="#436d5c" stroke-width="2"/><path d="M${len*.45} -18v36" stroke="#9bb4a0"/>`:
 `<path d="M0 0H${len}v13H0z" fill="${p.type==='bridge'?'#b8976e':'#698b7c'}"/><path d="M0-7H${len}" stroke="#e8e8cc" stroke-width="13"/><path class="moving-steps" d="M9-7H${len-9}" stroke="#6b8171" stroke-width="10" stroke-dasharray="2 9"/><path d="M0-24H${len}" stroke="#4c7466" stroke-width="5" stroke-linecap="round"/><path d="M9-24v16m${len-18}-16v16" stroke="#90b1a1" stroke-width="2"/><path d="M0-22H${len}" stroke="#bcdad0" stroke-width="2"/>`;
 return `<g class="mall-piece ${chosen?'is-selected':''}" data-piece="${p.id}" role="button" tabindex="${v.building?'0':'-1'}" aria-label="${t[p.type]} ${landingName(p.a)} → ${landingName(p.b)}" aria-pressed="${chosen}"><path d="M${a.x} ${a.y+7}L${b.x} ${b.y+7}" stroke="#5c7564" stroke-width="23" opacity=".15"/><g transform="translate(${a.x} ${a.y}) rotate(${angle})">${body}${arrows}</g><path class="piece-focus" d="M${a.x} ${a.y-4}L${b.x} ${b.y-4}" stroke="${chosen?'#b14d37':'transparent'}" stroke-width="5" fill="none"/><path d="M${a.x} ${a.y-10}L${b.x} ${b.y-10}" stroke="transparent" stroke-width="44" fill="none"/></g>`;
}
const escapeSvg=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const depthOf=(p:Point)=>p.z??0;
function skyProjection(landings:readonly Point[]):(p:Point)=>Point {
 const raw=(p:Point)=>({x:p.x*84+depthOf(p)*108,y:p.x*24-p.y*100-depthOf(p)*54});
 const points=landings.map(raw),minX=Math.min(0,...points.map(p=>p.x)),maxX=Math.max(84,...points.map(p=>p.x));
 const minY=Math.min(0,...points.map(p=>p.y)),maxY=Math.max(0,...points.map(p=>p.y));
 const scale=Math.min(760/(maxX-minX+84),460/(maxY-minY+100));
 return p=>{const q=raw(p);return {x:100+(q.x-minX+42)*scale,y:100+(q.y-minY+70)*scale};};
}
function skyScene(v:MallSnapshot,depth:number):string {
 const t=copy[v.language],d=skyCopy[v.language],projection=skyProjection(v.puzzle.landings);
 const point=(p:Point)=>{const q=projection(p);return `${q.x},${q.y}`;};
 const polygon=(points:Point[],fill:string,extra='')=>`<polygon points="${points.map(point).join(' ')}" fill="${fill}" stroke="#6b8f88" stroke-width="1.5" ${extra}/>`;
 let terraces='';
 for(const z of [2,1,0]) {
  const levels=[...new Set(v.puzzle.landings.filter(p=>depthOf(p)===z).map(p=>p.y))].sort((a,b)=>a-b);
  for(const y of levels){
   const nodes=v.puzzle.landings.filter(p=>depthOf(p)===z&&p.y===y),left=Math.min(...nodes.map(p=>p.x))-.45,right=Math.max(...nodes.map(p=>p.x))+.45;
   const corners=[{x:left,y,z:z-.35},{x:right,y,z:z-.35},{x:right,y,z:z+.35},{x:left,y,z:z+.35}];
   terraces+=`<g class="sky-terrace" data-depth="${z}" opacity="${z===depth?1:.48}">${polygon(corners,['#f4e1bd','#d2e8de','#cbdde9'][z])}${polygon([corners[0],corners[1],{...corners[1],y:y-.13},{...corners[0],y:y-.13}],['#b89366','#729b8a','#7894aa'][z])}${polygon([corners[1],corners[2],{...corners[2],y:y-.13},{...corners[1],y:y-.13}],'#71918a')}`;
   const a=projection({x:left,y:y+.22,z:z+.34}),b=projection({x:right,y:y+.22,z:z+.34});
   terraces+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#5e827f" stroke-width="3"/><path d="M${a.x} ${a.y+14}L${b.x} ${b.y+14}" stroke="#f5ffff" opacity=".75" stroke-width="7"/>${plant(b.x-9,b.y+9,.4)}<text x="${a.x-9}" y="${a.y+18}" text-anchor="end" fill="#284f50" font-size="14" font-weight="700">${escapeSvg([d.front,d.middle,d.rear][z])} · ${y+1}</text></g>`;
  }
  if(levels.length){
   const top=levels[levels.length-1],nodes=v.puzzle.landings.filter(p=>depthOf(p)===z&&p.y===top),left=Math.min(...nodes.map(p=>p.x))-.3,right=Math.max(...nodes.map(p=>p.x))+.3,roof=top+.35+z*.18;
   const ridge=[{x:left,y:roof,z:z-.3},{x:right,y:roof,z:z-.3},{x:right-.3,y:roof+.17,z:z+.3},{x:left+.3,y:roof+.17,z:z+.3}];
   terraces+=`<g class="sky-stepped-roof" data-depth="${z}">${polygon(ridge,z===2?'#a8d7df':z===1?'#6e9e95':'#92b47b','opacity=".7"')}${polygon([ridge[0],ridge[1],{...ridge[1],y:top+.12},{...ridge[0],y:top+.12}],'#dbecea','opacity=".5"')}</g>`;
  }
 }
 const zoneMarkup=(zone:Zone,roof:boolean)=>{
  const depths=zone.z===undefined&&zone.d===undefined?[0,1,2]:[0,1,2].filter(z=>z>=(zone.z??0)&&z<(zone.z??0)+(zone.d??1));
  return depths.flatMap(z=>{
   const cutaways=roof?clearanceCutaways({...zone,z,d:1},v.puzzle.landings):[{floor:zone.y,roof:zone.y+zone.h,anchors:[] as Point[]}];
   return cutaways.map(cutaway=>{
   const y=cutaway.roof;
   const corners=[{x:zone.x,y,z:z-.3},{x:zone.x+zone.w,y,z:z-.3},{x:zone.x+zone.w,y,z:z+.3},{x:zone.x,y,z:z+.3}];
   const a=projection({x:zone.x+zone.w/2,y,z});
   const anchors=cutaway.anchors;
   const walls=roof?'':polygon([corners[0],corners[1],{...corners[1],y:zone.y},{...corners[0],y:zone.y}],'#64886a')+polygon([corners[1],corners[2],{...corners[2],y:zone.y},{...corners[1],y:zone.y}],'#749873');
   const label=roof?`${anchors.map(landingName).join(' / ')} ↑ · ${experienceCopy[v.language].lowRoof}`:t.clearanceLegend;
   return `<g class="${roof?'mall-clearance-cutaway':'sky-garden'}" data-zone-depth="${z}" ${roof?`data-clearance-landings="${escapeSvg(anchors.map(landingName).join(' / '))}"`:''} role="img" aria-label="${escapeSvg(label)}" opacity="${z===depth?1:.55}"><title>${escapeSvg(label)}</title>${walls}${polygon(corners,roof?'url(#sky-canopy)':'#98b98a')}${roof?anchors.map(p=>{const b=projection(p);return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#a44834" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${b.x}" cy="${b.y}" r="15" fill="none" stroke="#a44834" stroke-width="2"/>`;}).join('')+`<text x="${a.x}" y="${a.y-10}" text-anchor="middle" fill="#8c3d2b" font-size="14">${escapeSvg(anchors.map(landingName).join(' / '))} ↑</text>`:plant(a.x,a.y,.55)}</g>`;
   });
  }).join('');
 };
 const landings=v.puzzle.landings.map(p=>{
  const a=projection(p),active=depthOf(p)===depth,first=!!v.first&&v.first.x===p.x&&v.first.y===p.y&&depthOf(v.first)===depthOf(p),name=escapeSvg(landingName(p));
  if(!active)return `<g class="sky-inactive-landing ${first?'first-landing':''}" data-depth="${depthOf(p)}" pointer-events="none"><circle cx="${a.x}" cy="${a.y}" r="${first?13:5}" fill="${first?'#b14d37':'#6b8f88'}" opacity="${first?1:.5}"/>${first?`<text x="${a.x}" y="${a.y+28}" text-anchor="middle" fill="#8c3d2b" font-size="16" font-weight="700">${t.selected}: ${name}</text>`:''}</g>`;
  return `<g data-landing="${p.x},${p.y},${depthOf(p)}" data-depth="${depth}" class="mall-landing ${first?'first-landing':''}" role="button" tabindex="${v.building?'0':'-1'}" aria-disabled="${!v.building}" aria-label="${escapeSvg(`${t.landing} ${landingName(p)} · ${[d.front,d.middle,d.rear][depth]}`)}" aria-pressed="${first}" style="touch-action:manipulation"><circle class="landing-hit" cx="${a.x}" cy="${a.y}" r="24"/><circle class="landing-dot" cx="${a.x}" cy="${a.y}" r="8"/><text x="${a.x}" y="${a.y+30}" text-anchor="middle">${name}</text></g>`;
 }).join('');
 const signs=v.puzzle.requests.flatMap(r=>[{p:r.goal,text:`${destinationIcon[r.destination]} ${t[r.destination]}`,color:destinationColor[r.destination]},{p:r.start,text:`${r.need?passengerNeeds[v.language][r.need].icon+' '+passengerNeeds[v.language][r.need].label+' · ':''}${t.departure}`,color:'#345f60'}]).filter(s=>depthOf(s.p)===depth).map(s=>{
  const a=projection(s.p),width=Math.min(250,Math.max(80,s.text.length*9));
  return `<g pointer-events="none"><rect x="${a.x-width/2}" y="${a.y-72}" width="${width}" height="29" rx="7" fill="${s.color}"/><text x="${a.x}" y="${a.y-52}" text-anchor="middle" fill="#fff8e5" font-size="14" ${s.text.length*9>width?`textLength="${width-14}" lengthAdjust="spacingAndGlyphs"`:''}>${escapeSvg(s.text)}</text><path d="M${a.x} ${a.y-42}v16" stroke="${s.color}" stroke-width="2"/></g>`;
 }).join('');
 return `<defs><linearGradient id="sky-atrium-sky" x2="0" y2="1"><stop stop-color="#b4d9e5"/><stop offset="1" stop-color="#f8ecd0"/></linearGradient><pattern id="sky-canopy" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="14" height="14" fill="#f4da9e"/><rect width="5" height="14" fill="#b89056"/></pattern></defs><g class="sky-atrium-architecture" aria-hidden="true" pointer-events="none"><rect width="1000" height="720" fill="url(#sky-atrium-sky)"/><path d="M0 580Q170 500 340 560T690 545T1000 540V720H0Z" fill="#a9c3b8"/><path d="M0 635Q260 550 550 635T1000 615V720H0Z" fill="#7caa99"/><ellipse cx="510" cy="648" rx="390" ry="32" fill="#345f60" opacity=".15"/><path d="M56 90q30-26 65 0h65M755 55q40-30 75 0h75" fill="none" stroke="#f6ffff" stroke-width="15" stroke-linecap="round"/>${terraces}${plant(56,658,1.2)}${plant(935,635,1.4)}</g><g id="mall-geometry">${v.puzzle.obstacles.map(z=>zoneMarkup(z,false)).join('')}${[...v.pieces].sort((a,b)=>(depthOf(b.a)+depthOf(b.b))-(depthOf(a.a)+depthOf(a.b))).map(p=>pieceMarkup(p,v,projection)).join('')}</g><g id="mall-routes" pointer-events="none">${v.routes.filter(r=>r.ready).map(r=>`<polyline points="${r.points.map(point).join(' ')}" transform="translate(0 -18)" fill="none" stroke="${destinationColor[r.destination]}" stroke-width="3" stroke-dasharray="5 7" opacity=".7"/>`).join('')}</g><g id="mall-clearance" pointer-events="none">${v.puzzle.lowCeilings.map(z=>zoneMarkup(z,true)).join('')}</g><g id="mall-people" pointer-events="none"></g><g id="mall-landings">${landings}${signs}</g><g pointer-events="none"><rect x="24" y="15" width="952" height="42" rx="12" fill="#fdf8e9" opacity=".95"/><text x="45" y="43" fill="#345f60" font-size="19" font-weight="700">${escapeSvg(`${d.depth}: ${[d.front,d.middle,d.rear][depth]} · ${v.first?`${t.selected}: ${landingName(v.first)} →`:'F / M / R'}`)}</text></g>`;
}
function skyPeople(v:MallSnapshot):string {
 const projection=skyProjection(v.puzzle.landings),t=copy[v.language];
 return [...v.riders].sort((a,b)=>depthOf(b.point)-depthOf(a.point)).map((r,i)=>{
  const a=projection(r.point),need=r.need,needText=need?passengerNeeds[v.language][need].label:'',label=`${shopperLabel(v.language,r)}${needText?' · '+needText:''} · ${r.stuck?issueText(v.language,r.issues):r.arrived?t.delivered:v.running?t.running:t.ready}`;
  return `<g class="shopper ${r.arrived?'arrived':''} ${r.stuck?'is-unhappy':''}" data-shopper="${r.id}" data-depth="${depthOf(r.point)}" ${need?`data-need="${need}"`:''} transform="translate(${a.x+(i%3-1)*9} ${a.y-12})" role="img" aria-label="${escapeSvg(label)}"><title>${escapeSvg(label)}</title><ellipse cy="13" rx="11" ry="4" fill="#345f60" opacity=".2"/><circle cy="-24" r="6" fill="#b8805a"/><path d="M-7-16q7-4 14 0v18H-7z" fill="${destinationColor[r.destination]}"/><path d="M-3 2v10m6-10v10M-7-12l-5 10M7-12l5 10" stroke="#36564b" stroke-width="3" stroke-linecap="round"/>${r.wheelchair?'<circle cy="5" r="11" fill="none" stroke="#345f60" stroke-width="3"/>':''}${r.balloon?'<path d="M9-8L22-39" stroke="#8a7654"/><ellipse cx="22" cy="-49" rx="11" ry="14" fill="#d7a64e"/>':''}${need?`<g class="sky-passenger-need"><rect x="10" y="-31" width="29" height="29" rx="7" fill="#fff8e5" stroke="#345f60"/><text x="24" y="-10" text-anchor="middle" font-size="20">${passengerNeeds[v.language][need].icon}</text></g>`:''}${r.arrived?'<text y="-40" text-anchor="middle" font-size="23" fill="#345f60">♪</text>':r.stuck?'<text x="-18" y="-29" fill="#983e2d" font-size="24" font-weight="700">!</text>':''}</g>`;
 }).join('');
}
export function createSvgRenderer():MallRenderer {
 let host:HTMLElement|null=null,svg:SVGSVGElement|null=null,last='',pointerStart:{id:number;x:number;y:number;target:Element|null}|null=null,landingCallback:(p:Point)=>void, pieceCallback:(id:string)=>void;
 const activationKey=(target:Element|null)=>target?['data-landing','data-piece','data-depth-select'].map(name=>`${name}:${target.getAttribute(name)??''}`).join('|'):'';
 let pendingClick:{id:number;time:number;x:number;y:number;key:string}|null=null;
 const clearPendingClick=()=>{pendingClick=null;};
 const suppressPointerClick=(event:Event)=>{
  if(!pendingClick)return;
  const click=event as PointerEvent,elapsed=event.timeStamp-pendingClick.time;
  if(click.isTrusted&&click.detail===0&&!click.pointerType)return;
  if(!(elapsed>=0&&elapsed<=700))return;
  const target=(event.target as Element).closest('[data-landing],[data-piece],[data-depth-select]');
  if(click.pointerId!==pendingClick.id&&activationKey(target)!==pendingClick.key&&!(Math.hypot(click.clientX-pendingClick.x,click.clientY-pendingClick.y)<=12))return;
  pendingClick=null;event.preventDefault();event.stopImmediatePropagation();return true;
 };
 let currentView:MallSnapshot|null=null,selectedDepth=0,puzzleId='',sky=false;
 const renderSky=(v:MallSnapshot)=>{
  if(!svg||!host)return;
  const d=skyCopy[v.language],controls=host.querySelector<HTMLElement>('#mall-depth-controls')!;
  controls.hidden=false;controls.setAttribute('aria-label',d.depth);svg.setAttribute('data-selected-depth',String(selectedDepth));
  const signature=JSON.stringify([v.puzzle,v.pieces,v.language,v.first,v.selected,v.building,selectedDepth]);
  if(signature!==last){
   last=signature;const focused=document.activeElement,landing=focused?.getAttribute('data-landing'),piece=focused?.getAttribute('data-piece'),layer=focused?.getAttribute('data-depth-select');
   controls.innerHTML=[d.front,d.middle,d.rear].map((label,z)=>`<button type="button" data-depth-select="${z}" aria-pressed="${z===selectedDepth}" aria-describedby="mall-depth-help" style="min-width:100px;min-height:44px;padding:8px 16px;touch-action:manipulation;border:2px solid ${z===selectedDepth?'#b14d37':'#6b8f88'};border-radius:10px;background:${z===selectedDepth?'#fff0d0':'#f4f6e9'};color:#284f50;font-weight:700">   ${escapeSvg(label)}</button>`).join('')+`<p id="mall-depth-help" style="flex-basis:100%;font-size:12px;line-height:1.5;margin:0;color:#345f60">${escapeSvg(d.help)}</p>`;
   svg.innerHTML=skyScene(v,selectedDepth);
   const selector=landing?`[data-landing="${landing}"]`:piece?`[data-piece="${piece}"]`:layer?`[data-depth-select="${layer}"]`:null;
   if(selector)host.querySelector<SVGElement|HTMLElement>(selector)?.focus();
  }
  svg.querySelector('#mall-people')!.innerHTML=skyPeople(v);
 };
 const act=(event:Event)=>{
 const pointerType='pointerType' in event?String(event.pointerType):'';
 const target=(event.target as Element).closest('[data-landing],[data-piece],[data-depth-select]');
 if(event.type==='pointercancel'){pointerStart=null;return;}
 if(event.type==='pointerdown'){
  clearPendingClick();const pointer=event as PointerEvent;
  if(pointerType!=='mouse'&&pointer.isPrimary&&pointer.button===0)pointerStart={id:pointer.pointerId,x:pointer.clientX,y:pointer.clientY,target};
  return;
 }
 if(event.type==='pointerup'){
  const pointer=event as PointerEvent,start=pointerStart;pointerStart=null;
  if(pointerType==='mouse'||!pointer.isPrimary||pointer.button!==0||!start||start.id!==pointer.pointerId||start.target!==target||Math.hypot(pointer.clientX-start.x,pointer.clientY-start.y)>12)return;
  if(!target)return;
  pendingClick={id:pointer.pointerId,time:event.timeStamp,x:pointer.clientX,y:pointer.clientY,key:activationKey(target)};event.preventDefault();
 }else if(event.type==='click'&&suppressPointerClick(event))return;
 if(!target)return;
 if(event instanceof KeyboardEvent && event.key!=='Enter'&&event.key!==' ')return;
 if(event instanceof KeyboardEvent)event.preventDefault();
 if(target.hasAttribute('data-depth-select')){
  if(!sky||!currentView)return;
  selectedDepth=Number(target.getAttribute('data-depth-select'));renderSky(currentView);return;
 }
 if(sky&&!currentView?.building)return;
 if(target.hasAttribute('data-landing')){const values=target.getAttribute('data-landing')!.split(',').map(Number),[x,y,z]=values;if(sky&&z!==selectedDepth)return;landingCallback(values.length===3?{x,y,z}:{x,y});}else pieceCallback(target.getAttribute('data-piece')!);
 };
 return {mount(h,onLanding,onPiece){host=h;landingCallback=onLanding;pieceCallback=onPiece;host.innerHTML=`<div id="mall-depth-controls" role="group" hidden style="display:flex;gap:8px;flex-wrap:wrap;padding:8px"></div><svg id="escalator-board" viewBox="0 0 1000 650" role="group">${scenery()}</svg>`;svg=host.querySelector('svg');host.addEventListener('pointerdown',act);host.addEventListener('pointerup',act);host.addEventListener('pointercancel',act);host.addEventListener('click',act);host.addEventListener('keydown',act);
 // Redrawing on pointerup can retarget the generated click to a newly revealed control outside the SVG.
 document.addEventListener?.('pointerdown',clearPendingClick,true);document.addEventListener?.('click',suppressPointerClick,true);
 },render(v){if(!svg||!host)return;currentView=v;const t=copy[v.language];svg.setAttribute('aria-label',t.mall);svg.classList.toggle('is-running',v.running&&!v.reducedMotion);svg.classList.toggle('is-celebrating',v.celebrating&&!v.reducedMotion);
 const nextSky=v.puzzle.building==='sky-atrium';
 if(sky!==nextSky){sky=nextSky;last='';svg.setAttribute('viewBox',sky?'0 0 1000 720':'0 0 1000 650');if(!sky)svg.innerHTML=scenery();}
 if(puzzleId!==v.puzzle.id){puzzleId=v.puzzle.id;selectedDepth=0;last='';}
 host.querySelector<HTMLElement>('#mall-depth-controls')!.hidden=!sky;
 if(sky){svg.setAttribute('aria-label',`${skyCopy[v.language].group2} · ${skyCopy[v.language].depth}`);renderSky(v);return;}
 const signature=JSON.stringify([v.puzzle.id,v.pieces,v.language,v.first,v.selected,v.building]);
 if(signature!==last){last=signature;const focused=document.activeElement;const focusedLanding=focused?.getAttribute('data-landing'),focusedPiece=focused?.getAttribute('data-piece');
 svg.querySelector('#mall-geometry')!.innerHTML=v.puzzle.obstacles.map(z=>{const a=project({x:z.x,y:z.y+z.h});return `<g aria-hidden="true"><rect x="${a.x}" y="${a.y}" width="${z.w*108}" height="${z.h*126}" rx="14" fill="#8faa78"/><path d="M${a.x+9} ${a.y+z.h*126-9}h${z.w*108-18}" stroke="#667e56" stroke-width="8"/>${plant(a.x+z.w*54,a.y+z.h*63,.8)}</g>`;}).join('')+v.pieces.map(p=>pieceMarkup(p,v)).join('');
 svg.querySelector('#mall-clearance')!.innerHTML=v.puzzle.lowCeilings.map(z=>clearanceSvgMarkup(z,v.puzzle.landings,experienceCopy[v.language].lowRoof)).join('');
 svg.querySelector('#mall-landings')!.innerHTML=v.puzzle.landings.map(p=>{const a=project(p),first=!!v.first&&v.first.x===p.x&&v.first.y===p.y;return `<g data-landing="${p.x},${p.y}" id="landing-${landingName(p)}" class="mall-landing ${first?'first-landing':''}" role="button" tabindex="${v.building?'0':'-1'}" aria-disabled="${!v.building}" aria-label="${t.landing} ${landingName(p)}" aria-pressed="${first}"><circle class="landing-hit" cx="${a.x}" cy="${a.y}" r="24"/><circle class="landing-dot" cx="${a.x}" cy="${a.y}" r="8"/><text x="${a.x}" y="${a.y+30}" text-anchor="middle">${landingName(p)}</text></g>`;}).join('')+v.puzzle.requests.map(r=>{const a=project(r.goal),b=project(r.start);if(v.language==='mn-Mong-CN')return `<g aria-hidden="true"><rect x="${a.x+27}" y="${a.y-99}" width="27" height="106" rx="6" fill="${destinationColor[r.destination]}"/><text x="${a.x+40}" y="${a.y-93}" class="goal-label">${t[r.destination]}</text><text x="${b.x-36}" y="${b.y-94}" class="entrance-label">${t.departure}</text></g>`;return `<g aria-hidden="true"><rect x="${a.x-39}" y="${a.y-73}" width="78" height="29" rx="6" fill="${destinationColor[r.destination]}"/><text x="${a.x}" y="${a.y-53}" text-anchor="middle" class="goal-label">${destinationIcon[r.destination]} ${t[r.destination]}</text><path d="M${a.x} ${a.y-43}v17" stroke="${destinationColor[r.destination]}" stroke-width="2"/><text x="${b.x}" y="${b.y-42}" text-anchor="middle" class="entrance-label">${r.wheelchair?'♿ ':''}${r.balloon?'♧ ':''}${!r.wheelchair&&!r.balloon?'↓ ':''}${t.departure}</text></g>`;}).join('');
 svg.querySelector('#mall-routes')!.innerHTML=v.routes.filter(r=>r.ready).map((r,i)=>`<polyline points="${r.points.map(coords).join(' ')}" fill="none" stroke="${destinationColor[r.destination]}" stroke-width="3" stroke-dasharray="5 7" transform="translate(0 ${-33-i*5})" opacity=".7"/>`).join('');
  if(focusedLanding||focusedPiece){const selector=focusedLanding?`[data-landing="${focusedLanding}"]`:`[data-piece="${focusedPiece}"]`;svg.querySelector<SVGElement>(selector)?.focus();}
  }
  svg.querySelector('#mall-people')!.innerHTML=v.riders.map((r,i)=>{const a=project(r.point),offset=(i%3-1)*11;return `<g transform="translate(${a.x+offset} ${a.y-12})" class="shopper ${r.arrived?'arrived':''} ${r.stuck?'is-unhappy':''}" data-shopper="${r.id}" role="img" aria-label="${shopperLabel(v.language,r)} · ${r.stuck?`${experienceCopy[v.language].unhappy}: ${issueText(v.language,r.issues)}`:r.arrived?t.delivered:v.building?t.ready:v.running?t.running:t.paused}"><title>${shopperLabel(v.language,r)}${r.stuck?` · ${issueText(v.language,r.issues)}`:''}</title><ellipse cx="0" cy="12" rx="10" ry="3" fill="#446653" opacity=".2"/><circle cy="${r.wheelchair?-23:-24}" r="6" fill="#b8805a"/><path d="M-6-27q6-9 12 0" fill="#3d5143"/><path d="M-7-16q7-4 14 0v17H-7z" fill="${destinationColor[r.destination]}"/>${r.wheelchair?'<circle cx="-2" cy="5" r="11" fill="#e9ead6" stroke="#345f60" stroke-width="3"/><circle cx="-2" cy="5" r="2" fill="#345f60"/><path d="M-2-5V15m-10-10H8M-10-18v18h20l5 8h7M8-5h8v11" fill="none" stroke="#345f60" stroke-width="2"/><circle cx="19" cy="11" r="3" fill="#345f60"/>':'<path d="M-3 2v10m6-10v10M-7-12l-5 10M7-12l5 10" stroke="#36564b" stroke-width="3" stroke-linecap="round"/>'}${r.balloon?'<path d="M9-8q15-12 13-25" fill="none" stroke="#8a7654"/><ellipse cx="23" cy="-49" rx="12" ry="16" fill="#d7a64e" stroke="#9f752f"/><ellipse cx="19" cy="-55" rx="3" ry="5" fill="#f5da8a"/><path d="M23-33l-3 4h6z" fill="#bf8d3e"/>':''}${r.arrived?`<text x="0" y="-35" text-anchor="middle" fill="${destinationColor[r.destination]}" font-size="23">♪</text>`:r.stuck?'<g class="shopper-problem" transform="translate(14 -43)"><circle r="13" fill="#fff7e5" stroke="#983e2d" stroke-width="2.5"/><circle cx="-4" cy="-3" r="1.5" fill="#983e2d"/><circle cx="4" cy="-3" r="1.5" fill="#983e2d"/><path d="M-5 6q5-7 10 0" fill="none" stroke="#983e2d" stroke-width="2"/><text x="15" y="5" fill="#983e2d" font-size="22" font-weight="700">!</text></g>':''}</g>`;}).join('');
 },dispose(){host?.removeEventListener('pointerdown',act);host?.removeEventListener('pointerup',act);host?.removeEventListener('pointercancel',act);host?.removeEventListener('click',act);host?.removeEventListener('keydown',act);document.removeEventListener?.('pointerdown',clearPendingClick,true);document.removeEventListener?.('click',suppressPointerClick,true);if(host)host.innerHTML='';svg=null;host=null;last='';pointerStart=null;pendingClick=null;currentView=null;selectedDepth=0;puzzleId='';sky=false;}};
}
