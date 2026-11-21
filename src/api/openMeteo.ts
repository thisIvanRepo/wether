// Open-Meteo forecast API — free, no API key required.
// Docs: https://open-meteo.com/en/docs

import {
  WIND_HEIGHTS,
  interpolateWind,
  type Wind,
  type WindSample,
} from '../utils/windProfile';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/** How many hours ahead the hourly views show. */
export const HOURS = 24;

// Model levels used to build the wind profile.
const HEIGHT_LEVELS = [10, 80, 100, 120, 180] as const; // m above ground
const PRESSURE_LEVELS = [1000, 975, 950, 925, 900, 850] as const; // hPa

export type CurrentWeather = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  pressure: number; // hPa
  cloudCover: number;
  windSpeed: number; // m/s
  windDirection: number;
  windGusts: number;
  weatherCode: number;
  isDay: boolean;
};

export type HourlyPoint = {
  time: string;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  precipitation: number; // mm, all types (snow as water equivalent)
  rain: number; // mm
  showers: number; // mm
  snowfall: number; // cm
  precipitationProbability: number; // %
  cloudCover: number; // %
  windGusts: number; // m/s at 10 m
  wind10: Wind | null;
  /** Aligned with WIND_HEIGHTS; null where it can't be interpolated. */
  windProfile: (Wind | null)[];
};

export type DailyPoint = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
};

export type Forecast = {
  elevation: number;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
};

type Block = Record<string, unknown>;

function query(params: Record<string, string>) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function num(block: Block, key: string, i?: number): number | null {
  const raw = block[key];
  const v = i === undefined ? raw : Array.isArray(raw) ? raw[i] : undefined;
  return typeof v === 'number' ? v : null;
}

function str(block: Block, key: string, i: number): string {
  const raw = block[key];
  return Array.isArray(raw) && typeof raw[i] === 'string' ? raw[i] : '';
}

async function getJson(params: Record<string, string>, signal?: AbortSignal) {
  const res = await fetch(`${BASE_URL}?${query(params)}`, { signal });
  if (!res.ok) {
    let reason = '';
    try {
      reason = (await res.json()).reason ?? '';
    } catch {}
    throw new Error(`Open-Meteo ${res.status}${reason ? `: ${reason}` : ''}`);
  }
  return res.json();
}

/** Index of the hour matching `time` ("YYYY-MM-DDTHH:MM"), or 0. */
function startIndex(times: string[], time: string) {
  const idx = times.findIndex((t) => t.startsWith(time.slice(0, 13)));
  return Math.max(0, idx);
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<Forecast> {
  const hourlyVars = [
    'temperature_2m',
    'weather_code',
    'is_day',
    'precipitation',
    'rain',
    'showers',
    'snowfall',
    'precipitation_probability',
    'cloud_cover',
    'wind_gusts_10m',
    ...HEIGHT_LEVELS.flatMap((h) => [`wind_speed_${h}m`, `wind_direction_${h}m`]),
    ...PRESSURE_LEVELS.flatMap((p) => [
      `wind_speed_${p}hPa`,
      `wind_direction_${p}hPa`,
      `geopotential_height_${p}hPa`,
    ]),
  ];

  const raw = await getJson(
    {
      latitude: String(latitude),
      longitude: String(longitude),
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'pressure_msl',
        'cloud_cover',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'weather_code',
        'is_day',
      ].join(','),
      hourly: hourlyVars.join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'sunrise',
        'sunset',
      ].join(','),
      wind_speed_unit: 'ms',
      timezone: 'auto',
      forecast_days: '7',
    },
    signal,
  );

  const elevation: number = raw.elevation ?? 0;
  const c: Block = raw.current;
  const h: Block = raw.hourly;
  const d: Block = raw.daily;

  const current: CurrentWeather = {
    time: String(c.time),
    temperature: num(c, 'temperature_2m') ?? 0,
    apparentTemperature: num(c, 'apparent_temperature') ?? 0,
    humidity: num(c, 'relative_humidity_2m') ?? 0,
    pressure: num(c, 'pressure_msl') ?? 0,
    cloudCover: num(c, 'cloud_cover') ?? 0,
    windSpeed: num(c, 'wind_speed_10m') ?? 0,
    windDirection: num(c, 'wind_direction_10m') ?? 0,
    windGusts: num(c, 'wind_gusts_10m') ?? 0,
    weatherCode: num(c, 'weather_code') ?? 0,
    isDay: num(c, 'is_day') === 1,
  };

  const times = h.time as string[];
  const start = startIndex(times, current.time);

  const hourly: HourlyPoint[] = times.slice(start, start + HOURS).map((time, k) => {
    const i = start + k;
    const get = (key: string) => num(h, key, i);

    // Height levels first — they're the most accurate near the ground.
    const samples: WindSample[] = [];
    for (const lvl of HEIGHT_LEVELS) {
      const speed = get(`wind_speed_${lvl}m`);
      const direction = get(`wind_direction_${lvl}m`);
      if (speed != null && direction != null) samples.push({ height: lvl, speed, direction });
    }
    // Pressure levels above them; geopotential height is above sea level.
    const top = samples.length ? Math.max(...samples.map((s) => s.height)) : 0;
    for (const p of PRESSURE_LEVELS) {
      const speed = get(`wind_speed_${p}hPa`);
      const direction = get(`wind_direction_${p}hPa`);
      const gph = get(`geopotential_height_${p}hPa`);
      if (speed == null || direction == null || gph == null) continue;
      const agl = gph - elevation;
      if (agl > top + 30) samples.push({ height: agl, speed, direction });
    }

    const w10 = samples.find((s) => s.height === 10);
    return {
      time,
      temperature: get('temperature_2m') ?? 0,
      weatherCode: get('weather_code') ?? 0,
      isDay: get('is_day') === 1,
      precipitation: get('precipitation') ?? 0,
      rain: get('rain') ?? 0,
      showers: get('showers') ?? 0,
      snowfall: get('snowfall') ?? 0,
      precipitationProbability: get('precipitation_probability') ?? 0,
      cloudCover: get('cloud_cover') ?? 0,
      windGusts: get('wind_gusts_10m') ?? 0,
      wind10: w10 ? { speed: w10.speed, direction: w10.direction } : null,
      windProfile: WIND_HEIGHTS.map((target) => interpolateWind(samples, target)),
    };
  });

  const daily: DailyPoint[] = (d.time as string[]).map((date, i) => ({
    date,
    weatherCode: num(d, 'weather_code', i) ?? 0,
    tempMax: num(d, 'temperature_2m_max', i) ?? 0,
    tempMin: num(d, 'temperature_2m_min', i) ?? 0,
    precipitationSum: num(d, 'precipitation_sum', i) ?? 0,
    precipitationProbabilityMax: num(d, 'precipitation_probability_max', i) ?? 0,
    windSpeedMax: num(d, 'wind_speed_10m_max', i) ?? 0,
    sunrise: str(d, 'sunrise', i),
    sunset: str(d, 'sunset', i),
  }));

  return { elevation, current, hourly, daily };
}

// ---------------------------------------------------------------------------
// Cloud cover on a grid of points (for the cloud map).

export type CloudLayer = 'total' | 'low' | 'mid' | 'high';

const CLOUD_VARS: Record<CloudLayer, string> = {
  total: 'cloud_cover',
  low: 'cloud_cover_low',
  mid: 'cloud_cover_mid',
  high: 'cloud_cover_high',
};

export type CloudGrid = {
  times: string[];
  /** layers[layer][hour][point], cover in % */
  layers: Record<CloudLayer, number[][]>;
};

export async function fetchCloudGrid(
  points: { latitude: number; longitude: number }[],
  fromTime: string,
  signal?: AbortSignal,
): Promise<CloudGrid> {
  const raw = await getJson(
    {
      latitude: points.map((p) => p.latitude.toFixed(3)).join(','),
      longitude: points.map((p) => p.longitude.toFixed(3)).join(','),
      hourly: Object.values(CLOUD_VARS).join(','),
      timezone: 'auto',
      forecast_days: '2',
    },
    signal,
  );

  // Several locations come back as an array, one as an object.
  const list: { hourly: Block }[] = Array.isArray(raw) ? raw : [raw];
  const allTimes = list[0].hourly.time as string[];
  const start = startIndex(allTimes, fromTime);
  const times = allTimes.slice(start, start + HOURS);

  const layers = {} as Record<CloudLayer, number[][]>;
  for (const layer of Object.keys(CLOUD_VARS) as CloudLayer[]) {
    layers[layer] = times.map((_, k) =>
      list.map((loc) => num(loc.hourly, CLOUD_VARS[layer], start + k) ?? 0),
    );
  }
  return { times, layers };
}
