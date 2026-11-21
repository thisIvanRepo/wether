import type { HourlyPoint } from '../api/openMeteo';
import type { Icon3DName } from '../components/Icon3D';

/** Hours with less than this (mm) count as dry. */
export const WET_THRESHOLD = 0.1;

export type PrecipKind = 'rain' | 'showers' | 'snow' | 'mixed';

export const KIND_LABEL: Record<PrecipKind, string> = {
  rain: 'Дощ',
  showers: 'Злива',
  snow: 'Сніг',
  mixed: 'Дощ зі снігом',
};

export const KIND_ICON: Record<PrecipKind, Icon3DName> = {
  rain: 'cloud_with_rain',
  showers: 'umbrella_with_rain_drops',
  snow: 'snowflake',
  mixed: 'cloud_with_snow',
};

export type PrecipLevel = { min: number; label: string; color: string };

/** Hourly intensity bands, mm/h (WMO-style, with an extra "very light" band). */
export const PRECIP_LEVELS: PrecipLevel[] = [
  { min: WET_THRESHOLD, label: 'Дуже слабкі', color: '#7cc4ff' },
  { min: 0.5, label: 'Слабкі', color: '#3f9bff' },
  { min: 2.5, label: 'Помірні', color: '#2a62e8' },
  { min: 7.6, label: 'Сильні', color: '#6a3fe0' },
  { min: 20, label: 'Дуже сильні', color: '#c03ad8' },
];

/** Intensity band for mm/h, or null when it's dry. */
export function precipLevel(mmPerHour: number): PrecipLevel | null {
  let level: PrecipLevel | null = null;
  for (const l of PRECIP_LEVELS) if (mmPerHour >= l.min) level = l;
  return level;
}

/** Background for a probability cell: more likely = more saturated blue. */
export function probabilityColor(pct: number) {
  return `rgba(90,180,255,${(0.12 + (pct / 100) * 0.7).toFixed(2)})`;
}

export function probabilityWord(pct: number) {
  if (pct < 20) return 'малоймовірно';
  if (pct < 50) return 'можливо';
  if (pct < 80) return 'ймовірно';
  return 'майже напевно';
}

/** Light-blue scale for snowfall (cm/h); pair with dark text. */
export function snowColor(cm: number) {
  if (cm < 0.5) return '#dbe6ff';
  if (cm < 2) return '#b4c8ff';
  return '#8fa9ff';
}

export function precipKind(h: HourlyPoint): PrecipKind | null {
  if (h.precipitation < WET_THRESHOLD) return null;
  const liquid = h.rain + h.showers;
  if (h.snowfall > 0 && liquid > 0) return 'mixed';
  if (h.snowfall > 0) return 'snow';
  if (h.showers > h.rain) return 'showers';
  return 'rain';
}

/** "слабкі", "помірні", … for mm/h. */
export function intensityLabel(mmPerHour: number) {
  return (precipLevel(mmPerHour)?.label ?? 'без опадів').toLowerCase();
}

/** Running total from the first hour up to and including each hour, mm. */
export function cumulative(hourly: HourlyPoint[]) {
  let sum = 0;
  return hourly.map((h) => (sum += h.precipitation));
}

export type PrecipPeriod = {
  kind: PrecipKind;
  startTime: string;
  /** Exclusive end: start of the first dry hour. */
  endTime: string;
  hours: number;
  total: number;
  snow: number;
  peak: number;
  peakTime: string;
  maxProbability: number;
};

export type PrecipSummary = {
  total: number;
  snow: number;
  wetHours: number;
  maxProbability: number;
  periods: PrecipPeriod[];
};

function addHour(iso: string) {
  const hour = Number(iso.slice(11, 13)) + 1;
  return `${iso.slice(0, 11)}${String(hour % 24).padStart(2, '0')}:00`;
}

function mergeKinds(kinds: PrecipKind[]): PrecipKind {
  const set = new Set(kinds);
  if (set.has('mixed') || (set.has('snow') && (set.has('rain') || set.has('showers')))) return 'mixed';
  if (set.has('snow')) return 'snow';
  const showers = kinds.filter((k) => k === 'showers').length;
  return showers > kinds.length / 2 ? 'showers' : 'rain';
}

/** Groups consecutive wet hours into periods and totals everything up. */
export function analyzePrecipitation(hourly: HourlyPoint[]): PrecipSummary {
  const periods: PrecipPeriod[] = [];
  let current: { hours: HourlyPoint[]; kinds: PrecipKind[] } | null = null;

  const flush = () => {
    if (!current) return;
    const { hours, kinds } = current;
    const peakHour = hours.reduce((a, b) => (b.precipitation > a.precipitation ? b : a));
    periods.push({
      kind: mergeKinds(kinds),
      startTime: hours[0].time,
      endTime: addHour(hours[hours.length - 1].time),
      hours: hours.length,
      total: hours.reduce((s, h) => s + h.precipitation, 0),
      snow: hours.reduce((s, h) => s + h.snowfall, 0),
      peak: peakHour.precipitation,
      peakTime: peakHour.time,
      maxProbability: Math.max(...hours.map((h) => h.precipitationProbability)),
    });
    current = null;
  };

  for (const h of hourly) {
    const kind = precipKind(h);
    if (kind) {
      current ??= { hours: [], kinds: [] };
      current.hours.push(h);
      current.kinds.push(kind);
    } else {
      flush();
    }
  }
  flush();

  return {
    total: hourly.reduce((s, h) => s + h.precipitation, 0),
    snow: hourly.reduce((s, h) => s + h.snowfall, 0),
    wetHours: hourly.filter((h) => h.precipitation >= WET_THRESHOLD).length,
    maxProbability: Math.max(0, ...hourly.map((h) => h.precipitationProbability)),
    periods,
  };
}
