import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, SafeAreaView, ImageBackground 
} from 'react-native';
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

  const isPro = profile?.plan === 'imperial';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Logo & Brand */}
        <View style={styles.brandContainer}>
          <View style={styles.logoSymbol}>
            <Text style={styles.logoLetter}>P</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>PhopePhum</Text>
            <Text style={styles.brandSub}>Wisdom Guidance OS</Text>
          </View>
        </View>

        {/* Welcome */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>ยินดีต้อนรับ,</Text>
            <Text style={styles.nameText}>{profile?.display_name || 'ผู้ใช้งาน'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileBtn}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Ionicons name="person-circle-outline" size={32} color="#C6A96B" />
          </TouchableOpacity>
        </View>

        {/* Pro Banner / Membership Card */}
        <TouchableOpacity 
          style={[styles.planCard, isPro && styles.planCardPro]}
          onPress={() => !isPro && router.push('/dashboard/upgrade' as any)}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planLabel}>แพ็กเกจปัจจุบัน</Text>
            <View style={[styles.planBadge, { backgroundColor: isPro ? '#C6A96B20' : '#4B6FAE20' }]}>
              <Text style={[styles.planBadgeText, { color: isPro ? '#C6A96B' : '#4B6FAE' }]}>
                {isPro ? '✦ IMPERIAL' : 'FREE'}
              </Text>
            </View>
          </View>
          <Text style={styles.planTitle}>{isPro ? 'สมาชิกพรีเมียม' : 'สมาชิกทั่วไป'}</Text>
          
          {/* Sands of Time Token Display */}
          <View style={styles.inkContainer}>
            <View style={styles.inkHeader}>
              <Text style={styles.inkText}>⏳ ทรายกาลเวลา (Sands of Time)</Text>
              <Text style={styles.inkValue}>{isPro ? '♾️ ไม่จำกัด' : `${profile?.time_sands ?? 0} / 15`}</Text>
            </View>
            {!isPro && (
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, (((profile?.time_sands ?? 0) / 15) * 100))}%` }]} />
              </View>
            )}
          </View>

          {!isPro && (
            <Text style={styles.upgradeText}>ปลดล็อกเครื่องมือพยากรณ์ขั้นสูง →</Text>
          )}
        </TouchableOpacity>

        {/* Quick Menu */}
        <Text style={styles.sectionTitle}>เมนูแนะนำ</Text>
        <View style={styles.grid}>
          <MenuCard 
            icon="planet-outline" 
            title="ดวงชะตา" 
            desc="เช็คฤกษ์ยาม & วัน"
            color="#C6A96B" 
            onPress={() => router.push('/(tabs)/dashboard')} 
          />
          <MenuCard 
            icon="sparkles-outline" 
            title="รายงาน AI" 
            desc="วิเคราะห์รายวัน"
            color="#818CF8" 
            onPress={() => router.push('/(tabs)/report')} 
          />
          <MenuCard 
            icon="calendar-outline" 
            title="วางแผนชีวิต" 
            desc="บันทึก & เป้าหมาย"
            color="#34D399" 
            onPress={() => router.push('/(tabs)/planner')} 
          />
          <MenuCard 
            icon="book-outline" 
            title="วิธีใช้งาน" 
            desc="คู่มือเริ่มต้น"
            color="#94A3B8" 
            onPress={() => router.push('/how-to-use')} 
          />
        </View>

        {/* Bottom decorative */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 PhopePhum · Wisdom Guidance</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({ icon, title, desc, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    padding: 24,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    marginTop: 8,
  },
  logoSymbol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.3)',
    backgroundColor: 'rgba(198, 169, 107, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    color: '#C6A96B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandTitle: {
    color: '#F8F6F1',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brandSub: {
    color: '#C6A96B',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  nameText: {
    color: '#F8F6F1',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  profileBtn: {
    padding: 4,
  },
  planCard: {
    backgroundColor: 'rgba(10, 22, 40, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(75, 111, 174, 0.2)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
  },
  planCardPro: {
    borderColor: 'rgba(198, 169, 107, 0.3)',
    backgroundColor: 'rgba(198, 169, 107, 0.05)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planLabel: {
    color: '#8A8070',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  planTitle: {
    color: '#F8F6F1',
    fontSize: 22,
    fontWeight: 'bold',
  },
  upgradeText: {
    color: '#C6A96B',
    fontSize: 12,
    marginTop: 16,
    fontWeight: '600',
  },
  inkContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  inkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inkText: {
    color: '#8A8070',
    fontSize: 12,
    fontWeight: '600',
  },
  inkValue: {
    color: '#C6A96B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#020617',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C6A96B',
    borderRadius: 2,
  },
  sectionTitle: {
    color: '#C6A96B',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(10, 22, 40, 0.5)',
    width: '48%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#F8F6F1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardDesc: {
    color: '#8A8070',
    fontSize: 11,
    marginTop: 4,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 10,
    opacity: 0.4,
  },
});
