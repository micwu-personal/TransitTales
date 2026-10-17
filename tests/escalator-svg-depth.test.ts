import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSvgRenderer, clearanceCutaway, clearanceCutaways } from '../src/escalator/renderer';
import { createBoard, placePiece, type Point, type Puzzle } from '../src/escalator/model';
import { copy, landingName, type Language } from '../src/escalator/locale';
import { skyCopy, passengerNeeds } from '../src/escalator/sky-copy';
import { snapshot, type MallSnapshot } from '../src/escalator/view';
import { PUZZLES } from '../src/escalator/puzzles';

class SvgNode {
  children: SvgNode[] = [];
  attributes = new Map<string, string>();
  listeners = new Map<string, Set<(event: any) => void>>();
  classes = new Set<string>();
  classList = { toggle: (name: string, on: boolean) => { if (on) this.classes.add(name); else this.classes.delete(name); } };
  hidden = false;
  private markup = '';
  constructor(readonly tagName = 'div') {}
  get innerHTML(): string { return this.markup; }
  set innerHTML(value: string) {
    this.markup = value; this.children = [];
    const stack = [{ node: this as SvgNode, begin: 0 }];
    for (const match of value.matchAll(/<\/?([a-z][\w:-]*)\b([^>]*)>/gi)) {
      if (match[0].startsWith('</')) {
        const frame = stack.pop()!;
        frame.node.markup = value.slice(frame.begin, match.index);
      } else {
        const node = new SvgNode(match[1]);
        for (const attr of match[2].matchAll(/([\w:-]+)="([^"]*)"/g)) node.setAttribute(attr[1], attr[2]);
        node.hidden = /\bhidden\b/.test(match[2]);
        stack[stack.length - 1].node.children.push(node);
        if (!match[0].endsWith('/>')) stack.push({ node, begin: match.index! + match[0].length });
      }
    }
  }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  hasAttribute(name: string): boolean { return this.attributes.has(name); }
  matches(selector: string): boolean {
    if (selector.startsWith('#')) return this.getAttribute('id') === selector.slice(1);
    const attr = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    return attr ? this.hasAttribute(attr[1]) && (attr[2] === undefined || this.getAttribute(attr[1]) === attr[2]) : this.tagName === selector;
  }
  closest(selectors: string): SvgNode | null { return selectors.split(',').some(selector => this.matches(selector)) ? this : null; }
  querySelector(selector: string): SvgNode | null {
    for (const child of this.children) { if (child.matches(selector)) return child; const result = child.querySelector(selector); if (result) return result; }
    return null;
  }
  addEventListener(type: string, listener: (event: any) => void): void { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type: string, listener: (event: any) => void): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string, event: any): void { this.listeners.get(type)?.forEach(listener => listener({ type, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn(), ...event })); }
  focus(): void { (document as any).activeElement = this; }
}
class KeyEvent { constructor(readonly type: string, readonly key: string, readonly target: SvgNode) {} preventDefault = vi.fn(); }
function harness() {
  vi.stubGlobal('document', Object.assign(new SvgNode('document'), { activeElement: null }));
  vi.stubGlobal('KeyboardEvent', KeyEvent);
  const host = new SvgNode(), onLanding = vi.fn(), onPiece = vi.fn(), renderer = createSvgRenderer();
  renderer.mount(host as unknown as HTMLElement, onLanding, onPiece);
  const svg = host.querySelector('svg')!, controls = host.querySelector('#mall-depth-controls')!;
  return { host, svg, controls, onLanding, onPiece, renderer };
}
const skyPuzzle = (): Puzzle => ({
  id: 'svg-depth-fixture', building: 'sky-atrium', name: ['Sky', 'Sky', 'Sky', 'Sky', 'Sky'], hint: ['', '', '', '', ''],
  landings: [0, 1, 2].flatMap(z => [0, 1, 2].flatMap(y => [0, 1, 2].map(x => ({ x, y, z })))),
  inventory: { short: 9, long: 9, bridge: 9, elevator: 9 }, obstacles: [{ x: .2, y: .3, w: .5, h: .4, z: 2 }],
  lowCeilings: [{ x: .7, y: 1.1, w: .6, h: .6, z: 1 }], solution: [],
  requests: [
    { id: 'family', start: { x: 0, y: 0, z: 0 }, goal: { x: 0, y: 0, z: 1 }, destination: 'cafe', need: 'stroller' },
    { id: 'delivery', start: { x: 1, y: 0, z: 1 }, goal: { x: 1, y: 0, z: 2 }, destination: 'books', need: 'courier' },
    { id: 'visitor', start: { x: 2, y: 0, z: 2 }, goal: { x: 2, y: 1, z: 2 }, destination: 'garden', need: 'acrophobia' },
  ],
});
const view = (language: Language = 'en'): MallSnapshot => snapshot(skyPuzzle(), createBoard(), null, language, null, null, true, false, false);
const tap = (host: SvgNode, target: SvgNode, dx = 0, type = 'touch') => {
  const event = { target, pointerId: 7, pointerType: type, isPrimary: true, button: 0, clientX: 90, clientY: 100, timeStamp: 1000 };
  host.emit('pointerdown', event); host.emit('pointerup', { ...event, clientX: 90 + dx });
};
const depthName = (point: Point) => landingName(point);
const landingPosition = (svg: SvgNode, point: Point) => {
  const node = svg.querySelector(`[data-landing="${point.x},${point.y},${point.z ?? 0}"]`)!;
  const dot = node.children.find(child => child.getAttribute('class') === 'landing-dot')!;
  return [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))];
};
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('sky-atrium SVG fallback', () => {
  it('renders a stepped isometric building and only exposes the selected deck as landing controls', () => {
    const { renderer, svg, controls, host } = harness();
    renderer.render(view());
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 720');
    expect(svg.innerHTML).toContain('sky-atrium-architecture');
    expect(svg.innerHTML.match(/class="sky-stepped-roof"/g)).toHaveLength(3);
    expect(svg.innerHTML.match(/data-landing="/g)).toHaveLength(9);
    expect(svg.innerHTML).not.toMatch(/data-landing="\d,\d,[12]"/);
    const front = landingPosition(svg, { x: 1, y: 1, z: 0 });
    host.emit('click', { target: controls.querySelector('[data-depth-select="1"]') });
    const middle = landingPosition(svg, { x: 1, y: 1, z: 1 });
    expect(middle[0]).toBeGreaterThan(front[0]); expect(middle[1]).toBeLessThan(front[1]);
    expect(svg.innerHTML).not.toMatch(/data-landing="\d,\d,[02]"/);
    expect(controls.querySelector('[data-depth-select="1"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(svg.innerHTML).toContain(skyCopy.en.middle);
    renderer.dispose();
  });
  it('preserves the first endpoint across touch deck switches and passes real z coordinates exactly once on iPad', () => {
    const { renderer, svg, host, controls, onLanding, onPiece } = harness();
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const state = view(); renderer.render(state);
    const first = svg.querySelector('[data-landing="0,0,0"]')!;
    tap(host, first); host.emit('click', { target: first, pointerId: 7, timeStamp: 1000 });
    expect(onLanding).toHaveBeenCalledExactlyOnceWith({ x: 0, y: 0, z: 0 });
    renderer.render({ ...state, first: { x: 0, y: 0, z: 0 } });
    const layer = controls.querySelector('[data-depth-select="1"]')!; layer.focus();
    tap(host, layer); host.emit('click', { target: layer, pointerId: 7, timeStamp: 1000 });
    expect(svg.innerHTML).toContain('sky-inactive-landing first-landing');
    expect(svg.innerHTML).toContain(`${copy.en.selected}: ${depthName({ x: 0, y: 0, z: 0 })}`);
    expect(document.activeElement?.getAttribute('data-depth-select')).toBe('1');
    expect(onLanding).toHaveBeenCalledTimes(1);
    tap(host, svg.querySelector('[data-landing="0,0,1"]')!);
    expect(onLanding).toHaveBeenLastCalledWith({ x: 0, y: 0, z: 1 });
    expect(onLanding).toHaveBeenCalledTimes(2); expect(onPiece).not.toHaveBeenCalled();
    renderer.dispose();
  });
  it('blocks retargeted compatibility clicks and places two depth bridges with frozen simulation time', () => {
    const { renderer, svg, host, controls, onLanding } = harness();
    vi.spyOn(performance, 'now').mockReturnValue(500);
    const doc = document as unknown as SvgNode, puzzle = skyPuzzle();
    let board = createBoard(), first: Point | null = null, time = 1700, id = 1;
    const refresh = () => renderer.render(snapshot(puzzle, board, null, 'en', first, null, true, false, false));
    onLanding.mockImplementation((point: Point) => {
      if (first) {
        const result = placePiece(puzzle, board, { type: 'bridge', a: first, b: point });
        expect(result.error).toBeNull(); board = result.board; first = null;
      } else first = point;
      refresh();
    });
    refresh();
    const cancel = new SvgNode('button'); cancel.setAttribute('id', 'escalator-cancel');
    const gesture = (target: SvgNode, retarget?: SvgNode) => {
      const event = { target, pointerId: id++, pointerType: 'touch', isPrimary: true, button: 0, clientX: 100, clientY: 100, timeStamp: time += 80 };
      doc.emit('pointerdown', event); host.emit('pointerdown', event); host.emit('pointerup', event);
      const stopImmediatePropagation = vi.fn();
      doc.emit('click', { ...event, target: retarget ?? target, detail: 1, stopImmediatePropagation });
      expect(stopImmediatePropagation).toHaveBeenCalledOnce();
    };
    for (const [a, b] of [[0, 1], [1, 2]]) {
      gesture(controls.querySelector(`[data-depth-select="${a}"]`)!);
      gesture(svg.querySelector(`[data-landing="0,0,${a}"]`)!, cancel);
      expect(first).toEqual({ x: 0, y: 0, z: a });
      gesture(controls.querySelector(`[data-depth-select="${b}"]`)!);
      expect(first).toEqual({ x: 0, y: 0, z: a });
      gesture(svg.querySelector(`[data-landing="0,0,${b}"]`)!);
      const tool = new SvgNode('button'), stopImmediatePropagation = vi.fn();
      doc.emit('pointerdown', { target: tool });
      doc.emit('click', { target: tool, timeStamp: time + 1, detail: 1, clientX: 100, clientY: 100, stopImmediatePropagation });
      expect(stopImmediatePropagation).not.toHaveBeenCalled();
    }
    expect(onLanding).toHaveBeenCalledTimes(4); expect(board.pieces).toHaveLength(2);
    expect(svg.innerHTML.match(/data-piece="/g)).toHaveLength(2);
    renderer.dispose(); expect([...doc.listeners.values()].every(listeners => listeners.size === 0)).toBe(true);
  });
  it('correlates mouse compatibility clicks with replaced landing markup but allows keyboard clicks', () => {
    const { renderer, svg, host, onLanding } = harness();
    const state = view(); renderer.render(state);
    const target = svg.querySelector('[data-landing="0,0,0"]')!; tap(host, target);
    renderer.render({ ...state, first: { x: 0, y: 0, z: 0 } });
    const replaced = svg.querySelector('[data-landing="0,0,0"]')!;
    expect(replaced).not.toBe(target);
    host.emit('click', { target: replaced, detail: 1, timeStamp: 1010, clientX: 0, clientY: 0 });
    expect(onLanding).toHaveBeenCalledTimes(1);
    tap(host, replaced);
    host.emit('click', { target: replaced, detail: 0, isTrusted: true, timeStamp: 1020, clientX: 0, clientY: 0 });
    expect(onLanding).toHaveBeenCalledTimes(3);
    renderer.dispose();
  });
  it('rejects swipes, cancelled touches, and inactive/deactivated landing activation', () => {
    const { renderer, svg, host, onLanding } = harness(); renderer.render(view());
    const landing = svg.querySelector('[data-landing="0,0,0"]')!;
    tap(host, landing, 30);
    host.emit('pointerdown', { target: landing, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 0, clientY: 0 });
    host.emit('pointercancel', { target: landing });
    host.emit('pointerup', { target: landing, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 0, clientY: 0 });
    const stale = new SvgNode('g'); stale.setAttribute('data-landing', '0,0,2');
    host.emit('click', { target: stale });
    renderer.render({ ...view(), building: false }); host.emit('click', { target: landing });
    expect(onLanding).not.toHaveBeenCalled(); renderer.dispose();
  });
  it.each<Language>(['en', 'zh-CN', 'ja', 'mn-Cyrl-MN', 'mn-Mong-CN'])('localizes native >=44px deck controls and identifies all passenger needs in %s', language => {
    const { renderer, svg, controls } = harness(); renderer.render(view(language));
    expect(controls.hidden).toBe(false);
    expect(controls.getAttribute('aria-label')).toBe(skyCopy[language].depth);
    for (const label of [skyCopy[language].front, skyCopy[language].middle, skyCopy[language].rear]) expect(controls.innerHTML).toContain(label);
    expect(controls.innerHTML.match(/min-height:44px/g)).toHaveLength(3);
    expect(controls.innerHTML.match(/touch-action:manipulation/g)).toHaveLength(3);
    const people = svg.querySelector('#mall-people')!.innerHTML;
    for (const need of ['stroller', 'courier', 'acrophobia'] as const) {
      expect(people).toContain(`data-need="${need}"`); expect(people).toContain(passengerNeeds[language][need].label); expect(people).toContain(passengerNeeds[language][need].icon);
    }
    renderer.dispose();
  });
  it('projects depth bridges, route previews, moving riders and bounded zones rather than flattening z', () => {
    const { renderer, svg, controls, host } = harness(), state = view();
    const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 1 };
    renderer.render({ ...state, pieces: [{ id: 'depth-bridge', type: 'bridge', a, b }], routes: [{ id: 'family', destination: 'cafe', points: [a, b], ready: true, issues: [] }] });
    const front = landingPosition(svg, a);
    host.emit('click', { target: controls.querySelector('[data-depth-select="1"]') });
    const middle = landingPosition(svg, b);
    expect(svg.innerHTML).toContain(`points="${front.join(',')} ${middle.join(',')}"`);
    expect(svg.innerHTML).toContain(`M${front[0]} ${front[1] + 7}L${middle[0]} ${middle[1] + 7}`);
    expect(svg.innerHTML).toContain('data-zone-depth="2"');
    expect(svg.innerHTML).toContain(`data-clearance-landings="${depthName({ x: 1, y: 1, z: 1 })}"`);
    const point = { x: 0, y: 0, z: .5 }, rider = state.riders[0];
    renderer.render({ ...state, riders: [{ ...rider, point }] });
    const people = svg.querySelector('#mall-people')!.innerHTML;
    const translated = people.match(/transform="translate\(([\d.-]+) ([\d.-]+)\)"/)!;
    expect(Number(translated[1])).toBeCloseTo((front[0] + middle[0]) / 2 - 9);
    expect(Number(translated[2])).toBeCloseTo((front[1] + middle[1]) / 2 - 12);
    renderer.dispose();
  });
  it('supports keyboard deck changes and piece activation without clearing the first landing', () => {
    const { renderer, svg, host, controls, onLanding, onPiece } = harness(), state = view();
    renderer.render({ ...state, first: { x: 0, y: 0, z: 0 }, pieces: [{ id: 'bridge', type: 'bridge', a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 1 } }] });
    const key = new KeyEvent('keydown', 'Enter', controls.querySelector('[data-depth-select="1"]')!);
    host.listeners.get('keydown')!.forEach(listener => listener(key));
    expect(key.preventDefault).toHaveBeenCalled(); expect(svg.getAttribute('data-selected-depth')).toBe('1');
    expect(onLanding).not.toHaveBeenCalled();
    host.emit('click', { target: svg.querySelector('[data-piece="bridge"]')! });
    expect(onPiece).toHaveBeenCalledExactlyOnceWith('bridge');
    renderer.dispose();
  });
  it('renders all twenty new rounds with only the active depth selectable and default z normalized to front', () => {
    const { renderer, svg, controls, host } = harness();
    const rounds = PUZZLES.filter(p => p.building === 'sky-atrium'); expect(rounds).toHaveLength(20);
    for (const puzzle of rounds) {
      renderer.render(snapshot(puzzle, createBoard(), null, 'en', null, null, true, false, false));
      for (const z of [0, 1, 2]) {
        host.emit('click', { target: controls.querySelector(`[data-depth-select="${z}"]`)! });
        expect(svg.innerHTML.match(/data-landing="/g)?.length ?? 0).toBe(puzzle.landings.filter(p => (p.z ?? 0) === z).length);
        expect(svg.innerHTML).not.toMatch(/NaN|undefined/);
      }
    }
    const state = view(), defaultDepth = { ...state, puzzle: { ...state.puzzle, landings: state.puzzle.landings.map((p, i) => i === 0 ? { x: p.x, y: p.y } : p) } }; renderer.render(defaultDepth);
    expect(svg.querySelector('[data-landing="0,0,0"]')).not.toBeNull();
    renderer.render({ ...defaultDepth, running: true, celebrating: true, reducedMotion: true });
    expect(svg.classes.has('is-running')).toBe(false); expect(svg.classes.has('is-celebrating')).toBe(false);
    renderer.dispose();
  });
  it('keeps legacy geometry and two-coordinate iPad callbacks, then cleans up listeners', () => {
    const { renderer, svg, host, controls, onLanding } = harness();
    renderer.render(view());
    renderer.render(snapshot(PUZZLES[0], createBoard(), null, 'en', null, null, true, false, true, true));
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 650'); expect(controls.hidden).toBe(true);
    expect(svg.innerHTML).toContain('mall-wall'); expect(svg.innerHTML).not.toContain('sky-atrium-architecture');
    const first = PUZZLES[0].landings[0];
    tap(host, svg.querySelector(`[data-landing="${first.x},${first.y}"]`)!);
    expect(onLanding).toHaveBeenCalledExactlyOnceWith({ x: first.x, y: first.y });
    expect(svg.classes.has('is-running')).toBe(false); expect(svg.classes.has('is-celebrating')).toBe(false);
    renderer.dispose(); expect(host.innerHTML).toBe(''); expect([...host.listeners.values()].every(listeners => listeners.size === 0)).toBe(true);
  });
});

describe('depth-bounded clearance anchors', () => {
  const landings = skyPuzzle().landings, zone = { x: .7, y: 1.1, w: .6, h: .6 };
  it('filters both exact anchors and nearest fallback anchors by zone depth', () => {
    expect(clearanceCutaway({ ...zone, z: 1 }, landings).anchors).toEqual([{ x: 1, y: 1, z: 1 }]);
    expect(clearanceCutaway({ ...zone, x: 1.3, w: .1, z: 2 }, landings).anchors).toEqual([{ x: 1, y: 1, z: 2 }]);
    expect(clearanceCutaways({ ...zone, z: 9 }, landings)).toEqual([]);
    expect(clearanceCutaway({ ...zone, d: 1 }, landings).anchors.every(p => p.z === 0)).toBe(true);
  });
  it('retains all legacy depths for unbounded zones and honors depth ranges', () => {
    expect(clearanceCutaway(zone, landings).anchors).toHaveLength(3);
    expect(clearanceCutaway({ ...zone, z: 1, d: 2 }, landings).anchors.map(p => p.z)).toEqual([1, 2]);
  });
});
