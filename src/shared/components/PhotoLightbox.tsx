import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  const [isLoading, setIsLoading] = useState(true);
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
    setIsLoading(true);
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
              height,
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
          />
        </Animated.View>
      </GestureDetector>
      {isLoading ? (
        <View className="absolute inset-0 items-center justify-center">
          <View className="bg-black/55 h-12 w-12 items-center justify-center rounded-full">
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        </View>
      ) : null}
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
  const imageFrameHeight = Math.max(280, height - 188);
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < photos.length - 1;

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

  const goToPhoto = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), photos.length - 1);
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({
      index: nextIndex,
      animated: true,
    });
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

          <View className="px-5 pb-3 pt-14">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                {title ? (
                  <Text className="font-psemibold text-lg text-white" numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
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

          <View className="flex-1 justify-center">
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
                <ZoomablePhoto uri={item} width={width} height={imageFrameHeight} />
              )}
            />
          </View>

          {photos.length > 1 ? (
            <View className="flex-row items-center justify-center gap-4 px-5 pb-9 pt-3">
              <Pressable
                onPress={() => goToPhoto(activeIndex - 1)}
                disabled={!canGoPrevious}
                className={`h-12 w-12 items-center justify-center rounded-full ${
                  canGoPrevious ? "bg-white/12" : "bg-white/5"
                }`}
                accessibilityRole="button"
                accessibilityLabel="Previous image"
                accessibilityState={{ disabled: !canGoPrevious }}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={28}
                  color={canGoPrevious ? "#FFFFFF" : "#64748B"}
                />
              </Pressable>

              <View className="min-w-[72px] items-center rounded-full bg-white/10 px-4 py-2">
                <Text className="font-pmedium text-sm text-white">
                  {activeIndex + 1} / {photos.length}
                </Text>
              </View>

              <Pressable
                onPress={() => goToPhoto(activeIndex + 1)}
                disabled={!canGoNext}
                className={`h-12 w-12 items-center justify-center rounded-full ${
                  canGoNext ? "bg-white/12" : "bg-white/5"
                }`}
                accessibilityRole="button"
                accessibilityLabel="Next image"
                accessibilityState={{ disabled: !canGoNext }}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={28}
                  color={canGoNext ? "#FFFFFF" : "#64748B"}
                />
              </Pressable>
            </View>
          ) : (
            <View className="items-center px-5 pb-9 pt-3">
              <View className="min-w-[72px] items-center rounded-full bg-white/10 px-4 py-2">
                <Text className="font-pmedium text-sm text-white">
                  {activeIndex + 1} / {photos.length}
                </Text>
              </View>
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default PhotoLightbox;
