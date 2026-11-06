import { describe, it, expect, vi } from 'vitest';
import { Narrator, validManifest, recordingURL, spokenLanguage, amountIds, scriptIds, numberIds, type Manifest } from '../src/economic/narration';
import catalog from '../src/economic/narration-catalog.json';
import { choiceNarration, outcomeNarration, outcomeChanges } from '../src/economic/narration-guidance';
import { createGame, getActions, getLevel, act, type GameState } from '../src/economic/model';
import { readFileSync } from 'node:fs';
const recording={file:'zh/girl/abc123.mp3',text:catalog.scripts[0].text.zh,voice:'approved',rate:'+0%',pitch:'+0Hz',durationSeconds:2,bytes:200,sha256:'a'.repeat(64),decodeVerified:true,contentReview:'pending'};
import approved from '../scripts/economic-voice-profiles.json';
const manifest:Manifest={version:1,complete:true,profiles:approved.profiles,recordings:Object.fromEntries((['zh','en','ja','mn'] as const).flatMap(language=>(['boy','girl'] as const).flatMap(gender=>catalog.scripts.map(script=>[`${language}|${gender}|${script.id}`,{...recording,file:`${language}/${gender}/abc123.mp3`,text:script.text[language],...approved.profiles[language][gender]}]))))};
function player(){return {src:'',onended:null as null|(()=>void),onerror:null as null|(()=>void),onpause:null as null|(()=>void),play:vi.fn(async()=>{}),pause:vi.fn(function(this:{onpause:null|(()=>void)}){this.onpause?.();}),removeAttribute:vi.fn(),load:vi.fn()} as unknown as HTMLAudioElement;}
const fetcher=(data:unknown)=>vi.fn(async()=>({ok:true,json:async()=>data})) as unknown as typeof fetch;
describe('local prerecorded narration contract',()=>{
  it('has stable unique ids, four real spoken texts and bounded natural number fragments',()=>{
    expect(new Set(catalog.scripts.map(s=>s.id)).size).toBe(catalog.scripts.length);
    for(const s of catalog.scripts){expect(Object.keys(s.text).sort()).toEqual(['en','ja','mn','zh']);for(const text of Object.values(s.text)){expect(text.trim().length).toBeGreaterThan(0);expect(text).not.toMatch(/[{}\d]/);}}
    expect(spokenLanguage('mn-Mong')).toBe('mn');expect(spokenLanguage('ja')).toBe('ja');
    for(const n of [0,4,100,304,9999,123456])for(const id of amountIds(n))expect(catalog.scripts.some(s=>s.id===id)).toBe(true);
  });
  it('never accepts remote, traversing or wrong-shaped recording paths',()=>{
    expect(recordingURL('/Lego/','zh/boy/hash.mp3')).toBe('/Lego/audio/economic/zh/boy/hash.mp3');
    for(const path of ['https://remote/audio.mp3','../secret.mp3','zh/boy/../../secret.mp3','zh\\boy\\hash.mp3','//host/a.mp3','zh/boy/hash.mp3?secret'])expect(recordingURL('/',path)).toBeUndefined();
    expect(validManifest(manifest)).toBe(true);expect(validManifest({...manifest,version:2})).toBe(false);expect(validManifest({...manifest,recordings:{x:recording}})).toBe(false);
  });
  it('loads only the local manifest and does not treat decoding as pronunciation certification',async()=>{
    const fetch=fetcher(manifest),n=new Narrator('/game/',vi.fn());expect(await n.load(fetch)).toBe(true);expect(fetch).toHaveBeenCalledWith('/game/audio/economic/manifest.json',{credentials:'same-origin'});expect(manifest.recordings[Object.keys(manifest.recordings)[0]].contentReview).toBe('pending');
  });
  it('plays exact catalog identity and reports missing or mismatched entries honestly',async()=>{
    const a=player(),missing=vi.fn(),n=new Narrator('/',missing,()=>a);await n.load(fetcher(manifest));const playing=n.play([catalog.scripts[0].id]);await Promise.resolve();expect(a.play).toHaveBeenCalledOnce();a.onended?.(new Event('ended'));await playing;expect(missing).not.toHaveBeenCalled();await n.play(['unknown']);expect(missing).toHaveBeenCalledOnce();
    await n.load(fetcher({...manifest,recordings:{[Object.keys(manifest.recordings)[0]]:{...recording,text:'not the catalog'}}}));await n.play([catalog.scripts[0].id]);expect(missing).toHaveBeenCalledTimes(2);
  });
  it('cancels stale queues on language, gender, stop and mute without synthesized speech',async()=>{
    const a=player(),n=new Narrator('/',vi.fn(),()=>a);await n.load(fetcher(manifest));const queue=n.play([catalog.scripts[0].id,catalog.scripts[0].id]);await Promise.resolve();n.context('ja','boy');await queue;expect(a.pause).toHaveBeenCalledOnce();expect(a.play).toHaveBeenCalledOnce();n.mute(true);await n.play([catalog.scripts[0].id]);expect(a.play).toHaveBeenCalledOnce();
    const source=readFileSync('src\\economic\\narration.ts','utf8');expect(source).not.toContain('speechSynthesis');
  });
  it('keeps traditional text vertical-lr scoped while other locales stay horizontal',()=>{
    const css=readFileSync('src\\economic\\style.css','utf8');expect(css).toContain('html[data-economic-lang="mn-Mong"]');expect(css).toContain('writing-mode:vertical-lr');expect(css).not.toContain('writing-mode:vertical-rl');
    expect(scriptIds([catalog.scripts[0].text])).toEqual([catalog.scripts[0].id]);
  });
  it('speaks signed large values, Chinese internal zeros, Japanese hundreds, and distinct foreign units',()=>{
    const spoken=(ids:string[],lang:'zh'|'en'|'ja'|'mn')=>ids.map(id=>catalog.scripts.find(s=>s.id===id)!.text[lang]).join('').replace(/[。．.\s]/g,'');
    expect(spoken(amountIds(100400,'zh'),'zh')).toBe('一千零四元');
    expect(spoken(numberIds(10004,'zh'),'zh')).toBe('一万零四');
    expect(spoken(numberIds(100040004,'zh'),'zh')).toBe('一亿零四万零四');
    expect(spoken(numberIds(100,'ja'),'ja')).toBe('百');expect(spoken(numberIds(1000,'ja'),'ja')).toBe('千');
    expect(amountIds(-100400,'zh')[0]).toBe('number.minus');expect(amountIds(100000000,'zh')).toContain('number.wan');
    expect(amountIds(150,'zh','foreign')).toContain('ui.shells');expect(amountIds(150,'zh','foreign')).toContain('ui.shell-cents');expect(amountIds(150,'zh','foreign')).not.toContain('ui.yuan');
    expect(numberIds(304,'mn')).toContain('number.300.mn-join');expect(spoken(numberIds(304,'mn'),'mn')).toContain('зуун');
    for(const lang of ['zh','en','ja','mn','mn-Mong'] as const)for(const n of [100000000,Number.MAX_SAFE_INTEGER,-123456789])for(const id of amountIds(n,lang))expect(catalog.scripts.some(s=>s.id===id),id).toBe(true);
    expect(()=>amountIds(.5)).toThrow(RangeError);expect(()=>numberIds(Infinity)).toThrow(RangeError);
  });
  it('narrates choice labels, details, disabled reasons and actual quantities, totals, rates and deadlines without committing',()=>{
    const s=createGame({children:3,gender:'girl'});let offer=getActions(s,'shop').find(o=>o.id==='buy-apple')!;const before=JSON.stringify(s),ids=choiceNarration(s,offer,'zh');expect(ids).toEqual(expect.arrayContaining(scriptIds([offer.label,offer.detail])));expect(ids).toContain('legacy.common.total');expect(ids).toContain('legacy.common.quantity');expect(JSON.stringify(s)).toBe(before);
    s.level=13;offer=getActions(s,getLevel(s).place).find(o=>o.id==='borrow')!;expect(offer.facts).toEqual(expect.arrayContaining([{id:'rate',value:0},{id:'due',value:s.day+1}]));
    s.level=14;offer=getActions(s,getLevel(s).place).find(o=>o.id==='borrow')!;expect(offer.facts).toContainEqual({id:'rate',value:1});
    s.level=20;offer=getActions(s,'shop').find(o=>o.id==='buy-foreign-souvenir')!;const foreign=choiceNarration(s,offer,'zh');expect(foreign).toContain('ui.shells');if(offer.disabled)expect(foreign).toEqual(expect.arrayContaining(scriptIds([offer.disabled])));
  });
  it('narrates actual outcome deltas rather than a future-choice label',()=>{
    const before=act(createGame({children:1,gender:'boy'}),'read-tags').state,after=act(before,'buy-apple');expect(after.ok).toBe(true);const changes=outcomeChanges(before,after.state);expect(changes.some(row=>row.value<0&&row.money==='home')).toBe(true);expect(changes.some(row=>row.value>0&&!row.money)).toBe(true);const ids=outcomeNarration(before,after.state,after.message,'zh');expect(ids).toContain('legacy.common.changes');expect(ids).toContain('legacy.common.change-down');expect(ids).toContain('legacy.common.change-up');for(const id of ids)expect(catalog.scripts.some(s=>s.id===id),id).toBe(true);
  });
  it('reuses one gesture-activated element across clips, replay and gender/language changes',async()=>{
    const a=player(),make=vi.fn(()=>a),n=new Narrator('/',vi.fn(),make);await n.load(fetcher(manifest));const ids=catalog.scripts.slice(0,2).map(s=>s.id),q=n.play(ids);expect(a.play).toHaveBeenCalledOnce();await Promise.resolve();a.onended?.(new Event('ended'));await new Promise(r=>setTimeout(r,0));expect(a.play).toHaveBeenCalledTimes(2);a.onended?.(new Event('ended'));await q;n.context('ja','boy');const replay=n.replay();expect(a.src).toContain('/ja/boy/');n.stop();await replay;expect(make).toHaveBeenCalledOnce();
  });
  it('settles rejected playback and cancels its stale queue without clobbering the next gesture',async()=>{
    const a=player(),unavailable=vi.fn(),n=new Narrator('/',unavailable,()=>a);await n.load(fetcher(manifest));vi.mocked(a.play).mockRejectedValueOnce(new Error('gesture rejected'));await n.play([catalog.scripts[0].id]);expect(unavailable).toHaveBeenCalledOnce();expect(a.onended).toBeNull();const q=n.play([catalog.scripts[0].id]);await Promise.resolve();expect(a.onended).not.toBeNull();a.onended?.(new Event('ended'));await q;expect(unavailable).toHaveBeenCalledOnce();
  });
  it('rejects incomplete snapshots and ignores stale asynchronous manifest loads',async()=>{
    expect(validManifest({...manifest,complete:false})).toBe(false);expect(validManifest({...manifest,recordings:Object.fromEntries(Object.entries(manifest.recordings).slice(0,2800))})).toBe(false);
    let finish!:(v:Response)=>void;const stale=new Promise<Response>(r=>finish=r),n=new Narrator('/',vi.fn());const loading=n.load((()=>stale) as typeof fetch);expect(await n.load(fetcher(manifest))).toBe(true);finish({ok:true,json:async()=>({...manifest,complete:false})} as Response);expect(await loading).toBe(false);const a=player(),factory=vi.fn(()=>a),available=new Narrator('/',vi.fn(),factory);await available.load(fetcher(manifest));const q=available.play([catalog.scripts[0].id]);available.stop();await q;expect(factory).toHaveBeenCalledOnce();
  });

});
