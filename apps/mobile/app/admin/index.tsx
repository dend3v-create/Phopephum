import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const THEME = {
  bg: '#020617',
  gold: '#C6A96B',
  mystic: '#4B6FAE',
  text: '#F8F6F1',
  textMuted: '#8A8070',
  cardBg: 'rgba(10, 34, 64, 0.6)',
  border: 'rgba(198, 169, 107, 0.2)'
};

export default function AdminOverviewScreen() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ users: 0, reports: 0, events: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      checkAdminAndFetchStats();
    }, [])
  );

  async function checkAdminAndFetchStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        router.replace('/login');
        return;
      }

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        Alert.alert('Access Denied', 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบแอดมิน');
        router.replace('/(tabs)');
        return;
      }

      setIsAdmin(true);

      // Fetch stats
      const [userRes, reportRes, eventRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('ai_reports').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        users: userRes.count || 0,
        reports: reportRes.count || 0,
        events: eventRes.count || 0
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }} className="justify-center items-center">
        <ActivityIndicator size="large" color={THEME.gold} />
      </SafeAreaView>
    );
  }

  if (isAdmin === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }} className="justify-center items-center">
        <Text style={{ color: THEME.text }}>Access Denied</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>System Overview</Text>
          <Text style={styles.subtitle}>แผงควบคุมหลักสำหรับการบริหารจัดการระบบ PhopePhum</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <View style={[styles.iconBg, { backgroundColor: THEME.mystic + '20' }]}>
                <Ionicons name="people" size={20} color={THEME.mystic} />
              </View>
              <Text style={styles.statTitle}>ผู้ใช้งานทั้งหมด</Text>
            </View>
            <Text style={styles.statVal}>{stats.users}</Text>
            <Text style={styles.statSub}>บัญชีผู้ใช้งานที่ลงทะเบียน</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <View style={[styles.iconBg, { backgroundColor: THEME.gold + '20' }]}>
                <Ionicons name="sparkles" size={20} color={THEME.gold} />
              </View>
              <Text style={styles.statTitle}>รายงาน AI</Text>
            </View>
            <Text style={styles.statVal}>{stats.reports}</Text>
            <Text style={styles.statSub}>บทวิเคราะห์ดวงที่สร้างเสร็จ</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <View style={[styles.iconBg, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="pulse" size={20} color="#10B981" />
              </View>
              <Text style={styles.statTitle}>System Events</Text>
            </View>
            <Text style={styles.statVal}>{stats.events}</Text>
            <Text style={styles.statSub}>ข้อมูลวิเคราะห์การใช้งาน</Text>
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <View className="gap-3">
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/admin/users')}
            >
              <View style={[styles.iconBg, { backgroundColor: THEME.mystic + '20' }]}>
                <Ionicons name="people-circle" size={24} color={THEME.mystic} />
              </View>
              <View className="flex-1">
                <Text style={styles.btnTitle}>จัดการสมาชิก</Text>
                <Text style={styles.btnDesc}>ดูรายชื่อสมาชิก ค้นหา และแก้ไขสิทธิ์/แพ็กเกจ</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/admin/approvals')}
            >
              <View style={[styles.iconBg, { backgroundColor: THEME.gold + '20' }]}>
                <Ionicons name="checkmark-circle" size={24} color={THEME.gold} />
              </View>
              <View className="flex-1">
                <Text style={styles.btnTitle}>อนุมัติคำขอสมาชิก</Text>
                <Text style={styles.btnDesc}>ตรวจสอบสลิปและอนุมัติการอัปเกรดแพ็กเกจ</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={16} color={THEME.textMuted} />
          <Text style={styles.backBtnText}>กลับไปยังแอปหลัก</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24
  },
  title: {
    color: THEME.text,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  subtitle: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24
  },
  statCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 18
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statTitle: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  statVal: {
    color: THEME.text,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Cinzel_700Bold'
  },
  statSub: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  actionsCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    marginBottom: 24
  },
  cardTitle: {
    color: THEME.text,
    fontSize: 14,
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 16
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 14
  },
  btnTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  btnDesc: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    backgroundColor: 'rgba(10, 34, 64, 0.2)'
  },
  backBtnText: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  }
});
