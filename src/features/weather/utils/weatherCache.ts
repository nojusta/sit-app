import type { MarkerWeatherSnapshot, WeatherCoordinate } from "@/services/weather";

const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;
const STALE_WEATHER_NOTICE_MS = 60 * 60 * 1000;

export type WeatherCacheEntry = {
  snapshot: MarkerWeatherSnapshot;
  storedAtMs: number;
};

const weatherCache = new Map<string, WeatherCacheEntry>();

export const getWeatherCacheKey = (
  markerId: string | null | undefined,
  coordinate: WeatherCoordinate,
) => {
  if (markerId) {
    return `marker:${markerId}`;
  }

  return `coord:${coordinate.latitude.toFixed(3)},${coordinate.longitude.toFixed(3)}`;
};

export const getWeatherCacheEntry = (cacheKey: string): WeatherCacheEntry | null =>
  weatherCache.get(cacheKey) ?? null;

export const setWeatherCacheEntry = (
  cacheKey: string,
  snapshot: MarkerWeatherSnapshot,
  storedAtMs = Date.now(),
) => {
  weatherCache.set(cacheKey, { snapshot, storedAtMs });
};

export const clearWeatherCache = () => {
  weatherCache.clear();
};

export const isWeatherCacheFresh = (entry: WeatherCacheEntry, nowMs = Date.now()) =>
  nowMs - entry.storedAtMs < WEATHER_CACHE_TTL_MS;

export const getWeatherSnapshotAgeHours = (
  snapshot: MarkerWeatherSnapshot,
  nowMs = Date.now(),
) => {
  const fetchedAtMs = Date.parse(snapshot.fetchedAt);

  if (!Number.isFinite(fetchedAtMs)) {
    return null;
  }

  return Math.max(0, Math.floor((nowMs - fetchedAtMs) / STALE_WEATHER_NOTICE_MS));
};

export const getStaleWeatherNotice = (
  snapshot: MarkerWeatherSnapshot,
  nowMs = Date.now(),
) => {
  const ageHours = getWeatherSnapshotAgeHours(snapshot, nowMs);

  if (ageHours === null || ageHours < 1) {
    return null;
  }

  return `Weather forecast updated ${ageHours} hours ago.`;
};

export { STALE_WEATHER_NOTICE_MS, WEATHER_CACHE_TTL_MS };
