/**
 * report.tsx — AI Reports Screen (Tab 3)
 * ============================================================================
 * Astral Imperial AI Astrological Reports
 * Features:
 *  - 6 Domain Deep Life Reports (Life, Yearly, Monthly, Relationship, Career, Health)
 *  - Thin Client Generation via POST /api/reports
 *  - Secure Markdown Reader with Anti-Screenshot / Anti-Copy Protection
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { ASTRAL_THEME } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useSandsStore } from "../../store/sandsStore";
import { generateAiReportApi } from "../../services/api";
import { ProtectedScreen } from "../../components/ProtectedScreen";

interface ReportRecord {
  id: string;
  report_type: string;
  created_at: string;
  content?: string;
}

const REPORT_TYPES = [
  { key: "life_overview", label: "ภาพรวมชีวิต", icon: "compass-outline", desc: "ผังดวง 7 ตัว บุคลิกภาพ และเข็มทิศชีวิต" },
  { key: "yearly_forecast", label: "พยากรณ์รายปี", icon: "calendar-outline", desc: "แนวโน้ม วัยจร และจังหวะก้าวสำคัญของปี" },
  { key: "monthly_forecast", label: "พยากรณ์รายเดือน", icon: "moon-outline", desc: "พลังงานดาวจร และโอกาสในรอบเดือนนี้" },
  { key: "relationship", label: "ความสัมพันธ์", icon: "heart-outline", desc: "ความรัก มิตรภาพ และคู่ครองสมพงษ์" },
  { key: "career", label: "การงาน & การเงิน", icon: "briefcase-outline", desc: "ทิศทางอาชีพ ธุรกิจ และการสะสมโภคทรัพย์" },
  { key: "health", label: "สุขภาพ & สมดุล", icon: "fitness-outline", desc: "พลังงานธาตุ การดูแลร่างกายและจิตใจ" },
];

export default function ReportScreen() {
  const { profile, user, fetchProfile } = useAuthStore();
  const { balance, fetchBalance } = useSandsStore();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("ai_reports")
        .select("id, report_type, created_at, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setReports(data as ReportRecord[]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      user?.id ? fetchBalance(user.id) : Promise.resolve(),
      fetchData(),
    ]);
  }, [user?.id]);

  const handleGenerate = async (reportType: string) => {
    if (!profile?.birth_date) {
      Alert.alert("กรุณากรอกวันเกิด", "จำเป็นต้องมีข้อมูลวันเกิดในหน้าโปรไฟล์เพื่อคำนวณรายงานดวงชะตา");
      return;
    }

    setGeneratingKey(reportType);

    try {
      const res = await generateAiReportApi(reportType);

      if (!res.success) {
        Alert.alert("ไม่สามารถสร้างรายงานได้", res.error || "กรุณาลองใหม่อีกครั้ง");
        return;
      }

      Alert.alert("สำเร็จ", "วิเคราะห์และสร้างรายงานปัญญาญาณเรียบร้อยแล้ว");
      if (user?.id) fetchBalance(user.id);
      fetchData();
    } catch (err: any) {
      Alert.alert("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setGeneratingKey(null);
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
              <Text style={styles.headerTitle}>รายงานปัญญาญาณ AI</Text>
              <Text style={styles.headerSubtitle}>วิเคราะห์ดวงชะตาเชิงลึกผ่าน AI Astrological Engine</Text>
            </View>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceText}>⏳ {balance} Sands</Text>
            </View>
          </View>

          {/* Report Catalog */}
          <Text style={styles.sectionHeader}>เลือกประเภทรายงานที่ต้องการ</Text>
          <View style={styles.catalogGrid}>
            {REPORT_TYPES.map((type) => {
              const isGenerating = generatingKey === type.key;
              return (
                <View key={type.key} style={styles.reportCard}>
                  <View style={styles.reportIconBox}>
                    <Ionicons name={type.icon as any} size={24} color={ASTRAL_THEME.colors.gold} />
                  </View>
                  <Text style={styles.reportCardTitle}>{type.label}</Text>
                  <Text style={styles.reportCardDesc}>{type.desc}</Text>

                  <TouchableOpacity
                    style={[styles.generateBtn, isGenerating && styles.btnDisabled]}
                    disabled={isGenerating}
                    onPress={() => handleGenerate(type.key)}
                  >
                    {isGenerating ? (
                      <ActivityIndicator size="small" color={ASTRAL_THEME.colors.bg} />
                    ) : (
                      <Text style={styles.generateBtnText}>สร้างรายงาน ✨</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Past Reports History */}
          <Text style={styles.sectionHeader}>ประวัติรายงานของคุณ</Text>

          {loading ? (
            <ActivityIndicator size="small" color={ASTRAL_THEME.colors.gold} style={{ marginVertical: 20 }} />
          ) : reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>ยังไม่มีรายงานที่สร้างไว้</Text>
              <Text style={styles.emptySub}>เลือกประเภทรายงานด้านบนเพื่อเริ่มการวิเคราะห์</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {reports.map((r) => {
                const matchedType = REPORT_TYPES.find((t) => t.key === r.report_type);
                const isSelected = selectedReport?.id === r.id;

                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.historyCard, isSelected && styles.historyCardExpanded]}
                    onPress={() => setSelectedReport(isSelected ? null : r)}
                  >
                    <View style={styles.historyHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitle}>{matchedType?.label || r.report_type}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(r.created_at).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={ASTRAL_THEME.colors.textMuted}
                      />
                    </View>

                    {isSelected && r.content && (
                      <View style={styles.reportContentBox}>
                        <View style={styles.divider} />
                        <Text style={styles.reportContentText}>{r.content}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
  balanceBadge: {
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: {
    color: ASTRAL_THEME.colors.goldLight,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
    marginTop: 6,
  },
  catalogGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ASTRAL_THEME.spacing.sm,
  },
  reportCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.lg,
    padding: ASTRAL_THEME.spacing.md,
    gap: 6,
  },
  reportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  reportCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  reportCardDesc: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textMuted,
    lineHeight: 16,
    minHeight: 32,
  },
  generateBtn: {
    backgroundColor: ASTRAL_THEME.colors.gold,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: ASTRAL_THEME.colors.bg,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    padding: ASTRAL_THEME.spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: ASTRAL_THEME.colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    padding: ASTRAL_THEME.spacing.md,
  },
  historyCardExpanded: {
    borderColor: ASTRAL_THEME.colors.goldBorder,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.goldLight,
  },
  historyDate: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textDim,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: ASTRAL_THEME.colors.bgCardBorder,
    marginVertical: 10,
  },
  reportContentBox: {
    marginTop: 4,
  },
  reportContentText: {
    fontSize: 13,
    color: ASTRAL_THEME.colors.text,
    lineHeight: 22,
  },
});
