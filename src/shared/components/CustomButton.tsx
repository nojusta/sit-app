import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  GestureResponderEvent,
} from "react-native";
import React from "react";

interface CustomButtonProps {
  title: string;
  handlePress: (event?: GestureResponderEvent) => void;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  handlePress,
  containerStyles = "",
  textStyles = "",
  isLoading,
  disabled = false,
  accessibilityLabel,
}) => {
  const isDisabled = Boolean(isLoading || disabled);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`bg-secondary-200 rounded-xl min-h-[62px] flex flex-row justify-center items-center ${containerStyles} ${
        isDisabled ? "opacity-50" : ""
      }`}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <Text className={`text-primary font-psemibold text-lg ${textStyles}`}>{title}</Text>

      {isLoading && (
        <ActivityIndicator
          animating={isLoading}
          color="#fff"
          size="small"
          className="ml-2"
        />
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
