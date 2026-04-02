import React, { useEffect, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Image, Platform, Linking } from "react-native";
import MapView, {
  UrlTile,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ClusteredMapView from "react-native-map-clustering";
import {
  CircleButton,
  GoogleNavigationView,
  InfoWindow,
  useMapInteractions,
  useMarkerContext,
  useUserLocation,
} from "@/features/map";
import { MarkerInputBox } from "@/features/markers";
import { CustomButton, NoticeBanner } from "@/shared/components";

const INITIAL_INFO_WINDOW_HEIGHT = 170;

const HomeApp: React.FC = () => {
  const { setIsMarkerSelected } = useMarkerContext();
  const mapRef = useRef<MapView | null>(null); // Reference to the MapView
  const superClusterRef = useRef(null);
  const isFocused = useIsFocused();
  const { location, isPermissionDenied, refreshLocation } = useUserLocation();
  const {
    markers,
    selectedMarker,
    userMarker,
    markerName,
    markerInfo,
    showInputBox,
    setMarkerName,
    setMarkerInfo,
    setShowInputBox,
    handleMarkerPress,
    handleMapPress,
    handleLongPress,
    handleMarkerDragEnd,
    handleCenterOnUserLocation,
    handleAddMarker,
    handleStartNavigation,
    handleStopNavigation,
    isNavigationActive,
    activeNavigationDestination,
  } = useMapInteractions({
    mapRef,
    location,
    isLocationPermissionDenied: isPermissionDenied,
    onMarkerSelectionChange: setIsMarkerSelected,
  });

  // Define the initial region for the map
  const initialRegion = {
    latitude: 54.6872,
    longitude: 25.2797,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
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

  useEffect(() => {
    if (isFocused) {
      void refreshLocation({ requestPermission: false });
    }
  }, [isFocused, refreshLocation]);

  return (
    <SafeAreaProvider>
      <View className="flex-1">
        {isPermissionDenied && (
          <NoticeBanner
            title="Location access required"
            description="Enable location permission to use location-based navigation features on the map."
            actionLabel="Open settings"
            onAction={() => Linking.openSettings()}
          />
        )}
        {isNavigationActive && activeNavigationDestination ? (
          <GoogleNavigationView
            destination={activeNavigationDestination}
            onStopNavigation={handleStopNavigation}
          />
        ) : (
          <ClusteredMapView
            mapRef={(map) => {
              mapRef.current = map as MapView | null;
            }}
            superClusterRef={superClusterRef}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            className="flex-1"
            initialRegion={initialRegion}
            onPress={handleMapPress}
            onRegionChangeComplete={() => {}}
            onClusterPress={() => {}}
            onMarkersChange={() => {}}
            onLongPress={(e) => handleLongPress(e.nativeEvent.coordinate)}
            showsUserLocation={true}
            showsMyLocationButton={false}
            clusterColor="black"
            clusterTextColor="white"
            // @ts-expect-error Provided by clustering lib
            minimumClusterSize={5}
            customClusterStyles={clusterStyles}
          >
            <UrlTile
              urlTemplate="https://tiles.stadiamaps.com/tiles/Stamen_toner/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                coordinate={marker.coordinate}
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
                onDragEnd={(e) => handleMarkerDragEnd(e.nativeEvent.coordinate)}
                title={"Your Marker"}
              >
                <Image
                  source={require("../../assets/images/custom-marker.png")}
                  className="w-10 h-10"
                />
              </Marker>
            )}
          </ClusteredMapView>
        )}
        {!isNavigationActive && selectedMarker && (
          <InfoWindow
            selectedMarker={selectedMarker}
            initialHeight={INITIAL_INFO_WINDOW_HEIGHT}
            onStartNavigation={() => handleStartNavigation(selectedMarker)}
          />
        )}
        {showInputBox && (
          <MarkerInputBox
            markerName={markerName}
            setMarkerName={setMarkerName}
            markerInfo={markerInfo}
            setMarkerInfo={setMarkerInfo}
            setShowInputBox={setShowInputBox}
          />
        )}
        {isNavigationActive ? (
          <CustomButton
            title="Stop Navigation"
            handlePress={handleStopNavigation}
            containerStyles="absolute bottom-10 left-5 right-5 min-h-[56px]"
            accessibilityLabel="Stop navigation"
          />
        ) : (
          <>
            <CircleButton
              onPress={handleCenterOnUserLocation}
              icon="⌖"
              style="absolute bottom-28 right-5"
              isCenterOnUser={true}
              disabled={isPermissionDenied}
              accessibilityLabel="Center on my location"
            />
            <CircleButton
              onPress={handleAddMarker}
              icon="+"
              style="absolute bottom-28 left-5"
              accessibilityLabel="Add marker"
            />
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
};

export default HomeApp;
