const base = require("./eslint.config");
const sonarjs = require("eslint-plugin-sonarjs");
module.exports = [
  ...base,
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**"],
    plugins: { sonarjs },
    rules: {
      complexity: ["warn", { max: 10, variant: "classic" }],
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-identical-conditions": "warn",
      "sonarjs/no-duplicated-branches": "warn",
      "sonarjs/no-all-duplicated-branches": "warn",
    },
  },
];
