import './style.css';
import '../languages.css';
import { hubCopy, type HubLanguage } from './locale';
import { concourseScene } from './scene';
import { beijingHubCopy } from './beijing-copy';
import { createLanguageController, languageOptions } from '../rush/locale';

const host = document.querySelector<HTMLDivElement>('#hub')!;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* The collection is playable without storage. */ }
const language = createLanguageController(storage, navigator.languages, render);
function render(lang: HubLanguage) {
  const c = hubCopy(lang), beijing = beijingHubCopy[lang];
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
    <section class="city-connection" aria-labelledby="beijing-invitation"><svg viewBox="0 0 160 130" aria-hidden="true"><path d="M8 109h144M19 106V69h122v37M38 67V50h84v17M53 48V32h54v16" fill="#dce7db" stroke="#52775c" stroke-width="3"/><path d="M13 68q67-17 134 0M32 50q48-15 96 0M45 31q35-16 70 0" fill="none" stroke="#ad4938" stroke-width="7" stroke-linecap="round"/><path d="M29 71v34m24-34v34m27-34v34m27-34v34m24-34v34" stroke="#ad4938" stroke-width="5"/><path d="M25 118h110" stroke="#286cb1" stroke-width="5"/><circle cx="40" cy="118" r="5" fill="#fcfaf3" stroke="#286cb1" stroke-width="3"/><circle cx="80" cy="118" r="5" fill="#fcfaf3" stroke="#286cb1" stroke-width="3"/><circle cx="120" cy="118" r="5" fill="#fcfaf3" stroke="#286cb1" stroke-width="3"/></svg><div><small>${beijing.label}</small><h2 id="beijing-invitation">${beijing.title}</h2><p>${beijing.body}</p><span>${beijing.note}</span></div><a id="play-beijing" class="play" href="beijing.html">${beijing.action}<span aria-hidden="true">→</span></a></section>
    <section class="future"><div><h2>${c.explore}</h2><p>${c.future}</p><a href="transit-concepts/">${c.gallery} <span aria-hidden="true">↗</span></a></div><div class="studio"><a href="build-world.html">${c.studio} <span aria-hidden="true">↗</span></a><p>${c.studioNote}</p></div></section>
  </main><footer>${c.footer}</footer>`;
  const select = host.querySelector<HTMLSelectElement>('#language')!;
  select.value = lang;
  select.addEventListener('change', () => language.setLanguage(select.value as HubLanguage));
  if (focused) document.getElementById(focused)?.focus();
}
render(language.language);
