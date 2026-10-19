import './style.css';
import { NETWORK } from './network';
import { buildGraph, createRounds, validateRoute, startJourney, tickJourney, journeyMetrics, remainingRequest, replanJourney, resolveEvent, transferId, metricsFor, type Graph, type Leg, type Journey, type Metrics, type Request } from './model';
import { rideDirections, alightingOptions, directionalLeg, planPosition, boardingLines, walkingOptions, plannedRemainder, canFinish } from './planner';
import { readLanguage, saveLanguage, languages, languageLabels, t, stationLabel, lineLabel, escapeHtml as e, type Language, type Key } from './locale';
import { NetworkMap } from './map';
import { createSnapshot, type JourneyRenderer } from './view';
import { Journey2D } from './renderer2d';
import { DeviceVoice } from './voice';
import { decoratePlanner, milestoneMarkup } from './guidance';

const app = document.querySelector<HTMLDivElement>('#app')!;
const rounds = createRounds(NETWORK);
let language = readLanguage(), roundIndex = 0, round = structuredClone(rounds[0]);
let graph: Graph = buildGraph(NETWORK, round.conditions), draft: Leg[] = [], journey: Journey | null = null;
let selected = round.request.origin, plannerOpen = true, visual: 'map' | 'journey' = 'map', dimension: '3d' | '2d' = '3d', speed = 5;
let choice = { lineId: '', directionId: '', end: '' }, replanning = false;
let renderer: JourneyRenderer | undefined, rendererGeneration = 0, notice: Key | undefined, loading3d = false, failed3d = false;
let simulationFrame = 0, lastTime = performance.now(), lastUi = 0, lastCaption = '', dead = false, pageSuspended = false;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const tx = (key: Key, values: Record<string,string|number> = {}) => t(language,key,values);
const station = (id:string) => stationLabel(graph.stations.get(id)!);
const line = (id:string) => lineLabel(graph.lines.get(id)!);
function effectiveRequest(): Request { return journey && journey.status !== 'complete' ? remainingRequest(journey) : round.request; }
function position() { return planPosition(effectiveRequest(), draft, journey?.currentLine); }
function currentPlanStation() { return position().station; }
function editable() { return !journey || journey.status === 'interrupted' && replanning; }
function resetChoice() { choice = { lineId: '', directionId: '', end: '' }; }
function canBoard() { const validation = draftValidation(); return editable() && validation.ok && (!journey || journey.toiletSolved || validation.edges.length > 0); }
function options(ids: string[], value?: string) { return ids.map(id=>`<option value="${e(id)}"${id===value?' selected':''}>${e(station(id))}</option>`).join(''); }
function lineOptions(ids: string[], value?: string) { return ids.map(id=>`<option value="${e(id)}"${id===value?' selected':''}>${e(line(id))}</option>`).join(''); }
function metricText(metrics:Metrics) { return tx('metrics',{minutes:metrics.minutes.toFixed(1),transfers:metrics.transfers,walk:Math.round(metrics.walk),crowd:metrics.crowd.toFixed(1)}); }
function metricMarkup(metrics:Metrics) { return `<p class="metric-summary">${e(metricText(metrics))}</p><strong class="score-value">${e(tx('score',{score:metrics.score}))}</strong><details class="score-details"><summary>${e(tx('estimate'))}</summary><p>${e(tx('formula',{time:metrics.timePenalty,changes:metrics.transferPenalty,walk:metrics.walkPenalty,crowd:metrics.crowdPenalty}))}</p></details>`; }
function draftValidation() { return validateRoute(graph, draft, effectiveRequest(), journey?.currentLine); }
function validationText() {
  const result = draftValidation();
  if (result.ok) return tx('valid');
  if (result.error === 'via') return tx('viaNeeded');
  if (result.error === 'empty' || result.error === 'destination') return tx('continuePlan', { station: station(currentPlanStation()) });
  return tx('invalid');
}
function rootMarkup() {
  app.innerHTML=`<main class="game-shell"><header class="masthead"><a class="home-link" href="./index.html">← <span>${e(tx('home'))}</span></a><h1>${e(tx('title'))}</h1><label class="language-control"><span>${e(tx('language'))}</span><select id="language">${languages.map((id,i)=>`<option value="${id}"${id===language?' selected':''}>${languageLabels[i]}</option>`).join('')}</select></label></header><section class="viewport planner-open" aria-label="${e(tx('title'))}"><div id="map-host" class="world-host"></div><a class="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a><div id="journey-host" class="world-host" hidden></div><div class="scene-toolbar"><button id="map-view" aria-pressed="true">${e(tx('map'))}</button><button id="journey-view" aria-pressed="false">${e(tx('journey'))}</button><button id="planner-toggle" aria-expanded="true" aria-controls="planner">${e(tx('close'))}</button></div><div class="map-tools"><button id="zoom-in" aria-label="${e(tx('zoomIn'))}">+</button><button id="zoom-out" aria-label="${e(tx('zoomOut'))}">−</button><button id="fit">${e(tx('fit'))}</button></div><p class="map-hint">${e(tx('mapHelp'))}</p><div class="journey-caption" hidden><div class="caption-top"><span>${e(tx('captions'))}</span><span id="progress"></span></div><p id="caption" aria-live="polite"></p><div class="travel-controls"><button id="pause">${e(tx('pause'))}</button><label>${e(tx('speed'))}<select id="speed"><option value="1">1×</option><option value="5" selected>5×</option><option value="15">15×</option></select></label><label>${e(tx('view'))}<select id="dimension"><option value="3d">3D</option><option value="2d">2D</option></select></label></div><p id="render-status" class="fine-print" role="status"></p></div><aside id="planner" class="planner" aria-label="${e(tx('planner'))}"><div class="planner-heading"><h2>${e(tx('planner'))}</h2></div><div id="planner-content" class="planner-scroll"></div></aside></section></main>`;
}
rootMarkup();
app.querySelector('#caption')!.insertAdjacentHTML('afterend','<div id="milestones"></div>');
app.querySelector('.travel-controls')!.insertAdjacentHTML('beforeend',`<button id="travel-voice" aria-pressed="false">${e(tx('voice'))}</button><button id="travel-replay" aria-label="${e(tx('replay'))}" title="${e(tx('replay'))}">↻</button>`);
app.querySelector('.travel-controls')!.insertAdjacentHTML('afterend','<p id="travel-voice-status" class="fine-print" role="status"></p>');
let lastMilestones = '';
const viewport=app.querySelector<HTMLElement>('.viewport')!, planner=app.querySelector<HTMLElement>('#planner')!, plannerContent=app.querySelector<HTMLElement>('#planner-content')!, mapHost=app.querySelector<HTMLElement>('#map-host')!, journeyHost=app.querySelector<HTMLElement>('#journey-host')!;
const map=new NetworkMap(mapHost,graph,selectStation);
mapHost.querySelector('svg')!.setAttribute('aria-label',tx('map'));
const voice=new DeviceVoice(language,updateVoice);
function offerCurrentAnnouncement() {
  const snapshot=createSnapshot(graph,journey,language,motion.matches), segment=journey?.segments[journey.index];
  voice.offer(snapshot.caption,segment?.seconds??0,speed,{kind:snapshot.phase,stationId:segment?(segment.kind==='ride'||segment.kind==='walk'?segment.nextStation:segment.station):undefined,lineId:segment?.nextLineId});
}
function voiceExplicitlyMuted() { try{return localStorage.getItem('beijing-voice-muted')==='true';}catch{return false;} }

function availableLines() { return boardingLines(graph, currentPlanStation(), position().line); }
function selectedLine() { return choice.lineId || (availableLines().length === 1 ? availableLines()[0] : ''); }
function availableWalks() { return walkingOptions(graph, currentPlanStation(), selectedLine()); }
function legLabel(leg:Leg) { return leg.walkToLineId ? `${tx('externalWalk')} → ${line(leg.walkToLineId)}` : line(leg.lineId); }
function builderMarkup() {
  const here = currentPlanStation(), previous = position().line, ids = availableLines();
  if (choice.lineId && !ids.includes(choice.lineId)) resetChoice();
  const service = selectedLine(), directions = rideDirections(graph, service, here), direction = directions.find(item => item.id === choice.directionId);
  const ends = direction ? alightingOptions(direction) : [];
  if (!direction) { choice.directionId = ''; choice.end = ''; }
  if (!ends.some(item => item.value === choice.end)) choice.end = '';
  const remainder = plannedRemainder(graph, effectiveRequest(), draft, journey?.currentLine);
  const transfer = previous && previous !== service ? graph.byId.get(transferId(here, previous, service)) : undefined;
  const reachable = canFinish(graph, remainder, previous);
  return `<section class="manual-route"${editable() ? '' : ' hidden'}><h3>${e(tx('manual'))}</h3><p class="current-plan-station">${e(tx('currentStation'))}<strong>${e(station(here))}</strong></p><p class="remaining-destinations">${e(tx('remaining'))}: <strong>${[...remainder.via, ...(here !== remainder.destination || remainder.via.length ? [remainder.destination] : [])].map(id => e(station(id))).join(' → ') || '✓'}</strong></p><details class="builder-help"><summary>${e(tx('help'))}</summary><p>${e(tx('buildHelp'))}</p></details><label>${e(tx('line'))}<select id="manual-line"${ids.length ? '' : ' disabled'}><option value="">${e(tx('chooseLine'))}</option>${lineOptions(ids, service)}</select></label><label>${e(tx('direction'))}<select id="manual-direction"${directions.length ? '' : ' disabled'}><option value="">${e(tx('chooseDirection'))}</option>${directions.map(item => `<option value="${e(item.id)}" data-next="${e(item.stops[1])}"${item.id === choice.directionId ? ' selected' : ''}>${e(tx('nextDirection', { station: station(item.stops[1]) }))}</option>`).join('')}</select></label><label>${e(tx('legEnd'))}<select id="manual-end"${direction ? '' : ' disabled'}><option value="">${e(tx('chooseAlighting'))}</option>${ends.map(item => `<option value="${e(item.value)}" data-station="${e(item.station)}"${item.value === choice.end ? ' selected' : ''}>${e(station(item.station))} · ${e(tx('stopCount', { count: item.index }))}</option>`).join('')}</select></label>${transfer ? `<p class="transfer-estimate">${e(tx('transferHere'))} · ${e(metricText(metricsFor([transfer])))}</p>` : ''}<button class="primary" data-action="add-leg"${choice.end && editable() ? '' : ' disabled'}>${e(tx('addLeg'))}</button>${transfer ? `<button data-action="transfer"${editable() ? '' : ' disabled'}>${e(tx('transferHere'))}</button>` : ''}${availableWalks().map(edge => `<button class="external-walk${selected === edge.toStation ? ' map-choice' : ''}" data-walk="${e(edge.id)}"${editable() ? '' : ' disabled'}>${e(tx('externalWalk'))}<br>${e(station(edge.toStation))} → ${e(line(edge.toLineId))}<br>${e(metricText(metricsFor(transfer ? [transfer, edge] : [edge])))}</button>`).join('')}${!reachable ? `<p class="notice" role="status">${e(tx('noRoute'))}</p>` : ''}${notice ? `<p class="notice" role="status">${e(tx(notice))}</p>` : ''}</section>`;
}
function refreshBuilder(focusId: string) {
  plannerContent.querySelector('.manual-route')!.outerHTML = builderMarkup();
  plannerContent.querySelector<HTMLElement>(focusId)?.focus({ preventScroll: true });
}
function commitLeg(leg: Leg) {
  draft.push(leg); selected = currentPlanStation(); resetChoice(); notice = undefined; renderPlanner();
  const target = plannerContent.querySelector<HTMLButtonElement | HTMLSelectElement>(canBoard() ? '[data-action="board"]' : '#manual-line');
  target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest' });
}
function renderPlanner() {
  const request=effectiveRequest(), validation=draftValidation();
  const sandbox=round.id==='sandbox'&&!journey;
  const legRows=draft.map((leg,i)=>`<li><span class="route-line" style="--line-color:${e(graph.lines.get(leg.lineId)!.color)}">${i+1}. ${e(legLabel(leg))}</span><span>${e(station(leg.stops[0]))} → ${e(station(leg.stops.at(-1)!))}</span></li>`).join('');
  const event=journey?.interruption;
  const eventMarkup=event?`<section class="event-decision"><h3>${e(tx(event.kind==='access'?'family':event.kind))}</h3><p>${e(tx(event.kind==='toilet'?'toiletEvent':event.kind==='access'?'accessEvent':'disruptionEvent'))}</p>${event.kind==='toilet'?`<button class="primary" data-action="toilet">${e(tx('useToilet'))}</button><label>${e(tx('otherToilet'))}<select id="toilet-station">${options(NETWORK.stations.map(s=>s.id).filter(id=>id!==journey!.currentStation),NETWORK.stations.find(s=>s.id!==journey!.currentStation&&(graph.at.get(s.id)?.length??0)>1)?.id)}</select></label>`:event.kind==='access'?`<button class="primary" data-action="lift">${e(tx('useLift'))}</button>`:`<button class="primary" data-action="wait">${e(tx('wait'))}</button>`}<button data-action="replan">${e(tx('replan'))}</button></section>`:'';
  let tutorialSeen=false;try{tutorialSeen=localStorage.getItem('beijing-tutorial-seen')==='true';}catch{}
  plannerContent.innerHTML=`<label>${e(tx('round'))}<select id="round">${rounds.map((r,i)=>`<option value="${i}"${i===roundIndex?' selected':''}>${e(tx(r.id))}</option>`).join('')}</select></label><p class="briefing">${e(tx(`${round.id}Body` as Key))}</p><div class="endpoints">${sandbox?`<label>${e(tx('origin'))}<select id="origin">${options(NETWORK.stations.map(s=>s.id),request.origin)}</select></label><label>${e(tx('destination'))}<select id="destination">${options(NETWORK.stations.map(s=>s.id),request.destination)}</select></label>`:`<p><span>${e(tx('origin'))}</span><strong>${e(station(request.origin))}</strong></p><p><span>${e(tx('destination'))}</span><strong>${e(station(request.destination))}</strong></p>`}${request.via.map(id=>`<p class="via-stop"><span>${e(tx('via'))}</span><strong>${e(station(id))}</strong></p>`).join('')}</div>${eventMarkup}<details class="tutorial"${!tutorialSeen&&round.id==='welcome'&&!journey?' open':''}><summary>${e(tx('help'))}</summary><p>${e(tx('tutorial'))}</p></details><section class="route-plan"><h3>${e(tx('route'))}</h3>${legRows?`<ol>${legRows}</ol>`:`<p>${e(tx('empty'))}</p>`}<div class="button-row"${editable()?"":" hidden"}><button data-action="undo"${draft.length&&editable()?'':' disabled'}>${e(tx('undo'))}</button><button data-action="clear"${draft.length&&editable()?'':' disabled'}>${e(tx('clear'))}</button></div><p${editable()?"":" hidden"} class="route-validation${validation.ok?' valid':''}" role="status">${e(validationText())}</p>${draft.length&&editable()?metricMarkup(validation.metrics):''}<button class="primary board-button"${editable()?"":" hidden"} data-action="board"${canBoard()?'':' disabled'}>${e(tx(journey?'resumeRoute':'board'))}</button></section>${builderMarkup()}<section class="station-search"><h3>${e(tx('selected'))}</h3><p id="selected-station">${e(station(selected))}</p><label>${e(tx('search'))}<input id="search" type="search" autocomplete="off" spellcheck="false"></label><div id="search-results" class="search-results"></div>${sandbox?`<div class="button-row"><button data-action="set-origin">${e(tx('setOrigin'))}</button><button data-action="set-destination">${e(tx('setDestination'))}</button></div>`:''}</section><details class="line-directory"><summary>${e(tx('map'))}</summary>${NETWORK.lines.map(service=>`<button data-service="${e(service.id)}" style="--line-color:${e(service.color)}"><span class="line-swatch"></span>${e(lineLabel(service))}</button>`).join('')}</details><section class="voice-controls"><button id="voice-toggle">${e(tx(voice.queue.enabled?'mute':'voice'))}</button><button id="voice-replay">${e(tx('replay'))}</button><p id="voice-status">${e(tx(voice.status==='ready'?'voiceReady':voice.status==='unavailable'?'voiceUnavailable':'voiceOff'))}</p><p id="speaking-caption"></p></section><section id="results"${journey?.status==='complete'?'':' hidden'}><h3>${e(tx('complete'))}</h3>${journey?metricMarkup(journeyMetrics(journey)):''}<p id="best-score"></p><button class="primary" data-action="next">${e(tx('next'))}</button></section><button data-action="reset" class="reset-button">${e(tx('reset'))}</button><p class="simulation-note">${e(tx('simulated'))}</p><details class="provenance"><summary>${e(tx('source'))} · ${e(NETWORK.provenance.snapshotDate)}</summary><p>${e(NETWORK.provenance.scope)}</p><ul>${NETWORK.provenance.sources.map(source=>`<li><a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.name)}</a></li>`).join('')}</ul>${NETWORK.provenance.notes.map(note=>`<p>${e(note)}</p>`).join('')}</details>`;
  plannerContent.querySelector('.tutorial')?.addEventListener('toggle',()=>{try{localStorage.setItem('beijing-tutorial-seen','true');}catch{}},{once:true});
  decoratePlanner(plannerContent,{language,title:tx(round.id),stage:journey?.status==='complete'?'complete':journey&&journey.status!=='interrupted'?'travel':validation.ok?'board':'choose',hasDraft:draft.length>0,stepFree:!!round.conditions.stepFree,crowded:!!round.conditions.rush});
  renderSearchResults('');updateVoice();if(journey?.status==='complete')saveBest();
  map.render(draft,selected,editable()?currentPlanStation():journey?.currentStation,journey?.completed.filter(edge=>edge.kind!=='transfer'));
}
function renderSearchResults(query:string) {
  const result=plannerContent.querySelector('#search-results');if(!result)return;
  const needle=query.trim().toLocaleLowerCase();
  const stations=needle?NETWORK.stations.filter(s=>`${s.name} ${s.english}`.toLocaleLowerCase().includes(needle)).slice(0,40):[];
  result.innerHTML=stations.length?stations.map(s=>`<button data-station="${e(s.id)}">${e(stationLabel(s))}</button>`).join(''):needle?`<p>${e(tx('noStations'))}</p>`:'';
}
function selectStation(id:string) {
  selected=id;plannerOpen=true;applyView();
  if (editable()) {
    const direction = rideDirections(graph, selectedLine(), currentPlanStation()).find(item => item.id === choice.directionId);
    const end = direction && alightingOptions(direction).find(item => item.station === id);
    const walk = !end && availableWalks().find(edge => edge.toStation === id);
    choice.end = end?.value ?? '';
    notice = end || walk || id === currentPlanStation() ? undefined : 'alightingHint';
    renderPlanner();
    const target = walk ? Array.from(plannerContent.querySelectorAll<HTMLButtonElement>('[data-walk]')).find(button => button.dataset.walk === walk.id) : plannerContent.querySelector(end ? '#manual-end' : '.manual-route');
    target?.scrollIntoView({block:'nearest'});
  } else {
    const selectedLabel=plannerContent.querySelector('#selected-station');if(selectedLabel)selectedLabel.textContent=station(id);
    map.render(draft,selected,journey?.currentStation,journey?.completed.filter(edge=>edge.kind!=='transfer'));
  }
}
function updateVoice() {
  const toggle=plannerContent.querySelector('#voice-toggle'), status=plannerContent.querySelector('#voice-status'), speaking=plannerContent.querySelector('#speaking-caption');
  for(const button of [toggle,app.querySelector('#travel-voice')])if(button){button.textContent=tx(voice.queue.enabled?'mute':'voice');button.setAttribute('aria-pressed',String(voice.queue.enabled));}
  app.querySelector('#travel-replay')!.setAttribute('aria-label',tx('replay'));app.querySelector('#travel-replay')!.setAttribute('title',tx('replay'));
  if(status)status.textContent=tx(voice.status==='ready'?'voiceReady':voice.status==='unavailable'?'voiceUnavailable':'voiceOff');
    app.querySelector('#travel-voice-status')!.textContent=voice.status==='unavailable'?tx('voiceUnavailable'):'';
    if(speaking)speaking.textContent=voice.queue.active;
}
function applyView() {
  viewport.classList.toggle('planner-open',plannerOpen);planner.hidden=!plannerOpen;
  const toggle=app.querySelector('#planner-toggle')!;toggle.setAttribute('aria-expanded',String(plannerOpen));toggle.textContent=tx(plannerOpen?'close':'open');
  mapHost.hidden=visual!=='map';journeyHost.hidden=visual!=='journey';
  app.querySelector('.map-attribution')!.toggleAttribute('hidden',visual!=='map');
  app.querySelector('.map-tools')!.toggleAttribute('hidden',visual!=='map');app.querySelector('.map-hint')!.toggleAttribute('hidden',visual!=='map');
  app.querySelector('.journey-caption')!.toggleAttribute('hidden',visual!=='journey');
  app.querySelector('#map-view')!.setAttribute('aria-pressed',String(visual==='map'));app.querySelector('#journey-view')!.setAttribute('aria-pressed',String(visual==='journey'));
  if(visual==='journey'&&!renderer)void mountRenderer();
  updateProgress();
}
async function mountRenderer() {
  const generation=++rendererGeneration;renderer?.dispose();renderer=undefined;loading3d=dimension==='3d';updateProgress();
  try {
    if(dimension==='3d'){const { Journey3D }=await import('./renderer3d');if(generation!==rendererGeneration||dead)return;renderer=new Journey3D(()=>{if(generation!==rendererGeneration)return;failed3d=true;dimension='2d';void mountRenderer();});}
    else renderer=new Journey2D();
    renderer.mount(journeyHost);loading3d=false;renderer.render(createSnapshot(graph,journey,language,motion.matches));updateProgress();
  } catch { if(generation!==rendererGeneration)return;renderer?.dispose();failed3d=true;dimension='2d';loading3d=false;renderer=new Journey2D();renderer.mount(journeyHost);renderer.render(createSnapshot(graph,journey,language,motion.matches));updateProgress(); }
}
function saveBest() {
  if(!journey)return;const score=journeyMetrics(journey).score,target=plannerContent.querySelector('#best-score');
  try { const key=`beijing-best-${round.id}`, previous=Number(localStorage.getItem(key)||0), best=Math.max(previous,score);localStorage.setItem(key,String(best));if(target)target.textContent=tx('saved',{score:best}); }catch{if(target)target.textContent=tx('unsaved');}
}
function updateProgress() {
  const snapshot=createSnapshot(graph,journey,language,motion.matches), caption=app.querySelector('#caption')!, progress=app.querySelector('#progress')!, pause=app.querySelector<HTMLButtonElement>('#pause')!;
  const captionText=journey?.interruption?tx(journey.interruption.kind==='toilet'?'toiletEvent':journey.interruption.kind==='access'?'accessEvent':'disruptionEvent'):snapshot.caption;
  if(caption.textContent!==captionText)caption.textContent=captionText;
  progress.textContent=journey?tx('progress',{station:station(journey.currentStation),minutes:journeyMetrics(journey).minutes.toFixed(1)}):'';
  pause.disabled=!journey||journey.status==='interrupted'||journey.status==='complete';pause.textContent=tx(journey?.status==='running'?'pause':'resume');
  const dimensionSelect=app.querySelector<HTMLSelectElement>('#dimension')!;dimensionSelect.value=dimension;
  app.querySelector('#render-status')!.textContent=loading3d?tx('loading3d'):failed3d?tx('fallback'):journey?.status==='paused'?tx('paused'):'';
  const milestones=milestoneMarkup(graph,journey,language);if(milestones!==lastMilestones){lastMilestones=milestones;app.querySelector('#milestones')!.innerHTML=milestones;}
  if(snapshot.caption!==lastCaption){lastCaption=snapshot.caption;offerCurrentAnnouncement();}
}
function loadRound(index:number) {
  voice.suspend();roundIndex=index;round=structuredClone(rounds[index]);graph=buildGraph(NETWORK,round.conditions);draft=[];journey=null;replanning=false;selected=round.request.origin;notice=undefined;lastCaption='';visual='map';plannerOpen=true;resetChoice();renderPlanner();plannerContent.scrollTop=0;map.fit();applyView();
}
function beginBoarding() {
  if(journey&&journey.status!=='interrupted')return;
  if(!canBoard()){notice='invalid';renderPlanner();return;}
  if(journey){if(!replanJourney(journey,graph,draft)){notice='invalid';renderPlanner();return;}}
  else journey=startJourney(graph,round,draft);
  if(!journey)return;replanning=false;visual='journey';plannerOpen=false;notice=undefined;lastTime=performance.now();renderPlanner();applyView();
  if(!voice.queue.enabled&&!voiceExplicitlyMuted())voice.enable();
}
function handleEvent(choice:'toilet'|'lift'|'wait'|'replan') {
  if(!journey?.interruption)return;
  const target=plannerContent.querySelector<HTMLSelectElement>('#toilet-station')?.value;
  const conditions=resolveEvent(journey,choice,target);graph=buildGraph(NETWORK,conditions);
  if(choice==='replan'){draft=[];replanning=true;selected=journey.currentStation;notice=undefined;visual='map';plannerOpen=true;resetChoice();map.center(journey.currentStation);}
  else { if(replanning)draft=structuredClone(journey.route);replanning=false;resetChoice(); }
  renderPlanner();applyView();
}
plannerContent.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
  if(button.dataset.walk){if(!editable())return;const edge=availableWalks().find(item=>item.id===button.dataset.walk);if(edge)commitLeg({lineId:edge.lineId,stops:[edge.fromStation,edge.toStation],walkToLineId:edge.toLineId});return;}
  if(button.dataset.station){selectStation(button.dataset.station);map.center(button.dataset.station);return;}
  if(button.dataset.service){const service=graph.lines.get(button.dataset.service)!;selectStation(service.stops[0]);map.center(service.stops[0]);const control=plannerContent.querySelector<HTMLSelectElement>('#manual-line');if(control&&availableLines().includes(service.id)){control.value=service.id;control.dispatchEvent(new Event('change',{bubbles:true}));}return;}
  const action=button.dataset.action;
  if((action==='set-origin'||action==='set-destination')&&round.id==='sandbox'&&!journey){round.request[action==='set-origin'?'origin':'destination']=selected;draft=[];resetChoice();renderPlanner();}
  else if(action==='undo'&&editable()){draft.pop();selected=currentPlanStation();resetChoice();notice=undefined;renderPlanner();}
  else if(action==='clear'&&editable()){draft=[];selected=currentPlanStation();resetChoice();notice=undefined;renderPlanner();}
  else if(action==='add-leg'&&editable()){const leg=directionalLeg(graph,selectedLine(),currentPlanStation(),choice.directionId,choice.end);if(leg)commitLeg(leg);else{notice='invalid';renderPlanner();}}
  else if(action==='transfer'&&editable()){const previous=position().line, service=selectedLine();if(previous&&previous!==service&&graph.byId.has(transferId(currentPlanStation(),previous,service)))commitLeg({lineId:service,stops:[currentPlanStation()]});}
  else if(action==='board')beginBoarding();
  else if(action==='reset')loadRound(roundIndex);
  else if(action==='next')loadRound((roundIndex+1)%rounds.length);
  else if(action==='toilet'||action==='lift'||action==='wait'||action==='replan')handleEvent(action);
  else if(button.id==='voice-toggle'){if(voice.queue.enabled)voice.mute();else{offerCurrentAnnouncement();voice.enable();}updateVoice();}
    else if(button.id==='voice-replay'){offerCurrentAnnouncement();voice.replay();}
});
plannerContent.addEventListener('change',event=>{
  const target=event.target as HTMLSelectElement;
  if(target.id==='round')loadRound(Number(target.value));
  else if(target.id==='origin'||target.id==='destination'){round.request[target.id]=target.value;draft=[];selected=round.request.origin;resetChoice();renderPlanner();map.center(selected);}
  else if(target.id==='manual-line'&&editable()){choice={lineId:target.value,directionId:'',end:''};notice=undefined;refreshBuilder('#manual-line');}
  else if(target.id==='manual-direction'&&editable()){choice.directionId=target.value;choice.end='';notice=undefined;refreshBuilder('#manual-direction');}
  else if(target.id==='manual-end'&&editable()){choice.end=target.value;notice=undefined;refreshBuilder('#manual-end');}
});
plannerContent.addEventListener('input',event=>{const target=event.target as HTMLInputElement;if(target.id==='search')renderSearchResults(target.value);});
app.querySelector('#language')!.addEventListener('change',event=>{language=(event.target as HTMLSelectElement).value as Language;saveLanguage(language);voice.setLanguage(language);document.documentElement.lang=language;document.title=`Transit Tales — ${tx('title')}`;app.querySelector('h1')!.textContent=tx('title');app.querySelector('.home-link span')!.textContent=tx('home');app.querySelector('.language-control span')!.textContent=tx('language');app.querySelector('#map-view')!.textContent=tx('map');app.querySelector('#journey-view')!.textContent=tx('journey');app.querySelector('#fit')!.textContent=tx('fit');app.querySelector('#zoom-in')!.setAttribute('aria-label',tx('zoomIn'));app.querySelector('#zoom-out')!.setAttribute('aria-label',tx('zoomOut'));app.querySelector('.map-hint')!.textContent=tx('mapHelp');app.querySelector('.planner-heading h2')!.textContent=tx('planner');planner.setAttribute('aria-label',tx('planner'));mapHost.querySelector('svg')!.setAttribute('aria-label',tx('map'));app.querySelector('.caption-top>span')!.textContent=tx('captions');const labels=app.querySelectorAll('.travel-controls label');labels[0].firstChild!.textContent=tx('speed');labels[1].firstChild!.textContent=tx('view');lastCaption='';renderPlanner();applyView();});
app.querySelector('#travel-voice')!.addEventListener('click',()=>plannerContent.querySelector<HTMLButtonElement>('#voice-toggle')?.click());
app.querySelector('#travel-replay')!.addEventListener('click',()=>plannerContent.querySelector<HTMLButtonElement>('#voice-replay')?.click());
app.querySelector('#planner-toggle')!.addEventListener('click',()=>{plannerOpen=!plannerOpen;applyView();});
app.querySelector('#map-view')!.addEventListener('click',()=>{visual='map';applyView();});
app.querySelector('#journey-view')!.addEventListener('click',()=>{visual='journey';applyView();});
app.querySelector('#zoom-in')!.addEventListener('click',()=>map.zoom(1.35));app.querySelector('#zoom-out')!.addEventListener('click',()=>map.zoom(1/1.35));app.querySelector('#fit')!.addEventListener('click',()=>map.fit());
function togglePause(){if(journey?.status==='running')journey.status='paused';else if(journey?.status==='paused'){journey.status='running';lastTime=performance.now();}updateProgress();}
app.querySelector('#pause')!.addEventListener('click',togglePause);
app.querySelector('#speed')!.addEventListener('change',event=>{speed=Number((event.target as HTMLSelectElement).value);updateProgress();});
app.querySelector('#dimension')!.addEventListener('change',event=>{dimension=(event.target as HTMLSelectElement).value as '2d'|'3d';failed3d=false;void mountRenderer();});
window.addEventListener('keydown',event=>{if((event.target as Element).closest('input,select,textarea,button,summary,a,[role="button"]'))return;if(event.code==='Space'){event.preventDefault();togglePause();}else if(['1','2','3'].includes(event.key)){speed=event.key==='1'?1:event.key==='2'?5:15;(app.querySelector('#speed') as HTMLSelectElement).value=String(speed);}else if(event.key==='Escape'){plannerOpen=false;applyView();(app.querySelector('#planner-toggle') as HTMLButtonElement).focus();}});
function frame(now:number) {
  if(dead||pageSuspended)return;
  const dt=Math.min(.5,Math.max(0,(now-lastTime)/1000));lastTime=now;
  const oldStatus=journey?.status,oldStation=journey?.currentStation;
  if(!document.hidden&&journey)tickJourney(journey,dt*speed);
  if(journey?.status==='interrupted'&&oldStatus!=='interrupted'){plannerOpen=true;renderPlanner();applyView();plannerContent.querySelector<HTMLButtonElement>('.event-decision button')?.focus();}
  if(journey?.status==='complete'&&oldStatus!=='complete'){plannerOpen=true;renderPlanner();applyView();plannerContent.scrollTop=0;plannerContent.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus({preventScroll:true});}
  if(journey?.currentStation!==oldStation)map.render(draft,selected,journey?.currentStation,journey?.completed.filter(edge=>edge.kind!=='transfer'));
  if(visual==='journey'&&renderer&&!document.hidden)renderer.render(createSnapshot(graph,journey,language,motion.matches));
  if(now-lastUi>200){lastUi=now;updateProgress();}
  simulationFrame=requestAnimationFrame(frame);
}
function suspend(){cancelAnimationFrame(simulationFrame);if(journey?.status==='running')journey.status='paused';voice.suspend();lastTime=performance.now();updateProgress();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else{lastTime=performance.now();cancelAnimationFrame(simulationFrame);simulationFrame=requestAnimationFrame(frame);}});
window.addEventListener('pagehide',event=>{suspend();pageSuspended=true;rendererGeneration++;renderer?.dispose();renderer=undefined;if(!event.persisted){dead=true;voice.dispose();map.dispose();}});
window.addEventListener('pageshow',event=>{if(!event.persisted)return;pageSuspended=false;lastTime=performance.now();if(visual==='journey')void mountRenderer();cancelAnimationFrame(simulationFrame);simulationFrame=requestAnimationFrame(frame);});
window.addEventListener('storage',event=>{if(event.key==='beijing-voice-muted'&&event.newValue==='true')voice.mute();});
document.documentElement.lang=language;document.title=`Transit Tales — ${tx('title')}`;
resetChoice();renderPlanner();applyView();simulationFrame=requestAnimationFrame(frame);
