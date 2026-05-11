import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import type { MarkerWeatherSnapshot } from "@/services/weather";

import MarkerWeatherCard from "../MarkerWeatherCard";

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const { Text } = require("react-native");
  const MockMaterialIcons = ({ name }: { name: string }) => <Text>{name}</Text>;

  MockMaterialIcons.displayName = "MockMaterialIcons";

  return MockMaterialIcons;
});

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  const MockMaterialCommunityIcons = ({ name }: { name: string }) => <Text>{name}</Text>;

  MockMaterialCommunityIcons.displayName = "MockMaterialCommunityIcons";

  return MockMaterialCommunityIcons;
});

const snapshot: MarkerWeatherSnapshot = {
  provider: "open-meteo",
  sourceLocationLabel: "Bench near Cathedral",
  fetchedAt: "2026-05-01T09:00:00.000Z",
  current: {
    time: "2026-05-01T12:00",
    temperatureC: 14.4,
    feelsLikeC: 12.8,
    precipitationMm: 0,
    precipitationProbabilityPct: 20,
    windSpeedKmh: 12,
    humidityPct: 70,
    cloudCoverPct: 80,
    conditionCode: 61,
    conditionLabel: "Rain",
  },
  upcoming: [
    {
      time: "2026-05-01T13:00",
      temperatureC: 15,
      feelsLikeC: 13,
      precipitationMm: 0.1,
      precipitationProbabilityPct: 25,
      conditionCode: 61,
      conditionLabel: "Rain",
    },
    {
      time: "2026-05-02T00:00",
      temperatureC: 16,
      feelsLikeC: 15,
      precipitationMm: 0,
      precipitationProbabilityPct: 10,
      conditionCode: 2,
      conditionLabel: "Partly cloudy",
    },
  ],
};

describe("MarkerWeatherCard", () => {
  it("renders compact current weather by default", () => {
    const { getByText, queryByText } = render(
      <MarkerWeatherCard
        markerId="marker-1"
        snapshot={snapshot}
        isLoading={false}
        errorMessage={null}
        noticeMessage={null}
        changeMessage={null}
      />,
    );

    expect(getByText("Current weather")).toBeTruthy();
    expect(getByText("14°C · Rain")).toBeTruthy();
    expect(getByText("Feels like 13°C")).toBeTruthy();
    expect(getByText("weather-pouring")).toBeTruthy();
    expect(queryByText("Next 4 hours")).toBeNull();
  });

  it("expands to show the upcoming hourly forecast", () => {
    const { getByLabelText, getByText } = render(
      <MarkerWeatherCard
        markerId="marker-1"
        snapshot={snapshot}
        isLoading={false}
        errorMessage={null}
        noticeMessage={null}
        changeMessage={null}
      />,
    );

    fireEvent.press(getByLabelText("Current weather"));

    expect(getByText("Next 4 hours")).toBeTruthy();
    expect(getByText("Partly cloudy")).toBeTruthy();
    expect(getByText("weather-partly-cloudy")).toBeTruthy();
    expect(getByText("00:00")).toBeTruthy();
    expect(getByText("Feels 13°C")).toBeTruthy();
    expect(getByText("Weather by Open-Meteo")).toBeTruthy();
  });

  it("renders unavailable and stale messages", () => {
    const { getByText, rerender } = render(
      <MarkerWeatherCard
        markerId="marker-1"
        snapshot={null}
        isLoading={false}
        errorMessage="Weather forecast is temporarily unavailable"
        noticeMessage={null}
        changeMessage={null}
      />,
    );

    expect(getByText("Weather forecast is temporarily unavailable")).toBeTruthy();

    rerender(
      <MarkerWeatherCard
        markerId="marker-1"
        snapshot={snapshot}
        isLoading={false}
        errorMessage={null}
        noticeMessage="Weather forecast updated 2 hours ago."
        changeMessage={null}
      />,
    );

    expect(getByText("Weather forecast updated 2 hours ago.")).toBeTruthy();
  });

  it("renders weather change messages", () => {
    const { getByText } = render(
      <MarkerWeatherCard
        markerId="marker-1"
        snapshot={snapshot}
        isLoading={false}
        errorMessage={null}
        noticeMessage={null}
        changeMessage="Weather change expected: 65% rain chance in the next hour."
      />,
    );

    expect(
      getByText("Weather change expected: 65% rain chance in the next hour."),
    ).toBeTruthy();
  });
});
