const { execFileSync } = require("node:child_process");
const { task, screenshot, ios, platform } = require("./measure.cjs");
const { sleep } = require("./common.cjs");
async function main() {
  if (platform !== "ios") throw new Error("Run with --ios");
  for (const scenario of ["deny", "allow"]) {
    execFileSync("xcrun", [
      "simctl",
      "privacy",
      ios,
      scenario === "allow" ? "grant" : "revoke",
      "location",
      "com.sitapp",
    ]);
    await task("os-permission", { metric: "ios-permission", scenario, repeats: 10 });
    screenshot(`permission-${scenario}`);
  }
  for (const scenario of ["denied", "gps-error"]) {
    await task("location", { metric: "ios-fault", scenario, repeats: 10 });
    screenshot(`fault-${scenario}`);
  }
  for (const count of [0, 6]) {
    await task("invalid-rating", { metric: "ios-validation", count, repeats: 10 });
    screenshot(`validation-${count}`);
  }
  for (const count of [1, 5]) {
    await task("weather", { metric: "ios-weather", count });
    screenshot(`weather-${count}`);
  }
  for (const scenario of ["create", "edit"]) {
    await task("show-form", { metric: "ios-form", scenario });
    await sleep(500);
    screenshot(`form-${scenario}`);
  }
  await task("show-form", { scenario: "dashboard" });
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
