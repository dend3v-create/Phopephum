import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CosmicLayout, CosmicCard } from '../../components';
import { LinearGradient } from 'expo-linear-gradient';

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
    <CosmicLayout>
      <View className="px-6 pt-4">
        {/* Welcome Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-text-muted text-xs font-thai tracking-widest uppercase">ยินดีต้อนรับสู่จักรวาล</Text>
            <Text className="text-text-primary text-3xl font-bold font-thai mt-1">
              {profile?.display_name || 'ผู้ใช้งาน'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/settings')}
            className="w-12 h-12 rounded-full border border-gold-500/30 overflow-hidden bg-cosmic-800/40 items-center justify-center"
          >
            <Ionicons name="person" size={20} color="#C6A96B" />
          </TouchableOpacity>
        </View>

        {/* Membership Status Card */}
        <CosmicCard hasGlow className="mb-8 p-0">
          <LinearGradient
            colors={['rgba(198, 169, 107, 0.1)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6"
          >
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-text-muted text-[10px] uppercase tracking-[2px] font-thai font-semibold">สถานะสมาชิกปัจจุบัน</Text>
                <Text className="text-gold-500 text-4xl font-bold my-2 font-cinzel tracking-wider">
                  {profile?.plan?.toUpperCase() || 'FREE'}
                </Text>
              </View>
              <View className="bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/20">
                <Text className="text-gold-500 text-[10px] font-bold font-thai">
                  {profile?.membership_status || 'ACTIVE'}
                </Text>
              </View>
            </View>
            <View className="h-[1px] bg-gold-500/10 my-4" />
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-success mr-2 shadow-sm shadow-success" />
              <Text className="text-text-secondary text-xs font-thai font-medium">พลังงานชีวิตพร้อมสำหรับการพยากรณ์</Text>
            </View>
          </LinearGradient>
        </CosmicCard>

        {/* Quick Actions Grid */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-text-primary text-xl font-bold font-thai">เมนูพยากรณ์หลัก</Text>
          <TouchableOpacity>
             <Text className="text-gold-400 text-xs font-thai">ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-4">
          <ActionCard 
            icon="planet-outline" 
            title="ผังดวงชะตา" 
            desc="วิเคราะห์พื้นดวง"
            color="#C6A96B" 
            onPress={() => router.push('/(tabs)/dashboard')} 
          />
          <ActionCard 
            icon="time-outline" 
            title="ยามอัฏฐกาล" 
            desc="ฤกษ์มงคลปัจจุบัน"
            color="#EAB308" 
            onPress={() => router.push('/dashboard/yam')} 
          />
          <ActionCard 
            icon="compass-outline" 
            title="กาลชะตา" 
            desc="ทำนายเหตุการณ์"
            color="#EC4899" 
            onPress={() => router.push('/dashboard/karnchata')} 
          />
          <ActionCard 
            icon="sparkles-outline" 
            title="รายงาน AI" 
            desc="เจาะลึกด้วย AI"
            color="#818CF8" 
            onPress={() => router.push('/(tabs)/report')} 
          />
          <ActionCard 
            icon="calendar-outline" 
            title="วางแผนชีวิต" 
            desc="กำหนดทิศทาง"
            color="#34D399" 
            onPress={() => router.push('/(tabs)/planner')} 
          />
          <ActionCard 
            icon="book-outline" 
            title="คู่มือใช้งาน" 
            desc="เรียนรู้การใช้แอป"
            color="#4B6FAE" 
            onPress={() => router.push('/how-to-use')} 
          />
        </View>

        {/* Admin Section if applicable */}
        {profile?.role === 'admin' && (
          <View className="mt-8">
            <Text className="text-text-primary text-xl font-bold mb-4 font-thai">Admin Dashboard</Text>
            <TouchableOpacity 
              onPress={() => router.push('/admin')}
              className="bg-cosmic-700/40 border border-gold-500/30 p-5 rounded-2xl flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-gold-500/10 rounded-xl items-center justify-center mr-4">
                   <Ionicons name="shield-checkmark" size={24} color="#C6A96B" />
                </View>
                <View>
                  <Text className="text-gold-500 font-bold font-thai">ระบบจัดการแอดมิน</Text>
                  <Text className="text-text-muted text-xs font-thai">จัดการสมาชิกและการอนุมัติ</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C6A96B" />
            </TouchableOpacity>
          </View>
        )}

      </View>
    </CosmicLayout>
  );
}

function ActionCard({ icon, title, desc, color, onPress }: { icon: any, title: string, desc: string, color: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      className="w-[48%]"
    >
      <CosmicCard hasGlow={false} className="p-0 border-gold-500/10">
        <View className="p-4 items-center">
          <View 
            className="w-14 h-14 rounded-2xl justify-center items-center mb-3 shadow-lg shadow-black/40" 
            style={{ backgroundColor: 'rgba(10, 34, 64, 0.8)', borderWidth: 1, borderColor: color + '30' }}
          >
            <Ionicons name={icon} size={28} color={color} />
          </View>
          <Text className="text-text-primary text-sm font-bold font-thai text-center">{title}</Text>
          <Text className="text-text-muted text-[10px] font-thai text-center mt-1">{desc}</Text>
        </View>
      </CosmicCard>
    </TouchableOpacity>
  );
}

