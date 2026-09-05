/**
 * dashboard.tsx — Horoscope & Yam Screen (Tab 2)
 * ============================================================================
 * Astral Imperial Thai Astrology & AtthaKarn Wheel
 * Features:
 *  - 7 Base 9 Root Authentic Chart (ผังเลข 7 ตัว 9 ฐาน)
 *  - 8-Slot Daytime/Nighttime Yam Clock
 *  - Age Transit Cycle (วัยจร / ปีจร)
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  calculateSevenBase,
  calculateAgeCycle,
  getCurrentYam,
  getThaiBaseNumbers,
} from "@phopephum/engine";
import { ASTRAL_THEME } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { ProtectedScreen } from "../../components/ProtectedScreen";

export default function HoroscopeScreen() {
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setNow(new Date());
    setRefreshing(false);
  };

  const birthDateStr = profile?.birth_date;
  const birthTimeStr = profile?.birth_time || "06:00";

  let thaiBase: any = null;
  let chartRows: number[][] = [];
  let ageCycle: any = null;

  if (birthDateStr) {
    try {
      thaiBase = getThaiBaseNumbers(birthDateStr, birthTimeStr);
      const [b1, b2, b3] = calculateSevenBase(thaiBase.dayNum, thaiBase.monthNum, thaiBase.yearNum);
      const b4 = b1.map((v: number, i: number) => v + b2[i] + b3[i]);
      chartRows = [b1, b2, b3, b4];

      const bDate = new Date(birthDateStr);
      const birthYear = bDate.getFullYear();
      const currentYear = now.getFullYear();
      const currentAge = Math.max(1, currentYear - birthYear);
      ageCycle = calculateAgeCycle(currentAge, thaiBase.dayNum);
    } catch {
      // Non-blocking calculation fallback
    }
  }

  const currentYam = getCurrentYam();

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
          {/* Top Title */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ผังดวงชะตา & ฤกษ์ยาม</Text>
            <Text style={styles.headerSubtitle}>เลข 7 ตัว 9 ฐาน & พลังงานกาลเวลา</Text>
          </View>

          {/* If No Birth Data Configured */}
          {!birthDateStr ? (
            <View style={styles.card}>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={ASTRAL_THEME.colors.gold} />
                <Text style={styles.emptyTitle}>ยังไม่ได้ระบุวันเกิด</Text>
                <Text style={styles.emptyDesc}>
                  กรุณาระบุวันเดือนปีและเวลาเกิด เพื่อคำนวณผังดวง 7 ตัว 9 ฐาน และวัยจรเฉพาะบุคคล
                </Text>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push("/edit-profile")}
                >
                  <Text style={styles.actionBtnText}>กรอกข้อมูลวันเกิด →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* User Birth Summary Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.sectionTitle}>📅 ข้อมูลดวงชะตากำเนิด</Text>
                  <TouchableOpacity onPress={() => router.push("/edit-profile")}>
                    <Text style={styles.editLink}>แก้ไข</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>วันเกิดสากล</Text>
                    <Text style={styles.metaValue}>{birthDateStr}</Text>
                  </View>
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>เวลาเกิด</Text>
                    <Text style={styles.metaValue}>{birthTimeStr} น.</Text>
                  </View>
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>จันทรคติไทย</Text>
                    <Text style={styles.metaValue}>
                      {thaiBase?.dayName || "วันมงคล"} {thaiBase?.moonPhase || ""}
                    </Text>
                  </View>
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>ปีนักษัตร</Text>
                    <Text style={styles.metaValue}>{thaiBase?.zodiacName || "ปีระกา"}</Text>
                  </View>
                </View>
              </View>

              {/* 7 Base Chart Grid (ผังเลข 7 ตัว) */}
              {chartRows.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>✦ ผังเลข 7 ตัว 9 ฐาน (Emperor Chart)</Text>
                  <Text style={styles.sectionDesc}>
                    โครงสร้างพลังงานจักรพรรดิ ฐานกำเนิดและผลรวมกำลังดาว
                  </Text>

                  {/* Matrix Render */}
                  <View style={styles.matrixContainer}>
                    {chartRows.map((row: number[], rIdx: number) => (
                      <View key={`row-${rIdx}`} style={styles.matrixRow}>
                        <Text style={styles.rowHeader}>
                          {rIdx === 0 ? "วัน" : rIdx === 1 ? "เดือน" : rIdx === 2 ? "ปี" : "ฐานรวม"}
                        </Text>
                        {row.map((cell: number, cIdx: number) => (
                          <View
                            key={`cell-${rIdx}-${cIdx}`}
                            style={[
                              styles.matrixCell,
                              rIdx === 3 && styles.matrixCellHighlight,
                            ]}
                          >
                            <Text
                              style={[
                                styles.cellNumber,
                                rIdx === 3 && styles.cellNumberHighlight,
                              ]}
                            >
                              {cell}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Transit Cycle Card (วัยจร / ปีจร) */}
              {ageCycle && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.sectionTitle}>🌀 วัยจร & ปีจรปัจจุบัน</Text>
                    <View style={styles.badgeGold}>
                      <Text style={styles.badgeGoldText}>อายุ {ageCycle.age || ageCycle.currentAge || 1} ปี</Text>
                    </View>
                  </View>

                  <Text style={styles.transitPhaseTitle}>
                    {ageCycle.transitName || ageCycle.phaseName || "ช่วงเวลาเสวยอายุแห่งปัญญา"}
                  </Text>
                  <Text style={styles.transitDesc}>
                    {ageCycle.description ||
                      ageCycle.interpretation ||
                      "พลังงานดาวจรหนุนนำด้านการงานและการเงิน ควรเน้นการสร้างสัมพันธภาพและวิสัยทัศน์ระยะยาว"}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Real-Time Yam AtthaKarn Wheel */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>🔮 ยามอัฏฐกาลขณะนี้</Text>
              <Text style={styles.liveClock}>
                {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
              </Text>
            </View>

            <View style={styles.yamHighlightBox}>
              <Text style={styles.yamHighlightName}>ยาม{currentYam?.yamName || "สุริยัน"}</Text>
              <Text style={styles.yamHighlightMeaning}>
                {currentYam?.travelAuspiciousness?.description ||
                  currentYam?.prediction?.auspicious ||
                  "ยามดีมีลาภผล พึงทำการด้วยความรอบคอบและศรัทธา"}
              </Text>
            </View>
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
  card: {
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.lg,
    padding: ASTRAL_THEME.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  sectionDesc: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textMuted,
    marginBottom: 12,
  },
  editLink: {
    fontSize: 13,
    color: ASTRAL_THEME.colors.gold,
    fontWeight: "600",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(2, 6, 23, 0.4)",
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    padding: 10,
  },
  metaLabel: {
    fontSize: 10,
    color: ASTRAL_THEME.colors.textDim,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: ASTRAL_THEME.colors.goldLight,
    marginTop: 2,
  },
  matrixContainer: {
    gap: 6,
  },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowHeader: {
    width: 44,
    fontSize: 11,
    color: ASTRAL_THEME.colors.textMuted,
    fontWeight: "600",
  },
  matrixCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  matrixCellHighlight: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderColor: ASTRAL_THEME.colors.goldBorder,
  },
  cellNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: ASTRAL_THEME.colors.text,
  },
  cellNumberHighlight: {
    color: ASTRAL_THEME.colors.goldLight,
    fontWeight: "700",
  },
  badgeGold: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeGoldText: {
    color: ASTRAL_THEME.colors.gold,
    fontSize: 11,
    fontWeight: "600",
  },
  transitPhaseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.goldLight,
    marginTop: 4,
  },
  transitDesc: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  liveClock: {
    fontSize: 13,
    color: ASTRAL_THEME.colors.textMuted,
  },
  yamHighlightBox: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    padding: ASTRAL_THEME.spacing.md,
    marginTop: 6,
  },
  yamHighlightName: {
    fontSize: 18,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.gold,
  },
  yamHighlightMeaning: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.text,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: ASTRAL_THEME.spacing.lg,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  emptyDesc: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  actionBtn: {
    backgroundColor: ASTRAL_THEME.colors.gold,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  actionBtnText: {
    color: ASTRAL_THEME.colors.bg,
    fontSize: 13,
    fontWeight: "700",
  },
});
