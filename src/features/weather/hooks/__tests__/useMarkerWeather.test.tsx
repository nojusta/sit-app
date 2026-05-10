import { renderHook, waitFor } from "@testing-library/react-native";

import {
  fetchOpenMeteoWeatherSnapshot,
  type MarkerWeatherSnapshot,
} from "@/services/weather";

import useMarkerWeather, { WEATHER_UNAVAILABLE_MESSAGE } from "../useMarkerWeather";
import { clearWeatherCache, setWeatherCacheEntry } from "../../utils/weatherCache";

jest.mock("@/services/weather", () => ({
  fetchOpenMeteoWeatherSnapshot: jest.fn(),
}));

jest.mock("../../utils/weatherTestScenarios", () => ({
  getWeatherTestScenarioResult: jest.fn(() => null),
}));

const mockedFetchWeather = jest.mocked(fetchOpenMeteoWeatherSnapshot);

const marker = {
  id: "marker-1",
  title: "Bench near Cathedral",
  coordinate: { latitude: 54.6872, longitude: 25.2797 },
};

const createSnapshot = (
  overrides?: Partial<MarkerWeatherSnapshot>,
): MarkerWeatherSnapshot => ({
  provider: "open-meteo",
  sourceLocationLabel: "Bench near Cathedral",
  fetchedAt: "2026-05-01T09:00:00.000Z",
  current: {
    time: "2026-05-01T12:00",
    temperatureC: 14,
    feelsLikeC: 13,
    precipitationMm: 0,
    precipitationProbabilityPct: 20,
    windSpeedKmh: 12,
    humidityPct: 70,
    cloudCoverPct: 80,
    conditionCode: 61,
    conditionLabel: "Rain",
  },
  upcoming: [],
  ...overrides,
});

describe("useMarkerWeather", () => {
  beforeEach(() => {
    clearWeatherCache();
    jest.clearAllMocks();
  });

  it("fetches weather for a selected marker", async () => {
    const snapshot = createSnapshot();
    mockedFetchWeather.mockResolvedValueOnce(snapshot);

    const { result } = renderHook(() => useMarkerWeather(marker));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.snapshot).toBe(snapshot));

    expect(mockedFetchWeather).toHaveBeenCalledWith({
      coordinate: marker.coordinate,
      sourceLocationLabel: marker.title,
      upcomingHours: 4,
    });
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.changeMessage).toBeNull();
  });

  it("detects next-hour weather changes", async () => {
    const snapshot = createSnapshot({
      upcoming: [
        {
          time: "2026-05-01T13:00",
          temperatureC: 16,
          feelsLikeC: 14,
          precipitationMm: 1,
          precipitationProbabilityPct: 65,
          conditionCode: 61,
          conditionLabel: "Rain",
        },
      ],
    });
    mockedFetchWeather.mockResolvedValueOnce(snapshot);

    const { result } = renderHook(() => useMarkerWeather(marker));

    await waitFor(() =>
      expect(result.current.changeMessage).toBe(
        "Weather change expected: 65% rain chance in the next hour.",
      ),
    );
  });

  it("uses fresh cached weather without fetching again", async () => {
    const snapshot = createSnapshot();
    setWeatherCacheEntry("marker:marker-1", snapshot);

    const { result } = renderHook(() => useMarkerWeather(marker));

    await waitFor(() => expect(result.current.snapshot).toBe(snapshot));

    expect(mockedFetchWeather).not.toHaveBeenCalled();
  });

  it("falls back to stale cached weather when refresh fails", async () => {
    const snapshot = createSnapshot({
      fetchedAt: "2026-05-01T09:00:00.000Z",
    });
    const now = Date.parse("2026-05-01T11:15:00.000Z");

    jest.spyOn(Date, "now").mockReturnValue(now);
    setWeatherCacheEntry("marker:marker-1", snapshot, now - 31 * 60 * 1000);
    mockedFetchWeather.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMarkerWeather(marker));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.snapshot).toBe(snapshot);
    expect(result.current.noticeMessage).toBe("Weather forecast updated 2 hours ago.");
    expect(result.current.errorMessage).toBeNull();

    jest.restoreAllMocks();
  });

  it("shows an unavailable message when weather cannot be fetched and no cache exists", async () => {
    mockedFetchWeather.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMarkerWeather(marker));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.snapshot).toBeNull();
    expect(result.current.errorMessage).toBe(WEATHER_UNAVAILABLE_MESSAGE);
    expect(result.current.changeMessage).toBeNull();
  });
});
