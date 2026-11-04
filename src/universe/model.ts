import { DESTINATIONS, EPOCHS, type Destination, type Epoch } from './catalog';

export interface JourneyState {
  destinationId: string;
  epochId: Epoch['id'];
  departureDestinationId: string;
  departureEpochId: Epoch['id'];
  beta: number;
  phase: 'ready' | 'travelling' | 'encounter';
  progress: number;
  paused: boolean;
  shield: number;
  energy: number;
  research: number;
  friendship: number;
  visited: string[];
  completed: string[];
  choiceId: string | null;
  outcome: 'success' | 'retry' | null;
  elapsed: number;
  properElapsed: number;
}
export interface Encounter {
  id: string;
  kind: Destination['hazard'];
  prompt: string;
  promptZh: string;
  choices: { id: string; label: string; labelZh: string; safe: boolean }[];
}

const STORAGE_KEY = 'universe-journey-v1';
const VERSION = 1;
const JUMP_SECONDS = 7; // Display-compressed play time, never a physical journey duration.
const MAX_ELAPSED = 1e9;
const MAX_COMPLETED = DESTINATIONS.length * EPOCHS.length;
const CHOICE_IDS = ['shield', 'detour', 'scan', 'rush', 'approach', 'listen', 'trade', 'compete'];
const destinations = new Map(DESTINATIONS.map(destination => [destination.id, destination]));
const epochs = new Map(EPOCHS.map(epoch => [epoch.id, epoch]));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const keyFor = (state: JourneyState) => `${state.destinationId}:${state.epochId}`;

function location(destinationId: string, epochId: Epoch['id']): [Destination, Epoch] {
  const destination = destinations.get(destinationId);
  const epoch = epochs.get(epochId);
  if (!destination || !epoch) throw new RangeError('Unknown destination or epoch');
  return [destination, epoch];
}

export function createJourney(): JourneyState {
  return { destinationId: 'earth', epochId: 'present', departureDestinationId: 'earth', departureEpochId: 'present', beta: 0.65, phase: 'ready', progress: 0, paused: false, shield: 100, energy: 100, research: 0, friendship: 0, visited: [], completed: [], choiceId: null, outcome: null, elapsed: 0, properElapsed: 0 };
}

export function lorentzFactor(beta: number): number {
  if (!Number.isFinite(beta) || beta < 0 || beta > 0.9999) throw new RangeError('Beta must be finite and between 0 and 0.9999');
  return 1 / Math.sqrt(1 - beta * beta);
}

export function dopplerFactor(beta: number): number {
  lorentzFactor(beta);
  return Math.sqrt((1 + beta) / (1 - beta));
}

export function canObserve(destination: Destination, epoch: Epoch): boolean {
  // This checks formation, not a forecast of an object's survival or unchanged appearance.
  return destination.id !== 'beyond' && epoch.ageGyr > 0 && epoch.ageGyr >= destination.formedGyr;
}

export function beginJump(state: JourneyState, destinationId: string, epochId: Epoch['id']): JourneyState {
  location(destinationId, epochId);
  lorentzFactor(state.beta);
  if (state.phase === 'travelling') return state;
  return { ...state, departureDestinationId: state.destinationId, departureEpochId: state.epochId, destinationId, epochId, phase: 'travelling', progress: 0, paused: false, shield: clamp(state.shield + 35, 60, 100), energy: 100, choiceId: null, outcome: null, visited: [...state.visited], completed: [...state.completed] };
}

export function tickJourney(state: JourneyState, seconds: number): JourneyState {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60) throw new RangeError('Tick seconds must be finite and between 0 and 60');
  const gamma = lorentzFactor(state.beta);
  if (state.paused || state.phase !== 'travelling' || seconds === 0) return state;
  const rate = state.destinationId === state.departureDestinationId ? 1 : Math.min(1.5, state.beta / .65);
  if (rate === 0) return state;
  const duration = Math.min(seconds, (1 - state.progress) * JUMP_SECONDS / rate);
  const progress = clamp(state.progress + duration * rate / JUMP_SECONDS, 0, 1);
  const arrived = progress >= 1 - 1e-12;
  return { ...state, progress: arrived ? 1 : progress, phase: arrived ? 'encounter' : 'travelling', energy: clamp(state.energy - duration * 2, 0, 100), elapsed: clamp(state.elapsed + duration, 0, MAX_ELAPSED), properElapsed: clamp(state.properElapsed + duration / gamma, 0, Math.min(MAX_ELAPSED, state.elapsed + duration)), visited: arrived && !state.visited.includes(state.destinationId) ? [...state.visited, state.destinationId] : [...state.visited], completed: [...state.completed] };
}

export function encounterFor(state: JourneyState): Encounter {
  const [destination, epoch] = location(state.destinationId, state.epochId);
  const absent = !canObserve(destination, epoch);
  const speculative = destination.id === 'beyond';
  const kind: Destination['hazard'] = speculative ? 'signal' : absent ? (epoch.ageGyr < 0.00038 ? 'radiation' : 'debris') : destination.hazard;
  const prefix = speculative
    ? ['Unobserved space: this scenery and friendly alien are imagination, not detected life.', '未观测空间：此景观和友好外星角色属于想象，并非发现了生命。']
    : absent
      ? epoch.ageGyr < 0.00038
        ? ['This object has not formed. A spatially extended primordial hot dense field fills the scene, not a point explosion. Time travel and protective shields are fiction.', '此天体尚未形成。场景是遍布空间的原初炽热致密场，不是点状爆炸。时间旅行和防护盾是虚构。']
        : ['This object has not formed. Study diffuse gas at this location, not a modern planet, neutron star or galaxy. Time travel is fiction.', '此天体尚未形成。研究此处的弥散气体，而不是现代行星、中子星或星系。时间旅行是虚构。']
      : [destination.fact, destination.factZh];
  const caution = epoch.speculative && !speculative ? [' This epoch is a speculative illustration, not a prediction of unchanged objects.', ' 此时代是推测示意，并非预言天体保持不变。'] : ['', ''];
  if (kind === 'signal') {
    return { id: keyFor(state), kind, prompt: `${prefix[0]}${caution[0]} A fictional friendly alien invites listening, exchanging knowledge, or a nonviolent puzzle contest.`, promptZh: `${prefix[1]}${caution[1]}虚构的友好外星角色邀请你倾听、交换知识或参加非暴力解谜比赛。`, choices: [
      { id: 'listen', label: 'Listen and learn their story', labelZh: '倾听并了解故事', safe: true },
      { id: 'trade', label: 'Exchange observations freely', labelZh: '友好交换观测知识', safe: true },
      { id: 'compete', label: 'Play a friendly, nonviolent puzzle contest', labelZh: '参加友好的非暴力解谜比赛', safe: true },
      { id: 'approach', label: 'Approach without checking the signal', labelZh: '未检查信号便靠近', safe: false },
    ] };
  }
  const instructions: Record<Exclude<Destination['hazard'], 'signal'>, [string, string]> = {
    debris: ['Keep a safe distance from gas and debris; scan or detour.', '与气体和碎屑保持安全距离；扫描或绕行。'],
    radiation: ['Observe radiation remotely; fictional shields keep the crew safe.', '远程观测辐射；虚构的护盾保护乘员。'],
    gravity: ['Observe extreme gravity remotely, outside any event horizon; a gravity shield is fiction, not real protection.', '在任何事件视界之外远程观测极端引力；引力护盾是虚构，不是真实防护。'],
  };
  return { id: keyFor(state), kind, prompt: `${prefix[0]}${caution[0]} ${instructions[kind][0]}`, promptZh: `${prefix[1]}${caution[1]}${instructions[kind][1]}`, choices: [
    { id: 'shield', label: 'Stay remote with the fictional shield', labelZh: '在虚构护盾内保持远距', safe: true },
    { id: 'scan', label: 'Scan remotely and record evidence', labelZh: '远程扫描并记录证据', safe: true },
    { id: 'detour', label: 'Take a safe detour', labelZh: '安全绕行', safe: true },
    { id: 'rush', label: 'Rush closer without precautions', labelZh: '不采取防护便贸然靠近', safe: false },
  ] };
}

export function resolveEncounter(state: JourneyState, choiceId: string): JourneyState {
  const encounter = encounterFor(state);
  const choice = encounter.choices.find(candidate => candidate.id === choiceId);
  if (!choice) throw new RangeError('Unknown encounter choice');
  if (state.phase !== 'encounter' || state.paused || state.outcome === 'success') return state;
  if (!choice.safe) return { ...state, shield: clamp(state.shield - 20, 20, 100), choiceId, outcome: 'retry' };
  const completed = state.completed.includes(encounter.id);
  return { ...state, choiceId, outcome: 'success', research: clamp(state.research + (completed ? 0 : 10), 0, MAX_COMPLETED * 10), friendship: clamp(state.friendship + (!completed && encounter.kind === 'signal' ? 5 : 0), 0, MAX_COMPLETED * 5), completed: completed ? [...state.completed] : [...state.completed, encounter.id] };
}

function finiteRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseState(value: unknown): JourneyState | null {
  if (!record(value)) return null;
  const defaults = createJourney(), departureKeys = ['departureDestinationId', 'departureEpochId'];
  if (Object.keys(value).some(key => !Object.prototype.hasOwnProperty.call(defaults, key)) || Object.keys(defaults).some(key => !departureKeys.includes(key) && !Object.prototype.hasOwnProperty.call(value, key))) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'departureDestinationId') && (typeof value.departureDestinationId !== 'string' || !destinations.has(value.departureDestinationId))) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'departureEpochId') && (typeof value.departureEpochId !== 'string' || !epochs.has(value.departureEpochId as Epoch['id']))) return null;
  if (typeof value.destinationId !== 'string' || !destinations.has(value.destinationId) || typeof value.epochId !== 'string' || !epochs.has(value.epochId as Epoch['id'])) return null;
  if (!finiteRange(value.beta, 0, 0.9999) || !finiteRange(value.progress, 0, 1) || !finiteRange(value.shield, 0, 100) || !finiteRange(value.energy, 0, 100) || !finiteRange(value.elapsed, 0, MAX_ELAPSED) || !finiteRange(value.properElapsed, 0, value.elapsed) || !finiteRange(value.research, 0, MAX_COMPLETED * 10) || !finiteRange(value.friendship, 0, MAX_COMPLETED * 5)) return null;
  if (typeof value.phase !== 'string' || !['ready', 'travelling', 'encounter'].includes(value.phase) || typeof value.paused !== 'boolean' || (value.outcome !== null && value.outcome !== 'success' && value.outcome !== 'retry') || (value.choiceId !== null && (typeof value.choiceId !== 'string' || !CHOICE_IDS.includes(value.choiceId)))) return null;
  if (!Array.isArray(value.visited) || value.visited.length > DESTINATIONS.length || value.visited.some(id => typeof id !== 'string' || !destinations.has(id))) return null;
  if (!Array.isArray(value.completed) || value.completed.length > MAX_COMPLETED || value.completed.some(id => typeof id !== 'string' || !DESTINATIONS.some(destination => EPOCHS.some(epoch => id === `${destination.id}:${epoch.id}`)))) return null;
  const state = { ...value, departureDestinationId: value.departureDestinationId ?? value.destinationId, departureEpochId: value.departureEpochId ?? value.epochId, visited: [...new Set(value.visited)], completed: [...new Set(value.completed)] } as unknown as JourneyState;
  if (state.completed.some(id => !state.visited.includes(id.split(':')[0]))) return null;
  const signals = state.completed.filter(id => {
    const [destinationId, epochId] = id.split(':');
    return encounterFor({ ...state, destinationId, epochId: epochId as Epoch['id'] }).kind === 'signal';
  }).length;
  if (state.research !== state.completed.length * 10 || state.friendship !== signals * 5) return null;
  if ((state.phase === 'ready' && state.progress !== 0) || (state.phase === 'travelling' && state.progress >= 1) || (state.phase === 'encounter' && (state.progress !== 1 || !state.visited.includes(state.destinationId)))) return null;
  if (state.phase !== 'encounter' && (state.choiceId !== null || state.outcome !== null)) return null;
  if (state.phase === 'encounter') {
    const choice = encounterFor(state).choices.find(candidate => candidate.id === state.choiceId);
    if ((state.outcome === null) !== (state.choiceId === null) || (state.outcome !== null && !choice) || (state.outcome === 'success' && (!choice?.safe || !state.completed.includes(keyFor(state)))) || (state.outcome === 'retry' && choice?.safe)) return null;
  }
  // Resume an interrupted display-compressed flight only after an explicit unpause.
  return state.phase === 'travelling' ? { ...state, paused: true } : state;
}

export function readJourney(storage?: Pick<Storage, 'getItem'>): JourneyState {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY);
    if (!raw || raw.length > 40000) return createJourney();
    const parsed: unknown = JSON.parse(raw);
    if (!record(parsed) || Object.keys(parsed).length !== 2 || parsed.version !== VERSION) return createJourney();
    return parseState(parsed.state) ?? createJourney();
  } catch { return createJourney(); }
}

export function writeJourney(storage: Pick<Storage, 'setItem'> | undefined, state: JourneyState): boolean {
  try {
    if (!storage || !parseState(state)) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state }));
    return true;
  } catch { return false; }
}
