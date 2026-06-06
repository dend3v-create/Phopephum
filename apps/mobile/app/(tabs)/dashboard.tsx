import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, RefreshControl,
  StyleSheet, ScrollView
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getYamPrediction,
  calculatePhopephum,
  calculateRahu,
  RAHU_SUB_BLOCKS,
  STAR_NAMES
} from '@phopephum/engine';
import type { StarNumber } from '@phopephum/types';
import { usePreventScreenCapture } from '../../hooks/useScreenCapture';
import { CosmicLayout, CosmicCard } from '../../components';

// ─── Constants & Metadata ───────────────────────────────────────────────────

const PLANET_METADATA: Record<string, { starName: string; color: string }> = {
  สุริชะ: { starName: "อาทิตย์ (๑)", color: "#EF4444" },
  สุริยะ: { starName: "อาทิตย์ (๑)", color: "#EF4444" },
  ระวิ:  { starName: "อาทิตย์ (๑)", color: "#EF4444" },
  จันเทา: { starName: "จันทร์ (๒)", color: "#FBBF24" },
  คะศิ:  { starName: "จันทร์ (๒)", color: "#FBBF24" },
  ภุมมะ:  { starName: "อังคาร (๓)", color: "#EC4899" },
  ภุมโม: { starName: "อังคาร (๓)", color: "#EC4899" },
  พุธะ:  { starName: "พุธ (๔)", color: "#10B981" },
  พุทธะ: { starName: "พุธ (๔)", color: "#10B981" },
  พุทโธ: { starName: "พุธ (๔)", color: "#10B981" },
  ครู:    { starName: "พฤหัสบดี (๕)", color: "#C6A96B" },
  ชีโว:  { starName: "พฤหัสบดี (๕)", color: "#C6A96B" },
  ศุกระ:  { starName: "ศุกร์ (๖)", color: "#3B82F6" },
  ศุโกร: { starName: "ศุกร์ (๖)", color: "#3B82F6" },
  เสารี:  { starName: "เสาร์ (๗)", color: "#8B5CF6" },
  โสโร:  { starName: "เสาร์ (๗)", color: "#8B5CF6" },
  เสาร์:  { starName: "เสาร์ (๗)", color: "#8B5CF6" },
};

const ROW_META = [
  { label: "ฐาน ๑", sub: "วันเกิด",           phopNames: ["อัตตะ","หินะ","ธนัง","ปิตา","มาตา","โภคา","มัชฌิมา"] },
  { label: "ฐาน ๒", sub: "เดือนเกิด",         phopNames: ["ตนุ","กฎุมภะ","สหัชชะ","พันธุ","ปุตตะ","อริ","ปัตนิ"] },
  { label: "ฐาน ๓", sub: "ปีเกิด",            phopNames: ["มรณะ","ศุภะ","กัมมะ","ลาภะ","พยายะ","ทาสา","ทาสี"] },
  { label: "ฐาน ๔", sub: "ฐานบวก (มหาจักร)", phopNames: null },
  { label: "ฐาน ๕", sub: "ฐานเศษ (มหาภูติ)", phopNames: null },
  { label: "ฐาน ๖", sub: "กำลังพระเคราะห์",  phopNames: null },
  { label: "ฐาน ๗", sub: "กำลังพระเคราะห์",  phopNames: null },
  { label: "ฐาน ๘", sub: "อาตมะ",            phopNames: ["อาตมะ","ทาสา","สิทธิโชค","โภคทรัพย์","โจร","อุบาทว์","อุปถัมภ์"] },
  { label: "ฐาน ๙", sub: "ภริยัง",           phopNames: ["อัตตะ","สักกะ","ญาติ","ธนัง","เคหัง","นาวัง","ภริยัง"] },
];

const RAHU_ADVICE: Record<string, string> = {
  "ทาษา": "ยามอุปสรรค พึงระวังความเหนื่อยยาก ห้ามเจรจาการเงินหรือเซ็นสัญญาสำคัญ",
  "คหปติ": "ยามมงคล เหมาะสำหรับเริ่มต้นธุรกิจ ค้าขาย ซื้อขายสินทรัพย์ มีกำไรงดงาม",
  "โจโร": "ยามอันตราย พึงระวังความขัดแย้ง การถูกเอารัดเอาเปรียบ หรือการสูญเสียเงินทอง",
  "เสนาปติ": "ยามแห่งชัยชนะ เหมาะสำหรับเจรจาการงาน เข้าพบผู้ใหญ่ หรือการแสดงภาวะผู้นำ",
  "กาลทัณฑ์": "ยามกาลกิณี หลีกเลี่ยงกิจกรรมเสี่ยงทุกชนิด มีเกณฑ์สูญเสียหรือเกิดความล่าช้า",
  "กัลยาณ์": "ยามมิตรภาพ เหมาะแก่การเจรจา ประสานงาน ปรับความเข้าใจ หรือติดต่อความร่วมมือ",
  "มหายักษ์": "ยามร้อนรุ่ม พึงระวังอารมณ์ฉุนเฉียว การทะเลาะเบาะแว้ง และการเดินทางที่ตึงเครียด",
  "ธนบดินทร์": "ยามมหาโชคลาภ ดีเลิศสำหรับการปิดยอดขาย ทวงหนี้ เจรจาการเงิน หรือเปิดร้านใหม่",
  "นักพรต": "ยามสงบนิ่ง เหมาะกับการวางแผน ศึกษาหาความรู้ ทำสมาธิ หรือกิจกรรมที่ต้องการความเงียบสงบ"
};

interface DisplayYam {
  color: string;
  type: string;
  name: string;
  star: string;
}

function formatDisplayYam(yamResult: any): DisplayYam {
  const meta = PLANET_METADATA[yamResult.yamName] || { starName: yamResult.yamName, color: "#C6A96B" };
  return {
    color: meta.color,
    type: yamResult.period === "day" ? "กลางวัน" : "กลางคืน",
    name: `ยาม${yamResult.yamName} (ยามที่ ${yamResult.yamNumber})`,
    star: meta.starName,
  };
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  usePreventScreenCapture();

  const [profile, setProfile] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'chart' | 'rahu' | 'info'>('chart');

  // Time States
  const [now, setNow] = useState(new Date());
  const [yam, setYam] = useState<DisplayYam>(() => formatDisplayYam(getYamPrediction(new Date())));
  const [rahuResult, setRahuResult] = useState<any>(null);

  // Horoscope state
  const [horoscope, setHoroscope] = useState<any>(null);

  // Grid filter options
  const [hoverNum, setHoverNum] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; val: number } | null>(null);
  const [showVayaJorn, setShowVayaJorn] = useState(true);
  const [showYearlyJorn, setShowYearlyJorn] = useState(true);
  const [showMonthlyJorn, setShowMonthlyJorn] = useState(false);
  const [showDailyJorn, setShowDailyJorn] = useState(false);
  const [showNatalLagna, setShowNatalLagna] = useState(true);
  const [showTransitLagna, setShowTransitLagna] = useState(true);
  const [showTaksaJorn, setShowTaksaJorn] = useState(false);
  const [showMahaJorn, setShowMahaJorn] = useState(false);

  // Fetch Data & Loop updates
  useEffect(() => {
    fetchData();

    const updateTimeBasedEngines = () => {
      const nowObj = new Date();
      setYam(formatDisplayYam(getYamPrediction(nowObj)));
      setNow(nowObj);
      setRahuResult(calculateRahu(nowObj));
    };

    updateTimeBasedEngines();

    const timer = setInterval(() => {
      updateTimeBasedEngines();
    }, 15000); // Ticks every 15s to keep Rahu countdown correct

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

    if (profileData?.birth_date) {
      try {
        const phopephumResult = await calculatePhopephum({
          birthDate: profileData.birth_date,
          birthTime: profileData.birth_time || "12:00",
          birthPlace: profileData.birth_place || "กรุงเทพมหานคร",
        }, new Date());
        setHoroscope(phopephumResult);
      } catch (err) {
        console.error("Local calculation error:", err);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }

  const birthYearBE = useMemo(() => {
    if (!profile?.birth_date) return null;
    return new Date(profile.birth_date).getFullYear() + 543;
  }, [profile]);

  const dateStr = useMemo(() => {
    return now.toLocaleDateString('th-TH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }, [now]);

  // Calculations for Rahu Schedule and Countdown
  const rahuCountdown = useMemo(() => {
    if (!rahuResult) return '';
    const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const blockStartMin = timeToMinutes(rahuResult.main_block.start_time);
    let elapsedMinutes = nowMinutes - blockStartMin;
    if (elapsedMinutes < 0) elapsedMinutes += 1440;
    const cycleMinutes = elapsedMinutes % 90;

    const endMin = rahuResult.sub_block.minute_end;
    const diff = endMin - cycleMinutes;
    if (diff <= 0) return '0 นาที';

    const m = Math.floor(diff);
    const s = Math.floor((diff - m) * 60);
    return `${m} นาที ${s} วินาที`;
  }, [rahuResult, now]);

  const rahuScheduleList = useMemo(() => {
    if (!rahuResult || !horoscope?.atthakarn?.startTime) return [];
    const baseMinutes = timeToMinutes(horoscope.atthakarn.startTime);

    return RAHU_SUB_BLOCKS.map((sb, idx) => {
      const startTotal = (baseMinutes + idx * 10) % 1440;
      const endTotal = (baseMinutes + (idx + 1) * 10) % 1440;

      const sh = String(Math.floor(startTotal / 60)).padStart(2, '0');
      const sm = String(startTotal % 60).padStart(2, '0');
      const eh = String(Math.floor(endTotal / 60)).padStart(2, '0');
      const em = String(endTotal % 60).padStart(2, '0');

      return {
        ...sb,
        timeRangeText: `${sh}:${sm} - ${eh}:${em}`,
      };
    });
  }, [rahuResult, horoscope]);

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
        {/* Date Header */}
        <Text className="text-text-muted text-[11px] mb-6 text-center font-thai uppercase tracking-[2px]">{dateStr}</Text>

        {/* Tab Selector */}
        <CosmicCard hasGlow={false} className="mb-8 p-1 rounded-2xl border-gold-500/10">
          <View className="flex-row justify-between">
            <TabItem 
              label="ผังดวง" 
              active={activeTab === 'chart'} 
              onPress={() => setActiveTab('chart')} 
            />
            <TabItem 
              label="ยามราหู" 
              active={activeTab === 'rahu'} 
              onPress={() => setActiveTab('rahu')} 
            />
            <TabItem 
              label="ข้อมูล" 
              active={activeTab === 'info'} 
              onPress={() => setActiveTab('info')} 
            />
          </View>
        </CosmicCard>

        {/* ── Tab 1: ผังดวงจักรพรรดิ ── */}
        {activeTab === 'chart' && (
          <View className="gap-6">
            {horoscope?.nineBase?.bases ? (
              <>
                {/* Filters Row */}
                <CosmicCard hasGlow={false} className="p-4 border-gold-500/10">
                  <Text className="text-gold-500 text-[10px] uppercase tracking-widest font-bold mb-4 font-thai">
                    🎛️ ตัวกรองทับซ้อน (Overlay Filters)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2.5">
                      <FilterBadge label="วัยจร" active={showVayaJorn} onPress={() => setShowVayaJorn(!showVayaJorn)} color="#C6A96B" />
                      <FilterBadge label="ปีจร" active={showYearlyJorn} onPress={() => setShowYearlyJorn(!showYearlyJorn)} color="#4B6FAE" />
                      <FilterBadge label="เดือนจร" active={showMonthlyJorn} onPress={() => setShowMonthlyJorn(!showMonthlyJorn)} color="#FBBF24" />
                      <FilterBadge label="วันจร" active={showDailyJorn} onPress={() => setShowDailyJorn(!showDailyJorn)} color="#EF4444" />
                      <FilterBadge label="ลัคนากำเนิด" active={showNatalLagna} onPress={() => setShowNatalLagna(!showNatalLagna)} color="#C6A96B" />
                      <FilterBadge label="ลัคนาจร" active={showTransitLagna} onPress={() => setShowTransitLagna(!showTransitLagna)} color="#EF4444" />
                      <FilterBadge label="ทักษาจร" active={showTaksaJorn} onPress={() => setShowTaksaJorn(!showTaksaJorn)} color="#10B981" />
                      <FilterBadge label="มหาภูติจร" active={showMahaJorn} onPress={() => setShowMahaJorn(!showMahaJorn)} color="#8B5CF6" />
                    </View>
                  </ScrollView>
                </CosmicCard>

                {/* Fate Grid */}
                <CosmicCard hasGlow className="p-4 border-gold-500/20">
                  <Text className="text-gold-500 text-[10px] uppercase tracking-widest font-bold mb-4 font-thai">
                    🔮 ตารางเลข 7 ตัว 9 ฐานจักรพรรดิ
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="gap-3">
                      {horoscope.nineBase.bases.map((row: number[], rIdx: number) => (
                        <View key={rIdx} className={`flex-row items-center py-2 px-2 rounded-xl ${rIdx === 3 ? 'bg-gold-500/5 border-y border-gold-500/20' : ''}`}>
                          <View style={{ width: 85 }}>
                            <Text className="text-text-primary text-[11px] font-bold font-thai">{ROW_META[rIdx].label}</Text>
                            <Text className="text-text-muted text-[9px] font-thai uppercase tracking-tighter">{ROW_META[rIdx].sub}</Text>
                          </View>
                          {row.map((num: number, cIdx: number) => {
                            const isBase4 = rIdx === 3;
                            const getStarFromBase4 = (n: number): number => {
                              const mapping: Record<number, number> = { 6: 1, 15: 2, 8: 3, 4: 4, 11: 4, 17: 4, 5: 5, 14: 5, 18: 5, 19: 5, 16: 6, 21: 6, 7: 7, 10: 7, 20: 7, 12: 8 };
                              return mapping[n] || (n % 7 || 7);
                            };
                            const actualNum = isBase4 ? getStarFromBase4(num) : (num % 7 || 7);

                            // Highlights
                            const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
                            const isHighlighted = (hoverNum !== null && (isBase4 ? horoscope.nineBase.bases[2]?.[cIdx] === hoverNum : (actualNum === hoverNum && [0,1,2,7,8].includes(rIdx))));

                            // Overlays
                            const isRow012 = [0, 1, 2].includes(rIdx);
                            const isLagnaNatal = isRow012 && horoscope.lagna?.row === (rIdx + 1) && horoscope.lagna?.col === (cIdx + 1);
                            const isLagnaTransit = isRow012 && horoscope.lagnaTransit?.row === (rIdx + 1) && horoscope.lagnaTransit?.col === (cIdx + 1);
                            const isVayaJorn = isRow012 && horoscope.vayaJorn?.row === (rIdx + 1) && horoscope.vayaJorn?.col === (cIdx + 1);
                            const isYearlyJorn = isRow012 && horoscope.yearlyJorn?.row === (rIdx + 1) && horoscope.yearlyJorn?.col === (cIdx + 1);
                            const isMonthlyJorn = isRow012 && horoscope.monthlyJorn?.row === (rIdx + 1) && horoscope.monthlyJorn?.col === (cIdx + 1);
                            const isDailyJorn = isRow012 && horoscope.dailyJorn?.row === (rIdx + 1) && horoscope.dailyJorn?.col === (cIdx + 1);

                            // Indicators
                            const tBhop = isRow012 && horoscope.taksaTransit?.map?.[actualNum];
                            const mBhop = isRow012 && Object.entries(horoscope.mahaTransit?.map ?? {}).find(([_, v]) => v === actualNum)?.[0];

                            return (
                              <TouchableOpacity
                                key={cIdx}
                                className={`w-11 h-11 rounded-full mx-1 items-center justify-center border-2 relative shadow-md ${
                                  isSelected || isHighlighted
                                    ? 'bg-gold-500 border-text-primary'
                                    : 'bg-cosmic-950/60 border-gold-500/20'
                                }`}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setSelectedCell({ row: rIdx, col: cIdx, val: num });
                                  setHoverNum(actualNum === hoverNum ? null : actualNum);
                                }}
                              >
                                <Text className={`text-[17px] font-black ${isSelected || isHighlighted ? 'text-cosmic-950' : 'text-text-primary'}`}>
                                  {num}
                                </Text>

                                {/* Lagna Overlays */}
                                {showNatalLagna && isLagnaNatal && (
                                  <View className="absolute -bottom-1.5 -left-1 bg-gold-500 w-4 h-4 rounded-full items-center justify-center border border-cosmic-950">
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#020617' }}>ล</Text>
                                  </View>
                                )}
                                {showTransitLagna && isLagnaTransit && (
                                  <View className="absolute -bottom-1.5 -right-1 bg-rose-500 w-4 h-4 rounded-full items-center justify-center border border-cosmic-950">
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#fff' }}>ลจร</Text>
                                  </View>
                                )}

                                {/* Taksa & Maha Indicators */}
                                {showTaksaJorn && tBhop && (
                                  <View className="absolute -top-2.5 -right-2 bg-emerald-500/90 rounded px-1 border border-emerald-400">
                                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#fff' }}>
                                      {tBhop === 'ศรี' ? 'ศรี' : tBhop === 'กาลกิณี' ? 'กาลี' : tBhop}
                                    </Text>
                                  </View>
                                )}
                                {showMahaJorn && mBhop && (
                                  <View className="absolute -top-2.5 -left-2 bg-violet-600/90 rounded px-1 border border-violet-400">
                                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#fff' }}>
                                      {mBhop === 'โลกาวินาศ' ? 'วินาศ' : mBhop}
                                    </Text>
                                  </View>
                                )}

                                {/* Dot Indicators for transits */}
                                <View className="absolute -bottom-3 flex-row gap-0.5">
                                  {showVayaJorn && isVayaJorn && <View className="w-1.5 h-1.5 rounded-full bg-gold-500" />}
                                  {showYearlyJorn && isYearlyJorn && <View className="w-1.5 h-1.5 rounded-full bg-mystic-400" />}
                                  {showMonthlyJorn && isMonthlyJorn && <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                  {showDailyJorn && isDailyJorn && <View className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </CosmicCard>

                {/* Selected Cell details */}
                {selectedCell && (
                  <CosmicCard hasGlow={false} className="border-gold-500/30">
                    <Text className="text-gold-500 font-bold text-[10px] uppercase tracking-widest font-thai mb-2">
                      {ROW_META[selectedCell.row].label} ({ROW_META[selectedCell.row].sub}) · ช่องที่ {selectedCell.col + 1}
                    </Text>
                    {ROW_META[selectedCell.row].phopNames && (
                      <Text className="text-text-primary text-xl font-bold font-thai">
                        ภพเรือน: {ROW_META[selectedCell.row].phopNames[selectedCell.col]}
                      </Text>
                    )}
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="sparkles" size={14} color="#C6A96B" className="mr-2" />
                      <Text className="text-text-secondary text-sm font-thai">
                        ดาวครองเรือน: ดาว {selectedCell.val % 7 || 7} ({STAR_NAMES[(selectedCell.val % 7 || 7) as StarNumber]})
                      </Text>
                    </View>
                  </CosmicCard>
                )}

                {/* Summary age and transits */}
                <CosmicCard hasGlow={false} className="bg-mystic-500/5 border-mystic-500/20">
                  <View className="flex-row items-start">
                    <Ionicons name="navigate-circle" size={20} color="#6D8FC7" className="mr-3" />
                    <Text className="text-text-primary text-sm leading-[22px] font-thai flex-1">
                      ปัจจุบันอายุย่าง <Text className="font-bold text-gold-500">{horoscope.taksaTransit?.ageYang} ปี</Text> ปีจรตกภพ <Text className="font-bold text-gold-500">{horoscope.yearlyJorn?.phopName || '-'}</Text> ครองเรือนด้วยดาว <Text className="font-bold text-gold-500">{horoscope.yearlyJorn?.star || '-'}</Text>
                    </Text>
                  </View>
                </CosmicCard>
              </>
            ) : (
              <View className="py-20 items-center">
                <Text className="text-text-muted text-sm font-thai">ไม่พบข้อมูลคำนวณผังดวง</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Tab 2: ยามราหูค้นทรัพย์ ── */}
        {activeTab === 'rahu' && (
          <View className="gap-6">
            {rahuResult ? (
              <>
                {/* Active Rahu dial */}
                <CosmicCard hasGlow className="items-center border-gold-500/30 p-8">
                  <Text className="text-text-muted text-[10px] uppercase tracking-[3px] font-bold font-thai mb-3">
                    กระแสพลังยามราหูขณะนี้
                  </Text>
                  <Text className="text-text-primary text-4xl font-bold font-thai mb-4 tracking-wide">
                    ยาม{rahuResult.sub_block.name}
                  </Text>

                  {/* Verdict badge */}
                  <View className={`px-5 py-2 rounded-full border-2 mb-6 ${
                    rahuResult.is_current_moment_good
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : rahuResult.sub_block.is_good
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-rose-500/10 border-rose-500/40'
                  }`}>
                    <Text className={`text-xs font-bold font-thai uppercase tracking-widest ${
                      rahuResult.is_current_moment_good
                        ? 'text-emerald-400'
                        : rahuResult.sub_block.is_good
                          ? 'text-amber-400'
                          : 'text-rose-400'
                    }`}>
                      {rahuResult.summary.overall_verdict}
                    </Text>
                  </View>

                  <Text className="text-text-secondary text-sm text-center font-thai mb-8 leading-6 italic">
                    " {RAHU_ADVICE[rahuResult.sub_block.name] || rahuResult.summary.advice} "
                  </Text>

                  {/* Countdown Timer */}
                  <View className="bg-cosmic-950/80 border border-gold-500/20 rounded-2xl px-8 py-4 items-center">
                    <Text className="text-text-muted text-[9px] uppercase font-bold font-thai mb-1 tracking-widest">
                      ⏳ เวลาคงเหลือช่วงยามย่อย
                    </Text>
                    <Text className="text-gold-500 text-xl font-bold font-thai">
                      {rahuCountdown}
                    </Text>
                  </View>
                </CosmicCard>

                {/* Rahu Daily Schedule */}
                <CosmicCard hasGlow={false} className="border-gold-500/10 p-5">
                  <Text className="text-gold-500 text-[10px] uppercase tracking-widest font-bold mb-5 font-thai">
                    📅 ตารางยามย่อยในรอบปัจจุบัน ({horoscope?.atthakarn?.startTime || '-'} - {horoscope?.atthakarn?.endTime || '-'})
                  </Text>

                  <View className="gap-3">
                    {rahuScheduleList.map((item: any, idx: number) => {
                      const isCurrent = rahuResult.sub_block.name === item.name;
                      return (
                        <View
                          key={idx}
                          className={`flex-row justify-between items-center p-4 rounded-2xl border ${
                            isCurrent
                              ? 'bg-gold-500/10 border-gold-500/40'
                              : 'bg-cosmic-950/40 border-gold-500/5'
                          }`}
                        >
                          <View className="flex-row items-center gap-4">
                            <View className={`w-8 h-8 rounded-full items-center justify-center ${isCurrent ? 'bg-gold-500' : 'bg-cosmic-800'}`}>
                               <Text className={`text-[12px] font-bold ${isCurrent ? 'text-cosmic-950' : 'text-text-muted'}`}>{idx + 1}</Text>
                            </View>
                            <View>
                              <Text className={`text-sm font-bold font-thai ${isCurrent ? 'text-gold-500' : 'text-text-primary'}`}>
                                {item.name}
                              </Text>
                              <Text className="text-text-muted text-[10px] font-thai mt-0.5">
                                {item.timeRangeText}
                              </Text>
                            </View>
                          </View>
                          <View className={`px-3 py-1 rounded-full border ${
                            item.is_good
                              ? 'bg-emerald-500/10 border-emerald-500/20'
                              : 'bg-rose-500/10 border-rose-500/20'
                          }`}>
                            <Text className={`text-[9px] font-bold font-thai ${
                              item.is_good ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {item.is_good ? 'มงคล' : 'อุปสรรค'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </CosmicCard>
              </>
            ) : (
              <View className="py-20 items-center">
                <Text className="text-text-muted text-sm font-thai">ไม่มีพลังงานยามราหูพร้อมคำนวณในขณะนี้</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Tab 3: ข้อมูลชาตา ── */}
        {activeTab === 'info' && (
          <View className="gap-6">
            {/* ยามอัฏฐกาลปัจจุบัน */}
            <CosmicCard intensity={60} style={{ borderLeftWidth: 4, borderLeftColor: yam.color }}>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-text-muted text-[10px] uppercase tracking-widest font-thai">ยามอัฏฐกาลขณะนี้</Text>
                <View className="bg-gold-500/10 px-2 py-1 rounded-full border border-gold-500/20">
                  <Text className="text-[12px]">{yam.type === 'กลางวัน' ? '☀️' : '🌙'}</Text>
                </View>
              </View>
              <Text className="text-3xl font-bold font-thai mb-2" style={{ color: yam.color }}>{yam.name}</Text>
              <View className="flex-row items-center">
                <Ionicons name="star" size={12} color={yam.color} className="mr-2" />
                <Text className="text-text-secondary text-xs font-thai">อิทธิพลดาว {yam.star} ({yam.type})</Text>
              </View>
            </CosmicCard>

            {/* ดวงชะตาสรุป */}
            {horoscope && (
              <CosmicCard hasGlow={false} className="border-mystic-500/20">
                <Text className="text-mystic-400 text-[10px] font-bold uppercase tracking-widest mb-4 font-thai">
                  ✦ สรุปชะตาชีวิตจร
                </Text>
                <View className="gap-y-4">
                  <SummaryRow label="อายุย่าง" value={`${horoscope.taksaTransit?.ageYang} ปี`} color="#C6A96B" />
                  <SummaryRow label="ลัคนากำเนิด" value={`ดาว ${horoscope.lagna?.star}`} />
                  <SummaryRow label="ลัคนาจรปีนี้" value={`ดาว ${horoscope.lagnaTransit?.star}`} color="#FB7185" />
                </View>
              </CosmicCard>
            )}

            {/* ข้อมูลชาตาพื้นฐาน */}
            <CosmicCard hasGlow={false} className="border-gold-500/10">
              <Text className="text-text-primary text-[15px] font-bold mb-4 font-thai">✦ ข้อมูลชาตากำเนิด</Text>
              <InfoRow icon="person-outline" label="ชื่อ" value={profile?.display_name || '-'} />
              <InfoRow icon="calendar-outline" label="วันเกิด" value={
                profile?.birth_date
                  ? new Date(profile.birth_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '-'
              } />
              <InfoRow icon="star-outline" label="ปีเกิด (พ.ศ.)" value={birthYearBE ? String(birthYearBE) : '-'} />
              <InfoRow icon="time-outline" label="เวลาเกิด" value={profile?.birth_time || '-'} />
              <InfoRow icon="location-outline" label="จังหวัดเกิด" value={profile?.birth_place || '-'} />
            </CosmicCard>

            {/* แพ็กเกจ */}
            <View className="flex-row justify-between items-center px-2">
              <View className={`px-5 py-2 rounded-full border-2 ${
                profile?.plan === 'imperial'
                  ? 'bg-gold-500/10 border-gold-500/40'
                  : 'bg-emerald-500/10 border-emerald-500/40'
              }`}>
                <Text className={`text-[11px] font-bold font-thai tracking-widest ${
                  profile?.plan === 'imperial' ? 'text-gold-500' : 'text-emerald-400'
                }`}>
                  ✦ {(profile?.plan || 'basic').toUpperCase()}
                </Text>
              </View>
              <View className="flex-row items-center">
                 <View className="w-2 h-2 rounded-full bg-success mr-2 shadow shadow-success" />
                 <Text className="text-success text-xs font-thai font-bold uppercase tracking-tighter">
                   {profile?.membership_status === 'active' ? 'Active' : 'Pending'}
                 </Text>
              </View>
            </View>
          </View>
        )}

        {/* รายงาน AI ล่าสุด */}
        {reports.length > 0 && (
          <View className="mt-10 mb-8">
            <Text className="text-text-primary text-[17px] font-bold mb-5 font-thai ml-1">◈ รายงาน AI ล่าสุด</Text>
            <CosmicCard hasGlow={false} className="p-0 border-gold-500/10">
              {reports.map((r, index) => (
                <TouchableOpacity 
                  key={r.id} 
                  className={`flex-row justify-between items-center p-5 ${index < reports.length - 1 ? 'border-b border-gold-500/5' : ''}`}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-mystic-500/10 rounded-xl items-center justify-center mr-4">
                       <Ionicons name="document-text-outline" size={20} color="#6D8FC7" />
                    </View>
                    <Text className="text-text-primary text-sm font-thai">{REPORT_LABELS[r.report_type] || r.report_type}</Text>
                  </View>
                  <Text className="text-text-muted text-xs font-thai">
                    {new Date(r.created_at).toLocaleDateString('th-TH')}
                  </Text>
                </TouchableOpacity>
              ))}
            </CosmicCard>
          </View>
        )}

      </View>
    </CosmicLayout>
  );
}

// ─── Child Components ────────────────────────────────────────────────────────

function TabItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      className={`flex-1 items-center py-3 rounded-xl ${active ? 'bg-gold-500' : 'bg-transparent'}`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className={`text-[11px] font-bold font-thai tracking-wider ${active ? 'text-cosmic-950' : 'text-text-muted'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FilterBadge({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      className={`px-4 py-2 rounded-full border-2 flex-row items-center gap-2 ${
        active ? 'bg-gold-500/10 border-gold-500/40' : 'bg-cosmic-950/40 border-gold-500/5'
      }`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? color : '#94A3B8' }} />
      <Text className={`text-[11px] font-bold font-thai ${active ? 'text-text-primary' : 'text-text-muted'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value, color }: { label: string, value: string, color?: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-text-muted text-xs font-thai">{label}</Text>
      <Text className="text-xs font-bold font-thai" style={{ color: color || '#F8F6F1' }}>{value}</Text>
    </View>
  );
}

const REPORT_LABELS: Record<string, string> = {
  life_overview: '☽ ภาพรวมชีวิต',
  yearly_forecast: '⟁ พยากรณ์รายปี',
  relationship: '♡ ความสัมพันธ์',
  career: '✦ การงาน-การเงิน',
  health: '◈ สุขภาพ',
  monthly_forecast: '◐ พยากรณ์รายเดือน',
};

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-4 border-b border-gold-500/5">
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-lg bg-gold-500/5 items-center justify-center">
           <Ionicons name={icon} size={16} color="#C6A96B" />
        </View>
        <Text className="text-text-muted text-xs font-thai">{label}</Text>
      </View>
      <Text className="text-text-primary text-xs font-semibold max-w-[55%] text-right font-thai" numberOfLines={1}>{value}</Text>
    </View>
  );
}
