import type { MapSessionState } from "./types";

export const selectIsNavigationActive = (state: MapSessionState) =>
  state.navigationDestination !== null;

export const selectHasTransientUi = (state: MapSessionState) =>
  state.selectedMarker !== null ||
  state.draftMarker !== null ||
  state.isMarkerInputVisible;
