import type { FetchWeatherSnapshotInput, MarkerWeatherSnapshot } from "./types";

export interface WeatherProvider {
  fetchWeatherSnapshot: (
    input: FetchWeatherSnapshotInput,
  ) => Promise<MarkerWeatherSnapshot>;
}
