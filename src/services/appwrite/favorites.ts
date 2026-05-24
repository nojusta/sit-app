import { ID, Query, type Models } from "appwrite";

import {
  ensureFavoritesReady,
  getDatabaseId,
  getDatabasesClient,
  getFavoritesCollectionId,
} from "./client";
import { buildFavoriteDocumentPermissions } from "./permissions";
import type { MarkerFavoriteRecord, ToggleMarkerFavoriteResult } from "./types";

interface AppwriteFavoriteFields {
  marker_id: string;
  user_id: string;
  created_at: string;
}

type AppwriteFavoriteDocument = Models.Document & AppwriteFavoriteFields;

const FAVORITES_PAGE_SIZE = 100;

const normalizeRequiredId = (value: string, label: string) => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
};

const mapFavoriteDocument = (
  document: AppwriteFavoriteDocument,
): MarkerFavoriteRecord => ({
  id: document.$id,
  markerId: document.marker_id,
  userId: document.user_id,
  createdAt: document.created_at,
});

const findExistingFavoriteDocument = async (
  markerId: string,
  userId: string,
): Promise<AppwriteFavoriteDocument | null> => {
  ensureFavoritesReady();

  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getFavoritesCollectionId(),
    [Query.equal("marker_id", markerId), Query.equal("user_id", userId), Query.limit(1)],
  );

  const [document] = response.documents;
  return document ? (document as AppwriteFavoriteDocument) : null;
};

export async function listUserFavoriteMarkerIds(userId: string): Promise<string[]> {
  ensureFavoritesReady();

  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const markerIds: string[] = [];
  let offset = 0;
  let total = 0;

  do {
    const response = await getDatabasesClient().listDocuments(
      getDatabaseId(),
      getFavoritesCollectionId(),
      [
        Query.equal("user_id", normalizedUserId),
        Query.orderDesc("created_at"),
        Query.limit(FAVORITES_PAGE_SIZE),
        Query.offset(offset),
      ],
    );

    total = response.total;
    response.documents.forEach((document) => {
      const markerId = (document as AppwriteFavoriteDocument).marker_id;

      if (typeof markerId === "string" && markerId.length > 0) {
        markerIds.push(markerId);
      }
    });
    offset += response.documents.length;
  } while (offset < total);

  return [...new Set(markerIds)];
}

export async function addMarkerFavorite(
  markerId: string,
  userId: string,
): Promise<MarkerFavoriteRecord> {
  ensureFavoritesReady();

  const normalizedMarkerId = normalizeRequiredId(markerId, "Marker ID");
  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const existingDocument = await findExistingFavoriteDocument(
    normalizedMarkerId,
    normalizedUserId,
  );

  if (existingDocument) {
    return mapFavoriteDocument(existingDocument);
  }

  const document = await getDatabasesClient().createDocument(
    getDatabaseId(),
    getFavoritesCollectionId(),
    ID.unique(),
    {
      marker_id: normalizedMarkerId,
      user_id: normalizedUserId,
      created_at: new Date().toISOString(),
    },
    buildFavoriteDocumentPermissions(normalizedUserId),
  );

  return mapFavoriteDocument(document as AppwriteFavoriteDocument);
}

export async function removeMarkerFavorite(
  markerId: string,
  userId: string,
): Promise<void> {
  ensureFavoritesReady();

  const normalizedMarkerId = normalizeRequiredId(markerId, "Marker ID");
  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const existingDocument = await findExistingFavoriteDocument(
    normalizedMarkerId,
    normalizedUserId,
  );

  if (!existingDocument) {
    return;
  }

  await getDatabasesClient().deleteDocument(
    getDatabaseId(),
    getFavoritesCollectionId(),
    existingDocument.$id,
  );
}

export async function toggleMarkerFavorite(
  markerId: string,
  userId: string,
): Promise<ToggleMarkerFavoriteResult> {
  ensureFavoritesReady();

  const normalizedMarkerId = normalizeRequiredId(markerId, "Marker ID");
  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const existingDocument = await findExistingFavoriteDocument(
    normalizedMarkerId,
    normalizedUserId,
  );

  if (existingDocument) {
    await getDatabasesClient().deleteDocument(
      getDatabaseId(),
      getFavoritesCollectionId(),
      existingDocument.$id,
    );

    return {
      isFavorite: false,
      favorite: null,
    };
  }

  const document = await getDatabasesClient().createDocument(
    getDatabaseId(),
    getFavoritesCollectionId(),
    ID.unique(),
    {
      marker_id: normalizedMarkerId,
      user_id: normalizedUserId,
      created_at: new Date().toISOString(),
    },
    buildFavoriteDocumentPermissions(normalizedUserId),
  );

  return {
    isFavorite: true,
    favorite: mapFavoriteDocument(document as AppwriteFavoriteDocument),
  };
}
