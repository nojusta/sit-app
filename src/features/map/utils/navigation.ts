import { type LocationObject } from "expo-location";
import { type LatLng } from "react-native-maps";

export const LOCATION_ACCESS_REQUIRED_MESSAGE =
  "Location access is required to start navigation.";

export const NAVIGATION_UNAVAILABLE_TITLE = "Navigation unavailable";

export type RouteStatusValue =
  | "OK"
  | "NO_ROUTE_FOUND"
  | "NETWORK_ERROR"
  | "QUOTA_CHECK_FAILED"
  | "ROUTE_CANCELED"
  | "LOCATION_DISABLED"
  | "LOCATION_UNKNOWN"
  | "WAYPOINT_ERROR"
  | "INVALID_PLACE_ID"
  | "DUPLICATE_WAYPOINTS_ERROR"
  | "UNKNOWN";

export type NavigationSessionStatusValue =
  | "ok"
  | "notAuthorized"
  | "termsNotAccepted"
  | "networkError"
  | "locationPermissionMissing"
  | "unknownError";

export const getLocationCoordinate = (location: LocationObject | null): LatLng | null => {
  if (!location) {
    return null;
  }

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
};

export const getNavigationSessionStatusMessage = (
  status: NavigationSessionStatusValue,
) => {
  switch (String(status)) {
    case "notAuthorized":
      return "Google Navigation SDK is not authorized. Check your Google Maps API key and enabled Navigation SDKs.";
    case "termsNotAccepted":
      return "Navigation cannot start until the Google navigation terms are accepted.";
    case "locationPermissionMissing":
      return LOCATION_ACCESS_REQUIRED_MESSAGE;
    case "networkError":
      return "A network connection is required to start navigation.";
    case "unknownError":
    default:
      return "Unable to start navigation right now. Please try again.";
  }
};

export const getRouteStatusMessage = (status: RouteStatusValue) => {
  switch (String(status)) {
    case "NO_ROUTE_FOUND":
      return "No route could be found to the selected marker.";
    case "NETWORK_ERROR":
      return "A network connection is required to calculate the route.";
    case "QUOTA_CHECK_FAILED":
      return "Google Maps navigation quota or billing is not configured correctly.";
    case "LOCATION_DISABLED":
    case "LOCATION_UNKNOWN":
      return "Unable to determine your current location for navigation.";
    case "INVALID_PLACE_ID":
    case "WAYPOINT_ERROR":
    case "DUPLICATE_WAYPOINTS_ERROR":
      return "The selected destination could not be used for navigation.";
    case "ROUTE_CANCELED":
      return "Navigation route calculation was interrupted. Please try again.";
    case "UNKNOWN":
    default:
      return "Unable to calculate a route right now. Please try again.";
  }
};
