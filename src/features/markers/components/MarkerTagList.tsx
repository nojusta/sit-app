import React from "react";
import { StyleSheet, View } from "react-native";

import type { MarkerTagId } from "../constants/tags";
import MarkerTagPill from "./MarkerTagPill";

interface MarkerTagListProps {
  attributes?: MarkerTagId[] | null;
}

const MarkerTagList: React.FC<MarkerTagListProps> = ({ attributes }) => {
  if (!attributes?.length) {
    return null;
  }

  return (
    <View style={styles.pills}>
      {attributes.map((tagId) => (
        <MarkerTagPill key={tagId} tagId={tagId} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
  },
});

export default MarkerTagList;
