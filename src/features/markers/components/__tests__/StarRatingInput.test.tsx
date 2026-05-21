import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import StarRatingInput from "../StarRatingInput";

describe("StarRatingInput", () => {
  it("emits the selected score when a star is pressed", () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(<StarRatingInput value={2} onChange={onChange} />);

    fireEvent.press(getByLabelText("Rate 4 stars"));

    expect(onChange).toHaveBeenCalledWith(4);
  });
});
