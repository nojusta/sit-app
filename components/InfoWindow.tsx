import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Easing,
  Image,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INITIAL_INFO_WINDOW_HEIGHT = 100;

interface InfoWindowProps {
  selectedMarker: any;
  setSelectedMarker: (marker: any) => void;
  lastRegion: any;
  mapRef: React.RefObject<any>;
  initialHeight?: number;
}

const InfoWindow: React.FC<InfoWindowProps> = ({
  selectedMarker,
  setSelectedMarker,
  lastRegion,
  mapRef,
  initialHeight = INITIAL_INFO_WINDOW_HEIGHT,
}) => {
  const [infoWindowHeight] = useState(new Animated.Value(initialHeight));
  const [infoWindowBottom] = useState(new Animated.Value(-initialHeight));
  const [isExpanded, setIsExpanded] = useState(false);
  const [overlayOpacity] = useState(new Animated.Value(0));
  const [visibleMarker, setVisibleMarker] = useState(selectedMarker);

  const screenHeight = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (selectedMarker === null) {
      Animated.timing(infoWindowBottom, {
        toValue: -initialHeight,
        duration: 1000,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        setVisibleMarker(null);
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      });
    } else {
      setVisibleMarker(selectedMarker);
      Animated.timing(infoWindowHeight, {
        toValue: initialHeight,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
      Animated.timing(infoWindowBottom, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [selectedMarker, initialHeight]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dy) > 100,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < 0 && !isExpanded) {
        Animated.timing(infoWindowHeight, {
          toValue: screenHeight - insets.top,
          duration: 480,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start(() => {
          setIsExpanded(true);
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }).start();
        });
      } else if (gestureState.dy > 0 && isExpanded) {
        Animated.timing(infoWindowHeight, {
          toValue: initialHeight,
          duration: 480,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }).start(() => {
          setIsExpanded(false);
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }).start();
        });
      }
    },
  });

  return (
    <>
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={isExpanded ? "auto" : "none"}
      />
      {visibleMarker && (
        <Animated.View
          style={[
            styles.infoWindow,
            { height: infoWindowHeight, bottom: infoWindowBottom },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.infoContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.infoTitle}>{visibleMarker.title}</Text>
            </View>
            <View style={[styles.imageBox, { marginTop: isExpanded ? 0 : "20%" }]}>
              <Image
                source={{ uri: visibleMarker.imageUri }}
                style={styles.infoImage}
              />
            </View>
            <View style={styles.ratingContainer}>
              <View style={styles.ratingBox}>
                <Text style={styles.ratingText}>Rating: ★★★★☆</Text>
              </View>
              <TouchableOpacity style={styles.rateButton}>
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.descriptionBox}>
              <Text style={styles.infoDescription}>
                {visibleMarker.description}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
  },
  infoWindow: {
    position: "absolute",
    width: "100%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
    zIndex: 2,
    paddingLeft: 20,
    paddingRight: 20,
  },
  infoContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  titleContainer: {
    height: INITIAL_INFO_WINDOW_HEIGHT - 30,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  imageBox: {
    width: 350,
    height: 350,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  infoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    marginTop: 10,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingBox: {
    alignItems: "flex-start",
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  rateButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  rateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  descriptionBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    width: "100%",
  },
  infoDescription: {
    fontSize: 16,
  },
});

export default InfoWindow;