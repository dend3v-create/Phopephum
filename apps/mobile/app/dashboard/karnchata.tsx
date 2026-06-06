import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import {
  calculateKarnchata,
  calculatePhopephum
} from '@phopephum/engine';
import { STAR_NAMES } from '@phopephum/types';

// ─── Constants & Styling Constants ───────────────────────────────────────────
const THEME = {
  bg: '#020617',
  gold: '#C6A96B',
  mystic: '#4B6FAE',
  text: '#F8F6F1',
  textMuted: '#8A8070',
  cardBg: 'rgba(10, 34, 64, 0.6)',
  border: 'rgba(198, 169, 107, 0.2)',
  inputBg: 'rgba(15, 23, 42, 0.8)'
};

const CATEGORIES = [
  { id: "work", icon: "💼", label: "การงาน & เจรจา", questions: ["การเจรจาตกลงทางธุรกิจในยามนี้จะประสบความสำเร็จหรือไม่?", "สภาพแวดล้อมหรือโอกาสความก้าวหน้าในยามนี้มีลักษณะอย่างไร?", "อยากเริ่มต้นโครงการงานใหม่ในนาทีนี้ควรทำทันทีหรือควรรอ?"] },
  { id: "wealth", icon: "💎", label: "การเงิน & โชคลาภ", questions: ["จังหวะนี้เหมาะกับการเสี่ยงโชคหรือลงทุนหรือไม่?", "เงินที่รอคอยอยู่จะได้รับภายในระยะเวลาอันใกล้นี้ไหม?", "ควรระมัดระวังการใช้จ่ายหรือจะเสียทรัพย์ในยามนี้หรือไม่?"] },
  { id: "love", icon: "💖", label: "ความรัก & เมตตา", questions: ["คนที่นึกถึงตอนนี้เขามีความรู้สึกอย่างไรกับเรา?", "การปรับความเข้าใจหรือสารภาพรักในเวลานี้จะราบรื่นไหม?", "ผู้ใหญ่หรือผู้บังคับบัญชาจะเมตตาเอ็นดูเราหรือไม่ในจังหวะนี้?"] },
  { id: "health", icon: "💊", label: "สุขภาพ & เจ็บไข้", questions: ["อาการป่วยที่เป็นอยู่จะทุเลาลงหรือต้องระวังภาวะแทรกซ้อน?", "ควรไปพบแพทย์หรือเปลี่ยนวิธีการรักษาในเวลานี้หรือไม่?", "คนป่วยที่นึกถึงมีเกณฑ์ฟื้นตัวในทิศทางใด?"] },
  { id: "travel", icon: "🧭", label: "การเดินทาง & ทิศมงคล", questions: ["การเดินทางไปทิศ...ในยามนี้จะปลอดภัยและราบรื่นไหม?", "ควรหลีกเลี่ยงการเดินทางไปยังทิศใดเพื่อป้องกันอุปสรรค?", "จะพบโชคลาภหรือคนช่วยเหลือระหว่างการเดินทางหรือไม่?"] },
  { id: "obstacle", icon: "⚠️", label: "อุปสรรค & แก้เคล็ด", questions: ["ปัญหาที่กำลังเผชิญหน้าอยู่จะมีทางออกหรือมีคนช่วยไหม?", "มีสิ่งใดที่กำลังขัดขวางความสำเร็จและควรแก้เคล็ดอย่างไร?", "ของที่สูญหายจะได้คืนหรือไม่ หรือควรค้นหาในทิศใด?"] },
];

const TAKSA_DIRECTIONS = [
  { id: 3, name: "ตะวันออกเฉียงใต้", star: "อังคาร" },
  { id: 1, name: "ตะวันออกเฉียงเหนือ", star: "อาทิตย์" },
  { id: 2, name: "ตะวันออก", star: "จันทร์" },
  { id: 6, name: "ทิศเหนือ", star: "ศุกร์" },
  { id: 9, name: "ตรงกลาง", star: "เกตุ" },
  { id: 4, name: "ทิศใต้", star: "พุธ" },
  { id: 8, name: "ตะวันตกเฉียงเหนือ", star: "ราหู" },
  { id: 5, name: "ทิศตะวันตก", star: "พฤหัส" },
  { id: 7, name: "ตะวันตกเฉียงใต้", star: "เสาร์" },
];

const BASE4_NAMES = ["มหาอุตจ์", "โสฬสมงคล", "พฤหัสบดีเล็ก", "อังคารใหญ่", "ราชาโชค", "จักรพรรดิ", "มหาสิทธิโชค"];

const ROW_META = [
  { label: "ฐาน ๑", sub: "วันเกิด" },
  { label: "ฐาน ๒", sub: "เดือนเกิด" },
  { label: "ฐาน ๓", sub: "ปีเกิด" },
  { label: "ฐาน ๔", sub: "มหาจักร" },
  { label: "ฐาน ๕", sub: "มหาภูติ" },
  { label: "ฐาน ๖", sub: "กำลังพระเคราะห์" },
  { label: "ฐาน ๗", sub: "กำลังพระเคราะห์" },
  { label: "ฐาน ๘", sub: "อาตมะ" },
  { label: "ฐาน ๙", sub: "ภริยัง" }
];

export default function KarnchataScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [timeMode, setTimeMode] = useState<"live" | "custom">("live");
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("12:00");
  const [hoverNum, setHoverNum] = useState<number | null>(null);
  
  // Real-time states
  const [now, setNow] = useState(new Date());
  
  // Selection States
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; val: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("work");

  // Chat States
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "สวัสดีครับ ยินดีต้อนรับสู่กาลชะตาพยากรณ์ ผมคือ Wisdom Guidance พร้อมร่วมวิเคราะห์และชี้แนะแนวทางให้กับท่านด้วยศาสตร์ดาราคณิตและกาลชะตาเรียลไทม์แล้วครับ ท่านอยากจะตรวจสอบเรื่องใดในขณะนี้หรือไม่ครับ?" }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Fetch Profile on load
  useEffect(() => {
    fetchProfile();
    const todayStr = new Date().toISOString().split('T')[0];
    setCustomDate(todayStr);
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
  }

  // Ticking and refreshing the calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute base date and calculations
  const targetDate = useMemo(() => {
    if (timeMode === "live") {
      return now;
    } else {
      try {
        const [year, month, day] = customDate.split('-').map(Number);
        const [h, m] = customTime.split(':').map(Number);
        if (year && month && day) {
          // Local timezone date construction
          return new Date(year, month - 1, day, h, m, 0);
        }
      } catch (e) {}
      return now;
    }
  }, [timeMode, now, customDate, customTime]);

  const karnchataResult = useMemo(() => {
    return calculateKarnchata(targetDate);
  }, [targetDate]);

  const phopephumResult = useMemo(() => {
    if (!profile?.birth_date) return null;
    try {
      return calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, targetDate);
    } catch (e) {
      return null;
    }
  }, [profile, targetDate]);

  const activeCategory = useMemo(() => {
    return CATEGORIES.find(c => c.id === selectedCategory);
  }, [selectedCategory]);

  const formatDateThai = (date: Date) => {
    return date.toLocaleDateString("th-TH", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  };

  const getBhopName = (rowIdx: number, colIdx: number) => {
    const ROW_NAMES = [
      ["อัตตะ", "หินะ", "ธะนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
      ["ตนุ", "กดุมภะ", "สหัสชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
      ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"]
    ];
    if (rowIdx < 3) return ROW_NAMES[rowIdx][colIdx];
    return "";
  };

  // Chat logic
  const handleSendChat = async (qText: string) => {
    if (!qText.trim() || isAiLoading) return;

    setChatMessages(prev => [...prev, { sender: "user", text: qText }]);
    setUserInput("");
    setIsAiLoading(true);

    // Temp AI response
    setChatMessages(prev => [...prev, { sender: "ai", text: "กำลังถอดรหัสดาวกาลชะตา..." }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const bodyData = new FormData();
      bodyData.append("question", qText);
      bodyData.append("category", activeCategory?.label || "ทั่วไป");
      bodyData.append("targetDate", targetDate.toISOString());

      const response = await fetch("https://phopephum.com/api/karnchata-chat", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: bodyData,
      });

      if (!response.ok) throw new Error("API Error");

      // Handle streaming/non-streaming response
      const rawText = await response.text();
      let aiText = "";

      const lines = rawText.split("\n");
      for (const line of lines) {
        if (line.trim().startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) aiText += parsed.text;
          } catch (e) {}
        }
      }

      if (!aiText) {
        // Fallback to raw response text if SSE parse yielded nothing
        aiText = rawText || "ไม่พบคำตอบ";
      }

      setChatMessages(prev => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { sender: "ai", text: aiText };
        return newArr;
      });

    } catch (e) {
      setChatMessages(prev => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { sender: "ai", text: "ขออภัยครับ การเชื่อมต่อแชทระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" };
        return newArr;
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          
          {/* Header info */}
          <View style={styles.dateHeader}>
            <Text style={styles.dateTitle}>{formatDateThai(targetDate)}</Text>
            <Text style={styles.dateSub}>ศาสตร์วิเคราะห์กาลชะตาเพื่อหาคำตอบของเวลา</Text>
          </View>

          {/* ── TIME MODE SELECTOR ── */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, timeMode === "live" && styles.toggleBtnActive]}
              onPress={() => setTimeMode("live")}
            >
              <Text style={[styles.toggleText, timeMode === "live" && styles.toggleTextActive]}>⏰ เวลาเรียลไทม์</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, timeMode === "custom" && styles.toggleBtnActive]}
              onPress={() => setTimeMode("custom")}
            >
              <Text style={[styles.toggleText, timeMode === "custom" && styles.toggleTextActive]}>📅 เลือกเวลาเอง</Text>
            </TouchableOpacity>
          </View>

          {/* Custom Date/Time inputs */}
          {timeMode === "custom" && (
            <View style={styles.customInputRow}>
              <View className="flex-1">
                <Text style={styles.inputLabel}>วันที่ (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="2026-06-07"
                  placeholderTextColor="#4b5563"
                />
              </View>
              <View style={{ width: 100 }}>
                <Text style={styles.inputLabel}>เวลา (HH:MM)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customTime}
                  onChangeText={setCustomTime}
                  placeholder="12:00"
                  placeholderTextColor="#4b5563"
                />
              </View>
            </View>
          )}

          {/* ── TIME DISPLAY WIDGET ── */}
          <View style={styles.timeCard}>
            <LinearGradient
              colors={['rgba(75, 110, 174, 0.2)', 'rgba(2, 6, 23, 0.95)']}
              style={StyleSheet.absoluteFill}
            />
            <View className="items-center">
              <Text style={styles.timeLabelText}>เวลา ณ จุดทำนายกาลชะตา</Text>
              <Text style={styles.clockText}>
                {targetDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </Text>
              <View style={styles.yamLabelRow}>
                <View style={styles.yamBadge}>
                  <Text style={styles.yamBadgeLabel}>ยามใหญ่ (ตนุ)</Text>
                  <Text style={styles.yamBadgeVal}>{karnchataResult.yamYaiName}</Text>
                </View>
                <View style={styles.yamBadge}>
                  <Text style={styles.yamBadgeLabel}>ยามซอย (อัตตะ)</Text>
                  <Text style={styles.yamBadgeVal}>{karnchataResult.yamSoyName}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── TOPIC SCORE WIDGETS ── */}
          <View style={styles.scoreGrid}>
            {[
              { label: "เจรจา/ค้าขาย", score: 70, color: THEME.gold },
              { label: "ความรัก/เมตตา", score: 98, color: '#F472B6' },
              { label: "โชคลาภ/การเงิน", score: 80, color: '#34D399' },
              { label: "ระดับการเตือนภัย", score: 8, color: THEME.mystic },
            ].map((item, idx) => (
              <View key={idx} style={styles.scoreItemCard}>
                <Text style={styles.scoreItemLabel}>{item.label}</Text>
                <Text style={[styles.scoreItemVal, { color: item.color }]}>{item.score}%</Text>
                <View style={[styles.scoreLine, { backgroundColor: item.color }]} />
              </View>
            ))}
          </View>

          {/* ── 9-BASES FATE MATRIX (Scrollable) ── */}
          <Text style={styles.sectionTitle}>🔮 ผังดวงกาลชะตา 7 ตัว 9 ฐาน</Text>
          <View style={styles.matrixCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.matrixContainer}>
                {karnchataResult.chart.map((row: number[], rIdx: number) => {
                  const isBase4 = rIdx === 3;
                  return (
                    <View key={rIdx} style={styles.matrixRow}>
                      <View style={styles.rowLabelBlock}>
                        <Text style={styles.rowLabelText}>{ROW_META[rIdx].label}</Text>
                        <Text style={styles.rowLabelSub}>{ROW_META[rIdx].sub}</Text>
                      </View>
                      
                      {row.map((star: number, cIdx: number) => {
                        const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
                        const isHighlighted = hoverNum !== null && star === hoverNum;

                        return (
                          <TouchableOpacity
                            key={cIdx}
                            style={[
                              styles.cellCircle,
                              isBase4 && styles.cellCircleBase4,
                              (isSelected || isHighlighted) && styles.cellCircleActive
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              setSelectedCell({ row: rIdx, col: cIdx, val: star });
                              setHoverNum(hoverNum === star ? null : star);
                            }}
                          >
                            <Text style={[
                              styles.cellCircleText,
                              isBase4 && { color: THEME.mystic },
                              (isSelected || isHighlighted) && { color: THEME.bg, fontWeight: 'bold' }
                            ]}>
                              {star}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Selected Cell details */}
          {selectedCell && (
            <View style={styles.cellDetailCard}>
              <Text style={styles.cellDetailHeader}>
                {ROW_META[selectedCell.row].label} ({ROW_META[selectedCell.row].sub}) · ลำดับช่องที่ {selectedCell.col + 1}
              </Text>
              {selectedCell.row < 3 && (
                <Text style={styles.cellDetailText}>
                  ภพเรือนชะตา: {getBhopName(selectedCell.row, selectedCell.col)}
                </Text>
              )}
              {selectedCell.row === 3 && (
                <Text style={styles.cellDetailText}>
                  ฐานกำลังจักรรองรับ: {BASE4_NAMES[selectedCell.col]}
                </Text>
              )}
              <Text style={styles.cellDetailText}>
                ดาวครองเรือน: ดาว {selectedCell.val % 7 || 7} ({STAR_NAMES[(selectedCell.val % 7 || 7) as keyof typeof STAR_NAMES]})
              </Text>
            </View>
          )}

          {/* ── 8-DIRECTIONAL TAKSA GRID ── */}
          <Text style={styles.sectionTitle}>🧭 ผังทิศทักษาจร 8 ทิศ</Text>
          <View style={styles.taksaGrid}>
            {TAKSA_DIRECTIONS.map((dir) => {
              const isCenter = dir.id === 9;
              const isHighlighted = hoverNum === dir.id;

              // Compute colors for Taksa categories
              let kalaLabel = "";
              let kalaColor = THEME.text;
              let birthLabel = "";
              let birthColor = THEME.textMuted;

              if (dir.id === 3) { kalaLabel = "อายุ"; birthLabel = "มนตรี"; }
              else if (dir.id === 1) { kalaLabel = "กาลกิณี"; kalaColor = '#EF4444'; birthLabel = "มูละ"; }
              else if (dir.id === 2) { kalaLabel = "บริวาร"; birthLabel = "อุตสาหะ"; }
              else if (dir.id === 6) { kalaLabel = "มนตรี"; birthLabel = "ศรี"; birthColor = '#10B981'; }
              else if (dir.id === 4) { kalaLabel = "เดช"; birthLabel = "กาลกิณี"; birthColor = '#EF4444'; }
              else if (dir.id === 8) { kalaLabel = "อุตสาหะ"; birthLabel = "เดช"; }
              else if (dir.id === 5) { kalaLabel = "มูละ"; birthLabel = "อายุ"; }
              else if (dir.id === 7) { kalaLabel = "ศรี"; kalaColor = '#10B981'; birthLabel = "บริวาร"; }

              return (
                <TouchableOpacity
                  key={dir.id}
                  style={[styles.directionCard, isHighlighted && styles.directionCardActive]}
                  activeOpacity={0.7}
                  onPress={() => setHoverNum(hoverNum === dir.id ? null : dir.id)}
                >
                  <Text style={styles.dirNameText}>{dir.name}</Text>
                  <Text style={styles.dirStarText}>ดาว {dir.star}</Text>
                  <Text style={styles.dirNumText}>{dir.id === 9 ? 'เกตุ (๙)' : `(${dir.id})`}</Text>
                  
                  {!isCenter && (
                    <View style={styles.dirBadgeRow}>
                      <View style={[styles.dirBadge, { borderColor: 'rgba(255,255,255,0.05)' }]}>
                        <Text style={[styles.dirBadgeText, { color: kalaColor }]}>กาล: {kalaLabel}</Text>
                      </View>
                      <View style={[styles.dirBadge, { borderColor: 'rgba(255,255,255,0.05)' }]}>
                        <Text style={[styles.dirBadgeText, { color: birthColor }]}>กำเนิด: {birthLabel}</Text>
                      </View>
                    </View>
                  )}
                  {isCenter && (
                    <View style={[styles.dirBadge, { borderColor: THEME.gold, width: '90%' }]}>
                      <Text style={[styles.dirBadgeText, { color: THEME.gold }]}>ธาตุแกนกลาง</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── WISDOM GUIDANCE CHAT CHAMBER ── */}
          <Text style={styles.sectionTitle}>💬 แชทปัญญาญาณ (Wisdom Guidance)</Text>
          
          {/* Category Selectors */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catBadge, selectedCategory === cat.id && styles.catBadgeActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={styles.catBadgeText}>{cat.icon} {cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Suggested Questions */}
          <View style={styles.suggestionsBox}>
            <Text style={styles.suggestTitle}>💡 คำถามแนะนำ:</Text>
            {activeCategory?.questions.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestItem}
                onPress={() => handleSendChat(q)}
              >
                <Text style={styles.suggestText}>✦ {q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chat box container */}
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <View style={styles.greenDot} />
              <Text style={styles.chatHeaderTitle}>Wisdom Guidance Active</Text>
            </View>

            <View style={styles.chatList}>
              {chatMessages.map((msg, idx) => (
                <View key={idx} style={[styles.chatMsg, msg.sender === "user" ? styles.chatMsgUser : styles.chatMsgAi]}>
                  {msg.sender === "ai" && <Text style={styles.chatMsgLabel}>✦ WISDOM GUIDANCE</Text>}
                  <Text style={styles.chatMsgText}>{msg.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="กรอกคำถามของท่านที่นี่..."
                placeholderTextColor="#6b7280"
                editable={!isAiLoading}
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, !userInput.trim() && styles.chatSendBtnDisabled]}
                onPress={() => handleSendChat(userInput)}
                disabled={!userInput.trim() || isAiLoading}
              >
                {isAiLoading ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <Ionicons name="send" size={16} color="#020617" />
                )}
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  dateHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  dateTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  dateSub: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 34, 64, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    padding: 3,
    marginBottom: 16
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 26
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(198, 169, 107, 0.15)',
    borderWidth: 1,
    borderColor: THEME.gold
  },
  toggleText: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  toggleTextActive: {
    color: THEME.gold
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  inputLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    marginBottom: 6,
    marginLeft: 4,
    fontFamily: 'IBMPlexSansThai_600SemiBold'
  },
  textInput: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: THEME.text,
    fontSize: 12,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  timeCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden'
  },
  timeLabelText: {
    color: THEME.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  clockText: {
    color: THEME.text,
    fontSize: 48,
    fontFamily: 'Cinzel_700Bold',
    marginVertical: 12
  },
  yamLabelRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4
  },
  yamBadge: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 100
  },
  yamBadgeLabel: {
    color: THEME.textMuted,
    fontSize: 8,
    fontFamily: 'IBMPlexSansThai_500Medium'
  },
  yamBadgeVal: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginTop: 2
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24
  },
  scoreItemCard: {
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    width: '48%',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  scoreItemLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    fontFamily: 'IBMPlexSansThai_600SemiBold'
  },
  scoreItemVal: {
    fontSize: 20,
    fontFamily: 'Cinzel_700Bold'
  },
  scoreLine: {
    width: 24,
    height: 2,
    borderRadius: 1
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 14,
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 12,
    marginTop: 4
  },
  matrixCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginBottom: 16
  },
  matrixContainer: {
    gap: 8,
    paddingBottom: 4
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rowLabelBlock: {
    width: 60,
    marginRight: 12
  },
  rowLabelText: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  rowLabelSub: {
    color: THEME.textMuted,
    fontSize: 8,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  cellCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3
  },
  cellCircleBase4: {
    borderColor: 'rgba(75, 110, 174, 0.4)',
  },
  cellCircleActive: {
    backgroundColor: THEME.gold,
    borderColor: THEME.text
  },
  cellCircleText: {
    color: THEME.text,
    fontSize: 13,
    fontFamily: 'Cinzel_700Bold'
  },
  cellDetailCard: {
    backgroundColor: 'rgba(198, 169, 107, 0.08)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 24
  },
  cellDetailHeader: {
    color: THEME.gold,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 4
  },
  cellDetailText: {
    color: THEME.text,
    fontSize: 12,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginTop: 2
  },
  taksaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24
  },
  directionCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    width: '31%',
    padding: 10,
    alignItems: 'center'
  },
  directionCardActive: {
    borderColor: THEME.gold,
    backgroundColor: 'rgba(198, 169, 107, 0.08)'
  },
  dirNameText: {
    color: THEME.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'IBMPlexSansThai_600SemiBold',
    marginBottom: 6
  },
  dirStarText: {
    color: THEME.text,
    fontSize: 10,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginBottom: 2
  },
  dirNumText: {
    color: THEME.gold,
    fontSize: 15,
    fontFamily: 'Cinzel_700Bold',
    marginVertical: 4
  },
  dirBadgeRow: {
    width: '100%',
    gap: 4,
    marginTop: 4
  },
  dirBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: 'center'
  },
  dirBadgeText: {
    fontSize: 7,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 12
  },
  catBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginRight: 6
  },
  catBadgeActive: {
    backgroundColor: 'rgba(75, 110, 174, 0.2)',
    borderColor: THEME.mystic
  },
  catBadgeText: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  suggestionsBox: {
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  suggestTitle: {
    color: THEME.gold,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 8
  },
  suggestItem: {
    paddingVertical: 6
  },
  suggestText: {
    color: THEME.text,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  chatContainer: {
    backgroundColor: THEME.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden'
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10, 34, 64, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  chatHeaderTitle: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  chatList: {
    padding: 16,
    gap: 16,
    minHeight: 200
  },
  chatMsg: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1
  },
  chatMsgUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(10, 34, 64, 0.8)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopRightRadius: 2
  },
  chatMsgAi: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    borderColor: 'rgba(198, 169, 107, 0.1)',
    borderTopLeftRadius: 2
  },
  chatMsgLabel: {
    color: THEME.gold,
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 4
  },
  chatMsgText: {
    color: THEME.text,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: 'rgba(10, 34, 64, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.text,
    fontSize: 12,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  chatSendBtn: {
    backgroundColor: THEME.gold,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatSendBtnDisabled: {
    backgroundColor: THEME.textMuted,
    opacity: 0.5
  }
});
