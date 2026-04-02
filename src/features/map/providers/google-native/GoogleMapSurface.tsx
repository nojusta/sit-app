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

const toMapCameraSnapshot = (
  camera: Awaited<ReturnType<GoogleMapViewController["getCameraPosition"]>>,
): MapCameraSnapshot => ({
  target: toMapCoordinate(camera.target),
  zoom: camera.zoom,
  bearing: camera.bearing,
  tilt: camera.tilt,
});

const createMapInteractionController = (
  controller: GoogleMapViewController,
): MapInteractionController => ({
  captureBrowseCamera: async () => {
    const camera = await controller.getCameraPosition();
    return toMapCameraSnapshot(camera);
  },
  focusCoordinate: (coordinate) => {
    void controller.moveCamera({
      target: toGoogleLatLng(coordinate),
      zoom: FOCUS_ZOOM,
    });
  },
  restoreBrowseCamera: (camera) => {
    void controller.moveCamera({
      target: toGoogleLatLng(camera.target),
      zoom: camera.zoom,
      bearing: camera.bearing,
      tilt: camera.tilt,
    });
  },
  centerOnCoordinate: (coordinate) => {
    void controller.moveCamera({
      target: toGoogleLatLng(coordinate),
      zoom: CENTER_ZOOM,
    });
  },
});

const GoogleMapSurfaceInner: React.FC<GoogleMapSurfaceInnerProps> = ({
  mapControllerRef,
  markers,
  draftMarker,
  navigationDestination,
  showsUserLocation,
  onMarkerPress,
  onMapPress,
  onStopNavigation,
  navigationSdk,
}) => {
  const {
    NavigationUIEnabledPreference,
    NavigationSessionStatus,
    NavigationView,
    RouteStatus,
    TravelMode,
    useNavigation,
  } = navigationSdk;
  const { navigationController, setOnArrival } = useNavigation();
  const nativeControllerRef = useRef<GoogleMapViewController | null>(null);
  const navigationViewControllerRef = useRef<GoogleNavigationViewController | null>(null);
  const markerLookupRef = useRef<Map<string, MarkerData>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);
  const [isPreparingNavigation, setIsPreparingNavigation] = useState(false);

  const navigationSessionOk = NavigationSessionStatus.OK;
  const routeOk = RouteStatus.OK;
  const walkingTravelMode = TravelMode.WALKING;
  const isNavigationActive = navigationDestination !== null;

  const clearActiveNavigation = useCallback(async () => {
    const navigationViewController = navigationViewControllerRef.current;

    if (navigationViewController) {
      try {
        await navigationViewController.setNavigationUIEnabled(false);
      } catch (error) {
        if (__DEV__) {
          console.warn("Failed to disable Google navigation UI.", error);
        }
      }
    }

    try {
      await navigationController.stopGuidance();
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to stop Google navigation guidance.", error);
      }
    }

    try {
      await navigationController.clearDestinations();
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to clear Google navigation destinations.", error);
      }
    }
  }, [navigationController]);

  useEffect(() => {
    setOnArrival((arrivalEvent) => {
      if (arrivalEvent.isFinalDestination ?? true) {
        void clearActiveNavigation();
        onStopNavigation();
      }
    });

    return () => {
      setOnArrival(null);
    };
  }, [clearActiveNavigation, onStopNavigation, setOnArrival]);

  useEffect(() => {
    return () => {
      mapControllerRef.current = null;
      nativeControllerRef.current = null;
      navigationViewControllerRef.current = null;
      void clearActiveNavigation();
    };
  }, [clearActiveNavigation, mapControllerRef]);

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

        await controller.clearMapView();

        if (!isActive) {
          return;
        }

        const lookup = new Map<string, MarkerData>();

        for (const marker of markers) {
          const googleMarker = await controller.addMarker({
            id: `marker-${marker.id}`,
            position: toGoogleLatLng(marker.coordinate),
            title: marker.title,
            snippet: marker.description,
          });

          if (!isActive) {
            return;
          }

          lookup.set(googleMarker.id, marker);
        }

        if (draftMarker) {
          await controller.addMarker({
            id: DRAFT_MARKER_ID,
            position: toGoogleLatLng(draftMarker),
            title: "New marker",
            snippet: "Tap the map to adjust the marker position.",
          });
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
  }, [draftMarker, isMapReady, isNavigationActive, markers]);

  useEffect(() => {
    if (!isMapReady || !nativeControllerRef.current) {
      return;
    }

    if (!navigationDestination) {
      setIsPreparingNavigation(false);
      void clearActiveNavigation();
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
        onStopNavigation();
      }
    };

    const startNavigation = async () => {
      try {
        const controller = nativeControllerRef.current;
        const navigationViewController = navigationViewControllerRef.current;

        if (!controller || !navigationViewController) {
          return;
        }

        setIsPreparingNavigation(true);
        await controller.clearMapView();

        const termsAccepted = await navigationController.areTermsAccepted();
        const accepted =
          termsAccepted || (await navigationController.showTermsAndConditionsDialog());

        if (!isActive) {
          return;
        }

        if (!accepted) {
          stopAndExit(
            "Navigation cannot start until the Google navigation terms are accepted.",
          );
          return;
        }

        const sessionStatus = await navigationController.init();

        if (!isActive) {
          return;
        }

        if (sessionStatus !== navigationSessionOk) {
          stopAndExit(getNavigationSessionStatusMessage(sessionStatus));
          return;
        }

        const routeStatus = await navigationController.setDestination(
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
        );

        if (!isActive) {
          return;
        }

        if (routeStatus !== routeOk) {
          stopAndExit(getRouteStatusMessage(routeStatus));
          return;
        }

        await navigationViewController.setNavigationUIEnabled(true);
        await navigationController.startGuidance();

        if (!isActive) {
          return;
        }

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
    navigationController,
    navigationDestination,
    navigationSessionOk,
    onStopNavigation,
    routeOk,
    walkingTravelMode,
  ]);

  return (
    <View style={styles.container}>
      <NavigationView
        style={styles.container}
        initialCameraPosition={{
          target: toGoogleLatLng(INITIAL_CAMERA.target),
          zoom: INITIAL_CAMERA.zoom,
        }}
        navigationUIEnabledPreference={NavigationUIEnabledPreference.DISABLED}
        myLocationEnabled={showsUserLocation}
        myLocationButtonEnabled={false}
        recenterButtonEnabled={isNavigationActive}
        trafficEnabled={isNavigationActive}
        compassEnabled
        speedometerEnabled={Platform.OS === "android" && isNavigationActive}
        onMapReady={() => setIsMapReady(true)}
        onMapClick={(coordinate) => {
          if (!isNavigationActive) {
            onMapPress(toMapCoordinate(coordinate));
          }
        }}
        onMarkerClick={(marker: GoogleMarker) => {
          if (isNavigationActive) {
            return;
          }

          const selectedMarker = markerLookupRef.current.get(marker.id);

          if (selectedMarker) {
            onMarkerPress(selectedMarker);
          }
        }}
        onMapViewControllerCreated={(controller) => {
          nativeControllerRef.current = controller;
          mapControllerRef.current = createMapInteractionController(controller);
        }}
        onNavigationViewControllerCreated={(controller) => {
          navigationViewControllerRef.current = controller;
        }}
      />
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
