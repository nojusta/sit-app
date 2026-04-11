import { useCallback, useState } from "react";
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
import { MarkerGalleryTile } from "@/features/markers";
import {
  listMarkersByAuthor,
  signOut,
  updateMarker,
  type MarkerRecord,
  type UploadableImage,
} from "@/services/appwrite";
import { icons } from "@/shared/constants";
import { EmptyState, InfoBox } from "@/shared/components";
import { useAppwrite } from "@/shared/hooks";
import MarkerEditSheet from "./components/MarkerEditSheet";

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

const MarkerGallerySkeleton: React.FC = () => (
  <View className="flex-row flex-wrap justify-between gap-y-4 pt-2">
    {Array.from({ length: 6 }).map((_, index) => (
      <View
        key={`marker-skeleton-${index}`}
        className="overflow-hidden rounded-[24px] border border-slate-700 bg-slate-800"
        style={{
          width: "48%",
          height: PROFILE_CARD_HEIGHT,
        }}
      >
        <View className="h-[128px] bg-slate-700" />
        <View className="px-3 py-3">
          <View className="h-4 rounded-full bg-slate-600" />
          <View className="mt-2 h-3 w-20 rounded-full bg-slate-700" />
        </View>
      </View>
    ))}
  </View>
);

const ProfileScreen: React.FC = () => {
  const { user, setUser, setIsLogged, loading, setLoading } = useAuthContext();
  const router = useRouter();
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);
  const [markerBeingEdited, setMarkerBeingEdited] = useState<MarkerRecord | null>(null);
  const [markerEditDescription, setMarkerEditDescription] = useState("");
  const [queuedMarkerPhotos, setQueuedMarkerPhotos] = useState<UploadableImage[]>([]);
  const [isSubmittingMarkerEdit, setIsSubmittingMarkerEdit] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const {
    data: markers,
    loading: markersLoading,
    refreshing: markersRefreshing,
    refetch: refetchMarkers,
  } = useAppwrite(
    useCallback(
      () => (user?.$id ? listMarkersByAuthor(user.$id) : Promise.resolve([])),
      [user?.$id],
    ),
  );

  const markerCount = markers?.length ?? 0;
  const tileWidth = (windowWidth - 32 - PROFILE_CARD_GAP) / 2;
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
    setQueuedMarkerPhotos([]);
  };

  const closeMarkerEditor = () => {
    setMarkerBeingEdited(null);
    setMarkerEditDescription("");
    setQueuedMarkerPhotos([]);
  };

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
        data={markers ?? []}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 14 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={getMarkerLayout}
        extraData={highlightedMarkerId}
        renderItem={({ item }) => (
          <View style={{ width: tileWidth }}>
            <MarkerGalleryTile
              marker={item}
              isSelected={highlightedMarkerId === item.id}
              onPress={() =>
                setHighlightedMarkerId((current) =>
                  current === item.id ? null : item.id,
                )
              }
              onEditPress={() => openMarkerEditor(item)}
            />
          </View>
        )}
        refreshing={markersRefreshing}
        onRefresh={refetchMarkers}
        ListEmptyComponent={() => (
          <View className="py-6">
            {markersLoading ? (
              <MarkerGallerySkeleton />
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

            <View className="rounded-[30px] bg-slate-800 px-5 py-6 shadow-sm">
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
      />

      <MarkerEditSheet
        marker={markerBeingEdited}
        description={markerEditDescription}
        queuedPhotos={queuedMarkerPhotos}
        isSubmitting={isSubmittingMarkerEdit}
        onDescriptionChange={setMarkerEditDescription}
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
