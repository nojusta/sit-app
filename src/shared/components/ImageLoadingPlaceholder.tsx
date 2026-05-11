import React from "react";
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";

interface ImageLoadingPlaceholderProps {
  fill?: boolean;
  className?: string;
  style?: ViewStyle;
}

const ImageLoadingPlaceholder: React.FC<ImageLoadingPlaceholderProps> = ({
  fill = false,
  className,
  style,
}) => (
  <View
    className={className}
    style={[styles.container, fill ? StyleSheet.absoluteFillObject : null, style]}
    accessibilityRole="progressbar"
  >
    <ActivityIndicator color="#64748B" size="small" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
});

export default ImageLoadingPlaceholder;
