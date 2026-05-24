import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { getMarkerTagDefinition } from "../../constants/tags";
import MarkerTagList from "../MarkerTagList";
import MarkerTagSelector from "../MarkerTagSelector";

describe("MarkerTagSelector", () => {
  it("adds and removes marker tags", () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MarkerTagSelector value={["quiet"]} onChange={onChange} />,
    );

    fireEvent.press(getByText("Clean"));
    expect(onChange).toHaveBeenCalledWith(["quiet", "clean"]);

    fireEvent.press(getByText("Quiet"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("renders selected tags with real background color, matching border, spacing, and selected feedback", () => {
    const quietTag = getMarkerTagDefinition("quiet");
    const { getByTestId } = render(
      <MarkerTagSelector value={["quiet"]} onChange={jest.fn()} />,
    );

    const quietPill = getByTestId("quiet-tag-pill");
    const quietPillStyles = StyleSheet.flatten(
      typeof quietPill.props.style === "function"
        ? quietPill.props.style({ pressed: false })
        : quietPill.props.style,
    );
    const containerStyles = StyleSheet.flatten(
      getByTestId("marker-tag-selector-pills").props.style,
    );

    expect(quietPillStyles.backgroundColor).toBe(
      quietTag?.colors.selectedBackgroundColor,
    );
    expect(quietPillStyles.borderColor).toBe(quietTag?.colors.textColor);
    expect(quietPillStyles.borderColor).not.toBe("black");
    expect(quietPillStyles.borderColor).not.toBe("#000");
    expect(getByTestId("quiet-selected-indicator")).toBeTruthy();
    expect(containerStyles.columnGap).toBe(10);
    expect(containerStyles.rowGap).toBe(10);
  });

  it("does not add more than three marker tags", () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MarkerTagSelector value={["quiet", "clean", "nature"]} onChange={onChange} />,
    );

    fireEvent.press(getByText("Urban"));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("MarkerTagList", () => {
  it("renders selected marker tag labels", () => {
    const { getByText } = render(<MarkerTagList attributes={["quiet", "waterfront"]} />);

    expect(getByText("Quiet")).toBeTruthy();
    expect(getByText("Waterfront")).toBeTruthy();
  });
});
