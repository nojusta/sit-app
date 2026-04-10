import { Alert } from "react-native";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import type React from "react";

import { createMarker } from "@/services/appwrite";
import type { MapCameraSnapshot, MapInteractionController, MarkerData } from "../../core";
import useMapInteractions from "../useMapInteractions";

jest.mock("@/services/appwrite", () => ({
  createMarker: jest.fn(),
}));

const mockedCreateMarker = jest.mocked(createMarker);

const BROWSE_CAMERA: MapCameraSnapshot = {
  target: { latitude: 54.6872, longitude: 25.2797 },
  zoom: 14.2,
  bearing: 0,
  tilt: 0,
};

const MARKERS: MarkerData[] = [
  {
    id: "marker-1",
    coordinate: { latitude: 54.6868, longitude: 25.2799 },
    title: "Kudirka Square",
    description: "Skaters and benches",
    location: "54.686800,25.279900",
    status: "approved",
    authorId: "admin-user",
    createdAt: "2026-04-10T09:00:00.000Z",
    photoUrl: null,
  },
  {
    id: "marker-2",
    coordinate: { latitude: 54.6839, longitude: 25.2875 },
    title: "Cathedral Square",
    description: "Main square",
    location: "54.683900,25.287500",
    status: "approved",
    authorId: "admin-user",
    createdAt: "2026-04-10T08:00:00.000Z",
    photoUrl: null,
  },
];

const createMapControllerRef = () => {
  const captureBrowseCamera = jest.fn().mockResolvedValue(BROWSE_CAMERA);
  const focusCoordinate = jest.fn();
  const restoreBrowseCamera = jest.fn();
  const centerOnCoordinate = jest.fn();
  const centerOnUserLocation = jest.fn().mockResolvedValue(true);

  return {
    mapControllerRef: {
      current: {
        captureBrowseCamera,
        focusCoordinate,
        restoreBrowseCamera,
        centerOnCoordinate,
        centerOnUserLocation,
      } as MapInteractionController,
    } as React.MutableRefObject<MapInteractionController | null>,
    captureBrowseCamera,
    focusCoordinate,
    restoreBrowseCamera,
    centerOnCoordinate,
    centerOnUserLocation,
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

  it("starts navigation for the selected marker and exits marker details", async () => {
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
        markers: MARKERS,
        onMarkerSelectionChange,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(MARKERS[0]);
    });

    await waitFor(() => expect(mapController.captureBrowseCamera).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    expect(result.current.isNavigationActive).toBe(true);
    expect(result.current.activeNavigationDestination?.id).toBe(MARKERS[0].id);
    expect(result.current.selectedMarker).toBeNull();
    expect(onMarkerSelectionChange).toHaveBeenNthCalledWith(1, true);
    expect(onMarkerSelectionChange).toHaveBeenNthCalledWith(2, false);
    expect(mapController.focusCoordinate).toHaveBeenCalledWith(MARKERS[0].coordinate);
  });

  it("shows the required message and does not activate navigation without location access", async () => {
    const mapController = createMapControllerRef();

    const { result } = renderHook(() =>
      useMapInteractions({
        mapControllerRef: mapController.mapControllerRef,
        location: null,
        markers: MARKERS,
        isLocationPermissionDenied: true,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(MARKERS[0]);
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
  });

  it("stops navigation and restores the previous browse camera", async () => {
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
        markers: MARKERS,
      }),
    );

    act(() => {
      result.current.handleMarkerPress(MARKERS[0]);
    });

    await waitFor(() => expect(mapController.captureBrowseCamera).toHaveBeenCalled());

    act(() => {
      result.current.handleStartNavigation();
    });

    act(() => {
      result.current.handleStopNavigation();
    });

    expect(result.current.isNavigationActive).toBe(false);
    expect(result.current.activeNavigationDestination).toBeNull();
    expect(mapController.restoreBrowseCamera).toHaveBeenCalledWith(BROWSE_CAMERA);
  });

  it("enters placement mode and repositions the draft marker from the map", () => {
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
        markers: MARKERS,
        currentUserId: "user-1",
        isAuthenticated: true,
      }),
    );

    act(() => {
      result.current.handleAddMarker();
    });

    expect(result.current.isPlacementMode).toBe(true);
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

    expect(result.current.userMarker).toEqual({
      latitude: 54.6881,
      longitude: 25.2815,
    });
  });

  it("requires authentication before entering placement mode", () => {
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
        markers: MARKERS,
      }),
    );

    act(() => {
      result.current.handleAddMarker();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Sign in required",
      "You need an account to submit a new sitting place.",
    );
    expect(result.current.isPlacementMode).toBe(false);
  });

  it("submits a new marker and resets the draft state", async () => {
    const mapController = createMapControllerRef();
    const onMarkerCreated = jest.fn();
    const location = {
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    };

    mockedCreateMarker.mockResolvedValue({
      id: "marker-3",
      coordinate: { latitude: 54.6872, longitude: 25.2797 },
      title: "Bench near Cathedral",
      description: "Quiet in the morning",
      location: "54.687200,25.279700",
      status: "pending_approval",
      authorId: "user-1",
      createdAt: "2026-04-10T10:10:00.000Z",
      photoUrl: null,
    });

    const { result } = renderHook(() =>
      useMapInteractions({
        mapControllerRef: mapController.mapControllerRef,
        location: location as never,
        markers: MARKERS,
        currentUserId: "user-1",
        isAuthenticated: true,
        onMarkerCreated,
      }),
    );

    act(() => {
      result.current.handleAddMarker();
      result.current.setMarkerName("Bench near Cathedral");
      result.current.setMarkerInfo("Quiet in the morning");
      result.current.handleConfirmPlacement();
    });

    await act(async () => {
      await result.current.handleSubmitMarker();
    });

    expect(mockedCreateMarker).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        title: "Bench near Cathedral",
        description: "Quiet in the morning",
      }),
    );
    expect(onMarkerCreated).toHaveBeenCalled();
    expect(result.current.isPlacementMode).toBe(false);
    expect(result.current.userMarker).toBeNull();
    expect(result.current.isCreationModalVisible).toBe(false);
  });
});
