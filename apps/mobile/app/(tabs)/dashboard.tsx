import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
  StyleSheet
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#C9A96E"
          />
        }
      >
        {/* Date Header */}
        <Text className="text-[#8A8070] text-[13px] mb-4 text-center font-thai">{dateStr}</Text>

        {/* Tab Selector */}
        <View className="flex-row justify-between mb-6 bg-[#0a2240]/45 p-1 rounded-2xl border border-white/5">
          <TouchableOpacity
            className={`flex-1 items-center py-2.5 rounded-xl ${activeTab === 'chart' ? 'bg-[#C6A96B]' : ''}`}
            onPress={() => setActiveTab('chart')}
          >
            <Text className={`text-xs font-bold font-thai ${activeTab === 'chart' ? 'text-[#020617]' : 'text-[#8A8070]'}`}>
              ผังดวงจักรพรรดิ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 items-center py-2.5 rounded-xl ${activeTab === 'rahu' ? 'bg-[#C6A96B]' : ''}`}
            onPress={() => setActiveTab('rahu')}
          >
            <Text className={`text-xs font-bold font-thai ${activeTab === 'rahu' ? 'text-[#020617]' : 'text-[#8A8070]'}`}>
              ยามราหูค้นทรัพย์
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 items-center py-2.5 rounded-xl ${activeTab === 'info' ? 'bg-[#C6A96B]' : ''}`}
            onPress={() => setActiveTab('info')}
          >
            <Text className={`text-xs font-bold font-thai ${activeTab === 'info' ? 'text-[#020617]' : 'text-[#8A8070]'}`}>
              ข้อมูลชาตา
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab 1: ผังดวงจักรพรรดิ ── */}
        {activeTab === 'chart' && (
          <View className="gap-5">
            {horoscope?.nineBase?.bases ? (
              <>
                {/* Filters Row */}
                <View className="bg-[#0a2240]/45 border border-white/5 rounded-2xl p-4">
                  <Text className="text-[#C6A96B] text-[10px] uppercase tracking-widest font-bold mb-3 font-thai">
                    🎛️ ตัวกรองทับซ้อน (Overlay Filters)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
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
                </View>

                {/* Fate Grid */}
                <View className="bg-[#0a2240]/45 border border-white/5 rounded-2xl p-4">
                  <Text className="text-[#C6A96B] text-[10px] uppercase tracking-widest font-bold mb-3 font-thai">
                    🔮 ตารางเลข 7 ตัว 9 ฐาน
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="gap-2.5">
                      {horoscope.nineBase.bases.map((row: number[], rIdx: number) => (
                        <View key={rIdx} className={`flex-row items-center py-1.5 px-2 rounded-lg ${rIdx === 3 ? 'bg-[#4B6FAE]/15 border-y border-[#4B6FAE]/30' : ''}`}>
                          <View style={{ width: 85 }}>
                            <Text className="text-[#F8F6F1] text-[12px] font-bold font-thai">{ROW_META[rIdx].label}</Text>
                            <Text className="text-[#8A8070] text-[9px] font-thai">{ROW_META[rIdx].sub}</Text>
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
                                className={`w-10 h-10 rounded-full mx-1 items-center justify-center border relative ${
                                  isSelected || isHighlighted
                                    ? 'bg-[#C6A96B] border-[#F8F6F1]'
                                    : 'bg-[#0a2240]/45 border-[#C6A96B]/30'
                                }`}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setSelectedCell({ row: rIdx, col: cIdx, val: num });
                                  setHoverNum(actualNum === hoverNum ? null : actualNum);
                                }}
                              >
                                <Text className={`text-[15px] font-black ${isSelected || isHighlighted ? 'text-[#020617]' : 'text-[#F8F6F1]'}`}>
                                  {num}
                                </Text>

                                {/* Lagna Overlays */}
                                {showNatalLagna && isLagnaNatal && (
                                  <View className="absolute -bottom-1 -left-1.5 bg-[#C6A96B] px-1 rounded-full border border-black/40">
                                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#020617' }}>ล</Text>
                                  </View>
                                )}
                                {showTransitLagna && isLagnaTransit && (
                                  <View className="absolute -bottom-1 -right-1.5 bg-red-500 px-1 rounded-full border border-red-400">
                                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#F8F6F1' }}>ลอ</Text>
                                  </View>
                                )}

                                {/* Taksa & Maha Indicators */}
                                {showTaksaJorn && tBhop && (
                                  <View className="absolute -top-2.5 -right-2 bg-emerald-500 rounded-md px-1 border border-emerald-400">
                                    <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#fff' }}>
                                      {tBhop === 'ศรี' ? 'ศรี' : tBhop === 'กาลกิณี' ? 'กาลี' : tBhop}
                                    </Text>
                                  </View>
                                )}
                                {showMahaJorn && mBhop && (
                                  <View className="absolute -top-2.5 -left-2 bg-violet-600 rounded-md px-1 border border-violet-400">
                                    <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#fff' }}>
                                      {mBhop === 'โลกาวินาศ' ? 'วินาศ' : mBhop}
                                    </Text>
                                  </View>
                                )}

                                {/* Dot Indicators for transits */}
                                <View className="absolute -bottom-2 flex-row gap-0.5">
                                  {showVayaJorn && isVayaJorn && <View className="w-1.5 h-1.5 rounded-full bg-[#C6A96B]" />}
                                  {showYearlyJorn && isYearlyJorn && <View className="w-1.5 h-1.5 rounded-full bg-[#4B6FAE]" />}
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
                </View>

                {/* Selected Cell details */}
                {selectedCell && (
                  <View className="bg-[#0a2240]/60 border border-[#C6A96B]/30 rounded-2xl p-4">
                    <Text className="text-[#C6A96B] font-bold text-xs uppercase tracking-wider font-thai">
                      {ROW_META[selectedCell.row].label} ({ROW_META[selectedCell.row].sub}) · ช่องที่ {selectedCell.col + 1}
                    </Text>
                    {ROW_META[selectedCell.row].phopNames && (
                      <Text className="text-[#F8F6F1] text-base font-bold mt-1 font-thai">
                        ภพเรือน: {ROW_META[selectedCell.row].phopNames[selectedCell.col]}
                      </Text>
                    )}
                    <Text className="text-[#F8F6F1] text-sm mt-1 font-thai">
                      ดาวครองเรือน: ดาว {selectedCell.val % 7 || 7} ({STAR_NAMES[(selectedCell.val % 7 || 7) as StarNumber]})
                    </Text>
                  </View>
                )}

                {/* Summary age and transits */}
                <View className="bg-[#0a2240]/40 border border-white/5 rounded-2xl p-5">
                  <Text className="text-[#F8F6F1] text-[13px] leading-[22px] font-thai">
                    ✨ ปัจจุบันอายุย่าง <Text className="font-bold text-[#C6A96B]">{horoscope.taksaTransit?.ageYang} ปี</Text> ปีจรตกภพ <Text className="font-bold text-[#C6A96B]">{horoscope.yearlyJorn?.phopName || '-'}</Text> ครองเรือนด้วยดาว <Text className="font-bold text-[#C6A96B]">{horoscope.yearlyJorn?.star || '-'}</Text>
                  </Text>
                </View>
              </>
            ) : (
              <View className="py-12 items-center">
                <Text className="text-[#8A8070] text-sm font-thai">ไม่พบข้อมูลคำนวณผังดวง</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Tab 2: ยามราหูค้นทรัพย์ ── */}
        {activeTab === 'rahu' && (
          <View className="gap-5">
            {rahuResult ? (
              <>
                {/* Active Rahu dial */}
                <View className="bg-[#0a2240]/60 border border-[#C6A96B]/30 rounded-3xl p-6 items-center relative overflow-hidden">
                  <View className="absolute top-0 right-0 w-32 h-32 bg-[#C6A96B]/5 rounded-full blur-3xl -z-10" />
                  
                  <Text className="text-[#8A8070] text-[11px] uppercase tracking-widest font-bold font-thai mb-2">
                    กระแสพลังยามราหูขณะนี้
                  </Text>
                  <Text className="text-[#F8F6F1] text-[34px] font-bold font-thai mb-3">
                    ยาม{rahuResult.sub_block.name}
                  </Text>

                  {/* Verdict badge */}
                  <View className={`px-4 py-2 rounded-full border mb-4 ${
                    rahuResult.is_current_moment_good
                      ? 'bg-emerald-500/15 border-emerald-500/40'
                      : rahuResult.sub_block.is_good
                        ? 'bg-amber-500/15 border-amber-500/40'
                        : 'bg-rose-500/15 border-rose-500/40'
                  }`}>
                    <Text className={`text-xs font-bold font-thai ${
                      rahuResult.is_current_moment_good
                        ? 'text-emerald-400'
                        : rahuResult.sub_block.is_good
                          ? 'text-amber-400'
                          : 'text-rose-400'
                    }`}>
                      {rahuResult.summary.overall_verdict}
                    </Text>
                  </View>

                  <Text className="text-[#F8F6F1] text-[13px] text-center font-thai mb-5">
                    💡 คำแนะนำ: {RAHU_ADVICE[rahuResult.sub_block.name] || rahuResult.summary.advice}
                  </Text>

                  {/* Countdown Timer */}
                  <View className="bg-[#020617]/80 border border-[#C6A96B]/20 rounded-2xl px-6 py-3 items-center">
                    <Text className="text-[#8A8070] text-[10px] uppercase font-bold font-thai mb-1">
                      ⏳ เวลาคงเหลือช่วงยามย่อย
                    </Text>
                    <Text className="text-[#C6A96B] text-lg font-bold font-thai">
                      {rahuCountdown}
                    </Text>
                  </View>
                </View>

                {/* Rahu Daily Schedule */}
                <View className="bg-[#0a2240]/45 border border-white/5 rounded-2xl p-5">
                  <Text className="text-[#C6A96B] text-xs uppercase tracking-widest font-bold mb-4 font-thai">
                    📅 ตารางยามย่อยในรอบปัจจุบัน ({horoscope?.atthakarn?.startTime || '-'} - {horoscope?.atthakarn?.endTime || '-'})
                  </Text>

                  <View className="gap-2">
                    {rahuScheduleList.map((item: any, idx: number) => {
                      const isCurrent = rahuResult.sub_block.name === item.name;
                      return (
                        <View
                          key={idx}
                          className={`flex-row justify-between items-center p-3 rounded-xl border ${
                            isCurrent
                              ? 'bg-[#C6A96B]/15 border-[#C6A96B] shadow-lg'
                              : 'bg-[#020617]/40 border-white/5'
                          }`}
                        >
                          <View className="flex-row items-center gap-3">
                            <Text className={`text-sm font-bold font-thai ${isCurrent ? 'text-[#C6A96B]' : 'text-[#F8F6F1]'}`}>
                              {idx + 1}. {item.name}
                            </Text>
                            <Text className="text-[#8A8070] text-xs font-thai">
                              {item.timeRangeText}
                            </Text>
                          </View>
                          <View className={`px-2.5 py-0.5 rounded-full border ${
                            item.is_good
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-rose-500/10 border-rose-500/30'
                          }`}>
                            <Text className={`text-[10px] font-bold font-thai ${
                              item.is_good ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {item.is_good ? 'มงคล' : 'อุปสรรค'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : (
              <View className="py-12 items-center">
                <Text className="text-[#8A8070] text-sm font-thai">ไม่มีพลังงานยามราหูพร้อมคำนวณในขณะนี้</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Tab 3: ข้อมูลชาตา ── */}
        {activeTab === 'info' && (
          <View className="gap-5">
            {/* ยามอัฏฐกาลปัจจุบัน */}
            <View style={[styles.yamCard, { borderColor: yam.color + '40', overflow: 'hidden' }]}>
              <LinearGradient
                colors={['rgba(10,34,64,0.6)', 'rgba(2,6,23,0.9)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.yamHeader}>
                <Text style={styles.yamLabel}>ยามอัฏฐกาลขณะนี้</Text>
                <View style={[styles.yamBadge, { backgroundColor: yam.color + '20' }]}>
                  <Text style={[styles.yamBadgeText, { color: yam.color }]}>
                    {yam.type === 'กลางวัน' ? '☀️' : '🌙'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.yamName, { color: yam.color }]}>{yam.name}</Text>
              <Text style={styles.yamRemaining}>⏳ อิทธิพลดาว {yam.star} ({yam.type})</Text>
            </View>

            {/* ดวงชะตาสรุป */}
            {horoscope && (
              <View className="bg-[#0a2240]/40 border border-[#C6A96B]/25 rounded-2xl overflow-hidden mb-2">
                <Text className="text-[#C6A96B] text-xs font-bold uppercase tracking-widest px-4 pt-4 pb-2 font-thai">
                  ✦ สรุปชะตาชีวิตจร
                </Text>
                <View className="px-4 pb-4">
                  <View className="flex-row justify-between py-2 border-b border-white/5">
                    <Text className="text-[#8A8070] text-xs font-thai">อายุย่าง</Text>
                    <Text className="text-[#C6A96B] text-xs font-bold font-thai">{horoscope.taksaTransit?.ageYang} ปี</Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-b border-white/5">
                    <Text className="text-[#8A8070] text-xs font-thai">ลัคนากำเนิด</Text>
                    <Text className="text-[#F8F6F1] text-xs font-thai">ดาว {horoscope.lagna?.star}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-[#8A8070] text-xs font-thai">ลัคนาจรปีนี้</Text>
                    <Text className="text-red-400 text-xs font-thai">ดาว {horoscope.lagnaTransit?.star}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ข้อมูลชาตาพื้นฐาน */}
            <View className="bg-[#0a2240]/40 border border-white/5 rounded-2xl p-4">
              <Text className="text-[#F8F6F1] text-[15px] font-bold mb-4 font-thai">✦ ข้อมูลชาตากำเนิด</Text>
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
            <View className="flex-row justify-between items-center mt-2 px-2">
              <View className={`px-4 py-2 rounded-full border ${
                profile?.plan === 'imperial'
                  ? 'bg-[#C6A96B]/10 border-[#C6A96B]/40'
                  : 'bg-emerald-500/10 border-emerald-500/40'
              }`}>
                <Text className={`text-xs font-bold font-thai ${
                  profile?.plan === 'imperial' ? 'text-[#C6A96B]' : 'text-emerald-400'
                }`}>
                  ✦ {(profile?.plan || 'basic').toUpperCase()}
                </Text>
              </View>
              <Text className="text-success text-xs font-thai font-bold">
                {profile?.membership_status === 'active' ? '● Active' : '⏳ Pending'}
              </Text>
            </View>
          </View>
        )}

        {/* รายงาน AI ล่าสุด */}
        {reports.length > 0 && (
          <View className="mt-8">
            <Text className="text-[#F8F6F1] text-[15px] font-bold mb-4 font-thai">◈ รายงาน AI ล่าสุด</Text>
            <View className="bg-[#0a2240]/40 border border-white/5 rounded-2xl overflow-hidden">
              {reports.map((r, index) => (
                <View key={r.id} className={`flex-row justify-between p-4 ${index < reports.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <Text className="text-[#F8F6F1] text-xs font-thai">{REPORT_LABELS[r.report_type] || r.report_type}</Text>
                  <Text className="text-[#8A8070] text-xs font-thai">
                    {new Date(r.created_at).toLocaleDateString('th-TH')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Child Components ────────────────────────────────────────────────────────

function FilterBadge({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1.5 ${
        active ? 'bg-white/5 border-white/20' : 'bg-transparent border-white/5'
      }`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? color : '#8A8070' }} />
      <Text className={`text-xs font-bold font-thai ${active ? 'text-[#F8F6F1]' : 'text-[#8A8070]'}`}>
        {label}
      </Text>
    </TouchableOpacity>
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
    <View className="flex-row justify-between items-center py-3.5 border-b border-white/5">
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={18} color="#8A8070" />
        <Text className="text-[#8A8070] text-xs font-thai">{label}</Text>
      </View>
      <Text className="text-[#F8F6F1] text-xs font-semibold max-w-[55%] text-right font-thai" numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  yamCard: {
    backgroundColor: '#0a2240/60',
    borderWidth: 1,
    borderColor: '#C6A96B/30',
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  yamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  yamLabel: { color: '#8A8070', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  yamBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  yamBadgeText: { fontSize: 11, fontWeight: 'bold' },
  yamName: { fontSize: 28, fontWeight: 'bold', marginBottom: 6 },
  yamRemaining: { color: '#8A8070', fontSize: 12 },
});
