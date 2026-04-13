import { useState } from "react";
import * as Animatable from "react-native-animatable";
import {
  FlatList,
  Image,
  ImageBackground,
  TouchableOpacity,
  FlatListProps,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import React from "react";

import { icons } from "@/shared/constants";
import InlineVideoPlayer from "./InlineVideoPlayer";

interface Post {
  $id: string;
  video: string;
  thumbnail: string;
}

interface TrendingItemProps {
  activeItem: string;
  item: Post;
}

interface TrendingProps {
  posts: Post[];
}

const zoomIn: Animatable.CustomAnimation<ViewStyle & TextStyle & ImageStyle> = {
  0: {
    transform: [{ scale: 0.9 }],
  },
  1: {
    transform: [{ scale: 1 }],
  },
};

const zoomOut: Animatable.CustomAnimation<ViewStyle & TextStyle & ImageStyle> = {
  0: {
    transform: [{ scale: 1 }],
  },
  1: {
    transform: [{ scale: 0.9 }],
  },
};

const TrendingItem: React.FC<TrendingItemProps> = ({ activeItem, item }) => {
  const [play, setPlay] = useState(false);

  return (
    <Animatable.View
      className="mr-5"
      animation={activeItem === item.$id ? zoomIn : zoomOut}
      duration={500}
    >
      {play ? (
        <InlineVideoPlayer
          source={item.video}
          containerClassName="w-52 h-72 rounded-[33px] mt-3 bg-white/10 overflow-hidden"
          onPlaybackFinished={() => setPlay(false)}
        />
      ) : (
        <TouchableOpacity
          className="relative flex items-center justify-center"
          activeOpacity={0.7}
          onPress={() => setPlay(true)}
        >
          <ImageBackground
            source={{
              uri: item.thumbnail,
            }}
            className="my-5 h-72 w-52 overflow-hidden rounded-[33px] shadow-lg shadow-black/40"
            resizeMode="cover"
          />

          <Image
            source={icons.play}
            className="absolute h-12 w-12"
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </Animatable.View>
  );
};

const Trending: React.FC<TrendingProps> = ({ posts }) => {
  const [activeItem, setActiveItem] = useState(posts[0].$id);

  const viewableItemsChanged: FlatListProps<Post>["onViewableItemsChanged"] = ({
    viewableItems,
  }) => {
    if (viewableItems.length > 0) {
      setActiveItem(viewableItems[0].key as string);
    }
  };

  return (
    <FlatList
      data={posts}
      horizontal
      keyExtractor={(item) => item.$id}
      renderItem={({ item }) => <TrendingItem activeItem={activeItem} item={item} />}
      onViewableItemsChanged={viewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 70,
      }}
      contentOffset={{ x: 170, y: 0 }} // Added 'y' to fix the type error
    />
  );
};

export default Trending;
