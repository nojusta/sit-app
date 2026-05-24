import type { MarkerTagId } from "@/services/appwrite";

import type { MapCoordinate, MarkerData } from "../core";

export type MarkerRatingThreshold = 3 | 4 | 4.5;
export type MarkerDistanceThreshold = 500 | 1000 | 2000 | 3000 | 5000;

export type MarkerFilters = {
  attributes: MarkerTagId[];
  hasPhotosOnly: boolean;
  minimumRating: MarkerRatingThreshold | null;
  maxDistanceMeters: MarkerDistanceThreshold | null;
  favoritesOnly: boolean;
};

export const DEFAULT_MARKER_FILTERS: MarkerFilters = {
  attributes: [],
  hasPhotosOnly: false,
  minimumRating: null,
  maxDistanceMeters: null,
  favoritesOnly: false,
};

export const RATING_FILTER_OPTIONS: {
  label: string;
  value: MarkerRatingThreshold | null;
}[] = [
  { label: "Any", value: null },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

export const DISTANCE_FILTER_OPTIONS: {
  label: string;
  value: MarkerDistanceThreshold | null;
}[] = [
  { label: "Any", value: null },
  { label: "500 m", value: 500 },
  { label: "1 km", value: 1000 },
  { label: "2 km", value: 2000 },
  { label: "3 km", value: 3000 },
  { label: "5 km", value: 5000 },
];

const EARTH_RADIUS_METERS = 6371000;

export const calculateDistanceMeters = (from: MapCoordinate, to: MapCoordinate) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * centralAngle;
};

export const markerHasPhotos = (marker: MarkerData) =>
  Boolean(marker.photoUrl) || Boolean(marker.photoUrls?.length);

export const hasActiveMarkerFilters = (filters: MarkerFilters) =>
  filters.attributes.length > 0 ||
  filters.hasPhotosOnly ||
  filters.minimumRating !== null ||
  filters.maxDistanceMeters !== null ||
  filters.favoritesOnly;

export const getActiveMarkerFilterCount = (filters: MarkerFilters) =>
  [
    filters.attributes.length > 0,
    filters.hasPhotosOnly,
    filters.minimumRating !== null,
    filters.maxDistanceMeters !== null,
    filters.favoritesOnly,
  ].filter(Boolean).length;

export const normalizeMarkerFilters = (filters: MarkerFilters): MarkerFilters => ({
  attributes: filters.attributes.filter(
    (tagId, index, values) => values.indexOf(tagId) === index,
  ),
  hasPhotosOnly: filters.hasPhotosOnly,
  minimumRating: filters.minimumRating,
  maxDistanceMeters: filters.maxDistanceMeters,
  favoritesOnly: filters.favoritesOnly,
});

export const filterMarkers = (
  markers: MarkerData[],
  filters: MarkerFilters,
  options: {
    currentLocation: MapCoordinate | null;
    favoriteMarkerIds: readonly string[];
  },
) => {
  const normalizedFilters = normalizeMarkerFilters(filters);
  const favoriteMarkerIdSet = new Set(options.favoriteMarkerIds);

  return markers.filter((marker) => {
    if (
      normalizedFilters.attributes.length > 0 &&
      !marker.attributes.some((tagId) => normalizedFilters.attributes.includes(tagId))
    ) {
      return false;
    }

    if (normalizedFilters.hasPhotosOnly && !markerHasPhotos(marker)) {
      return false;
    }

    if (
      normalizedFilters.minimumRating !== null &&
      (typeof marker.averageRating !== "number" ||
        marker.averageRating < normalizedFilters.minimumRating)
    ) {
      return false;
    }

    if (normalizedFilters.maxDistanceMeters !== null) {
      if (!options.currentLocation) {
        return false;
      }

      if (
        calculateDistanceMeters(options.currentLocation, marker.coordinate) >
        normalizedFilters.maxDistanceMeters
      ) {
        return false;
      }
    }

    if (normalizedFilters.favoritesOnly && !favoriteMarkerIdSet.has(marker.id)) {
      return false;
    }

    return true;
  });
};
