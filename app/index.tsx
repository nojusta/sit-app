import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { View, Text, Image, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext, User } from "@/features/auth";
import { images } from "@/shared/constants";
import { CustomButton, Loader } from "@/shared/components";
import Constants from "expo-constants";
import { adminLogin } from "@/services/appwrite";

type ExpoExtra = Record<string, string | undefined>;

const constantsWithUntypedManifest = Constants as typeof Constants & {
  manifest?: { extra?: ExpoExtra } | null;
  manifest2?: { extra?: { expoClient?: { extra?: ExpoExtra } } } | null;
};

const expoExtra =
  Constants.expoConfig?.extra ??
  constantsWithUntypedManifest.manifest?.extra ??
  constantsWithUntypedManifest.manifest2?.extra?.expoClient?.extra ??
  {};

const { ADMIN_EMAIL, ADMIN_PASSWORD } = expoExtra;

const MainApp = () => {
  const { setUser, isLogged, setIsLogged, loading } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      Alert.alert(
        "Missing admin credentials",
        "Check ADMIN_EMAIL and ADMIN_PASSWORD in your env config.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const user = await adminLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
      setUser(user as User | null);
      setIsLogged(Boolean(user));
    } catch (error) {
      if (__DEV__) console.error("Admin login failed", error);
      Alert.alert(
        "Admin login failed",
        error instanceof Error ? error.message : "Unknown error.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && isLogged) return <Redirect href="/home" />;

  return (
    <SafeAreaView style={{ backgroundColor: "#161622", height: "100%" }}>
      <Loader isLoading={loading || submitting} />

      <ScrollView
        contentContainerStyle={{
          height: "100%",
        }}
      >
        <View
          style={{
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            paddingHorizontal: 16,
          }}
        >
          <Image
            source={images.logo}
            style={{ width: 130, height: 84 }}
            resizeMode="contain"
          />

          <Image
            source={images.cards}
            style={{ maxWidth: 380, width: "100%", height: 298 }}
            resizeMode="contain"
          />

          <View style={{ position: "relative", marginTop: 20 }}>
            <Text
              style={{
                fontSize: 24,
                color: "white",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Discover Amazing{"\n"}
              Sitting Spots with <Text style={{ color: "#BEBEBE" }}>SIT</Text>
            </Text>

            <Image
              source={images.path}
              style={{
                width: 136,
                height: 15,
                position: "absolute",
                bottom: -8,
                right: -32,
              }}
              resizeMode="contain"
            />
          </View>

          <CustomButton
            title="Continue with Email"
            handlePress={() => router.push("/sign-in")}
            containerStyles="w-3/4 mx-auto mt-7"
          />

          <CustomButton
            title="Dev Log"
            handlePress={handleSignIn}
            containerStyles="mt-10"
          />
        </View>
      </ScrollView>

      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
};

export default MainApp;
