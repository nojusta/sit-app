import Constants from "expo-constants";

import type { MarkerWeatherSnapshot } from "@/services/weather";

type ExpoExtra = Record<string, string | undefined>;
type WeatherTestScenario =
  | "rain"
  | "temperature"
  | "temperature-drop"
  | "unavailable"
  | "stale"
  | "icons";

type WeatherTestScenarioResult =
  | { type: "snapshot"; snapshot: MarkerWeatherSnapshot }
  | { type: "unavailable" };

const constantsWithUntypedManifest = Constants as typeof Constants & {
  manifest?: { extra?: ExpoExtra } | null;
  manifest2?: { extra?: { expoClient?: { extra?: ExpoExtra } } } | null;
};

const expoExtra: ExpoExtra =
  Constants.expoConfig?.extra ??
  constantsWithUntypedManifest.manifest?.extra ??
  constantsWithUntypedManifest.manifest2?.extra?.expoClient?.extra ??
  {};

const getEnabledScenario = (): WeatherTestScenario | null => {
  if (!__DEV__) {
    return null;
  }

  const scenario = expoExtra.WEATHER_TEST_SCENARIO;

  return scenario === "rain" ||
    scenario === "temperature" ||
    scenario === "temperature-drop" ||
    scenario === "unavailable" ||
    scenario === "stale" ||
    scenario === "icons"
    ? scenario
    : null;
};

const createBaseSnapshot = (sourceLocationLabel: string): MarkerWeatherSnapshot => {
  const fetchedAt = new Date().toISOString();

  return {
    provider: "open-meteo",
    sourceLocationLabel,
    fetchedAt,
    current: {
      time: "2026-05-07T12:00",
      temperatureC: 14,
      feelsLikeC: 12,
      precipitationMm: 0,
      precipitationProbabilityPct: 20,
      windSpeedKmh: 12,
      humidityPct: 70,
      cloudCoverPct: 80,
      conditionCode: 3,
      conditionLabel: "Overcast",
    },
    upcoming: [
      {
        time: "2026-05-07T13:00",
        temperatureC: 15,
        feelsLikeC: 13,
        precipitationMm: 1.2,
        precipitationProbabilityPct: 65,
        conditionCode: 61,
        conditionLabel: "Rain",
      },
      {
        time: "2026-05-07T14:00",
        temperatureC: 14,
        feelsLikeC: 12,
        precipitationMm: 0.6,
        precipitationProbabilityPct: 55,
        conditionCode: 61,
        conditionLabel: "Rain",
      },
    ],
  };
};

export const getWeatherTestScenarioSnapshot = (
  sourceLocationLabel: string,
): MarkerWeatherSnapshot | null => {
  const result = getWeatherTestScenarioResult(sourceLocationLabel);

  return result?.type === "snapshot" ? result.snapshot : null;
};

export const getWeatherTestScenarioResult = (
  sourceLocationLabel: string,
): WeatherTestScenarioResult | null => {
  const scenario = getEnabledScenario();

  if (!scenario) {
    return null;
  }

  if (scenario === "unavailable") {
    return { type: "unavailable" };
  }

  const snapshot = createBaseSnapshot(sourceLocationLabel);

  if (scenario === "stale") {
    return {
      type: "snapshot",
      snapshot: {
        ...snapshot,
        fetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  if (scenario === "icons") {
    return {
      type: "snapshot",
      snapshot: {
        ...snapshot,
        current: snapshot.current
          ? {
              ...snapshot.current,
              temperatureC: 18,
              feelsLikeC: 18,
              precipitationProbabilityPct: 0,
              conditionCode: 0,
              conditionLabel: "Clear",
            }
          : null,
        upcoming: [
          {
            time: "2026-05-07T13:00",
            temperatureC: 17,
            feelsLikeC: 17,
            precipitationMm: 0,
            precipitationProbabilityPct: 10,
            conditionCode: 2,
            conditionLabel: "Partly cloudy",
          },
          {
            time: "2026-05-07T14:00",
            temperatureC: 16,
            feelsLikeC: 15,
            precipitationMm: 0,
            precipitationProbabilityPct: 15,
            conditionCode: 3,
            conditionLabel: "Overcast",
          },
          {
            time: "2026-05-07T15:00",
            temperatureC: 15,
            feelsLikeC: 13,
            precipitationMm: 1.2,
            precipitationProbabilityPct: 65,
            conditionCode: 61,
            conditionLabel: "Rain",
          },
          {
            time: "2026-05-07T16:00",
            temperatureC: 1,
            feelsLikeC: -2,
            precipitationMm: 0.8,
            precipitationProbabilityPct: 45,
            conditionCode: 71,
            conditionLabel: "Snow",
          },
          {
            time: "2026-05-07T17:00",
            temperatureC: 12,
            feelsLikeC: 10,
            precipitationMm: 4,
            precipitationProbabilityPct: 80,
            conditionCode: 95,
            conditionLabel: "Thunderstorm",
          },
          {
            time: "2026-05-07T18:00",
            temperatureC: 10,
            feelsLikeC: 9,
            precipitationMm: 0,
            precipitationProbabilityPct: 20,
            conditionCode: 45,
            conditionLabel: "Fog",
          },
          {
            time: "2026-05-07T19:00",
            temperatureC: 13,
            feelsLikeC: 13,
            precipitationMm: 0,
            precipitationProbabilityPct: 0,
            conditionCode: 999,
            conditionLabel: "Unknown",
          },
        ],
      },
    };
  }

  if (scenario === "temperature" || scenario === "temperature-drop") {
    return {
      type: "snapshot",
      snapshot: {
        ...snapshot,
        current: snapshot.current
          ? {
              ...snapshot.current,
              temperatureC: 14,
              feelsLikeC: 13,
              precipitationProbabilityPct: 20,
              conditionLabel: "Mainly clear",
            }
          : null,
        upcoming: snapshot.upcoming.map((forecast, index) =>
          index === 0
            ? {
                ...forecast,
                temperatureC: 7.5,
                feelsLikeC: 5,
                precipitationMm: 0,
                precipitationProbabilityPct: 10,
                conditionLabel: "Cloudy",
              }
            : forecast,
        ),
      },
    };
  }

  return { type: "snapshot", snapshot };
};
