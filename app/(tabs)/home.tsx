import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Linking, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from "react-native-image-picker";

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
import { listApprovedMarkers } from "@/services/appwrite";
import { useAppwrite } from "@/shared/hooks";
import { NoticeBanner } from "@/shared/components";

const INITIAL_INFO_WINDOW_HEIGHT = 170;

const HomeApp: React.FC = () => {
  const { isLogged, user } = useAuthContext();
  const { setIsMarkerSelected, setIsNavigationActive } = useMarkerContext();
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

  const handleMarkerPhotoChange = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }

    const file = response.assets?.[0];

    if (!file?.uri) {
      Alert.alert("Photo unavailable", "The selected image could not be read.");
      return;
    }

    setMarkerPhoto({
      uri: file.uri,
      name: file.fileName || `marker-${Date.now()}.jpg`,
      type: file.type || "image/jpeg",
      size: file.fileSize || 0,
    });
  };

  useEffect(() => {
    if (isFocused) {
      void refreshLocation({ requestPermission: false });
    }
  }, [isFocused, refreshLocation]);

  useEffect(() => {
    setIsNavigationActive(isNavigationActive);

    return () => {
      setIsNavigationActive(false);
    };
  }, [isNavigationActive, setIsNavigationActive]);

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
            coordinate={userMarker}
            onCancel={handleCancelPlacement}
            onConfirm={handleConfirmPlacement}
          />
        ) : null}
        {!isNavigationActive && selectedMarker && isNativeGoogleMapAvailable && (
          <InfoWindow
            selectedMarker={selectedMarker}
            initialHeight={INITIAL_INFO_WINDOW_HEIGHT}
            onStartNavigation={() => handleStartNavigation(selectedMarker)}
          />
        )}
        <MarkerCreationModal
          visible={isCreationModalVisible}
          coordinateLabel={
            userMarker
              ? `${userMarker.latitude.toFixed(5)}, ${userMarker.longitude.toFixed(5)}`
              : ""
          }
          title={markerName}
          description={markerInfo}
          photo={markerPhoto}
          isSubmitting={isSubmittingMarker}
          onTitleChange={setMarkerName}
          onDescriptionChange={setMarkerInfo}
          onTakePhoto={() =>
            launchCamera(
              { mediaType: "photo", saveToPhotos: false },
              handleMarkerPhotoChange,
            )
          }
          onChooseFromLibrary={() =>
            launchImageLibrary(
              { mediaType: "photo", selectionLimit: 1 },
              handleMarkerPhotoChange,
            )
          }
          onRemovePhoto={() => setMarkerPhoto(null)}
          onBack={handleCloseCreationModal}
          onCancel={handleCancelPlacement}
          onSubmit={handleSubmitMarker}
        />
        {!isNavigationActive && isNativeGoogleMapAvailable ? (
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
