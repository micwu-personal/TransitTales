import type { Wave } from './model';

export const CELEBRATION_MS = 9000;

/** Completion belongs to the round, never to a render or language change. */
export function createRoundFeedback(onSuccess: () => void) {
  let settled = false;
  let started: number | null = null;
  return {
    begin() { settled = false; started = null; },
    complete(wave: Wave, now: number): boolean {
      if (settled || !wave.complete) return false;
      settled = true;
      if (!wave.riders.length || !wave.riders.every(r => r.path !== null && wave.elapsed >= r.arrival)) return false;
      started = now;
      try { onSuccess(); } catch { /* Optional feedback cannot interrupt a completed round. */ }
      return true;
    },
    celebrating(now: number): boolean { return started !== null && now >= started && now - started < CELEBRATION_MS; },
    clear() { started = null; },
  };
}
