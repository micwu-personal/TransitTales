import './style.css';
import '../languages.css';
import { hubCopy, type HubLanguage } from './locale';
import { concourseScene } from './scene';
import { beijingHubCopy } from './beijing-copy';
import { economicHubCopy } from './economic-copy';
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
    <section class="city-connection universe-connection" aria-labelledby="universe-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><circle cx="76" cy="61" r="43" fill="#101d32"/><circle cx="70" cy="62" r="23" fill="#87c8dd"/><path d="M52 49l16-5 8 9-6 10-13-1 3 13 13 9" fill="#83ad88"/><ellipse cx="76" cy="62" rx="66" ry="16" transform="rotate(-25 76 62)" fill="none" stroke="#b8916b" stroke-width="3"/><circle cx="113" cy="28" r="9" fill="#d8dccb"/><path d="M25 28h8m-4-4v8m97 61h8m-4-4v8" stroke="#315d50" stroke-width="2"/><path d="M38 116h89" stroke="#52775c" stroke-width="3"/></svg><div><h2 id="universe-invitation">${universe.title}</h2><p>${universe.intro}</p><span>${universe.crew}</span></div><a id="play-universe" class="play" href="universe.html">${universe.depart}<span aria-hidden="true">→</span></a></section>
    <section class="future"><div><h2>${c.explore}</h2><p>${c.future}</p><a href="transit-concepts/">${c.gallery} <span aria-hidden="true">↗</span></a></div><div class="studio"><a href="build-world.html">${c.studio} <span aria-hidden="true">↗</span></a><p>${c.studioNote}</p></div></section>
  </main><footer>${c.footer}</footer>`;
  const select = host.querySelector<HTMLSelectElement>('#language')!;
  select.value = lang;
  select.addEventListener('change', () => language.setLanguage(select.value as HubLanguage));
  if (focused) document.getElementById(focused)?.focus();
}
render(language.language);
