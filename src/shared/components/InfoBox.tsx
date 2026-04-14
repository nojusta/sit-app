import { View, Text } from "react-native";
import React from "react";

interface InfoBoxProps {
  title: string;
  subtitle: string;
  containerStyles?: string;
  titleStyles?: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  subtitle,
  containerStyles = "",
  titleStyles = "",
}) => {
  return (
    <View className={containerStyles}>
      <Text className={`text-center font-psemibold text-white ${titleStyles}`}>
        {title}
      </Text>
      <Text className="text-center font-pregular text-sm text-gray-100">{subtitle}</Text>
    </View>
  );
};

export default InfoBox;
