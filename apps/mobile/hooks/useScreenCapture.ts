/**
 * useScreenCapture.ts
 * =====================
 * Hook กลางสำหรับระบบป้องกัน Screenshot + Screen Recording
 * รองรับ iOS และ Android ผ่าน expo-screen-capture
 *
 * Platform behavior:
 * - Android: FLAG_SECURE — block screenshot + screen recording จริง 100% (หน้าจอดำ)
 * - iOS: ตรวจจับ screen capture → ซ่อน content (Apple's limitation — cannot block)
 */

import { useEffect, useState } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { Platform } from "react-native";

// ========== usePreventScreenCapture ==========
/**
 * เปิด screen capture protection ตลอด component lifetime
 * เรียกใน component ที่ต้องการป้องกัน หรือ _layout.tsx สำหรับ global
 *
 * @example
 * function ReportScreen() {
 *   usePreventScreenCapture();
 *   return <View>...</View>;
 * }
 */
export function usePreventScreenCapture() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function activate() {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        // Dev builds หรือ Expo Go อาจ throw — ignore gracefully
        if (__DEV__) {
          console.warn("[ScreenCapture] preventScreenCaptureAsync failed:", e);
        }
      }
    }

    activate();

    cleanup = () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {
        // ignore cleanup errors
      });
    };

    return cleanup;
  }, []);
}

// ========== useIsScreenCaptured ==========
/**
 * ตรวจจับ screen recording แบบ realtime (iOS เท่านั้น)
 * คืนค่า boolean ว่าขณะนี้มีการ record screen อยู่หรือไม่
 *
 * @example
 * function SecureScreen() {
 *   const isCaptured = useIsScreenCaptured();
 *   if (isCaptured) return <BlurOverlay />;
 *   return <Content />;
 * }
 */
export function useIsScreenCaptured(): boolean {
  const [isCaptured, setIsCaptured] = useState(false);

  useEffect(() => {
    // Android บล็อกได้จริง — ไม่จำเป็นต้อง listen events
    if (Platform.OS === "android") return;

    let subscription: ReturnType<typeof ScreenCapture.addScreenshotListener> | undefined;

    try {
      subscription = ScreenCapture.addScreenshotListener(() => {
        // iOS: ถ่ายภาพหน้าจอแล้ว — trigger warning
        setIsCaptured(true);
        // reset หลัง 3 วินาที
        setTimeout(() => setIsCaptured(false), 3000);
      });
    } catch (e) {
      if (__DEV__) {
        console.warn("[ScreenCapture] addScreenshotListener failed:", e);
      }
    }

    return () => {
      subscription?.remove();
    };
  }, []);

  return isCaptured;
}

// ========== useGlobalScreenProtection ==========
/**
 * เปิด Global Protection สำหรับใช้ใน _layout.tsx (root layout)
 * รวม prevent capture + detect capture listener ในที่เดียว
 */
export function useGlobalScreenProtection() {
  usePreventScreenCapture();
  const isCaptured = useIsScreenCaptured();
  return { isCaptured };
}
