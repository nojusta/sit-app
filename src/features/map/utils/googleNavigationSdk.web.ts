export type GoogleNavigationSdkModule =
  typeof import("@googlemaps/react-native-navigation-sdk");

// Metro must not resolve the native module while building the web bundle.
export const isGoogleNavigationSdkNativeAvailable = () => false;
export const loadGoogleNavigationSdk = (): GoogleNavigationSdkModule | null => null;
