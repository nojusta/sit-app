const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { task, screenshot, platform, output, ios, android } = require("./measure.cjs");
const { sleep } = require("./common.cjs");
const maestro =
  process.env.MAESTRO_BIN || path.join(os.homedir(), ".maestro/bin/maestro");
const device = platform === "android" ? android : ios;
fs.mkdirSync(`${output}/flows`, { recursive: true });

function flow(name, commands) {
  const file = `${output}/flows/${platform}-${name}.yaml`;
  fs.writeFileSync(
    file,
    `appId: com.sitapp\n---\n- launchApp:\n    stopApp: false\n${commands}\n`,
  );
  try {
    const log = execFileSync(maestro, ["--device", device, "test", file], {
      timeout: 360000,
      maxBuffer: 4 * 1024 * 1024,
    });
    fs.writeFileSync(file + ".log", log);
    return true;
  } catch (error) {
    fs.writeFileSync(
      file + ".log",
      String(error.stdout || "") + String(error.stderr || error.message),
    );
    return false;
  }
}
function hierarchy(name) {
  const text = execFileSync(maestro, ["--device", device, "hierarchy"], {
    timeout: 90000,
    maxBuffer: 8 * 1024 * 1024,
  }).toString();
  fs.writeFileSync(`${output}/raw/${platform}-${name}.json`, text);
  const first = text.indexOf("{");
  if (first < 0) throw new Error("No native hierarchy JSON returned");
  return JSON.parse(text.slice(first));
}
const { attributeLabels } = require("./a11y.cjs");
async function main() {
  const repeats = Number(process.env.REPEATS || 10);
  const tags = [
    "Quiet",
    "Loud",
    "Shaded",
    "Clean",
    "Nature",
    "Urban",
    "Waterfront",
    "Scenic",
    "Work-friendly",
  ].map((x) => `${x} tag`);
  const ratingsOnly = process.argv.includes("--ratings-only");
  const uiRows = ratingsOnly
    ? JSON.parse(fs.readFileSync(`${output}/ui.${platform}.json`, "utf8")).filter(
        (row) => row.metric !== "M4",
      )
    : [];
  for (const form of ratingsOnly ? [] : ["create", "edit"]) {
    await task("show-form", { scenario: form });
    await sleep(1000);
    const labels = new Set();
    const reuse =
      process.argv.includes("--resume") &&
      Array.from(
        { length: 5 },
        (_, i) => `${output}/raw/${platform}-${form}-${i}.json`,
      ).every((file) => fs.existsSync(file));
    for (let position = 0; position < 5; position++) {
      const snapshot = reuse
        ? JSON.parse(
            fs.readFileSync(`${output}/raw/${platform}-${form}-${position}.json`, "utf8"),
          )
        : hierarchy(`${form}-${position}`);
      for (const label of attributeLabels(snapshot)) labels.add(label);
      if (!reuse) {
        screenshot(`${form}-${position}`);
        if (position < 4) flow(`${form}-scroll-${position}`, "- scroll");
      }
    }
    const expected = [
      ...tags,
      ...(form === "create"
        ? [
            "Title",
            "Description",
            "Back to placement",
            "Take photo",
            "Choose photo",
            "Submit marker",
            "Discard draft",
          ]
        : ["Description", "Add photos", "Submit edits", "Close"]),
    ];
    const present = expected.filter((label) => labels.has(label));
    uiRows.push({
      metric: "R3",
      scenario: form,
      platform,
      expected,
      present,
      missing: expected.filter((x) => !labels.has(x)),
      percent: (present.length / expected.length) * 100,
    });
    const actionCases =
      form === "create"
        ? [
            { label: "Choose photo", callback: "choose-photo" },
            { label: "Submit marker", callback: "submit" },
            { label: "Discard draft", callback: "discard" },
          ]
        : [
            { label: "Add photos", callback: "add-photos" },
            { label: "Submit edits", callback: "submit-edits" },
            { label: "Close", callback: "close" },
          ];
    await task("show-form", { scenario: form });
    const actionsYaml = actionCases
      .map(
        (action) =>
          "- scrollUntilVisible:\n    element: " +
          JSON.stringify(action.label) +
          "\n    direction: DOWN\n    timeout: 15000\n- tapOn: " +
          JSON.stringify(action.label),
      )
      .join("\n");
    const openLabel = form === "create" ? "(?i)Open creation form" : "(?i)Open edit form";
    const repeatCommands = (actionsYaml + "\n- tapOn: " + JSON.stringify(openLabel))
      .split("\n")
      .map((line) => "    " + line)
      .join("\n");
    const passedFlow = flow(
      form + "-actions",
      "- repeat:\n    times: " +
        repeats +
        "\n    commands:\n" +
        repeatCommands
          .split("\n")
          .map((line) => "  " + line)
          .join("\n"),
    );
    const result = await task("actions");
    const recorded = result.result.actions;
    for (let trial = 0; trial < repeats; trial++) {
      const attempts = actionCases.map((action, i) => ({
        ...action,
        passed: recorded[trial * actionCases.length + i] === action.callback,
      }));
      uiRows.push({
        metric: "R4",
        scenario: form,
        platform,
        trial,
        flowPassed: passedFlow,
        attempts,
        percent: (attempts.filter((x) => x.passed).length / attempts.length) * 100,
      });
    }
    fs.writeFileSync(
      output + "/ui." + platform + ".json",
      JSON.stringify(uiRows, null, 2),
    );
    screenshot(`R4-${form}`);
  }
  for (const taps of [1, 5]) {
    for (let trial = 0; trial < repeats; trial++) {
      await task("show-rating", { metric: "M4", scenario: String(taps), trial });
      await sleep(500);
      const passedFlow = flow(
        `rating-${taps}-${trial}`,
        `- runFlow:\n    when:\n      visible: "OK"\n    commands:\n      - tapOn: "OK"\n- scrollUntilVisible:\n    element: "Save rating|Update rating"\n    direction: DOWN\n    timeout: 15000\n- tapOn:\n    text: "Save rating|Update rating"\n    repeat: ${taps}\n    delay: 30\n    retryTapIfNoChange: false\n    waitToSettleTimeoutMs: 0`,
      );
      await sleep(1800);
      const result = await task("rating-result");
      uiRows.push({
        metric: "M4",
        scenario: String(taps),
        platform,
        trial,
        taps,
        count: result.result.count,
        writes: result.result.writes,
        flowPassed: passedFlow,
        passed:
          passedFlow && result.result.count === 1 && result.result.writes.length === 1,
      });
      fs.writeFileSync(`${output}/ui.${platform}.json`, JSON.stringify(uiRows, null, 2));
      screenshot(`M4-${taps}-${trial}`);
    }
  }
  flow(
    "rating-final-dismiss",
    '- runFlow:\n    when:\n      visible: "OK"\n    commands:\n      - tapOn: "OK"',
  );
  await task("show-form", { scenario: "dashboard" });
  console.log("UI/a11y measurements saved; no coordinate-based actions used.");
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { attributeLabels };
