import React from "react";
import { Image, Pressable, Text, View, type GestureResponderEvent } from "react-native";

import type { MarkerRecord } from "@/services/appwrite";
import { CustomButton } from "@/shared/components";
import { icons } from "@/shared/constants";

interface MarkerGalleryTileProps {
  marker: MarkerRecord;
  isSelected?: boolean;
  onPress?: () => void;
  onEditPress?: () => void;
}

const MarkerGalleryTile: React.FC<MarkerGalleryTileProps> = ({
  marker,
  isSelected = false,
  onPress,
  onEditPress,
}) => {
  const previewPhoto = marker.photoUrls?.[0] ?? marker.photoUrl;
  const handleTouchStart = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  return (
    <Pressable onPress={onPress} onTouchStart={handleTouchStart} className="w-full">
      <View className="h-[188px] overflow-hidden rounded-[24px] border border-slate-700 bg-slate-800">
        <View className="relative h-[128px] items-center justify-center">
          {previewPhoto ? (
            <Image
              source={{ uri: previewPhoto }}
              resizeMode="cover"
              blurRadius={isSelected ? 10 : 0}
              className="absolute inset-0 h-[128px] w-full"
            />
          ) : (
            <View className="absolute inset-0 h-[128px] w-full items-center justify-center bg-slate-700">
              <View className="absolute inset-0 bg-slate-700" />
              <Image
                source={icons.upload}
                resizeMode="contain"
                blurRadius={22}
                className="absolute inset-0 h-full w-full opacity-15"
                style={{ tintColor: "#E2E8F0" }}
              />
              <View className="items-center justify-center px-4">
                <Image
                  source={icons.upload}
                  resizeMode="contain"
                  className="h-7 w-7"
                  style={{ tintColor: "#E2E8F0" }}
                />
                <Text className="mt-3 font-pregular text-xs text-slate-200">
                  No photo yet
                </Text>
              </View>
            </View>
          )}

          {isSelected ? (
            <View className="absolute inset-0 flex-row items-center justify-center bg-slate-950/55 px-4">
              <View className="w-[150px]">
                <CustomButton
                  title="Edit marker"
                  handlePress={() => onEditPress?.()}
                  containerStyles="min-h-[46px] rounded-2xl bg-slate-900"
                  textStyles="text-sm text-white"
                />
              </View>
            </View>
          ) : null}
        </View>

        <View className="flex-1 px-3 py-3">
          <Text className="font-psemibold text-sm text-slate-100" numberOfLines={1}>
            {marker.title}
          </Text>
          <Text className="mt-1 font-pregular text-xs uppercase tracking-[1px] text-slate-400">
            {marker.status.replace(/_/g, " ")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(MarkerGalleryTile);
