import { useEffect, useRef } from "react";
import type { MapViewController as GoogleMapViewController } from "@googlemaps/react-native-navigation-sdk";

import type { MapCoordinate } from "../../../core";
import { DRAFT_MARKER_ID } from "../googleMapSurface.constants";
import type { BrowseMarkerRenderable } from "../googleMapSurface.clustering";
import { toGoogleLatLng } from "../googleMapSurface.utils";

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
  markerLookupRef: React.MutableRefObject<Map<string, BrowseMarkerRenderable>>;
  markers: BrowseMarkerRenderable[];
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
  const renderedMarkerIdsRef = useRef<Set<string>>(new Set());

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

        const lookup = new Map<string, BrowseMarkerRenderable>();
        const nextMarkerIds = new Set<string>();
        const syncBatchSize = 18;

        for (let index = 0; index < markers.length; index += syncBatchSize) {
          const batch = markers.slice(index, index + syncBatchSize);

          await Promise.all(
            batch.map(async (marker) => {
              const markerId = `marker-${marker.id}`;
              nextMarkerIds.add(markerId);

              try {
                const googleMarker = await addMarkerWithFallback(controller, {
                  id: markerId,
                  position: toGoogleLatLng(marker.coordinate),
                  title: "title" in marker ? marker.title : undefined,
                  snippet: "description" in marker ? marker.description : undefined,
                  imgPath: "imgPath" in marker ? marker.imgPath : undefined,
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
            }),
          );

          if (!isActive) {
            return;
          }
        }

        renderedMarkerIdsRef.current.forEach((renderedMarkerId) => {
          if (nextMarkerIds.has(renderedMarkerId)) {
            return;
          }

          try {
            controller.removeMarker(renderedMarkerId);
          } catch {}
        });

        if (!isActive) {
          return;
        }

        if (draftMarkerRef.current) {
          await addMarkerWithFallback(controller, {
            id: DRAFT_MARKER_ID,
            position: toGoogleLatLng(draftMarkerRef.current),
            imgPath: null,
            draggable: true,
            zIndex: 1000,
          });
        }

        if (isActive) {
          renderedMarkerIdsRef.current = nextMarkerIds;
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
          imgPath: null,
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
