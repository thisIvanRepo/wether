// Reverse geocoding: coordinates -> settlement name.
//
// Primary: Nominatim (OpenStreetMap) — returns city / town / village as
// separate fields and supports Ukrainian names. Usage policy: max 1 request/s
// and an identifying User-Agent (browsers send Referer instead).
// https://operations.osmfoundation.org/policies/nominatim/
//
// Fallback: the platform geocoder from expo-location (iOS/Android only).

import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type Place = {
  /** Settlement: city, town, village… */
  name: string;
  /** District / region for context, may be empty. */
  region: string;
};

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'PogodaPetApp/1.0 (Expo weather demo)';

const cache = new Map<string, Place>();

async function fromNominatim(latitude: number, longitude: number): Promise<Place | null> {
  const url =
    `${NOMINATIM}?format=jsonv2&addressdetails=1&zoom=14&accept-language=uk` +
    `&lat=${latitude.toFixed(5)}&lon=${longitude.toFixed(5)}`;
  // Browsers forbid setting User-Agent; they send Referer, which the policy accepts.
  const headers: Record<string, string> = Platform.OS === 'web' ? {} : { 'User-Agent': USER_AGENT };
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const a = data?.address ?? {};

  const name: string | undefined =
    a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.county ?? a.state;
  if (!name) return null;

  // Villages/towns get the district for context; cities just the region.
  const isSmall = !a.city;
  const region = [isSmall ? a.district : undefined, a.state]
    .filter((s): s is string => !!s && s !== name)
    .join(', ');
  return { name, region };
}

async function fromDevice(latitude: number, longitude: number): Promise<Place | null> {
  if (Platform.OS === 'web') return null; // not supported on web
  const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
  const name = addr?.city ?? addr?.district ?? addr?.subregion ?? addr?.region;
  if (!name) return null;
  return { name, region: [addr?.subregion, addr?.region].filter((s) => s && s !== name).join(', ') };
}

/** Best-effort settlement name for the coordinates; null if nothing worked. */
export async function findPlace(latitude: number, longitude: number): Promise<Place | null> {
  // ~100 m grid is plenty for a settlement name.
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  for (const source of [fromNominatim, fromDevice]) {
    try {
      const place = await source(latitude, longitude);
      if (place) {
        cache.set(key, place);
        return place;
      }
    } catch {
      // try the next source
    }
  }
  return null;
}
