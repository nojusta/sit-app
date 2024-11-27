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
    <View className="flex justify-center items-center px-4">
      <Image
        source={images.empty}
        resizeMode="contain"
        className="w-[270px] h-[216px]"
      />

      <Text className="text-sm font-pmedium text-gray-100">{title}</Text>
      <Text className="text-xl text-center font-psemibold text-white mt-2">
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