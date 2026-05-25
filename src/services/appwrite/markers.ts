import { ID, Query, type Models } from "appwrite";
import { Platform } from "react-native";

import {
  client,
  ensureMarkersReady,
  getDatabaseId,
  getDatabasesClient,
  getMarkersCollectionId,
  markersReady,
} from "./client";
import {
  isMissingMarkerAttributesSchemaError,
  toMarkerAttributesSchemaError,
} from "./errors";
import {
  assertCanSubmitByModerationWarnings,
  createModerationWarning,
} from "./moderationWarnings";
import { buildMarkerDocumentPermissions } from "./permissions";
import { uploadMarkerPhotos } from "./storage";
import {
  MARKER_TAG_IDS,
  MAX_DAILY_MARKER_UPLOADS,
  MAX_MARKER_ATTRIBUTES,
  type CreateMarkerInput,
  type MarkerCoordinate,
  type MarkerPageResult,
  type MarkerRecord,
  type RejectMarkerInput,
  type MarkerStatus,
  type MarkerTagId,
  type UpdateMarkerInput,
} from "./types";

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

export type AppwriteMarkerDocument = Models.Document & AppwriteMarkerFields;

export const formatMarkerLocation = ({ latitude, longitude }: MarkerCoordinate) =>
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

const getDailyUploadWindowStart = () =>
  new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export const MARKER_DAILY_UPLOAD_LIMIT_MESSAGE = `You have reached the upload limit of ${MAX_DAILY_MARKER_UPLOADS} sitting places in the last 24 hours.`;

const normalizeRequiredId = (value: string, label: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;
};

export const mapMarkerDocument = (document: AppwriteMarkerDocument): MarkerRecord => ({
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

export async function getUserMarkerUploadCountInLast24Hours(
  authorId: string,
): Promise<number> {
  ensureMarkersReady();

  const normalizedAuthorId = normalizeRequiredId(authorId, "Marker author id");
  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getMarkersCollectionId(),
    [
      Query.equal("author_id", normalizedAuthorId),
      Query.greaterThanEqual("created_at", getDailyUploadWindowStart()),
      Query.limit(MAX_DAILY_MARKER_UPLOADS),
    ],
  );

  return response.total;
}

export async function assertCanSubmitByDailyUploadLimit(authorId: string) {
  const uploadCount = await getUserMarkerUploadCountInLast24Hours(authorId);

  if (uploadCount >= MAX_DAILY_MARKER_UPLOADS) {
    throw new Error(MARKER_DAILY_UPLOAD_LIMIT_MESSAGE);
  }
}

export async function assertCanCreateMarker(authorId: string) {
  await assertCanSubmitByModerationWarnings(authorId);
  await assertCanSubmitByDailyUploadLimit(authorId);
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

  await assertCanCreateMarker(authorId);

  const status: MarkerStatus = "pending_approval";
  const createdAt = new Date().toISOString();
  const [photoUrl = null] = photo
    ? await uploadMarkerPhotos([photo], status, authorId)
    : [];
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

export async function rejectMarker({
  markerId,
  authorId,
  reviewerId = null,
  reason = null,
}: RejectMarkerInput): Promise<MarkerRecord> {
  ensureMarkersReady();

  const normalizedMarkerId = normalizeRequiredId(markerId, "Marker id");
  const normalizedAuthorId = normalizeRequiredId(authorId, "Marker author id");

  const reviewedAt = new Date().toISOString();
  const status: MarkerStatus = "rejected";
  const document = await getDatabasesClient().updateDocument(
    getDatabaseId(),
    getMarkersCollectionId(),
    normalizedMarkerId,
    { status },
    buildMarkerDocumentPermissions(status, normalizedAuthorId),
  );

  await createModerationWarning({
    userId: normalizedAuthorId,
    markerId: normalizedMarkerId,
    reason,
    reviewedAt,
    createdBy: reviewerId,
  });

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
