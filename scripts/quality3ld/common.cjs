const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
require("dotenv").config({ quiet: true });

const root = path.resolve(__dirname, "../..");
const output = path.join(root, "reports/3ld");
const privateDir = path.join(output, "private");
const statePath = path.join(privateDir, "state.json");
function saveState(state) {
  fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
}
function loadState() {
  if (!fs.existsSync(statePath)) throw new Error("First run npm run quality:3ld:setup");
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}
function config() {
  const required = [
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
  ];
  for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
  return {
    endpoint: process.env.APPWRITE_ENDPOINT.replace(/\/$/, ""),
    project: process.env.APPWRITE_PROJECT_ID,
    database: process.env.APPWRITE_DATABASE_ID,
    key: process.env.APPWRITE_API_KEY,
  };
}
async function request(
  resource,
  { method = "GET", body, jwt, session, admin = false, raw = false } = {},
) {
  const c = config();
  const headers = {
    "X-Appwrite-Project": c.project,
    "X-Appwrite-Response-Format": "1.6.0",
  };
  if (admin) headers["X-Appwrite-Key"] = c.key;
  if (jwt) headers["X-Appwrite-JWT"] = jwt;
  if (session) headers["X-Appwrite-Session"] = session;
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(c.endpoint + resource, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (raw) return response;
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
async function must(resource, options) {
  const r = await request(resource, options);
  if (r.status >= 400)
    throw new Error(
      `${options?.method || "GET"} ${resource}: ${r.status} ${r.data.type || ""} ${r.data.message || ""}`,
    );
  return r.data;
}
function collectionPath(id) {
  return `/databases/${config().database}/collections/${id}`;
}
function unique() {
  return "ld3_" + crypto.randomBytes(10).toString("hex");
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function beginPhase(name) {
  const phase = { startedAt: new Date().toISOString(), complete: false };
  fs.writeFileSync(path.join(output, `phase-${name}.json`), JSON.stringify(phase));
  return phase;
}
function finishPhase(name, phase) {
  fs.writeFileSync(
    path.join(output, `phase-${name}.json`),
    JSON.stringify({ ...phase, complete: true, completedAt: new Date().toISOString() }),
  );
}
module.exports = {
  root,
  output,
  statePath,
  saveState,
  loadState,
  config,
  request,
  must,
  collectionPath,
  unique,
  sleep,
  beginPhase,
  finishPhase,
};
