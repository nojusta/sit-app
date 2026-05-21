"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
loadDotEnv(path.join(repoRoot, ".env"));

const COLLECTION_NAME = "ratings";
const DATABASE_NAME = "db.sitapp";
const MAX_POLL_ATTEMPTS = 30;
const POLL_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 15000;

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  collectionId: process.env.APPWRITE_RATINGS_COLLECTION_ID,
};

const ratingAttributes = [
  {
    key: "marker_id",
    kind: "string",
    payload: { key: "marker_id", size: 64, required: true, array: false },
  },
  {
    key: "user_id",
    kind: "string",
    payload: { key: "user_id", size: 64, required: true, array: false },
  },
  {
    key: "author_name",
    kind: "string",
    payload: { key: "author_name", size: 120, required: false, array: false },
  },
  {
    key: "score",
    kind: "integer",
    payload: { key: "score", required: true, min: 1, max: 5, array: false },
  },
  {
    key: "comment",
    kind: "string",
    payload: { key: "comment", size: 1000, required: false, array: false },
  },
  {
    key: "created_at",
    kind: "datetime",
    payload: { key: "created_at", required: true, array: false },
  },
  {
    key: "updated_at",
    kind: "datetime",
    payload: { key: "updated_at", required: true, array: false },
  },
];

const ratingIndexes = [
  {
    key: "marker_user_unique",
    payload: {
      key: "marker_user_unique",
      type: "unique",
      attributes: ["marker_id", "user_id"],
      orders: ["ASC", "ASC"],
    },
  },
  {
    key: "marker_recent",
    payload: {
      key: "marker_recent",
      type: "key",
      attributes: ["marker_id", "updated_at"],
      orders: ["ASC", "DESC"],
    },
  },
  {
    key: "user_recent",
    payload: {
      key: "user_recent",
      type: "key",
      attributes: ["user_id", "updated_at"],
      orders: ["ASC", "DESC"],
    },
  },
];

async function main() {
  ensureConfig();

  const databaseId = config.databaseId || (await resolveDatabaseId());
  const collectionId = config.collectionId || (await ensureCollection(databaseId));

  console.log(`Using Appwrite database ${databaseId} and collection ${collectionId}.`);
  console.log("Ensuring rating attributes...");
  await ensureAttributes(databaseId, collectionId);
  console.log("Waiting for rating attributes...");
  await waitForAttributes(
    databaseId,
    collectionId,
    ratingAttributes.map((attribute) => attribute.key),
  );
  console.log("Ensuring rating indexes...");
  await ensureIndexes(databaseId, collectionId);

  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseId,
        collectionId,
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

async function ensureCollection(databaseId) {
  const existingCollection = await findCollectionByName(databaseId, COLLECTION_NAME);

  if (existingCollection) {
    return existingCollection.$id;
  }

  const createdCollection = await appwriteFetch(
    "POST",
    `/databases/${encodeURIComponent(databaseId)}/collections`,
    {
      body: {
        collectionId: "unique()",
        name: COLLECTION_NAME,
        enabled: true,
        documentSecurity: true,
        permissions: ['read("any")', 'read("users")', 'create("users")'],
      },
    },
  );

  return createdCollection.$id;
}

async function findCollectionByName(databaseId, collectionName) {
  const response = await appwriteFetch(
    "GET",
    `/databases/${encodeURIComponent(databaseId)}/collections`,
  );

  return (
    (response.collections || []).find((entry) => entry.name === collectionName) || null
  );
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

async function ensureAttributes(databaseId, collectionId) {
  const collection = await getCollection(databaseId, collectionId);
  const existingKeys = new Set(
    (collection.attributes || []).map((attribute) => attribute.key),
  );

  for (const attribute of ratingAttributes) {
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
    `Timed out waiting for rating attributes to become available: ${keys.join(", ")}`,
  );
}

async function ensureIndexes(databaseId, collectionId) {
  const collection = await getCollection(databaseId, collectionId);
  const existingKeys = new Set((collection.indexes || []).map((index) => index.key));

  for (const index of ratingIndexes) {
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

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const file = fs.readFileSync(filePath, "utf8");
  const lines = file.split(/\r?\n/u);

  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^"|"$/g, "");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
