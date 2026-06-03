/**
 * ProtectedText.tsx
 * ==================
 * Text component ที่ป้องกันการ copy/select text
 *
 * Features:
 * - selectable={false} — ปิดการเลือก text
 * - contextMenuHidden — ซ่อนเมนู Copy/Paste
 * - ป้องกันการ long-press เพื่อ select text
 *
 * Usage:
 * <ProtectedText style={styles.title}>ข้อมูลลับของคุณ</ProtectedText>
 */

import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

interface ProtectedTextProps extends TextProps {
  children: React.ReactNode;
}

export function ProtectedText({ children, style, ...props }: ProtectedTextProps) {
  return (
    <Text
      {...props}
      style={[styles.base, style]}
      selectable={false}         // ปิดการ select text
      // @ts-ignore — contextMenuHidden รองรับบน iOS
      contextMenuHidden={true}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    userSelect: "none" as never, // web fallback
  },
});

export default ProtectedText;
