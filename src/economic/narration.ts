import catalog from './narration-catalog.json';
import approved from '../../scripts/economic-voice-profiles.json';
import { speechFor } from './speech-cues';
import { RecordedSpeech } from './recorded-speech';
export type NarrationCue = string | readonly string[];
import type { Lang, Text } from './model';
export type SpeechLanguage = 'zh' | 'en' | 'ja' | 'mn';
export type Recording = { file: string; text: string; voice: string; rate: string; pitch: string; durationSeconds: number; bytes: number; sha256: string; decodeVerified?: boolean; contentReview?: string };
export type Manifest = { version: 1; complete: boolean; profiles: unknown; recordings: Record<string, Recording> };
export const spokenLanguage = (lang: Lang): SpeechLanguage => lang === 'mn-Mong' ? 'mn' : lang;
export function scriptIds(values: Text[]): string[] {
  return [...new Set(values.flatMap(value=> {const registered=speechFor(value);if(registered)return registered;const row=catalog.scripts.find(s=>s.text.zh===value.zh&&s.text.en===value.en);if(!row)throw new Error(`Unregistered narration: ${value.zh}`);return [row.id];}))];
}
export function recordingURL(base: string, file: string): string | undefined {
  if (!/^(zh|en|ja|mn)\/(boy|girl)\/[a-zA-Z0-9_-]+\.mp3$/.test(file)) return undefined;
  return `${base.replace(/\/?$/, '/')}audio/economic/${file}`;
}
export function validManifest(value: unknown): value is Manifest {
  if (!value || typeof value !== 'object') return false;
  const v=value as Manifest;
  if(v.version!==1||v.complete!==true||!v.recordings||typeof v.recordings!=='object'||Array.isArray(v.recordings)||!v.profiles||typeof v.profiles!=='object')return false;
  const profiles=v.profiles as typeof approved.profiles;
  if(Object.keys(profiles).sort().join(',')!=='en,ja,mn,zh')return false;
  if(Object.keys(v.recordings).length!==catalog.scripts.length*8)return false;
  for(const language of ['zh','en','ja','mn'] as const) {
    if(!profiles[language]||Object.keys(profiles[language]).sort().join(',')!=='boy,girl')return false;
    for(const gender of ['boy','girl'] as const){
      const profile=profiles[language][gender],expected=approved.profiles[language][gender];
      if(!profile||Object.keys(profile).sort().join(',')!=='pitch,rate,voice'||profile.voice!==expected.voice||profile.rate!==expected.rate||profile.pitch!==expected.pitch)return false;
      for(const script of catalog.scripts){
        const r=v.recordings[`${language}|${gender}|${script.id}`];
        if(!r||!recordingURL('/',r.file)||!r.file.startsWith(`${language}/${gender}/`)||r.text!==script.text[language]||r.voice!==expected.voice||r.rate!==expected.rate||r.pitch!==expected.pitch||r.decodeVerified!==true||!Number.isFinite(r.durationSeconds)||r.durationSeconds<=0||r.durationSeconds>60||!Number.isSafeInteger(r.bytes)||r.bytes<=0||!/^([a-f0-9]{64})$/.test(r.sha256))return false;
      }
    }
  }
  return true;
}
export class Narrator {
  private manifest?: Manifest;
  private player?: HTMLAudioElement;
  private generation=0;
  private loadGeneration=0;
  private cancel?:()=>void;
  private muted=false;
  private current: NarrationCue[]=[];
  private speech?: RecordedSpeech;
  private language: SpeechLanguage='zh';
  private gender:'boy'|'girl'='girl';
  constructor(private base: string,private unavailable:()=>void,private makeAudio:()=>HTMLAudioElement=()=>new Audio(),private makeSpeech:()=>RecordedSpeech=()=>new RecordedSpeech()){}
  async load(fetcher:typeof fetch=fetch):Promise<boolean>{
    const revision=++this.loadGeneration;this.stop();this.manifest=undefined;
    try {const response=await fetcher(`${this.base}audio/economic/manifest.json`,{credentials:'same-origin'});if(!response.ok)return false;const data:unknown=await response.json();if(revision!==this.loadGeneration||!validManifest(data))return false;this.manifest=data;return true;}catch{return false;}
  }
  context(lang:Lang,gender:'boy'|'girl'):void {const language=spokenLanguage(lang);if(language!==this.language||gender!==this.gender)this.stop();this.language=language;this.gender=gender;}
  mute(value:boolean):void {this.muted=value;if(value)this.stop();}
  stop():void {this.generation++;this.cancel?.();this.cancel=undefined;if(this.player){this.player.onended=null;this.player.onerror=null;this.player.onpause=null;this.player.pause();}}
  dispose():void {this.stop();this.speech?.dispose();this.speech=undefined;}
  replay():Promise<void>{return this.play([...this.current]);}
  async play(ids:NarrationCue[]):Promise<void>{
    this.stop();this.current=ids.map(cue=>typeof cue==='string'?cue:[...cue]);if(this.muted)return;
    const token=this.generation,queue=this.language==='zh'?ids:ids.flat();
    const recordings:{ids:readonly string[];urls:string[]}[]=[];
    for(const cue of queue){
      const cueIDs=typeof cue==='string'?[cue]:cue,urls:string[]=[];
      for(const id of cueIDs){
        const script=catalog.scripts.find(s=>s.id===id),r=this.manifest?.recordings[`${this.language}|${this.gender}|${id}`];
        if(!script||!r||r.text!==script.text[this.language]||!r.file.startsWith(`${this.language}/${this.gender}/`)){this.unavailable();return;}
        const url=recordingURL(this.base,r.file);if(!url){this.unavailable();return;}urls.push(url);
      }
      if(urls.length)recordings.push({ids:cueIDs,urls});
    }
    const prepare=(urls:string[]):string|Promise<string|undefined>=>urls.length===1?urls[0]:(this.speech??(this.speech=this.makeSpeech())).join(urls,()=>token===this.generation).catch(()=>undefined);
    let ahead:string|Promise<string|undefined>|undefined;
    for(let index=0;index<recordings.length;index++){
      if(token!==this.generation||this.muted)return;
      const cue=recordings[index],ready=ahead??prepare(cue.urls),url=typeof ready==='string'?ready:await ready;
      ahead=undefined;
      if(token!==this.generation||this.muted)return;
      if(!url){this.unavailable();return;}
      const player=this.player??(this.player=this.makeAudio());player.dataset.narrationScripts=JSON.stringify(cue.ids);player.src=url;
      const ended=new Promise<boolean>(resolve=>{this.cancel=()=>resolve(false);player.onended=()=>resolve(true);player.onerror=()=>resolve(false);});
      try {
        await player.play();
        if(token!==this.generation)return;
        // Prepare only the next clause while this one speaks, without creating another player.
        if(recordings[index+1])ahead=prepare(recordings[index+1].urls);
        if(!await ended){if(token===this.generation)this.unavailable();return;}
      } catch {if(token===this.generation)this.unavailable();return;}
      finally {if(token===this.generation){this.cancel?.();this.cancel=undefined;player.onended=null;player.onerror=null;player.onpause=null;}}

    }
  }
}

export function numberIds(value:number,lang:Lang='zh'):string[]{
  if(!Number.isSafeInteger(value))throw new RangeError('Narration requires a safe integer');
  if(value<0)return ['number.minus',...numberIds(-value,lang)];
  const east=lang==='zh'||lang==='ja';
  const scales:eastScale[] = east?[[1000000000000,'trillion'],[100000000,'yi'],[10000,'wan']]:[[1000000000000,'trillion'],[1000000000,'billion'],[1000000,'million'],[1000,'thousand']];
  for(const [scale,name] of scales)if(value>=scale){
    const rest=value%scale,parts=[...numberIds(Math.floor(value/scale),lang),`number.${name}`];
    if(rest){if(lang==='zh'&&rest<scale/10)parts.push('number.zero-connector');parts.push(...numberIds(rest,lang));}return parts;
  }
  if(value<100)return [`number.${value}`];
  const parts:string[]=[];let rest=value;
  for(const scale of [1000,100])if(rest>=scale){const fragment=Math.floor(rest/scale)*scale;rest%=scale;parts.push(`number.${fragment}${(lang==='mn'||lang==='mn-Mong')&&scale===100&&rest?'.mn-join':''}`);if(rest&&lang==='zh'&&rest<scale/10)parts.push('number.zero-connector');}
  if(rest){if(lang==='en'&&parts.length)parts.push('number.and');parts.push(`number.${rest}`);}return parts;
}
type eastScale=[number,string];
export function amountIds(cents:number,lang:Lang='zh',unit:'home'|'foreign'='home'):string[]{
  if(!Number.isSafeInteger(cents))throw new RangeError('Money narration requires integer cents');
  const amount=Math.abs(cents),whole=Math.floor(amount/100),fraction=amount%100;
  if(lang==='zh'&&unit==='home'){
    const negative=cents<0?['number.minus']:[];
    const complete=`money.home.${amount}`;
    if(catalog.scripts.some(s=>s.id===complete))return [...negative,complete];
    const parts=[...negative,...(whole?[...numberIds(whole,lang),'ui.yuan']:[])];
    const jiao=Math.floor(fraction/10),fen=fraction%10;
    if(jiao)parts.push(...numberIds(jiao,lang),'ui.jiao');
    else if(whole&&fen)parts.push('number.zero-connector');
    if(fen)parts.push(...numberIds(fen,lang),'ui.cents');
    if(fraction)parts.push('ui.money-ending');
    if(!amount)parts.push('number.0','ui.yuan');
    return parts;
  }
  const parts=[...(cents<0?['number.minus']:[]),...numberIds(whole,lang),unit==='foreign'?'ui.shells':'ui.yuan'];
  if(fraction)parts.push('ui.and',...numberIds(fraction,lang),unit==='foreign'?'ui.shell-cents':'ui.cents');
  return parts;
}
