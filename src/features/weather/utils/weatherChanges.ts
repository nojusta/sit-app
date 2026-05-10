import type { MarkerWeatherSnapshot } from "@/services/weather";

const RAIN_PROBABILITY_CHANGE_THRESHOLD = 50;
const TEMPERATURE_CHANGE_THRESHOLD_C = 5;

const formatTemperatureDelta = (deltaC: number) => `${Math.round(deltaC)}°C`;

const getTemperatureChangeLabel = (
  currentTemperatureC: number,
  nextTemperatureC: number,
) => (nextTemperatureC < currentTemperatureC ? "drops" : "rises");

export const getWeatherChangeMessage = (
  snapshot: MarkerWeatherSnapshot | null,
): string | null => {
  const current = snapshot?.current;
  const nextHour = snapshot?.upcoming[0];

  if (!current || !nextHour) {
    return null;
  }

  const rainProbability = nextHour.precipitationProbabilityPct;
  const temperatureDelta =
    current.temperatureC === null || nextHour.temperatureC === null
      ? null
      : Math.abs(nextHour.temperatureC - current.temperatureC);
  const hasRainChange =
    rainProbability !== null && rainProbability > RAIN_PROBABILITY_CHANGE_THRESHOLD;
  const hasTemperatureChange =
    temperatureDelta !== null && temperatureDelta > TEMPERATURE_CHANGE_THRESHOLD_C;
  const temperatureChangeLabel =
    current.temperatureC !== null && nextHour.temperatureC !== null
      ? getTemperatureChangeLabel(current.temperatureC, nextHour.temperatureC)
      : "changes";

  if (hasRainChange && hasTemperatureChange) {
    return `Weather change expected: ${Math.round(
      rainProbability,
    )}% rain chance and temperature ${temperatureChangeLabel} by ${formatTemperatureDelta(
      temperatureDelta,
    )} in the next hour.`;
  }

  if (hasRainChange) {
    return `Weather change expected: ${Math.round(
      rainProbability,
    )}% rain chance in the next hour.`;
  }

  if (hasTemperatureChange) {
    return `Weather change expected: temperature ${temperatureChangeLabel} by ${formatTemperatureDelta(
      temperatureDelta,
    )} in the next hour.`;
  }

  return null;
};
