import { useCallback } from "react";
import { useRouter } from "expo-router";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from "react-native-image-picker";

import { useAuthContext } from "@/features/auth";
import { MarkerGalleryTile } from "@/features/markers";
import {
  listMarkersByAuthor,
  signOut,
  uploadProfilePicture,
  type UploadableImage,
} from "@/services/appwrite";
import { icons, images } from "@/shared/constants";
import { EmptyState, InfoBox } from "@/shared/components";
import { useAppwrite } from "@/shared/hooks";

const profilePickerOptions = {
  mediaType: "photo" as const,
  selectionLimit: 1 as const,
};

const buildPickerImage = (response: ImagePickerResponse): UploadableImage | null => {
  if (response.errorCode) {
    throw new Error(response.errorMessage || "Could not access the selected photo.");
  }

  const file = response.assets?.[0];

  if (!file?.uri) {
    return null;
  }

  return {
    uri: file.uri,
    name: file.fileName || `profile-${Date.now()}.jpg`,
    type: file.type || "image/jpeg",
    size: file.fileSize,
  };
};

const ProfileScreen: React.FC = () => {
  const { user, setUser, setIsLogged, loading, setLoading } = useAuthContext();
  const router = useRouter();
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

  const handleProfilePhotoChange = async (response: ImagePickerResponse) => {
    try {
      const file = buildPickerImage(response);

      if (!file) {
        return;
      }

      setLoading(true);
      const fileUrl = await uploadProfilePicture(file);
      setUser((previousUser) =>
        previousUser ? { ...previousUser, avatar: fileUrl.toString() } : null,
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update the profile picture.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openCamera = () => {
    launchCamera(
      { ...profilePickerOptions, saveToPhotos: false },
      handleProfilePhotoChange,
    );
  };

  const openLibrary = () => {
    launchImageLibrary(profilePickerOptions, handleProfilePhotoChange);
  };

  const handleProfilePicturePress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openLibrary();
          }
        },
      );
      return;
    }

    Alert.alert("Update profile photo", "Choose how you want to add your picture.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Take Photo",
        onPress: openCamera,
      },
      {
        text: "Choose from Library",
        onPress: openLibrary,
      },
    ]);
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
        renderItem={({ item }) => <MarkerGalleryTile marker={item} />}
        refreshing={markersRefreshing}
        onRefresh={refetchMarkers}
        ListEmptyComponent={() => (
          <View className="py-6">
            {markersLoading ? (
              <ActivityIndicator size="small" color="#E2E8F0" />
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
                <TouchableOpacity
                  onPress={handleProfilePicturePress}
                  className="h-20 w-20 overflow-hidden rounded-[26px] border border-slate-600"
                  accessibilityRole="button"
                  accessibilityLabel="Update profile picture"
                >
                  <Image
                    source={user?.avatar ? { uri: user.avatar } : images.profile}
                    resizeMode="cover"
                    className="h-full w-full"
                  />
                </TouchableOpacity>

                <View className="flex-1">
                  <Text className="font-psemibold text-xl text-slate-100">
                    {user?.username || "User"}
                  </Text>
                  <Text className="mt-1 font-pregular text-sm text-slate-400">
                    {user?.email || ""}
                  </Text>
                  <Text className="mt-3 font-pregular text-sm text-slate-300">
                    Every approved or pending sitting place you submit will show up in
                    your gallery here.
                  </Text>
                </View>
              </View>

              <View className="mt-6 rounded-[24px] bg-slate-700 px-4 py-4">
                <InfoBox
                  title={String(markers?.length ?? 0)}
                  subtitle="Uploaded markers"
                  containerStyles=""
                  titleStyles="text-2xl text-slate-100"
                />
              </View>
            </View>

            <View className="mt-8 flex-row items-center justify-between">
              <Text className="font-psemibold text-lg text-slate-100">Your posts</Text>
              <Text className="font-pregular text-sm text-slate-400">
                Pull to refresh
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default ProfileScreen;
