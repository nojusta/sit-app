const mockListDocuments = jest.fn();

describe("moderation warning configuration", () => {
  beforeEach(() => {
    jest.resetModules();
    mockListDocuments.mockReset();
  });

  it("does not block marker creation checks when moderation warnings are not configured", async () => {
    jest.doMock("expo-constants", () => ({
      expoConfig: {
        extra: {
          APPWRITE_ENDPOINT: "https://example.com/v1",
          APPWRITE_PROJECT_ID: "project-id",
          APPWRITE_DATABASE_ID: "database-id",
          APPWRITE_MARKERS_COLLECTION_ID: "markers-collection-id",
        },
      },
    }));

    jest.doMock("appwrite", () => {
      class MockClient {
        setEndpoint() {
          return this;
        }

        setProject() {
          return this;
        }
      }

      class MockDatabases {
        listDocuments: typeof mockListDocuments;

        constructor() {
          this.listDocuments = mockListDocuments;
        }
      }

      class MockAccount {}
      class MockStorage {}

      return {
        Account: MockAccount,
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
          limit: (value: number) => ({ type: "limit", value }),
        },
        Role: {
          user: (id: string) => `user:${id}`,
        },
        Storage: MockStorage,
      };
    });

    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const {
      assertCanSubmitByModerationWarnings,
    } = require("@/services/appwrite/moderationWarnings");

    await expect(assertCanSubmitByModerationWarnings("user-1")).resolves.toBeUndefined();
    expect(mockListDocuments).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
