import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { MARKER_TAGS, MAX_MARKER_ATTRIBUTES, type MarkerTagId } from "../constants/tags";
import MarkerTagPill from "./MarkerTagPill";

interface MarkerTagSelectorProps {
  value: MarkerTagId[];
  onChange: (value: MarkerTagId[]) => void;
  disabled?: boolean;
}

const MarkerTagSelector: React.FC<MarkerTagSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const selectedIds = value
    .filter((tagId, index, values) => values.indexOf(tagId) === index)
    .slice(0, MAX_MARKER_ATTRIBUTES);
  const selectedCount = selectedIds.length;

  const toggleTag = (tagId: MarkerTagId) => {
    if (disabled) {
      return;
    }

    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((currentTagId) => currentTagId !== tagId));
      return;
    }

    if (selectedCount >= MAX_MARKER_ATTRIBUTES) {
      return;
    }

    onChange([...selectedIds, tagId]);
  };

  return (
    <View>
      <View style={styles.header}>
        <Text className="font-pmedium text-sm text-slate-700">Tags</Text>
        <Text className="font-pregular text-xs text-slate-500">
          {selectedCount}/{MAX_MARKER_ATTRIBUTES} selected
        </Text>
      </View>

      <View testID="marker-tag-selector-pills" style={styles.pills}>
        {MARKER_TAGS.map((tag) => {
          const isSelected = selectedIds.includes(tag.id);
          const isDisabled =
            disabled || (!isSelected && selectedCount >= MAX_MARKER_ATTRIBUTES);

          return (
            <MarkerTagPill
              key={tag.id}
              tagId={tag.id}
              selected={isSelected}
              disabled={isDisabled}
              onPress={() => toggleTag(tag.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pills: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 10,
  },
});

export default MarkerTagSelector;
