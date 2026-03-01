import { useEffect, useState } from "react";
import * as Location from "expo-location";

const useUserLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const currentLocation = await Location.getCurrentPositionAsync({});
      if (isMounted) setLocation(currentLocation);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return { location };
};

export default useUserLocation;
