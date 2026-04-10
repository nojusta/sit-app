import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type UploadableImage } from "@/services/appwrite";
import { CustomButton } from "@/shared/components";

interface MarkerCreationModalProps {
  visible: boolean;
  coordinateLabel: string;
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
  coordinateLabel,
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onBack}
      presentationStyle="overFullScreen"
    >
      <View className="flex-1 bg-black/50 justify-end">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={24}
        >
          <View className="max-h-[92%] rounded-t-[34px] bg-white">
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 22,
                paddingBottom: 28,
              }}
            >
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="font-psemibold text-2xl text-slate-950">
                    Share a new spot
                  </Text>
                  <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
                    Add enough context so other people know why this place is worth
                    sitting down for.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Back to placement"
                  className="rounded-full bg-slate-100 px-3 py-2"
                >
                  <Text className="font-pmedium text-sm text-slate-700">Back</Text>
                </TouchableOpacity>
              </View>

              <View className="mt-5 rounded-[26px] bg-slate-950 px-5 py-4">
                <Text className="font-pmedium text-xs uppercase tracking-[1.2px] text-slate-300">
                  Locked location
                </Text>
                <Text className="mt-1 font-psemibold text-lg text-white">
                  {coordinateLabel}
                </Text>
                <Text className="mt-2 font-pregular text-sm leading-6 text-slate-300">
                  Submitted spots start in review mode and appear on the public map after
                  approval.
                </Text>
              </View>

              <View className="mt-6">
                <Text className="font-pmedium text-sm text-slate-700">Title</Text>
                <TextInput
                  value={title}
                  onChangeText={onTitleChange}
                  placeholder="Bench near Cathedral"
                  placeholderTextColor="#94A3B8"
                  className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 font-pmedium text-base text-slate-950"
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
                  className="mt-2 min-h-[140px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 font-pmedium text-base text-slate-950"
                />
              </View>

              <View className="mt-5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-pmedium text-sm text-slate-700">Photo</Text>
                  <Text className="font-pregular text-xs text-slate-500">Optional</Text>
                </View>

                <View className="mt-2 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
                  {photo ? (
                    <Image
                      source={{ uri: photo.uri }}
                      resizeMode="cover"
                      className="h-52 w-full"
                    />
                  ) : (
                    <View className="h-52 items-center justify-center bg-emerald-50">
                      <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                        <Text className="font-pbold text-lg text-emerald-700">SIT</Text>
                      </View>
                      <Text className="mt-4 font-psemibold text-base text-slate-900">
                        Add a photo if you have one
                      </Text>
                      <Text className="mt-1 px-10 text-center font-pregular text-sm leading-6 text-slate-600">
                        A quick photo makes the spot easier to recognize in your profile
                        and during review.
                      </Text>
                    </View>
                  )}
                </View>

                <View className="mt-3 flex-row flex-wrap gap-3">
                  <CustomButton
                    title="Take photo"
                    handlePress={onTakePhoto}
                    variant="ghost"
                    containerStyles="min-h-[48px] px-4"
                    textStyles="text-sm"
                  />
                  <CustomButton
                    title="Choose from library"
                    handlePress={onChooseFromLibrary}
                    variant="ghost"
                    containerStyles="min-h-[48px] px-4"
                    textStyles="text-sm"
                  />
                  {photo ? (
                    <CustomButton
                      title="Remove photo"
                      handlePress={onRemovePhoto}
                      variant="danger"
                      containerStyles="min-h-[48px] px-4"
                      textStyles="text-sm"
                    />
                  ) : null}
                </View>
              </View>

              <View className="mt-7 gap-3">
                <CustomButton
                  title="Submit marker"
                  handlePress={onSubmit}
                  isLoading={isSubmitting}
                  containerStyles="min-h-[56px]"
                  textStyles="text-base"
                />
                <CustomButton
                  title="Discard draft"
                  handlePress={onCancel}
                  variant="ghost"
                  containerStyles="min-h-[52px]"
                  textStyles="text-base"
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default MarkerCreationModal;
