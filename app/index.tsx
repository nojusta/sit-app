import React from "react";
import { StatusBar } from "expo-status-bar";
import { Redirect, Link, router } from "expo-router";
import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants"; // Assuming images is an object with image sources
import Loader from "../components/Loader";
import CustomButton from "../components/CustomButton"; // Assuming CustomButton is a custom component
import GlobalProvider, { useGlobalContext } from "../context/GlobalProvider";

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const { loading, isLogged } = useGlobalContext(); // Use the loading state from the context

  if (!loading && isLogged) return <Redirect href="/home" />;

  return (
    <SafeAreaView style={{ backgroundColor: "#161622", height: "100%" }}>
      <GlobalProvider>
        <Loader isLoading={loading} />

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

            <Link href="/home">
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "PRegular",
                  color: "#A0A0A0",
                  marginTop: 28,
                  textAlign: "center",
                }}
              >
                Go to Home
              </Text>
            </Link>

            <CustomButton
              title="Continue with Email"
              handlePress={() => router.push("/sign-in")}
              containerStyles="w-full mt-7"
            />
          </View>
        </ScrollView>

        <StatusBar backgroundColor="#161622" style="light" />
      </GlobalProvider>
    </SafeAreaView>
  );
};

export default App;
