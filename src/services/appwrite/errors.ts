const getErrorCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "number"
    ? error.code
    : null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ? error.message
      : "";

export const isExpectedUnauthenticatedError = (error: unknown) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === 401 ||
    message.includes("missing scopes") ||
    message.includes("role: guests") ||
    message.includes("current session not found")
  );
};

export const isAuthorizationError = (error: unknown) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === 401 ||
    code === 403 ||
    message.includes("not authorized") ||
    message.includes("not authorised") ||
    message.includes("permission") ||
    message.includes("missing scopes")
  );
};

export const isMissingMarkerAttributesSchemaError = (error: unknown) =>
  error instanceof Error && /unknown attribute:\s*"?attributes"?/iu.test(error.message);

export const toMarkerAttributesSchemaError = () =>
  new Error(
    "Marker tags are not enabled in Appwrite yet. Run npm run appwrite:sync-markers before submitting tagged markers.",
  );
