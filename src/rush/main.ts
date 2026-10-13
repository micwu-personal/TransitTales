import './style.css';
import '../languages.css';
import { createSvgCityRenderer, type CityRenderer } from './renderer';
import { metroExperienceText } from './experience-copy';
import { createInteriorInspector } from './inspector';
import { interiorText } from './interior';
import { createCitySnapshot } from './view';
import { COASTAL_LAYOUT } from './city';
import { NETWORK, SCENARIOS, CAPACITY, createGame, step, stats, lineFor, dispatch, canDispatch, preferredDirection, sendCrew, holdConnection, type LineId } from './model';

import { createLanguageController, languageOptions, isLanguage, text, stationNames, scenarioCopy, noticeText, type MessageArgs, type StaticMessageKey, messages } from './locale';
let languageStorage: Storage | undefined;
try { languageStorage = localStorage; } catch { /* Storage access itself can be blocked. */ }
const locale = createLanguageController(languageStorage, navigator.languages?.length ? navigator.languages : [navigator.language], applyLanguage);
const t = <K extends keyof typeof messages.en>(key: K, ...args: MessageArgs<K>) => text(locale.language, key, ...args);
const name = (id: string) => stationNames[locale.language][id];
const label = (key: StaticMessageKey) => `<span data-i18n="${key}">${text(locale.language, key)}</span>`;
const root = document.querySelector<HTMLDivElement>('#rush-app')!;
root.innerHTML = `
<header class="masthead"><a class="brand" href="index.html"><span class="brand-icon" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M8 27V13a8 8 0 0 1 16 0v14M6 21h20M11 27l-3 6m13-6 3 6"/><rect x="11" y="10" width="10" height="8" rx="2"/></svg></span><span><span lang="en">Transit Tales</span><small>${label('gameName')} · ${label('tagline')}</small></span></a><nav><a href="index.html">${label('home')}</a><a href="transit-concepts/">${label('concepts')}</a><a href="build-world.html">${label('building')}</a><div class="language-control"><label for="language">${label('language')}</label><select id="language">${languageOptions()}</select></div></nav></header>
<main class="layout"><section class="playfield" data-label-key="network">
<div class="field-top"><div><h1>${label('heading')}</h1><p>${label('intro')}</p></div><span class="city-stamp">${label('city')}<br>${label('fictional')}</span></div>
<div class="score-strip"><span><strong id="delivered">0</strong> ${label('delivered')}</span><span><strong id="waiting">0</strong> ${label('waiting')}</span><span><strong id="aboard">0</strong> ${label('aboard')}</span><span><strong id="clock">2:30</strong> ${label('remaining')}</span></div>
<div class="city-view-toolbar"><label id="city-view-label" for="city-view"></label><select id="city-view"><option value="3d"></option><option value="2d"></option></select><button id="city-reset" class="secondary" hidden></button></div><p id="city-view-status" class="city-view-status" role="status" aria-live="polite" hidden></p><div class="map-wrap" id="city-map"></div>
<div class="map-bottom"><p class="map-pan">${label('mapPan')}</p><div class="legend"><span><i class="coral"></i>${label('coralLegend')}</span><span><i class="blue"></i>${label('blueLegend')}</span><span>${label('queueLegend')}</span></div><p id="map-hint"></p></div>
<div class="shift-progress"><div id="progress"></div></div>
</section>
<aside class="desk" data-label-key="controls"><div class="scenario-row"><label for="scenario">${label('scenario')}</label><select id="scenario"></select></div>
<p id="briefing" class="briefing"></p><div class="shift-buttons"><button id="start" class="primary"></button><button id="speed">1×</button></div>
<div id="goal" class="goal"></div>
<section class="station-desk"><div class="station-heading"><span id="station-icon" aria-hidden="true"></span><div><h2 id="station-name"></h2><p id="station-queue"></p></div></div><div id="queue-visual" aria-hidden="true"></div><button id="inspect-station" class="secondary"></button><div class="depot"><span>${label('spareTrains')} <strong id="spares">● ●</strong></span><small id="refill"></small></div><div id="dispatch-actions"></div><button id="crew" class="secondary"></button><small class="action-explainer">${label('helperExplanation')}</small><div id="connection"></div></section>
<div class="bulletin"><span aria-hidden="true">✦</span><p id="notice" role="status" aria-live="polite"></p></div>
<details id="help"><summary>${label('helpTitle')}</summary><ol><li>${label('help1')}</li><li>${label('help2')}</li><li>${label('help3')}</li><li>${label('help4')}</li></ol><p>${label('helpKeys')}</p></details>
</aside>
<section id="interior" class="interior" hidden aria-labelledby="interior-title"></section>
<section id="result" class="results" hidden aria-live="polite"></section>
</main><footer>${label('footer')} · <span id="save-note"></span></footer>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let game = createGame(); let selected = game.scenario.hot; let paused = false; let speed = 1; let accumulator = 0; let previous = performance.now(); let animationFrame = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let announced = '';
function applyLanguage() {
  document.documentElement.lang = locale.language; document.title = t('title');
  ($('language') as HTMLSelectElement).value = locale.language;
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node => { node.textContent = text(locale.language, node.dataset.i18n as StaticMessageKey); });
  root.querySelectorAll<HTMLElement>('[data-label-key]').forEach(node => { node.setAttribute('aria-label', text(locale.language, node.dataset.labelKey as StaticMessageKey)); });
  const select = $('scenario') as HTMLSelectElement;
  if (!select.options.length) select.innerHTML = SCENARIOS.map(s => `<option value="${s.id}"></option>`).join('');
  for (const option of Array.from(select.options)) { const copy = scenarioCopy[locale.language][option.value]; option.textContent = `${copy.name} — ${copy.subtitle}`; }
  select.value = game.scenario.id;
  announced = ''; render();
  if (game.phase === 'finished') renderResult(false);
  $('save-note').textContent = t(storageAvailable ? 'saved' : 'storageUnavailable');
}

let storageAvailable = true;
function best(id: string): number { try { return Number(localStorage.getItem(`rush-best-${id}`)) || 0; } catch { storageAvailable = false; return 0; } }
function saveBest() { try { localStorage.setItem(`rush-best-${game.scenario.id}`, String(Math.max(best(game.scenario.id), stats(game).score))); } catch { storageAvailable = false; } }
function reset(id: string) { inspector.close(); game = createGame(SCENARIOS.find(s => s.id === id)!); selected = game.scenario.hot; paused = false; accumulator = 0; announced = ''; $('result').hidden = true; render(); }
function selectStation(id: string) { selected = id; renderDesk(); renderMap(); inspector.open({kind: 'station', id}); }
let renderer: CityRenderer & { resetCamera?: () => void } = createSvgCityRenderer();
let currentView: '2d' | '3d' = '2d';
let requestedView: '2d' | '3d' = new URLSearchParams(location.search).get('view') === '2d' ? '2d' : '3d';
let viewRequest = 0;
let pageInactive = false;
let viewState: 'loading' | 'fallback' | '' = '';
const inspector = createInteriorInspector($('interior'), () => game, () => locale.language);
const selectTrain = (id: number) => inspector.open({kind: 'train', id});
renderer.mount($('city-map'), selectStation, selectTrain);
function renderViewControls() {
  const c = metroExperienceText(locale.language);
  const select = $('city-view') as HTMLSelectElement;
  select.value = requestedView;
  select.options[0].textContent = c.depth; select.options[1].textContent = c.flat;
  $('city-view-label').textContent = c.view;
  $('city-reset').textContent = c.reset; $('city-reset').hidden = currentView !== '3d';
  $('city-view-status').hidden = !viewState;
  $('city-view-status').textContent = viewState ? c[viewState] : '';
  $('city-map').setAttribute('aria-busy', String(viewState === 'loading'));
  const hint = root.querySelector<HTMLElement>('.map-pan')!;
  hint.textContent = currentView === '3d' ? c.orbit : t('mapPan');
  hint.classList.toggle('city-orbit-hint', currentView === '3d');
}
function mountRenderer(next: CityRenderer & { resetCamera?: () => void }, mode: '2d' | '3d') {
  const focused = document.activeElement;
  const stationFocus = focused instanceof Element ? focused.closest('[data-station]')?.getAttribute('data-station') : null;
  const trainFocus = focused instanceof Element ? focused.closest('[data-train]')?.getAttribute('data-train') : null;
  renderer.dispose(); renderer = next;
  try { renderer.mount($('city-map'), selectStation, selectTrain); currentView = mode; renderMap(); }
  catch (error) { renderer.dispose(); throw error; }
  renderViewControls();
  if (stationFocus || trainFocus) {
    const nodes = $('city-map').querySelectorAll<HTMLElement | SVGElement>(stationFocus ? '[data-station]' : '[data-train]');
    const target = Array.from(nodes).find(node => node.getAttribute(stationFocus ? 'data-station' : 'data-train') === (stationFocus ?? trainFocus));
    target?.focus({ preventScroll: true });
  }
}
function fallbackTo2d() {
  if (pageInactive) return;
  viewRequest++; requestedView = '2d'; viewState = 'fallback';
  mountRenderer(createSvgCityRenderer(), '2d');
}
async function chooseView(mode: '2d' | '3d') {
  requestedView = mode; const request = ++viewRequest;
  if (mode === '2d') { viewState = ''; mountRenderer(createSvgCityRenderer(), '2d'); return; }
  if (currentView === '3d') { viewState = ''; renderViewControls(); return; }
  viewState = 'loading'; renderViewControls();
  try {
    const { create3dCityRenderer } = await import('./renderer3d');
    if (pageInactive || request !== viewRequest) return;
    const next = create3dCityRenderer(() => { if (renderer === next) fallbackTo2d(); });
    viewState = ''; mountRenderer(next, '3d');
  } catch { if (!pageInactive && request === viewRequest) fallbackTo2d(); }
}
($('city-view') as HTMLSelectElement).onchange = event => { const mode = (event.target as HTMLSelectElement).value; if (mode === '2d' || mode === '3d') void chooseView(mode); };
$('city-reset').onclick = () => renderer.resetCamera?.();
function renderMap() {
  renderer.render(createCitySnapshot(game, { selected, language: locale.language, interpolationSeconds: accumulator, animate: !paused && !reducedMotion, layout: COASTAL_LAYOUT }));
}
window.addEventListener('pagehide', () => { pageInactive = true; viewRequest++; cancelAnimationFrame(animationFrame); renderer.dispose(); inspector.stop(); });
window.addEventListener('pageshow', event => { if (event.persisted) {
  pageInactive = false; renderer = createSvgCityRenderer(); currentView = '2d';
  renderer.mount($('city-map'), selectStation, selectTrain); previous = performance.now(); accumulator = 0;
  renderMap(); void chooseView(requestedView); animationFrame = requestAnimationFrame(frame);
} });
document.addEventListener('visibilitychange', () => { previous = performance.now(); accumulator = 0; });
function renderDesk() {
  $('inspect-station').textContent = interiorText(locale.language).inspect;
  const station = NETWORK.stations.find(s => s.id === selected)!; const count = game.queues[selected].length; const st = stats(game);
  $('station-name').textContent = name(selected); $('station-icon').textContent = station.icon; $('station-queue').textContent = t(count === 1 ? 'queueOne' : 'queueMany', { count }) + t(count >= 20 ? 'queueBusy' : count ? 'queueCalm' : 'queueEmpty');
  $('queue-visual').innerHTML = Array.from({ length: Math.min(16, count) }, (_, i) => `<span style="--person:${['#b94432','#286cb1','#397455','#906237'][i%4]}">♟</span>`).join('') + (count > 16 ? `<small>+${count-16}</small>` : '');
  $('spares').textContent = `${'▣ '.repeat(game.spares)}${'· '.repeat(3-game.spares)}`; $('spares').setAttribute('aria-label', t('spareCount', { count: game.spares })); $('refill').textContent = t('refill', { seconds: Math.max(0, game.nextSpare-game.time) });
  const lines = NETWORK.lines.filter(l => l.stops.includes(selected));
  const actions = $('dispatch-actions');
  const markup = lines.map(l => {
    const d = preferredDirection(game, selected, l.id); const terminal = name((d === 1 ? l.stops.at(-1) : l.stops[0])!);
    const allowed = canDispatch(game, selected, l.id); const blocked = game.phase !== 'playing' ? t('startFirst') : game.spares === 0 ? t('depotRefilling') : !allowed ? t('boarding') : t('toward', { station: terminal, capacity: CAPACITY });
    return `<button class="dispatch ${l.id}" data-line="${l.id}" ${allowed ? '' : 'disabled'}><span>${t('dispatch', { line: t(l.id) })}</span><small>${blocked}</small></button>`;
  }).join('');
  if (actions.dataset.markup !== markup) { actions.innerHTML = markup; actions.dataset.markup = markup; }
  $('crew').toggleAttribute('disabled', game.phase !== 'playing' || game.crewCooldown > 0); $('crew').textContent = game.crewCooldown ? t('helperCooldown', { seconds: game.crewCooldown }) : t('helpers');
  const stopped = game.trains.filter(t => !t.moving && lineFor(game, t.line).stops[t.index] === 'central');
  const connectionMarkup = selected === 'central' ? `<h3>${t('connection')}</h3>${stopped.length ? stopped.map(t => `<button class="secondary hold" data-hold="${t.id}" ${game.phase !== 'playing' || t.held || game.holdCooldown ? 'disabled' : ''}>${text(locale.language, 'hold', { line: text(locale.language, t.line) })}${t.held ? ` · ${text(locale.language, 'held')}` : game.holdCooldown ? ` · ${text(locale.language, 'holdCooldown', { seconds: game.holdCooldown })}` : ''}</button>`).join('') : `<p class="connection-note">${t('connectionWait')}</p>`}` : '';
  if ($('connection').dataset.markup !== connectionMarkup) { $('connection').innerHTML = connectionMarkup; $('connection').dataset.markup = connectionMarkup; }
  $('goal').innerHTML = `<span>${t('mission')} <strong>${t('missionTarget', { target: game.scenario.target })}</strong></span><span>${Math.round(Math.min(1,game.delivered/game.scenario.target)*100)}%</span><meter min="0" max="${game.scenario.target}" value="${Math.min(game.delivered,game.scenario.target)}" aria-label="${t('missionProgress')}"></meter>`;
  $('briefing').textContent = scenarioCopy[locale.language][game.scenario.id].briefing;
  $('start').textContent = t(game.phase === 'ready' ? 'start' : game.phase === 'finished' ? 'replayShift' : paused ? 'resume' : 'pause');
  $('speed').textContent = `${speed}×`; $('speed').setAttribute('aria-label', t('speed', { speed })); $('delivered').textContent = String(game.delivered); $('waiting').textContent = String(st.waiting); $('aboard').textContent = String(st.aboard);
  const remaining = Math.max(0,game.scenario.duration-game.time); $('clock').textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
  $('progress').style.transform = `scaleX(${game.time/game.scenario.duration})`;
  $('map-hint').textContent = game.phase === 'ready' ? t('hintReady', { station: name(game.scenario.hot) }) : paused ? t('hintPaused') : game.phase === 'finished' ? t('hintFinished') : t('hintRunning', { count: game.trains.length });
  const latest = noticeText(locale.language, game.notices.at(-1)!); if (latest !== announced) { $('notice').textContent = latest; announced = latest; }
}
function renderResult(persist = true) {
  if (persist) saveBest(); const s = stats(game);
  $('result').innerHTML = `<div class="result-art" aria-hidden="true">${'★'.repeat(s.stars)}${'☆'.repeat(3-s.stars)}</div><div><h2>${t(s.stars >= 2 ? 'resultGreat' : 'resultGood')}</h2><p>${t('resultStats', { delivered: game.delivered, transfers: game.transfers, wait: s.averageWait })}</p><p>${t('resultLeft', { count: game.left })} ${t(s.stars >= 2 ? 'resultChallenge' : 'resultTip')}</p><p>${t('resultScore')} <strong>${s.score}</strong> · ${t('resultBest')} <strong>${Math.max(best(game.scenario.id),s.score)}</strong></p><div class="result-buttons"><button id="replay" class="primary">${t('replay')}</button><button id="next" class="secondary">${t('next')}</button></div></div>`;
  $('result').hidden = false;
  $('replay').onclick = () => reset(game.scenario.id);
  $('next').onclick = () => { const next = SCENARIOS[(SCENARIOS.indexOf(game.scenario)+1)%SCENARIOS.length]; $('scenario').setAttribute('value', next.id); ($('scenario') as HTMLSelectElement).value = next.id; reset(next.id); };
  $('save-note').textContent = t(storageAvailable ? 'saved' : 'storageUnavailable');
}
function render() { renderDesk(); renderMap(); renderViewControls(); inspector.render(); }
($('language') as HTMLSelectElement).onchange = e => { const value = (e.target as HTMLSelectElement).value; if (isLanguage(value)) locale.setLanguage(value); };
$('inspect-station').onclick = () => inspector.open({kind: 'station', id: selected});
$('start').onclick = () => { if (game.phase === 'ready') game.phase = 'playing'; else if (game.phase === 'finished') reset(game.scenario.id); else paused = !paused; accumulator = 0; render(); };
$('speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; renderDesk(); };
($('scenario') as HTMLSelectElement).onchange = e => reset((e.target as HTMLSelectElement).value);
$('dispatch-actions').onclick = e => { const btn = (e.target as Element).closest<HTMLButtonElement>('[data-line]'); if (btn && dispatch(game, selected, btn.dataset.line as LineId)) render(); };
$('crew').onclick = () => { if (sendCrew(game, selected)) render(); };
$('connection').onclick = e => { const btn = (e.target as Element).closest<HTMLButtonElement>('[data-hold]'); if (btn && holdConnection(game, Number(btn.dataset.hold))) render(); };
document.addEventListener('keydown', e => { if ((e.target as Element).closest('button,select,summary,[data-station],[data-train]')) return; if (e.code === 'Space') { e.preventDefault(); $('start').click(); } if (['1','2','3'].includes(e.key)) { speed = Number(e.key); renderDesk(); } });
function frame(now: number) {
  const dt = Math.min((now-previous)/1000,0.25); previous = now;
  if (game.phase === 'playing' && !paused && !document.hidden) {
    accumulator += dt * speed;
    while (accumulator >= 1 && game.phase === 'playing') { accumulator--; step(game); renderDesk(); inspector.render(); if (game.time >= game.scenario.duration) renderResult(); }
  }
  renderMap(); animationFrame = requestAnimationFrame(frame);
}
applyLanguage(); void chooseView(requestedView); animationFrame = requestAnimationFrame(frame);
