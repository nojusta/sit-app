import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomSheetState = "collapsed" | "expanded";

interface BottomSheetProps {
  visible: boolean;
  collapsedHeight: number;
  header: React.ReactNode;
  children: React.ReactNode;
  initialState?: BottomSheetState;
  onBackdropPress?: () => void;
  onStateChange?: (state: BottomSheetState) => void;
  sheetStyle?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  topOffset?: number;
  maxBackdropOpacity?: number;
  dragGestureScope?: "header" | "sheet";
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  collapsedHeight,
  header,
  children,
  initialState = "collapsed",
  onBackdropPress,
  onStateChange,
  sheetStyle,
  bodyStyle,
  topOffset = 12,
  maxBackdropOpacity = 0.5,
  dragGestureScope = "header",
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const currentHeightRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  const expandedHeight = useMemo(
    () => Math.max(collapsedHeight, windowHeight - insets.top - topOffset),
    [collapsedHeight, insets.top, topOffset, windowHeight],
  );

  const syncBackdrop = useCallback(
    (height: number) => {
      const progress =
        expandedHeight === collapsedHeight
          ? 1
          : clamp((height - collapsedHeight) / (expandedHeight - collapsedHeight), 0, 1);

      backdropOpacity.setValue(progress * maxBackdropOpacity);
      currentHeightRef.current = height;
    },
    [backdropOpacity, collapsedHeight, expandedHeight, maxBackdropOpacity],
  );

  useEffect(() => {
    const listenerId = animatedHeight.addListener(({ value }) => {
      syncBackdrop(value);
    });

    return () => {
      animatedHeight.removeListener(listenerId);
    };
  }, [animatedHeight, syncBackdrop]);

  const animateTo = useCallback(
    (nextState: BottomSheetState | "hidden") => {
      const toValue =
        nextState === "hidden"
          ? 0
          : nextState === "expanded"
            ? expandedHeight
            : collapsedHeight;

      Animated.timing(animatedHeight, {
        toValue,
        duration: nextState === "hidden" ? 220 : 320,
        easing:
          nextState === "expanded"
            ? Easing.out(Easing.cubic)
            : Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        if (nextState === "hidden") {
          setIsMounted(false);
          syncBackdrop(0);
          return;
        }

        onStateChange?.(nextState);
      });
    },
    [animatedHeight, collapsedHeight, expandedHeight, onStateChange, syncBackdrop],
  );

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      const targetState = initialState;
      requestAnimationFrame(() => {
        animateTo(targetState);
      });
      return;
    }

    if (isMounted) {
      animateTo("hidden");
    }
  }, [animateTo, initialState, isMounted, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dy) > 2 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 2 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          animatedHeight.stopAnimation((value) => {
            dragStartHeightRef.current = value;
            syncBackdrop(value);
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextHeight = clamp(
            dragStartHeightRef.current - gestureState.dy,
            collapsedHeight,
            expandedHeight,
          );

          animatedHeight.setValue(nextHeight);
          syncBackdrop(nextHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          const halfwayPoint = collapsedHeight + (expandedHeight - collapsedHeight) / 2;
          const shouldExpand =
            gestureState.vy < -0.35 || currentHeightRef.current >= halfwayPoint;

          animateTo(shouldExpand ? "expanded" : "collapsed");
        },
        onPanResponderTerminate: () => {
          const halfwayPoint = collapsedHeight + (expandedHeight - collapsedHeight) / 2;
          animateTo(currentHeightRef.current >= halfwayPoint ? "expanded" : "collapsed");
        },
      }),
    [animateTo, animatedHeight, collapsedHeight, expandedHeight, syncBackdrop],
  );

  if (!isMounted) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onBackdropPress}
          accessibilityRole="button"
          accessibilityLabel="Close sheet overlay"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: animatedHeight,
            paddingBottom: Math.max(insets.bottom, 18),
          },
          sheetStyle,
        ]}
      >
        <View {...(dragGestureScope === "header" ? panResponder.panHandlers : {})}>
          {header}
        </View>
        {dragGestureScope === "sheet" ? (
          <View
            {...panResponder.panHandlers}
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
          />
        ) : null}
        <View style={[styles.body, bodyStyle]}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});

export default BottomSheet;
