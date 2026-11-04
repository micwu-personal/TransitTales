import type { SceneKind } from './view';

export const AU_METERS = 149597870700;
export const LIGHT_SPEED = 299792458;
export const YEAR_SECONDS = 31557600;
const SOLAR_SCHWARZSCHILD_METERS = 2953.25;

// Representative emission sites, not a rotating-space-time or spectral simulation.
const compactSources: Readonly<Record<string, { mass: number; emission: number }>> = {
  neutron: { mass: 1.4, emission: 12000 },
  'crab-pulsar': { mass: 1.4, emission: 12000 },
  'stellar-hole': { mass: 10, emission: 3 * 10 * SOLAR_SCHWARZSCHILD_METERS },
  'cygnus-x1': { mass: 21, emission: 3 * 21 * SOLAR_SCHWARZSCHILD_METERS },
  sagittarius: { mass: 4.3e6, emission: 3 * 4.3e6 * SOLAR_SCHWARZSCHILD_METERS },
  quasar: { mass: 1e9, emission: 3 * 1e9 * SOLAR_SCHWARZSCHILD_METERS },
};

export function gravitationalFrequency(massSolar: number, emissionMeters: number, observerMeters: number): number {
  if (![massSolar, emissionMeters, observerMeters].every(Number.isFinite) || massSolar < 0) return 1;
  const radius = massSolar * SOLAR_SCHWARZSCHILD_METERS;
  if (emissionMeters <= radius || observerMeters <= radius) return 1;
  return Math.sqrt((1 - radius / emissionMeters) / (1 - radius / observerMeters));
}

export function sourceFrequency(id: string, kind: SceneKind, distanceAU: number, lookbackGyr: number, observerAgeGyr = 13.8, referenceDistanceAU = distanceAU) {
  const source = compactSources[id] ?? (kind === 'neutron' ? compactSources.neutron : kind === 'blackhole' ? compactSources['stellar-hole'] : kind === 'quasar' ? compactSources.quasar : undefined);
  const gravitational = source ? gravitationalFrequency(source.mass, source.emission, Math.max(source.emission, distanceAU * AU_METERS)) : 1;
  // Present-Earth lookback anchors inform a toy matter-era illustration only.
  // Ease it away during time reconstruction and near the source, rather than
  // treating Earth's old light cone as the traveler's local measured spectrum.
  const distanceFraction = referenceDistanceAU > 0 && Number.isFinite(referenceDistanceAU) && Number.isFinite(distanceAU) ? Math.max(0, Math.min(1, distanceAU / referenceDistanceAU)) : 0;
  const weight = Math.max(0, 1 - Math.abs(observerAgeGyr - 13.8) / .1);
  const localLookback = Math.max(0, Math.min(13.799, lookbackGyr * distanceFraction));
  const illustration = lookbackGyr > .02 && ['galaxy', 'quasar', 'group'].includes(kind)
    ? Math.pow(Math.max(.0001, (13.8 - localLookback) / 13.8), 2 / 3) : 1;
  const cosmological = 1 + (illustration - 1) * weight * weight * (3 - 2 * weight);
  return { gravitational, cosmological };
}

export function cruiseEstimate(distanceAU: number, beta: number) {
  if (!Number.isFinite(distanceAU) || distanceAU < 0 || !Number.isFinite(beta) || beta < 0 || beta >= 1) return { observerSeconds: 0, travelerSeconds: 0 };
  if (distanceAU === 0) return { observerSeconds: 0, travelerSeconds: 0 };
  if (beta === 0) return { observerSeconds: Infinity, travelerSeconds: Infinity };
  const observerSeconds = distanceAU * AU_METERS / (beta * LIGHT_SPEED);
  return { observerSeconds, travelerSeconds: observerSeconds * Math.sqrt(1 - beta * beta) };
}
