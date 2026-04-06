import {
  getDefaultUsername,
  isInvalidCredentialsError,
  normalizeEmail,
  normalizeRegistrationForm,
  validateLoginForm,
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
    expect(validateRegistrationForm({ username: "", email: "", password: "" })).toBe(
      "Please fill in display name, email and password.",
    );
    expect(
      validateRegistrationForm({
        username: "Demo User",
        email: "invalid-email",
        password: "password123",
      }),
    ).toBe("Please enter a valid email address.");
    expect(
      validateRegistrationForm({
        username: "Demo User",
        email: "demo@example.com",
        password: "short",
      }),
    ).toBe("Password must be at least 8 characters long.");
  });

  it("accepts valid registration input", () => {
    expect(
      validateRegistrationForm({
        username: "Demo User",
        email: "demo@example.com",
        password: "password123",
      }),
    ).toBeNull();
  });

  it("rejects invalid login input", () => {
    expect(validateLoginForm({ email: "", password: "" })).toBe(
      "Please fill in email and password.",
    );
    expect(validateLoginForm({ email: "invalid-email", password: "password123" })).toBe(
      "Please enter a valid email address.",
    );
  });

  it("accepts valid login input", () => {
    expect(
      validateLoginForm({ email: "demo@example.com", password: "password123" }),
    ).toBe(null);
  });

  it("detects invalid-credentials Appwrite errors", () => {
    expect(isInvalidCredentialsError({ code: 401 })).toBe(true);
    expect(isInvalidCredentialsError({ type: "user_invalid_credentials" })).toBe(true);
    expect(isInvalidCredentialsError(new Error("Network error"))).toBe(false);
    expect(isInvalidCredentialsError({ code: 500 })).toBe(false);
  });
});
