import { Permission, Role } from "appwrite";

import type { MarkerStatus } from "./types";

export const buildMarkerDocumentPermissions = (
  status: MarkerStatus,
  authorId: string,
) => {
  // Pending/rejected markers stay author-scoped because moderation currently
  // happens outside the client app in Appwrite, not through an in-app admin flow.
  const permissions = [
    Permission.read(Role.user(authorId)),
    Permission.update(Role.user(authorId)),
    Permission.delete(Role.user(authorId)),
  ];

  if (status === "approved") {
    permissions.unshift(Permission.read(Role.users()));
    permissions.unshift(Permission.read(Role.any()));
  }

  return permissions;
};

export const buildMarkerFilePermissions = (status: MarkerStatus, ownerId: string) => {
  // Mirror marker visibility for uploaded photos so pending submissions remain
  // private until they are explicitly approved.
  const permissions = [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];

  if (status === "approved") {
    permissions.unshift(Permission.read(Role.users()));
    permissions.unshift(Permission.read(Role.any()));
  }

  return permissions;
};

export const buildProfilePhotoPermissions = (ownerId: string) => [
  Permission.read(Role.users()),
  Permission.read(Role.any()),
  Permission.update(Role.user(ownerId)),
  Permission.delete(Role.user(ownerId)),
];

export const buildRatingDocumentPermissions = (ownerId: string) => [
  Permission.read(Role.users()),
  Permission.read(Role.any()),
  Permission.update(Role.user(ownerId)),
  Permission.delete(Role.user(ownerId)),
];
