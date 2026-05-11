import type { MarkerWeatherSnapshot } from "@/services/weather";

import {
  clearWeatherCache,
  getStaleWeatherNotice,
  getWeatherCacheEntry,
  getWeatherCacheKey,
  isWeatherCacheFresh,
  setWeatherCacheEntry,
  WEATHER_CACHE_TTL_MS,
} from "../weatherCache";

const createSnapshot = (fetchedAt: string): MarkerWeatherSnapshot => ({
  provider: "open-meteo",
  sourceLocationLabel: "Bench near Cathedral",
  fetchedAt,
  current: null,
  upcoming: [],
});

describe("weather cache helpers", () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  it("keys weather by marker id before falling back to a coordinate bucket", () => {
    const coordinate = { latitude: 54.687234, longitude: 25.279745 };

    expect(getWeatherCacheKey("marker-1", coordinate)).toBe("marker:marker-1");
    expect(getWeatherCacheKey(null, coordinate)).toBe("coord:54.687,25.280");
  });

  it("stores and reads cached weather snapshots", () => {
    const snapshot = createSnapshot("2026-05-01T09:00:00.000Z");

    setWeatherCacheEntry("marker:marker-1", snapshot, 1000);

    expect(getWeatherCacheEntry("marker:marker-1")).toEqual({
      snapshot,
      storedAtMs: 1000,
    });
  });

  it("treats cache entries as fresh only inside the weather TTL", () => {
    const snapshot = createSnapshot("2026-05-01T09:00:00.000Z");
    const entry = { snapshot, storedAtMs: 1000 };

    expect(isWeatherCacheFresh(entry, 1000 + WEATHER_CACHE_TTL_MS - 1)).toBe(true);
    expect(isWeatherCacheFresh(entry, 1000 + WEATHER_CACHE_TTL_MS)).toBe(false);
  });

  it("builds stale notices only after at least one hour", () => {
    expect(
      getStaleWeatherNotice(
        createSnapshot("2026-05-01T09:00:00.000Z"),
        Date.parse("2026-05-01T09:59:00.000Z"),
      ),
    ).toBeNull();
    expect(
      getStaleWeatherNotice(
        createSnapshot("2026-05-01T09:00:00.000Z"),
        Date.parse("2026-05-01T11:15:00.000Z"),
      ),
    ).toBe("Weather forecast updated 2 hours ago.");
  });
});
