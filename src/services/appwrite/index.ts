import {
  Account,
  AppwriteException,
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
  Storage,
  type Models,
} from "appwrite";
import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  MARKER_TAG_IDS,
  MAX_MARKER_ATTRIBUTES,
  type MarkerTagId,
} from "@/features/markers/constants/tags";

export { MARKER_TAG_IDS, MAX_MARKER_ATTRIBUTES, type MarkerTagId };

type ExpoExtra = {
  APPWRITE_ENDPOINT?: string;
  APPWRITE_PROJECT_ID?: string;
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_MARKERS_COLLECTION_ID?: string;
  APPWRITE_RATINGS_COLLECTION_ID?: string;
  APPWRITE_STORAGE_ID?: string;
};

export type UploadableImage = {
  uri: string;
  name?: string | null;
  type?: string | null;
  size?: number;
};

export type MarkerStatus = "pending_approval" | "approved" | "rejected";

export type MarkerCoordinate = {
  latitude: number;
  longitude: number;
};

export interface MarkerRecord {
  id: string;
  title: string;
  description: string;
  coordinate: MarkerCoordinate;
  location: string;
  status: MarkerStatus;
  authorId: string;
  createdAt: string;
  photoUrl: string | null;
  photoUrls?: string[];
  averageRating?: number | null;
  attributes: MarkerTagId[];
}

export interface MarkerPageResult {
  markers: MarkerRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateMarkerInput {
  title: string;
  description: string;
  coordinate: MarkerCoordinate;
  authorId: string;
  photo?: UploadableImage | null;
  attributes?: MarkerTagId[];
}

export interface UpdateMarkerInput {
  markerId: string;
  authorId: string;
  description: string;
  existingPhotoUrls?: string[];
  newPhotos?: UploadableImage[];
  attributes?: MarkerTagId[];
}

export interface MarkerRatingRecord {
  id: string;
  markerId: string;
  userId: string;
  authorName: string | null;
  score: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitMarkerRatingInput {
  markerId: string;
  userId: string;
  authorName?: string;
  score: number;
  comment?: string;
}

export interface SubmitMarkerRatingResult {
  rating: MarkerRatingRecord;
  averageRating: number | null;
}

export interface MarkerRatingPageResult {
  ratings: MarkerRatingRecord[];
  total: number;
  offset: number;
  pageSize: number;
  hasMore: boolean;
}

interface AppwriteMarkerFields {
  title: string;
  description: string;
  location: string;
  status: MarkerStatus;
  author_id: string;
  created_at: string;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  latitude: number;
  longitude: number;
  average_rating?: number | null;
  attributes?: string[] | null;
}

type AppwriteMarkerDocument = Models.Document & AppwriteMarkerFields;

interface AppwriteRatingFields {
  marker_id: string;
  user_id: string;
  author_name?: string | null;
  score: number;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

type AppwriteRatingDocument = Models.Document & AppwriteRatingFields;

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
  APPWRITE_STORAGE_ID,
} = expoExtra;

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: APPWRITE_DATABASE_ID,
  markersCollectionId: APPWRITE_MARKERS_COLLECTION_ID,
  ratingsCollectionId: APPWRITE_RATINGS_COLLECTION_ID,
  storageId: APPWRITE_STORAGE_ID,
};

const client = new Client();
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
const markersReady = databaseConfigured && Boolean(appwriteConfig.markersCollectionId);
const ratingsReady = databaseConfigured && Boolean(appwriteConfig.ratingsCollectionId);
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

const ensureReady = () => {
  if (!appwriteReady) {
    throwConfigurationError(
      "Appwrite configuration is missing. Check your env variables in app.config.js.",
      "App connection is temporarily unavailable.",
    );
  }
};

const ensureDatabaseConfigured = () => {
  ensureReady();

  if (!databaseConfigured) {
    throwConfigurationError(
      "Appwrite database is not configured. Check APPWRITE_DATABASE_ID in app.config.js.",
      "App data is temporarily unavailable.",
    );
  }
};

const ensureMarkersReady = () => {
  ensureDatabaseConfigured();

  if (!markersReady) {
    throwConfigurationError(
      "Appwrite markers database is not configured. Check APPWRITE_DATABASE_ID and APPWRITE_MARKERS_COLLECTION_ID.",
      "Sitting spot data is temporarily unavailable.",
    );
  }
};

const ensureRatingsReady = () => {
  ensureReady();

  if (!ratingsReady) {
    throwConfigurationError(
      "Appwrite ratings database is not configured. Check APPWRITE_DATABASE_ID and APPWRITE_RATINGS_COLLECTION_ID.",
      "Ratings are temporarily unavailable.",
    );
  }
};

const ensureStorageReady = () => {
  ensureReady();

  if (!storageReady) {
    throwConfigurationError(
      "Appwrite storage is not configured. Check APPWRITE_STORAGE_ID.",
      "Photo uploads are temporarily unavailable.",
    );
  }
};

const getAccountClient = () => {
  ensureReady();
  return account!;
};

const getDatabasesClient = () => {
  ensureDatabaseConfigured();
  return databases!;
};

const getStorageClient = () => {
  ensureStorageReady();
  return storage!;
};

const getDatabaseId = () => {
  ensureDatabaseConfigured();
  return appwriteConfig.databaseId!;
};

const getMarkersCollectionId = () => {
  ensureMarkersReady();
  return appwriteConfig.markersCollectionId!;
};

const getRatingsCollectionId = () => {
  ensureRatingsReady();
  return appwriteConfig.ratingsCollectionId!;
};

const getStorageId = () => {
  ensureStorageReady();
  return appwriteConfig.storageId!;
};

const getErrorCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "number"
    ? error.code
    : null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ? error.message
      : "";

const isExpectedUnauthenticatedError = (error: unknown) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === 401 ||
    message.includes("missing scopes") ||
    message.includes("role: guests") ||
    message.includes("current session not found")
  );
};

const isAuthorizationError = (error: unknown) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === 401 ||
    code === 403 ||
    message.includes("not authorized") ||
    message.includes("not authorised") ||
    message.includes("permission") ||
    message.includes("missing scopes")
  );
};

const normalizeIdentifiers = (currentAccount: Models.User<Models.Preferences>) =>
  [currentAccount.email].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

const normalizeUser = (currentAccount: Models.User<Models.Preferences>) => ({
  $id: currentAccount.$id,
  accountID: currentAccount.$id,
  email: currentAccount.email,
  username: currentAccount.name ?? currentAccount.email?.split("@")[0] ?? "User",
  avatar:
    typeof currentAccount.prefs?.avatar === "string"
      ? currentAccount.prefs.avatar
      : undefined,
  status: currentAccount.status,
  joined: currentAccount.registration ?? currentAccount.$createdAt,
  identifiers: normalizeIdentifiers(currentAccount),
});

const formatMarkerLocation = ({ latitude, longitude }: MarkerCoordinate) =>
  `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

const markerTagIdSet = new Set<string>(MARKER_TAG_IDS);

const mapMarkerAttributes = (value: unknown): MarkerTagId[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: MarkerTagId[] = [];

  value.forEach((item) => {
    if (
      typeof item === "string" &&
      markerTagIdSet.has(item) &&
      !normalized.includes(item as MarkerTagId) &&
      normalized.length < MAX_MARKER_ATTRIBUTES
    ) {
      normalized.push(item as MarkerTagId);
    }
  });

  return normalized;
};

const normalizeMarkerAttributesForWrite = (
  value: readonly MarkerTagId[] | null | undefined,
): MarkerTagId[] => {
  if (!value) {
    return [];
  }

  const normalized: MarkerTagId[] = [];

  value.forEach((item) => {
    if (!markerTagIdSet.has(item)) {
      throw new Error("Marker tag is not supported.");
    }

    if (!normalized.includes(item)) {
      normalized.push(item);
    }
  });

  if (normalized.length > MAX_MARKER_ATTRIBUTES) {
    throw new Error(`Choose up to ${MAX_MARKER_ATTRIBUTES} marker tags.`);
  }

  return normalized;
};

const isMissingMarkerAttributesSchemaError = (error: unknown) =>
  error instanceof Error && /unknown attribute:\s*"?attributes"?/iu.test(error.message);

const toMarkerAttributesSchemaError = () =>
  new Error(
    "Marker tags are not enabled in Appwrite yet. Run npm run appwrite:sync-markers before submitting tagged markers.",
  );

const mapMarkerDocument = (document: AppwriteMarkerDocument): MarkerRecord => ({
  id: document.$id,
  title: document.title,
  description: document.description,
  coordinate: {
    latitude: document.latitude,
    longitude: document.longitude,
  },
  location: document.location,
  status: document.status,
  authorId: document.author_id,
  createdAt: document.created_at,
  photoUrl: document.photo_url ?? null,
  photoUrls:
    Array.isArray(document.photo_urls) && document.photo_urls.length > 0
      ? document.photo_urls
      : document.photo_url
        ? [document.photo_url].filter(
            (value): value is string => typeof value === "string" && value.length > 0,
          )
        : [],
  averageRating:
    typeof document.average_rating === "number" ? document.average_rating : null,
  attributes: mapMarkerAttributes(document.attributes),
});

const mapRatingDocument = (document: AppwriteRatingDocument): MarkerRatingRecord => ({
  id: document.$id,
  markerId: document.marker_id,
  userId: document.user_id,
  authorName: typeof document.author_name === "string" ? document.author_name : null,
  score: document.score,
  comment: typeof document.comment === "string" ? document.comment : "",
  createdAt: document.created_at,
  updatedAt: document.updated_at,
});

const buildMarkerDocumentPermissions = (status: MarkerStatus, authorId: string) => {
  // Pending/rejected markers stay author-scoped because moderation currently
  // happens outside the client app in Appwrite, not through an in-app admin flow.
  const permissions = [
    Permission.read(Role.user(authorId)),
    Permission.update(Role.user(authorId)),
    Permission.delete(Role.user(authorId)),
  ];

  if (status === "approved") {
    permissions.unshift(Permission.read(Role.users()));
    permissions.unshift(Permission.read(Role.any()));
  }

  return permissions;
};

const buildMarkerFilePermissions = (status: MarkerStatus, ownerId: string) => {
  // Mirror marker visibility for uploaded photos so pending submissions remain
  // private until they are explicitly approved.
  const permissions = [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];

  if (status === "approved") {
    permissions.unshift(Permission.read(Role.users()));
    permissions.unshift(Permission.read(Role.any()));
  }

  return permissions;
};

const buildProfilePhotoPermissions = (ownerId: string) => [
  Permission.read(Role.users()),
  Permission.read(Role.any()),
  Permission.update(Role.user(ownerId)),
  Permission.delete(Role.user(ownerId)),
];

const buildRatingDocumentPermissions = (ownerId: string) => [
  Permission.read(Role.users()),
  Permission.read(Role.any()),
  Permission.update(Role.user(ownerId)),
  Permission.delete(Role.user(ownerId)),
];

const APPWRITE_RESPONSE_FORMAT = "1.8.0";
const RATING_PAGE_SIZE = 100;

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

const buildAppwriteUrl = (resourcePath: string) => {
  ensureReady();

  return new URL(
    resourcePath.replace(/^\/+/, ""),
    ensureTrailingSlash(appwriteConfig.endpoint!),
  ).toString();
};

const parseJsonResponse = (value: string) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeOptionalComment = (value?: string | null) => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "";
};

const normalizeOptionalAuthorName = (value?: string | null) => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "";
};

const normalizeRatingScore = (value: number) => {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("Rating must be an integer between 1 and 5.");
  }

  return value;
};

const roundAverageRating = (value: number) => Math.round(value * 100) / 100;

const calculateAverageRating = (scores: number[]): number | null => {
  if (scores.length === 0) {
    return null;
  }

  return roundAverageRating(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
};

const normalizeUploadFileName = (value: string | undefined, fallback: string) => {
  const normalized = String(value || fallback)
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallback;
};

const SUPPORTED_IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};

const MIME_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-heic": "heic",
  "image/x-heif": "heif",
};

const getFileExtension = (value?: string | null) => {
  const match = value?.trim().match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/u);
  return match?.[1]?.toLowerCase() ?? null;
};

const normalizeImageMimeType = (file: UploadableImage) => {
  const declaredType = file.type?.trim().toLowerCase();
  const typeFromName = getFileExtension(file.name);
  const typeFromUri = getFileExtension(file.uri);
  const extension = typeFromName ?? typeFromUri;

  if (declaredType && MIME_EXTENSION_BY_TYPE[declaredType]) {
    return SUPPORTED_IMAGE_MIME_BY_EXTENSION[MIME_EXTENSION_BY_TYPE[declaredType]];
  }

  return extension
    ? (SUPPORTED_IMAGE_MIME_BY_EXTENSION[extension] ?? "image/jpeg")
    : "image/jpeg";
};

export const normalizeUploadableImage = (file: UploadableImage) => {
  const mimeType = normalizeImageMimeType(file);
  const declaredExtension = getFileExtension(file.name);
  const uriExtension = getFileExtension(file.uri);
  const fallbackExtension =
    MIME_EXTENSION_BY_TYPE[mimeType] ?? declaredExtension ?? uriExtension ?? "jpg";
  const baseName = normalizeUploadFileName(
    file.name ?? undefined,
    `upload-${Date.now()}.${fallbackExtension}`,
  );
  const hasSupportedExtension = Boolean(
    SUPPORTED_IMAGE_MIME_BY_EXTENSION[getFileExtension(baseName) ?? ""],
  );
  const name = hasSupportedExtension ? baseName : `${baseName}.${fallbackExtension}`;

  return {
    uri: file.uri,
    name,
    type: mimeType,
  };
};

const createStorageFile = async (
  file: UploadableImage,
  permissions: string[],
): Promise<string> => {
  ensureStorageReady();
  try {
    const jwt = await getAccountClient().createJWT();
    const formData = new FormData();

    formData.append("fileId", "unique()");
    formData.append("file", normalizeUploadableImage(file) as unknown as Blob);
    permissions.forEach((permission) => {
      formData.append("permissions[]", permission);
    });

    const response = await fetch(
      buildAppwriteUrl(`/storage/buckets/${encodeURIComponent(getStorageId())}/files`),
      {
        method: "POST",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          "X-Appwrite-Project": appwriteConfig.projectId!,
          "X-Appwrite-JWT": jwt.jwt,
          "X-Appwrite-Response-Format": APPWRITE_RESPONSE_FORMAT,
        },
        body: formData,
      },
    );
    const payload = parseJsonResponse(await response.text());

    if (!response.ok || !payload?.$id) {
      throw new Error(
        typeof payload?.message === "string"
          ? payload.message
          : "Could not upload the selected image.",
      );
    }

    const fileUrl = getStorageClient().getFileView(getStorageId(), payload.$id);

    return String(fileUrl);
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new Error(error.message || "Could not upload the selected image.");
    }

    throw error instanceof Error
      ? error
      : new Error("Could not upload the selected image.");
  }
};

const uploadMarkerPhotos = async (
  photos: UploadableImage[],
  status: MarkerStatus,
  ownerId: string,
) =>
  Promise.all(
    photos.map((photo) =>
      createStorageFile(photo, buildMarkerFilePermissions(status, ownerId)),
    ),
  );

// Register user
export async function createUser(email: string, password: string, username: string) {
  try {
    ensureReady();
    const newAccount = await getAccountClient().create(
      ID.unique(),
      email,
      password,
      username,
    );

    if (!newAccount) {
      throw new Error("Failed to create user");
    }

    await signIn(email, password);
    const currentAccount = await getAccountClient().get();

    return normalizeUser(currentAccount);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create user");
  }
}

// Sign In
export async function signIn(email: string, password: string) {
  try {
    ensureReady();
    return await getAccountClient().createEmailPasswordSession(email, password);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign in");
  }
}

// Get Account
export async function getAccount() {
  try {
    ensureReady();
    return await getAccountClient().get();
  } catch (error) {
    if (__DEV__ && !isExpectedUnauthenticatedError(error)) {
      console.error("No authenticated user:", error);
    }

    return null;
  }
}

// Get Current User
export async function getCurrentUser() {
  try {
    ensureReady();
    const currentAccount = await getAccount();

    if (!currentAccount) {
      return null;
    }

    return normalizeUser(currentAccount);
  } catch (error) {
    if (__DEV__) {
      console.error("Error fetching current user:", error);
    }

    throw error instanceof Error ? error : new Error("Failed to fetch user");
  }
}

// Sign Out
export async function signOut() {
  try {
    ensureReady();
    return await getAccountClient().deleteSession("current");
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign out");
  }
}

// Admin Login (returns user; UI handles side effects)
export async function adminLogin(email: string, password: string) {
  ensureReady();
  const currentAccount = await getAccount();

  if (currentAccount) {
    await signOut();
  }

  await getAccountClient().createEmailPasswordSession(email, password);
  return getCurrentUser();
}

// Upload Profile Picture
export async function uploadProfilePicture(file: UploadableImage) {
  try {
    ensureStorageReady();
    const currentAccount = await getAccountClient().get();
    const fileUrl = await createStorageFile(
      file,
      buildProfilePhotoPermissions(currentAccount.$id),
    );

    await getAccountClient().updatePrefs({ avatar: fileUrl });
    return fileUrl;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error instanceof Error ? error : new Error("Failed to upload profile picture");
  }
}

export async function listApprovedMarkers(
  _signal?: AbortSignal,
): Promise<MarkerRecord[]> {
  ensureMarkersReady();

  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getMarkersCollectionId(),
    [Query.equal("status", "approved"), Query.orderDesc("created_at"), Query.limit(200)],
  );

  return response.documents.map((document) =>
    mapMarkerDocument(document as AppwriteMarkerDocument),
  );
}

export async function listMarkersByAuthor(
  authorId: string,
  _signal?: AbortSignal,
): Promise<MarkerRecord[]> {
  const response = await listMarkersByAuthorPage(authorId, { page: 1, pageSize: 200 });

  return response.markers;
}

export async function listMarkersByAuthorPage(
  authorId: string,
  options?: { page?: number; pageSize?: number },
): Promise<MarkerPageResult> {
  ensureMarkersReady();

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 10, 100));
  const offset = (page - 1) * pageSize;

  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getMarkersCollectionId(),
    [
      Query.equal("author_id", authorId),
      Query.orderDesc("created_at"),
      Query.limit(pageSize),
      Query.offset(offset),
    ],
  );

  const markers = response.documents.map((document) =>
    mapMarkerDocument(document as AppwriteMarkerDocument),
  );
  const total = response.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    markers,
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function createMarker({
  title,
  description,
  coordinate,
  authorId,
  photo = null,
  attributes = [],
}: CreateMarkerInput): Promise<MarkerRecord> {
  ensureMarkersReady();

  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  const normalizedAttributes = normalizeMarkerAttributesForWrite(attributes);

  if (!normalizedTitle) {
    throw new Error("Marker title is required.");
  }

  if (!normalizedDescription) {
    throw new Error("Marker description is required.");
  }

  const status: MarkerStatus = "pending_approval";
  const createdAt = new Date().toISOString();
  const photoUrl = photo
    ? await createStorageFile(photo, buildMarkerFilePermissions(status, authorId))
    : null;
  const createPayload: Record<string, unknown> = {
    title: normalizedTitle,
    description: normalizedDescription,
    location: formatMarkerLocation(coordinate),
    status,
    author_id: authorId,
    created_at: createdAt,
    photo_url: photoUrl,
    photo_urls: photoUrl ? [photoUrl] : [],
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  };

  if (normalizedAttributes.length > 0) {
    createPayload.attributes = normalizedAttributes;
  }

  let document: Models.Document;

  try {
    document = await getDatabasesClient().createDocument(
      getDatabaseId(),
      getMarkersCollectionId(),
      ID.unique(),
      createPayload,
      buildMarkerDocumentPermissions(status, authorId),
    );
  } catch (error) {
    if (isMissingMarkerAttributesSchemaError(error)) {
      throw toMarkerAttributesSchemaError();
    }

    throw error;
  }

  return mapMarkerDocument(document as AppwriteMarkerDocument);
}

export async function updateMarker({
  markerId,
  authorId,
  description,
  existingPhotoUrls = [],
  newPhotos = [],
  attributes,
}: UpdateMarkerInput): Promise<MarkerRecord> {
  ensureMarkersReady();

  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    throw new Error("Marker description is required.");
  }

  const status: MarkerStatus = "pending_approval";
  const uploadedPhotoUrls = await uploadMarkerPhotos(newPhotos, status, authorId);
  const mergedPhotoUrls = [...existingPhotoUrls, ...uploadedPhotoUrls].filter(
    (value, index, values): value is string =>
      typeof value === "string" && value.length > 0 && values.indexOf(value) === index,
  );
  const primaryPhotoUrl = mergedPhotoUrls[0] ?? null;
  const updatePayload: Record<string, unknown> = {
    description: normalizedDescription,
    status,
    photo_url: primaryPhotoUrl,
    photo_urls: mergedPhotoUrls,
  };

  if (attributes !== undefined) {
    updatePayload.attributes = normalizeMarkerAttributesForWrite(attributes);
  }

  let document: Models.Document;

  try {
    document = await getDatabasesClient().updateDocument(
      getDatabaseId(),
      getMarkersCollectionId(),
      markerId,
      updatePayload,
      buildMarkerDocumentPermissions(status, authorId),
    );
  } catch (error) {
    if (isMissingMarkerAttributesSchemaError(error)) {
      throw toMarkerAttributesSchemaError();
    }

    throw error;
  }

  return mapMarkerDocument(document as AppwriteMarkerDocument);
}

const findExistingMarkerRatingDocument = async (
  markerId: string,
  userId: string,
): Promise<AppwriteRatingDocument | null> => {
  ensureRatingsReady();

  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getRatingsCollectionId(),
    [Query.equal("marker_id", markerId), Query.equal("user_id", userId), Query.limit(1)],
  );

  const [document] = response.documents;
  return document ? (document as AppwriteRatingDocument) : null;
};

const listAllMarkerRatingScores = async (markerId: string) => {
  ensureRatingsReady();

  const scores: number[] = [];
  let offset = 0;
  let total = 0;

  do {
    const response = await getDatabasesClient().listDocuments(
      getDatabaseId(),
      getRatingsCollectionId(),
      [
        Query.equal("marker_id", markerId),
        Query.limit(RATING_PAGE_SIZE),
        Query.offset(offset),
      ],
    );

    total = response.total;
    scores.push(
      ...response.documents
        .map((document) => Number((document as AppwriteRatingDocument).score))
        .filter((score) => Number.isFinite(score)),
    );
    offset += response.documents.length;
  } while (offset < total);

  return scores;
};

export const getMarkerAverageRating = async (markerId: string) => {
  ensureRatingsReady();
  const scores = await listAllMarkerRatingScores(markerId);

  return calculateAverageRating(scores);
};

const updateMarkerAverageRating = async (markerId: string) => {
  ensureMarkersReady();
  const averageRating = await getMarkerAverageRating(markerId);

  await getDatabasesClient().updateDocument(
    getDatabaseId(),
    getMarkersCollectionId(),
    markerId,
    {
      average_rating: averageRating,
    },
  );

  return averageRating;
};

export async function getUserMarkerRating(
  markerId: string,
  userId: string,
): Promise<MarkerRatingRecord | null> {
  const existingDocument = await findExistingMarkerRatingDocument(markerId, userId);

  return existingDocument ? mapRatingDocument(existingDocument) : null;
}

export async function listMarkerRatings(
  markerId: string,
  options?: { limit?: number },
): Promise<MarkerRatingRecord[]> {
  const response = await listMarkerRatingsPage(markerId, {
    pageSize: options?.limit,
    offset: 0,
  });

  return response.ratings;
}

export async function listMarkerRatingsPage(
  markerId: string,
  options?: { pageSize?: number; offset?: number },
): Promise<MarkerRatingPageResult> {
  ensureRatingsReady();

  const normalizedMarkerId = markerId.trim();

  if (!normalizedMarkerId) {
    throw new Error("Marker ID is required.");
  }

  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 10, 50));
  const offset = Math.max(0, options?.offset ?? 0);
  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getRatingsCollectionId(),
    [
      Query.equal("marker_id", normalizedMarkerId),
      Query.orderDesc("updated_at"),
      Query.limit(pageSize),
      Query.offset(offset),
    ],
  );

  const ratings = response.documents.map((document) =>
    mapRatingDocument(document as AppwriteRatingDocument),
  );

  return {
    ratings,
    total: response.total,
    offset,
    pageSize,
    hasMore: offset + ratings.length < response.total,
  };
}

export async function submitMarkerRating({
  markerId,
  userId,
  authorName = "",
  score,
  comment = "",
}: SubmitMarkerRatingInput): Promise<SubmitMarkerRatingResult> {
  ensureRatingsReady();
  ensureMarkersReady();

  const normalizedMarkerId = markerId.trim();
  const normalizedUserId = userId.trim();
  const normalizedAuthorName = normalizeOptionalAuthorName(authorName);
  const normalizedScore = normalizeRatingScore(score);
  const normalizedComment = normalizeOptionalComment(comment);

  if (!normalizedMarkerId) {
    throw new Error("Marker ID is required.");
  }

  if (!normalizedUserId) {
    throw new Error("User ID is required.");
  }

  const timestamp = new Date().toISOString();
  const existingDocument = await findExistingMarkerRatingDocument(
    normalizedMarkerId,
    normalizedUserId,
  );

  const ratingDocument = existingDocument
    ? await getDatabasesClient().updateDocument(
        getDatabaseId(),
        getRatingsCollectionId(),
        existingDocument.$id,
        {
          author_name: normalizedAuthorName || null,
          score: normalizedScore,
          comment: normalizedComment || null,
          updated_at: timestamp,
        },
      )
    : await getDatabasesClient().createDocument(
        getDatabaseId(),
        getRatingsCollectionId(),
        ID.unique(),
        {
          marker_id: normalizedMarkerId,
          user_id: normalizedUserId,
          author_name: normalizedAuthorName || null,
          score: normalizedScore,
          comment: normalizedComment || null,
          created_at: timestamp,
          updated_at: timestamp,
        },
        buildRatingDocumentPermissions(normalizedUserId),
      );

  let averageRating: number | null;

  try {
    averageRating = await updateMarkerAverageRating(normalizedMarkerId);
  } catch (error) {
    if (!isAuthorizationError(error)) {
      throw error;
    }

    if (__DEV__) {
      console.warn(
        "Marker average rating could not be persisted from the current client session. Falling back to computed rating value.",
        error,
      );
    }

    averageRating = await getMarkerAverageRating(normalizedMarkerId);
  }

  return {
    rating: mapRatingDocument(ratingDocument as AppwriteRatingDocument),
    averageRating,
  };
}

export const subscribeToMarkerChanges = (callback: () => void) => {
  if (!markersReady || Platform.OS !== "web") {
    return () => {};
  }

  try {
    return client.subscribe(
      [`databases.${getDatabaseId()}.collections.${getMarkersCollectionId()}.documents`],
      () => callback(),
    );
  } catch (error) {
    if (__DEV__) {
      console.warn("Marker realtime subscription unavailable.", error);
    }

    return () => {};
  }
};

export { formatMarkerLocation };
