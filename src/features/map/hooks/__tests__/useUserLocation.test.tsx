import { renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import useUserLocation from "../useUserLocation";
import * as Location from "expo-location";

jest.mock("expo-location", () => ({
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
  },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockedLocation = jest.mocked(Location);
const mockedAppState = jest.mocked(AppState);

describe("useUserLocation", () => {
  let appStateListener: ((status: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = undefined;

    jest.spyOn(AppState, "addEventListener").mockImplementation((eventType, listener) => {
      if (eventType === "change") {
        appStateListener = listener;
      }

      return {
        remove: jest.fn(),
      };
    });

    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: "never",
      granted: true,
    });
  });

  it("requests permission on mount and exposes the current location when granted", async () => {
    const currentLocation = {
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    } as Location.LocationObject;

    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: "never",
      granted: true,
    });
    mockedLocation.getCurrentPositionAsync.mockResolvedValue(currentLocation);

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isPermissionGranted).toBe(true));

    expect(mockedLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalled();
    expect(mockedAppState.addEventListener).toHaveBeenCalled();
    expect(result.current.location).toEqual(currentLocation);
  });

  it("marks permission as denied and skips location lookup when the user rejects access", async () => {
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
      canAskAgain: true,
      expires: "never",
      granted: false,
    });

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isPermissionDenied).toBe(true));

    expect(mockedLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(result.current.location).toBeNull();
  });

  it("keeps permission granted when location retrieval fails after permission is granted", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());

    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: "never",
      granted: true,
    });
    mockedLocation.getCurrentPositionAsync.mockRejectedValue(
      new Error("GPS unavailable"),
    );

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isPermissionGranted).toBe(true));

    expect(result.current.location).toBeNull();
    warnSpy.mockRestore();
  });

  it("re-checks permission after the app returns to active state", async () => {
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
      canAskAgain: true,
      expires: "never",
      granted: false,
    });

    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: "never",
      granted: true,
    });

    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 54.6872,
        longitude: 25.2797,
      },
    } as Location.LocationObject);

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isPermissionDenied).toBe(true));

    appStateListener?.("active");

    await waitFor(() => expect(result.current.isPermissionGranted).toBe(true));

    expect(mockedLocation.getForegroundPermissionsAsync).toHaveBeenCalled();
    expect(result.current.location?.coords.latitude).toBe(54.6872);
  });
});
