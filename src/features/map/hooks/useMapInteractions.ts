import { useMemo, useReducer } from "react";
import { Alert } from "react-native";
import { LocationObject } from "expo-location";
import {
  type MapCoordinate,
  type MapInteractionController,
  createInitialMapSessionState,
  DEFAULT_MARKERS,
  mapSessionReducer,
  selectIsNavigationActive,
  type MarkerData,
} from "../core";
import {
  getLocationCoordinate,
  LOCATION_ACCESS_REQUIRED_MESSAGE,
} from "../utils/navigation";

interface UseMapInteractionsOptions {
  mapControllerRef: React.RefObject<MapInteractionController | null>;
  location: LocationObject | null;
  isLocationPermissionDenied?: boolean;
  onMarkerSelectionChange?: (selected: boolean) => void;
}

const useMapInteractions = ({
  mapControllerRef,
  location,
  isLocationPermissionDenied = false,
  onMarkerSelectionChange,
}: UseMapInteractionsOptions) => {
  const [session, dispatch] = useReducer(
    mapSessionReducer,
    undefined,
    createInitialMapSessionState,
  );
  const currentLocationCoordinate = useMemo(
    () => getLocationCoordinate(location),
    [location],
  );
  const isNavigationActive = selectIsNavigationActive(session);

  const handleMarkerPress = (marker: MarkerData) => {
    if (isNavigationActive) {
      return;
    }

    if (mapControllerRef.current) {
      mapControllerRef.current
        .captureBrowseCamera()
        .then((camera) => {
          if (camera) {
            dispatch({ type: "captureBrowseCamera", payload: camera });
          }
        })
        .catch((error) => {
          if (__DEV__) {
            console.warn(
              "Failed to capture current map camera before focusing marker.",
              error,
            );
          }
        });
    }

    dispatch({ type: "selectMarker", payload: marker });
    onMarkerSelectionChange?.(true);
    mapControllerRef.current?.focusCoordinate(marker.coordinate);
  };

  const handleMapPress = (coordinate?: MapCoordinate) => {
    if ((session.draftMarker || session.isMarkerInputVisible) && coordinate) {
      dispatch({ type: "setDraftMarker", payload: coordinate });
      dispatch({ type: "setMarkerInputVisible", payload: true });
      onMarkerSelectionChange?.(false);
      return;
    }

    if (session.selectedMarker || session.draftMarker || session.isMarkerInputVisible) {
      dispatch({ type: "dismissTransientUi" });
      onMarkerSelectionChange?.(false);
      if (session.browseCamera && !isNavigationActive) {
        mapControllerRef.current?.restoreBrowseCamera(session.browseCamera);
      }
    }
  };

  const handleCenterOnUserLocation = async () => {
    const controller = mapControllerRef.current;

    if (controller) {
      const centeredOnNativeLocation = await controller.centerOnUserLocation();

      if (centeredOnNativeLocation) {
        return;
      }
    }

    if (currentLocationCoordinate && controller) {
      controller.centerOnCoordinate(currentLocationCoordinate);
      return;
    }

    Alert.alert("Location not available", "Unable to get your current location.");
  };

  const handleAddMarker = () => {
    if (currentLocationCoordinate) {
      dispatch({
        type: "setDraftMarker",
        payload: currentLocationCoordinate,
      });
      dispatch({ type: "setMarkerInputVisible", payload: true });
    } else {
      Alert.alert("Location not available", "Unable to get your current location.");
    }
  };

  const handleLongPress = (coordinate: MapCoordinate) => {
    dispatch({
      type: "setDraftMarker",
      payload: coordinate,
    });
    dispatch({ type: "setMarkerInputVisible", payload: true });
  };

  const handleMarkerDragEnd = (coordinate: MapCoordinate) => {
    dispatch({
      type: "setDraftMarker",
      payload: coordinate,
    });
  };

  const handleStartNavigation = (marker: MarkerData | null = session.selectedMarker) => {
    if (!marker) {
      return;
    }

    if (isLocationPermissionDenied) {
      Alert.alert("Location access required", LOCATION_ACCESS_REQUIRED_MESSAGE);
      return;
    }

    if (!currentLocationCoordinate) {
      Alert.alert(
        "Location unavailable",
        "Unable to determine your current location. Please try again.",
      );
      return;
    }

    dispatch({ type: "startNavigation", payload: marker });
    onMarkerSelectionChange?.(false);
  };

  const handleStopNavigation = () => {
    dispatch({ type: "stopNavigation" });

    if (session.browseCamera) {
      mapControllerRef.current?.restoreBrowseCamera(session.browseCamera);
    }
  };

  return {
    markers: DEFAULT_MARKERS,
    selectedMarker: session.selectedMarker,
    userMarker: session.draftMarker,
    markerName: session.markerDraftFields.name,
    markerInfo: session.markerDraftFields.info,
    showInputBox: session.isMarkerInputVisible,
    setMarkerName: (value: string) =>
      dispatch({ type: "setMarkerDraftName", payload: value }),
    setMarkerInfo: (value: string) =>
      dispatch({ type: "setMarkerDraftInfo", payload: value }),
    setShowInputBox: (value: boolean) =>
      dispatch({ type: "setMarkerInputVisible", payload: value }),
    handleMarkerPress,
    handleMapPress,
    handleLongPress,
    handleMarkerDragEnd,
    handleCenterOnUserLocation,
    handleAddMarker,
    handleStartNavigation,
    handleStopNavigation,
    isNavigationActive,
    activeNavigationDestination: session.navigationDestination,
  };
};

export default useMapInteractions;
