/**
 * planner.tsx — TQM Planner Screen (Tab 4)
 * ============================================================================
 * Astral Imperial Life Governance & Daily Ritual
 * Features:
 *  - Daily Energy Card Draw (POST /api/daily-card)
 *  - 3 Core Intention Priorities
 *  - Evening Reflection Journal (POST /api/journal-save)
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ASTRAL_THEME } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useSandsStore } from "../../store/sandsStore";
import { pullDailyCardApi, saveDailyJournalApi } from "../../services/api";
import { ProtectedScreen } from "../../components/ProtectedScreen";

export default function PlannerScreen() {
  const { user } = useAuthStore();
  const { balance, fetchBalance } = useSandsStore();
  const [intention, setIntention] = useState("");
  const [priority1, setPriority1] = useState("");
  const [priority2, setPriority2] = useState("");
  const [priority3, setPriority3] = useState("");
  const [reflection, setReflection] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dailyCard, setDailyCard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) await fetchBalance(user.id);
    setRefreshing(false);
  };

  const handleDrawCard = async () => {
    setIsDrawing(true);
    try {
      const res = await pullDailyCardApi();
      if (res.success && res.card) {
        setDailyCard(res.card);
        Alert.alert("จับไพ่พลังงานสำเร็จ ✨", "พลังงานประจำวันพร้อมคำแนะนำได้รับการเปิดเผยแล้ว");
        if (user?.id) fetchBalance(user.id);
      } else {
        Alert.alert("ไม่สามารถเปิดไพ่ได้", res.error || "กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      Alert.alert("เกิดข้อผิดพลาด", err?.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsDrawing(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!intention && !priority1 && !reflection) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกเจตจำนงหรือบันทึกประจำวันอย่างน้อย 1 รายการ");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveDailyJournalApi({
        date: todayStr,
        intention,
        priorities: [priority1, priority2, priority3].filter(Boolean),
        reflection,
      });

      if (res.success) {
        Alert.alert("บันทึกสำเร็จ", "บันทึกกาลเวลาและเป้าหมายประจำวันลงสู่ระบบแล้ว");
      } else {
        Alert.alert("ไม่สามารถบันทึกได้", res.error || "กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      Alert.alert("เกิดข้อผิดพลาด", err?.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedScreen>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ASTRAL_THEME.colors.gold}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>วางแผนชีวิต TQM</Text>
              <Text style={styles.headerSubtitle}>ตั้งเจตจำนง จัดลำดับความสำคัญ และบันทึกกาล</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{todayStr}</Text>
            </View>
          </View>

          {/* Daily Card Draw Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>🎴 ไพ่พลังงานประจำวัน (Daily Ritual)</Text>
            </View>

            {dailyCard ? (
              <View style={styles.cardResultBox}>
                <Text style={styles.cardResultName}>{dailyCard.title || "ไพ่แห่งปัญญาและความเพียร"}</Text>
                <Text style={styles.cardResultDesc}>
                  {dailyCard.meaning || "วันแห่งการลงมือทำด้วยความประณีต ผลลัพธ์จะงอกเงยตามสัจจะแห่งเหตุปัจจัย"}
                </Text>
              </View>
            ) : (
              <View style={styles.drawPlaceholder}>
                <Text style={styles.drawDesc}>
                  เปิดรับพลังงานและคำชี้แนะประจำวัน เพื่อกำหนดทิศทางการกระทำอย่างรู้เท่าทัน
                </Text>
                <TouchableOpacity
                  style={[styles.drawBtn, isDrawing && styles.btnDisabled]}
                  disabled={isDrawing}
                  onPress={handleDrawCard}
                >
                  {isDrawing ? (
                    <ActivityIndicator size="small" color={ASTRAL_THEME.colors.bg} />
                  ) : (
                    <Text style={styles.drawBtnText}>จับไพ่พลังงานประจำวัน ✨</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Intention & Priorities Input */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🎯 เจตจำนง & 3 สิ่งสำคัญวันนี้</Text>
            <Text style={styles.sectionDesc}>โฟกัสพลังงานของคุณไปที่สิ่งที่มีคุณค่าแท้จริง</Text>

            <Text style={styles.inputLabel}>เจตจำนงหลัก (Core Intention)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="เช่น มีสติและใจเย็นในการเจรจางาน..."
              placeholderTextColor={ASTRAL_THEME.colors.textDim}
              value={intention}
              onChangeText={setIntention}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>ลำดับความสำคัญ (Top 3 Priorities)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="1. งานสำคัญลำดับแรก"
              placeholderTextColor={ASTRAL_THEME.colors.textDim}
              value={priority1}
              onChangeText={setPriority1}
            />
            <TextInput
              style={[styles.textInput, { marginTop: 6 }]}
              placeholder="2. งานสำคัญลำดับสอง"
              placeholderTextColor={ASTRAL_THEME.colors.textDim}
              value={priority2}
              onChangeText={setPriority2}
            />
            <TextInput
              style={[styles.textInput, { marginTop: 6 }]}
              placeholder="3. งานสำคัญลำดับสาม"
              placeholderTextColor={ASTRAL_THEME.colors.textDim}
              value={priority3}
              onChangeText={setPriority3}
            />
          </View>

          {/* Evening Reflection Journal */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🌙 ทบทวนกาลเวลา (Evening Reflection)</Text>
            <Text style={styles.sectionDesc}>บันทึกสิ่งที่ได้เรียนรู้ ความสำเร็จ หรือข้อปรับปรุง</Text>

            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="บันทึกความรู้สึก บทเรียน หรือสิ่งที่ขอบคุณในวันนี้..."
              placeholderTextColor={ASTRAL_THEME.colors.textDim}
              multiline
              numberOfLines={4}
              value={reflection}
              onChangeText={setReflection}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.btnDisabled]}
              disabled={isSaving}
              onPress={handleSaveJournal}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={ASTRAL_THEME.colors.bg} />
              ) : (
                <Text style={styles.saveBtnText}>บันทึกกาลเวลา 💾</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ASTRAL_THEME.colors.bg,
  },
  scrollContent: {
    paddingHorizontal: ASTRAL_THEME.spacing.md,
    paddingTop: ASTRAL_THEME.spacing.sm,
    paddingBottom: ASTRAL_THEME.spacing.xl,
    gap: ASTRAL_THEME.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: ASTRAL_THEME.spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.gold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateText: {
    color: ASTRAL_THEME.colors.goldLight,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.lg,
    padding: ASTRAL_THEME.spacing.md,
  },
  cardHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  sectionDesc: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  drawPlaceholder: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  drawDesc: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  drawBtn: {
    backgroundColor: ASTRAL_THEME.colors.gold,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  drawBtnText: {
    color: ASTRAL_THEME.colors.bg,
    fontSize: 13,
    fontWeight: "700",
  },
  cardResultBox: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    padding: 12,
    marginTop: 6,
  },
  cardResultName: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.goldLight,
  },
  cardResultDesc: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.text,
    lineHeight: 18,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: ASTRAL_THEME.colors.goldLight,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: ASTRAL_THEME.colors.text,
    fontSize: 13,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: ASTRAL_THEME.colors.gold,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: ASTRAL_THEME.colors.bg,
    fontSize: 13,
    fontWeight: "700",
  },
});
