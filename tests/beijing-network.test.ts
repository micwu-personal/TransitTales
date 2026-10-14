import { describe, expect, it } from 'vitest';
import { NETWORK } from '../src/beijing/network';

describe('dated complete Beijing operating-facts database', () => {
  it('includes 30 named lines as 28 through-services and 540 station occurrences', () => {
    expect(NETWORK.lines).toHaveLength(28);
    expect(NETWORK.stations).toHaveLength(426);
    expect(NETWORK.lines.reduce((sum, line) => sum + line.stops.length, 0)).toBe(540);
    expect(NETWORK.lines.filter(line => line.loop).map(line => line.id)).toEqual(['2', '10']);
    expect(NETWORK.lines.find(line => line.id === '1-batong')?.stops).toHaveLength(35);
    expect(NETWORK.lines.find(line => line.id === '4-daxing')?.stops).toHaveLength(35);
    expect(NETWORK.provenance.snapshotDate).toBe('2026-06-30');
    expect(NETWORK.provenance.sources.some(source => source.url.includes('openstreetmap.org'))).toBe(true);
  });

  it('keeps valid original map positions and every service/connection endpoint', () => {
    const ids = new Set(NETWORK.stations.map(station => station.id));
    expect(ids.size).toBe(NETWORK.stations.length);
    for (const station of NETWORK.stations) {
      expect(station.name.length).toBeGreaterThan(0);
      expect(Number.isFinite(station.x) && Number.isFinite(station.y)).toBe(true);
      expect(station.x).toBeGreaterThanOrEqual(0); expect(station.x).toBeLessThanOrEqual(1000);
      expect(station.y).toBeGreaterThanOrEqual(0); expect(station.y).toBeLessThanOrEqual(1000);
    }
    for (const line of NETWORK.lines) {
      expect(new Set(line.stops).size).toBe(line.stops.length);
      for (const id of line.stops) expect(ids.has(id)).toBe(true);
      for (const connection of line.connections ?? []) {
        expect(line.stops.includes(connection.from) && line.stops.includes(connection.to)).toBe(true);
      }
    }
  });

  it('uses the real directed airport terminal circuit, not reversed sequential stops', () => {
    const names = new Map(NETWORK.stations.map(station => [station.id, station.name]));
    const airport = NETWORK.lines.find(line => line.id === 'capital-airport')!;
    expect(airport.connections?.map(edge => [names.get(edge.from), names.get(edge.to), edge.bidirectional])).toEqual([
      ['北新桥', '东直门', false], ['东直门', '北新桥', false],
      ['东直门', '三元桥', false], ['三元桥', '东直门', false],
      ['三元桥', '3号航站楼', false], ['3号航站楼', '2号航站楼', false],
      ['2号航站楼', '三元桥', false],
    ]);
  });

  it('distinguishes external transfers and connects every service without invented interchanges', () => {
    expect(NETWORK.externalTransfers).toHaveLength(3);
    const edges = new Map(NETWORK.stations.map(station => [station.id, new Set<string>()]));
    const link = (from: string, to: string) => { edges.get(from)!.add(to); edges.get(to)!.add(from); };
    for (const line of NETWORK.lines) {
      for (let index = 1; index < line.stops.length; index++) link(line.stops[index - 1], line.stops[index]);
    }
    for (const transfer of NETWORK.externalTransfers ?? []) {
      expect(transfer.from).not.toBe(transfer.to);
      expect(transfer.minutes > 0 && transfer.meters > 0).toBe(true);
      link(transfer.from, transfer.to);
    }
    const seen = new Set<string>(); const queue = [NETWORK.stations[0].id];
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index]; if (seen.has(id)) continue; seen.add(id);
      queue.push(...edges.get(id)!);
    }
    expect(seen.size).toBe(NETWORK.stations.length);
    expect(NETWORK.stations.some(station => station.name === '八角游乐园')).toBe(false);
    const line = (id: string) => NETWORK.lines.find(service => service.id === id)!.stops;
    const station = (name: string) => NETWORK.stations.find(stop => stop.name === name)!.id;
    expect(line('14')).not.toContain(station('高家园'));
    expect(line('17')).not.toContain(station('广渠门外'));
    expect(line('8')).toContain(station('大红门'));
    expect(line('10')).toContain(station('大红门'));
  });
});
