import { StyleSheet } from "react-native";

import {
  STOP_BUTTON_BOTTOM_OFFSET,
  STOP_BUTTON_RIGHT_OFFSET,
} from "./googleMapSurface.constants";

export const googleMapSurfaceStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigationSurfaceOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  navigationSurfaceHidden: {
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.08)",
  },
  loadingCard: {
    minWidth: 220,
    borderRadius: 18,
    backgroundColor: "rgba(31, 41, 55, 0.9)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#F9FAFB",
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
  },
  loadingHint: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  unavailableState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F3F4F6",
  },
  unavailableCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 5,
  },
  unavailableTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
    textAlign: "center",
  },
  unavailableText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    textAlign: "center",
  },
  stopNavigationOverlay: {
    position: "absolute",
    right: STOP_BUTTON_RIGHT_OFFSET,
    bottom: STOP_BUTTON_BOTTOM_OFFSET,
    zIndex: 10,
  },
});
