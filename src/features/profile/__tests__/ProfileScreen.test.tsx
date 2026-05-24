import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { MarkerRecord } from "@/services/appwrite";
import ProfileScreen from "../ProfileScreen";

const mockReplace = jest.fn();
const mockSetIsPlacementActive = jest.fn();
const mockRefetchMarkers = jest.fn();

const marker: MarkerRecord = {
  id: "marker-1",
  title: "Bench near Cathedral",
  description: "Quiet spot",
  coordinate: {
    latitude: 54.6872,
    longitude: 25.2797,
  },
  location: "54.687200,25.279700",
  status: "approved",
  authorId: "user-1",
  createdAt: "2026-05-11T09:00:00.000Z",
  photoUrl: null,
  photoUrls: [],
  attributes: ["quiet"],
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  UIImagePickerPresentationStyle: {
    FULL_SCREEN: "fullScreen",
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock("@/features/auth", () => ({
  useAuthContext: () => ({
    user: {
      $id: "user-1",
      username: "Tester",
      email: "tester@example.com",
    },
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
    loading: false,
    setLoading: jest.fn(),
  }),
}));

jest.mock("@/features/map", () => ({
  useMarkerContext: () => ({
    setIsPlacementActive: mockSetIsPlacementActive,
  }),
}));

jest.mock("@/features/markers", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");

  return {
    MarkerGalleryTile: ({
      marker,
      onEditPress,
    }: {
      marker: MarkerRecord;
      onEditPress: () => void;
    }) => (
      <TouchableOpacity onPress={onEditPress}>
        <Text>Edit {marker.title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock("@/services/appwrite", () => ({
  signOut: jest.fn(),
  updateMarker: jest.fn(),
}));

jest.mock("../hooks/useProfileMarkersPagination", () => ({
  __esModule: true,
  default: () => ({
    markers: [marker],
    currentPage: 1,
    totalPages: 1,
    totalCount: 1,
    isLoading: false,
    isRefreshing: false,
    goToPage: jest.fn(),
    refetch: mockRefetchMarkers,
  }),
}));

jest.mock("../components/MarkerEditSheet", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return function MockMarkerEditSheet({
    marker,
    onClose,
    onAttributesChange,
    onSubmit,
  }: {
    marker: MarkerRecord | null;
    onClose: () => void;
    onAttributesChange: (value: MarkerRecord["attributes"]) => void;
    onSubmit: () => void;
  }) {
    return marker ? (
      <View>
        <Text>Editing {marker.title}</Text>
        <TouchableOpacity onPress={() => onAttributesChange(["clean"])}>
          <Text>Set clean tag</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSubmit}>
          <Text>Submit edits</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text>Close editor</Text>
        </TouchableOpacity>
      </View>
    ) : null;
  };
});

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hides the tab bar while the marker edit sheet is open", () => {
    const { getByText, unmount } = render(<ProfileScreen />);

    expect(mockSetIsPlacementActive).toHaveBeenLastCalledWith(false);

    fireEvent.press(getByText("Edit Bench near Cathedral"));

    expect(mockSetIsPlacementActive).toHaveBeenLastCalledWith(true);

    fireEvent.press(getByText("Close editor"));

    expect(mockSetIsPlacementActive).toHaveBeenLastCalledWith(false);

    unmount();
    expect(mockSetIsPlacementActive).toHaveBeenLastCalledWith(false);
  });

  it("submits edited marker tags with profile marker updates", async () => {
    const { updateMarker } = jest.requireMock("@/services/appwrite");
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText("Edit Bench near Cathedral"));
    fireEvent.press(getByText("Set clean tag"));
    fireEvent.press(getByText("Submit edits"));

    await waitFor(() =>
      expect(updateMarker).toHaveBeenCalledWith(
        expect.objectContaining({
          markerId: "marker-1",
          attributes: ["clean"],
        }),
      ),
    );
  });
});
