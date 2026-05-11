import type { MarkerWeatherSnapshot } from "@/services/weather";

import { getWeatherChangeMessage } from "../weatherChanges";

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
    conditionCode: 1,
    conditionLabel: "Mainly clear",
  },
  upcoming: [
    {
      time: "2026-05-01T13:00",
      temperatureC: 16,
      feelsLikeC: 14,
      precipitationMm: 0,
      precipitationProbabilityPct: 40,
      conditionCode: 2,
      conditionLabel: "Partly cloudy",
    },
  ],
  ...overrides,
});

describe("weather change detection", () => {
  it("does not report changes at or below thresholds", () => {
    expect(
      getWeatherChangeMessage(
        createSnapshot({
          upcoming: [
            {
              time: "2026-05-01T13:00",
              temperatureC: 19,
              feelsLikeC: 18,
              precipitationMm: 0,
              precipitationProbabilityPct: 50,
              conditionCode: 2,
              conditionLabel: "Partly cloudy",
            },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("reports rain probability above 50 percent in the next hour", () => {
    expect(
      getWeatherChangeMessage(
        createSnapshot({
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
        }),
      ),
    ).toBe("Weather change expected: 65% rain chance in the next hour.");
  });

  it("reports temperature shifts above 5 degrees in the next hour", () => {
    expect(
      getWeatherChangeMessage(
        createSnapshot({
          upcoming: [
            {
              time: "2026-05-01T13:00",
              temperatureC: 7.8,
              feelsLikeC: 5,
              precipitationMm: 0,
              precipitationProbabilityPct: 10,
              conditionCode: 3,
              conditionLabel: "Overcast",
            },
          ],
        }),
      ),
    ).toBe("Weather change expected: temperature drops by 6°C in the next hour.");
  });

  it("reports temperature rises above 5 degrees in the next hour", () => {
    expect(
      getWeatherChangeMessage(
        createSnapshot({
          upcoming: [
            {
              time: "2026-05-01T13:00",
              temperatureC: 20.2,
              feelsLikeC: 19,
              precipitationMm: 0,
              precipitationProbabilityPct: 10,
              conditionCode: 1,
              conditionLabel: "Mainly clear",
            },
          ],
        }),
      ),
    ).toBe("Weather change expected: temperature rises by 6°C in the next hour.");
  });

  it("combines rain and temperature change messages", () => {
    expect(
      getWeatherChangeMessage(
        createSnapshot({
          upcoming: [
            {
              time: "2026-05-01T13:00",
              temperatureC: 20.4,
              feelsLikeC: 19,
              precipitationMm: 2,
              precipitationProbabilityPct: 80,
              conditionCode: 63,
              conditionLabel: "Rain",
            },
          ],
        }),
      ),
    ).toBe(
      "Weather change expected: 80% rain chance and temperature rises by 6°C in the next hour.",
    );
  });
});
