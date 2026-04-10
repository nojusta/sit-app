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
import { listMarkersByAuthor, signOut, uploadProfilePicture } from "@/services/appwrite";
import { useAppwrite } from "@/shared/hooks";
import { icons, images } from "@/shared/constants";
import { EmptyState, InfoBox } from "@/shared/components";

const ProfileScreen: React.FC = () => {
  const { user, setUser, setIsLogged, loading, setLoading } = useAuthContext();
  const router = useRouter();
  const {
    data: markers,
    loading: markersLoading,
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
    if (response.didCancel) {
      return;
    }

    const file = response.assets?.[0];

    if (!file?.uri) {
      Alert.alert("Error", "Selected file is missing a URI.");
      return;
    }

    setLoading(true);

    try {
      const fileUrl = await uploadProfilePicture({
        uri: file.uri,
        name: file.fileName || "profile.jpg",
        type: file.type || "image/jpeg",
        size: file.fileSize || 0,
      });

      setUser((previousUser) =>
        previousUser ? { ...previousUser, avatar: fileUrl.toString() } : null,
      );
    } catch {
      Alert.alert("Error", "Failed to update the profile picture.");
    } finally {
      setLoading(false);
    }
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
            launchCamera(
              { mediaType: "photo", saveToPhotos: false },
              handleProfilePhotoChange,
            );
          } else if (buttonIndex === 2) {
            launchImageLibrary(
              { mediaType: "photo", selectionLimit: 1 },
              handleProfilePhotoChange,
            );
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
        onPress: () =>
          launchCamera(
            { mediaType: "photo", saveToPhotos: false },
            handleProfilePhotoChange,
          ),
      },
      {
        text: "Choose from Library",
        onPress: () =>
          launchImageLibrary(
            { mediaType: "photo", selectionLimit: 1 },
            handleProfilePhotoChange,
          ),
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FlatList
        data={markers ?? []}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 14 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={({ item }) => <MarkerGalleryTile marker={item} />}
        refreshing={markersLoading}
        onRefresh={refetchMarkers}
        ListEmptyComponent={() => (
          <EmptyState
            title="No submitted markers yet"
            subtitle="Your uploaded sitting spots will appear here after you add them."
          />
        )}
        ListHeaderComponent={() => (
          <View className="pb-8 pt-2">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="font-psemibold text-2xl text-slate-950">Profile</Text>
              <TouchableOpacity
                onPress={handleSignOut}
                className="rounded-full bg-white p-3"
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <Image source={icons.logout} resizeMode="contain" className="h-5 w-5" />
              </TouchableOpacity>
            </View>

            <View className="rounded-[30px] bg-white px-5 py-6 shadow-sm">
              <View className="flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={handleProfilePicturePress}
                  className="h-20 w-20 overflow-hidden rounded-[26px] border border-slate-200"
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
                  <Text className="font-psemibold text-xl text-slate-950">
                    {user?.username || "User"}
                  </Text>
                  <Text className="mt-1 font-pregular text-sm text-slate-500">
                    {user?.email || ""}
                  </Text>
                  <Text className="mt-3 font-pregular text-sm text-slate-600">
                    Every approved or pending sitting place you submit will show up in
                    your gallery here.
                  </Text>
                </View>
              </View>

              <View className="mt-6 rounded-[24px] bg-emerald-50 px-4 py-4">
                <InfoBox
                  title={String(markers?.length ?? 0)}
                  subtitle="Uploaded markers"
                  containerStyles=""
                  titleStyles="text-2xl text-slate-950"
                />
              </View>
            </View>

            <View className="mt-8 flex-row items-center justify-between">
              <Text className="font-psemibold text-lg text-slate-900">Your posts</Text>
              <Text className="font-pregular text-sm text-slate-500">
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
