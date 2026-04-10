import { Image, Text, View } from "react-native";

import type { MarkerRecord } from "@/services/appwrite";

interface MarkerGalleryTileProps {
  marker: MarkerRecord;
}

const MarkerGalleryTile: React.FC<MarkerGalleryTileProps> = ({ marker }) => {
  return (
    <View className="flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      {marker.photoUrl ? (
        <Image
          source={{ uri: marker.photoUrl }}
          resizeMode="cover"
          className="h-32 w-full"
        />
      ) : (
        <View className="h-32 items-center justify-center bg-emerald-50">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
            <Text className="font-pbold text-sm text-emerald-700">SIT</Text>
          </View>
        </View>
      )}

      <View className="px-3 py-3">
        <Text className="font-psemibold text-sm text-slate-900" numberOfLines={1}>
          {marker.title}
        </Text>
        <Text className="mt-1 font-pregular text-xs uppercase tracking-[1px] text-slate-500">
          {marker.status.replace(/_/g, " ")}
        </Text>
      </View>
    </View>
  );
};

export default MarkerGalleryTile;
