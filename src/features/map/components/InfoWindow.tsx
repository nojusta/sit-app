import React from "react";
import { Image, ScrollView, Text, View } from "react-native";

import type { MarkerData } from "../core";
import { BottomSheet, CustomButton } from "@/shared/components";

const COLLAPSED_HEIGHT = 292;

interface InfoWindowProps {
  selectedMarker: MarkerData | null;
  initialHeight?: number;
  onStartNavigation?: () => void;
}

const InfoWindow: React.FC<InfoWindowProps> = ({
  selectedMarker,
  initialHeight = COLLAPSED_HEIGHT,
  onStartNavigation,
}) => {
  const previewPhotos = selectedMarker?.photoUrls?.length
    ? selectedMarker.photoUrls
    : selectedMarker?.photoUrl
      ? [selectedMarker.photoUrl]
      : [];

  return (
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
          <View className="self-center h-1.5 w-14 rounded-full bg-slate-300" />
          <View className="mt-4 flex-row items-start">
            <View className="mr-4 h-24 w-24 overflow-hidden rounded-[24px] bg-slate-200">
              {previewPhotos[0] ? (
                <Image
                  source={{ uri: previewPhotos[0] }}
                  resizeMode="cover"
                  className="h-full w-full"
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-[#E8ECEF] px-3">
                  <Text className="text-center font-pmedium text-xs leading-5 text-slate-600">
                    No images yet
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-1">
              <Text className="font-psemibold text-xl leading-7 text-slate-950">
                {selectedMarker?.title ?? ""}
              </Text>
              <Text
                className="mt-2 font-pregular text-sm leading-6 text-slate-600"
                numberOfLines={2}
              >
                {selectedMarker?.description ?? ""}
              </Text>
            </View>
          </View>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 4 }}
          >
            {previewPhotos.map((photo, index) => (
              <View
                key={`${selectedMarker?.id ?? "marker"}-${index}`}
                className="mr-3 h-56 w-72 overflow-hidden rounded-[28px] bg-slate-200"
              >
                <Image
                  source={{ uri: photo }}
                  resizeMode="cover"
                  className="h-full w-full"
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="mt-4 rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-6">
            <Text className="font-psemibold text-base text-slate-900">
              This marker has no images yet
            </Text>
            <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
              You can still use the description below to decide whether this sitting place
              is worth checking out.
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
  );
};

export default InfoWindow;
