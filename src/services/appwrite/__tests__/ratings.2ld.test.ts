import { Query } from "appwrite";
import { ensureRatingsReady, ensureMarkersReady } from "../client";
import { listMarkerRatingsPage, submitMarkerRating } from "../ratings";

const mockDb = {
  listDocuments: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
};
jest.mock("../client", () => ({
  ensureRatingsReady: jest.fn(),
  ensureMarkersReady: jest.fn(),
  getDatabaseId: () => "db",
  getRatingsCollectionId: () => "ratings",
  getMarkersCollectionId: () => "markers",
  getDatabasesClient: () => mockDb,
}));
jest.mock("../permissions", () => ({
  buildRatingDocumentPermissions: (id: string) => [id],
}));
const rating = {
  $id: "rating",
  marker_id: "marker",
  user_id: "user",
  score: 4,
  author_name: "Matas",
  comment: "Nice",
  created_at: "2026-10-14",
  updated_at: "2026-10-14",
};
const input = {
  markerId: " marker ",
  userId: " user ",
  score: 4,
  authorName: " Matas ",
  comment: " Nice ",
};
const originalDev = __DEV__;
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  mockDb.listDocuments.mockResolvedValue({ documents: [], total: 0 });
  mockDb.createDocument.mockResolvedValue(rating);
  mockDb.updateDocument.mockResolvedValue(rating);
});
afterEach(() => {
  Object.assign(globalThis, { __DEV__: originalDev });
  jest.restoreAllMocks();
});

describe("SIT-27 submitMarkerRating AAA", () => {
  it.each([
    [{ ...input, markerId: " " }, "Marker ID is required."],
    [{ ...input, userId: " " }, "User ID is required."],
    [{ ...input, score: 0 }, "Rating must be an integer between 1 and 5."],
    [{ ...input, score: 6 }, "Rating must be an integer between 1 and 5."],
    [{ ...input, score: 2.5 }, "Rating must be an integer between 1 and 5."],
  ])("rejects invalid input (%s)", async (value, message) => {
    // Arrange: parameterized value
    // Act
    const promise = submitMarkerRating(value);
    // Assert
    await expect(promise).rejects.toThrow(message);
  });

  it("creates a normalized rating when none exists", async () => {
    // Arrange
    const value = { ...input };
    // Act
    await submitMarkerRating(value);
    // Assert
    expect(mockDb.createDocument).toHaveBeenCalledWith(
      "db",
      "ratings",
      expect.any(String),
      {
        marker_id: "marker",
        user_id: "user",
        author_name: "Matas",
        score: 4,
        comment: "Nice",
        created_at: expect.any(String),
        updated_at: expect.any(String),
      },
      ["user"],
    );
  });

  it("returns the saved domain rating", async () => {
    // Arrange
    const value = { ...input };
    // Act
    const result = await submitMarkerRating(value);
    // Assert
    expect(result.rating).toEqual({
      id: "rating",
      markerId: "marker",
      userId: "user",
      score: 4,
      authorName: "Matas",
      comment: "Nice",
      createdAt: "2026-10-14",
      updatedAt: "2026-10-14",
    });
  });

  it("updates the existing rating in place", async () => {
    // Arrange
    mockDb.listDocuments.mockResolvedValueOnce({ documents: [rating], total: 1 });
    // Act
    await submitMarkerRating(input);
    // Assert
    expect(mockDb.updateDocument.mock.calls[0]).toEqual([
      "db",
      "ratings",
      "rating",
      { author_name: "Matas", score: 4, comment: "Nice", updated_at: expect.any(String) },
    ]);
  });

  it.each([true, false])(
    "stores omitted author and comment as null, existing=%s",
    async (existing) => {
      // Arrange
      mockDb.listDocuments.mockResolvedValueOnce({
        documents: existing ? [rating] : [],
        total: existing ? 1 : 0,
      });
      // Act
      await submitMarkerRating({ markerId: "marker", userId: "user", score: 1 });
      // Assert
      const calls = existing
        ? mockDb.updateDocument.mock.calls
        : mockDb.createDocument.mock.calls;
      expect(calls[0][3]).toMatchObject({ author_name: null, comment: null, score: 1 });
    },
  );

  it("persists the recomputed average", async () => {
    // Arrange
    mockDb.listDocuments
      .mockResolvedValueOnce({ documents: [], total: 0 })
      .mockResolvedValueOnce({
        documents: [{ score: 3 }, { score: 4 }, { score: 4 }],
        total: 3,
      });
    // Act
    await submitMarkerRating(input);
    // Assert
    expect(mockDb.updateDocument).toHaveBeenCalledWith("db", "markers", "marker", {
      average_rating: 3.67,
    });
  });

  it("returns a recomputed average on an authorization failure", async () => {
    // Arrange
    mockDb.listDocuments
      .mockResolvedValueOnce({ documents: [], total: 0 })
      .mockResolvedValue({ documents: [{ score: 5 }], total: 1 });
    mockDb.updateDocument.mockRejectedValue({ code: 403 });
    // Act
    const result = await submitMarkerRating(input);
    // Assert
    expect(result.averageRating).toBe(5);
  });

  it("propagates a non-authorization persistence error", async () => {
    // Arrange
    const error = new Error("database offline");
    mockDb.updateDocument.mockRejectedValue(error);
    // Act
    const promise = submitMarkerRating(input);
    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("rating readiness and diagnostic contracts AAA", () => {
  it("checks ratings configuration before validating rating input", async () => {
    // Arrange
    const error = new Error("Ratings not configured");
    jest.mocked(ensureRatingsReady).mockImplementation(() => {
      throw error;
    });
    // Act
    const promise = submitMarkerRating({ ...input, markerId: " " });
    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("checks marker configuration before validating rating input", async () => {
    // Arrange
    const error = new Error("Markers not configured");
    jest.mocked(ensureMarkersReady).mockImplementation(() => {
      throw error;
    });
    // Act
    const promise = submitMarkerRating({ ...input, markerId: " " });
    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it.each([true, false])(
    "logs average persistence denial only in development, dev=%s",
    async (dev) => {
      // Arrange
      Object.assign(globalThis, { __DEV__: dev });
      const error = { code: 403 };
      mockDb.updateDocument.mockRejectedValue(error);
      // Act
      await submitMarkerRating(input);
      // Assert
      expect(jest.mocked(console.warn).mock.calls).toEqual(
        dev
          ? [
              [
                "Marker average rating could not be persisted from the current client session. Falling back to computed rating value.",
                error,
              ],
            ]
          : [],
      );
    },
  );
});

describe("SIT-93 listMarkerRatingsPage AAA", () => {
  it("rejects a blank marker identifier", async () => {
    // Arrange
    const markerId = " ";
    // Act
    const promise = listMarkerRatingsPage(markerId);
    // Assert
    await expect(promise).rejects.toThrow("Marker ID is required.");
  });

  it.each([
    [undefined, 10, 0],
    [{}, 10, 0],
    [{ pageSize: 0, offset: -1 }, 1, 0],
    [{ pageSize: 51, offset: 7 }, 50, 7],
    [{ pageSize: 1, offset: 0 }, 1, 0],
    [{ pageSize: 50, offset: 10 }, 50, 10],
  ])("normalizes pagination %s", async (options, pageSize, offset) => {
    // Arrange
    const markerId = " marker ";
    // Act
    const page = await listMarkerRatingsPage(markerId, options);
    // Assert
    expect(page).toMatchObject({ pageSize, offset });
  });

  it("queries normalized marker and descending review time", async () => {
    // Arrange
    const markerId = " marker ";
    // Act
    await listMarkerRatingsPage(markerId, { pageSize: 5, offset: 2 });
    // Assert
    expect(mockDb.listDocuments).toHaveBeenCalledWith("db", "ratings", [
      Query.equal("marker_id", "marker"),
      Query.orderDesc("updated_at"),
      Query.limit(5),
      Query.offset(2),
    ]);
  });

  it("maps returned documents into domain ratings", async () => {
    // Arrange
    mockDb.listDocuments.mockResolvedValue({ documents: [rating], total: 1 });
    // Act
    const page = await listMarkerRatingsPage("marker");
    // Assert
    expect(page.ratings).toEqual([
      {
        id: "rating",
        markerId: "marker",
        userId: "user",
        score: 4,
        authorName: "Matas",
        comment: "Nice",
        createdAt: "2026-10-14",
        updatedAt: "2026-10-14",
      },
    ]);
  });

  it.each([
    [2, 1, true],
    [2, 2, false],
    [0, 0, false],
  ])("total=%s offset=%s hasMore=%s", async (total, offset, expected) => {
    // Arrange
    mockDb.listDocuments.mockResolvedValue({ documents: [], total });
    // Act
    const page = await listMarkerRatingsPage("marker", { offset });
    // Assert
    expect(page.hasMore).toBe(expected);
  });
  it("checks configuration before querying reviews", async () => {
    // Arrange
    const error = new Error("Ratings not configured");
    jest.mocked(ensureRatingsReady).mockImplementation(() => {
      throw error;
    });
    // Act
    const promise = listMarkerRatingsPage("marker");
    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("ends pagination when returned reviews reach total", async () => {
    // Arrange
    mockDb.listDocuments.mockResolvedValue({ documents: [rating], total: 2 });
    // Act
    const page = await listMarkerRatingsPage("marker", { offset: 1 });
    // Assert
    expect(page.hasMore).toBe(false);
  });
});
