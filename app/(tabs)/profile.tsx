import { router } from "expo-router";
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
} from "react-native";

import { icons } from "../../constants";
import { useGlobalContext } from "../../context/GlobalProvider";
import { EmptyState, InfoBox, VideoCard } from "../../components";
import { signOut } from "../../lib/appwrite"; // Import the signOut function

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

const Profile: React.FC = () => {
  const { setUser, setIsLogged } = useGlobalContext();

  const handleSignOut = async () => {
    try {
      await signOut(); // Use the signOut function from appwrite.js
      setUser(null); // Reset the user state
      setIsLogged(false);
      Alert.alert("Success", "User signed out successfully");
      router.replace("/sign-in");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
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
              {/* <Image
                source={{ uri: user?.avatar || "" }} // Ensure avatar is a string
                className="w-11/12 h-11/12 rounded-lg"
                resizeMode="cover"
              /> */}
            </View>

            {/* <InfoBox
              title={user?.username || ""} // Ensure username is a string
              subtitle="" // Added missing subtitle prop
              containerStyles="mt-5"
              titleStyles="text-lg"
            /> */}

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
