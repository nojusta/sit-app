import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import MarkerRatingCard from "../MarkerRatingCard";

describe("MarkerRatingCard", () => {
  it("renders the optional comment field and submits when enabled", () => {
    const onSubmit = jest.fn();
    const onCommentChange = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <MarkerRatingCard
        averageRating={4.4}
        score={4}
        comment=""
        errorMessage={null}
        hasExistingRating={false}
        isAuthenticated={true}
        isLoadingExistingRating={false}
        isSubmitting={false}
        onScoreChange={jest.fn()}
        onCommentChange={onCommentChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.changeText(
      getByPlaceholderText(
        "Share a short note about comfort, shade, noise, or why this place works.",
      ),
      "Quiet in the morning.",
    );
    fireEvent.press(getByText("Save rating"));

    expect(onCommentChange).toHaveBeenCalledWith("Quiet in the morning.");
    expect(onSubmit).toHaveBeenCalled();
  });
});
