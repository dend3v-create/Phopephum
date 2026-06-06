import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: "rgba(10, 34, 64, 0.6)", // Cosmic-800 with transparency
          borderTopWidth: 0,
          borderRadius: 30,
          height: 64,
          paddingBottom: 0,
          borderWidth: 1,
          borderColor: "rgba(198, 169, 107, 0.2)", // Gold with transparency
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        },
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={{ ...StyleSheet.absoluteFillObject, borderRadius: 30, overflow: 'hidden' }} />
        ),
        tabBarActiveTintColor: "#C6A96B", // Gold-500
        tabBarInactiveTintColor: "#94A3B8", // Text-muted
        tabBarLabelStyle: {
          fontFamily: "IBMPlexSansThai_600SemiBold",
          fontSize: 10,
          marginBottom: 8,
        },
        tabBarIconStyle: {
          marginTop: 8,
        },
        headerStyle: { 
          backgroundColor: "transparent", 
        },
        headerBackground: () => (
          <View style={{ flex: 1 }}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['#020617', 'rgba(2, 6, 23, 0.8)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
        headerTintColor: "#C6A96B",
        headerTitleStyle: {
          fontFamily: "Cinzel_700Bold",
          fontSize: 18,
          letterSpacing: 1,
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
