import { getWeatherIconConfig } from "../weatherIcons";

describe("weather icons", () => {
  it("maps common conditions to Material icons", () => {
    expect(getWeatherIconConfig("Clear", 0)).toEqual({
      name: "weather-sunny",
      color: "#D97706",
      backgroundColor: "#FEF3C7",
    });
    expect(getWeatherIconConfig("Partly cloudy", 2)).toEqual({
      name: "weather-partly-cloudy",
      color: "#475569",
      backgroundColor: "#E0F2FE",
    });
    expect(getWeatherIconConfig("Overcast", 3)).toEqual({
      name: "weather-cloudy",
      color: "#475569",
      backgroundColor: "#E2E8F0",
    });
    expect(getWeatherIconConfig("Rain", 61)).toEqual({
      name: "weather-pouring",
      color: "#0369A1",
      backgroundColor: "#DBEAFE",
    });
    expect(getWeatherIconConfig("Snow", 71)).toEqual({
      name: "weather-snowy",
      color: "#0284C7",
      backgroundColor: "#E0F2FE",
    });
    expect(getWeatherIconConfig("Thunderstorm", 95)).toEqual({
      name: "weather-lightning-rainy",
      color: "#475569",
      backgroundColor: "#E2E8F0",
    });
  });
});
