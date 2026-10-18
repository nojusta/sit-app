import { ensureMarkersReady } from "../client";
import { createMarker, updateMarker } from "../markers";
import { uploadMarkerPhotos } from "../storage";
import type { CreateMarkerInput, UpdateMarkerInput } from "../types";

const mockDb = {
  listDocuments: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
};
jest.mock("../client", () => ({
  ensureMarkersReady: jest.fn(),
  getDatabaseId: () => "db",
  getMarkersCollectionId: () => "markers",
  getDatabasesClient: () => mockDb,
}));
jest.mock("../moderationWarnings", () => ({
  assertCanSubmitByModerationWarnings: jest.fn(),
}));
jest.mock("../storage", () => ({ uploadMarkerPhotos: jest.fn() }));
jest.mock("../permissions", () => ({
  buildMarkerDocumentPermissions: (status: string, author: string) => [status, author],
}));
const upload = jest.mocked(uploadMarkerPhotos);
const createInput: CreateMarkerInput = {
  title: " VU bench ",
  description: " Quiet shade ",
  coordinate: { latitude: 54, longitude: 25 },
  authorId: "user",
};
const updateInput: UpdateMarkerInput = {
  markerId: "marker",
  authorId: "user",
  description: " New description ",
};

beforeEach(() => {
  jest.resetAllMocks();
  mockDb.listDocuments.mockResolvedValue({ total: 0, documents: [] });
  upload.mockResolvedValue([]);
  mockDb.createDocument.mockImplementation(async (_db, _collection, id, data) => ({
    $id: id,
    ...data,
  }));
  mockDb.updateDocument.mockImplementation(async (_db, _collection, id, data) => ({
    $id: id,
    ...data,
  }));
});

describe("SIT-104 createMarker AAA", () => {
  it.each([
    [{ ...createInput, title: " " }, "Marker title is required."],
    [{ ...createInput, description: " " }, "Marker description is required."],
  ])("rejects missing required text (%s)", async (input, message) => {
    // Arrange: input from case
    // Act
    const promise = createMarker(input);
    // Assert
    await expect(promise).rejects.toThrow(message);
  });

  it("persists trimmed content and pending approval without a photo", async () => {
    // Arrange
    const input = { ...createInput };
    // Act
    await createMarker(input);
    // Assert
    expect(mockDb.createDocument).toHaveBeenCalledWith(
      "db",
      "markers",
      expect.any(String),
      {
        title: "VU bench",
        description: "Quiet shade",
        location: "54.000000,25.000000",
        status: "pending_approval",
        author_id: "user",
        created_at: expect.any(String),
        photo_url: null,
        photo_urls: [],
        latitude: 54,
        longitude: 25,
      },
      ["pending_approval", "user"],
    );
  });

  it("returns the created domain marker", async () => {
    // Arrange
    const input = { ...createInput };
    // Act
    const marker = await createMarker(input);
    // Assert
    expect(marker).toMatchObject({
      title: "VU bench",
      description: "Quiet shade",
      status: "pending_approval",
      authorId: "user",
      coordinate: { latitude: 54, longitude: 25 },
      photoUrl: null,
      attributes: [],
    });
  });

  it("persists the uploaded photo and selected tags", async () => {
    // Arrange
    upload.mockResolvedValue(["https://storage/photo"]);
    const input: CreateMarkerInput = {
      ...createInput,
      photo: { uri: "file://photo" },
      attributes: ["quiet"],
    };
    // Act
    await createMarker(input);
    // Assert
    expect(mockDb.createDocument.mock.calls[0][3]).toMatchObject({
      photo_url: "https://storage/photo",
      photo_urls: ["https://storage/photo"],
      attributes: ["quiet"],
    });
  });

  it("passes the image and owner to storage", async () => {
    // Arrange
    const photo = { uri: "file://photo" };
    // Act
    await createMarker({ ...createInput, photo });
    // Assert
    expect(upload).toHaveBeenCalledWith([photo], "pending_approval", "user");
  });

  it("uses a null photo when storage returns no URLs", async () => {
    // Arrange
    upload.mockResolvedValue([]);
    // Act
    const marker = await createMarker({ ...createInput, photo: { uri: "file://photo" } });
    // Assert
    expect(marker.photoUrl).toBeNull();
  });

  it("propagates an unrelated database failure", async () => {
    // Arrange
    const error = new Error("offline");
    mockDb.createDocument.mockRejectedValue(error);
    // Act
    const promise = createMarker(createInput);
    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("explains a missing attributes schema", async () => {
    // Arrange
    mockDb.createDocument.mockRejectedValue(new Error('Unknown attribute: "attributes"'));
    // Act
    const promise = createMarker({ ...createInput, attributes: ["quiet"] });
    // Assert
    await expect(promise).rejects.toThrow("Marker tags are not enabled in Appwrite yet.");
  });
});

describe("SIT-110 updateMarker AAA", () => {
  it("rejects a blank description", async () => {
    // Arrange
    const input = { ...updateInput, description: " " };
    // Act
    const promise = updateMarker(input);
    // Assert
    await expect(promise).rejects.toThrow("Marker description is required.");
  });

  it("persists trimmed description and returns to moderation", async () => {
    // Arrange
    const input = { ...updateInput };
    // Act
    await updateMarker(input);
    // Assert
    expect(mockDb.updateDocument).toHaveBeenCalledWith(
      "db",
      "markers",
      "marker",
      {
        description: "New description",
        status: "pending_approval",
        photo_url: null,
        photo_urls: [],
      },
      ["pending_approval", "user"],
    );
  });

  it("merges images preserving order and removes duplicates and empty URLs", async () => {
    // Arrange
    upload.mockResolvedValue(["b", "a", ""]);
    const input = {
      ...updateInput,
      existingPhotoUrls: ["a", "", "a"],
      newPhotos: [{ uri: "file://photo" }],
    };
    // Act
    const marker = await updateMarker(input);
    // Assert
    expect(marker).toMatchObject({ photoUrl: "a", photoUrls: ["a", "b"] });
  });

  it("discards non-string URLs received at runtime", async () => {
    // Arrange
    const input = {
      ...updateInput,
      existingPhotoUrls: [null, "a"] as unknown as string[],
    };
    // Act
    const marker = await updateMarker(input);
    // Assert
    expect(marker.photoUrls).toEqual(["a"]);
  });

  it("clears tags when an empty attributes array is explicit", async () => {
    // Arrange
    const input = { ...updateInput, attributes: [] };
    // Act
    await updateMarker(input);
    // Assert
    expect(mockDb.updateDocument.mock.calls[0][3].attributes).toEqual([]);
  });

  it("persists selected tags", async () => {
    // Arrange
    const input: UpdateMarkerInput = { ...updateInput, attributes: ["quiet"] };
    // Act
    await updateMarker(input);
    // Assert
    expect(mockDb.updateDocument.mock.calls[0][3].attributes).toEqual(["quiet"]);
  });

  it("passes new photos to storage", async () => {
    // Arrange
    const newPhotos = [{ uri: "file://photo" }];
    // Act
    await updateMarker({ ...updateInput, newPhotos });
    // Assert
    expect(upload).toHaveBeenCalledWith(newPhotos, "pending_approval", "user");
  });

  it("propagates an unrelated database failure", async () => {
    // Arrange
    const error = new Error("offline");
    mockDb.updateDocument.mockRejectedValue(error);
    // Act
    const promise = updateMarker(updateInput);
    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("explains a missing attributes schema", async () => {
    // Arrange
    mockDb.updateDocument.mockRejectedValue(new Error('Unknown attribute: "attributes"'));
    // Act
    const promise = updateMarker({ ...updateInput, attributes: ["quiet"] });
    // Assert
    await expect(promise).rejects.toThrow("Marker tags are not enabled in Appwrite yet.");
  });
});

describe("marker readiness AAA", () => {
  it.each(["create", "update"])(
    "checks configuration before %s validation",
    async (operation) => {
      // Arrange
      const error = new Error("Markers not configured");
      jest.mocked(ensureMarkersReady).mockImplementation(() => {
        throw error;
      });
      // Act
      const promise =
        operation === "create"
          ? createMarker({ ...createInput, title: " " })
          : updateMarker({ ...updateInput, description: " " });
      // Assert
      await expect(promise).rejects.toBe(error);
    },
  );
});
