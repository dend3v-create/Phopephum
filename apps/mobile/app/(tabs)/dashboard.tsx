import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentYam,
  calculateMoonPhase,
  calculateKarnchata,
  calculateRahu,
  calculateHoraTaynoo,
  PLANET_INFO,
} from '@phopephum/engine';
import { useRouter } from 'expo-router';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  excellent: { color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.3)' },
  very_good: { color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.3)' },
  good:      { color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)' },
  bad:       { color: '#FB7185', bg: 'rgba(251, 113, 133, 0.1)', border: 'rgba(251, 113, 133, 0.3)' },
};

const STAR_TH: Record<number, string> = { 1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ", 5: "พฤหัส", 6: "ศุกร์", 7: "เสาร์" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(profileData);
    setLoading(false);
    setRefreshing(false);
  }

  const yam = getCurrentYam();
  const moon = calculateMoonPhase();
  const karnchata = calculateKarnchata(now);
  const rahu = calculateRahu(now);
  const hora = calculateHoraTaynoo({ dateAsked: now });

  const dateStr = now.toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const timeStr = now.toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit',
  });

  const ls = LEVEL_STYLE[yam.travelAuspiciousness.level] ?? LEVEL_STYLE.good;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#C6A96B" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#C6A96B" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.welcomeText} numberOfLines={1}>สวัสดี, {profile?.display_name || 'คุณ'}</Text>
          </View>
          <View style={styles.headerBadges}>
            <View style={styles.inkBadge}>
              <Text style={styles.inkBadgeText}>⏳ {profile?.plan === 'imperial' ? '♾️' : (profile?.time_sands ?? 0)}</Text>
            </View>
            <View style={styles.timeBadge}>
               <View style={styles.pulseDot} />
               <Text style={styles.timeText}>{timeStr}</Text>
            </View>
          </View>
        </View>

        {/* ฤกษ์ยาม Hero Card */}
        <TouchableOpacity 
          style={styles.heroCard}
          onPress={() => router.push('/check-yam' as any)}
        >
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>✦ ฤกษ์ยามขณะนี้</Text>
            <View style={[styles.badge, { backgroundColor: ls.bg, borderColor: ls.border }]}>
               <Text style={[styles.badgeText, { color: ls.color }]}>{yam.travelAuspiciousness.label}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{yam.yamName}</Text>
          <Text style={styles.heroSub}>
            ยาม {yam.yamNumber} · {yam.period === 'day' ? 'กลางวัน' : 'กลางคืน'}
            {moon.isWanPhra ? ' · 🔆 วันพระ' : ` · จันทร์ ${Math.round(moon.illumination)}%`}
          </Text>
          {yam.prediction?.shouldDo && (
            <Text style={styles.heroDesc} numberOfLines={2}>{yam.prediction.shouldDo}</Text>
          )}
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>เช็คทุกฤกษ์ยาม</Text>
            <Ionicons name="arrow-forward" size={14} color="#C6A96B" />
          </View>
        </TouchableOpacity>

        {/* Grid Tools */}
        <Text style={styles.sectionTitle}>✦ เครื่องมือพยากรณ์</Text>
        <View style={styles.grid}>
          <ToolCard 
            title="ยามอัฐกาล"
            sub={yam.yamName}
            info={`ยาม ${yam.yamNumber}`}
            icon="sunny-outline"
            color="#C6A96B"
            onPress={() => router.push('/check-yam' as any)}
          />
          <ToolCard 
            title="กาลชะตา"
            sub={karnchata.yamYaiName}
            info={`ดาว ${STAR_TH[karnchata.dayStarNumber] || karnchata.dayStarNumber}`}
            icon="hourglass-outline"
            color="#38BDF8"
            onPress={() => router.push('/check-yam' as any)}
          />
          <ToolCard 
            title="พรายกระซิบ"
            sub={PLANET_INFO[hora.yamPlanet]?.thai || String(hora.yamPlanet)}
            info={`ยาม ${hora.yamAsked}`}
            icon="sparkles-outline"
            color="#818CF8"
            onPress={() => router.push('/check-yam' as any)}
          />
          <ToolCard 
            title="ราหูค้นทรัพย์"
            sub={rahu?.summary.overall_verdict || 'ระวัง'}
            info={rahu ? `${rahu.main_block.start_time}-${rahu.main_block.end_time}` : '-'}
            icon="moon-outline"
            color={rahu?.is_current_moment_good ? '#34D399' : '#FB7185'}
            onPress={() => router.push('/check-yam' as any)}
          />
        </View>

        {/* Analysis Tools */}
        <Text style={styles.sectionTitle}>✦ วิเคราะห์ดวงชะตา</Text>
        <View style={styles.list}>
          <AnalysisRow 
            title="ตั้งดวงชะตา"
            sub="เลข ๗ ตัว ผังจักรพรรดิ"
            icon="compass-outline"
            color="#4B6FAE"
            onPress={() => router.push('/horoscope' as any)}
          />
          <AnalysisRow 
            title="มหาทักษา / มหาภูติ"
            sub="พยากรณ์ชีวิตและธาตุกำเนิด"
            icon="star-half-outline"
            color="#C6A96B"
            onPress={() => router.push('/mahathaksa' as any)}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function ToolCard({ title, sub, info, icon, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 8 }} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardSub, { color }]}>{sub}</Text>
      <Text style={styles.cardInfo}>{info}</Text>
    </TouchableOpacity>
  );
}

function AnalysisRow({ title, sub, icon, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: color + '20', borderColor: color + '40' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  dateText: { color: '#94A3B8', fontSize: 13, marginBottom: 4 },
  welcomeText: { color: '#F8F6F1', fontSize: 22, fontWeight: 'bold' },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inkBadge: {
    backgroundColor: 'rgba(198, 169, 107, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.3)',
  },
  inkBadgeText: {
    color: '#C6A96B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(77, 184, 160, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(77, 184, 160, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4DB8A0',
    marginRight: 8,
  },
  timeText: { color: '#4DB8A0', fontSize: 14, fontWeight: 'bold' },
  heroCard: {
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.2)',
    marginBottom: 24,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroLabel: { color: '#C6A96B', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  heroTitle: { color: '#F8F6F1', fontSize: 30, fontWeight: 'bold', marginBottom: 4 },
  heroSub: { color: '#C6B79F', fontSize: 14, marginBottom: 12 },
  heroDesc: { color: '#94A3B8', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroFooterText: { color: '#C6A96B', fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { color: '#C6A96B', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: {
    backgroundColor: 'rgba(10, 22, 40, 0.5)',
    width: '48%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitle: { color: '#F8F6F1', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  cardInfo: { color: '#C6B79F', fontSize: 12 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 22, 40, 0.5)',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  rowTitle: { color: '#F8F6F1', fontSize: 15, fontWeight: 'bold' },
  rowSub: { color: '#C6B79F', fontSize: 13, marginTop: 2 },
});
