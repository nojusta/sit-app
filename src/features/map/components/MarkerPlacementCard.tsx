import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomButton } from "@/shared/components";

interface MarkerPlacementCardProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const MarkerPlacementCard: React.FC<MarkerPlacementCardProps> = ({
  onCancel,
  onConfirm,
}) => {
  return (
    <View
      className="absolute inset-0 z-20 justify-end bg-black/28"
      pointerEvents="box-none"
    >
      <SafeAreaView edges={["bottom"]}>
        <View className="rounded-t-[30px] bg-white px-5 pb-4 pt-4 shadow-sm">
          <View className="self-center h-1.5 w-14 rounded-full bg-slate-200" />
          <Text className="mt-4 font-psemibold text-xl text-slate-900">
            Place a sitting spot
          </Text>
          <Text className="mt-2 font-pregular text-sm leading-6 text-slate-600">
            Press and drag the marker onto the exact place, or tap the map to nudge it.
            When the spot feels right, continue to add the details.
          </Text>

          <View className="mt-5 flex-row">
            <View className="flex-1 pr-1.5">
              <CustomButton
                title="Cancel"
                handlePress={onCancel}
                variant="ghost"
                containerStyles="min-h-[50px]"
                textStyles="text-base"
              />
            </View>
            <View className="flex-1 pl-1.5">
              <CustomButton
                title="Continue"
                handlePress={onConfirm}
                containerStyles="min-h-[50px]"
                textStyles="text-base"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default MarkerPlacementCard;
