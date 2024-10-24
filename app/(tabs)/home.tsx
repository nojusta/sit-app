import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Animated, Dimensions, Easing } from "react-native";
import MapView, { UrlTile, Region } from "react-native-maps";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomMarker from "../../components/CustomMarker";
import InfoWindow from "../../components/InfoWindow"; // Import the InfoWindow component

const INITIAL_INFO_WINDOW_HEIGHT = 100; // Initial height of the info window

const App: React.FC = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(10); // State to track the zoom level
  const [selectedMarker, setSelectedMarker] = useState<any>(null); // State to track the selected marker
  const [lastRegion, setLastRegion] = useState<Region | null>(null); // State to store the last region before zooming into a marker
  const mapRef = useRef<MapView>(null); // Reference to the MapView

  // Define the initial region for the map
  const initialRegion = {
    latitude: 54.6872,
    longitude: 25.2797,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Handle region change complete event
  const handleRegionChangeComplete = (region: Region): void => {
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
    setZoomLevel(zoom);
  };

  // Handle marker press event
  const handleMarkerPress = (marker: any) => {
    console.log("Marker pressed:", marker); // Debugging log
    if (mapRef.current) {
      mapRef.current.getMapBoundaries().then((boundaries) => {
        const currentRegion = {
          latitude: (boundaries.northEast.latitude + boundaries.southWest.latitude) / 2,
          longitude: (boundaries.northEast.longitude + boundaries.southWest.longitude) / 2,
          latitudeDelta: Math.abs(boundaries.northEast.latitude - boundaries.southWest.latitude),
          longitudeDelta: Math.abs(boundaries.northEast.longitude - boundaries.southWest.longitude),
        };
        setLastRegion(currentRegion);
      });
    }

    setSelectedMarker(marker);
    mapRef.current?.animateToRegion({
      ...marker.coordinate,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    }, 800);
  };

  // Handle map press event
  const handleMapPress = () => {
    if (selectedMarker) {
      setSelectedMarker(null);
      if (lastRegion) {
        mapRef.current?.animateToRegion(lastRegion, 800);
      }
    }
  };

  // Marker data
  const markers = [
    {
      coordinate: { latitude: 54.6868, longitude: 25.2799 },
      title: "Kudirka Square",
      description: "Benches, skaters, and a statue of Vincas Kudirka",
    },
    {
      coordinate: { latitude: 54.6839, longitude: 25.2875 },
      title: "Cathedral Square",
      description: "Main square of the Vilnius Old Town",
    },
    {
      coordinate: { latitude: 54.6850, longitude: 25.2920 },
      title: "Gediminas' Tower",
      description: "The remaining part of the Upper Castle in Vilnius",
    },
    {
      coordinate: { latitude: 54.6820, longitude: 25.2797 },
      title: "Vilnius University",
      description: "One of the oldest universities in Northern Europe",
    },
    {
      coordinate: { latitude: 54.6781, longitude: 25.2858 },
      title: "Gate of Dawn",
      description: "A city gate of Vilnius and a prominent landmark",
    },
  ];

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={handleMapPress}
        >
          <UrlTile
            urlTemplate="https://tiles.stadiamaps.com/tiles/Stamen_toner/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          {markers.map((marker, index) => (
            <CustomMarker
              key={index}
              coordinate={marker.coordinate}
              zoomLevel={zoomLevel}
              onPress={() => handleMarkerPress(marker)}
            />
          ))}
        </MapView>
        {selectedMarker && (
          <InfoWindow
            selectedMarker={selectedMarker}
            setSelectedMarker={setSelectedMarker}
            lastRegion={lastRegion}
            mapRef={mapRef}
            initialHeight={INITIAL_INFO_WINDOW_HEIGHT} // Pass initialHeight prop
          />
        )}
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default App;