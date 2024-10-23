// components/CustomMarker.tsx
import React from "react";
import { Marker } from "react-native-maps";
import { Image, ImageSourcePropType } from "react-native";

interface CustomMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
  image?: ImageSourcePropType;
  zoomLevel: number;
  onPress?: () => void;
}

const CustomMarker: React.FC<CustomMarkerProps> = ({
  coordinate,
  title,
  description,
  image = require("../assets/images/custom-marker.png"),
  zoomLevel,
  onPress,
}) => {
  // Adjust size based on zoom level
  const size = Math.max(20, Math.min(80, (zoomLevel - 10) * 5));

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      title={title}
      description={description}
    >
      <Image
        source={image}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Marker>
  );
};

export default CustomMarker;