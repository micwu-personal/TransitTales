import data from './network-data.json';

export interface BeijingStation {
  id: string;
  name: string;
  english: string;
  x: number;
  y: number;
}

export interface BeijingLine {
  id: string;
  name: string;
  english: string;
  color: string;
  stops: string[];
  loop: boolean;
  serviceGroup?: string;
  connections?: { from: string; to: string; bidirectional: boolean }[];
}

export interface BeijingNetwork {
  stations: BeijingStation[];
  lines: BeijingLine[];
  externalTransfers?: { from: string; to: string; minutes: number; meters: number }[];
  provenance: {
    snapshotDate: string;
    scope: string;
    sources: { name: string; url: string }[];
    notes: string[];
  };
}

export const NETWORK: BeijingNetwork = data;
