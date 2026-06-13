import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>PHOPEPHUM</Text>
          <Text style={styles.subtitle}>Living Wisdom OS</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>อีเมล</Text>
          <TextInput
            style={styles.input}
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="name@example.com"
            placeholderTextColor="#C6B79F"
            autoCapitalize={'none'}
          />

          <Text style={styles.label}>รหัสผ่าน</Text>
          <TextInput
            style={styles.input}
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={true}
            placeholder="••••••••"
            placeholderTextColor="#C6B79F"
            autoCapitalize={'none'}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => signInWithEmail()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0806',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8F6F1',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#D9BC82',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  form: {
    gap: 16,
  },
  label: {
    color: '#C6B79F',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#15120F',
    borderWidth: 1,
    borderColor: '#2A2018',
    borderRadius: 12,
    padding: 16,
    color: '#F8F6F1',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#0A0806',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
