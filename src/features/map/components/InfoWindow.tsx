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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomButton } from "@/shared/components";

const INITIAL_INFO_WINDOW_HEIGHT = 170;

type MarkerDetails = {
  title: string;
  description: string;
  imageUri?: string;
};

interface InfoWindowProps {
  selectedMarker: MarkerDetails | null;
  initialHeight?: number;
  onStartNavigation?: () => void;
}

const InfoWindow: React.FC<InfoWindowProps> = ({
  selectedMarker,
  initialHeight = INITIAL_INFO_WINDOW_HEIGHT,
  onStartNavigation,
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
  }, [selectedMarker, initialHeight, infoWindowBottom, infoWindowHeight, overlayOpacity]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 100,
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
            <View style={styles.headerSection}>
              <Text style={styles.infoTitle}>{visibleMarker.title}</Text>
              <CustomButton
                title="Start Navigation"
                handlePress={() => onStartNavigation?.()}
                containerStyles="w-full mt-4 min-h-[48px]"
                textStyles="text-base"
                accessibilityLabel="Start navigation"
              />
            </View>
            <View
              pointerEvents={isExpanded ? "auto" : "none"}
              style={[styles.detailsSection, { opacity: isExpanded ? 1 : 0 }]}
            >
              <View style={styles.imageBox}>
                {visibleMarker.imageUri ? (
                  <Image
                    source={{ uri: visibleMarker.imageUri }}
                    style={styles.infoImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>No image available</Text>
                  </View>
                )}
              </View>
              <View style={styles.ratingContainer}>
                <View style={styles.ratingBox}>
                  <Text style={styles.ratingText}>Rating: ★★★★☆</Text>
                </View>
              </View>
              <View style={styles.descriptionBox}>
                <Text style={styles.infoDescription}>{visibleMarker.description}</Text>
              </View>
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
  headerSection: {
    width: "100%",
    paddingTop: 20,
    paddingBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  detailsSection: {
    width: "100%",
    alignItems: "center",
  },
  imageBox: {
    width: "100%",
    maxWidth: 350,
    height: 280,
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
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  imagePlaceholderText: {
    color: "#6b7280",
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: "row",
    marginTop: 10,
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  ratingBox: {
    alignItems: "flex-start",
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  descriptionBox: {
    marginTop: 10,
    marginBottom: 24,
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
