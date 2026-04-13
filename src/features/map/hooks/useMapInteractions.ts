import { useMemo, useState } from "react";
import type React from "react";
import { Alert } from "react-native";
import { LocationObject } from "expo-location";

import { createMarker, type UploadableImage } from "@/services/appwrite";
import {
  type MapCameraSnapshot,
  type MapCoordinate,
  type MapInteractionController,
  type MarkerData,
} from "../core";
import {
  getLocationCoordinate,
  LOCATION_ACCESS_REQUIRED_MESSAGE,
} from "../utils/navigation";

interface UseMapInteractionsOptions {
  mapControllerRef: React.RefObject<MapInteractionController | null>;
  location: LocationObject | null;
  markers: MarkerData[];
  currentUserId?: string | null;
  isAuthenticated?: boolean;
  isLocationPermissionDenied?: boolean;
  onMarkerCreated?: () => Promise<void> | void;
  onMarkerSelectionChange?: (selected: boolean) => void;
}

const initialDraftValues = {
  title: "",
  description: "",
};

const coordinatesMatch = (left: MapCoordinate | null, right: MapCoordinate | null) =>
  left?.latitude === right?.latitude && left?.longitude === right?.longitude;

const useMapInteractions = ({
  mapControllerRef,
  location,
  markers,
  currentUserId,
  isAuthenticated = false,
  isLocationPermissionDenied = false,
  onMarkerCreated,
  onMarkerSelectionChange,
}: UseMapInteractionsOptions) => {
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [browseCamera, setBrowseCamera] = useState<MapCameraSnapshot | null>(null);
  const [draftMarker, setDraftMarker] = useState<MapCoordinate | null>(null);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [isCreationModalVisible, setIsCreationModalVisible] = useState(false);
  const [draftTitle, setDraftTitle] = useState(initialDraftValues.title);
  const [draftDescription, setDraftDescription] = useState(
    initialDraftValues.description,
  );
  const [draftPhoto, setDraftPhoto] = useState<UploadableImage | null>(null);
  const [isSubmittingMarker, setIsSubmittingMarker] = useState(false);
  const [navigationDestination, setNavigationDestination] = useState<MarkerData | null>(
    null,
  );

  const currentLocationCoordinate = useMemo(
    () => getLocationCoordinate(location),
    [location],
  );
  const isNavigationActive = navigationDestination !== null;

  const resetDraftState = () => {
    setDraftMarker(null);
    setIsPlacementMode(false);
    setIsCreationModalVisible(false);
    setDraftTitle(initialDraftValues.title);
    setDraftDescription(initialDraftValues.description);
    setDraftPhoto(null);
  };

  const handleMarkerPress = (marker: MarkerData) => {
    if (isNavigationActive || isPlacementMode) {
      return;
    }

    if (mapControllerRef.current) {
      mapControllerRef.current
        .captureBrowseCamera()
        .then((camera) => {
          if (camera) {
            setBrowseCamera(camera);
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

    setSelectedMarker(marker);
    onMarkerSelectionChange?.(true);
    mapControllerRef.current?.focusCoordinate(marker.coordinate);
  };

  const handleMapPress = (coordinate?: MapCoordinate) => {
    if (isPlacementMode) {
      if (coordinate) {
        setDraftMarker((current) =>
          coordinatesMatch(current, coordinate) ? current : coordinate,
        );
        onMarkerSelectionChange?.(false);
      }

      return;
    }

    if (selectedMarker || draftMarker || isCreationModalVisible) {
      mapControllerRef.current?.clearSelectedMarker();
      setSelectedMarker(null);
      setIsCreationModalVisible(false);
      onMarkerSelectionChange?.(false);

      if (browseCamera && !isNavigationActive) {
        mapControllerRef.current?.restoreBrowseCamera(browseCamera);
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
    if (!isAuthenticated || !currentUserId) {
      Alert.alert(
        "Sign in required",
        "You need an account to submit a new sitting place.",
      );
      return;
    }

    if (!currentLocationCoordinate) {
      Alert.alert("Location not available", "Unable to get your current location.");
      return;
    }

    setSelectedMarker(null);
    onMarkerSelectionChange?.(false);
    setDraftMarker(currentLocationCoordinate);
    setIsPlacementMode(true);
    setIsCreationModalVisible(false);
  };

  const handleCancelPlacement = () => {
    resetDraftState();
    onMarkerSelectionChange?.(false);

    if (browseCamera && !isNavigationActive) {
      mapControllerRef.current?.restoreBrowseCamera(browseCamera);
    }
  };

  const handleConfirmPlacement = () => {
    if (!draftMarker) {
      Alert.alert(
        "Select a spot",
        "Move the marker to choose where the sitting place is.",
      );
      return;
    }

    setIsCreationModalVisible(true);
  };

  const handleCloseCreationModal = () => {
    setIsCreationModalVisible(false);
  };

  const handleStartNavigation = (marker: MarkerData | null = selectedMarker) => {
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

    setNavigationDestination(marker);
    setSelectedMarker(null);
    resetDraftState();
    onMarkerSelectionChange?.(false);
  };

  const handleStopNavigation = () => {
    setNavigationDestination(null);

    if (browseCamera) {
      mapControllerRef.current?.restoreBrowseCamera(browseCamera);
    }
  };

  const handleSubmitMarker = async () => {
    if (!draftMarker) {
      Alert.alert("Select a spot", "Drag the marker to choose a location first.");
      return;
    }

    if (!currentUserId) {
      Alert.alert(
        "Sign in required",
        "You need an account to submit a new sitting place.",
      );
      return;
    }

    if (!draftTitle.trim() || !draftDescription.trim()) {
      Alert.alert(
        "Missing information",
        "Both title and description are required before you can submit.",
      );
      return;
    }

    setIsSubmittingMarker(true);

    try {
      await createMarker({
        title: draftTitle,
        description: draftDescription,
        coordinate: draftMarker,
        authorId: currentUserId,
        photo: draftPhoto,
      });
      resetDraftState();
      await onMarkerCreated?.();
      Alert.alert(
        "Marker submitted",
        "Your sitting place is pending approval and will appear after review.",
      );
    } catch (error) {
      Alert.alert(
        "Submission failed",
        error instanceof Error ? error.message : "Could not create the marker.",
      );
    } finally {
      setIsSubmittingMarker(false);
    }
  };

  return {
    markers,
    selectedMarker,
    userMarker: draftMarker,
    isPlacementMode,
    isCreationModalVisible,
    markerName: draftTitle,
    markerInfo: draftDescription,
    markerPhoto: draftPhoto,
    isSubmittingMarker,
    setMarkerName: setDraftTitle,
    setMarkerInfo: setDraftDescription,
    setMarkerPhoto: setDraftPhoto,
    handleMarkerPress,
    handleMapPress,
    handleCenterOnUserLocation,
    handleAddMarker,
    handleCancelPlacement,
    handleConfirmPlacement,
    handleCloseCreationModal,
    handleSubmitMarker,
    handleStartNavigation,
    handleStopNavigation,
    isNavigationActive,
    activeNavigationDestination: navigationDestination,
  };
};

export default useMapInteractions;
