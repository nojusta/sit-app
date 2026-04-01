"use strict";

const fs = require("fs");
const path = require("path");
const { ID } = require("appwrite");

const SERVER_NAME = "appwrite-local";
const SERVER_VERSION = "0.1.0";
const SUPPORTED_PROTOCOL_VERSION = "2024-11-05";
const repoRoot = path.resolve(__dirname, "..");

loadDotEnv(path.join(repoRoot, ".env"));

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  responseFormat: process.env.APPWRITE_API_RESPONSE_FORMAT || "1.8.0",
  allowDelete: process.env.APPWRITE_MCP_ALLOW_DELETE === "true",
};

const toolDefinitions = [
  {
    name: "get_config_status",
    description:
      "Show the local Appwrite MCP configuration state without making a network call.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_databases",
    description: "List Appwrite databases in the configured project.",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Optional Appwrite query strings.",
        },
        search: {
          type: "string",
          description: "Optional search term.",
        },
        total: {
          type: "boolean",
          description: "Whether to request an accurate total count.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_database",
    description: "Create a database in Appwrite.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Custom database ID. Defaults to a generated unique ID.",
        },
        name: {
          type: "string",
          description: "Database name.",
        },
        payload: {
          type: "object",
          description: "Additional fields to forward to Appwrite, such as enabled.",
          additionalProperties: true,
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "list_collections",
    description: "List collections for a database.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Database ID.",
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Optional Appwrite query strings.",
        },
        search: {
          type: "string",
          description: "Optional search term.",
        },
        total: {
          type: "boolean",
          description: "Whether to request an accurate total count.",
        },
      },
      required: ["databaseId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_collection",
    description: "Create a collection inside a database.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Database ID.",
        },
        collectionId: {
          type: "string",
          description: "Custom collection ID. Defaults to a generated unique ID.",
        },
        name: {
          type: "string",
          description: "Collection name.",
        },
        payload: {
          type: "object",
          description:
            "Additional fields to forward to Appwrite, such as permissions, documentSecurity, and enabled.",
          additionalProperties: true,
        },
      },
      required: ["databaseId", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "create_attribute",
    description:
      "Create an attribute on a collection. The payload object is sent directly to the chosen Appwrite attribute endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Database ID.",
        },
        collectionId: {
          type: "string",
          description: "Collection ID.",
        },
        kind: {
          type: "string",
          enum: [
            "string",
            "email",
            "enum",
            "integer",
            "float",
            "boolean",
            "datetime",
            "url",
            "ip",
            "relationship",
          ],
          description: "Appwrite attribute type endpoint to use.",
        },
        payload: {
          type: "object",
          description:
            "Attribute request body. Include Appwrite fields like key, size, required, default, array, min, max, or elements.",
          additionalProperties: true,
        },
      },
      required: ["databaseId", "collectionId", "kind", "payload"],
      additionalProperties: false,
    },
  },
  {
    name: "create_index",
    description: "Create an index on a collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Database ID.",
        },
        collectionId: {
          type: "string",
          description: "Collection ID.",
        },
        payload: {
          type: "object",
          description:
            "Index request body. Include Appwrite fields like key, type, attributes, and orders.",
          additionalProperties: true,
        },
      },
      required: ["databaseId", "collectionId", "payload"],
      additionalProperties: false,
    },
  },
  {
    name: "list_documents",
    description: "List documents in a collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Database ID.",
        },
        collectionId: {
          type: "string",
          description: "Collection ID.",
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Optional Appwrite query strings.",
        },
      },
      required: ["databaseId", "collectionId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_document",
    description: "Create a document in a collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Database ID.",
        },
        collectionId: {
          type: "string",
          description: "Collection ID.",
        },
        data: {
          type: "object",
          description: "Document payload.",
          additionalProperties: true,
        },
        documentId: {
          type: "string",
          description: "Document ID. Defaults to a generated unique ID.",
        },
        permissions: {
          type: "array",
          items: { type: "string" },
          description: "Optional Appwrite permission strings.",
        },
      },
      required: ["databaseId", "collectionId", "data"],
      additionalProperties: false,
    },
  },
  {
    name: "update_document",
    description: "Update a document in a collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: {
          type: "string",
          description: "Database ID.",
        },
        collectionId: {
          type: "string",
          description: "Collection ID.",
        },
        documentId: {
          type: "string",
          description: "Document ID.",
        },
        data: {
          type: "object",
          description: "Partial document payload.",
          additionalProperties: true,
        },
        permissions: {
          type: "array",
          items: { type: "string" },
          description: "Optional Appwrite permission strings.",
        },
      },
      required: ["databaseId", "collectionId", "documentId", "data"],
      additionalProperties: false,
    },
  },
  {
    name: "list_buckets",
    description: "List Appwrite storage buckets.",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Optional Appwrite query strings.",
        },
        search: {
          type: "string",
          description: "Optional search term.",
        },
        total: {
          type: "boolean",
          description: "Whether to request an accurate total count.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_bucket",
    description: "Create a storage bucket.",
    inputSchema: {
      type: "object",
      properties: {
        bucketId: {
          type: "string",
          description: "Custom bucket ID. Defaults to a generated unique ID.",
        },
        name: {
          type: "string",
          description: "Bucket name.",
        },
        payload: {
          type: "object",
          description:
            "Additional fields to forward to Appwrite, such as permissions, fileSecurity, enabled, or allowedFileExtensions.",
          additionalProperties: true,
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "list_functions",
    description: "List Appwrite functions.",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Optional Appwrite query strings.",
        },
        search: {
          type: "string",
          description: "Optional search term.",
        },
        total: {
          type: "boolean",
          description: "Whether to request an accurate total count.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_function",
    description: "Create an Appwrite function record.",
    inputSchema: {
      type: "object",
      properties: {
        functionId: {
          type: "string",
          description: "Custom function ID. Defaults to a generated unique ID.",
        },
        name: {
          type: "string",
          description: "Function name.",
        },
        runtime: {
          type: "string",
          description: "Appwrite runtime identifier, for example node-22.",
        },
        payload: {
          type: "object",
          description:
            "Additional function fields to forward to Appwrite, such as execute, events, schedule, entrypoint, commands, scopes, and providerRootDirectory.",
          additionalProperties: true,
        },
      },
      required: ["name", "runtime"],
      additionalProperties: false,
    },
  },
  {
    name: "appwrite_request",
    description:
      "Generic Appwrite REST request tool for endpoints not covered by the convenience tools. DELETE is blocked unless APPWRITE_MCP_ALLOW_DELETE=true.",
    inputSchema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
          description: "HTTP method.",
        },
        path: {
          type: "string",
          description:
            "Appwrite API path under /v1, for example /databases or /storage/buckets.",
        },
        query: {
          type: "object",
          description: "Optional query string parameters.",
          additionalProperties: true,
        },
        body: {
          type: "object",
          description: "Optional JSON body.",
          additionalProperties: true,
        },
      },
      required: ["method", "path"],
      additionalProperties: false,
    },
  },
];

const toolHandlers = {
  get_config_status: async () => ({
    ok: true,
    server: { name: SERVER_NAME, version: SERVER_VERSION },
    config: {
      endpoint: config.endpoint || null,
      projectId: maskValue(config.projectId),
      apiKeyConfigured: Boolean(config.apiKey),
      responseFormat: config.responseFormat,
      allowDelete: config.allowDelete,
      missing: listMissingConfig(),
    },
  }),
  list_databases: async (args = {}) =>
    appwriteFetch("GET", "/databases", {
      query: pickDefined({
        queries: args.queries,
        search: args.search,
        total: args.total,
      }),
    }),
  create_database: async (args = {}) =>
    appwriteFetch("POST", "/databases", {
      body: {
        databaseId: args.databaseId || ID.unique(),
        name: args.name,
        ...cleanObject(args.payload),
      },
    }),
  list_collections: async (args = {}) =>
    appwriteFetch(
      "GET",
      `/databases/${encodeURIComponent(args.databaseId)}/collections`,
      {
        query: pickDefined({
          queries: args.queries,
          search: args.search,
          total: args.total,
        }),
      },
    ),
  create_collection: async (args = {}) =>
    appwriteFetch(
      "POST",
      `/databases/${encodeURIComponent(args.databaseId)}/collections`,
      {
        body: {
          collectionId: args.collectionId || ID.unique(),
          name: args.name,
          ...cleanObject(args.payload),
        },
      },
    ),
  create_attribute: async (args = {}) =>
    appwriteFetch(
      "POST",
      `/databases/${encodeURIComponent(args.databaseId)}/collections/${encodeURIComponent(
        args.collectionId,
      )}/attributes/${encodeURIComponent(args.kind)}`,
      {
        body: cleanObject(args.payload),
      },
    ),
  create_index: async (args = {}) =>
    appwriteFetch(
      "POST",
      `/databases/${encodeURIComponent(args.databaseId)}/collections/${encodeURIComponent(
        args.collectionId,
      )}/indexes`,
      {
        body: cleanObject(args.payload),
      },
    ),
  list_documents: async (args = {}) =>
    appwriteFetch(
      "GET",
      `/databases/${encodeURIComponent(args.databaseId)}/collections/${encodeURIComponent(
        args.collectionId,
      )}/documents`,
      {
        query: pickDefined({
          queries: args.queries,
        }),
      },
    ),
  create_document: async (args = {}) =>
    appwriteFetch(
      "POST",
      `/databases/${encodeURIComponent(args.databaseId)}/collections/${encodeURIComponent(
        args.collectionId,
      )}/documents`,
      {
        body: pickDefined({
          documentId: args.documentId || ID.unique(),
          data: cleanObject(args.data),
          permissions: args.permissions,
        }),
      },
    ),
  update_document: async (args = {}) =>
    appwriteFetch(
      "PATCH",
      `/databases/${encodeURIComponent(args.databaseId)}/collections/${encodeURIComponent(
        args.collectionId,
      )}/documents/${encodeURIComponent(args.documentId)}`,
      {
        body: pickDefined({
          data: cleanObject(args.data),
          permissions: args.permissions,
        }),
      },
    ),
  list_buckets: async (args = {}) =>
    appwriteFetch("GET", "/storage/buckets", {
      query: pickDefined({
        queries: args.queries,
        search: args.search,
        total: args.total,
      }),
    }),
  create_bucket: async (args = {}) =>
    appwriteFetch("POST", "/storage/buckets", {
      body: {
        bucketId: args.bucketId || ID.unique(),
        name: args.name,
        ...cleanObject(args.payload),
      },
    }),
  list_functions: async (args = {}) =>
    appwriteFetch("GET", "/functions", {
      query: pickDefined({
        queries: args.queries,
        search: args.search,
        total: args.total,
      }),
    }),
  create_function: async (args = {}) =>
    appwriteFetch("POST", "/functions", {
      body: {
        functionId: args.functionId || ID.unique(),
        name: args.name,
        runtime: args.runtime,
        ...cleanObject(args.payload),
      },
    }),
  appwrite_request: async (args = {}) => {
    const method = String(args.method || "GET").toUpperCase();

    if (method === "DELETE" && !config.allowDelete) {
      throw new Error(
        "DELETE requests are disabled. Set APPWRITE_MCP_ALLOW_DELETE=true to enable them intentionally.",
      );
    }

    return appwriteFetch(method, args.path, {
      query: cleanObject(args.query),
      body: method === "GET" ? undefined : cleanObject(args.body),
    });
  },
};

startServer();

function startServer() {
  let incoming = Buffer.alloc(0);

  process.stdin.on("data", (chunk) => {
    incoming = Buffer.concat([incoming, Buffer.from(chunk)]);

    while (true) {
      const parsed = readMessage(incoming);
      if (!parsed) {
        break;
      }

      incoming = parsed.remaining;
      handleMessage(parsed.message).catch((error) => {
        sendError(null, -32603, error.message || "Internal server error");
      });
    }
  });
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") {
    return;
  }

  const { id, method, params } = message;

  if (!method) {
    if (id !== undefined) {
      sendError(id, -32600, "Missing method");
    }
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "ping") {
    sendResult(id, {});
    return;
  }

  if (method === "initialize") {
    sendResult(id, {
      protocolVersion: SUPPORTED_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    });
    return;
  }

  if (method === "tools/list") {
    sendResult(id, { tools: toolDefinitions });
    return;
  }

  if (method === "tools/call") {
    const result = await invokeTool(params);
    sendResult(id, result);
    return;
  }

  sendError(id, -32601, `Method not found: ${method}`);
}

async function invokeTool(params = {}) {
  const handler = toolHandlers[params.name];

  if (!handler) {
    return toolError(`Unknown tool: ${params.name}`);
  }

  try {
    const result = await handler(params.arguments || {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return toolError(error.message || "Tool execution failed");
  }
}

function toolError(message) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  };
}

async function appwriteFetch(method, resourcePath, options = {}) {
  ensureConfig();

  const url = buildAppwriteUrl(resourcePath, options.query);
  const body = options.body;
  const headers = {
    Accept: "application/json",
    "X-Appwrite-Project": config.projectId,
    "X-Appwrite-Key": config.apiKey,
    "X-Appwrite-Response-Format": config.responseFormat,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  const parsedBody = parseMaybeJson(responseText);

  if (!response.ok) {
    const errorMessage =
      typeof parsedBody === "object" &&
      parsedBody &&
      typeof parsedBody.message === "string"
        ? parsedBody.message
        : `Appwrite request failed with status ${response.status}`;

    const detail = {
      method,
      path: resourcePath,
      status: response.status,
      response: parsedBody,
    };

    throw new Error(`${errorMessage}\n${JSON.stringify(detail, null, 2)}`);
  }

  return {
    ok: true,
    method,
    path: resourcePath,
    status: response.status,
    data: parsedBody,
  };
}

function buildAppwriteUrl(resourcePath, query) {
  const baseUrl = getAppwriteBaseUrl();
  const rawPath = String(resourcePath || "").trim();

  if (!rawPath) {
    throw new Error("Appwrite request path is required.");
  }

  if (isAbsoluteUrlPath(rawPath)) {
    throw new Error(
      "Appwrite request path must be a relative path under the configured endpoint.",
    );
  }

  if (rawPath.includes("?") || rawPath.includes("#")) {
    throw new Error(
      "Appwrite request path must not include query strings or fragments. Use the query field instead.",
    );
  }

  validateRelativeAppwritePath(rawPath);

  const normalizedPath = rawPath.replace(/^\/+/, "");
  const url = new URL(normalizedPath, baseUrl);
  const basePathname = getBasePathname(baseUrl);

  if (url.origin !== baseUrl.origin) {
    throw new Error("Resolved Appwrite request URL must stay on the configured origin.");
  }

  if (!url.pathname.startsWith(basePathname)) {
    throw new Error(
      "Resolved Appwrite request URL must stay under the configured endpoint path.",
    );
  }

  for (const [key, value] of Object.entries(cleanObject(query))) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

function getAppwriteBaseUrl() {
  const normalizedEndpoint = config.endpoint.endsWith("/")
    ? config.endpoint
    : `${config.endpoint}/`;

  return new URL(normalizedEndpoint);
}

function isAbsoluteUrlPath(resourcePath) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/u.test(resourcePath) || resourcePath.startsWith("//");
}

function getBasePathname(baseUrl) {
  return baseUrl.pathname.endsWith("/") ? baseUrl.pathname : `${baseUrl.pathname}/`;
}

function validateRelativeAppwritePath(resourcePath) {
  const normalizedPath = resourcePath.replace(/^\/+/, "");
  const segments = normalizedPath.split("/");

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    let decodedSegment;

    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      throw new Error("Appwrite request path contains invalid URL encoding.");
    }

    if (decodedSegment === "." || decodedSegment === "..") {
      throw new Error("Appwrite request path must not contain dot segments.");
    }

    if (decodedSegment.includes("/") || decodedSegment.includes("\\")) {
      throw new Error("Appwrite request path must not contain encoded path separators.");
    }
  }
}

function ensureConfig() {
  const missing = listMissingConfig();

  if (missing.length > 0) {
    throw new Error(
      `Missing Appwrite MCP configuration: ${missing.join(", ")}. Add the values to .env before using write or read tools.`,
    );
  }
}

function listMissingConfig() {
  return [
    !config.endpoint ? "APPWRITE_ENDPOINT" : null,
    !config.projectId ? "APPWRITE_PROJECT_ID" : null,
    !config.apiKey ? "APPWRITE_API_KEY" : null,
  ].filter(Boolean);
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/u);

  for (const rawLine of lines) {
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

function parseMaybeJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function pickDefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}

function cleanObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

function maskValue(value) {
  if (!value) {
    return null;
  }

  if (value.length <= 6) {
    return "***";
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function readMessage(buffer) {
  const headerEnd = buffer.indexOf("\r\n\r\n");
  if (headerEnd === -1) {
    return null;
  }

  const headerText = buffer.subarray(0, headerEnd).toString("utf8");
  const headers = headerText.split("\r\n");
  const contentLengthHeader = headers.find((header) =>
    header.toLowerCase().startsWith("content-length:"),
  );

  if (!contentLengthHeader) {
    return null;
  }

  const length = Number(contentLengthHeader.split(":")[1].trim());
  const bodyStart = headerEnd + 4;
  const bodyEnd = bodyStart + length;

  if (buffer.length < bodyEnd) {
    return null;
  }

  const bodyText = buffer.subarray(bodyStart, bodyEnd).toString("utf8");
  return {
    message: JSON.parse(bodyText),
    remaining: buffer.subarray(bodyEnd),
  };
}

function sendResult(id, result) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result,
  });
}

function sendError(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

function writeMessage(message) {
  const json = JSON.stringify(message);
  const payload = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
  process.stdout.write(payload);
}
