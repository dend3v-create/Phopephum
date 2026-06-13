import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.display_name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.nameText}>{profile?.display_name || 'ผู้ใช้งาน'}</Text>
          <Text style={styles.emailText}>{profile?.email}</Text>
        </View>

        {/* Main Menu Actions */}
        <Text style={styles.groupTitle}>เมนูหลัก</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/how-to-use')}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#C9A96E" />
              <Text style={styles.menuText}>วิธีการใช้งาน</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C6B79F" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
            <View style={styles.menuLeft}>
              <Ionicons name="person-circle-outline" size={22} color="#C9A96E" />
              <Text style={styles.menuText}>ตั้งค่าโปรไฟล์</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C6B79F" />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <Text style={styles.groupTitle}>ข้อมูลพื้นฐาน</Text>
        <View style={styles.menuGroup}>
           <InfoRow label="วันเกิด" value={profile?.birth_date || '-'} icon="calendar-outline" />
           <InfoRow label="เวลาเกิด" value={profile?.birth_time || '-'} icon="time-outline" />
           <InfoRow label="สถานที่เกิด" value={profile?.birth_place || '-'} icon="location-outline" />
           <InfoRow label="เพศ" value={profile?.gender || '-'} icon="person-outline" />
           <InfoRow label="ทรายกาลเวลา (Sands of Time)" value={profile?.plan === 'imperial' ? 'ไม่จำกัด (♾️)' : `${profile?.time_sands ?? 0} เม็ด`} icon="hourglass-outline" />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity style={[styles.logoutButton]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color="#F87171" />
            <Text style={styles.logoutText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color="#C6B79F" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201,169,110,0.15)',
    borderWidth: 1,
    borderColor: '#C9A96E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#C9A96E',
    fontSize: 32,
    fontWeight: 'bold',
  },
  nameText: {
    color: '#F8F6F1',
    fontSize: 22,
    fontWeight: 'bold',
  },
  emailText: {
    color: '#C6B79F',
    fontSize: 14,
    marginTop: 4,
  },
  groupTitle: {
    color: '#C6B79F',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#15120F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2018',
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2018',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    color: '#F8F6F1',
    fontSize: 15,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2018',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    color: '#C6B79F',
    fontSize: 14,
  },
  infoValue: {
    color: '#F8F6F1',
    fontSize: 14,
    fontWeight: '500',
  },
  actionGroup: {
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'rgba(248,113,113,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    gap: 12,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
