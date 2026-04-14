import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface PhotoLightboxProps {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface ZoomablePhotoProps {
  uri: string;
  width: number;
  height: number;
}

const ZoomablePhoto: React.FC<ZoomablePhotoProps> = ({ uri, width, height }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, uri]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          const nextScale = savedScale.value * event.scale;
          scale.value = Math.min(Math.max(nextScale, 1), 4);
        })
        .onEnd(() => {
          savedScale.value = scale.value;

          if (scale.value <= 1) {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
          }
        }),
    [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          if (scale.value <= 1.02) {
            return;
          }

          translateX.value = savedTranslateX.value + event.translationX;
          translateY.value = savedTranslateY.value + event.translationY;
        })
        .onEnd(() => {
          if (scale.value <= 1.02) {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            return;
          }

          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [savedTranslateX, savedTranslateY, scale, translateX, translateY],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ width, height }} className="items-center justify-center px-4">
      <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture)}>
        <Animated.View style={animatedStyle}>
          <AnimatedImage
            source={{ uri }}
            resizeMode="contain"
            style={{
              width: width - 32,
              height: height - 160,
            }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  visible,
  photos,
  initialIndex = 0,
  title,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<string> | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0));
    setActiveIndex(safeIndex);

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: safeIndex,
        animated: false,
      });
    });
  }, [initialIndex, photos.length, visible]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(nextIndex);
  };

  if (!visible || photos.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black/95">
          <Pressable className="absolute inset-0" onPress={onClose} />

          <View className="px-5 pb-4 pt-16">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                {title ? (
                  <Text className="font-psemibold text-lg text-white" numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                <Text className="mt-1 font-pregular text-sm text-slate-300">
                  {activeIndex + 1} / {photos.length}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
                accessibilityRole="button"
                accessibilityLabel="Close image viewer"
              >
                <MaterialIcons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={photos}
            horizontal
            pagingEnabled
            keyExtractor={(item, index) => `${item}-${index}`}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={2}
            removeClippedSubviews
            onScrollToIndexFailed={() => {}}
            onMomentumScrollEnd={handleScrollEnd}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <ZoomablePhoto uri={item} width={width} height={height} />
            )}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default PhotoLightbox;
