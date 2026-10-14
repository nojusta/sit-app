const { existsSync } = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const env = { ...process.env };
const defaultDeveloperDir = "/Applications/Xcode.app/Contents/Developer";

// Prefer the current Xcode installation without changing the user's global
// xcode-select setting. An explicit DEVELOPER_DIR always takes precedence.
if (
  process.platform === "darwin" &&
  !env.DEVELOPER_DIR &&
  existsSync(defaultDeveloperDir)
) {
  env.DEVELOPER_DIR = defaultDeveloperDir;
}

const expoCli = path.join(path.dirname(require.resolve("expo/package.json")), "bin/cli");
const child = spawn(process.execPath, [expoCli, ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
