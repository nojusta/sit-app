import { router } from "expo-router";
import { View, Text, Image } from "react-native";
import React, { useState } from "react";

import { images } from "../constants";
import CustomButton from "./CustomButton";

interface EmptyStateProps {
  title: string;
  subtitle: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = () => {
    setIsLoading(true);
    // Simulate navigation delay
    setTimeout(() => {
      router.push("/home");
      setIsLoading(false);
    }, 1000); // Adjust the delay as needed
  };

  return (
    <View className="flex items-center justify-center px-4">
      <Image source={images.empty} resizeMode="contain" className="h-[216px] w-[270px]" />

      <Text className="font-pmedium text-sm text-gray-100">{title}</Text>
      <Text className="mt-2 text-center font-psemibold text-xl text-white">
        {subtitle}
      </Text>

      <CustomButton
        title="Back to Map"
        handlePress={handlePress}
        containerStyles="w-10/12 mt-5"
        isLoading={isLoading}
      />
    </View>
  );
};

export default EmptyState;
