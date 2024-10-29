import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import MapView, { UrlTile, Region, Marker } from "react-native-maps";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ClusteredMapView from "react-native-map-clustering";
import InfoWindow from "../../components/InfoWindow"; // Import the InfoWindow component
import { useMarkerContext } from "../../context/MarkerContext";

const INITIAL_INFO_WINDOW_HEIGHT = 100; // Initial height of the info window

const App: React.FC = () => {
  const { setIsMarkerSelected } = useMarkerContext();
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
    console.log("Marker pressed:", marker);
    if (mapRef.current) {
      mapRef.current.getMapBoundaries().then((boundaries) => {
        const currentRegion = {
          latitude:
            (boundaries.northEast.latitude + boundaries.southWest.latitude) / 2,
          longitude:
            (boundaries.northEast.longitude + boundaries.southWest.longitude) /
            2,
          latitudeDelta: Math.abs(
            boundaries.northEast.latitude - boundaries.southWest.latitude
          ),
          longitudeDelta: Math.abs(
            boundaries.northEast.longitude - boundaries.southWest.longitude
          ),
        };
        setLastRegion(currentRegion);
      });
    }

    setSelectedMarker(marker);
    setIsMarkerSelected(true);
    mapRef.current?.animateToRegion(
      {
        ...marker.coordinate,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      },
      800
    );
  };

  // Handle map press event
  const handleMapPress = () => {
    if (selectedMarker) {
      setSelectedMarker(null);
      setIsMarkerSelected(false);
      if (lastRegion) {
        mapRef.current?.animateToRegion(lastRegion, 800);
      }
    }
  };

  // Multiple Marker data
  const markers = [
    {
      id: 1,
      coordinate: { latitude: 54.6868, longitude: 25.2799 },
      title: "Kudirka Square",
      description: "Benches, skaters, and a statue of Vincas Kudirka",
    },
    {
      id: 2,
      coordinate: { latitude: 54.6839, longitude: 25.2875 },
      title: "Cathedral Square",
      description: "Main square of the Vilnius Old Town",
    },
    {
      id: 3,
      coordinate: { latitude: 54.685, longitude: 25.292 },
      title: "Gediminas' Tower",
      description: "The remaining part of the Upper Castle in Vilnius",
    },
    {
      id: 4,
      coordinate: { latitude: 54.682, longitude: 25.2797 },
      title: "Vilnius University",
      description: "One of the oldest universities in Northern Europe",
    },
    {
      id: 5,
      coordinate: { latitude: 54.6781, longitude: 25.2858 },
      title: "Gate of Dawn",
      description: "A city gate of Vilnius and a prominent landmark",
    },
  ];

  // Customizable cluster styles
  const clusterStyles = {
    container: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "black",
      justifyContent: "center",
      alignItems: "center",
    },
    text: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
    },
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <ClusteredMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={handleMapPress}
          clusterColor="black"
          clusterTextColor="white"
          minimumClusterSize={5}
          customClusterStyles={clusterStyles}
        >
          <UrlTile
            urlTemplate="https://tiles.stadiamaps.com/tiles/Stamen_toner/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          {markers.map((marker, index) => (
            <Marker
              key={index}
              coordinate={marker.coordinate}
              onPress={() => handleMarkerPress(marker)}
            >
              <Image
                source={require("../../assets/images/custom-marker.png")}
                style={{ width: 30, height: 30 }}
              />
            </Marker>
          ))}
        </ClusteredMapView>
        {selectedMarker && (
          <InfoWindow
            selectedMarker={selectedMarker}
            setSelectedMarker={setSelectedMarker}
            lastRegion={lastRegion}
            mapRef={mapRef}
            initialHeight={INITIAL_INFO_WINDOW_HEIGHT}
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
