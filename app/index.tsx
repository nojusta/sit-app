import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants"; 
import Loader from "../components/Loader";
import CustomButton from "../components/CustomButton"; 
import { useGlobalContext } from "../context/GlobalProvider";
import Constants from "expo-constants"; 
import { adminLogin } from "../lib/appwrite"; 

const { ADMIN_EMAIL, ADMIN_PASSWORD } = Constants.expoConfig?.extra || {};

const MainApp = () => {
  const { setUser, isLogged, setIsLogged, loading } = useGlobalContext(); 
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      setSubmitting(true);
      await adminLogin(
        ADMIN_EMAIL,
        ADMIN_PASSWORD,
        setUser,
        setIsLogged,
        setSubmitting
      );
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