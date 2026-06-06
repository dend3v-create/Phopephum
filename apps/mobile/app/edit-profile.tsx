import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
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
      setDisplayName(data?.display_name || '');
    }
  }

  async function handleUpdate() {
    if (!displayName.trim()) {
      Alert.alert('Error', 'กรุณากรอกชื่อที่แสดง');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id);

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('สำเร็จ', 'อัปเดตโปรไฟล์เรียบร้อยแล้ว');
      router.back();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#C9A96E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ตั้งค่าโปรไฟล์</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ชื่อที่แสดง</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="กรอกชื่อของคุณ"
            placeholderTextColor="#8A8070"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.disabledButton]} 
          onPress={handleUpdate}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>{loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 169, 107, 0.15)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#C6A96B',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#8A8070',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(10, 34, 64, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.18)',
    borderRadius: 12,
    padding: 16,
    color: '#F8F6F1',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#C6A96B',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
