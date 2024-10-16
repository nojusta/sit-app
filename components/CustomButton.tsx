import { ActivityIndicator, Text, TouchableOpacity, GestureResponderEvent, StyleSheet, ViewStyle, TextStyle } from "react-native";
import React from "react";

interface CustomButtonProps {
  title: string;
  handlePress: (event: GestureResponderEvent) => void;
  containerStyles?: ViewStyle;
  textStyles?: TextStyle;
  isLoading: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
}) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.button,
        containerStyles,
        isLoading && styles.loading,
      ]}
      disabled={isLoading}
    >
      <Text style={[styles.text, textStyles]}>
        {title}
      </Text>

      {isLoading && (
        <ActivityIndicator
          animating={isLoading}
          color="#fff"
          size="small"
          style={styles.indicator}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#D3D3D3', // Replace with your bg-secondary color
    borderRadius: 10, // Replace with your rounded-xl
    minHeight: 62,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#000', // Replace with your text-primary color
    fontFamily: 'Psemibold', // Replace with your font-psemibold
    fontSize: 18, // Replace with your text-lg
  },
  loading: {
    opacity: 0.5,
  },
  indicator: {
    marginLeft: 8, // Replace with your ml-2
  },
});

export default CustomButton;