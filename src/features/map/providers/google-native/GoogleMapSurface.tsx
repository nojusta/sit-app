import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Text, View } from "react-native";
import * as Device from "expo-device";
import {
  Marker as GoogleMarker,
  MapColorScheme,
  MapViewController as GoogleMapViewController,
  NavigationNightMode,
  NavigationViewController as GoogleNavigationViewController,
} from "@googlemaps/react-native-navigation-sdk";

import { ActionDialog, CustomButton } from "@/shared/components";
import type { MarkerData } from "../../core";
import { loadGoogleNavigationSdk } from "../../utils/googleNavigationSdk";
import { NAVIGATION_UNAVAILABLE_TITLE } from "../../utils/navigation";
import {
  CUSTOM_MARKER_IMAGE_CANDIDATES,
  INITIAL_CAMERA,
  NAVIGATION_START_TIMEOUT_MS,
  NAVIGATION_UI_DISABLED,
} from "./googleMapSurface.constants";
import { googleMapSurfaceStyles as styles } from "./googleMapSurface.styles";
import type {
  GoogleLatLng,
  GoogleMapSurfaceInnerProps,
  GoogleMapSurfaceProps,
  NavigationSdkRuntime,
} from "./googleMapSurface.types";
import {
  createMapInteractionController,
  delay,
  isInvalidImageError,
  isNavigatorNotReadyError,
  isNoViewControllerError,
  retryTransientNativeCommand,
  toGoogleLatLng,
  toMapCoordinate,
} from "./googleMapSurface.utils";
import useBrowseMarkerSync from "./hooks/useBrowseMarkerSync";
import useGoogleNavigationBindings from "./hooks/useGoogleNavigationBindings";
import useGoogleNavigationStartup from "./hooks/useGoogleNavigationStartup";

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
    NavigationSessionStatus,
    NavigationView,
    RouteStatus,
    TravelMode,
    useNavigation,
  } = navigationSdk;
  const {
    navigationController,
    setLogDebugInfo,
    setOnArrival,
    setOnLocationChanged,
    setOnNavigationReady,
  } = useNavigation();
  const browseMapControllerRef = useRef<GoogleMapViewController | null>(null);
  const navigationMapControllerRef = useRef<GoogleMapViewController | null>(null);
  const navigationViewControllerRef = useRef<GoogleNavigationViewController | null>(null);
  const parentMapControllerRef = useRef(mapControllerRef);
  const navigationControllerRef = useRef(navigationController);
  const onStopNavigationRef = useRef(onStopNavigation);
  const navigationSessionInitializedRef = useRef(false);
  const routePreparedRef = useRef(false);
  const guidanceStartedRef = useRef(false);
  const isLocationSimulationActiveRef = useRef(false);
  const latestNavigationLocationRef = useRef<GoogleLatLng | null>(null);
  const previousNavigationModeRef = useRef<boolean | null>(null);
  const hasAttemptedInitialCleanupRef = useRef(false);
  const markerLookupRef = useRef<Map<string, MarkerData>>(new Map());
  const [isBrowseMapReady, setIsBrowseMapReady] = useState(false);
  const [isNavigationMapReady, setIsNavigationMapReady] = useState(false);
  const [isPreparingNavigation, setIsPreparingNavigation] = useState(false);
  const [isStopDialogVisible, setIsStopDialogVisible] = useState(false);
  const [isBrowseMapControllerReady, setIsBrowseMapControllerReady] = useState(false);
  const [isNavigationMapControllerReady, setIsNavigationMapControllerReady] =
    useState(false);
  const [isNavigationViewControllerReady, setIsNavigationViewControllerReady] =
    useState(false);

  const navigationSessionOk = NavigationSessionStatus.OK;
  const routeOk = RouteStatus.OK;
  const walkingTravelMode = TravelMode.WALKING;
  const isNavigationActive = navigationDestination !== null;
  const isNavigationSurfaceVisible = isNavigationActive || isPreparingNavigation;
  const shouldRenderNavigationSurface =
    Platform.OS === "ios" || isNavigationSurfaceVisible;
  const androidMapColorScheme =
    Platform.OS === "android" ? MapColorScheme.LIGHT : undefined;
  const androidNavigationNightMode =
    Platform.OS === "android" ? NavigationNightMode.FORCE_DAY : undefined;
  const allowsDevNavigationSimulation =
    __DEV__ && Platform.OS === "ios" && !Device.isDevice;
  const isVisibleSurfaceReady = isNavigationSurfaceVisible
    ? isNavigationMapReady
    : isBrowseMapReady;

  parentMapControllerRef.current = mapControllerRef;
  navigationControllerRef.current = navigationController;
  onStopNavigationRef.current = onStopNavigation;

  const resetNavigationSessionState = useCallback(() => {
    navigationSessionInitializedRef.current = false;
    routePreparedRef.current = false;
    guidanceStartedRef.current = false;
    latestNavigationLocationRef.current = null;
    isLocationSimulationActiveRef.current = false;
  }, []);

  const clearActiveNavigation = useCallback(
    async (options?: { destroySession?: boolean; hideNavigationUi?: boolean }) => {
      const destroySession = options?.destroySession ?? false;
      const hideNavigationUi = options?.hideNavigationUi ?? true;
      const activeNavigationController = navigationControllerRef.current;
      const navigationViewController = navigationViewControllerRef.current;

      if (isLocationSimulationActiveRef.current) {
        try {
          activeNavigationController.simulator.stopLocationSimulation();
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to stop Google navigation location simulation.", error);
          }
        } finally {
          isLocationSimulationActiveRef.current = false;
        }
      }

      if (hideNavigationUi && navigationViewController) {
        try {
          await retryTransientNativeCommand(
            () => navigationViewController.setNavigationUIEnabled(false),
            isNoViewControllerError,
          );
        } catch (error) {
          if (
            __DEV__ &&
            !isNoViewControllerError(error) &&
            !isNavigatorNotReadyError(error)
          ) {
            console.warn("Failed to disable Google navigation UI.", error);
          }
        }
      }

      if (guidanceStartedRef.current) {
        try {
          await activeNavigationController.stopGuidance();
        } catch (error) {
          if (__DEV__ && !isNavigatorNotReadyError(error)) {
            console.warn("Failed to stop Google navigation guidance.", error);
          }
        }
      }

      if (routePreparedRef.current) {
        try {
          await activeNavigationController.clearDestinations();
        } catch (error) {
          if (__DEV__ && !isNavigatorNotReadyError(error)) {
            console.warn("Failed to clear Google navigation destinations.", error);
          }
        }
      }

      if (destroySession || navigationSessionInitializedRef.current) {
        try {
          await activeNavigationController.cleanup();
        } catch (error) {
          if (__DEV__ && !isNavigatorNotReadyError(error)) {
            console.warn("Failed to clean up the Google navigation session.", error);
          }
        }
      }

      resetNavigationSessionState();
    },
    [resetNavigationSessionState],
  );

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

  const finalizeNavigationExit = useCallback(
    async (options?: { destroySession?: boolean; message?: string }) => {
      if (options?.message) {
        Alert.alert(NAVIGATION_UNAVAILABLE_TITLE, options.message);
      }

      await clearActiveNavigation({ destroySession: options?.destroySession ?? false });
      setIsPreparingNavigation(false);
      onStopNavigationRef.current();
    },
    [clearActiveNavigation],
  );

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

  const simulateNavigationLocationFromCurrentPosition = useCallback(() => {
    if (!allowsDevNavigationSimulation || !currentLocation) {
      return false;
    }

    navigationControllerRef.current.simulator.simulateLocation(
      toGoogleLatLng(currentLocation),
    );
    return true;
  }, [allowsDevNavigationSimulation, currentLocation]);

  useGoogleNavigationBindings({
    browseMapControllerRef,
    navigationMapControllerRef,
    navigationViewControllerRef,
    latestNavigationLocationRef,
    parentMapControllerRef,
    clearActiveNavigation,
    finalizeNavigationExit,
    setLogDebugInfo,
    setOnArrival,
    setOnLocationChanged,
    setOnNavigationReady,
  });

  useEffect(() => {
    if (previousNavigationModeRef.current === isNavigationActive) {
      return;
    }

    previousNavigationModeRef.current = isNavigationActive;

    if (isNavigationActive) {
      setIsPreparingNavigation(true);
      return;
    }

    setIsPreparingNavigation(false);
    setIsStopDialogVisible(false);
  }, [isNavigationActive]);

  useEffect(() => {
    if (isNavigationActive || hasAttemptedInitialCleanupRef.current) {
      return;
    }

    hasAttemptedInitialCleanupRef.current = true;
    void clearActiveNavigation({ destroySession: true, hideNavigationUi: false });
  }, [clearActiveNavigation, isNavigationActive]);

  useEffect(() => {
    if (shouldRenderNavigationSurface) {
      return;
    }

    navigationMapControllerRef.current = null;
    navigationViewControllerRef.current = null;
    setIsNavigationMapReady(false);
    setIsNavigationMapControllerReady(false);
    setIsNavigationViewControllerReady(false);
  }, [shouldRenderNavigationSurface]);

  useEffect(() => {
    if (!isNavigationActive || !isPreparingNavigation) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void finalizeNavigationExit({
        destroySession: true,
        message: "Navigation took too long to start. Please try again.",
      });
    }, NAVIGATION_START_TIMEOUT_MS + 5000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [finalizeNavigationExit, isNavigationActive, isPreparingNavigation]);

  useBrowseMarkerSync({
    addMarkerWithFallback,
    browseMapControllerRef,
    draftMarker,
    isBrowseMapControllerReady,
    isBrowseMapReady,
    isNavigationSurfaceVisible,
    markerLookupRef,
    markers,
  });

  useGoogleNavigationStartup({
    clearActiveNavigation,
    currentLocation,
    guidanceStartedRef,
    isLocationSimulationActiveRef,
    isNavigationActive,
    isNavigationMapControllerReady,
    isNavigationMapReady,
    isNavigationViewControllerReady,
    latestNavigationLocationRef,
    navigationControllerRef,
    navigationDestination,
    navigationMapControllerRef,
    navigationSessionInitializedRef,
    navigationSessionOk,
    navigationViewControllerRef,
    onStopNavigationRef,
    routeOk,
    routePreparedRef,
    setIsPreparingNavigation,
    simulateNavigationLocationFromCurrentPosition,
    waitForNavigationLocation,
    walkingTravelMode,
  });

  const handleStopNavigationRequest = useCallback(() => {
    setIsStopDialogVisible(true);
  }, []);

  const handleDismissStopDialog = useCallback(() => {
    setIsStopDialogVisible(false);
  }, []);

  const handleConfirmStopNavigation = useCallback(() => {
    setIsStopDialogVisible(false);
    void finalizeNavigationExit({ destroySession: true });
  }, [finalizeNavigationExit]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.container}
        initialCameraPosition={{
          target: toGoogleLatLng(INITIAL_CAMERA.target),
          zoom: INITIAL_CAMERA.zoom,
        }}
        mapColorScheme={androidMapColorScheme}
        myLocationEnabled={showsUserLocation}
        myLocationButtonEnabled={false}
        trafficEnabled
        compassEnabled
        onMapReady={() => {
          setIsBrowseMapReady(true);
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
          browseMapControllerRef.current = controller;
          setIsBrowseMapControllerReady(true);
          mapControllerRef.current = createMapInteractionController(controller);
        }}
      />
      {shouldRenderNavigationSurface ? (
        <View
          pointerEvents={isNavigationSurfaceVisible ? "auto" : "none"}
          style={[
            styles.navigationSurfaceOverlay,
            !isNavigationSurfaceVisible ? styles.navigationSurfaceHidden : null,
          ]}
        >
          <NavigationView
            style={styles.container}
            initialCameraPosition={{
              target: toGoogleLatLng(INITIAL_CAMERA.target),
              zoom: INITIAL_CAMERA.zoom,
            }}
            mapColorScheme={androidMapColorScheme}
            navigationNightMode={androidNavigationNightMode}
            navigationUIEnabledPreference={NAVIGATION_UI_DISABLED}
            myLocationEnabled={false}
            myLocationButtonEnabled={false}
            recenterButtonEnabled
            reportIncidentButtonEnabled={false}
            trafficEnabled
            compassEnabled
            speedometerEnabled={Platform.OS === "android"}
            onMapReady={() => {
              setIsNavigationMapReady(true);
            }}
            onMapViewControllerCreated={(controller) => {
              navigationMapControllerRef.current = controller;
              setIsNavigationMapControllerReady(true);
            }}
            onNavigationViewControllerCreated={(controller) => {
              navigationViewControllerRef.current = controller;
              setIsNavigationViewControllerReady(true);
            }}
          />
        </View>
      ) : null}
      {!isVisibleSurfaceReady || isPreparingNavigation ? (
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
      {isNavigationActive && !isPreparingNavigation ? (
        <View pointerEvents="box-none" style={styles.stopNavigationOverlay}>
          <CustomButton
            title="Cancel Navigation"
            handlePress={handleStopNavigationRequest}
            variant="danger"
            containerStyles="self-center min-h-[44px] rounded-full border-2 border-red-900 px-4"
            textStyles="text-base"
            accessibilityLabel="Stop navigation"
          />
        </View>
      ) : null}
      <ActionDialog
        visible={isStopDialogVisible}
        title="Are you sure?"
        description="You can start guidance again from the marker whenever you need it."
        confirmLabel="Cancel Navigation"
        cancelLabel="Keep Navigation"
        onConfirm={handleConfirmStopNavigation}
        onCancel={handleDismissStopDialog}
        confirmVariant="danger"
        cancelVariant="ghost"
        confirmAccessibilityLabel="Confirm stop navigation"
        cancelAccessibilityLabel="Keep navigation"
      />
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
