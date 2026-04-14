import {
  type MapCameraSnapshot,
  createInitialMapSessionState,
  mapSessionReducer,
  selectHasTransientUi,
  selectIsNavigationActive,
  type MarkerData,
} from "..";

const MARKER: MarkerData = {
  id: "marker-1",
  coordinate: { latitude: 54.6872, longitude: 25.2797 },
  title: "Kudirka Square",
  description: "A central city marker",
  location: "54.687200,25.279700",
  status: "approved",
  authorId: "user-1",
  createdAt: "2026-04-10T10:00:00.000Z",
};

const CAMERA: MapCameraSnapshot = {
  target: { latitude: 54.6872, longitude: 25.2797 },
  zoom: 14.5,
};

describe("mapSessionReducer", () => {
  it("keeps marker-detail mode and draft-marker mode mutually exclusive", () => {
    let state = createInitialMapSessionState();

    state = mapSessionReducer(state, {
      type: "captureBrowseCamera",
      payload: CAMERA,
    });
    state = mapSessionReducer(state, {
      type: "selectMarker",
      payload: MARKER,
    });
    state = mapSessionReducer(state, {
      type: "setDraftMarker",
      payload: CAMERA.target,
    });
    state = mapSessionReducer(state, {
      type: "setMarkerInputVisible",
      payload: true,
    });
    state = mapSessionReducer(state, {
      type: "setMarkerDraftName",
      payload: "Bench by the fountain",
    });
    state = mapSessionReducer(state, {
      type: "setMarkerDraftInfo",
      payload: "Good sunlight after lunch.",
    });

    expect(state.browseCamera).toEqual(CAMERA);
    expect(state.draftMarker).toEqual(CAMERA.target);
    expect(state.selectedMarker).toBeNull();
    expect(state.isMarkerInputVisible).toBe(true);
    expect(state.markerDraftFields).toEqual({
      name: "Bench by the fountain",
      info: "Good sunlight after lunch.",
    });
    expect(selectHasTransientUi(state)).toBe(true);

    state = mapSessionReducer(state, {
      type: "selectMarker",
      payload: MARKER,
    });

    expect(state.selectedMarker).toEqual(MARKER);
    expect(state.draftMarker).toBeNull();
    expect(state.isMarkerInputVisible).toBe(false);
  });

  it("starts and stops navigation while keeping browse viewport intact", () => {
    let state = createInitialMapSessionState();

    state = mapSessionReducer(state, {
      type: "captureBrowseCamera",
      payload: CAMERA,
    });
    state = mapSessionReducer(state, {
      type: "selectMarker",
      payload: MARKER,
    });
    state = mapSessionReducer(state, {
      type: "startNavigation",
      payload: MARKER,
    });

    expect(selectIsNavigationActive(state)).toBe(true);
    expect(state.navigationDestination).toEqual(MARKER);
    expect(state.selectedMarker).toBeNull();
    expect(state.draftMarker).toBeNull();
    expect(state.browseCamera).toEqual(CAMERA);

    state = mapSessionReducer(state, { type: "stopNavigation" });

    expect(selectIsNavigationActive(state)).toBe(false);
    expect(state.navigationDestination).toBeNull();
    expect(state.browseCamera).toEqual(CAMERA);
  });

  it("dismisses transient UI without mutating navigation state or draft text", () => {
    let state = createInitialMapSessionState();

    state = mapSessionReducer(state, {
      type: "selectMarker",
      payload: MARKER,
    });
    state = mapSessionReducer(state, {
      type: "setDraftMarker",
      payload: CAMERA.target,
    });
    state = mapSessionReducer(state, {
      type: "setMarkerInputVisible",
      payload: true,
    });
    state = mapSessionReducer(state, {
      type: "setMarkerDraftName",
      payload: "Keep this draft",
    });

    state = mapSessionReducer(state, { type: "dismissTransientUi" });

    expect(state.selectedMarker).toBeNull();
    expect(state.draftMarker).toBeNull();
    expect(state.isMarkerInputVisible).toBe(false);
    expect(state.markerDraftFields.name).toBe("Keep this draft");
  });
});
