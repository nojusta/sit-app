import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  GestureResponderEvent,
} from "react-native";
import React from "react";

export type CustomButtonVariant = "primary" | "danger" | "ghost";

interface CustomButtonProps {
  title: string;
  handlePress: (event?: GestureResponderEvent) => void;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  variant?: CustomButtonVariant;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  handlePress,
  containerStyles = "",
  textStyles = "",
  isLoading,
  disabled = false,
  accessibilityLabel,
  variant = "primary",
}) => {
  const isDisabled = Boolean(isLoading || disabled);
  const containerVariantStyles =
    variant === "danger"
      ? "bg-red-600 border border-red-700"
      : variant === "ghost"
        ? "bg-gray-100 border border-gray-200"
        : "bg-secondary-200";
  const textVariantStyles =
    variant === "danger"
      ? "text-white"
      : variant === "ghost"
        ? "text-gray-700"
        : "text-primary";
  const indicatorColor =
    variant === "danger" ? "#FFFFFF" : variant === "ghost" ? "#374151" : "#1F2937";

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`${containerVariantStyles} flex min-h-[52px] flex-row items-center justify-center rounded-xl px-4 py-3 ${containerStyles} ${
        isDisabled ? "opacity-50" : ""
      }`}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <Text className={`${textVariantStyles} font-psemibold text-lg ${textStyles}`}>
        {title}
      </Text>

      {isLoading && (
        <ActivityIndicator
          animating={isLoading}
          color={indicatorColor}
          size="small"
          className="ml-2"
        />
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
