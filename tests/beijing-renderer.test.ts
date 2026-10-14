import { describe, expect, it } from 'vitest';
import { Journey2D } from '../src/beijing/renderer2d';
import type { JourneySnapshot } from '../src/beijing/view';
function port() {
  const nodes=new Map<string,{style:{display:string};textContent:string;innerHTML:string;attributes:Map<string,string>;setAttribute:(key:string,value:string)=>void}>();
  for(const id of ['#cabin','#platform','#walkway','#board-line','#board-station','#window-motion','#walk-motion','#passengers','.scene-equivalent']) {
    const attributes=new Map<string,string>();nodes.set(id,{style:{display:''},textContent:'',innerHTML:'',attributes,setAttribute:(key,value)=>{attributes.set(key,value);}});
  }
  const svg={querySelector:(key:string)=>nodes.get(key)};
  const host={innerHTML:'',querySelector:(key:string)=>key==='svg'?svg:nodes.get(key)};
  return {host:host as unknown as HTMLElement,raw:host,nodes};
}
const snapshot:JourneySnapshot={phase:'ride',station:'甲 · A',nextStation:'乙 · B',line:'1号线 · Line 1',lineColor:'#ff0000',caption:'Travel to B',elapsed:5,progress:.5,totalMinutes:4,paused:false,reducedMotion:false,crowded:false,wheelchair:false,interrupted:false};
describe('Detached first-person 2D renderer remains a complete WebGL fallback',()=>{
  it('mounts cabin/platform/walkway scenery and renders actual station and service captions',()=>{
    const {host,raw,nodes}=port(),renderer=new Journey2D();renderer.mount(host);
    expect(raw.innerHTML).toContain('id="walkway"');expect(raw.innerHTML).toContain('id="platform"');expect(raw.innerHTML).toContain('id="cabin"');
    renderer.render(snapshot);expect(nodes.get('#cabin')!.style.display).toBe('');expect(nodes.get('#platform')!.style.display).toBe('none');
    expect(nodes.get('#board-station')!.textContent).toBe(snapshot.nextStation);expect(nodes.get('#board-line')!.textContent).toBe(snapshot.line);
    expect(nodes.get('.scene-equivalent')!.textContent).toBe(snapshot.caption);
  });
  it('switches external walks to a walkway without mutating route progress or snapshot',()=>{
    const {host,nodes}=port(),renderer=new Journey2D();renderer.mount(host);
    const walking=Object.freeze({...snapshot,phase:'walk' as const,caption:'Exit and re-enter at B'});renderer.render(walking);
    expect(nodes.get('#walkway')!.style.display).toBe('');expect(nodes.get('#cabin')!.style.display).toBe('none');expect(nodes.get('#platform')!.style.display).toBe('none');
    expect(nodes.get('#board-station')!.textContent).toBe(walking.nextStation);expect(walking.progress).toBe(.5);expect(walking.elapsed).toBe(5);
    renderer.render({...walking,phase:'stop'});expect(nodes.get('#platform')!.style.display).toBe('');expect(nodes.get('#walkway')!.style.display).toBe('none');
  });
  it('honors reduced motion and updates crowd/access figures only when state changes',()=>{
    const {host,nodes}=port(),renderer=new Journey2D();renderer.mount(host);renderer.render(snapshot);
    const passengers=nodes.get('#passengers')!.innerHTML;renderer.render({...snapshot,elapsed:10,progress:.8});expect(nodes.get('#passengers')!.innerHTML).toBe(passengers);
    renderer.render({...snapshot,reducedMotion:true,crowded:true,wheelchair:true});
    expect(nodes.get('#window-motion')!.attributes.get('transform')).toBe('translate(0 0)');expect(nodes.get('#walk-motion')!.attributes.get('transform')).toBe('translate(0 0)');
    expect(nodes.get('#passengers')!.innerHTML.match(/<ellipse/g)).toHaveLength(9);expect(nodes.get('#passengers')!.innerHTML).toContain('r="28"');
  });
  it('disposes cleanly and can remount after a presentation/lifecycle change',()=>{
    const {host,raw,nodes}=port(),renderer=new Journey2D();renderer.mount(host);renderer.render(snapshot);renderer.dispose();expect(raw.innerHTML).toBe('');
    expect(()=>renderer.render(snapshot)).not.toThrow();renderer.mount(host);renderer.render({...snapshot,phase:'complete'});
    expect(nodes.get('#platform')!.style.display).toBe('');expect(nodes.get('#board-station')!.textContent).toBe(snapshot.station);renderer.dispose();
  });
});
