import { useEffect } from "react";
import type { MapViewController as GoogleMapViewController } from "@googlemaps/react-native-navigation-sdk";

import type { MapCoordinate, MarkerData } from "../../../core";
import { DRAFT_MARKER_ID } from "../googleMapSurface.constants";
import {
  isNoViewControllerError,
  retryTransientNativeCommand,
  toGoogleLatLng,
} from "../googleMapSurface.utils";

interface UseBrowseMarkerSyncOptions {
  addMarkerWithFallback: (
    controller: GoogleMapViewController,
    marker: {
      id: string;
      position: { lat: number; lng: number };
      title?: string;
      snippet?: string;
    },
  ) => Promise<{ id: string }>;
  browseMapControllerRef: React.MutableRefObject<GoogleMapViewController | null>;
  draftMarker: MapCoordinate | null;
  isBrowseMapControllerReady: boolean;
  isBrowseMapReady: boolean;
  isNavigationSurfaceVisible: boolean;
  markerLookupRef: React.MutableRefObject<Map<string, MarkerData>>;
  markers: MarkerData[];
}

const useBrowseMarkerSync = ({
  addMarkerWithFallback,
  browseMapControllerRef,
  draftMarker,
  isBrowseMapControllerReady,
  isBrowseMapReady,
  isNavigationSurfaceVisible,
  markerLookupRef,
  markers,
}: UseBrowseMarkerSyncOptions) => {
  useEffect(() => {
    if (
      !isBrowseMapReady ||
      !isBrowseMapControllerReady ||
      !browseMapControllerRef.current ||
      isNavigationSurfaceVisible
    ) {
      return;
    }

    let isActive = true;

    const syncMarkers = async () => {
      try {
        const controller = browseMapControllerRef.current;

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
  }, [
    addMarkerWithFallback,
    browseMapControllerRef,
    draftMarker,
    isBrowseMapControllerReady,
    isBrowseMapReady,
    isNavigationSurfaceVisible,
    markerLookupRef,
    markers,
  ]);
};

export default useBrowseMarkerSync;
