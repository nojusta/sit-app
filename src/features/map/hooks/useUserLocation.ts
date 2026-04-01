import { useEffect, useState } from "react";
import * as Location from "expo-location";

export type LocationPermissionState = "idle" | "loading" | "granted" | "denied";

const useUserLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("idle");

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setPermissionState("loading");

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (status !== "granted") {
          setPermissionState("denied");
          setLocation(null);
          return;
        }

        setPermissionState("granted");

        const currentLocation = await Location.getCurrentPositionAsync({});

        if (isMounted) {
          setLocation(currentLocation);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Failed to request location permission or fetch location.", error);
        }

        if (isMounted) {
          setPermissionState("denied");
          setLocation(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    location,
    permissionState,
    isPermissionDenied: permissionState === "denied",
    isPermissionGranted: permissionState === "granted",
    isPermissionLoading: permissionState === "idle" || permissionState === "loading",
  };
};

export default useUserLocation;
