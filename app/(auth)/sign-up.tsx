import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import {
  normalizeRegistrationForm,
  useAuthContext,
  User,
  validateRegistrationForm,
} from "@/features/auth";
import { createUser } from "@/services/appwrite";
import { images } from "@/shared/constants";
import { CustomButton, FormField } from "@/shared/components";

const isConflictError = (error: unknown): error is { code: number } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code: unknown }).code === "number" &&
  (error as { code: number }).code === 409;

const SignUp = () => {
  const { setUser, setIsLogged } = useAuthContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const submit = async () => {
    const validationMessage = validateRegistrationForm(form);
    if (validationMessage) {
      Alert.alert("Error", validationMessage);
      return;
    }

    const normalizedForm = normalizeRegistrationForm(form);

    setSubmitting(true);
    try {
      const result = await createUser(
        normalizedForm.email,
        normalizedForm.password,
        normalizedForm.username,
      );
      setUser(result as User);
      setIsLogged(true);

      Alert.alert("Success", "User signed up successfully");
      router.replace("/home");
    } catch (error: unknown) {
      if (isConflictError(error)) {
        Alert.alert("Account already exists", "Redirecting to sign in.", [
          {
            text: "OK",
            onPress: () => {
              router.replace({
                pathname: "/sign-in",
                params: {
                  email: normalizedForm.email,
                },
              });
            },
          },
        ]);
      } else if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unknown error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="h-full bg-primary">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            className="my-6 flex w-full justify-center px-4"
            style={{
              minHeight: Dimensions.get("window").height - 100,
              marginTop: 5,
              paddingBottom: Platform.OS === "android" ? 24 : 0,
            }}
          >
            <Image
              source={images.logo}
              resizeMode="contain"
              className="mb-4 h-[54px] w-[100px]"
            />

            <Text className="mt-10 font-psemibold text-2xl font-semibold text-white">
              Sign Up to SIT
            </Text>

            <FormField
              title="Display name"
              value={form.username}
              placeholder="Enter your display name"
              handleChangeText={(e) => setForm({ ...form, username: e })}
              otherStyles="mt-10"
            />

            <FormField
              title="Email"
              value={form.email}
              placeholder="Enter your email"
              handleChangeText={(e) => setForm({ ...form, email: e })}
              otherStyles="mt-7"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <FormField
              title="Password"
              value={form.password}
              placeholder="Enter your password"
              handleChangeText={(e) => setForm({ ...form, password: e })}
              otherStyles="mt-7"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
            />

            <CustomButton
              title="Sign Up"
              handlePress={submit}
              containerStyles="mt-7"
              isLoading={isSubmitting}
            />

            <View className="flex flex-row justify-center gap-2 pt-5">
              <Text className="font-pregular text-lg text-gray-100">
                Have an account already?
              </Text>
              <Link href="/sign-in" className="font-psemibold text-lg text-secondary">
                Login
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;
