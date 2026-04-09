import { Account, Client, ID, Storage } from "appwrite";

import Constants from "expo-constants";

const manifest2Extra = Constants.manifest2?.extra?.expoClient?.extra ?? {};
const expoExtra =
  Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? manifest2Extra ?? {};

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_STORAGE_ID } = expoExtra;

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  storageId: APPWRITE_STORAGE_ID,
};

const client = new Client();
const baseConfig = {
  endpoint: appwriteConfig.endpoint,
  projectId: appwriteConfig.projectId,
};
const missingBaseConfig = Object.entries(baseConfig).filter(([, value]) => !value);
const appwriteReady = missingBaseConfig.length === 0;
const storageReady = appwriteReady && Boolean(appwriteConfig.storageId);

if (appwriteReady) {
  client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId);
} else if (__DEV__) {
  console.warn("Appwrite base config missing values:", missingBaseConfig);
}

const account = appwriteReady ? new Account(client) : null;
const storage = storageReady ? new Storage(client) : null;

const ensureReady = () => {
  if (!appwriteReady) {
    throw new Error(
      "Appwrite configuration is missing. Check your env variables in app.config.js.",
    );
  }
};

const ensureStorageReady = () => {
  ensureReady();
  if (!storageReady) {
    throw new Error("Appwrite storage is not configured.");
  }
};

const getErrorCode = (error) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "number"
    ? error.code
    : null;

const getErrorMessage = (error) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ? error.message
      : "";

const isExpectedUnauthenticatedError = (error) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === 401 ||
    message.includes("missing scopes") ||
    message.includes("role: guests") ||
    message.includes("current session not found")
  );
};

const normalizeIdentifiers = (currentAccount) =>
  [currentAccount.email].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

const normalizeUser = (currentAccount) => ({
  $id: currentAccount.$id,
  accountID: currentAccount.$id,
  email: currentAccount.email,
  username: currentAccount.name ?? currentAccount.email?.split("@")[0] ?? "User",
  avatar:
    typeof currentAccount.prefs?.avatar === "string"
      ? currentAccount.prefs.avatar
      : undefined,
  status: currentAccount.status,
  joined: currentAccount.registration ?? currentAccount.$createdAt,
  identifiers: normalizeIdentifiers(currentAccount),
});

// Register user
export async function createUser(email, password, username) {
  try {
    ensureReady();
    const newAccount = await account.create(ID.unique(), email, password, username);

    if (!newAccount) throw Error;

    await signIn(email, password);
    const currentAccount = await account.get();
    return normalizeUser(currentAccount);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create user");
  }
}

// Sign In
export async function signIn(email, password) {
  try {
    ensureReady();
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign in");
  }
}

// Get Account
export async function getAccount() {
  try {
    ensureReady();
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error) {
    if (__DEV__ && !isExpectedUnauthenticatedError(error)) {
      console.error("No authenticated user:", error);
    }
    return null; // Return null for unauthenticated users
  }
}

// Get Current User
export async function getCurrentUser() {
  try {
    ensureReady();
    const currentAccount = await getAccount();
    if (!currentAccount) {
      return null; // Explicitly return null for guest users
    }
    return normalizeUser(currentAccount);
  } catch (error) {
    if (__DEV__) console.error("Error fetching current user:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch user");
  }
}

// Sign Out
export async function signOut() {
  try {
    ensureReady();
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign out");
  }
}

// Admin Login (returns user; UI handles side effects)
export async function adminLogin(email, password) {
  ensureReady();
  const currentAccount = await getAccount();
  if (currentAccount) {
    await signOut();
  }

  await account.createEmailPasswordSession(email, password);
  return getCurrentUser();
}

// Upload Profile Picture
/**
 * Upload a profile picture and return a public URL string.
 * @param {{ uri: string; name: string; type: string; size: number }} file
 * @returns {Promise<string>}
 */
export async function uploadProfilePicture(file) {
  try {
    ensureStorageReady();
    // Upload file to Appwrite storage
    const response = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file,
    );

    // Get the file URL
    const fileUrl = storage.getFileView(appwriteConfig.storageId, response.$id);
    const fileUrlString = typeof fileUrl === "string" ? fileUrl : fileUrl.toString();

    // Update user profile with new avatar URL
    await account.updatePrefs({ avatar: fileUrlString });

    return fileUrlString;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error instanceof Error ? error : new Error("Failed to upload profile picture");
  }
}
