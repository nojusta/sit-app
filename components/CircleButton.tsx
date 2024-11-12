import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { MaterialIcons } from '@expo/vector-icons'; 

interface CircleButtonProps {
  onPress: () => void;
  icon: string;
  style?: string;
  isCenterOnUser?: boolean; 
}

const CircleButton: React.FC<CircleButtonProps> = ({ onPress, icon, style, isCenterOnUser }) => {
  return (
    <TouchableOpacity
      className={`bg-[#2D2D2D] w-16 h-16 rounded-full shadow-lg justify-center items-center ${style}`}
      onPress={onPress}
    >
      {isCenterOnUser ? (
        <MaterialIcons name="my-location" size={24} color="white" /> 
      ) : (
        <Text className="text-white text-3xl font-bold">{icon}</Text>
      )}
    </TouchableOpacity>
  );
};

export default CircleButton;