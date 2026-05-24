import { useCallback, useMemo, useState } from "react";

import type { MapCoordinate, MarkerData } from "../core";
import {
  DEFAULT_MARKER_FILTERS,
  filterMarkers,
  getActiveMarkerFilterCount,
  normalizeMarkerFilters,
  type MarkerFilters,
} from "../utils/markerFilters";

interface UseMarkerFiltersOptions {
  markers: MarkerData[];
  currentLocation: MapCoordinate | null;
  favoriteMarkerIds: readonly string[];
}

const useMarkerFilters = ({
  markers,
  currentLocation,
  favoriteMarkerIds,
}: UseMarkerFiltersOptions) => {
  const [filters, setFilters] = useState<MarkerFilters>(DEFAULT_MARKER_FILTERS);

  const applyFilters = useCallback((nextFilters: MarkerFilters) => {
    setFilters(normalizeMarkerFilters(nextFilters));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_MARKER_FILTERS);
  }, []);

  const filteredMarkers = useMemo(
    () =>
      filterMarkers(markers, filters, {
        currentLocation,
        favoriteMarkerIds,
      }),
    [currentLocation, favoriteMarkerIds, filters, markers],
  );
  const activeFilterCount = useMemo(() => getActiveMarkerFilterCount(filters), [filters]);

  return {
    filters,
    filteredMarkers,
    activeFilterCount,
    applyFilters,
    clearFilters,
  };
};

export default useMarkerFilters;
