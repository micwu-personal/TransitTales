import { describe, expect, it } from 'vitest';
import { flybyCue, narrationText, epochNarration } from '../src/universe/narration-cues';
import { narrationCopy, objectNarration } from '../src/universe/narration-locale';
import { freezeSnapshot } from '../src/universe/view';
const snapshot = (progress: number, extra = {}) => freezeSnapshot({destinationId:'saturn',kind:'ring',color:'#eee',epoch:'present',beta:.65,travelling:true,progress,paused:false,reducedMotion:false,origin:{destinationId:'earth',kind:'earth',color:'#abc',epoch:'present'},...extra});
describe('Physics-contextual route voice cues', () => {
  it('announces Mars and Jupiter on actual near approaches, not departure, destination selection or elapsed clock', () => {
    expect(flybyCue(snapshot(0))).toBeNull(); expect(flybyCue(snapshot(.2))).toBeNull();
    expect(flybyCue(snapshot(.25))?.id).toBe('mars'); expect(flybyCue(snapshot(.59))?.id).toBe('jupiter');
    expect(flybyCue(snapshot(.99))).toBeNull(); expect(flybyCue(snapshot(.25,{travelling:false}))).toBeNull();
    expect(flybyCue(snapshot(.25,{paused:true}))).toBeNull();
    expect(flybyCue(snapshot(.26))?.key).toBe(flybyCue(snapshot(.28))?.key);
  });
  it('uses stationary actual stops for reduced motion, does not announce a nonexistent flyby on time-only trips', () => {
    expect(flybyCue(snapshot(.2,{reducedMotion:true}))).toBeNull(); expect(flybyCue(snapshot(.4,{reducedMotion:true}))?.id).toBe('mars'); expect(flybyCue(snapshot(.7,{reducedMotion:true}))?.id).toBe('jupiter');
    expect(flybyCue(snapshot(.8,{destinationId:'earth',kind:'earth',epoch:'bang'}))).toBeNull();
  });
  it('uses actual interpolated age and avoids speaking about present planets before they formed', () => {
    const cue = flybyCue(snapshot(.25,{epoch:'bang'}))!;
    expect(cue.ageGyr).toBeLessThan(13.8);
    expect(narrationText('earth','zh-CN',.2,true)).toContain(narrationCopy('zh-CN').notFormedShort);
    expect(narrationText('earth','zh-CN',.2,true)).not.toContain(objectNarration('earth','zh-CN',true));
  });
  it('explicitly frames reconstructed past and speculative future, and retains present catalogue narration', () => {
    expect(narrationText('earth','en')).toBe(objectNarration('earth','en'));
    expect(epochNarration('sun','quasar','en')).toContain(narrationCopy('en').notFormed);
    expect(narrationText('milky-way','en',2)).toContain(narrationCopy('en').reconstruction);
    expect(narrationText('sun','zh-CN',18.8)).toContain(narrationCopy('zh-CN').future);
    expect(narrationText('sun','zh-CN',18.8,true)).not.toContain(objectNarration('sun','zh-CN',true));
    expect(narrationText('sun','zh-CN',18.8,true)).toContain(narrationCopy('zh-CN').futureShort);
    expect(narrationText('milky-way','zh-CN',2,true)).toContain(narrationCopy('zh-CN').reconstructionShort);
    expect(narrationText('sagittarius','zh-CN',18.8,true)).toContain('人马座A星');
    expect(narrationText('unknown','en')).toBe('');
  });
});
