import { normalizeUploadableImage } from "@/services/appwrite";

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      APPWRITE_ENDPOINT: "https://example.com/v1",
      APPWRITE_PROJECT_ID: "project",
    },
  },
}));

describe("Appwrite upload image normalization", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(1778424000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("preserves HEIC image names and MIME types from iOS", () => {
    expect(
      normalizeUploadableImage({
        uri: "file:///private/var/mobile/IMG_1234.HEIC",
        name: "IMG_1234.HEIC",
        type: "image/heic",
      }),
    ).toEqual({
      uri: "file:///private/var/mobile/IMG_1234.HEIC",
      name: "IMG_1234.HEIC",
      type: "image/heic",
    });
  });

  it("detects common mobile image MIME types from file extensions", () => {
    expect(
      normalizeUploadableImage({
        uri: "file:///cache/photo.heif",
        name: "photo.heif",
        type: null,
      }),
    ).toMatchObject({
      name: "photo.heif",
      type: "image/heif",
    });

    expect(
      normalizeUploadableImage({
        uri: "file:///cache/photo.webp",
        name: "photo.webp",
      }),
    ).toMatchObject({
      name: "photo.webp",
      type: "image/webp",
    });
  });

  it("uses URI extensions when the picker does not provide a filename", () => {
    expect(
      normalizeUploadableImage({
        uri: "file:///cache/selected-image.PNG",
        name: null,
        type: null,
      }),
    ).toEqual({
      uri: "file:///cache/selected-image.PNG",
      name: "upload-1778424000000.png",
      type: "image/png",
    });
  });

  it("adds a supported extension when the picker filename is missing one", () => {
    expect(
      normalizeUploadableImage({
        uri: "ph://asset-id",
        name: "marker-photo",
        type: "image/heic",
      }),
    ).toEqual({
      uri: "ph://asset-id",
      name: "marker-photo.heic",
      type: "image/heic",
    });
  });
});
