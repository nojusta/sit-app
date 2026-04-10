import { Text, View } from "react-native";

import { CustomButton } from "@/shared/components";
import type { MapCoordinate } from "../core";

interface MarkerPlacementCardProps {
  coordinate: MapCoordinate;
  onCancel: () => void;
  onConfirm: () => void;
}

const formatCoordinate = ({ latitude, longitude }: MapCoordinate) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const MarkerPlacementCard: React.FC<MarkerPlacementCardProps> = ({
  coordinate,
  onCancel,
  onConfirm,
}) => {
  return (
    <View pointerEvents="box-none" className="absolute left-4 right-4 top-6 z-20">
      <View className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
        <Text className="font-psemibold text-xl text-slate-900">
          Place a sitting spot
        </Text>
        <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
          Drag the marker to the exact bench or resting point. You can also tap the map to
          nudge the placement before continuing.
        </Text>

        <View className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3">
          <Text className="font-pmedium text-xs uppercase tracking-[1.2px] text-emerald-700">
            Selected location
          </Text>
          <Text className="mt-1 font-psemibold text-base text-slate-900">
            {formatCoordinate(coordinate)}
          </Text>
        </View>

        <View className="mt-5 flex-row gap-3">
          <CustomButton
            title="Cancel"
            handlePress={onCancel}
            variant="ghost"
            containerStyles="min-h-[52px] flex-1"
            textStyles="text-base"
          />
          <CustomButton
            title="Continue"
            handlePress={onConfirm}
            containerStyles="min-h-[52px] flex-1"
            textStyles="text-base"
          />
        </View>
      </View>
    </View>
  );
};

export default MarkerPlacementCard;
