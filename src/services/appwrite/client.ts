import { Account, Client, Databases, Storage } from "appwrite";
import Constants from "expo-constants";

type ExpoExtra = {
  APPWRITE_ENDPOINT?: string;
  APPWRITE_PROJECT_ID?: string;
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_MARKERS_COLLECTION_ID?: string;
  APPWRITE_RATINGS_COLLECTION_ID?: string;
  APPWRITE_FAVORITES_COLLECTION_ID?: string;
  APPWRITE_MODERATION_WARNINGS_ID?: string;
  APPWRITE_STORAGE_ID?: string;
};

const constantsWithUntypedManifest = Constants as typeof Constants & {
  manifest?: { extra?: ExpoExtra } | null;
  manifest2?: { extra?: { expoClient?: { extra?: ExpoExtra } } } | null;
};

const expoExtra: ExpoExtra =
  Constants.expoConfig?.extra ??
  constantsWithUntypedManifest.manifest?.extra ??
  constantsWithUntypedManifest.manifest2?.extra?.expoClient?.extra ??
  {};

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_MARKERS_COLLECTION_ID,
  APPWRITE_RATINGS_COLLECTION_ID,
  APPWRITE_FAVORITES_COLLECTION_ID,
  APPWRITE_MODERATION_WARNINGS_ID,
  APPWRITE_STORAGE_ID,
} = expoExtra;

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: APPWRITE_DATABASE_ID,
  markersCollectionId: APPWRITE_MARKERS_COLLECTION_ID,
  ratingsCollectionId: APPWRITE_RATINGS_COLLECTION_ID,
  favoritesCollectionId: APPWRITE_FAVORITES_COLLECTION_ID,
  moderationWarningsCollectionId: APPWRITE_MODERATION_WARNINGS_ID,
  storageId: APPWRITE_STORAGE_ID,
};

export const client = new Client();

const baseConfig = {
  endpoint: appwriteConfig.endpoint,
  projectId: appwriteConfig.projectId,
};
const databaseConfig = {
  databaseId: appwriteConfig.databaseId,
};
const missingBaseConfig = Object.entries(baseConfig).filter(([, value]) => !value);
const appwriteReady = missingBaseConfig.length === 0;
const databaseConfigured = appwriteReady && Boolean(databaseConfig.databaseId);
export const markersReady =
  databaseConfigured && Boolean(appwriteConfig.markersCollectionId);
export const ratingsReady =
  databaseConfigured && Boolean(appwriteConfig.ratingsCollectionId);
export const favoritesReady =
  databaseConfigured && Boolean(appwriteConfig.favoritesCollectionId);
export const moderationWarningsReady =
  databaseConfigured && Boolean(appwriteConfig.moderationWarningsCollectionId);
const storageReady = appwriteReady && Boolean(appwriteConfig.storageId);

if (appwriteReady) {
  client.setEndpoint(appwriteConfig.endpoint!).setProject(appwriteConfig.projectId!);
} else if (__DEV__) {
  console.warn("Appwrite base config missing values:", missingBaseConfig);
}

const account = appwriteReady ? new Account(client) : null;
const databases = databaseConfigured ? new Databases(client) : null;
const storage = storageReady ? new Storage(client) : null;

const throwConfigurationError = (developerMessage: string, userMessage: string) => {
  if (__DEV__) {
    console.warn(developerMessage);
  }

  throw new Error(userMessage);
};

export const ensureReady = () => {
  if (!appwriteReady) {
    throwConfigurationError(
      "Appwrite configuration is missing. Check your env variables in app.config.js.",
      "App connection is temporarily unavailable.",
    );
  }
};

export const ensureDatabaseConfigured = () => {
  ensureReady();

  if (!databaseConfigured) {
    throwConfigurationError(
      "Appwrite database is not configured. Check APPWRITE_DATABASE_ID in app.config.js.",
      "App data is temporarily unavailable.",
    );
  }
};

export const ensureMarkersReady = () => {
  ensureDatabaseConfigured();

  if (!markersReady) {
    throwConfigurationError(
      "Appwrite markers database is not configured. Check APPWRITE_DATABASE_ID and APPWRITE_MARKERS_COLLECTION_ID.",
      "Sitting spot data is temporarily unavailable.",
    );
  }
};

export const ensureRatingsReady = () => {
  ensureReady();

  if (!ratingsReady) {
    throwConfigurationError(
      "Appwrite ratings database is not configured. Check APPWRITE_DATABASE_ID and APPWRITE_RATINGS_COLLECTION_ID.",
      "Ratings are temporarily unavailable.",
    );
  }
};

export const ensureFavoritesReady = () => {
  ensureReady();

  if (!favoritesReady) {
    throwConfigurationError(
      "Appwrite favorites database is not configured. Check APPWRITE_DATABASE_ID and APPWRITE_FAVORITES_COLLECTION_ID.",
      "Favorites are temporarily unavailable.",
    );
  }
};

export const ensureModerationWarningsReady = () => {
  ensureDatabaseConfigured();

  if (!moderationWarningsReady) {
    throwConfigurationError(
      "Appwrite moderation warnings database is not configured. Check APPWRITE_DATABASE_ID and APPWRITE_MODERATION_WARNINGS_ID.",
      "Moderation data is temporarily unavailable.",
    );
  }
};

export const ensureStorageReady = () => {
  ensureReady();

  if (!storageReady) {
    throwConfigurationError(
      "Appwrite storage is not configured. Check APPWRITE_STORAGE_ID.",
      "Photo uploads are temporarily unavailable.",
    );
  }
};

export const getAccountClient = () => {
  ensureReady();
  return account!;
};

export const getDatabasesClient = () => {
  ensureDatabaseConfigured();
  return databases!;
};

export const getStorageClient = () => {
  ensureStorageReady();
  return storage!;
};

export const getDatabaseId = () => {
  ensureDatabaseConfigured();
  return appwriteConfig.databaseId!;
};

export const getMarkersCollectionId = () => {
  ensureMarkersReady();
  return appwriteConfig.markersCollectionId!;
};

export const getRatingsCollectionId = () => {
  ensureRatingsReady();
  return appwriteConfig.ratingsCollectionId!;
};

export const getFavoritesCollectionId = () => {
  ensureFavoritesReady();
  return appwriteConfig.favoritesCollectionId!;
};

export const getModerationWarningsCollectionId = () => {
  ensureModerationWarningsReady();
  return appwriteConfig.moderationWarningsCollectionId!;
};

export const getStorageId = () => {
  ensureStorageReady();
  return appwriteConfig.storageId!;
};

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export const buildAppwriteUrl = (resourcePath: string) => {
  ensureReady();

  return new URL(
    resourcePath.replace(/^\/+/, ""),
    ensureTrailingSlash(appwriteConfig.endpoint!),
  ).toString();
};

export const APPWRITE_RESPONSE_FORMAT = "1.8.0";
