/**
 * _layout.tsx — Root Layout
 * ==========================
 * Global root layout สำหรับ Phopephum Mobile App
 *
 * รวม:
 * - Auth session management (Supabase)
 * - Global Screen Capture Protection (expo-screen-capture)
 *   → Android: FLAG_SECURE บล็อก screenshot + screen recording จริง
 *   → iOS: ตรวจจับ capture event + แสดง overlay
 * - Global Copy Protection (ทุก screen)
 */

import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator, Text, Animated, StyleSheet, Platform } from "react-native";
import { useRef } from "react";
import { usePreventScreenCapture, useIsScreenCaptured } from "../hooks/useScreenCapture";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";

const PhopephumTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#C6A96B',
    background: '#020617',
    card: '#071427',
    text: '#F8F6F1',
    border: 'rgba(198, 169, 107, 0.2)',
  },
};
import { useFonts, Cinzel_400Regular, Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import { CormorantGaramond_400Regular, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond";
import { IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold, IBMPlexSansThai_700Bold } from "@expo-google-fonts/ibm-plex-sans-thai";
import * as SplashScreen from 'expo-splash-screen';

// SplashScreen.preventAutoHideAsync();

// ========== GlobalCaptureWarning ==========
function GlobalCaptureWarning() {
  const isCaptured = useIsScreenCaptured();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isCaptured ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isCaptured, opacity]);

  // Android ไม่ต้องใช้ overlay เพราะ FLAG_SECURE บล็อกแล้ว
  if (Platform.OS === "android") return null;

  return (
    <Animated.View
      className="absolute inset-0 bg-background/95 justify-center items-center z-[99999]"
      style={{ opacity }}
      pointerEvents={isCaptured ? "auto" : "none"}
    >
      <View className="items-center px-8 py-10 border border-primary rounded-2xl bg-[#0A2240]/85 max-w-[320px] gap-3">
        <Text className="text-5xl mb-1">🛡️</Text>
        <Text className="text-xl font-bold text-primary text-center tracking-wide">เนื้อหาได้รับการป้องกัน</Text>
        <Text className="text-sm text-text text-center leading-relaxed">
          ไม่สามารถบันทึกหน้าจอหรือแคปภาพได้
        </Text>
        <View className="w-12 h-[1px] bg-primary/40" />
        <Text className="text-xs text-text/60 text-center leading-5">
          เนื้อหานี้เป็นทรัพย์สินเฉพาะของสมาชิก{"\n"}
          ห้ามเผยแพร่หรือแชร์โดยไม่ได้รับอนุญาต
        </Text>
      </View>
    </Animated.View>
  );
}

// ========== RootLayout ==========
export default function RootLayout() {
  // ── Fonts ──
  const [fontsLoaded] = useFonts({
    Cinzel_400Regular,
    Cinzel_700Bold,
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_500Medium,
    IBMPlexSansThai_600SemiBold,
    IBMPlexSansThai_700Bold,
  });

  // ── Global Screen Capture Protection ──
  // เปิดทันที ก่อนทุกอย่าง — Android: FLAG_SECURE | iOS: listener
  // usePreventScreenCapture();

  // ── Auth State ──
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
    if (!initialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "(tabs)";

    // เลื่อนการนำทางไปทำงานใน Event Loop ถัดไป เพื่อให้ Stack/Navigator เมาท์เสร็จสมบูรณ์ก่อน
    const timer = setTimeout(() => {
      if (!session && inAuthGroup) {
        router.replace("/login");
      } else if (session && segments[0] === "login") {
        router.replace("/(tabs)");
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [session, segments, initialized, fontsLoaded]);

  useEffect(() => {
    if (initialized && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [initialized, fontsLoaded]);

  if (!initialized || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0806' }}>
        <ActivityIndicator size="large" color="#C9A96E" />
      </View>
    );
  }

  return (
    <ThemeProvider value={PhopephumTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: "เข้าสู่ระบบ" }} />
        <Stack.Screen name="(tabs)" options={{ title: "Main" }} />
        <Stack.Screen name="how-to-use" options={{ title: "วิธีการใช้งาน", presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ title: "ตั้งค่าโปรไฟล์" }} />
        <Stack.Screen name="dashboard/yam" options={{ headerShown: true, title: "ยามอัฏฐกาล" }} />
        <Stack.Screen name="dashboard/karnchata" options={{ headerShown: true, title: "ทำนายกาลชะตา" }} />
        <Stack.Screen name="admin/index" options={{ headerShown: true, title: "ระบบจัดการแอดมิน" }} />
        <Stack.Screen name="admin/users" options={{ headerShown: true, title: "จัดการสมาชิก" }} />
        <Stack.Screen name="admin/approvals" options={{ headerShown: true, title: "อนุมัติคำขอ" }} />
      </Stack>
      <StatusBar style="light" />

      {/* Global iOS capture warning overlay */}
      {/* <GlobalCaptureWarning /> */}
    </ThemeProvider>
  );
}

// ========== Styles ==========
// removed since we are using NativeWind

