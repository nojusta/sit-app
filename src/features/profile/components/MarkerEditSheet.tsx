import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { MarkerRecord, UploadableImage } from "@/services/appwrite";
import { BottomSheet, CustomButton } from "@/shared/components";

const COLLAPSED_HEIGHT = 166;

interface MarkerEditSheetProps {
  marker: MarkerRecord | null;
  description: string;
  queuedPhotos: UploadableImage[];
  isSubmitting: boolean;
  onDescriptionChange: (value: string) => void;
  onAddPhotos: () => void;
  onRemoveQueuedPhoto: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const MarkerEditSheet: React.FC<MarkerEditSheetProps> = ({
  marker,
  description,
  queuedPhotos,
  isSubmitting,
  onDescriptionChange,
  onAddPhotos,
  onRemoveQueuedPhoto,
  onClose,
  onSubmit,
}) => {
  const existingPhotos = marker?.photoUrls?.length
    ? marker.photoUrls
    : marker?.photoUrl
      ? [marker.photoUrl]
      : [];

  return (
    <BottomSheet
      visible={marker !== null}
      collapsedHeight={COLLAPSED_HEIGHT}
      initialState="expanded"
      onBackdropPress={onClose}
      sheetStyle={{
        backgroundColor: "#F4F4F0",
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
      }}
      header={
        <View className="px-5 pb-4 pt-3">
          <View className="self-center h-1.5 w-14 rounded-full bg-slate-300" />
          <Text className="mt-4 font-psemibold text-2xl text-slate-950">Edit marker</Text>
          <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
            Updating description or photos sends this marker back to pending review before
            it appears publicly again.
          </Text>
        </View>
      }
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={18}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 84 }}
        >
          <View className="rounded-[28px] bg-white px-5 py-5">
            <Text className="font-psemibold text-base text-slate-950">
              {marker?.title ?? ""}
            </Text>
            <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
              Existing photos stay attached unless you replace them later. New photos are
              appended below.
            </Text>
          </View>

          <View className="mt-5">
            <Text className="font-pmedium text-sm text-slate-700">Description</Text>
            <TextInput
              value={description}
              onChangeText={onDescriptionChange}
              placeholder="Add more context for this sitting spot"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              className="mt-2 min-h-[148px] rounded-[26px] border border-slate-200 bg-white px-4 py-4 font-pmedium text-base text-slate-950"
            />
          </View>

          <View className="mt-5">
            <Text className="font-pmedium text-sm text-slate-700">Current photos</Text>
            {existingPhotos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 12 }}
              >
                {existingPhotos.map((photo, index) => (
                  <Image
                    key={`${marker?.id ?? "marker"}-existing-${index}`}
                    source={{ uri: photo }}
                    resizeMode="cover"
                    className="mr-3 h-32 w-32 rounded-[24px]"
                  />
                ))}
              </ScrollView>
            ) : (
              <View className="mt-3 rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-5">
                <Text className="font-pmedium text-sm text-slate-700">
                  This marker has no images yet.
                </Text>
              </View>
            )}
          </View>

          <View className="mt-5">
            <Text className="font-pmedium text-sm text-slate-700">Queued new photos</Text>
            {queuedPhotos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 12 }}
              >
                {queuedPhotos.map((photo, index) => (
                  <View
                    key={`${marker?.id ?? "marker"}-queued-${index}`}
                    className="mr-3 w-32"
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      resizeMode="cover"
                      className="h-32 w-32 rounded-[24px]"
                    />
                    <View className="mt-2">
                      <CustomButton
                        title="Remove"
                        handlePress={() => onRemoveQueuedPhoto(index)}
                        variant="ghost"
                        containerStyles="min-h-[40px] rounded-xl bg-[#EEF1F4]"
                        textStyles="text-xs"
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View className="mt-3 rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-5">
                <Text className="font-pmedium text-sm text-slate-700">
                  No new photos queued for review.
                </Text>
              </View>
            )}
          </View>

          <View className="mt-5">
            <CustomButton
              title="Add photos"
              handlePress={onAddPhotos}
              variant="ghost"
              containerStyles="min-h-[50px] rounded-2xl bg-[#EEF1F4]"
              textStyles="text-base"
            />
          </View>

          <View className="mt-6">
            <CustomButton
              title="Submit edits"
              handlePress={onSubmit}
              isLoading={isSubmitting}
              containerStyles="min-h-[54px] rounded-2xl"
              textStyles="text-base"
            />
          </View>

          <View className="mt-3">
            <CustomButton
              title="Close"
              handlePress={onClose}
              variant="ghost"
              containerStyles="min-h-[50px] rounded-2xl bg-[#EEF1F4]"
              textStyles="text-base"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

export default MarkerEditSheet;
