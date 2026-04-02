import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import type {
  Marker as GoogleMarker,
  MapViewController as GoogleMapViewController,
} from "@googlemaps/react-native-navigation-sdk";

import type {
  MapCameraSnapshot,
  MapCoordinate,
  MapInteractionController,
  MarkerData,
} from "../core";
import {
  loadGoogleNavigationSdk,
  type GoogleNavigationSdkModule,
} from "../utils/googleNavigationSdk";

interface GoogleBrowseMapProps {
  mapControllerRef: React.MutableRefObject<MapInteractionController | null>;
  markers: MarkerData[];
  draftMarker: MapCoordinate | null;
  onMarkerPress: (marker: MarkerData) => void;
  onMapPress: (coordinate: MapCoordinate) => void;
  showsUserLocation: boolean;
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

const GoogleBrowseMap: React.FC<GoogleBrowseMapProps> = ({
  mapControllerRef,
  markers,
  draftMarker,
  onMarkerPress,
  onMapPress,
  showsUserLocation,
}) => {
  const isWeb = Platform.OS === "web";
  const navigationSdk = useMemo<NavigationSdkRuntime>(() => {
    return isWeb ? null : loadGoogleNavigationSdk();
  }, [isWeb]);
  const nativeControllerRef = useRef<GoogleMapViewController | null>(null);
  const markerLookupRef = useRef<Map<string, MarkerData>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    return () => {
      mapControllerRef.current = null;
      nativeControllerRef.current = null;
    };
  }, [mapControllerRef]);

  useEffect(() => {
    if (!isMapReady || !nativeControllerRef.current) {
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
          console.warn("Failed to synchronize browse map markers.", error);
        }
      }
    };

    void syncMarkers();

    return () => {
      isActive = false;
    };
  }, [draftMarker, isMapReady, markers]);

  if (isWeb || !navigationSdk) {
    return (
      <View style={styles.unavailableState}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableTitle}>Google map unavailable</Text>
          <Text style={styles.unavailableText}>
            The native Google map surface requires a development build with the Google
            Navigation SDK configured.
          </Text>
        </View>
      </View>
    );
  }

  const { MapView } = navigationSdk;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.container}
        initialCameraPosition={{
          target: toGoogleLatLng(INITIAL_CAMERA.target),
          zoom: INITIAL_CAMERA.zoom,
        }}
        myLocationEnabled={showsUserLocation}
        myLocationButtonEnabled={false}
        onMapReady={() => setIsMapReady(true)}
        onMapClick={(coordinate) => onMapPress(toMapCoordinate(coordinate))}
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
      {!isMapReady ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading map</Text>
            <ActivityIndicator color="#F9FAFB" />
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default GoogleBrowseMap;
