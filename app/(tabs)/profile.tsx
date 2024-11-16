import { useRouter } from "expo-router";
import {
  SafeAreaView,
  Text,
  View,
  Button,
  Alert,
  Image,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';

import { icons, images } from "../../constants"; 
import { useGlobalContext } from "../../context/GlobalProvider";
import { EmptyState, InfoBox, VideoCard } from "../../components";
import { signOut, uploadProfilePicture } from "../../lib/appwrite"; 

interface Post {
  $id: string;
  title: string;
  thumbnail: string;
  video: string;
  creator: {
    username: string;
    avatar: string;
  };
}

interface User {
  $id: string;
  username: string;
  avatar: string;
}

const Profile: React.FC = () => {
  const { user, setUser, setIsLogged, loading, setLoading } = useGlobalContext();
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(); // Use the signOut function from appwrite.js
      setUser(null); // Reset the user state
      setIsLogged(false);
      Alert.alert("Success", "User signed out successfully");
      router.replace("/sign-in");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }
  
    const file = response.assets?.[0];
    if (file) {
      setLoading(true);
      try {
        const fileUrl = await uploadProfilePicture({
          uri: file.uri,
          name: file.fileName,
          type: file.type,
        });
        setUser((prevUser: User) => ({ ...prevUser, avatar: fileUrl }));
        Alert.alert("Success", "Profile picture updated successfully");
      } catch (error) {
        Alert.alert("Error", "Failed to update profile picture");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProfilePicturePress = () => {
    console.log("Profile picture pressed");
    if (Platform.OS === 'ios') {
      console.log("iOS platform detected");
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          console.log("Button index:", buttonIndex);
          if (buttonIndex === 1) {
            console.log("Launching camera");
            launchCamera({ mediaType: 'photo' }, handleFileChange);
          } else if (buttonIndex === 2) {
            console.log("Launching image library");
            launchImageLibrary({ mediaType: 'photo' }, handleFileChange);
          }
        }
      );
    } else {
      console.log("Android platform detected");
      Alert.alert(
        "Select Option",
        "Choose an option to update your profile picture",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Take Photo",
            onPress: () => {
              console.log("Take Photo pressed");
              launchCamera({ mediaType: 'photo' }, handleFileChange);
            }
          },
          {
            text: "Choose from Library",
            onPress: () => {
              console.log("Choose from Library pressed");
              launchImageLibrary({ mediaType: 'photo' }, handleFileChange);
            }
          }
        ]
      );
    }
  };

  const renderItem: ListRenderItem<Post> = ({ item }) => (
    <VideoCard
      title={item.title}
      thumbnail={item.thumbnail}
      video={item.video}
      creator={item.creator.username}
      avatar={item.creator.avatar}
    />
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-800">
      <FlatList
        data={[]} // Temporarily set to an empty array
        keyExtractor={(item) => item.$id}
        renderItem={renderItem}
        ListEmptyComponent={() => <EmptyState title="bus" subtitle="bus" />}
        ListHeaderComponent={() => (
          <View className="w-full justify-center items-center mt-6 mb-12 px-4">
            <TouchableOpacity
              onPress={handleSignOut}
              className="w-full items-end mb-10"
            >
              <Image
                source={icons.logout}
                resizeMode="contain"
                className="w-6 h-6"
              />
            </TouchableOpacity>

            <View className="w-16 h-16 border border-gray-500 rounded-lg justify-center items-center">
              <TouchableOpacity onPress={handleProfilePicturePress} style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <Image
                  source={user?.avatar ? { uri: user.avatar } : images.profile} // Use images.profile for testing
                  className="w-11/12 h-11/12 rounded-lg"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>

            <InfoBox
              title={user?.username || ""} // Ensure username is a string
              subtitle="" // Added missing subtitle prop
              containerStyles="mt-5"
              titleStyles="text-lg"
            />

            <View className="mt-5 flex-row">
              <InfoBox
                title={(0).toString()} // Temporarily set to 0 and converted to string
                subtitle="Posts"
                titleStyles="text-xl"
                containerStyles="mr-10"
              />
              <InfoBox
                title="1.2k"
                subtitle="Followers"
                titleStyles="text-xl"
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Profile;