import { carbon, encounterFrames, expectedRemaining, frequency, GRAVITY_FRAMES, hydrogenSamples, orbitFrames, rng, type Vec } from './physics';
import type { Locale, Stop } from './stops';

const cloud = hydrogenSamples(740);
const decayRandom = rng(8142);
const lifetimes = Array.from({length:96}, () => -Math.log2(decayRandom()));
const dots = (points: Vec[], stroke: string, radius: number, opacity = .9) => points.map(([x,y]) =>
  `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius}" fill="${stroke}" opacity="${opacity}"/>`).join('');
const backdrop = '<ellipse cx="525" cy="335" rx="208" ry="179" fill="#081b26" opacity=".94" stroke="#99cfbe" stroke-opacity=".32"/>';
const ring = (x:number,y:number,r:number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#cee6d9" stroke-opacity=".26" stroke-dasharray="2 6"/>`;
const line = (points: Vec[], color: string, width = 2) => `<polyline points="${points.map(p=>p.map(x=>x.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

export class Exhibits {
  fiber = false;
  private electrons = 6;
  private neutrons = 6;
  private hydrogen = false;
  private wavelength = 1;
  private changed = false;
  private time = 0;
  private frames: Vec[][] = [];
  private frame = 0;
  private elapsed = 0;
  private run: number | undefined;
  private mode: Stop['experiment'];
  private zh = true;
  constructor(private controls:HTMLElement, private art:SVGGElement) {
    controls.addEventListener('click', e => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('button[data-exp]');
      if (!btn) return;
      switch (btn.dataset.exp) {
        case 'fiber': this.fiber = !this.fiber; break;
        case 'hydrogen': this.hydrogen = !this.hydrogen; break;
        case 'electron': this.electrons = this.electrons === 7 ? 5 : this.electrons+1; break;
        case 'isotope': this.neutrons = 13-this.neutrons; break;
        case 'wave': this.wavelength = (this.wavelength+1)%3; break;
        case 'setup': this.changed = !this.changed; this.setup(); break;
        case 'play': this.togglePlay(); return;
      }
      this.update();
    });
    controls.addEventListener('input', e => {
      const input = e.target as HTMLInputElement;
      if (input.type !== 'range') return;
      this.pause(); this.time = Number(input.value); this.update();
    });
  }
  private t(zh: string,en: string) { return this.zh ? zh : en; }
  open(mode:Stop['experiment'],loc:Locale) {
    if (mode !== this.mode) {
      this.pause(); this.mode=mode; this.changed=false; this.setup();
      this.controls.innerHTML = '';
    }
    this.zh=loc==='zh';
    this.update(true);
  }
  close() {
    this.pause(); this.mode=undefined; this.controls.innerHTML=''; this.art.innerHTML='';
  }
  pause() { if (this.run !== undefined) cancelAnimationFrame(this.run); this.run=undefined; this.elapsed=0; }
  suspend() { this.pause(); if (this.mode) this.update(); }
  private setup() {
    this.pause(); this.time=0;
    this.frames = this.mode==='gravity' ? orbitFrames(this.changed ? .45 : 0) : this.mode==='encounter' ? encounterFrames(this.changed) : [];
  }
  private togglePlay() {
    if (this.run!==undefined) { this.pause(); this.update(); return; }
    const max=this.mode==='decay' ? 4 : GRAVITY_FRAMES;
    if (this.time>=max) this.time=0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.time=max; this.update(); return; }
    this.frame=performance.now();
    const tick=(now:number) => {
      this.elapsed += Math.min(now-this.frame,100);
      this.frame=now;
      const step=this.mode==='decay' ? .1 : 1;
      const interval=this.mode==='decay' ? 125 : 65;
      if(this.elapsed>=interval) { this.elapsed%=interval; this.time=Math.min(max,Math.round((this.time+step)*10)/10); this.update(); }
      if(this.time<max) this.run=requestAnimationFrame(tick);
      else { this.pause(); this.update(); }
    };
    this.run=requestAnimationFrame(tick); this.update();
  }
  private update(rebuild=false) {
    const t = this.t.bind(this);
    const actions: [string,string][] = [];
    const action = (id:string, label:string) => actions.push([id,label]);
    let drawing='', caption='', timeLabel='', max=0;
    if (this.mode==='fiber') {
      action('fiber', this.fiber ? t('看螺旋','See helix') : t('看伸展链','See extended chain'));
      caption=this.fiber ? t('伸展构象：同一段链的另一种形状。折叠方式能改变蛋白质的性质；这不是对活猫的改造。','Extended conformation: another shape of the same chain. Folding can affect protein properties; the living cat is unchanged.') : t('螺旋构象：许多角蛋白链含有螺旋段。回到毛发站，可以对照从链到纤维的观察笔记。','Helical conformation: many keratin chains contain helical regions. Return to the fur stop to compare notes from chain to fibre.');
      const pts:Vec[]=Array.from({length:145},(_,i)=>{
        const a=i/144;
        return [370+a*310+(this.fiber?0:10*Math.cos(a*14*Math.PI)),335+(this.fiber ? 11*Math.cos(a*14*Math.PI) : 52*Math.sin(a*14*Math.PI))];
      });
      drawing=backdrop+line(pts,'#75d6b8',10)+dots(pts.filter((_,i)=>i%6===0),'#ffdc8b',4);
    } else if(this.mode==='ion' || this.mode==='cloud') {
      action('hydrogen',this.hydrogen ? t('回到碳原子','Back to carbon') : t('看氢的电子云','See hydrogen cloud'));
      if (this.hydrogen) {
        caption=t('氢的 1s 电子云：每个点是从概率分布抽取的一个可能位置。点不是许多个电子，也不是绕行轨迹。','Hydrogen 1s cloud: each dot is one possible position sampled from the probability distribution, not another electron or an orbital path.');
        drawing=backdrop+ring(525,335,40)+dots(cloud.map(([x,y])=>[525+x*38,335+y*38]),'#a4e5f3',1.6,.42)+dots([[525,335]],'#fff3bd',5);
      } else {
        action('electron', t('换电子数','Change electrons'));
        action('isotope', t('换中子数','Change neutrons'));
        const c=carbon(this.electrons,this.neutrons), charge=c.charge===0?'0':c.charge>0?'+1':'−1';
        caption=t(`碳-${c.mass}：6 个质子，${this.neutrons} 个中子，${this.electrons} 个电子，净电荷 ${charge}e。换中子改变同位素；换电子改变净电荷。`, `Carbon-${c.mass}: 6 protons, ${this.neutrons} neutrons, ${this.electrons} electrons, net charge ${charge}e. Neutrons change the isotope; electrons change the charge.`);
        const bars = (n:number,y:number,color:string) => Array.from({length:n},(_,i)=>`<rect x="${462+i*19}" y="${y}" width="13" height="23" rx="5" fill="${color}"/>`).join('');
        drawing=backdrop+bars(6,284,'#ffd68c')+bars(this.neutrons,322,'#bbd6c8')+bars(this.electrons,360,'#9cd9f4')+`<text x="525" y="260" text-anchor="middle" fill="#fff3bd" font-size="28">¹${c.mass===12?'²':'³'}C · ${charge}e</text>`;
      }
    } else if(this.mode==='wave') {
      action('wave',t('切换波长','Change wavelength'));
      const nm=[650,530,450][this.wavelength]; const color=['#ff9a84','#a5ed92','#9dbbff'][this.wavelength];
      const pts:Vec[]=Array.from({length:161},(_,i)=>[360+330*i/160,335-51*Math.sin(i/160*3*Math.PI*650/nm)]);
      drawing=backdrop+line([[360,335],[690,335]],'#597b80',1)+line(pts,color,4);
      caption=t(`可见光示意：${nm} 纳米，约 ${(frequency(nm*1e-9)/1e12).toFixed(0)} 太赫兹。曲线是一个电场分量，不是光子行进的路线。`,`Visible-light example: ${nm} nm, about ${(frequency(nm*1e-9)/1e12).toFixed(0)} THz. The curve is one electric-field component, not a photon's path.`);
    } else if(this.mode==='decay') {
      max=4; timeLabel=t('经过的半衰期','Half-lives elapsed');
      const remain=lifetimes.filter(x=>x>this.time).length;
      caption=t(`经过 ${this.time.toFixed(1)} 个半衰期：96 个模拟碳-14 原子中还剩 ${remain} 个；理论平均约 ${Math.round(lifetimes.length*expectedRemaining(this.time))} 个。暗点代表已自发衰变成氮-14 的原子。`,`${this.time.toFixed(1)} half-lives: ${remain} of 96 simulated carbon-14 nuclei remain; the expected count is about ${Math.round(lifetimes.length*expectedRemaining(this.time))}. Dim dots became nitrogen-14 by spontaneous decay.`);
      drawing=backdrop+lifetimes.map((life,i)=>dots([[426+i%12*18,272+Math.floor(i/12)*18]],life>this.time?'#ffdd91':'#537888',5)).join('');
    } else if (this.mode==='gravity' || this.mode==='encounter') {
      max=GRAVITY_FRAMES; timeLabel=t('相对时间','Model time');
      const group=this.mode==='encounter';
      action('setup', group ? (this.changed?t('拉远初始路线','Set wider pass'):t('试试近距离交会','Set close pass')) : (this.changed?t('中心天体复位','Center the mass'):t('偏移中心天体','Offset central mass')));
      caption=group ? t('两套相互引力的质量中心与无质量示踪星。近距离掠过会产生潮汐拉伸；这不是未来本星系群的预报。','Two mutually gravitating masses with massless tracer stars. A close pass can stretch the disks tidally; this is not a forecast for the Local Group.') : t('改变的是模型的初始条件，不是用力搬动真实黑洞。比较近处示踪星的轨道；整个银河系的运动不由黑洞单独决定。','This changes the model’s starting conditions, not a real black hole. Compare nearby tracer orbits; the central black hole does not control rotation throughout the Milky Way.');
      const project=([x,y]:Vec):Vec=>[525+x*(group?38:76),335+y*(group?48:60)];
      const index=Math.round(this.time), frame=this.frames[index] ?? this.frames[0];
      if (frame) {
        const prefix=group?2:1;
        const paths=[...Array(prefix).keys(),...Array.from({length:6},(_,i)=>prefix+i*7)];
        drawing=backdrop+paths.map(i=>line(this.frames.slice(Math.max(0,index-32),index+1).map(f=>project(f[i])),'#517e87',1)).join('')+
          dots(frame.slice(prefix,group?47:undefined).map(project),'#f9cf8d',2.5)+
          (group?dots(frame.slice(47).map(project),'#91e4f5',2.5):'')+dots(frame.slice(0,prefix).map(project),'#fff4d3',6);
      }
    }
    if (max) action('play',this.run===undefined?t('播放','Play'):t('暂停','Pause'));
    this.art.innerHTML=drawing;
    const buttons=actions.map(([id,label])=>`<button data-exp="${id}">${label}</button>`).join('');
    if (rebuild || !this.controls.querySelector('output')) {
      this.controls.innerHTML=`<div class="lab-actions">${buttons}</div>${max?`<input type="range" aria-label="${timeLabel}" min="0" max="${max}" step="${max===4?.1:1}" value="${this.time}">`:''}<output>${caption}</output>`;
    } else {
      const existing=Array.from(this.controls.querySelectorAll<HTMLButtonElement>('button[data-exp]'));
      if(existing.map(b=>b.dataset.exp).join()!==actions.map(([id])=>id).join()) {
        const active=(document.activeElement as HTMLElement | null)?.dataset.exp;
        this.controls.querySelector('.lab-actions')!.innerHTML=buttons;
        if(active) this.controls.querySelector<HTMLButtonElement>(`[data-exp="${active}"]`)?.focus();
      } else existing.forEach((b,i)=>{ if(b.textContent!==actions[i][1]) b.textContent=actions[i][1]; });
      const slider=this.controls.querySelector('input');
      if (slider) slider.value=String(this.time);
      const text=this.controls.querySelector('output')!;
      if (text.textContent!==caption) text.textContent=caption;
    }
  }
}
