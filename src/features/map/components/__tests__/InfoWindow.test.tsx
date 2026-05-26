import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Image } from "react-native";

import type { MarkerData } from "../../core";
import InfoWindow from "../InfoWindow";

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const { Text } = require("react-native");

  const MockMaterialIcons = ({ name }: { name: string }) => <Text>{name}</Text>;
  MockMaterialIcons.displayName = "MockMaterialIcons";
  return MockMaterialIcons;
});

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
    MarkerTagList: ({ attributes }: { attributes: string[] }) => (
      <View>
        <Text>Marker tags: {attributes.join(", ")}</Text>
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
  attributes: ["quiet", "waterfront"],
};

describe("InfoWindow", () => {
  it("expands and collapses the header description", () => {
    const { getByLabelText, getAllByText, queryByText } = render(
      <InfoWindow selectedMarker={marker} />,
    );
    const [headerDescription] = getAllByText(marker.description);

    expect(queryByText("Show more")).toBeNull();

    fireEvent(headerDescription, "textLayout", {
      nativeEvent: {
        lines: [{ text: "line 1" }, { text: "line 2" }, { text: "line 3" }],
      },
    });

    expect(headerDescription.props.numberOfLines).toBe(2);

    fireEvent.press(getByLabelText("Expand marker description"));

    expect(getAllByText(marker.description)[0].props.numberOfLines).toBeUndefined();

    fireEvent.press(getByLabelText("Collapse marker description"));

    expect(getAllByText(marker.description)[0].props.numberOfLines).toBe(2);
  });

  it("keeps long descriptions expandable after clamped text layout fires", () => {
    const { getAllByText, getByText } = render(<InfoWindow selectedMarker={marker} />);
    const [headerDescription] = getAllByText(marker.description);

    fireEvent(headerDescription, "textLayout", {
      nativeEvent: {
        lines: [{ text: "line 1" }, { text: "line 2" }, { text: "line 3" }],
      },
    });

    const [clampedHeaderDescription] = getAllByText(marker.description);
    fireEvent(clampedHeaderDescription, "textLayout", {
      nativeEvent: {
        lines: [{ text: "line 1" }, { text: "line 2" }],
      },
    });

    expect(getAllByText(marker.description)[0].props.numberOfLines).toBe(2);
    expect(getByText("Show more")).toBeTruthy();
  });

  it("does not show the header description toggle when the text fits", () => {
    const shortMarker = {
      ...marker,
      description: "Short description.",
    };
    const { getAllByText, queryByLabelText, queryByText } = render(
      <InfoWindow selectedMarker={shortMarker} />,
    );
    const [headerDescription] = getAllByText(shortMarker.description);

    fireEvent(headerDescription, "textLayout", {
      nativeEvent: {
        lines: [{ text: "Short description." }],
      },
    });

    expect(queryByText("Show more")).toBeNull();
    expect(queryByText("Show less")).toBeNull();
    expect(queryByLabelText("Expand marker description")).toBeNull();
    expect(getAllByText(shortMarker.description)[0].props.numberOfLines).toBeUndefined();
  });

  it("shows marker tags in the marker details header", () => {
    const { getByText } = render(<InfoWindow selectedMarker={marker} />);

    expect(getByText("Marker tags: quiet, waterfront")).toBeTruthy();
  });

  it("does not duplicate the marker description in an about section", () => {
    const { queryByText } = render(<InfoWindow selectedMarker={marker} />);

    expect(queryByText("About this place")).toBeNull();
  });

  it("clears image placeholders when marker photos load", () => {
    const { UNSAFE_getAllByType, queryAllByTestId } = render(
      <InfoWindow selectedMarker={marker} />,
    );

    expect(queryAllByTestId("image-loading-placeholder").length).toBeGreaterThan(0);

    UNSAFE_getAllByType(Image).forEach((image) => {
      fireEvent(image, "load");
    });

    expect(queryAllByTestId("image-loading-placeholder")).toHaveLength(0);
  });

  it("disables the favorite action while favorite status is loading", () => {
    const onToggleFavorite = jest.fn();
    const { getByLabelText } = render(
      <InfoWindow
        selectedMarker={marker}
        isAuthenticated
        isFavoriteStateReady={false}
        onToggleFavorite={onToggleFavorite}
      />,
    );

    const favoriteButton = getByLabelText("Favorite status loading");

    expect(favoriteButton.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(favoriteButton);
    expect(onToggleFavorite).not.toHaveBeenCalled();
  });
});
