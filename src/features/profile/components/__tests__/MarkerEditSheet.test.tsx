import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { MarkerRecord } from "@/services/appwrite";
import MarkerEditSheet from "../MarkerEditSheet";

jest.mock("@/shared/components", () => {
  const actual = jest.requireActual("@/shared/components");
  const React = require("react");
  const { View: MockView } = require("react-native");

  return {
    ...actual,
    BottomSheet: ({
      header,
      children,
    }: {
      header: React.ReactNode;
      children: React.ReactNode;
    }) => (
      <MockView>
        {header}
        {children}
      </MockView>
    ),
  };
});

const marker: MarkerRecord = {
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
};

describe("MarkerEditSheet", () => {
  it("allows changing the description field", () => {
    const onDescriptionChange = jest.fn();
    const { getByPlaceholderText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <MarkerEditSheet
          marker={marker}
          description={marker.description}
          queuedPhotos={[]}
          isSubmitting={false}
          onDescriptionChange={onDescriptionChange}
          onAddPhotos={jest.fn()}
          onRemoveQueuedPhoto={jest.fn()}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    fireEvent.changeText(
      getByPlaceholderText("Add more context for this sitting spot"),
      "Updated description",
    );

    expect(onDescriptionChange).toHaveBeenCalledWith("Updated description");
  });
});
