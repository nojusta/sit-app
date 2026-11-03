const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const {
  loadState,
  output,
  sleep,
  root,
  beginPhase,
  finishPhase,
} = require("./common.cjs");
const state = loadState();
const adbPath = path.join(os.homedir(), "Library/Android/sdk/platform-tools/adb");
const android = process.env.ANDROID_SERIAL || "emulator-5554";
const ios = process.env.IOS_DEVICE_ID || "1E8E7DD0-6AD3-467A-B255-EFA871FECBA3";
const platform = process.argv.includes("--ios") ? "ios" : "android";
fs.mkdirSync(`${output}/screenshots`, { recursive: true });
fs.mkdirSync(`${output}/raw`, { recursive: true });
const adb = (...args) =>
  execFileSync(adbPath, ["-s", android, ...args], { maxBuffer: 30 * 1024 * 1024 });
async function control(route, body) {
  const r = await fetch(`http://127.0.0.1:${state.port}${route}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
      Connection: "close",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Controller ${r.status} ${route}`);
  return r.json();
}
async function task(kind, options = {}) {
  const { id } = await control("/tasks", { kind, platform, ...options });
  const deadline = Date.now() + (options.timeout || 180000);
  while (Date.now() < deadline) {
    const current = await control(`/tasks/${id}`);
    if (current?.status === "done") {
      if (current.result?.error) throw new Error(`${kind}: ${current.result.error}`);
      console.log(
        `${platform}: ${options.metric || kind}/${options.scenario || options.count || ""} completed`,
      );
      return current;
    }
    await sleep(150);
  }
  throw new Error(
    `No ${platform} result for ${kind} within deadline; open quality-3ld in a SIT_3LD=1 build`,
  );
}
function screenshot(name) {
  const target = `${output}/screenshots/${platform}-${name}.png`;
  if (platform === "android")
    fs.writeFileSync(target, adb("exec-out", "screencap", "-p"));
  else
    execFileSync("xcrun", ["simctl", "io", ios, "screenshot", target], { stdio: "pipe" });
  return target;
}
function pss() {
  const text = adb("shell", "dumpsys", "meminfo", "com.sitapp").toString();
  const match = text.match(/TOTAL PSS:\s*(\d+)/) || text.match(/^\s*TOTAL\s+(\d+)/m);
  if (!match) throw new Error("PSS not available; SIT must be running");
  return { kib: Number(match[1]), text };
}
async function main() {
  const singleKind = process.argv[process.argv.indexOf("--kind") + 1];
  if (process.argv.includes("--kind")) {
    const options = process.argv.includes("--options")
      ? JSON.parse(process.argv[process.argv.indexOf("--options") + 1])
      : {};
    await task(singleKind, options);
    screenshot("demo");
    return;
  }
  const device =
    platform === "android"
      ? {
          model: adb("shell", "getprop", "ro.product.model").toString().trim(),
          androidVersion: adb("shell", "getprop", "ro.build.version.release")
            .toString()
            .trim(),
          api: adb("shell", "getprop", "ro.build.version.sdk").toString().trim(),
          resolution: adb("shell", "wm", "size").toString().trim(),
          density: adb("shell", "wm", "density").toString().trim(),
        }
      : { id: ios };
  const phase = beginPhase(`core-${platform}`);
  fs.writeFileSync(
    `${output}/raw/${platform}-environment.json`,
    JSON.stringify(
      {
        ...device,
        host: os.release(),
        hostArch: os.arch(),
        measuredAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  const timeRepeats = Number(process.env.TIME_REPEATS || 20);
  const repeats = Number(process.env.REPEATS || 10);
  for (const [scenario, delayMs] of [
    ["immediate", 0],
    ["delayed", Number(process.env.GPS_DELAY_MS || 2000)],
  ]) {
    await task("location", { metric: "N1", scenario, delayMs, repeats: timeRepeats });
    screenshot(`N1-${scenario}`);
  }
  for (const scenario of ["transient", "permanent"]) {
    await task("retry", { metric: "N2", scenario, repeats: timeRepeats });
    screenshot(`N2-${scenario}`);
  }
  for (const scenario of ["denied", "gps-error"]) {
    await task("location", { metric: "N3", scenario, repeats });
    screenshot(`N3-${scenario}`);
  }
  for (const scenario of ["transient", "permanent"]) {
    await task("retry", { metric: "N4", scenario, repeats });
    screenshot(`N4-${scenario}`);
  }
  for (const count of [1, 20]) {
    if (platform !== "android") continue;
    for (let trial = 0; trial < 3; trial++) {
      await task("reset-weather");
      await sleep(1000);
      const baseline = pss();
      const pending = task("weather", { metric: "U1", count, trial });
      const samples = [];
      for (let i = 0; i < 8; i++) {
        samples.push(pss().kib);
        await sleep(200);
      }
      const job = await pending;
      const row = {
        measuredAt: new Date().toISOString(),
        platform,
        metric: "U1",
        scenario: String(count),
        trial,
        baselineKiB: baseline.kib,
        samplesKiB: samples,
        peakKiB: Math.max(...samples),
        deltaMiB: Math.max(0, Math.max(...samples) - baseline.kib) / 1024,
        jobId: job.id,
      };
      fs.appendFileSync(`${output}/memory.jsonl`, JSON.stringify(row) + "\n");
      fs.writeFileSync(
        `${output}/raw/memory-${count}-${trial}.txt`,
        baseline.text + "\nSAMPLES PSS KiB: " + JSON.stringify(samples),
      );
    }
    screenshot(`U1-${count}`);
  }
  for (const scenario of ["fresh", "expired"]) {
    for (let trial = 0; trial < repeats; trial++)
      await task("cache-network", { metric: "U2", scenario, trial });
    screenshot(`U2-${scenario}`);
  }
  for (const count of [5, Number(process.env.CONCURRENCY || 20)]) {
    for (let trial = 0; trial < repeats; trial++)
      await task("weather", { metric: "U3", count, trial });
    screenshot(`U3-${count}`);
  }
  for (const count of [1, Number(process.env.CACHE_ENTRIES || 200)]) {
    for (let trial = 0; trial < repeats; trial++)
      await task("cache-capacity", { metric: "U4", count, trial });
    screenshot(`U4-${count}`);
  }
  for (const count of [0, 6]) {
    await task("invalid-rating", {
      metric: "M3",
      scenario: String(count),
      count,
      repeats,
    });
    screenshot(`M3-${count}`);
  }
  if (platform === "android") {
    await task("create-marker", { metric: "R1", scenario: "pending", repeats });
    screenshot("R1-pending");
    await task("open-meteo-smoke", { metric: "integration" });
    screenshot("open-meteo");
  }
  finishPhase(`core-${platform}`, phase);
  console.log("Core measurements saved. UI workflows are run with quality:3ld:ui.");
}
module.exports = { task, screenshot, control, adb, platform, output, root, ios, android };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
