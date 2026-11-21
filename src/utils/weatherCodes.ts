// WMO weather interpretation codes used by Open-Meteo.
import type { Icon3DName } from '../components/Icon3D';

type IconSpec = { icon: Icon3DName; overlay?: Icon3DName };
type WeatherInfo = { label: string; day: IconSpec; night?: IconSpec };

const MOON_CLOUD: IconSpec = { icon: 'crescent_moon', overlay: 'cloud' };
const RAIN_SUN: IconSpec = { icon: 'sun_behind_rain_cloud' };
const RAIN: IconSpec = { icon: 'cloud_with_rain' };
const SNOW: IconSpec = { icon: 'cloud_with_snow' };
const STORM: IconSpec = { icon: 'cloud_with_lightning_and_rain' };

const CODES: Record<number, WeatherInfo> = {
  0: { label: 'Ясно', day: { icon: 'sun' }, night: { icon: 'crescent_moon' } },
  1: { label: 'Переважно ясно', day: { icon: 'sun_behind_small_cloud' }, night: MOON_CLOUD },
  2: { label: 'Мінлива хмарність', day: { icon: 'sun_behind_cloud' }, night: MOON_CLOUD },
  3: { label: 'Хмарно', day: { icon: 'cloud' } },
  45: { label: 'Туман', day: { icon: 'fog' } },
  48: { label: 'Паморозевий туман', day: { icon: 'fog' } },
  51: { label: 'Слабка мряка', day: RAIN_SUN, night: RAIN },
  53: { label: 'Мряка', day: RAIN },
  55: { label: 'Сильна мряка', day: RAIN },
  56: { label: 'Крижана мряка', day: RAIN },
  57: { label: 'Сильна крижана мряка', day: RAIN },
  61: { label: 'Невеликий дощ', day: RAIN_SUN, night: RAIN },
  63: { label: 'Дощ', day: RAIN },
  65: { label: 'Сильний дощ', day: RAIN },
  66: { label: 'Крижаний дощ', day: RAIN },
  67: { label: 'Сильний крижаний дощ', day: RAIN },
  71: { label: 'Невеликий сніг', day: SNOW },
  73: { label: 'Сніг', day: SNOW },
  75: { label: 'Сильний сніг', day: { icon: 'snowflake' } },
  77: { label: 'Снігова крупа', day: SNOW },
  80: { label: 'Короткочасний дощ', day: RAIN_SUN, night: RAIN },
  81: { label: 'Злива', day: RAIN },
  82: { label: 'Сильна злива', day: STORM },
  85: { label: 'Снігопад', day: SNOW },
  86: { label: 'Сильний снігопад', day: { icon: 'snowflake' } },
  95: { label: 'Гроза', day: STORM },
  96: { label: 'Гроза з градом', day: STORM },
  99: { label: 'Сильна гроза з градом', day: STORM },
};

const UNKNOWN: WeatherInfo = { label: 'Невідомо', day: { icon: 'cloud' } };

export function describeWeather(code: number) {
  return { label: (CODES[code] ?? UNKNOWN).label };
}

export function weatherIcon(code: number, isDay = true): IconSpec {
  const info = CODES[code] ?? UNKNOWN;
  return !isDay && info.night ? info.night : info.day;
}
