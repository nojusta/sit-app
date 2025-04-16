import 'dotenv/config';

export default {
  "expo": {
    "name": "Sit",
    "slug": "sit-app",
    "version": "1.0.0",
    "entryPoint": "./src/index.tsx",
    "orientation": "portrait",
    "icon": "./assets/images/logo-small.png",
    "scheme": "sit-app",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/logo.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "package": "com.sitapp",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "This app needs access to your photo library to update your profile picture."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/logo.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.sitapp",
      "permissions": [
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-font"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "APPWRITE_ENDPOINT": process.env.APPWRITE_ENDPOINT,
      "APPWRITE_PROJECT_ID": process.env.APPWRITE_PROJECT_ID,
      "APPWRITE_STORAGE_ID": process.env.APPWRITE_STORAGE_ID,
      "APPWRITE_DATABASE_ID": process.env.APPWRITE_DATABASE_ID,
      "APPWRITE_USER_COLLECTION_ID": process.env.APPWRITE_USER_COLLECTION_ID,
      "APPWRITE_MARKERS_COLLECTION_ID": process.env.APPWRITE_MARKERS_COLLECTION_ID,
      "ADMIN_EMAIL": process.env.ADMIN_EMAIL,
      "ADMIN_PASSWORD": process.env.ADMIN_PASSWORD
    }
  }
};