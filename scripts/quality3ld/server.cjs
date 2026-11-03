const http = require("node:http");
const fs = require("node:fs");
const { loadState, output, unique, must, collectionPath } = require("./common.cjs");
const { bootstrap } = require("./backend.cjs");
const state = loadState();
const tasks = new Map();
let weatherRequests = 0;
let deviceInfo = {};
function fixture() {
  const time = new Date();
  time.setMinutes(0, 0, 0);
  return {
    current: {
      time: time.toISOString().slice(0, 16),
      temperature_2m: 14,
      apparent_temperature: 12,
      precipitation: 0,
      precipitation_probability: 20,
      weather_code: 3,
      wind_speed_10m: 12,
      relative_humidity_2m: 70,
      cloud_cover: 80,
    },
    hourly: {
      time: Array.from({ length: 25 }, (_, i) =>
        new Date(time.getTime() + i * 3600000).toISOString().slice(0, 16),
      ),
      temperature_2m: Array(25).fill(14),
      apparent_temperature: Array(25).fill(12),
      precipitation: Array(25).fill(0),
      precipitation_probability: Array(25).fill(20),
      weather_code: Array(25).fill(3),
    },
  };
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  if (req.headers.authorization !== `Bearer ${state.token}`) {
    res.writeHead(401);
    return res.end("{}");
  }
  res.setHeader("Content-Type", "application/json");
  try {
    const url = new URL(req.url, "http://localhost");
    let input = {};
    if (req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      input = JSON.parse(body || "{}");
    }
    let result;
    if (url.pathname === "/bootstrap") {
      const fresh = await bootstrap();
      result = {
        user: { id: fresh.users[0].id, jwt: fresh.users[0].jwt },
        markerId: fresh.markerId,
        fixture: fixture(),
        runId: fresh.runId,
      };
    } else if (url.pathname === "/weather") {
      weatherRequests++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      result = fixture();
    } else if (url.pathname === "/backend-summary") {
      if (url.searchParams.get("metric")?.startsWith("RAM")) {
        const count = Number(url.searchParams.get("metric").slice(3));
        const observations = fs
          .readFileSync(`${output}/memory.jsonl`, "utf8")
          .trim()
          .split("\n")
          .map(JSON.parse)
          .filter((r) => Number(r.scenario) === count);
        result = {
          tool: "Android adb shell dumpsys meminfo com.sitapp",
          markers: count,
          measurements: observations.map((r) => ({
            trial: r.trial + 1,
            baselineMiB: +(r.baselineKiB / 1024).toFixed(2),
            peakMiB: +(r.peakKiB / 1024).toFixed(2),
            increaseMiB: +r.deltaMiB.toFixed(2),
          })),
        };
        res.end(JSON.stringify(result));
        return;
      }
      const rows = fs
        .readFileSync(`${output}/backend.jsonl`, "utf8")
        .trim()
        .split("\n")
        .map(JSON.parse);
      const groups = new Map();
      for (const row of rows.filter(
        (r) =>
          !url.searchParams.get("metric") ||
          r.metric.startsWith(url.searchParams.get("metric")),
      )) {
        const key = `${row.metric}/${row.scenario}`;
        const g = groups.get(key) || { scenario: key, correct: 0, attempts: 0, HTTP: [] };
        g.attempts++;
        g.correct += Number(row.passed);
        if (!g.HTTP.includes(row.status)) g.HTTP.push(row.status);
        groups.set(key, g);
      }
      result = {
        tool: "Appwrite REST API, test-user JWT",
        measured: [...groups.values()],
      };
    } else if (url.pathname === "/real-weather") {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=54.6858&longitude=25.2870&current=temperature_2m",
        { signal: AbortSignal.timeout(15000) },
      );
      const data = await response.json();
      result = {
        status: response.status,
        hasTemperature: typeof data.current?.temperature_2m === "number",
      };
    } else if (url.pathname === "/reset-ratings") {
      const current = loadState();
      const listing = await must(
        `${collectionPath(current.collections.ratings)}/documents`,
        { admin: true },
      );
      for (const document of listing.documents)
        await must(
          `${collectionPath(current.collections.ratings)}/documents/${document.$id}`,
          { method: "DELETE", admin: true },
        );
      result = { removed: listing.documents.length };
    } else if (url.pathname === "/delete-test-marker") {
      const current = loadState();
      const resource = `${collectionPath(current.collections.markers)}/documents/${encodeURIComponent(input.id)}`;
      const document = await must(resource, { admin: true });
      if (
        document.author_id !== current.users[0].id ||
        !document.title.startsWith("3LD ")
      )
        throw new Error("Not a registered test author/marker");
      await must(resource, { method: "DELETE", admin: true });
      result = { ok: true };
    } else if (url.pathname === "/rating-count") {
      const current = loadState();
      const listing = await must(
        `${collectionPath(current.collections.ratings)}/documents`,
        { admin: true },
      );
      result = { count: listing.total, scores: listing.documents.map((d) => d.score) };
    } else if (url.pathname === "/stats") result = { weatherRequests, deviceInfo };
    else if (url.pathname === "/register") {
      deviceInfo[input.platform] = input;
      fs.writeFileSync(`${output}/devices.json`, JSON.stringify(deviceInfo, null, 2));
      result = { ok: true };
    } else if (url.pathname === "/tasks" && req.method === "POST") {
      const id = unique();
      tasks.set(id, { ...input, id, status: "queued" });
      result = { id };
    } else if (url.pathname === "/next") {
      const task = [...tasks.values()].find(
        (t) => t.status === "queued" && t.platform === url.searchParams.get("platform"),
      );
      if (task) task.status = "running";
      result = task || null;
    } else if (url.pathname === "/result") {
      const task = tasks.get(input.id);
      if (!task) throw new Error("Unknown task");
      Object.assign(task, { status: "done", result: input.result });
      fs.appendFileSync(
        `${output}/mobile.${task.platform}.jsonl`,
        JSON.stringify({ ...task, measuredAt: new Date().toISOString() }) + "\n",
      );
      result = { ok: true };
    } else if (url.pathname.startsWith("/tasks/"))
      result = tasks.get(url.pathname.split("/").at(-1)) || null;
    else {
      res.writeHead(404);
      result = {};
    }
    res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});
server.listen(state.port, "127.0.0.1", () =>
  console.log(
    `3LD controller listening on localhost:${state.port}; authenticated local emulator traffic only.`,
  ),
);
