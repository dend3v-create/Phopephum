import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreventScreenCapture } from '../../hooks/useScreenCapture';
import { CosmicLayout, CosmicCard } from '../../components';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  report_type: string;
  created_at: string;
  content?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REPORT_TYPES: { key: string; label: string; icon: string; desc: string; color: string }[] = [
  { key: 'life_overview',     label: 'ภาพรวมชีวิต',     icon: 'planet-outline', desc: 'วิเคราะห์ดวงชะตาและบุคลิกภาพ', color: '#C6A96B' },
  { key: 'yearly_forecast',   label: 'พยากรณ์รายปี',    icon: 'calendar-outline', desc: 'แนวโน้มและโอกาสในปีนี้', color: '#4B6FAE' },
  { key: 'monthly_forecast',  label: 'พยากรณ์รายเดือน', icon: 'moon-outline', desc: 'พลังงานเหตุการณ์รายเดือน', color: '#FBBF24' },
  { key: 'relationship',      label: 'ความสัมพันธ์',    icon: 'heart-outline', desc: 'ความรักและมิตรภาพ', color: '#EC4899' },
  { key: 'career',            label: 'การงาน-การเงิน',  icon: 'briefcase-outline', desc: 'เส้นทางอาชีพและโชคลาภ', color: '#818CF8' },
  { key: 'health',            label: 'สุขภาพ',          icon: 'medkit-outline', desc: 'พลังกายและจิตใจ', color: '#10B981' },
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
      <View style={{ flex: 1, backgroundColor: '#020617' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#C9A96E" />
      </View>
    );
  }

  return (
    <CosmicLayout>
      <View className="px-5 pt-2">
        {/* Section: Generate */}
        <Text className="text-text-primary text-xl font-bold mb-5 font-thai ml-1">✦ สร้างรายงาน AI</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-10">
          {REPORT_TYPES.map((rt) => (
            <TouchableOpacity
              key={rt.key}
              className="w-[48%]"
              onPress={() => handleGenerate(rt.key)}
              disabled={!!generating}
              activeOpacity={0.7}
            >
              <CosmicCard hasGlow={generating === rt.key} className="p-0 border-gold-500/10">
                <LinearGradient
                  colors={['rgba(10,34,64,0.6)', 'transparent']}
                  className="p-4 items-center gap-y-2"
                >
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center bg-cosmic-950/60 border border-gold-500/10 shadow-sm"
                  >
                    {generating === rt.key ? (
                      <ActivityIndicator size="small" color="#C6A96B" />
                    ) : (
                      <Ionicons name={rt.icon as any} size={24} color={rt.color} />
                    )}
                  </View>
                  <Text className="text-text-primary text-[13px] font-bold font-thai text-center">{rt.label}</Text>
                  <Text className="text-text-muted text-[10px] text-center font-thai leading-4" numberOfLines={2}>{rt.desc}</Text>
                </LinearGradient>
              </CosmicCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: History */}
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-5 px-1">
             <Text className="text-text-primary text-xl font-bold font-thai">◈ ประวัติรายงาน</Text>
             {reports.length > 0 && <Text className="text-text-muted text-xs font-thai">{reports.length} รายการ</Text>}
          </View>
          
          <View className="gap-y-3">
            {reports.map((report) => {
              const rt = REPORT_TYPES.find((r) => r.key === report.report_type);
              const isExpanded = expandedId === report.id;
              return (
                <TouchableOpacity
                  key={report.id}
                  onPress={() => setExpandedId(isExpanded ? null : report.id)}
                  activeOpacity={0.8}
                >
                  <CosmicCard hasGlow={isExpanded} className={`p-0 ${isExpanded ? 'border-gold-500/30' : 'border-gold-500/10'}`}>
                    <View className="flex-row justify-between items-center p-4">
                      <View className="flex-row items-center gap-4">
                        <View className="w-10 h-10 rounded-xl bg-gold-500/5 items-center justify-center">
                           <Ionicons name={rt?.icon as any ?? 'document-text-outline'} size={20} color={rt?.color ?? '#C6A96B'} />
                        </View>
                        <View>
                          <Text className="text-text-primary text-sm font-bold font-thai">{rt?.label ?? report.report_type}</Text>
                          <Text className="text-text-muted text-[10px] font-thai">
                            {new Date(report.created_at).toLocaleDateString('th-TH', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-forward'}
                        size={18}
                        color="#C6A96B"
                      />
                    </View>
                    {isExpanded && report.content && (
                      <View className="px-5 pb-5 border-t border-gold-500/5 pt-4">
                        <Text className="text-text-secondary text-[13px] leading-[26px] font-thai">{report.content}</Text>
                        
                        <TouchableOpacity className="flex-row items-center mt-6 bg-gold-500/10 self-start px-4 py-2 rounded-full border border-gold-500/20">
                           <Ionicons name="share-outline" size={14} color="#C6A96B" className="mr-2" />
                           <Text className="text-gold-500 text-[10px] font-bold font-thai uppercase tracking-widest">Share Report</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </CosmicCard>
                </TouchableOpacity>
              );
            })}
          </View>

          {reports.length === 0 && (
            <CosmicCard hasGlow={false} className="py-12 items-center border-dashed border-gold-500/20 bg-transparent">
              <Ionicons name="document-outline" size={48} color="rgba(198, 169, 107, 0.2)" className="mb-4" />
              <Text className="text-text-muted text-[13px] text-center leading-[22px] font-thai">
                ยังไม่มีรายงานที่ถูกสร้าง{"\n"}
                กรุณาเลือกหัวข้อด้านบนเพื่อเริ่มต้นพยากรณ์
              </Text>
            </CosmicCard>
          )}
        </View>
      </View>
    </CosmicLayout>
  );
}
