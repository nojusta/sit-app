import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from "react-native";
import type {
  Marker as GoogleMarker,
  MapViewController as GoogleMapViewController,
  NavigationViewController as GoogleNavigationViewController,
} from "@googlemaps/react-native-navigation-sdk";

import type {
  MapCameraSnapshot,
  MapCoordinate,
  MapInteractionController,
  MarkerData,
} from "../../core";
import {
  loadGoogleNavigationSdk,
  type GoogleNavigationSdkModule,
} from "../../utils/googleNavigationSdk";
import {
  getNavigationSessionStatusMessage,
  getRouteStatusMessage,
  NAVIGATION_UNAVAILABLE_TITLE,
} from "../../utils/navigation";

interface GoogleMapSurfaceProps {
  mapControllerRef: React.MutableRefObject<MapInteractionController | null>;
  markers: MarkerData[];
  draftMarker: MapCoordinate | null;
  navigationDestination: MarkerData | null;
  currentLocation: MapCoordinate | null;
  showsUserLocation: boolean;
  onMarkerPress: (marker: MarkerData) => void;
  onMapPress: (coordinate: MapCoordinate) => void;
  onStopNavigation: () => void;
}

interface GoogleMapSurfaceInnerProps extends GoogleMapSurfaceProps {
  navigationSdk: GoogleNavigationSdkModule;
}

type GoogleLatLng = {
  lat: number;
  lng: number;
};

type NavigationSdkRuntime = GoogleNavigationSdkModule | null;

const INITIAL_CAMERA: MapCameraSnapshot = {
  target: {
    latitude: 54.6872,
    longitude: 25.2797,
  },
  zoom: 14.5,
};

const FOCUS_ZOOM = 16.5;
const CENTER_ZOOM = 17.5;
const DRAFT_MARKER_ID = "draft-marker";
const CAMERA_ANIMATION_DURATION_MS = 360;
const CAMERA_ANIMATION_STEPS = 6;
const NAVIGATION_START_TIMEOUT_MS = 15000;
const NAVIGATION_LOCATION_TIMEOUT_MS = 4000;
const NAVIGATION_VIEW_RETRY_DELAY_MS = 250;
const NAVIGATION_VIEW_RETRY_ATTEMPTS = 4;
const CUSTOM_MARKER_IMAGE_CANDIDATES =
  Platform.select({
    ios: ["CustomMarker", "custom-marker", "custom-marker.png"],
    android: ["markers/custom-marker.png", "custom-marker.png", "custom-marker"],
    default: [],
  }) ?? [];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.08)",
  },
  loadingCard: {
    minWidth: 220,
    borderRadius: 18,
    backgroundColor: "rgba(31, 41, 55, 0.9)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#F9FAFB",
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
  },
  loadingHint: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  unavailableState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F3F4F6",
  },
  unavailableCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 5,
  },
  unavailableTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
    textAlign: "center",
  },
  unavailableText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    textAlign: "center",
  },
});

const toGoogleLatLng = (coordinate: MapCoordinate): GoogleLatLng => ({
  lat: coordinate.latitude,
  lng: coordinate.longitude,
});

const toMapCoordinate = (coordinate: GoogleLatLng): MapCoordinate => ({
  latitude: coordinate.lat,
  longitude: coordinate.lng,
});

const delay = (timeoutMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "";
};

const isNoViewControllerError = (error: unknown) =>
  getErrorMessage(error).includes("No view controller found for the specified nativeID");

const isInvalidImageError = (error: unknown) =>
  getErrorMessage(error).includes("Failed to load image from the provided path");

const isNavigatorNotReadyError = (error: unknown) =>
  getErrorMessage(error).includes("initialize the navigator is ready");

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const retryTransientNativeCommand = async <T,>(
  command: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  attempts = NAVIGATION_VIEW_RETRY_ATTEMPTS,
  retryDelayMs = NAVIGATION_VIEW_RETRY_DELAY_MS,
) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await command();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === attempts - 1) {
        throw error;
      }

      await delay(retryDelayMs);
    }
  }

  throw lastError;
};

const interpolateValue = (start: number, end: number, progress: number) =>
  start + (end - start) * progress;

const toMapCameraSnapshot = (
  camera: Awaited<ReturnType<GoogleMapViewController["getCameraPosition"]>>,
): MapCameraSnapshot => ({
  target: toMapCoordinate(camera.target),
  zoom: camera.zoom,
  bearing: camera.bearing,
  tilt: camera.tilt,
});

const animateCamera = async (
  controller: GoogleMapViewController,
  destination: {
    target: GoogleLatLng;
    zoom?: number;
    bearing?: number;
    tilt?: number;
  },
) => {
  try {
    const currentCamera = await controller.getCameraPosition();

    for (let step = 1; step <= CAMERA_ANIMATION_STEPS; step += 1) {
      const progress = step / CAMERA_ANIMATION_STEPS;

      await controller.moveCamera({
        target: {
          lat: interpolateValue(
            currentCamera.target.lat,
            destination.target.lat,
            progress,
          ),
          lng: interpolateValue(
            currentCamera.target.lng,
            destination.target.lng,
            progress,
          ),
        },
        zoom:
          destination.zoom !== undefined
            ? interpolateValue(
                currentCamera.zoom ?? destination.zoom,
                destination.zoom,
                progress,
              )
            : currentCamera.zoom,
        bearing:
          destination.bearing !== undefined
            ? interpolateValue(currentCamera.bearing ?? 0, destination.bearing, progress)
            : currentCamera.bearing,
        tilt:
          destination.tilt !== undefined
            ? interpolateValue(currentCamera.tilt ?? 0, destination.tilt, progress)
            : currentCamera.tilt,
      });

      if (step < CAMERA_ANIMATION_STEPS) {
        await delay(CAMERA_ANIMATION_DURATION_MS / CAMERA_ANIMATION_STEPS);
      }
    }
  } catch {
    await controller.moveCamera(destination);
  }
};

const createMapInteractionController = (
  controller: GoogleMapViewController,
): MapInteractionController => ({
  captureBrowseCamera: async () => {
    const camera = await controller.getCameraPosition();
    return toMapCameraSnapshot(camera);
  },
  focusCoordinate: (coordinate) => {
    void animateCamera(controller, {
      target: toGoogleLatLng(coordinate),
      zoom: FOCUS_ZOOM,
    });
  },
  restoreBrowseCamera: (camera) => {
    void animateCamera(controller, {
      target: toGoogleLatLng(camera.target),
      zoom: camera.zoom,
      bearing: camera.bearing,
      tilt: camera.tilt,
    });
  },
  centerOnCoordinate: (coordinate) => {
    void animateCamera(controller, {
      target: toGoogleLatLng(coordinate),
      zoom: CENTER_ZOOM,
    });
  },
  centerOnUserLocation: async () => {
    try {
      const location = await controller.getMyLocation();

      await animateCamera(controller, {
        target: {
          lat: location.lat,
          lng: location.lng,
        },
        zoom: CENTER_ZOOM,
      });

      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to center the map on the live user location.", error);
      }

      return false;
    }
  },
});

const GoogleMapSurfaceInner: React.FC<GoogleMapSurfaceInnerProps> = ({
  mapControllerRef,
  markers,
  draftMarker,
  navigationDestination,
  currentLocation,
  showsUserLocation,
  onMarkerPress,
  onMapPress,
  onStopNavigation,
  navigationSdk,
}) => {
  const {
    MapView,
    NavigationUIEnabledPreference,
    NavigationSessionStatus,
    NavigationView,
    RouteStatus,
    TravelMode,
    useNavigation,
  } = navigationSdk;
  const { navigationController, setOnArrival, setOnLocationChanged } = useNavigation();
  const nativeControllerRef = useRef<GoogleMapViewController | null>(null);
  const navigationViewControllerRef = useRef<GoogleNavigationViewController | null>(null);
  const parentMapControllerRef = useRef(mapControllerRef);
  const navigationControllerRef = useRef(navigationController);
  const onStopNavigationRef = useRef(onStopNavigation);
  const navigationSessionInitializedRef = useRef(false);
  const routePreparedRef = useRef(false);
  const guidanceStartedRef = useRef(false);
  const latestNavigationLocationRef = useRef<GoogleLatLng | null>(null);
  const previousNavigationModeRef = useRef<boolean | null>(null);
  const markerLookupRef = useRef<Map<string, MarkerData>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);
  const [isNavigationViewReady, setIsNavigationViewReady] = useState(false);
  const [isPreparingNavigation, setIsPreparingNavigation] = useState(false);

  const navigationSessionOk = NavigationSessionStatus.OK;
  const routeOk = RouteStatus.OK;
  const walkingTravelMode = TravelMode.WALKING;
  const isNavigationActive = navigationDestination !== null;

  parentMapControllerRef.current = mapControllerRef;
  navigationControllerRef.current = navigationController;
  onStopNavigationRef.current = onStopNavigation;

  const clearActiveNavigation = useCallback(async () => {
    const navigationViewController = navigationViewControllerRef.current;

    if (navigationViewController) {
      try {
        await retryTransientNativeCommand(
          () => navigationViewController.setNavigationUIEnabled(false),
          isNoViewControllerError,
        );
      } catch (error) {
        if (__DEV__ && !isNoViewControllerError(error)) {
          console.warn("Failed to disable Google navigation UI.", error);
        }
      }
    }

    if (!navigationSessionInitializedRef.current) {
      routePreparedRef.current = false;
      guidanceStartedRef.current = false;
      return;
    }

    if (guidanceStartedRef.current) {
      try {
        await navigationControllerRef.current.stopGuidance();
      } catch (error) {
        if (__DEV__ && !isNavigatorNotReadyError(error)) {
          console.warn("Failed to stop Google navigation guidance.", error);
        }
      }
    }

    if (routePreparedRef.current) {
      try {
        await navigationControllerRef.current.clearDestinations();
      } catch (error) {
        if (__DEV__ && !isNavigatorNotReadyError(error)) {
          console.warn("Failed to clear Google navigation destinations.", error);
        }
      }
    }

    try {
      await navigationControllerRef.current.cleanup();
    } catch (error) {
      if (__DEV__ && !isNavigatorNotReadyError(error)) {
        console.warn("Failed to clean up the Google navigation session.", error);
      }
    }

    navigationSessionInitializedRef.current = false;
    routePreparedRef.current = false;
    guidanceStartedRef.current = false;
    latestNavigationLocationRef.current = null;
  }, []);

  const waitForNavigationLocation = useCallback(async (timeoutMs: number) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (latestNavigationLocationRef.current) {
        return true;
      }

      await delay(200);
    }

    return false;
  }, []);

  const addMarkerWithFallback = useCallback(
    async (
      controller: GoogleMapViewController,
      marker: {
        id: string;
        position: GoogleLatLng;
        title?: string;
        snippet?: string;
      },
    ) => {
      const iconCandidates = [...CUSTOM_MARKER_IMAGE_CANDIDATES, undefined];
      let lastError: unknown;

      for (const iconCandidate of iconCandidates) {
        try {
          return await retryTransientNativeCommand(
            () =>
              controller.addMarker({
                ...marker,
                ...(iconCandidate ? { imgPath: iconCandidate } : {}),
              }),
            isNoViewControllerError,
          );
        } catch (error) {
          lastError = error;

          if (iconCandidate && isInvalidImageError(error)) {
            continue;
          }

          throw error;
        }
      }

      throw lastError;
    },
    [],
  );

  useEffect(() => {
    setOnArrival((arrivalEvent) => {
      if (arrivalEvent.isFinalDestination ?? true) {
        void clearActiveNavigation();
        onStopNavigationRef.current();
      }
    });

    return () => {
      setOnArrival(null);
    };
  }, [clearActiveNavigation, setOnArrival]);

  useEffect(() => {
    setOnLocationChanged((location) => {
      latestNavigationLocationRef.current = {
        lat: location.lat,
        lng: location.lng,
      };
    });

    return () => {
      setOnLocationChanged(null);
    };
  }, [setOnLocationChanged]);

  useEffect(() => {
    return () => {
      parentMapControllerRef.current.current = null;
      nativeControllerRef.current = null;
      navigationViewControllerRef.current = null;
      void clearActiveNavigation();
    };
  }, [clearActiveNavigation]);

  useEffect(() => {
    if (previousNavigationModeRef.current === null) {
      previousNavigationModeRef.current = isNavigationActive;
      return;
    }

    if (previousNavigationModeRef.current !== isNavigationActive) {
      previousNavigationModeRef.current = isNavigationActive;
      setIsMapReady(false);
      setIsNavigationViewReady(false);
      parentMapControllerRef.current.current = null;
      nativeControllerRef.current = null;
      navigationViewControllerRef.current = null;
      markerLookupRef.current = new Map();

      if (isNavigationActive) {
        setIsPreparingNavigation(true);
      } else {
        setIsPreparingNavigation(false);
        void clearActiveNavigation();
      }
    }
  }, [clearActiveNavigation, isNavigationActive]);

  useEffect(() => {
    if (!isMapReady || !nativeControllerRef.current || isNavigationActive) {
      return;
    }

    let isActive = true;

    const syncMarkers = async () => {
      try {
        const controller = nativeControllerRef.current;

        if (!controller) {
          return;
        }

        await retryTransientNativeCommand(
          () => Promise.resolve(controller.clearMapView()),
          isNoViewControllerError,
        );

        if (!isActive) {
          return;
        }

        const lookup = new Map<string, MarkerData>();

        for (const marker of markers) {
          try {
            const googleMarker = await addMarkerWithFallback(controller, {
              id: `marker-${marker.id}`,
              position: toGoogleLatLng(marker.coordinate),
              title: marker.title,
              snippet: marker.description,
            });

            if (!isActive) {
              return;
            }

            lookup.set(googleMarker.id, marker);
          } catch (error) {
            if (__DEV__) {
              console.warn(`Failed to render marker ${marker.id}.`, error);
            }
          }
        }

        if (draftMarker) {
          try {
            await addMarkerWithFallback(controller, {
              id: DRAFT_MARKER_ID,
              position: toGoogleLatLng(draftMarker),
              title: "New marker",
              snippet: "Tap the map to adjust the marker position.",
            });
          } catch (error) {
            if (__DEV__) {
              console.warn("Failed to render the draft marker.", error);
            }
          }
        }

        if (isActive) {
          markerLookupRef.current = lookup;
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Failed to synchronize Google map markers.", error);
        }
      }
    };

    void syncMarkers();

    return () => {
      isActive = false;
    };
  }, [addMarkerWithFallback, draftMarker, isMapReady, isNavigationActive, markers]);

  useEffect(() => {
    if (
      !isNavigationActive ||
      !isMapReady ||
      !isNavigationViewReady ||
      !nativeControllerRef.current ||
      !navigationViewControllerRef.current
    ) {
      return;
    }

    let isActive = true;

    const stopAndExit = (message?: string) => {
      if (message) {
        Alert.alert(NAVIGATION_UNAVAILABLE_TITLE, message);
      }

      void clearActiveNavigation();

      if (isActive) {
        setIsPreparingNavigation(false);
        onStopNavigationRef.current();
      }
    };

    const startNavigation = async () => {
      try {
        const controller = nativeControllerRef.current;
        const navigationViewController = navigationViewControllerRef.current;
        const activeNavigationController = navigationControllerRef.current;

        if (!controller || !navigationViewController) {
          return;
        }

        setIsPreparingNavigation(true);
        latestNavigationLocationRef.current = null;
        navigationSessionInitializedRef.current = false;
        routePreparedRef.current = false;
        guidanceStartedRef.current = false;

        await retryTransientNativeCommand(
          () => Promise.resolve(controller.clearMapView()),
          isNoViewControllerError,
        );

        const termsAccepted = await activeNavigationController.areTermsAccepted();
        const accepted =
          termsAccepted ||
          (await activeNavigationController.showTermsAndConditionsDialog());

        if (!isActive) {
          return;
        }

        if (!accepted) {
          stopAndExit(
            "Navigation cannot start until the Google navigation terms are accepted.",
          );
          return;
        }

        const sessionStatus = await withTimeout(
          activeNavigationController.init(),
          NAVIGATION_START_TIMEOUT_MS,
          "Navigation is taking too long to start. Please try again.",
        );

        if (!isActive) {
          return;
        }

        if (sessionStatus !== navigationSessionOk) {
          stopAndExit(getNavigationSessionStatusMessage(sessionStatus));
          return;
        }

        navigationSessionInitializedRef.current = true;

        try {
          await activeNavigationController.startUpdatingLocation();
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to request Google navigation location updates.", error);
          }
        }

        let hasNavigationLocation = await waitForNavigationLocation(
          NAVIGATION_LOCATION_TIMEOUT_MS,
        );

        if (!hasNavigationLocation && __DEV__ && currentLocation) {
          activeNavigationController.simulator.simulateLocation(
            toGoogleLatLng(currentLocation),
          );
          hasNavigationLocation = await waitForNavigationLocation(1500);
        }

        if (!isActive) {
          return;
        }

        if (!hasNavigationLocation) {
          stopAndExit(
            "Navigation needs your current location before it can start. Please wait a moment and try again.",
          );
          return;
        }

        const routeStatus = await withTimeout(
          activeNavigationController.setDestination(
            {
              title: navigationDestination.title,
              position: {
                lat: navigationDestination.coordinate.latitude,
                lng: navigationDestination.coordinate.longitude,
              },
            },
            {
              displayOptions: {
                showDestinationMarkers: true,
              },
              routingOptions: {
                travelMode: walkingTravelMode,
              },
            },
          ),
          NAVIGATION_START_TIMEOUT_MS,
          "Navigation is taking too long to start. Please try again.",
        );

        if (!isActive) {
          return;
        }

        if (routeStatus !== routeOk) {
          stopAndExit(getRouteStatusMessage(routeStatus));
          return;
        }

        routePreparedRef.current = true;
        await delay(NAVIGATION_VIEW_RETRY_DELAY_MS);
        await retryTransientNativeCommand(
          () => navigationViewController.setNavigationUIEnabled(true),
          isNoViewControllerError,
        );
        await withTimeout(
          activeNavigationController.startGuidance(),
          NAVIGATION_START_TIMEOUT_MS,
          "Navigation is taking too long to start. Please try again.",
        );

        if (!isActive) {
          return;
        }

        guidanceStartedRef.current = true;
        setIsPreparingNavigation(false);
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to start Google navigation.", error);
        }

        if (isActive) {
          stopAndExit("Unable to start navigation right now. Please try again.");
        }
      }
    };

    void startNavigation();

    return () => {
      isActive = false;
    };
  }, [
    clearActiveNavigation,
    isMapReady,
    isNavigationActive,
    isNavigationViewReady,
    currentLocation,
    navigationDestination,
    navigationSessionOk,
    routeOk,
    waitForNavigationLocation,
    walkingTravelMode,
  ]);

  return (
    <View style={styles.container}>
      {isNavigationActive ? (
        <NavigationView
          style={styles.container}
          initialCameraPosition={{
            target: toGoogleLatLng(INITIAL_CAMERA.target),
            zoom: INITIAL_CAMERA.zoom,
          }}
          navigationUIEnabledPreference={NavigationUIEnabledPreference.DISABLED}
          myLocationEnabled={showsUserLocation}
          myLocationButtonEnabled={false}
          recenterButtonEnabled
          trafficEnabled
          compassEnabled
          speedometerEnabled={Platform.OS === "android"}
          onMapReady={() => setIsMapReady(true)}
          onMapViewControllerCreated={(controller) => {
            nativeControllerRef.current = controller;
            mapControllerRef.current = createMapInteractionController(controller);
          }}
          onNavigationViewControllerCreated={(controller) => {
            navigationViewControllerRef.current = controller;
            setIsNavigationViewReady(true);
          }}
        />
      ) : (
        <MapView
          style={styles.container}
          initialCameraPosition={{
            target: toGoogleLatLng(INITIAL_CAMERA.target),
            zoom: INITIAL_CAMERA.zoom,
          }}
          myLocationEnabled={showsUserLocation}
          myLocationButtonEnabled={false}
          compassEnabled
          onMapReady={() => {
            setIsNavigationViewReady(false);
            setIsMapReady(true);
          }}
          onMapClick={(coordinate) => {
            onMapPress(toMapCoordinate(coordinate));
          }}
          onMarkerClick={(marker: GoogleMarker) => {
            const selectedMarker = markerLookupRef.current.get(marker.id);

            if (selectedMarker) {
              onMarkerPress(selectedMarker);
            }
          }}
          onMapViewControllerCreated={(controller) => {
            nativeControllerRef.current = controller;
            mapControllerRef.current = createMapInteractionController(controller);
          }}
        />
      )}
      {!isMapReady || isPreparingNavigation ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>
              {isPreparingNavigation && navigationDestination
                ? `Starting navigation to ${navigationDestination.title}`
                : "Loading map"}
            </Text>
            <Text style={styles.loadingHint}>
              {isPreparingNavigation
                ? "Preparing live guidance in the map."
                : "Getting the map ready."}
            </Text>
            <ActivityIndicator color="#F9FAFB" />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const GoogleMapSurface: React.FC<GoogleMapSurfaceProps> = (props) => {
  const isWeb = Platform.OS === "web";
  const navigationSdk = useMemo<NavigationSdkRuntime>(() => {
    return isWeb ? null : loadGoogleNavigationSdk();
  }, [isWeb]);

  useEffect(() => {
    if (!navigationSdk) {
      props.mapControllerRef.current = null;
    }
  }, [navigationSdk, props.mapControllerRef]);

  if (isWeb || !navigationSdk) {
    return (
      <View style={styles.unavailableState}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableTitle}>Map unavailable</Text>
          <Text style={styles.unavailableText}>
            Open the latest app build to use the map and navigation features.
          </Text>
        </View>
      </View>
    );
  }

  const { NavigationProvider, TaskRemovedBehavior } = navigationSdk;

  return (
    <NavigationProvider
      termsAndConditionsDialogOptions={{
        title: "Navigation Terms",
        companyName: "SIT",
        showOnlyDisclaimer: false,
      }}
      taskRemovedBehavior={TaskRemovedBehavior.CONTINUE_SERVICE}
    >
      <GoogleMapSurfaceInner {...props} navigationSdk={navigationSdk} />
    </NavigationProvider>
  );
};

export default GoogleMapSurface;
