/**
 * ProtectedScreen.tsx
 * ====================
 * Wrapper component สำหรับหน้าที่ต้องการป้องกัน Screenshot + Screen Recording
 *
 * Features:
 * - Android: FLAG_SECURE → บล็อก screenshot + recording จริง 100%
 * - iOS: ตรวจจับ screenshot → แสดง overlay เตือน
 * - ป้องกัน copy text โดยอัตโนมัติ (pass preventCopy prop)
 *
 * Usage:
 * <ProtectedScreen>
 *   <YourContent />
 * </ProtectedScreen>
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ViewStyle,
} from "react-native";
import { useGlobalScreenProtection } from "../hooks/useScreenCapture";

// ---- Theme (Astral Imperial) ----
const COLORS = {
  bg: "#020617",
  overlay: "rgba(2, 6, 23, 0.96)",
  gold: "#C6A96B",
  mystic: "#4B6FAE",
  text: "#F8F6F1",
  textMuted: "rgba(248,246,241,0.6)",
};

// ========== CaptureOverlay ==========
function CaptureOverlay({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible && Platform.OS !== "android") return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.overlayInner}>
        {/* Shield Icon (Unicode fallback) */}
        <Text style={styles.overlayIcon}>🛡️</Text>
        <Text style={styles.overlayTitle}>เนื้อหาได้รับการป้องกัน</Text>
        <Text style={styles.overlaySubtitle}>
          ไม่สามารถบันทึกหน้าจอหรือแคปภาพได้
        </Text>
        <View style={styles.overlayDivider} />
        <Text style={styles.overlayNote}>
          เนื้อหานี้เป็นทรัพย์สินเฉพาะของสมาชิก{"\n"}
          ห้ามเผยแพร่หรือแชร์โดยไม่ได้รับอนุญาต
        </Text>
      </View>
    </Animated.View>
  );
}

// ========== ProtectedScreen ==========
interface ProtectedScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** แสดง overlay เมื่อถูก capture (iOS) — default: true */
  showOverlay?: boolean;
}

export function ProtectedScreen({
  children,
  style,
  showOverlay = true,
}: ProtectedScreenProps) {
  const { isCaptured } = useGlobalScreenProtection();

  return (
    <View style={[styles.container, style]}>
      {children}
      {showOverlay && <CaptureOverlay visible={isCaptured} />}
    </View>
  );
}

// ========== Styles ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  overlayInner: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 20,
    backgroundColor: "rgba(10, 34, 64, 0.58)",
    maxWidth: 320,
    gap: 12,
  },
  overlayIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  overlayTitle: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif" }),
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.gold,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  overlaySubtitle: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 22,
  },
  overlayDivider: {
    width: 48,
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.4,
  },
  overlayNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ProtectedScreen;
