import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#C6A96B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} className="flex-1">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C6A96B" />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row justify-between items-start mb-7">
            <View>
              <Text className="text-[#F8F6F1] text-[22px] font-bold font-thai">วางแผนชีวิต</Text>
              <Text className="text-[#8A8070] text-xs mt-0.5 font-thai">{formatThaiDate(today)}</Text>
            </View>
            <View className="bg-[#C6A96B]/15 border border-[#C6A96B]/30 px-3 py-1 rounded-full">
              <Text className="text-[#C6A96B] text-[11px] font-bold font-thai">{plan ? '✓ มีแผนแล้ว' : '+ ใหม่'}</Text>
            </View>
          </View>

          {/* Energy Level */}
          <Text className="text-[#8A8070] text-[11px] uppercase tracking-widest mb-2 mt-5 font-thai">พลังงานวันนี้</Text>
          <View className="flex-row gap-2.5 mb-1.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                className={`flex-1 h-11 rounded-xl bg-[#0a2240]/55 border items-center justify-center ${energyLevel === level ? 'bg-[#C6A96B]/15 border-[#C6A96B]' : 'border-[#C6A96B]/10'}`}
                onPress={() => setEnergyLevel(level)}
              >
                <Text className={`text-base font-bold font-thai ${energyLevel === level ? 'text-[#C6A96B]' : 'text-[#8A8070]'}`}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-[#C6A96B] text-xs text-center mt-1 font-thai">{ENERGY_LABELS[energyLevel]}</Text>

          {/* Intention */}
          <Text className="text-[#8A8070] text-[11px] uppercase tracking-widest mb-2 mt-5 font-thai">☽ เจตนาวันนี้</Text>
          <TextInput
            className="bg-[#0a2240]/45 border border-[#C6A96B]/15 rounded-2xl p-4 text-[#F8F6F1] text-sm min-h-[80px] font-thai"
            value={intention}
            onChangeText={setIntention}
            placeholder="วันนี้ฉันตั้งใจจะ..."
            placeholderTextColor="#8A8070"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Priorities */}
          <Text className="text-[#8A8070] text-[11px] uppercase tracking-widest mb-2 mt-5 font-thai">✦ สิ่งสำคัญ 3 อย่าง</Text>
          {[0, 1, 2].map((i) => (
            <View key={i} className="flex-row items-center gap-2.5 mb-2">
              <View className="w-8 h-8 rounded-full bg-[#C6A96B]/15 border border-[#C6A96B]/30 items-center justify-center shrink-0">
                <Text className="text-[#C6A96B] text-[13px] font-bold font-thai">{i + 1}</Text>
              </View>
              <TextInput
                className="flex-1 bg-[#0a2240]/45 border border-[#C6A96B]/15 rounded-xl px-3.5 py-3 text-[#F8F6F1] text-sm font-thai"
                value={priorities[i]}
                onChangeText={(text) => {
                  const next = [...priorities];
                  next[i] = text;
                  setPriorities(next);
                }}
                placeholder={`สิ่งสำคัญที่ ${i + 1}`}
                placeholderTextColor="#8A8070"
              />
            </View>
          ))}

          {/* Reflection */}
          <Text className="text-[#8A8070] text-[11px] uppercase tracking-widest mb-2 mt-5 font-thai">◈ ทบทวนตนเอง</Text>
          <TextInput
            className="bg-[#0a2240]/45 border border-[#C6A96B]/15 rounded-2xl p-4 text-[#F8F6F1] text-sm min-h-[100px] font-thai"
            value={reflection}
            onChangeText={setReflection}
            placeholder="วันนี้ฉันได้เรียนรู้อะไร..."
            placeholderTextColor="#8A8070"
            multiline
            textAlignVertical="top"
          />

          {/* Save Button */}
          <TouchableOpacity
            className={`mt-8 bg-[#C6A96B] rounded-full flex-row items-center justify-center gap-2 py-4 ${saving ? 'opacity-60' : ''}`}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#020617" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#020617" />
                <Text className="text-[#020617] text-base font-bold font-thai">บันทึกแผนวันนี้</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


