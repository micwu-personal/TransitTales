import { describe, expect, it } from 'vitest';
import { milestoneMarkup, stepsMarkup } from '../src/beijing/guidance';
import { languages } from '../src/beijing/locale';
import { NETWORK } from '../src/beijing/network';
import { buildGraph, createRounds, findCandidates, startJourney } from '../src/beijing/model';

describe('guided passenger journeys', () => {
  for (const language of languages) it(`offers three localized steps in ${language}`, () => {
    for (const stage of ['choose', 'board', 'travel'] as const) {
      const markup = stepsMarkup(language, stage);
      expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
      expect(markup.match(/<li/g)).toHaveLength(3);
      expect(markup).not.toContain('undefined');
    }
    expect(stepsMarkup(language, 'complete').match(/class="done"/g)).toHaveLength(3);
  });
  it('tracks real origin, transfer and destination milestones, not invented stops', () => {
    const graph = buildGraph(NETWORK), round = createRounds(NETWORK)[0];
    const journey = startJourney(graph, round, findCandidates(graph, round.request)[0].legs)!;
    const markup = milestoneMarkup(graph, journey, 'en');
    expect(markup).toContain(NETWORK.stations.find(s => s.id === round.request.origin)!.name);
    expect(markup).toContain(NETWORK.stations.find(s => s.id === round.request.destination)!.name);
    expect(markup.match(/class="visited"/g)).toHaveLength(1);
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
    journey.visited.push(...journey.route.flatMap(leg => leg.stops));
    expect(milestoneMarkup(graph, journey, 'en')).not.toContain('aria-current');
    expect(milestoneMarkup(graph, null, 'en')).toBe('');
  });
});
