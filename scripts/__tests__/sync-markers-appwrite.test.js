"use strict";

const { MARKER_TAG_IDS, markerAttributes } = require("../sync-markers-appwrite");

describe("marker Appwrite schema sync", () => {
  it("defines the marker attributes enum array used by tagged marker payloads", () => {
    expect(markerAttributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attributes",
          kind: "enum",
          payload: expect.objectContaining({
            key: "attributes",
            array: true,
            required: false,
            elements: MARKER_TAG_IDS,
          }),
        }),
      ]),
    );
  });
});
