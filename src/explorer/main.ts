import { catalogCreditsUrl, constellations, destinations, loadCatalog, objectName, solarSystem, type SkyObject, type Vec } from './catalog';
import { add, angles, apparentMagnitude, approachRange, blendPose, camera, cameraRoll, clamp, constellationPassage, constellationTour, DEG, direction, easeAngle, flightPassage, type Frame, length, LY, type Pose, scale, smooth, spaceFrame, sub, unit, wrap } from './camera';
import { createDeviceMotionController, type DeviceMotionState } from '../universe/device-motion';
import { arrivalFacts } from './arrival-facts';
import { earthSites, solarHour } from './earth-site';
import { spacecraftDestinations, spacecraftEpoch, spacecraftPosition, paleBlueDotDate, paleBlueDotPosition } from './spacecraft';
import { phenomenonIds } from './phenomena';
import { deck } from './deck';
import { FrameBudget } from './frame-budget';
import { destinationImageRadius } from './imagery';
import { en, zh } from './locale';
import { Sky } from './sky';
import './style.css';

type EarthSiteKey = keyof typeof earthSites | 'custom' | 'device';
let earthSiteKey: EarthSiteKey = 'maunakea';
let earthSite: { lat: number; lon: number } = earthSites.maunakea;
let siteStatus: 'siteWaiting' | 'siteUnavailable' | undefined;
let locationRequest = 0;
let siteChosen = false;
const allDestinations = [...destinations, ...spacecraftDestinations];
const historical = {
  id: 'pale-blue-dot', name: 'Voyager 1', zh: '旅行者 1 号', kind: 'spacecraft' as const, position: paleBlueDotPosition,
};
type Destination = (typeof allDestinations)[number] | typeof historical | SkyObject;
type Shape = (typeof constellations)[number];
type Trip = { destination: Destination; from: Pose; aim: Pose; approach: Vec; to: Pose; landing: Pose; frame: Frame; fromEarth: boolean; toEarth: boolean; fromRoll: number; toRoll: number; near: number; total: number; elapsed: number; duration: number };
type TourPassage = { progress: number; returning: boolean; endpoint: Pose };
type Tour = { shape: Shape; members: Set<string>; stars: SkyObject[]; center: Vec; radial: Vec; span: number; depth: number; origin: Pose; bearing: Pose; elapsed: number; playing: boolean; passage?: TourPassage; rejoin?: { from: Pose; elapsed: number } };
type Panel = 'travel' | 'shapes' | 'settings' | 'credits';
const panels: Panel[] = ['travel', 'shapes', 'settings', 'credits'];
const root = document.querySelector<HTMLElement>('#explorer')!;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const query = new URLSearchParams(location.search);
let locale: 'en' | 'zh' = query.get('lang') === 'zh' || (!query.has('lang') && /^zh/i.test(navigator.language)) ? 'zh' : 'en';
let t = locale === 'zh' ? zh : en;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const cameraMotionKey = 'night-atlas.camera-motion';
let cameraMotion = 'full';
try {
  const saved = localStorage.getItem(cameraMotionKey);
  if (saved === 'full' || saved === 'gentle' || saved === 'system') cameraMotion = saved;
} catch { /* Storage may be blocked. */ }
const gentle = () => cameraMotion === 'gentle' || (cameraMotion === 'system' && reduced.matches);
const budget = new FrameBudget();
let dismissedBudget = false;
const date = new Date();
date.setUTCHours(8, 0, 0, 0); // 22:00 HST at the default observing site.
let solar = solarSystem(date, earthSite.lat, earthSite.lon);
let probeScene: { epoch: Date; solar: typeof solar; earth: Vec } | undefined;
const effectsKey = 'night-atlas.animated-phenomena';
let effectsOn = true;
try { effectsOn = localStorage.getItem(effectsKey) !== 'off'; } catch { /* Storage may be blocked. */ }
let effectsSlow = 0, effectsLast = 0, effectsSuggested = false, effectsDismissed = false;
let effectsTimer: ReturnType<typeof setTimeout> | undefined;
let catalog: SkyObject[] = [], byId = new Map<string, SkyObject>();
let place: Destination = destinations[0];
let destinationId = destinations.find(d => d.id === 'hip-70890')?.id ?? destinations[1].id;
let shapeId = constellations.find(c => c.id.toLowerCase() === 'ori')?.id ?? constellations[0]?.id;
let view: Pose = { position: solar.observer, yaw: 102 * DEG, pitch: 22 * DEG, zoom: 1 };
let desired = { yaw: view.yaw, pitch: view.pitch, zoom: 1 };
let panel: Panel | undefined, trip: Trip | undefined, tour: Tour | undefined;
let sky: Sky | undefined, skyCanvas: HTMLCanvasElement;
let faint = 6.25, drawLines = false;
const densities = ['labelsOff', 'labelsFew', 'labelsBalanced', 'labelsMany'] as const;
let density = 2;
const densityKey = 'night-atlas.star-names';
try {
  const saved = localStorage.getItem(densityKey);
  if (saved !== null && /^[0-3]$/.test(saved)) density = Number(saved);
} catch { /* Storage may be blocked. */ }
let displayedPose = view;
let notice: keyof typeof en | undefined, picked: SkyObject | undefined;
let motionState: DeviceMotionState | undefined;
let frameRequest = 0, lastFrame = 0, lastStatus: string | undefined;
const keys = new Set<string>();
const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
const ground = () => place.id === 'earth' && !trip && !tour;
// Keep Earth's coordinate axes (including camera roll) throughout the constellation tour.
const frame = () => trip?.frame ?? (ground() || tour ? solar : spaceFrame);
const label = (object: { name: string; zh?: string }) => objectName(object, locale);
const selectedShape = () => constellations.find(c => c.id === shapeId);
const selectedDestination = () => allDestinations.find(d => d.id === destinationId) ?? destinations[0];
const group = (destination: Destination) => {
  if (destination.kind === 'spacecraft') return 'spacecraft';
  const pc = length(destination.position);
  return pc < .01 ? 'local' : pc < 25 ? 'stars' : pc < 50_000 ? 'milky' : 'farther';
};
const number = (value: number, digits = 1) => value.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en', { maximumFractionDigits: digits });
function distance(pc: number) {
  if (pc < .001) return `${number(pc * 206264.806, 2)} AU`;
  return `${number(pc * LY)} ${locale === 'zh' ? '光年' : 'ly'}`;
}
const motion = createDeviceMotionController(state => {
  motionState = state;
  if (lastStatus !== state.status) updateMotion();
  invalidate();
});

function updateMotion() {
  const status = motionState?.status;
  lastStatus = status;
  const on = status === 'active' || status === 'requesting' || status === 'waiting';
  $('motion').setAttribute('aria-pressed', String(on));
  $('recenter').hidden = status !== 'active';
  $('motion-mode').hidden = status !== 'active' || ground();
  $('motion-mode').textContent = motionState?.mode === 'inspect' ? t.move : t.look;
  const message = $('motion-status');
  message.hidden = !status || ['idle', 'paused', 'disposed'].includes(status);
  message.textContent = status === 'active' ? t.tiltReady : on ? t.tiltWaiting : t.tiltError;
}

function announce(key?: keyof typeof en) {
  notice = key;
  $('notice').hidden = !key;
  $('notice-message').textContent = key ? t[key] : '';
  $('retry').hidden = key !== 'failed';
}

function updateDate() {
  $('date').setAttribute('value', date.toISOString().slice(0, 10));
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  $('hour-value').textContent = date.toISOString().slice(11, 16);
  $<HTMLInputElement>('date').value = date.toISOString().slice(0, 10);
  $<HTMLInputElement>('hour').value = String(minutes);
  $<HTMLInputElement>('hour').setAttribute('aria-valuetext', `${date.toISOString().slice(11, 16)} UTC`);
}

function setDate(value: Date) {
  if (!Number.isFinite(+value)) return;
  date.setTime(+value);
  solar = solarSystem(date, earthSite.lat, earthSite.lon);
  if (ground()) view.position = solar.observer;
  else if (!trip && !tour) {
    const target = solar.objects.find(object => object.id === place.id);
    if (target || place.kind === 'spacecraft') land(place, park(place));
  }
  $('under').hidden = true;
  $('body-below').hidden = true;
  updateDate(); refresh(); invalidate();
}

function siteLabel() {
  if (earthSiteKey === 'custom' || earthSiteKey === 'device') return `${number(earthSite.lat, 2)}°, ${number(earthSite.lon, 2)}°`;
  return earthSites[earthSiteKey][locale];
}

function updateSite() {
  const select = $<HTMLSelectElement>('site-select');
  const device = select.querySelector<HTMLOptionElement>('option[value=device]')!;
  device.hidden = device.disabled = earthSiteKey !== 'device';
  select.value = earthSiteKey;
  $('site-form').hidden = select.value !== 'custom';
  const status = $('site-status');
  status.hidden = !siteStatus;
  status.textContent = siteStatus ? t[siteStatus] : '';
  $<HTMLButtonElement>('device-site').disabled = siteStatus === 'siteWaiting';
}

function applySite(key: EarthSiteKey, coordinates: typeof earthSite) {
  earthSiteKey = key;
  earthSite = coordinates;
  siteStatus = undefined;
  updateSite();
  setDate(date);
}

function requestSite() {
  const request = ++locationRequest;
  siteStatus = 'siteWaiting'; updateSite();
  const failed = () => {
    if (request !== locationRequest) return;
    siteStatus = 'siteUnavailable'; updateSite();
  };
  if (!navigator.geolocation) { failed(); return; }
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    if (request !== locationRequest) return;
    if (ground()) applySite('device', { lat: coords.latitude, lon: coords.longitude });
    else { siteStatus = undefined; updateSite(); }
  }, failed, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 });
}

function updateVisibility() {
  $<HTMLInputElement>('visibility').value = String(faint);
  $('visibility-value').textContent = number(faint, 2);
  for (const [id, value] of [['clear', 6.25], ['haze', 4.25], ['city', 2.75]] as const) $(id).setAttribute('aria-pressed', String(faint === value));
}

function updateDensity() {
  const input = $<HTMLInputElement>('star-names');
  const value = t[densities[density]];
  input.value = String(density);
  input.setAttribute('aria-valuetext', value);
  $('star-names-value').textContent = value;
}

function fillSelects() {
  const select = $<HTMLSelectElement>('destination');
  select.textContent = '';
  for (const name of ['local', 'spacecraft', 'stars', 'milky', 'farther'] as const) {
    const bucket = document.createElement('optgroup');
    bucket.label = t[name];
    for (const d of allDestinations.filter(item => group(item) === name)) bucket.append(new Option(label(d), d.id));
    if (bucket.children.length) select.append(bucket);
  }
  select.value = destinationId;
  const shape = $<HTMLSelectElement>('shape');
  shape.textContent = '';
  for (const c of [...constellations].sort((a, b) => label(a).localeCompare(label(b), locale))) shape.append(new Option(label(c), c.id));
  shape.value = shapeId;
}

function shapeGeometry(shape: Shape) {
  const members = new Set(shape.lines.flat());
  const stars = Array.from(members).map(id => byId.get(id)).filter((entry): entry is SkyObject => !!entry);
  if (stars.length < 2) return;
  const center = scale(stars.reduce<Vec>((a, star) => add(a, star.position), [0, 0, 0]), 1 / stars.length);
  const lookFromEarth = scale(stars.reduce<Vec>((a, star) => add(a, unit(sub(star.position, solar.observer))), [0, 0, 0]), 1 / stars.length);
  const span = Math.max(...stars.map(star => length(sub(star.position, center))));
  const distances = stars.map(star => length(sub(star.position, solar.observer)));
  return { members, stars, center, radial: unit(sub(center, solar.observer)), lookFromEarth, span, depth: Math.max(...distances) - Math.min(...distances) };
}

function updateShape() {
  const shape = selectedShape();
  const geo = shape && shapeGeometry(shape);
  $('depth').textContent = geo ? `${t.depth} · ${distance(geo.depth)}` : '';
  $('under').hidden ||= !ground();
  for (const id of ['find', 'tour', 'toggle-lines']) $<HTMLButtonElement>(id).disabled = !geo || !ground();
  $('toggle-lines').setAttribute('aria-pressed', String(drawLines));
}

function pickedDestination(): Destination | undefined {
  if (!picked || trip || tour?.passage || picked.id === place.id) return;
  return destinations.find(site => site.id === picked?.id) ?? picked;
}

function updateBudgetHint() {
  const effects = effectsSuggested && effectsOn && !reduced.matches && !effectsDismissed && phenomenonIds.has(place.id) && !trip;
  const flight = budget.suggested && !dismissedBudget && !gentle() && !trip && !tour?.passage;
  $('frame-hint').hidden = !effects && !flight;
  $('frame-hint-text').textContent = effects ? t.effectsHint : t.frameHint;
  $('use-gentle').hidden = effects;
  $('use-still').hidden = !effects;
}

function setEffects(enabled: boolean) {
  effectsOn = enabled;
  effectsLast = 0; effectsSlow = 0;
  $('effects-toggle').setAttribute('aria-pressed', String(enabled));
  try { localStorage.setItem(effectsKey, enabled ? 'on' : 'off'); } catch { /* Keep the current setting. */ }
  updateBudgetHint(); invalidate();
}

function setCameraMotion(value: string) {
  cameraMotion = value;
  $<HTMLSelectElement>('camera-motion').value = value;
  try { localStorage.setItem(cameraMotionKey, value); } catch { /* Keep the current setting. */ }
  updateBudgetHint();
}

function updateObject() {
  const item = picked && (probeScene ? picked : solar.objects.find(object => object.id === picked?.id) ?? picked);
  $('object-reading').hidden = !item;
  if (!item) return;
  $('object-name').textContent = label(item);
  $('object-launch').hidden = !pickedDestination();
  const range = length(sub(item.position, view.position));
  const apparent = item.absolute == null ? item.mag : apparentMagnitude(item.absolute, range);
  $('object-details').textContent = `${distance(range)} · ${t.magnitude} ${number(apparent, 2)}${item.absolute == null ? '' : ` · ${t.absolute} ${number(item.absolute, 2)}`}`;
}

function refresh() {
  $('place').textContent = tour ? label(tour.shape) : label(trip?.destination ?? place);
  const passage = tour?.passage;
  $('prompt').textContent = passage ? (passage.returning ? t.returningSky : t.leavingSky) : tour ? t.tourText : ground() ? t.earthPrompt : !trip && place.id === historical.id ? t.paleBlueNote : t.spacePrompt;
  $('readout').textContent = tour ? `${t.depth} · ${distance(tour.depth)}` : trip ? `${t.flying} · ${distance(trip.total)}` : ground() ? `${siteLabel()} / ${date.toISOString().slice(0, 16).replace('T', ' ')} UTC` : probeScene ? `${t.probeNote} · ${probeScene.epoch.toISOString().slice(0, 16).replace('T', ' ')} UTC` : `${t.fromEarth} · ${distance(length(sub(view.position, solar.earth)))}`;
  const facts = trip || tour || ground() ? undefined : arrivalFacts[place.id === historical.id ? 'voyager-1' : place.id];
  $('arrival-fact').hidden = !facts;
  if (facts) {
    $('fact-text').textContent = facts[locale];
    const source = $<HTMLAnchorElement>('fact-source');
    source.href = facts.source; source.textContent = `${t.arrivalSource}: ${facts.agency} ↗`;
  }
  $('probe-actions').hidden = !!trip || place.kind !== 'spacecraft';
  root.classList.toggle('probe-arrival', !!probeScene);
  $('pale-blue-dot').hidden = place.id !== 'voyager-1';
  $('travel-progress').hidden = !trip;
  $('open-travel').hidden = !!tour || !!trip;
  $('open-shapes').hidden = !ground() && !tour;
  $('leave-tour').hidden = !tour;
  for (const id of ['tour-play', 'auto']) {
    const button = $<HTMLButtonElement>(id);
    button.hidden = !tour;
    button.disabled = !!passage;
    button.textContent = tour?.playing ? t.pause : t.auto;
  }
  $<HTMLButtonElement>('leave-tour').disabled = !!passage?.returning;
  $('atmosphere').hidden = !ground();
  $('find-bodies').hidden = !ground();
  $('earth-site').hidden = !ground();
  $('observing').hidden = !!tour || !!trip || place.id === historical.id;
  $('noon').hidden = $('midnight').hidden = !ground();
  for (const id of ['advance', 'retreat']) $(id).hidden = ground() || !!trip;
  $('disclaimer').textContent = !trip && phenomenonIds.has(place.id) ? t.effectsNote : group(trip?.destination ?? place) === 'farther' ? t.remote : t.observed;
  root.dataset.mode = tour ? 'tour' : trip ? 'flight' : ground() ? 'earth' : 'space';
  root.dataset.place = place.id;
  root.dataset.passage = passage ? (passage.returning ? 'returning' : 'entering') : '';
  updateMotion(); updateShape(); updateObject(); updateBudgetHint();
}

function openPanel(next?: Panel, focusPanel = true) {
  const prev = panel;
  panel = next;
  for (const id of panels) {
    $(id).hidden = id !== panel;
    $(`open-${id}`).setAttribute('aria-expanded', String(id === panel));
  }
  if (!focusPanel) return;
  if (next) $(next).querySelector<HTMLElement>('button')?.focus();
  else if (prev && !$(`open-${prev}`).hidden) $(`open-${prev}`).focus();
  else skyCanvas.focus({ preventScroll: true });
}

function probeEpoch(site: Destination) {
  return site.id === historical.id ? new Date(paleBlueDotDate) : spacecraftEpoch(site.id, date);
}

function probeEarth(epoch: Date, position: Vec, historicalView: boolean) {
  const skyAtEpoch = +epoch === +date ? solar : solarSystem(epoch, earthSite.lat, earthSite.lon);
  // Reconstruct the photograph’s sightline to Earth when its light was emitted.
  const lightTimeMs = length(sub(skyAtEpoch.earth, position)) * LY * 365.25 * 86_400_000;
  const earth = historicalView ? solarSystem(new Date(+epoch - lightTimeMs), earthSite.lat, earthSite.lon).earth : skyAtEpoch.earth;
  return { epoch, solar: skyAtEpoch, earth };
}

function land(site: Destination, pose: Pose) {
  place = site;
  const epoch = probeEpoch(site);
  probeScene = epoch ? probeEarth(epoch, pose.position, site.id === historical.id) : undefined;
  setPose(pose);
}

function physicalPosition(site: Destination): Vec {
  return spacecraftPosition(site.id, date) ?? solar.objects.find(object => object.id === site.id)?.position ?? site.position;
}

function park(site: Destination): Pose {
  if (site.id === 'earth') return { position: solar.observer, yaw: 102 * DEG, pitch: 22 * DEG, zoom: 1 };
  const center = physicalPosition(site);
  const epoch = probeEpoch(site);
  if (epoch) {
    const { earth } = probeEarth(epoch, center, site.id === historical.id);
    return { position: center, ...angles(spaceFrame, sub(earth, center)), zoom: site.id === historical.id ? 4.5 : 2.4 };
  }
  const body = solar.objects.find(object => object.id === site.id);
  const size = (body?.radiusKm ?? 0) / 3.08567758149e13;
  const sunward = unit(sub(solar.objects.find(object => object.id === 'sun')?.position ?? [0, 0, 0], center));
  const side = unit(add(sunward, [.41, -.76, .37]));
  const photo = destinationImageRadius(site.id);
  const orbit = size ? approachRange(size, 13 * DEG) : photo ? approachRange(photo, 22 * DEG) : site.kind === 'star' ? .000022 : site.kind === 'black-hole' ? .25 : site.id === '3c273' ? 250_000 : Math.max(.01, length(center) * .001);
  const position = add(center, scale(photo ? unit(sub(solar.earth, center)) : body && site.id !== 'sun' ? side : [.88, .43, .16], orbit));
  return { position, ...angles(spaceFrame, sub(center, position)), zoom: 1 };
}

function setPose(pose: Pose) {
  view = { ...pose };
  desired = { yaw: pose.yaw, pitch: pose.pitch, zoom: pose.zoom };
}

function dissolveSky() {
  root.querySelector('.sky-dissolve')?.remove();
  const still = document.createElement('canvas');
  still.className = 'sky-dissolve';
  still.setAttribute('aria-hidden', 'true');
  still.width = skyCanvas.width; still.height = skyCanvas.height;
  if (!still.width || !still.height) return;
  const context = still.getContext('2d');
  if (!context) return;
  context.drawImage(skyCanvas, 0, 0);
  skyCanvas.after(still);
  still.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: 'ease-in-out' }).onfinish = () => still.remove();
}

function go(site: Destination, fly: boolean) {
  if (trip) return;
  const source = displayedPose;
  const sourceFrame = frame();
  const fromEarth = ground(), toEarth = site.id === 'earth';
  const landingFrame = toEarth ? solar : spaceFrame;
  const basis = fromEarth || toEarth ? solar : spaceFrame;
  const center = physicalPosition(site);
  const landing = park(site);
  const range = length(sub(landing.position, source.position));
  if (panel !== 'shapes' || !toEarth) openPanel(undefined, false);
  tour = undefined; picked = undefined; probeScene = undefined;
  if (fly && range > 1e-12 && !gentle()) {
    const near = Math.max(length(sub(landing.position, center)), site.kind === 'spacecraft' ? .000018 : 1e-11);
    // Arrive on the incoming side of the object instead of passing through it.
    if (!toEarth && site.kind !== 'spacecraft' && length(sub(source.position, center)) > near) {
      landing.position = add(center, scale(unit(sub(source.position, center)), near));
      Object.assign(landing, angles(spaceFrame, sub(center, landing.position)));
    }
    // For a probe, offset only the approach: the final leg reaches the actual probe position.
    const approach = toEarth ? add(landing.position, scale(solar.up, near * 5)) : site.kind === 'spacecraft'
      ? add(landing.position, scale(unit(sub(source.position, center)), Math.min(range * .15, .000018))) : landing.position;
    const start = cameraRoll(sourceFrame, source, basis);
    const end = cameraRoll(landingFrame, landing, basis);
    const from = { ...source, yaw: start.yaw, pitch: start.pitch };
    const to = { ...landing, yaw: end.yaw, pitch: end.pitch };
    const aim = { ...from, ...angles(basis, sub(toEarth ? approach : center, source.position)), zoom: 1 };
    setPose(from);
    trip = { destination: site, from, aim, approach, to, landing, frame: basis, fromEarth, toEarth, fromRoll: start.roll, toRoll: end.roll, near, total: range, elapsed: 0, duration: clamp(3900 + Math.log10(1 + range) * 630, 3900, 7000) };
    $<HTMLProgressElement>('travel-progress').value = 0;
  } else {
    if (fly && range > 1e-12) dissolveSky();
    land(site, landing);
  }
  motion.recenter(); refresh(); skyCanvas.focus({ preventScroll: true }); invalidate();
}

function findShape() {
  const shape = selectedShape();
  const geo = shape && shapeGeometry(shape);
  if (!ground() || !geo) return;
  const bearing = angles(solar, geo.lookFromEarth);
  $('under').hidden = bearing.pitch > 0;
  if (bearing.pitch <= 0) return;
  drawLines = true;
  desired = { ...bearing, zoom: 1 };
  refresh(); invalidate();
}

function startTour() {
  const shape = selectedShape();
  const geo = shape && shapeGeometry(shape);
  if (!ground() || !shape || !geo) return;
  const origin = { ...displayedPose, position: solar.observer };
  const bearing = { position: solar.observer, ...angles(solar, geo.lookFromEarth), zoom: 1.28 };
  tour = { shape, ...geo, origin, bearing, elapsed: 0, playing: false };
  const endpoint = orbitPose(tour, 0);
  if (gentle()) { dissolveSky(); setPose(endpoint); }
  else tour.passage = { progress: 0, returning: false, endpoint };
  picked = undefined; motion.recenter(); refresh(); skyCanvas.focus({ preventScroll: true }); invalidate();
}

function orbitPose(active: Tour, progress: number): Pose {
  const position = constellationTour(active.center, active.radial, active.span, progress, length(sub(active.center, solar.observer)));
  return { position, ...angles(solar, sub(active.center, position)), zoom: 1.2 };
}

function finishTour() {
  if (!tour || tour.passage?.returning) return;
  if (gentle() && !tour.passage) { dissolveSky(); landTour(); return; }
  tour.passage = tour.passage ? { ...tour.passage, returning: true } : { progress: 1, returning: true, endpoint: displayedPose };
  tour.playing = false;
  picked = undefined;
  refresh(); skyCanvas.focus({ preventScroll: true }); invalidate();
}

function landTour() {
  if (!tour) return;
  setPose({ ...tour.origin, position: solar.observer });
  tour = undefined; picked = undefined;
  motion.setMode('look'); motion.recenter(); refresh();
  if (!panel) $('open-shapes').focus();
  invalidate();
}

const orbitDuration = 14000;
function orbitToggle() {
  if (!tour || tour.passage) return;
  if (tour.elapsed >= orbitDuration) tour.elapsed = 0;
  tour.playing = !tour.playing;
  tour.rejoin = tour.playing && !reduced.matches ? { from: { ...view }, elapsed: 0 } : undefined;
  refresh(); invalidate();
}

function takeControl() {
  if (tour?.playing) { tour.playing = false; tour.rejoin = undefined; refresh(); }
}

function turn(dx: number, dy: number) {
  if (trip || tour?.passage) return;
  takeControl();
  desired.yaw = wrap(desired.yaw + dx);
  desired.pitch = clamp(desired.pitch + dy, -89.4 * DEG, 89.4 * DEG);
  invalidate();
}

function zoom(by: number) {
  if (trip || tour?.passage) return;
  takeControl();
  desired.zoom = clamp(desired.zoom * by, .72, 4.5);
  invalidate();
}

function movement(by: number) {
  if (ground() || trip || tour?.passage) return;
  takeControl();
  const amount = tour ? tour.span * .1 : clamp(length(sub(view.position, physicalPosition(place))) * .18, .00000000001, 1e4);
  view.position = add(view.position, scale(direction(frame(), view.yaw, view.pitch), by * amount));
  updateObject(); invalidate();
}

function reset() {
  if (trip || tour?.passage) return;
  if (tour) {
    takeControl();
    tour.elapsed = 0;
    setPose(orbitPose(tour, 0));
  } else {
    setPose(park(place));
  }
  motion.recenter(); refresh(); invalidate();
}

function invalidate() {
  if (!frameRequest && !document.hidden) frameRequest = requestAnimationFrame(render);
}

function render(time: number) {
  frameRequest = 0;
  if (document.hidden || !sky) { lastFrame = 0; return; }
  const workStart = performance.now();
  const animating = !!trip || !!tour?.passage;
  const dt = Math.min(75, lastFrame ? time - lastFrame : 16);
  lastFrame = time;
  let atmosphere = ground() ? 1 : 0, focus = tour ? 1 : 0, roll = 0;
  if (trip) {
    trip.elapsed += dt;
    const portion = clamp(trip.elapsed / trip.duration, 0, 1);
    setPose(flightPassage(trip.from, trip.aim, trip.approach, trip.to, portion, trip.near));
    const settle = smooth(clamp((portion - .79) / .21, 0, 1));
    roll = trip.fromRoll * (1 - smooth(clamp(portion / .22, 0, 1))) + trip.toRoll * settle;
    atmosphere = trip.fromEarth ? 1 - smooth(clamp(portion / .29, 0, 1)) : trip.toEarth ? settle : 0;
    $<HTMLProgressElement>('travel-progress').value = portion;
    if (portion >= 1) {
      land(trip.destination, trip.landing); trip = undefined; picked = undefined; roll = 0;
      atmosphere = ground() ? 1 : 0;
      refresh();
    }
  }
  if (tour?.passage) {
    const passage = tour.passage;
    const step = dt / (passage.returning ? -1800 : 2400);
    passage.progress = clamp(passage.progress + step, 0, 1);
    const shot = constellationPassage(tour.origin, tour.bearing, passage.endpoint, passage.progress);
    setPose(shot.pose);
    atmosphere = shot.atmosphere; focus = shot.focus;
    if (passage.returning && passage.progress === 0) landTour();
    else if (!passage.returning && passage.progress === 1) {
      tour.passage = undefined; tour.playing = !gentle(); motion.recenter(); refresh();
    }
  } else if (tour?.playing) {
    tour.elapsed = Math.min(orbitDuration, tour.elapsed + dt);
    const pose = orbitPose(tour, tour.elapsed / orbitDuration);
    const rejoin = tour.rejoin;
    if (rejoin) {
      rejoin.elapsed += dt;
      setPose(blendPose(rejoin.from, pose, smooth(clamp(rejoin.elapsed / 850, 0, 1))));
      if (rejoin.elapsed >= 850) tour.rejoin = undefined;
    } else setPose(pose);
    if (tour.elapsed >= orbitDuration) { tour.playing = false; refresh(); }
  }
  for (const key of keys) {
    const vector = arrows[key];
    turn(vector[0] * dt * .00145, vector[1] * dt * .00145);
  }
  const ease = reduced.matches ? 1 : 1 - Math.exp(-dt / 65);
  view.yaw = wrap(easeAngle(view.yaw, desired.yaw, ease));
  view.pitch += (desired.pitch - view.pitch) * ease;
  view.zoom += (desired.zoom - view.zoom) * ease;
  let yaw = view.yaw, pitch = view.pitch, position = view.position;
  if (motionState?.status === 'active' && !trip && !tour?.passage) {
    if (motionState.mode === 'inspect' && !ground() && !trip) {
      const eye = camera(frame(), yaw, pitch, 1, 1);
      const offset = tour ? tour.span * .13 : length(sub(view.position, physicalPosition(place))) * .18;
      position = add(position, add(scale(eye.right, motionState.inspection.x * offset), scale(eye.forward, motionState.inspection.z * offset)));
    } else {
      yaw += motionState.yaw; pitch = clamp(pitch - motionState.pitch, -89.4 * DEG, 89.4 * DEG);
    }
  }
  const turnDeg = Math.round((yaw / DEG % 360 + 360) % 360) % 360;
  $('compass').textContent = ground() ? `${String(turnDeg).padStart(3, '0')}°  /  ${Math.round(pitch / DEG)}°` : `${view.zoom.toFixed(1)}×`;
  const displaySolar = probeScene?.solar ?? solar;
  const sun = displaySolar.objects.find(object => object.id === 'sun')?.position ?? [0, 0, 0];
  displayedPose = { position, yaw, pitch, zoom: view.zoom };
  if (effectsTimer !== undefined) { clearTimeout(effectsTimer); effectsTimer = undefined; }
  const phenomenon = !trip && !tour && phenomenonIds.has(place.id) ? place.id : undefined;
  const animateEffects = !!phenomenon && effectsOn && !reduced.matches;
  const inView = sky.draw({ position, frame: frame(), yaw, pitch, zoom: view.zoom, atmosphere, sun, faintLimit: 6.25 + (faint - 6.25) * atmosphere, locale, density, roll, earthOpacity: 1 - atmosphere,
    objects: focus === 1 ? [] : displaySolar.objects.filter(object => !(ground() || tour) || object.id !== 'earth').map(object => object.id === 'earth' && probeScene ? { ...object, position: probeScene.earth } : object),
    skyObjects: focus === 1 && tour ? tour.stars : catalog, earthEdges: drawLines && (ground() || tour) && focus < 1 ? earthEdges : [],
    tourEdges: tour?.shape.lines ?? [], members: tour?.members, focus,
    target: trip?.destination.id ?? (ground() || tour ? undefined : probeScene ? 'earth' : place.id),
    phenomenon: phenomenon ? { id: phenomenon, position: physicalPosition(place) } : undefined, effectTime: animateEffects ? time / 1000 : 0, probeView: !!probeScene });
  if (inView && animateEffects) {
    const work = performance.now() - workStart;
    const slow = work >= 20 || (effectsLast > 0 && time - effectsLast >= 54);
    effectsLast = time;
    effectsSlow = slow ? effectsSlow + 1 : Math.max(0, effectsSlow - 1);
    if (effectsSlow >= 5 && !effectsSuggested) { effectsSuggested = true; updateBudgetHint(); }
    // Cap isolated effect playback to 30fps; steering retains the normal frame rate.
    effectsTimer = setTimeout(invalidate, Math.max(0, 33 - work - 8));
  } else { effectsLast = 0; effectsSlow = 0; }
  const ready = notice !== 'loading';
  if (ready) {
    const suggested = budget.suggested;
    budget.sample(time, performance.now() - workStart, animating);
    if (animating && !trip && !tour?.passage) budget.finishAnimation();
    if (suggested !== budget.suggested || (animating && !trip && !tour?.passage)) updateBudgetHint();
  }
  if ((ready && budget.warming) || trip || tour?.passage || tour?.playing || keys.size || Math.abs(wrap(desired.yaw - view.yaw)) + Math.abs(desired.pitch - view.pitch) + Math.abs(desired.zoom - view.zoom) > .0007) invalidate();
  else if (!frameRequest) lastFrame = 0;
}

const earthEdges = constellations.flatMap(c => c.lines);

function attach() {
  skyCanvas = $<HTMLCanvasElement>('sky');
  try { sky = new Sky(skyCanvas, invalidate); } catch { sky = undefined; notice = 'missingCanvas'; }
  fillSelects(); updateDate(); updateVisibility(); updateDensity(); refresh(); announce(notice);
  $('data-credits').innerHTML = `<a href="${catalogCreditsUrl}" target="_blank" rel="noopener">${t.details} ↗</a>`;
  openPanel(panel, false);
  const click = (id: string, call: () => void) => $(id).addEventListener('click', call);
  for (const p of panels) {
    click(`open-${p}`, () => openPanel(panel === p ? undefined : p));
    $(p).querySelector('[data-close]')?.addEventListener('click', () => openPanel());
  }
  click('language', () => {
    locale = locale === 'en' ? 'zh' : 'en'; t = locale === 'zh' ? zh : en;
    const url = new URL(location.href); url.searchParams.set('lang', locale); history.replaceState(null, '', url);
    mount(); $('language').focus();
  });
  click('fullscreen', () => {
    try {
      const request = document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.();
      if (!request) announce('unsupported');
      else void request.catch(() => announce('unsupported'));
    } catch { announce('unsupported'); }
  });
  updateFullscreen();
  click('retry', () => { void stars(); });
  const cameraStyle = $<HTMLSelectElement>('camera-motion');
  cameraStyle.value = cameraMotion;
  cameraStyle.addEventListener('change', () => setCameraMotion(cameraStyle.value));
  click('use-gentle', () => { setCameraMotion('gentle'); $('open-settings').focus(); });
  click('dismiss-frame-hint', () => {
    if (!$('use-still').hidden) effectsDismissed = true;
    else dismissedBudget = true;
    updateBudgetHint(); $('open-settings').focus();
  });
  $('effects-toggle').setAttribute('aria-pressed', String(effectsOn));
  click('effects-toggle', () => setEffects(!effectsOn));
  click('use-still', () => { setEffects(false); $('open-settings').focus(); });
  click('pale-blue-dot', () => go(historical, true));
  click('look-earth', () => {
    if (!probeScene || trip) return;
    desired = { ...angles(spaceFrame, sub(probeScene.earth, view.position)), zoom: place.id === historical.id ? 4.5 : 2.4 };
    motion.recenter(); invalidate();
  });
  click('object-launch', () => { const site = pickedDestination(); if (site) go(site, true); });
  click('object-close', () => { picked = undefined; updateObject(); skyCanvas.focus({ preventScroll: true }); });
  click('launch', () => go(selectedDestination(), true));
  click('start', () => go(selectedDestination(), false));
  $('destination').addEventListener('change', event => { destinationId = (event.target as HTMLSelectElement).value; });
  $('shape').addEventListener('change', event => { shapeId = (event.target as HTMLSelectElement).value; $('under').hidden = true; updateShape(); });
  click('toggle-lines', () => { drawLines = !drawLines; updateShape(); invalidate(); });
  click('find', findShape); click('tour', startTour); click('leave-tour', finishTour); click('auto', orbitToggle); click('tour-play', orbitToggle);
  click('up', () => turn(0, .145)); click('down', () => turn(0, -.145));
  click('left', () => turn(-.18, 0)); click('right', () => turn(.18, 0)); click('reset', reset);
  for (const id of ['zoom-in', 'nearer']) click(id, () => zoom(1.22));
  for (const id of ['zoom-out', 'wider']) click(id, () => zoom(1 / 1.22));
  click('advance', () => movement(1)); click('retreat', () => movement(-1));
  for (const id of ['sun', 'moon']) click(`find-${id}`, () => {
    const body = solar.objects.find(object => object.id === id);
    if (!ground() || !body) return;
    const aim = angles(solar, sub(body.position, solar.observer));
    $('body-below').hidden = aim.pitch > 0;
    if (aim.pitch <= 0) return;
    desired = { ...aim, zoom: 1 };
    openPanel(); invalidate();
  });
  click('now', () => setDate(new Date()));
  click('noon', () => setDate(solarHour(date, earthSite.lon, 12)));
  click('midnight', () => setDate(solarHour(date, earthSite.lon, 0)));
  const sites = $<HTMLSelectElement>('site-select');
  for (const [key, site] of Object.entries(earthSites)) sites.add(new Option(site[locale], key));
  sites.add(new Option(t.manualSite, 'custom'));
  // Show the device as a selectable site only while it is the active location.
  const deviceOption = new Option(t.deviceSite, 'device'); deviceOption.hidden = true; deviceOption.disabled = true; sites.add(deviceOption);
  $<HTMLInputElement>('site-lat').value = String(earthSite.lat);
  $<HTMLInputElement>('site-lon').value = String(earthSite.lon);
  updateSite();
  sites.addEventListener('change', () => {
    siteChosen = true; locationRequest++; siteStatus = undefined;
    if (sites.value === 'custom') {
      $('site-form').hidden = false;
      $('site-status').hidden = true;
      $<HTMLButtonElement>('device-site').disabled = false;
      $('site-lat').focus();
    } else {
      const key = sites.value as keyof typeof earthSites;
      applySite(key, earthSites[key]);
    }
  });
  $('site-form').addEventListener('submit', event => {
    event.preventDefault();
    const lat = $<HTMLInputElement>('site-lat').valueAsNumber, lon = $<HTMLInputElement>('site-lon').valueAsNumber;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    siteChosen = true; locationRequest++; applySite('custom', { lat, lon });
  });
  click('device-site', () => { siteChosen = true; requestSite(); });
  $('date').addEventListener('change', () => {
    const input = $<HTMLInputElement>('date');
    if (input.validity.valid && input.value) setDate(new Date(`${input.value}T${date.toISOString().slice(11, 16)}:00Z`));
  });
  $('hour').addEventListener('input', () => {
    const d = new Date(+date);
    d.setUTCHours(0, Number($<HTMLInputElement>('hour').value), 0, 0); setDate(d);
  });
  $('visibility').addEventListener('input', () => { faint = Number($<HTMLInputElement>('visibility').value); updateVisibility(); invalidate(); });
  $('star-names').addEventListener('input', () => {
    density = Number($<HTMLInputElement>('star-names').value);
    try { localStorage.setItem(densityKey, String(density)); } catch { /* Keep the current setting. */ }
    updateDensity(); invalidate();
  });
  for (const [id, value] of [['clear', 6.25], ['haze', 4.25], ['city', 2.75]] as const) click(id, () => { faint = value; updateVisibility(); invalidate(); });
  click('motion', () => {
    if (motionState?.status === 'active' || motionState?.status === 'waiting' || motionState?.status === 'requesting') motion.stop();
    else { takeControl(); void motion.enable(); }
  });
  click('recenter', () => motion.recenter());
  click('motion-mode', () => { takeControl(); motion.setMode(motionState?.mode === 'inspect' ? 'look' : 'inspect'); motion.recenter(); updateMotion(); });
  let pointer: { id: number; x: number; y: number; travel: number } | undefined;
  skyCanvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, travel: 0 };
    skyCanvas.setPointerCapture(event.pointerId); skyCanvas.classList.add('drag');
    if (panel && panel !== 'shapes') openPanel(undefined, false);
  });
  skyCanvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, travel: pointer.travel + Math.abs(dx) + Math.abs(dy) };
    if (pointer.travel > 3) turn(-dx * .0035 / view.zoom, dy * .0035 / view.zoom);
  });
  skyCanvas.addEventListener('pointerup', event => {
    if (!pointer || pointer.id !== event.pointerId || pointer.travel > 5 || trip || tour?.passage) return;
    const box = skyCanvas.getBoundingClientRect();
    picked = sky?.pick(event.clientX - box.left, event.clientY - box.top); updateObject();
  });
  skyCanvas.addEventListener('lostpointercapture', () => { pointer = undefined; skyCanvas.classList.remove('drag'); });
  skyCanvas.addEventListener('wheel', event => { if (event.ctrlKey) return; event.preventDefault(); zoom(event.deltaY > 0 ? .92 : 1.09); }, { passive: false });
}

function updateFullscreen() {
  const text = document.fullscreenElement ? t.leaveFull : t.full;
  $('fullscreen').setAttribute('aria-label', text); $('fullscreen').title = text;
}

const dockLayout = new ResizeObserver(() => {
  const actions = root.querySelector('.actions');
  if (!actions) return;
  const bottom = root.getBoundingClientRect().bottom - actions.getBoundingClientRect().top + 10;
  $('shapes').style.setProperty('--shape-bottom', `${bottom}px`);
});

function mount() {
  dockLayout.disconnect();
  root.innerHTML = deck(t);
  dockLayout.observe(root);
  dockLayout.observe(root.querySelector('.actions')!);
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.title = `${t.title} · Transit Tales`;
  attach(); invalidate();
}

async function stars() {
  announce('loading');
  try {
    catalog = await loadCatalog();
    byId = new Map(catalog.map(entry => [entry.id, entry]));
    if (notice === 'loading') announce();
    updateShape(); invalidate();
  } catch { announce('failed'); }
}

mount();
if (sky) void stars();
if (navigator.permissions?.query) {
  void navigator.permissions.query({ name: 'geolocation' }).then(permission => {
    if (permission.state === 'granted' && !siteChosen && ground()) requestSite();
  }).catch(() => { /* Location remains available by explicit request. */ });
}
reduced.addEventListener?.('change', () => { updateBudgetHint(); invalidate(); });
window.addEventListener('resize', invalidate);
window.addEventListener('blur', () => keys.clear());
document.addEventListener('fullscreenchange', () => { updateFullscreen(); invalidate(); });
document.addEventListener('visibilitychange', () => {
  keys.clear(); lastFrame = 0; budget.pause(); effectsLast = 0; effectsSlow = 0;
  if (effectsTimer !== undefined) { clearTimeout(effectsTimer); effectsTimer = undefined; }
  if (document.hidden && frameRequest) { cancelAnimationFrame(frameRequest); frameRequest = 0; }
  else invalidate();
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (panel && $(panel).contains(document.activeElement)) openPanel();
    else if (picked) { picked = undefined; updateObject(); }
    else if (tour) finishTour();
    else if (panel) openPanel();
    return;
  }
  if (event.ctrlKey || event.altKey || event.metaKey || (event.target as HTMLElement | null)?.closest('input, select, textarea, button, a')) return;
  if (Object.prototype.hasOwnProperty.call(arrows, event.key)) {
    event.preventDefault(); keys.add(event.key); invalidate();
  } else if (event.key === '+' || event.key === '=') zoom(1.18);
  else if (event.key === '-') zoom(1 / 1.18);
  else if (event.key.toLowerCase() === 'w') movement(1);
  else if (event.key.toLowerCase() === 's') movement(-1);
});
window.addEventListener('keyup', event => keys.delete(event.key));
