import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Info, Navigation2 } from 'lucide-react-native';
import type { HourlyPoint } from '../api/openMeteo';
import { colors } from '../theme';
import { ms } from '../utils/format';
import { WIND_HEIGHTS, WIND_LEVELS, compass, windLevel, type Wind } from '../utils/windProfile';
import { describeWindHour } from '../utils/windSummary';
import { Card } from './Card';
import { BarRow, Bullets, GridCell, HourGrid, HourSelector, selectedTitle, type GridRow } from './HourGrid';

/** Everyday references so the heights mean something. */
const HEIGHT_HINT: Record<number, string> = {
  1000: 'низькі хмари',
  600: 'висота парапланів',
  300: 'Ейфелева вежа',
  150: 'кінчик лопаті вітряка',
  100: 'вісь вітряка',
  50: '≈ 16 поверхів',
  10: 'біля землі',
};

type Level = { height: number; wind: Wind | null };

/** Top → bottom, like looking up into the sky. */
function levelsFor(h: HourlyPoint): Level[] {
  return [
    ...WIND_HEIGHTS.map((height, i) => ({ height, wind: h.windProfile[i] })).reverse(),
    { height: 10, wind: h.wind10 },
  ];
}

const ROWS: GridRow[] = [
  ...[...WIND_HEIGHTS, 10]
    .sort((a, b) => b - a)
    .map((height) => ({
      key: String(height),
      label: `${height} м`,
      dim: height === 10,
      render: (h: HourlyPoint) => {
        const wind = levelsFor(h).find((l) => l.height === height)?.wind ?? null;
        return (
          <GridCell color={wind ? `${windLevel(wind.speed).color}c0` : null}>
            {wind && (
              <>
                <Arrow direction={wind.direction} size={10} />
                <Text className="text-xs font-bold text-ink">{ms(wind.speed)}</Text>
              </>
            )}
          </GridCell>
        );
      },
    })),
  {
    key: 'gusts',
    label: 'Пориви',
    dim: true,
    gapBefore: true,
    render: (h) => <GridCell color={`${windLevel(h.windGusts).color}c0`}>{ms(h.windGusts)}</GridCell>,
  },
];

export function WindProfileCard({ hourly }: { hourly: HourlyPoint[] }) {
  const [selected, setSelected] = useState(0);

  // One scale for all hours so bars are comparable when switching hours.
  const scaleMax = useMemo(() => {
    const all = hourly.flatMap((h) => levelsFor(h).map((l) => l.wind?.speed ?? 0));
    return Math.max(10, ...all);
  }, [hourly]);

  const hour = hourly[selected] ?? hourly[0];
  if (!hour) return null;

  return (
    <Card title="Вітер на висотах" icon="wind_face" right={<Text className="text-xs text-ink-faint">м/с</Text>}>
      <HourSelector hourly={hourly} selected={selected} onSelect={setSelected} />
      <Text className="text-[15px] font-bold text-ink">{selectedTitle(hour, selected)}</Text>

      {/* Vertical profile for the selected hour */}
      <View className="gap-1 rounded-2xl bg-black/15 p-3">
        {levelsFor(hour).map(({ height, wind }) => (
          <BarRow
            key={height}
            label={`${height} м`}
            hint={HEIGHT_HINT[height]}
            dim={height === 10}
            pct={wind ? Math.max(4, (wind.speed / scaleMax) * 100) : 0}
            color={wind ? windLevel(wind.speed).color : 'transparent'}
            value={wind ? ms(wind.speed) : '—'}
            valueSub={wind ? windLevel(wind.speed).label.toLowerCase() : undefined}
            trailing={
              <View className="w-11 items-center">
                {wind && (
                  <>
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-white/15">
                      <Arrow direction={wind.direction} size={15} color={colors.accent} />
                    </View>
                    <Text className="text-[9px] text-ink-faint">{compass(wind.direction)}</Text>
                  </>
                )}
              </View>
            }
          />
        ))}
        <View className="mt-1 h-1 rounded-full bg-emerald-300/40" />
        <Text className="text-center text-[10px] uppercase tracking-widest text-ink-faint">земля</Text>
      </View>

      <Bullets lines={describeWindHour(hour)} />

      <View className="flex-row flex-wrap gap-x-3 gap-y-1.5">
        {WIND_LEVELS.map((lvl, i) => {
          const next = WIND_LEVELS[i + 1]?.min;
          return (
            <View key={lvl.min} className="flex-row items-center gap-1.5">
              <View className="h-3 w-3 rounded" style={{ backgroundColor: lvl.color }} />
              <Text className="text-xs text-ink-muted">
                {lvl.label} <Text className="text-ink-faint">{next ? `${lvl.min}–${next}` : `${lvl.min}+`}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
        По годинах · торкніться стовпця
      </Text>
      <HourGrid hourly={hourly} selected={selected} onSelect={setSelected} rows={ROWS} />

      <View className="flex-row gap-2 rounded-xl bg-white/10 p-2.5">
        <Info size={14} color={colors.muted} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11px] leading-4 text-ink-muted">
          Стрілка показує, куди дме вітер. «Західний» вітер дме із заходу на схід. Висота — над поверхнею.
          Між рівнями моделі (10–180 м і 975–850 гПа) значення інтерпольовані, тож це орієнтир.
        </Text>
      </View>
    </Card>
  );
}

function Arrow({ direction, size, color = '#fff' }: { direction: number; size: number; color?: string }) {
  // Navigation2 points north; wind "from 270°" blows towards 90°.
  return (
    <View style={{ transform: [{ rotate: `${direction + 180}deg` }] }}>
      <Navigation2 size={size} color={color} fill={color} strokeWidth={1.5} />
    </View>
  );
}
