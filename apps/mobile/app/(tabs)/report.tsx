import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreventScreenCapture } from '../../hooks/useScreenCapture';

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
  usePreventScreenCapture();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#C9A96E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />
        }
      >
        {/* Section: Generate */}
        <Text className="text-text text-[15px] font-bold mb-3 font-thai">✦ สร้างรายงาน AI</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3 mb-7">
          {REPORT_TYPES.map((rt) => (
            <TouchableOpacity
              key={rt.key}
              className="w-[48%] rounded-2xl border border-[#C6A96B]/30 overflow-hidden shadow-lg shadow-black/50"
              onPress={() => handleGenerate(rt.key)}
              disabled={!!generating}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(10,34,64,0.8)', 'rgba(2,6,23,0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-4 items-start gap-1.5 h-full"
              >
                {generating === rt.key ? (
                  <ActivityIndicator size="small" color="#C6A96B" />
                ) : (
                  <Text className="text-[24px] text-[#C6A96B] mb-1">{rt.icon}</Text>
                )}
                <Text className="text-[#F8F6F1] text-[13px] font-bold font-thai">{rt.label}</Text>
                <Text className="text-[#8A8070] text-[11px] leading-4 font-thai" numberOfLines={2}>{rt.desc}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: History */}
        {reports.length > 0 && (
          <>
            <Text className="text-text text-[15px] font-bold mb-3 mt-2 font-thai">◈ ประวัติรายงาน</Text>
            <View className="gap-2.5">
              {reports.map((report) => {
                const rt = REPORT_TYPES.find((r) => r.key === report.report_type);
                const isExpanded = expandedId === report.id;
                return (
                  <TouchableOpacity
                    key={report.id}
                    className="rounded-2xl border border-[#C6A96B]/20 overflow-hidden shadow-md shadow-black/40"
                    onPress={() => setExpandedId(isExpanded ? null : report.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isExpanded ? ['rgba(10,34,64,0.9)', 'rgba(2,6,23,1)'] : ['rgba(2,6,23,0.7)', 'rgba(2,6,23,0.9)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    >
                      <View className="flex-row justify-between items-center p-4">
                        <View className="flex-row items-center gap-3">
                          <Text className="text-[20px] text-[#C6A96B] w-7 text-center">{rt?.icon ?? '◈'}</Text>
                          <View>
                            <Text className="text-[#F8F6F1] text-[14px] font-bold mb-0.5 font-thai">{rt?.label ?? report.report_type}</Text>
                            <Text className="text-[#8A8070] text-[11px] font-thai">
                              {new Date(report.created_at).toLocaleDateString('th-TH', {
                                day: 'numeric', month: 'long', year: 'numeric',
                              })}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#C6A96B"
                        />
                      </View>
                      {isExpanded && report.content && (
                        <View className="px-4 pb-4 border-t border-[#C6A96B]/10 pt-3 mt-1">
                          <Text className="text-[#F8F6F1] text-[13px] leading-[24px] font-thai">{report.content}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {reports.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-[40px] text-[#2A2018] mb-3">◐</Text>
            <Text className="text-muted text-[13px] text-center leading-[22px] font-thai">ยังไม่มีรายงาน{'\n'}กดสร้างรายงานด้านบน</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

