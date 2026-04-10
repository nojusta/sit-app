import { Image, Text, View } from "react-native";

import type { MarkerRecord } from "@/services/appwrite";
import { icons } from "@/shared/constants";

interface MarkerGalleryTileProps {
  marker: MarkerRecord;
}

const MarkerGalleryTile: React.FC<MarkerGalleryTileProps> = ({ marker }) => {
  const previewPhoto = marker.photoUrls?.[0] ?? marker.photoUrl;

  return (
    <View className="flex-1 overflow-hidden rounded-[24px] border border-slate-700 bg-slate-800">
      {previewPhoto ? (
        <Image
          source={{ uri: previewPhoto }}
          resizeMode="cover"
          className="h-32 w-full"
        />
      ) : (
        <View className="h-32 items-center justify-center bg-slate-700">
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

      <View className="px-3 py-3">
        <Text className="font-psemibold text-sm text-slate-100" numberOfLines={1}>
          {marker.title}
        </Text>
        <Text className="mt-1 font-pregular text-xs uppercase tracking-[1px] text-slate-400">
          {marker.status.replace(/_/g, " ")}
        </Text>
      </View>
    </View>
  );
};

export default MarkerGalleryTile;
