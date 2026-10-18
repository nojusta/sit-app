import type { MarkerWeatherSnapshot } from "@/services/weather";
import { getWeatherChangeMessage } from "../weatherChanges";

const snapshot = (
  current: number | null,
  next: number | null,
  rain: number | null,
): MarkerWeatherSnapshot => ({
  provider: "open-meteo",
  sourceLocationLabel: "VU bench",
  fetchedAt: "2026-10-14",
  current: {
    time: null,
    temperatureC: current,
    feelsLikeC: null,
    precipitationMm: null,
    precipitationProbabilityPct: null,
    windSpeedKmh: null,
    humidityPct: null,
    cloudCoverPct: null,
    conditionCode: null,
    conditionLabel: "Unknown",
  },
  upcoming: [
    {
      time: "2026-10-14T13:00",
      temperatureC: next,
      feelsLikeC: null,
      precipitationMm: null,
      precipitationProbabilityPct: rain,
      conditionCode: null,
      conditionLabel: "Unknown",
    },
  ],
});

describe("SIT-97 weather thresholds AAA", () => {
  it.each([
    ["no snapshot", null],
    ["no current", { ...snapshot(10, 20, 90), current: null }],
    ["no next hour", { ...snapshot(10, 20, 90), upcoming: [] }],
    ["unknown temperatures and rain", snapshot(null, null, null)],
    ["unknown current temperature", snapshot(null, 20, 50)],
    ["unknown next temperature", snapshot(10, null, 50)],
    ["exact limits", snapshot(10, 15, 50)],
    ["below limits", snapshot(10, 14.9, 49.9)],
  ])("returns no warning for %s", (_label, input) => {
    // Arrange: parameterized input
    // Act
    const message = getWeatherChangeMessage(input);
    // Assert
    expect(message).toBeNull();
  });

  it.each([
    [
      10,
      15.1,
      null,
      "Weather change expected: temperature rises by 5°C in the next hour.",
    ],
    [
      10,
      4.9,
      null,
      "Weather change expected: temperature drops by 5°C in the next hour.",
    ],
    [null, 20, 50.6, "Weather change expected: 51% rain chance in the next hour."],
    [10, null, 50.1, "Weather change expected: 50% rain chance in the next hour."],
    [
      10,
      4,
      80,
      "Weather change expected: 80% rain chance and temperature drops by 6°C in the next hour.",
    ],
  ])("handles current=%s next=%s rain=%s", (current, next, rain, expected) => {
    // Arrange
    const input = snapshot(current, next, rain);
    // Act
    const message = getWeatherChangeMessage(input);
    // Assert
    expect(message).toBe(expected);
  });
});
