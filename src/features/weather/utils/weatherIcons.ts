import type { ComponentProps } from "react";
import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { WeatherConditionCode } from "@/services/weather";

type WeatherIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type WeatherIconConfig = {
  name: WeatherIconName;
  color: string;
  backgroundColor: string;
};

export const getWeatherIconConfig = (
  conditionLabel: string,
  conditionCode: WeatherConditionCode,
): WeatherIconConfig => {
  const label = conditionLabel.toLowerCase();

  if (label.includes("thunderstorm")) {
    return {
      name: "weather-lightning-rainy",
      color: "#475569",
      backgroundColor: "#E2E8F0",
    };
  }

  if (label.includes("snow") || conditionCode === 77) {
    return { name: "weather-snowy", color: "#0284C7", backgroundColor: "#E0F2FE" };
  }

  if (label.includes("rain") || label.includes("drizzle")) {
    return { name: "weather-pouring", color: "#0369A1", backgroundColor: "#DBEAFE" };
  }

  if (label.includes("fog")) {
    return { name: "weather-fog", color: "#64748B", backgroundColor: "#F1F5F9" };
  }

  if (label.includes("partly cloudy")) {
    return {
      name: "weather-partly-cloudy",
      color: "#475569",
      backgroundColor: "#E0F2FE",
    };
  }

  if (label.includes("overcast") || label.includes("cloudy")) {
    return { name: "weather-cloudy", color: "#475569", backgroundColor: "#E2E8F0" };
  }

  if (label.includes("clear")) {
    return { name: "weather-sunny", color: "#D97706", backgroundColor: "#FEF3C7" };
  }

  return { name: "thermometer", color: "#475569", backgroundColor: "#F1F5F9" };
};
