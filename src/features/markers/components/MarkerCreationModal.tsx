import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type UploadableImage } from "@/services/appwrite";
import { icons } from "@/shared/constants";
import { BottomSheet, CustomButton } from "@/shared/components";

const COLLAPSED_HEIGHT = 170;

interface MarkerCreationModalProps {
  visible: boolean;
  title: string;
  description: string;
  photo: UploadableImage | null;
  isSubmitting: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onRemovePhoto: () => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const MarkerCreationModal: React.FC<MarkerCreationModalProps> = ({
  visible,
  title,
  description,
  photo,
  isSubmitting,
  onTitleChange,
  onDescriptionChange,
  onTakePhoto,
  onChooseFromLibrary,
  onRemovePhoto,
  onBack,
  onCancel,
  onSubmit,
}) => {
  return (
    <BottomSheet
      visible={visible}
      collapsedHeight={COLLAPSED_HEIGHT}
      initialState="expanded"
      onBackdropPress={onBack}
      sheetStyle={{
        backgroundColor: "#F6F5F1",
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
      }}
      header={
        <View className="px-5 pb-4 pt-3">
          <View className="h-1.5 w-14 self-center rounded-full bg-slate-300" />

          <View className="mt-4 flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text className="font-psemibold text-2xl text-slate-950">
                Share a new spot
              </Text>
              <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
                Add a short title and useful context so the place is easy to recognize
                when it goes through review.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to placement"
              className="rounded-full bg-white px-3 py-2"
            >
              <Text className="font-pmedium text-sm text-slate-700">Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      bodyStyle={{ minHeight: 0 }}
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
          <View className="rounded-[26px] bg-slate-900 px-5 py-4">
            <Text className="font-psemibold text-base text-white">
              New spots are reviewed before they appear on the public map.
            </Text>
            <Text className="mt-2 font-pregular text-sm leading-6 text-slate-300">
              A photo helps, but title and description are the only required fields.
            </Text>
          </View>

          <View className="mt-6">
            <Text className="font-pmedium text-sm text-slate-700">Title</Text>
            <TextInput
              value={title}
              onChangeText={onTitleChange}
              placeholder="Bench near Cathedral"
              placeholderTextColor="#94A3B8"
              className="mt-2 rounded-[26px] border border-slate-200 bg-white px-4 py-4 font-pmedium text-base text-slate-950"
            />
          </View>

          <View className="mt-5">
            <Text className="font-pmedium text-sm text-slate-700">Description</Text>
            <TextInput
              value={description}
              onChangeText={onDescriptionChange}
              placeholder="What makes this place good for sitting, resting, or working?"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              className="mt-2 min-h-[148px] rounded-[26px] border border-slate-200 bg-white px-4 py-4 font-pmedium text-base text-slate-950"
            />
          </View>

          <View className="mt-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-pmedium text-sm text-slate-700">Photo</Text>
              <Text className="font-pregular text-xs text-slate-500">Optional</Text>
            </View>

            <View className="mt-2 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
              {photo ? (
                <Image
                  source={{ uri: photo.uri }}
                  resizeMode="cover"
                  className="h-52 w-full"
                />
              ) : (
                <View className="h-52 items-center justify-center bg-[#EEF6F2] px-8">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
                    <Image
                      source={icons.upload}
                      resizeMode="contain"
                      className="h-8 w-8"
                      style={{ tintColor: "#0F766E" }}
                    />
                  </View>
                  <Text className="mt-4 text-center font-psemibold text-base text-slate-900">
                    Add a photo if it helps identify the place
                  </Text>
                  <Text className="mt-2 text-center font-pregular text-sm leading-6 text-slate-600">
                    A quick photo makes moderation easier and looks better in your profile
                    gallery later.
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-4 flex-row">
              <View className="flex-1 pr-1.5">
                <CustomButton
                  title="Take photo"
                  handlePress={onTakePhoto}
                  containerStyles="min-h-[48px] rounded-2xl"
                  textStyles="text-sm"
                />
              </View>
              <View className="flex-1 pl-1.5">
                <CustomButton
                  title="Choose photo"
                  handlePress={onChooseFromLibrary}
                  variant="ghost"
                  containerStyles="min-h-[48px] rounded-2xl bg-[#EEF1F4]"
                  textStyles="text-sm"
                />
              </View>
            </View>

            {photo ? (
              <View className="mt-3">
                <CustomButton
                  title="Remove photo"
                  handlePress={onRemovePhoto}
                  variant="danger"
                  containerStyles="min-h-[48px] rounded-2xl"
                  textStyles="text-sm"
                />
              </View>
            ) : null}
          </View>

          <View className="mt-7">
            <CustomButton
              title="Submit marker"
              handlePress={onSubmit}
              isLoading={isSubmitting}
              containerStyles="min-h-[54px] rounded-2xl"
              textStyles="text-base"
            />
          </View>

          <View className="mt-3">
            <CustomButton
              title="Discard draft"
              handlePress={onCancel}
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

export default MarkerCreationModal;
