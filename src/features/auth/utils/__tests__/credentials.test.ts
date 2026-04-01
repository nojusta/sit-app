import {
  getDefaultUsername,
  normalizeEmail,
  normalizeRegistrationForm,
  validateRegistrationForm,
} from "../index";

describe("credentials helpers", () => {
  it("normalizes registration values", () => {
    expect(
      normalizeRegistrationForm({
        username: "  Jonas  ",
        email: "  TEST@Example.com ",
        password: "password123",
      }),
    ).toEqual({
      username: "Jonas",
      email: "test@example.com",
      password: "password123",
    });
  });

  it("derives a default username from email", () => {
    expect(getDefaultUsername("demo.user@example.com")).toBe("demo.user");
  });

  it("normalizes email", () => {
    expect(normalizeEmail("  DEMO@Example.com ")).toBe("demo@example.com");
  });

  it("rejects invalid registration input", () => {
    expect(validateRegistrationForm({ email: "", password: "" })).toBe(
      "Please fill in email and password.",
    );
    expect(
      validateRegistrationForm({ email: "invalid-email", password: "password123" }),
    ).toBe("Please enter a valid email address.");
    expect(
      validateRegistrationForm({ email: "demo@example.com", password: "short" }),
    ).toBe("Password must be at least 8 characters long.");
  });

  it("accepts valid registration input", () => {
    expect(
      validateRegistrationForm({
        username: "",
        email: "demo@example.com",
        password: "password123",
      }),
    ).toBeNull();
  });
});
