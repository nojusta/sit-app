import { Account, Client, Databases, ID, Query, Storage } from "react-native-appwrite";

import Constants from "expo-constants";

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_STORAGE_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID,
  APPWRITE_MARKERS_COLLECTION_ID,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} = Constants.expoConfig?.extra || {};

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  platform: "com.sitapp",
  projectId: APPWRITE_PROJECT_ID,
  storageId: APPWRITE_STORAGE_ID,
  databaseId: APPWRITE_DATABASE_ID,
  userCollectionId: APPWRITE_USER_COLLECTION_ID,
  markersCollectionId: APPWRITE_MARKERS_COLLECTION_ID,
};

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const storage = new Storage(client);
const databases = new Databases(client); // Database service

const missingConfig = Object.entries(appwriteConfig).filter(([, value]) => !value);
if (__DEV__ && missingConfig.length) {
  console.warn("Appwrite config missing values:", missingConfig);
}

// Register user
export async function createUser(email, password, username) {
  try {
    const newAccount = await account.create(ID.unique(), email, password, username);

    if (!newAccount) throw Error;

    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountID: newAccount.$id,
        email: email,
        username: username,
      },
    );

    return newUser;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create user");
  }
}

// Sign In
export async function signIn(email, password) {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign in");
  }
}

// Get Account
export async function getAccount() {
  try {
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
    const currentAccount = await getAccount();
    if (!currentAccount) {
      console.log("Guest user detected, no account available.");
      return null; // Explicitly return null for guest users
    }

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountID", currentAccount.$id)],
    );

    if (!currentUser.documents.length) return null;

    return currentUser.documents[0];
  } catch (error) {
    if (__DEV__) console.error("Error fetching current user:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch user");
  }
}

// Sign Out
export async function signOut() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign out");
  }
}

// Admin Login (returns user; UI handles side effects)
export async function adminLogin(email, password) {
  const currentAccount = await getAccount();
  if (currentAccount) {
    await signOut();
  }

  await account.createEmailPasswordSession(email, password);
  return getCurrentUser();
}

// Upload Profile Picture
export async function uploadProfilePicture(file) {
  try {
    // Upload file to Appwrite storage
    const response = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file,
    );

    // Get the file URL
    const fileUrl = storage.getFileView(appwriteConfig.storageId, response.$id);

    // Update user profile with new avatar URL
    await account.updatePrefs({ avatar: fileUrl });

    return fileUrl;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error instanceof Error ? error : new Error("Failed to upload profile picture");
  }
}
