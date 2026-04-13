import { useRouter } from "expo-router";
import { Text, View, Alert, Image, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "@/features/auth";
import { signOut } from "@/services/appwrite";
import { icons } from "@/shared/constants";

const Settings: React.FC = () => {
  const { setUser, setIsLogged, setLoading } = useAuthContext();
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(); // Use the signOut function from appwrite.js
      setUser(null); // Reset the user state
      setIsLogged(false);
      Alert.alert("Success", "User signed out successfully");
      router.replace("/sign-in");
    } catch {
      Alert.alert("Error", "Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-800">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="mb-12 flex-row items-center justify-between">
          <Text className="font-pbold text-3xl text-gray-300">Settings</Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Image
              source={icons.logout}
              resizeMode="contain"
              style={{ width: 28, height: 28, tintColor: "red" }}
            />
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="mb-4 font-pbold text-2xl text-gray-300">Account</Text>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.profile}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: "#9CA3AF" }} // Lighter gray
            />
            <Text className="font-pregular text-xl text-gray-400">Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.privacy}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: "#9CA3AF" }} // Lighter gray
            />
            <Text className="font-pregular text-xl text-gray-400">Privacy</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="mb-4 font-pbold text-2xl text-gray-300">Notifications</Text>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.push}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: "#9CA3AF" }} // Lighter gray
            />
            <Text className="font-pregular text-xl text-gray-400">
              Email Notifications
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.email}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: "#9CA3AF" }} // Lighter gray
            />
            <Text className="font-pregular text-xl text-gray-400">
              Push Notifications
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="mb-4 font-pbold text-2xl text-gray-300">About</Text>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.terms}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: "#9CA3AF" }} // Lighter gray
            />
            <Text className="font-pregular text-xl text-gray-400">Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.privacypolicy}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: "#9CA3AF" }} // Lighter gray
            />
            <Text className="font-pregular text-xl text-gray-400">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
