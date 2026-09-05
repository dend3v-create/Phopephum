/**
 * index.tsx — Home Screen (Tab 1)
 * ============================================================================
 * Astral Imperial Home Screen
 * Features:
 *  - Live Yam AtthaKarn Clock & Status
 *  - Real-time Moon Phase & Cosmic Energy
 *  - Dynamic Sands of Time Token Badge
 *  - Quick Access Action Grid
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
import { getCurrentYam, calculateMoonPhase } from "@phopephum/engine";
import { ASTRAL_THEME } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useSandsStore } from "../../store/sandsStore";
import { ProtectedScreen } from "../../components/ProtectedScreen";

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user, fetchProfile } = useAuthStore();
  const { balance, fetchBalance } = useSandsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  // Live timer tick every 30 seconds for Yam countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchBalance(user.id);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      user?.id ? fetchBalance(user.id) : Promise.resolve(),
    ]);
    setNow(new Date());
    setRefreshing(false);
  };

  // Pure Engine Astronomical Calculations
  const currentYam = getCurrentYam();
  const moonPhase = calculateMoonPhase(now);

  const planName = (profile?.plan || profile?.subscription || "free").toUpperCase();
  const isPremium = planName === "PRO" || planName === "IMPERIAL" || planName === "MASTER";

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
          {/* Header Bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brandTitle}>PHOPEPHUM</Text>
              <Text style={styles.brandSubtitle}>Living Wisdom Operating System</Text>
            </View>

            {/* Sands Balance Badge */}
            <TouchableOpacity
              style={styles.sandsBadge}
              onPress={() => router.push("/(tabs)/settings")}
            >
              <Text style={styles.sandsIcon}>⏳</Text>
              <Text style={styles.sandsText}>{balance ?? profile?.time_sands ?? 0} Sands</Text>
            </TouchableOpacity>
          </View>

          {/* User Welcome Greeting */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeGreeting}>สวัสดีกาลเวลา,</Text>
            <Text style={styles.welcomeName}>
              {profile?.full_name || profile?.display_name || "ปัญญาชน"}
            </Text>
          </View>

          {/* Live Yam Widget */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeGold}>
                <Text style={styles.badgeGoldText}>🔮 ยามอัฏฐกาลปัจจุบัน</Text>
              </View>
              <Text style={styles.timeText}>
                {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
              </Text>
            </View>

            <Text style={styles.yamTitle}>ยาม{currentYam?.yamName || "มงคล"}</Text>
            <Text style={styles.yamDescription}>
              {currentYam?.travelAuspiciousness?.description ||
                currentYam?.prediction?.auspicious ||
                "ช่วงเวลาแห่งพลังบวกและการเริ่มต้นทำสิ่งมงคล"}
            </Text>

            <View style={styles.divider} />

            <View style={styles.yamFooter}>
              <View style={styles.yamMetaItem}>
                <Text style={styles.metaLabel}>ช่วงเวลา</Text>
                <Text style={styles.metaValue}>{currentYam?.period === "day" ? "กลางวัน" : "กลางคืน"}</Text>
              </View>
              <View style={styles.yamMetaItem}>
                <Text style={styles.metaLabel}>ลำดับยาม</Text>
                <Text style={styles.metaValue}>ยามที่ {currentYam?.yamNumber || 1}</Text>
              </View>
              <View style={styles.yamMetaItem}>
                <Text style={styles.metaLabel}>ความมงคล</Text>
                <Text style={[styles.metaValue, { color: ASTRAL_THEME.colors.gold }]}>
                  {currentYam?.travelAuspiciousness?.label || "ดี (✓)"}
                </Text>
              </View>
            </View>
          </View>

          {/* Moon Phase & Cosmic Energy Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeMystic}>
                <Text style={styles.badgeMysticText}>🌙 พลังงานจันทรคติ</Text>
              </View>
              <Text style={styles.moonPhaseText}>{moonPhase?.moonPhase || "ขึ้น ๑๕ ค่ำ"}</Text>
            </View>

            <Text style={styles.moonAdvice}>
              {moonPhase?.guidance || "จิตใจสงบนิ่ง เหมาะแก่การเจริญปัญญาและตัดสินใจเรื่องสำคัญ"}
            </Text>
          </View>

          {/* Membership Status Card */}
          <TouchableOpacity
            style={[styles.card, styles.membershipCard]}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <View style={styles.membershipRow}>
              <View>
                <Text style={styles.membershipLabel}>สถานะสมาชิกปัจจุบัน</Text>
                <Text style={styles.membershipPlan}>
                  {isPremium ? `✦ ${planName} MEMBER` : "FREE TIER"}
                </Text>
              </View>
              <View style={styles.upgradeBtn}>
                <Text style={styles.upgradeBtnText}>
                  {isPremium ? "ดูสิทธิ์ใช้งาน →" : "อัปเกรดแผน →"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Quick Actions Grid */}
          <Text style={styles.sectionHeader}>เมนูแนะนำ</Text>
          <View style={styles.grid}>
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push("/(tabs)/dashboard")}
            >
              <Ionicons name="planet-outline" size={28} color={ASTRAL_THEME.colors.gold} />
              <Text style={styles.gridCardTitle}>ผังดวง 7 ตัว</Text>
              <Text style={styles.gridCardDesc}>เลข 7 ตัว 9 ฐาน & วัยจร</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push("/(tabs)/report")}
            >
              <Ionicons name="sparkles-outline" size={28} color={ASTRAL_THEME.colors.gold} />
              <Text style={styles.gridCardTitle}>รายงาน AI</Text>
              <Text style={styles.gridCardDesc}>วิเคราะห์ชีวิตเชิงลึก 6 ด้าน</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push("/(tabs)/planner")}
            >
              <Ionicons name="calendar-outline" size={28} color={ASTRAL_THEME.colors.gold} />
              <Text style={styles.gridCardTitle}>วางแผน TQM</Text>
              <Text style={styles.gridCardDesc}>ไพ่พลังงาน & บันทึกกาล</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push("/(tabs)/settings")}
            >
              <Ionicons name="hourglass-outline" size={28} color={ASTRAL_THEME.colors.gold} />
              <Text style={styles.gridCardTitle}>เติมทรายกาล</Text>
              <Text style={styles.gridCardDesc}>พร้อมเพย์ QR ทันที</Text>
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: ASTRAL_THEME.spacing.xs,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: ASTRAL_THEME.colors.gold,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textMuted,
  },
  sandsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  sandsIcon: {
    fontSize: 14,
  },
  sandsText: {
    color: ASTRAL_THEME.colors.goldLight,
    fontSize: 13,
    fontWeight: "700",
  },
  welcomeSection: {
    marginTop: 4,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: ASTRAL_THEME.colors.textMuted,
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
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
  badgeGold: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGoldText: {
    color: ASTRAL_THEME.colors.gold,
    fontSize: 12,
    fontWeight: "600",
  },
  badgeMystic: {
    backgroundColor: ASTRAL_THEME.colors.mysticMuted,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.mysticLight,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeMysticText: {
    color: ASTRAL_THEME.colors.mysticLight,
    fontSize: 12,
    fontWeight: "600",
  },
  timeText: {
    color: ASTRAL_THEME.colors.textMuted,
    fontSize: 13,
  },
  yamTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.goldLight,
    marginTop: 4,
  },
  yamDescription: {
    fontSize: 13,
    color: ASTRAL_THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: ASTRAL_THEME.colors.bgCardBorder,
    marginVertical: 12,
  },
  yamFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yamMetaItem: {
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textDim,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: ASTRAL_THEME.colors.text,
    marginTop: 2,
  },
  moonPhaseText: {
    color: ASTRAL_THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  moonAdvice: {
    fontSize: 13,
    color: ASTRAL_THEME.colors.textMuted,
    lineHeight: 20,
  },
  membershipCard: {
    borderLeftWidth: 3,
    borderLeftColor: ASTRAL_THEME.colors.gold,
  },
  membershipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  membershipLabel: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
  },
  membershipPlan: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.gold,
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  upgradeBtnText: {
    color: ASTRAL_THEME.colors.goldLight,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ASTRAL_THEME.spacing.md,
  },
  gridCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.lg,
    padding: ASTRAL_THEME.spacing.md,
    alignItems: "flex-start",
    gap: 6,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  gridCardDesc: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textMuted,
  },
});
