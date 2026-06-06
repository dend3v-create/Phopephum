import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { CosmicLayout, CosmicCard } from '../components';
import { LinearGradient } from 'expo-linear-gradient';

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
    <CosmicLayout scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-12">
            <Text className="text-text-primary text-4xl font-bold font-cinzel tracking-[6px]">PHOPEPHUM</Text>
            <View className="h-[1px] w-24 bg-gold-500/40 my-3" />
            <Text className="text-gold-500 text-xs font-thai tracking-[3px] uppercase">Living Wisdom AI OS</Text>
          </View>

          <CosmicCard hasGlow className="p-6">
            <View className="gap-y-5">
              <View>
                <Text className="text-text-muted text-[10px] uppercase font-bold tracking-widest mb-2 ml-1">อีเมล</Text>
                <TextInput
                  className="bg-cosmic-950/50 border border-gold-500/20 rounded-xl px-4 py-4 text-text-primary font-thai"
                  onChangeText={(text) => setEmail(text)}
                  value={email}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize={'none'}
                />
              </View>

              <View>
                <Text className="text-text-muted text-[10px] uppercase font-bold tracking-widest mb-2 ml-1">รหัสผ่าน</Text>
                <TextInput
                  className="bg-cosmic-950/50 border border-gold-500/20 rounded-xl px-4 py-4 text-text-primary font-thai"
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                  secureTextEntry={true}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize={'none'}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => signInWithEmail()}
                disabled={loading}
                className="mt-4 overflow-hidden rounded-xl"
              >
                <LinearGradient
                  colors={['#C6A96B', '#D9BC82']}
                  className="py-4 items-center"
                >
                  <Text className="text-cosmic-950 font-bold font-thai text-base">
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity className="items-center mt-2">
                 <Text className="text-text-muted text-xs font-thai">ลืมรหัสผ่าน? ติดต่อแอดมิน</Text>
              </TouchableOpacity>
            </View>
          </CosmicCard>

          <View className="items-center mt-12">
             <Text className="text-text-muted/60 text-[10px] font-thai text-center leading-relaxed">
               ลิขสิทธิ์เฉพาะสมาชิก Phopephum เท่านั้น{"\n"}
               การเข้าใช้งานถือว่ายอมรับเงื่อนไขและนโยบายความเป็นส่วนตัว
             </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </CosmicLayout>
  );
}
