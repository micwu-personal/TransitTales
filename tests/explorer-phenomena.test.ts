import { describe, expect, it, vi } from 'vitest';
import { angles, camera, DEG, dot, scale, spaceFrame, unit } from '../src/explorer/camera';
import { destinations, type Vec } from '../src/explorer/catalog';
import { drawPhenomenon, phenomenonIds } from '../src/explorer/phenomena';

function instrument() {
  const gradient = { addColorStop: vi.fn() };
  const calls = {
    globalAlpha: .65, lineCap: 'butt',
    save: vi.fn(() => { saved = [calls.globalAlpha, calls.lineCap]; }),
    restore: vi.fn(() => { [calls.globalAlpha, calls.lineCap] = saved; }),
    transform: vi.fn<(...matrix: number[]) => void>(),
    createLinearGradient: vi.fn(() => gradient), createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(), fillRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    ellipse: vi.fn<(...args: number[]) => void>(), moveTo: vi.fn(), bezierCurveTo: vi.fn(),
  };
  let saved: [number, string];
  return { calls, pen: calls as unknown as CanvasRenderingContext2D };
}

function render(id: string, range: number, w = 900, h = 600, t = 0, roll = false) {
  const site = destinations.find(d => d.id === id)!;
  const target = scale(unit(site.position), range);
  const aim = angles(spaceFrame, target);
  const eye = camera(spaceFrame, aim.yaw, aim.pitch, w, h);
  if (roll) [eye.right, eye.up] = [eye.up, scale(eye.right, -1)];
  const { calls, pen } = instrument();
  expect(drawPhenomenon(pen, id, target, eye, w, h, t)).toBe(true);
  return calls;
}

describe('Night Atlas arrival phenomena', () => {
  it('uses existing destination IDs and skips invalid, rear, offscreen, and subpixel views without touching the pen', () => {
    expect([...phenomenonIds]).toEqual(['sgr-a', 'm1', '3c273']);
    expect([...phenomenonIds].every(id => destinations.some(d => d.id === id))).toBe(true);
    const w = 900, h = 600;
    const eye = camera(spaceFrame, 0, 0, w, h);
    const { pen, calls } = instrument();
    for (const [id, target] of [
      ['__proto__', [1, 0, 0]], ['m1', [-1, 0, 0]], ['m1', [0, 0, 0]],
      ['m1', [1, -50, 0]], ['sgr-a', [8000, 0, 0]], ['3c273', [NaN, 0, 0]],
    ] as [string, Vec][]) {
      expect(drawPhenomenon(pen, id, target, eye, w, h, 0)).toBe(false);
    }
    expect(calls.save).not.toHaveBeenCalled();
  });

  it.each([['m1', 7, 124], ['3c273', 250_000, 222.2]] as const)('keeps %s aligned at range %s pc and PA %s° under camera roll', (id, range, pa) => {
    const [a, b, , , x, y] = render(id, range).transform.mock.calls[0];
    // Earth-facing view is north up and celestial east left.
    expect(Math.atan2(-a, -b) / DEG + (pa > 180 ? 360 : 0)).toBeCloseTo(pa, 5);
    expect(x).toBeCloseTo(450, 6);
    expect(y).toBeCloseTo(300, 6);
    const [rolledA, rolledB] = render(id, range, 900, 600, 0, true).transform.mock.calls[0];
    expect(rolledA).toBeCloseTo(-b, 6);
    expect(rolledB).toBeCloseTo(a, 6);
  });

  it('centers the drawing on the perspective-projected target and caps it on phone and desktop', () => {
    const target: Vec = [.01, -.004, .005];
    for (const [w, h] of [[390, 844], [1440, 900]]) {
      const eye = camera(spaceFrame, 0, 0, w, h);
      const { pen, calls } = instrument();
      expect(drawPhenomenon(pen, '3c273', target, eye, w, h, 0)).toBe(true);
      const [a, b, c, d, x, y] = calls.transform.mock.calls[0];
      const depth = dot(target, eye.forward);
      expect(x).toBeCloseTo(w / 2 + eye.focal * dot(target, eye.right) / depth, 6);
      expect(y).toBeCloseTo(h / 2 - eye.focal * dot(target, eye.up) / depth, 6);
      expect(Math.max(Math.hypot(a, c), Math.hypot(b, d))).toBeCloseTo(Math.min(124, Math.min(w, h) * .27), 6);
      expect(calls.save).toHaveBeenCalledTimes(1);
      expect(calls.restore).toHaveBeenCalledTimes(1);
      expect(pen.globalAlpha).toBe(.65);
      expect(pen.lineCap).toBe('butt');
    }
  });

  it('draws a rotating ring without a jet for Sagittarius A* and moves knots outward on the observed jet sides', () => {
    const flow = render('sgr-a', .25);
    const laterFlow = render('sgr-a', .25, 900, 600, .1);
    expect(flow.createLinearGradient).not.toHaveBeenCalled();
    expect(flow.bezierCurveTo).not.toHaveBeenCalled();
    expect(laterFlow.ellipse.mock.calls[2][5]).toBeGreaterThan(flow.ellipse.mock.calls[2][5]);
    expect(laterFlow.ellipse.mock.calls[2][2]).toBe(flow.ellipse.mock.calls[2][2]);

    const crab = render('m1', 7);
    const quasar = render('3c273', 250_000);
    expect(crab.bezierCurveTo.mock.calls[0][4]).toBeLessThan(0); // faint counterjet
    expect(crab.bezierCurveTo.mock.calls[2][4]).toBeGreaterThan(0);
    expect(render('m1', 7, 900, 600, .1).ellipse.mock.calls[1][0]).toBeGreaterThan(crab.ellipse.mock.calls[1][0]);
    expect(quasar.ellipse.mock.calls.every(([x]) => x > 0)).toBe(true);
    expect(render('3c273', 250_000, 900, 600, .1).ellipse.mock.calls[8][0]).toBeGreaterThan(quasar.ellipse.mock.calls[8][0]);
    for (const effect of [flow, crab, quasar]) {
      expect(effect.fill.mock.calls.length + effect.fillRect.mock.calls.length + effect.stroke.mock.calls.length).toBeLessThanOrEqual(20);
    }
  });

  it('renders the same frame for the same time and falls back to the still for a non-finite clock', () => {
    expect(render('3c273', 250_000, 900, 600, 3).ellipse.mock.calls).toEqual(render('3c273', 250_000, 900, 600, 3).ellipse.mock.calls);
    expect(render('3c273', 250_000, 900, 600, NaN).ellipse.mock.calls).toEqual(render('3c273', 250_000).ellipse.mock.calls);
  });
});
