import { describe, expect, it } from 'vitest';
import { NETWORK, SCENARIOS, createGame, step, stats, nextHop, dispatch, canDispatch, sendCrew, holdConnection, lineFor, CAPACITY } from '../src/rush/model';

describe('Rush Hour Rescue', () => {
  it('routes trips across the interchange and rejects unreachable stations', () => {
    expect(nextHop(NETWORK, 'market', 'airport')).toBe('central');
    expect(nextHop(NETWORK, 'central', 'airport')).toBe('stadium');
    expect(nextHop(NETWORK, 'airport', 'garden')).toBe('riverside');
    expect(nextHop(NETWORK, 'harbor', 'harbor')).toBeNull();
    expect(nextHop(NETWORK, 'missing', 'harbor')).toBeNull();
  });
  it('does not advance before starting or after finishing', () => {
    const g = createGame(); step(g); expect(g.time).toBe(0);
    g.phase = 'finished'; step(g); expect(g.time).toBe(0);
  });
  it('dispatches relief trains, enforces occupancy and refills the depot', () => {
    const g = createGame(); expect(dispatch(g, 'market', 'coral')).toBe(false); g.phase = 'playing';
    expect(dispatch(g, 'harbor', 'coral')).toBe(false);
    expect(dispatch(g, 'market', 'blue')).toBe(false);
    expect(dispatch(g, 'market', 'coral')).toBe(true); expect(g.spares).toBe(1);
    expect(canDispatch(g, 'market', 'coral')).toBe(false);
    let moved = false;
        for (let i = 0; i < 28; i++) { step(g); moved ||= g.trains.some(t => t.spare && t.moving); }
        expect(g.spares).toBe(2); expect(moved).toBe(true);
  });
  it('limits helpers and connection holds to legal actions with cooldowns', () => {
    const g = createGame(); g.phase = 'playing';
    expect(sendCrew(g, 'market')).toBe(true); expect(sendCrew(g, 'market')).toBe(false);
    expect(holdConnection(g, g.trains[0].id)).toBe(false);
    expect(dispatch(g, 'central', 'coral')).toBe(true);
    const train = g.trains.at(-1)!; const oldDwell = train.dwell;
    expect(holdConnection(g, train.id)).toBe(true); expect(train.dwell).toBe(oldDwell+6);
    expect(holdConnection(g, train.id)).toBe(false);
  });
  it('boarding helpers increase useful boarding without exceeding capacity', () => {
    const run = (helpers: boolean) => {
      const g = createGame(); g.phase = 'playing';
      g.queues.market = Array.from({ length: 30 }, (_, id) => ({ id: 1000+id, destination: 'garden', born: 0, waited: 0, changed: false }));
      dispatch(g, 'market', 'coral'); if (helpers) sendCrew(g, 'market'); step(g);
      return g.trains.at(-1)!.riders.length;
    };
    expect(run(false)).toBe(6); expect(run(true)).toBe(12);
  });
  it('holds a Central train long enough to collect a later arrival', () => {
    const g = createGame(); g.phase = 'playing'; dispatch(g, 'central', 'coral');
    const t = g.trains.at(-1)!; t.direction = 1; g.queues.central = []; holdConnection(g, t.id);
    for (let i=0;i<4;i++) step(g);
    expect(t.moving).toBe(false);
    g.queues.central.push({ id:9999,destination:'garden',born:4,waited:0,changed:false }); g.spawned++;
    step(g); expect(t.riders.some(p=>p.id===9999)).toBe(true);
  });
  for (const scenario of SCENARIOS) {
    it(`completes ${scenario.name} deterministically with reachable goals and conserved passengers`, () => {
      const run = () => {
        const g = createGame(scenario); g.phase = 'playing';
        while (g.phase === 'playing') {
          const busiest = [...NETWORK.stations].sort((a,b) => g.queues[b.id].length-g.queues[a.id].length);
          for (const s of busiest) {
            const line = NETWORK.lines.find(l => canDispatch(g,s.id,l.id));
            if (line && g.queues[s.id].length > 8) { dispatch(g,s.id,line.id); sendCrew(g,s.id); break; }
          }
          step(g);
          const totals = stats(g);
          expect(totals.waiting+totals.aboard+g.delivered+g.left).toBe(g.spawned);
          for (const t of g.trains) {
            expect(t.riders.length).toBeLessThanOrEqual(CAPACITY);
            expect(t.index).toBeGreaterThanOrEqual(0); expect(t.index).toBeLessThan(lineFor(g,t.line).stops.length);
          }
          for (const line of NETWORK.lines) {
            const stopped = g.trains.filter(t => !t.moving && t.line === line.id).map(t=>t.index);
            expect(new Set(stopped).size).toBe(stopped.length);
          }
        }
        expect(g.time).toBe(scenario.duration); expect(g.delivered).toBeGreaterThanOrEqual(scenario.target); expect(g.eventIndex).toBe(scenario.events.length);
        const idle = createGame(scenario); idle.phase = 'playing';
        while (idle.phase === 'playing') step(idle);
        expect(g.delivered).toBeGreaterThan(idle.delivered);
        expect(stats(g).score).toBeGreaterThan(stats(idle).score);
        expect(stats(idle).stars).toBeLessThan(2);
        return { score:stats(g).score,delivered:g.delivered };
      };
      expect(run()).toEqual(run());
    });
  }
});
