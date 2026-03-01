import { useState } from "react";
import { Alert } from "react-native";
import MapView, { LatLng, Region } from "react-native-maps";
import { LocationObject } from "expo-location";

export type MarkerData = {
  id: number;
  coordinate: LatLng;
  title: string;
  description: string;
  imageUri?: string;
};

interface UseMapInteractionsOptions {
  mapRef: React.RefObject<MapView | null>;
  location: LocationObject | null;
  onMarkerSelectionChange?: (selected: boolean) => void;
}

const DEFAULT_MARKERS: MarkerData[] = [
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

const useMapInteractions = ({
  mapRef,
  location,
  onMarkerSelectionChange,
}: UseMapInteractionsOptions) => {
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [lastRegion, setLastRegion] = useState<Region | null>(null);
  const [userMarker, setUserMarker] = useState<Region | null>(null);
  const [markerName, setMarkerName] = useState<string>("");
  const [markerInfo, setMarkerInfo] = useState<string>("");
  const [showInputBox, setShowInputBox] = useState<boolean>(false);

  const handleMarkerPress = (marker: MarkerData) => {
    if (mapRef.current) {
      mapRef.current.getMapBoundaries().then((boundaries) => {
        const currentRegion = {
          latitude: (boundaries.northEast.latitude + boundaries.southWest.latitude) / 2,
          longitude: (boundaries.northEast.longitude + boundaries.southWest.longitude) / 2,
          latitudeDelta: Math.abs(
            boundaries.northEast.latitude - boundaries.southWest.latitude,
          ),
          longitudeDelta: Math.abs(
            boundaries.northEast.longitude - boundaries.southWest.longitude,
          ),
        };
        setLastRegion(currentRegion);
      });
    }

    setSelectedMarker(marker);
    onMarkerSelectionChange?.(true);
    mapRef.current?.animateToRegion(
      {
        ...marker.coordinate,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      },
      800,
    );
  };

  const handleMapPress = () => {
    if (selectedMarker || userMarker || showInputBox) {
      setSelectedMarker(null);
      setUserMarker(null);
      setShowInputBox(false);
      onMarkerSelectionChange?.(false);
      if (lastRegion) {
        mapRef.current?.animateToRegion(lastRegion, 800);
      }
    }
  };

  const handleCenterOnUserLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000,
      );
    } else {
      Alert.alert("Location not available", "Unable to get your current location.");
    }
  };

  const handleAddMarker = () => {
    if (location) {
      setUserMarker({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      Alert.alert("Location not available", "Unable to get your current location.");
    }
  };

  const handleLongPress = (coordinate: LatLng) => {
    setUserMarker({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setShowInputBox(true);
  };

  const handleMarkerDragEnd = (coordinate: LatLng) => {
    setUserMarker({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  return {
    markers: DEFAULT_MARKERS,
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
  };
};

export default useMapInteractions;
