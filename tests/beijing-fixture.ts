import type { Network, Round, Request } from '../src/beijing/model';
export const fixture: Network = {
  stations: ['a','b','c','d','e','f','isolated'].map((id,index) => ({ id, name: id === 'isolated' ? 'a' : id, english: id.toUpperCase(), x: 100 + index * 100, y: 100 + index % 3 * 250 })),
  lines: [
    { id: 'red', name: '红线', english: 'Red', color: '#c54b49', stops: ['a','b','c'], loop: false },
    { id: 'blue', name: '蓝线', english: 'Blue', color: '#507aad', stops: ['b','d','e'], loop: false },
    { id: 'green', name: '绿线', english: 'Green', color: '#507d59', stops: ['a','f','e','c'], loop: false },
    { id: 'yellow', name: '黄线', english: 'Yellow', color: '#a18b34', stops: ['d','f'], loop: false },
  ],
  provenance: { snapshotDate: '2026-06-30', scope: 'Test fixture only', sources: [], notes: [] },
};
export const trip = (origin = 'a', destination = 'e', via: string[] = []): Request => ({ origin, destination, via });
export const roundFor = (request = trip(), event?: Round['event']): Round => ({ id: event === 'access' ? 'family' : event ?? 'sandbox', request, conditions: {}, event });
