import { Text, View } from 'react-native';
import { Navigation2 } from 'lucide-react-native';
import type { Place } from '../api/geocode';
import type { CurrentWeather, DailyPoint } from '../api/openMeteo';
import { colors } from '../theme';
import { hourLabel, ms, round } from '../utils/format';
import { describeWeather } from '../utils/weatherCodes';
import { directionName } from '../utils/windProfile';
import { Icon3D, WeatherIcon, type Icon3DName } from './Icon3D';

type Props = {
  current: CurrentWeather;
  today?: DailyPoint;
  place: Place;
  usingFallback: boolean;
};

type Stat = { icon: Icon3DName; label: string; value: string; sub?: string; arrow?: number };

export function CurrentHero({ current, today, place, usingFallback }: Props) {
  const stats: Stat[] = [
    { icon: 'thermometer', label: 'Відчувається', value: `${round(current.apparentTemperature)}°` },
    { icon: 'droplet', label: 'Вологість', value: `${round(current.humidity)}%` },
    { icon: 'cloud', label: 'Хмарність', value: `${round(current.cloudCover)}%` },
    {
      icon: 'compass',
      label: 'Вітер',
      value: `${ms(current.windSpeed)} м/с`,
      sub: directionName(current.windDirection),
      arrow: current.windDirection,
    },
    { icon: 'dashing_away', label: 'Пориви', value: `${ms(current.windGusts)} м/с` },
    // hPa -> mmHg, the unit people in Ukraine are used to.
    { icon: 'balance_scale', label: 'Тиск', value: `${round(current.pressure * 0.750062)}`, sub: 'мм рт. ст.' },
  ];

  return (
    <View className="items-center gap-1 pt-4">
      <View className="flex-row items-center gap-1.5">
        <Icon3D name="round_pushpin" size={24} />
        <Text className="text-[24px] font-semibold text-ink" numberOfLines={1}>
          {place.name}
        </Text>
      </View>
      {place.region ? <Text className="text-[13px] text-ink-muted">{place.region}</Text> : null}
      {usingFallback && (
        <Text className="text-[13px] text-ink-faint">Немає доступу до геолокації — показано Київ</Text>
      )}

      <View className="mt-2 flex-row items-center gap-3">
        <WeatherIcon code={current.weatherCode} isDay={current.isDay} size={104} />
        <Text className="text-[96px] font-extralight tracking-tighter text-ink">{round(current.temperature)}°</Text>
      </View>
      <Text className="text-xl font-medium text-ink">{describeWeather(current.weatherCode).label}</Text>

      {today && (
        <View className="mt-1 flex-row flex-wrap items-center justify-center gap-3">
          <Text className="text-sm text-ink-muted">
            Макс. {round(today.tempMax)}° · Мін. {round(today.tempMin)}°
          </Text>
          {today.sunrise ? (
            <View className="flex-row items-center gap-1">
              <Icon3D name="sunrise" size={18} />
              <Text className="text-sm text-ink-muted">{hourLabel(today.sunrise)}</Text>
              <View className="w-2" />
              <Icon3D name="sunset" size={18} />
              <Text className="text-sm text-ink-muted">{hourLabel(today.sunset)}</Text>
            </View>
          ) : null}
        </View>
      )}

      <View className="mt-5 w-full flex-row flex-wrap justify-between gap-y-2.5">
        {stats.map(({ icon, label, value, sub, arrow }) => (
          <View
            key={label}
            className="w-[31.5%] gap-1 rounded-2xl border-[0.5px] border-glass-border bg-glass px-2.5 py-2.5"
          >
            <View className="flex-row items-center gap-1.5">
              <Icon3D name={icon} size={22} />
              <Text className="flex-1 text-[11px] text-ink-faint" numberOfLines={1}>
                {label}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              {arrow !== undefined && (
                <View style={{ transform: [{ rotate: `${arrow + 180}deg` }] }}>
                  <Navigation2 size={13} color={colors.accent} fill={colors.accent} />
                </View>
              )}
              <Text className="text-[17px] font-semibold text-ink">{value}</Text>
            </View>
            {sub && <Text className="text-[11px] text-ink-faint">{sub}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}
