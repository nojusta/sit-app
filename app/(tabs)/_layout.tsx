import React, { useState, useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Redirect, Tabs } from "expo-router";
import {
  Image,
  Text,
  View,
  ImageSourcePropType,
  Animated,
} from "react-native";

import { icons } from "../../constants";
import { Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";
import { MarkerProvider, useMarkerContext } from "../../context/MarkerContext";

interface TabIconProps {
  icon: ImageSourcePropType;
  color: string;
  name: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, color, name, focused }) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 60 }}>
      <Image
        source={icon}
        resizeMode="contain"
        style={{ width: 24, height: 24, tintColor: color }}
      />
      <Text
        style={{
          color: color,
          fontSize: 10,
          fontFamily: focused ? "Poppins-SemiBold" : "Poppins-Regular",
          marginTop: 2,
          textAlign: 'center',
        }}
      >
        {name}
      </Text>
    </View>
  );
};

const TabLayout: React.FC = () => {
  const { loading, isLogged } = useGlobalContext();
  const [isTabLayoutVisible, setIsTabLayoutVisible] = useState(true);
  const tabLayoutTranslateY = useRef(new Animated.Value(0)).current;
  const { isMarkerSelected } = useMarkerContext();

  if (!loading && !isLogged) return <Redirect href="/sign-in" />;

  useEffect(() => {
    Animated.timing(tabLayoutTranslateY, {
      toValue: isMarkerSelected ? 84 : 0, // Adjust this value based on the height of your TabLayout
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsTabLayoutVisible(!isMarkerSelected);
  }, [isMarkerSelected]);

  useEffect(() => {
    console.log("Marker selected state:", isMarkerSelected);
  }, [isMarkerSelected]);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#ECEDEE", // Light gray for active tab
          tabBarInactiveTintColor: "#9BA1A6", // Medium gray for inactive tab
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#2D2D2D", // Dark gray background
            borderTopWidth: 1,
            borderTopColor: "#3C3C3C", // Slightly darker gray border
            transform: [{ translateY: tabLayoutTranslateY }], // Animated translateY
            overflow: "hidden", // Ensure hidden tab bar does not affect layout
            position: "absolute", // Ensure the tab bar is positioned at the bottom
            bottom: 0, // Keep tab bar at the bottom
            paddingTop: 10, // Add padding to the top
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.home}
                color={color}
                name="Home"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.profile}
                color={color}
                name="Profile"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.settings}
                color={color}
                name="Settings"
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>

      <Loader isLoading={loading} />
      <StatusBar backgroundColor="#2D2D2D" style="light" />
    </>
  );
};

const App: React.FC = () => (
  <MarkerProvider>
    <TabLayout />
  </MarkerProvider>
);

export default App;