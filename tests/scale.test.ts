import { describe, expect, it } from 'vitest';
import { carbon, encounterFrames, expectedRemaining, frequency, gravity, hydrogenSamples, orbitFrames, scaleRatio } from '../src/scale/physics';
import { stops } from '../src/scale/stops';
import { sceneArt } from '../src/scale/art';

describe('expedition itinerary', () => {
  it('has sixteen distinct illustrated and sourced stops in logarithmic order', () => {
    expect(stops).toHaveLength(16);
    expect(new Set(stops.map(s=>s.id)).size).toBe(16);
    expect(stops.filter(s=>s.experiment)).toHaveLength(6);
    for (const [i,s] of stops.entries()) {
      expect(s.meters).toBeGreaterThan(i ? stops[i-1].meters : 0);
      const markup=sceneArt(s.id);
      expect(markup.length).toBeGreaterThan(120);
      expect(markup).not.toMatch(/<image|https?:/i);
      expect(s.source.url).toMatch(/^https:\/\//);
    }
  });
});

describe('expedition models', () => {
  it('keeps charge, isotopes, light frequency, halfway decay and scale ratios distinct', () => {
    expect(carbon(5,7)).toEqual({protons:6,charge:1,mass:13});
    expect(carbon(7,6)).toEqual({protons:6,charge:-1,mass:12});
    expect(frequency(500e-9)/1e12).toBeCloseTo(599.584916);
    expect(expectedRemaining(3)).toBe(.125);
    expect(scaleRatio(1e-10,1e-6)).toBeCloseTo(1e4);
  });
  it('samples the projected 1s distribution, centered at the proton', () => {
    const points=hydrogenSamples(20_000);
    const means=points.reduce((s,[x,y])=>[s[0]+x,s[1]+y,s[2]+x*x+y*y],[0,0,0]).map(x=>x/points.length);
    expect(Math.abs(means[0])).toBeLessThan(.03);
    expect(Math.abs(means[1])).toBeLessThan(.03);
    expect(means[2]).toBeGreaterThan(1.92);
    expect(means[2]).toBeLessThan(2.08);
  });
  it('conserves radius near a central mass and deflects when the center changes', () => {
    expect(gravity([1,0],[0,0],1)[0]).toBeLessThan(0);
    const centered=orbitFrames(0), offset=orbitFrames(.45);
    expect(centered[100][1][0]).not.toBeCloseTo(offset[100][1][0]);
    for(const f of centered) expect(Math.hypot(...f[1])).toBeCloseTo(.42,2);
  });
  it('makes the near passage distinct and keeps the equal-mass barycenter fixed', () => {
    const wide=encounterFrames(false), close=encounterFrames(true);
    const distance=([a,b]:readonly (readonly [number,number])[])=>Math.hypot(a[0]-b[0],a[1]-b[1]);
    expect(Math.min(...close.map(distance))).toBeLessThan(Math.min(...wide.map(distance)));
    for(const [a,b] of close) {
      expect(a[0]+b[0]).toBeCloseTo(0,10); expect(a[1]+b[1]).toBeCloseTo(0,10);
    }
  });
});
