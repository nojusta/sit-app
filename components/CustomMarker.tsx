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

const MARKER_SCALE = 8; // Constant for the scale of the marker

const CustomMarker: React.FC<CustomMarkerProps> = ({
  coordinate,
  title,
  description,
  image = require("../assets/images/custom-marker.png"),
  zoomLevel,
  onPress,
}) => {
  // Adjust size based on zoom level using a logarithmic scale
  const size = Math.max(10, Math.min(40, MARKER_SCALE * Math.log2(zoomLevel)));

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