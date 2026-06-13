import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, TextInput, TouchableOpacity,
  Alert, Dimensions, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { calculatePhopephum } from '@phopephum/engine';

const { width } = Dimensions.get('window');

const DAY_NAMES_THAI = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const ROW_LABELS = [
  "ฐานที่ 1 (อัตตา)",
  "ฐานที่ 2 (หินะ)",
  "ฐานที่ 3 (ตนุ)",
  "ฐานที่ 4 (รวม)",
  "ฐานที่ 5",
  "ฐานที่ 6",
  "ฐานที่ 7",
  "ฐานที่ 8 (กำลังดาว)",
  "ฐานที่ 9 (ดวงจักรพรรดิ)"
];

const COL_HEADER_LABELS = ["วันเกิด", "อัตตา", "มรณะ", "ขุมทรัพย์", "อธิบดี", "ราชา", "หินะ"];

const ROW_META = [
  { label: "ฐาน 1 (เจตนา)", phopNames: ["อัตตา", "หินะ", "ตนุ", "มะรณะ", "อริ", "ปัตนิ", "ลาภะ"] },
  { label: "ฐาน 2 (วิถี)", phopNames: ["พยายะ", "ทาสา", "ทาสี", "มรณะ", "อริ", "ปัตนิ", "ลาภะ"] },
  { label: "ฐาน 3 (กรรม)", phopNames: ["ตนุ", "หินะ", "อัตตา", "มรณะ", "อริ", "ปัตนิ", "ลาภะ"] },
  { label: "ฐาน 4 (รวม)", phopNames: ["บารมี", "ผลกรรม", "หนี้สิน", "วิบาก", "ชะตา", "มงคล", "ความสำเร็จ"] },
];

export default function HoroscopeScreen() {
  const router = useRouter();
  const [birthDay, setBirthDay] = useState('15');
  const [birthMonth, setBirthMonth] = useState('6');
  const [birthYear, setBirthYear] = useState('2540');
  const [birthTime, setBirthTime] = useState('06:00');
  const [birthPlace, setBirthPlace] = useState('กรุงเทพมหานคร');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeNum, setActiveNum] = useState<number | null>(null);

  const handleCalculate = async () => {
    if (!birthDay || !birthMonth || !birthYear) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลวันเกิดให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const dayNum = parseInt(birthDay, 10);
      const monthNum = parseInt(birthMonth, 10);
      const yearCE = parseInt(birthYear, 10) - 543;
      
      const birthDateStr = `${yearCE}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      const phopephumResult = await calculatePhopephum({
        birthDate: birthDateStr,
        birthTime: birthTime || "12:00",
        birthPlace: birthPlace || "กรุงเทพมหานคร",
      }, new Date());

      setResult({
        matrix: phopephumResult.nineBase.bases,
        phopephumResult,
        lunar: phopephumResult.nineBase.lunarDate,
        taksaTransit: phopephumResult.taksaTransit,
      });
      setActiveNum(null);
    } catch (e) {
      console.error(e);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถคำนวณดวงชะตาได้ กรุณาตรวจสอบข้อมูลวันเดือนปีเกิด');
    } finally {
      setLoading(false);
    }
  };

  const getCellAgeRange = (row: number, col: number, mat: number[][]) => {
    let currentAgeStart = 1;
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 3; r++) {
        const star = mat[r]?.[c] ? mat[r][c] : 7;
        const currentAgeEnd = currentAgeStart + star - 1;
        if (r === row && c === col) {
          return `${currentAgeStart}-${currentAgeEnd}`;
        }
        currentAgeStart = currentAgeEnd + 1;
      }
    }
    return "";
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#C6A96B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ตั้งดวงชะตาเลข ๗ ตัว</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✦ ข้อมูลดวงชะตาเกิด</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>วัน (พ.ศ.)</Text>
              <TextInput
                style={styles.input}
                value={birthDay}
                onChangeText={setBirthDay}
                keyboardType="number-pad"
                placeholder="15"
                placeholderTextColor="#4A5568"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>เดือน (พ.ศ.)</Text>
              <TextInput
                style={styles.input}
                value={birthMonth}
                onChangeText={setBirthMonth}
                keyboardType="number-pad"
                placeholder="6"
                placeholderTextColor="#4A5568"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>ปี พ.ศ.</Text>
              <TextInput
                style={styles.input}
                value={birthYear}
                onChangeText={setBirthYear}
                keyboardType="number-pad"
                placeholder="2540"
                placeholderTextColor="#4A5568"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputCol, { flex: 1 }]}>
              <Text style={styles.inputLabel}>เวลาเกิด</Text>
              <TextInput
                style={styles.input}
                value={birthTime}
                onChangeText={setBirthTime}
                placeholder="06:00"
                placeholderTextColor="#4A5568"
              />
            </View>
            <View style={[styles.inputCol, { flex: 2 }]}>
              <Text style={styles.inputLabel}>จังหวัดที่เกิด</Text>
              <TextInput
                style={styles.input}
                value={birthPlace}
                onChangeText={setBirthPlace}
                placeholder="กรุงเทพมหานคร"
                placeholderTextColor="#4A5568"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate} disabled={loading}>
            <Text style={styles.calcBtnText}>{loading ? 'กำลังคำนวณ...' : 'คำนวณดวงชะตา 🔮'}</Text>
          </TouchableOpacity>
        </View>

        {/* Results Panel */}
        {result && (
          <View style={[styles.card, { padding: 12 }]}>
            <Text style={styles.cardTitle}>✦ ผังดวงจักรพรรดิ (เลข ๗ ตัว ๙ ฐาน)</Text>
            <Text style={styles.lunarText}>
              🌕 {result.lunar?.thaiDateText || "สมบูรณ์จันทรคติ"}
            </Text>
            {result.taksaTransit?.ageYang && (
              <Text style={styles.ageText}>อายุย่าง: {result.taksaTransit.ageYang} ปี</Text>
            )}

            {/* Scrollable Matrix Grid */}
            <ScrollView horizontal style={styles.matrixScroll}>
              <View style={styles.matrixContainer}>
                {/* Headers */}
                <View style={styles.row}>
                  <View style={[styles.cell, styles.headerCell, { width: 85 }]}>
                    <Text style={styles.headerCellText}>ฐาน / เสา</Text>
                  </View>
                  {COL_HEADER_LABELS.map((lbl, idx) => (
                    <View key={idx} style={[styles.cell, styles.headerCell]}>
                      <Text style={styles.headerCellText}>{lbl}</Text>
                    </View>
                  ))}
                </View>

                {/* Grid Rows */}
                {result.matrix.map((rowArr: number[], rIdx: number) => {
                  const isBase4 = rIdx === 3;
                  return (
                    <View key={rIdx} style={[styles.row, isBase4 && styles.base4Row]}>
                      <View style={[styles.cell, styles.headerCell, { width: 85, alignItems: 'flex-start' }]}>
                        <Text style={[styles.headerCellText, isBase4 && { color: '#818CF8' }]}>
                          {ROW_LABELS[rIdx] || `ฐานที่ ${rIdx + 1}`}
                        </Text>
                      </View>
                      {rowArr.map((num: number, cIdx: number) => {
                        const actualNum = isBase4 ? (num % 7 || 7) : num;
                        const isHighlighted = activeNum === actualNum;
                        
                        return (
                          <TouchableOpacity 
                            key={cIdx} 
                            style={[
                              styles.cell, 
                              styles.numberCell,
                              isHighlighted && styles.highlightedCell
                            ]}
                            onPress={() => setActiveNum(activeNum === actualNum ? null : actualNum)}
                          >
                            <View style={[
                              styles.numberCircle,
                              isHighlighted && { borderColor: '#C6A96B', backgroundColor: 'rgba(198,169,107,0.2)' }
                            ]}>
                              <Text style={[styles.cellText, isHighlighted && { color: '#F8F6F1' }]}>{num}</Text>
                            </View>
                            {/* Tiny age range */}
                            {rIdx < 3 && (
                              <Text style={styles.tinyAge}>{getCellAgeRange(rIdx, cIdx, result.matrix)} ปี</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.helpText}>*แตะตัวเลขในตารางเพื่อดูตัวเลขที่เชื่อมโยงถึงกัน</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  scrollContent: { padding: 16, gap: 16 },
  card: {
    backgroundColor: 'rgba(10, 22, 40, 0.6)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 188, 130, 0.12)',
  },
  cardTitle: { color: '#C6A96B', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputCol: { flex: 1 },
  inputLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(217, 188, 130, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8F6F1',
    fontSize: 14,
  },
  calcBtn: {
    backgroundColor: '#C6A96B',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  calcBtnText: { color: '#020617', fontSize: 15, fontWeight: 'bold' },
  lunarText: { color: '#F8F6F1', fontSize: 14, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  ageText: { color: '#C6A96B', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  matrixScroll: { marginVertical: 12 },
  matrixContainer: { paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  base4Row: { backgroundColor: 'rgba(75, 111, 174, 0.08)', borderRadius: 8 },
  cell: {
    width: 50,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCell: {
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 188, 130, 0.1)',
  },
  headerCellText: { color: '#94A3B8', fontSize: 10, fontWeight: 'bold' },
  numberCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: { color: '#D9CDB7', fontSize: 14, fontWeight: 'bold' },
  highlightedCell: {
    backgroundColor: 'rgba(198,169,107,0.05)',
  },
  tinyAge: { color: '#C6B79F', fontSize: 8, marginTop: 2, textAlign: 'center' },
  helpText: { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 8, opacity: 0.8 },
});
