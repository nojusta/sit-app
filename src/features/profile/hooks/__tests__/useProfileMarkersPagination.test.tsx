import { act, renderHook, waitFor } from "@testing-library/react-native";

import { listMarkersByAuthorPage } from "@/services/appwrite";
import useProfileMarkersPagination from "../useProfileMarkersPagination";

jest.mock("@/services/appwrite", () => ({
  listMarkersByAuthorPage: jest.fn(),
}));

const mockedListMarkersByAuthorPage = jest.mocked(listMarkersByAuthorPage);

describe("useProfileMarkersPagination", () => {
  beforeEach(() => {
    mockedListMarkersByAuthorPage.mockReset();
  });

  it("fetches the first profile marker page on mount", async () => {
    mockedListMarkersByAuthorPage.mockResolvedValue({
      markers: [],
      page: 1,
      pageSize: 10,
      total: 24,
      totalPages: 3,
    });

    renderHook(() => useProfileMarkersPagination("user-1"));

    await waitFor(() => {
      expect(mockedListMarkersByAuthorPage).toHaveBeenCalledWith("user-1", {
        page: 1,
        pageSize: 10,
      });
    });
  });

  it("fetches a new backend page when the page changes", async () => {
    let resolveSecondPage:
      | ((value: {
          markers: [];
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        }) => void)
      | null = null;

    mockedListMarkersByAuthorPage
      .mockResolvedValueOnce({
        markers: [],
        page: 1,
        pageSize: 10,
        total: 24,
        totalPages: 3,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondPage = resolve;
          }),
      );

    const { result } = renderHook(() => useProfileMarkersPagination("user-1"));

    await waitFor(() => {
      expect(mockedListMarkersByAuthorPage).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.totalPages).toBe(3);
    });

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.markers).toEqual([]);

    act(() => {
      resolveSecondPage?.({
        markers: [],
        page: 2,
        pageSize: 10,
        total: 24,
        totalPages: 3,
      });
    });

    await waitFor(() => {
      expect(mockedListMarkersByAuthorPage).toHaveBeenNthCalledWith(2, "user-1", {
        page: 2,
        pageSize: 10,
      });
    });
  });
});
