import { describe, expect, it, vi, afterEach } from 'vitest';
import { cosmicBeta, createUniverseRenderer, universeMarkup, universeScene } from '../src/universe/renderer';
import type { SceneKind, UniverseSnapshot } from '../src/universe/view';
import { DESTINATIONS, EPOCHS } from '../src/universe/catalog';

const kinds: SceneKind[] = ['earth', 'moon', 'sun', 'rock', 'gas', 'ring', 'ice', 'comet', 'belt', 'triple', 'nebula', 'cluster', 'neutron', 'blackhole', 'galaxy', 'group', 'quasar', 'horizon', 'beyond'];
const snapshot = (changes: Partial<UniverseSnapshot> = {}): UniverseSnapshot => ({ destinationId: 'earth', kind: 'earth', color: '#77a9bc', epoch: 'present', beta: 0, travelling: false, progress: 0, paused: false, reducedMotion: false, ...changes });

afterEach(() => vi.unstubAllGlobals());
describe('original procedural universe art', () => {
  it.each(kinds)('renders a complete, deterministic %s scene', kind => {
    const view = snapshot({ kind, destinationId: kind });
    const markup = universeMarkup(view);
    expect(markup).toContain(`data-scene="${kind}"`);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('viewBox="0 0 1000 620"');
    expect(markup).toContain('data-object="scene"');
    expect(markup).not.toMatch(/NaN|Infinity|undefined|<image|<text|https?:\/\/(?!www\.w3\.org)|star.?wars|jedi|pokemon|minecraft/i);
    expect(markup).toBe(universeMarkup(view));
    expect(markup.length).toBeLessThan(210_000);
  });
  it('opens on a large blue marble with authored coastlines, clouds, atmosphere and cratered Moon', () => {
    const markup = universeMarkup(snapshot());
    expect(markup).toContain('data-art="blue-marble"');
    expect(markup).toContain('r="198.00"');
    expect(markup).toContain('url(#u-atmosphere)');
    expect(markup).toContain('data-art="craters"');
    expect(markup).toContain('M95 240');
  });
  it('differentiates every present-day destination kind', () => {
    expect(new Set(kinds.map(kind => universeMarkup(snapshot({ kind })))).size).toBe(kinds.length);
    expect(universeMarkup(snapshot({ kind: 'belt', destinationId: 'oort-cloud' }))).toContain('data-art="oort-cloud"');
    expect(universeMarkup(snapshot({ kind: 'belt', destinationId: 'kuiper-belt' }))).toContain('data-art="kuiper-belt"');
    expect(universeMarkup(snapshot({ kind: 'triple' }))).toContain('data-art="hierarchical-triple"');
    expect(universeMarkup(snapshot({ kind: 'blackhole' }))).toContain('data-art="black-hole-lensing"');
    expect(universeMarkup(snapshot({ kind: 'quasar' }))).toContain('data-art="quasar-jets"');
  });
  it.each([
    ['bang', 'hot'], ['plasma', 'plasma-field'], ['recombination', 'cmb'], ['dark', 'dark-field'], ['first', 'early-stars'],
  ] as const)('the %s epoch overrides ALL destination kinds', (epoch, scene) => {
    for (const kind of kinds) {
      const view = snapshot({ kind, epoch });
      expect(universeScene(view)).toBe(scene);
      const markup = universeMarkup(view);
      expect(markup).not.toMatch(/blue-marble|rock-planet|spiral-galaxy|quasar-jets|hierarchical-triple|black-hole-lensing/);
      if (epoch !== 'first') expect(markup).not.toContain('data-art="stars"');
    }
  });
  it('hot epochs fill the whole field instead of depicting a centered explosion', () => {
    expect(universeMarkup(snapshot({ epoch: 'bang' }))).toContain('data-art="hot-whole-field"><rect width="1000" height="620"');
    expect(universeMarkup(snapshot({ epoch: 'plasma' }))).toContain('data-art="plasma-whole-field"><rect width="1000" height="620"');
    expect(universeMarkup(snapshot({ epoch: 'recombination' }))).toContain('data-art="cmb-mottled-field"');
  });
  it('quasar-era recently formed destinations are replaced by gas, but ancient galaxies/cluster/Sgr A* remain', () => {
    for (const kind of ['earth', 'moon', 'sun', 'rock', 'gas', 'ring', 'ice', 'belt', 'comet', 'triple', 'nebula', 'neutron'] as SceneKind[]) {
      expect(universeScene(snapshot({ epoch: 'quasar', kind, destinationId: kind === 'neutron' ? 'young-pulsar' : kind }))).toBe('protogalaxies');
    }
    expect(universeScene(snapshot({ epoch: 'quasar', kind: 'blackhole', destinationId: 'stellar-black-hole' }))).toBe('protogalaxies');
    expect(universeScene(snapshot({ epoch: 'quasar', kind: 'blackhole', destinationId: 'sgr-a-star' }))).toBe('blackhole');
    for (const kind of ['galaxy', 'group', 'cluster', 'quasar'] as SceneKind[]) expect(universeScene(snapshot({ epoch: 'quasar', kind, destinationId: kind }))).toBe(kind);
    expect(universeScene(snapshot({ epoch: 'quasar', kind: 'neutron', destinationId: 'neutron' }))).toBe('neutron');
    expect(universeScene(snapshot({ epoch: 'quasar', kind: 'blackhole', destinationId: 'stellar-hole' }))).toBe('blackhole');
    expect(universeScene(snapshot({ epoch: 'quasar', kind: 'blackhole', destinationId: 'sagittarius' }))).toBe('blackhole');
  });
  it('keeps the renderer-local formation boundaries aligned with all catalog destinations', () => {
    const epoch = EPOCHS.find(item => item.id === 'quasar')!;
    expect(epoch.ageGyr).toBe(2);
    for (const destination of DESTINATIONS) {
      const view = snapshot({ destinationId: destination.id, kind: destination.kind, epoch: epoch.id });
      expect(universeScene(view)).toBe(destination.formedGyr <= epoch.ageGyr ? destination.kind : 'protogalaxies');
    }
    const globular = DESTINATIONS.find(item => item.id === 'cluster')!;
    expect(globular.name).toContain('47');
    expect(globular.formedGyr).toBe(1.8);
    expect(universeMarkup(snapshot({ destinationId: globular.id, kind: globular.kind, epoch: 'quasar' }))).toContain('data-art="globular-cluster"');
    for (const epoch of ['bang', 'plasma', 'recombination', 'dark', 'first'] as const) {
      const view = snapshot({ destinationId: 'milky-way', kind: 'galaxy', epoch });
      expect(universeMarkup(view)).not.toContain('data-art="spiral-galaxy"');
    }
  });
  it('shows illustrative future aftermath and sparse far-future remnants, never a modern Earth in the early epochs', () => {
    expect(universeMarkup(snapshot({ epoch: 'future' }))).toContain('data-art="scorched-earth"');
    expect(universeMarkup(snapshot({ epoch: 'future', kind: 'sun' }))).toContain('data-art="red-giant"');
    for (const kind of kinds) {
      const markup = universeMarkup(snapshot({ epoch: 'far', kind }));
      expect(markup).toContain('data-art="dim-sparse-remnants"');
      expect(markup).not.toContain('data-art="blue-marble"');
    }
  });
  it.each([.9999999999, 1, 20, -1, NaN, Infinity, -Infinity])('bounds illustrative optics for beta %s', beta => {
    const markup = universeMarkup(snapshot({ beta, travelling: true, progress: Infinity }));
    expect(markup).not.toMatch(/NaN|Infinity|undefined/);
    expect(cosmicBeta(beta)).toBeGreaterThanOrEqual(0);
    expect(cosmicBeta(beta)).toBeLessThan(1);
    expect(markup).not.toMatch(/speed-line|warp-line/);
  });
  it('accepts snapshots without interpolating destination IDs or colors into markup', () => {
    const markup = universeMarkup(snapshot({ destinationId: '"><script>alert(1)</script>', color: 'url(https://invalid.example/art)' }));
    expect(markup).not.toContain('<script'); expect(markup).not.toContain('invalid.example');
    expect(markup).not.toContain('<image');
  });
  it('marks paused and reduced-motion scenes as frozen', () => {
    expect(universeMarkup(snapshot({ paused: true }))).toContain('data-motion="frozen"');
    expect(universeMarkup(snapshot({ reducedMotion: true }))).toContain('data-motion="frozen"');
    expect(universeMarkup(snapshot())).toContain('data-motion="active"');
  });
});

class NodeStub {
  attributes = new Map<string, string>();
  listeners = new Map<string, EventListener>();
  parts = new Map<string, NodeStub>();
  markup = ''; writes = 0; removed = false;
  set innerHTML(value: string) { this.markup = value; this.writes++; this.parts.set('svg', new NodeStub()); }
  get innerHTML() { return this.markup; }
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  querySelector(selector: string): NodeStub { if (!this.parts.has(selector)) this.parts.set(selector, new NodeStub()); return this.parts.get(selector)!; }
  addEventListener(type: string, listener: EventListener) { this.listeners.set(type, listener); }
  removeEventListener(type: string) { this.listeners.delete(type); }
  getBoundingClientRect() { return { width: 1000, height: 620 }; }
  remove() { this.removed = true; }
}
describe('SVG renderer lifecycle and display-only controls', () => {
  it('holds snapshots before mounting, caches geometry, updates optics, and cleans up', () => {
    vi.stubGlobal('document', { hidden: false });
    const renderer = createUniverseRenderer(), host = new NodeStub();
    const view = Object.freeze(snapshot()); renderer.render(view); renderer.mount(host as unknown as HTMLElement);
    expect(host.markup).toContain('blue-marble'); expect(host.writes).toBe(1);
    renderer.render(snapshot({ beta: .999, progress: .5, travelling: true }));
    expect(host.writes).toBe(1);
    const svg = host.querySelector('svg');
    expect(svg.querySelector('[data-optics="shift"]').attributes.get('opacity')).toBe('0.17');
    renderer.zoom(1); expect(svg.attributes.get('viewBox')).not.toBe('0.00 0.00 1000.00 620.00');
    renderer.reset(); expect(svg.attributes.get('viewBox')).toBe('0.00 0.00 1000.00 620.00');
    renderer.render(snapshot({ epoch: 'dark' })); expect(host.writes).toBe(2);
    const current = host.querySelector('svg'); renderer.dispose();
    expect(current.removed).toBe(true); expect(host.listeners.size).toBe(0);
    renderer.dispose(); renderer.render(view);
    expect(host.writes).toBe(2); expect(view.progress).toBe(0);
  });
  it('does not advance transforms while paused, reduced-motion, or hidden', () => {
    const document = { hidden: false }; vi.stubGlobal('document', document);
    const renderer = createUniverseRenderer(), host = new NodeStub(); renderer.mount(host as unknown as HTMLElement);
    renderer.render(snapshot({ progress: .1 }));
    const object = host.querySelector('svg').querySelector('[data-object="scene"]');
    renderer.render(snapshot({ progress: .2 })); const active = object.attributes.get('transform');
    renderer.render(snapshot({ progress: .5, paused: true })); expect(object.attributes.get('transform')).toBe(active);
    renderer.render(snapshot({ progress: .6, reducedMotion: true })); expect(object.attributes.get('transform')).toBe(active);
    document.hidden = true; renderer.render(snapshot({ progress: .7 })); expect(object.attributes.get('transform')).toBe(active);
    renderer.dispose();
  });
});
