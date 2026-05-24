import {
  MARKER_TAG_IDS,
  MAX_MARKER_ATTRIBUTES,
  type MarkerTagId,
} from "@/services/appwrite/types";

export { MARKER_TAG_IDS, MAX_MARKER_ATTRIBUTES };
export type { MarkerTagId };

type MarkerTagColors = {
  backgroundColor: string;
  selectedBackgroundColor: string;
  borderColor: string;
  selectedBorderColor: string;
  textColor: string;
};

export type MarkerTagDefinition = {
  id: MarkerTagId;
  label: string;
  colors: MarkerTagColors;
};

export const MARKER_TAGS: MarkerTagDefinition[] = [
  {
    id: "quiet",
    label: "Quiet",
    colors: {
      backgroundColor: "rgba(14, 165, 233, 0.12)",
      selectedBackgroundColor: "rgba(14, 116, 144, 0.22)",
      borderColor: "rgba(14, 116, 144, 0.2)",
      selectedBorderColor: "rgba(14, 116, 144, 0.42)",
      textColor: "#0E7490",
    },
  },
  {
    id: "loud",
    label: "Loud",
    colors: {
      backgroundColor: "rgba(239, 68, 68, 0.11)",
      selectedBackgroundColor: "rgba(185, 28, 28, 0.2)",
      borderColor: "rgba(185, 28, 28, 0.18)",
      selectedBorderColor: "rgba(185, 28, 28, 0.38)",
      textColor: "#B91C1C",
    },
  },
  {
    id: "shaded",
    label: "Shaded",
    colors: {
      backgroundColor: "rgba(22, 163, 74, 0.12)",
      selectedBackgroundColor: "rgba(21, 128, 61, 0.22)",
      borderColor: "rgba(21, 128, 61, 0.2)",
      selectedBorderColor: "rgba(21, 128, 61, 0.42)",
      textColor: "#15803D",
    },
  },
  {
    id: "clean",
    label: "Clean",
    colors: {
      backgroundColor: "rgba(13, 148, 136, 0.12)",
      selectedBackgroundColor: "rgba(15, 118, 110, 0.22)",
      borderColor: "rgba(15, 118, 110, 0.2)",
      selectedBorderColor: "rgba(15, 118, 110, 0.42)",
      textColor: "#0F766E",
    },
  },
  {
    id: "nature",
    label: "Nature",
    colors: {
      backgroundColor: "rgba(34, 197, 94, 0.12)",
      selectedBackgroundColor: "rgba(22, 101, 52, 0.2)",
      borderColor: "rgba(22, 101, 52, 0.2)",
      selectedBorderColor: "rgba(22, 101, 52, 0.42)",
      textColor: "#166534",
    },
  },
  {
    id: "urban",
    label: "Urban",
    colors: {
      backgroundColor: "rgba(100, 116, 139, 0.13)",
      selectedBackgroundColor: "rgba(51, 65, 85, 0.2)",
      borderColor: "rgba(51, 65, 85, 0.18)",
      selectedBorderColor: "rgba(51, 65, 85, 0.36)",
      textColor: "#334155",
    },
  },
  {
    id: "waterfront",
    label: "Waterfront",
    colors: {
      backgroundColor: "rgba(6, 182, 212, 0.13)",
      selectedBackgroundColor: "rgba(8, 145, 178, 0.22)",
      borderColor: "rgba(8, 145, 178, 0.2)",
      selectedBorderColor: "rgba(8, 145, 178, 0.42)",
      textColor: "#0891B2",
    },
  },
  {
    id: "scenic",
    label: "Scenic",
    colors: {
      backgroundColor: "rgba(245, 158, 11, 0.13)",
      selectedBackgroundColor: "rgba(180, 83, 9, 0.2)",
      borderColor: "rgba(180, 83, 9, 0.2)",
      selectedBorderColor: "rgba(180, 83, 9, 0.4)",
      textColor: "#B45309",
    },
  },
  {
    id: "work_friendly",
    label: "Work-friendly",
    colors: {
      backgroundColor: "rgba(139, 92, 246, 0.12)",
      selectedBackgroundColor: "rgba(109, 40, 217, 0.2)",
      borderColor: "rgba(109, 40, 217, 0.2)",
      selectedBorderColor: "rgba(109, 40, 217, 0.4)",
      textColor: "#6D28D9",
    },
  },
];

export const getMarkerTagDefinition = (id: MarkerTagId) =>
  MARKER_TAGS.find((tag) => tag.id === id);
