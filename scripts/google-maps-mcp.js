"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const SERVER_NAME = "google-maps-local";
const SERVER_VERSION = "0.1.0";
const SUPPORTED_PROTOCOL_VERSION = "2024-11-05";
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_ANDROID_API_TARGET = "maps-android-backend.googleapis.com";
const DEFAULT_IOS_API_TARGET = "maps-ios-backend.googleapis.com";
const DEFAULT_NAVIGATION_API_TARGET = "navigationsdk.googleapis.com";
const DEFAULT_ANDROID_PACKAGE_NAME = "com.sitapp";
const DEFAULT_IOS_BUNDLE_ID = "com.sitapp";
const DEFAULT_ENABLED_SERVICES = [
  DEFAULT_ANDROID_API_TARGET,
  DEFAULT_IOS_API_TARGET,
  DEFAULT_NAVIGATION_API_TARGET,
];

loadDotEnv(path.join(repoRoot, ".env"));

const config = {
  gcloudBin: process.env.GCLOUD_BIN || "",
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  billingAccountId: process.env.GOOGLE_CLOUD_BILLING_ACCOUNT_ID || "",
  androidPackageName:
    process.env.GOOGLE_MAPS_ANDROID_PACKAGE_NAME || DEFAULT_ANDROID_PACKAGE_NAME,
  iosBundleId: process.env.GOOGLE_MAPS_IOS_BUNDLE_ID || DEFAULT_IOS_BUNDLE_ID,
  androidDebugSha1: process.env.GOOGLE_MAPS_ANDROID_DEBUG_SHA1 || "",
  androidReleaseSha1: process.env.GOOGLE_MAPS_ANDROID_RELEASE_SHA1 || "",
  monthlyBudgetAmount: process.env.GOOGLE_MAPS_MONTHLY_BUDGET_AMOUNT || "",
  budgetCurrency: process.env.GOOGLE_MAPS_BUDGET_CURRENCY || "EUR",
};

const toolDefinitions = [
  {
    name: "get_config_status",
    description: "Show the local Google Maps MCP configuration state.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "doctor",
    description:
      "Inspect local gcloud availability, auth state, repo env values, and active project setup.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Optional Google Cloud project ID override.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_billing_accounts",
    description: "List billing accounts visible to the authenticated gcloud user.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "link_billing_account",
    description: "Link the configured Google Cloud project to a billing account.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID.",
        },
        billingAccountId: {
          type: "string",
          description: "Billing account ID. Defaults to GOOGLE_CLOUD_BILLING_ACCOUNT_ID.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "enable_mobile_map_services",
    description:
      "Enable the Android and iOS Google mobile map services needed for a native Google map stack.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID.",
        },
        services: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional service overrides. Defaults to Maps SDK Android and iOS backends.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_api_keys",
    description: "List API keys in the configured Google Cloud project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_android_api_key",
    description:
      "Create a restricted Android API key for this app and return the key string once.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID.",
        },
        displayName: {
          type: "string",
          description: "Human-readable API key name.",
        },
        packageName: {
          type: "string",
          description:
            "Android application ID. Defaults to GOOGLE_MAPS_ANDROID_PACKAGE_NAME.",
        },
        sha1Fingerprint: {
          type: "string",
          description:
            "Android signing SHA-1 fingerprint. Use separate keys for debug and release.",
        },
        apiTarget: {
          type: "string",
          description:
            "Optional API target override. Defaults to maps-android-backend.googleapis.com.",
        },
        apiTargets: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional API target overrides. If provided, these take precedence over apiTarget.",
        },
      },
      required: ["displayName", "sha1Fingerprint"],
      additionalProperties: false,
    },
  },
  {
    name: "create_ios_api_key",
    description:
      "Create a restricted iOS API key for this app and return the key string once.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID.",
        },
        displayName: {
          type: "string",
          description: "Human-readable API key name.",
        },
        bundleId: {
          type: "string",
          description: "iOS bundle identifier. Defaults to GOOGLE_MAPS_IOS_BUNDLE_ID.",
        },
        apiTarget: {
          type: "string",
          description:
            "Optional API target override. Defaults to maps-ios-backend.googleapis.com.",
        },
        apiTargets: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional API target overrides. If provided, these take precedence over apiTarget.",
        },
      },
      required: ["displayName"],
      additionalProperties: false,
    },
  },
  {
    name: "list_budgets",
    description: "List billing budgets for a billing account.",
    inputSchema: {
      type: "object",
      properties: {
        billingAccountId: {
          type: "string",
          description: "Billing account ID. Defaults to GOOGLE_CLOUD_BILLING_ACCOUNT_ID.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_budget_guardrail",
    description:
      "Create a monthly Google Cloud budget for the project to cap early spend risk.",
    inputSchema: {
      type: "object",
      properties: {
        billingAccountId: {
          type: "string",
          description: "Billing account ID. Defaults to GOOGLE_CLOUD_BILLING_ACCOUNT_ID.",
        },
        projectId: {
          type: "string",
          description: "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID.",
        },
        displayName: {
          type: "string",
          description: "Budget display name.",
        },
        amount: {
          type: "string",
          description: "Budget amount in major currency units, for example 20 or 50.00.",
        },
        currencyCode: {
          type: "string",
          description: "Currency code. Defaults to EUR.",
        },
        thresholds: {
          type: "array",
          items: { type: "number" },
          description:
            "Optional threshold percentages as decimals, for example [0.5, 0.9, 1].",
        },
      },
      required: ["displayName", "amount"],
      additionalProperties: false,
    },
  },
  {
    name: "bootstrap_repo_mobile_setup",
    description:
      "Best-practice bootstrap for this repo: link billing, enable services, create restricted keys, and optionally create a budget guardrail.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID.",
        },
        billingAccountId: {
          type: "string",
          description: "Billing account ID. Defaults to GOOGLE_CLOUD_BILLING_ACCOUNT_ID.",
        },
        androidPackageName: {
          type: "string",
          description:
            "Android application ID. Defaults to GOOGLE_MAPS_ANDROID_PACKAGE_NAME.",
        },
        iosBundleId: {
          type: "string",
          description: "iOS bundle identifier. Defaults to GOOGLE_MAPS_IOS_BUNDLE_ID.",
        },
        androidDebugSha1: {
          type: "string",
          description:
            "Debug signing SHA-1 fingerprint. Defaults to GOOGLE_MAPS_ANDROID_DEBUG_SHA1.",
        },
        androidReleaseSha1: {
          type: "string",
          description:
            "Release signing SHA-1 fingerprint. Defaults to GOOGLE_MAPS_ANDROID_RELEASE_SHA1.",
        },
        budgetAmount: {
          type: "string",
          description:
            "Optional monthly budget amount. Defaults to GOOGLE_MAPS_MONTHLY_BUDGET_AMOUNT.",
        },
        currencyCode: {
          type: "string",
          description:
            "Optional budget currency. Defaults to GOOGLE_MAPS_BUDGET_CURRENCY or EUR.",
        },
      },
      additionalProperties: false,
    },
  },
];

const toolHandlers = {
  get_config_status: async () => ({
    ok: true,
    server: { name: SERVER_NAME, version: SERVER_VERSION },
    config: {
      gcloudBin: resolveGcloudCommand(false),
      projectId: config.projectId || null,
      billingAccountId: maskValue(config.billingAccountId),
      androidPackageName: config.androidPackageName,
      iosBundleId: config.iosBundleId,
      androidDebugSha1Configured: Boolean(config.androidDebugSha1),
      androidReleaseSha1Configured: Boolean(config.androidReleaseSha1),
      monthlyBudgetAmount: config.monthlyBudgetAmount || null,
      missing: listMissingConfig(),
    },
  }),
  doctor: async (args = {}) => getDoctorReport(resolveProjectId(args.projectId, false)),
  list_billing_accounts: async () => ({
    ok: true,
    accounts: runGcloudJson(["billing", "accounts", "list", "--format=json"]),
  }),
  link_billing_account: async (args = {}) => {
    const projectId = resolveProjectId(args.projectId);
    const billingAccountId = resolveBillingAccountId(args.billingAccountId);

    runGcloud([
      "billing",
      "projects",
      "link",
      projectId,
      `--billing-account=${billingAccountId}`,
    ]);

    return {
      ok: true,
      projectId,
      billingAccountId,
      linked: true,
    };
  },
  enable_mobile_map_services: async (args = {}) => {
    const projectId = resolveProjectId(args.projectId);
    const services =
      Array.isArray(args.services) && args.services.length > 0
        ? args.services
        : DEFAULT_ENABLED_SERVICES;

    runGcloud(["services", "enable", ...services, `--project=${projectId}`]);

    return {
      ok: true,
      projectId,
      enabledServices: services,
    };
  },
  list_api_keys: async (args = {}) => {
    const projectId = resolveProjectId(args.projectId);
    return {
      ok: true,
      projectId,
      keys: listApiKeys(projectId),
    };
  },
  create_android_api_key: async (args = {}) => {
    const projectId = resolveProjectId(args.projectId);
    const displayName = requireString(args.displayName, "displayName");
    const packageName = String(
      args.packageName || config.androidPackageName || "",
    ).trim();
    const sha1Fingerprint = requireString(args.sha1Fingerprint, "sha1Fingerprint");
    const apiTargets = normalizeApiTargets(
      args.apiTargets,
      args.apiTarget,
      DEFAULT_ANDROID_API_TARGET,
    );

    if (!packageName) {
      throw new Error(
        "Android package name is required. Set GOOGLE_MAPS_ANDROID_PACKAGE_NAME or pass packageName.",
      );
    }

    const createdKey = createApiKey(projectId, displayName);
    const applicationRestriction = `sha1_fingerprint=${sha1Fingerprint},package_name=${packageName}`;

    runGcloud([
      "beta",
      "services",
      "api-keys",
      "update",
      createdKey.name,
      `--project=${projectId}`,
      ...apiTargets.map((apiTarget) => `--api-target=service=${apiTarget}`),
      `--allowed-application=${applicationRestriction}`,
    ]);

    const keyString = getApiKeyString(projectId, createdKey.name);

    return {
      ok: true,
      projectId,
      key: {
        name: createdKey.name,
        displayName,
        keyString,
      },
      restrictions: {
        platform: "android",
        packageName,
        sha1Fingerprint,
        apiTargets,
      },
    };
  },
  create_ios_api_key: async (args = {}) => {
    const projectId = resolveProjectId(args.projectId);
    const displayName = requireString(args.displayName, "displayName");
    const bundleId = String(args.bundleId || config.iosBundleId || "").trim();
    const apiTargets = normalizeApiTargets(
      args.apiTargets,
      args.apiTarget,
      DEFAULT_IOS_API_TARGET,
      DEFAULT_NAVIGATION_API_TARGET,
    );

    if (!bundleId) {
      throw new Error(
        "iOS bundle ID is required. Set GOOGLE_MAPS_IOS_BUNDLE_ID or pass bundleId.",
      );
    }

    const createdKey = createApiKey(projectId, displayName);

    runGcloud([
      "beta",
      "services",
      "api-keys",
      "update",
      createdKey.name,
      `--project=${projectId}`,
      ...apiTargets.map((apiTarget) => `--api-target=service=${apiTarget}`),
      `--allowed-bundle-ids=${bundleId}`,
    ]);

    const keyString = getApiKeyString(projectId, createdKey.name);

    return {
      ok: true,
      projectId,
      key: {
        name: createdKey.name,
        displayName,
        keyString,
      },
      restrictions: {
        platform: "ios",
        bundleId,
        apiTargets,
      },
    };
  },
  list_budgets: async (args = {}) => {
    const billingAccountId = resolveBillingAccountId(args.billingAccountId);
    return {
      ok: true,
      billingAccountId,
      budgets: runGcloudJson([
        "billing",
        "budgets",
        "list",
        `--billing-account=${billingAccountId}`,
        "--format=json",
      ]),
    };
  },
  create_budget_guardrail: async (args = {}) => {
    const projectId = resolveProjectId(args.projectId);
    const billingAccountId = resolveBillingAccountId(args.billingAccountId);
    const displayName = requireString(args.displayName, "displayName");
    const amount = requireString(args.amount, "amount");
    const currencyCode = String(
      args.currencyCode || config.budgetCurrency || "EUR",
    ).trim();
    const thresholds =
      Array.isArray(args.thresholds) && args.thresholds.length > 0
        ? args.thresholds
        : [0.5, 0.9, 1];
    const projectNumber = getProjectNumber(projectId);
    const command = [
      "billing",
      "budgets",
      "create",
      `--billing-account=${billingAccountId}`,
      `--display-name=${displayName}`,
      `--budget-amount=${amount}`,
      `--currency-code=${currencyCode}`,
      "--calendar-period=month",
      `--filter-projects=projects/${projectNumber}`,
      ...thresholds.map((threshold) => `--threshold-rule=percent=${threshold}`),
    ];

    runGcloud(command);

    return {
      ok: true,
      billingAccountId,
      projectId,
      projectNumber,
      displayName,
      amount,
      currencyCode,
      thresholds,
      created: true,
    };
  },
  bootstrap_repo_mobile_setup: async (args = {}) => {
    const projectId = resolveProjectId(args.projectId);
    const billingAccountId = resolveBillingAccountId(args.billingAccountId, false);
    const androidPackageName = String(
      args.androidPackageName ||
        config.androidPackageName ||
        DEFAULT_ANDROID_PACKAGE_NAME,
    ).trim();
    const iosBundleId = String(
      args.iosBundleId || config.iosBundleId || DEFAULT_IOS_BUNDLE_ID,
    ).trim();
    const androidDebugSha1 = String(
      args.androidDebugSha1 || config.androidDebugSha1 || "",
    ).trim();
    const androidReleaseSha1 = String(
      args.androidReleaseSha1 || config.androidReleaseSha1 || "",
    ).trim();
    const budgetAmount = String(
      args.budgetAmount || config.monthlyBudgetAmount || "",
    ).trim();
    const currencyCode = String(
      args.currencyCode || config.budgetCurrency || "EUR",
    ).trim();
    const createdKeys = [];

    if (billingAccountId) {
      await toolHandlers.link_billing_account({ projectId, billingAccountId });
    }

    await toolHandlers.enable_mobile_map_services({ projectId });

    if (androidDebugSha1) {
      createdKeys.push(
        await toolHandlers.create_android_api_key({
          projectId,
          displayName: `${projectId}-android-debug`,
          packageName: androidPackageName,
          sha1Fingerprint: androidDebugSha1,
        }),
      );
    }

    if (androidReleaseSha1) {
      createdKeys.push(
        await toolHandlers.create_android_api_key({
          projectId,
          displayName: `${projectId}-android-release`,
          packageName: androidPackageName,
          sha1Fingerprint: androidReleaseSha1,
        }),
      );
    }

    createdKeys.push(
      await toolHandlers.create_ios_api_key({
        projectId,
        displayName: `${projectId}-ios`,
        bundleId: iosBundleId,
      }),
    );

    let budget = null;

    if (billingAccountId && budgetAmount) {
      budget = await toolHandlers.create_budget_guardrail({
        billingAccountId,
        projectId,
        displayName: `${projectId}-maps-budget`,
        amount: budgetAmount,
        currencyCode,
      });
    }

    return {
      ok: true,
      projectId,
      billingAccountLinked: Boolean(billingAccountId),
      servicesEnabled: DEFAULT_ENABLED_SERVICES,
      createdKeys: createdKeys.map((entry) => entry.key),
      budget:
        budget && budget.created
          ? {
              displayName: budget.displayName,
              amount: budget.amount,
              currencyCode: budget.currencyCode,
            }
          : null,
      envMapping: {
        GOOGLE_MAPS_ANDROID_API_KEY:
          createdKeys.find((entry) => entry.restrictions.platform === "android")?.key
            .keyString || null,
        GOOGLE_MAPS_IOS_API_KEY:
          createdKeys.find((entry) => entry.restrictions.platform === "ios")?.key
            .keyString || null,
      },
    };
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

function getDoctorReport(projectId) {
  const gcloudInfo = getGcloudInfo();
  const activeAccount = getActiveAccount();
  const configuredProject = getConfiguredProject();
  const report = {
    ok: true,
    repoConfig: {
      projectId: config.projectId || null,
      billingAccountId: maskValue(config.billingAccountId),
      androidPackageName: config.androidPackageName,
      iosBundleId: config.iosBundleId,
      androidDebugSha1Configured: Boolean(config.androidDebugSha1),
      androidReleaseSha1Configured: Boolean(config.androidReleaseSha1),
      monthlyBudgetAmount: config.monthlyBudgetAmount || null,
      missing: listMissingConfig(),
    },
    gcloud: {
      installed: gcloudInfo.installed,
      binary: gcloudInfo.binary,
      version: gcloudInfo.version,
      activeAccount,
      configuredProject,
    },
  };

  if (!gcloudInfo.installed || !projectId) {
    return report;
  }

  report.project = {
    projectId,
    projectNumber: getProjectNumber(projectId),
    enabledServices: runGcloudJson([
      "services",
      "list",
      `--project=${projectId}`,
      "--enabled",
      "--format=json",
    ]),
    apiKeys: listApiKeys(projectId),
  };

  if (config.billingAccountId) {
    report.billing = {
      billingAccountId: maskValue(config.billingAccountId),
      budgets: runGcloudJson([
        "billing",
        "budgets",
        "list",
        `--billing-account=${config.billingAccountId}`,
        "--format=json",
      ]),
    };
  }

  return report;
}

function getGcloudInfo() {
  const gcloudCommand = resolveGcloudCommand(false);

  if (!gcloudCommand) {
    return {
      installed: false,
      binary: null,
      version: null,
    };
  }

  try {
    const stdout = runCommand(gcloudCommand, ["--version"]);
    const firstLine = stdout.split(/\r?\n/u).find(Boolean) || null;
    return {
      installed: true,
      binary: gcloudCommand,
      version: firstLine,
    };
  } catch {
    return {
      installed: false,
      binary: gcloudCommand,
      version: null,
    };
  }
}

function getActiveAccount() {
  try {
    const accounts = runGcloudJson([
      "auth",
      "list",
      "--filter=status:ACTIVE",
      "--format=json",
    ]);
    return Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
}

function getConfiguredProject() {
  try {
    const stdout = runCommand(resolveGcloudCommand(), ["config", "get-value", "project"]);
    const value = String(stdout || "").trim();
    return value || null;
  } catch {
    return null;
  }
}

function listApiKeys(projectId) {
  return runGcloudJson([
    "services",
    "api-keys",
    "list",
    `--project=${projectId}`,
    "--format=json",
  ]);
}

function createApiKey(projectId, displayName) {
  return runGcloudJson([
    "services",
    "api-keys",
    "create",
    `--project=${projectId}`,
    `--display-name=${displayName}`,
    "--format=json",
  ]);
}

function getApiKeyString(projectId, keyName) {
  const result = runGcloudJson([
    "services",
    "api-keys",
    "get-key-string",
    keyName,
    `--project=${projectId}`,
    "--format=json",
  ]);

  return result.keyString || null;
}

function getProjectNumber(projectId) {
  const projectNumber = runCommand("gcloud", [
    "projects",
    "describe",
    projectId,
    "--format=value(projectNumber)",
  ]);

  const normalizedProjectNumber = String(projectNumber || "").trim();

  if (!normalizedProjectNumber) {
    throw new Error(`Unable to resolve project number for ${projectId}.`);
  }

  return normalizedProjectNumber;
}

function resolveProjectId(projectId, required = true) {
  const resolved = String(projectId || config.projectId || "").trim();

  if (!resolved && required) {
    throw new Error(
      "Google Cloud project ID is required. Set GOOGLE_CLOUD_PROJECT_ID or pass projectId.",
    );
  }

  return resolved || null;
}

function resolveBillingAccountId(billingAccountId, required = true) {
  const resolved = String(billingAccountId || config.billingAccountId || "").trim();

  if (!resolved && required) {
    throw new Error(
      "Billing account ID is required. Set GOOGLE_CLOUD_BILLING_ACCOUNT_ID or pass billingAccountId.",
    );
  }

  return resolved || null;
}

function normalizeApiTargets(apiTargets, apiTarget, ...defaults) {
  const normalizedTargets = Array.isArray(apiTargets)
    ? apiTargets.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];

  if (normalizedTargets.length > 0) {
    return normalizedTargets;
  }

  if (apiTarget) {
    return [String(apiTarget).trim()].filter(Boolean);
  }

  return defaults.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function requireString(value, fieldName) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function listMissingConfig() {
  return [
    !config.projectId ? "GOOGLE_CLOUD_PROJECT_ID" : null,
    !config.billingAccountId ? "GOOGLE_CLOUD_BILLING_ACCOUNT_ID" : null,
    !config.androidDebugSha1 ? "GOOGLE_MAPS_ANDROID_DEBUG_SHA1" : null,
    !config.monthlyBudgetAmount ? "GOOGLE_MAPS_MONTHLY_BUDGET_AMOUNT" : null,
  ].filter(Boolean);
}

function runGcloud(args) {
  return parseMaybeJson(runCommand(resolveGcloudCommand(), args));
}

function runGcloudJson(args) {
  const output = runCommand(resolveGcloudCommand(), args);
  return parseMaybeJson(output);
}

function ensureGcloudInstalled() {
  if (!resolveGcloudCommand(false)) {
    throw new Error(
      "gcloud is not installed or not discoverable. Install the Google Cloud CLI, or set GCLOUD_BIN to the full binary path before using this MCP server.",
    );
  }
}

function resolveGcloudCommand(required = true) {
  const explicitPath = String(config.gcloudBin || "").trim();
  const candidates = [
    explicitPath,
    "gcloud",
    path.join(os.homedir(), "google-cloud-sdk", "bin", "gcloud"),
    path.join(os.homedir(), "Downloads", "google-cloud-sdk", "bin", "gcloud"),
    "/opt/homebrew/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/bin/gcloud",
    "/usr/local/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/bin/gcloud",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "gcloud") {
      try {
        runCommand(candidate, ["--version"]);
        return candidate;
      } catch {
        continue;
      }
    }

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  if (required) {
    ensureGcloudInstalled();
  }

  return null;
}

function runCommand(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr =
      typeof error.stderr === "string" ? error.stderr.trim() : String(error.stderr || "");
    const stdout =
      typeof error.stdout === "string" ? error.stdout.trim() : String(error.stdout || "");
    const detail = stderr || stdout || error.message || "Unknown command failure";

    throw new Error(`${command} ${args.join(" ")} failed.\n${detail}`);
  }
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
