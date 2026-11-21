import { Text, View } from 'react-native';
import type { DailyPoint } from '../api/openMeteo';
import { mm, round, weekday } from '../utils/format';
import { Card } from './Card';
import { WeatherIcon } from './Icon3D';

export function DailyCard({ daily }: { daily: DailyPoint[] }) {
  const weekMin = Math.min(...daily.map((d) => d.tempMin));
  const weekMax = Math.max(...daily.map((d) => d.tempMax));
  const range = Math.max(1, weekMax - weekMin);

  return (
    <Card title="Прогноз на 7 днів" icon="spiral_calendar">
      {daily.map((d, i) => {
        const left = ((d.tempMin - weekMin) / range) * 100;
        const width = Math.max(4, ((d.tempMax - d.tempMin) / range) * 100);
        return (
          <View
            key={d.date}
            className={`flex-row items-center gap-2 py-2 ${i > 0 ? 'border-t-[0.5px] border-glass-border' : ''}`}
          >
            <Text className="w-[78px] text-base font-semibold text-ink">{i === 0 ? 'Сьогодні' : weekday(d.date)}</Text>
            <View className="w-[92px] items-start">
              <WeatherIcon code={d.weatherCode} size={30} />
              {d.precipitationSum >= 0.1 && (
                <Text className="text-[10px] font-semibold text-rain">
                  {mm(d.precipitationSum)} мм · {round(d.precipitationProbabilityMax)}%
                </Text>
              )}
            </View>
            <Text className="w-[34px] text-right text-[15px] text-ink-muted">{round(d.tempMin)}°</Text>
            <View className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/15">
              <View
                className="absolute bottom-0 top-0 rounded-full bg-accent"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </View>
            <Text className="w-[34px] text-[15px] font-semibold text-ink">{round(d.tempMax)}°</Text>
          </View>
        );
      })}
    </Card>
  );
}
