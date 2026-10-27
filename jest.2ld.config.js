const base = require("./package.json").jest;
const targets = require("./scripts/quality/targets.json");
module.exports = {
  ...base,
  rootDir: __dirname,
  // Keep this laboratory's prompt-controlled tests separate from older AI tests.
  testMatch: ["<rootDir>/src/**/__tests__/*.2ld.test.{ts,tsx}"],
  collectCoverageFrom: [...new Set(targets.map((t) => t.file))],
  coverageProvider: "babel",
  coverageDirectory: "reports/2ld/coverage",
  coverageReporters: ["text", "json", "json-summary", "lcov", "html"],
};
