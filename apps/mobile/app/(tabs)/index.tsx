import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Welcome Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-[#8A8070] text-sm font-thai">สวัสดี,</Text>
            <Text className="text-[#F8F6F1] text-2xl font-bold font-thai">{profile?.display_name || 'ผู้ใช้งาน'}</Text>
          </View>
          <View className="bg-[#C6A96B]/15 px-3 py-1.5 rounded-full border border-[#C6A96B]/30">
             <Text className="text-[#C6A96B] text-[10px] font-bold uppercase font-thai">
               {profile?.role === 'admin' ? '⌘ Admin' : 'Member'}
             </Text>
          </View>
        </View>

        {/* Plan Card */}
        <View className="bg-[#0a2240]/60 border border-[#C6A96B]/30 rounded-[20px] p-6 mb-8 relative overflow-hidden">
           <View className="absolute top-0 right-0 w-32 h-32 bg-[#C6A96B]/5 rounded-full blur-3xl -z-10" />
           <Text className="text-[#8A8070] text-xs uppercase tracking-widest font-thai font-semibold">แพ็กเกจปัจจุบัน</Text>
           <Text className="text-[#C6A96B] text-3xl font-bold my-2 font-cinzel">{profile?.plan?.toUpperCase() || 'FREE'}</Text>
           <View className="h-[1px] bg-[#C6A96B]/15 my-3" />
           <Text className="text-success text-xs font-thai font-medium">● สถานะ: {profile?.membership_status || 'Active'}</Text>
        </View>

        {/* Quick Actions */}
        <Text className="text-[#F8F6F1] text-lg font-bold mb-4 font-thai">เมนูแนะนำ</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          <ActionCard 
            icon="planet" 
            title="ดวงชะตา" 
            color="#C6A96B" 
            onPress={() => router.push('/(tabs)/dashboard')} 
          />
          <ActionCard 
            icon="sparkles" 
            title="รายงาน AI" 
            color="#818CF8" 
            onPress={() => router.push('/(tabs)/report')} 
          />
          <ActionCard 
            icon="calendar" 
            title="วางแผนชีวิต" 
            color="#34D399" 
            onPress={() => router.push('/(tabs)/planner')} 
          />
          <ActionCard 
            icon="help-circle" 
            title="วิธีการใช้งาน" 
            color="#4B6FAE" 
            onPress={() => router.push('/how-to-use')} 
          />
          <ActionCard 
            icon="settings" 
            title="ตั้งค่า" 
            color="#94A3B8" 
            onPress={() => router.push('/(tabs)/settings')} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, color, onPress }: { icon: any, title: string, color: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      className="bg-[#0a2240]/55 w-[48%] p-5 rounded-2xl border border-[#C6A96B]/15 items-center shadow-lg shadow-black/45" 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 rounded-xl justify-center items-center mb-3" style={{ backgroundColor: color + '18' }}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-[#F8F6F1] text-sm font-semibold font-thai">{title}</Text>
    </TouchableOpacity>
  );
}

