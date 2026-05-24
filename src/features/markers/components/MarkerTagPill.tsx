import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { getMarkerTagDefinition, type MarkerTagId } from "../constants/tags";

interface MarkerTagPillProps {
  tagId: MarkerTagId;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const MarkerTagPill: React.FC<MarkerTagPillProps> = ({
  tagId,
  selected = false,
  disabled = false,
  onPress,
  style,
}) => {
  const tag = getMarkerTagDefinition(tagId);

  if (!tag) {
    return null;
  }

  const isInteractive = Boolean(onPress);
  const shouldUseSelectedColor = selected || !isInteractive;
  const visualStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: shouldUseSelectedColor
        ? tag.colors.selectedBackgroundColor
        : tag.colors.backgroundColor,
      borderColor: tag.colors.textColor,
    },
    selected ? styles.selectedPill : null,
    disabled && !selected ? styles.disabledPill : null,
    style,
  ];

  if (isInteractive) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tag.label} tag`}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        testID={`${tagId}-tag-pill`}
        style={({ pressed }) => [
          styles.pill,
          visualStyle,
          pressed && !disabled ? styles.pressedPill : null,
        ]}
      >
        <View style={styles.content}>
          {selected ? (
            <View
              testID={`${tagId}-selected-indicator`}
              style={[styles.selectedDot, { backgroundColor: tag.colors.textColor }]}
            />
          ) : null}
          <Text style={[styles.labelText, { color: tag.colors.textColor }]}>
            {tag.label}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View testID={`${tagId}-tag-pill`} style={[styles.pill, visualStyle]}>
      <View style={styles.content}>
        <Text style={[styles.labelText, { color: tag.colors.textColor }]}>
          {tag.label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 0,
  },
  selectedPill: {
    borderWidth: 1.25,
  },
  disabledPill: {
    opacity: 0.42,
  },
  pressedPill: {
    transform: [{ scale: 0.98 }],
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedDot: {
    width: 6,
    height: 6,
    marginRight: 7,
    borderRadius: 999,
  },
  labelText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

export default MarkerTagPill;
