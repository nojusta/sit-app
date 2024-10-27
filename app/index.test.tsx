import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { useGlobalContext } from "../context/GlobalProvider";
import GlobalProvider from "../context/GlobalProvider"; // Ensure correct import
import App from "./index"; // Ensure correct import
import { router } from "expo-router";

// Mock the useGlobalContext hook
jest.mock("../context/GlobalProvider", () => ({
  ...jest.requireActual("../context/GlobalProvider"),
  useGlobalContext: jest.fn(),
}));

// Mock the router
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

const RootComponent = () => (
  <GlobalProvider>
    <App />
  </GlobalProvider>
);

describe("App Component", () => {
  it("should render Loader and CustomButton correctly when loading is true", () => {
    (useGlobalContext as jest.Mock).mockReturnValue({ loading: true });

    const { getByTestId } = render(<RootComponent />);

    expect(getByTestId("loader")).toBeTruthy();
    expect(getByTestId("custom-button")).toBeTruthy();
  });

  it("should navigate to sign-in when CustomButton is pressed", () => {
    (useGlobalContext as jest.Mock).mockReturnValue({ loading: false });

    const { getByTestId } = render(<RootComponent />);

    const button = getByTestId("custom-button");
    fireEvent.press(button);

    expect(router.push).toHaveBeenCalledWith("/sign-in");
  });
});
