import React, { useContext, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import {
  launchImageLibrary,
  launchCamera,
  Asset,
  ImagePickerResponse,
} from "react-native-image-picker";
import { storeMarker, uploadProfilePicture } from "../lib/appwrite";
import { useGlobalContext } from "../context/GlobalProvider";

interface InputBoxProps {
  markerName: string;
  setMarkerName: (name: string) => void;
  markerInfo: string;
  setMarkerInfo: (info: string) => void;
  setShowInputBox: (show: boolean) => void;
  latitude: number;
  longitude: number;
}

const InputBox: React.FC<InputBoxProps> = ({
  markerName,
  setMarkerName,
  markerInfo,
  setMarkerInfo,
  setShowInputBox,
  latitude,
  longitude,
}) => {
  const globalContext = useGlobalContext();
  if (!globalContext) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  const { user, setLoading } = globalContext;
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handleFileChange = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }
    if (response.errorCode) {
      Alert.alert("Error", response.errorMessage || "An error occurred");
      return;
    }

    const file = response.assets?.[0];
    if (file && file.uri) {
      setImageUri(file.uri);
    }
  };

  const handleCameraPress = () => {
    launchCamera({ mediaType: "photo" }, handleFileChange);
  };

  const handleGalleryPress = () => {
    launchImageLibrary({ mediaType: "photo" }, handleFileChange);
  };

  const handleImageSelection = () => {
    Alert.alert(
      "Select Image",
      "Choose an option to add an image",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Take Photo",
          onPress: handleCameraPress,
        },
        {
          text: "Choose from Library",
          onPress: handleGalleryPress,
        },
      ],
      { cancelable: true }
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setLoading(true);
    try {
      let fileId = null;
      if (imageUri) {
        const file = await uploadProfilePicture({
          uri: imageUri,
          name: "marker-image.jpg",
          type: "image/jpeg",
        });
        fileId = file;
      }

      const marker = {
        markerName,
        markerInfo, 
        //image: fileId,
        latitude,
        longitude,
        creator: user.$id,
        timestamp: new Date().toISOString(),
      };

      // Debugging: Log the marker object
      console.log("Marker object:", marker);

      // Ensure markerName exists
      if (!marker.markerName) {
        throw new Error("markerName is missing in marker object");
      }

      await storeMarker(marker);

      Alert.alert("Success", "Marker saved successfully");
      setShowInputBox(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save marker");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        className="absolute top-1/3 left-5 right-5 bg-gray-500 rounded-lg border border-gray-600 p-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.4,
          shadowRadius: 4.65,
          elevation: 8,
        }}
      >
        <TextInput
          className="h-12 bg-gray-600 border border-gray-400 rounded-lg px-4 mb-4 text-base text-gray-50 font-pregular"
          placeholder="Marker name"
          placeholderTextColor="#A0AEC0"
          value={markerName}
          onChangeText={setMarkerName}
        />

        <View className="flex-row justify-between mb-4 gap-3">
          <TouchableOpacity
            className="flex-1 bg-cyan-800 p-3 rounded-lg items-center"
            onPress={handleImageSelection}
            activeOpacity={0.8}
          >
            <Text className="text-gray-50 font-psemibold">Add Image</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          className="h-24 bg-gray-600 border border-gray-400 rounded-lg px-4 mb-4 text-base text-gray-50 font-pregular"
          placeholder="Marker description"
          placeholderTextColor="#A0AEC0"
          value={markerInfo}
          onChangeText={setMarkerInfo}
          multiline
          textAlignVertical="top"
        />

        <View className="flex-row justify-between gap-3">
          <TouchableOpacity
            className="flex-1 bg-gray-700 p-3 rounded-lg items-center"
            onPress={() => setShowInputBox(false)}
            activeOpacity={0.8}
          >
            <Text className="text-gray-50 font-psemibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-cyan-600 p-3 rounded-lg items-center"
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text className="text-gray-50 font-psemibold">Save Marker</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default InputBox;
