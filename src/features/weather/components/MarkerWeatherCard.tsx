import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { MarkerWeatherSnapshot, WeatherForecastHour } from "@/services/weather";

import { getWeatherIconConfig } from "../utils/weatherIcons";

type MarkerWeatherCardProps = {
  snapshot: MarkerWeatherSnapshot | null;
  isLoading: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
  changeMessage: string | null;
  markerId?: string | null;
};

const formatTemperature = (temperatureC: number | null) =>
  temperatureC === null ? "--" : `${Math.round(temperatureC)}°C`;

const formatForecastTime = (time: string) => {
  const timePart = time.split("T")[1]?.slice(0, 5);

  if (timePart) {
    return timePart;
  }

  return time;
};

const formatRainChance = (probability: number | null) =>
  probability === null ? null : `${Math.round(probability)}% rain`;

const shouldShowFeelsLike = (temperatureC: number | null, feelsLikeC: number | null) =>
  feelsLikeC !== null &&
  (temperatureC === null ||
    Math.abs(Math.round(temperatureC) - Math.round(feelsLikeC)) >= 1);

const ForecastHourRow: React.FC<{ forecast: WeatherForecastHour }> = ({ forecast }) => {
  const icon = getWeatherIconConfig(forecast.conditionLabel, forecast.conditionCode);

  return (
    <View className="mt-3 flex-row items-center justify-between">
      <Text className="w-14 font-pmedium text-xs text-slate-500">
        {formatForecastTime(forecast.time)}
      </Text>
      <View className="min-w-0 flex-1 flex-row items-center">
        <View
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: icon.backgroundColor }}
        >
          <MaterialCommunityIcons name={icon.name} size={16} color={icon.color} />
        </View>
        <Text className="ml-2 flex-1 font-pmedium text-xs text-slate-800">
          {forecast.conditionLabel}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-psemibold text-xs text-slate-950">
          {formatTemperature(forecast.temperatureC)}
        </Text>
        {shouldShowFeelsLike(forecast.temperatureC, forecast.feelsLikeC) ? (
          <Text className="mt-0.5 font-pregular text-[11px] text-slate-500">
            Feels {formatTemperature(forecast.feelsLikeC)}
          </Text>
        ) : formatRainChance(forecast.precipitationProbabilityPct) ? (
          <Text className="mt-0.5 font-pregular text-[11px] text-slate-500">
            {formatRainChance(forecast.precipitationProbabilityPct)}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const MarkerWeatherCard: React.FC<MarkerWeatherCardProps> = ({
  snapshot,
  isLoading,
  errorMessage,
  noticeMessage,
  changeMessage,
  markerId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const current = snapshot?.current ?? null;
  const hasForecast = Boolean(snapshot && (current || snapshot.upcoming.length > 0));
  const currentIcon = current
    ? getWeatherIconConfig(current.conditionLabel, current.conditionCode)
    : null;

  useEffect(() => {
    setIsExpanded(false);
  }, [markerId]);

  return (
    <Pressable
      onPress={() => {
        if (hasForecast) {
          setIsExpanded((currentValue) => !currentValue);
        }
      }}
      disabled={!hasForecast}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded, disabled: !hasForecast }}
      accessibilityLabel="Current weather"
      className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
    >
      <View className="flex-row items-center justify-between">
        {currentIcon ? (
          <View
            className="mr-3 h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: currentIcon.backgroundColor }}
          >
            <MaterialCommunityIcons
              name={currentIcon.name}
              size={24}
              color={currentIcon.color}
            />
          </View>
        ) : null}

        <View className="min-w-0 flex-1">
          <Text className="font-psemibold text-xs uppercase text-slate-500">
            Current weather
          </Text>
          {current ? (
            <>
              <Text className="mt-1 font-psemibold text-sm text-slate-950">
                {formatTemperature(current.temperatureC)} · {current.conditionLabel}
              </Text>
              {shouldShowFeelsLike(current.temperatureC, current.feelsLikeC) ? (
                <Text className="mt-0.5 font-pregular text-xs text-slate-500">
                  Feels like {formatTemperature(current.feelsLikeC)}
                </Text>
              ) : null}
            </>
          ) : errorMessage ? (
            <Text className="mt-1 font-pregular text-sm leading-5 text-slate-600">
              {errorMessage}
            </Text>
          ) : (
            <Text className="mt-1 font-pregular text-sm text-slate-600">
              Loading forecast...
            </Text>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#475569" />
        ) : hasForecast ? (
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={22}
            color="#475569"
          />
        ) : null}
      </View>

      {noticeMessage ? (
        <Text className="mt-2 font-pregular text-xs leading-5 text-amber-700">
          {noticeMessage}
        </Text>
      ) : null}

      {changeMessage ? (
        <Text className="mt-2 font-pmedium text-xs leading-5 text-sky-700">
          {changeMessage}
        </Text>
      ) : null}

      {isExpanded && snapshot ? (
        <View className="mt-3 border-t border-slate-100 pt-1">
          <Text className="mt-2 font-psemibold text-xs uppercase text-slate-500">
            Next 4 hours
          </Text>
          {snapshot.upcoming.length > 0 ? (
            snapshot.upcoming.map((forecast) => (
              <ForecastHourRow key={forecast.time} forecast={forecast} />
            ))
          ) : (
            <Text className="mt-3 font-pregular text-xs text-slate-500">
              Hourly forecast is unavailable.
            </Text>
          )}
          <Text className="mt-3 font-pregular text-[11px] text-slate-400">
            Weather by Open-Meteo
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

export default MarkerWeatherCard;
