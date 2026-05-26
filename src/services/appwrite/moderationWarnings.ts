import { ID, Query, type Models } from "appwrite";

import {
  ensureModerationWarningsReady,
  getDatabaseId,
  getDatabasesClient,
  getModerationWarningsCollectionId,
  moderationWarningsReady,
} from "./client";
import { buildModerationWarningDocumentPermissions } from "./permissions";

export const MAX_MODERATION_WARNINGS = 3;

export const MARKER_CREATION_BLOCKED_BY_WARNINGS_MESSAGE = `You can no longer submit new sitting places because your account has ${MAX_MODERATION_WARNINGS} moderation warnings.`;

interface AppwriteModerationWarningFields {
  user_id: string;
  marker_id: string;
  reason?: string | null;
  reviewed_at?: string | null;
  created_by?: string | null;
}

export type AppwriteModerationWarningDocument = Models.Document &
  AppwriteModerationWarningFields;

export interface CreateModerationWarningInput {
  userId: string;
  markerId: string;
  reason?: string | null;
  reviewedAt?: string | null;
  createdBy?: string | null;
}

export interface ModerationWarningRecord {
  id: string;
  userId: string;
  markerId: string;
  reason: string | null;
  reviewedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const mapModerationWarningDocument = (
  document: AppwriteModerationWarningDocument,
): ModerationWarningRecord => ({
  id: document.$id,
  userId: document.user_id,
  markerId: document.marker_id,
  reason: document.reason ?? null,
  reviewedAt: document.reviewed_at ?? null,
  createdBy: document.created_by ?? null,
  createdAt: document.$createdAt,
  updatedAt: document.$updatedAt,
});

const normalizeRequiredId = (value: string, label: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;
};

export async function getUserModerationWarningCount(userId: string): Promise<number> {
  ensureModerationWarningsReady();

  const normalizedUserId = normalizeRequiredId(userId, "User id");
  const response = await getDatabasesClient().listDocuments(
    getDatabaseId(),
    getModerationWarningsCollectionId(),
    [Query.equal("user_id", normalizedUserId), Query.limit(MAX_MODERATION_WARNINGS)],
  );

  return response.total;
}

export async function hasReachedModerationWarningLimit(userId: string): Promise<boolean> {
  const warningCount = await getUserModerationWarningCount(userId);

  return warningCount >= MAX_MODERATION_WARNINGS;
}

export async function assertCanSubmitByModerationWarnings(userId: string) {
  if (!moderationWarningsReady) {
    if (__DEV__) {
      console.warn(
        "Skipping moderation warning gate because APPWRITE_MODERATION_WARNINGS_ID is not configured.",
      );
    }

    return;
  }

  if (await hasReachedModerationWarningLimit(userId)) {
    throw new Error(MARKER_CREATION_BLOCKED_BY_WARNINGS_MESSAGE);
  }
}

export const ensureCanRecordModerationWarning = () => {
  ensureModerationWarningsReady();
};

export async function createModerationWarning({
  userId,
  markerId,
  reason = null,
  reviewedAt = null,
  createdBy = null,
}: CreateModerationWarningInput): Promise<ModerationWarningRecord> {
  ensureModerationWarningsReady();

  const normalizedUserId = normalizeRequiredId(userId, "User id");
  const normalizedMarkerId = normalizeRequiredId(markerId, "Marker id");
  const normalizedCreatedBy =
    typeof createdBy === "string" && createdBy.trim().length > 0
      ? createdBy.trim()
      : null;
  const document = await getDatabasesClient().createDocument(
    getDatabaseId(),
    getModerationWarningsCollectionId(),
    ID.unique(),
    {
      user_id: normalizedUserId,
      marker_id: normalizedMarkerId,
      reason: reason?.trim() || null,
      reviewed_at: reviewedAt ?? new Date().toISOString(),
      created_by: normalizedCreatedBy,
    },
    buildModerationWarningDocumentPermissions(normalizedUserId, normalizedCreatedBy),
  );

  return mapModerationWarningDocument(document as AppwriteModerationWarningDocument);
}
