import { getActions, getLevel, type GameState, type Place, type Text } from './model';
import { familyText } from './family-copy';

export type Guidance = { place: Place; message: Text; actionId?: string };
const places: Place[] = ['home', 'shop', 'school', 'bank', 'park'];
const routes: string[][] = [
  ['read-tags', 'buy-apple', 'share-apples'],
  ['make-list', 'buy-apple', 'buy-bread', 'pack-lunch'],
  ['check-price', 'pay-note', 'collect-rest', 'collect-change', 'deliver-bread'],
  ['assign-chores', 'sort-socks', 'sweep-room', 'collect-pay', 'show-room'],
  ['allowance', 'reserve-two', 'seal-reserve', 'buy-book', 'check-jars'],
  ['receive-gift', 'gift-plan', 'return-plush', 'buy-gift', 'give-present'],
  ['observe-shelf', 'unload-truck', 'wait-delivery', 'buy-apple', 'share-apples'],
  ['compare-stalls', 'check-quiet-price', 'wait-crowd', 'buy-juice', 'deliver-juice'],
  ['read-forecast', 'buy-umbrella', 'buy-coat', 'wait-weather', 'pack-weather'],
  ['compare-bread', 'buy-markdown', 'buy-fresh', 'serve-bread'],
  ['sort-stickers', 'offer-swap', 'accept-swap', 'buy-apple', 'share-swap-snack'],
  ['change-coins', 'parent-wallet', 'load-wallet', 'pay-digital', 'cash-out-wallet'],
  ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-due', 'repay', 'repair-trust', 'close-loan'],
  ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-due', 'repay', 'repair-trust', 'close-loan'],
  ['read-loan', 'borrow', 'buy-loan-item', 'loan-work', 'wait-due', 'repay', 'repair-trust', 'close-loan'],
  ['parent-bank', 'deposit', 'wait-bank', 'withdraw', 'buy-bank-paper', 'check-bank'],
  ['allowance', 'parent-bank', 'deposit', 'buy-book', 'wait-bank', 'keep-picnic-savings'],
  ['assign-picnic', 'picnic-work', 'parent-bank', 'withdraw', 'buy-apple', 'buy-bread', 'buy-juice', 'start-picnic'],
  ['travel-envelope', 'plan-trip', 'book-tickets', 'book-room', 'seal-trip-budget'],
  ['read-exchange', 'exchange-shells', 'pay-bus-qr', 'ride-island-bus'],
  ['compare-fx-prices', 'buy-foreign-souvenir', 'order-home-souvenir', 'pack-souvenirs'],
  ['read-customs', 'correct-declaration', 'declare-gifts', 'pay-customs', 'customs-stamp'],
  ['parent-card-terms', 'pay-parent-card', 'fly-home', 'review-card-bill'],
  ['read-home-bill', 'exchange-home', 'settle-parent-card', 'finish-travel'],
];
const readyCues: Record<string, string> = {
  'share-apples': 'home-snack', 'pack-lunch': 'school-lunch', 'deliver-bread': 'school-bread',
  'deliver-juice': 'school-juice', 'serve-bread': 'home-bread', 'share-swap-snack': 'school-swap',
  'start-picnic': 'park-picnic',
};
const actionCues: Record<string, string> = {
  'read-tags': 'shop-apple', 'buy-apple': 'shop-apple', 'make-list': 'home-list', 'buy-bread': 'shop-bread',
};

/** Goal-only registered speech, without replaying the story introduction. */
export function getGoalSpeech(state: GameState): Text { return getLevel(state).goal; }

/** Recommends a currently enabled prerequisite; never performs an economic action. */
export function getGuidance(state: GameState): Guidance {
  if (state.completed) return { place: getLevel(state).place, message: familyText('next.complete') };
  const available = places.flatMap(place => getActions(state, place)
    .filter(offer => !offer.disabled && !offer.id.startsWith('talk-'))
    .map(offer => ({ place, offer })));
  const route = routes[state.level];
  const terminal = route?.at(-1);
  // Once shopping is done, return/deliver before suggesting any optional purchases or waits.
  const ready = terminal && available.find(row => row.offer.id === terminal);
  const next = ready || (route
    ? route.map(id => available.find(row => row.offer.id === id)).find(Boolean)
    : available[0]);
  if (!next) return { place: getLevel(state).place, message: familyText('next.checkpoint') };
  const id = next.offer.id;
  const message = id === 'ride-island-bus' || id === 'pack-souvenirs'
    ? familyText(`action.${id}.${state.family.children}`)
    : familyText(`next.${readyCues[id] ?? actionCues[id] ?? next.place}`);
  return { place: next.place, actionId: id, message };
}
