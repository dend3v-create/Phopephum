import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentYam,
  calculateKarnchata,
  calculateHoraTaynoo,
  calculateRahu,
} from '@phopephum/engine';
import { useRouter } from 'expo-router';

export default function CheckYamScreen() {
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const yam = getCurrentYam();
  const karnchata = calculateKarnchata(now);
  const hora = calculateHoraTaynoo({ dateAsked: now });
  const rahu = calculateRahu(now);

  const ls = LEVEL_STYLE[yam.travelAuspiciousness.level] ?? LEVEL_STYLE.good;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#C6A96B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เช็คฤกษ์ยาม</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. ยามอัฐกาล */}
        <Card title="ยามอัฐกาลชั้นฉาย" icon="sunny" color="#C6A96B">
          <View style={styles.yamRow}>
            <Text style={styles.yamName}>{yam.yamName}</Text>
            <View style={[styles.badge, { backgroundColor: ls.bg, borderColor: ls.border }]}>
               <Text style={[styles.badgeText, { color: ls.color }]}>{yam.travelAuspiciousness.label}</Text>
            </View>
          </View>
          <Text style={styles.infoText}>ยามที่ {yam.yamNumber} · {yam.period === 'day' ? 'กลางวัน' : 'กลางคืน'}</Text>
          <Text style={styles.descText}>{yam.prediction?.shouldDo}</Text>
        </Card>

        {/* 2. กาลชะตา */}
        <Card title="เลข ๗ กาลชะตา" icon="hourglass" color="#38BDF8">
          <Text style={styles.yamName}>{karnchata.yamYaiName}</Text>
          <Text style={styles.infoText}>ยามใหญ่ที่ {karnchata.yamYaiNumber} · ยามย่อย {karnchata.yamSoyName}</Text>
          <Text style={styles.descText}>พยากรณ์รายชั่วโมงและนาทีตามหลักกาลชะตา</Text>
        </Card>

        {/* 3. ยามพรายกระซิบ */}
        <Card title="ยามพรายกระซิบ" icon="sparkles" color="#818CF8">
          <Text style={styles.yamName}>ยาม {hora.yamAsked}</Text>
          <Text style={styles.infoText}>ผังดาวลอย 11 · เริ่ม {hora.yamStartStr} - {hora.yamEndStr}</Text>
          <Text style={styles.descText}>ใช้สำหรับถามคำถามเฉพาะเจาะจงหรือเสี่ยงโชค</Text>
        </Card>

        {/* 4. ราหูค้นทรัพย์ */}
        <Card title="ราหูค้นทรัพย์" icon="moon" color={rahu?.is_current_moment_good ? '#34D399' : '#FB7185'}>
          <Text style={[styles.yamName, { color: rahu?.is_current_moment_good ? '#34D399' : '#FB7185' }]}>
            {rahu?.summary.overall_verdict}
          </Text>
          <Text style={styles.infoText}>ช่วงเวลา: {rahu?.main_block.start_time} - {rahu?.main_block.end_time}</Text>
          <Text style={styles.descText}>{rahu?.summary.advice}</Text>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, icon, color, children }: any) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const LEVEL_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  excellent: { color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.3)' },
  very_good: { color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.3)' },
  good:      { color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)' },
  bad:       { color: '#FB7185', bg: 'rgba(251, 113, 133, 0.1)', border: 'rgba(251, 113, 133, 0.3)' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 188, 130, 0.1)',
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#F8F6F1', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, gap: 16 },
  card: {
    backgroundColor: 'rgba(10, 22, 40, 0.6)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { color: '#C6A96B', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  yamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  yamName: { color: '#F8F6F1', fontSize: 24, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  infoText: { color: '#C6B79F', fontSize: 13, marginBottom: 8 },
  descText: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
});
