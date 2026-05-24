import { ID, type Models } from "appwrite";

import { ensureReady, getAccountClient } from "./client";
import { isExpectedUnauthenticatedError } from "./errors";

const normalizeIdentifiers = (currentAccount: Models.User<Models.Preferences>) =>
  [currentAccount.email].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

const normalizeUser = (currentAccount: Models.User<Models.Preferences>) => ({
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

export async function createUser(email: string, password: string, username: string) {
  try {
    ensureReady();
    const newAccount = await getAccountClient().create(
      ID.unique(),
      email,
      password,
      username,
    );

    if (!newAccount) {
      throw new Error("Failed to create user");
    }

    await signIn(email, password);
    const currentAccount = await getAccountClient().get();

    return normalizeUser(currentAccount);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create user");
  }
}

export async function signIn(email: string, password: string) {
  try {
    ensureReady();
    return await getAccountClient().createEmailPasswordSession(email, password);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign in");
  }
}

export async function getAccount() {
  try {
    ensureReady();
    return await getAccountClient().get();
  } catch (error) {
    if (__DEV__ && !isExpectedUnauthenticatedError(error)) {
      console.error("No authenticated user:", error);
    }

    return null;
  }
}

export async function getCurrentUser() {
  try {
    ensureReady();
    const currentAccount = await getAccount();

    if (!currentAccount) {
      return null;
    }

    return normalizeUser(currentAccount);
  } catch (error) {
    if (__DEV__) {
      console.error("Error fetching current user:", error);
    }

    throw error instanceof Error ? error : new Error("Failed to fetch user");
  }
}

export async function signOut() {
  try {
    ensureReady();
    return await getAccountClient().deleteSession("current");
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to sign out");
  }
}

export async function adminLogin(email: string, password: string) {
  ensureReady();
  const currentAccount = await getAccount();

  if (currentAccount) {
    await signOut();
  }

  await getAccountClient().createEmailPasswordSession(email, password);
  return getCurrentUser();
}
