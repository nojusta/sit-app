import React, { useEffect, useMemo, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  CircleButton,
  GoogleMapSurface,
  InfoWindow,
  type MapInteractionController,
  isGoogleNavigationSdkNativeAvailable,
  useMapInteractions,
  useMarkerContext,
  useUserLocation,
} from "@/features/map";
import { MarkerInputBox } from "@/features/markers";
import { NoticeBanner } from "@/shared/components";

const INITIAL_INFO_WINDOW_HEIGHT = 170;

const HomeApp: React.FC = () => {
  const { setIsMarkerSelected, setIsNavigationActive } = useMarkerContext();
  const mapControllerRef = useRef<MapInteractionController | null>(null);
  const isNativeGoogleMapAvailable = isGoogleNavigationSdkNativeAvailable();
  const isFocused = useIsFocused();
  const { location, isPermissionDenied, isPermissionGranted, refreshLocation } =
    useUserLocation();
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
    markerName,
    markerInfo,
    showInputBox,
    setMarkerName,
    setMarkerInfo,
    setShowInputBox,
    handleMarkerPress,
    handleMapPress,
    handleCenterOnUserLocation,
    handleAddMarker,
    handleStartNavigation,
    handleStopNavigation,
    isNavigationActive,
    activeNavigationDestination,
  } = useMapInteractions({
    mapControllerRef,
    location,
    isLocationPermissionDenied: isPermissionDenied,
    onMarkerSelectionChange: setIsMarkerSelected,
  });

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
        {!isNavigationActive && selectedMarker && isNativeGoogleMapAvailable && (
          <InfoWindow
            selectedMarker={selectedMarker}
            initialHeight={INITIAL_INFO_WINDOW_HEIGHT}
            onStartNavigation={() => handleStartNavigation(selectedMarker)}
          />
        )}
        {showInputBox && (
          <MarkerInputBox
            markerName={markerName}
            setMarkerName={setMarkerName}
            markerInfo={markerInfo}
            setMarkerInfo={setMarkerInfo}
            setShowInputBox={setShowInputBox}
          />
        )}
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
