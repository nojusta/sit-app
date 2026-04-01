const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

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

export const validateRegistrationForm = (
  values: RegistrationFormValues,
): string | null => {
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
