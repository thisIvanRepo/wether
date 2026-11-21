import { ScrollView, Text, View } from 'react-native';
import type { HourlyPoint } from '../api/openMeteo';
import { hourShort, round, weekday } from '../utils/format';
import { Card } from './Card';
import { WeatherIcon } from './Icon3D';

export function HourlyStrip({ hourly }: { hourly: HourlyPoint[] }) {
  return (
    <Card title="Погодинно" icon="mantelpiece_clock">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {hourly.map((h, i) => {
          const newDay = i > 0 && hourShort(h.time) === '00';
          return (
            <View
              key={h.time}
              className={`w-[56px] items-center gap-1.5 ${newDay ? 'border-l-[0.5px] border-glass-border' : ''}`}
            >
              <Text className={`text-[13px] ${i === 0 ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                {i === 0 ? 'Зараз' : newDay ? weekday(h.time) : hourShort(h.time)}
              </Text>
              <WeatherIcon code={h.weatherCode} isDay={h.isDay} size={34} />
              <Text className="text-[17px] font-semibold text-ink">{round(h.temperature)}°</Text>
              <Text className="text-[11px] font-semibold text-rain">
                {h.precipitationProbability >= 10 ? `${round(h.precipitationProbability)}%` : ' '}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </Card>
  );
}
