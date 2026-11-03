const fs = require("node:fs");
const crypto = require("node:crypto");
const {
  output,
  statePath,
  config,
  request,
  must,
  collectionPath,
  unique,
  saveState,
  loadState,
  sleep,
} = require("./common.cjs");

async function main() {
  if (fs.existsSync(statePath)) {
    const state = loadState();
    if (state.cleaned) {
      fs.renameSync(statePath, statePath.replace(".json", `-cleaned-${Date.now()}.json`));
    } else {
      if (!state.ready)
        throw new Error(
          "Incomplete/cleaned manifest: clean its resources and archive private/state.json before setup.",
        );
      console.log(
        `Reusing 3LD environment ${state.runId}; no production settings changed.`,
      );
      return;
    }
  }
  const c = config();
  const state = {
    runId: unique(),
    createdAt: new Date().toISOString(),
    project: c.project,
    database: c.database,
    isolation:
      "dedicated collections in existing project; project-scoped API key cannot create an organization project",
    resources: [],
    users: [],
    collections: {},
    observations: [],
    token: crypto.randomBytes(24).toString("hex"),
    port: 4313,
  };
  saveState(state);
  for (const [kind, source] of Object.entries({
    markers: process.env.APPWRITE_MARKERS_COLLECTION_ID,
    ratings: process.env.APPWRITE_RATINGS_COLLECTION_ID,
  })) {
    const metadata = await must(collectionPath(source), { admin: true });
    const id = unique();
    await must(`/databases/${c.database}/collections`, {
      method: "POST",
      admin: true,
      body: {
        collectionId: id,
        name: `3LD ${kind} ${state.runId}`,
        permissions: metadata.$permissions,
        documentSecurity: metadata.documentSecurity,
        enabled: metadata.enabled,
      },
    });
    state.collections[kind] = id;
    state.resources.push({ kind: "collection", id, source });
    saveState(state);
    for (const attribute of metadata.attributes) {
      if (attribute.type === "relationship")
        throw new Error("Relationship schema needs explicit isolated mapping");
      const type =
        attribute.format || (attribute.type === "double" ? "float" : attribute.type);
      const payload = {
        key: attribute.key,
        required: attribute.required,
        array: attribute.array,
      };
      for (const key of ["size", "elements", "min", "max", "signed", "encrypt"])
        if (attribute[key] !== undefined) payload[key] = attribute[key];
      if (
        !attribute.required &&
        attribute.default !== undefined &&
        attribute.default !== null
      )
        payload.default = attribute.default;
      await must(`${collectionPath(id)}/attributes/${type}`, {
        method: "POST",
        admin: true,
        body: payload,
      });
    }
    for (let n = 0; n < 60; n++) {
      const latest = await must(collectionPath(id), { admin: true });
      if (latest.attributes.every((a) => a.status === "available")) break;
      if (latest.attributes.some((a) => a.status === "failed"))
        throw new Error("Attribute creation failed");
      if (n === 59) throw new Error("Attribute creation timeout");
      await sleep(1000);
    }
    for (const index of metadata.indexes || []) {
      await must(`${collectionPath(id)}/indexes`, {
        method: "POST",
        admin: true,
        body: {
          key: index.key,
          type: index.type,
          attributes: index.attributes,
          orders: index.orders,
        },
      });
    }
    state.observations.push({
      kind,
      source,
      documentSecurity: metadata.documentSecurity,
      permissions: metadata.$permissions,
      attributes: metadata.attributes.map(({ key, type, format, min, max, size }) => ({
        key,
        type,
        format,
        min,
        max,
        size,
      })),
    });
    saveState(state);
  }
  const original = await must(`/storage/buckets/${process.env.APPWRITE_STORAGE_ID}`, {
    admin: true,
  });
  const bucketId = unique();
  const bucket = await request("/storage/buckets", {
    method: "POST",
    admin: true,
    body: {
      bucketId,
      name: `3LD ${state.runId}`,
      permissions: original.$permissions,
      fileSecurity: original.fileSecurity,
      enabled: original.enabled,
      maximumFileSize: original.maximumFileSize,
      allowedFileExtensions: original.allowedFileExtensions,
      compression: original.compression,
      encryption: original.encryption,
      antivirus: original.antivirus,
    },
  });
  if (bucket.status < 400) {
    state.bucket = bucketId;
    state.resources.push({ kind: "bucket", id: bucketId });
  } else {
    state.bucket = original.$id;
    state.observations.push({
      bucketCreationStatus: bucket.status,
      type: bucket.data.type,
      note: "Existing bucket used only for new registered test files; no existing files or bucket settings modified.",
    });
  }
  state.observations.push({
    bucketSettings: {
      maximumFileSize: original.maximumFileSize,
      allowedFileExtensions: original.allowedFileExtensions,
      fileSecurity: original.fileSecurity,
      permissions: original.$permissions,
    },
  });
  saveState(state);
  for (const suffix of ["a", "b"]) {
    const id = unique();
    const email = `${id}.${suffix}@example.invalid`;
    const password = crypto.randomBytes(24).toString("base64url");
    await must("/users", {
      method: "POST",
      admin: true,
      body: { userId: id, email, password, name: `SIT 3LD ${suffix.toUpperCase()}` },
    });
    state.users.push({ id, email, password });
    state.resources.push({ kind: "user", id });
    saveState(state);
    const session = await must(`/users/${id}/sessions`, { method: "POST", admin: true });
    state.users.at(-1).session = session.secret;
    saveState(state);
  }
  state.ready = true;
  saveState(state);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    output + "/environment.json",
    JSON.stringify(
      {
        runId: state.runId,
        createdAt: state.createdAt,
        isolation: state.isolation,
        observations: state.observations,
        resources: state.resources.map(({ kind, id }) => ({ kind, id })),
      },
      null,
      2,
    ),
  );
  console.log(
    "3LD setup complete: isolated schema, test users and registered resources. Secrets remain in ignored reports/3ld/private/.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
