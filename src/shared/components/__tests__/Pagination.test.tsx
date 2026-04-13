import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import Pagination, { buildPaginationItems } from "../Pagination";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

describe("buildPaginationItems", () => {
  it("shows all pages for small page counts", () => {
    expect(buildPaginationItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows the compact middle layout when the current page is centered", () => {
    expect(buildPaginationItems(5, 12)).toEqual([1, "ellipsis", 5, "ellipsis", 12]);
  });

  it("shows the first and last two pages near the edges", () => {
    expect(buildPaginationItems(2, 12)).toEqual([1, 2, "ellipsis", 11, 12]);
    expect(buildPaginationItems(11, 12)).toEqual([1, 2, "ellipsis", 11, 12]);
  });
});

describe("Pagination", () => {
  it("emits the target page when a page button is pressed", () => {
    const onPageChange = jest.fn();
    const { getByText } = render(
      <Pagination currentPage={5} totalPages={12} onPageChange={onPageChange} />,
    );

    fireEvent.press(getByText("12"));

    expect(onPageChange).toHaveBeenCalledWith(12);
  });
});
