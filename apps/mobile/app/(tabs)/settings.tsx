import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/login');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        
        {/* Profile Section */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-full bg-[#C6A96B]/15 border border-[#C6A96B] justify-center items-center mb-4">
            <Text className="text-[#C6A96B] text-[32px] font-bold font-thai">
              {(profile?.display_name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-[#F8F6F1] text-[22px] font-bold font-thai">{profile?.display_name || 'ผู้ใช้งาน'}</Text>
          <Text className="text-[#8A8070] text-sm mt-1 font-thai">{profile?.email}</Text>
        </View>

        {/* Main Menu Actions */}
        <Text className="text-[#8A8070] text-xs uppercase tracking-widest mb-3 ml-1 font-thai">เมนูหลัก</Text>
        <View className="bg-[#0a2240]/60 rounded-[20px] border border-[#C6A96B]/15 overflow-hidden mb-6">
          <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-[#C6A96B]/10" onPress={() => router.push('/how-to-use')}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="help-circle-outline" size={22} color="#C6A96B" />
              <Text className="text-[#F8F6F1] text-[15px] font-medium font-thai">วิธีการใช้งาน</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A8070" />
          </TouchableOpacity>

          {profile?.role === 'admin' && (
            <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-[#C6A96B]/10" onPress={() => router.push('/admin')}>
              <View className="flex-row items-center gap-3">
                <Ionicons name="shield-checkmark-outline" size={22} color="#C6A96B" />
                <Text className="text-[#F8F6F1] text-[15px] font-medium font-thai">ระบบจัดการแอดมิน (Admin Panel)</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8A8070" />
            </TouchableOpacity>
          )}

          <TouchableOpacity className="flex-row justify-between items-center p-4" onPress={() => router.push('/edit-profile')}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="person-circle-outline" size={22} color="#C6A96B" />
              <Text className="text-[#F8F6F1] text-[15px] font-medium font-thai">ตั้งค่าโปรไฟล์</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A8070" />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <Text className="text-[#8A8070] text-xs uppercase tracking-widest mb-3 ml-1 font-thai">ข้อมูลพื้นฐาน</Text>
        <View className="bg-[#0a2240]/60 rounded-[20px] border border-[#C6A96B]/15 overflow-hidden mb-6">
           <InfoRow label="วันเกิด" value={profile?.birth_date || '-'} icon="calendar-outline" />
           <InfoRow label="เวลาเกิด" value={profile?.birth_time || '-'} icon="time-outline" />
           <InfoRow label="สถานที่เกิด" value={profile?.birth_place || '-'} icon="location-outline" />
           <InfoRow label="เพศ" value={profile?.gender || '-'} icon="person-outline" isLast={true} />
        </View>

        {/* Action Buttons */}
        <View className="mt-2">
          <TouchableOpacity className="flex-row items-center justify-center p-4 bg-danger/5 rounded-2xl border border-danger/20 gap-3" onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color="#F87171" />
            <Text className="text-danger text-base font-bold font-thai">ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, icon, isLast }: { label: string, value: string, icon: any, isLast?: boolean }) {
  return (
    <View className={`flex-row justify-between items-center p-4 ${isLast ? '' : 'border-b border-[#C6A96B]/10'}`}>
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color="#8A8070" />
        <Text className="text-[#8A8070] text-sm font-thai">{label}</Text>
      </View>
      <Text className="text-[#F8F6F1] text-sm font-medium font-thai">{value}</Text>
    </View>
  );
}

