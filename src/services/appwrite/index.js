import { Account, Client, ID, Storage } from "appwrite";

import Constants from "expo-constants";

const manifest2Extra = Constants.manifest2?.extra?.expoClient?.extra ?? {};
const expoExtra =
  Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? manifest2Extra ?? {};

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_STORAGE_ID,
  APPWRITE_MARKERS_COLLECTION_ID,
} = expoExtra;

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  storageId: APPWRITE_STORAGE_ID,
  markersCollectionId: APPWRITE_MARKERS_COLLECTION_ID,
};

const client = new Client();
const missingConfig = Object.entries(appwriteConfig).filter(([, value]) => !value);
const appwriteReady = missingConfig.length === 0;

if (appwriteReady) {
  client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId);
} else if (__DEV__) {
  console.warn("Appwrite config missing values:", missingConfig);
}

const account = appwriteReady ? new Account(client) : null;
const storage = appwriteReady ? new Storage(client) : null;

const ensureReady = () => {
  if (!appwriteReady) {
    throw new Error(
      "Appwrite configuration is missing. Check your env variables in app.config.js.",
    );
  }
};

const normalizeUser = (currentAccount) => ({
  $id: currentAccount.$id,
  accountID: currentAccount.$id,
  email: currentAccount.email,
  username: currentAccount.name ?? currentAccount.email?.split("@")[0] ?? "User",
  avatar:
    typeof currentAccount.prefs?.avatar === "string"
      ? currentAccount.prefs.avatar
      : undefined,
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
    if (__DEV__) console.error("No authenticated user:", error);
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
    ensureReady();
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
