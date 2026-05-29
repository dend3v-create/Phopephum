import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0A0806" },
          headerTintColor: "#C9A96E",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#0A0806" },
        }}
      />
      <StatusBar style="light" />
    </>
  );
}
