import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

export type GoogleNavigationSdkModule =
  typeof import("@googlemaps/react-native-navigation-sdk");

type NativeModuleMap = Record<string, unknown>;
type TurboModuleRegistryLike = {
  get?: (name: string) => unknown;
};

const getTurboModule = (name: string) => {
  const registry = TurboModuleRegistry as TurboModuleRegistryLike | undefined;
  return registry?.get?.(name) ?? null;
};

const hasNativeModule = (name: string) => {
  const nativeModules = NativeModules as NativeModuleMap | undefined;

  return Boolean(nativeModules?.[name]) || Boolean(getTurboModule(name));
};

export const isGoogleNavigationSdkNativeAvailable = () => {
  if (Platform.OS === "web") {
    return false;
  }

  return hasNativeModule("NavModule") && hasNativeModule("NavViewModule");
};

export const loadGoogleNavigationSdk = (): GoogleNavigationSdkModule | null => {
  if (!isGoogleNavigationSdkNativeAvailable()) {
    return null;
  }

  try {
    return require("@googlemaps/react-native-navigation-sdk") as GoogleNavigationSdkModule;
  } catch (error) {
    if (__DEV__) {
      console.warn("Failed to load Google Navigation SDK.", error);
    }

    return null;
  }
};
