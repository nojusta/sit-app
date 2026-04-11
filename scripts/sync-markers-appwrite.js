"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
loadDotEnv(path.join(repoRoot, ".env"));

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  collectionId: process.env.APPWRITE_MARKERS_COLLECTION_ID,
  bucketId: process.env.APPWRITE_STORAGE_ID,
  adminEmail: process.env.ADMIN_EMAIL,
};

const COLLECTION_NAME = "markers";
const DATABASE_NAME = "db.sitapp";
const PRIMARY_SEED_PATH = path.join(repoRoot, "new-markers.json");
const FALLBACK_SEED_PATH = path.join(repoRoot, "test-run-unique.json");
const SEED_PATH = fs.existsSync(PRIMARY_SEED_PATH)
  ? PRIMARY_SEED_PATH
  : FALLBACK_SEED_PATH;
const PHOTOS_DIR = path.join(repoRoot, "photos-for-markers");
const ADMIN_PROFILE_IMAGE_PATH = path.join(repoRoot, "assets/images/profile.png");
const MAX_POLL_ATTEMPTS = 30;
const POLL_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 15000;
const LEGACY_MARKER_ATTRIBUTE_KEYS = [
  "markerName",
  "markerInfo",
  "markerPhoto",
  "createdAt",
  "timestamp",
];

const markerAttributes = [
  {
    key: "title",
    kind: "string",
    payload: { key: "title", size: 160, required: true, array: false },
  },
  {
    key: "description",
    kind: "string",
    payload: { key: "description", size: 4000, required: true, array: false },
  },
  {
    key: "location",
    kind: "string",
    payload: { key: "location", size: 64, required: true, array: false },
  },
  {
    key: "status",
    kind: "enum",
    payload: {
      key: "status",
      elements: ["pending_approval", "approved", "rejected"],
      required: true,
      array: false,
    },
  },
  {
    key: "author_id",
    kind: "string",
    payload: { key: "author_id", size: 64, required: true, array: false },
  },
  {
    key: "created_at",
    kind: "datetime",
    payload: { key: "created_at", required: true, array: false },
  },
  {
    key: "photo_url",
    kind: "url",
    payload: { key: "photo_url", required: false, array: false },
  },
  {
    key: "photo_urls",
    kind: "string",
    payload: { key: "photo_urls", size: 2048, required: false, array: true },
  },
  {
    key: "latitude",
    kind: "float",
    payload: { key: "latitude", required: true, min: -90, max: 90, array: false },
  },
  {
    key: "longitude",
    kind: "float",
    payload: { key: "longitude", required: true, min: -180, max: 180, array: false },
  },
];

const markerIndexes = [
  {
    key: "location_unique",
    payload: {
      key: "location_unique",
      type: "unique",
      attributes: ["location"],
      orders: ["ASC"],
    },
  },
  {
    key: "approved_browse",
    payload: {
      key: "approved_browse",
      type: "key",
      attributes: ["status", "created_at"],
      orders: ["ASC", "DESC"],
    },
  },
  {
    key: "author_profile",
    payload: {
      key: "author_profile",
      type: "key",
      attributes: ["author_id", "created_at"],
      orders: ["ASC", "DESC"],
    },
  },
];

async function main() {
  ensureConfig();

  const databaseId = config.databaseId || (await resolveDatabaseId());
  const collectionId = config.collectionId || (await resolveCollectionId(databaseId));

  console.log(`Using Appwrite database ${databaseId} and collection ${collectionId}.`);
  console.log(`Using seed file ${path.relative(repoRoot, SEED_PATH)}.`);

  const collectionBefore = await getCollection(databaseId, collectionId);
  console.log("Updating collection security...");
  await updateCollectionSecurity(databaseId, collectionBefore);
  console.log("Updating storage bucket security...");
  await updateBucketSecurity();
  console.log("Ensuring marker attributes...");
  await ensureAttributes(databaseId, collectionId);
  console.log("Waiting for marker attributes...");
  await waitForAttributes(
    databaseId,
    collectionId,
    markerAttributes.map((attribute) => attribute.key),
  );
  console.log("Ensuring marker indexes...");
  await ensureIndexes(databaseId, collectionId);
  console.log("Removing legacy duplicate marker attributes...");
  await cleanupLegacyAttributes(databaseId, collectionId);

  console.log("Resolving admin seed owner...");
  const adminUser = await resolveAdminUser();
  console.log("Ensuring admin avatar...");
  await ensureAdminAvatar(adminUser);
  console.log("Loading seed data and matching marker photos...");
  const photoMatches = loadPhotoMatches();
  const seedItems = loadSeedItems();
  const uploadedPhotosByTitle = new Map();

  let created = 0;
  let skipped = 0;
  let attachedPhotos = 0;

  for (const [index, item] of seedItems.entries()) {
    try {
      const uploadedPhotos = await resolveUploadedPhotosForTitle({
        adminUserId: adminUser.$id,
        title: item.title,
        photoMatches,
        cache: uploadedPhotosByTitle,
      });

      attachedPhotos += uploadedPhotos.length;

      await createSeedDocument({
        databaseId,
        collectionId,
        adminUserId: adminUser.$id,
        item,
        photoUrls: uploadedPhotos,
        index,
      });
      created += 1;
    } catch (error) {
      if (isDuplicateLocationError(error)) {
        skipped += 1;
        continue;
      }

      throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseId,
        collectionId,
        bucketId: config.bucketId,
        adminUserId: adminUser.$id,
        seeded: {
          total: seedItems.length,
          created,
          skipped,
          photoAttachments: attachedPhotos,
        },
      },
      null,
      2,
    ),
  );
}

async function resolveDatabaseId() {
  const response = await appwriteFetch("GET", "/databases");
  const database = (response.databases || []).find(
    (entry) => entry.name === DATABASE_NAME,
  );

  if (!database) {
    throw new Error(
      `Could not find the ${DATABASE_NAME} database. Set APPWRITE_DATABASE_ID in .env if the project uses a different database.`,
    );
  }

  return database.$id;
}

async function resolveCollectionId(databaseId) {
  const response = await appwriteFetch(
    "GET",
    `/databases/${encodeURIComponent(databaseId)}/collections`,
  );
  const collection = (response.collections || []).find(
    (entry) => entry.name === COLLECTION_NAME,
  );

  if (!collection) {
    throw new Error(
      `Could not find the ${COLLECTION_NAME} collection. Set APPWRITE_MARKERS_COLLECTION_ID in .env if the project uses a different collection.`,
    );
  }

  return collection.$id;
}

async function getCollection(databaseId, collectionId) {
  const response = await appwriteFetch(
    "GET",
    `/databases/${encodeURIComponent(databaseId)}/collections`,
  );
  const collection = (response.collections || []).find(
    (entry) => entry.$id === collectionId,
  );

  if (!collection) {
    throw new Error(
      `Could not resolve collection ${collectionId} in database ${databaseId}.`,
    );
  }

  return collection;
}

async function updateCollectionSecurity(databaseId, collection) {
  await appwriteFetch(
    "PUT",
    `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collection.$id)}`,
    {
      body: {
        name: collection.name,
        enabled: collection.enabled,
        documentSecurity: true,
        permissions: ['read("guests")', 'read("users")', 'create("users")'],
      },
    },
  );
}

async function updateBucketSecurity() {
  const list = await appwriteFetch("GET", "/storage/buckets");
  const bucket = (list.buckets || []).find((entry) => entry.$id === config.bucketId);

  if (!bucket) {
    throw new Error(`Could not resolve storage bucket ${config.bucketId}.`);
  }

  await appwriteFetch("PUT", `/storage/buckets/${encodeURIComponent(config.bucketId)}`, {
    body: {
      name: bucket.name,
      enabled: bucket.enabled,
      maximumFileSize: bucket.maximumFileSize,
      allowedFileExtensions: bucket.allowedFileExtensions,
      compression: bucket.compression,
      encryption: bucket.encryption,
      antivirus: bucket.antivirus,
      fileSecurity: true,
      permissions: [
        'create("users")',
        'read("guests")',
        'read("users")',
        'update("users")',
        'delete("users")',
      ],
    },
  });
}

async function ensureAttributes(databaseId, collectionId) {
  const collection = await getCollection(databaseId, collectionId);
  const existingKeys = new Set(
    (collection.attributes || []).map((attribute) => attribute.key),
  );

  for (const attribute of markerAttributes) {
    if (existingKeys.has(attribute.key)) {
      continue;
    }

    await appwriteFetch(
      "POST",
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(
        collectionId,
      )}/attributes/${attribute.kind}`,
      {
        body: attribute.payload,
      },
    );
  }
}

async function waitForAttributes(databaseId, collectionId, keys) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const collection = await getCollection(databaseId, collectionId);
    const statuses = new Map(
      (collection.attributes || []).map((attribute) => [attribute.key, attribute.status]),
    );

    if (keys.every((key) => statuses.get(key) === "available")) {
      return;
    }

    await delay(POLL_DELAY_MS);
  }

  throw new Error(
    `Timed out waiting for marker attributes to become available: ${keys.join(", ")}`,
  );
}

async function ensureIndexes(databaseId, collectionId) {
  const collection = await getCollection(databaseId, collectionId);
  const existingKeys = new Set((collection.indexes || []).map((index) => index.key));

  for (const index of markerIndexes) {
    if (existingKeys.has(index.key)) {
      continue;
    }

    await appwriteFetch(
      "POST",
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(
        collectionId,
      )}/indexes`,
      {
        body: index.payload,
      },
    );
  }
}

async function cleanupLegacyAttributes(databaseId, collectionId) {
  const collection = await getCollection(databaseId, collectionId);
  const existingKeys = new Set(
    (collection.attributes || []).map((attribute) => attribute.key),
  );
  const keysToDelete = LEGACY_MARKER_ATTRIBUTE_KEYS.filter((key) =>
    existingKeys.has(key),
  );

  for (const key of keysToDelete) {
    await appwriteFetch(
      "DELETE",
      `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(
        collectionId,
      )}/attributes/${encodeURIComponent(key)}`,
    );
  }

  if (keysToDelete.length > 0) {
    await waitForDeletedAttributes(databaseId, collectionId, keysToDelete);
  }
}

async function waitForDeletedAttributes(databaseId, collectionId, keys) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const collection = await getCollection(databaseId, collectionId);
    const existingKeys = new Set(
      (collection.attributes || []).map((attribute) => attribute.key),
    );

    if (keys.every((key) => !existingKeys.has(key))) {
      return;
    }

    await delay(POLL_DELAY_MS);
  }

  throw new Error(
    `Timed out waiting for legacy attributes to be deleted: ${keys.join(", ")}`,
  );
}

async function resolveAdminUser() {
  const response = await appwriteFetch("GET", "/users");
  const adminUser = (response.users || []).find(
    (user) => user.email === config.adminEmail,
  );

  if (!adminUser) {
    throw new Error(
      `Could not find the admin user for ${config.adminEmail}. Create that account before seeding markers.`,
    );
  }

  return adminUser;
}

async function ensureAdminAvatar(adminUser) {
  if (adminUser?.prefs?.avatar || !fs.existsSync(ADMIN_PROFILE_IMAGE_PATH)) {
    return;
  }

  const uploadedFile = await uploadMarkerPhoto(ADMIN_PROFILE_IMAGE_PATH, adminUser.$id);
  const avatarUrl = buildStorageViewUrl(uploadedFile.$id);

  await appwriteFetch("PATCH", `/users/${encodeURIComponent(adminUser.$id)}/prefs`, {
    body: {
      prefs: {
        ...(adminUser.prefs || {}),
        avatar: avatarUrl,
      },
    },
  });
}

function loadSeedItems() {
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  const entries = JSON.parse(raw);
  const uniqueItems = new Map();

  for (const entry of entries) {
    const location = formatLocation(entry.latitude, entry.longitude);

    if (!uniqueItems.has(location)) {
      uniqueItems.set(location, entry);
    }
  }

  return Array.from(uniqueItems.values());
}

function loadPhotoMatches() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    return new Map();
  }

  const files = fs
    .readdirSync(PHOTOS_DIR)
    .filter((fileName) => /\.(png|jpe?g|webp)$/iu.test(fileName))
    .sort((left, right) => left.localeCompare(right));
  const photoMatches = new Map();

  for (const fileName of files) {
    const normalizedTitle = normalizeTitleKey(fileName);
    const absolutePath = path.join(PHOTOS_DIR, fileName);
    const existing = photoMatches.get(normalizedTitle) || [];
    existing.push(absolutePath);
    photoMatches.set(normalizedTitle, existing);
  }

  return photoMatches;
}

async function resolveUploadedPhotosForTitle({
  adminUserId,
  title,
  photoMatches,
  cache,
}) {
  const normalizedTitle = normalizeTitleKey(title);

  if (cache.has(normalizedTitle)) {
    return cache.get(normalizedTitle);
  }

  const matchingFiles = photoMatches.get(normalizedTitle) || [];

  if (matchingFiles.length === 0) {
    cache.set(normalizedTitle, []);
    return [];
  }

  const uploadedUrls = [];

  for (const photoPath of matchingFiles) {
    const uploadedFile = await uploadMarkerPhoto(photoPath, adminUserId);
    uploadedUrls.push(buildStorageViewUrl(uploadedFile.$id));
  }

  cache.set(normalizedTitle, uploadedUrls);
  return uploadedUrls;
}

async function uploadMarkerPhoto(photoPath, adminUserId) {
  const mimeType = getMimeType(photoPath);
  const fileName = path.basename(photoPath);
  const fileContent = await fs.promises.readFile(photoPath);
  const formData = new FormData();

  formData.append("fileId", "unique()");
  formData.append(
    "file",
    new File([new Blob([fileContent], { type: mimeType })], fileName, {
      type: mimeType,
      lastModified: Date.now(),
    }),
  );
  formData.append("permissions[]", 'read("guests")');
  formData.append("permissions[]", 'read("users")');
  formData.append("permissions[]", `update("user:${adminUserId}")`);
  formData.append("permissions[]", `delete("user:${adminUserId}")`);

  return appwriteFetch(
    "POST",
    `/storage/buckets/${encodeURIComponent(config.bucketId)}/files`,
    {
      body: formData,
      contentType: "multipart/form-data",
    },
  );
}

async function createSeedDocument({
  databaseId,
  collectionId,
  adminUserId,
  item,
  photoUrls,
  index,
}) {
  const title = String(item.title || "").trim();
  const description = String(item.description || "").trim();
  const createdAt = new Date(Date.now() - index * 60000).toISOString();
  const location = formatLocation(item.latitude, item.longitude);
  const primaryPhotoUrl = photoUrls[0] || null;

  return appwriteFetch(
    "POST",
    `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(
      collectionId,
    )}/documents`,
    {
      body: {
        documentId: "unique()",
        data: {
          title,
          description,
          location,
          status: "approved",
          author_id: adminUserId,
          created_at: createdAt,
          photo_url: primaryPhotoUrl,
          photo_urls: photoUrls,
          latitude: item.latitude,
          longitude: item.longitude,
        },
        permissions: [
          'read("guests")',
          'read("users")',
          `update("user:${adminUserId}")`,
          `delete("user:${adminUserId}")`,
        ],
      },
    },
  );
}

function buildStorageViewUrl(fileId) {
  const endpoint = ensureTrailingSlash(config.endpoint);
  const url = new URL(
    `storage/buckets/${encodeURIComponent(config.bucketId)}/files/${encodeURIComponent(fileId)}/view`,
    endpoint,
  );
  url.searchParams.set("project", config.projectId);
  return url.toString();
}

function normalizeTitleKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\.[^.]+$/u, "")
    .replace(/\s+\d+$/u, "")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-zA-Z0-9]+/gu, " ")
    .trim()
    .toLowerCase();
}

function formatLocation(latitude, longitude) {
  return `${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`;
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function isDuplicateLocationError(error) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("already exists") || message.includes("duplicate");
}

async function appwriteFetch(method, resourcePath, options = {}) {
  const url = new URL(
    resourcePath.replace(/^\/+/, ""),
    ensureTrailingSlash(config.endpoint),
  );
  const headers = {
    Accept: "application/json",
    "X-Appwrite-Project": config.projectId,
    "X-Appwrite-Key": config.apiKey,
    "X-Appwrite-Response-Format": "1.8.0",
  };

  if (options.contentType === "multipart/form-data") {
    // Let fetch set the boundary for multipart uploads.
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body:
      options.body === undefined
        ? undefined
        : options.contentType === "multipart/form-data"
          ? options.body
          : JSON.stringify(options.body),
  });
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new Error(
      `${
        payload && typeof payload.message === "string"
          ? payload.message
          : `Appwrite request failed with status ${response.status}`
      }\n${JSON.stringify({ method, path: resourcePath, response: payload }, null, 2)}`,
    );
  }

  return payload;
}

function ensureConfig() {
  const missing = [
    !config.endpoint ? "APPWRITE_ENDPOINT" : null,
    !config.projectId ? "APPWRITE_PROJECT_ID" : null,
    !config.apiKey ? "APPWRITE_API_KEY" : null,
    !config.bucketId ? "APPWRITE_STORAGE_ID" : null,
    !config.adminEmail ? "ADMIN_EMAIL" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required .env values: ${missing.join(", ")}`);
  }
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    value = value.replace(/^(['"])(.*)\1$/u, "$2");
    process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
