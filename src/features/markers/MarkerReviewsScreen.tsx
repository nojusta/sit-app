import React, { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { CustomButton } from "@/shared/components";
import MarkerReviewsCard from "./components/MarkerReviewsCard";
import useMarkerReviewsList from "./hooks/useMarkerReviewsList";

interface MarkerReviewsScreenProps {
  markerId?: string | null;
  markerTitle?: string | null;
}

const formatAverageRating = (value: number | null) =>
  typeof value === "number" ? `${value.toFixed(1)} / 5` : "No ratings yet";

const MarkerReviewsScreen: React.FC<MarkerReviewsScreenProps> = ({
  markerId,
  markerTitle,
}) => {
  const router = useRouter();
  const {
    averageRating,
    reviews,
    total,
    isLoading,
    isLoadingMore,
    errorMessage,
    hasMore,
    loadMore,
  } = useMarkerReviewsList(markerId);

  const headerTitle = useMemo(
    () => markerTitle?.trim() || "Marker reviews",
    [markerTitle],
  );

  if (!markerId) {
    return (
      <SafeAreaView className="flex-1 bg-[#F6F5F1] px-5 py-6">
        <StatusBar backgroundColor="#F6F5F1" style="dark" />
        <Pressable
          onPress={() => router.back()}
          className="self-start rounded-full bg-slate-200 px-4 py-2.5"
        >
          <Text className="font-pmedium text-sm text-slate-900">Back</Text>
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text className="font-psemibold text-lg text-slate-900">
            Review target missing
          </Text>
          <Text className="mt-3 text-center font-pregular text-sm leading-6 text-slate-600">
            Open a marker from the map first, then view its reviews.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F1]">
      <StatusBar backgroundColor="#F6F5F1" style="dark" />
      <View className="px-5 pb-4 pt-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="self-start rounded-full bg-slate-200 px-4 py-2.5"
        >
          <Text className="font-pmedium text-sm text-slate-900">Back</Text>
        </Pressable>

        <View className="mt-5 rounded-[30px] bg-white px-5 py-5">
          <Text className="font-psemibold text-2xl text-slate-950">{headerTitle}</Text>
          <Text className="mt-3 font-pregular text-sm leading-6 text-slate-600">
            Average rating: {formatAverageRating(averageRating)}
          </Text>
          <Text className="mt-1 font-pregular text-sm leading-6 text-slate-500">
            {total} {total === 1 ? "review" : "reviews"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center px-5">
          <ActivityIndicator size="small" color="#0F766E" />
          <Text className="mt-3 font-pregular text-sm text-slate-600">
            Loading reviews...
          </Text>
        </View>
      ) : (
        <FlatList
          data={[{ key: "reviews" }]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
          renderItem={() => (
            <>
              <MarkerReviewsCard
                title="All reviews"
                reviews={reviews}
                isLoading={false}
                errorMessage={errorMessage}
              />

              {hasMore ? (
                <View className="mt-5">
                  <CustomButton
                    title="Load more reviews"
                    handlePress={() => {
                      void loadMore();
                    }}
                    isLoading={isLoadingMore}
                    containerStyles="min-h-[50px] rounded-2xl bg-[#E6F4F1]"
                    textStyles="text-sm text-teal-800"
                    variant="ghost"
                  />
                </View>
              ) : null}
            </>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default MarkerReviewsScreen;
