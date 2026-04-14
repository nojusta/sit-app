import { Image, Platform } from "react-native";

import type { MapCameraSnapshot } from "../../core";

export const INITIAL_CAMERA: MapCameraSnapshot = {
  target: {
    latitude: 54.6872,
    longitude: 25.2797,
  },
  zoom: 14.5,
};

export const FOCUS_ZOOM = 16.5;
export const CENTER_ZOOM = 17.5;
export const DRAFT_MARKER_ID = "draft-marker";
export const NAVIGATION_START_TIMEOUT_MS = 15000;
export const NAVIGATION_LOCATION_TIMEOUT_MS = 4000;
export const NAVIGATION_VIEW_RETRY_DELAY_MS = 250;
export const NAVIGATION_VIEW_RETRY_ATTEMPTS = 4;
export const NAVIGATION_UI_DISABLED = 1;
export const STOP_BUTTON_RIGHT_OFFSET = 16;
export const STOP_BUTTON_BOTTOM_OFFSET = Platform.select({
  ios: 125,
  android: 117,
  default: 117,
});
export const CUSTOM_MARKER_ASSET_MODULE = require("../../../../../assets/images/custom-marker.png");
const resolvedCustomMarkerAsset = Image.resolveAssetSource(CUSTOM_MARKER_ASSET_MODULE);
// Native size knobs live in the Google SDK patch file:
// iOS -> ObjectTranslationUtil.mm:kMarkerBaseWidth / kDraggableMarkerBaseWidth / kClusterMarkerBaseWidth
// Android -> MapViewController.java:CUSTOM_MARKER_BASE_SCALE / CLUSTER_MARKER_SCALE
export const CUSTOM_MARKER_IMAGE_CANDIDATES = (
  Platform.select({
    ios: [resolvedCustomMarkerAsset?.uri],
    android: [
      "markers/custom-marker.png",
      "custom-marker.png",
      "custom-marker",
      resolvedCustomMarkerAsset?.uri,
    ],
    default: [resolvedCustomMarkerAsset?.uri],
  }) ?? []
)
  .filter((value): value is string => typeof value === "string" && value.length > 0)
  .filter((value, index, values) => values.indexOf(value) === index);
