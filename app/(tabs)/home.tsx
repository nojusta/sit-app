import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  AppState,
  BackHandler,
  View,
  Linking,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  Text,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";

import { useAuthContext } from "@/features/auth";
import {
  CircleButton,
  GoogleMapSurface,
  InfoWindow,
  MarkerFilterSheet,
  MarkerPlacementCard,
  type MapInteractionController,
  isGoogleNavigationSdkNativeAvailable,
  useMapInteractions,
  useMarkerFilters,
  useMarkerContext,
  useUserLocation,
} from "@/features/map";
import { MarkerCreationModal } from "@/features/markers";
import {
  listApprovedMarkers,
  listUserFavoriteMarkerIds,
  subscribeToMarkerChanges,
  toggleMarkerFavorite,
} from "@/services/appwrite";
import { useAppwrite } from "@/shared/hooks";
import { NoticeBanner } from "@/shared/components";

const INITIAL_INFO_WINDOW_HEIGHT = 238;
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

const FilterMapButton: React.FC<{
  activeFilterCount: number;
  onPress: () => void;
}> = ({ activeFilterCount, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Open marker filters"
    className="h-14 w-14 items-center justify-center rounded-full border border-[#4A4A4A] bg-[#2D2D2D]"
  >
    <MaterialIcons name="tune" size={24} color="#FFFFFF" />
    {activeFilterCount > 0 ? (
      <View className="min-h-6 min-w-6 absolute -right-1 -top-1 items-center justify-center rounded-full bg-red-600 px-1.5">
        <Text className="font-psemibold text-xs text-white">{activeFilterCount}</Text>
      </View>
    ) : null}
  </Pressable>
);

const MarkerFilterEmptyOverlay: React.FC<{
  onClear: () => void;
}> = ({ onClear }) => (
  <View pointerEvents="box-none" className="absolute inset-x-5 top-32 items-center">
    <View className="w-full rounded-2xl bg-white/95 px-5 py-4 shadow-lg">
      <Text className="text-center font-psemibold text-base text-slate-950">
        No markers have been found
      </Text>
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel="Clear all filters"
        className="mt-3 min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-4"
      >
        <Text className="font-psemibold text-sm text-white">Clear all filters</Text>
      </Pressable>
    </View>
  </View>
);

const HomeApp: React.FC = () => {
  const router = useRouter();
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
  const fetchFavoriteMarkerIds = useCallback(
    () =>
      isLogged && user?.$id ? listUserFavoriteMarkerIds(user.$id) : Promise.resolve([]),
    [isLogged, user?.$id],
  );
  const {
    data: favoriteMarkerIds,
    error: favoritesError,
    refetch: refetchFavoriteMarkerIds,
  } = useAppwrite(fetchFavoriteMarkerIds);
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
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const favoriteIds = favoriteMarkerIds ?? [];
  const { filters, filteredMarkers, activeFilterCount, applyFilters, clearFilters } =
    useMarkerFilters({
      markers: approvedMarkers ?? [],
      currentLocation,
      favoriteMarkerIds: favoriteIds,
    });
  const {
    markers,
    selectedMarker,
    userMarker,
    isPlacementMode,
    isCreationModalVisible,
    markerName,
    markerInfo,
    markerPhoto,
    markerAttributes,
    isSubmittingMarker,
    setMarkerName,
    setMarkerInfo,
    setMarkerPhoto,
    setMarkerAttributes,
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
    markers: filteredMarkers,
    currentUserId: user?.$id,
    isAuthenticated: isLogged,
    isLocationPermissionDenied: isPermissionDenied,
    onMarkerCreated: refetchMarkers,
    onMarkerSelectionChange: setIsMarkerSelected,
  });
  const selectedMarkerIsFavorite = selectedMarker
    ? favoriteIds.includes(selectedMarker.id)
    : false;
  const isBrowseModeIdle =
    !isNavigationActive &&
    !isPlacementMode &&
    !isCreationModalVisible &&
    !selectedMarker &&
    isNativeGoogleMapAvailable;
  const shouldShowNoFilterResults =
    activeFilterCount > 0 &&
    (approvedMarkers?.length ?? 0) > 0 &&
    markers.length === 0 &&
    !isNavigationActive &&
    !isPlacementMode &&
    !isCreationModalVisible;

  const handleToggleSelectedMarkerFavorite = useCallback(async () => {
    if (!selectedMarker || !user?.$id) {
      Alert.alert(
        "Sign in required",
        "You need an account to save favorite sitting places.",
      );
      return;
    }

    setIsTogglingFavorite(true);

    try {
      await toggleMarkerFavorite(selectedMarker.id, user.$id);
      await refetchFavoriteMarkerIds();
    } catch (error) {
      Alert.alert(
        "Favorite unavailable",
        error instanceof Error ? error.message : "Could not update this favorite place.",
      );
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [refetchFavoriteMarkerIds, selectedMarker, user?.$id]);

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
      void refetchMarkers();
      void refetchFavoriteMarkerIds();
    }
  }, [isFocused, refetchFavoriteMarkerIds, refetchMarkers, refreshLocation]);

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
    const isOverlayFlowActive =
      isPlacementMode || isCreationModalVisible || isFilterSheetVisible;
    setIsPlacementActive(isOverlayFlowActive);

    return () => {
      setIsPlacementActive(false);
    };
  }, [
    isCreationModalVisible,
    isFilterSheetVisible,
    isPlacementMode,
    setIsPlacementActive,
  ]);

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
        {favoritesError && isLogged && (
          <NoticeBanner
            title="Favorites unavailable"
            description="Favorite places could not be loaded right now."
            actionLabel="Retry"
            onAction={refetchFavoriteMarkerIds}
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
              onMarkerUpdated={refetchMarkers}
              isAuthenticated={isLogged}
              isFavorite={selectedMarkerIsFavorite}
              isTogglingFavorite={isTogglingFavorite}
              onToggleFavorite={handleToggleSelectedMarkerFavorite}
              onViewAllReviews={() =>
                router.push({
                  pathname: "/marker-reviews",
                  params: {
                    markerId: selectedMarker.id,
                    markerTitle: selectedMarker.title,
                  },
                })
              }
            />
          )}
        <MarkerCreationModal
          visible={isCreationModalVisible && !isPickerLaunching}
          title={markerName}
          description={markerInfo}
          photo={markerPhoto}
          attributes={markerAttributes}
          isSubmitting={isSubmittingMarker}
          onTitleChange={setMarkerName}
          onDescriptionChange={setMarkerInfo}
          onAttributesChange={setMarkerAttributes}
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
            <SafeAreaView
              pointerEvents="box-none"
              edges={["top"]}
              className="absolute right-5 top-0"
            >
              <FilterMapButton
                activeFilterCount={activeFilterCount}
                onPress={() => setIsFilterSheetVisible(true)}
              />
            </SafeAreaView>
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
        {shouldShowNoFilterResults ? (
          <MarkerFilterEmptyOverlay onClear={clearFilters} />
        ) : null}
        <MarkerFilterSheet
          visible={isFilterSheetVisible && isBrowseModeIdle}
          filters={filters}
          resultCount={markers.length}
          isAuthenticated={isLogged}
          hasCurrentLocation={currentLocation !== null}
          onClose={() => setIsFilterSheetVisible(false)}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      </View>
    </SafeAreaProvider>
  );
};

export default HomeApp;
