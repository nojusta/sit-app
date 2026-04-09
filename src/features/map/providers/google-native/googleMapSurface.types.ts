import type React from "react";
import type {
  MapViewController as GoogleMapViewController,
  NavigationViewController as GoogleNavigationViewController,
} from "@googlemaps/react-native-navigation-sdk";

import type { MapCoordinate, MapInteractionController, MarkerData } from "../../core";
import type { GoogleNavigationSdkModule } from "../../utils/googleNavigationSdk";

export interface GoogleMapSurfaceProps {
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

export interface GoogleMapSurfaceInnerProps extends GoogleMapSurfaceProps {
  navigationSdk: GoogleNavigationSdkModule;
}

export type GoogleLatLng = {
  lat: number;
  lng: number;
};

export type NavigationSdkRuntime = GoogleNavigationSdkModule | null;

export type GoogleMapControllerWithAnimation = GoogleMapViewController & {
  animateCamera?: (cameraPosition: {
    target: GoogleLatLng;
    zoom?: number;
    bearing?: number;
    tilt?: number;
  }) => Promise<void> | void;
};

export type GoogleNavigationRuntime = ReturnType<
  GoogleNavigationSdkModule["useNavigation"]
>;
export type GoogleNavigationController = GoogleNavigationRuntime["navigationController"];
export type GoogleNavigationBindings = Pick<
  GoogleNavigationRuntime,
  "setOnArrival" | "setOnLocationChanged" | "setOnNavigationReady" | "setLogDebugInfo"
>;
export type GoogleNavigationSessionStatus = Awaited<
  ReturnType<GoogleNavigationController["init"]>
>;
export type GoogleNavigationRouteStatus = Awaited<
  ReturnType<GoogleNavigationController["setDestination"]>
>;
export type GoogleNavigationTravelMode = Parameters<
  GoogleNavigationController["setDestination"]
>[1] extends {
  routingOptions?: { travelMode?: infer T };
}
  ? T
  : never;

export interface GoogleNavigationRefs {
  browseMapControllerRef: React.MutableRefObject<GoogleMapViewController | null>;
  navigationMapControllerRef: React.MutableRefObject<GoogleMapViewController | null>;
  navigationViewControllerRef: React.MutableRefObject<GoogleNavigationViewController | null>;
  parentMapControllerRef: React.MutableRefObject<
    React.MutableRefObject<MapInteractionController | null>
  >;
  navigationControllerRef: React.MutableRefObject<GoogleNavigationController>;
  onStopNavigationRef: React.MutableRefObject<() => void>;
  navigationSessionInitializedRef: React.MutableRefObject<boolean>;
  routePreparedRef: React.MutableRefObject<boolean>;
  guidanceStartedRef: React.MutableRefObject<boolean>;
  isLocationSimulationActiveRef: React.MutableRefObject<boolean>;
  latestNavigationLocationRef: React.MutableRefObject<GoogleLatLng | null>;
}
