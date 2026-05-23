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

jest.mock("appwrite", () => {
  class MockClient {
    setEndpoint() {
      return this;
    }

    setProject() {
      return this;
    }

    subscribe() {
      return jest.fn();
    }
  }

  class MockDatabases {
    listDocuments: typeof mockListDocuments;
    createDocument: typeof mockCreateDocument;
    updateDocument: typeof mockUpdateDocument;

    constructor() {
      this.listDocuments = mockListDocuments;
      this.createDocument = mockCreateDocument;
      this.updateDocument = mockUpdateDocument;
    }
  }

  class MockAccount {}
  class MockStorage {}
  class MockAppwriteException extends Error {}

  return {
    Account: MockAccount,
    AppwriteException: MockAppwriteException,
    Client: MockClient,
    Databases: MockDatabases,
    ID: {
      unique: jest.fn(() => "generated-id"),
    },
    Permission: {
      read: (value: string) => `read:${value}`,
      update: (value: string) => `update:${value}`,
      delete: (value: string) => `delete:${value}`,
    },
    Query: {
      equal: (key: string, value: unknown) => ({ type: "equal", key, value }),
      orderDesc: (key: string) => ({ type: "orderDesc", key }),
      limit: (value: number) => ({ type: "limit", value }),
      offset: (value: number) => ({ type: "offset", value }),
    },
    Role: {
      any: () => "any",
      users: () => "users",
      user: (id: string) => `user:${id}`,
    },
    Storage: MockStorage,
  };
});

const {
  getMarkerAverageRating,
  getUserMarkerRating,
  listMarkerRatings,
  submitMarkerRating,
} = require("@/services/appwrite");

describe("rating persistence", () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    mockListDocuments.mockReset();
    mockCreateDocument.mockReset();
    mockUpdateDocument.mockReset();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("creates a new rating and updates the marker average rating", async () => {
    mockListDocuments
      .mockResolvedValueOnce({ documents: [], total: 0 })
      .mockResolvedValueOnce({
        documents: [
          {
            $id: "rating-1",
            score: 5,
            marker_id: "marker-1",
            user_id: "user-1",
            author_name: "Matas",
          },
        ],
        total: 1,
      });
    mockCreateDocument.mockResolvedValue({
      $id: "rating-1",
      marker_id: "marker-1",
      user_id: "user-1",
      author_name: "Matas",
      score: 5,
      comment: "Great shade",
      created_at: "2026-05-15T10:00:00.000Z",
      updated_at: "2026-05-15T10:00:00.000Z",
    });
    mockUpdateDocument.mockResolvedValue({});

    const result = await submitMarkerRating({
      markerId: "marker-1",
      userId: "user-1",
      authorName: "Matas",
      score: 5,
      comment: "Great shade",
    });

    expect(mockCreateDocument).toHaveBeenCalledWith(
      "database-id",
      "ratings-collection-id",
      "generated-id",
      expect.objectContaining({
        marker_id: "marker-1",
        user_id: "user-1",
        author_name: "Matas",
        score: 5,
        comment: "Great shade",
      }),
      expect.arrayContaining(["read:any", "read:users", "update:user:user-1"]),
    );
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      "marker-1",
      {
        average_rating: 5,
      },
    );
    expect(result.averageRating).toBe(5);
  });

  it("loads an existing rating and updates it in place", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        {
          $id: "rating-1",
          marker_id: "marker-1",
          user_id: "user-1",
          author_name: "Matas",
          score: 4,
          comment: "Existing comment",
          created_at: "2026-05-15T10:00:00.000Z",
          updated_at: "2026-05-15T10:00:00.000Z",
        },
      ],
      total: 1,
    });

    const existingRating = await getUserMarkerRating("marker-1", "user-1");

    expect(existingRating).toMatchObject({
      id: "rating-1",
      authorName: "Matas",
      score: 4,
      comment: "Existing comment",
    });

    mockListDocuments
      .mockResolvedValueOnce({
        documents: [
          {
            $id: "rating-1",
            marker_id: "marker-1",
            user_id: "user-1",
            author_name: "Matas",
            score: 4,
            comment: "Existing comment",
            created_at: "2026-05-15T10:00:00.000Z",
            updated_at: "2026-05-15T10:00:00.000Z",
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        documents: [
          {
            $id: "rating-1",
            score: 2,
            marker_id: "marker-1",
            user_id: "user-1",
            author_name: "Matas",
          },
          { $id: "rating-2", score: 5, marker_id: "marker-1", user_id: "user-2" },
        ],
        total: 2,
      });
    mockUpdateDocument
      .mockResolvedValueOnce({
        $id: "rating-1",
        marker_id: "marker-1",
        user_id: "user-1",
        author_name: "Matas",
        score: 2,
        comment: "",
        created_at: "2026-05-15T10:00:00.000Z",
        updated_at: "2026-05-15T11:00:00.000Z",
      })
      .mockResolvedValueOnce({});

    const result = await submitMarkerRating({
      markerId: "marker-1",
      userId: "user-1",
      authorName: "Matas",
      score: 2,
      comment: "",
    });

    expect(mockUpdateDocument).toHaveBeenNthCalledWith(
      1,
      "database-id",
      "ratings-collection-id",
      "rating-1",
      expect.objectContaining({
        author_name: "Matas",
        score: 2,
        comment: null,
      }),
    );
    expect(mockUpdateDocument).toHaveBeenNthCalledWith(
      2,
      "database-id",
      "markers-collection-id",
      "marker-1",
      {
        average_rating: 3.5,
      },
    );
    expect(result.averageRating).toBe(3.5);
  });

  it("lists recent public reviews for a marker", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        {
          $id: "rating-1",
          marker_id: "marker-1",
          user_id: "user-1",
          author_name: "Matas",
          score: 5,
          comment: "Puiki vieta.",
          created_at: "2026-05-15T10:00:00.000Z",
          updated_at: "2026-05-15T11:00:00.000Z",
        },
      ],
      total: 1,
    });

    const result = await listMarkerRatings("marker-1");

    expect(result).toEqual([
      expect.objectContaining({
        id: "rating-1",
        authorName: "Matas",
        score: 5,
        comment: "Puiki vieta.",
      }),
    ]);
  });

  it("still returns a computed average when marker average persistence is unauthorized", async () => {
    mockListDocuments
      .mockResolvedValueOnce({ documents: [], total: 0 })
      .mockResolvedValueOnce({
        documents: [
          {
            $id: "rating-1",
            score: 1,
            marker_id: "marker-1",
            user_id: "user-2",
            author_name: "Other user",
          },
          {
            $id: "rating-2",
            score: 5,
            marker_id: "marker-1",
            user_id: "user-3",
            author_name: "Third user",
          },
          {
            $id: "rating-3",
            score: 4,
            marker_id: "marker-1",
            user_id: "user-1",
            author_name: "Matas",
          },
        ],
        total: 3,
      });
    mockCreateDocument.mockResolvedValue({
      $id: "rating-3",
      marker_id: "marker-1",
      user_id: "user-1",
      author_name: "Matas",
      score: 4,
      comment: "Still works",
      created_at: "2026-05-16T10:00:00.000Z",
      updated_at: "2026-05-16T10:00:00.000Z",
    });
    mockUpdateDocument.mockRejectedValueOnce(
      Object.assign(
        new Error("The current user is not authorized to perform the requested action."),
        {
          code: 401,
        },
      ),
    );
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        {
          $id: "rating-1",
          score: 1,
          marker_id: "marker-1",
          user_id: "user-2",
        },
        {
          $id: "rating-2",
          score: 5,
          marker_id: "marker-1",
          user_id: "user-3",
        },
        {
          $id: "rating-3",
          score: 4,
          marker_id: "marker-1",
          user_id: "user-1",
        },
      ],
      total: 3,
    });

    const result = await submitMarkerRating({
      markerId: "marker-1",
      userId: "user-1",
      authorName: "Matas",
      score: 4,
      comment: "Still works",
    });

    expect(result.rating.score).toBe(4);
    expect(result.averageRating).toBe(3.33);
  });

  it("computes marker average rating from the ratings collection", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        {
          $id: "rating-1",
          score: 3,
          marker_id: "marker-1",
          user_id: "user-1",
        },
        {
          $id: "rating-2",
          score: 5,
          marker_id: "marker-1",
          user_id: "user-2",
        },
      ],
      total: 2,
    });

    const averageRating = await getMarkerAverageRating("marker-1");

    expect(averageRating).toBe(4);
  });

  it("preserves the no-ratings state when no scores exist", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [],
      total: 0,
    });

    const averageRating = await getMarkerAverageRating("marker-1");

    expect(averageRating).toBeNull();
  });
});
