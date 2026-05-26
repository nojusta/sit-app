export { appwriteConfig } from "./client";
export {
  adminLogin,
  createUser,
  getAccount,
  getCurrentUser,
  signIn,
  signOut,
} from "./auth";
export {
  assertCanCreateMarker,
  assertCanSubmitByDailyUploadLimit,
  createMarker,
  formatMarkerLocation,
  getUserMarkerUploadCountInLast24Hours,
  listApprovedMarkers,
  listMarkersByAuthor,
  listMarkersByAuthorPage,
  MARKER_DAILY_UPLOAD_LIMIT_MESSAGE,
  rejectMarker,
  subscribeToMarkerChanges,
  updateMarker,
} from "./markers";
export {
  assertCanSubmitByModerationWarnings,
  createModerationWarning,
  getUserModerationWarningCount,
  hasReachedModerationWarningLimit,
  MARKER_CREATION_BLOCKED_BY_WARNINGS_MESSAGE,
  MAX_MODERATION_WARNINGS,
} from "./moderationWarnings";
export {
  getMarkerAverageRating,
  getUserMarkerRating,
  listMarkerRatings,
  listMarkerRatingsPage,
  submitMarkerRating,
} from "./ratings";
export {
  addMarkerFavorite,
  listUserFavoriteMarkerIds,
  removeMarkerFavorite,
  toggleMarkerFavorite,
} from "./favorites";
export { normalizeUploadableImage, uploadProfilePicture } from "./storage";
export type {
  CreateMarkerInput,
  MarkerCoordinate,
  MarkerFavoriteRecord,
  MarkerPageResult,
  MarkerRatingPageResult,
  MarkerRatingRecord,
  MarkerRecord,
  MarkerStatus,
  MarkerTagId,
  RejectMarkerInput,
  SubmitMarkerRatingInput,
  SubmitMarkerRatingResult,
  ToggleMarkerFavoriteResult,
  UpdateMarkerInput,
  UploadableImage,
} from "./types";
export { MARKER_TAG_IDS, MAX_DAILY_MARKER_UPLOADS, MAX_MARKER_ATTRIBUTES } from "./types";
