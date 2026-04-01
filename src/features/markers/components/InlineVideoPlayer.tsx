import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView, type VideoContentFit } from "expo-video";

interface InlineVideoPlayerProps {
  source: string;
  containerClassName?: string;
  contentFit?: VideoContentFit;
  onPlaybackFinished?: () => void;
  videoStyle?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    height: "100%",
  },
});

const InlineVideoPlayer: React.FC<InlineVideoPlayerProps> = ({
  source,
  containerClassName,
  contentFit = "contain",
  onPlaybackFinished,
  videoStyle,
}) => {
  const player = useVideoPlayer({ uri: source }, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.play();
  });

  useEventListener(player, "playToEnd", () => {
    onPlaybackFinished?.();
  });

  return (
    <View className={containerClassName}>
      <VideoView
        player={player}
        style={[styles.video, videoStyle]}
        contentFit={contentFit}
        nativeControls
      />
    </View>
  );
};

export default InlineVideoPlayer;
