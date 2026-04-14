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
      className={`h-16 w-16 items-center justify-center rounded-full bg-[#2D2D2D] shadow-lg ${
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
        <Text className="text-3xl font-bold text-white">{icon}</Text>
      )}
    </TouchableOpacity>
  );
};

export default CircleButton;
