// Shared building blocks for "row × hour" cards (wind, precipitation).
import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { HourlyPoint } from '../api/openMeteo';
import { hourLabel, hourShort, weekday } from '../utils/format';

export const CELL_W = 48;
export const CELL_H = 36;
const CHIP_W = 56;
const HEADER_H = 24;

export function hourName(h: HourlyPoint, i: number) {
  if (i === 0) return 'Зараз';
  return hourShort(h.time) === '00' ? weekday(h.time) : hourShort(h.time);
}

export function selectedTitle(h: HourlyPoint, i: number) {
  return i === 0 ? `Зараз, ${hourLabel(h.time)}` : `${weekday(h.time)}, ${hourLabel(h.time)}`;
}

function useScrollToSelected(selected: number, step: number) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    ref.current?.scrollTo({ x: Math.max(0, (selected - 2) * step), animated: true });
  }, [selected, step]);
  return ref;
}

type SelectorProps = {
  hourly: HourlyPoint[];
  selected: number;
  onSelect: (i: number) => void;
};

/** Horizontal row of hour chips. */
export function HourSelector({ hourly, selected, onSelect }: SelectorProps) {
  const ref = useScrollToSelected(selected, CHIP_W);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-1.5">
        {hourly.map((h, i) => {
          const active = i === selected;
          return (
            <Pressable
              key={h.time}
              onPress={() => onSelect(i)}
              style={{ width: CHIP_W - 6 }}
              className={`items-center rounded-xl py-2 ${active ? 'bg-white/90' : 'bg-white/10'}`}
            >
              <Text className={`text-xs font-semibold ${active ? 'text-ink-dark' : 'text-ink'}`}>
                {hourName(h, i)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export type GridRow = {
  key: string;
  label: string;
  /** Muted label, e.g. for the ground level. */
  dim?: boolean;
  /** Extra space above this row, to separate groups. */
  gapBefore?: boolean;
  render: (h: HourlyPoint, i: number) => ReactNode;
};

type GridProps = SelectorProps & { rows: GridRow[]; labelWidth?: number };

/** Fixed label column + horizontally scrolling hour columns; tap a column to select it. */
export function HourGrid({ hourly, selected, onSelect, rows, labelWidth = 56 }: GridProps) {
  const ref = useScrollToSelected(selected, CELL_W);
  return (
    <View className="flex-row">
      <View style={{ width: labelWidth }}>
        <View style={{ height: HEADER_H }} />
        {rows.map((r) => (
          <View key={r.key} style={{ height: CELL_H, marginTop: r.gapBefore ? 6 : 0 }} className="justify-center">
            <Text className={`text-xs font-semibold ${r.dim ? 'text-ink-muted' : 'text-ink'}`} numberOfLines={2}>
              {r.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false}>
        {hourly.map((h, i) => {
          const active = i === selected;
          return (
            <Pressable
              key={h.time}
              onPress={() => onSelect(i)}
              style={{ width: CELL_W }}
              className={`items-center rounded-xl ${active ? 'bg-white/20' : ''}`}
            >
              <View style={{ height: HEADER_H }} className="justify-center">
                <Text className={`text-[11px] ${active || i === 0 ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                  {hourName(h, i)}
                </Text>
              </View>
              {rows.map((r) => (
                <View key={r.key} style={{ marginTop: r.gapBefore ? 6 : 0 }}>
                  {r.render(h, i)}
                </View>
              ))}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Coloured cell for HourGrid. `color` null renders an empty "—" cell. */
export function GridCell({
  color,
  dark,
  children,
}: {
  color: string | null;
  /** Dark text for light backgrounds. */
  dark?: boolean;
  children?: ReactNode;
}) {
  return (
    <View
      style={{ width: CELL_W - 4, height: CELL_H - 4, margin: 2, backgroundColor: color ?? 'rgba(255,255,255,0.08)' }}
      className="flex-row items-center justify-center gap-0.5 rounded-lg"
    >
      {color === null ? (
        <Text className="text-xs text-ink-faint">–</Text>
      ) : typeof children === 'string' ? (
        <Text className={`text-xs font-bold ${dark ? 'text-ink-dark' : 'text-ink'}`}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/** One "label | bar | value" line used in the selected-hour panels. */
export function BarRow({
  label,
  hint,
  pct,
  color,
  value,
  valueSub,
  trailing,
  dim,
}: {
  label: string;
  hint?: string;
  pct: number;
  color: string;
  value: string;
  valueSub?: string;
  trailing?: ReactNode;
  dim?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-2.5 py-0.5">
      <View className="w-[88px]">
        <Text className={`text-sm font-bold ${dim ? 'text-ink-muted' : 'text-ink'}`}>{label}</Text>
        {hint ? (
          <Text className="text-[10px] text-ink-faint" numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View className="h-[22px] flex-1 justify-center overflow-hidden rounded-full bg-white/10">
        {pct > 0 && (
          <View className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
        )}
      </View>
      <View className="w-[62px] items-end">
        <Text className="text-sm font-bold text-ink">{value}</Text>
        {valueSub ? <Text className="text-[10px] text-ink-faint">{valueSub}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

/** Bulleted plain-language summary. */
export function Bullets({ lines }: { lines: string[] }) {
  return (
    <View className="gap-1.5">
      {lines.map((line) => (
        <View key={line} className="flex-row gap-2">
          <Text className="text-ink-muted">•</Text>
          <Text className="flex-1 text-[13px] leading-5 text-ink">{line}</Text>
        </View>
      ))}
    </View>
  );
}
