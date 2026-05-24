import React from "react";
import { useIsFocused } from "@react-navigation/native";
import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import HomeApp from "../(tabs)/home";

const mockRouterPush = jest.fn();
const setIsMarkerSelected = jest.fn();
const setIsNavigationActive = jest.fn();
const setIsPlacementActive = jest.fn();
const handleCenterOnUserLocation = jest.fn();
const handleAddMarker = jest.fn();
const handleConfirmPlacement = jest.fn();
const refreshLocation = jest.fn();
const refetchMarkers = jest.fn();
const refetchFavoriteMarkerIds = jest.fn();
const applyFilters = jest.fn();
const clearFilters = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  UIImagePickerPresentationStyle: {
    FULL_SCREEN: "fullScreen",
  },
  CameraType: {
    back: "back",
  },
}));

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const { Text } = require("react-native");

  const MockMaterialIcons = ({ name }: { name: string }) => <Text>{name}</Text>;
  MockMaterialIcons.displayName = "MockMaterialIcons";
  return MockMaterialIcons;
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock("@/features/auth", () => ({
  useAuthContext: jest.fn(),
}));

jest.mock("@/shared/hooks", () => ({
  useAppwrite: jest.fn(),
}));

jest.mock("@/services/appwrite", () => ({
  listApprovedMarkers: jest.fn(),
  listUserFavoriteMarkerIds: jest.fn(),
  subscribeToMarkerChanges: jest.fn(() => () => {}),
  toggleMarkerFavorite: jest.fn(),
}));

jest.mock("@/features/markers", () => ({
  MarkerCreationModal: ({ visible }: { visible: boolean }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return visible ? <Text>Marker creation modal</Text> : null;
  },
}));

jest.mock("@/shared/components", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return {
    CustomButton: ({
      title,
      handlePress,
      accessibilityLabel,
    }: {
      title: string;
      handlePress: () => void;
      accessibilityLabel?: string;
    }) => (
      <TouchableOpacity
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    NoticeBanner: ({
      title,
      description,
      actionLabel,
      onAction,
    }: {
      title: string;
      description: string;
      actionLabel?: string;
      onAction?: () => void;
    }) => (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
        {actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction}>
            <Text>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
  };
});

jest.mock("@/features/map", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");

  return {
    CircleButton: ({
      onPress,
      disabled,
      accessibilityLabel,
    }: {
      onPress?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
    }) => (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        <Text>{accessibilityLabel}</Text>
      </TouchableOpacity>
    ),
    GoogleMapSurface: ({
      navigationDestination,
      markers = [],
    }: {
      navigationDestination?: { title: string } | null;
      markers?: { id: string }[];
    }) => (
      <Text>
        {navigationDestination
          ? `Google map surface navigating to ${navigationDestination.title}`
          : `Google map surface ${markers.length} markers`}
      </Text>
    ),
    InfoWindow: ({
      selectedMarker,
      onStartNavigation,
      onToggleFavorite,
      isAuthenticated = false,
      isFavoriteStateReady = true,
      isTogglingFavorite = false,
    }: {
      selectedMarker: { title: string };
      onStartNavigation?: () => void;
      onToggleFavorite?: () => void;
      isAuthenticated?: boolean;
      isFavoriteStateReady?: boolean;
      isTogglingFavorite?: boolean;
    }) => (
      <>
        <Text>{selectedMarker.title}</Text>
        <TouchableOpacity
          onPress={onToggleFavorite}
          disabled={isTogglingFavorite || (isAuthenticated && !isFavoriteStateReady)}
          accessibilityRole="button"
          accessibilityLabel="Toggle favorite"
          accessibilityState={{
            disabled: isTogglingFavorite || (isAuthenticated && !isFavoriteStateReady),
          }}
        >
          <Text>Toggle favorite</Text>
        </TouchableOpacity>
        <Text onPress={onStartNavigation}>Start Navigation</Text>
      </>
    ),
    MarkerFilterSheet: ({
      visible,
      onApply,
      onClear,
    }: {
      visible: boolean;
      onApply?: (filters: unknown) => void;
      onClear?: () => void;
    }) =>
      visible ? (
        <>
          <Text>Marker filter sheet</Text>
          <Text onPress={() => onApply?.({ attributes: ["quiet"] })}>Apply filters</Text>
          <Text onPress={onClear}>Clear all</Text>
        </>
      ) : null,
    MarkerPlacementCard: ({ onConfirm }: { onConfirm?: () => void }) => (
      <Text onPress={onConfirm}>Placement Card</Text>
    ),
    isGoogleNavigationSdkNativeAvailable: jest.fn(() => true),
    useMapInteractions: jest.fn(),
    useMarkerFilters: jest.fn(),
    useMarkerContext: jest.fn(),
    useUserLocation: jest.fn(),
  };
});

const { useAuthContext } = jest.requireMock("@/features/auth");
const { useAppwrite } = jest.requireMock("@/shared/hooks");
const { toggleMarkerFavorite } = jest.requireMock("@/services/appwrite");
const { useMapInteractions, useMarkerFilters, useMarkerContext, useUserLocation } =
  jest.requireMock("@/features/map");
const mockedUseIsFocused = jest.mocked(useIsFocused);

const mockUseAppwriteData = ({
  markers = [],
  favorites = [],
  favoriteLoading = false,
  favoriteRefreshing = false,
  markerError = null,
  favoriteError = null,
}: {
  markers?: unknown[];
  favorites?: string[];
  favoriteLoading?: boolean;
  favoriteRefreshing?: boolean;
  markerError?: Error | null;
  favoriteError?: Error | null;
} = {}) => {
  useAppwrite
    .mockReset()
    .mockReturnValueOnce({
      data: markers,
      loading: false,
      refreshing: false,
      error: markerError,
      refetch: refetchMarkers,
    })
    .mockReturnValueOnce({
      data: favoriteLoading && favorites.length === 0 ? null : favorites,
      loading: favoriteLoading,
      refreshing: favoriteRefreshing,
      error: favoriteError,
      refetch: refetchFavoriteMarkerIds,
    })
    .mockReturnValue({
      data: [],
      loading: false,
      refreshing: false,
      error: null,
      refetch: jest.fn(),
    });
};

describe("home location permission flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsFocused.mockReturnValue(true);
    jest.spyOn(console, "warn").mockImplementation(() => {});

    useAuthContext.mockReturnValue({
      isLogged: true,
      user: { $id: "user-1" },
    });

    mockUseAppwriteData();

    useMarkerContext.mockReturnValue({
      setIsMarkerSelected,
      setIsNavigationActive,
      setIsPlacementActive,
    });

    useMarkerFilters.mockReturnValue({
      filters: {
        attributes: [],
        hasPhotosOnly: false,
        minimumRating: null,
        maxDistanceMeters: null,
        favoritesOnly: false,
      },
      filteredMarkers: [],
      activeFilterCount: 0,
      applyFilters,
      clearFilters,
    });

    useMapInteractions.mockReturnValue({
      markers: [],
      selectedMarker: null,
      userMarker: null,
      isPlacementMode: false,
      isCreationModalVisible: false,
      markerName: "",
      markerInfo: "",
      markerPhoto: null,
      markerAttributes: [],
      isSubmittingMarker: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setMarkerPhoto: jest.fn(),
      setMarkerAttributes: jest.fn(),
      handleMarkerPress: jest.fn(),
      handleMapPress: jest.fn(),
      handleCenterOnUserLocation,
      handleAddMarker,
      handleCancelPlacement: jest.fn(),
      handleConfirmPlacement,
      handleCloseCreationModal: jest.fn(),
      handleSubmitMarker: jest.fn(),
      handleStartNavigation: jest.fn(),
      handleStopNavigation: jest.fn(),
      isNavigationActive: false,
      activeNavigationDestination: null,
    });
  });

  it("shows a clear denial message, disables centering, and opens settings", async () => {
    const openSettingsSpy = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue(undefined);

    useUserLocation.mockReturnValue({
      location: null,
      permissionState: "denied",
      isPermissionDenied: true,
      isPermissionGranted: false,
      isPermissionLoading: false,
      refreshLocation,
    });

    render(<HomeApp />);

    expect(refreshLocation).toHaveBeenCalledWith({ requestPermission: false });
    expect(
      screen.getByText(
        "Enable location permission to use location-based navigation features on the map.",
      ),
    ).toBeTruthy();

    const centerButton = screen.getByRole("button", {
      name: "Center on my location",
    });
    expect(centerButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByText("Open settings"));
    expect(openSettingsSpy).toHaveBeenCalled();
  });

  it("hides map action buttons while navigation is active", () => {
    useUserLocation.mockReturnValue({
      location: {
        coords: { latitude: 54.6872, longitude: 25.2797 },
      },
      permissionState: "granted",
      isPermissionDenied: false,
      isPermissionGranted: true,
      isPermissionLoading: false,
      refreshLocation,
    });

    useMapInteractions.mockReturnValue({
      markers: [],
      selectedMarker: null,
      userMarker: null,
      isPlacementMode: false,
      isCreationModalVisible: false,
      markerName: "",
      markerInfo: "",
      markerPhoto: null,
      markerAttributes: [],
      isSubmittingMarker: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setMarkerPhoto: jest.fn(),
      setMarkerAttributes: jest.fn(),
      handleMarkerPress: jest.fn(),
      handleMapPress: jest.fn(),
      handleCenterOnUserLocation,
      handleAddMarker,
      handleCancelPlacement: jest.fn(),
      handleConfirmPlacement,
      handleCloseCreationModal: jest.fn(),
      handleSubmitMarker: jest.fn(),
      handleStartNavigation: jest.fn(),
      handleStopNavigation: jest.fn(),
      isNavigationActive: true,
      activeNavigationDestination: {
        id: "marker-2",
        title: "Cathedral Square",
        description: "Main square",
        coordinate: { latitude: 54.6839, longitude: 25.2875 },
        location: "54.683900,25.287500",
        status: "approved",
        authorId: "admin-user",
        createdAt: "2026-04-10T09:00:00.000Z",
        photoUrl: null,
        attributes: [],
      },
    });

    render(<HomeApp />);

    expect(
      screen.getByText("Google map surface navigating to Cathedral Square"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add marker" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Center on my location" })).toBeNull();
  });

  it("passes the selected marker into start navigation from the marker sheet", () => {
    const handleStartNavigation = jest.fn();
    const selectedMarker = {
      id: "marker-1",
      title: "Kudirka Square",
      description: "Benches and skaters",
      coordinate: { latitude: 54.6868, longitude: 25.2799 },
      location: "54.686800,25.279900",
      status: "approved" as const,
      authorId: "admin-user",
      createdAt: "2026-04-10T09:00:00.000Z",
      photoUrl: null,
      attributes: [],
    };

    useUserLocation.mockReturnValue({
      location: {
        coords: { latitude: 54.6872, longitude: 25.2797 },
      },
      permissionState: "granted",
      isPermissionDenied: false,
      isPermissionGranted: true,
      isPermissionLoading: false,
      refreshLocation,
    });

    useMapInteractions.mockReturnValue({
      markers: [],
      selectedMarker,
      userMarker: null,
      isPlacementMode: false,
      isCreationModalVisible: false,
      markerName: "",
      markerInfo: "",
      markerPhoto: null,
      markerAttributes: [],
      isSubmittingMarker: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setMarkerPhoto: jest.fn(),
      setMarkerAttributes: jest.fn(),
      handleMarkerPress: jest.fn(),
      handleMapPress: jest.fn(),
      handleCenterOnUserLocation,
      handleAddMarker,
      handleCancelPlacement: jest.fn(),
      handleConfirmPlacement,
      handleCloseCreationModal: jest.fn(),
      handleSubmitMarker: jest.fn(),
      handleStartNavigation,
      handleStopNavigation: jest.fn(),
      isNavigationActive: false,
      activeNavigationDestination: null,
    });

    render(<HomeApp />);

    fireEvent.press(screen.getByText("Start Navigation"));
    expect(handleStartNavigation).toHaveBeenCalledWith(selectedMarker);
  });

  it("disables favorite toggling until favorite state is loaded", () => {
    const selectedMarker = {
      id: "marker-1",
      title: "Kudirka Square",
      description: "Benches and skaters",
      coordinate: { latitude: 54.6868, longitude: 25.2799 },
      location: "54.686800,25.279900",
      status: "approved" as const,
      authorId: "admin-user",
      createdAt: "2026-04-10T09:00:00.000Z",
      photoUrl: null,
      attributes: [],
    };

    mockUseAppwriteData({ favoriteLoading: true });
    useUserLocation.mockReturnValue({
      location: {
        coords: { latitude: 54.6872, longitude: 25.2797 },
      },
      permissionState: "granted",
      isPermissionDenied: false,
      isPermissionGranted: true,
      isPermissionLoading: false,
      refreshLocation,
    });
    useMapInteractions.mockReturnValue({
      markers: [],
      selectedMarker,
      userMarker: null,
      isPlacementMode: false,
      isCreationModalVisible: false,
      markerName: "",
      markerInfo: "",
      markerPhoto: null,
      markerAttributes: [],
      isSubmittingMarker: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setMarkerPhoto: jest.fn(),
      setMarkerAttributes: jest.fn(),
      handleMarkerPress: jest.fn(),
      handleMapPress: jest.fn(),
      handleCenterOnUserLocation,
      handleAddMarker,
      handleCancelPlacement: jest.fn(),
      handleConfirmPlacement,
      handleCloseCreationModal: jest.fn(),
      handleSubmitMarker: jest.fn(),
      handleStartNavigation: jest.fn(),
      handleStopNavigation: jest.fn(),
      isNavigationActive: false,
      activeNavigationDestination: null,
    });

    render(<HomeApp />);

    const favoriteButton = screen.getByRole("button", { name: "Toggle favorite" });
    expect(favoriteButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(favoriteButton);
    expect(toggleMarkerFavorite).not.toHaveBeenCalled();
  });

  it("opens the filter sheet from the browse map button and applies filters", () => {
    useUserLocation.mockReturnValue({
      location: {
        coords: { latitude: 54.6872, longitude: 25.2797 },
      },
      permissionState: "granted",
      isPermissionDenied: false,
      isPermissionGranted: true,
      isPermissionLoading: false,
      refreshLocation,
    });

    render(<HomeApp />);

    fireEvent.press(screen.getByRole("button", { name: "Open marker filters" }));
    expect(screen.getByText("Marker filter sheet")).toBeTruthy();
    expect(setIsPlacementActive).toHaveBeenLastCalledWith(true);

    fireEvent.press(screen.getByText("Apply filters"));
    expect(applyFilters).toHaveBeenCalledWith({ attributes: ["quiet"] });
  });

  it("passes filtered markers into map interactions", () => {
    const filteredMarker = {
      id: "marker-1",
      title: "Kudirka Square",
      description: "Benches",
      coordinate: { latitude: 54.6868, longitude: 25.2799 },
      location: "54.686800,25.279900",
      status: "approved" as const,
      authorId: "admin-user",
      createdAt: "2026-04-10T09:00:00.000Z",
      photoUrl: null,
      attributes: ["quiet" as const],
    };

    useMarkerFilters.mockReturnValue({
      filters: {
        attributes: ["quiet"],
        hasPhotosOnly: false,
        minimumRating: null,
        maxDistanceMeters: null,
        favoritesOnly: false,
      },
      filteredMarkers: [filteredMarker],
      activeFilterCount: 1,
      applyFilters,
      clearFilters,
    });
    useUserLocation.mockReturnValue({
      location: {
        coords: { latitude: 54.6872, longitude: 25.2797 },
      },
      permissionState: "granted",
      isPermissionDenied: false,
      isPermissionGranted: true,
      isPermissionLoading: false,
      refreshLocation,
    });

    render(<HomeApp />);

    expect(useMapInteractions).toHaveBeenCalledWith(
      expect.objectContaining({
        markers: [filteredMarker],
      }),
    );
  });

  it("shows the no-results filter message and clears filters", () => {
    mockUseAppwriteData({
      markers: [
        {
          id: "marker-1",
          title: "Kudirka Square",
          description: "Benches",
          coordinate: { latitude: 54.6868, longitude: 25.2799 },
          location: "54.686800,25.279900",
          status: "approved",
          authorId: "admin-user",
          createdAt: "2026-04-10T09:00:00.000Z",
          photoUrl: null,
          attributes: [],
        },
      ],
    });
    useMarkerFilters.mockReturnValue({
      filters: {
        attributes: ["quiet"],
        hasPhotosOnly: false,
        minimumRating: null,
        maxDistanceMeters: null,
        favoritesOnly: false,
      },
      filteredMarkers: [],
      activeFilterCount: 1,
      applyFilters,
      clearFilters,
    });
    useUserLocation.mockReturnValue({
      location: {
        coords: { latitude: 54.6872, longitude: 25.2797 },
      },
      permissionState: "granted",
      isPermissionDenied: false,
      isPermissionGranted: true,
      isPermissionLoading: false,
      refreshLocation,
    });

    render(<HomeApp />);

    expect(screen.getByText("No markers have been found")).toBeTruthy();
    fireEvent.press(screen.getByText("Clear all filters"));
    expect(clearFilters).toHaveBeenCalled();
  });
});
