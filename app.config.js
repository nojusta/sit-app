import "dotenv/config";

const googleMapsAndroidApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const googleMapsIosApiKey =
  process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const easProjectId = "d8af9980-ef85-4e27-9fa1-5045e54b9f8a";

export default {
  expo: {
    name: "Sit",
    slug: "sit-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo-small.png",
    scheme: "sit-app",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sitapp",
      config: {
        googleMapsApiKey: googleMapsIosApiKey,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Allow SIT to access your location for map and navigation features.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Allow SIT to keep your navigation active while the app is in use.",
        NSLocationAlwaysUsageDescription:
          "Allow SIT to keep your navigation active while the app is in use.",
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo library to update your profile picture.",
        UIBackgroundModes: ["location"],
      },
    },
    android: {
      config: {
        googleMaps: {
          apiKey: googleMapsAndroidApiKey,
        },
      },
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundColor: "#ffffff",
      },
      package: "com.sitapp",
      permissions: ["READ_EXTERNAL_STORAGE"],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-video",
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.0",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: easProjectId,
      },
      APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
      APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
      APPWRITE_STORAGE_ID: process.env.APPWRITE_STORAGE_ID,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    },
  },
};
