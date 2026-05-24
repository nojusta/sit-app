import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

interface CircleButtonProps {
  onPress: () => void;
  icon?: string;
  materialIconName?: ComponentProps<typeof MaterialIcons>["name"];
  size?: "medium" | "large";
  badgeCount?: number;
  style?: string;
  isCenterOnUser?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const CircleButton: React.FC<CircleButtonProps> = ({
  onPress,
  icon,
  materialIconName,
  size = "large",
  badgeCount = 0,
  style,
  isCenterOnUser,
  disabled = false,
  accessibilityLabel,
}) => {
  const buttonSizeClass = size === "medium" ? "h-14 w-14" : "h-16 w-16";
  const iconName = isCenterOnUser ? "my-location" : materialIconName;

  return (
    <TouchableOpacity
      className={`relative ${buttonSizeClass} items-center justify-center rounded-full border border-[#4A4A4A] bg-[#2D2D2D] ${
        disabled ? "opacity-40" : ""
      } ${style}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {iconName ? (
        <MaterialIcons name={iconName} size={24} color="white" />
      ) : (
        <Text className="text-3xl font-bold text-white">{icon}</Text>
      )}
      {badgeCount > 0 ? (
        <View className="min-h-6 min-w-6 absolute -right-1 -top-1 items-center justify-center rounded-full bg-red-600 px-1.5">
          <Text className="font-psemibold text-xs text-white">{badgeCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

export default CircleButton;
