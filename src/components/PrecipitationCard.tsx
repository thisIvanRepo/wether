import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Info } from 'lucide-react-native';
import { HOURS, type HourlyPoint } from '../api/openMeteo';
import { colors } from '../theme';
import { hourLabel, mm, round, weekday } from '../utils/format';
import {
  KIND_ICON,
  KIND_LABEL,
  PRECIP_LEVELS,
  analyzePrecipitation,
  cumulative,
  intensityLabel,
  precipKind,
  precipLevel,
  probabilityColor,
  probabilityWord,
  snowColor,
} from '../utils/precipitation';
import { describePrecipHour } from '../utils/precipSummary';
import { Card } from './Card';
import { BarRow, Bullets, GridCell, HourGrid, HourSelector, selectedTitle, type GridRow } from './HourGrid';
import { Icon3D } from './Icon3D';

/** Values below this are shown as "–" in the grid. */
const SHOW_MIN = 0.05;

export function PrecipitationCard({ hourly }: { hourly: HourlyPoint[] }) {
  const [selected, setSelected] = useState(0);
  const summary = useMemo(() => analyzePrecipitation(hourly), [hourly]);
  const sums = useMemo(() => cumulative(hourly), [hourly]);

  // Fixed scales across hours so switching hours compares like with like.
  const mmMax = Math.max(2, ...hourly.map((h) => h.precipitation));
  const snowMax = Math.max(2, ...hourly.map((h) => h.snowfall));
  const total = sums[sums.length - 1] ?? 0;

  const rows: GridRow[] = useMemo(
    () => [
      {
        key: 'prob',
        label: 'Ймовірн., %',
        render: (h) => <GridCell color={probabilityColor(h.precipitationProbability)}>{String(round(h.precipitationProbability))}</GridCell>,
      },
      {
        key: 'total',
        label: 'Опади, мм',
        gapBefore: true,
        render: (h) => {
          const lvl = precipLevel(h.precipitation);
          return <GridCell color={lvl ? lvl.color : null}>{mm(h.precipitation)}</GridCell>;
        },
      },
      {
        key: 'rain',
        label: 'Дощ',
        dim: true,
        render: (h) => <GridCell color={h.rain >= SHOW_MIN ? `${colors.rain}b0` : null}>{mm(h.rain)}</GridCell>,
      },
      {
        key: 'showers',
        label: 'Злива',
        dim: true,
        render: (h) => <GridCell color={h.showers >= SHOW_MIN ? `${colors.showers}c0` : null}>{mm(h.showers)}</GridCell>,
      },
      {
        key: 'snow',
        label: 'Сніг, см',
        dim: true,
        render: (h) => (
          <GridCell color={h.snowfall >= SHOW_MIN ? snowColor(h.snowfall) : null} dark>
            {mm(h.snowfall)}
          </GridCell>
        ),
      },
      {
        key: 'sum',
        label: 'Накопич., мм',
        gapBefore: true,
        render: (h, i) => {
          const v = sums[i];
          const a = total > 0 ? 0.2 + (v / total) * 0.6 : 0;
          return <GridCell color={v >= SHOW_MIN ? `rgba(124,196,255,${a.toFixed(2)})` : null}>{mm(v)}</GridCell>;
        },
      },
    ],
    [sums, total],
  );

  const hour = hourly[selected] ?? hourly[0];
  if (!hour) return null;
  const kind = precipKind(hour);
  const level = precipLevel(hour.precipitation);
  const firstDay = weekday(hourly[0].time);

  return (
    <Card title="Опади" icon="umbrella_with_rain_drops">
      {/* 24 h overview */}
      {summary.periods.length === 0 ? (
        <View className="gap-1">
          <Text className="text-[17px] font-semibold text-ink">Найближчі {HOURS} год без опадів</Text>
          <Text className="text-[13px] text-ink-muted">Максимальна ймовірність — {round(summary.maxProbability)}%</Text>
        </View>
      ) : (
        <View className="gap-2.5">
          <View className="flex-row gap-2">
            <Total label={`Всього за ${HOURS} год`} value={`${mm(summary.total)} мм`} />
            <Total label="Годин з опадами" value={String(summary.wetHours)} />
            {summary.snow > 0 ? (
              <Total label="Сніг" value={`${mm(summary.snow)} см`} />
            ) : (
              <Total label="Макс. ймовірність" value={`${round(summary.maxProbability)}%`} />
            )}
          </View>
          {summary.periods.map((p) => (
            <View key={p.startTime} className="flex-row items-center gap-2.5 rounded-2xl bg-white/10 p-2.5">
              <Icon3D name={KIND_ICON[p.kind]} size={34} />
              <View className="flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold text-ink">
                  {KIND_LABEL[p.kind]} · {hourLabel(p.startTime)}–{hourLabel(p.endTime)}
                  {weekday(p.startTime) !== firstDay ? ` (${weekday(p.startTime)})` : ''}
                </Text>
                <Text className="text-[13px] leading-[18px] text-ink-muted">
                  {mm(p.total)} мм за {p.hours} год{p.snow > 0 ? ` (сніг ${mm(p.snow)} см)` : ''} · пік{' '}
                  {mm(p.peak)} мм/год о {hourLabel(p.peakTime)}, {intensityLabel(p.peak)} · ймовірність до{' '}
                  {round(p.maxProbability)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Selected hour */}
      <HourSelector hourly={hourly} selected={selected} onSelect={setSelected} />
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink">{selectedTitle(hour, selected)}</Text>
        <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1.5 pr-3">
          <Icon3D name={kind ? KIND_ICON[kind] : 'sun_behind_small_cloud'} size={20} />
          <Text className="text-xs font-semibold text-ink">{kind ? KIND_LABEL[kind] : 'Без опадів'}</Text>
        </View>
      </View>

      <View className="gap-1 rounded-2xl bg-black/15 p-3">
        <BarRow
          label="Ймовірність"
          hint={probabilityWord(hour.precipitationProbability)}
          pct={hour.precipitationProbability}
          color={colors.rain}
          value={`${round(hour.precipitationProbability)}%`}
        />
        <BarRow
          label="Опади"
          hint="за годину"
          pct={(hour.precipitation / mmMax) * 100}
          color={level?.color ?? 'transparent'}
          value={`${mm(hour.precipitation)} мм`}
          valueSub={intensityLabel(hour.precipitation)}
        />
        <BarRow label="Дощ" dim pct={(hour.rain / mmMax) * 100} color={colors.rain} value={`${mm(hour.rain)} мм`} />
        <BarRow
          label="Злива"
          dim
          pct={(hour.showers / mmMax) * 100}
          color={colors.showers}
          value={`${mm(hour.showers)} мм`}
        />
        <BarRow
          label="Сніг"
          dim
          pct={(hour.snowfall / snowMax) * 100}
          color={colors.snow}
          value={`${mm(hour.snowfall)} см`}
        />
        <View className="my-1 h-px bg-white/10" />
        <BarRow
          label="Накопичено"
          hint={selected === 0 ? 'за цю годину' : `від зараз до ${hourLabel(hour.time)}`}
          pct={total > 0 ? (sums[selected] / total) * 100 : 0}
          color="#7cc4ff"
          value={`${mm(sums[selected])} мм`}
          valueSub={`з ${mm(total)} за добу`}
        />
      </View>

      <Bullets lines={describePrecipHour(hourly, selected)} />

      <View className="flex-row flex-wrap gap-x-3 gap-y-1.5">
        {PRECIP_LEVELS.map((lvl, i) => {
          const next = PRECIP_LEVELS[i + 1]?.min;
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
      <HourGrid hourly={hourly} selected={selected} onSelect={setSelected} rows={rows} labelWidth={72} />

      <View className="flex-row gap-2 rounded-xl bg-white/10 p-2.5">
        <Info size={14} color={colors.muted} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11px] leading-4 text-ink-muted">
          Інтенсивність — мм за годину. «Опади» включають сніг у перерахунку на воду, тому сніг окремо показано в
          см. Ймовірність — шанс, що в цю годину буде хоча б 0,1 мм.
        </Text>
      </View>
    </Card>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-white/10 px-2.5 py-2">
      <Text className="text-lg font-bold text-ink">{value}</Text>
      <Text className="text-[11px] text-ink-faint">{label}</Text>
    </View>
  );
}
