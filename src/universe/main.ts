import '../languages.css';
import './style.css';
import { createLanguageController, languageOptions, type Language } from '../rush/locale';
import { DESTINATIONS, EPOCHS } from './catalog';
import { createJourney, readJourney, writeJourney, beginJump, tickJourney, resolveEncounter, encounterFor, canObserve, lorentzFactor, dopplerFactor } from './model';
import { universeCopy, destinationName, epochName, factText, epochText, encounterText } from './locale';
import { createUniverseRenderer } from './renderer';
import { createAmbientMusic } from './music';
import { freezeSnapshot, type UniverseRenderer, type UniverseSnapshot } from './view';
import { routeItinerary, routeFrame } from './route';
import { coordinateBody } from './coordinates';
import { createNavigationMap } from './minimap-view';
import { mapCopy } from './minimap-locale';
import { MAP_SOURCES } from './minimap';
import { createNarration } from './narration';
import { narrationCopy } from './narration-locale';
import { epochNarration, flybyCue, narrationText } from './narration-cues';
import { createDeviceMotionController, type DeviceMotionState } from './device-motion';
import { instrumentCopy, updateInstruments } from './instruments';

const host = document.querySelector<HTMLDivElement>('#universe')!;
const esc = (text: string) => text.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
let storage: Storage | undefined;
try { storage = localStorage; } catch { /* Exploration remains available without storage. */ }
let state = readJourney(storage), selected = state.destinationId, selectedEpoch = state.epochId;
let view: '2d' | '3d' = new URLSearchParams(location.search).get('view') === '2d' ? '2d' : '3d';
let renderer: UniverseRenderer | null = null, generation = 0, disposed = false, fallback = false, saveOk = !!storage;
let audioFailed = false, musicWanted = false, volume = .25, atlasOpen = true, helpOpen = false, journalOpen = false;
let resetOpen = false, frame = 0, audioGeneration = 0, lastTime = performance.now(), lastUiTime = 0;
let sceneTimer: ReturnType<typeof setTimeout> | undefined, frameTimer: ReturnType<typeof setTimeout> | undefined;
let pendingRenderer: UniverseRenderer | null = null, effectTime = 0, mapUntil = 0, sceneVisible = true, lastDrawTime = 0;
let quality: 'eco' | 'balanced' | 'high' = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches ? 'eco' : 'balanced';
let motionReading: DeviceMotionState | undefined, motionKey = '';
const formats = new Map<string, Intl.NumberFormat>();
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const sceneHost = document.createElement('div'); sceneHost.className = 'cosmic-scene';
const navigationMap = createNavigationMap();
const language = createLanguageController(storage, navigator.languages, () => render());
const c = () => universeCopy(language.language);
const destination = () => DESTINATIONS.find(d => d.id === state.destinationId)!;
const epoch = () => EPOCHS.find(e => e.id === state.epochId)!;
const departureDestination = () => DESTINATIONS.find(d => d.id === state.departureDestinationId) ?? destination();
const departureEpoch = () => EPOCHS.find(e => e.id === state.departureEpochId) ?? epoch();
const picked = () => DESTINATIONS.find(d => d.id === selected)!;
const pickedEpoch = () => EPOCHS.find(e => e.id === selectedEpoch)!;
const music = createAmbientMusic(() => { audioFailed = true; musicWanted = false; render(); });
const narrator = createNarration(updateNarration);
const spokenStops = new Set<string>();
let narrationCaption = '', narrationObject = '';
let objectStoryOpen = false;
const deviceMotion = createDeviceMotionController(reading => { motionReading = reading; updateMotion(); requestDraw(); });
motionReading = deviceMotion.state;
const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
  sceneVisible = entries.some(entry => entry.isIntersecting);
  lastTime = performance.now(); if (sceneVisible) requestDraw();
}) : null;
observer?.observe(sceneHost);
navigationMap.element.addEventListener('change', () => { mapUntil = performance.now() + 700; updateMap(); requestDraw(); });
navigationMap.element.addEventListener('toggle', () => { mapUntil = performance.now() + 700; updateMap(); requestDraw(); });
function persist() { saveOk = writeJourney(storage, state); }
function snapshot(): UniverseSnapshot {
  const reading = motionReading;
  return freezeSnapshot({destinationId: state.destinationId, kind: destination().kind, color: destination().color, epoch: state.epochId, beta: state.beta, travelling: state.phase === 'travelling', progress: state.progress, paused: state.paused || document.hidden, reducedMotion: motion.matches, coordinateView: true, effectTime, origin: {destinationId: departureDestination().id, kind: departureDestination().kind, color: departureDestination().color, epoch: departureEpoch().id}, inspection: reading?.status === 'active' ? { yaw: reading.yaw, pitch: reading.pitch, roll: 0, offset: [reading.inspection.x, reading.inspection.y, reading.inspection.z] } : undefined});
}
const number = (value: number, maximumFractionDigits = 2) => {
  const notation = value >= 1e6 || (value > 0 && value < .001) ? 'scientific' : 'standard';
  const key = `${language.language}|${maximumFractionDigits}|${notation}`;
  let format = formats.get(key);
  if (!format) { format = new Intl.NumberFormat(language.language, {maximumFractionDigits, notation}); formats.set(key, format); }
  return format.format(value);
};
function crewArt() {
  return `<svg viewBox="0 0 200 135" aria-hidden="true"><path d="M0 119h200v16H0z" fill="#c3d9d4"/><path d="M31 120V85q0-15 18-15h28q18 0 18 15v35" fill="#e6ac64"/><path d="M54 101v19m23-19v19" stroke="#244d52" stroke-width="8"/><path d="M31 94L20 113m74-19 14 16" stroke="#dfb790" stroke-width="10" stroke-linecap="round"/><ellipse cx="64" cy="48" rx="24" ry="28" fill="#dfb790"/><path d="M40 46q-7-37 27-35 32 1 22 38l-8-21q-16 14-38 6" fill="#334549"/><path d="M53 48v3m21-3v3" stroke="#334549" stroke-width="3" stroke-linecap="round"/><path d="M59 61q5 5 11 0" fill="none" stroke="#81524b" stroke-width="2" stroke-linecap="round"/><path d="M121 120q-9-40 20-47l-2-21 16 12 19-12-2 24q24 10 15 44" fill="#9caca7"/><path d="M136 88q18 23 42 0" fill="#f3eada"/><path d="M124 113q-24-16-15-33" fill="none" stroke="#9caca7" stroke-width="9" stroke-linecap="round"/><path d="M151 78v3m17-3v3" stroke="#284d47" stroke-width="3"/><path d="M159 87l4 0-2 3z" fill="#81524b"/><path d="M134 87h15m21 0h19" stroke="#526961" stroke-width="1.5"/></svg>`;
}
function render() {
  if (disposed) return;
  const copy = c(), lang = language.language, instruments = instrumentCopy(lang), focused = (document.activeElement as HTMLElement | null)?.id;
  narrator.setLanguage(lang);
  narrator.setPaused(document.hidden || (state.phase === 'travelling' && state.paused));
  document.documentElement.lang = lang; document.title = `Transit Tales — ${copy.title}`;
  const available = canObserve(destination(), epoch()), busy = state.phase === 'travelling';
  const itinerary = routeItinerary(busy ? departureDestination().id : state.destinationId, busy ? state.destinationId : selected);
  const challenge = state.phase === 'encounter' && state.outcome !== 'success' ? encounterFor(state) : null;
  const translated = challenge ? encounterText(challenge.kind, lang) : null;
  const groups = [['earth',copy.earthGroup],['solar',copy.solarGroup],['stars',copy.starsGroup],['galaxy',copy.galaxyGroup],['deep',copy.deepGroup]];
  const destinationOptions = DESTINATIONS.map(d => `<option value="${d.id}"${d.id === selected ? ' selected' : ''}>${esc(destinationName(d.id,lang))}</option>`).join('');
  host.innerHTML = `<header class="voyage-header"><a href="index.html" class="home-link">← ${esc(copy.home)}</a><h1>${esc(copy.title)}</h1><div class="header-tools"><div class="view-switch" role="group" aria-label="${esc(copy.illustration)}"><button id="view3d" aria-label="${esc(copy.view3d)}" aria-pressed="${view === '3d'}">3D</button><button id="view2d" aria-label="${esc(copy.view2d)}" aria-pressed="${view === '2d'}">2D</button></div><label class="language-control" for="language">${esc(copy.language)}<select id="language">${languageOptions(lang)}</select></label><button id="help-toggle" aria-expanded="${helpOpen}" aria-controls="help-panel">${esc(copy.help)}</button></div></header>
  <main class="voyage"><p class="invitation">${esc(copy.intro)}</p>
  <div class="observation"><aside class="atlas" aria-label="${esc(copy.atlas)}"><details id="atlas"${atlasOpen ? ' open' : ''}><summary>${esc(copy.atlas)} <span aria-hidden="true">⌄</span></summary><div class="route-controls"><label for="destination">${esc(copy.destination)}<select id="destination"${busy ? ' disabled' : ''}>${destinationOptions}</select></label><label for="epoch">${esc(copy.epoch)}<select id="epoch"${busy ? ' disabled' : ''}>${EPOCHS.map(e => `<option value="${e.id}"${e.id === selectedEpoch ? ' selected' : ''}>${esc(epochName(e.id,lang))}</option>`).join('')}</select></label></div><nav class="atlas-list" aria-label="${esc(copy.atlas)}">${groups.map(([group,label]) => `<section><h2>${esc(label)}</h2>${DESTINATIONS.filter(d => d.group === group).map(d => `<button id="go-${d.id}" class="atlas-stop" data-destination="${d.id}" aria-pressed="${d.id === selected}"${busy ? ' disabled' : ''}><span class="world-dot" style="--world-color:${d.color}" aria-hidden="true"></span><span>${esc(destinationName(d.id,lang))}</span><span class="visited" aria-label="${esc(copy.completed)}">${state.visited.includes(d.id) ? '✓' : ''}</span></button>`).join('')}</section>`).join('')}</nav></details><div class="speed-control"><label for="speed">${esc(copy.speed)} <output id="beta-output">${number(state.beta * 100,1)}% c</output></label><input id="speed" type="range" min="0" max="999" step="1" value="${Math.round(state.beta * 1000)}" aria-label="${esc(copy.betaLabel)}"><span class="range-ends">0 <span>0.999 c</span></span></div><div class="launch-row"><button id="depart" class="primary"${busy ? ' disabled' : ''}>${esc(busy ? copy.travelling : copy.depart)} <span aria-hidden="true">↗</span></button><button id="pause"${!busy ? ' disabled' : ''}>${esc(state.paused ? copy.resume : copy.pause)}</button><button id="epoch-apply" aria-label="${esc(copy.epochApply)} · ${esc(destinationName(state.destinationId,lang))}"${busy || selected !== state.destinationId ? ' disabled' : ''}>${esc(copy.epochApply)}</button></div><div class="flight-progress"><progress id="progress" value="${busy ? state.progress : state.phase === 'encounter' ? 1 : 0}" max="1" aria-label="${esc(copy.flightTime)}"></progress><p id="flight-status" role="status">${esc(state.outcome === 'success' ? copy.success : state.outcome === 'retry' ? copy.retry : state.paused ? copy.pause : busy ? copy.travelling : state.phase === 'encounter' ? copy.arrived : copy.ready)}</p></div><section class="route-itinerary" aria-label="${esc(copy.itinerary)}"><h3>${esc(copy.itinerary)}</h3><ol>${itinerary.map((id,i) => `<li data-route-stop="${id}">${i ? '<span aria-hidden="true">→</span> ' : ''}${esc(destinationName(id,lang))}</li>`).join('')}</ol><p>${esc(copy.routeGuide)}</p></section></aside>
  <section class="window" aria-label="${esc(copy.illustration)}"><div id="scene-slot"></div><div class="window-caption" data-travelling="${busy}"><h2>${esc(destinationName(busy ? departureDestination().id : state.destinationId,lang))}${busy && departureDestination().id !== state.destinationId ? ` → ${esc(destinationName(state.destinationId,lang))}` : ''}</h2><p>${esc(epochName(busy ? departureEpoch().id : state.epochId,lang))}${busy && departureEpoch().id !== state.epochId ? ` → ${esc(epochName(state.epochId,lang))}` : ''}</p><span>${esc(busy ? copy.travelling : available && !epoch().speculative && destination().kind !== 'beyond' ? copy.science : copy.imagination)}</span></div><div class="flight-instruments" aria-label="${esc(instruments.title)}"><p id="route-readout" class="route-readout"${busy ? '' : ' hidden'}></p><dl class="instrument-grid">${[['speed','flight-speed'],['gamma','flight-gamma'],['sr','flight-sr'],['gr','flight-gr'],['cosmos','flight-cosmos'],['observer','flight-observer'],['traveler','flight-traveler']].map(([label,id]) => `<div><dt>${esc(instruments[label as keyof typeof instruments])}</dt><dd id="${id}"></dd></div>`).join('')}</dl><p id="flight-stationary"></p></div><div class="scene-toolbar"><button id="zoom-in" aria-label="${esc(copy.zoomIn)}">+</button><button id="zoom-out" aria-label="${esc(copy.zoomOut)}">−</button><button id="camera-reset" aria-label="${esc(copy.resetCamera)}">↺</button></div><div class="crew-portrait">${crewArt()}<span>${esc(copy.crew)}</span></div><div class="window-footnote">${esc(copy.illustration)}</div></section></div>
  <section class="observation-settings" aria-label="${esc(instruments.sensors)}"><label for="render-quality">${esc(instruments.quality)}<select id="render-quality">${(['eco','balanced','high'] as const).map(value => `<option value="${value}"${quality === value ? ' selected' : ''}>${esc(instruments[value])}</option>`).join('')}</select></label><label for="motion-mode">${esc(instruments.sensors)}<select id="motion-mode"><option value="look"${deviceMotion.state.mode === 'look' ? ' selected' : ''}>${esc(instruments.look)}</option><option value="inspect"${deviceMotion.state.mode === 'inspect' ? ' selected' : ''}>${esc(instruments.inspect)}</option></select></label><button id="motion-enable">${esc(instruments.enable)}</button><button id="motion-recenter">${esc(instruments.recenter)}</button><output id="motion-status" role="status"></output><p>${esc(instruments.sensorNote)}</p><details class="instrument-explanation"><summary>${esc(instruments.title)}</summary><p>${esc(instruments.note)}</p></details></section><div class="flight-desk"><section class="navigation-desk" aria-labelledby="navigation-title"><h2 id="navigation-title">${esc(destinationName(selected,lang))}</h2><p class="selected-era">${esc(epochName(selectedEpoch,lang))}</p><p class="destination-fact">${esc(factText(selected,lang))}</p>${narrationPanel(lang,busy)}<div class="coordinates"><span>${esc(copy.distance)} <b>${number(picked().distanceLy)} ly</b></span><span>${esc(copy.lookback)} <b>${number(picked().lookbackGyr, 4)} Gyr</b></span><span>${esc(copy.localEpoch)} <b>${number(pickedEpoch().ageGyr,4)} Gyr</b></span></div><p class="epoch-note">${esc(epochText(selectedEpoch,lang))}</p>${!canObserve(picked(),pickedEpoch()) ? `<p class="temporal-warning">${esc(copy.notFormed)}</p>` : ''}<p class="fine-print">${esc(copy.simulationNote)}</p></section>
  <section class="discovery-desk" aria-labelledby="discovery-title"><h2 id="discovery-title">${esc(copy.encounter)}</h2><div class="meters"><div><span>${esc(copy.shield)}</span><b id="shield">${number(state.shield,0)}%</b></div><div><span>${esc(copy.energy)}</span><b id="energy">${number(state.energy,0)}%</b></div><div><span>${esc(copy.research)}</span><b id="research">${number(state.research,0)}</b></div><div><span>${esc(copy.friendship)}</span><b id="friendship">${number(state.friendship,0)}</b></div></div><p class="crew-line">${esc(copy.crewLine)}</p>${challenge ? `<div class="encounter-story"><p>${esc(available ? translated!.prompt : copy.notFormed)}</p><div class="encounter-choices" role="group" aria-label="${esc(copy.choose)}">${challenge.choices.map(choice => `<button id="choice-${choice.id}" data-choice="${choice.id}">${esc(translated!.choices[choice.id] ?? (lang === 'zh-CN' ? choice.labelZh : choice.label))}</button>`).join('')}</div></div>` : `<p class="quiet-message">${esc(state.outcome === 'success' ? copy.success : busy ? copy.travelling : copy.choose)}</p>`}<p class="safe-note">${esc(copy.safeBubble)}</p><dl class="relativity"><div><dt>${esc(copy.gammaLabel)}</dt><dd id="gamma">${number(lorentzFactor(state.beta),3)}×</dd></div><div><dt>${esc(copy.dopplerLabel)}</dt><dd id="doppler">${number(dopplerFactor(state.beta),3)}×</dd></div><div><dt>${esc(copy.observerClock)}</dt><dd id="observer-clock">${number(state.elapsed,1)} s</dd></div><div><dt>${esc(copy.crewClock)}</dt><dd id="crew-clock">${number(state.properElapsed,1)} s</dd></div></dl><p class="fine-print">${esc(copy.speedNote)}</p><p class="fine-print">${esc(copy.flightTime)}</p></section></div>
  <section class="after-flight"><details id="journal"${journalOpen ? ' open' : ''}><summary>${esc(copy.journal)} · ${state.visited.length}/${DESTINATIONS.length}</summary>${state.visited.length ? `<ul>${state.visited.map(id => `<li>${esc(destinationName(id,lang))}</li>`).join('')}</ul>` : `<p>${esc(copy.emptyJournal)}</p>`}${state.visited.length === DESTINATIONS.length ? `<p>${esc(copy.allDiscovered)}</p>` : ''}</details><div class="sound-desk"><button id="music" aria-pressed="${musicWanted}">${esc(musicWanted ? copy.musicOff : copy.musicOn)}</button><label for="volume">${esc(copy.volume)}<input id="volume" type="range" min="0" max="50" value="${Math.round(volume * 100)}"></label><p>${esc(audioFailed ? copy.audioUnavailable : copy.music)}</p></div></section>
  <section id="help-panel" class="help-panel"${helpOpen ? '' : ' hidden'}><h2>${esc(copy.help)}</h2><p>${esc(copy.helpBody)}</p><p>${esc(copy.timeNote)}</p><p>${esc(copy.lightCone)}</p><p>${esc(copy.formationNote)}</p><p>${esc(copy.futureNote)}</p><p>${esc(copy.unknownSurface)}</p><p>${esc(copy.coordinateNote)}</p><h3>${esc(mapCopy(lang).title)}</h3><p>${esc(mapCopy(lang).note)}</p><h3>${esc(copy.sources)}</h3><ul>${MAP_SOURCES.map(source => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)}</a></li>`).join('')}<li><a href="https://ssd.jpl.nasa.gov/planets/approx_pos.html" target="_blank" rel="noopener noreferrer">JPL · Approximate planetary positions</a></li><li><a href="https://simbad.cds.unistra.fr/simbad/" target="_blank" rel="noopener noreferrer">SIMBAD · Astronomical catalogue</a></li><li><a href="https://science.nasa.gov/universe/overview/" target="_blank" rel="noopener noreferrer">NASA · Universe history</a></li><li><a href="https://science.nasa.gov/solar-system/" target="_blank" rel="noopener noreferrer">NASA · Solar system</a></li><li><a href="https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/" target="_blank" rel="noopener noreferrer">NASA · Proxima Centauri b</a></li><li><a href="https://eventhorizontelescope.org/blog/astronomers-reveal-first-image-black-hole-heart-our-galaxy" target="_blank" rel="noopener noreferrer">EHT · Sagittarius A*</a></li><li><a href="https://science.nasa.gov/missions/hubble/apocalypse-when-hubble-casts-doubt-on-certainty-of-galactic-collision/" target="_blank" rel="noopener noreferrer">NASA · Uncertain galaxy futures</a></li></ul><button id="close-help">${esc(copy.close)}</button></section>
  <footer><p id="save-status">${esc(saveOk ? copy.saved : copy.saveUnavailable)}${fallback ? ` · ${esc(copy.fallback)}` : ''}</p><button id="reset-journey">${esc(copy.resetJourney)}</button>${resetOpen ? `<div class="reset-confirm"><p>${esc(copy.resetConfirm)}</p><button id="confirm-reset">${esc(copy.confirmed)}</button><button id="cancel-reset">${esc(copy.close)}</button></div>` : ''}</footer></main>`;
  host.querySelector('#scene-slot')!.append(sceneHost);
  host.querySelector('.window')!.append(navigationMap.element);
  host.querySelector<HTMLSelectElement>('#language')!.addEventListener('change', e => { clearNarration(); language.setLanguage((e.target as HTMLSelectElement).value as Language); if (narrator.enabled) state.phase === 'travelling' ? syncNarration() : describeSelected(); });
  host.querySelector<HTMLSelectElement>('#destination')!.addEventListener('change', e => selectDestination((e.target as HTMLSelectElement).value));
  host.querySelectorAll<HTMLButtonElement>('[data-destination]').forEach(button => button.addEventListener('click', () => selectDestination(button.dataset.destination!)));
  host.querySelector<HTMLSelectElement>('#epoch')!.addEventListener('change', e => { clearNarration(); selectedEpoch = (e.target as HTMLSelectElement).value as typeof selectedEpoch; render(); if (narrator.enabled) describeSelected(); });
  host.querySelector<HTMLInputElement>('#speed')!.addEventListener('input', e => { state = {...state, beta: Number((e.target as HTMLInputElement).value) / 1000}; updateFlight(); requestDraw(); });
  host.querySelector<HTMLSelectElement>('#render-quality')!.addEventListener('change', e => { quality = (e.target as HTMLSelectElement).value as typeof quality; render(); if (view === '3d') void mountScene(); });
  host.querySelector<HTMLSelectElement>('#motion-mode')!.addEventListener('change', e => deviceMotion.setMode((e.target as HTMLSelectElement).value as 'look' | 'inspect'));
  click('motion-enable', () => { if (['active','waiting','requesting'].includes(deviceMotion.state.status)) deviceMotion.stop(); else void deviceMotion.enable(); });
  click('motion-recenter', () => deviceMotion.recenter());
  host.querySelector<HTMLInputElement>('#speed')!.addEventListener('change', persist);
  click('depart', () => jump(selected,selectedEpoch)); click('epoch-apply', () => jump(state.destinationId,selectedEpoch));
  click('pause', () => { state = {...state,paused: !state.paused}; persist(); render(); });
  host.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', () => { state = resolveEncounter(state,button.dataset.choice!); persist(); render(); }));
  click('view2d', () => switchView('2d')); click('view3d', () => switchView('3d'));
  click('zoom-in', () => renderer?.zoom(1)); click('zoom-out', () => renderer?.zoom(-1)); click('camera-reset', () => renderer?.reset());
  click('help-toggle', () => { helpOpen = !helpOpen; render(); }); click('close-help', () => { helpOpen = false; render(); document.getElementById('help-toggle')?.focus(); });
  host.querySelector<HTMLDetailsElement>('#atlas')!.addEventListener('toggle', e => { atlasOpen = (e.target as HTMLDetailsElement).open; });
  host.querySelector<HTMLDetailsElement>('#journal')!.addEventListener('toggle', e => { journalOpen = (e.target as HTMLDetailsElement).open; });
  click('narration-toggle', () => { narrator.setEnabled(!narrator.enabled); if (narrator.enabled) state.phase === 'travelling' ? syncNarration() : describeSelected(); });
  click('narration-listen', () => { narrator.setEnabled(true); describeSelected(); });
  click('narration-stop', () => narrator.stop());
  host.querySelector<HTMLSelectElement>('#narration-voice')!.addEventListener('change', e => { narrator.setVoice((e.target as HTMLSelectElement).value); if (narrator.enabled && state.phase !== 'travelling') describeSelected(); });
  host.querySelector<HTMLDetailsElement>('#object-story')!.addEventListener('toggle', e => { objectStoryOpen = (e.target as HTMLDetailsElement).open; });
  click('music', () => { void toggleMusic(); });
  host.querySelector<HTMLInputElement>('#volume')!.addEventListener('input', e => { volume = Number((e.target as HTMLInputElement).value) / 100; updateNarration(); });
  click('reset-journey', () => { resetOpen = !resetOpen; render(); }); click('cancel-reset', () => { resetOpen = false; render(); });
  click('confirm-reset', () => { clearNarration(); spokenStops.clear(); state = createJourney(); selected = state.destinationId; selectedEpoch = state.epochId; resetOpen = false; persist(); render(); });
  updateFlight();
  updateNarration();
  updateMap();
  motionKey = ''; updateMotion();
  drawScene(); mapUntil = performance.now() + 700; requestDraw();
  if (focused) document.getElementById(focused)?.focus({preventScroll: true});
}
function narrationPanel(lang: Language, busy: boolean): string {
  const copy = narrationCopy(lang);
  return `<section class="object-narration" aria-label="${esc(copy.title)}"><div class="narration-actions"><button id="narration-toggle" aria-pressed="${narrator.enabled}">${esc(narrator.enabled ? copy.off : copy.on)}</button><button id="narration-listen"${busy || !narrator.supported ? ' disabled' : ''} aria-label="${esc(copy.listen)} · ${esc(destinationName(selected,lang))}">${esc(copy.listen)}</button><button id="narration-stop" disabled>${esc(copy.stop)}</button></div><label class="narration-voice-label" for="narration-voice">${esc(copy.voice)}<select id="narration-voice"></select></label><p id="narration-status" role="status"></p><p class="narration-note">${esc(copy.note)}</p><p id="narration-caption" lang="${lang}"${narrationCaption ? '' : ' hidden'}>${esc(narrationCaption)}</p><details id="object-story"${objectStoryOpen ? ' open' : ''}><summary>${esc(copy.title)} · ${esc(destinationName(selected,lang))}</summary><p id="object-description">${esc(epochNarration(selected,selectedEpoch,lang))}</p></details></section>`;
}
function updateNarration() {
  if (disposed) return;
  const copy = narrationCopy(language.language), busy = state.phase === 'travelling';
  music.setVolume(volume * (narrator.status === 'speaking' ? .3 : 1));
  const toggle = host.querySelector<HTMLButtonElement>('#narration-toggle');
  if (toggle) { toggle.textContent = narrator.enabled ? copy.off : copy.on; toggle.setAttribute('aria-pressed',String(narrator.enabled)); toggle.disabled = !narrator.supported; }
  const listen = host.querySelector<HTMLButtonElement>('#narration-listen');
  if (listen) listen.disabled = busy || document.hidden || !narrator.supported;
  const stop = host.querySelector<HTMLButtonElement>('#narration-stop'); if (stop) stop.disabled = !narrator.busy;
  const select = host.querySelector<HTMLSelectElement>('#narration-voice'), voices = narrator.voices();
  if (select) {
    const key = JSON.stringify([language.language,narrator.selectedVoice,...voices.map(v => [v.voiceURI,v.name])]);
    if (select.dataset.voices !== key) {
      select.innerHTML = `<option value="">${esc(copy.automatic)}${narrator.voiceName ? ` · ${esc(narrator.voiceName)}` : ''}</option>${voices.map(v => `<option value="${esc(v.voiceURI)}">${esc(v.name)}</option>`).join('')}`;
      select.value = narrator.selectedVoice; select.dataset.voices = key;
    }
    select.disabled = !narrator.supported || !voices.length;
  }
  const status = host.querySelector<HTMLElement>('#narration-status');
  if (status) { status.dataset.status = narrator.status; status.textContent = narrator.status === 'speaking' ? `${copy.speaking} · ${narrator.voiceName}` : narrator.status === 'no-voice' ? copy.noVoice : narrator.status === 'unavailable' || narrator.status === 'error' ? copy.unavailable : copy.ready; }
  const caption = host.querySelector<HTMLElement>('#narration-caption');
  if (caption) { caption.textContent = narrationCaption; caption.hidden = !narrationCaption; caption.dataset.object = narrationObject; }
}
function updateMotion() {
  if (disposed || !motionReading) return;
  const key = `${language.language}|${motionReading.status}|${motionReading.mode}`;
  if (key === motionKey) return;
  motionKey = key;
  const copy = instrumentCopy(language.language), active = ['active','waiting','requesting'].includes(motionReading.status);
  const button = host.querySelector<HTMLButtonElement>('#motion-enable');
  if (button) { button.textContent = active ? copy.disable : copy.enable; button.setAttribute('aria-pressed', String(active)); }
  const status = host.querySelector<HTMLOutputElement>('#motion-status');
  if (status) { status.textContent = copy[motionReading.status]; status.dataset.status = motionReading.status; }
  const recenter = host.querySelector<HTMLButtonElement>('#motion-recenter'); if (recenter) recenter.disabled = motionReading.status !== 'active';
}
function clearNarration() { narrator.stop(); narrationCaption = ''; narrationObject = ''; updateNarration(); }
function speakObject(id: string, age: number, short = false, automatic = false) {
  const text = narrationText(id, language.language, age, short);
  const caption = short ? `${narrationCopy(language.language).flyby} · ${text}` : text;
  const show = () => { narrationObject = id; narrationCaption = caption; };
  if (!automatic || !narrator.busy) show();
  narrator.speak(text,short,{ automatic, onStart: show }); updateNarration();
}
function describeSelected() {
  objectStoryOpen = true; const story = host.querySelector<HTMLDetailsElement>('#object-story'); if (story) story.open = true;
  speakObject(selected,pickedEpoch().ageGyr);
}
function syncNarration() {
  if (!narrator.enabled) return;
  const cue = flybyCue(snapshot());
  if (!cue || spokenStops.has(cue.key)) return;
  spokenStops.add(cue.key); speakObject(cue.id,cue.ageGyr,true,true);
}
function click(id: string, action: () => void) { host.querySelector(`#${id}`)?.addEventListener('click',action); }
function selectDestination(id: string) { if (state.phase === 'travelling') return; clearNarration(); selected = id; render(); if (narrator.enabled) describeSelected(); }
function jump(id: string, epochId: typeof selectedEpoch) {
  if (state.phase === 'travelling') return;
  clearNarration(); spokenStops.clear();
  state = beginJump(state,id,epochId); selected = id; selectedEpoch = epochId; lastTime = performance.now(); persist(); render();
  if (narrator.enabled) speakObject(departureDestination().id, departureEpoch().ageGyr, true, true);
}
function updateMap(now = performance.now()) {
  const current = snapshot();
  const keepCompletedRoute = state.phase === 'encounter' && selected === state.destinationId && selectedEpoch === state.epochId;
  const origin = keepCompletedRoute ? { destinationId: departureDestination().id, kind: departureDestination().kind, color: departureDestination().color, epoch: departureEpoch().id } : { destinationId: state.destinationId, kind: destination().kind, color: destination().color, epoch: state.epochId };
  const planned = current.travelling ? current : freezeSnapshot({ ...current, destinationId: selected, kind: picked().kind, color: picked().color, epoch: selectedEpoch, travelling: true, progress: 0, origin });
  navigationMap.draw(current, planned, language.language, now);
}
function updateFlight() {
  if (state.phase === 'travelling') {
    const frame = routeFrame(snapshot()), next = frame.itinerary[Math.min(frame.leg + 1, frame.itinerary.length - 1)];
    const anchor = frame.objects.find(object => object.id === next)!, reference = coordinateBody(next), copy = c(), lang = language.language;
    const readout = host.querySelector<HTMLElement>('#route-readout');
    if (readout) {
      const distance = anchor.distanceAU < .01 || anchor.distanceAU > 1e5 ? anchor.distanceAU.toExponential(2) : number(anchor.distanceAU, 3);
      readout.textContent = `${copy.routeAnchor}: ${destinationName(next,lang)} · ${distance} AU\n${copy.localEpoch}: ${number(frame.ageGyr, 4)} Gyr\n${frame.ageGyr === 13.8 && reference.evidence !== 'illustrative' && reference.evidence !== 'inferred' ? copy.coordinateEvidence : copy.reconstruction}`;
      readout.dataset.cameraAu = frame.cameraAU.join(','); readout.dataset.ageGyr = String(frame.ageGyr);
    }
    host.querySelectorAll<HTMLElement>('[data-route-stop]').forEach((stop, i) => { if (i === frame.leg + 1 || frame.itinerary.length === 1) stop.setAttribute('aria-current','step'); else stop.removeAttribute('aria-current'); });
  }
  const progress = host.querySelector<HTMLProgressElement>('#progress'); if (progress) progress.value = state.phase === 'travelling' ? state.progress : state.phase === 'encounter' ? 1 : 0;
  syncNarration();
  const fields: Record<string,string> = {shield:`${number(state.shield,0)}%`,energy:`${number(state.energy,0)}%`,research:number(state.research,0),friendship:number(state.friendship,0),'beta-output':`${number(state.beta * 100,1)}% c`, gamma:`${number(lorentzFactor(state.beta),3)}×`,doppler:`${number(dopplerFactor(state.beta),3)}×`,'observer-clock':`${number(state.elapsed,1)} s`,'crew-clock':`${number(state.properElapsed,1)} s`};
  for (const [id,text] of Object.entries(fields)) { const field = host.querySelector(`#${id}`); if (field && field.textContent !== text) field.textContent = text; }
  updateInstruments(host, snapshot(), language.language, number);
}
async function toggleMusic() {
  const ticket = ++audioGeneration;
  audioFailed = false;
  if (musicWanted) { musicWanted = false; music.stop(); render(); return; }
  musicWanted = true; render();
  const played = await music.start();
  if (ticket !== audioGeneration || disposed) return;
  if (!played) musicWanted = false;
  render();
}
function reportScene(stage: string) {
  sceneHost.dataset.stage = stage; sceneHost.dataset.quality = quality;
  host.dataset.renderer = stage;
  document.dispatchEvent(new CustomEvent('universe-scene-status', {detail: stage}));
}
function mountIllustration() {
  renderer?.dispose(); renderer = createUniverseRenderer();
  renderer.mount(sceneHost); renderer.render(snapshot()); reportScene('2d-ready');
}
async function mountScene() {
  const ticket = ++generation; let candidate: UniverseRenderer | null = null;
  clearTimeout(sceneTimer); pendingRenderer?.dispose(); pendingRenderer = null;
  if (view === '2d') { mountIllustration(); return; }
  if (!sceneHost.querySelector('svg')) mountIllustration();
  reportScene('3d-warming');
  try {
    // This budget includes lazy shader downloads and the first ready GPU frame.
    sceneTimer = setTimeout(() => fallBack(ticket), 8000);
    const module = await import('./renderer3d');
    if (disposed || ticket !== generation) return;
    candidate = module.createUniverse3dRenderer({
      pixelRatio: quality === 'eco' ? 1 : Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : 1.5),
      onUnavailable: () => fallBack(ticket),
      onReady: () => {
        if (disposed || ticket !== generation || !candidate || candidate !== pendingRenderer) return;
        clearTimeout(sceneTimer); renderer?.dispose(); renderer = candidate; pendingRenderer = null;
        reportScene('3d-ready'); renderer.render(snapshot()); requestDraw();
      },
    });
    if (disposed || ticket !== generation) { candidate.dispose(); return; }
    pendingRenderer = candidate; candidate.mount(sceneHost); candidate.render(snapshot()); requestDraw();
  } catch { candidate?.dispose(); if (!disposed && ticket === generation) fallBack(ticket); }
}
function fallBack(ticket: number) {
  if (disposed || ticket !== generation) return;
  generation++; clearTimeout(sceneTimer); pendingRenderer?.dispose(); pendingRenderer = null; view = '2d'; fallback = true;
  mountIllustration(); render();
}
function switchView(next: typeof view) {
  if (next === view) return;
  view = next; fallback = false; render(); void mountScene();
}
function effectsActive() {
  return !state.paused && !motion.matches && (state.phase === 'travelling' || ['sun','triple','nebula','neutron','blackhole','quasar'].includes(destination().kind) || ['m87','centaurus-a'].includes(destination().id));
}
function needsFrames(now: number) {
  return !!pendingRenderer || now < mapUntil || (state.phase === 'travelling' && !state.paused && (state.beta > 0 || state.departureDestinationId === state.destinationId)) || (sceneVisible && effectsActive());
}
function requestDraw() {
  if (disposed || document.hidden || frame || frameTimer !== undefined) return;
  const now = performance.now(), fps = !sceneVisible && !pendingRenderer ? 10 : quality === 'eco' ? 24 : quality === 'high' ? 60 : 30;
  if (now - lastTime > 250) lastTime = now;
  const wait = Math.max(0, 1000 / fps - (now - lastDrawTime));
  if (wait > 1) frameTimer = setTimeout(() => { frameTimer = undefined; frame = requestAnimationFrame(animate); }, wait);
  else frame = requestAnimationFrame(animate);
}
function drawScene() {
  const current = snapshot();
  if (sceneVisible) renderer?.render(current);
  pendingRenderer?.render(current);
}
function animate(now: number) {
  frame = 0;
  if (disposed || document.hidden) return;
  const seconds = Math.max(0,Math.min(.25,(now - lastTime) / 1000)); lastTime = now; lastDrawTime = now;
  const phase = state.phase; state = tickJourney(state,seconds);
  if (sceneVisible && effectsActive()) effectTime += seconds;
  if (phase !== state.phase) { persist(); render(); if (narrator.enabled) speakObject(state.destinationId,epoch().ageGyr,false,true); }
  else if (phase === 'travelling' && now - lastUiTime >= 100) { lastUiTime = now; updateFlight(); }
  drawScene(); updateMap(now);
  if (needsFrames(now)) requestDraw();
}
function visibility() {
  lastTime = performance.now();
  if (document.hidden) { audioGeneration++; if (state.phase === 'travelling') state = {...state,paused:true}; musicWanted = false; music.stop(); persist(); }
  render();
}
function keyboard(event: KeyboardEvent) {
  if (event.key === 'Escape' && helpOpen) { helpOpen = false; render(); document.getElementById('help-toggle')?.focus(); return; }
  if (event.target instanceof HTMLElement && event.target.closest('button,input,select,a,summary')) return;
  if (event.code === 'Space' && state.phase === 'travelling') { event.preventDefault(); state = {...state,paused:!state.paused}; persist(); render(); }
}
function dispose() {
  if (disposed) return; persist(); disposed = true; generation++; clearTimeout(sceneTimer); clearTimeout(frameTimer); cancelAnimationFrame(frame); pendingRenderer?.dispose(); pendingRenderer = null; renderer?.dispose(); renderer = null; observer?.disconnect(); deviceMotion.dispose(); music.dispose(); narrator.dispose();
  document.removeEventListener('visibilitychange',visibility); document.removeEventListener('keydown',keyboard);
  if (typeof motion.removeEventListener === 'function') motion.removeEventListener('change',render);
  else motion.removeListener(render);
}
document.addEventListener('visibilitychange',visibility); document.addEventListener('keydown',keyboard);
if (typeof motion.addEventListener === 'function') motion.addEventListener('change',render);
else motion.addListener(render);
window.addEventListener('pagehide',dispose); window.addEventListener('pageshow', e => { if (e.persisted && disposed) location.reload(); });
render(); mountIllustration(); if (view === '3d') void mountScene(); requestDraw();
host.dataset.ready = 'true'; document.dispatchEvent(new Event('universe-ready'));
