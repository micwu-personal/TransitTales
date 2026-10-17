import { copy, landingName, type Language } from './locale';
import { experienceCopy } from './experience-copy';
import type { RouteIssue } from './access';
import type { MallSnapshot } from './view';
import { passengerNeeds, skyCopy } from './sky-copy';

export function issueText(language:Language,issues:readonly RouteIssue[]):string {
  const x=experienceCopy[language];
  return issues.map(issue=>issue==='steps'?x.blockedWheelchair:issue==='headroom'?x.blockedBalloon:issue==='needs'?skyCopy[language].rules:x.missingRoute).join(' ');
}
export function shopperLabel(language:Language,rider:MallSnapshot['riders'][number]):string {
  const t=copy[language];
  return `${t[rider.destination]} · ${landingName(rider.start)} → ${landingName(rider.goal)} · ${rider.need?passengerNeeds[language][rider.need].label:rider.wheelchair?t.wheelchair:rider.balloon?t.balloon:t.walking}${rider.wheelchair&&rider.balloon?` + ${t.balloon}`:''}`;
}
export function problemMarkup(view:MallSnapshot):string {
  if(view.building)return '';
  const x=experienceCopy[view.language],t=copy[view.language];
  const blocked=view.routes.filter(r=>!r.ready);
  if(!blocked.length)return '';
  return `<h2><span aria-hidden="true">☹ !</span> ${x.needsHelp}</h2><ul>${blocked.map(route=>{
    const request=view.puzzle.requests.find(r=>r.id===route.id)!;
    return `<li data-request-issue="${route.id}"><strong>${t[request.destination]} · ${landingName(request.start)} → ${landingName(request.goal)}</strong><span>${request.need?passengerNeeds[view.language][request.need].label:request.wheelchair?t.wheelchair:request.balloon?t.balloon:t.walking}${request.wheelchair&&request.balloon?` + ${t.balloon}`:''}</span><p>${issueText(view.language,route.issues)}</p></li>`;
  }).join('')}</ul><p>${x.retryHelp}</p>`;
}
