import { LEVEL_COUNT, TRAVEL_FINANCE_FLAGS, type GameState, type Lang } from './model';

export const SAVE_KEY = 'transit-tales-economic-v1';
export type Save = { state: GameState; checkpoint: GameState; lang: Lang };
const MAX_MONEY = 100_000_000;
const MAX_DAY = 100_000;
const MAX_ENTRIES = 10_000;
const rewards = ['pocket-badge', 'helper-apron', 'market-hat', 'swap-badge', 'promise-scarf', 'picnic-crown', 'travel-bag', 'passport-badge'];
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => typeof value === 'object' && value !== null && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const integer = (value: unknown, min = 0, max = MAX_MONEY): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const knownKeys = (value: ObjectValue, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
function numbers(value: unknown, max: number): value is Record<string, number> {
  return object(value) && Object.keys(value).length <= 150 && Object.entries(value).every(([key, n]) => /^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(key) && !['__proto__', 'prototype', 'constructor'].includes(key) && integer(n, 0, max));
}
function localized(value: unknown): boolean {
  return object(value) && knownKeys(value, ['zh', 'en']) && ['zh', 'en'].every(key => typeof value[key] === 'string' && (value[key] as string).length <= 2000);
}
function validState(value: unknown): value is GameState {
  if (!object(value) || !knownKeys(value, ['version', 'family', 'level', 'day', 'cash', 'savings', 'digital', 'debt', 'trust', 'inventory', 'flags', 'seed', 'completed', 'ledger', 'rewards', 'bankTerm', 'loan'])) return false;
  const v = value;
  if (v.version !== 1 || !object(v.family) || !knownKeys(v.family, ['gender', 'children']) || !['boy', 'girl'].includes(v.family.gender as string) || ![1, 2, 3].includes(v.family.children as number)) return false;
  if (!integer(v.level, 0, LEVEL_COUNT - 1) || !integer(v.day, 1, MAX_DAY) || !integer(v.seed, 0, 0xffff_ffff) || !integer(v.trust, 0, 3) || typeof v.completed !== 'boolean') return false;
  if (!['cash', 'savings', 'digital', 'debt'].every(k => integer(v[k])) || !numbers(v.inventory, 10_000) || !numbers(v.flags, MAX_MONEY)) return false;
  if (!integer(v.flags.entryCash) || !integer(v.flags.entryDay, 1, v.day)) return false;
  if (!Array.isArray(v.rewards) || v.rewards.length > 8 || new Set(v.rewards).size !== v.rewards.length || !v.rewards.every(r => typeof r === 'string' && rewards.includes(r) && rewards.indexOf(r) * 3 + 2 <= (v.level as number))) return false;
  if (!Array.isArray(v.ledger) || v.ledger.length === 0 || v.ledger.length > MAX_ENTRIES) return false;
  const totals = { cash: 0, savings: 0, debt: 0, digital: 0 };
  let lastDay = 0;
  for (const entry of v.ledger) {
    if (!object(entry) || !knownKeys(entry, ['day', 'label', 'cash', 'savings', 'debt', 'digital']) || !integer(entry.day, 1, v.day) || entry.day < lastDay || !localized(entry.label)) return false;
    lastDay = entry.day;
    for (const key of ['cash', 'savings', 'debt', 'digital'] as const) {
      const delta = key === 'digital' && entry[key] === undefined ? 0 : entry[key];
      if (!integer(delta, -MAX_MONEY, MAX_MONEY)) return false;
      totals[key] += delta;
      if (!integer(totals[key])) return false;
    }
  }
  if (!Object.entries(totals).every(([k, n]) => v[k] === n)) return false;
  if (v.loan !== undefined) {
    const t = v.loan;
    if (!object(t) || !knownKeys(t, ['principal', 'startDay', 'dueDay', 'rate', 'lastInterestDay', 'late']) || !integer(t.principal, 1) || !integer(t.startDay, 1, v.day) || !integer(t.dueDay, t.startDay + 1, MAX_DAY) || t.dueDay !== t.startDay + 1 || !integer(t.lastInterestDay, t.startDay, v.day) || !integer(t.rate, 0, 1) || typeof t.late !== 'boolean' || (v.debt as number) < t.principal || t.late !== (v.day > t.dueDay) || ![12, 13, 14].includes(v.level)) return false;
    if (t.lastInterestDay !== v.day || v.debt !== t.principal + Math.floor(t.principal * t.rate / 100) * (v.day - t.startDay)) return false;
  } else if (v.debt !== 0) {
    const foreignDebt = v.flags.foreignDebt ?? 0;
    const rate = v.flags.fxRate ?? 0;
    const fee = v.flags.cardLateFee ?? 0;
    if (![22, 23].includes(v.level) || !foreignDebt || ![200, 220].includes(rate) || !integer(v.flags.cardDueDay, 1, MAX_DAY) || ![0, 20].includes(fee) || v.debt !== Math.floor(foreignDebt * rate / 100) + fee || (v.day > v.flags.cardDueDay) !== (fee === 20)) return false;
  }
  if (v.debt === 0 && v.flags.foreignDebt) return false;
  const foreignCash = v.flags.foreignCash ?? 0;
  if ((foreignCash || v.flags.fxRate || v.flags.foreignDebt) && v.level < 18) return false;
  if (v.level >= 19 && ![200, 220].includes(v.flags.fxRate)) return false;
  if (v.bankTerm !== undefined) {
    const t = v.bankTerm;
    if (!object(t) || !knownKeys(t, ['principal', 'startDay', 'maturityDay', 'rate', 'settled']) || !integer(t.principal, 1) || !integer(t.startDay, 1, v.day) || !integer(t.maturityDay, t.startDay + 1, Math.min(MAX_DAY, t.startDay + 2)) || t.rate !== 1 || typeof t.settled !== 'boolean' || t.settled !== (v.day >= t.maturityDay) || ![15, 16, 17].includes(v.level)) return false;
    const expected = t.principal + (t.settled ? Math.floor(t.principal * (t.maturityDay - t.startDay) / 100) : 0);
    if (v.savings !== expected) return false;
  } else if (v.savings !== 0) return false;
  if (v.digital !== 0 && (v.level !== 11 || v.completed)) return false;
  return true;
}
function validSave(value: unknown): value is Save {
  if (!object(value) || !knownKeys(value, ['state', 'checkpoint', 'lang']) || !['zh', 'en'].includes(value.lang as string) || !validState(value.state) || !validState(value.checkpoint)) return false;
  const { state: s, checkpoint: c } = value;
  if (c.completed || s.level !== c.level || s.seed !== c.seed || s.family.gender !== c.family.gender || s.family.children !== c.family.children || c.day > s.day || c.ledger.length > s.ledger.length || s.flags.entryCash !== c.cash || s.flags.entryDay !== c.day) return false;
  if (!c.ledger.every((entry, i) => JSON.stringify(entry) === JSON.stringify(s.ledger[i]))) return false;
  return Object.keys(c.flags).every(key => key === 'entryCash' || key === 'entryDay' || (TRAVEL_FINANCE_FLAGS as readonly string[]).includes(key)) && c.flags.entryCash === c.cash && c.flags.entryDay === c.day;
}
export function loadGame(storage: Pick<Storage, 'getItem'> | undefined): Save | undefined {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw || raw.length > 4_000_000) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return validSave(parsed) ? parsed : undefined;
  } catch { return undefined; }
}
export function saveGame(storage: Pick<Storage, 'setItem'> | undefined, save: Save): boolean {
  try {
    if (!storage || !validSave(save)) return false;
    const raw = JSON.stringify(save);
    if (raw.length > 4_000_000) return false;
    storage.setItem(SAVE_KEY, raw);
    return true;
  } catch { return false; }
}
