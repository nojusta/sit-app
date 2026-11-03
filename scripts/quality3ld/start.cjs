const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const { loadState, output, sleep, root } = require("./common.cjs");
const children = [];
async function running(url, headers) {
  try {
    return (await fetch(url, { headers, signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}
async function main() {
  const state = loadState();
  if (!state.ready || state.cleaned) throw new Error("Run quality:3ld:setup first");
  const controller = `http://127.0.0.1:${state.port}`;
  if (
    !(await running(controller + "/stats", { Authorization: `Bearer ${state.token}` }))
  ) {
    children.push(
      spawn(process.execPath, [path.join(__dirname, "server.cjs")], {
        stdio: "inherit",
        cwd: root,
      }),
    );
  }
  if (!(await running("http://127.0.0.1:8081/status"))) {
    children.push(
      spawn(
        process.execPath,
        [path.join(root, "scripts/expo.js"), "start", "--port", "8081"],
        {
          stdio: "inherit",
          cwd: root,
          env: { ...process.env, SIT_3LD: "1" },
        },
      ),
    );
  } else {
    const response = await fetch("http://127.0.0.1:8081", {
      headers: { "Expo-Platform": "android", Accept: "application/expo+json" },
    });
    const text = await response.text();
    if (!text.includes("SIT_3LD_ENABLED") || !text.includes(state.token))
      throw new Error(
        "Port 8081 is running another configuration. Stop it, then rerun quality:3ld:start.",
      );
  }
  for (let i = 0; i < 120 && !(await running("http://127.0.0.1:8081/status")); i++)
    await sleep(500);
  const adbPath = path.join(os.homedir(), "Library/Android/sdk/platform-tools/adb");
  const adb = (...args) => execFileSync(adbPath, args, { encoding: "utf8" });
  if (
    !adb("devices")
      .split("\n")
      .some((line) => /^emulator-\d+\s+device$/.test(line.trim()))
  ) {
    const emulator = path.join(os.homedir(), "Library/Android/sdk/emulator/emulator");
    const avds = execFileSync(emulator, ["-list-avds"], { encoding: "utf8" })
      .trim()
      .split("\n");
    const avd =
      process.env.ANDROID_AVD ||
      (avds.includes("Pixel_7_API_36_Maestro") ? "Pixel_7_API_36_Maestro" : avds[0]);
    if (!avd) throw new Error("No existing Android AVD found");
    const log = fs.openSync(path.join(output, "emulator.log"), "a");
    spawn(
      emulator,
      ["-avd", avd, "-no-snapshot-load", "-no-audio", "-gpu", "swiftshader"],
      { detached: true, stdio: ["ignore", log, log] },
    ).unref();
  }
  execFileSync(adbPath, ["wait-for-device"]);
  for (
    let i = 0;
    i < 180 && adb("shell", "getprop", "sys.boot_completed").trim() !== "1";
    i++
  )
    await sleep(1000);
  adb("reverse", "tcp:8081", "tcp:8081");
  adb("reverse", "tcp:4313", "tcp:4313");
  if (!adb("shell", "pm", "path", "com.sitapp").includes("package:")) {
    const apk = path.join(root, "android/app/build/outputs/apk/debug/app-debug.apk");
    if (!fs.existsSync(apk))
      throw new Error(
        "No SIT native client/APK. Build Android with npm run android first.",
      );
    adb("install", "-r", apk);
  }
  adb("shell", "am", "force-stop", "com.sitapp");
  adb(
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    "sit-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081",
  );
  if (process.argv.includes("--ios")) {
    const id = process.env.IOS_DEVICE_ID || "1E8E7DD0-6AD3-467A-B255-EFA871FECBA3";
    const inventory = JSON.parse(
      execFileSync("xcrun", ["simctl", "list", "devices", "--json"], {
        encoding: "utf8",
      }),
    );
    const device = Object.values(inventory.devices)
      .flat()
      .find((d) => d.udid === id);
    if (!device) throw new Error("Set IOS_DEVICE_ID to an existing simulator");
    if (device.state !== "Booted") execFileSync("xcrun", ["simctl", "boot", id]);
    execFileSync("xcrun", [
      "simctl",
      "openurl",
      id,
      "sit-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081",
    ]);
  }
  console.log(
    "3LD Android ready. Run quality:3ld:measure in another terminal. Ctrl+C stops servers started by this command.",
  );
}
process.on("SIGINT", () => {
  children.forEach((child) => child.kill("SIGINT"));
  process.exit();
});
main().catch((error) => {
  children.forEach((child) => child.kill("SIGINT"));
  console.error(error.message);
  process.exitCode = 1;
});
