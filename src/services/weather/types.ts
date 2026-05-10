export type WeatherProviderId = "open-meteo" | "meteo-lt";

export type WeatherCoordinate = {
  latitude: number;
  longitude: number;
};

export type WeatherConditionCode = string | number | null;

export type WeatherCurrentConditions = {
  time: string | null;
  temperatureC: number | null;
  feelsLikeC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  windSpeedKmh: number | null;
  humidityPct: number | null;
  cloudCoverPct: number | null;
  conditionCode: WeatherConditionCode;
  conditionLabel: string;
};

export type WeatherForecastHour = {
  time: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  conditionCode: WeatherConditionCode;
  conditionLabel: string;
};

export type MarkerWeatherSnapshot = {
  provider: WeatherProviderId;
  sourceLocationLabel: string;
  sourceDistanceKm?: number;
  fetchedAt: string;
  current: WeatherCurrentConditions | null;
  upcoming: WeatherForecastHour[];
};

export type FetchWeatherSnapshotInput = {
  coordinate: WeatherCoordinate;
  sourceLocationLabel?: string;
  upcomingHours?: number;
};
