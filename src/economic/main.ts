import './style.css';
import { act, advance, createGame, getActions, getLevel, getPrices, getProgress, getWeather, LEVELS, LEVEL_COUNT, netWorth, type Family, type GameState, type Lang, type Place, type Text } from './model';
import { loadGame, saveGame, type Save } from './storage';
import { icon, portrait, sceneArt, townAnchors } from './art';
import { copy, escapeHtml as esc, itemNames, money, text } from './copy';

const host = document.querySelector<HTMLDivElement>('#economic')!;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Play remains available without storage. */ }
const restored = loadGame(storage);
let lang: Lang = restored?.lang ?? 'zh';
let state: GameState = restored?.state ?? createGame({ gender: 'girl', children: 2 });
let checkpoint: GameState = restored?.checkpoint ?? structuredCopy(state);
let family: Family = { ...state.family };
let place: Place | 'town' = 'town';
type Panel = 'setup' | 'wallet' | 'journal' | 'settings' | 'help' | 'retry' | 'reset' | undefined;
let panel: Panel = restored ? undefined : 'setup';
let feedback: Text | undefined;
let feedbackOk = true;
let saved = Boolean(restored);
let saveAttempted = Boolean(restored);
let sound = false;
let audio: AudioContext | undefined;
let focusReturn: string | undefined;
let outfitChoice: number | undefined;
const places: Place[] = ['home', 'shop', 'school', 'bank', 'park'];
const placeIcons = { home: 'home', shop: 'bag', school: 'school', bank: 'bank', park: 'park' };
function structuredCopy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function t(value: Text): string { return esc(text(value, lang)); }
function amount(value: number, foreign = false): string { return `${money(value, lang)} <small>${foreign ? (lang === 'zh' ? '贝币' : 'shells') : copy(lang).yuan}</small>`; }
function itemIcon(id: string): string {
  if (id.includes('souvenir') || id === 'shell') return 'shell';
  if (id.includes('book')) return 'book';
  if (id.includes('toy') || id === 'kite' || id === 'plush') return 'toy';
  if (id.includes('bread') || id === 'fresh' || id === 'markdown') return 'bread';
  if (id === 'coat') return 'shirt';
  if (id === 'gift') return 'gift';
  if (id.includes('coin')) return 'coin';
  if (id === 'apple' || id.includes('juice')) return 'apple';
  return 'bag';
}
function foreignWallet(): string {
  if (!state.flags.fxRate) return '';
  const foreign = state.flags.foreignCash ?? 0, rate = state.flags.fxRate;
  return `<div class="foreign-wallet">${icon('shell')}<div><b>${lang === 'zh' ? '旅行钱袋' : 'Travel purse'} · ${amount(foreign, true)}</b><span>1 ${lang === 'zh' ? '贝币' : 'shell'} = ${amount(rate)}${lang === 'zh' ? '（虚构汇率）' : ' (fictional rate)'}</span>${state.flags.foreignDebt ? `<span>${icon('card')}${lang === 'zh' ? '家长的卡 · 外币账单' : 'Parent’s card · foreign bill'} ${amount(state.flags.foreignDebt, true)}</span>` : ''}</div></div>`;
}
function walletExtras(): string {
  const zh = lang === 'zh';
  const balance = (label: string, value: number, glyph: string, note: string) => `<div class="minor-wallet">${icon(glyph)}<div><b>${label} · ${amount(value)}</b><span>${note}</span></div></div>`;
  let content = state.digital > 0 ? balance(zh ? '数字钱包（预付）' : 'Digital wallet (prepaid)', state.digital, 'card', zh ? '已经从口袋充值的钱，不是借款。' : 'Money already loaded from your pocket, not a loan.') : '';
  if (state.flags.pendingChange) content += balance(zh ? '找零等着领' : 'Change waiting for you', state.flags.pendingChange, 'coin', zh ? '这是店主还要给你的钱，也属于你。' : 'The shopkeeper still owes you this money. It is yours, too.');
  const due = (day: number) => `${zh ? `约定第 ${day} 天` : `Promised day ${day}`} · ${state.day > day ? (zh ? '已经过了约定日' : 'Past the promised day') : state.day === day ? (zh ? '就是今天' : 'That is today') : (zh ? `还有 ${day - state.day} 个游戏天` : `${day - state.day} game days left`)}`;
  const contracts: string[] = [];
  if (state.bankTerm) {
    const term = state.bankTerm;
    contracts.push(`<p>${icon('bank')}<span><b>${zh ? '存款的小约定' : 'Your savings promise'}</b>${amount(term.principal)} · ${term.rate}% / ${zh ? '游戏天' : 'game day'}<small>${term.settled ? (zh ? '利息已经进入银行钱袋；本金仍在存款里。' : 'Interest is in the bank pouch; the principal is still saved.') : due(term.maturityDay)}</small></span></p>`);
  }
  if (state.loan) contracts.push(`<p>${icon('handshake')}<span><b>${zh ? '记得还朋友' : 'Remember your friend'}</b>${due(state.loan.dueDay)}<small>${zh ? '要还的总数已在上面的钱袋里，不重复相加。' : 'The total owed is already in the pouch above, not added twice.'} ${state.loan.rate}% / ${zh ? '游戏天（本金单利）' : 'game day (simple interest)'}</small></span></p>`);
  if (state.flags.foreignDebt) contracts.push(`<p>${icon('card')}<span><b>${zh ? '家长的卡：回家用元还款' : 'Parent’s card: repay in home yuan'}</b>${due(state.flags.cardDueDay)}<small>${zh ? '按当前虚构汇率结算，要还的元已在上面的钱袋里。' : 'Settled at the current fictional rate. Home yuan owed is in the pouch above.'}${state.flags.cardLateFee ? ` ${zh ? '已包含一次迟还费用' : 'Includes one late fee'} ${amount(state.flags.cardLateFee)}` : ''}</small></span></p>`);
  return `${content}${contracts.length ? `<div class="contract-notes">${contracts.join('')}</div>` : ''}`;
}
function persist(): void {
  saveAttempted = true;
  saved = saveGame(storage, { state, checkpoint, lang } satisfies Save);
}
function outfit(): number { return outfitChoice ?? Math.min(2, Math.floor((state.level + (state.completed ? 1 : 0)) / 6)); }
function button(action: string, label: string, glyph: string, extra = ''): string {
  return `<button type="button" id="${action}" data-ui="${action}" class="tool" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(glyph)}<span>${esc(label)}</span></button>`;
}
function shortPlace(location: Place): string {
  return (lang === 'zh' ? { home: '家', shop: '小铺', school: '学校', bank: '银行', park: '公园' } : { home: 'Home', shop: 'Shop', school: 'School', bank: 'Bank', park: 'Park' })[location];
}
function render(): void {
  const focused = (document.activeElement as HTMLElement | null)?.id;
  const c = copy(lang), level = getLevel(state), progress = getProgress(state), prices = getPrices(state);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = `${c.title} · Transit Tales`;
  const weather = getWeather(state);
  const goalRatio = Math.min(1, Math.max(0, progress.current / Math.max(1, progress.total)));
  const isFinal = state.completed && state.level === LEVEL_COUNT - 1;
  host.innerHTML = `
    <main class="economy-game ${panel === 'setup' ? 'is-setup' : ''}" aria-label="${c.title}">
      <div class="scenery" aria-hidden="true"><div class="world-stage">${sceneArt({ place: isFinal && !panel ? 'park' : place, gender: state.family.gender, children: state.family.children, age: level.age, day: state.day, outfit: outfit(), completed: isFinal, cash: state.cash, savings: state.savings, debt: state.debt, stock: prices.reduce((sum, price) => sum + price.stock, 0), weather, travel: state.level >= 18 })}</div></div>
      <header class="game-header">
        <a class="home-link" href="index.html" aria-label="${c.homeLink}" title="${c.homeLink}">${icon('home')}</a>
        <div class="game-name"><h1>${c.title}</h1><span>${level.age} ${c.age} <i>·</i> ${c.day} ${state.day} ${c.dayEnd}</span></div>
        <div class="header-right"><select id="language" aria-label="Language / 语言"><option value="zh" ${lang === 'zh' ? 'selected' : ''}>简体中文</option><option value="en" ${lang === 'en' ? 'selected' : ''}>English</option></select>
        <button id="wallet" data-ui="wallet" class="pocket" aria-label="${c.wallet}: ${money(state.cash, lang)} ${c.yuan}" aria-expanded="${panel === 'wallet'}">${icon('coin')}<span><small>${c.cash}</small><b>${amount(state.cash)}</b></span></button></div>
      </header>
      <section class="wish-note ${state.completed ? 'wish-done' : ''}" aria-label="${c.goal}">
        <div class="wish-pin" aria-hidden="true"></div><div class="wish-top"><h2>${t(level.title)}</h2><span>${state.level + 1}/${LEVEL_COUNT}</span></div>
        <p>${t(level.goal)}</p><div class="wish-progress"><div class="progress-track" role="progressbar" aria-label="${c.progress}" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${progress.current}" aria-valuetext="${esc(text(progress.description, lang))}"><span style="transform:scaleX(${goalRatio})"></span></div><small>${state.completed ? `${icon('check')}${c.done}` : t(progress.description)}</small></div>
        ${place === 'town' && !state.completed ? `<button id="go-story" data-place="${level.place}" class="go-story">${icon('arrow')}${c.travel} · ${c.locations[level.place]}</button>` : ''}
      </section>
      ${place === 'town' && !panel && !isFinal ? `<nav class="town-markers" aria-label="${c.visit}">${places.map(location => `<button id="town-${location}" data-place="${location}" class="town-marker ${level.place === location ? 'story-marker' : ''}" style="--x:${townAnchors[location].x}%;--y:${townAnchors[location].y}%">${icon(placeIcons[location])}<span>${c.locations[location]}</span>${level.place === location ? '<i aria-hidden="true">···</i>' : ''}</button>`).join('')}</nav>` : ''}
      ${place !== 'town' && !panel && !isFinal ? conversation(place) : ''}
      ${isFinal && !panel ? `<section class="picnic-ending" aria-labelledby="ending-title"><div class="ending-rosette">${icon('heart')}</div><h2 id="ending-title">${c.finale}</h2><p>${c.finaleBody}</p><span>${c.ending}</span><div class="ending-actions"><button id="ending-wallet" data-ui="wallet" class="primary">${icon('book')}${c.wallet}</button><button id="ending-reset" data-ui="reset" class="secondary">${c.reset}</button></div><small>${c.endingNote}</small></section>` : ''}
      <nav class="location-strip" aria-label="${c.visit}" ${panel === 'setup' || isFinal ? 'hidden' : ''}>${places.map(location => `<button id="visit-${location}" data-place="${location}" ${place === location ? 'aria-current="location"' : ''} class="${level.place === location && !state.completed ? 'has-story' : ''}">${icon(placeIcons[location])}<span>${shortPlace(location)}</span></button>`).join('')}</nav>
      <nav class="game-tools" aria-label="${c.settings}" ${panel === 'setup' ? 'hidden' : ''}>${place !== 'town' && !isFinal ? button('town', c.map, 'map') : ''}${button('journal', c.chapter, 'book')}${button('help', c.help, 'help')}${button('settings', c.settings, 'sound')}</nav>
      <p class="save-status ${saveAttempted && !saved ? 'save-warning' : ''}" role="status">${saveAttempted ? (saved ? c.saved : c.unsaved) : c.saveNote}</p>
      ${place === 'town' && !panel && !state.completed ? `<p class="town-hint">${c.locationHint}</p>` : ''}
      ${state.completed && place === 'town' && !panel && !isFinal ? `<section class="town-complete"><p>${c.continueHint}</p><button id="next-town" data-ui="next" class="primary">${c.next}${icon('arrow')}</button></section>` : ''}
      ${panel ? panelContent(panel) : ''}
      <div class="sr-only" role="status" aria-live="polite">${feedback ? t(feedback) : ''}</div>
    </main>`;
  sizeWorld();
  if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
}
function conversation(location: Place): string {
  const c = copy(lang), level = getLevel(state), offers = getActions(state, location);
  const npc = location === 'bank' ? 'banker' : location === 'home' ? 'parent' : 'friend';
  const greeting = location === level.place ? level.intro : {
    zh: `${c.locations[location]}就在这里。先看看今天的小愿望；小脚印会指向故事发生的地方。`,
    en: `Welcome to ${c.locations[location]}. Check your little wish; the footprints point to today’s story.`,
  };
  return `<section class="conversation ${state.completed ? 'conversation-done' : ''}" aria-label="${c.speak}">
    <div class="speaker">${portrait(npc)}<div><h2>${location === level.place ? t(level.person) : c.locations[location]}</h2><p class="spoken ${feedback && !feedbackOk ? 'choice-error' : ''}">${feedback ? t(feedback) : t(greeting)}</p></div></div>
    ${location === 'shop' && !state.completed ? priceTags() : ''}
    ${state.completed ? `<div class="completion-actions"><span>${icon('check')}${c.done}</span><button id="next" data-ui="next" class="primary">${c.next}${icon('arrow')}</button></div>` : `<div class="choices">${offers.map((offer, index) => `<button id="action-${esc(offer.id)}" data-action="${esc(offer.id)}" class="choice ${index === 0 ? 'suggested-choice' : ''}" ${offer.disabled ? 'disabled' : ''}>${icon(offer.icon)}<span><b>${t(offer.label)}</b><small>${t(offer.disabled ?? offer.detail)}</small></span>${icon('arrow')}</button>`).join('')}${offers.length === 0 ? `<button id="find-story" data-place="${level.place}" class="choice">${icon('arrow')}<span><b>${c.travel} · ${c.locations[level.place]}</b><small>${t(level.goal)}</small></span></button>` : ''}</div>`}
  </section>`;
}
function priceTags(): string {
  const c = copy(lang), prices = getPrices(state);
  return prices.length ? `<div class="price-tags" aria-label="${c.price}">${prices.map(price => `<span class="price-tag">${icon(itemIcon(price.id))}<span><b>${t(price.label)} ${amount(price.price, price.currency === 'foreign')}</b><small>${price.stock ? `${c.stock} ${price.stock}` : c.emptyStock}</small></span></span>`).join('')}</div>` : '';
}
function panelContent(which: Exclude<Panel, undefined>): string {
  const c = copy(lang), critical = ['setup', 'retry', 'reset'].includes(which);
  let title = '', content = '';
  if (which === 'setup') {
    title = c.chooseFamily;
    content = `<p class="setup-intro">${c.setupIntro}</p><div class="character-choice">${(['boy', 'girl'] as const).map(gender => `<button id="choose-${gender}" data-gender="${gender}" aria-pressed="${family.gender === gender}" class="character ${family.gender === gender ? 'selected' : ''}">${portrait(gender)}<b>${c[gender]}</b><span>${icon('check')}</span></button>`).join('')}</div><fieldset class="family-choice"><legend>${c.children}</legend>${c.familySize.map((label, index) => `<button id="children-${index + 1}" data-children="${index + 1}" aria-pressed="${family.children === index + 1}" class="${family.children === index + 1 ? 'selected' : ''}"><span class="little-family">${Array.from({ length: index + 1 }, (_, child) => portrait(child % 2 ? 'boy' : 'girl')).join('')}</span>${label}</button>`).join('')}</fieldset><p class="family-note">${c.familyNote}</p><button id="start" data-ui="start" class="primary start-story">${c.newGame}${icon('arrow')}</button><small class="privacy-note">${c.saveNote}</small>`;
  } else if (which === 'wallet') {
    title = c.wallet;
    const items = Object.entries(state.inventory).filter(([, count]) => count > 0);
    content = `<p class="wallet-note">${c.walletNote}</p><div class="money-pouches">${[['cash', 'wallet', state.cash], ['savings', 'bank', state.savings], ['debt', 'handshake', state.debt]].map(([name, glyph, value]) => `<div class="money-pouch pouch-${name}">${icon(glyph as string)}<span>${c[name as 'cash' | 'savings' | 'debt']}</span><b>${amount(value as number)}</b></div>`).join('')}</div>${foreignWallet()}${walletExtras()}<div class="net-worth">${icon('heart')}<span>${c.worth}</span><b>${amount(netWorth(state))}</b></div><div class="trust-line"><span>${c.trust}</span><div aria-label="${c.trust}: ${state.trust}/3">${Array.from({ length: 3 }, (_, index) => `<span class="trust-heart ${index < state.trust ? 'filled' : ''}">${icon('heart')}</span>`).join('')}</div></div><p class="fine-note">${c.trustNote}</p><h3>${c.inventory}</h3><div class="bag-items">${items.length ? items.map(([id, count]) => `<span>${icon(itemIcon(id))}<b>${esc(itemNames[id]?.[lang] ?? id)} × ${count}</b></span>`).join('') : `<p>${c.emptyBag}</p>`}</div><details class="ledger"><summary>${c.history}</summary>${state.ledger.length ? `<ol>${state.ledger.slice(-10).reverse().map(entry => `<li><span>${c.day} ${entry.day} ${c.dayEnd}</span><b>${t(entry.label)}</b><div>${(['cash', 'savings', 'debt'] as const).filter(key => entry[key] !== 0).map(key => `<small>${c[key]} ${entry[key] > 0 ? '+' : ''}${money(entry[key], lang)}</small>`).join('')}</div></li>`).join('')}</ol>` : `<p>${c.noHistory}</p>`}</details><details class="wardrobe"><summary>${c.wardrobe}</summary><p>${c.wardrobeNote}</p><div>${c.outfit.map((label, index) => `<button id="outfit-${index}" data-outfit="${index}" ${index > Math.min(2, Math.floor((state.level + (state.completed ? 1 : 0)) / 6)) ? 'disabled' : ''} aria-pressed="${outfit() === index}">${portrait(state.family.gender, index)}<span>${label}</span></button>`).join('')}</div></details>`;
  } else if (which === 'journal') {
    title = c.chapter;
    content = `<div class="storybook">${c.chapterNames.map((name, chapter) => `<section><h3>${icon(chapter === 0 ? 'coin' : chapter === 1 ? 'bag' : chapter === 2 ? 'bank' : 'plane')}${name}</h3><p>${c.chapterDescriptions[chapter]}</p><ol>${LEVELS.slice(chapter * 6, chapter * 6 + 6).map((level, offset) => { const index = chapter * 6 + offset; return `<li class="${index < state.level || index === state.level && state.completed ? 'chapter-done' : index === state.level ? 'chapter-current' : 'chapter-future'}"><span>${index + 1}</span><div><b>${t(level.title)}</b><small>${index < state.level || index === state.level && state.completed ? c.done : index === state.level ? t(level.goal) : c.locked}</small></div>${icon(index < state.level || index === state.level && state.completed ? 'check' : index === state.level ? 'arrow' : 'book')}</li>`; }).join('')}</ol></section>`).join('')}</div><button id="journal-retry" data-ui="retry" class="secondary">${icon('reset')}${c.retry}</button><p class="fine-note">${c.endingNote}</p>`;
  } else if (which === 'help') {
    title = c.help;
    content = `<div class="help-illustration">${portrait(state.family.gender)}${icon('arrow')}${icon('bag')}</div><p>${c.helpBody}</p><p>${c.helpBank}</p><button id="help-go" data-place="${getLevel(state).place}" class="primary">${c.travel}${icon('arrow')}</button><button id="help-retry" data-ui="retry" class="secondary">${icon('reset')}${c.retry}</button>`;
  } else if (which === 'settings') {
    title = c.settings;
    content = `<div class="sound-setting"><span>${icon('sound')}${c.sound}</span><button id="toggle-sound" data-ui="toggle-sound" aria-pressed="${sound}">${sound ? c.soundOn : c.soundOff}</button></div><p>${c.soundNote}</p><p class="fine-note">${c.saveNote}</p><button id="settings-retry" data-ui="retry" class="secondary">${icon('reset')}${c.retry}</button><button id="settings-reset" data-ui="reset" class="text-action">${c.reset}</button>`;
  } else {
    const reset = which === 'reset';
    title = reset ? c.resetTitle : c.retryTitle;
    content = `<p>${reset ? c.resetBody : c.retryBody}</p><button id="confirm-${which}" data-ui="confirm-${which}" class="primary">${reset ? c.confirmReset : c.confirmRetry}${icon('arrow')}</button><button id="cancel" data-ui="close" class="secondary">${c.cancel}</button>`;
  }
  return `${critical ? '<div class="panel-backdrop"></div>' : ''}<section class="paper-panel panel-${which} ${critical ? 'protected-panel' : ''}" role="dialog" aria-modal="${critical}" aria-labelledby="panel-title"><header><h2 id="panel-title">${title}</h2>${which === 'setup' ? `<select id="setup-language" aria-label="Language / 语言"><option value="zh" ${lang === 'zh' ? 'selected' : ''}>简体中文</option><option value="en" ${lang === 'en' ? 'selected' : ''}>English</option></select>` : ''}${which !== 'setup' ? `<button id="close" data-ui="close" class="close-panel" aria-label="${c.close}">${icon('close')}</button>` : ''}</header><div class="panel-content">${content}</div></section>`;
}
function sizeWorld(): void {
  const game = host.querySelector<HTMLElement>('.economy-game');
  if (!game) return;
  const width = game.clientWidth, height = game.clientHeight;
  const worldWidth = Math.max(width, height * 1.6), worldHeight = worldWidth / 1.6;
  game.style.setProperty('--world-width', `${worldWidth}px`);
  game.style.setProperty('--world-height', `${worldHeight}px`);
}
function openPanel(next: Panel, source?: string): void {
  focusReturn = source;
  panel = next;
  render();
  const target = next === 'setup' ? '#choose-boy' : '#close';
  host.querySelector<HTMLButtonElement>(target)?.focus({ preventScroll: true });
}
function closePanel(): void {
  panel = undefined;
  render();
  if (focusReturn) document.getElementById(focusReturn)?.focus({ preventScroll: true });
}
function chime(ok: boolean): void {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => { sound = false; });
    [ok ? 523.25 : 293.66, ok ? 783.99 : 261.63].forEach((frequency, index) => {
      const oscillator = audio!.createOscillator(), gain = audio!.createGain();
      const start = audio!.currentTime + index * 0.095;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      oscillator.connect(gain); gain.connect(audio!.destination); oscillator.start(start); oscillator.stop(start + 0.25);
    });
  } catch { sound = false; }
}
host.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!target || target.disabled) return;
  const location = target.dataset.place as Place | undefined;
  if (location && places.includes(location)) {
    place = location; panel = undefined; feedback = undefined; render();
    host.querySelector<HTMLButtonElement>('.choices button:not(:disabled), #next')?.focus({ preventScroll: true });
    return;
  }
  if (target.dataset.gender) { family.gender = target.dataset.gender as Family['gender']; render(); return; }
  if (target.dataset.children) { family.children = Number(target.dataset.children) as Family['children']; render(); return; }
  if (target.dataset.outfit) { outfitChoice = Number(target.dataset.outfit); render(); return; }
  if (target.dataset.action) {
    const result = act(state, target.dataset.action);
    state = result.state; feedback = result.message; feedbackOk = result.ok;
    if (result.ok) persist();
    chime(result.ok); render();
    const liveGame = host.querySelector('.economy-game');
    liveGame?.classList.add(result.ok ? 'choice-made' : 'choice-reconsider');
    window.setTimeout(() => liveGame?.classList.remove('choice-made', 'choice-reconsider'), 600);
    if (state.completed) host.querySelector<HTMLButtonElement>('#next, #ending-wallet')?.focus({ preventScroll: true });
    return;
  }
  const action = target.dataset.ui as Panel | 'start' | 'town' | 'next' | 'close' | 'confirm-retry' | 'confirm-reset' | 'toggle-sound';
  if (action === 'start') {
    state = createGame(family); checkpoint = structuredCopy(state); place = getLevel(state).place;
    panel = undefined; feedback = undefined; outfitChoice = undefined; persist(); render();
    host.querySelector<HTMLButtonElement>('.choices button:not(:disabled)')?.focus({ preventScroll: true });
  } else if (action === 'town') { place = 'town'; feedback = undefined; render(); }
  else if (action === 'next') {
    if (!state.completed || state.level >= LEVEL_COUNT - 1) return;
    state = advance(state); checkpoint = structuredCopy(state); feedback = undefined; place = 'town'; persist(); render();
    host.querySelector<HTMLButtonElement>('#go-story')?.focus({ preventScroll: true });
  } else if (action === 'confirm-retry') {
    state = structuredCopy(checkpoint); feedback = undefined; place = getLevel(state).place; panel = undefined; persist(); render();
    host.querySelector<HTMLButtonElement>('.choices button:not(:disabled)')?.focus({ preventScroll: true });
  } else if (action === 'confirm-reset') { family = { ...state.family }; openPanel('setup', target.id); }
  else if (action === 'close') closePanel();
  else if (action === 'toggle-sound') { sound = !sound; if (sound) chime(true); render(); }
  else if (['wallet', 'journal', 'settings', 'help', 'retry', 'reset'].includes(action!)) {
    if (panel === action) closePanel(); else openPanel(action as Panel, target.id);
  }
});
host.addEventListener('change', event => {
  const target = event.target as HTMLSelectElement;
  if ((target.id === 'language' || target.id === 'setup-language') && (target.value === 'en' || target.value === 'zh')) { lang = target.value; if (panel !== 'setup') persist(); render(); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel && panel !== 'setup') { event.preventDefault(); closePanel(); return; }
  if (event.key === 'Escape' && !panel && place !== 'town') { place = 'town'; feedback = undefined; render(); return; }
  if (event.key !== 'Tab' || !panel || !['setup', 'retry', 'reset'].includes(panel)) return;
  const focusable = Array.from(host.querySelectorAll<HTMLElement>('.protected-panel button:not(:disabled), .protected-panel select'));
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !host.querySelector('.protected-panel')?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !host.querySelector('.protected-panel')?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
});
window.addEventListener('resize', sizeWorld);
document.addEventListener('visibilitychange', () => { if (document.hidden) void audio?.suspend().catch(() => {}); });
window.addEventListener('pagehide', () => { void audio?.close().catch(() => {}); audio = undefined; });
render();
if (panel === 'setup') host.querySelector<HTMLButtonElement>('#choose-boy')?.focus({ preventScroll: true });
