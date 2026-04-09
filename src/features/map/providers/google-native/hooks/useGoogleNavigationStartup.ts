import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import type {
  MapViewController as GoogleMapViewController,
  NavigationViewController as GoogleNavigationViewController,
} from "@googlemaps/react-native-navigation-sdk";

import type { MarkerData } from "../../../core";
import {
  NAVIGATION_LOCATION_TIMEOUT_MS,
  NAVIGATION_START_TIMEOUT_MS,
  NAVIGATION_VIEW_RETRY_ATTEMPTS,
  NAVIGATION_VIEW_RETRY_DELAY_MS,
} from "../googleMapSurface.constants";
import {
  delay,
  isNoViewControllerError,
  isRouteLocationPendingStatus,
  retryTransientNativeCommand,
  withTimeout,
} from "../googleMapSurface.utils";
import {
  getNavigationSessionStatusMessage,
  getRouteStatusMessage,
  NAVIGATION_UNAVAILABLE_TITLE,
} from "../../../utils/navigation";
import type {
  GoogleNavigationController,
  GoogleNavigationRouteStatus,
  GoogleNavigationSessionStatus,
} from "../googleMapSurface.types";

interface UseGoogleNavigationStartupOptions {
  clearActiveNavigation: (options?: {
    destroySession?: boolean;
    hideNavigationUi?: boolean;
  }) => Promise<void>;
  currentLocation: { latitude: number; longitude: number } | null;
  isNavigationActive: boolean;
  isNavigationMapControllerReady: boolean;
  isNavigationMapReady: boolean;
  isNavigationViewControllerReady: boolean;
  navigationControllerRef: React.MutableRefObject<GoogleNavigationController>;
  navigationDestination: MarkerData | null;
  navigationMapControllerRef: React.MutableRefObject<GoogleMapViewController | null>;
  navigationSessionOk: GoogleNavigationSessionStatus;
  navigationSessionInitializedRef: React.MutableRefObject<boolean>;
  navigationViewControllerRef: React.MutableRefObject<GoogleNavigationViewController | null>;
  onStopNavigationRef: React.MutableRefObject<() => void>;
  routeOk: GoogleNavigationRouteStatus;
  routePreparedRef: React.MutableRefObject<boolean>;
  guidanceStartedRef: React.MutableRefObject<boolean>;
  isLocationSimulationActiveRef: React.MutableRefObject<boolean>;
  latestNavigationLocationRef: React.MutableRefObject<{
    lat: number;
    lng: number;
  } | null>;
  setIsPreparingNavigation: React.Dispatch<React.SetStateAction<boolean>>;
  simulateNavigationLocationFromCurrentPosition: () => boolean;
  waitForNavigationLocation: (timeoutMs: number) => Promise<boolean>;
  walkingTravelMode: unknown;
}

const useGoogleNavigationStartup = ({
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
}: UseGoogleNavigationStartupOptions) => {
  const currentLocationRef = useRef(currentLocation);
  const startupInFlightRef = useRef(false);

  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    if (
      !isNavigationActive ||
      !isNavigationMapReady ||
      !isNavigationMapControllerReady ||
      !isNavigationViewControllerReady ||
      startupInFlightRef.current ||
      routePreparedRef.current ||
      guidanceStartedRef.current ||
      !navigationMapControllerRef.current ||
      !navigationViewControllerRef.current
    ) {
      return;
    }

    let isActive = true;

    const stopAndExit = async (message?: string) => {
      await clearActiveNavigation({ destroySession: true });

      if (!isActive) {
        return;
      }

      if (message) {
        Alert.alert(NAVIGATION_UNAVAILABLE_TITLE, message);
      }

      setIsPreparingNavigation(false);
      onStopNavigationRef.current();
    };

    const startNavigation = async () => {
      try {
        const navigationMapController = navigationMapControllerRef.current;
        const navigationViewController = navigationViewControllerRef.current;
        const activeNavigationController = navigationControllerRef.current;

        if (
          !navigationMapController ||
          !navigationViewController ||
          !navigationDestination
        ) {
          return;
        }

        startupInFlightRef.current = true;
        setIsPreparingNavigation(true);
        latestNavigationLocationRef.current = null;
        routePreparedRef.current = false;
        guidanceStartedRef.current = false;

        const termsAccepted = await activeNavigationController.areTermsAccepted();
        const accepted =
          termsAccepted ||
          (await activeNavigationController.showTermsAndConditionsDialog());

        if (!isActive) {
          return;
        }

        if (!accepted) {
          await stopAndExit(
            "Navigation cannot start until the Google navigation terms are accepted.",
          );
          return;
        }

        if (!navigationSessionInitializedRef.current) {
          const sessionStatus = await withTimeout(
            activeNavigationController.init(),
            NAVIGATION_START_TIMEOUT_MS,
            "Navigation is taking too long to start. Please try again.",
          );

          if (!isActive) {
            return;
          }

          if (sessionStatus !== navigationSessionOk) {
            await stopAndExit(getNavigationSessionStatusMessage(sessionStatus));
            return;
          }

          navigationSessionInitializedRef.current = true;
        }

        try {
          await activeNavigationController.startUpdatingLocation();
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to request Google navigation location updates.", error);
          }
        }

        let usedLocationSimulation = false;

        if (!(await waitForNavigationLocation(1200))) {
          usedLocationSimulation = simulateNavigationLocationFromCurrentPosition();

          if (usedLocationSimulation) {
            await waitForNavigationLocation(1200);
          }
        }

        const requestRoute = () =>
          withTimeout(
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
                  travelMode: walkingTravelMode as never,
                },
              },
            ),
            NAVIGATION_START_TIMEOUT_MS,
            "Navigation is taking too long to start. Please try again.",
          );

        let routeStatus = await requestRoute();

        if (!isActive) {
          return;
        }

        if (
          isRouteLocationPendingStatus(routeStatus) &&
          (currentLocationRef.current || latestNavigationLocationRef.current)
        ) {
          if (!latestNavigationLocationRef.current) {
            usedLocationSimulation = simulateNavigationLocationFromCurrentPosition();
            await waitForNavigationLocation(NAVIGATION_LOCATION_TIMEOUT_MS);
          } else {
            await delay(600);
          }

          if (!isActive) {
            return;
          }

          routeStatus = await requestRoute();
        }

        if (!isActive) {
          return;
        }

        if (routeStatus !== routeOk) {
          await stopAndExit(getRouteStatusMessage(routeStatus));
          return;
        }

        routePreparedRef.current = true;
        if (usedLocationSimulation) {
          activeNavigationController.simulator.simulateLocationsAlongExistingRoute({
            speedMultiplier: 4,
          });
          isLocationSimulationActiveRef.current = true;
        }

        await withTimeout(
          activeNavigationController.startGuidance(),
          NAVIGATION_START_TIMEOUT_MS,
          "Navigation is taking too long to start. Please try again.",
        );

        if (!isActive) {
          return;
        }

        guidanceStartedRef.current = true;

        try {
          await retryTransientNativeCommand(
            () => navigationViewController.setNavigationUIEnabled(true),
            isNoViewControllerError,
            NAVIGATION_VIEW_RETRY_ATTEMPTS * 2,
          );
        } catch (error) {
          if (__DEV__ && !isNoViewControllerError(error)) {
            console.warn("Failed to enable Google navigation UI.", error);
          }
        }

        if (!isActive) {
          return;
        }

        await delay(NAVIGATION_VIEW_RETRY_DELAY_MS);
        setIsPreparingNavigation(false);
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to start Google navigation.", error);
        }

        if (isActive) {
          await stopAndExit("Unable to start navigation right now. Please try again.");
        }
      } finally {
        startupInFlightRef.current = false;
      }
    };

    void startNavigation();

    return () => {
      isActive = false;
    };
  }, [
    clearActiveNavigation,
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
  ]);
};

export default useGoogleNavigationStartup;
