import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SignIn from "../(auth)/sign-in";
import SignUp from "../(auth)/sign-up";

import { getCurrentUser, createUser, signIn } from "@/services/appwrite";
import { useAuthContext } from "@/features/auth";
import { router, useLocalSearchParams } from "expo-router";

jest.mock("@/services/appwrite", () => ({
  createUser: jest.fn(),
  getCurrentUser: jest.fn(),
  signIn: jest.fn(),
}));

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/features/auth", () => {
  const actual = jest.requireActual("@/features/auth");
  return {
    ...actual,
    useAuthContext: jest.fn(),
  };
});

const mockedCreateUser = jest.mocked(createUser);
const mockedGetCurrentUser = jest.mocked(getCurrentUser);
const mockedSignIn = jest.mocked(signIn);
const mockedUseAuthContext = jest.mocked(useAuthContext);
const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

describe("auth screen flows", () => {
  const setUser = jest.fn();
  const setIsLogged = jest.fn();
  const replace = jest.mocked(router.replace);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuthContext.mockReturnValue({
      isLogged: false,
      setIsLogged,
      user: null,
      setUser,
      loading: false,
      setLoading: jest.fn(),
      error: null,
    });
    mockedUseLocalSearchParams.mockReturnValue({});
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("signs a user up, normalizes credentials, and navigates to the home screen", async () => {
    const createdUser = {
      $id: "user-1",
      accountID: "user-1",
      email: "jonas@example.com",
      username: "Jonas",
      status: true,
      joined: "2026-04-01T00:00:00.000Z",
      identifiers: ["jonas@example.com"],
    };
    mockedCreateUser.mockResolvedValue(createdUser as never);

    render(<SignUp />);

    fireEvent.changeText(screen.getByPlaceholderText("Optional"), "  Jonas  ");
    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your email"),
      "  JONAS@Example.com ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your password"),
      "password123",
    );
    fireEvent.press(screen.getByText("Sign Up"));

    await waitFor(() =>
      expect(mockedCreateUser).toHaveBeenCalledWith(
        "jonas@example.com",
        "password123",
        "Jonas",
      ),
    );

    expect(setUser).toHaveBeenCalledWith(createdUser);
    expect(setIsLogged).toHaveBeenCalledWith(true);
    expect(replace).toHaveBeenCalledWith("/home");
  });

  it("redirects duplicate-email registration attempts to sign-in with the normalized email", async () => {
    mockedCreateUser.mockRejectedValue({ code: 409 });

    render(<SignUp />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your email"),
      " TAKEN@Example.com ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your password"),
      "password123",
    );
    fireEvent.press(screen.getByText("Sign Up"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Account already exists",
        "Redirecting to sign in.",
        expect.any(Array),
      ),
    );

    const alertCall = jest.mocked(Alert.alert).mock.calls.at(-1);
    const actions = alertCall?.[2] as { onPress?: () => void }[] | undefined;

    actions?.[0]?.onPress?.();

    expect(replace).toHaveBeenCalledWith({
      pathname: "/sign-in",
      params: { email: "taken@example.com" },
    });
    expect(setUser).not.toHaveBeenCalled();
  });

  it("signs a user in, normalizes the email, and navigates to the home screen", async () => {
    const currentUser = {
      $id: "user-2",
      accountID: "user-2",
      email: "eva@example.com",
      username: "Eva",
    };
    mockedGetCurrentUser.mockResolvedValue(currentUser as never);
    mockedSignIn.mockResolvedValue({} as never);

    render(<SignIn />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your email"),
      " EVA@Example.com ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your password"),
      "password123",
    );
    fireEvent.press(screen.getByText("Sign In"));

    await waitFor(() =>
      expect(mockedSignIn).toHaveBeenCalledWith("eva@example.com", "password123"),
    );

    expect(mockedGetCurrentUser).toHaveBeenCalled();
    expect(setUser).toHaveBeenCalledWith(currentUser);
    expect(setIsLogged).toHaveBeenCalledWith(true);
    expect(replace).toHaveBeenCalledWith("/home");
  });

  it("keeps the user on sign-in when authentication fails", async () => {
    mockedSignIn.mockRejectedValue(new Error("Bad credentials"));

    render(<SignIn />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your email"),
      "eva@example.com",
    );
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "wrongpass");
    fireEvent.press(screen.getByText("Sign In"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Incorrect email or password. Please try again.",
      ),
    );

    expect(replace).not.toHaveBeenCalled();
    expect(setUser).not.toHaveBeenCalled();
  });
});
