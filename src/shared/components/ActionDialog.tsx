import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

import CustomButton, { type CustomButtonVariant } from "./CustomButton";

interface ActionDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel: () => void;
  confirmVariant?: CustomButtonVariant;
  cancelVariant?: CustomButtonVariant;
  confirmAccessibilityLabel?: string;
  cancelAccessibilityLabel?: string;
}

const ActionDialog: React.FC<ActionDialogProps> = ({
  visible,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = "Cancel",
  onCancel,
  confirmVariant = "primary",
  cancelVariant = "ghost",
  confirmAccessibilityLabel,
  cancelAccessibilityLabel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View className="bg-black/45 flex-1 items-center justify-center px-5">
        <Pressable
          className="absolute inset-0"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        />
        <View className="w-full max-w-[340px] rounded-[24px] bg-white px-5 py-5">
          <Text className="text-center font-psemibold text-[22px] leading-7 text-primary">
            {title}
          </Text>
          {description ? (
            <Text className="mt-3 text-center font-pregular text-base leading-6 text-gray-600">
              {description}
            </Text>
          ) : null}
          <View className="mt-6 flex-row flex-wrap justify-center">
            <View className="mx-[6px] mb-3">
              <CustomButton
                title={confirmLabel}
                handlePress={onConfirm}
                variant={confirmVariant}
                containerStyles="self-center min-h-[48px] w-[200px] rounded-full px-5"
                textStyles="text-base"
                accessibilityLabel={confirmAccessibilityLabel}
              />
            </View>
            <View className="mx-[6px] mb-3">
              <CustomButton
                title={cancelLabel}
                handlePress={onCancel}
                variant={cancelVariant}
                containerStyles="self-center min-h-[48px] w-[200px] rounded-full px-5"
                textStyles="text-base"
                accessibilityLabel={cancelAccessibilityLabel}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ActionDialog;
