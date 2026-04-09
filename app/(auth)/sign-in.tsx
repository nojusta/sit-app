import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Image,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  isInvalidCredentialsError,
  normalizeEmail,
  useAuthContext,
  User,
  validateLoginForm,
} from "@/features/auth";
import { signIn, getCurrentUser } from "@/services/appwrite";
import { Link, router, useLocalSearchParams } from "expo-router";
import { images } from "@/shared/constants";
import { CustomButton, FormField } from "@/shared/components";

const SignIn = () => {
  const { setUser, setIsLogged } = useAuthContext();
  const params = useLocalSearchParams<{ email?: string }>();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: typeof params.email === "string" ? params.email : "",
    password: "",
  });

  const submit = async () => {
    const validationMessage = validateLoginForm(form);
    if (validationMessage) {
      Alert.alert("Error", validationMessage);
      return;
    }

    const normalizedEmail = normalizeEmail(form.email);

    setSubmitting(true);

    try {
      await signIn(normalizedEmail, form.password);
      const result = await getCurrentUser();
      if (!result) {
        throw new Error("Unable to load your account right now. Please try again.");
      }

      setUser(result as User);
      setIsLogged(!!result);
      router.replace("/home");
    } catch (error: unknown) {
      if (isInvalidCredentialsError(error)) {
        Alert.alert("Error", "Incorrect email or password. Please try again.");
      } else if (error instanceof Error) {
        Alert.alert("Sign in failed", error.message);
      } else {
        Alert.alert("Sign in failed", "Unable to sign in right now. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            className="w-full flex justify-center px-4 my-6"
            style={{
              minHeight: Dimensions.get("window").height - 100,
              paddingBottom: Platform.OS === "android" ? 24 : 0,
            }}
          >
            <Image
              source={images.logo}
              resizeMode="contain"
              className="w-[130px] h-[84px] mb-4"
            />

            <Text className="text-2xl font-semibold text-white mt-10 font-psemibold">
              Log in to SIT
            </Text>

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
              title="Sign In"
              handlePress={submit}
              containerStyles="mt-7"
              isLoading={isSubmitting}
            />

            <View className="flex justify-center pt-5 flex-row gap-2">
              <Text className="text-lg text-gray-100 font-pregular">
                Don't have an account?
              </Text>
              <Link href="/sign-up" className="text-lg font-psemibold text-secondary-100">
                Sign up
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
