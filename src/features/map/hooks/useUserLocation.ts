import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";

export type LocationPermissionState = "idle" | "loading" | "granted" | "denied";

export type LocationSource = Pick<
  typeof Location,
  | "requestForegroundPermissionsAsync"
  | "getForegroundPermissionsAsync"
  | "getCurrentPositionAsync"
>;

const useUserLocation = (locationSource: LocationSource = Location) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("idle");

  const syncLocationPermissionAndPosition = useCallback(
    async (options = { requestPermission: false }) => {
      try {
        if (options.requestPermission) {
          setPermissionState("loading");
        }

        const permissionResult = options.requestPermission
          ? await locationSource.requestForegroundPermissionsAsync()
          : await locationSource.getForegroundPermissionsAsync();
        const isGranted = String(permissionResult.status) === "granted";

        if (!isGranted) {
          setPermissionState("denied");
          setLocation(null);
          return;
        }

        setPermissionState("granted");

        try {
          const currentLocation = await locationSource.getCurrentPositionAsync({});
          setLocation(currentLocation);
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to fetch current location.", error);
          }

          setLocation(null);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Failed to synchronize location permission.", error);
        }

        if (options.requestPermission) {
          setPermissionState("denied");
        }
      }
    },
    [locationSource],
  );

  useEffect(() => {
    void syncLocationPermissionAndPosition({ requestPermission: true });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          void syncLocationPermissionAndPosition({ requestPermission: false });
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [syncLocationPermissionAndPosition]);

  return {
    location,
    permissionState,
    isPermissionDenied: permissionState === "denied",
    isPermissionGranted: permissionState === "granted",
    isPermissionLoading: permissionState === "idle" || permissionState === "loading",
    refreshLocation: syncLocationPermissionAndPosition,
  };
};

export default useUserLocation;
