import { fetchOpenMeteoWeatherSnapshot, WeatherProviderError } from "../openMeteo";

const input = {
  coordinate: { latitude: 54, longitude: 25 },
  sourceLocationLabel: "VU bench",
  upcomingHours: 1,
};
describe("SIT-40 weather transport AAA", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns normalized weather from a successful response", async () => {
    // Arrange
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temperature_2m: 12 }, hourly: { time: [] } }),
    } as Response);
    // Act
    const snapshot = await fetchOpenMeteoWeatherSnapshot(input);
    // Assert
    expect(snapshot).toMatchObject({
      provider: "open-meteo",
      sourceLocationLabel: "VU bench",
      current: { temperatureC: 12 },
      upcoming: [],
    });
  });

  it.each(["network failure", "invalid JSON"])(
    "wraps %s into a provider error",
    async (failure) => {
      // Arrange
      const error = new Error(failure);
      const fetchMock = jest.spyOn(globalThis, "fetch");
      if (failure === "network failure") fetchMock.mockRejectedValue(error);
      else
        fetchMock.mockResolvedValue({
          ok: true,
          json: async () => {
            throw error;
          },
        } as unknown as Response);
      // Act
      const promise = fetchOpenMeteoWeatherSnapshot(input);
      // Assert
      await expect(promise).rejects.toEqual(
        expect.objectContaining({
          name: "WeatherProviderError",
          message: "Weather forecast is temporarily unavailable.",
        }),
      );
    },
  );

  it("preserves an existing provider error identity", async () => {
    // Arrange
    const error = new WeatherProviderError("custom outage", 429);
    jest.spyOn(globalThis, "fetch").mockRejectedValue(error);
    // Act
    const promise = fetchOpenMeteoWeatherSnapshot(input);
    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("preserves the HTTP status when the weather provider rejects a request", async () => {
    // Arrange
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);
    // Act
    const promise = fetchOpenMeteoWeatherSnapshot(input);
    // Assert
    await expect(promise).rejects.toMatchObject({
      name: "WeatherProviderError",
      message: "Weather forecast is temporarily unavailable.",
      status: 503,
    });
  });
});
