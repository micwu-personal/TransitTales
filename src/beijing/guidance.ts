import { escapeHtml as e, languages, stationLabel, t, type Language } from './locale';
import type { Graph, Journey } from './model';

const copy = {
  choose: ['Build your route', '逐段拼路线', '経路をつなごう', 'Замаа байгуулах', 'ᠵᠠᠮ ᠪᠦᠲᠦᠭᠡᠬᠦ'],
  board: ['Board & explore', '上车出发', '乗って出発', 'Сууж аялах', 'ᠰᠤᠭᠤᠵᠤ ᠠᠶᠠᠯᠠᠬᠤ'],
  arrive: ['Bring them there', '送达目的地', '目的地へ届けよう', 'Зорчигчоо хүргэх', 'ᠵᠣᠷᠴᠢᠭᠴᠢ ᠬᠦᠷᠭᠡᠬᠦ'],
  story: ['Passenger request & details', '乘客心愿与详情', '乗客のお願いと詳細', 'Зорчигчийн хүсэлт, дэлгэрэнгүй', 'ᠵᠣᠷᠴᠢᠭᠴᠢ ᠶᠢᠨ ᠬᠦᠰᠡᠯᠲᠡ'],
  compare: ['Try a different route', '看看其他路线', '別の経路を比べる', 'Өөр зам харьцуулах', 'ᠥᠭᠡᠷ᠎ᠡ ᠵᠠᠮ ᠬᠠᠷᠢᠴᠠᠭᠤᠯᠬᠤ'],
  workshop: ['Connect lines yourself', '自己连接线路', '自分で路線をつなぐ', 'Шугамуудыг өөрөө холбох', 'ᠱᠤᠭᠤᠮ ᠢᠶᠠᠨ ᠬᠣᠯᠪᠣᠬᠤ'],
  accessible: ['Step-free route needed', '需要无台阶路线', '段差のない経路が必要', 'Шатгүй зам хэрэгтэй', 'ᠱᠠᠲᠤ ᠦᠭᠡᠢ ᠵᠠᠮ'],
  crowds: ['Avoid the rush', '避开拥挤', '混雑を避けよう', 'Бөөгнөрлөөс зайлсхийх', 'ᠠᠴᠢᠶᠠᠯᠠᠯ ᠠᠴᠠ ᠵᠠᠢᠯᠠᠬᠤ'],
  delivered: ['A journey worth keeping', '值得收藏的一程', '思い出に残る旅', 'Дурсамжтай аялал', 'ᠳᠤᠷᠠᠰᠬᠠᠯ ᠲᠠᠢ ᠠᠶᠠᠯᠠᠯ'],
} as const;
const text = (language: Language, key: keyof typeof copy) => copy[key][languages.indexOf(language)];
export type GuidanceStage = 'choose' | 'board' | 'travel' | 'complete';
export function stepsMarkup(language: Language, stage: GuidanceStage): string {
  const current = stage === 'choose' ? 0 : stage === 'board' ? 1 : 2;
  return `<ol class="journey-steps">${(['choose', 'board', 'arrive'] as const).map((key, i) => `<li${i === current ? ' aria-current="step"' : ''} class="${stage === 'complete' || i < current ? 'done' : ''}"><span aria-hidden="true">${stage === 'complete' || i < current ? '✓' : i + 1}</span>${e(text(language, key))}</li>`).join('')}</ol>`;
}
const portrait = `<svg class="passenger-portrait" viewBox="0 0 64 64" aria-hidden="true"><path fill="#e4ead6" d="M0 0h64v64H0z"/><path fill="#547969" d="M10 64V49q1-16 22-16t22 16v15"/><path fill="#edc7a2" d="M25 30h14v13H25z"/><ellipse fill="#efcfac" cx="32" cy="23" rx="14" ry="17"/><path fill="#504c40" d="M17 23C13 2 45-5 48 21L37 12l-20 8z"/><path stroke="#625046" stroke-width="2" fill="none" stroke-linecap="round" d="M25 24h1m12 0h1m-12 8q5 4 10 0"/><path stroke="#c5d6bc" stroke-width="3" fill="none" d="m21 44 24 17"/><path fill="#cfac6c" d="M39 48h16v16H39z"/></svg>`;
export function decoratePlanner(host: HTMLElement, state: { language: Language; title: string; stage: GuidanceStage; hasDraft: boolean; stepFree: boolean; crowded: boolean }) {
  const { language, stage } = state;
  const endpoints = host.querySelector<HTMLElement>('.endpoints')!;
  const briefing = host.querySelector<HTMLElement>('.briefing')!;
  const mission = document.createElement('section'); mission.className = 'passenger-mission';
  mission.innerHTML = `<div class="passenger-heading">${portrait}<h3>${e(state.title)}</h3></div><div class="passenger-needs">${state.stepFree ? `<span>♿ ${e(text(language, 'accessible'))}</span>` : ''}${state.crowded ? `<span>${e(text(language, 'crowds'))}</span>` : ''}</div>`;
  mission.append(endpoints);
  const story = document.createElement('details'); story.className = 'passenger-story';
  story.innerHTML = `<summary>${e(text(language, 'story'))}</summary>`; story.append(briefing);
  const steps = document.createElement('div'); steps.innerHTML = stepsMarkup(language, stage);
  host.prepend(mission, steps);
  const route = host.querySelector<HTMLElement>('.route-plan')!;
  const manual = host.querySelector<HTMLElement>('.manual-route')!;
  route.before(manual);
  const tutorial = host.querySelector<HTMLDetailsElement>('.tutorial')!;
  tutorial.open = false;
  const round = host.querySelector<HTMLSelectElement>('#round')!.parentElement!;
  host.querySelector('.station-search')!.after(round, story, tutorial);
  const results = host.querySelector<HTMLElement>('#results')!;
  if (stage === 'complete') {
    results.classList.add('journey-postcard');
    results.insertAdjacentHTML('afterbegin', `<div class="postcard-mark" aria-hidden="true">✓</div><p class="postcard-message">${e(text(language, 'delivered'))}</p>`);
    host.prepend(results);
  }
}
export function milestoneMarkup(graph: Graph, journey: Journey | null, language: Language): string {
  if (!journey) return '';
  const stops = new Set([journey.request.origin, journey.request.destination, ...journey.request.via, ...journey.route.map(leg => leg.stops.at(-1)!)]);
  const itinerary = [...new Set([journey.request.origin, ...journey.route.flatMap(leg => leg.stops).filter(id => stops.has(id))])];
  const visited = new Set(journey.visited);
  const next = itinerary.find(id => !visited.has(id));
  return `<ol class="travel-milestones" aria-label="${e(t(language, 'route'))}">${itinerary.map(id => `<li class="${visited.has(id) ? 'visited' : ''}"${id === next ? ' aria-current="step"' : ''}><span aria-hidden="true">${visited.has(id) ? '✓' : '○'}</span>${e(stationLabel(graph.stations.get(id)!))}</li>`).join('')}</ol>`;
}
