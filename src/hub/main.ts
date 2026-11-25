import './style.css';
import '../languages.css';
import { hubCopy, type HubLanguage } from './locale';
import { concourseScene } from './scene';
import { beijingHubCopy } from './beijing-copy';
import { economicHubCopy } from './economic-copy';
import { moonlineHubCopy } from '../moonline/hub-copy';
import { melodyCopy } from '../melody/locale';
import { universeCopy } from '../universe/locale';
import { createLanguageController, languageOptions } from '../rush/locale';

const host = document.querySelector<HTMLDivElement>('#hub')!;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* The collection is playable without storage. */ }
const language = createLanguageController(storage, navigator.languages, render);
function render(lang: HubLanguage) {
  const c = hubCopy(lang), beijing = beijingHubCopy[lang], melody = melodyCopy(lang), universe = universeCopy(lang);
  const economic = economicHubCopy(lang);
  const scaleCopy = {
    'zh-CN': ['尺度远征', '从一座普通的家出发，向外探访宇宙，向内观察物质。', '简体中文 / English', '开始远征'],
    en: ['Scale Expedition', 'From an ordinary house to the cosmic web and the world inside matter.', 'English / 简体中文', 'Start exploring'],
    ja: ['スケール探検', 'ふつうの家から、宇宙の果てと物質の内側へ。', '英語・簡体字中国語', '探検する'],
    'mn-Cyrl-MN': ['Хэмжээсийн аялал', 'Энгийн нэгэн байшингаас сансар огторгуй болон бодисын дотоод ертөнцөөр аялаарай.', 'Англи, хятад хэлээр', 'Аяллаа эхлэх'],
    'mn-Mong-CN': ['ᠬᠡᠮᠵᠢᠶᠡᠨ ᠦ ᠠᠶᠠᠯᠠᠯ', 'ᠭᠡᠷ ᠡᠴᠡ ᠣᠷᠴᠢᠯᠠᠩ ᠶᠢᠷᠲᠢᠨᠴᠦ ᠬᠦᠷᠲᠡᠯ᠎ᠡ᠃', 'English / 简体中文', 'ᠠᠶᠠᠯᠠᠬᠤ'],
  }[lang];
  const scale = `<section class="city-connection" aria-labelledby="scale-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><rect x="7" y="7" width="146" height="116" rx="15" fill="#17343d"/><circle cx="118" cy="38" r="14" fill="#e6bd80"/><path d="M9 97l36-33 25 16 36-20 45 40v22H9z" fill="#385f5b"/><path d="M42 72l32-28 32 28v26H42z" fill="#d99470"/><path d="M36 72l38-33 38 33" fill="none" stroke="#653e3e" stroke-width="6"/><path d="M51 75h12v12H51zm34 0h12v12H85z" fill="#ffe297"/><path d="M68 99V77h12v22" fill="#335255"/><path d="M25 36h14m-7-7v14m17-23h7m-3.5-3.5v7" stroke="#f7deb0" stroke-linecap="round"/></svg><div><h2 id="scale-invitation">${scaleCopy[0]}</h2><p>${scaleCopy[1]}</p><span>${scaleCopy[2]}</span></div><a id="play-scale" class="play" href="scale.html?lang=${lang === 'zh-CN' ? 'zh' : 'en'}">${scaleCopy[3]}<span aria-hidden="true">→</span></a></section>`;
  const [moonTitle, moonIntro, moonLanguages, moonAction] = moonlineHubCopy(lang);
  const moonline = `<section class="city-connection moonline-connection" aria-labelledby="moonline-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><rect x="4" y="4" width="152" height="122" rx="20" fill="#352546"/><circle cx="115" cy="39" r="19" fill="#f8bf84"/><path d="M9 100l37-47 31 36 24-28 53 45v17H9z" fill="#6c456b"/><path d="M51 122l26-36m32 36L86 86" stroke="#f8bf84" stroke-width="3"/><rect x="63" y="62" width="37" height="36" rx="8" fill="#b05e58"/><path d="M70 74h23" stroke="#d2efc5" stroke-width="9"/><circle cx="81" cy="90" r="3" fill="#fff0b2"/><path d="M30 56V36l15-4v17" fill="none" stroke="#d2efc5" stroke-width="3"/><ellipse cx="26" cy="56" rx="5" ry="3" fill="#d2efc5"/><ellipse cx="41" cy="49" rx="5" ry="3" fill="#d2efc5"/></svg><div><h2 id="moonline-invitation">${moonTitle}</h2><p>${moonIntro}</p><span>${moonLanguages}</span></div><a id="play-moonline" class="play" href="moonline.html?lang=${lang === 'zh-CN' ? 'zh' : 'en'}">${moonAction}<span aria-hidden="true">→</span></a></section>`;
  const focused = (document.activeElement as HTMLElement | null)?.id;
  document.documentElement.lang = lang;
  document.title = c.title;
  host.innerHTML = `
  <header class="hub-header"><a class="hub-brand" href="index.html"><svg viewBox="0 0 42 42" aria-hidden="true"><path d="M9 30V17a12 12 0 0 1 24 0v13M9 25h24M15 31l-5 7m17-7 5 7"/><rect x="15" y="12" width="12" height="8" rx="2"/></svg><span><b lang="en">Transit Tales</b><small>${c.subtitle}</small></span></a><div class="language"><label for="language">${c.language}</label><select id="language">${languageOptions()}</select></div></header>
  <main>
    <div class="invitation"><h1>${c.heading}</h1><p>${c.intro}</p></div>
    <section class="concourse" aria-label="${c.name}">
      <div class="station-scene" role="img" aria-label="${c.scene}">${concourseScene(lang)}<p class="scene-caption">${c.return}</p></div>
      <div class="departures">
        <article class="departure atrium"><div class="destination"><span class="direction" aria-hidden="true">↗</span><span>${c.atrium}</span></div><h2>${c.escalator}</h2><p>${c.escalatorBody}</p><small>${c.puzzle}</small><a id="play-escalator" class="play" href="escalator.html">${c.escalatorAction}<span aria-hidden="true">→</span></a></article>
        <article class="departure metro"><div class="destination"><span class="direction" aria-hidden="true">↘</span><span>${c.platform}</span></div><h2>${c.metro}</h2><p>${c.metroBody}</p><small>${c.dispatch}</small><a id="play-metro" class="play" href="rush-hour.html">${c.metroAction}<span aria-hidden="true">→</span></a></article>
      </div>
    </section>
    <section class="city-connection economic-connection" aria-labelledby="economic-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><path d="M7 120h146" stroke="#74936b" stroke-width="3"/><rect x="20" y="54" width="86" height="65" rx="6" fill="#f5d795"/><path d="M10 55L63 17l53 38" fill="#d78c70" stroke="#805d49" stroke-width="3" stroke-linejoin="round"/><rect x="52" y="79" width="23" height="40" rx="6" fill="#74936b"/><rect x="31" y="66" width="17" height="17" rx="3" fill="#aed5d2"/><rect x="81" y="66" width="17" height="17" rx="3" fill="#aed5d2"/><circle cx="125" cy="48" r="22" fill="#f6cd63" stroke="#b6934d" stroke-width="3"/><path d="M125 35v26m-8-21h13m-13 7h13" stroke="#9a7637" stroke-width="3" stroke-linecap="round"/><circle cx="121" cy="95" r="11" fill="#f6d2af"/><path d="M110 97q12 8 23 0m-22-7q8-17 21-2" fill="#775846"/><path d="M108 113q13-14 26 0v7h-26" fill="#679a88"/></svg><div><h2 id="economic-invitation">${economic.title}</h2><p>${economic.body}</p><span>${economic.note}</span></div><a id="play-economic" class="play" href="economic.html">${economic.action}<span aria-hidden="true">→</span></a></section>
    <section class="city-connection" aria-labelledby="beijing-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><path d="M8 109h144M19 106V69h122v37M38 67V50h84v17M53 48V32h54v16" fill="#dce7db" stroke="#52775c" stroke-width="3"/><path d="M13 68q67-17 134 0M32 50q48-15 96 0M45 31q35-16 70 0" fill="none" stroke="#ad4938" stroke-width="7" stroke-linecap="round"/><path d="M29 71v34m24-34v34m27-34v34m27-34v34m24-34v34" stroke="#ad4938" stroke-width="5"/><path d="M25 118h110" stroke="#286cb1" stroke-width="5"/><circle cx="40" cy="118" r="5" fill="#fcfaf3" stroke="#286cb1" stroke-width="3"/><circle cx="80" cy="118" r="5" fill="#fcfaf3" stroke="#286cb1" stroke-width="3"/><circle cx="120" cy="118" r="5" fill="#fcfaf3" stroke="#286cb1" stroke-width="3"/></svg><div><small>${beijing.label}</small><h2 id="beijing-invitation">${beijing.title}</h2><p>${beijing.body}</p><span>${beijing.note}</span></div><a id="play-beijing" class="play" href="beijing.html">${beijing.action}<span aria-hidden="true">→</span></a></section>
    <section class="city-connection music-connection" aria-labelledby="melody-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><path d="M8 24h144M8 38h144M8 52h144M8 66h144M8 80h144" stroke="#71877e" stroke-width="1.5"/><path d="M45 64V25m46 25V11m40 25V0" stroke="#284d47" stroke-width="3"/><ellipse cx="36" cy="66" rx="10" ry="7" fill="#284d47"/><ellipse cx="82" cy="52" rx="10" ry="7" fill="#284d47"/><ellipse cx="122" cy="38" rx="10" ry="7" fill="#284d47"/><path d="M8 121h144" stroke="#526961" stroke-width="3"/><rect x="27" y="88" width="106" height="29" rx="7" fill="#ad4938"/><path d="M39 96h24m9 0h24m9 0h17" stroke="#d7e9e4" stroke-width="9"/><circle cx="45" cy="119" r="5" fill="#284d47"/><circle cx="115" cy="119" r="5" fill="#284d47"/></svg><div><h2 id="melody-invitation">${melody.title}</h2><p>${melody.intro}</p><span>${melody.tuning} · ${melody.ear}</span></div><a id="play-melody" class="play" href="melody.html">${melody.play}<span aria-hidden="true">→</span></a></section>
    <section class="city-connection universe-connection" aria-labelledby="explorer-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><rect x="7" y="6" width="146" height="118" rx="16" fill="#101d32"/><path d="M8 102l38-28 34 23 29-13 43 19v16H8z" fill="#254361"/><path d="M30 68l39-40 38 27 23-30m-61 3 13 40 25-13" fill="none" stroke="#89a7c1" stroke-width="1.2"/><g fill="#f4d59d"><circle cx="30" cy="68" r="3"/><circle cx="69" cy="28" r="4"/><circle cx="82" cy="68" r="2.8"/><circle cx="107" cy="55" r="3.4"/><circle cx="130" cy="25" r="2.7"/></g></svg><div><h2 id="explorer-invitation">${lang === 'zh-CN' ? '星空图志' : 'Night Atlas'}</h2><p>${lang === 'zh-CN' ? '从地球仰望真实的星空，再飞进星座看一看。' : 'Look up at the real sky from Earth, then fly into a constellation.'}</p><span>English · 简体中文</span></div><a id="play-explorer" class="play" href="explorer.html?lang=${lang === 'zh-CN' ? 'zh' : 'en'}">${lang === 'zh-CN' ? '探索星空' : 'Explore the sky'}<span aria-hidden="true">→</span></a></section>
    ${scale}
    ${moonline}
    <section class="city-connection universe-connection" aria-labelledby="universe-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><circle cx="76" cy="61" r="43" fill="#101d32"/><circle cx="70" cy="62" r="23" fill="#87c8dd"/><path d="M52 49l16-5 8 9-6 10-13-1 3 13 13 9" fill="#83ad88"/><ellipse cx="76" cy="62" rx="66" ry="16" transform="rotate(-25 76 62)" fill="none" stroke="#b8916b" stroke-width="3"/><circle cx="113" cy="28" r="9" fill="#d8dccb"/><path d="M25 28h8m-4-4v8m97 61h8m-4-4v8" stroke="#315d50" stroke-width="2"/><path d="M38 116h89" stroke="#52775c" stroke-width="3"/></svg><div><h2 id="universe-invitation">${universe.title}</h2><p>${universe.intro}</p><span>${universe.crew}</span></div><a id="play-universe" class="play" href="universe.html">${universe.depart}<span aria-hidden="true">→</span></a></section>
    <section class="future"><div><h2>${c.explore}</h2><p>${c.future}</p><a href="transit-concepts/">${c.gallery} <span aria-hidden="true">↗</span></a></div><div class="studio"><a href="build-world.html">${c.studio} <span aria-hidden="true">↗</span></a><p>${c.studioNote}</p></div></section>
  </main><footer>${c.footer}</footer>`;
  const select = host.querySelector<HTMLSelectElement>('#language')!;
  select.value = lang;
  select.addEventListener('change', () => language.setLanguage(select.value as HubLanguage));
  if (focused) document.getElementById(focused)?.focus();
}
render(language.language);
