import { afterEach, describe, it, expect, vi } from 'vitest';
import { AnnouncementQueue, DeviceVoice, type VoicePort } from '../src/beijing/voice';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
function device(voices: Partial<SpeechSynthesisVoice>[]) {
  vi.useFakeTimers();
  const synthesis={getVoices:vi.fn(()=>voices),speak:vi.fn((_utterance:SpeechSynthesisUtterance)=>{}),cancel:vi.fn()};
  vi.stubGlobal('window',{speechSynthesis:synthesis});vi.stubGlobal('localStorage',{setItem:vi.fn()});
  vi.stubGlobal('SpeechSynthesisUtterance',class {constructor(public text:string){} voice?:SpeechSynthesisVoice;lang='';rate=1;onend?:()=>void;onerror?:()=>void;});
  return {voice:new DeviceVoice('en',vi.fn()),synthesis};
}
function setup() {
  const calls:{text:string;done:()=>void;failed:()=>void}[]=[];
  const port:VoicePort={speak:(text,done,failed)=>{calls.push({text,done,failed});},cancel:vi.fn()};
  const queue=new AnnouncementQueue(port); return {queue,calls,port};
}
describe('Device availability remains truthful and strictly opt-in',()=>{
  it('never starts before a gesture and rejects remote-only or wrong-language voices',()=>{
    const {voice,synthesis}=device([{localService:false,lang:'en-US'},{localService:true,lang:'zh-CN'}]);
    voice.offer('No auto-play',200,5);expect(synthesis.speak).not.toHaveBeenCalled();expect(voice.status).toBe('off');
    voice.enable();expect(voice.status).toBe('unavailable');expect(voice.queue.enabled).toBe(false);
  });
  it('speaks only an installed local voice and respects event spacing plus persistent mute',()=>{
    const {voice,synthesis}=device([{localService:true,lang:'en-US'}]);voice.enable();voice.offer('Too short',20,5);expect(synthesis.speak).not.toHaveBeenCalled();
    voice.offer('Caption A',100,5);expect(synthesis.speak).toHaveBeenCalledOnce();expect(voice.status).toBe('ready');
    const utterance=synthesis.speak.mock.calls[0][0] as SpeechSynthesisUtterance;expect(utterance.voice?.localService).toBe(true);expect(utterance.text).toBe('Caption A');
    voice.mute();expect(voice.queue.enabled).toBe(false);expect(localStorage.setItem).toHaveBeenCalledWith('beijing-voice-muted','true');voice.dispose();
  });
  it('unavailable discovery and runtime errors cannot throw into game controls',()=>{
    const {voice,synthesis}=device([{localService:true,lang:'en-US'}]);
    synthesis.getVoices.mockImplementationOnce(()=>{throw new Error('Device failed');});expect(()=>voice.enable()).not.toThrow();expect(voice.status).toBe('unavailable');
    voice.enable();synthesis.speak.mockImplementationOnce(()=>{throw new Error('Device failed');});expect(()=>voice.offer('Captions remain',100,5)).not.toThrow();
    expect(voice.status).toBe('unavailable');expect(voice.queue.enabled).toBe(false);voice.dispose();
  });
});
describe('Optional device announcements never overlap normal progress', () => {
  it('does nothing before explicit activation or when an event is too short', () => {
    const {queue,calls}=setup();queue.offer('A');expect(calls).toEqual([]);
    queue.enable();queue.offer('B',false);expect(calls).toEqual([]);
  });
  it('finishes the active sentence and speaks only the newest pending caption', () => {
    const {queue,calls,port}=setup();queue.enable();queue.offer('First');queue.offer('Old pending');queue.offer('Newest pending');
    expect(calls).toHaveLength(1);expect(queue.active).toBe('First');expect(queue.pending).toBe('Newest pending');expect(port.cancel).not.toHaveBeenCalled();
    calls[0].done();expect(calls.map(call=>call.text)).toEqual(['First','Newest pending']);
    calls[1].done();expect(queue.active).toBe('');expect(queue.pending).toBe('');
  });
  it('returning to the active caption drops a stale pending announcement', () => {
    const {queue,calls}=setup();queue.enable();queue.offer('Current');queue.offer('Stale');queue.offer('Current');
    expect(queue.pending).toBe('');calls[0].done();expect(calls).toHaveLength(1);
  });
  it('mute cancels only by explicit action and ignores stale completion callbacks', () => {
    const {queue,calls,port}=setup();queue.enable();queue.offer('First');queue.offer('Pending');queue.stop();
    calls[0].done();expect(calls).toHaveLength(1);expect(queue.enabled).toBe(false);expect(port.cancel).toHaveBeenCalledOnce();
    queue.enable();queue.offer('Fresh');calls[0].done();expect(queue.active).toBe('Fresh');
  });
  it('speech errors and thrown ports stop safely, with captions outside the queue unaffected', () => {
    const {queue,calls}=setup();queue.enable();queue.offer('First');queue.offer('Pending');calls[0].failed();
    expect(queue.enabled).toBe(false);expect(queue.active).toBe('');expect(calls).toHaveLength(1);
    const broken=new AnnouncementQueue({speak:()=>{throw new Error('voice unavailable');},cancel:vi.fn()});broken.enable();expect(()=>broken.offer('Caption')).not.toThrow();expect(broken.enabled).toBe(false);
  });
});
