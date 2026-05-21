import React from "react";
import { render } from "@testing-library/react-native";

import MarkerReviewsCard from "../MarkerReviewsCard";

describe("MarkerReviewsCard", () => {
  it("renders public reviews with author name, stars, and comment", () => {
    const { getByText } = render(
      <MarkerReviewsCard
        reviews={[
          {
            id: "rating-1",
            markerId: "marker-1",
            userId: "user-1",
            authorName: "Matas",
            score: 4,
            comment: "Rami vieta po medziais.",
            createdAt: "2026-05-15T10:00:00.000Z",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ]}
        isLoading={false}
        errorMessage={null}
      />,
    );

    expect(getByText("Matas")).toBeTruthy();
    expect(getByText("★★★★☆")).toBeTruthy();
    expect(getByText("Rami vieta po medziais.")).toBeTruthy();
  });
});
