import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, TextInput, TouchableOpacity,
  Alert, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { calculatePhopephum, calcTaksaMaha, buddhToCS } from '@phopephum/engine';

const STAR_NAMES = {
  1: "อาทิตย์ (๑)",
  2: "จันทร์ (๒)",
  3: "อังคาร (๓)",
  4: "พุธ (๔)",
  5: "พฤหัสบดี (๕)",
  6: "ศุกร์ (๖)",
  7: "เสาร์ (๗)",
  8: "ราหู (๘)",
};

const TAKSA_GRID_3X3 = [
  [1, 2, 3],
  [6, null, 4],
  [8, 5, 7],
];

const STAR_DIRECTIONS = {
  1: "อีสาน (NE)",
  2: "บูรพา (E)",
  3: "อาคเนย์ (SE)",
  4: "ทักษิณ (S)",
  7: "หรดี (SW)",
  5: "ประจิม (W)",
  8: "พายัพ (NW)",
  6: "อุดร (N)",
};

export default function MahathaksaScreen() {
  const router = useRouter();
  const [birthDay, setBirthDay] = useState('15');
  const [birthMonth, setBirthMonth] = useState('6');
  const [birthYear, setBirthYear] = useState('2540');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
        birthTime: "12:00",
        birthPlace: "กรุงเทพมหานคร",
      }, new Date());

      const csNatal = buddhToCS(parseInt(birthYear, 10));
      const csTransit = buddhToCS(new Date().getFullYear() + 543);
      const taksaMahaFull = calcTaksaMaha({
        birthDate: new Date(birthDateStr + "T12:00:00"),
        checkDate: new Date(),
        csNatal,
        csTransit,
      });

      setResult({
        taksaNatal: phopephumResult.taksaNatal,
        taksaTransit: phopephumResult.taksaTransit,
        sawai: taksaMahaFull.sawai,
        ageYang: phopephumResult.taksaTransit.ageYang,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถคำนวณทักษาได้ กรุณาตรวจสอบข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const getBhopColor = (bhop: string) => {
    switch (bhop) {
      case "ศรี": return "#34D399"; // emerald
      case "เดช": return "#F59E0B"; // amber
      case "มนตรี": return "#38BDF8"; // sky
      case "กาลกิณี": return "#FB7185"; // rose
      default: return "#94A3B8"; // gray
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#C6A96B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>มหาทักษาพยากรณ์</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✦ ข้อมูลคำนวณทักษา</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>วันเกิด</Text>
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
              <Text style={styles.inputLabel}>เดือนเกิด</Text>
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
              <Text style={styles.inputLabel}>ปี พ.ศ. เกิด</Text>
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
          <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate} disabled={loading}>
            <Text style={styles.calcBtnText}>{loading ? 'กำลังคำนวณ...' : 'คำนวณทักษาจร 🧭'}</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {result && (
          <View style={styles.resultContainer}>
            {/* 3x3 Taksa Grid */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>✦ ตารางทักษาจร (อายุย่าง {result.ageYang} ปี)</Text>
              <View style={styles.gridContainer}>
                {TAKSA_GRID_3X3.map((row, rIdx) => (
                  <View key={rIdx} style={styles.gridRow}>
                    {row.map((star, cIdx) => {
                      if (star === null) {
                        return (
                          <View key="center" style={[styles.gridCell, styles.gridCellCenter]}>
                            <Text style={styles.centerLabel}>อายุย่าง</Text>
                            <Text style={styles.centerVal}>{result.ageYang}</Text>
                            <Text style={styles.centerLabel}>ปี</Text>
                          </View>
                        );
                      }

                      const bhopTransit = result.taksaTransit.map[star];
                      const dirName = STAR_DIRECTIONS[star as keyof typeof STAR_DIRECTIONS];
                      const color = getBhopColor(bhopTransit);

                      return (
                        <View key={star} style={styles.gridCell}>
                          <Text style={styles.cellDir}>{dirName}</Text>
                          <Text style={styles.cellStarNum}>{star}</Text>
                          <Text style={[styles.cellBhop, { color }]}>
                            {bhopTransit ? `${bhopTransit}จร` : '—'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* Sawai Card */}
            {result.sawai && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>✦ ช่วงอายุเสวยวิบากกรรม (ดาวเสวยอายุ)</Text>
                <View style={styles.sawaiRow}>
                  <View style={styles.sawaiBox}>
                    <Text style={styles.sawaiLabel}>ดาวเสวยอายุหลัก</Text>
                    <Text style={styles.sawaiVal}>{result.sawai.sawaiStarName}</Text>
                    <Text style={styles.sawaiAge}>อายุ {result.sawai.sawaiAgeStart} - {result.sawai.sawaiAgeEnd} ปี</Text>
                  </View>
                  <View style={[styles.sawaiBox, { borderColor: 'rgba(75, 111, 174, 0.2)' }]}>
                    <Text style={styles.sawaiLabel}>ดาวแทรก</Text>
                    <Text style={[styles.sawaiVal, { color: '#38BDF8' }]}>{result.sawai.subStarName}</Text>
                    <Text style={styles.sawaiAge}>{result.sawai.subDurationDays} วัน</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Auspicious Directions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>✦ ทิศมงคล ทักษาจรประจำปี</Text>
              <View style={styles.dirList}>
                {Object.entries(result.taksaTransit.map).map(([starStr, bhop]: any) => {
                  const star = Number(starStr);
                  const dirName = STAR_DIRECTIONS[star as keyof typeof STAR_DIRECTIONS];
                  const color = getBhopColor(bhop);
                  if (!["ศรี", "เดช", "มนตรี", "กาลกิณี"].includes(bhop)) return null;

                  return (
                    <View key={star} style={styles.dirRow}>
                      <View style={styles.dirLeft}>
                        <Text style={styles.dirText}>{dirName}</Text>
                        <Text style={styles.dirSub}>ดาว {STAR_NAMES[star as keyof typeof STAR_NAMES] || star}</Text>
                      </View>
                      <View style={[styles.dirBadge, { borderColor: color }]}>
                        <Text style={[styles.dirBadgeText, { color }]}>{bhop}จร</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
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
  resultContainer: { gap: 16 },
  gridContainer: { maxWidth: 300, alignSelf: 'center', gap: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  gridCell: {
    width: 90,
    height: 90,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  gridCellCenter: {
    borderColor: 'rgba(198, 169, 107, 0.2)',
    backgroundColor: 'rgba(198, 169, 107, 0.04)',
    justifyContent: 'center',
  },
  centerLabel: { color: '#C6A96B', fontSize: 9, textTransform: 'uppercase' },
  centerVal: { color: '#F8F6F1', fontSize: 28, fontWeight: 'bold', marginVertical: 2 },
  cellDir: { color: '#C6B79F', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  cellStarNum: { color: '#F8F6F1', fontSize: 22, fontWeight: 'bold' },
  cellBhop: { fontSize: 11, fontWeight: 'bold' },
  sawaiRow: { flexDirection: 'row', gap: 12 },
  sawaiBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.2)',
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  sawaiLabel: { color: '#C6B79F', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  sawaiVal: { color: '#C6A96B', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  sawaiAge: { color: '#F8F6F1', fontSize: 12 },
  dirList: { gap: 10 },
  dirRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 8,
  },
  dirLeft: { gap: 2 },
  dirText: { color: '#F8F6F1', fontSize: 14, fontWeight: 'bold' },
  dirSub: { color: '#C6B79F', fontSize: 11 },
  dirBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  dirBadgeText: { fontSize: 11, fontWeight: 'bold' },
});
