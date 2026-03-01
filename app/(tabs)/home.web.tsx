import React from "react";
import { View, Text } from "react-native";

const HomeWeb: React.FC = () => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#111",
    }}
  >
    <Text style={{ color: "#fff", fontSize: 18, textAlign: "center", padding: 16 }}>
      Map view is not available on the web build. Please open the app on iOS or Android.
    </Text>
  </View>
);

export default HomeWeb;
