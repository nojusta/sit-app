import { ID, Query, type Models } from "appwrite";

import {
  ensureMarkersReady,
  ensureRatingsReady,
  getDatabaseId,
  getDatabasesClient,
  getMarkersCollectionId,
  getRatingsCollectionId,
} from "./client";
import { isAuthorizationError } from "./errors";
import { buildRatingDocumentPermissions } from "./permissions";
import type {
  MarkerRatingPageResult,
  MarkerRatingRecord,
  SubmitMarkerRatingInput,
  SubmitMarkerRatingResult,
} from "./types";

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

const RATING_PAGE_SIZE = 100;

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
