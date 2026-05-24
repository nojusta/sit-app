import type { MarkerData } from "../../core";
import {
  DEFAULT_MARKER_FILTERS,
  filterMarkers,
  getActiveMarkerFilterCount,
  markerHasPhotos,
} from "../markerFilters";

const marker = (overrides: Partial<MarkerData>): MarkerData => ({
  id: "marker-1",
  coordinate: { latitude: 54.6872, longitude: 25.2797 },
  title: "Bench near Cathedral",
  description: "Quiet place",
  location: "54.687200,25.279700",
  status: "approved",
  authorId: "admin-user",
  createdAt: "2026-05-22T10:00:00.000Z",
  photoUrl: null,
  photoUrls: [],
  averageRating: null,
  attributes: [],
  ...overrides,
});

const currentLocation = { latitude: 54.6872, longitude: 25.2797 };

describe("marker filter logic", () => {
  it("returns every marker when no filters are active", () => {
    const markers = [marker({ id: "marker-1" }), marker({ id: "marker-2" })];

    expect(
      filterMarkers(markers, DEFAULT_MARKER_FILTERS, {
        currentLocation,
        favoriteMarkerIds: [],
      }),
    ).toEqual(markers);
  });

  it("matches any selected tag", () => {
    const quiet = marker({ id: "quiet", attributes: ["quiet"] });
    const shaded = marker({ id: "shaded", attributes: ["shaded"] });
    const urban = marker({ id: "urban", attributes: ["urban"] });

    const result = filterMarkers(
      [quiet, shaded, urban],
      { ...DEFAULT_MARKER_FILTERS, attributes: ["quiet", "shaded"] },
      { currentLocation, favoriteMarkerIds: [] },
    );

    expect(result.map((item) => item.id)).toEqual(["quiet", "shaded"]);
  });

  it("filters markers without photos", () => {
    const withPrimaryPhoto = marker({
      id: "primary",
      photoUrl: "https://example.com/a.jpg",
    });
    const withPhotoList = marker({
      id: "list",
      photoUrls: ["https://example.com/b.jpg"],
    });
    const withoutPhoto = marker({ id: "empty" });

    expect(markerHasPhotos(withPrimaryPhoto)).toBe(true);
    expect(markerHasPhotos(withPhotoList)).toBe(true);
    expect(
      filterMarkers(
        [withPrimaryPhoto, withPhotoList, withoutPhoto],
        { ...DEFAULT_MARKER_FILTERS, hasPhotosOnly: true },
        { currentLocation, favoriteMarkerIds: [] },
      ).map((item) => item.id),
    ).toEqual(["primary", "list"]);
  });

  it("applies minimum rating and excludes unrated markers", () => {
    const unrated = marker({ id: "unrated", averageRating: null });
    const threeStar = marker({ id: "three", averageRating: 3.5 });
    const fourStar = marker({ id: "four", averageRating: 4.2 });

    expect(
      filterMarkers(
        [unrated, threeStar, fourStar],
        { ...DEFAULT_MARKER_FILTERS, minimumRating: 4 },
        { currentLocation, favoriteMarkerIds: [] },
      ).map((item) => item.id),
    ).toEqual(["four"]);
  });

  it("requires current location for distance filtering", () => {
    const nearby = marker({ id: "nearby" });

    expect(
      filterMarkers(
        [nearby],
        { ...DEFAULT_MARKER_FILTERS, maxDistanceMeters: 500 },
        { currentLocation: null, favoriteMarkerIds: [] },
      ),
    ).toEqual([]);
  });

  it("filters by distance from current location", () => {
    const nearby = marker({
      id: "nearby",
      coordinate: { latitude: 54.6873, longitude: 25.2798 },
    });
    const far = marker({
      id: "far",
      coordinate: { latitude: 54.7001, longitude: 25.3001 },
    });

    expect(
      filterMarkers(
        [nearby, far],
        { ...DEFAULT_MARKER_FILTERS, maxDistanceMeters: 500 },
        { currentLocation, favoriteMarkerIds: [] },
      ).map((item) => item.id),
    ).toEqual(["nearby"]);
  });

  it("filters by favorite marker ids", () => {
    const first = marker({ id: "marker-1" });
    const second = marker({ id: "marker-2" });

    expect(
      filterMarkers(
        [first, second],
        { ...DEFAULT_MARKER_FILTERS, favoritesOnly: true },
        { currentLocation, favoriteMarkerIds: ["marker-2"] },
      ),
    ).toEqual([second]);
  });

  it("combines filter groups with AND logic", () => {
    const match = marker({
      id: "match",
      attributes: ["quiet"],
      photoUrl: "https://example.com/a.jpg",
      averageRating: 4.7,
    });
    const wrongTag = marker({
      id: "wrong-tag",
      attributes: ["urban"],
      photoUrl: "https://example.com/b.jpg",
      averageRating: 4.8,
    });
    const noPhoto = marker({
      id: "no-photo",
      attributes: ["quiet"],
      averageRating: 4.8,
    });

    expect(
      filterMarkers(
        [match, wrongTag, noPhoto],
        {
          ...DEFAULT_MARKER_FILTERS,
          attributes: ["quiet"],
          hasPhotosOnly: true,
          minimumRating: 4.5,
          favoritesOnly: true,
        },
        { currentLocation, favoriteMarkerIds: ["match", "wrong-tag", "no-photo"] },
      ),
    ).toEqual([match]);
  });

  it("counts active filter groups", () => {
    expect(
      getActiveMarkerFilterCount({
        ...DEFAULT_MARKER_FILTERS,
        attributes: ["quiet", "shaded"],
        hasPhotosOnly: true,
        minimumRating: 4,
      }),
    ).toBe(3);
  });
});
