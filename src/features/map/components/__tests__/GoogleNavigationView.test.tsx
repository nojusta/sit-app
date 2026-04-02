import React from "react";
import { Alert } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";

import GoogleNavigationView from "../GoogleNavigationView";

const mockAreTermsAccepted = jest.fn();
const mockShowTermsAndConditionsDialog = jest.fn();
const mockInit = jest.fn();
const mockSetDestination = jest.fn();
const mockStartGuidance = jest.fn();
const mockStopGuidance = jest.fn();
const mockClearDestinations = jest.fn();
let mockArrivalHandler: ((event: { isFinalDestination?: boolean }) => void) | null = null;

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name }: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");

    return React.createElement(Text, null, name);
  },
}));

jest.mock("@googlemaps/react-native-navigation-sdk", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    NavigationProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    TaskRemovedBehavior: {
      CONTINUE_SERVICE: "CONTINUE_SERVICE",
    },
    NavigationView: ({ testID }: { testID?: string }) =>
      React.createElement(View, { testID }),
    NavigationUIEnabledPreference: {
      AUTOMATIC: "automatic",
    },
    NavigationSessionStatus: {
      OK: "ok",
      NOT_AUTHORIZED: "notAuthorized",
    },
    RouteStatus: {
      OK: "OK",
      NO_ROUTE_FOUND: "NO_ROUTE_FOUND",
    },
    TravelMode: {
      WALKING: "WALKING",
    },
    useNavigation: () => ({
      navigationController: {
        areTermsAccepted: mockAreTermsAccepted,
        showTermsAndConditionsDialog: mockShowTermsAndConditionsDialog,
        init: mockInit,
        setDestination: mockSetDestination,
        startGuidance: mockStartGuidance,
        stopGuidance: mockStopGuidance,
        clearDestinations: mockClearDestinations,
      },
      setOnArrival: (handler: typeof mockArrivalHandler) => {
        mockArrivalHandler = handler;
      },
    }),
  };
});

jest.mock("../../utils/googleNavigationSdk", () => ({
  loadGoogleNavigationSdk: () => require("@googlemaps/react-native-navigation-sdk"),
}));

describe("GoogleNavigationView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArrivalHandler = null;

    mockAreTermsAccepted.mockResolvedValue(true);
    mockShowTermsAndConditionsDialog.mockResolvedValue(true);
    mockInit.mockResolvedValue("ok");
    mockSetDestination.mockResolvedValue("OK");
    mockStartGuidance.mockResolvedValue(undefined);
    mockStopGuidance.mockResolvedValue(undefined);
    mockClearDestinations.mockResolvedValue(undefined);

    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("initializes embedded guidance for the chosen marker and handles arrival", async () => {
    const onStopNavigation = jest.fn();

    render(
      <GoogleNavigationView
        destination={{
          id: 1,
          title: "Cathedral Square",
          description: "Main square of the Vilnius Old Town",
          coordinate: { latitude: 54.6839, longitude: 25.2875 },
        }}
        onStopNavigation={onStopNavigation}
      />,
    );

    expect(screen.getByText("Starting navigation to Cathedral Square")).toBeTruthy();

    await waitFor(() => expect(mockInit).toHaveBeenCalled());
    expect(mockSetDestination).toHaveBeenCalledWith(
      {
        title: "Cathedral Square",
        position: { lat: 54.6839, lng: 25.2875 },
      },
      expect.objectContaining({
        routingOptions: {
          travelMode: "WALKING",
        },
      }),
    );
    await waitFor(() => expect(mockStartGuidance).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByText("Starting navigation to Cathedral Square")).toBeNull(),
    );

    act(() => {
      mockArrivalHandler?.({ isFinalDestination: true });
    });

    await waitFor(() => expect(onStopNavigation).toHaveBeenCalled());
    expect(mockStopGuidance).toHaveBeenCalled();
    expect(mockClearDestinations).toHaveBeenCalled();
  });

  it("shows a navigation error and exits when the SDK cannot initialize a session", async () => {
    const onStopNavigation = jest.fn();

    mockInit.mockResolvedValue("notAuthorized");

    render(
      <GoogleNavigationView
        destination={{
          id: 2,
          title: "Kudirka Square",
          description: "Benches, skaters, and a statue of Vincas Kudirka",
          coordinate: { latitude: 54.6868, longitude: 25.2799 },
        }}
        onStopNavigation={onStopNavigation}
      />,
    );

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Navigation unavailable",
        "Google Navigation SDK is not authorized. Check your Google Maps API key and enabled Navigation SDKs.",
      ),
    );

    expect(onStopNavigation).toHaveBeenCalled();
    expect(mockStartGuidance).not.toHaveBeenCalled();
  });
});
