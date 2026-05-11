describe("weather test scenarios", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadScenario = (scenario: string) => {
    jest.doMock("expo-constants", () => ({
      expoConfig: {
        extra: {
          WEATHER_TEST_SCENARIO: scenario,
        },
      },
    }));

    return require("../weatherTestScenarios") as typeof import("../weatherTestScenarios");
  };

  it("creates a dev rain scenario snapshot", () => {
    const { getWeatherTestScenarioSnapshot } = loadScenario("rain");
    const snapshot = getWeatherTestScenarioSnapshot("Bench near Cathedral");

    expect(snapshot).toMatchObject({
      provider: "open-meteo",
      sourceLocationLabel: "Bench near Cathedral",
      current: {
        temperatureC: 14,
      },
      upcoming: expect.arrayContaining([
        expect.objectContaining({
          precipitationProbabilityPct: 65,
          conditionLabel: "Rain",
        }),
      ]),
    });
  });

  it("creates a dev temperature drop scenario snapshot", () => {
    const { getWeatherTestScenarioSnapshot } = loadScenario("temperature-drop");
    const snapshot = getWeatherTestScenarioSnapshot("Bench near Cathedral");

    expect(snapshot?.current?.temperatureC).toBe(14);
    expect(snapshot?.upcoming[0].temperatureC).toBe(7.5);
    expect(snapshot?.upcoming[0].precipitationProbabilityPct).toBe(10);
  });

  it("creates a dev unavailable scenario result", () => {
    const { getWeatherTestScenarioResult } = loadScenario("unavailable");

    expect(getWeatherTestScenarioResult("Bench near Cathedral")).toEqual({
      type: "unavailable",
    });
  });

  it("creates a dev stale scenario snapshot", () => {
    const now = Date.parse("2026-05-07T12:00:00.000Z");

    jest.spyOn(Date, "now").mockReturnValue(now);

    const { getWeatherTestScenarioSnapshot } = loadScenario("stale");
    const snapshot = getWeatherTestScenarioSnapshot("Bench near Cathedral");

    expect(snapshot?.fetchedAt).toBe("2026-05-07T10:00:00.000Z");

    jest.restoreAllMocks();
  });

  it("creates a dev icon gallery scenario snapshot", () => {
    const { getWeatherTestScenarioSnapshot } = loadScenario("icons");
    const snapshot = getWeatherTestScenarioSnapshot("Bench near Cathedral");

    expect(snapshot?.current?.conditionLabel).toBe("Clear");
    expect(snapshot?.upcoming.map((forecast) => forecast.conditionLabel)).toEqual([
      "Partly cloudy",
      "Overcast",
      "Rain",
      "Snow",
      "Thunderstorm",
      "Fog",
      "Unknown",
    ]);
  });
});
