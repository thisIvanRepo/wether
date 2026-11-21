import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { findPlace, type Place } from '../api/geocode';
import { fetchForecast, type Forecast } from '../api/openMeteo';

// Fallback when location permission is denied: Kyiv.
const FALLBACK = { latitude: 50.4501, longitude: 30.5234 };
const FALLBACK_PLACE: Place = { name: 'Київ', region: '' };
const UNKNOWN_PLACE: Place = { name: 'Ваше місцезнаходження', region: '' };

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      forecast: Forecast;
      place: Place;
      usingFallback: boolean;
      coords: { latitude: number; longitude: number };
    };

async function locate() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

export function useWeather() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isRefresh) setRefreshing(true);
    else setState({ status: 'loading' });

    try {
      let position: { latitude: number; longitude: number } | null = null;
      try {
        position = await locate();
      } catch {
        // Location unavailable (e.g. turned off) — use the fallback city.
      }
      const usingFallback = position === null;
      const { latitude, longitude } = position ?? FALLBACK;

      // Forecast and settlement name in parallel; the name is best-effort.
      const [forecast, place] = await Promise.all([
        fetchForecast(latitude, longitude, controller.signal),
        usingFallback ? Promise.resolve(FALLBACK_PLACE) : findPlace(latitude, longitude).catch(() => null),
      ]);

      if (!controller.signal.aborted) {
        setState({
          status: 'ready',
          forecast,
          place: place ?? UNKNOWN_PLACE,
          usingFallback,
          coords: { latitude, longitude },
        });
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Не вдалося завантажити погоду',
      });
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { state, refreshing, reload: () => load(true), retry: () => load(false) };
}
