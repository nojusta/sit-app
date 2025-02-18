import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Alert,
  Text,
  Platform,
  TextInput,
} from "react-native";
import MapView, {
  UrlTile,
  Region,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ClusteredMapView from "react-native-map-clustering";
import InfoWindow from "../../components/InfoWindow";
import { useMarkerContext } from "../../context/MarkerContext";
import * as Location from "expo-location";
import CircleButton from "../../components/CircleButton";
import InputBox from "../../components/InputBox";
import { fetchMarkers } from "../../lib/appwrite";

const INITIAL_INFO_WINDOW_HEIGHT = 100; // Initial height of the info window

const HomeApp: React.FC = () => {
  const { setIsMarkerSelected } = useMarkerContext();
  const [zoomLevel, setZoomLevel] = useState<number>(10); // State to track the zoom level
  const [fetchedMarkers, setFetchedMarkers] = useState<any[]>([]); // State to store markers
  const [selectedMarker, setSelectedMarker] = useState<any>(null); // State to track the selected marker
  const [lastRegion, setLastRegion] = useState<Region | null>(null); // State to store the last region before zooming into a marker
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  ); // State to store the user's location
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // State to store error messages
  const [userMarker, setUserMarker] = useState<Region | null>(null); // State to store the user's marker
  const [markerName, setMarkerName] = useState<string>(""); // State to store the marker name
  const [markerInfo, setMarkerInfo] = useState<string>(""); // State to store the marker information
  const [showInputBox, setShowInputBox] = useState<boolean>(false); // State to show/hide the input box
  const mapRef = useRef<MapView>(null); // Reference to the MapView

  // Define the initial region for the map
  const initialRegion = {
    latitude: 54.6872,
    longitude: 25.2797,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Request location permissions and get the user's current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  // Fetch markers from the database
  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const fetchedMarkers = await fetchMarkers();
        setFetchedMarkers(fetchedMarkers);
      } catch (error) {
        console.error("Error loading markers:", error);
      }
    };

    loadMarkers();
  }, []);

  // Handle region change complete event
  const handleRegionChangeComplete = (region: Region): void => {
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
    setZoomLevel(zoom);
  };

  // Handle marker press event
  const handleMarkerPress = (marker: any) => {
    console.log("Marker pressed:", markerName);
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
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: marker.latitude,
          longitude: marker.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        },
        800
      );
    }
  };

  // Handle map press event
  const handleMapPress = () => {
    if (selectedMarker || userMarker || showInputBox) {
      setSelectedMarker(null);
      setUserMarker(null);
      setShowInputBox(false);
      setIsMarkerSelected(false);
      if (lastRegion) {
        mapRef.current?.animateToRegion(lastRegion, 800);
      }
    }
  };

  // Handle button press to center the map on the user's location
  const handleCenterOnUserLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    } else {
      Alert.alert(
        "Location not available",
        "Unable to get your current location."
      );
    }
  };

  // Handle button press to add a marker at the user's location
  const handleAddMarker = () => {
    if (location) {
      setUserMarker({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      Alert.alert(
        "Location not available",
        "Unable to get your current location."
      );
    }
  };

  // Handle long press on the map to add a marker
  const handleLongPress = (e: any) => {
    const coordinate = e.nativeEvent.coordinate;
    setUserMarker({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setShowInputBox(true); // Show the input box
  };

  // Handle marker drag end event
  const handleMarkerDragEnd = (e: any) => {
    setUserMarker({
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  // Customizable cluster styles
  const clusterStyles = {
    container: {
      width: 40,
      height: 40,
      borderRadius: 30,
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
      <View className="flex-1">
        <ClusteredMapView
          ref={mapRef}
          provider={
            Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
          }
          className="flex-1"
          initialRegion={initialRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={handleMapPress}
          onLongPress={handleLongPress} // Handle long press on the map
          showsUserLocation={true}
          showsMyLocationButton={false}
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
          {fetchedMarkers.map((marker, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              onPress={() => handleMarkerPress(marker)}
            >
              <Image
                source={require("../../assets/images/custom-marker.png")}
                className="w-10 h-10"
              />
            </Marker>
          ))}
          {userMarker && (
            <Marker
              coordinate={userMarker}
              draggable
              onDragEnd={handleMarkerDragEnd}
              title={"Your Marker"}
            >
              <Image
                source={require("../../assets/images/custom-marker.png")}
                className="w-10 h-10"
              />
            </Marker>
          )}
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
        {showInputBox && (
          <InputBox
            markerName={markerName}
            setMarkerName={setMarkerName}
            markerInfo={markerInfo}
            setMarkerInfo={setMarkerInfo}
            setShowInputBox={setShowInputBox}
            latitude={userMarker?.latitude ?? 0}
            longitude={userMarker?.longitude ?? 0}
          />
        )}
        <CircleButton
          onPress={handleCenterOnUserLocation}
          icon="⌖"
          style="absolute bottom-28 right-5"
          isCenterOnUser={true}
        />
        <CircleButton
          onPress={handleAddMarker}
          icon="+"
          style="absolute bottom-28 left-5"
        />
      </View>
    </SafeAreaProvider>
  );
};

export default HomeApp;
