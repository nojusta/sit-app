import { useEffect, useRef } from "react";
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
      imgPath?: string | null;
      draggable?: boolean;
      zIndex?: number;
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
  const draftMarkerRef = useRef(draftMarker);

  useEffect(() => {
    draftMarkerRef.current = draftMarker;
  }, [draftMarker]);

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

        if (draftMarkerRef.current) {
          await addMarkerWithFallback(controller, {
            id: DRAFT_MARKER_ID,
            position: toGoogleLatLng(draftMarkerRef.current),
            title: "New marker",
            snippet: "Press and drag to place this sitting spot.",
            draggable: true,
            zIndex: 1000,
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
  }, [
    addMarkerWithFallback,
    browseMapControllerRef,
    isBrowseMapControllerReady,
    isBrowseMapReady,
    isNavigationSurfaceVisible,
    markerLookupRef,
    markers,
  ]);

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

    const syncDraftMarker = async () => {
      const controller = browseMapControllerRef.current;

      if (!controller) {
        return;
      }

      try {
        if (!draftMarker) {
          try {
            controller.removeMarker(DRAFT_MARKER_ID);
          } catch {}
          return;
        }

        await addMarkerWithFallback(controller, {
          id: DRAFT_MARKER_ID,
          position: toGoogleLatLng(draftMarker),
          title: "New marker",
          snippet: "Press and drag to place this sitting spot.",
          draggable: true,
          zIndex: 1000,
        });
      } catch (error) {
        if (__DEV__ && isActive) {
          console.warn("Failed to synchronize the draft marker.", error);
        }
      }
    };

    void syncDraftMarker();

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
  ]);
};

export default useBrowseMarkerSync;
