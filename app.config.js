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
      backgroundColor: "#1F2937",
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
        NSCameraUsageDescription:
          "Allow SIT to take a photo when you add a new sitting place or update your profile picture.",
        NSPhotoLibraryUsageDescription:
          "Allow SIT to choose photos for new sitting places and profile pictures.",
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
      permissions: ["CAMERA", "READ_EXTERNAL_STORAGE", "READ_MEDIA_IMAGES"],
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
        "expo-image-picker",
        {
          photosPermission:
            "Allow SIT to choose photos for new sitting places and profile pictures.",
          cameraPermission:
            "Allow SIT to take a photo when you add a new sitting place or update your profile picture.",
        },
      ],
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
      APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
      APPWRITE_MARKERS_COLLECTION_ID: process.env.APPWRITE_MARKERS_COLLECTION_ID,
      APPWRITE_RATINGS_COLLECTION_ID: process.env.APPWRITE_RATINGS_COLLECTION_ID,
      APPWRITE_FAVORITES_COLLECTION_ID: process.env.APPWRITE_FAVORITES_COLLECTION_ID,
      APPWRITE_MODERATION_WARNINGS_ID: process.env.APPWRITE_MODERATION_WARNINGS_ID,
      APPWRITE_STORAGE_ID: process.env.APPWRITE_STORAGE_ID,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      WEATHER_TEST_SCENARIO: process.env.WEATHER_TEST_SCENARIO,
    },
  },
};
