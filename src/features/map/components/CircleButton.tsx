import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface CircleButtonProps {
  onPress: () => void;
  icon: string;
  style?: string;
  isCenterOnUser?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const CircleButton: React.FC<CircleButtonProps> = ({
  onPress,
  icon,
  style,
  isCenterOnUser,
  disabled = false,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      className={`bg-[#2D2D2D] w-16 h-16 rounded-full shadow-lg justify-center items-center ${
        disabled ? "opacity-40" : ""
      } ${style}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
