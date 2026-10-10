import './style.css';
import './languages.css';
import { BuildHistory, canPlace, constructionText, evaluate, footprint, icons, kindNames, modeNames, palette, parseSave, tools, type Kind, type Mode, type Piece } from './model';
import { World } from './world';
import { createLanguageController, languageOptions, type Language } from './rush/locale';
let language: Language = 'en';
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Local play still works. */ }
const locale = createLanguageController(storage, navigator.languages, next => { language = next; localize(); });
language = locale.language;
const t = (english: string, params: Record<string, string | number> = {}) => constructionText(language, english, Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === 'string' ? constructionText(language, value) : value])));
document.documentElement.lang = language;
document.title = t('Build a World') + ' · Transit Tales';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <style>label[for="construction-language"]{display:flex;align-items:center;gap:6px}#construction-language{background:transparent;color:inherit;border:0}#construction-language:focus-visible{outline:3px solid #263c6a;outline-offset:2px}@media(max-width:700px){label[for="construction-language"]{padding:0 3px}label[for="construction-language"]>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}#construction-language{width:76px;min-height:36px!important}.top-actions{gap:4px}.masthead .brand{font-size:17px;max-width:125px}.masthead .brand-mark{flex:none}.masthead .top-button{padding-left:6px;padding-right:6px}}</style>
  <main class="game-shell">
    <canvas id="world" aria-label="Interactive 3D building area. Choose a shape, then tap the stage to place it. Drag to orbit the camera." tabindex="0"></canvas>
    <header class="masthead"><a class="brand" href="index.html" aria-label="Build a World — return to Transit Tales" style="color:inherit;text-decoration:none"><span class="brand-mark" aria-hidden="true">✳</span><span>Build a World</span></a><div class="top-actions"><label for="construction-language" class="top-button"><span>Language</span><select id="construction-language" style="max-width:8rem;min-height:44px;font:inherit">${languageOptions()}</select></label><button class="top-button" id="worlds" title="Choose a different world">✦ <span>Worlds</span></button><button class="top-button" id="help" title="How to play">? <span>Help</span></button></div></header>
    <section class="mission" aria-label="Current world"><div class="mission-tag" id="mission-tag">Let's build</div><h1 id="mission-title">Skyline Rescue</h1><p id="mission-copy"></p><div class="mission-progress" id="mission-progress"></div><button id="play" class="play-button">▶ <span>Test my world</span></button></section>
    <div class="scene-caption" id="scene-caption">Drag to look around · Scroll or pinch to zoom</div>
    <aside class="workspace" aria-label="Building tools"><div class="workspace-heading"><span>MY WORKBENCH</span><span id="piece-count">0 pieces</span></div><div class="shape-scroll" id="shapes" aria-label="Shapes"></div><div class="workspace-bottom"><div class="color-section"><span class="section-label">Color</span><div id="colors" class="colors" role="group" aria-label="Piece color"></div></div><div class="edit-section"><span class="section-label">Make it yours</span><div class="edit-buttons"><button id="rotate" title="Rotate selected or next piece (R)" aria-label="Rotate piece">⟳ <span>Rotate</span></button><button id="level-down" title="Lower placement level" aria-label="Lower placement level">−</button><span id="level-label" aria-live="polite">Level 1</span><button id="level-up" title="Raise placement level" aria-label="Raise placement level">+</button><button id="remove" title="Remove selected piece (Delete)" aria-label="Remove selected piece">⌫ <span>Remove</span></button></div></div></div></aside>
    <nav class="utility" aria-label="History and saves"><button id="undo" title="Undo (Ctrl+Z)">↶ <span>Undo</span></button><button id="redo" title="Redo (Ctrl+Y)">↷ <span>Redo</span></button><span class="utility-divider"></span><button id="save" title="Save this world in this browser">⇩ <span>Save</span></button><button id="load" title="Load your last saved world">⇧ <span>Load</span></button><button id="clear" title="Start this world over">◇ <span>Clear</span></button></nav>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <div class="overlay" id="chooser" role="dialog" aria-modal="true" aria-labelledby="chooser-title"><div class="chooser-card"><div class="chooser-head"><div class="chooser-emblem" aria-hidden="true">✳</div><div><h2 id="chooser-title">What shall we make?</h2><p>A little idea can become a whole world.</p></div></div><div class="world-options" id="world-options"></div><div class="chooser-foot">No rules in the studio. In the other worlds, build anything and see what happens when you press <strong>Test my world</strong>.</div><button class="close-button" id="chooser-close" aria-label="Close world chooser">×</button></div></div>
    <div class="overlay hidden" id="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title"><div class="guide-card"><button class="close-button" id="guide-close" aria-label="Close help">×</button><span class="guide-spark" aria-hidden="true">✦</span><h2 id="guide-title">Your hands make the magic.</h2><div class="guide-steps"><p><b>1. Choose a shape</b><br>Tap a shape below, then tap the stage to place it. Or drag a shape onto the stage.</p><p><b>2. Make it yours</b><br>Choose a color. Use Rotate, change the level to stack pieces, or tap a piece to select, recolor, rotate, or remove it.</p><p><b>3. Bring it to life</b><br>Press Test my world. Keep trying until your creation makes the world react!</p></div><p class="guide-small">Drag the stage to orbit · Scroll or pinch to zoom · R rotate · Delete remove · Ctrl/⌘ + Z undo · Escape close</p><button class="play-button" id="guide-done">Got it! Let's build →</button></div></div>
    <div class="overlay hidden" id="result" role="dialog" aria-modal="false" aria-labelledby="result-title"><div class="result-card"><div class="result-illustration" id="result-symbol">✦</div><h2 id="result-title"></h2><p id="result-copy"></p><button class="play-button" id="result-done">Back to building →</button></div></div>
  </main>`;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('world');
const staticText: [Text, string][] = [];
const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode as Text;
  if (node.parentElement?.closest('style, option, #mission-title, #mission-copy, #mission-tag, #mission-progress, #piece-count, #level-label, #play, #scene-caption')) continue;
  if (node.textContent?.trim()) staticText.push([node, node.textContent]);
}
const staticAttributes = Array.from(app.querySelectorAll<HTMLElement>('[aria-label], [title]')).flatMap(element => ['aria-label', 'title'].filter(attr => element.hasAttribute(attr)).map(attr => [element, attr, element.getAttribute(attr)!] as const));

let world: World;
try { world = new World(canvas); } catch (err) { app.innerHTML = `<div class="no-webgl" role="alert"><h1>${t('Your browser needs 3D graphics')}</h1><p>${t('Turn on hardware acceleration or try a recent browser with WebGL support, then reload the page.')}</p></div>`; throw err; }
const descriptions: Record<Mode, string> = {
  rescue: 'The neighbors need a way across the river — and a tall place to wave from.',
  park: 'Make a joyful park with places to play, wander, and wonder.',
  solar: 'Build a tiny cosmos and set its celestial neighbors in motion.',
  parade: 'Make a character and a scene. Then let the little show begin.',
  studio: 'No mission. No limits. This whole little universe is yours.'
};
const worldArt: Record<Mode, string> = { rescue: '▥', park: '✿', solar: '☀', parade: '♟', studio: '✳' };
const worldSub: Record<Mode, string> = { rescue: 'Bridge the blue river', park: 'A place for everyone', solar: 'Set the skies spinning', parade: 'Curtain up, creator!', studio: 'Anything is possible' };
const worldOptions = $<HTMLDivElement>('world-options');
worldOptions.innerHTML = (Object.keys(modeNames) as Mode[]).map((m, i) => `<button class="world-option option-${m}" data-world="${m}"><span class="option-art" aria-hidden="true">${worldArt[m]}</span><span class="option-info"><strong>${modeNames[m]}</strong><small>${worldSub[m]}</small></span><span class="option-arrow" aria-hidden="true">↗</span></button>`).join('');
let mode: Mode = 'rescue'; let history = new BuildHistory(); let active: Kind = 'tile'; let color = palette[0]; let rotation = 0; let level = 0; let selected: string | null = null; let testing = false;
let resultCopy: ReturnType<typeof evaluate> | null = null;
let resultMode: Mode = 'rescue';
let toastCopy: { text: string; params: Record<string, string | number> } | null = null;
let toastTimer = 0; let lastPointer: { x: number; y: number } | null = null; let dragKind: Kind | null = null;
const saveKey = (m: Mode) => `build-a-world:v1:${m}`;
const autoKey = (m: Mode) => `${saveKey(m)}:autosave`;
const readSave = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const say = (text: string, params: Record<string, string | number> = {}) => { toastCopy = { text, params }; const toast = $('toast'); toast.textContent = t(text, params); toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3900); };
const getPieces = () => history.pieces;
const stash = (manual = false) => { try { localStorage.setItem(manual ? saveKey(mode) : autoKey(mode), JSON.stringify({ mode, pieces: getPieces() })); return true; } catch { say('This browser could not save your world. Check available storage.'); return false; } };
const selection = () => getPieces().find(p => p.id === selected);
function render() {
  const pieces = getPieces(); world.stop(); testing = false; world.setPieces(pieces);
  if (selected && !pieces.some(p => p.id === selected)) selected = null;
  world.select(selected);
  $('piece-count').textContent = t(pieces.length === 1 ? '{count} piece' : '{count} pieces', { count: pieces.length });
  $('undo').toggleAttribute('disabled', !history.canUndo); $('redo').toggleAttribute('disabled', !history.canRedo);
  $('remove').toggleAttribute('disabled', !selected); $('level-label').textContent = t('Level {level}', { level: level + 1 });
  $<HTMLDivElement>('shapes').querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(el => { el.classList.toggle('active', el.dataset.kind === active && !selected); el.setAttribute('aria-pressed', String(el.dataset.kind === active && !selected)); });
  $<HTMLDivElement>('colors').querySelectorAll<HTMLButtonElement>('[data-color]').forEach(el => { el.classList.toggle('chosen', el.dataset.color === (selection()?.color ?? color)); el.setAttribute('aria-pressed', String(el.dataset.color === (selection()?.color ?? color))); });
  updateHint();
}
function commit(pieces: Piece[]) { history.set(pieces); render(); stash(); }
function updateHint() {
  const mission = evaluate(mode, getPieces(), language); const progress = $('mission-progress');
  if (mode === 'studio') { progress.textContent = t('Create anything you imagine'); return; }
  if (mode === 'rescue') { const crossing = [-2, -1, 0, 1, 2].filter(x => getPieces().some(p => ['tile', 'beam'].includes(p.kind) && p.z <= 0 && p.z + footprint(p)[1] > 0 && p.x <= x && p.x + footprint(p)[0] > x)).length; progress.textContent = t('River crossing {crossing}/5 squares · lookout level 3', { crossing }); }
  else if (mode === 'park') progress.textContent = t('Ride {ride}  Habitat {habitat}  Paths {paths}/2', { ride: getPieces().some(p => p.kind === 'wheel') ? '✓' : '○', habitat: getPieces().some(p => p.kind === 'habitat') ? '✓' : '○', paths: Math.min(2, getPieces().filter(p => p.kind === 'path').length) });
  else if (mode === 'solar') progress.textContent = t('Sun {sun}  Planets {planets}/2  Moon {moon}  Comet {comet}', { sun: getPieces().some(p => p.kind === 'sun') ? '✓' : '○', planets: Math.min(2, getPieces().filter(p => p.kind === 'planet').length), moon: getPieces().some(p => p.kind === 'moon') ? '✓' : '○', comet: getPieces().some(p => p.kind === 'comet') ? '✓' : '○' });
  else progress.textContent = t('Body {body}  Head {head}  Hat {hat}  Scene {scene} · Stack your character', { body: getPieces().some(p => p.kind === 'body') ? '✓' : '○', head: getPieces().some(p => p.kind === 'head') ? '✓' : '○', hat: getPieces().some(p => p.kind === 'hat') ? '✓' : '○', scene: getPieces().some(p => ['star', 'flower', 'tree', 'arch'].includes(p.kind)) ? '✓' : '○' });
  progress.classList.toggle('ready', mission.success);
}
function switchMode(next: Mode) {
  mode = next; selected = null; history = new BuildHistory(); active = tools[mode][0]; color = palette[0]; rotation = 0; level = 0;
  world.setMode(mode); $('mission-title').textContent = t(modeNames[mode]); $('mission-copy').textContent = t(descriptions[mode]); $('mission-tag').textContent = t(mode === 'studio' ? 'FREE PLAY' : 'THE LITTLE MISSION');
  $('play').querySelector('span')!.textContent = t(mode === 'studio' ? 'Bring it to life' : 'Test my world');
  $<HTMLDivElement>('shapes').innerHTML = tools[mode].map(kind => `<button class="shape" type="button" data-kind="${kind}" draggable="true" aria-label="${t('Choose {kind}', { kind: kindNames[kind] })}" title="${t(kindNames[kind])}"><span class="shape-symbol" aria-hidden="true">${icons[kind]}</span><span>${t(kindNames[kind])}</span></button>`).join('');
  const loaded = parseSave(readSave(autoKey(mode)) ?? readSave(saveKey(mode)), mode); if (loaded?.length) { history.set(loaded); say('Welcome back! Your {mode} is here.', { mode: modeNames[mode] }); }
  $('chooser').classList.add('hidden'); render();
  if (!readSave('build-a-world:v1:welcomed')) {
    $('guide').classList.remove('hidden'); $('guide-done').focus();
    try { localStorage.setItem('build-a-world:v1:welcomed', 'yes'); } catch { /* Private browsing still permits playing. */ }
  }
}
$<HTMLDivElement>('colors').innerHTML = palette.map((c, i) => `<button type="button" class="color-chip" style="--chip:${c}" data-color="${c}" aria-label="${t('Color {color}', { color: ['coral', 'sunshine', 'mint', 'blue', 'violet', 'pink', 'cream', 'ink'][i] })}"></button>`).join('');
worldOptions.addEventListener('click', e => { const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-world]'); if (target) switchMode(target.dataset.world as Mode); });
$<HTMLDivElement>('shapes').addEventListener('click', e => { const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-kind]'); if (!target) return; active = target.dataset.kind as Kind; selected = null; render(); say('Ready to place {kind}. Tap the stage!', { kind: kindNames[active] }); });
$<HTMLDivElement>('shapes').addEventListener('dragstart', e => { const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-kind]'); if (!target) return; dragKind = target.dataset.kind as Kind; e.dataTransfer?.setData('text/plain', dragKind); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'; });
$<HTMLDivElement>('shapes').addEventListener('dragend', () => { dragKind = null; world.setGhost(); });
$<HTMLDivElement>('colors').addEventListener('click', e => { const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-color]'); if (!target) return; color = target.dataset.color!; const p = selection(); if (p) { commit(getPieces().map(piece => piece.id === p.id ? { ...piece, color } : piece)); say('A fresh color for your piece!'); } else { render(); } });
function newPiece(grid: { x: number; z: number }, kind = active): Piece { const temp: Piece = { id: 'preview', kind, x: grid.x, z: grid.z, y: level, rotation, color }; const [w, d] = footprint(temp); temp.x -= Math.floor((w - 1) / 2); temp.z -= Math.floor((d - 1) / 2); return temp; }
function place(grid: { x: number; z: number }, kind = active) {
  const piece = newPiece(grid, kind); piece.id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `piece-${Date.now()}-${Math.random()}`;
  if (!canPlace(getPieces(), piece)) { say('This spot is full or outside the stage. Try another place or level.'); return; }
  selected = null; commit([...getPieces(), piece]); say('{kind} placed. Keep going!', { kind: kindNames[kind] });
}
canvas.addEventListener('pointerdown', e => { lastPointer = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  const start = lastPointer; lastPointer = null; if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
  const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  const hit = world.pickPiece(x, y);
  if (hit && !dragKind && level === 0) { selected = hit; const p = selection()!; color = p.color; level = p.y; rotation = p.rotation; render(); say('{kind} selected. Change its color, rotate it, or remove it.', { kind: kindNames[p.kind] }); return; }
  const grid = world.pickGrid(x, y); if (grid) place(grid);
});
canvas.addEventListener('pointermove', e => {
  if (e.buttons) { world.setGhost(); return; }
  const rect = canvas.getBoundingClientRect(); const grid = world.pickGrid(e.clientX - rect.left, e.clientY - rect.top);
  if (grid && !selected) { const piece = newPiece(grid); world.setGhost(piece, canPlace(getPieces(), piece)); } else world.setGhost();
});
canvas.addEventListener('pointerleave', () => world.setGhost());
canvas.addEventListener('dragover', e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; });
canvas.addEventListener('drop', e => { e.preventDefault(); const kind = (e.dataTransfer?.getData('text/plain') || dragKind) as Kind; dragKind = null; if (!tools[mode].includes(kind)) return; const rect = canvas.getBoundingClientRect(); const grid = world.pickGrid(e.clientX - rect.left, e.clientY - rect.top); if (grid) { active = kind; place(grid, kind); } world.setGhost(); });
$('rotate').addEventListener('click', rotate);
function rotate() { const p = selection(); if (p) { const updated = { ...p, rotation: (p.rotation + 1) % 4 }; if (!canPlace(getPieces(), updated)) { say('Not enough room to turn this piece.'); return; } rotation = updated.rotation; commit(getPieces().map(item => item.id === p.id ? updated : item)); } else { rotation = (rotation + 1) % 4; say('Next shape turned a quarter turn.'); } }
$('level-up').addEventListener('click', () => { level = Math.min(6, level + 1); render(); }); $('level-down').addEventListener('click', () => { level = Math.max(0, level - 1); render(); });
$('remove').addEventListener('click', remove); function remove() { if (!selected) return; const p = selection(); commit(getPieces().filter(item => item.id !== selected)); selected = null; say('{kind} removed.', { kind: p ? kindNames[p.kind] : 'Piece' }); }
$('undo').addEventListener('click', undo); $('redo').addEventListener('click', redo);
function undo() { if (history.canUndo) { selected = null; history.undo(); render(); stash(); say('One step back.'); } }
function redo() { if (history.canRedo) { selected = null; history.redo(); render(); stash(); say('One step forward.'); } }
$('save').addEventListener('click', () => { if (stash(true)) say('Snapshot saved! You can bring it back with Load.'); });
$('load').addEventListener('click', () => { const raw = readSave(saveKey(mode)); const pieces = parseSave(raw, mode); if (!pieces) { say('No saved world found here yet. Build something and press Save.'); return; } selected = null; commit(pieces); say('Saved world loaded!'); });
$('clear').addEventListener('click', () => { if (!getPieces().length) { say('The stage is already clear.'); return; } if (window.confirm(t('Clear every piece from this world? You can Undo afterward.'))) { selected = null; commit([]); say('A fresh stage! Undo if you change your mind.'); } });
$('play').addEventListener('click', () => {
  resultCopy = evaluate(mode, getPieces()); resultMode = mode;
  const result = evaluate(mode, getPieces(), language); world.play(result.success); testing = true;
  $('result-symbol').textContent = result.success ? '✦' : '✳'; $('result-title').textContent = t(result.success ? (mode === 'studio' ? 'Your world is alive!' : 'You did it!') : 'Almost there!'); $('result-copy').textContent = result.message + (result.success ? '' : ` ${result.hint}`); $('result').classList.remove('hidden'); $('result-done').focus();
});
$('result-done').addEventListener('click', () => { $('result').classList.add('hidden'); if (testing) { world.stop(); testing = false; } canvas.focus(); });
$('worlds').addEventListener('click', () => { $('chooser').classList.remove('hidden'); worldOptions.querySelector<HTMLButtonElement>('[data-world]')?.focus(); });
$('chooser-close').addEventListener('click', () => { $('chooser').classList.add('hidden'); canvas.focus(); });
$('help').addEventListener('click', () => { $('guide').classList.remove('hidden'); $('guide-done').focus(); });
const closeGuide = () => { $('guide').classList.add('hidden'); canvas.focus(); }; $('guide-close').addEventListener('click', closeGuide); $('guide-done').addEventListener('click', closeGuide);
document.addEventListener('keydown', e => {
  const target = e.target as HTMLElement; if (target.matches('input, textarea, select')) return;
  if (e.key === 'Escape') { if (!$('result').classList.contains('hidden')) { $('result-done').click(); return; } if (!$('guide').classList.contains('hidden')) { closeGuide(); return; } if (!$('chooser').classList.contains('hidden')) { $('chooser-close').click(); return; } selected = null; render(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) rotate();
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); remove(); }
});
world.setMode(mode); $('mission-copy').textContent = t(descriptions[mode]);
render();

function localize() {
  document.documentElement.lang = language;
  document.title = t('Build a World') + ' · Transit Tales';
  for (const [node, english] of staticText) node.textContent = english.replace(english.trim(), t(english.trim()));
  for (const [element, attr, english] of staticAttributes) element.setAttribute(attr, t(english));
  $<HTMLSelectElement>('construction-language').value = language;
  $('mission-title').textContent = t(modeNames[mode]);
  $('mission-copy').textContent = t(descriptions[mode]);
  $('mission-tag').textContent = t(mode === 'studio' ? 'FREE PLAY' : 'THE LITTLE MISSION');
  $('play').querySelector('span')!.textContent = t(mode === 'studio' ? 'Bring it to life' : 'Test my world');
  $('scene-caption').textContent = t('Drag to look around · Scroll or pinch to zoom');
  $('piece-count').textContent = t(getPieces().length === 1 ? '{count} piece' : '{count} pieces', { count: getPieces().length });
  $('level-label').textContent = t('Level {level}', { level: level + 1 });
  worldOptions.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button => {
    const m = button.dataset.world as Mode;
    button.querySelector('strong')!.textContent = t(modeNames[m]);
    button.querySelector('small')!.textContent = t(worldSub[m]);
  });
  $('shapes').querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(button => {
    const name = kindNames[button.dataset.kind as Kind];
    button.setAttribute('aria-label', t('Choose {kind}', { kind: name }));
    button.title = t(name); button.lastElementChild!.textContent = t(name);
  });
  $('colors').querySelectorAll<HTMLButtonElement>('[data-color]').forEach((button, index) => button.setAttribute('aria-label', t('Color {color}', { color: ['coral', 'sunshine', 'mint', 'blue', 'violet', 'pink', 'cream', 'ink'][index] })));
  updateHint();
  if (toastCopy) $('toast').textContent = t(toastCopy.text, toastCopy.params);
  if (!$('result').classList.contains('hidden')) {
    const result = resultCopy!;
    $('result-title').textContent = t(result.success ? (resultMode === 'studio' ? 'Your world is alive!' : 'You did it!') : 'Almost there!');
    $('result-copy').textContent = t(result.message) + (result.success ? '' : ` ${t(result.hint)}`);
  }
}
$<HTMLSelectElement>('construction-language').addEventListener('change', event => locale.setLanguage((event.target as HTMLSelectElement).value as Language));
localize();
