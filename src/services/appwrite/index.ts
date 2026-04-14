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

type ExpoExtra = {
  APPWRITE_ENDPOINT?: string;
  APPWRITE_PROJECT_ID?: string;
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_MARKERS_COLLECTION_ID?: string;
  APPWRITE_STORAGE_ID?: string;
};

export type UploadableImage = {
  uri: string;
  name: string;
  type: string;
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
}

export interface UpdateMarkerInput {
  markerId: string;
  authorId: string;
  description: string;
  existingPhotoUrls?: string[];
  newPhotos?: UploadableImage[];
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
}

type AppwriteMarkerDocument = Models.Document & AppwriteMarkerFields;

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
  APPWRITE_STORAGE_ID,
} = expoExtra;

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: APPWRITE_DATABASE_ID,
  markersCollectionId: APPWRITE_MARKERS_COLLECTION_ID,
  storageId: APPWRITE_STORAGE_ID,
};

const client = new Client();
const baseConfig = {
  endpoint: appwriteConfig.endpoint,
  projectId: appwriteConfig.projectId,
};
const databaseConfig = {
  databaseId: appwriteConfig.databaseId,
  markersCollectionId: appwriteConfig.markersCollectionId,
};
const missingBaseConfig = Object.entries(baseConfig).filter(([, value]) => !value);
const missingDatabaseConfig = Object.entries(databaseConfig).filter(
  ([, value]) => !value,
);
const appwriteReady = missingBaseConfig.length === 0;
const databaseReady = appwriteReady && missingDatabaseConfig.length === 0;
const storageReady = appwriteReady && Boolean(appwriteConfig.storageId);

if (appwriteReady) {
  client.setEndpoint(appwriteConfig.endpoint!).setProject(appwriteConfig.projectId!);
} else if (__DEV__) {
  console.warn("Appwrite base config missing values:", missingBaseConfig);
}

const account = appwriteReady ? new Account(client) : null;
const databases = databaseReady ? new Databases(client) : null;
const storage = storageReady ? new Storage(client) : null;

const ensureReady = () => {
  if (!appwriteReady) {
    throw new Error(
      "Appwrite configuration is missing. Check your env variables in app.config.js.",
    );
  }
};

const ensureDatabaseReady = () => {
  ensureReady();

  if (!databaseReady) {
    throw new Error(
      "Appwrite markers database is not configured. Check APPWRITE_DATABASE_ID and APPWRITE_MARKERS_COLLECTION_ID.",
    );
  }
};

const ensureStorageReady = () => {
  ensureReady();

  if (!storageReady) {
    throw new Error("Appwrite storage is not configured.");
  }
};

const getAccountClient = () => {
  ensureReady();
  return account!;
};

const getDatabasesClient = () => {
  ensureDatabaseReady();
  return databases!;
};

const getStorageClient = () => {
  ensureStorageReady();
  return storage!;
};

const getDatabaseId = () => {
  ensureDatabaseReady();
  return appwriteConfig.databaseId!;
};

const getMarkersCollectionId = () => {
  ensureDatabaseReady();
  return appwriteConfig.markersCollectionId!;
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
    permissions.unshift(Permission.read(Role.guests()));
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
    permissions.unshift(Permission.read(Role.guests()));
  }

  return permissions;
};

const buildProfilePhotoPermissions = (ownerId: string) => [
  Permission.read(Role.users()),
  Permission.read(Role.guests()),
  Permission.update(Role.user(ownerId)),
  Permission.delete(Role.user(ownerId)),
];

const APPWRITE_RESPONSE_FORMAT = "1.8.0";

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

const normalizeUploadFileName = (value: string | undefined, fallback: string) => {
  const normalized = String(value || fallback)
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallback;
};

const buildUploadPayload = (file: UploadableImage) => ({
  uri: file.uri,
  name: normalizeUploadFileName(file.name, `upload-${Date.now()}.jpg`),
  type: file.type || "image/jpeg",
});

const createStorageFile = async (
  file: UploadableImage,
  permissions: string[],
): Promise<string> => {
  ensureStorageReady();
  try {
    const jwt = await getAccountClient().createJWT();
    const formData = new FormData();

    formData.append("fileId", "unique()");
    formData.append("file", buildUploadPayload(file) as unknown as Blob);
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
  ensureDatabaseReady();

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
  ensureDatabaseReady();

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
}: CreateMarkerInput): Promise<MarkerRecord> {
  ensureDatabaseReady();

  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();

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

  const document = await getDatabasesClient().createDocument(
    getDatabaseId(),
    getMarkersCollectionId(),
    ID.unique(),
    {
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
    },
    buildMarkerDocumentPermissions(status, authorId),
  );

  return mapMarkerDocument(document as AppwriteMarkerDocument);
}

export async function updateMarker({
  markerId,
  authorId,
  description,
  existingPhotoUrls = [],
  newPhotos = [],
}: UpdateMarkerInput): Promise<MarkerRecord> {
  ensureDatabaseReady();

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

  const document = await getDatabasesClient().updateDocument(
    getDatabaseId(),
    getMarkersCollectionId(),
    markerId,
    {
      description: normalizedDescription,
      status,
      photo_url: primaryPhotoUrl,
      photo_urls: mergedPhotoUrls,
    },
    buildMarkerDocumentPermissions(status, authorId),
  );

  return mapMarkerDocument(document as AppwriteMarkerDocument);
}

export const subscribeToMarkerChanges = (callback: () => void) => {
  if (!databaseReady || Platform.OS !== "web") {
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
