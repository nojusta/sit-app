import type {
  MapCameraSnapshot,
  MapCoordinate,
  MapInteractionController,
} from "../../core";
import {
  CENTER_ZOOM,
  FOCUS_ZOOM,
  NAVIGATION_VIEW_RETRY_ATTEMPTS,
  NAVIGATION_VIEW_RETRY_DELAY_MS,
} from "./googleMapSurface.constants";
import type {
  GoogleLatLng,
  GoogleMapControllerWithAnimation,
} from "./googleMapSurface.types";
import type { MapViewController as GoogleMapViewController } from "@googlemaps/react-native-navigation-sdk";

export const toGoogleLatLng = (coordinate: MapCoordinate): GoogleLatLng => ({
  lat: coordinate.latitude,
  lng: coordinate.longitude,
});

export const toMapCoordinate = (coordinate: GoogleLatLng): MapCoordinate => ({
  latitude: coordinate.lat,
  longitude: coordinate.lng,
});

export const delay = (timeoutMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });

export const getErrorMessage = (error: unknown) => {
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

export const isNoViewControllerError = (error: unknown) =>
  getErrorMessage(error).includes("No view controller found for the specified nativeID");

export const isInvalidImageError = (error: unknown) =>
  getErrorMessage(error).includes("Failed to load image from the provided path");

export const isNavigatorNotReadyError = (error: unknown) =>
  getErrorMessage(error).includes("initialize the navigator is ready");

export const isRouteLocationPendingStatus = (status: string) =>
  status === "LOCATION_DISABLED" || status === "LOCATION_UNKNOWN";

export const withTimeout = async <T>(
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

export const retryTransientNativeCommand = async <T>(
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

export const toMapCameraSnapshot = (
  camera: Awaited<ReturnType<GoogleMapViewController["getCameraPosition"]>>,
): MapCameraSnapshot => ({
  target: toMapCoordinate(camera.target),
  zoom: camera.zoom,
  bearing: camera.bearing,
  tilt: camera.tilt,
});

export const animateCamera = async (
  controller: GoogleMapControllerWithAnimation,
  destination: {
    target: GoogleLatLng;
    zoom?: number;
    bearing?: number;
    tilt?: number;
  },
) => {
  try {
    if (typeof controller.animateCamera === "function") {
      await controller.animateCamera(destination);
      return;
    }
  } catch {}

  try {
    await controller.moveCamera(destination);
  } catch {
    // Ignore browse camera animation failures to avoid breaking marker/current-location taps.
  }
};

export const createMapInteractionController = (
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
      if (
        !location ||
        typeof location.lat !== "number" ||
        typeof location.lng !== "number"
      ) {
        return false;
      }

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
