import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
  Image,
  Text,
  Dimensions,
} from "react-native";
import { useGlobalContext } from "../../context/GlobalProvider";
import { signIn, getCurrentUser } from "../../lib/appwrite";
import { router } from "expo-router";
import FormField from "../../components/FormField"; // Assuming FormField is a custom component
import CustomButton from "../../components/CustomButton"; // Assuming CustomButton is a custom component
import { images } from "../../constants"; // Assuming images is an object with image sources

const SignIn = () => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      await signIn(form.email, form.password);
      const result = await getCurrentUser();
      setUser(result);
      setIsLogged(true);

      Alert.alert("Success", "User signed in successfully");
      router.replace("/home");
    } catch (error: unknown) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unknown error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#161622", height: "100%" }}>
      <ScrollView
        contentContainerStyle={{
          minHeight: Dimensions.get("window").height - 100,
        }}
      >
        <View>
          <Image
            source={images.logo}
            resizeMode="contain"
            style={{ width: 130, height: 84, marginBottom: 16 }}
          />

          <Text
            style={{
              fontSize: 24,
              fontWeight: "600",
              color: "white",
              marginTop: 40,
            }}
          >
            Log in to SIT
          </Text>

          <FormField
            title="Email"
            value={form.email}
            placeholder="Enter your email"
            handleChangeText={(text) => setForm({ ...form, email: text })}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Password"
            value={form.password}
            placeholder="Enter your password"
            handleChangeText={(text) => setForm({ ...form, password: text })}
            otherStyles="mt-7"
            secureTextEntry
          />

          <CustomButton
            title="Sign In"
            handlePress={submit}
            containerStyles="w-full mt-7"
            isLoading={isSubmitting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
