import React from "react";
import { View, TextInput, TouchableOpacity, Text, Alert } from "react-native";

interface InputBoxProps {
  markerName: string;
  setMarkerName: (name: string) => void;
  markerInfo: string;
  setMarkerInfo: (info: string) => void;
  setShowInputBox: (show: boolean) => void;
}

const InputBox: React.FC<InputBoxProps> = ({
  markerName,
  setMarkerName,
  markerInfo,
  setMarkerInfo,
  setShowInputBox,
}) => {
  const handleCameraPress = () =>
    Alert.alert("Camera", "Camera button pressed");
  const handleGalleryPress = () =>
    Alert.alert("Gallery", "Gallery button pressed");

  const handleSubmit = () => {
    Alert.alert("Marker Info", `Name: ${markerName}\nInfo: ${markerInfo}`);
    setShowInputBox(false);
  };

  return (
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
          onPress={handleCameraPress}
          activeOpacity={0.8}
        >
          <Text className="text-gray-50 font-psemibold">Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-cyan-800 p-3 rounded-lg items-center"
          onPress={handleGalleryPress}
          activeOpacity={0.8}
        >
          <Text className="text-gray-50 font-psemibold">Choose Photo</Text>
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
  );
};

export default InputBox;