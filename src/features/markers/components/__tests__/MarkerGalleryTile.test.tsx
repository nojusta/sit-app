import React from "react";
import { render } from "@testing-library/react-native";

import type { MarkerRecord } from "@/services/appwrite";
import MarkerGalleryTile from "../MarkerGalleryTile";

const createMarker = (overrides?: Partial<MarkerRecord>): MarkerRecord => ({
  id: "marker-1",
  title: "Bench by the river",
  description: "Quiet place",
  coordinate: {
    latitude: 54.6872,
    longitude: 25.2797,
  },
  location: "Vilnius",
  status: "approved",
  authorId: "user-1",
  createdAt: "2026-04-12T12:00:00.000Z",
  photoUrl: null,
  photoUrls: [],
  ...overrides,
});

describe("MarkerGalleryTile", () => {
  it("renders the no-photo fallback by default", () => {
    const { getByTestId } = render(<MarkerGalleryTile marker={createMarker()} />);

    expect(getByTestId("marker-gallery-fallback")).toBeTruthy();
  });

  it("keeps the same fallback visible when selected", () => {
    const { getByTestId, getByText, queryByText } = render(
      <MarkerGalleryTile marker={createMarker()} isSelected onEditPress={jest.fn()} />,
    );

    expect(getByTestId("marker-gallery-fallback")).toBeTruthy();
    expect(getByText("Edit marker")).toBeTruthy();
    expect(queryByText("No photo yet")).toBeNull();
  });

  it("keeps photo cards on the image path and blurs them when selected", () => {
    const { getByTestId } = render(
      <MarkerGalleryTile
        marker={createMarker({ photoUrl: "https://example.com/photo.jpg" })}
        isSelected
      />,
    );

    expect(getByTestId("marker-gallery-preview").props.blurRadius).toBe(10);
  });
});
