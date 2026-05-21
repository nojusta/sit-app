import React from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { CustomButton } from "@/shared/components";
import StarRatingInput from "./StarRatingInput";

interface MarkerRatingCardProps {
  averageRating: number | null;
  score: number;
  comment: string;
  errorMessage: string | null;
  hasExistingRating: boolean;
  isAuthenticated: boolean;
  isLoadingExistingRating: boolean;
  isSubmitting: boolean;
  onScoreChange: (value: number) => void;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
}

const formatAverageRating = (value: number | null) =>
  typeof value === "number" ? `${value.toFixed(1)} / 5` : "No ratings yet";

const MarkerRatingCard: React.FC<MarkerRatingCardProps> = ({
  averageRating,
  score,
  comment,
  errorMessage,
  hasExistingRating,
  isAuthenticated,
  isLoadingExistingRating,
  isSubmitting,
  onScoreChange,
  onCommentChange,
  onSubmit,
}) => (
  <View className="mt-6 rounded-[28px] bg-white px-5 py-5">
    <View className="flex-row items-start justify-between">
      <View className="mr-4 flex-1">
        <Text className="font-psemibold text-base text-slate-950">Rate this spot</Text>
        <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
          Average rating: {formatAverageRating(averageRating)}
        </Text>
      </View>
      {hasExistingRating ? (
        <View className="rounded-full bg-[#EEF6F2] px-3 py-1">
          <Text className="font-psemibold text-xs text-teal-700">Your rating</Text>
        </View>
      ) : null}
    </View>

    {isLoadingExistingRating ? (
      <View className="mt-4 flex-row items-center">
        <ActivityIndicator size="small" color="#0F766E" />
        <Text className="ml-3 font-pregular text-sm text-slate-600">
          Loading your saved rating...
        </Text>
      </View>
    ) : (
      <>
        <View className="mt-4">
          <Text className="font-pmedium text-sm text-slate-700">Stars</Text>
          <View className="mt-3">
            <StarRatingInput
              value={score}
              onChange={onScoreChange}
              disabled={!isAuthenticated || isSubmitting}
            />
          </View>
        </View>

        <View className="mt-5">
          <View className="flex-row items-center justify-between">
            <Text className="font-pmedium text-sm text-slate-700">Comment</Text>
            <Text className="font-pregular text-xs text-slate-500">Optional</Text>
          </View>
          <TextInput
            value={comment}
            onChangeText={onCommentChange}
            editable={isAuthenticated && !isSubmitting}
            placeholder="Share a short note about comfort, shade, noise, or why this place works."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={1000}
            textAlignVertical="top"
            className="mt-2 min-h-[120px] rounded-[24px] border border-slate-200 bg-[#F8FAFC] px-4 py-4 font-pmedium text-base text-slate-950"
          />
        </View>

        {errorMessage ? (
          <Text className="mt-3 font-pmedium text-sm leading-6 text-red-600">
            {errorMessage}
          </Text>
        ) : null}

        {!isAuthenticated ? (
          <Text className="mt-3 font-pregular text-sm leading-6 text-slate-600">
            Sign in to leave a star rating and an optional comment.
          </Text>
        ) : null}

        <View className="mt-5">
          <CustomButton
            title={hasExistingRating ? "Update rating" : "Save rating"}
            handlePress={onSubmit}
            isLoading={isSubmitting}
            disabled={!isAuthenticated || isLoadingExistingRating || score < 1}
            containerStyles="min-h-[52px] rounded-2xl"
            textStyles="text-base"
          />
        </View>
      </>
    )}
  </View>
);

export default MarkerRatingCard;
