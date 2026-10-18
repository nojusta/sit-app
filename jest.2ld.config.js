const base = require("./package.json").jest;
const targets = require("./scripts/quality/targets.json");
module.exports = {
  ...base,
  rootDir: __dirname,
  testMatch: [
    "<rootDir>/src/**/__tests__/*.2ld.test.{ts,tsx}",
    "<rootDir>/src/features/map/hooks/__tests__/useUserLocation.test.tsx",
    "<rootDir>/src/features/weather/utils/__tests__/weatherChanges.test.ts",
    "<rootDir>/src/services/weather/__tests__/openMeteo.test.ts",
    "<rootDir>/src/services/appwrite/__tests__/ratings.test.ts",
    "<rootDir>/src/services/appwrite/__tests__/markers.test.ts",
  ],
  collectCoverageFrom: [...new Set(targets.map((t) => t.file))],
  coverageProvider: "babel",
  coverageDirectory: "reports/2ld/coverage",
  coverageReporters: ["text", "json", "json-summary", "lcov", "html"],
};
