const mockListDocuments = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocument = jest.fn();
const mockGetDocument = jest.fn();

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      APPWRITE_ENDPOINT: "https://example.com/v1",
      APPWRITE_PROJECT_ID: "project-id",
      APPWRITE_DATABASE_ID: "database-id",
      APPWRITE_MARKERS_COLLECTION_ID: "markers-collection-id",
      APPWRITE_RATINGS_COLLECTION_ID: "ratings-collection-id",
      APPWRITE_MODERATION_WARNINGS_ID: "moderation-warnings-collection-id",
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
    getDocument: typeof mockGetDocument;

    constructor() {
      this.listDocuments = mockListDocuments;
      this.createDocument = mockCreateDocument;
      this.updateDocument = mockUpdateDocument;
      this.getDocument = mockGetDocument;
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
      greaterThanEqual: (key: string, value: unknown) => ({
        type: "greaterThanEqual",
        key,
        value,
      }),
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
  createMarker,
  listApprovedMarkers,
  rejectMarker,
  updateMarker,
} = require("@/services/appwrite");

const markerDocument = {
  $id: "marker-1",
  title: "Bench near Cathedral",
  description: "Quiet in the morning",
  location: "54.687200,25.279700",
  status: "approved",
  author_id: "user-1",
  created_at: "2026-05-22T10:00:00.000Z",
  photo_url: null,
  photo_urls: [],
  latitude: 54.6872,
  longitude: 25.2797,
  average_rating: null,
};

describe("marker persistence", () => {
  beforeEach(() => {
    mockListDocuments.mockReset();
    mockListDocuments.mockResolvedValue({
      documents: [],
      total: 0,
    });
    mockCreateDocument.mockReset();
    mockUpdateDocument.mockReset();
    mockGetDocument.mockReset();
    mockGetDocument.mockResolvedValue(markerDocument);
  });

  it("maps missing marker attributes to an empty tag list", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [markerDocument],
      total: 1,
    });

    const markers = await listApprovedMarkers();

    expect(markers[0]).toMatchObject({
      id: "marker-1",
      attributes: [],
    });
  });

  it("persists selected tags when creating a marker", async () => {
    mockCreateDocument.mockResolvedValueOnce({
      ...markerDocument,
      $id: "generated-id",
      status: "pending_approval",
      attributes: ["quiet", "shaded"],
    });

    await createMarker({
      title: "Bench near Cathedral",
      description: "Quiet in the morning",
      coordinate: { latitude: 54.6872, longitude: 25.2797 },
      authorId: "user-1",
      attributes: ["quiet", "shaded"],
    });

    expect(mockCreateDocument).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      "generated-id",
      expect.objectContaining({
        title: "Bench near Cathedral",
        description: "Quiet in the morning",
        attributes: ["quiet", "shaded"],
      }),
      expect.arrayContaining(["read:user:user-1", "update:user:user-1"]),
    );
    expect(mockListDocuments).toHaveBeenCalledWith(
      "database-id",
      "moderation-warnings-collection-id",
      expect.arrayContaining([
        expect.objectContaining({
          key: "user_id",
          value: "user-1",
        }),
      ]),
    );
    expect(mockListDocuments).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      expect.arrayContaining([
        expect.objectContaining({
          key: "author_id",
          value: "user-1",
        }),
        expect.objectContaining({
          key: "created_at",
          type: "greaterThanEqual",
        }),
      ]),
    );
  });

  it("does not send empty marker tags when creating an untagged marker", async () => {
    mockCreateDocument.mockResolvedValueOnce({
      ...markerDocument,
      $id: "generated-id",
      status: "pending_approval",
    });

    await createMarker({
      title: "Bench near Cathedral",
      description: "Quiet in the morning",
      coordinate: { latitude: 54.6872, longitude: 25.2797 },
      authorId: "user-1",
    });

    expect(mockCreateDocument).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      "generated-id",
      expect.not.objectContaining({
        attributes: expect.anything(),
      }),
      expect.arrayContaining(["read:user:user-1", "update:user:user-1"]),
    );
  });

  it("persists selected tags when updating a marker", async () => {
    mockUpdateDocument.mockResolvedValueOnce({
      ...markerDocument,
      description: "Updated context",
      status: "pending_approval",
      attributes: ["clean", "waterfront"],
    });

    await updateMarker({
      markerId: "marker-1",
      authorId: "user-1",
      description: "Updated context",
      existingPhotoUrls: [],
      newPhotos: [],
      attributes: ["clean", "waterfront"],
    });

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      "marker-1",
      expect.objectContaining({
        description: "Updated context",
        status: "pending_approval",
        attributes: ["clean", "waterfront"],
      }),
      expect.arrayContaining(["read:user:user-1", "update:user:user-1"]),
    );
  });

  it("rejects more than three marker tags before persisting", async () => {
    await expect(
      createMarker({
        title: "Bench near Cathedral",
        description: "Quiet in the morning",
        coordinate: { latitude: 54.6872, longitude: 25.2797 },
        authorId: "user-1",
        attributes: ["quiet", "clean", "nature", "scenic"],
      }),
    ).rejects.toThrow("Choose up to 3 marker tags.");

    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("blocks marker creation after three moderation warnings", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [],
      total: 3,
    });

    await expect(
      createMarker({
        title: "Bench near Cathedral",
        description: "Quiet in the morning",
        coordinate: { latitude: 54.6872, longitude: 25.2797 },
        authorId: "user-1",
      }),
    ).rejects.toThrow(
      "You can no longer submit new sitting places because your account has 3 moderation warnings.",
    );

    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("blocks marker creation after ten uploads in the last 24 hours", async () => {
    mockListDocuments
      .mockResolvedValueOnce({
        documents: [],
        total: 0,
      })
      .mockResolvedValueOnce({
        documents: [],
        total: 10,
      });

    await expect(
      createMarker({
        title: "Bench near Cathedral",
        description: "Quiet in the morning",
        coordinate: { latitude: 54.6872, longitude: 25.2797 },
        authorId: "user-1",
      }),
    ).rejects.toThrow(
      "You have reached the upload limit of 10 sitting places in the last 24 hours.",
    );

    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("creates a moderation warning when rejecting a marker", async () => {
    mockGetDocument.mockResolvedValueOnce({
      ...markerDocument,
      status: "pending_approval",
    });
    mockUpdateDocument.mockResolvedValueOnce({
      ...markerDocument,
      status: "rejected",
    });
    mockCreateDocument.mockResolvedValueOnce({
      $id: "warning-1",
      user_id: "user-1",
      marker_id: "marker-1",
      reason: "Photo does not show a sitting place.",
      reviewed_at: "2026-05-25T10:00:00.000Z",
      created_by: "admin-1",
      $createdAt: "2026-05-25T10:00:00.000Z",
      $updatedAt: "2026-05-25T10:00:00.000Z",
    });

    await rejectMarker({
      markerId: "marker-1",
      authorId: "user-1",
      reviewerId: "admin-1",
      reason: "Photo does not show a sitting place.",
    });

    expect(mockGetDocument).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      "marker-1",
    );
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "database-id",
      "markers-collection-id",
      "marker-1",
      { status: "rejected" },
      expect.arrayContaining(["read:user:user-1"]),
    );
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "database-id",
      "moderation-warnings-collection-id",
      "generated-id",
      expect.objectContaining({
        user_id: "user-1",
        marker_id: "marker-1",
        reason: "Photo does not show a sitting place.",
        created_by: "admin-1",
      }),
      expect.arrayContaining(["read:user:user-1", "read:user:admin-1"]),
    );
  });

  it("rolls marker status back when rejection warning creation fails", async () => {
    mockGetDocument.mockResolvedValueOnce({
      ...markerDocument,
      status: "pending_approval",
    });
    mockUpdateDocument
      .mockResolvedValueOnce({
        ...markerDocument,
        status: "rejected",
      })
      .mockResolvedValueOnce({
        ...markerDocument,
        status: "pending_approval",
      });
    mockCreateDocument.mockRejectedValueOnce(new Error("Warning write failed"));

    await expect(
      rejectMarker({
        markerId: "marker-1",
        authorId: "user-1",
        reviewerId: "admin-1",
        reason: "Photo does not show a sitting place.",
      }),
    ).rejects.toThrow("Warning write failed");

    expect(mockUpdateDocument).toHaveBeenNthCalledWith(
      1,
      "database-id",
      "markers-collection-id",
      "marker-1",
      { status: "rejected" },
      expect.arrayContaining(["read:user:user-1"]),
    );
    expect(mockUpdateDocument).toHaveBeenNthCalledWith(
      2,
      "database-id",
      "markers-collection-id",
      "marker-1",
      { status: "pending_approval" },
      expect.arrayContaining(["read:user:user-1"]),
    );
  });

  it("explains when tagged marker submission hits an unsynced Appwrite schema", async () => {
    mockCreateDocument.mockRejectedValueOnce(
      new Error('Invalid document structure: Unknown attribute: "attributes"'),
    );

    await expect(
      createMarker({
        title: "Bench near Cathedral",
        description: "Quiet in the morning",
        coordinate: { latitude: 54.6872, longitude: 25.2797 },
        authorId: "user-1",
        attributes: ["quiet"],
      }),
    ).rejects.toThrow("Run npm run appwrite:sync-markers");
  });

  it("explains when tagged marker update hits an unsynced Appwrite schema", async () => {
    mockUpdateDocument.mockRejectedValueOnce(
      new Error('Invalid document structure: Unknown attribute: "attributes"'),
    );

    await expect(
      updateMarker({
        markerId: "marker-1",
        authorId: "user-1",
        description: "Updated context",
        attributes: ["clean"],
      }),
    ).rejects.toThrow("Run npm run appwrite:sync-markers");
  });
});
