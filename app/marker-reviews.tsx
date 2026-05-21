import React from "react";
import { useLocalSearchParams } from "expo-router";

import { MarkerReviewsScreen } from "@/features/markers";

const MarkerReviewsRoute: React.FC = () => {
  const params = useLocalSearchParams<{
    markerId?: string | string[];
    markerTitle?: string | string[];
  }>();

  const markerId = Array.isArray(params.markerId) ? params.markerId[0] : params.markerId;
  const markerTitle = Array.isArray(params.markerTitle)
    ? params.markerTitle[0]
    : params.markerTitle;

  return <MarkerReviewsScreen markerId={markerId} markerTitle={markerTitle} />;
};

export default MarkerReviewsRoute;
