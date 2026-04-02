import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import type { MarkerData } from "../core";
import {
  loadGoogleNavigationSdk,
  type GoogleNavigationSdkModule,
} from "../utils/googleNavigationSdk";
import {
  getNavigationSessionStatusMessage,
  getRouteStatusMessage,
  NAVIGATION_UNAVAILABLE_TITLE,
} from "../utils/navigation";

interface GoogleNavigationViewProps {
  destination: MarkerData;
  onStopNavigation: () => void;
}

interface GoogleNavigationViewInnerProps extends GoogleNavigationViewProps {
  navigationSdk: GoogleNavigationSdkModule;
}

type NavigationSdkRuntime = GoogleNavigationSdkModule | null;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.18)",
  },
  loadingCard: {
    minWidth: 240,
    borderRadius: 20,
    backgroundColor: "rgba(31, 41, 55, 0.94)",
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#F9FAFB",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
  },
  loadingHint: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
});

const GoogleNavigationViewInner: React.FC<GoogleNavigationViewInnerProps> = ({
  destination,
  onStopNavigation,
  navigationSdk,
}) => {
  const {
    NavigationView,
    NavigationUIEnabledPreference,
    NavigationSessionStatus,
    RouteStatus,
    TravelMode,
    useNavigation,
  } = navigationSdk;
  const navigationSessionOk = NavigationSessionStatus.OK;
  const routeOk = RouteStatus.OK;
  const walkingTravelMode = TravelMode.WALKING;

  const { navigationController, setOnArrival } = useNavigation();
  const [isPreparing, setIsPreparing] = useState(true);

  const destinationWaypoint = useMemo(
    () => ({
      title: destination.title,
      position: {
        lat: destination.coordinate.latitude,
        lng: destination.coordinate.longitude,
      },
    }),
    [
      destination.coordinate.latitude,
      destination.coordinate.longitude,
      destination.title,
    ],
  );

  useEffect(() => {
    setOnArrival((arrivalEvent) => {
      if (arrivalEvent.isFinalDestination ?? true) {
        void navigationController.stopGuidance();
        void navigationController.clearDestinations();
        onStopNavigation();
      }
    });

    return () => {
      setOnArrival(null);
    };
  }, [navigationController, onStopNavigation, setOnArrival]);

  useEffect(() => {
    let isActive = true;

    const stopAndExit = (message?: string) => {
      if (message) {
        Alert.alert(NAVIGATION_UNAVAILABLE_TITLE, message);
      }

      void navigationController.stopGuidance();
      void navigationController.clearDestinations();
      onStopNavigation();
    };

    const startNavigation = async () => {
      try {
        const termsAccepted = await navigationController.areTermsAccepted();
        const accepted =
          termsAccepted || (await navigationController.showTermsAndConditionsDialog());

        if (!isActive) {
          return;
        }

        if (!accepted) {
          stopAndExit(
            "Navigation cannot start until the Google navigation terms are accepted.",
          );
          return;
        }

        const sessionStatus = await navigationController.init();

        if (!isActive) {
          return;
        }

        if (sessionStatus !== navigationSessionOk) {
          stopAndExit(getNavigationSessionStatusMessage(sessionStatus));
          return;
        }

        const routeStatus = await navigationController.setDestination(
          destinationWaypoint,
          {
            displayOptions: {
              showDestinationMarkers: true,
            },
            routingOptions: {
              travelMode: walkingTravelMode,
            },
          },
        );

        if (!isActive) {
          return;
        }

        if (routeStatus !== routeOk) {
          stopAndExit(getRouteStatusMessage(routeStatus));
          return;
        }

        await navigationController.startGuidance();

        if (!isActive) {
          return;
        }

        setIsPreparing(false);
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to start Google navigation.", error);
        }

        if (isActive) {
          stopAndExit("Unable to start navigation right now. Please try again.");
        }
      }
    };

    void startNavigation();

    return () => {
      isActive = false;
      void navigationController.stopGuidance();
      void navigationController.clearDestinations();
    };
  }, [
    destinationWaypoint,
    navigationController,
    navigationSessionOk,
    onStopNavigation,
    routeOk,
    walkingTravelMode,
  ]);

  return (
    <View style={styles.container}>
      <NavigationView
        style={styles.container}
        navigationUIEnabledPreference={NavigationUIEnabledPreference.AUTOMATIC}
        myLocationEnabled
        myLocationButtonEnabled={false}
        recenterButtonEnabled
        trafficEnabled
        compassEnabled
        speedometerEnabled={Platform.OS === "android"}
      />
      {isPreparing ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <MaterialIcons name="directions-walk" size={28} color="#F9FAFB" />
            <Text style={styles.loadingText}>
              Starting navigation to {destination.title}
            </Text>
            <Text style={styles.loadingHint}>
              Preparing live route guidance in the map view.
            </Text>
            <ActivityIndicator color="#F9FAFB" />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const GoogleNavigationView: React.FC<GoogleNavigationViewProps> = ({
  destination,
  onStopNavigation,
}) => {
  const isWeb = Platform.OS === "web";
  const navigationSdk = useMemo<NavigationSdkRuntime>(() => {
    return isWeb ? null : loadGoogleNavigationSdk();
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb && !navigationSdk) {
      Alert.alert(
        NAVIGATION_UNAVAILABLE_TITLE,
        "Embedded navigation requires a native development build with the Google Navigation SDK configured.",
      );
      onStopNavigation();
    }
  }, [isWeb, navigationSdk, onStopNavigation]);

  if (isWeb || !navigationSdk) {
    return null;
  }

  const { NavigationProvider, TaskRemovedBehavior } = navigationSdk;

  return (
    <NavigationProvider
      termsAndConditionsDialogOptions={{
        title: "Navigation Terms",
        companyName: "SIT",
        showOnlyDisclaimer: false,
      }}
      taskRemovedBehavior={TaskRemovedBehavior.CONTINUE_SERVICE}
    >
      <GoogleNavigationViewInner
        destination={destination}
        onStopNavigation={onStopNavigation}
        navigationSdk={navigationSdk}
      />
    </NavigationProvider>
  );
};

export default GoogleNavigationView;
