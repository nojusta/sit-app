import { useRouter } from "expo-router";
import {
  SafeAreaView,
  Text,
  View,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useGlobalContext } from "../../context/GlobalProvider";
import { icons } from "../../constants";
import { signOut } from "../../lib/appwrite"; // Import the signOut function

const Settings: React.FC = () => {
  const { setUser, setIsLogged, setLoading } = useGlobalContext();
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

  return (
    <SafeAreaView className="flex-1 bg-gray-800">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row justify-between items-center mb-12">
          <Text className="text-3xl text-gray-300 font-pbold">Settings</Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Image
              source={icons.logout}
              resizeMode="contain"
              style={{ width: 28, height: 28, tintColor: 'red' }}
            />
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="text-2xl text-gray-300 mb-4 font-pbold">Account</Text>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.profile}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: '#9CA3AF' }} // Lighter gray
            />
            <Text className="text-xl text-gray-400 font-pregular">Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.privacy}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: '#9CA3AF' }} // Lighter gray
            />
            <Text className="text-xl text-gray-400 font-pregular">Privacy</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="text-2xl text-gray-300 mb-4 font-pbold">Notifications</Text>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.push}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: '#9CA3AF' }} // Lighter gray
            />
            <Text className="text-xl text-gray-400 font-pregular">Email Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.email}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: '#9CA3AF' }} // Lighter gray
            />
            <Text className="text-xl text-gray-400 font-pregular">Push Notifications</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="text-2xl text-gray-300 mb-4 font-pbold">About</Text>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.terms}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: '#9CA3AF' }} // Lighter gray
            />
            <Text className="text-xl text-gray-400 font-pregular">Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4 flex-row items-center">
            <Image
              source={icons.privacypolicy}
              resizeMode="contain"
              style={{ width: 28, height: 28, marginRight: 12, tintColor: '#9CA3AF' }} // Lighter gray
            />
            <Text className="text-xl text-gray-400 font-pregular">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;