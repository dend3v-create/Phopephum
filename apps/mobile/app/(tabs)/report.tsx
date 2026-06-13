import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  report_type: string;
  created_at: string;
  content?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REPORT_TYPES: { key: string; label: string; icon: string; desc: string }[] = [
  { key: 'life_overview',     label: 'ภาพรวมชีวิต',     icon: '☽', desc: 'วิเคราะห์ดวงชะตาและบุคลิกภาพจากเลข 7 ตัว' },
  { key: 'yearly_forecast',   label: 'พยากรณ์รายปี',    icon: '⟁', desc: 'แนวโน้มและโอกาสในปีนี้' },
  { key: 'monthly_forecast',  label: 'พยากรณ์รายเดือน', icon: '◐', desc: 'พลังงานและเหตุการณ์สำคัญในเดือนนี้' },
  { key: 'relationship',      label: 'ความสัมพันธ์',    icon: '♡', desc: 'ความรักและมิตรภาพ' },
  { key: 'career',            label: 'การงาน-การเงิน',  icon: '✦', desc: 'เส้นทางอาชีพและโชคลาภ' },
  { key: 'health',            label: 'สุขภาพ',          icon: '◈', desc: 'พลังกายและจิตใจ' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profileData }, { data: reportData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('ai_reports')
        .select('id, report_type, created_at, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    setProfile(profileData);
    setReports(reportData ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  async function handleGenerate(reportType: string) {
    if (!profile) return;
    if (generating) return;

    setGenerating(reportType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Call the web API endpoint
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_APP_URL ?? 'https://phopephum.com'}/api/reports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ report_type: reportType }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any)?.error ?? 'เกิดข้อผิดพลาด');
      }

      await fetchData();
      Alert.alert('สำเร็จ', 'สร้างรายงานเรียบร้อยแล้ว');
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e?.message ?? 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setGenerating(null);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />
        }
      >
        {/* Section: Generate */}
        <Text style={styles.sectionTitle}>✦ สร้างรายงาน AI</Text>
        <View style={styles.generateGrid}>
          {REPORT_TYPES.map((rt) => (
            <TouchableOpacity
              key={rt.key}
              style={styles.generateCard}
              onPress={() => handleGenerate(rt.key)}
              disabled={!!generating}
              activeOpacity={0.7}
            >
              {generating === rt.key ? (
                <ActivityIndicator size="small" color="#C9A96E" />
              ) : (
                <Text style={styles.generateIcon}>{rt.icon}</Text>
              )}
              <Text style={styles.generateLabel}>{rt.label}</Text>
              <Text style={styles.generateDesc} numberOfLines={2}>{rt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: History */}
        {reports.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>◈ ประวัติรายงาน</Text>
            <View style={styles.historyList}>
              {reports.map((report) => {
                const rt = REPORT_TYPES.find((r) => r.key === report.report_type);
                const isExpanded = expandedId === report.id;
                return (
                  <TouchableOpacity
                    key={report.id}
                    style={styles.reportCard}
                    onPress={() => setExpandedId(isExpanded ? null : report.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reportCardHeader}>
                      <View style={styles.reportCardLeft}>
                        <Text style={styles.reportCardIcon}>{rt?.icon ?? '◈'}</Text>
                        <View>
                          <Text style={styles.reportCardLabel}>{rt?.label ?? report.report_type}</Text>
                          <Text style={styles.reportCardDate}>
                            {new Date(report.created_at).toLocaleDateString('th-TH', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#C6B79F"
                      />
                    </View>
                    {isExpanded && report.content && (
                      <Text style={styles.reportContent}>{report.content}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {reports.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◐</Text>
            <Text style={styles.emptyText}>ยังไม่มีรายงาน{'\n'}กดสร้างรายงานด้านบน</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0806' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    color: '#F8F6F1',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  generateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  generateCard: {
    width: '47%',
    backgroundColor: '#15120F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2018',
    padding: 16,
    alignItems: 'flex-start',
    gap: 6,
  },
  generateIcon: { fontSize: 22, color: '#C9A96E' },
  generateLabel: { color: '#F8F6F1', fontSize: 13, fontWeight: 'bold' },
  generateDesc: { color: '#C6B79F', fontSize: 11, lineHeight: 16 },
  historyList: { gap: 10 },
  reportCard: {
    backgroundColor: '#15120F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2018',
    overflow: 'hidden',
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  reportCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportCardIcon: { fontSize: 20, color: '#C9A96E', width: 28 },
  reportCardLabel: { color: '#F8F6F1', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  reportCardDate: { color: '#C6B79F', fontSize: 11 },
  reportContent: {
    color: '#D9CDB7',
    fontSize: 13,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: { fontSize: 40, color: '#2A2018', marginBottom: 12 },
  emptyText: { color: '#C6B79F', fontSize: 13, textAlign: 'center', lineHeight: 22 },
});
