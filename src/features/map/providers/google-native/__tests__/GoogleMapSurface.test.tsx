import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";

import type { MapInteractionController, MarkerData } from "../../../core";
import GoogleMapSurface from "../GoogleMapSurface";

const mockClearMapView = jest.fn();
const mockAddMarker = jest.fn();
const mockGetCameraPosition = jest.fn();
const mockGetMyLocation = jest.fn();
const mockMoveCamera = jest.fn();
const mockSetNavigationUIEnabled = jest.fn();
const mockAreTermsAccepted = jest.fn();
const mockShowTermsAndConditionsDialog = jest.fn();
const mockInit = jest.fn();
const mockCleanup = jest.fn();
const mockSetDestination = jest.fn();
const mockStartGuidance = jest.fn();
const mockStartUpdatingLocation = jest.fn();
const mockStopGuidance = jest.fn();
const mockClearDestinations = jest.fn();
const mockStopLocationSimulation = jest.fn();
const mockLoadGoogleNavigationSdk = jest.fn();
let mockArrivalHandler: ((event: { isFinalDestination?: boolean }) => void) | null = null;
let mockLocationChangedHandler:
  | ((location: { lat: number; lng: number; speed: number; time: number }) => void)
  | null = null;

let latestMapCallbacks: {
  onMarkerClick?: (marker: { id: string }) => void;
  onMapClick?: (coordinate: { lat: number; lng: number }) => void;
} = {};

jest.mock("../../../utils/googleNavigationSdk", () => ({
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

describe("GoogleMapSurface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestMapCallbacks = {};
    mockArrivalHandler = null;
    mockLocationChangedHandler = null;
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    mockClearMapView.mockResolvedValue(undefined);
    mockAddMarker.mockImplementation(async ({ id }: { id: string }) => ({ id }));
    mockGetCameraPosition.mockResolvedValue({
      target: { lat: 54.6872, lng: 25.2797 },
      zoom: 14.3,
      bearing: 5,
      tilt: 25,
    });
    mockGetMyLocation.mockResolvedValue({
      lat: 54.6869,
      lng: 25.2801,
      speed: 0,
      time: 0,
    });
    mockMoveCamera.mockResolvedValue(undefined);
    mockSetNavigationUIEnabled.mockResolvedValue(undefined);
    mockAreTermsAccepted.mockResolvedValue(true);
    mockShowTermsAndConditionsDialog.mockResolvedValue(true);
    mockInit.mockResolvedValue("ok");
    mockCleanup.mockResolvedValue(undefined);
    mockSetDestination.mockResolvedValue("OK");
    mockStartGuidance.mockResolvedValue(undefined);
    mockStartUpdatingLocation.mockImplementation(async () => {
      mockLocationChangedHandler?.({
        lat: 54.6869,
        lng: 25.2801,
        speed: 0,
        time: 0,
      });
    });
    mockStopGuidance.mockResolvedValue(undefined);
    mockClearDestinations.mockResolvedValue(undefined);
    mockStopLocationSimulation.mockReset();

    mockLoadGoogleNavigationSdk.mockReturnValue({
      NavigationProvider: ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
      ),
      TaskRemovedBehavior: {
        CONTINUE_SERVICE: "CONTINUE_SERVICE",
      },
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
            getMyLocation: mockGetMyLocation,
            moveCamera: mockMoveCamera,
          });
          onMapReady?.();
        }, [onMapReady, onMapViewControllerCreated]);

        latestMapCallbacks = {
          onMapClick,
          onMarkerClick,
        };

        return <View testID="google-browse-map-surface" />;
      },
      NavigationView: ({
        onMapReady,
        onMapClick,
        onMarkerClick,
        onMapViewControllerCreated,
        onNavigationViewControllerCreated,
      }: {
        onMapReady?: () => void;
        onMapClick?: (coordinate: { lat: number; lng: number }) => void;
        onMarkerClick?: (marker: { id: string }) => void;
        onMapViewControllerCreated?: (controller: unknown) => void;
        onNavigationViewControllerCreated?: (controller: unknown) => void;
      }) => {
        const React = require("react");
        const { View } = require("react-native");

        React.useEffect(() => {
          onMapViewControllerCreated?.({
            clearMapView: mockClearMapView,
            addMarker: mockAddMarker,
            getCameraPosition: mockGetCameraPosition,
            getMyLocation: mockGetMyLocation,
            moveCamera: mockMoveCamera,
          });
          onNavigationViewControllerCreated?.({
            setNavigationUIEnabled: mockSetNavigationUIEnabled,
          });
          onMapReady?.();
        }, [onMapReady, onMapViewControllerCreated, onNavigationViewControllerCreated]);

        latestMapCallbacks = {
          onMapClick,
          onMarkerClick,
        };

        return <View testID="google-map-surface" />;
      },
      NavigationUIEnabledPreference: {
        DISABLED: "disabled",
      },
      NavigationSessionStatus: {
        OK: "ok",
      },
      RouteStatus: {
        OK: "OK",
      },
      TravelMode: {
        WALKING: "WALKING",
      },
      useNavigation: () => ({
        navigationController: {
          areTermsAccepted: mockAreTermsAccepted,
          showTermsAndConditionsDialog: mockShowTermsAndConditionsDialog,
          init: mockInit,
          cleanup: mockCleanup,
          setDestination: mockSetDestination,
          startGuidance: mockStartGuidance,
          startUpdatingLocation: mockStartUpdatingLocation,
          stopGuidance: mockStopGuidance,
          clearDestinations: mockClearDestinations,
          setBackgroundLocationUpdatesEnabled: jest.fn(),
          simulator: {
            simulateLocation: jest.fn(),
            stopLocationSimulation: mockStopLocationSimulation,
          },
        },
        setOnArrival: (handler: typeof mockArrivalHandler) => {
          mockArrivalHandler = handler;
        },
        setOnLocationChanged: (handler: typeof mockLocationChangedHandler) => {
          mockLocationChangedHandler = handler ?? null;
        },
        setOnNavigationReady: jest.fn(),
        setLogDebugInfo: jest.fn(),
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders browse mode with marker sync and forwards map interactions", async () => {
    const onMarkerPress = jest.fn();
    const onMapPress = jest.fn();

    render(
      <GoogleMapSurface
        mapControllerRef={{ current: null }}
        markers={MARKERS}
        draftMarker={{ latitude: 54.6881, longitude: 25.2815 }}
        navigationDestination={null}
        currentLocation={null}
        showsUserLocation
        onMarkerPress={onMarkerPress}
        onMapPress={onMapPress}
        onStopNavigation={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockClearMapView).toHaveBeenCalled());
    expect(mockAddMarker).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "marker-1",
        imgPath: expect.any(String),
      }),
    );
    expect(mockAddMarker).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "marker-2",
        imgPath: expect.any(String),
      }),
    );
    expect(mockAddMarker).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        id: "draft-marker",
        imgPath: expect.any(String),
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

  it("keeps one Google surface and starts guidance when navigation becomes active", async () => {
    const onStopNavigation = jest.fn();
    const mapControllerRef: React.MutableRefObject<MapInteractionController | null> = {
      current: null,
    };

    const { rerender } = render(
      <GoogleMapSurface
        mapControllerRef={mapControllerRef}
        markers={MARKERS}
        draftMarker={null}
        navigationDestination={null}
        currentLocation={{ latitude: 54.6872, longitude: 25.2797 }}
        showsUserLocation
        onMarkerPress={jest.fn()}
        onMapPress={jest.fn()}
        onStopNavigation={onStopNavigation}
      />,
    );

    await waitFor(() => expect(mapControllerRef.current).not.toBeNull());

    rerender(
      <GoogleMapSurface
        mapControllerRef={mapControllerRef}
        markers={MARKERS}
        draftMarker={null}
        navigationDestination={MARKERS[1]}
        currentLocation={{ latitude: 54.6872, longitude: 25.2797 }}
        showsUserLocation
        onMarkerPress={jest.fn()}
        onMapPress={jest.fn()}
        onStopNavigation={onStopNavigation}
      />,
    );

    expect(screen.getByText("Starting navigation to Cathedral Square")).toBeTruthy();

    await waitFor(() => expect(mockInit).toHaveBeenCalled());
    expect(mockSetDestination).toHaveBeenCalledWith(
      {
        title: "Cathedral Square",
        position: { lat: 54.6839, lng: 25.2875 },
      },
      expect.objectContaining({
        routingOptions: {
          travelMode: "WALKING",
        },
      }),
    );
    await waitFor(() => expect(mockSetNavigationUIEnabled).toHaveBeenCalledWith(true));
    await waitFor(() => expect(mockStartGuidance).toHaveBeenCalled());

    act(() => {
      mockArrivalHandler?.({ isFinalDestination: true });
    });

    await waitFor(() => expect(onStopNavigation).toHaveBeenCalled());
    expect(mockStopGuidance).toHaveBeenCalled();
    expect(mockClearDestinations).toHaveBeenCalled();
  });

  it("centers on the live Google map location through the shared controller", async () => {
    const mapControllerRef: React.MutableRefObject<MapInteractionController | null> = {
      current: null,
    };

    render(
      <GoogleMapSurface
        mapControllerRef={mapControllerRef}
        markers={MARKERS}
        draftMarker={null}
        navigationDestination={null}
        currentLocation={{ latitude: 54.6872, longitude: 25.2797 }}
        showsUserLocation
        onMarkerPress={jest.fn()}
        onMapPress={jest.fn()}
        onStopNavigation={jest.fn()}
      />,
    );

    await waitFor(() => expect(mapControllerRef.current).not.toBeNull());

    await act(async () => {
      const centered = await mapControllerRef.current?.centerOnUserLocation();
      expect(centered).toBe(true);
    });

    expect(mockGetMyLocation).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockMoveCamera).toHaveBeenLastCalledWith({
        target: { lat: 54.6869, lng: 25.2801 },
        zoom: 17.5,
        bearing: 5,
        tilt: 25,
      }),
    );
  });
});
