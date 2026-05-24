export type UploadableImage = {
  uri: string;
  name?: string | null;
  type?: string | null;
  size?: number;
};

export type MarkerStatus = "pending_approval" | "approved" | "rejected";

export const MARKER_TAG_IDS = [
  "quiet",
  "loud",
  "shaded",
  "clean",
  "nature",
  "urban",
  "waterfront",
  "scenic",
  "work_friendly",
] as const;

export type MarkerTagId = (typeof MARKER_TAG_IDS)[number];

export const MAX_MARKER_ATTRIBUTES = 3;

export type MarkerCoordinate = {
  latitude: number;
  longitude: number;
};

export interface MarkerRecord {
  id: string;
  title: string;
  description: string;
  coordinate: MarkerCoordinate;
  location: string;
  status: MarkerStatus;
  authorId: string;
  createdAt: string;
  photoUrl: string | null;
  photoUrls?: string[];
  averageRating?: number | null;
  attributes: MarkerTagId[];
}

export interface MarkerPageResult {
  markers: MarkerRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateMarkerInput {
  title: string;
  description: string;
  coordinate: MarkerCoordinate;
  authorId: string;
  photo?: UploadableImage | null;
  attributes?: MarkerTagId[];
}

export interface UpdateMarkerInput {
  markerId: string;
  authorId: string;
  description: string;
  existingPhotoUrls?: string[];
  newPhotos?: UploadableImage[];
  attributes?: MarkerTagId[];
}

export interface MarkerRatingRecord {
  id: string;
  markerId: string;
  userId: string;
  authorName: string | null;
  score: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitMarkerRatingInput {
  markerId: string;
  userId: string;
  authorName?: string;
  score: number;
  comment?: string;
}

export interface SubmitMarkerRatingResult {
  rating: MarkerRatingRecord;
  averageRating: number | null;
}

export interface MarkerRatingPageResult {
  ratings: MarkerRatingRecord[];
  total: number;
  offset: number;
  pageSize: number;
  hasMore: boolean;
}
