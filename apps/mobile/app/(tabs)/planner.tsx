import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyPlan {
  id: string;
  date: string;
  intention: string | null;
  priorities: string[] | null;
  reflection: string | null;
  energy_level: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatThaiDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const be = y + 543;
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d} ${months[m - 1]} ${be}`;
}

const ENERGY_LABELS = ['', '😞 ต่ำมาก', '😕 ต่ำ', '😐 ปานกลาง', '😊 ดี', '⚡ ดีมาก'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlannerScreen() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [intention, setIntention] = useState('');
  const [priorities, setPriorities] = useState(['', '', '']);
  const [reflection, setReflection] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);

  const today = todayISO();

  useEffect(() => {
    fetchPlan();
  }, []);

  async function fetchPlan() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (data) {
      setPlan(data);
      setIntention(data.intention ?? '');
      setPriorities([
        data.priorities?.[0] ?? '',
        data.priorities?.[1] ?? '',
        data.priorities?.[2] ?? '',
      ]);
      setReflection(data.reflection ?? '');
      setEnergyLevel(data.energy_level ?? 3);
    }
    setLoading(false);
    setRefreshing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filteredPriorities = priorities.filter((p) => p.trim() !== '');
      const payload = {
        user_id: user.id,
        date: today,
        intention: intention.trim() || null,
        priorities: filteredPriorities.length > 0 ? filteredPriorities : null,
        reflection: reflection.trim() || null,
        energy_level: energyLevel,
      };

      const { error } = await supabase
        .from('daily_plans')
        .upsert(payload, { onConflict: 'user_id,date' });

      if (error) throw error;

      await fetchPlan();
      Alert.alert('บันทึกแล้ว', 'แผนวันนี้ถูกบันทึกเรียบร้อย');
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e?.message ?? 'กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlan();
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>วางแผนชีวิต</Text>
              <Text style={styles.headerDate}>{formatThaiDate(today)}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{plan ? '✓ มีแผนแล้ว' : '+ ใหม่'}</Text>
            </View>
          </View>

          {/* Energy Level */}
          <Text style={styles.fieldLabel}>พลังงานวันนี้</Text>
          <View style={styles.energyRow}>
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.energyButton, energyLevel === level && styles.energyButtonActive]}
                onPress={() => setEnergyLevel(level)}
              >
                <Text style={[styles.energyNum, energyLevel === level && styles.energyNumActive]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.energyLabel}>{ENERGY_LABELS[energyLevel]}</Text>

          {/* Intention */}
          <Text style={styles.fieldLabel}>☽ เจตนาวันนี้</Text>
          <TextInput
            style={styles.textInput}
            value={intention}
            onChangeText={setIntention}
            placeholder="วันนี้ฉันตั้งใจจะ..."
            placeholderTextColor="#4A3F32"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Priorities */}
          <Text style={styles.fieldLabel}>✦ สิ่งสำคัญ 3 อย่าง</Text>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.priorityRow}>
              <View style={styles.priorityNumber}>
                <Text style={styles.priorityNumText}>{i + 1}</Text>
              </View>
              <TextInput
                style={styles.priorityInput}
                value={priorities[i]}
                onChangeText={(text) => {
                  const next = [...priorities];
                  next[i] = text;
                  setPriorities(next);
                }}
                placeholder={`สิ่งสำคัญที่ ${i + 1}`}
                placeholderTextColor="#4A3F32"
              />
            </View>
          ))}

          {/* Reflection */}
          <Text style={styles.fieldLabel}>◈ ทบทวนตนเอง</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 100 }]}
            value={reflection}
            onChangeText={setReflection}
            placeholder="วันนี้ฉันได้เรียนรู้อะไร..."
            placeholderTextColor="#4A3F32"
            multiline
            textAlignVertical="top"
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#020617" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#020617" />
                <Text style={styles.saveButtonText}>บันทึกแผนวันนี้</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0806' },
  scrollContent: { padding: 20, paddingBottom: 48 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerTitle: { color: '#F8F6F1', fontSize: 22, fontWeight: 'bold' },
  headerDate: { color: '#C6B79F', fontSize: 12, marginTop: 2 },
  statusBadge: {
    backgroundColor: 'rgba(201,169,110,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { color: '#C9A96E', fontSize: 11, fontWeight: 'bold' },

  fieldLabel: {
    color: '#C6B79F',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },

  energyRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  energyButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#15120F',
    borderWidth: 1,
    borderColor: '#2A2018',
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyButtonActive: {
    backgroundColor: 'rgba(201,169,110,0.15)',
    borderColor: '#C9A96E',
  },
  energyNum: { color: '#C6B79F', fontSize: 16, fontWeight: 'bold' },
  energyNumActive: { color: '#C9A96E' },
  energyLabel: { color: '#C9A96E', fontSize: 12, textAlign: 'center', marginTop: 4 },

  textInput: {
    backgroundColor: '#15120F',
    borderWidth: 1,
    borderColor: '#2A2018',
    borderRadius: 16,
    padding: 16,
    color: '#F8F6F1',
    fontSize: 14,
    lineHeight: 22,
    minHeight: 80,
  },

  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  priorityNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201,169,110,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  priorityNumText: { color: '#C9A96E', fontSize: 13, fontWeight: 'bold' },
  priorityInput: {
    flex: 1,
    backgroundColor: '#15120F',
    borderWidth: 1,
    borderColor: '#2A2018',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8F6F1',
    fontSize: 14,
  },

  saveButton: {
    marginTop: 32,
    backgroundColor: '#C9A96E',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#020617', fontSize: 16, fontWeight: 'bold' },
});
