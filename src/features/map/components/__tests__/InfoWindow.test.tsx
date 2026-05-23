import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import type { MarkerData } from "../../core";
import InfoWindow from "../InfoWindow";

jest.mock("@/features/weather", () => {
  const { Text } = require("react-native");

  return {
    MarkerWeatherCard: () => <Text>Weather card</Text>,
    useMarkerWeather: () => ({
      snapshot: null,
      isLoading: false,
      errorMessage: null,
      noticeMessage: null,
      changeMessage: null,
    }),
  };
});

jest.mock("@/features/markers", () => {
  const { Text, View } = require("react-native");

  return {
    MarkerRatingCard: () => (
      <View>
        <Text>Rating card</Text>
      </View>
    ),
    MarkerReviewsCard: () => (
      <View>
        <Text>Reviews card</Text>
      </View>
    ),
    useMarkerRating: () => ({
      averageRating: 4.2,
      score: 0,
      comment: "",
      reviews: [],
      errorMessage: null,
      hasExistingRating: false,
      isAuthenticated: true,
      isLoadingExistingRating: false,
      isLoadingReviews: false,
      isSubmitting: false,
      reviewsErrorMessage: null,
      handleScoreChange: jest.fn(),
      handleCommentChange: jest.fn(),
      handleSubmit: jest.fn(),
    }),
  };
});

jest.mock("@/shared/components", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return {
    BottomSheet: ({
      visible,
      header,
      children,
    }: {
      visible: boolean;
      header: React.ReactNode;
      children: React.ReactNode;
    }) =>
      visible ? (
        <View>
          {header}
          {children}
        </View>
      ) : null,
    CustomButton: ({
      title,
      handlePress,
    }: {
      title: string;
      handlePress: () => void;
    }) => (
      <TouchableOpacity onPress={handlePress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    ImageLoadingPlaceholder: () => <View testID="image-loading-placeholder" />,
    PhotoLightbox: () => null,
  };
});

const marker: MarkerData = {
  id: "marker-1",
  title: "Bench near Cathedral",
  description:
    "A longer marker description with useful details about shade, nearby noise, and why this sitting spot is worth checking before starting navigation.",
  coordinate: {
    latitude: 54.6872,
    longitude: 25.2797,
  },
  location: "54.687200,25.279700",
  status: "approved",
  authorId: "admin-user",
  createdAt: "2026-05-11T09:00:00.000Z",
  photoUrl: "https://example.com/photo.jpg",
  photoUrls: ["https://example.com/photo.jpg"],
  averageRating: 4.2,
};

describe("InfoWindow", () => {
  it("expands and collapses the header description", () => {
    const { getByLabelText, getAllByText } = render(
      <InfoWindow selectedMarker={marker} />,
    );
    const [headerDescription] = getAllByText(marker.description);

    expect(headerDescription.props.numberOfLines).toBe(2);

    fireEvent.press(getByLabelText("Expand marker description"));

    expect(getAllByText(marker.description)[0].props.numberOfLines).toBeUndefined();

    fireEvent.press(getByLabelText("Collapse marker description"));

    expect(getAllByText(marker.description)[0].props.numberOfLines).toBe(2);
  });
});
