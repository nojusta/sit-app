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
  createMarker,
  formatMarkerLocation,
  listApprovedMarkers,
  listMarkersByAuthor,
  listMarkersByAuthorPage,
  subscribeToMarkerChanges,
  updateMarker,
} from "./markers";
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
  SubmitMarkerRatingInput,
  SubmitMarkerRatingResult,
  ToggleMarkerFavoriteResult,
  UpdateMarkerInput,
  UploadableImage,
} from "./types";
export { MARKER_TAG_IDS, MAX_MARKER_ATTRIBUTES } from "./types";
