import type { RefObject } from "react";
import { Alert } from "react-native";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import type MapView from "react-native-maps";

import useMapInteractions from "../useMapInteractions";

const createMapRef = () => {
  const animateToRegion = jest.fn();
  const getMapBoundaries = jest.fn().mockResolvedValue({
    northEast: { latitude: 54.6882, longitude: 25.2807 },
    southWest: { latitude: 54.6862, longitude: 25.2787 },
  });

  return {
    mapRef: {
      current: {
        animateToRegion,
        getMapBoundaries,
      } as unknown as MapView,
    } as RefObject<MapView | null>,
    animateToRegion,
    getMapBoundaries,
  };
};

describe("useMapInteractions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts navigation for the selected marker and exits marker-details mode", async () => {
    const mapRef = createMapRef();
    const onMarkerSelectionChange = jest.fn();
    const location = {
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    };

    const { result } = renderHook(() =>
      useMapInteractions({
        mapRef: mapRef.mapRef,
        location: location as never,
        onMarkerSelectionChange,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapRef.getMapBoundaries).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    expect(result.current.isNavigationActive).toBe(true);
    expect(result.current.activeNavigationDestination?.id).toBe(
      result.current.markers[0].id,
    );
    expect(result.current.selectedMarker).toBeNull();
    expect(onMarkerSelectionChange).toHaveBeenNthCalledWith(1, true);
    expect(onMarkerSelectionChange).toHaveBeenNthCalledWith(2, false);
    expect(mapRef.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: result.current.markers[0].coordinate.latitude,
        longitude: result.current.markers[0].coordinate.longitude,
      }),
      800,
    );
  });

  it("shows the required message and does not activate navigation without location access", async () => {
    const mapRef = createMapRef();

    const { result } = renderHook(() =>
      useMapInteractions({
        mapRef: mapRef.mapRef,
        location: null,
        isLocationPermissionDenied: true,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapRef.getMapBoundaries).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Location access required",
      "Location access is required to start navigation.",
    );
    expect(result.current.isNavigationActive).toBe(false);
    expect(result.current.activeNavigationDestination).toBeNull();
  });

  it("keeps navigation inactive when current location cannot be resolved yet", async () => {
    const mapRef = createMapRef();

    const { result } = renderHook(() =>
      useMapInteractions({
        mapRef: mapRef.mapRef,
        location: null,
        isLocationPermissionDenied: false,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapRef.getMapBoundaries).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Location unavailable",
      "Unable to determine your current location. Please try again.",
    );
    expect(result.current.isNavigationActive).toBe(false);
  });

  it("stops navigation and returns the map to the previous region", async () => {
    const mapRef = createMapRef();
    const location = {
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    };

    const { result } = renderHook(() =>
      useMapInteractions({
        mapRef: mapRef.mapRef,
        location: location as never,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapRef.getMapBoundaries).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    await waitFor(() => expect(result.current.isNavigationActive).toBe(true));

    act(() => {
      result.current.handleStopNavigation();
    });

    expect(result.current.isNavigationActive).toBe(false);
    expect(result.current.activeNavigationDestination).toBeNull();
    const lastAnimateCall = mapRef.animateToRegion.mock.calls.at(-1);

    expect(lastAnimateCall?.[1]).toBe(800);
    expect(lastAnimateCall?.[0].latitude).toBeCloseTo(54.6872);
    expect(lastAnimateCall?.[0].longitude).toBeCloseTo(25.2797);
    expect(lastAnimateCall?.[0].latitudeDelta).toBeCloseTo(0.002);
    expect(lastAnimateCall?.[0].longitudeDelta).toBeCloseTo(0.002);
  });
});
