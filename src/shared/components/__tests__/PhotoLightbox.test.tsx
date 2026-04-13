import React from "react";
import { render } from "@testing-library/react-native";

import PhotoLightbox from "../PhotoLightbox";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");

  const createGesture = () => ({
    onUpdate() {
      return this;
    },
    onEnd() {
      return this;
    },
  });

  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    GestureDetector: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    Gesture: {
      Pinch: createGesture,
      Pan: createGesture,
      Simultaneous: (...gestures: unknown[]) => gestures,
    },
  };
});

describe("PhotoLightbox", () => {
  it("renders visible photo viewer content without crashing", () => {
    const { getByText } = render(
      <PhotoLightbox
        visible
        photos={["https://example.com/photo.jpg"]}
        title="Bench by the river"
        onClose={jest.fn()}
      />,
    );

    expect(getByText("Bench by the river")).toBeTruthy();
    expect(getByText("1 / 1")).toBeTruthy();
  });
});
