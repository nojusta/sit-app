import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { MarkerRatingRecord } from "@/services/appwrite";

interface MarkerReviewsCardProps {
  reviews: MarkerRatingRecord[];
  isLoading: boolean;
  errorMessage: string | null;
  title?: string;
  onViewAllPress?: () => void;
}

const formatReviewDate = (value: string) => {
  if (!value) {
    return "Recently";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toISOString().slice(0, 10);
};

const renderStars = (score: number) =>
  `${"★".repeat(Math.max(0, Math.min(score, 5)))}${"☆".repeat(
    Math.max(0, 5 - Math.max(0, Math.min(score, 5))),
  )}`;

const MarkerReviewsCard: React.FC<MarkerReviewsCardProps> = ({
  reviews,
  isLoading,
  errorMessage,
  title = "Recent reviews",
  onViewAllPress,
}) => (
  <View className="mt-6 rounded-[28px] bg-white px-5 py-5">
    <View className="flex-row items-center justify-between">
      <Text className="font-psemibold text-base text-slate-950">{title}</Text>
      {onViewAllPress ? (
        <Pressable
          onPress={onViewAllPress}
          accessibilityRole="button"
          accessibilityLabel="View all reviews"
        >
          <Text className="font-psemibold text-sm text-teal-700">View all</Text>
        </Pressable>
      ) : (
        <Text className="font-pmedium text-xs text-slate-500">
          {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
        </Text>
      )}
    </View>

    {isLoading ? (
      <View className="mt-4 flex-row items-center">
        <ActivityIndicator size="small" color="#0F766E" />
        <Text className="ml-3 font-pregular text-sm text-slate-600">
          Loading reviews...
        </Text>
      </View>
    ) : errorMessage ? (
      <Text className="mt-4 font-pmedium text-sm leading-6 text-red-600">
        {errorMessage}
      </Text>
    ) : reviews.length === 0 ? (
      <View className="mt-4 rounded-[22px] bg-[#F8FAFC] px-4 py-4">
        <Text className="font-pmedium text-sm text-slate-700">
          No reviews yet for this spot.
        </Text>
        <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
          The first visitor can leave a star rating and an optional comment here.
        </Text>
      </View>
    ) : (
      <View className="mt-4">
        {reviews.map((review, index) => (
          <View
            key={review.id}
            className={`${index > 0 ? "mt-4 border-t border-slate-100 pt-4" : ""}`}
          >
            <View className="flex-row items-start justify-between">
              <View className="mr-4 flex-1">
                <Text className="font-psemibold text-sm text-slate-900">
                  {review.authorName ?? "SIT user"}
                </Text>
                <Text className="mt-1 font-pmedium text-sm text-amber-500">
                  {renderStars(review.score)}
                </Text>
              </View>
              <Text className="font-pregular text-xs text-slate-500">
                {formatReviewDate(review.updatedAt)}
              </Text>
            </View>

            <Text className="mt-3 font-pregular text-sm leading-6 text-slate-700">
              {review.comment || "Left a star rating without a written comment."}
            </Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

export default MarkerReviewsCard;
