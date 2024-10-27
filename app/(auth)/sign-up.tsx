import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
  TextInput,
  Text,
  Image,
  Dimensions,
} from "react-native";
import { Link, router } from "expo-router";
import { useGlobalContext } from "../../context/GlobalProvider";
import { createUser } from "../../lib/appwrite";
import { CustomButton } from "../../components";
import { images } from "../../constants";

const SignUp = () => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const submit = async () => {
    if (form.username === "" || form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return; // Add return to prevent further execution if validation fails
    }

    setSubmitting(true);
    try {
      const result = await createUser(form.email, form.password, form.username);
      setUser(result);
      setIsLogged(true);

      Alert.alert("Success", "User signed up successfully");
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
      <ScrollView>
        <View
          style={{
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            paddingHorizontal: 16,
            minHeight: Dimensions.get("window").height - 100,
            marginTop: 5,
          }}
        >
          <Image
            source={images.logo}
            resizeMode="contain"
            style={{ width: 100, height: 54, marginBottom: 16 }}
          />

          <Text
            style={{
              fontSize: 24,
              fontWeight: "600",
              color: "white",
              marginTop: 40,
            }}
          >
            Sign Up to SIT
          </Text>

          <TextInput
            value={form.username}
            placeholder="Enter your username"
            onChangeText={(text) => setForm({ ...form, username: text })}
            style={{
              marginTop: 20,
              padding: 10,
              backgroundColor: "#fff",
              borderRadius: 5,
            }}
          />

          <TextInput
            value={form.email}
            placeholder="Enter your email"
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            style={{
              marginTop: 20,
              padding: 10,
              backgroundColor: "#fff",
              borderRadius: 5,
            }}
          />

          <TextInput
            value={form.password}
            placeholder="Enter your password"
            onChangeText={(text) => setForm({ ...form, password: text })}
            secureTextEntry
            style={{
              marginTop: 20,
              padding: 10,
              backgroundColor: "#fff",
              borderRadius: 5,
            }}
          />

          <CustomButton
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              paddingTop: 20,
            }}
          >
            <Text style={{ fontSize: 16, color: "#A0A0A0" }}>
              Have an account already?
            </Text>
            <Link
              href="/sign-in"
              style={{ fontSize: 16, color: "#BEBEBE", marginLeft: 5 }}
            >
              Login
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
