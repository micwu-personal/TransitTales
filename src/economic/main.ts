import { balanceNarration, choiceNarration, outcomeNarration, outcomeChanges, outcomeChangeText } from './narration-guidance';
import { loadAudioPreferences, saveAudioPreferences } from './audio-preferences';
import { gameplayCopy, gameplayText } from './gameplay-copy';
import { CHILDHOOD_STORIES, createChildhood, childhoodView, actChildhood, saveChildhood, loadChildhood, type ChildhoodState } from './childhood';
import { childhoodShelf, childhoodConversation, childhoodEnvelope } from './childhood-ui';
import { common, itemText, ledgerText, accountText } from './legacy-localization';
import './style.css';
import './gameplay.css';
import './childhood-ui.css';
import { act, advance, createGame, getActions, getGuidance, getLevel, getPrices, getProgress, getWeather, CAMPAIGN_LEVELS as LEVELS, CAMPAIGN_COUNT as LEVEL_COUNT, netWorth, type Family, type GameState, type Lang, type Place, type Text } from './model';
import { loadGame, saveGame, type Save } from './storage';
import { icon, portrait, sceneArt, townAnchors } from './art';
import { balance, lifeText, LIFE_STORIES } from './life';
import { Narrator, scriptIds, amountIds, numberIds } from './narration';
import { copy, escapeHtml as esc, money, text } from './copy';

const host = document.querySelector<HTMLDivElement>('#economic')!;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Play remains available without storage. */ }
const restored = loadGame(storage);
let lang: Lang = restored?.lang ?? 'zh';
let state: GameState = restored?.state ?? createGame({ gender: 'girl', children: 2 });
let checkpoint: GameState = restored?.checkpoint ?? structuredCopy(state);
let family: Family = { ...state.family };
let place: Place | 'town' = 'town';
type Panel = 'setup' | 'wallet' | 'journal' | 'childhood' | 'settings' | 'help' | 'retry' | 'reset' | undefined;
let childhood: ChildhoodState | undefined;
let childhoodFeedback: Text | undefined;
let childhoodOk = true;
let childhoodSaved = true;
function childhoodKey(id: string): string { return `transit-tales-economic-childhood-v1:${state.seed}:${state.family.gender}:${state.family.children}:${id}`; }
function activeChildhoodKey(): string { return `${childhoodKey('active')}`; }
function persistChildhood(): void {
  if (!childhood) return;
  childhoodSaved = Boolean(storage && saveChildhood(storage, childhoodKey(childhood.storyId), childhood));
  try { storage?.setItem(activeChildhoodKey(), childhood.storyId); } catch { childhoodSaved = false; }
}
function resumeChildhood(id: string): void {
  const story = CHILDHOOD_STORIES.find(story => story.id === id);
  if (!story || state.level < story.minLevel) return;
  const saved = storage ? loadChildhood(storage, childhoodKey(id)) : undefined;
  childhood = saved?.storyId === id && saved.family.gender === state.family.gender && saved.family.children === state.family.children && saved.seed === state.seed ? saved : createChildhood(story.id, state.family, state.seed);
}
if (restored) { try { const id = storage?.getItem(activeChildhoodKey()); if (id) resumeChildhood(id); } catch { /* The main campaign remains available. */ } }
let panel: Panel = restored ? undefined : 'setup';
let feedback: Text | undefined;
let feedbackOk = true;
let hintDepth = 0;
let changes:ReturnType<typeof outcomeChanges>=[];
let saved = Boolean(restored);
let saveAttempted = Boolean(restored);
const audioPreferences = loadAudioPreferences(storage);
let sound = audioPreferences.voice;
let effects = audioPreferences.effects;
let audioMissing = false;
let narrationActive = false;
function updateNarrationActivity(active:boolean):void {
  narrationActive=active;
  host.querySelector<HTMLButtonElement>('#replay')?.setAttribute('aria-pressed',String(active));
  const stop=host.querySelector<HTMLButtonElement>('#stop');
  if(stop)stop.disabled=!active;
}
const narrator = new Narrator(import.meta.env.BASE_URL, () => { audioMissing=true; host.querySelector<HTMLElement>('.narration-status')?.replaceChildren(document.createTextNode(text(lifeText('ui.audio-missing'),lang))); },()=>new Audio(),undefined,updateNarrationActivity);
narrator.mute(!sound);
function persistAudio(): void { saveAudioPreferences(storage, { voice: sound, effects }); }
const languages:Lang[]=['zh','en','ja','mn','mn-Mong'];
function languageOptions(): string {return [['zh','简体中文'],['en','English'],['ja','日本語'],['mn','Монгол'],['mn-Mong','ᠮᠣᠩᠭᠣᠯ']].map(([value,label])=>`<option value="${value}" ${lang===value?'selected':''}>${label}</option>`).join('');}
function pocket():number {return childhood?childhood.envelope.cash:state.life?balance(state.life,'house.cash'):state.cash;}
function debt():number {return state.life?-balance(state.life,'house.loan')-balance(state.life,'house.loanInterest')-balance(state.life,'house.mortgage')-balance(state.life,'house.mortgageInterest')-balance(state.life,'house.legacyDebt'):state.debt;}
function narrateCurrent():void {
  narrator.context(lang,panel==='setup'?family.gender:state.family.gender);
  void narrator.play(panel==='setup'?['ui.setup']:panel==='childhood'?scriptIds([gameplayText('childhood'),gameplayText('envelopeNote')]):panel==='help'?hintNarration():panel==='wallet'&&childhood?scriptIds([gameplayText('envelopeNote')]):panel?[`ui.panel-${panel}`,...(panel==='wallet'?balanceNarration(state,lang):[])]:scriptIds([childhood?childhoodView(childhood).nextStep:getGuidance(state).message]));
}
function narrateStep():void {
  narrator.context(lang,panel==='setup'?family.gender:state.family.gender);
  void narrator.play(panel==='setup'?['ui.setup']:panel==='help'?hintNarration():scriptIds([childhood?childhoodView(childhood).nextStep:getGuidance(state).message]));
}
function hintOffer() {
  if (childhood) return childhoodView(childhood).choices.find(offer => !offer.disabled);
  const guidance = getGuidance(state), offers = getActions(state, guidance.place);
  return offers.find(offer => offer.id === guidance.actionId && !offer.disabled) ?? offers.find(offer => !offer.disabled);
}
function hintNarration() {
  const offer = hintOffer();
  return [...scriptIds([childhood?childhoodView(childhood).nextStep:getGuidance(state).message]), ...(hintDepth && offer ? scriptIds([offer.label, offer.detail]) : [])];
}
let audio: AudioContext | undefined;
let focusReturn: string | undefined;
let outfitChoice: number | undefined;
const places: Place[] = ['home', 'shop', 'school', 'bank', 'park'];
const placeIcons = { home: 'home', shop: 'bag', school: 'school', bank: 'bank', park: 'park' };
function structuredCopy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function t(value: Text): string { return esc(text(value, lang)); }
function amount(value: number, foreign = false): string { return `${money(value, lang)} <small>${foreign ? text(lifeText('ui.shells'),lang) : copy(lang).yuan}</small>`; }
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
  return `<div class="foreign-wallet">${icon('shell')}<div><b>${t(common('travel-purse'))} · ${amount(state.flags.foreignCash??0,true)}</b><span>${t(common('fx'))}: 1 ${t(lifeText('ui.shells'))} = ${amount(state.flags.fxRate)}</span>${state.flags.foreignDebt?`<span>${t(common('foreign-debt'))} ${amount(state.flags.foreignDebt,true)}</span>`:''}</div></div>`;
}
function walletExtras(): string {
  const c=copy(lang),due=(day:number)=>`${t(common('due'))}: ${day} · ${t(common('day'))}: ${state.day}${state.day>day?' · '+t(common('over-due')):''}`;
  const minor=(label:Text,value:number,glyph:string,note:Text)=>`<div class="minor-wallet">${icon(glyph)}<div><b>${t(label)} · ${amount(value)}</b><span>${t(note)}</span></div></div>`;
  let result=state.digital?minor(common('digital'),state.digital,'card',common('wallet-result')):'';
  if(state.flags.pendingChange)result+=minor(common('change-money'),state.flags.pendingChange,'coin',common('change-result'));
  const contracts:string[]=[];
  if(state.bankTerm){const term=state.bankTerm;contracts.push(`<p>${icon('bank')}<span><b>${c.savings}</b>${t(common('principal'))}: ${amount(term.principal)} · ${t(common('rate'))}: ${term.rate}%<small>${term.settled?t(common('matured')):due(term.maturityDay)}</small></span></p>`);}
  if(state.loan)contracts.push(`<p>${icon('handshake')}<span><b>${c.debt}</b>${due(state.loan.dueDay)}<small>${t(common('principal'))}: ${amount(state.loan.principal)} · ${t(common('rate'))}: ${state.loan.rate}% · ${t(common('borrow-result'))}</small></span></p>`);
  if(state.flags.foreignDebt)contracts.push(`<p>${icon('card')}<span><b>${t(common('foreign-debt'))}</b>${due(state.flags.cardDueDay)}<small>${t(common('total'))}: ${amount(state.debt)} · ${t(common('fee'))}: ${amount(state.flags.cardLateFee??0)}</small></span></p>`);
  return result+(contracts.length?`<div class="contract-notes">${contracts.join('')}</div>`:'');
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
  return copy(lang).locations[location];
}
function render(): void {
  const focused = (document.activeElement as HTMLElement | null)?.id;
  const c = copy(lang), prices = getPrices(state);
  const sideView = childhood ? childhoodView(childhood) : undefined;
  const sideStory = childhood ? CHILDHOOD_STORIES.find(story => story.id === childhood!.storyId)! : undefined;
  const level = sideView ? { ...getLevel(state), title: sideView.title, goal: sideView.goal, age: sideStory!.age } : getLevel(state);
  const progress = sideView ? { ...sideView.progress, description: sideView.nextStep } : getProgress(state);
  const guidance = sideView ? { place: sideStory!.place, message: sideView.nextStep } : getGuidance(state);
  const completed = sideView?.completed ?? state.completed;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  document.documentElement.dataset.economicLang=lang;
  document.title = `${c.title} · Transit Tales`;
  const weather = childhood ? 'sunny' : getWeather(state);
  const goalRatio = Math.min(1, Math.max(0, progress.current / Math.max(1, progress.total)));
  const isFinal = !childhood && state.completed && state.level === LEVEL_COUNT - 1;
  host.innerHTML = `
    <main class="economy-game ${panel === 'setup' ? 'is-setup' : ''}" aria-label="${c.title}">
      <div class="scenery" aria-hidden="true"><div class="world-stage">${sceneArt({ place: sideStory ? sideStory.place : isFinal && !panel ? 'park' : place, gender: state.family.gender, children: state.family.children, age: level.age, day: childhood?.day ?? state.day, outfit: sideStory?Math.min(2,Math.floor(sideStory.minLevel/6)):outfit(), completed: isFinal, cash: pocket(), savings: childhood?0:state.life?balance(state.life,'house.savings'):state.savings, debt: childhood?0:debt(), stock: prices.reduce((sum, price) => sum + price.stock, 0), weather, travel: childhood?childhood.storyId==='travel':state.level >= 18&&state.level<24,lifeScene:!childhood&&state.life?LIFE_STORIES[state.level-24][0]:undefined,offspring:childhood?undefined:state.life?.childrenAges })}</div></div>
      <header class="game-header">
        <a class="home-link" href="index.html" aria-label="${c.homeLink}" title="${c.homeLink}">${icon('home')}</a>
        <div class="game-name"><h1>${c.title}</h1><span>${level.age} ${c.age} <i>·</i> ${c.day} ${childhood?.day ?? state.day} ${c.dayEnd}</span></div>
        <div class="header-right"><select id="language" aria-label="Language / 语言">${languageOptions()}</select>
        <button id="wallet" data-ui="wallet" class="pocket" aria-label="${childhood?esc(gameplayCopy(lang).envelope):c.wallet}: ${money(pocket(), lang)} ${c.yuan}" aria-expanded="${panel === 'wallet'}">${icon('coin')}<span><small>${c.cash}</small><b>${amount(pocket())}</b></span></button></div>
      </header>
      <section class="wish-note ${completed ? 'wish-done' : ''}" aria-label="${c.goal}">
        <div class="wish-pin" aria-hidden="true"></div><div class="wish-top"><h2>${t(level.title)}</h2><span>${sideView?icon('heart'):`${state.level + 1}/${LEVEL_COUNT}`}</span><button id="goal-help" data-ui="help" class="wish-help" aria-label="${c.help}" aria-expanded="${panel==='help'}">${icon('help')}</button></div>
        <p>${t(level.goal)}</p><div class="wish-progress"><div class="progress-track" role="progressbar" aria-label="${c.progress}" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${progress.current}" aria-valuetext="${esc(text(progress.description, lang))}"><span style="transform:scaleX(${goalRatio})"></span></div><small>${completed ? `${icon('check')}${c.done}` : t(progress.description)}</small></div>
        ${!childhood && place === 'town' && !state.completed ? `<button id="go-story" data-place="${guidance.place}" class="go-story">${icon('arrow')}${c.travel} · ${c.locations[guidance.place]}</button>` : ''}
        ${!childhood&&CHILDHOOD_STORIES.some(story=>state.level>=story.minLevel)?`<button id="childhood-open" data-ui="childhood" class="story-side">${icon('heart')}${esc(gameplayCopy(lang).childhood)}</button>`:''}
      </section>
      ${!childhood && place === 'town' && !panel && !isFinal ? `<nav class="town-markers" aria-label="${c.visit}">${places.map(location => `<button id="town-${location}" data-place="${location}" class="town-marker ${guidance.place === location ? 'story-marker' : ''}" style="--x:${townAnchors[location].x}%;--y:${townAnchors[location].y}%">${icon(placeIcons[location])}<span>${c.locations[location]}</span>${guidance.place === location ? '<i aria-hidden="true">···</i>' : ''}</button>`).join('')}</nav>` : ''}
      ${!panel && childhood ? childhoodConversation(childhood,lang,childhoodFeedback,childhoodOk) : place !== 'town' && !panel && !isFinal ? conversation(place) : ''}
      ${isFinal && !panel ? `<section class="picnic-ending" aria-labelledby="ending-title"><div class="ending-rosette">${icon('heart')}</div><h2 id="ending-title">${c.finale}</h2><p>${c.finaleBody}</p><span>${c.ending}</span><div class="ending-actions"><button id="ending-wallet" data-ui="wallet" class="primary">${icon('book')}${c.wallet}</button><button id="ending-reset" data-ui="reset" class="secondary">${c.reset}</button></div><small>${c.endingNote}</small></section>` : ''}
      <div class="game-footer" ${panel === 'setup' ? 'hidden' : ''}>
        <nav class="location-strip" aria-label="${c.visit}" ${isFinal||childhood ? 'hidden' : ''}>${places.map(location => `<button id="visit-${location}" data-place="${location}" ${place === location ? 'aria-current="location"' : ''} class="${guidance.place === location && !state.completed ? 'has-story' : ''}">${icon(placeIcons[location])}<span>${shortPlace(location)}</span></button>`).join('')}</nav>
        <nav class="game-tools" aria-label="${c.settings}">${childhood?`<button id="leave-childhood" data-ui="leave-childhood" class="childhood-exit">${icon('arrow')}<span>${esc(gameplayCopy(lang).backStory)}</span></button>`:place !== 'town' && !isFinal ? button('town', c.map, 'map') : ''}${button('journal', c.chapter, 'book')}${button('settings', c.settings, 'settings')}${button('replay',text(lifeText('ui.replay'),lang),'sound',`aria-pressed="${narrationActive}" ${!sound?'disabled':''}`)}${button('stop',text(lifeText('ui.stop'),lang),'close',!narrationActive?'disabled':'')}<button id="voice-toggle" data-ui="toggle-sound" class="voice-toggle" aria-pressed="${sound}" aria-label="${esc(gameplayCopy(lang).voice)}: ${sound?c.soundOn:c.soundOff}"><b>${esc(gameplayCopy(lang).voice)}</b><span>${sound?c.soundOn:c.soundOff}</span></button></nav>
      </div>
      <p class="narration-status" role="status">${audioMissing?t(lifeText('ui.audio-missing')):''}</p>
      <p class="save-status ${childhood?!childhoodSaved?'save-warning':'':saveAttempted && !saved ? 'save-warning' : ''}" role="status">${childhood?(childhoodSaved?c.saved:c.unsaved):saveAttempted ? (saved ? c.saved : c.unsaved) : c.saveNote}</p>
      ${!childhood && place === 'town' && !panel && !state.completed ? `<p class="town-hint">${c.locationHint}</p>` : ''}
      ${!childhood && state.completed && place === 'town' && !panel && !isFinal ? `<section class="town-complete">${keepsake()}<p>${c.continueHint}</p><button id="next-town" data-ui="next" class="primary">${c.next}${icon('arrow')}</button></section>` : ''}
      ${panel ? panelContent(panel) : ''}
      <div class="sr-only" role="status" aria-live="polite">${feedback ? t(feedback) : ''}</div>
    </main>`;
  sizeWorld();
  if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
}
function conversation(location: Place): string {
  const c = copy(lang), level = getLevel(state), offers = getActions(state, location), guidance = getGuidance(state);
  const npc = location === 'bank' ? 'banker' : location === 'home' ? 'parent' : 'friend';
  const greeting = location === guidance.place ? guidance.message : common('visit');
  const nextStep = !state.completed && (feedback || location !== guidance.place) ? `<aside class="next-step">${icon('arrow')}<div><b>${esc(gameplayCopy(lang).nextStep)}</b><p>${t(guidance.message)}</p></div>${location!==guidance.place?`<button id="next-step-go" data-place="${guidance.place}" class="secondary">${c.travel} · ${c.locations[guidance.place]}</button>`:''}</aside>` : '';
  return `<section class="conversation ${state.completed ? 'conversation-done' : ''}" aria-label="${c.speak}">
    <div class="speaker">${portrait(npc)}<div><h2>${location === level.place ? t(level.person) : c.locations[location]}</h2><p class="spoken ${feedback && !feedbackOk ? 'choice-error' : ''}">${feedback ? t(feedback) : t(greeting)}</p>${feedback&&changes.length?`<p class="choice-outcome">${t(common('changes'))} ${changes.map(row=>esc(outcomeChangeText(row,lang))).join('<br>')}</p>`:''}</div></div>
    ${nextStep}
    ${location === 'shop' && !state.completed ? priceTags() : ''}
    ${state.completed ? `<div class="completion-actions"><span>${keepsake()}${c.done}</span><button id="next" data-ui="next" class="primary">${c.next}${icon('arrow')}</button></div>` : `<div class="choices">${offers.map((offer, index) => `<div class="choice-pair"><button id="action-${esc(offer.id)}" data-action="${esc(offer.id)}" class="choice ${offer.id === guidance.actionId || !guidance.actionId && index === 0 ? 'suggested-choice' : ''}" ${offer.disabled ? `disabled aria-describedby="why-${esc(offer.id)}"` : ''}>${icon(offer.icon)}<span><b>${t(offer.label)}</b><small>${t(offer.detail)}</small>${offer.disabled?`<em id="why-${esc(offer.id)}">${t(offer.disabled)}</em>`:''}</span>${icon('arrow')}</button><button id="listen-${esc(offer.id)}" data-listen="${esc(offer.id)}" class="choice-listen" aria-label="${t(lifeText('ui.listen-choice'))}: ${t(offer.label)}">${icon('sound')}<span>${t(lifeText('ui.listen-choice'))}</span></button></div>`).join('')}${offers.length === 0 ? `<button id="find-story" data-place="${guidance.place}" class="choice">${icon('arrow')}<span><b>${c.travel} · ${c.locations[guidance.place]}</b><small>${t(guidance.message)}</small></span></button>` : ''}</div>`}
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
  } else if (which === 'childhood') {
    title = gameplayCopy(lang).childhood;
    content = childhoodShelf(state.level,lang);
  } else if (which === 'wallet' && childhood) {
    title = gameplayCopy(lang).envelope;
    content = childhoodEnvelope(childhood,lang,true);
  } else if (which === 'wallet') {
    title = c.wallet;
    const items = Object.entries(state.inventory).filter(([, count]) => count > 0);
    content = `<p class="wallet-note">${c.walletNote}</p><div class="money-pouches">${[['cash', 'wallet', pocket()], ['savings', 'bank', state.life?balance(state.life,'house.savings'):state.savings], ['debt', 'handshake', debt()]].map(([name, glyph, value]) => `<div class="money-pouch pouch-${name}">${icon(glyph as string)}<span>${c[name as 'cash' | 'savings' | 'debt']}</span><b>${amount(value as number)}</b></div>`).join('')}</div>${state.life?lifeWallet():foreignWallet()+walletExtras()}<div class="net-worth">${icon('heart')}<span>${c.worth}</span><b>${amount(netWorth(state))}</b></div><div class="trust-line"><span>${c.trust}</span><div aria-label="${c.trust}: ${state.trust}/3">${Array.from({ length: 3 }, (_, index) => `<span class="trust-heart ${index < state.trust ? 'filled' : ''}">${icon('heart')}</span>`).join('')}</div></div><p class="fine-note">${c.trustNote}</p><h3>${c.inventory}</h3><div class="bag-items">${items.length ? items.map(([id, count]) => `<span>${icon(itemIcon(id))}<b>${t(itemText(id))} × ${count}</b></span>`).join('') : `<p>${c.emptyBag}</p>`}</div><details class="ledger"><summary>${c.history}</summary>${state.ledger.length ? `<ol>${state.ledger.slice(-10).reverse().map(entry => `<li><span>${c.day} ${entry.day} ${c.dayEnd}</span><b>${t(ledgerText(entry.label))}</b><div>${(['cash', 'savings', 'debt'] as const).filter(key => entry[key] !== 0).map(key => `<small>${c[key]} ${entry[key] > 0 ? '+' : ''}${money(entry[key], lang)}</small>`).join('')}</div></li>`).join('')}</ol>` : `<p>${c.noHistory}</p>`}</details><details class="wardrobe"><summary>${c.wardrobe}</summary><p>${c.wardrobeNote}</p><div>${c.outfit.map((label, index) => `<button id="outfit-${index}" data-outfit="${index}" ${index > Math.min(2, Math.floor((state.level + (state.completed ? 1 : 0)) / 6)) ? 'disabled' : ''} aria-pressed="${outfit() === index}">${portrait(state.family.gender, index)}<span>${label}</span></button>`).join('')}</div></details>`;
    if(state.life) content+=lifeLedger();
  } else if (which === 'journal') {
    title = c.chapter;
    content = `<button id="journal-map" data-ui="${childhood?'leave-childhood':'town'}" class="secondary">${icon('map')}${c.map}</button>${childhoodShelf(state.level,lang)}<div class="storybook">${[...c.chapterNames,...Array.from({length:7},(_,i)=>text(LEVELS[24+i*6].title,lang))].map((name, chapter) => `<section><h3>${icon(chapter === 0 ? 'coin' : chapter === 1 ? 'bag' : chapter === 2 ? 'bank' : 'plane')}${name}</h3><p>${c.chapterDescriptions[chapter]??''}</p><ol>${LEVELS.slice(chapter * 6, chapter * 6 + 6).map((level, offset) => { const index = chapter * 6 + offset; return `<li class="${index < state.level || index === state.level && state.completed ? 'chapter-done' : index === state.level ? 'chapter-current' : 'chapter-future'}"><span>${index + 1}</span><div><b>${t(level.title)}</b><small>${index < state.level || index === state.level && state.completed ? c.done : index === state.level ? t(level.goal) : c.locked}</small></div>${icon(index < state.level || index === state.level && state.completed ? 'check' : index === state.level ? 'arrow' : 'book')}</li>`; }).join('')}</ol></section>`).join('')}</div><button id="journal-retry" data-ui="retry" class="secondary">${icon('reset')}${c.retry}</button><p class="fine-note">${c.endingNote}</p>`;
  } else if (which === 'help') {
    title = c.help;
    const guidance = childhood ? { place: CHILDHOOD_STORIES.find(story=>story.id===childhood!.storyId)!.place, message: childhoodView(childhood).nextStep } : getGuidance(state), offer = hintOffer();
    content = `<div class="help-illustration">${portrait(state.family.gender)}${icon('arrow')}${icon(placeIcons[guidance.place])}</div><div class="help-hint"><p>${t(guidance.message)}</p>${hintDepth&&offer?`<div class="choice">${icon(offer.icon)}<span><b>${t(offer.label)}</b><small>${t(offer.detail)}</small></span></div>`:''}</div><div class="hint-actions">${!hintDepth&&offer?`<button id="more-hint" data-ui="more-hint" class="secondary">${icon('help')}${esc(gameplayCopy(lang).moreHint)}</button>`:''}<button id="listen-hint" data-ui="listen-hint" class="secondary">${icon('sound')}${esc(gameplayCopy(lang).listenHint)}</button></div><button id="help-go" ${childhood?'data-ui="close"':`data-place="${guidance.place}"`} class="primary">${childhood?c.close:`${c.travel} · ${c.locations[guidance.place]}`}${icon('arrow')}</button><button id="help-retry" data-ui="retry" class="secondary">${icon('reset')}${c.retry}</button>`;
  } else if (which === 'settings') {
    title = c.settings;
    content = `<div class="sound-setting"><span>${icon(sound?'sound':'sound-off')}${esc(gameplayCopy(lang).voice)}</span><button id="toggle-sound" data-ui="toggle-sound" aria-pressed="${sound}">${sound ? c.soundOn : c.soundOff}</button></div><div class="sound-setting"><span>${icon('star')}${esc(gameplayCopy(lang).effects)}</span><button id="toggle-effects" data-ui="toggle-effects" aria-pressed="${effects}">${effects ? c.soundOn : c.soundOff}</button></div><p>${c.soundNote}</p><p class="fine-note">${c.saveNote}</p><button id="settings-retry" data-ui="retry" class="secondary">${icon('reset')}${c.retry}</button><button id="settings-reset" data-ui="reset" class="text-action">${c.reset}</button>`;
  } else {
    const reset = which === 'reset';
    title = reset ? c.resetTitle : c.retryTitle;
    content = `<p>${reset ? c.resetBody : c.retryBody}</p><button id="confirm-${which}" data-ui="confirm-${which}" class="primary">${reset ? c.confirmReset : c.confirmRetry}${icon('arrow')}</button><button id="cancel" data-ui="close" class="secondary">${c.cancel}</button>`;
  }
  return `${critical ? '<div class="panel-backdrop"></div>' : ''}<section class="paper-panel panel-${which} ${critical ? 'protected-panel' : ''}" role="dialog" aria-modal="${critical}" aria-labelledby="panel-title"><header><h2 id="panel-title">${title}</h2>${which === 'setup' ? `<select id="setup-language" aria-label="Language / 语言">${languageOptions()}</select>` : ''}${which !== 'setup' ? `<button id="close" data-ui="close" class="close-panel" aria-label="${c.close}">${icon('close')}</button>` : ''}</header><div class="panel-content">${content}</div></section>`;
}
function sizeWorld(): void {
  const game = host.querySelector<HTMLElement>('.economy-game');
  if (!game) return;
  const width = game.clientWidth, height = game.clientHeight;
  const worldWidth = Math.max(width, height * 1.6), worldHeight = worldWidth / 1.6;
  game.style.setProperty('--world-width', `${worldWidth}px`);
  game.style.setProperty('--world-height', `${worldHeight}px`);
  game.style.setProperty('--footer-height', `${host.querySelector<HTMLElement>('.game-footer')?.offsetHeight ?? 0}px`);
  game.style.setProperty('--header-height', `${host.querySelector<HTMLElement>('.game-header')?.offsetHeight ?? 80}px`);
  const wish = host.querySelector<HTMLElement>('.wish-note');
  game.style.setProperty('--wish-bottom', `${wish ? wish.getBoundingClientRect().bottom - game.getBoundingClientRect().top : 220}px`);
}
function keepsake(): string { return `<span class="completion-keepsake" aria-hidden="true">${icon('heart')}</span>`; }
function animateChoice(ok: boolean, completed: boolean, glyph = 'coin'): void {
  const game = host.querySelector<HTMLElement>('.economy-game');
  if (!game) return;
  game.classList.add(ok ? 'choice-made' : 'choice-reconsider');
  if (completed) game.classList.add('round-celebration');
  if (ok && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const moment = document.createElement('div'); moment.className = 'action-moment'; moment.setAttribute('aria-hidden', 'true'); moment.innerHTML = icon(glyph); game.append(moment);
    window.setTimeout(() => moment.remove(), 1400);
  }
  window.setTimeout(() => game.classList.remove('choice-made', 'choice-reconsider', 'round-celebration'), 1600);
}
function openPanel(next: Panel, source?: string): void {
  narrator.stop();
  focusReturn = source;
  panel = next;
  hintDepth = 0;
  render();
  narrateCurrent();
  const target = next === 'setup' ? '#choose-boy' : '#close';
  host.querySelector<HTMLButtonElement>(target)?.focus({ preventScroll: true });
}
function closePanel(): void {
  narrator.stop();
  panel = undefined;
  render();
  if (focusReturn) document.getElementById(focusReturn)?.focus({ preventScroll: true });
}
function leaveChildhood(): void {
  narrator.stop(); persistChildhood();
  try { storage?.removeItem(activeChildhoodKey()); } catch { /* The current game remains playable. */ }
  childhood = undefined; childhoodFeedback = undefined; panel = undefined; place = 'town'; render();
  host.querySelector<HTMLButtonElement>('#childhood-open, #go-story')?.focus({preventScroll:true});
}
function chime(ok: boolean): void {
  if (!effects) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => { effects = false; });
    [ok ? 523.25 : 293.66, ok ? 783.99 : 261.63].forEach((frequency, index) => {
      const oscillator = audio!.createOscillator(), gain = audio!.createGain();
      const start = audio!.currentTime + index * 0.095;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      oscillator.connect(gain); gain.connect(audio!.destination); oscillator.start(start); oscillator.stop(start + 0.25);
    });
  } catch { effects = false; }
}
host.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!target || target.disabled) return;
  if (target.dataset.childhood) {
    const story = CHILDHOOD_STORIES.find(story => story.id === target.dataset.childhood);
    if (!story || state.level < story.minLevel) return;
    narrator.stop(); resumeChildhood(story.id); childhoodFeedback = undefined; panel = undefined; persistChildhood(); render();
    narrator.context(lang,state.family.gender); void narrator.play(scriptIds([gameplayText('envelopeNote'),childhoodView(childhood!).message]));
    host.querySelector<HTMLButtonElement>('[data-childhood-action]:not(:disabled)')?.focus({preventScroll:true}); return;
  }
  if (childhood && target.dataset.childhoodAction) {
    narrator.stop(); const before = childhood, view = childhoodView(before);
    const result = actChildhood(before,target.dataset.childhoodAction); childhood = result.state; childhoodFeedback = result.message; childhoodOk = result.ok;
    if (result.ok) persistChildhood(); chime(result.ok); render();
    narrator.context(lang,state.family.gender); void narrator.play(scriptIds([result.message,...(!childhood.completed?[childhoodView(childhood).nextStep]:[])]));
    animateChoice(result.ok,!before.completed&&childhood.completed,view.choices.find(offer=>offer.id===target.dataset.childhoodAction)?.icon);
    if (childhood.completed) host.querySelector<HTMLButtonElement>('#leave-childhood-result')?.focus({preventScroll:true}); return;
  }
  if (childhood && target.dataset.childhoodListen) {
    const offer = childhoodView(childhood).choices.find(offer=>offer.id===target.dataset.childhoodListen);
    if (offer) { narrator.context(lang,state.family.gender); void narrator.play(choiceNarration(state,offer,lang)); } return;
  }
  if (childhood && target.dataset.childhoodQuote !== undefined) {
    const quote = childhoodView(childhood).quotes[Number(target.dataset.childhoodQuote)];
    if (quote) { narrator.context(lang,state.family.gender); void narrator.play([[...scriptIds([quote.label]),...(quote.unit==='home'||quote.unit==='foreign'||quote.unit==='rate'?amountIds(quote.value,lang,quote.unit==='foreign'?'foreign':'home'):numberIds(quote.value,lang))]]); } return;
  }
  const location = target.dataset.place as Place | undefined;
  if (!childhood && location && places.includes(location)) {
    place = location; panel = undefined; feedback = undefined; render(); narrateCurrent();
    host.querySelector<HTMLButtonElement>('.choices button:not(:disabled), #next')?.focus({ preventScroll: true });
    return;
  }
  if (target.dataset.gender) { family.gender = target.dataset.gender as Family['gender']; render(); narrateCurrent(); return; }
  if (target.dataset.children) { family.children = Number(target.dataset.children) as Family['children']; render(); narrator.context(lang,family.gender);void narrator.play([family.children===1?'ui.family-one':family.children===2?'ui.family-two':'ui.family-three']);return; }
  if (target.dataset.outfit) { outfitChoice = Number(target.dataset.outfit); render(); return; }
  if (target.dataset.action && !childhood) {
    narrator.stop();
    const before=state;
    const result = act(state, target.dataset.action);
    state = result.state; changes=outcomeChanges(before,state); feedback = result.message; feedbackOk = result.ok;
    if (result.ok) persist();
    chime(result.ok); render();
    narrator.context(lang,state.family.gender);void narrator.play([...outcomeNarration(before,state,result.message,lang),...(!state.completed?scriptIds([getGuidance(state).message]):[])]);
    animateChoice(result.ok, !before.completed && state.completed, getActions(before, place === 'town' ? getLevel(before).place : place).find(offer => offer.id === target.dataset.action)?.icon);
    if (state.completed) host.querySelector<HTMLButtonElement>('#next, #ending-wallet')?.focus({ preventScroll: true });
    return;
  }
  if(target.dataset.listen){const offer=getActions(state,place==='town'?getLevel(state).place:place).find(o=>o.id===target.dataset.listen);if(offer){narrator.context(lang,state.family.gender);void narrator.play(choiceNarration(state,offer,lang));}return;}
  const action = target.dataset.ui as Panel | 'start' | 'town' | 'leave-childhood' | 'next' | 'close' | 'confirm-retry' | 'confirm-reset' | 'toggle-sound' | 'toggle-effects' | 'more-hint' | 'listen-hint' | 'replay' | 'stop';
  if (action === 'leave-childhood') { leaveChildhood(); return; }
  if (action === 'start') {
    if (childhood) { persistChildhood(); try { storage?.removeItem(activeChildhoodKey()); } catch { /* New play does not require storage. */ } }
    childhood = undefined; childhoodFeedback = undefined;
    state = createGame(family); checkpoint = structuredCopy(state); place = getLevel(state).place;
    panel = undefined; feedback = undefined; outfitChoice = undefined; persist(); render(); narrateCurrent();
    host.querySelector<HTMLButtonElement>('.choices button:not(:disabled)')?.focus({ preventScroll: true });
  } else if (action === 'town') { narrator.stop(); place = 'town'; panel = undefined; feedback = undefined; render(); }
  else if (action === 'next') {
    if (childhood || !state.completed || state.level >= LEVEL_COUNT - 1) return;
    state = advance(state); checkpoint = structuredCopy(state); feedback = undefined; place = 'town'; persist(); render(); narrateCurrent();
    host.querySelector<HTMLButtonElement>('#go-story')?.focus({ preventScroll: true });
  } else if (action === 'confirm-retry') {
    if (childhood) {
      childhood = createChildhood(childhood.storyId,childhood.family,childhood.seed); childhoodFeedback = undefined; childhoodOk = true; panel = undefined;
      persistChildhood(); render(); narrateCurrent(); host.querySelector<HTMLButtonElement>('[data-childhood-action]:not(:disabled)')?.focus({preventScroll:true}); return;
    }
    state = structuredCopy(checkpoint); feedback = undefined; place = getLevel(state).place; panel = undefined; persist(); render(); narrateCurrent();
    host.querySelector<HTMLButtonElement>('.choices button:not(:disabled)')?.focus({ preventScroll: true });
  } else if (action === 'confirm-reset') { family = { ...state.family }; openPanel('setup', target.id); }
  else if (action === 'close') closePanel();
  else if (action === 'more-hint') { hintDepth = 1; render(); narrateCurrent(); }
  else if (action === 'listen-hint') { narrator.context(lang,state.family.gender);void narrator.play(hintNarration()); }
  else if (action === 'replay') {narrateStep();}
  else if (action === 'stop') {narrator.stop();}
  else if (action === 'toggle-sound') { sound = !sound; narrator.mute(!sound); persistAudio(); render(); if (sound) narrateCurrent(); }
  else if (action === 'toggle-effects') { effects = !effects; persistAudio(); render(); if (!effects) void audio?.suspend().catch(() => {}); }
  else if (['wallet', 'journal', 'childhood', 'settings', 'help', 'retry', 'reset'].includes(action!)) {
    if (panel === action) closePanel(); else openPanel(action as Panel, target.id);
  }
});
host.addEventListener('change', event => {
  const target = event.target as HTMLSelectElement;
  if ((target.id === 'language' || target.id === 'setup-language') && languages.includes(target.value as Lang)) { lang = target.value as Lang; if (panel !== 'setup') persist(); render(); narrateCurrent(); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel && panel !== 'setup') { event.preventDefault(); closePanel(); return; }
  if (event.key === 'Escape' && !panel && childhood) { event.preventDefault(); leaveChildhood(); return; }
  if (event.key === 'Escape' && !panel && place !== 'town') { narrator.stop(); place = 'town'; feedback = undefined; render(); return; }
  if (event.key !== 'Tab' || !panel || !['setup', 'retry', 'reset'].includes(panel)) return;
  const focusable = Array.from(host.querySelectorAll<HTMLElement>('.protected-panel button:not(:disabled), .protected-panel select'));
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !host.querySelector('.protected-panel')?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !host.querySelector('.protected-panel')?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
});
window.addEventListener('resize', sizeWorld);
document.addEventListener('visibilitychange', () => { if (document.hidden) {narrator.stop();void audio?.suspend().catch(() => {});} });
window.addEventListener('pagehide', () => { narrator.dispose();void audio?.close().catch(() => {}); audio = undefined; });
render();
if (panel === 'setup') host.querySelector<HTMLButtonElement>('#choose-boy')?.focus({ preventScroll: true });

void narrator.load().then(ready=>{audioMissing=!ready;host.querySelector<HTMLElement>('.narration-status')?.replaceChildren(document.createTextNode(ready?'':text(lifeText('ui.audio-missing'),lang)));});

function lifeWallet():string {
  const l=state.life!;
  return `<div class="minor-wallet">${icon('bread')}<div><b>${t(lifeText('ui.company-cash'))} · ${amount(balance(l,'company.cash'))}</b><span>${t(common('ownership'))}: ${l.ownership}%</span><span>${t(common('company-debt'))}: ${amount(-balance(l,'company.loan'))}</span><span>${t(common('interest'))}: ${amount(-balance(l,'company.loanInterest'))}</span><span>${t(common('supplier-debt'))}: ${amount(-balance(l,'company.supplierDebt'))}</span><span>${t(common('foreign-cash'))}: ${amount(l.foreign,true)}</span><span>${t(common('receivable'))}: ${amount(l.foreignReceivable,true)}</span><span>${t(common('delivered'))}: ${l.goods.delivered??0} · ${t(common('damaged'))}: ${l.goods.lostInTransit??0}</span></div></div><div class="family-album"><h3>${t(common('family-ages'))}</h3><p>${portrait(state.family.gender)} ${l.age} · ${portrait('parent')} ${l.parentsAge}</p><p>${t(common('children'))}: ${l.childrenAges.length?l.childrenAges.join(' · '):'—'}</p><div>${l.photos.slice(-6).map(photo=>`<span>${icon('heart')}${photo.age}</span>`).join('')}</div></div>`;
}
function lifeLedger():string {
  return `<details class="ledger life-ledger"><summary>${copy(lang).history}</summary><ol>${state.life!.journal.slice(-12).reverse().map(entry=>`<li><span>${entry.turn}</span><b>${t(common('entry'))}</b><div>${entry.postings.map(p=>`<small>${accountText(p.account,lang)} ${p.amount>=0?'+':''}${money(p.amount,lang)}</small>`).join('')}</div></li>`).join('')}</ol></details>`;
}

let keyboardChoiceFocus=false;
host.addEventListener('pointerdown',()=>{keyboardChoiceFocus=false;});
host.addEventListener('keydown',event=>{keyboardChoiceFocus=event.key==='Tab';});
host.addEventListener('focusin',event=>{if(!keyboardChoiceFocus)return;keyboardChoiceFocus=false;const target=event.target as HTMLElement;const id=target.dataset.childhoodListen??target.dataset.childhoodAction??target.dataset.listen??target.dataset.action;if(id){const offer=childhood?childhoodView(childhood).choices.find(a=>a.id===id):getActions(state,place==='town'?getLevel(state).place:place).find(a=>a.id===id);if(offer){narrator.context(lang,state.family.gender);void narrator.play(choiceNarration(state,offer,lang));}}});
