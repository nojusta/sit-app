import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { MARKER_TAGS, MarkerTagPill } from "@/features/markers";
import { BottomSheet, CustomButton } from "@/shared/components";
import {
  DEFAULT_MARKER_FILTERS,
  DISTANCE_FILTER_OPTIONS,
  RATING_FILTER_OPTIONS,
  type MarkerDistanceThreshold,
  type MarkerFilters,
  type MarkerRatingThreshold,
} from "../utils/markerFilters";

interface MarkerFilterSheetProps {
  visible: boolean;
  filters: MarkerFilters;
  resultCount: number;
  isAuthenticated: boolean;
  hasCurrentLocation: boolean;
  onClose: () => void;
  onApply: (filters: MarkerFilters) => void;
  onClear: () => void;
}

const FilterSection: React.FC<{
  title: string;
  children: React.ReactNode;
  helperText?: string;
}> = ({ title, children, helperText }) => (
  <View style={styles.section}>
    <Text className="font-psemibold text-base text-slate-950">{title}</Text>
    {helperText ? (
      <Text className="mt-1 font-pregular text-xs leading-5 text-slate-500">
        {helperText}
      </Text>
    ) : null}
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SegmentedOption = <T extends string | number | null>({
  label,
  value,
  selectedValue,
  disabled = false,
  style,
  onPress,
}: {
  label: string;
  value: T;
  selectedValue: T;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress: (value: T) => void;
}) => {
  const isSelected = value === selectedValue;

  return (
    <Pressable
      onPress={() => onPress(value)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      style={[styles.optionButton, style]}
      className={`min-h-[42px] items-center justify-center rounded-2xl border px-3 ${
        isSelected ? "border-slate-900 bg-slate-900" : "border-slate-200 bg-white"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <Text
        numberOfLines={1}
        className={`font-psemibold text-sm ${
          isSelected ? "text-white" : "text-slate-700"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  disabled?: boolean;
  helperText?: string;
  onChange: (value: boolean) => void;
}> = ({ label, value, disabled = false, helperText, onChange }) => (
  <Pressable
    onPress={() => onChange(!value)}
    disabled={disabled}
    accessibilityRole="switch"
    accessibilityState={{ checked: value, disabled }}
    className={`flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 ${
      disabled ? "opacity-50" : ""
    }`}
  >
    <View className="mr-4 flex-1">
      <Text className="font-psemibold text-sm text-slate-900">{label}</Text>
      {helperText ? (
        <Text className="mt-1 font-pregular text-xs leading-5 text-slate-500">
          {helperText}
        </Text>
      ) : null}
    </View>
    <View
      className={`h-7 w-12 justify-center rounded-full px-1 ${
        value ? "items-end bg-slate-900" : "items-start bg-slate-200"
      }`}
    >
      <View className="h-5 w-5 rounded-full bg-white" />
    </View>
  </Pressable>
);

const MarkerFilterSheet: React.FC<MarkerFilterSheetProps> = ({
  visible,
  filters,
  resultCount,
  isAuthenticated,
  hasCurrentLocation,
  onClose,
  onApply,
  onClear,
}) => {
  const { height } = useWindowDimensions();
  const [draftFilters, setDraftFilters] = useState<MarkerFilters>(filters);
  const sheetHeight = Math.min(648, Math.max(420, height - 88));
  const resultLabel = useMemo(
    () => `${resultCount} ${resultCount === 1 ? "marker" : "markers"}`,
    [resultCount],
  );

  useEffect(() => {
    if (visible) {
      setDraftFilters(filters);
    }
  }, [filters, visible]);

  const updateDraft = (partial: Partial<MarkerFilters>) => {
    setDraftFilters((current) => ({
      ...current,
      ...partial,
    }));
  };

  const toggleTag = (tagId: MarkerFilters["attributes"][number]) => {
    updateDraft({
      attributes: draftFilters.attributes.includes(tagId)
        ? draftFilters.attributes.filter((currentTagId) => currentTagId !== tagId)
        : [...draftFilters.attributes, tagId],
    });
  };

  const handleClear = () => {
    setDraftFilters(DEFAULT_MARKER_FILTERS);
    onClear();
  };

  return (
    <BottomSheet
      visible={visible}
      collapsedHeight={sheetHeight}
      initialState="collapsed"
      onBackdropPress={onClose}
      sheetStyle={{
        backgroundColor: "#F6F5F1",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
      header={
        <View className="px-5 pb-4 pt-3">
          <View className="h-1.5 w-14 self-center rounded-full bg-slate-300" />
          <View className="mt-4 flex-row items-center justify-between">
            <View>
              <Text className="font-psemibold text-xl text-slate-950">Filters</Text>
              <Text className="mt-1 font-pregular text-sm text-slate-500">
                {resultLabel}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              className="h-11 w-11 items-center justify-center rounded-full bg-white"
            >
              <MaterialIcons name="close" size={22} color="#0F172A" />
            </Pressable>
          </View>
        </View>
      }
      bodyStyle={{ minHeight: 0 }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <FilterSection title="Tags" helperText="Markers match any selected tag.">
          <View style={styles.pills}>
            {MARKER_TAGS.map((tag) => (
              <MarkerTagPill
                key={tag.id}
                tagId={tag.id}
                selected={draftFilters.attributes.includes(tag.id)}
                onPress={() => toggleTag(tag.id)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Details">
          <View style={styles.stack}>
            <ToggleRow
              label="With photos"
              value={draftFilters.hasPhotosOnly}
              onChange={(hasPhotosOnly) => updateDraft({ hasPhotosOnly })}
            />
            <ToggleRow
              label="Favorites only"
              value={draftFilters.favoritesOnly}
              disabled={!isAuthenticated}
              helperText={
                isAuthenticated ? undefined : "Sign in to filter by favorite places."
              }
              onChange={(favoritesOnly) => updateDraft({ favoritesOnly })}
            />
          </View>
        </FilterSection>

        <FilterSection title="Minimum rating">
          <View style={styles.optionGrid}>
            {RATING_FILTER_OPTIONS.map((option) => (
              <SegmentedOption<MarkerRatingThreshold | null>
                key={option.label}
                label={option.label}
                value={option.value}
                selectedValue={draftFilters.minimumRating}
                onPress={(minimumRating) => updateDraft({ minimumRating })}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection
          title="Distance"
          helperText={
            hasCurrentLocation
              ? "Measured from your current location."
              : "Location is unavailable right now."
          }
        >
          <View style={styles.optionGrid}>
            {DISTANCE_FILTER_OPTIONS.map((option) => (
              <SegmentedOption<MarkerDistanceThreshold | null>
                key={option.label}
                label={option.label}
                value={option.value}
                selectedValue={draftFilters.maxDistanceMeters}
                style={styles.distanceOptionButton}
                disabled={!hasCurrentLocation && option.value !== null}
                onPress={(maxDistanceMeters) => updateDraft({ maxDistanceMeters })}
              />
            ))}
          </View>
        </FilterSection>
      </ScrollView>

      <View style={styles.actions}>
        <CustomButton
          title="Clear all"
          variant="ghost"
          handlePress={handleClear}
          containerStyles="flex-1 rounded-2xl"
          textStyles="text-base"
          accessibilityLabel="Clear all filters"
        />
        <CustomButton
          title="Apply"
          handlePress={() => {
            onApply(
              hasCurrentLocation
                ? draftFilters
                : { ...draftFilters, maxDistanceMeters: null },
            );
            onClose();
          }}
          containerStyles="flex-1 rounded-2xl"
          textStyles="text-base"
          accessibilityLabel="Apply filters"
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  section: {
    marginTop: 18,
  },
  sectionContent: {
    marginTop: 12,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 10,
  },
  stack: {
    gap: 12,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  optionButton: {
    width: "48%",
  },
  distanceOptionButton: {
    width: "48%",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});

export default MarkerFilterSheet;
