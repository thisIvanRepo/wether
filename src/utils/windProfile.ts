// Wind profile interpolation.
//
// Open-Meteo gives wind on fixed model levels: 10/80/100/120/180 m above
// ground and on pressure levels (1000–850 hPa) whose height comes from the
// geopotential. We interpolate between them to the heights the app shows.

/** Heights above ground (m) shown in the app. */
export const WIND_HEIGHTS = [50, 100, 150, 300, 600, 1000] as const;

export type Wind = { speed: number; direction: number };
export type WindSample = Wind & { height: number };

const RAD = Math.PI / 180;

// Meteorological direction = where the wind blows FROM.
function toUV({ speed, direction }: Wind) {
  return { u: -speed * Math.sin(direction * RAD), v: -speed * Math.cos(direction * RAD) };
}

function fromUV(u: number, v: number): Wind {
  return {
    speed: Math.hypot(u, v),
    direction: (Math.atan2(-u, -v) / RAD + 360) % 360,
  };
}

/**
 * Interpolates wind at `target` metres above ground.
 * Uses u/v components (so directions like 350° → 10° blend correctly) and
 * log-height weighting, which follows the near-surface logarithmic profile.
 * Returns null outside the sampled range — no extrapolation.
 */
export function interpolateWind(samples: WindSample[], target: number): Wind | null {
  const sorted = samples
    .filter((s) => s.height > 0)
    .sort((a, b) => a.height - b.height);
  if (sorted.length === 0) return null;

  for (let i = 0; i < sorted.length; i++) {
    const lo = sorted[i];
    if (lo.height === target) return { speed: lo.speed, direction: lo.direction };
    const hi = sorted[i + 1];
    if (!hi || lo.height > target || hi.height < target || hi.height === lo.height) continue;

    const t = (Math.log(target) - Math.log(lo.height)) / (Math.log(hi.height) - Math.log(lo.height));
    const a = toUV(lo);
    const b = toUV(hi);
    return fromUV(a.u + (b.u - a.u) * t, a.v + (b.v - a.v) * t);
  }
  return null;
}

const sector = (direction: number) => Math.round(direction / 45) % 8;

const COMPASS = ['Пн', 'ПнСх', 'Сх', 'ПдСх', 'Пд', 'ПдЗх', 'Зх', 'ПнЗх'];
const ADJECTIVE = [
  'північний',
  'північно-східний',
  'східний',
  'південно-східний',
  'південний',
  'південно-західний',
  'західний',
  'північно-західний',
];
const FROM = [
  'з півночі',
  'з північного сходу',
  'зі сходу',
  'з південного сходу',
  'з півдня',
  'з південного заходу',
  'із заходу',
  'з північного заходу',
];

/** "Пн", "ПдЗх", … — the side the wind blows from. */
export const compass = (direction: number) => COMPASS[sector(direction)];
/** "західний" */
export const directionName = (direction: number) => ADJECTIVE[sector(direction)];
/** "із заходу" */
export const directionFrom = (direction: number) => FROM[sector(direction)];

/** Smallest angle between two directions, 0–180°. */
export function angleBetween(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export type WindLevel = { min: number; label: string; color: string };

/** Speed bands (m/s), roughly following the Beaufort scale. */
export const WIND_LEVELS: WindLevel[] = [
  { min: 0, label: 'Слабкий', color: '#2e9d5b' },
  { min: 3, label: 'Помірний', color: '#7cb342' },
  { min: 6, label: 'Свіжий', color: '#e0b422' },
  { min: 9, label: 'Сильний', color: '#f08a24' },
  { min: 12, label: 'Дуже сильний', color: '#e2453c' },
  { min: 16, label: 'Шторм', color: '#9c3fb5' },
];

export function windLevel(speed: number): WindLevel {
  let level = WIND_LEVELS[0];
  for (const l of WIND_LEVELS) if (speed >= l.min) level = l;
  return level;
}

/** Colour for a wind speed in m/s. */
export const windColor = (speed: number) => windLevel(speed).color;
