import React, { useState, useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Redirect, Tabs } from "expo-router";
import {
  Image,
  Text,
  View,
  ImageSourcePropType,
  TouchableOpacity,
  StyleSheet,
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
    <View className="flex items-center justify-center gap-2">
      <Image
        source={icon}
        resizeMode="contain"
        tintColor={color}
        className="w-6 h-6"
      />
      <Text
        className={`${focused ? "font-psemibold" : "font-pregular"} text-xs`}
        style={{ color: color }}
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
          tabBarActiveTintColor: "#4A4A4A", // Dark gray for active tab
          tabBarInactiveTintColor: "#A9A9A9", // Light gray for inactive tab
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#D3D3D3", // Light gray background
            borderTopWidth: 1,
            borderTopColor: "#BEBEBE", // Medium gray border
            transform: [{ translateY: tabLayoutTranslateY }], // Animated translateY
            overflow: "hidden", // Ensure hidden tab bar does not affect layout
            position: "absolute", // Ensure the tab bar is positioned at the bottom
            bottom: 0, // Keep tab bar at the bottom
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
      <StatusBar backgroundColor="#D3D3D3" style="dark" />
    </>
  );
};

const App: React.FC = () => (
  <MarkerProvider>
    <TabLayout />
  </MarkerProvider>
);

export default App;
