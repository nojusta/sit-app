import { Image, Pressable, Text, View } from "react-native";

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

  return (
    <Pressable onPress={onPress} className="w-full">
      <View className="h-[188px] overflow-hidden rounded-[24px] border border-slate-700 bg-slate-800">
        <View className="relative">
          {previewPhoto ? (
            <Image
              source={{ uri: previewPhoto }}
              resizeMode="cover"
              blurRadius={isSelected ? 10 : 0}
              className="h-[128px] w-full"
            />
          ) : (
            <View className="h-[128px] items-center justify-center bg-slate-700">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-600">
                <Image
                  source={icons.upload}
                  resizeMode="contain"
                  className="h-7 w-7"
                  style={{ tintColor: "#E2E8F0" }}
                />
              </View>
            </View>
          )}

          {isSelected ? (
            <View className="absolute inset-0 items-center justify-center bg-slate-950/55 px-4">
              <View className="w-full max-w-[150px]">
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

export default MarkerGalleryTile;
