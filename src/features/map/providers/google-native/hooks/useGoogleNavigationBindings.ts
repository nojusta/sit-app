import { useEffect } from "react";

import type {
  GoogleLatLng,
  GoogleNavigationBindings,
  GoogleNavigationRefs,
} from "../googleMapSurface.types";

interface UseGoogleNavigationBindingsOptions
  extends
    GoogleNavigationBindings,
    Pick<
      GoogleNavigationRefs,
      | "browseMapControllerRef"
      | "navigationMapControllerRef"
      | "navigationViewControllerRef"
      | "latestNavigationLocationRef"
      | "parentMapControllerRef"
    > {
  clearActiveNavigation: (options?: {
    destroySession?: boolean;
    hideNavigationUi?: boolean;
  }) => Promise<void>;
  finalizeNavigationExit: (options?: {
    destroySession?: boolean;
    message?: string;
  }) => Promise<void>;
}

const useGoogleNavigationBindings = ({
  browseMapControllerRef,
  navigationMapControllerRef,
  navigationViewControllerRef,
  latestNavigationLocationRef,
  parentMapControllerRef,
  clearActiveNavigation,
  finalizeNavigationExit,
  setLogDebugInfo,
  setOnArrival,
  setOnLocationChanged,
  setOnNavigationReady,
}: UseGoogleNavigationBindingsOptions) => {
  useEffect(() => {
    setOnArrival((arrivalEvent) => {
      if (arrivalEvent.isFinalDestination ?? true) {
        void finalizeNavigationExit({ destroySession: true });
      }
    });

    return () => {
      setOnArrival(null);
    };
  }, [finalizeNavigationExit, setOnArrival]);

  useEffect(() => {
    setOnLocationChanged((location) => {
      latestNavigationLocationRef.current = {
        lat: location.lat,
        lng: location.lng,
      } satisfies GoogleLatLng;
    });

    return () => {
      setOnLocationChanged(null);
    };
  }, [latestNavigationLocationRef, setOnLocationChanged]);

  useEffect(() => {
    setOnNavigationReady(() => {
      if (__DEV__) {
        console.log("Google navigation session is ready.");
      }
    });

    return () => {
      setOnNavigationReady(null);
    };
  }, [setOnNavigationReady]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    setLogDebugInfo((message) => {
      console.log(`[GoogleNavigation] ${message}`);
    });

    return () => {
      setLogDebugInfo(null);
    };
  }, [setLogDebugInfo]);

  useEffect(() => {
    const parentMapController = parentMapControllerRef.current;

    return () => {
      parentMapController.current = null;
      browseMapControllerRef.current = null;
      navigationMapControllerRef.current = null;
      navigationViewControllerRef.current = null;
      void clearActiveNavigation({ destroySession: true });
    };
  }, [
    browseMapControllerRef,
    clearActiveNavigation,
    navigationMapControllerRef,
    navigationViewControllerRef,
    parentMapControllerRef,
  ]);
};

export default useGoogleNavigationBindings;
