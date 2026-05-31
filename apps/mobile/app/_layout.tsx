import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // เช็ค session ครั้งแรก
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // ติดตามการเปลี่ยนแปลงสถานะ login/logout
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(tabs)";

    if (!session && inAuthGroup) {
      // ถ้าไม่ได้ login แต่อยู่ในหน้า tabs ให้ไปหน้า login
      router.replace("/login");
    } else if (session && segments[0] === "login") {
      // ถ้า login แล้วแต่อยู่หน้า login ให้ไปหน้าหลัก
      router.replace("/(tabs)");
    }
  }, [session, segments, initialized]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0806' }}>
        <ActivityIndicator size="large" color="#C9A96E" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: "เข้าสู่ระบบ" }} />
        <Stack.Screen name="(tabs)" options={{ title: "Main" }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
