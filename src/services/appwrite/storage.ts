import { AppwriteException } from "appwrite";

import {
  APPWRITE_RESPONSE_FORMAT,
  appwriteConfig,
  buildAppwriteUrl,
  ensureStorageReady,
  getAccountClient,
  getStorageClient,
  getStorageId,
} from "./client";
import { buildMarkerFilePermissions, buildProfilePhotoPermissions } from "./permissions";
import type { MarkerStatus, UploadableImage } from "./types";

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

export const uploadMarkerPhotos = async (
  photos: UploadableImage[],
  status: MarkerStatus,
  ownerId: string,
) =>
  Promise.all(
    photos.map((photo) =>
      createStorageFile(photo, buildMarkerFilePermissions(status, ownerId)),
    ),
  );

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
