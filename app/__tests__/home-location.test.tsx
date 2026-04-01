import React from "react";
import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import HomeApp from "../(tabs)/home";

const setIsMarkerSelected = jest.fn();
const handleCenterOnUserLocation = jest.fn();
const handleAddMarker = jest.fn();

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

jest.mock("@/features/map", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const actual = jest.requireActual("@/features/map");

  return {
    ...actual,
    InfoWindow: ({ selectedMarker }: { selectedMarker: { title: string } }) => (
      <Text>{selectedMarker.title}</Text>
    ),
    useMapInteractions: jest.fn(),
    useMarkerContext: jest.fn(),
    useUserLocation: jest.fn(),
  };
});

const { useMapInteractions, useMarkerContext, useUserLocation } =
  jest.requireMock("@/features/map");

describe("home location permission flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
    });

    render(<HomeApp />);

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
});
