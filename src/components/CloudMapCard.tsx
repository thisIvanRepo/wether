import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Pause, Play } from 'lucide-react-native';
import { fetchCloudGrid, type CloudGrid, type CloudLayer } from '../api/openMeteo';
import { colors } from '../theme';
import { hourLabel, hourShort, round, weekday } from '../utils/format';
import { Card, Chip } from './Card';

// --- Map geometry (Web Mercator, the same projection as map tiles) ---------
const TILE = 256;
const ZOOM = 7;
const WORLD = TILE * 2 ** ZOOM;
/** Width/height of the visible area in world pixels at ZOOM (~300 km at 50°N). */
const SPAN = 384;
/** Forecast points per side (GRID × GRID locations in one API call). */
const GRID = 10;
/** Each grid cell is drawn as SUB × SUB smoothed sub-cells. */
const SUB = 2;
const CHIP_W = 52;
const RAD = Math.PI / 180;

const BASE_TILES = 'https://basemaps.cartocdn.com/dark_nolabels';
const LABEL_TILES = 'https://basemaps.cartocdn.com/dark_only_labels';

function project(lat: number, lon: number) {
  const s = Math.sin(lat * RAD);
  return {
    x: ((lon + 180) / 360) * WORLD,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD,
  };
}

function unproject(x: number, y: number) {
  const m = Math.PI * (1 - (2 * y) / WORLD);
  return { latitude: Math.atan(Math.sinh(m)) / RAD, longitude: (x / WORLD) * 360 - 180 };
}

/** Bilinear interpolation inside the GRID × GRID values (grid coordinates). */
function sample(values: number[], gx: number, gy: number) {
  const cx = Math.min(Math.max(gx, 0), GRID - 1);
  const cy = Math.min(Math.max(gy, 0), GRID - 1);
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(x0 + 1, GRID - 1);
  const y1 = Math.min(y0 + 1, GRID - 1);
  const tx = cx - x0;
  const ty = cy - y0;
  const v = (x: number, y: number) => values[y * GRID + x] ?? 0;
  return (v(x0, y0) * (1 - tx) + v(x1, y0) * tx) * (1 - ty) + (v(x0, y1) * (1 - tx) + v(x1, y1) * tx) * ty;
}

const LAYERS: { key: CloudLayer; label: string }[] = [
  { key: 'total', label: 'Загальна' },
  { key: 'low', label: 'Низька' },
  { key: 'mid', label: 'Середня' },
  { key: 'high', label: 'Висока' },
];

type Props = { latitude: number; longitude: number; startTime: string };

export function CloudMapCard({ latitude, longitude, startTime }: Props) {
  const [width, setWidth] = useState(0);
  const [grid, setGrid] = useState<CloudGrid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hour, setHour] = useState(0);
  const [layer, setLayer] = useState<CloudLayer>('total');
  const [playing, setPlaying] = useState(false);
  const chipsRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // Top-left corner of the visible area, in world pixels.
  const origin = useMemo(() => {
    const c = project(latitude, longitude);
    return { x: c.x - SPAN / 2, y: c.y - SPAN / 2 };
  }, [latitude, longitude]);

  // Forecast points: centres of a GRID × GRID raster over the visible area.
  const points = useMemo(() => {
    const step = SPAN / GRID;
    const list = [];
    for (let gy = 0; gy < GRID; gy++)
      for (let gx = 0; gx < GRID; gx++)
        list.push(unproject(origin.x + (gx + 0.5) * step, origin.y + (gy + 0.5) * step));
    return list;
  }, [origin]);

  useEffect(() => {
    const controller = new AbortController();
    setGrid(null);
    setError(null);
    fetchCloudGrid(points, startTime, controller.signal)
      .then((g) => {
        setGrid(g);
        setHour((h) => Math.min(h, Math.max(0, g.times.length - 1)));
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Не вдалося завантажити хмарність');
        }
      });
    return () => controller.abort();
  }, [points, startTime, reloadKey]);

  // Playback.
  useEffect(() => {
    if (!playing || !grid) return;
    const id = setInterval(() => setHour((h) => (h + 1) % grid.times.length), 800);
    return () => clearInterval(id);
  }, [playing, grid]);

  // Keep the selected hour chip in view.
  useEffect(() => {
    chipsRef.current?.scrollTo({ x: Math.max(0, (hour - 2) * CHIP_W), animated: true });
  }, [hour]);

  const scale = width / SPAN;

  const tiles = useMemo(() => {
    if (!width) return [];
    const list = [];
    const x0 = Math.floor(origin.x / TILE);
    const x1 = Math.floor((origin.x + SPAN) / TILE);
    const y0 = Math.floor(origin.y / TILE);
    const y1 = Math.floor((origin.y + SPAN) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        list.push({
          key: `${tx}-${ty}`,
          path: `${ZOOM}/${tx}/${ty}@2x.png`,
          left: (tx * TILE - origin.x) * scale,
          top: (ty * TILE - origin.y) * scale,
          size: TILE * scale,
        });
    return list;
  }, [origin, scale, width]);

  const values = grid?.layers[layer][hour];

  const cells = useMemo(() => {
    if (!values || !width) return [];
    const n = GRID * SUB;
    const size = width / n;
    const list = [];
    for (let fy = 0; fy < n; fy++)
      for (let fx = 0; fx < n; fx++) {
        const v = sample(values, (fx + 0.5) / SUB - 0.5, (fy + 0.5) / SUB - 0.5);
        list.push({ key: fy * n + fx, left: fx * size, top: fy * size, size, opacity: (v / 100) * 0.85 });
      }
    return list;
  }, [values, width]);

  const here = values ? sample(values, (GRID - 1) / 2, (GRID - 1) / 2) : 0;
  const avg = values ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const time = grid?.times[hour];

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <Card title="Карта хмарності" icon="cloud">
      <View className="flex-row flex-wrap gap-1.5">
        {LAYERS.map((l) => (
          <Chip key={l.key} label={l.label} active={l.key === layer} onPress={() => setLayer(l.key)} />
        ))}
      </View>

      {/* Map */}
      <View
        className="w-full overflow-hidden rounded-2xl bg-[#0e1116]"
        style={{ height: width || 300 }}
        onLayout={onLayout}
      >
        {tiles.map((t) => (
          <Image
            key={`b${t.key}`}
            source={{ uri: `${BASE_TILES}/${t.path}` }}
            style={{ position: 'absolute', left: t.left, top: t.top, width: t.size, height: t.size }}
          />
        ))}
        {cells.map((c) => (
          <View
            key={c.key}
            style={{
              position: 'absolute',
              backgroundColor: '#fff',
              left: c.left,
              top: c.top,
              width: c.size + 0.5,
              height: c.size + 0.5,
              opacity: c.opacity,
            }}
          />
        ))}
        {tiles.map((t) => (
          <Image
            key={`l${t.key}`}
            source={{ uri: `${LABEL_TILES}/${t.path}` }}
            style={{ position: 'absolute', left: t.left, top: t.top, width: t.size, height: t.size }}
          />
        ))}
        {width > 0 && (
          <View
            className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-accent"
            style={{ left: width / 2 - 7, top: width / 2 - 7 }}
          />
        )}

        {!grid && !error && (
          <View className="absolute inset-0 items-center justify-center gap-2.5 bg-black/35 p-4">
            <ActivityIndicator color="#fff" />
            <Text className="text-center text-sm text-ink">Завантаження хмарності…</Text>
          </View>
        )}
        {error && (
          <View className="absolute inset-0 items-center justify-center gap-2.5 bg-black/35 p-4">
            <Text className="text-center text-sm text-ink">{error}</Text>
            <Chip label="Спробувати ще раз" active onPress={() => setReloadKey((k) => k + 1)} />
          </View>
        )}
        <Text className="absolute bottom-1 right-1.5 text-[9px] text-white/60">
          © OpenStreetMap © CARTO · Open-Meteo
        </Text>
      </View>

      {time && (
        <View className="flex-row items-baseline justify-between">
          <Text className="text-[17px] font-bold text-ink">
            {weekday(time)}, {hourLabel(time)}
          </Text>
          <Text className="text-[13px] text-ink-muted">
            у вас {round(here)}% · по карті {round(avg)}%
          </Text>
        </View>
      )}

      {grid && (
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setPlaying((p) => !p)}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/90"
          >
            {playing ? (
              <Pause size={16} color={colors.chipActiveText} fill={colors.chipActiveText} />
            ) : (
              <Play size={16} color={colors.chipActiveText} fill={colors.chipActiveText} />
            )}
          </Pressable>
          <ScrollView ref={chipsRef} horizontal showsHorizontalScrollIndicator={false}>
            {grid.times.map((t, i) => {
              const active = i === hour;
              const newDay = i > 0 && hourShort(t) === '00';
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    setPlaying(false);
                    setHour(i);
                  }}
                  style={{ width: CHIP_W - 4 }}
                  className={`mx-0.5 items-center rounded-xl py-2 ${active ? 'bg-white/90' : 'bg-white/10'}`}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-ink-dark' : 'text-ink'}`}>
                    {i === 0 ? 'Зараз' : newDay ? weekday(t) : hourShort(t)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View className="flex-row flex-wrap gap-2.5">
        {[0, 25, 50, 75, 100].map((p) => (
          <View key={p} className="flex-row items-center gap-1">
            <View className="h-3.5 w-3.5 overflow-hidden rounded border-[0.5px] border-glass-border bg-[#0e1116]">
              <View className="flex-1" style={{ backgroundColor: `rgba(255,255,255,${(p / 100) * 0.85})` }} />
            </View>
            <Text className="text-xs text-ink-muted">{p}%</Text>
          </View>
        ))}
      </View>
      <Text className="text-[11px] leading-4 text-ink-faint">
        Низька — до ~2 км, середня — 2–6 км, висока — понад 6 км. Сітка {GRID}×{GRID} точок прогнозу на ~300 км
        навколо вас.
      </Text>
    </Card>
  );
}
