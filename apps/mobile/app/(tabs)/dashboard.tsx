import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

// ─── ยามอัฏฐกาล (8 ยาม) ──────────────────────────────────────────────────────

const YAM_NAMES = ['ยามกลางคืน','ยามอรุณ','ยามเช้า','ยามสาย','ยามเที่ยง','ยามบ่าย','ยามเย็น','ยามค่ำ'];
const YAM_COLORS = ['#4B6FAE','#E8A44A','#C6A96B','#38BDF8','#F59E0B','#818CF8','#F97316','#6366F1'];

function getCurrentYam() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  // แต่ละยาม = 3 ชั่วโมง (180 นาที) เริ่ม 06:00
  const startMinutes = 6 * 60;
  const yamIndex = Math.floor(((totalMinutes - startMinutes + 1440) % 1440) / 180) % 8;
  const yamStart = ((startMinutes + yamIndex * 180) % 1440);
  const yamEnd = (yamStart + 180) % 1440;
  const remaining = (yamEnd - totalMinutes + 1440) % 1440;
  const remH = Math.floor(remaining / 60);
  const remM = remaining % 60;
  return {
    index: yamIndex,
    name: YAM_NAMES[yamIndex],
    color: YAM_COLORS[yamIndex],
    remaining: `${remH}ชม. ${remM}นาที`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [yam, setYam] = useState(getCurrentYam());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      setYam(getCurrentYam());
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profileData }, { data: reportData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('ai_reports').select('id, report_type, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(3),
    ]);

    setProfile(profileData);
    setReports(reportData ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  const birthYear = profile?.birth_date ? new Date(profile.birth_date).getFullYear() : null;
  const birthYearBE = birthYear ? birthYear + 543 : null;
  const dateStr = now.toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#C9A96E" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#C9A96E" />}
      >
        {/* Date Header */}
        <Text style={styles.dateText}>{dateStr}</Text>

        {/* ยามปัจจุบัน */}
        <View style={[styles.yamCard, { borderColor: yam.color + '40' }]}>
          <View style={styles.yamHeader}>
            <Text style={styles.yamLabel}>ยามอัฏฐกาลขณะนี้</Text>
            <View style={[styles.yamBadge, { backgroundColor: yam.color + '20' }]}>
              <Text style={[styles.yamBadgeText, { color: yam.color }]}>
                ยามที่ {yam.index + 1}
              </Text>
            </View>
          </View>
          <Text style={[styles.yamName, { color: yam.color }]}>{yam.name}</Text>
          <Text style={styles.yamRemaining}>⏳ เหลืออีก {yam.remaining}</Text>
        </View>

        {/* ข้อมูลชาตา */}
        <Text style={styles.sectionTitle}>✦ ข้อมูลชาตา</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="person-outline" label="ชื่อ" value={profile?.display_name || '-'} />
          <InfoRow icon="calendar-outline" label="วันเกิด" value={
            profile?.birth_date
              ? new Date(profile.birth_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
              : '-'
          } />
          <InfoRow icon="star-outline" label="ปีเกิด (พ.ศ.)" value={birthYearBE ? String(birthYearBE) : '-'} />
          <InfoRow icon="time-outline" label="เวลาเกิด" value={profile?.birth_time || '-'} />
          <InfoRow icon="location-outline" label="จังหวัดเกิด" value={profile?.birth_place || '-'} />
        </View>

        {/* แพ็กเกจ */}
        <View style={styles.planRow}>
          <View style={[styles.planBadge, { backgroundColor: getPlanColor(profile?.plan) + '20', borderColor: getPlanColor(profile?.plan) + '40' }]}>
            <Text style={[styles.planText, { color: getPlanColor(profile?.plan) }]}>
              ✦ {(profile?.plan || 'basic').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.planStatus}>
            {profile?.membership_status === 'active' ? '● Active' : '⏳ Pending'}
          </Text>
        </View>

        {/* รายงาน AI ล่าสุด */}
        {reports.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>◈ รายงาน AI ล่าสุด</Text>
            <View style={styles.infoCard}>
              {reports.map((r) => (
                <View key={r.id} style={styles.reportRow}>
                  <Text style={styles.reportType}>{REPORT_LABELS[r.report_type] || r.report_type}</Text>
                  <Text style={styles.reportDate}>
                    {new Date(r.created_at).toLocaleDateString('th-TH')}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REPORT_LABELS: Record<string, string> = {
  life_overview: '☽ ภาพรวมชีวิต',
  yearly_forecast: '⟁ พยากรณ์รายปี',
  relationship: '♡ ความสัมพันธ์',
  career: '✦ การงาน-การเงิน',
  health: '◈ สุขภาพ',
  monthly_forecast: '◐ พยากรณ์รายเดือน',
};

function getPlanColor(plan?: string) {
  if (plan === 'imperial') return '#C6A96B';
  if (plan === 'pro') return '#6D8FC7';
  return '#34D399';
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={18} color="#8A8070" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0806' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  dateText: { color: '#8A8070', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  yamCard: {
    backgroundColor: '#15120F',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  yamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  yamLabel: { color: '#8A8070', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  yamBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  yamBadgeText: { fontSize: 11, fontWeight: 'bold' },
  yamName: { fontSize: 28, fontWeight: 'bold', marginBottom: 6 },
  yamRemaining: { color: '#8A8070', fontSize: 12 },
  sectionTitle: { color: '#F8F6F1', fontSize: 15, fontWeight: 'bold', marginBottom: 12, marginTop: 4 },
  infoCard: {
    backgroundColor: '#15120F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2018',
    overflow: 'hidden',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2018',
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { color: '#8A8070', fontSize: 13 },
  infoValue: { color: '#F8F6F1', fontSize: 13, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  planBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  planText: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  planStatus: { color: '#34D399', fontSize: 12 },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2018',
  },
  reportType: { color: '#D9CDB7', fontSize: 13 },
  reportDate: { color: '#8A8070', fontSize: 12 },
});
