import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import * as Location from "expo-location";
import useUserLocation from "../useUserLocation";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
const location = jest.mocked(Location);
const granted = {
  status: "granted",
  granted: true,
  canAskAgain: true,
  expires: "never",
} as Location.PermissionResponse;

const originalDev = __DEV__;

describe("SIT-48 location permission error paths AAA", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove: jest.fn() });
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    Object.assign(globalThis, { __DEV__: originalDev });
    jest.restoreAllMocks();
  });

  it("denies access when requesting permission rejects", async () => {
    // Arrange
    location.requestForegroundPermissionsAsync.mockRejectedValue(
      new Error("permission API failed"),
    );
    // Act
    const { result } = renderHook(() => useUserLocation());
    // Assert
    await waitFor(() => expect(result.current.permissionState).toBe("denied"));
  });

  it("retains granted state when a background permission refresh rejects", async () => {
    // Arrange
    location.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 54, longitude: 25 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.location).not.toBeNull());
    location.getForegroundPermissionsAsync.mockRejectedValue(
      new Error("permission API failed"),
    );
    // Act
    await act(async () => {
      await result.current.refreshLocation({ requestPermission: false });
    });
    // Assert
    expect(result.current.permissionState).toBe("granted");
  });

  it("clears a previous position when permission is revoked", async () => {
    // Arrange
    location.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 54, longitude: 25 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.location).not.toBeNull());
    location.getForegroundPermissionsAsync.mockResolvedValue({
      ...granted,
      status: "denied",
      granted: false,
    } as Location.PermissionResponse);
    // Act
    await act(async () => {
      await result.current.refreshLocation({ requestPermission: false });
    });
    // Assert
    expect(result.current.location).toBeNull();
  });
  it("refreshes permission without requesting it when options are omitted", async () => {
    // Arrange
    location.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    location.getForegroundPermissionsAsync.mockResolvedValue(granted);
    location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 54, longitude: 25 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.location).not.toBeNull());
    // Act
    await act(async () => {
      await result.current.refreshLocation();
    });
    // Assert
    expect(location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it("exposes loading while the permission request is pending", async () => {
    // Arrange
    let resolvePermission!: (value: Location.PermissionResponse) => void;
    location.requestForegroundPermissionsAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
    );
    // Act
    const { result } = renderHook(() => useUserLocation());
    // Assert
    expect(result.current.permissionState).toBe("loading");
    await act(async () => {
      resolvePermission({
        ...granted,
        status: "denied",
        granted: false,
      } as Location.PermissionResponse);
    });
  });

  it("clears an existing GPS position when subsequent lookup fails", async () => {
    // Arrange
    location.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    location.getForegroundPermissionsAsync.mockResolvedValue(granted);
    location.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 54, longitude: 25 },
    } as Location.LocationObject);
    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.location).not.toBeNull());
    location.getCurrentPositionAsync.mockRejectedValue(new Error("GPS lost"));
    // Act
    await act(async () => {
      await result.current.refreshLocation();
    });
    // Assert
    expect(result.current.location).toBeNull();
  });

  it.each([true, false])("logs GPS failures only in development, dev=%s", async (dev) => {
    // Arrange
    Object.assign(globalThis, { __DEV__: dev });
    const error = new Error("GPS lost");
    location.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    location.getCurrentPositionAsync.mockRejectedValue(error);
    // Act
    renderHook(() => useUserLocation());
    await act(async () => {
      await Promise.resolve();
    });
    // Assert
    expect(jest.mocked(console.warn).mock.calls).toEqual(
      dev ? [["Failed to fetch current location.", error]] : [],
    );
  });

  it.each([true, false])(
    "logs permission failures only in development, dev=%s",
    async (dev) => {
      // Arrange
      Object.assign(globalThis, { __DEV__: dev });
      const error = new Error("Permission failed");
      location.requestForegroundPermissionsAsync.mockRejectedValue(error);
      // Act
      const { result } = renderHook(() => useUserLocation());
      await waitFor(() => expect(result.current.permissionState).toBe("denied"));
      // Assert
      expect(jest.mocked(console.warn).mock.calls).toEqual(
        dev ? [["Failed to synchronize location permission.", error]] : [],
      );
    },
  );
});
