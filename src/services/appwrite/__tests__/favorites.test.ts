const mockListDocuments = jest.fn();
const mockCreateDocument = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      APPWRITE_ENDPOINT: "https://example.com/v1",
      APPWRITE_PROJECT_ID: "project-id",
      APPWRITE_DATABASE_ID: "database-id",
      APPWRITE_MARKERS_COLLECTION_ID: "markers-collection-id",
      APPWRITE_RATINGS_COLLECTION_ID: "ratings-collection-id",
      APPWRITE_FAVORITES_COLLECTION_ID: "favorites-collection-id",
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
    deleteDocument: typeof mockDeleteDocument;

    constructor() {
      this.listDocuments = mockListDocuments;
      this.createDocument = mockCreateDocument;
      this.deleteDocument = mockDeleteDocument;
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
  addMarkerFavorite,
  listUserFavoriteMarkerIds,
  removeMarkerFavorite,
  toggleMarkerFavorite,
} = require("@/services/appwrite");

const favoriteDocument = {
  $id: "favorite-1",
  marker_id: "marker-1",
  user_id: "user-1",
  created_at: "2026-05-24T10:00:00.000Z",
};

describe("favorite persistence", () => {
  beforeEach(() => {
    mockListDocuments.mockReset();
    mockCreateDocument.mockReset();
    mockDeleteDocument.mockReset();
  });

  it("lists favorite marker ids for a user", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        favoriteDocument,
        {
          ...favoriteDocument,
          $id: "favorite-2",
          marker_id: "marker-2",
        },
      ],
      total: 2,
    });

    await expect(listUserFavoriteMarkerIds("user-1")).resolves.toEqual([
      "marker-1",
      "marker-2",
    ]);
    expect(mockListDocuments).toHaveBeenCalledWith(
      "database-id",
      "favorites-collection-id",
      expect.arrayContaining([
        { type: "equal", key: "user_id", value: "user-1" },
        { type: "orderDesc", key: "created_at" },
      ]),
    );
  });

  it("creates a favorite when one does not exist", async () => {
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
    mockCreateDocument.mockResolvedValueOnce(favoriteDocument);

    const favorite = await addMarkerFavorite("marker-1", "user-1");

    expect(mockCreateDocument).toHaveBeenCalledWith(
      "database-id",
      "favorites-collection-id",
      "generated-id",
      expect.objectContaining({
        marker_id: "marker-1",
        user_id: "user-1",
      }),
      ["read:user:user-1", "update:user:user-1", "delete:user:user-1"],
    );
    expect(favorite).toMatchObject({
      id: "favorite-1",
      markerId: "marker-1",
      userId: "user-1",
    });
  });

  it("removes an existing favorite", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [favoriteDocument],
      total: 1,
    });
    mockDeleteDocument.mockResolvedValueOnce({});

    await removeMarkerFavorite("marker-1", "user-1");

    expect(mockDeleteDocument).toHaveBeenCalledWith(
      "database-id",
      "favorites-collection-id",
      "favorite-1",
    );
  });

  it("toggles an existing favorite off", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [favoriteDocument],
      total: 1,
    });
    mockDeleteDocument.mockResolvedValueOnce({});

    await expect(toggleMarkerFavorite("marker-1", "user-1")).resolves.toEqual({
      isFavorite: false,
      favorite: null,
    });
    expect(mockDeleteDocument).toHaveBeenCalledWith(
      "database-id",
      "favorites-collection-id",
      "favorite-1",
    );
  });

  it("toggles a missing favorite on", async () => {
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
    mockCreateDocument.mockResolvedValueOnce(favoriteDocument);

    await expect(toggleMarkerFavorite("marker-1", "user-1")).resolves.toMatchObject({
      isFavorite: true,
      favorite: {
        id: "favorite-1",
        markerId: "marker-1",
      },
    });
    expect(mockCreateDocument).toHaveBeenCalled();
  });

  it("rejects empty marker or user ids", async () => {
    await expect(addMarkerFavorite("", "user-1")).rejects.toThrow(
      "Marker ID is required.",
    );
    await expect(addMarkerFavorite("marker-1", " ")).rejects.toThrow(
      "User ID is required.",
    );
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });
});
