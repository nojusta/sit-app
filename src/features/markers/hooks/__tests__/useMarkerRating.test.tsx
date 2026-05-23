import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useAuthContext } from "@/features/auth";
import {
  getMarkerAverageRating,
  getUserMarkerRating,
  listMarkerRatings,
  submitMarkerRating,
} from "@/services/appwrite";
import useMarkerRating from "../useMarkerRating";

jest.mock("@/features/auth", () => ({
  useAuthContext: jest.fn(),
}));

jest.mock("@/services/appwrite", () => ({
  getMarkerAverageRating: jest.fn(),
  getUserMarkerRating: jest.fn(),
  listMarkerRatings: jest.fn(),
  submitMarkerRating: jest.fn(),
}));

const mockedUseAuthContext = jest.mocked(useAuthContext);
const mockedGetMarkerAverageRating = jest.mocked(getMarkerAverageRating);
const mockedGetUserMarkerRating = jest.mocked(getUserMarkerRating);
const mockedListMarkerRatings = jest.mocked(listMarkerRatings);
const mockedSubmitMarkerRating = jest.mocked(submitMarkerRating);

describe("useMarkerRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(console, "warn").mockImplementation(jest.fn());

    mockedUseAuthContext.mockReturnValue({
      isLogged: true,
      setIsLogged: jest.fn(),
      user: {
        $id: "user-1",
        accountID: "user-1",
        email: "matas@example.com",
        username: "Matas",
      },
      setUser: jest.fn(),
      loading: false,
      setLoading: jest.fn(),
      error: null,
    });
    mockedListMarkerRatings.mockResolvedValue([]);
    mockedGetMarkerAverageRating.mockResolvedValue(null);
    mockedGetUserMarkerRating.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not fail the saved rating when the marker refresh callback fails", async () => {
    const onRatingSaved = jest.fn().mockRejectedValue(new Error("refetch failed"));

    mockedSubmitMarkerRating.mockResolvedValue({
      rating: {
        id: "rating-1",
        markerId: "marker-1",
        userId: "user-1",
        authorName: "Matas",
        score: 5,
        comment: "Great bench",
        createdAt: "2026-05-23T09:00:00.000Z",
        updatedAt: "2026-05-23T09:00:00.000Z",
      },
      averageRating: 5,
    });

    const { result } = renderHook(() =>
      useMarkerRating({
        markerId: "marker-1",
        averageRating: null,
        onRatingSaved,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoadingExistingRating).toBe(false);
    });

    act(() => {
      result.current.handleScoreChange(5);
      result.current.handleCommentChange("Great bench");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockedSubmitMarkerRating).toHaveBeenCalledWith({
      markerId: "marker-1",
      userId: "user-1",
      authorName: "Matas",
      score: 5,
      comment: "Great bench",
    });
    expect(onRatingSaved).toHaveBeenCalledTimes(1);
    expect(result.current.errorMessage).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Rating saved",
      "Your rating has been recorded for this sitting spot.",
    );
  });
});
