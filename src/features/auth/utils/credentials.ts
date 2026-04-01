const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegistrationFormValues {
  username?: string;
  email: string;
  password: string;
}

export interface NormalizedRegistrationFormValues {
  username: string;
  email: string;
  password: string;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const getDefaultUsername = (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const [localPart] = normalizedEmail.split("@");
  const candidate = localPart?.trim();

  return candidate || "User";
};

export const normalizeRegistrationForm = (
  values: RegistrationFormValues,
): NormalizedRegistrationFormValues => ({
  username: values.username?.trim() || getDefaultUsername(values.email),
  email: normalizeEmail(values.email),
  password: values.password,
});

const validateEmailAndPassword = (values: LoginFormValues): string | null => {
  const email = normalizeEmail(values.email);

  if (!email || !values.password) {
    return "Please fill in email and password.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }

  if (values.password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  return null;
};

export const validateRegistrationForm = (values: RegistrationFormValues): string | null =>
  validateEmailAndPassword(values);

export const validateLoginForm = (values: LoginFormValues): string | null => {
  const email = normalizeEmail(values.email);

  if (!email || !values.password) {
    return "Please fill in email and password.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }

  return null;
};

const getErrorCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code: unknown }).code === "number"
    ? (error as { code: number }).code
    : null;

const getErrorType = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "type" in error &&
  typeof (error as { type: unknown }).type === "string"
    ? (error as { type: string }).type
    : "";

export const isInvalidCredentialsError = (error: unknown) => {
  const code = getErrorCode(error);
  const type = getErrorType(error).toLowerCase();

  return code === 401 || type.includes("invalid_credentials");
};
