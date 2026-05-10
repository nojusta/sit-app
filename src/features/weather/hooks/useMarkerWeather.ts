import { useEffect, useMemo, useState } from "react";

import {
  fetchOpenMeteoWeatherSnapshot,
  type MarkerWeatherSnapshot,
  type WeatherCoordinate,
} from "@/services/weather";

import {
  getStaleWeatherNotice,
  getWeatherCacheEntry,
  getWeatherCacheKey,
  isWeatherCacheFresh,
  setWeatherCacheEntry,
} from "../utils/weatherCache";
import { getWeatherChangeMessage } from "../utils/weatherChanges";
import { getWeatherTestScenarioResult } from "../utils/weatherTestScenarios";

const UPCOMING_FORECAST_HOURS = 4;

export type WeatherMarkerInput = {
  id?: string | null;
  title?: string | null;
  coordinate: WeatherCoordinate;
};

export type MarkerWeatherState = {
  snapshot: MarkerWeatherSnapshot | null;
  isLoading: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
  changeMessage: string | null;
};

const WEATHER_UNAVAILABLE_MESSAGE = "Weather forecast is temporarily unavailable";

const EMPTY_WEATHER_STATE: MarkerWeatherState = {
  snapshot: null,
  isLoading: false,
  errorMessage: null,
  noticeMessage: null,
  changeMessage: null,
};

const buildStateFromSnapshot = (
  snapshot: MarkerWeatherSnapshot,
  nowMs = Date.now(),
): MarkerWeatherState => ({
  snapshot,
  isLoading: false,
  errorMessage: null,
  noticeMessage: getStaleWeatherNotice(snapshot, nowMs),
  changeMessage: getWeatherChangeMessage(snapshot),
});

const isWeatherMarkerInput = (
  marker: WeatherMarkerInput | null,
): marker is WeatherMarkerInput =>
  Boolean(
    marker &&
    Number.isFinite(marker.coordinate.latitude) &&
    Number.isFinite(marker.coordinate.longitude),
  );

const useMarkerWeather = (marker: WeatherMarkerInput | null): MarkerWeatherState => {
  const cacheKey = useMemo(
    () =>
      isWeatherMarkerInput(marker)
        ? getWeatherCacheKey(marker.id, marker.coordinate)
        : null,
    [marker],
  );

  const [state, setState] = useState<MarkerWeatherState>(EMPTY_WEATHER_STATE);

  useEffect(() => {
    if (!cacheKey || !isWeatherMarkerInput(marker)) {
      setState(EMPTY_WEATHER_STATE);
      return;
    }

    let isActive = true;
    const cachedEntry = getWeatherCacheEntry(cacheKey);
    const testScenario = getWeatherTestScenarioResult(marker.title ?? "Selected marker");

    if (testScenario?.type === "unavailable") {
      setState({
        snapshot: null,
        isLoading: false,
        errorMessage: WEATHER_UNAVAILABLE_MESSAGE,
        noticeMessage: null,
        changeMessage: null,
      });
      return;
    }

    if (testScenario?.type === "snapshot") {
      setState(buildStateFromSnapshot(testScenario.snapshot));
      return;
    }

    if (cachedEntry && isWeatherCacheFresh(cachedEntry)) {
      setState(buildStateFromSnapshot(cachedEntry.snapshot));
      return;
    }

    setState((current) => ({
      snapshot: cachedEntry?.snapshot ?? current.snapshot,
      isLoading: true,
      errorMessage: null,
      noticeMessage: cachedEntry
        ? getStaleWeatherNotice(cachedEntry.snapshot)
        : current.noticeMessage,
      changeMessage: cachedEntry
        ? getWeatherChangeMessage(cachedEntry.snapshot)
        : current.changeMessage,
    }));

    fetchOpenMeteoWeatherSnapshot({
      coordinate: marker.coordinate,
      sourceLocationLabel: marker.title ?? "Selected marker",
      upcomingHours: UPCOMING_FORECAST_HOURS,
    })
      .then((snapshot) => {
        if (!isActive) {
          return;
        }

        setWeatherCacheEntry(cacheKey, snapshot);
        setState(buildStateFromSnapshot(snapshot));
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        if (cachedEntry) {
          setState(buildStateFromSnapshot(cachedEntry.snapshot));
          return;
        }

        setState({
          snapshot: null,
          isLoading: false,
          errorMessage: WEATHER_UNAVAILABLE_MESSAGE,
          noticeMessage: null,
          changeMessage: null,
        });
      });

    return () => {
      isActive = false;
    };
  }, [cacheKey, marker]);

  return state;
};

export { UPCOMING_FORECAST_HOURS, WEATHER_UNAVAILABLE_MESSAGE };
export default useMarkerWeather;
