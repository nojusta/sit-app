import { Alert } from "react-native";
import { renderHook, act, waitFor } from "@testing-library/react-native";

import type { MapCameraSnapshot, MapInteractionController } from "../../core";

import useMapInteractions from "../useMapInteractions";

const BROWSE_CAMERA: MapCameraSnapshot = {
  target: { latitude: 54.6872, longitude: 25.2797 },
  zoom: 14.2,
  bearing: 0,
  tilt: 0,
};

const createMapControllerRef = () => {
  const captureBrowseCamera = jest.fn().mockResolvedValue(BROWSE_CAMERA);
  const focusCoordinate = jest.fn();
  const restoreBrowseCamera = jest.fn();
  const centerOnCoordinate = jest.fn();

  return {
    mapControllerRef: {
      current: {
        captureBrowseCamera,
        focusCoordinate,
        restoreBrowseCamera,
        centerOnCoordinate,
      } as MapInteractionController,
    } as React.MutableRefObject<MapInteractionController | null>,
    captureBrowseCamera,
    focusCoordinate,
    restoreBrowseCamera,
    centerOnCoordinate,
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
    const mapController = createMapControllerRef();
    const onMarkerSelectionChange = jest.fn();
    const location = {
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    };

    const { result } = renderHook(() =>
      useMapInteractions({
        mapControllerRef: mapController.mapControllerRef,
        location: location as never,
        onMarkerSelectionChange,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapController.captureBrowseCamera).toHaveBeenCalled());

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
    expect(mapController.focusCoordinate).toHaveBeenCalledWith(
      result.current.markers[0].coordinate,
    );
  });

  it("shows the required message and does not activate navigation without location access", async () => {
    const mapController = createMapControllerRef();

    const { result } = renderHook(() =>
      useMapInteractions({
        mapControllerRef: mapController.mapControllerRef,
        location: null,
        isLocationPermissionDenied: true,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapController.captureBrowseCamera).toHaveBeenCalled());

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
    const mapController = createMapControllerRef();

    const { result } = renderHook(() =>
      useMapInteractions({
        mapControllerRef: mapController.mapControllerRef,
        location: null,
        isLocationPermissionDenied: false,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapController.captureBrowseCamera).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Location unavailable",
      "Unable to determine your current location. Please try again.",
    );
    expect(result.current.isNavigationActive).toBe(false);
  });

  it("stops navigation and returns the map to the previous browse camera", async () => {
    const mapController = createMapControllerRef();
    const location = {
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    };

    const { result } = renderHook(() =>
      useMapInteractions({
        mapControllerRef: mapController.mapControllerRef,
        location: location as never,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(result.current.markers[0]);
    });

    await waitFor(() => expect(mapController.captureBrowseCamera).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    await waitFor(() => expect(result.current.isNavigationActive).toBe(true));

    act(() => {
      result.current.handleStopNavigation();
    });

    expect(result.current.isNavigationActive).toBe(false);
    expect(result.current.activeNavigationDestination).toBeNull();
    expect(mapController.restoreBrowseCamera).toHaveBeenCalledWith(BROWSE_CAMERA);
  });

  it("keeps marker draft mode active and repositions it from a map tap", () => {
    const mapController = createMapControllerRef();
    const location = {
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    };

    const { result } = renderHook(() =>
      useMapInteractions({
        mapControllerRef: mapController.mapControllerRef,
        location: location as never,
      }),
    );

    act(() => {
      result.current.handleAddMarker();
    });

    expect(result.current.showInputBox).toBe(true);
    expect(result.current.userMarker).toEqual({
      latitude: 54.6872,
      longitude: 25.2797,
    });

    act(() => {
      result.current.handleMapPress({
        latitude: 54.6881,
        longitude: 25.2815,
      });
    });

    expect(result.current.showInputBox).toBe(true);
    expect(result.current.userMarker).toEqual({
      latitude: 54.6881,
      longitude: 25.2815,
    });
  });
});
