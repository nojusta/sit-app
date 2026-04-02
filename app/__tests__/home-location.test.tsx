import React from "react";
import { useIsFocused } from "@react-navigation/native";
import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import HomeApp from "../(tabs)/home";

const setIsMarkerSelected = jest.fn();
const handleCenterOnUserLocation = jest.fn();
const handleAddMarker = jest.fn();
const refreshLocation = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useIsFocused: jest.fn(),
}));

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockMap = ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );
  const Marker = ({ children }: { children?: React.ReactNode }) => (
    <View>{children}</View>
  );
  const UrlTile = () => null;

  return {
    __esModule: true,
    default: MockMap,
    Marker,
    UrlTile,
    PROVIDER_GOOGLE: "google",
    PROVIDER_DEFAULT: "default",
  };
});

jest.mock("react-native-map-clustering", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockClusteredMapView = ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );
  MockClusteredMapView.displayName = "MockClusteredMapView";
  return MockClusteredMapView;
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

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock("@/features/markers", () => ({
  MarkerInputBox: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return <Text>Marker input</Text>;
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
    }) => {
      const [collapsed, setCollapsed] = React.useState(false);

      return (
        <View>
          <Text>{title}</Text>
          <TouchableOpacity
            onPress={() => setCollapsed((current: boolean) => !current)}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? "Expand notice" : "Minimize notice"}
          >
            <Text>{collapsed ? "Expand notice" : "Minimize notice"}</Text>
          </TouchableOpacity>
          {!collapsed ? <Text>{description}</Text> : null}
          {!collapsed && actionLabel && onAction ? (
            <TouchableOpacity onPress={onAction}>
              <Text>{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
  };
});

jest.mock("@/features/map", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const actual = jest.requireActual("@/features/map");

  return {
    ...actual,
    GoogleNavigationView: ({ destination }: { destination: { title: string } }) => (
      <Text>Google navigation to {destination.title}</Text>
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
    useMapInteractions: jest.fn(),
    useMarkerContext: jest.fn(),
    useUserLocation: jest.fn(),
  };
});

const { useMapInteractions, useMarkerContext, useUserLocation } =
  jest.requireMock("@/features/map");
const mockedUseIsFocused = jest.mocked(useIsFocused);

describe("home location permission flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsFocused.mockReturnValue(true);

    useMarkerContext.mockReturnValue({
      setIsMarkerSelected,
    });

    useMapInteractions.mockReturnValue({
      markers: [],
      selectedMarker: null,
      userMarker: null,
      markerName: "",
      markerInfo: "",
      showInputBox: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setShowInputBox: jest.fn(),
      handleMarkerPress: jest.fn(),
      handleMapPress: jest.fn(),
      handleLongPress: jest.fn(),
      handleMarkerDragEnd: jest.fn(),
      handleCenterOnUserLocation,
      handleAddMarker,
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

    expect(centerButton.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(centerButton);
    expect(handleCenterOnUserLocation).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Open settings"));
    expect(openSettingsSpy).toHaveBeenCalled();
  });

  it("lets the user minimize the notice while keeping the title visible", () => {
    useUserLocation.mockReturnValue({
      location: null,
      permissionState: "denied",
      isPermissionDenied: true,
      isPermissionGranted: false,
      isPermissionLoading: false,
      refreshLocation,
    });

    render(<HomeApp />);

    fireEvent.press(screen.getByRole("button", { name: "Minimize notice" }));

    expect(screen.getByText("Location access required")).toBeTruthy();
    expect(
      screen.queryByText(
        "Enable location permission to use location-based navigation features on the map.",
      ),
    ).toBeNull();
    expect(screen.queryByText("Open settings")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Expand notice" }));

    expect(
      screen.getByText(
        "Enable location permission to use location-based navigation features on the map.",
      ),
    ).toBeTruthy();
  });

  it("keeps the navigation control enabled when location access is available", () => {
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

    expect(
      screen.queryByText(
        "Enable location permission to use location-based navigation features on the map.",
      ),
    ).toBeNull();

    const centerButton = screen.getByRole("button", {
      name: "Center on my location",
    });

    expect(centerButton.props.accessibilityState?.disabled).not.toBe(true);

    fireEvent.press(centerButton);
    expect(handleCenterOnUserLocation).toHaveBeenCalled();
  });

  it("starts embedded navigation mode and swaps the floating map controls", () => {
    const handleStopNavigation = jest.fn();

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
      markerName: "",
      markerInfo: "",
      showInputBox: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setShowInputBox: jest.fn(),
      handleMarkerPress: jest.fn(),
      handleMapPress: jest.fn(),
      handleLongPress: jest.fn(),
      handleMarkerDragEnd: jest.fn(),
      handleCenterOnUserLocation,
      handleAddMarker,
      handleStartNavigation: jest.fn(),
      handleStopNavigation,
      isNavigationActive: true,
      activeNavigationDestination: {
        id: 1,
        title: "Cathedral Square",
        description: "Main square",
        coordinate: { latitude: 54.6839, longitude: 25.2875 },
      },
    });

    render(<HomeApp />);

    expect(screen.getByText("Google navigation to Cathedral Square")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add marker" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Center on my location" })).toBeNull();

    const stopNavigationButton = screen.getByRole("button", {
      name: "Stop navigation",
    });

    fireEvent.press(stopNavigationButton);
    expect(handleStopNavigation).toHaveBeenCalled();
  });

  it("passes the selected marker into start navigation from the marker sheet", () => {
    const handleStartNavigation = jest.fn();
    const selectedMarker = {
      id: 1,
      title: "Kudirka Square",
      description: "Benches, skaters, and a statue of Vincas Kudirka",
      coordinate: { latitude: 54.6868, longitude: 25.2799 },
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
      markerName: "",
      markerInfo: "",
      showInputBox: false,
      setMarkerName: jest.fn(),
      setMarkerInfo: jest.fn(),
      setShowInputBox: jest.fn(),
      handleMarkerPress: jest.fn(),
      handleMapPress: jest.fn(),
      handleLongPress: jest.fn(),
      handleMarkerDragEnd: jest.fn(),
      handleCenterOnUserLocation,
      handleAddMarker,
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
