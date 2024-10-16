import { StatusBar } from "expo-status-bar";
import { Link, Redirect, router } from "expo-router";
import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect } from "react";

import { images } from "../constants";
import Loader from "../components/Loader"; 
import CustomButton from "../components/CustomButton"; // Assuming CustomButton is a custom component (jis yra)

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const loading: boolean = false; // Replace with actual loading state (bus)
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  return (
    <SafeAreaView style={{ backgroundColor: "#161622", height: "100%" }}>
      <Loader isLoading={loading} />

      <ScrollView
        contentContainerStyle={{
          height: "100%",
        }}
      >
        <View style={{ width: "100%", justifyContent: "center", alignItems: "center", height: "100%", paddingHorizontal: 16 }}>
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
            <Text style={{ fontSize: 24, color: "white", fontWeight: "bold", textAlign: "center" }}>
              Discover Amazing{"\n"}
              Sitting Spots with{" "}
              <Text style={{ color: "#BEBEBE" }}>SIT</Text>
            </Text>

            <Image
              source={images.path}
              style={{ width: 136, height: 15, position: "absolute", bottom: -8, right: -32 }}
              resizeMode="contain"
            />
          </View>

          {/* <Text style={{ fontSize: 14, fontFamily: "PRegular", color: "#D3D3D3", marginTop: 28, textAlign: "center" }}>
            Where Creativity Meets Innovation: Embark on a Journey of Limitless
            Exploration with Aora
          </Text> */}

          <Link href="/home">
            <Text style={{ fontSize: 14, fontFamily: "PRegular", color: "#A0A0A0", marginTop: 28, textAlign: "center" }}> {/* Medium gray text */}
              Go to Home
            </Text>
          </Link>

          <CustomButton
            title="Continue with Email"
            handlePress={() => router.push("/sign-in")}
            containerStyles={{ width: "100%", marginTop: 28 }}
            isLoading={loading} // Added isLoading prop
          />
        </View>
      </ScrollView>

      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
};

export default App;