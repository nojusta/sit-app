import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import type { MapInteractionController, MarkerData } from "../../core";
import GoogleBrowseMap from "../GoogleBrowseMap";

const mockClearMapView = jest.fn();
const mockAddMarker = jest.fn();
const mockGetCameraPosition = jest.fn();
const mockMoveCamera = jest.fn();
const mockLoadGoogleNavigationSdk = jest.fn();

let latestMapCallbacks: {
  onMarkerClick?: (marker: { id: string }) => void;
  onMapClick?: (coordinate: { lat: number; lng: number }) => void;
} = {};

jest.mock("../../utils/googleNavigationSdk", () => ({
  loadGoogleNavigationSdk: () => mockLoadGoogleNavigationSdk(),
}));

const MARKERS: MarkerData[] = [
  {
    id: 1,
    title: "Kudirka Square",
    description: "Skaters and benches",
    coordinate: { latitude: 54.6868, longitude: 25.2799 },
  },
  {
    id: 2,
    title: "Cathedral Square",
    description: "Main square",
    coordinate: { latitude: 54.6839, longitude: 25.2875 },
  },
];

describe("GoogleBrowseMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestMapCallbacks = {};

    mockClearMapView.mockResolvedValue(undefined);
    mockAddMarker.mockImplementation(async ({ id }: { id: string }) => ({ id }));
    mockGetCameraPosition.mockResolvedValue({
      target: { lat: 54.6872, lng: 25.2797 },
      zoom: 14.3,
      bearing: 5,
      tilt: 25,
    });
    mockMoveCamera.mockResolvedValue(undefined);

    mockLoadGoogleNavigationSdk.mockReturnValue({
      MapView: ({
        onMapReady,
        onMapClick,
        onMarkerClick,
        onMapViewControllerCreated,
      }: {
        onMapReady?: () => void;
        onMapClick?: (coordinate: { lat: number; lng: number }) => void;
        onMarkerClick?: (marker: { id: string }) => void;
        onMapViewControllerCreated?: (controller: unknown) => void;
      }) => {
        const React = require("react");
        const { View } = require("react-native");

        React.useEffect(() => {
          onMapViewControllerCreated?.({
            clearMapView: mockClearMapView,
            addMarker: mockAddMarker,
            getCameraPosition: mockGetCameraPosition,
            moveCamera: mockMoveCamera,
          });
          onMapReady?.();
        }, [onMapReady, onMapViewControllerCreated]);

        latestMapCallbacks = {
          onMapClick,
          onMarkerClick,
        };

        return <View testID="google-browse-map" />;
      },
    });
  });

  it("syncs marker state into the Google controller and forwards user interactions", async () => {
    const onMarkerPress = jest.fn();
    const onMapPress = jest.fn();

    render(
      <GoogleBrowseMap
        mapControllerRef={{ current: null }}
        markers={MARKERS}
        draftMarker={{ latitude: 54.6881, longitude: 25.2815 }}
        onMarkerPress={onMarkerPress}
        onMapPress={onMapPress}
        showsUserLocation
      />,
    );

    await waitFor(() => expect(mockClearMapView).toHaveBeenCalled());
    expect(mockAddMarker).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "marker-1",
        title: "Kudirka Square",
        position: { lat: 54.6868, lng: 25.2799 },
      }),
    );
    expect(mockAddMarker).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "marker-2",
        title: "Cathedral Square",
        position: { lat: 54.6839, lng: 25.2875 },
      }),
    );
    expect(mockAddMarker).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        id: "draft-marker",
        title: "New marker",
        position: { lat: 54.6881, lng: 25.2815 },
      }),
    );

    act(() => {
      latestMapCallbacks.onMarkerClick?.({ id: "marker-2" });
    });

    expect(onMarkerPress).toHaveBeenCalledWith(MARKERS[1]);

    act(() => {
      latestMapCallbacks.onMapClick?.({ lat: 54.689, lng: 25.284 });
    });

    expect(onMapPress).toHaveBeenCalledWith({
      latitude: 54.689,
      longitude: 25.284,
    });
  });

  it("exposes a provider-agnostic controller for camera actions", async () => {
    const mapControllerRef: React.MutableRefObject<MapInteractionController | null> = {
      current: null,
    };

    render(
      <GoogleBrowseMap
        mapControllerRef={mapControllerRef}
        markers={MARKERS}
        draftMarker={null}
        onMarkerPress={jest.fn()}
        onMapPress={jest.fn()}
        showsUserLocation={false}
      />,
    );

    await waitFor(() => expect(mapControllerRef.current).not.toBeNull());

    await expect(mapControllerRef.current?.captureBrowseCamera()).resolves.toEqual({
      target: { latitude: 54.6872, longitude: 25.2797 },
      zoom: 14.3,
      bearing: 5,
      tilt: 25,
    });

    act(() => {
      mapControllerRef.current?.focusCoordinate({
        latitude: 54.6839,
        longitude: 25.2875,
      });
      mapControllerRef.current?.centerOnCoordinate({
        latitude: 54.6872,
        longitude: 25.2797,
      });
      mapControllerRef.current?.restoreBrowseCamera({
        target: { latitude: 54.69, longitude: 25.28 },
        zoom: 13.5,
        bearing: 15,
        tilt: 20,
      });
    });

    await waitFor(() => expect(mockMoveCamera).toHaveBeenCalledTimes(3));
    expect(mockMoveCamera).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        target: { lat: 54.6839, lng: 25.2875 },
        zoom: 16.5,
      }),
    );
    expect(mockMoveCamera).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        target: { lat: 54.6872, lng: 25.2797 },
        zoom: 17.5,
      }),
    );
    expect(mockMoveCamera).toHaveBeenNthCalledWith(3, {
      target: { lat: 54.69, lng: 25.28 },
      zoom: 13.5,
      bearing: 15,
      tilt: 20,
    });
  });
});
