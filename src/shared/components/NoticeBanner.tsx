import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

interface NoticeBannerProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const NoticeBanner: React.FC<NoticeBannerProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SafeAreaView
      pointerEvents="box-none"
      edges={["top"]}
      className="absolute left-0 right-0 top-0 z-10 px-4 pt-3"
    >
      <View className="rounded-2xl border border-white/10 bg-[#1F2937] px-4 py-4 shadow-lg">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 font-psemibold text-sm text-white">{title}</Text>

          <TouchableOpacity
            onPress={() => setCollapsed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? "Expand notice" : "Minimize notice"}
          >
            <MaterialIcons
              name={collapsed ? "keyboard-arrow-down" : "keyboard-arrow-up"}
              size={20}
              color="#E5E7EB"
            />
          </TouchableOpacity>
        </View>

        {!collapsed ? (
          <>
            <Text className="mt-1 text-sm leading-5 text-gray-200">{description}</Text>

            {actionLabel && onAction ? (
              <TouchableOpacity
                onPress={onAction}
                className="mt-3 self-start rounded-full bg-white/10 px-3 py-2"
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
              >
                <Text className="font-psemibold text-sm text-gray-300">
                  {actionLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default NoticeBanner;
