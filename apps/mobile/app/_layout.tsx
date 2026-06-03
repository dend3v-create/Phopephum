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

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator, Text, Animated, StyleSheet, Platform } from "react-native";
import { useRef } from "react";
import { usePreventScreenCapture, useIsScreenCaptured } from "../hooks/useScreenCapture";

// ========== GlobalCaptureWarning ==========
// แสดง overlay เตือน บน iOS เมื่อตรวจพบ screenshot
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
      style={[styles.captureOverlay, { opacity }]}
      pointerEvents={isCaptured ? "auto" : "none"}
    >
      <View style={styles.captureCard}>
        <Text style={styles.captureIcon}>🛡️</Text>
        <Text style={styles.captureTitle}>เนื้อหาได้รับการป้องกัน</Text>
        <Text style={styles.captureText}>
          ไม่สามารถบันทึกหน้าจอหรือแคปภาพได้
        </Text>
        <View style={styles.captureDivider} />
        <Text style={styles.captureNote}>
          เนื้อหานี้เป็นทรัพย์สินเฉพาะของสมาชิก{"\n"}
          ห้ามเผยแพร่หรือแชร์โดยไม่ได้รับอนุญาต
        </Text>
      </View>
    </Animated.View>
  );
}

// ========== RootLayout ==========
export default function RootLayout() {
  // ── Global Screen Capture Protection ──
  // เปิดทันที ก่อนทุกอย่าง — Android: FLAG_SECURE | iOS: listener
  usePreventScreenCapture();

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
        <Stack.Screen name="how-to-use" options={{ title: "วิธีการใช้งาน", presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ title: "ตั้งค่าโปรไฟล์" }} />
      </Stack>
      <StatusBar style="light" />

      {/* Global iOS capture warning overlay */}
      <GlobalCaptureWarning />
    </>
  );
}

// ========== Styles ==========
const styles = StyleSheet.create({
  captureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.96)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  captureCard: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: "#C6A96B",
    borderRadius: 20,
    backgroundColor: "rgba(10, 34, 64, 0.85)",
    maxWidth: 320,
    gap: 12,
  },
  captureIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  captureTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#C6A96B",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  captureText: {
    fontSize: 14,
    color: "#F8F6F1",
    textAlign: "center",
    lineHeight: 22,
  },
  captureDivider: {
    width: 48,
    height: 1,
    backgroundColor: "#C6A96B",
    opacity: 0.4,
  },
  captureNote: {
    fontSize: 12,
    color: "rgba(248,246,241,0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
});
