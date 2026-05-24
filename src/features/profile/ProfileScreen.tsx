import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthContext } from "@/features/auth";
import { useMarkerContext } from "@/features/map";
import { MarkerGalleryTile, type MarkerTagId } from "@/features/markers";
import {
  signOut,
  updateMarker,
  type MarkerRecord,
  type UploadableImage,
} from "@/services/appwrite";
import { icons } from "@/shared/constants";
import { EmptyState, InfoBox, Pagination } from "@/shared/components";
import MarkerEditSheet from "./components/MarkerEditSheet";
import useProfileMarkersPagination from "./hooks/useProfileMarkersPagination";

const markerEditPickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.86,
  allowsEditing: false,
  allowsMultipleSelection: true,
  selectionLimit: 0,
  orderedSelection: true,
  presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
};

const buildPickerImages = (result: ImagePicker.ImagePickerResult): UploadableImage[] => {
  if (result.canceled) {
    return [];
  }

  return (result.assets ?? [])
    .filter((asset) => Boolean(asset?.uri))
    .map((asset, index) => ({
      uri: asset.uri as string,
      name: asset.fileName || `marker-edit-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
    }));
};

const getProfileInitials = (value?: string) =>
  value
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "S";

const PROFILE_CARD_HEIGHT = 188;
const PROFILE_CARD_GAP = 14;

const MarkerGalleryLoadingState: React.FC = () => (
  <View className="items-center justify-center rounded-[24px] bg-slate-800 py-12">
    <ActivityIndicator color="#CBD5E1" size="small" />
  </View>
);

const ProfileScreen: React.FC = () => {
  const { user, setUser, setIsLogged, loading, setLoading } = useAuthContext();
  const { setIsPlacementActive } = useMarkerContext();
  const router = useRouter();
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);
  const [markerBeingEdited, setMarkerBeingEdited] = useState<MarkerRecord | null>(null);
  const [markerEditDescription, setMarkerEditDescription] = useState("");
  const [markerEditAttributes, setMarkerEditAttributes] = useState<MarkerTagId[]>([]);
  const [queuedMarkerPhotos, setQueuedMarkerPhotos] = useState<UploadableImage[]>([]);
  const [isSubmittingMarkerEdit, setIsSubmittingMarkerEdit] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const markersListRef = useRef<FlatList<MarkerRecord> | null>(null);
  const {
    markers,
    currentPage,
    totalPages,
    totalCount,
    isLoading: markersLoading,
    isRefreshing: markersRefreshing,
    goToPage,
    refetch: refetchMarkers,
  } = useProfileMarkersPagination(user?.$id);

  const markerCount = totalCount;
  const tileWidth = useMemo(
    () => (windowWidth - 32 - PROFILE_CARD_GAP) / 2,
    [windowWidth],
  );
  const getMarkerLayout = (
    _: ArrayLike<MarkerRecord> | null | undefined,
    index: number,
  ) => {
    const row = Math.floor(index / 2);
    const rowHeight = PROFILE_CARD_HEIGHT + 16;

    return {
      index,
      length: rowHeight,
      offset: row * rowHeight,
    };
  };

  useEffect(() => {
    setHighlightedMarkerId(null);
    markersListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [currentPage]);

  useEffect(() => {
    const isEditingMarker = markerBeingEdited !== null;

    setIsPlacementActive(isEditingMarker);

    return () => {
      if (isEditingMarker) {
        setIsPlacementActive(false);
      }
    };
  }, [markerBeingEdited, setIsPlacementActive]);

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      setUser(null);
      setIsLogged(false);
      router.replace("/sign-in");
    } catch {
      Alert.alert("Error", "Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  const openMarkerEditor = (marker: MarkerRecord) => {
    setMarkerBeingEdited(marker);
    setMarkerEditDescription(marker.description);
    setMarkerEditAttributes(marker.attributes);
    setQueuedMarkerPhotos([]);
  };

  const closeMarkerEditor = () => {
    setMarkerBeingEdited(null);
    setMarkerEditDescription("");
    setMarkerEditAttributes([]);
    setQueuedMarkerPhotos([]);
  };

  const handleMarkerCardPress = useCallback((markerId: string) => {
    setHighlightedMarkerId((current) => (current === markerId ? null : markerId));
  }, []);

  const renderMarkerItem = useCallback(
    ({ item }: { item: MarkerRecord }) => (
      <View style={{ width: tileWidth }}>
        <MarkerGalleryTile
          marker={item}
          isSelected={highlightedMarkerId === item.id}
          onPress={() => handleMarkerCardPress(item.id)}
          onEditPress={() => openMarkerEditor(item)}
        />
      </View>
    ),
    [handleMarkerCardPress, highlightedMarkerId, tileWidth],
  );

  const handleQueuedPhotoSelection = (result: ImagePicker.ImagePickerResult) => {
    try {
      const files = buildPickerImages(result);

      if (files.length === 0) {
        return;
      }

      setQueuedMarkerPhotos((current) => [...current, ...files]);
    } catch (error) {
      Alert.alert(
        "Photo unavailable",
        error instanceof Error ? error.message : "The selected photos could not be read.",
      );
    }
  };

  const handleAddMarkerPhotos = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo library access required",
          "Allow photo access to attach more images to this marker.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync(markerEditPickerOptions);
      handleQueuedPhotoSelection(result);
    } catch (error) {
      Alert.alert(
        "Photo unavailable",
        error instanceof Error ? error.message : "The photo picker could not be opened.",
      );
    }
  };

  const handleSubmitMarkerEdit = async () => {
    if (!markerBeingEdited || !user?.$id) {
      return;
    }

    setIsSubmittingMarkerEdit(true);

    try {
      await updateMarker({
        markerId: markerBeingEdited.id,
        authorId: user.$id,
        description: markerEditDescription,
        existingPhotoUrls: markerBeingEdited.photoUrls ?? [],
        newPhotos: queuedMarkerPhotos,
        attributes: markerEditAttributes,
      });
      closeMarkerEditor();
      await refetchMarkers();
      Alert.alert(
        "Marker updated",
        "Your edits were saved and the marker is pending approval again.",
      );
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Could not update the marker.",
      );
    } finally {
      setIsSubmittingMarkerEdit(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-800">
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-800" edges={["top"]}>
      <FlatList
        ref={markersListRef}
        data={markers}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 14 }}
        onTouchStart={() => {
          if (highlightedMarkerId && !markerBeingEdited) {
            setHighlightedMarkerId(null);
          }
        }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={getMarkerLayout}
        extraData={highlightedMarkerId}
        onScrollBeginDrag={() => {
          if (highlightedMarkerId) {
            setHighlightedMarkerId(null);
          }
        }}
        renderItem={renderMarkerItem}
        refreshing={markersRefreshing}
        onRefresh={refetchMarkers}
        ListEmptyComponent={() => (
          <View className="py-6">
            {markersLoading ? (
              <MarkerGalleryLoadingState />
            ) : (
              <EmptyState
                title="No submitted markers yet"
                subtitle="Your uploaded sitting spots will appear here after you add them."
              />
            )}
          </View>
        )}
        ListHeaderComponent={() => (
          <View className="pb-8 pt-2">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="font-psemibold text-2xl text-gray-200">Profile</Text>
              <TouchableOpacity
                onPress={handleSignOut}
                className="rounded-full bg-slate-700 p-3"
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <Image source={icons.logout} resizeMode="contain" className="h-5 w-5" />
              </TouchableOpacity>
            </View>

            <View className="rounded-[30px] border border-slate-700 bg-slate-800 px-5 py-6 shadow-sm">
              <View className="flex-row items-center gap-4">
                <View className="h-20 w-20 overflow-hidden rounded-[26px] border border-slate-600">
                  {user?.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
                      resizeMode="cover"
                      className="h-full w-full"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-slate-700">
                      <Text className="font-psemibold text-2xl text-slate-100">
                        {getProfileInitials(user?.username || user?.email)}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="font-psemibold text-xl text-slate-100">
                    {user?.username || "User"}
                  </Text>
                  <Text className="mt-1 font-pregular text-sm text-slate-400">
                    {user?.email || ""}
                  </Text>
                  <Text className="mt-3 font-pregular text-sm text-slate-300">
                    Marker edits happen from your post cards below. Profile photos are
                    server-managed for now.
                  </Text>
                </View>
              </View>

              <View className="mt-6 rounded-[24px] bg-slate-700 px-4 py-4">
                <InfoBox
                  title={String(markerCount)}
                  subtitle="Uploaded markers"
                  containerStyles=""
                  titleStyles="text-2xl text-slate-100"
                />
              </View>
            </View>

            <View className="mt-8 flex-row items-center justify-between">
              <Text className="font-psemibold text-lg text-slate-100">Your posts</Text>
              <Text className="font-pregular text-sm text-slate-400">
                Tap a card to edit it
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={() => (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            isLoading={markersLoading && markerCount > 0}
            onPageChange={goToPage}
          />
        )}
      />

      <MarkerEditSheet
        marker={markerBeingEdited}
        description={markerEditDescription}
        attributes={markerEditAttributes}
        queuedPhotos={queuedMarkerPhotos}
        isSubmitting={isSubmittingMarkerEdit}
        onDescriptionChange={setMarkerEditDescription}
        onAttributesChange={setMarkerEditAttributes}
        onAddPhotos={handleAddMarkerPhotos}
        onRemoveQueuedPhoto={(index) =>
          setQueuedMarkerPhotos((current) =>
            current.filter((_, itemIndex) => itemIndex !== index),
          )
        }
        onClose={closeMarkerEditor}
        onSubmit={handleSubmitMarkerEdit}
      />
    </SafeAreaView>
  );
};

export default ProfileScreen;
