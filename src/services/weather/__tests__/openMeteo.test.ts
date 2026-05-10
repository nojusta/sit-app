import { buildOpenMeteoForecastUrl, normalizeOpenMeteoWeather } from "@/services/weather";

describe("Open-Meteo weather service", () => {
  it("builds a compact forecast URL for marker coordinates", () => {
    const url = buildOpenMeteoForecastUrl({
      coordinate: { latitude: 54.6872, longitude: 25.2797 },
      upcomingHours: 4,
    });

    expect(url).toContain("https://api.open-meteo.com/v1/forecast?");
    expect(url).toContain("latitude=54.6872");
    expect(url).toContain("longitude=25.2797");
    expect(url).toContain("timezone=auto");
    expect(url).toContain("forecast_hours=5");
    expect(url).toContain("models=icon_eu");
    expect(url).toContain("current=temperature_2m");
    expect(url).toContain("hourly=temperature_2m");
  });

  it("normalizes current conditions and the next forecast hours", () => {
    const snapshot = normalizeOpenMeteoWeather(
      {
        timezone: "Europe/Vilnius",
        current: {
          time: "2026-05-01T12:00",
          temperature_2m: 14.7,
          apparent_temperature: 13.8,
          precipitation: 0,
          precipitation_probability: 20,
          weather_code: 61,
          wind_speed_10m: 12.4,
          relative_humidity_2m: 71,
          cloud_cover: 88,
        },
        hourly: {
          time: [
            "2026-05-01T12:00",
            "2026-05-01T13:00",
            "2026-05-01T14:00",
            "2026-05-01T15:00",
            "2026-05-01T16:00",
            "2026-05-01T17:00",
          ],
          temperature_2m: [14.7, 15.1, 15.4, 14.9, 14.2, 13.6],
          apparent_temperature: [12.7, 12.5, 12.2, 11.8, 11.3, 10.9],
          precipitation: [0, 0.1, 0.2, 0, 0, 0.4],
          precipitation_probability: [20, 25, 40, 30, 20, 55],
          weather_code: [61, 61, 63, 3, 2, 80],
        },
      },
      {
        fetchedAt: "2026-05-01T09:15:00.000Z",
        sourceLocationLabel: "Bench near Cathedral",
        upcomingHours: 4,
      },
    );

    expect(snapshot).toMatchObject({
      provider: "open-meteo",
      sourceLocationLabel: "Bench near Cathedral",
      fetchedAt: "2026-05-01T09:15:00.000Z",
      current: {
        time: "2026-05-01T12:00",
        temperatureC: 14.7,
        feelsLikeC: 13.8,
        precipitationMm: 0,
        precipitationProbabilityPct: 20,
        windSpeedKmh: 12.4,
        humidityPct: 71,
        cloudCoverPct: 88,
        conditionCode: 61,
        conditionLabel: "Rain",
      },
    });
    expect(snapshot.upcoming).toHaveLength(4);
    expect(snapshot.upcoming[0]).toEqual({
      time: "2026-05-01T13:00",
      temperatureC: 15.1,
      feelsLikeC: 12.5,
      precipitationMm: 0.1,
      precipitationProbabilityPct: 25,
      conditionCode: 61,
      conditionLabel: "Rain",
    });
    expect(snapshot.upcoming[3].time).toBe("2026-05-01T16:00");
  });

  it("handles missing optional weather fields", () => {
    const snapshot = normalizeOpenMeteoWeather(
      {
        current: {
          time: "2026-05-01T12:00",
          weather_code: 999,
        },
        hourly: {
          time: ["2026-05-01T13:00"],
          weather_code: [0],
        },
      },
      { fetchedAt: "2026-05-01T09:15:00.000Z" },
    );

    expect(snapshot.current).toMatchObject({
      temperatureC: null,
      conditionCode: 999,
      conditionLabel: "Unknown",
    });
    expect(snapshot.upcoming[0]).toMatchObject({
      temperatureC: null,
      feelsLikeC: null,
      precipitationMm: null,
      precipitationProbabilityPct: null,
      conditionCode: 0,
      conditionLabel: "Clear",
    });
  });
});
