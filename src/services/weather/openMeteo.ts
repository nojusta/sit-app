import type {
  FetchWeatherSnapshotInput,
  MarkerWeatherSnapshot,
  WeatherConditionCode,
  WeatherCurrentConditions,
  WeatherForecastHour,
} from "./types";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_UPCOMING_HOURS = 4;
const WEATHER_REQUEST_TIMEOUT_MS = 8000;

const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
];

const HOURLY_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
];

type OpenMeteoForecastResponse = {
  current?: unknown;
  hourly?: unknown;
  timezone?: unknown;
};

type NormalizeOpenMeteoOptions = {
  fetchedAt?: string;
  sourceLocationLabel?: string;
  upcomingHours?: number;
};

export class WeatherProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "WeatherProviderError";
  }
}

const clampUpcomingHours = (hours?: number) => {
  if (!Number.isFinite(hours)) {
    return DEFAULT_UPCOMING_HOURS;
  }

  return Math.max(1, Math.min(24, Math.floor(hours as number)));
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readArrayValue = (
  record: Record<string, unknown> | null,
  key: string,
  index: number,
) => {
  const value = record?.[key];
  return Array.isArray(value) ? value[index] : null;
};

const getOpenMeteoConditionLabel = (code: WeatherConditionCode): string => {
  switch (code) {
    case 0:
      return "Clear";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain";
    case 66:
    case 67:
      return "Freezing rain";
    case 71:
    case 73:
    case 75:
      return "Snow";
    case 77:
      return "Snow grains";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return "Unknown";
  }
};

const buildCurrentConditions = (
  current: Record<string, unknown> | null,
): WeatherCurrentConditions | null => {
  if (!current) {
    return null;
  }

  const conditionCode = asNumber(current.weather_code);

  return {
    time: asString(current.time),
    temperatureC: asNumber(current.temperature_2m),
    feelsLikeC: asNumber(current.apparent_temperature),
    precipitationMm: asNumber(current.precipitation),
    precipitationProbabilityPct: asNumber(current.precipitation_probability),
    windSpeedKmh: asNumber(current.wind_speed_10m),
    humidityPct: asNumber(current.relative_humidity_2m),
    cloudCoverPct: asNumber(current.cloud_cover),
    conditionCode,
    conditionLabel: getOpenMeteoConditionLabel(conditionCode),
  };
};

const buildUpcomingForecast = (
  hourly: Record<string, unknown> | null,
  currentTime: string | null,
  upcomingHours: number,
): WeatherForecastHour[] => {
  const times = hourly?.time;

  if (!Array.isArray(times)) {
    return [];
  }

  return times
    .map((time, index): WeatherForecastHour | null => {
      const forecastTime = asString(time);

      if (!forecastTime || (currentTime && forecastTime <= currentTime)) {
        return null;
      }

      const conditionCode = asNumber(readArrayValue(hourly, "weather_code", index));

      return {
        time: forecastTime,
        temperatureC: asNumber(readArrayValue(hourly, "temperature_2m", index)),
        feelsLikeC: asNumber(readArrayValue(hourly, "apparent_temperature", index)),
        precipitationMm: asNumber(readArrayValue(hourly, "precipitation", index)),
        precipitationProbabilityPct: asNumber(
          readArrayValue(hourly, "precipitation_probability", index),
        ),
        conditionCode,
        conditionLabel: getOpenMeteoConditionLabel(conditionCode),
      };
    })
    .filter((forecast): forecast is WeatherForecastHour => forecast !== null)
    .slice(0, upcomingHours);
};

export const buildOpenMeteoForecastUrl = ({
  coordinate,
  upcomingHours,
}: FetchWeatherSnapshotInput): string => {
  const forecastHours = clampUpcomingHours(upcomingHours) + 1;
  const params = new URLSearchParams({
    latitude: String(coordinate.latitude),
    longitude: String(coordinate.longitude),
    current: CURRENT_FIELDS.join(","),
    hourly: HOURLY_FIELDS.join(","),
    timezone: "auto",
    forecast_hours: String(forecastHours),
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  });

  return `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
};

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEATHER_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const normalizeOpenMeteoWeather = (
  response: OpenMeteoForecastResponse,
  options: NormalizeOpenMeteoOptions = {},
): MarkerWeatherSnapshot => {
  const upcomingHours = clampUpcomingHours(options.upcomingHours);
  const current = buildCurrentConditions(asRecord(response.current));

  return {
    provider: "open-meteo",
    sourceLocationLabel: options.sourceLocationLabel ?? "Selected marker",
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    current,
    upcoming: buildUpcomingForecast(
      asRecord(response.hourly),
      current?.time ?? null,
      upcomingHours,
    ),
  };
};

export const fetchOpenMeteoWeatherSnapshot = async (
  input: FetchWeatherSnapshotInput,
): Promise<MarkerWeatherSnapshot> => {
  try {
    const response = await fetchWithTimeout(buildOpenMeteoForecastUrl(input));

    if (!response.ok) {
      throw new WeatherProviderError(
        "Weather forecast is temporarily unavailable.",
        response.status,
      );
    }

    const data = (await response.json()) as OpenMeteoForecastResponse;
    return normalizeOpenMeteoWeather(data, {
      sourceLocationLabel: input.sourceLocationLabel,
      upcomingHours: input.upcomingHours,
    });
  } catch (error) {
    if (error instanceof WeatherProviderError) {
      throw error;
    }

    throw new WeatherProviderError("Weather forecast is temporarily unavailable.");
  }
};

export const openMeteoWeatherProvider = {
  fetchWeatherSnapshot: fetchOpenMeteoWeatherSnapshot,
};
