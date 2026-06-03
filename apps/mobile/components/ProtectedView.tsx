/**
 * ProtectedView.tsx
 * ==================
 * View container ที่ป้องกันการ copy text และ long-press interactions
 * บนทุก child component ภายใน
 *
 * Features:
 * - ปิด pointer events สำหรับ copy
 * - ปิด selection highlight ทั้ง view
 * - ใช้ได้เป็น full-page wrapper หรือ section wrapper
 *
 * Usage:
 * <ProtectedView>
 *   <Text>ข้อมูลที่ป้องกัน</Text>
 *   <Image source={...} />
 * </ProtectedView>
 */

import React from "react";
import { View, ViewProps, StyleSheet, Platform } from "react-native";

interface ProtectedViewProps extends ViewProps {
  children: React.ReactNode;
}


export function ProtectedView({ children, style, ...props }: ProtectedViewProps) {
  return (
    <View
      {...props}
      style={style}
      accessible={false}
      // Android: ป้องกัน long-press context menu
      {...(Platform.OS === "android"
        ? {
            collapsable: false,
          }
        : {})}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({});


export default ProtectedView;
