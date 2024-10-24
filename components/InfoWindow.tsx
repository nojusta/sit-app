import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, Easing } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INITIAL_INFO_WINDOW_HEIGHT = 100; // Initial height of the info window

interface InfoWindowProps {
  selectedMarker: any;
  setSelectedMarker: (marker: any) => void;
  lastRegion: any;
  mapRef: React.RefObject<any>;
  initialHeight: number; // Add initialHeight prop
}

const InfoWindow: React.FC<InfoWindowProps> = ({ selectedMarker, setSelectedMarker, lastRegion, mapRef, initialHeight }) => {
  const [infoWindowHeight] = useState(new Animated.Value(0)); // Animated value for the info window height
  const [isExpanded, setIsExpanded] = useState(false); // State to track if the info window is expanded
  const [overlayOpacity] = useState(new Animated.Value(0)); // Animated value for the overlay opacity

  const screenHeight = Dimensions.get('window').height; // Get the screen height
  const insets = useSafeAreaInsets(); // Get the safe area insets

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
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Animate to initial height when a marker is selected
      Animated.timing(infoWindowHeight, {
        toValue: initialHeight,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [selectedMarker]);

  // Pan responder to handle swipe gestures for expanding and minimizing the info window
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 100; // Increase the threshold for detecting the swipe gesture
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < 0 && !isExpanded) {
        // Swipe up to expand
        Animated.timing(infoWindowHeight, {
          toValue: screenHeight - insets.top - 80, // Adjust to stop at the bottom of the notch
          duration: 480,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start(() => {
          setIsExpanded(true);
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        });
      } else if (gestureState.dy > 0 && isExpanded) {
        // Swipe down to minimize
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
            useNativeDriver: true,
          }).start();
        });
      }
    },
  });

  return (
    <>
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={isExpanded ? 'auto' : 'none'} // Disable pointer events when overlay is not visible
      />
      {selectedMarker && (
        <Animated.View
          style={[
            styles.infoWindow,
            { height: infoWindowHeight },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{selectedMarker.title}</Text>
            <Text style={styles.infoDescription}>{selectedMarker.description}</Text>
          </View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Grey with opacity
    zIndex: 1, // Ensure overlay is above other content
  },
  infoWindow: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    padding: 20, // Ensure consistent padding
    zIndex: 2, // Ensure info window is above overlay
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

export default InfoWindow;