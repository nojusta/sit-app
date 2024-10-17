import React, { useState } from "react";
import { View } from "react-native";
import MapView, { UrlTile, Region } from "react-native-maps";
import CustomMarker from "../../components/CustomMarker"; 

const App: React.FC = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(0);

  const handleRegionChangeComplete = (region: Region): void => {
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
    setZoomLevel(zoom);
  };

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <MapView
        className="w-full h-full"
        initialRegion={{
          latitude: 54.6872,
          longitude: 25.2797,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        <UrlTile
          urlTemplate="https://tiles.stadiamaps.com/tiles/Stamen_toner/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        <CustomMarker
          coordinate={{ latitude: 54.6872, longitude: 25.2797 }}
          title={"Kudirka Square"}
          description={"Benches, skaters, and a statue of Vincas Kudirka"}
          zoomLevel={zoomLevel} // Pass the zoom level to the custom marker
        />
      </MapView>
    </View>
  );
};

export default App;