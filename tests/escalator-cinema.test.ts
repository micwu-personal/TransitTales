import { afterEach, describe, expect, it, vi } from 'vitest';
import { CINEMA_SECONDS, cinemaSparks, createCinematicCelebration } from '../src/escalator/cinema';
import { CELEBRATION_MS } from '../src/escalator/round-feedback';
import { landingName, type Language } from '../src/escalator/locale';
const languages: Language[] = ['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'];
import { passengerNeeds, skyCopy } from '../src/escalator/sky-copy';

function canvasHarness(hasContext = true) {
  const gradient = { addColorStop: vi.fn() };
  const context = { createRadialGradient: () => gradient, createLinearGradient: () => gradient,
    setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), globalAlpha: 1, globalCompositeOperation: '', fillStyle: '', strokeStyle: '', lineWidth: 1 };
  const canvases: any[] = [];
  vi.stubGlobal('document', { createElement: () => {
    const canvas = { hidden: false, width: 0, height: 0, className: '', setAttribute: vi.fn(), remove: vi.fn(), getContext: () => hasContext ? context : null };
    canvases.push(canvas); return canvas;
  } });
  vi.stubGlobal('window', { devicePixelRatio: 3 });
  const host = { clientWidth: 800, clientHeight: 500, append: vi.fn() };
  const cinema = createCinematicCelebration(host as unknown as HTMLElement);
  return { cinema, context, canvases, host };
}
afterEach(() => vi.unstubAllGlobals());

describe('cinematic round finale', () => {
  it('matches the success gate duration and uses deterministic bounded particles', () => {
    expect(CELEBRATION_MS).toBe(CINEMA_SECONDS * 1000);
    expect(cinemaSparks(-1)).toEqual([]); expect(cinemaSparks(CINEMA_SECONDS)).toEqual([]);
    expect(cinemaSparks(2.1)).toEqual(cinemaSparks(2.1));
    expect(cinemaSparks(2.1).length).toBeGreaterThan(100);
    for (let time = 0; time < CINEMA_SECONDS; time += .1) {
      const sparks = cinemaSparks(time); expect(sparks.length).toBeLessThanOrEqual(800);
      for (const spark of sparks) {
        expect(spark.x).toBeGreaterThanOrEqual(0); expect(spark.x).toBeLessThanOrEqual(1);
        expect(spark.y).toBeGreaterThanOrEqual(0); expect(spark.y).toBeLessThanOrEqual(1);
        expect(spark.alpha).toBeGreaterThanOrEqual(0); expect(spark.alpha).toBeLessThanOrEqual(1);
      }
    }
  });
  it('mounts once, caps resolution, reuses glow sprites, and clears on reset/disposal', () => {
    const { cinema, canvases, context, host } = canvasHarness();
    expect(canvases[0].hidden).toBe(true); expect(host.append).toHaveBeenCalledOnce();
    cinema.render(true, false, 1000); cinema.render(true, false, 3100);
    expect(canvases[0].width).toBe(1200); expect(canvases[0].height).toBe(750);
    const count = canvases.length; cinema.render(true, false, 3100); expect(canvases).toHaveLength(count);
    expect(context.drawImage).toHaveBeenCalled();
    cinema.render(false, false, 4000); expect(canvases[0].hidden).toBe(true);
    cinema.render(true, false, 50000); expect(context.globalAlpha).toBe(1);
    cinema.dispose(); expect(canvases[0].remove).toHaveBeenCalledOnce();
  });
  it('renders an identical static tableau throughout reduced-motion celebrations', () => {
    const { cinema, context } = canvasHarness();
    cinema.render(true, true, 0); const first = context.drawImage.mock.calls.map(call => call.slice(1));
    context.drawImage.mockClear(); cinema.render(true, true, 7000);
    expect(context.drawImage.mock.calls.map(call => call.slice(1))).toEqual(first);
  });
  it('keeps game completion safe when a 2D canvas context is unavailable', () => {
    const { cinema } = canvasHarness(false);
    expect(() => { cinema.render(true, false, 0); cinema.render(false, true, 9000); cinema.dispose(); }).not.toThrow();
  });
  it('preserves legacy landing labels and disambiguates depth decks', () => {
    expect(landingName({ x: 0, y: 0 })).toBe('A1');
    expect(landingName({ x: 0, y: 0, z: 0 })).toBe('A1 · F');
    expect(landingName({ x: 0, y: 0, z: 2 })).toBe('A1 · R');
    for (const language of languages) {
      expect(skyCopy[language].footer).toBeTruthy();
      for (const need of ['stroller', 'courier', 'acrophobia'] as const) {
        expect(passengerNeeds[language][need].label).toBeTruthy(); expect(passengerNeeds[language][need].rule).toBeTruthy();
      }
    }
  });
});
