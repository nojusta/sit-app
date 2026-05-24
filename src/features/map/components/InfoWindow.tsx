import React, { useEffect, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";

import {
  MarkerRatingCard,
  MarkerReviewsCard,
  MarkerTagList,
  useMarkerRating,
} from "@/features/markers";
import type { MarkerData } from "../core";
import { MarkerWeatherCard, useMarkerWeather } from "@/features/weather";
import {
  BottomSheet,
  CustomButton,
  ImageLoadingPlaceholder,
  PhotoLightbox,
} from "@/shared/components";

const COLLAPSED_HEIGHT = 292;

const MarkerGalleryImageCard: React.FC<{
  photo: string;
  onPress: () => void;
}> = ({ photo, onPress }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Pressable
      onPress={onPress}
      className="mr-3 h-56 w-72 overflow-hidden rounded-[28px] bg-slate-200"
    >
      <Image
        source={{ uri: photo }}
        resizeMode="cover"
        className="h-full w-full"
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
      {isLoading ? <ImageLoadingPlaceholder fill /> : null}
    </Pressable>
  );
};

const MarkerPreviewHero: React.FC<{
  photo?: string;
}> = ({ photo }) => {
  const [isLoading, setIsLoading] = useState(Boolean(photo));

  useEffect(() => {
    setIsLoading(Boolean(photo));
  }, [photo]);

  if (!photo) {
    return (
      <View className="flex-1 items-center justify-center bg-[#E8ECEF] px-3">
        <Text className="text-center font-pmedium text-xs leading-5 text-slate-600">
          No images yet
        </Text>
      </View>
    );
  }

  return (
    <View className="relative h-full w-full">
      <Image
        source={{ uri: photo }}
        resizeMode="cover"
        className="h-full w-full"
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
      {isLoading ? <ImageLoadingPlaceholder fill /> : null}
    </View>
  );
};

interface InfoWindowProps {
  selectedMarker: MarkerData | null;
  initialHeight?: number;
  onStartNavigation?: () => void;
  onMarkerUpdated?: () => Promise<void> | void;
  onViewAllReviews?: () => void;
  isAuthenticated?: boolean;
  isFavorite?: boolean;
  isTogglingFavorite?: boolean;
  onToggleFavorite?: () => Promise<void> | void;
}

const InfoWindow: React.FC<InfoWindowProps> = ({
  selectedMarker,
  initialHeight = COLLAPSED_HEIGHT,
  onStartNavigation,
  onMarkerUpdated,
  onViewAllReviews,
  isAuthenticated = false,
  isFavorite = false,
  isTogglingFavorite = false,
  onToggleFavorite,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [descriptionLineCount, setDescriptionLineCount] = useState<number | null>(null);
  const weather = useMarkerWeather(selectedMarker);
  const markerRating = useMarkerRating({
    markerId: selectedMarker?.id,
    averageRating: selectedMarker?.averageRating,
    onRatingSaved: onMarkerUpdated,
  });
  const previewPhotos = selectedMarker?.photoUrls?.length
    ? selectedMarker.photoUrls
    : selectedMarker?.photoUrl
      ? [selectedMarker.photoUrl]
      : [];

  useEffect(() => {
    setLightboxIndex(null);
    setIsDescriptionExpanded(false);
    setDescriptionLineCount(null);
  }, [selectedMarker?.description, selectedMarker?.id]);

  const canExpandDescription = (descriptionLineCount ?? 0) > 2;
  const handleFavoritePress = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign in required",
        "You need an account to save favorite sitting places.",
      );
      return;
    }

    void onToggleFavorite?.();
  };

  return (
    <>
      <BottomSheet
        visible={selectedMarker !== null}
        collapsedHeight={initialHeight}
        initialState="collapsed"
        sheetStyle={{
          backgroundColor: "#F6F5F1",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
        }}
        header={
          <View className="px-5 pb-4 pt-3">
            <View className="h-1.5 w-14 self-center rounded-full bg-slate-300" />
            <View className="mt-4 flex-row items-start">
              <View className="mr-4 h-24 w-24 overflow-hidden rounded-[24px] bg-slate-200">
                <MarkerPreviewHero photo={previewPhotos[0]} />
              </View>

              <View className="flex-1">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 font-psemibold text-xl leading-7 text-slate-950">
                    {selectedMarker?.title ?? ""}
                  </Text>
                  <Pressable
                    onPress={handleFavoritePress}
                    disabled={isTogglingFavorite}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                    accessibilityState={{
                      selected: isFavorite,
                      disabled: isTogglingFavorite,
                    }}
                    className={`h-10 w-10 items-center justify-center rounded-full bg-white ${
                      isTogglingFavorite ? "opacity-50" : ""
                    }`}
                  >
                    <MaterialIcons
                      name={isFavorite ? "favorite" : "favorite-border"}
                      size={22}
                      color={isFavorite ? "#DC2626" : "#0F172A"}
                    />
                  </Pressable>
                </View>
                <Pressable
                  onPress={
                    canExpandDescription
                      ? () => setIsDescriptionExpanded((current) => !current)
                      : undefined
                  }
                  accessibilityRole={canExpandDescription ? "button" : undefined}
                  accessibilityLabel={
                    canExpandDescription
                      ? isDescriptionExpanded
                        ? "Collapse marker description"
                        : "Expand marker description"
                      : undefined
                  }
                >
                  <Text
                    className="mt-2 font-pregular text-sm leading-6 text-slate-600"
                    numberOfLines={
                      canExpandDescription && !isDescriptionExpanded ? 2 : undefined
                    }
                    onTextLayout={(event) => {
                      const nextLineCount = event.nativeEvent.lines.length;

                      setDescriptionLineCount((current) => {
                        if (current === null) {
                          return nextLineCount;
                        }

                        if (current > 2 && nextLineCount <= 2) {
                          return current;
                        }

                        return nextLineCount > current ? nextLineCount : current;
                      });
                    }}
                  >
                    {selectedMarker?.description ?? ""}
                  </Text>
                  {selectedMarker?.description && canExpandDescription ? (
                    <Text className="mt-1 font-psemibold text-xs text-slate-500">
                      {isDescriptionExpanded ? "Show less" : "Show more"}
                    </Text>
                  ) : null}
                </Pressable>
                {selectedMarker?.attributes?.length ? (
                  <View className="mt-3">
                    <MarkerTagList attributes={selectedMarker.attributes} />
                  </View>
                ) : null}
              </View>
            </View>

            <MarkerWeatherCard
              markerId={selectedMarker?.id}
              snapshot={weather.snapshot}
              isLoading={weather.isLoading}
              errorMessage={weather.errorMessage}
              noticeMessage={weather.noticeMessage}
              changeMessage={weather.changeMessage}
            />
          </View>
        }
        bodyStyle={{ minHeight: 0 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <Text className="font-psemibold text-base text-slate-950">Photos</Text>

          {previewPhotos.length > 0 ? (
            <FlatList
              data={previewPhotos}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(photo, index) =>
                `${selectedMarker?.id ?? "marker"}-${photo}-${index}`
              }
              contentContainerStyle={{ paddingTop: 14, paddingBottom: 4 }}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews
              renderItem={({ item, index }) => (
                <MarkerGalleryImageCard
                  photo={item}
                  onPress={() => setLightboxIndex(index)}
                />
              )}
            />
          ) : (
            <View className="mt-4 rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-6">
              <Text className="font-psemibold text-base text-slate-900">
                This marker has no images yet
              </Text>
              <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
                You can still use the description below to decide whether this sitting
                place is worth checking out.
              </Text>
            </View>
          )}

          <View className="mt-6 rounded-[28px] bg-white px-5 py-5">
            <Text className="font-psemibold text-base text-slate-950">
              About this place
            </Text>
            <Text className="mt-3 font-pregular text-sm leading-7 text-slate-700">
              {selectedMarker?.description ?? ""}
            </Text>
          </View>

          <MarkerRatingCard
            averageRating={markerRating.averageRating}
            score={markerRating.score}
            comment={markerRating.comment}
            errorMessage={markerRating.errorMessage}
            hasExistingRating={markerRating.hasExistingRating}
            isAuthenticated={markerRating.isAuthenticated}
            isLoadingExistingRating={markerRating.isLoadingExistingRating}
            isSubmitting={markerRating.isSubmitting}
            onScoreChange={markerRating.handleScoreChange}
            onCommentChange={markerRating.handleCommentChange}
            onSubmit={markerRating.handleSubmit}
          />

          <MarkerReviewsCard
            reviews={markerRating.reviews}
            isLoading={markerRating.isLoadingReviews}
            errorMessage={markerRating.reviewsErrorMessage}
            onViewAllPress={onViewAllReviews}
          />

          <View className="mt-6">
            <CustomButton
              title="Start Navigation"
              handlePress={() => onStartNavigation?.()}
              containerStyles="min-h-[52px] rounded-2xl"
              textStyles="text-base"
              accessibilityLabel="Start navigation"
            />
          </View>
        </ScrollView>
      </BottomSheet>

      <PhotoLightbox
        visible={lightboxIndex !== null}
        photos={previewPhotos}
        initialIndex={lightboxIndex ?? 0}
        title={selectedMarker?.title}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
};

export default InfoWindow;
