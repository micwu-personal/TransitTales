import type { en } from './locale';

type Words = typeof en;
export function deck(t: Words) {
  const icon = (id: string, label: string, symbol: string) => `<button type="button" class="glass icon" id="${id}" aria-label="${label}" title="${label}">${symbol}</button>`;
  const trigger = (id: string, label: string, primary = false) => `<button type="button" class="${primary ? 'primary' : 'glass'}" id="open-${id}" aria-controls="${id}" aria-expanded="false">${label}</button>`;
  const button = (id: string, label: string, primary = false) => `<button type="button" class="${primary ? 'primary' : 'minor'}" id="${id}">${label}</button>`;
  const panel = (id: string, title: string, body: string) => `<section class="panel" id="${id}" aria-labelledby="${id}-heading" hidden><header><h2 id="${id}-heading">${title}</h2><button class="glass icon" type="button" data-close aria-label="${t.close}">×</button></header>${body}</section>`;
  return `
    <canvas id="sky" tabindex="0" aria-label="${t.scene}" aria-describedby="look-tip"></canvas>
    <div class="top-scrim" aria-hidden="true"></div><div class="bottom-scrim" aria-hidden="true"></div>
    <div class="reticle" aria-hidden="true"></div><div class="compass" id="compass" aria-hidden="true"></div>
    <header class="mast"><div class="brand"><a class="home" href="index.html">← ${t.home}</a><strong>${t.title}</strong></div><div class="tools">
      <button type="button" class="glass" id="language">${t.switch}</button>${icon('fullscreen', t.full, '⛶')}
    </div></header>
    <div class="notice" id="notice" hidden><span role="status" id="notice-message"></span> ${button('retry', t.retry)}</div>
    <section class="object-reading" id="object-reading" hidden><h2 id="object-name"></h2><p id="object-details"></p></section>
    <div class="log"><h1 id="place"></h1><p id="prompt"></p><p class="readout" id="readout"></p><progress class="travel-progress" id="travel-progress" max="1" value="0" aria-label="${t.journey}" hidden></progress></div>
    <div class="deck"><div class="actions">${trigger('travel', t.travel, true)}${trigger('shapes', t.shapes)}${trigger('settings', t.sky)}<button type="button" class="primary" id="leave-tour" hidden>${t.back}</button><button type="button" class="glass" id="tour-play" hidden>${t.auto}</button></div>
      <div class="helm"><div class="zoom" role="group" aria-label="${t.telescopeZoom}">${icon('zoom-in', t.nearer, '+')}${icon('zoom-out', t.wider, '−')}</div>
      <div class="steer" role="group" aria-label="${t.telescope}">${icon('up', t.up, '↑')}${icon('left', t.west, '←')}${icon('reset', t.center, '⊙')}${icon('right', t.east, '→')}${icon('down', t.down, '↓')}</div></div>
    </div>
    ${panel('travel', t.travel, `<label for="destination">${t.arrival}</label><select id="destination"></select><div class="row">${button('launch', t.depart, true)}${button('start', t.setStart)}</div>`)}
    ${panel('shapes', t.shapes, `<div class="row">${button('toggle-lines', t.lines)}</div><label for="shape">${t.pickShape}</label><select id="shape"></select><p id="depth"></p><div class="row">${button('find', t.find)}${button('tour', t.tour, true)}</div><p id="under" role="status" hidden>${t.under}</p><p>${t.diagrams}</p>`)}
    ${panel('settings', t.sky, `<fieldset id="observing"><legend>${t.time}</legend><label for="date">${t.date}</label><input id="date" type="date" min="1900-01-01" max="2100-12-31"><label for="hour">${t.hours} <output id="hour-value" for="hour"></output></label><input id="hour" type="range" min="0" max="1439" step="1"><div class="row">${button('now', t.now)}${button('noon', t.noon)}${button('midnight', t.midnight)}</div><div class="row" id="find-bodies">${button('find-sun', t.findSun)}${button('find-moon', t.findMoon)}</div><p id="body-below" role="status" hidden>${t.bodyBelow}</p></fieldset>
      <fieldset id="atmosphere"><legend>${t.atmosphere}</legend><label for="visibility">${t.limit} <output id="visibility-value" for="visibility"></output></label><input type="range" id="visibility" min="0" max="7" step=".25"><div class="row">${button('clear', t.clear)}${button('haze', t.haze)}${button('city', t.city)}</div></fieldset>
      <fieldset><legend>${t.labelsHeading}</legend><label for="star-names">${t.starNames} <output id="star-names-value" for="star-names"></output></label><input type="range" id="star-names" min="0" max="3" step="1" aria-describedby="star-names-hint"><p id="star-names-hint">${t.labelsHint}</p></fieldset>
      <fieldset><legend>${t.telescope}</legend><label for="camera-motion">${t.cameraMotion}</label><select id="camera-motion"><option value="system">${t.motionSystem}</option><option value="full">${t.motionFull}</option><option value="gentle">${t.motionGentle}</option></select><div class="row">${button('wider', t.wider)}${button('nearer', t.nearer)}${button('retreat', t.retreat)}${button('advance', t.advance)}${button('auto', t.auto)}</div></fieldset>
      <fieldset><legend>${t.tilt}</legend><div class="row">${button('motion', t.tilt)}${button('motion-mode', t.look)}${button('recenter', t.recenter)}</div><p role="status" id="motion-status" hidden></p></fieldset>`)}
    ${panel('credits', t.source, `<p>${t.limits}</p><p>${t.remote}</p><p>${t.diagrams}</p><p id="data-credits"></p>`)}
    <footer class="caption"><div><span id="disclaimer">${t.observed}</span><span class="tip" id="look-tip"> · ${t.hint}</span></div>${trigger('credits', t.source)}</footer>`;
}
