import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
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

        {/* Info Rows */}
        <View style={styles.menuGroup}>
           <InfoRow label="วันเกิด" value={profile?.birth_date || '-'} icon="calendar-outline" />
           <InfoRow label="เวลาเกิด" value={profile?.birth_time || '-'} icon="time-outline" />
           <InfoRow label="สถานที่เกิด" value={profile?.birth_place || '-'} icon="location-outline" />
           <InfoRow label="เพศ" value={profile?.gender || '-'} icon="person-outline" />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity style={[styles.menuItem, styles.logoutButton]} onPress={handleSignOut}>
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
        <Ionicons name={icon} size={20} color="#8A8070" />
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
    color: '#8A8070',
    fontSize: 14,
    marginTop: 4,
  },
  menuGroup: {
    backgroundColor: '#15120F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2018',
    overflow: 'hidden',
    marginBottom: 24,
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
    color: '#8A8070',
    fontSize: 14,
  },
  infoValue: {
    color: '#F8F6F1',
    fontSize: 14,
    fontWeight: '500',
  },
  actionGroup: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#15120F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2018',
    gap: 12,
  },
  logoutButton: {
    borderColor: 'rgba(248,113,113,0.2)',
  },
  logoutText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
