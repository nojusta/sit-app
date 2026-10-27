const mockListDocuments = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocument = jest.fn();

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      APPWRITE_ENDPOINT: "https://example.com/v1",
      APPWRITE_PROJECT_ID: "project-id",
      APPWRITE_DATABASE_ID: "database-id",
      APPWRITE_MARKERS_COLLECTION_ID: "markers-collection-id",
      APPWRITE_RATINGS_COLLECTION_ID: "ratings-collection-id",
    },
  },
}));

// Preserve the real SDK query/permission primitives and production client,
// rating, and permission modules. Replace only database IO at the SDK boundary.
jest.mock("appwrite", () => ({
  ...jest.requireActual("appwrite"),
  Databases: jest.fn().mockImplementation(() => ({
    listDocuments: mockListDocuments,
    createDocument: mockCreateDocument,
    updateDocument: mockUpdateDocument,
  })),
}));

const { submitMarkerRating } = require("../ratings") as typeof import("../ratings");

describe("SIT-27 rating service integration AAA", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("saves an owner-scoped rating and persists the recalculated marker average", async () => {
    // Arrange
    const timestamp = "2026-10-21T12:00:00.000Z";
    jest.useFakeTimers().setSystemTime(new Date(timestamp));
    mockListDocuments
      .mockResolvedValueOnce({ documents: [], total: 0 })
      .mockResolvedValueOnce({ documents: [{ score: 3 }, { score: 5 }], total: 2 });
    mockCreateDocument.mockImplementation(async (_db, _collection, _id, data) => ({
      $id: "rating-id",
      ...data,
    }));
    mockUpdateDocument.mockResolvedValue({});

    // Act: exercise the real ratings -> client -> SDK and permissions flow.
    const result = await submitMarkerRating({
      markerId: " marker-1 ",
      userId: " user-1 ",
      authorName: " Matas ",
      score: 5,
      comment: " Quiet shade ",
    });

    // Assert: the write, its access policy, and the derived value form one contract.
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "database-id",
      "ratings-collection-id",
      expect.any(String),
      {
        marker_id: "marker-1",
        user_id: "user-1",
        author_name: "Matas",
        score: 5,
        comment: "Quiet shade",
        created_at: timestamp,
        updated_at: timestamp,
      },
      ['read("users")', 'read("any")', 'update("user:user-1")', 'delete("user:user-1")'],
    );
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      "marker-1",
      { average_rating: 4 },
    );
    expect(result).toEqual({
      averageRating: 4,
      rating: {
        id: "rating-id",
        markerId: "marker-1",
        userId: "user-1",
        authorName: "Matas",
        score: 5,
        comment: "Quiet shade",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
  });
});
