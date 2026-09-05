/**
 * settings.tsx — Profile & Membership Screen (Tab 5)
 * ============================================================================
 * Astral Imperial User Identity & Sands Refill Management
 * Features:
 *  - User Profile & Birth Data Overview
 *  - Entitlement Tier Badge
 *  - In-App PromptPay QR Checkout Modal for Sands Refill (POST /api/payment/checkout)
 *  - Automatic Payment Status Polling & Instant Sands Balance Sync
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ASTRAL_THEME } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useSandsStore } from "../../store/sandsStore";
import { createCheckoutQrApi, pollPaymentStatusApi } from "../../services/api";
import { ProtectedScreen } from "../../components/ProtectedScreen";

const REFILL_PACKS = [
  { sku: "sands_50", name: "50 ละอองทราย", priceThb: 59, sands: 50, tag: "เริ่มต้น" },
  { sku: "sands_150", name: "150 ละอองทราย", priceThb: 149, sands: 150, tag: "ยอดนิยม ✨" },
  { sku: "sands_500", name: "500 ละอองทราย", priceThb: 399, sands: 500, tag: "คุ้มค่าที่สุด 🔥" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, user, fetchProfile, signOut } = useAuthStore();
  const { balance, fetchBalance } = useSandsStore();
  const [refreshing, setRefreshing] = useState(false);

  // QR Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [activeCheckout, setActiveCheckout] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) fetchBalance(user.id);
  }, [user?.id]);

  // Payment Poller when QR modal is active
  useEffect(() => {
    if (!modalVisible || !activeCheckout?.chargeId || paymentSuccess) return;

    const chargeId = activeCheckout.chargeId;
    const interval = setInterval(async () => {
      try {
        const res = await pollPaymentStatusApi(chargeId);
        if (res.success && res.payment?.status === "successful") {
          setPaymentSuccess(true);
          clearInterval(interval);
          if (user?.id) fetchBalance(user.id);
          fetchProfile();
        }
      } catch {
        // Polling error non-blocking
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [modalVisible, activeCheckout?.chargeId, paymentSuccess]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      user?.id ? fetchBalance(user.id) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const handleBuySands = async (sku: string) => {
    setIsCreatingCheckout(true);
    setPaymentSuccess(false);

    try {
      const res = await createCheckoutQrApi(sku);
      if (res.success && res.checkout) {
        setActiveCheckout(res.checkout);
        setModalVisible(true);
      } else {
        Alert.alert("ไม่สามารถสร้าง QR ได้", res.error || "กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      Alert.alert("เกิดข้อผิดพลาด", err?.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const planName = (profile?.plan || profile?.subscription || "free").toUpperCase();

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
            <Text style={styles.headerTitle}>โปรไฟล์ & สิทธิ์สมาชิก</Text>
            <Text style={styles.headerSubtitle}>จัดการข้อมูลดวงเกิด และเติมทรายกาลเวลา</Text>
          </View>

          {/* User Profile Card */}
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatarBox}>
                <Ionicons name="person" size={32} color={ASTRAL_THEME.colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>
                  {profile?.full_name || profile?.display_name || "ผู้ใช้งาน"}
                </Text>
                <Text style={styles.userEmail}>{user?.email || ""}</Text>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>✦ PLAN: {planName}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push("/edit-profile")}
              >
                <Ionicons name="create-outline" size={20} color={ASTRAL_THEME.colors.gold} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Birth Details */}
            <View style={styles.birthGrid}>
              <View style={styles.birthItem}>
                <Text style={styles.birthLabel}>วันเกิด</Text>
                <Text style={styles.birthVal}>{profile?.birth_date || "ยังไม่ระบุ"}</Text>
              </View>
              <View style={styles.birthItem}>
                <Text style={styles.birthLabel}>เวลาเกิด</Text>
                <Text style={styles.birthVal}>{profile?.birth_time ? `${profile.birth_time} น.` : "ยังไม่ระบุ"}</Text>
              </View>
              <View style={styles.birthItem}>
                <Text style={styles.birthLabel}>สถานที่เกิด</Text>
                <Text style={styles.birthVal}>{profile?.birth_place || "ประเทศไทย"}</Text>
              </View>
            </View>
          </View>

          {/* Sands Balance Card */}
          <View style={[styles.card, styles.sandsCard]}>
            <View style={styles.sandsHeader}>
              <View>
                <Text style={styles.sandsTitle}>⏳ ทรายกาลเวลา (Sands of Time)</Text>
                <Text style={styles.sandsSubtitle}>ใช้สำหรับการสร้างรายงาน AI และเปิดพลังงานปัญญาญาณ</Text>
              </View>
              <Text style={styles.balanceBig}>{balance} Sands</Text>
            </View>
          </View>

          {/* Sands Refill Packs */}
          <Text style={styles.sectionHeader}>เติมทรายกาลเวลา (พร้อมเพย์ QR)</Text>
          <View style={styles.packList}>
            {REFILL_PACKS.map((pack) => (
              <View key={pack.sku} style={styles.packCard}>
                <View style={{ flex: 1 }}>
                  <View style={styles.packTitleRow}>
                    <Text style={styles.packName}>{pack.name}</Text>
                    <View style={styles.packTag}>
                      <Text style={styles.packTagText}>{pack.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.packPrice}>฿{pack.priceThb} บาท</Text>
                </View>

                <TouchableOpacity
                  style={[styles.buyBtn, isCreatingCheckout && styles.btnDisabled]}
                  disabled={isCreatingCheckout}
                  onPress={() => handleBuySands(pack.sku)}
                >
                  <Text style={styles.buyBtnText}>เติมทันที 💳</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Actions & Sign Out */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => {
              Alert.alert("ยืนยันการออกจากระบบ", "คุณต้องการออกจากระบบใช่หรือไม่?", [
                { text: "ยกเลิก", style: "cancel" },
                {
                  text: "ออกจากระบบ",
                  style: "destructive",
                  onPress: () => signOut(),
                },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={ASTRAL_THEME.colors.danger} />
            <Text style={styles.signOutText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* PromptPay QR Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={ASTRAL_THEME.colors.textMuted} />
              </TouchableOpacity>

              {paymentSuccess ? (
                <View style={styles.successBox}>
                  <Text style={styles.successIcon}>🎉</Text>
                  <Text style={styles.successTitle}>ชำระเงินสำเร็จ!</Text>
                  <Text style={styles.successDesc}>ทรายกาลเวลาได้รับการเพิ่มเข้าสู่บัญชีของคุณเรียบร้อยแล้ว</Text>
                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.doneBtnText}>ตกลง</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.qrContent}>
                  <Text style={styles.qrTitle}>สแกนชำระเงินผ่าน PromptPay</Text>
                  <Text style={styles.qrAmount}>฿{activeCheckout?.amountThb} บาท</Text>

                  {activeCheckout?.qrDownloadUri ? (
                    <Image
                      source={{ uri: activeCheckout.qrDownloadUri }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <ActivityIndicator size="large" color={ASTRAL_THEME.colors.gold} />
                      <Text style={styles.qrPlaceholderText}>กำลังสร้าง QR Code...</Text>
                    </View>
                  )}

                  <Text style={styles.qrExpiryText}>QR หมดอายุใน 15 นาที</Text>
                  <View style={styles.pollingRow}>
                    <ActivityIndicator size="small" color={ASTRAL_THEME.colors.gold} />
                    <Text style={styles.pollingText}>ระบบกำลังตรวจจับยอดเงินอัตโนมัติ...</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
    marginTop: 2,
  },
  planBadge: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  planBadgeText: {
    color: ASTRAL_THEME.colors.gold,
    fontSize: 10,
    fontWeight: "700",
  },
  editBtn: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: ASTRAL_THEME.colors.bgCardBorder,
    marginVertical: 12,
  },
  birthGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  birthItem: {
    flex: 1,
  },
  birthLabel: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textDim,
  },
  birthVal: {
    fontSize: 13,
    fontWeight: "600",
    color: ASTRAL_THEME.colors.goldLight,
    marginTop: 2,
  },
  sandsCard: {
    borderLeftWidth: 3,
    borderLeftColor: ASTRAL_THEME.colors.gold,
  },
  sandsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sandsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  sandsSubtitle: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.textMuted,
    marginTop: 2,
    maxWidth: 200,
  },
  balanceBig: {
    fontSize: 20,
    fontWeight: "800",
    color: ASTRAL_THEME.colors.goldLight,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
    marginTop: 4,
  },
  packList: {
    gap: 8,
  },
  packCard: {
    backgroundColor: ASTRAL_THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.bgCardBorder,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    padding: ASTRAL_THEME.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  packName: {
    fontSize: 15,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
  },
  packTag: {
    backgroundColor: ASTRAL_THEME.colors.goldGlow,
    borderRadius: ASTRAL_THEME.borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  packTagText: {
    color: ASTRAL_THEME.colors.goldLight,
    fontSize: 10,
    fontWeight: "600",
  },
  packPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: ASTRAL_THEME.colors.gold,
    marginTop: 2,
  },
  buyBtn: {
    backgroundColor: ASTRAL_THEME.colors.gold,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  buyBtnText: {
    color: ASTRAL_THEME.colors.bg,
    fontSize: 12,
    fontWeight: "700",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  signOutText: {
    color: ASTRAL_THEME.colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: ASTRAL_THEME.spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: ASTRAL_THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: ASTRAL_THEME.colors.goldBorder,
    borderRadius: ASTRAL_THEME.borderRadius.xl,
    padding: ASTRAL_THEME.spacing.lg,
    alignItems: "center",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    padding: 4,
  },
  qrContent: {
    alignItems: "center",
    width: "100%",
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.text,
    textAlign: "center",
  },
  qrAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: ASTRAL_THEME.colors.gold,
    marginTop: 4,
  },
  qrImage: {
    width: 200,
    height: 200,
    marginVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    marginVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderRadius: 8,
    gap: 8,
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textMuted,
  },
  qrExpiryText: {
    fontSize: 12,
    color: ASTRAL_THEME.colors.textDim,
  },
  pollingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  pollingText: {
    fontSize: 11,
    color: ASTRAL_THEME.colors.goldLight,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ASTRAL_THEME.colors.success,
  },
  successDesc: {
    fontSize: 13,
    color: ASTRAL_THEME.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  doneBtn: {
    backgroundColor: ASTRAL_THEME.colors.gold,
    borderRadius: ASTRAL_THEME.borderRadius.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 12,
  },
  doneBtnText: {
    color: ASTRAL_THEME.colors.bg,
    fontSize: 14,
    fontWeight: "700",
  },
});
