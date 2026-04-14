import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  AppState,
  BackHandler,
  View,
  Linking,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";

import { useAuthContext } from "@/features/auth";
import {
  CircleButton,
  GoogleMapSurface,
  InfoWindow,
  MarkerPlacementCard,
  type MapInteractionController,
  isGoogleNavigationSdkNativeAvailable,
  useMapInteractions,
  useMarkerContext,
  useUserLocation,
} from "@/features/map";
import { MarkerCreationModal } from "@/features/markers";
import { listApprovedMarkers, subscribeToMarkerChanges } from "@/services/appwrite";
import { useAppwrite } from "@/shared/hooks";
import { NoticeBanner } from "@/shared/components";

const INITIAL_INFO_WINDOW_HEIGHT = 170;
const libraryPickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.86,
  allowsEditing: false,
  selectionLimit: 1,
  orderedSelection: true,
  presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
};
const cameraPickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.86,
  allowsEditing: false,
  cameraType: ImagePicker.CameraType.back,
};

const HomeApp: React.FC = () => {
  const { isLogged, user } = useAuthContext();
  const { setIsMarkerSelected, setIsNavigationActive, setIsPlacementActive } =
    useMarkerContext();
  const mapControllerRef = useRef<MapInteractionController | null>(null);
  const isNativeGoogleMapAvailable = isGoogleNavigationSdkNativeAvailable();
  const isFocused = useIsFocused();
  const { location, isPermissionDenied, isPermissionGranted, refreshLocation } =
    useUserLocation();
  const fetchApprovedMarkers = useCallback(() => listApprovedMarkers(), []);
  const {
    data: approvedMarkers,
    error: markersError,
    refetch: refetchMarkers,
  } = useAppwrite(fetchApprovedMarkers);
  const currentLocation = useMemo(
    () =>
      location
        ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        : null,
    [location],
  );
  const [isPickerLaunching, setIsPickerLaunching] = useState(false);
  const [pendingPickerMode, setPendingPickerMode] = useState<"camera" | "library" | null>(
    null,
  );
  const {
    markers,
    selectedMarker,
    userMarker,
    isPlacementMode,
    isCreationModalVisible,
    markerName,
    markerInfo,
    markerPhoto,
    isSubmittingMarker,
    setMarkerName,
    setMarkerInfo,
    setMarkerPhoto,
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
    activeNavigationDestination,
  } = useMapInteractions({
    mapControllerRef,
    location,
    markers: approvedMarkers ?? [],
    currentUserId: user?.$id,
    isAuthenticated: isLogged,
    isLocationPermissionDenied: isPermissionDenied,
    onMarkerCreated: refetchMarkers,
    onMarkerSelectionChange: setIsMarkerSelected,
  });

  const handleMarkerPhotoChange = useCallback(
    (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];

      if (!file?.uri) {
        Alert.alert("Photo unavailable", "The selected image could not be read.");
        return;
      }

      setMarkerPhoto({
        uri: file.uri,
        name: file.fileName || `marker-${Date.now()}.jpg`,
        type: file.mimeType || "image/jpeg",
        size: file.fileSize,
      });
    },
    [setMarkerPhoto],
  );

  const launchMarkerPicker = useCallback((mode: "camera" | "library") => {
    Keyboard.dismiss();
    setPendingPickerMode(mode);
    setIsPickerLaunching(true);
  }, []);

  useEffect(() => {
    if (!pendingPickerMode || !isPickerLaunching) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void (async () => {
        try {
          if (pendingPickerMode === "camera") {
            if (Platform.OS === "ios" && !Device.isDevice) {
              Alert.alert(
                "Camera unavailable",
                "Taking a new photo requires a real iPhone. Use Choose photo on the simulator.",
              );
              return;
            }

            const existingPermission = await ImagePicker.getCameraPermissionsAsync();

            if (!existingPermission.granted && existingPermission.canAskAgain === false) {
              Alert.alert(
                "Camera access required",
                "Allow camera access in Settings to take a photo for your new sitting spot.",
                [
                  {
                    text: "Not now",
                    style: "cancel",
                  },
                  {
                    text: "Open settings",
                    onPress: () => {
                      void Linking.openSettings();
                    },
                  },
                ],
              );
              return;
            }

            const permission = existingPermission.granted
              ? existingPermission
              : await ImagePicker.requestCameraPermissionsAsync();

            if (!permission.granted) {
              Alert.alert(
                "Camera access required",
                permission.canAskAgain === false
                  ? "Allow camera access in Settings to take a photo for your new sitting spot."
                  : "Allow camera access to take a photo for your new sitting spot.",
                permission.canAskAgain === false
                  ? [
                      {
                        text: "Not now",
                        style: "cancel",
                      },
                      {
                        text: "Open settings",
                        onPress: () => {
                          void Linking.openSettings();
                        },
                      },
                    ]
                  : undefined,
              );
              return;
            }
            const result = await ImagePicker.launchCameraAsync(cameraPickerOptions);
            handleMarkerPhotoChange(result);
            return;
          }

          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

          if (!permission.granted) {
            Alert.alert(
              "Photo library access required",
              "Allow photo access to choose an image for your sitting spot.",
            );
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync(libraryPickerOptions);
          handleMarkerPhotoChange(result);
        } catch (error) {
          Alert.alert(
            "Photo unavailable",
            error instanceof Error
              ? error.message
              : "The image picker could not be opened.",
          );
        } finally {
          setPendingPickerMode(null);
          setIsPickerLaunching(false);
        }
      })();
    }, 700);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [handleMarkerPhotoChange, isPickerLaunching, pendingPickerMode]);

  useEffect(() => {
    if (isFocused) {
      void refreshLocation({ requestPermission: false });
      refetchMarkers();
    }
  }, [isFocused, refetchMarkers, refreshLocation]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const queueMarkerRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        refetchMarkers();
      }, 350);
    };

    const unsubscribeMarkers = subscribeToMarkerChanges(() => {
      queueMarkerRefresh();
    });

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        queueMarkerRefresh();
      }
    });

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      unsubscribeMarkers();
      appStateSubscription.remove();
    };
  }, [isFocused, refetchMarkers]);

  useEffect(() => {
    setIsNavigationActive(isNavigationActive);

    return () => {
      setIsNavigationActive(false);
    };
  }, [isNavigationActive, setIsNavigationActive]);

  useEffect(() => {
    const isPlacementFlowActive = isPlacementMode || isCreationModalVisible;
    setIsPlacementActive(isPlacementFlowActive);

    return () => {
      setIsPlacementActive(false);
    };
  }, [isCreationModalVisible, isPlacementMode, setIsPlacementActive]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isCreationModalVisible) {
        handleCloseCreationModal();
        return true;
      }

      if (isPlacementMode) {
        handleCancelPlacement();
        return true;
      }

      if (selectedMarker) {
        handleMapPress();
        return true;
      }

      return false;
    });

    return () => {
      subscription.remove();
    };
  }, [
    handleCancelPlacement,
    handleCloseCreationModal,
    handleMapPress,
    isCreationModalVisible,
    isPlacementMode,
    selectedMarker,
  ]);

  return (
    <SafeAreaProvider>
      <View className="flex-1">
        {isPermissionDenied && (
          <NoticeBanner
            title="Location access required"
            description="Enable location permission to use location-based navigation features on the map."
            actionLabel="Open settings"
            onAction={() => Linking.openSettings()}
          />
        )}
        {markersError && (
          <NoticeBanner
            title="Markers unavailable"
            description="The map could not load approved sitting spots from Appwrite."
            actionLabel="Retry"
            onAction={refetchMarkers}
          />
        )}
        <GoogleMapSurface
          mapControllerRef={mapControllerRef}
          markers={markers}
          draftMarker={userMarker}
          navigationDestination={activeNavigationDestination}
          currentLocation={currentLocation}
          onMarkerPress={handleMarkerPress}
          onMapPress={handleMapPress}
          showsUserLocation={isPermissionGranted}
          onStopNavigation={handleStopNavigation}
        />
        {isPlacementMode && userMarker && !isCreationModalVisible ? (
          <MarkerPlacementCard
            onCancel={handleCancelPlacement}
            onConfirm={handleConfirmPlacement}
          />
        ) : null}
        {!isNavigationActive &&
          !isPlacementMode &&
          !isCreationModalVisible &&
          selectedMarker &&
          isNativeGoogleMapAvailable && (
            <InfoWindow
              selectedMarker={selectedMarker}
              initialHeight={INITIAL_INFO_WINDOW_HEIGHT}
              onStartNavigation={() => handleStartNavigation(selectedMarker)}
            />
          )}
        <MarkerCreationModal
          visible={isCreationModalVisible && !isPickerLaunching}
          title={markerName}
          description={markerInfo}
          photo={markerPhoto}
          isSubmitting={isSubmittingMarker}
          onTitleChange={setMarkerName}
          onDescriptionChange={setMarkerInfo}
          onTakePhoto={() => launchMarkerPicker("camera")}
          onChooseFromLibrary={() => launchMarkerPicker("library")}
          onRemovePhoto={() => setMarkerPhoto(null)}
          onBack={handleCloseCreationModal}
          onCancel={handleCancelPlacement}
          onSubmit={handleSubmitMarker}
        />
        {!isNavigationActive &&
        !isPlacementMode &&
        !isCreationModalVisible &&
        !selectedMarker &&
        isNativeGoogleMapAvailable ? (
          <>
            <CircleButton
              onPress={handleCenterOnUserLocation}
              icon="⌖"
              style="absolute bottom-28 right-5"
              isCenterOnUser={true}
              disabled={isPermissionDenied}
              accessibilityLabel="Center on my location"
            />
            <CircleButton
              onPress={handleAddMarker}
              icon="+"
              style="absolute bottom-28 left-5"
              accessibilityLabel="Add marker"
            />
          </>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
};

export default HomeApp;
