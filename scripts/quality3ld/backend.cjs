const fs = require("node:fs");
const {
  loadState,
  saveState,
  request,
  must,
  collectionPath,
  unique,
  output,
  beginPhase,
  finishPhase,
} = require("./common.cjs");

async function bootstrap() {
  const state = loadState();
  if (!state.ready || state.cleaned) throw new Error("Test environment is not active");
  for (const user of state.users) {
    const result = await must("/account/jwts", { method: "POST", session: user.session });
    user.jwt = result.jwt;
  }
  if (!state.markerId) {
    state.markerId = unique();
    const owner = state.users[1].id;
    await must(`${collectionPath(state.collections.markers)}/documents`, {
      method: "POST",
      admin: true,
      body: {
        documentId: state.markerId,
        data: markerData(owner),
        permissions: [
          `read("any")`,
          `update("user:${owner}")`,
          `delete("user:${owner}")`,
        ],
      },
    });
  }
  saveState(state);
  return state;
}
function markerData(owner) {
  const latitude = 54.6858 + Math.random() / 100;
  return {
    title: "3LD synthetic sitting place",
    description: "Automated laboratory fixture",
    latitude,
    longitude: 25.287,
    location: `${latitude},25.2870`,
    status: "pending_approval",
    author_id: owner,
    created_at: new Date().toISOString(),
    attributes: [],
    photo_urls: [],
  };
}
async function runBackend(repeats = 10) {
  const phase = beginPhase("backend");
  const state = await bootstrap();
  const [a, b] = state.users;
  const observations = [];
  async function record(metric, scenario, trial, task) {
    const start = performance.now();
    const result = await task();
    const row = {
      metric,
      scenario,
      trial,
      measuredAt: new Date().toISOString(),
      durationMs: performance.now() - start,
      ...result,
    };
    observations.push(row);
    fs.appendFileSync(`${output}/backend.jsonl`, JSON.stringify(row) + "\n");
  }
  for (let trial = 0; trial < repeats; trial++) {
    for (const [scenario, jwt, expected] of [
      ["valid", a.jwt, 200],
      ["invalid", "invalid-laboratory-jwt", 401],
    ]) {
      await record("M1", scenario, trial, async () => {
        const r = await request("/account", { jwt });
        return {
          status: r.status,
          expected,
          passed: r.status === expected && (expected !== 200 || r.data.$id === a.id),
        };
      });
    }
    for (const [scenario, author] of [
      ["own", a.id],
      ["spoofed", b.id],
    ]) {
      await record("M2", scenario, trial, async () => {
        const id = unique();
        const r = await request(
          `${collectionPath(state.collections.ratings)}/documents`,
          {
            method: "POST",
            jwt: a.jwt,
            body: {
              documentId: id,
              data: {
                marker_id: state.markerId,
                user_id: author,
                author_name: "3LD",
                score: 4,
                comment: "3LD identity probe",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              permissions: [
                `read("any")`,
                `update("user:${a.id}")`,
                `delete("user:${a.id}")`,
              ],
            },
          },
        );
        const accepted = r.status === 201;
        const passed =
          scenario === "own"
            ? accepted && r.data.user_id === a.id
            : [401, 403].includes(r.status);
        if (accepted)
          await must(`${collectionPath(state.collections.ratings)}/documents/${id}`, {
            method: "DELETE",
            admin: true,
          });
        return {
          status: r.status,
          passed,
          storedAuthorMatchesSession: accepted ? r.data.user_id === a.id : null,
        };
      });
    }
    for (const scenario of ["pending", "self-approve"]) {
      await record("R1", scenario, trial, async () => {
        const id = unique();
        const created = await request(
          `${collectionPath(state.collections.markers)}/documents`,
          {
            method: "POST",
            jwt: a.jwt,
            body: {
              documentId: id,
              data: markerData(a.id),
              permissions: [
                `read("user:${a.id}")`,
                `update("user:${a.id}")`,
                `delete("user:${a.id}")`,
              ],
            },
          },
        );
        if (created.status !== 201)
          return { status: created.status, passed: false, setupFailure: true };
        let status = created.status;
        let storedStatus = created.data.status;
        if (scenario === "self-approve") {
          const r = await request(
            `${collectionPath(state.collections.markers)}/documents/${id}`,
            { method: "PATCH", jwt: a.jwt, body: { data: { status: "approved" } } },
          );
          status = r.status;
          const persisted = await must(
            `${collectionPath(state.collections.markers)}/documents/${id}`,
            { admin: true },
          );
          storedStatus = persisted.status;
        }
        await must(`${collectionPath(state.collections.markers)}/documents/${id}`, {
          method: "DELETE",
          admin: true,
        });
        return {
          status,
          storedStatus,
          passed:
            storedStatus === "pending_approval" &&
            (scenario === "pending" || [401, 403].includes(status)),
        };
      });
    }
    for (const scenario of ["jpeg", "disguised"]) {
      await record("R2", scenario, trial, async () => {
        const id = unique();
        // A real repository PNG versus inert text. No executable payload is used.
        const imagePath = require("node:path").join(
          __dirname,
          "../../assets/images/logo-small.png",
        );
        const png = fs.readFileSync(imagePath);
        const bytes =
          scenario === "jpeg"
            ? png
            : Buffer.from("SIT 3LD: this is plain text, not an image.");
        const extension = scenario === "jpeg" ? "png" : "jpg";
        const mime = scenario === "jpeg" ? "image/png" : "image/jpeg";
        const form = new FormData();
        form.set("fileId", id);
        form.set(
          "file",
          new Blob([bytes], { type: mime }),
          `3ld-${scenario}.${extension}`,
        );
        form.append("permissions[]", `read("user:${a.id}")`);
        const r = await request(`/storage/buckets/${state.bucket}/files`, {
          method: "POST",
          jwt: a.jwt,
          body: form,
        });
        if (r.status === 201) {
          state.resources.push({ kind: "file", id, bucket: state.bucket });
          saveState(state);
          await must(`/storage/buckets/${state.bucket}/files/${id}`, {
            method: "DELETE",
            admin: true,
          });
          state.resources.at(-1).deleted = true;
          saveState(state);
        }
        return {
          status: r.status,
          bytes: bytes.length,
          fileType: scenario === "jpeg" ? "real PNG" : "text disguised as JPEG",
          passed:
            scenario === "jpeg" ? r.status === 201 : [400, 415, 422].includes(r.status),
        };
      });
    }
  }
  finishPhase("backend", phase);
  return observations;
}
module.exports = { bootstrap, runBackend, markerData };
if (require.main === module)
  runBackend(Number(process.env.REPEATS || 10))
    .then((rows) => {
      const groups = new Map();
      for (const row of rows) {
        const key = `${row.metric}/${row.scenario}`;
        const g = groups.get(key) || { passed: 0, total: 0 };
        g.total++;
        g.passed += Number(row.passed);
        groups.set(key, g);
      }
      console.table(
        [...groups].map(([scenario, g]) => ({
          scenario,
          passed: g.passed,
          total: g.total,
        })),
      );
    })
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
