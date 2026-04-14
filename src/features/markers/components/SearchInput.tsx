import { useState } from "react";
import { router, usePathname, type Href } from "expo-router";
import { View, TouchableOpacity, Image, TextInput, Alert } from "react-native";
import React from "react";

import { icons } from "@/shared/constants";

interface SearchInputProps {
  initialQuery?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ initialQuery = "" }) => {
  const pathname = usePathname();
  const [query, setQuery] = useState<string>(initialQuery);

  return (
    <View className="flex h-16 w-full flex-row items-center space-x-4 rounded-2xl border-2 border-black-200 bg-black-100 px-4 focus:border-secondary">
      <TextInput
        className="mt-0.5 flex-1 font-pregular text-base text-white"
        value={query}
        placeholder="Search a video topic"
        placeholderTextColor="#CDCDE0"
        onChangeText={(e) => setQuery(e)}
      />

      <TouchableOpacity
        onPress={() => {
          if (query === "")
            return Alert.alert(
              "Missing Query",
              "Please input something to search results across database",
            );

          if (pathname.startsWith("/search")) {
            router.setParams({ query });
          } else {
            const href = `/search/${query}` as Href;
            router.push(href);
          }
        }}
      >
        <Image source={icons.search} className="h-5 w-5" resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
};

export default SearchInput;
