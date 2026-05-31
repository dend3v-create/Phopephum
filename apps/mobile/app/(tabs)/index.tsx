import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>สวัสดี,</Text>
            <Text style={styles.nameText}>{profile?.display_name || 'ผู้ใช้งาน'}</Text>
          </View>
          <View style={styles.badgeContainer}>
             <Text style={styles.roleText}>
               {profile?.role === 'admin' ? '⌘ Admin' : 'Member'}
             </Text>
          </View>
        </View>

        {/* Plan Card */}
        <View style={styles.planCard}>
           <Text style={styles.planLabel}>แพ็กเกจปัจจุบัน</Text>
           <Text style={styles.planValue}>{profile?.plan?.toUpperCase() || 'FREE'}</Text>
           <View style={styles.divider} />
           <Text style={styles.statusText}>สถานะ: {profile?.membership_status || 'Active'}</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>เมนูแนะนำ</Text>
        <View style={styles.grid}>
          <ActionCard icon="planet" title="ดวงชะตา" color="#38BDF8" />
          <ActionCard icon="sparkles" title="รายงาน AI" color="#818CF8" />
          <ActionCard icon="calendar" title="วางแผนชีวิต" color="#34D399" />
          <ActionCard icon="settings" title="ตั้งค่า" color="#94A3B8" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, color }: { icon: any, title: string, color: string }) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0806',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    color: '#8A8070',
    fontSize: 14,
  },
  nameText: {
    color: '#F8F6F1',
    fontSize: 24,
    fontWeight: 'bold',
  },
  badgeContainer: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  roleText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  planCard: {
    backgroundColor: '#15120F',
    borderWidth: 1,
    borderColor: '#D9BC8230',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  planLabel: {
    color: '#8A8070',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planValue: {
    color: '#D9BC82',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2018',
    marginVertical: 12,
  },
  statusText: {
    color: '#34D399',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#F8F6F1',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#15120F',
    width: '47%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2018',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#F8F6F1',
    fontSize: 14,
    fontWeight: '600',
  },
});
