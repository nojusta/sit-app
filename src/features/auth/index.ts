export { default as AuthProvider, useAuthContext } from "./context/AuthContext";
export type { User } from "./context/AuthContext";
export {
  getDefaultUsername,
  isInvalidCredentialsError,
  normalizeEmail,
  normalizeRegistrationForm,
  validateLoginForm,
  validateRegistrationForm,
} from "./utils";
export type {
  LoginFormValues,
  NormalizedRegistrationFormValues,
  RegistrationFormValues,
} from "./utils";
