import type { Language } from '../rush/locale';
import { LIGHT_YEAR_AU, type Vec3 } from './coordinates';
import { MAP_SCOPES, universeMap, projectMap, interpolateMapViewport, validateMapRadius, type MapViewport, type MapScope } from './minimap';
import { mapCopy, mapScopeName, mapObjectName } from './minimap-locale';
import type { UniverseSnapshot } from './view';

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string> = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}
const point = (position: Vec3, viewport: MapViewport) => {
  const p = projectMap(position, viewport);
  // Route vertices must stay linear: clamping them individually would draw
  // fictitious travel along the rim. SVG clips the actual projected segments.
  return { x: 120 + (position[0] - viewport.center[0]) / viewport.radiusAU * 82, y: 92 - (position[1] - viewport.center[1]) / viewport.radiusAU * 82, outside: p.outside };
};

/** A renderer-independent overlay: it tracks the same camera, not the orbit camera or planner selection. */
export function createNavigationMap() {
  let scope: MapScope = 'adaptive', radiusLy = 5, language: Language = 'en', lastLanguage: Language | undefined;
  let key = '', from: MapViewport | undefined, target: MapViewport | undefined, viewport: MapViewport | undefined, started = 0;
  const element = document.createElement('details'); element.className = 'cosmic-map'; element.id = 'navigation-map'; element.open = true;
  const summary = document.createElement('summary'); summary.id = 'map-title'; element.append(summary);
  const controls = document.createElement('div'); controls.className = 'map-controls'; element.append(controls);
  const scopeLabel = document.createElement('label'); scopeLabel.htmlFor = 'map-scope'; scopeLabel.className = 'map-scope-label';
  const select = document.createElement('select'); select.id = 'map-scope';
  controls.append(scopeLabel, select);
  const radiusLabel = document.createElement('label'); radiusLabel.className = 'map-radius'; radiusLabel.htmlFor = 'map-radius';
  const radiusText = document.createElement('span');
  const input = document.createElement('input'); input.id = 'map-radius'; input.type = 'number'; input.min = '.001'; input.max = '100000000000'; input.step = 'any'; input.value = '5';
  radiusLabel.append(radiusText, input); controls.append(radiusLabel);
  radiusLabel.hidden = true;
  select.addEventListener('change', () => {
    if (!MAP_SCOPES.includes(select.value as MapScope)) return;
    scope = select.value as MapScope; radiusLabel.hidden = scope !== 'nearby';
  });
  input.addEventListener('change', () => { radiusLy = validateMapRadius(input.value === '' ? undefined : Number(input.value)); input.value = String(radiusLy); });
  const figure = document.createElement('figure'); element.append(figure);
  const svg = svgElement('svg', { viewBox: '0 0 240 184', role: 'img', 'aria-labelledby': 'map-description' }); figure.append(svg);
  const description = svgElement('title', { id: 'map-description' }); svg.append(description);
  const defs = svgElement('defs'), clip = svgElement('clipPath', { id: 'navigation-map-clip' });
  clip.append(svgElement('circle', { cx: '120', cy: '92', r: '82' })); defs.append(clip); svg.append(defs);
  svg.append(svgElement('circle', { cx: '120', cy: '92', r: '82', class: 'map-boundary' }));
  for (const r of [27, 55]) svg.append(svgElement('circle', { cx: '120', cy: '92', r: String(r), class: 'map-grid' }));
  svg.append(svgElement('path', { d: 'M38 92H202M120 10V174', class: 'map-grid' }));
  const geometry = svgElement('g', { 'clip-path': 'url(#navigation-map-clip)' }); svg.append(geometry);
  const horizon = svgElement('circle', { class: 'map-horizon', fill: 'none', cx: '120', cy: '92' }); geometry.append(horizon);
  const path = svgElement('path', { class: 'map-path', fill: 'none' }); geometry.append(path);
  const markerGroup = svgElement('g'); geometry.append(markerGroup);
  const labels = svgElement('g', { class: 'map-labels' }); svg.append(labels);
  const location = svgElement('g', { 'data-map-location': '' });
  location.append(svgElement('circle', { r: '6', class: 'map-location-ring' }), svgElement('circle', { r: '2.5', class: 'map-location-dot' }));
  const locationTitle = svgElement('title'); location.append(locationTitle); svg.append(location);
  const arrow = svgElement('path', { d: 'M-5 4L0-5 5 4Z', class: 'map-location-dot' }); svg.append(arrow);
  const caption = document.createElement('figcaption'); figure.append(caption);
  const status = document.createElement('p'); status.className = 'map-location-status';
  const scale = document.createElement('p'); scale.className = 'map-scale';
  const legend = document.createElement('p'); legend.className = 'map-legend';
  const projection = document.createElement('p'); projection.className = 'map-projection';
  caption.append(status, scale, legend, projection);
  const markers = new Map<string, { circle: SVGCircleElement; title: SVGTitleElement; label: SVGTextElement }>();

  function draw(snapshot: UniverseSnapshot, planned: UniverseSnapshot, lang: Language, now = performance.now()) {
    language = lang;
    const copy = mapCopy(language);
    if (lastLanguage !== language) {
      summary.textContent = copy.title; scopeLabel.textContent = copy.scope;
      select.textContent = '';
      for (const value of MAP_SCOPES) { const option = document.createElement('option'); option.value = value; option.textContent = mapScopeName(value, language); select.appendChild(option); }
      select.value = scope; radiusText.textContent = copy.radius; legend.textContent = copy.anchors; projection.textContent = copy.plane;
      lastLanguage = language;
    }
    const data = universeMap(snapshot, { scope, radiusLy }, planned);
    const route = planned.origin;
    const nextKey = `${scope}|${radiusLy}|${route?.destinationId}|${route?.epoch}|${planned.destinationId}|${planned.epoch}`;
    if (key !== nextKey || !target) {
      from = viewport ?? data.viewport; target = data.viewport; started = now; key = nextKey;
    }
    // Nearby framing follows our moving camera directly; only deliberate scope/route changes zoom.
    const progress = snapshot.reducedMotion ? 1 : Math.min(1, Math.max(0, (now - started) / 650));
    target = data.viewport;
    viewport = interpolateMapViewport(from!, target, progress * progress * (3 - 2 * progress));
    element.dataset.scope = scope; element.dataset.cameraAu = data.location.join(','); element.dataset.ageGyr = String(data.ageGyr);
    element.dataset.centerAu = viewport.center.join(','); element.dataset.radiusAu = String(viewport.radiusAU); element.dataset.transition = String(progress);
    if (!element.open) return;
    path.setAttribute('d', data.path.map((p, i) => { const q = point(p, viewport!); return `${i ? 'L' : 'M'}${q.x.toFixed(3)} ${q.y.toFixed(3)}`; }).join(' '));
    horizon.style.display = data.horizonRadiusAU ? '' : 'none';
    if (data.horizonRadiusAU) {
      const center = point([0, 0, 0], viewport);
      horizon.setAttribute('cx', String(center.x)); horizon.setAttribute('cy', String(center.y)); horizon.setAttribute('r', String(82 * data.horizonRadiusAU / viewport.radiusAU));
    }
    const active = new Set(data.markers.map(m => m.id));
    for (const [id, marker] of markers) if (!active.has(id)) { marker.circle.remove(); marker.label.remove(); markers.delete(id); }
    const occupied: { x: number; y: number; width: number }[] = [];
    const visibleNames: string[] = [];
    for (const marker of data.markers) {
      let node = markers.get(marker.id);
      if (!node) {
        const circle = svgElement('circle', { r: '2.7', 'data-map-object': marker.id });
        const title = svgElement('title'); circle.append(title); markerGroup.append(circle);
        const label = svgElement('text', { 'data-map-label': marker.id }); labels.append(label);
        node = { circle, title, label }; markers.set(marker.id, node);
      }
      const p = point(marker.position, viewport), name = mapObjectName(marker.id, language);
      node.title.textContent = name; node.label.textContent = name;
      const hollow = !marker.formed || marker.evidence === 'inferred' || marker.evidence === 'illustrative';
      node.circle.setAttribute('cx', String(p.x)); node.circle.setAttribute('cy', String(p.y)); node.circle.setAttribute('stroke', marker.color);
      node.circle.setAttribute('fill', hollow ? '#142335' : marker.color); node.circle.setAttribute('stroke-width', '1');
      node.circle.dataset.evidence = marker.evidence; node.circle.dataset.formed = String(marker.formed);
      node.circle.style.display = p.outside ? 'none' : '';
      node.label.style.display = 'none';
      if (p.outside) continue;
      visibleNames.push(name);
      const glyphs = Array.from(name), wide = /[\u3400-\u9fff\u3040-\u30ff]/.test(name);
      const limit = wide ? 12 : 24;
      const label = glyphs.length > limit ? `${glyphs.slice(0, limit - 1).join('')}…` : name;
      node.label.textContent = label;
      const width = Math.min(128, Math.max(25, Array.from(label).length * (wide ? 10 : 5.4)));
      const x = Math.max(3, Math.min(237 - width, p.x + 5));
      const y = p.y < 26 ? p.y + 13 : p.y - 7;
      if (occupied.length < 8 && !occupied.some(other => Math.abs(other.y - y) < 13 && x < other.x + other.width + 5 && x + width + 5 > other.x)) {
        node.label.setAttribute('x', String(x)); node.label.setAttribute('y', String(y)); node.label.setAttribute('aria-label', name);
        node.label.style.display = ''; occupied.push({ x, y, width });
      }
    }
    const current = point(data.location, viewport);
    // Off-plane locations can project inside the circle while lying outside its 3D scope.
    const direction = Math.hypot(current.x - 120, current.y - 92);
    const distance = current.outside ? 78 : Math.min(82, direction);
    const x = direction ? 120 + (current.x - 120) / direction * distance : 120;
    const y = direction ? 92 + (current.y - 92) / direction * distance : 92;
    location.setAttribute('transform', `translate(${x} ${y})`);
    location.dataset.outside = String(current.outside); locationTitle.textContent = current.outside ? copy.outside : copy.location;
    arrow.style.display = current.outside ? '' : 'none';
    arrow.setAttribute('transform', `translate(${x} ${y}) rotate(${Math.atan2(y - 92, x - 120) * 180 / Math.PI + 90})`);
    status.textContent = current.outside ? copy.outside : copy.location;
    status.classList.toggle('is-outside', current.outside);
    const widthAU = viewport.radiusAU * 2, ly = widthAU / LIGHT_YEAR_AU;
    const value = widthAU < 1e5 ? widthAU : ly;
    const unit = widthAU < 1e5 ? 'AU' : 'ly';
    const formatted = new Intl.NumberFormat(language, { maximumSignificantDigits: 3, notation: value >= 1e7 || value < .001 ? 'scientific' : 'standard' }).format(value);
    scale.textContent = `${copy.span}: ${formatted} ${unit}`;
    description.textContent = `${mapScopeName(scope, language)}. ${status.textContent}. ${copy.plane}. ${visibleNames.join(', ') || copy.empty}`;
    projection.title = scope === 'universe' ? copy.unknown : copy.note;
  }
  return { element, draw };
}
