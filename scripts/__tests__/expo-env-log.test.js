jest.mock("../../node_modules/@expo/cli/build/src/events", () => {
  const event = jest.fn();
  event.path = (value) => value;
  return { events: () => event, shouldReduceLogs: () => false };
});

jest.mock("@expo/env", () => ({
  loadProjectEnv: () => {
    process.env.SIT_REDACTION_TEST = "fixture-secret";
    return {
      result: "loaded",
      loaded: ["SIT_REDACTION_TEST"],
      env: { SIT_REDACTION_TEST: "fixture-secret" },
      files: [".env.test"],
    };
  },
  isEnabled: () => true,
  parseProjectEnv: () => ({
    env: { SIT_REDACTION_TEST: "changed-secret" },
    files: [".env.test"],
  }),
}));

test("Expo initial load and reload retain environment values but redact logs", () => {
  const {
    loadEnvFiles,
    reloadEnvFiles,
    event,
  } = require("../../node_modules/@expo/cli/build/src/utils/nodeEnv");
  try {
    loadEnvFiles("fixture", { silent: true });
    expect(process.env.SIT_REDACTION_TEST).toBe("fixture-secret");
    reloadEnvFiles("fixture");
    expect(process.env.SIT_REDACTION_TEST).toBe("changed-secret");
    expect(event).toHaveBeenCalledTimes(2);
    for (const [, payload] of event.mock.calls) {
      expect(payload.env).toEqual({ SIT_REDACTION_TEST: "<redacted>" });
    }
  } finally {
    delete process.env.SIT_REDACTION_TEST;
  }
});
