import type { MapSessionAction, MapSessionState } from "./types";

export const createInitialMapSessionState = (): MapSessionState => ({
  selectedMarker: null,
  browseCamera: null,
  draftMarker: null,
  markerDraftFields: {
    name: "",
    info: "",
  },
  isMarkerInputVisible: false,
  navigationDestination: null,
});

export const mapSessionReducer = (
  state: MapSessionState,
  action: MapSessionAction,
): MapSessionState => {
  switch (action.type) {
    case "captureBrowseCamera":
      return {
        ...state,
        browseCamera: action.payload,
      };
    case "selectMarker":
      return {
        ...state,
        selectedMarker: action.payload,
        draftMarker: null,
        isMarkerInputVisible: false,
      };
    case "dismissTransientUi":
      return {
        ...state,
        selectedMarker: null,
        draftMarker: null,
        isMarkerInputVisible: false,
      };
    case "setDraftMarker":
      return {
        ...state,
        selectedMarker: null,
        draftMarker: action.payload,
      };
    case "setMarkerInputVisible":
      return {
        ...state,
        isMarkerInputVisible: action.payload,
      };
    case "setMarkerDraftName":
      return {
        ...state,
        markerDraftFields: {
          ...state.markerDraftFields,
          name: action.payload,
        },
      };
    case "setMarkerDraftInfo":
      return {
        ...state,
        markerDraftFields: {
          ...state.markerDraftFields,
          info: action.payload,
        },
      };
    case "startNavigation":
      return {
        ...state,
        navigationDestination: action.payload,
        selectedMarker: null,
        draftMarker: null,
        isMarkerInputVisible: false,
      };
    case "stopNavigation":
      return {
        ...state,
        navigationDestination: null,
      };
    default:
      return state;
  }
};
