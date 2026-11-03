import React, { useEffect } from "react";
import { Button, Platform, ScrollView, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MarkerCreationModal from "@/features/markers/components/MarkerCreationModal";
import MarkerRatingCard from "@/features/markers/components/MarkerRatingCard";
import MarkerEditSheet from "@/features/profile/components/MarkerEditSheet";
import useMarkerWeather, {
  type MarkerWeatherState,
} from "@/features/weather/hooks/useMarkerWeather";
import {
  useQualityLabBootstrap,
  useQualityLabSession,
  type Bootstrap,
  type WeatherTarget,
} from "./hooks/useQualityLab";
function WeatherProbe({
  marker,
  onState,
}: {
  marker: WeatherTarget;
  onState: (id: string, state: MarkerWeatherState) => void;
}) {
  const state = useMarkerWeather(marker);
  useEffect(() => {
    onState(marker.id, state);
  }, [marker.id, onState, state]);
  return null;
}
function LabSession({ boot }: { boot: Bootstrap }) {
  const {
    screen,
    setScreen,
    status,
    last,
    title,
    setTitle,
    description,
    setDescription,
    attributes,
    setAttributes,
    targets,
    onWeatherState,
    rating,
    marker,
    recordAction,
  } = useQualityLabSession(boot);
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>SIT · 3LD measurements</Text>
        <Text>
          {Platform.OS} {String(Platform.Version)} ·{" "}
          {__DEV__ ? "development build" : "release build"}
        </Text>
        <Text selectable style={styles.status}>
          {status}
        </Text>
        <Text>Controlled scenarios · isolated test data</Text>
        <Button title="Open creation form" onPress={() => setScreen("create")} />
        <Button title="Open edit form" onPress={() => setScreen("edit")} />
        {screen === "rating" ? (
          <MarkerRatingCard
            {...rating}
            onScoreChange={rating.handleScoreChange}
            onCommentChange={rating.handleCommentChange}
            onSubmit={() => {
              void rating.handleSubmit();
            }}
          />
        ) : null}
        <Text selectable style={styles.result}>
          {last}
        </Text>
      </ScrollView>
      {targets.map((target) => (
        <WeatherProbe key={target.id} marker={target} onState={onWeatherState} />
      ))}
      <MarkerCreationModal
        visible={screen === "create"}
        title={title}
        description={description}
        attributes={attributes}
        photo={null}
        isSubmitting={false}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onAttributesChange={setAttributes}
        onTakePhoto={() => recordAction("take-photo")}
        onChooseFromLibrary={() => recordAction("choose-photo")}
        onRemovePhoto={() => recordAction("remove-photo")}
        onBack={() => {
          recordAction("back");
          setScreen("dashboard");
        }}
        onCancel={() => {
          recordAction("discard");
          setScreen("dashboard");
        }}
        onSubmit={() => recordAction("submit")}
      />
      <MarkerEditSheet
        marker={screen === "edit" ? marker : null}
        description={description}
        attributes={attributes}
        queuedPhotos={[]}
        isSubmitting={false}
        onDescriptionChange={setDescription}
        onAttributesChange={setAttributes}
        onAddPhotos={() => recordAction("add-photos")}
        onRemoveQueuedPhoto={() => recordAction("remove-photo")}
        onClose={() => {
          recordAction("close");
          setScreen("dashboard");
        }}
        onSubmit={() => recordAction("submit-edits")}
      />
    </SafeAreaView>
  );
}
export default function QualityLabScreen() {
  const { boot, error } = useQualityLabBootstrap();
  return boot ? (
    <LabSession boot={boot} />
  ) : (
    <SafeAreaView>
      <Text>{error}</Text>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, gap: 12 },
  heading: { fontSize: 24, fontWeight: "700" },
  status: { fontSize: 18, color: "#0f766e", paddingVertical: 10 },
  result: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    marginTop: 20,
  },
});
