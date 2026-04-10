import React from "react";
import { useIsFocused } from "@react-navigation/native";
import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import HomeApp from "../(tabs)/home";

const setIsMarkerSelected = jest.fn();
const setIsNavigationActive = jest.fn();
const setIsPlacementActive = jest.fn();
const handleCenterOnUserLocation = jest.fn();
const handleAddMarker = jest.fn();
const handleConfirmPlacement = jest.fn();
const refreshLocation = jest.fn();
const refetchMarkers = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useIsFocused: jest.fn(),
}));

jest.mock("react-native-image-picker", () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

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
    }: {
      navigationDestination?: { title: string } | null;
    }) => (
      <Text>
        {navigationDestination
          ? `Google map surface navigating to ${navigationDestination.title}`
          : "Google map surface"}
      </Text>
    ),
    InfoWindow: ({
      selectedMarker,
      onStartNavigation,
    }: {
      selectedMarker: { title: string };
      onStartNavigation?: () => void;
    }) => (
      <>
        <Text>{selectedMarker.title}</Text>
        <Text onPress={onStartNavigation}>Start Navigation</Text>
      </>
    ),
    MarkerPlacementCard: ({ onConfirm }: { onConfirm?: () => void }) => (
      <Text onPress={onConfirm}>Placement Card</Text>
    ),
    isGoogleNavigationSdkNativeAvailable: jest.fn(() => true),
    useMapInteractions: jest.fn(),
    useMarkerContext: jest.fn(),
    useUserLocation: jest.fn(),
  };
});

const { useAuthContext } = jest.requireMock("@/features/auth");
const { useAppwrite } = jest.requireMock("@/shared/hooks");
const { useMapInteractions, useMarkerContext, useUserLocation } =
  jest.requireMock("@/features/map");
const mockedUseIsFocused = jest.mocked(useIsFocused);

describe("home location permission flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsFocused.mockReturnValue(true);
    jest.spyOn(console, "warn").mockImplementation(() => {});

    useAuthContext.mockReturnValue({
      isLogged: true,
      user: { $id: "user-1" },
    });

    useAppwrite.mockReturnValue({
      data: [],
      loading: false,
      refreshing: false,
      error: null,
      refetch: refetchMarkers,
    });

    useMarkerContext.mockReturnValue({
      setIsMarkerSelected,
      setIsNavigationActive,
      setIsPlacementActive,
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
      isSubmittingMarker: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setMarkerPhoto: jest.fn(),
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
      isSubmittingMarker: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setMarkerPhoto: jest.fn(),
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
      isSubmittingMarker: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setMarkerPhoto: jest.fn(),
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
});
