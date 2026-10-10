import { describe, expect, it } from 'vitest';
import { createGame, step } from '../src/rush/model';
import { createInteriorSnapshot, interiorAnnouncement, interiorScene, interiorText } from '../src/rush/interior';

describe('live station and carriage interiors', () => {
  it('detaches real platform passengers and supports line selection at transfers', () => {
    const game = createGame();
    const before = JSON.stringify(game);
    const view = createInteriorSnapshot(game, {kind:'station',id:'central'}, 'en', 'blue')!;
    expect(view.lines).toEqual(['coral','blue']); expect(view.line).toBe('blue');
    expect(view.count).toBe(game.queues.central.length);
    expect(Object.isFrozen(view)).toBe(true); expect(Object.isFrozen(view.passengerIds)).toBe(true);
    expect(JSON.stringify(game)).toBe(before);
    game.queues.central.length = 0;
    expect(view.passengerIds.length).toBeGreaterThan(0);
  });
  it('counts passengers beyond the illustrated crowd rather than overflowing', () => {
    const view = createInteriorSnapshot(createGame(), {kind:'station',id:'market'}, 'en')!;
    expect(view.count).toBe(32); expect(view.passengerIds).toHaveLength(24);
    expect(interiorScene(view, 'en')).toContain('viewBox="0 0 560 315"');
  });
  it('shows actual train movement, destination and occupancy in every language', () => {
    const game = createGame(); game.phase = 'playing'; for(let i=0;i<5;i++) step(game);
    const train = game.trains[0];
    for(const language of ['en','zh-CN','ja','mn-Cyrl-MN','mn-Mong-CN'] as const) {
      const view = createInteriorSnapshot(game,{kind:'train',id:train.id},language)!;
      expect(view.count).toBe(train.riders.length); expect(view.moving).toBe(train.moving);
      expect(view.next).toBe('market'); expect(view.terminal).toBe('garden');
      expect(interiorText(language).replay.length).toBeGreaterThan(0);
    }
  });
  it('distinguishes incoming service, departing trains, transfers and terminal arrival', () => {
    const game = createGame(); game.phase = 'playing'; game.time = 10;
    const train = game.trains[0]; train.index = 1; train.direction = 1; train.moving = true;
    const incoming = createInteriorSnapshot(game, {kind:'station',id:'central'}, 'en')!;
    expect(interiorAnnouncement(incoming)).toEqual({kind:'arriving',station:'garden',line:'coral'});
    expect(createInteriorSnapshot(game,{kind:'station',id:'market'},'en')!.serviceAvailable).toBe(false);
    expect(interiorAnnouncement(createInteriorSnapshot(game,{kind:'train',id:train.id},'en')!)).toEqual({kind:'next',station:'central',line:'coral',transferLine:'blue'});
    train.index = 3;
    expect(interiorAnnouncement(createInteriorSnapshot(game,{kind:'train',id:train.id},'en')!).kind).toBe('next');
    train.index = 4; train.direction = -1; train.moving = false;
    const terminal = createInteriorSnapshot(game,{kind:'train',id:train.id},'en')!;
    expect(interiorAnnouncement(terminal)).toEqual({kind:'terminus',station:'garden',line:'coral'});
    expect(interiorScene(terminal,'en')).toContain('>Garden</text>');
  });
  it('handles trains removed after their relief journey and unknown stations', () => {
    expect(createInteriorSnapshot(createGame(),{kind:'train',id:999},'en')).toBeNull();
    expect(createInteriorSnapshot(createGame(),{kind:'station',id:'missing'},'en')).toBeNull();
  });
});
