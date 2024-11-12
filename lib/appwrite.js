import {
  Account,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

import Constants from "expo-constants";
import { Alert } from "react-native";
import { router } from "expo-router";

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

// Register user
export async function createUser(email, password, username) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

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
      }
    );

    return newUser;
  } catch (error) {
    throw new Error(error);
  }
}

// Sign In
export async function signIn(email, password) {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    throw new Error(error);
  }
}

// Get Account
export async function getAccount() {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error) {
    console.error("No authenticated user:", error);
    return null; // Return null for unauthenticated users
  }
}

// Get Current User
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();
    if (!currentAccount) {
      console.log("Guest user detected, no account available.");
      return null;  // Explicitly return null for guest users
    }

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountID", currentAccount.$id)]
    );

    if (!currentUser.documents.length) return null;

    return currentUser.documents[0];
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};


// Sign Out
export async function signOut() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    throw new Error(error);
  }
}

// Admin Login
export async function adminlogin (email, password, setUser, setIsLogged, setLoading) {
  try {
    setLoading(true);
    console.log("Attempting to create a session...");
    
    const currentAccount = await getAccount();
    if (currentAccount) {
      console.log("Existing session found. Deleting session...");
      await signOut();
    }

    await account.createEmailPasswordSession(email, password);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setIsLogged(true);
    Alert.alert("Success", "User signed in successfully");
    router.replace("/home");
  } catch (error) {
    if (error instanceof Error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Error", "An unknown error occurred.");
    }
  } finally {
    setLoading(false);
  }
};