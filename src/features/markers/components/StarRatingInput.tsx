import React from "react";
import { Pressable, Text, View } from "react-native";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => (
  <View className="flex-row items-center">
    {STAR_VALUES.map((starValue) => {
      const isFilled = starValue <= value;

      return (
        <Pressable
          key={starValue}
          onPress={() => onChange(starValue)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${starValue} ${starValue === 1 ? "star" : "stars"}`}
          accessibilityState={{ disabled, selected: isFilled }}
          className="mr-2 rounded-full bg-[#FFF3D6] px-2 py-1.5"
        >
          <Text
            className={`text-[28px] ${isFilled ? "text-amber-500" : "text-slate-300"}`}
          >
            ★
          </Text>
        </Pressable>
      );
    })}
  </View>
);

export default StarRatingInput;
