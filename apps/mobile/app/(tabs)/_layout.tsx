import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: "rgba(2, 6, 23, 0.75)", // Cosmic Blue with transparency
          borderTopColor: "rgba(198, 169, 107, 0.2)", // Gold with transparency
          height: 60,
          paddingBottom: 8,
        },
        tabBarBackground: () => (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor: "#C6A96B", // Gold
        tabBarInactiveTintColor: "#4B6FAE", // Mystic
        tabBarLabelStyle: {
          fontFamily: "IBMPlexSansThai_500Medium",
          fontSize: 10,
        },
        headerStyle: { 
          backgroundColor: "rgba(2, 6, 23, 0.8)", 
        },
        headerBackground: () => (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        headerTintColor: "#C6A96B",
        headerTitleStyle: {
          fontFamily: "Cinzel_700Bold",
          fontSize: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "หน้าหลัก",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "ดวงชะตา",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="planet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "รายงาน AI",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "วางแผน",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "ตั้งค่า",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
