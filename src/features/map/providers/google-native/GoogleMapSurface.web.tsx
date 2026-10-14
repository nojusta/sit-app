import React, { useEffect } from "react";
import { Text, View } from "react-native";

import type { GoogleMapSurfaceProps } from "./googleMapSurface.types";
import { googleMapSurfaceStyles as styles } from "./googleMapSurface.styles";

// Preserve the existing web fallback without importing native Fabric components.
const GoogleMapSurface: React.FC<GoogleMapSurfaceProps> = ({ mapControllerRef }) => {
  useEffect(() => {
    mapControllerRef.current = null;
  }, [mapControllerRef]);

  return (
    <View style={styles.unavailableState}>
      <View style={styles.unavailableCard}>
        <Text style={styles.unavailableTitle}>Map unavailable</Text>
        <Text style={styles.unavailableText}>
          Open the latest app build to use the map and navigation features.
        </Text>
      </View>
    </View>
  );
};

export default GoogleMapSurface;
