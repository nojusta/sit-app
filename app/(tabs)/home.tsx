import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, Easing } from "react-native";
import MapView, { UrlTile, Region } from "react-native-maps";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomMarker from "../../components/CustomMarker";

const INITIAL_INFO_WINDOW_HEIGHT = 100; // Initial height of the info window

const App: React.FC = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(10); // State to track the zoom level
  const [selectedMarker, setSelectedMarker] = useState<any>(null); // State to track the selected marker
  const [infoWindowHeight] = useState(new Animated.Value(0)); // Animated value for the info window height
  const [contentMarginTop] = useState(new Animated.Value(10)); // Animated value for the content margin top
  const [isExpanded, setIsExpanded] = useState(false); // State to track if the info window is expanded
  const [lastRegion, setLastRegion] = useState<Region | null>(null); // State to store the last region before zooming into a marker
  const mapRef = useRef<MapView>(null); // Reference to the MapView

  const screenHeight = Dimensions.get('window').height; // Get the screen height
  const insets = useSafeAreaInsets(); // Get the safe area insets

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
    Animated.timing(infoWindowHeight, {
      toValue: INITIAL_INFO_WINDOW_HEIGHT,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    mapRef.current?.animateToRegion({
      ...marker.coordinate,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    }, 800);
  };

  // Handle map press event
  const handleMapPress = () => {
    if (selectedMarker) {
      Animated.timing(infoWindowHeight, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        setSelectedMarker(null);
        infoWindowHeight.setValue(0);
      });

      if (lastRegion) {
        mapRef.current?.animateToRegion(lastRegion, 800);
      }
    }
  };

  // Effect to handle deselecting the marker
  useEffect(() => {
    if (selectedMarker === null) {
      Animated.timing(infoWindowHeight, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        infoWindowHeight.setValue(0);
      });
    }
  }, [selectedMarker]);

  // Pan responder to handle swipe gestures for expanding and minimizing the info window
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 100; // Increase the threshold for detecting the swipe gesture
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0 && !isExpanded) {
        // Swipe up to expand
        Animated.parallel([
          Animated.timing(infoWindowHeight, {
            toValue: screenHeight - insets.top - 20,
            duration: 480,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(contentMarginTop, {
            toValue: 20,
            duration: 480,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          }),
        ]).start(() => setIsExpanded(true));
      } else if (gestureState.dy > 0 && isExpanded) {
        // Swipe down to minimize
        Animated.parallel([
          Animated.timing(infoWindowHeight, {
            toValue: INITIAL_INFO_WINDOW_HEIGHT,
            duration: 480,
            easing: Easing.in(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(contentMarginTop, {
            toValue: 10,
            duration: 480,
            easing: Easing.in(Easing.ease),
            useNativeDriver: false,
          }),
        ]).start(() => setIsExpanded(false));
      }
    },
  });

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
          <Animated.View
            style={[
              styles.infoWindow,
              { height: infoWindowHeight, paddingTop: isExpanded ? insets.top : 10 },
            ]}
            {...panResponder.panHandlers}
          >
            <Animated.View style={[styles.infoContent, { marginTop: contentMarginTop }]}>
              <Text style={styles.infoTitle}>{selectedMarker.title}</Text>
              <Text style={styles.infoDescription}>{selectedMarker.description}</Text>
            </Animated.View>
          </Animated.View>
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
  infoWindow: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoDescription: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default App;