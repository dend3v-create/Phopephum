import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const THEME = {
  bg: '#020617',
  gold: '#C6A96B',
  mystic: '#4B6FAE',
  text: '#F8F6F1',
  textMuted: '#8A8070',
  cardBg: 'rgba(10, 34, 64, 0.6)',
  border: 'rgba(198, 169, 107, 0.2)',
  inputBg: 'rgba(15, 23, 42, 0.8)'
};

const PLAN_COLORS: Record<string, string> = {
  basic: '#34D399',
  pro: '#38BDF8',
  imperial: '#C6A96B',
  free: '#8A8070'
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'รอดำเนินการ', color: '#FBBF24' },
  approved: { label: 'อนุมัติแล้ว', color: '#10B981' },
  rejected: { label: 'ปฏิเสธ', color: '#EF4444' }
};

export default function AdminApprovalsScreen() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  
  // Note/Reason state for processing requests
  const [note, setNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAndRequests();
  }, [filter]);

  async function fetchAdminAndRequests() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        Alert.alert('Access Denied', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        router.replace('/(tabs)');
        return;
      }

      setAdminUser(profile);

      // Fetch subscription requests
      let query = supabase
        .from('subscription_requests')
        .select('*, profiles(display_name, email)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'โหลดคำขอล้มเหลว');
    } finally {
      setLoading(false);
    }
  }

  const handleDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    const requestItem = requests.find(r => r.id === requestId);
    if (!requestItem) return;

    setProcessingId(requestId);
    try {
      // 1. Update request status
      const { error: requestError } = await supabase
        .from('subscription_requests')
        .update({
          status: decision,
          approved_by: adminUser.id,
          approved_at: new Date().toISOString(),
          note: note.trim() || null
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // 2. If approved, update user's profile
      if (decision === 'approved') {
        const planMapping: Record<string, string> = {
          free: 'free',
          basic: 'basic',
          pro: 'premium',
          imperial: 'lifetime'
        };
        const subscriptionTier = planMapping[requestItem.plan] || 'free';

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription: subscriptionTier,
            plan: requestItem.plan,
            membership_status: 'active'
          })
          .eq('id', requestItem.user_id);

        if (profileError) throw profileError;
      }

      Alert.alert('Success', `ดำเนินการ${decision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}เรียบร้อยแล้ว`);
      setNote('');
      fetchAdminAndRequests();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }} className="justify-center items-center">
        <ActivityIndicator size="large" color={THEME.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <View style={{ flex: 1, padding: 18 }}>
        
        {/* Tabs Filter */}
        <View style={styles.tabsContainer}>
          {(['pending', 'approved', 'all'] as const).map((key) => {
            const label = key === 'pending' ? 'รออนุมัติ' : key === 'approved' ? 'ประวัติอนุมัติ' : 'ทั้งหมด';
            const isActive = filter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setFilter(key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Requests List */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {requests.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Text style={{ color: THEME.textMuted }}>ไม่มีคำขอในหัวข้อนี้</Text>
            </View>
          ) : (
            requests.map((item) => {
              const statusInfo = STATUS_LABELS[item.status] || { label: item.status, color: THEME.textMuted };
              const planColor = PLAN_COLORS[item.plan] || THEME.textMuted;
              const isProcessing = processingId === item.id;

              return (
                <View key={item.id} style={styles.requestCard}>
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <Text style={styles.userName}>{item.profiles?.display_name || 'ไม่มีชื่อ'}</Text>
                      <Text style={styles.userEmail}>{item.profiles?.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { borderColor: statusInfo.color + '30', backgroundColor: statusInfo.color + '15' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2 mb-3 items-center">
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {item.type === 'registration' ? 'สมัครสมาชิกใหม่' : 'อัปเกรดแพ็กเกจ'}
                      </Text>
                    </View>
                    <View style={[styles.planBadge, { borderColor: planColor + '30', backgroundColor: planColor + '15' }]}>
                      <Text style={[styles.planBadgeText, { color: planColor }]}>{item.plan?.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.dateText}>
                    ขอเมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}
                  </Text>

                  {item.note && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteTitle}>บันทึกเพิ่มเติม:</Text>
                      <Text style={styles.noteText}>{item.note}</Text>
                    </View>
                  )}

                  {item.status === 'pending' && (
                    <View style={styles.actionSection}>
                      <TextInput
                        style={styles.noteInput}
                        value={processingId === item.id ? note : ''}
                        onChangeText={(text) => {
                          setProcessingId(item.id);
                          setNote(text);
                        }}
                        placeholder="บันทึกช่วยจำ (ถ้ามี)..."
                        placeholderTextColor="#4b5563"
                      />
                      
                      <View style={styles.btnRow}>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleDecision(item.id, 'rejected')}
                          disabled={isProcessing}
                        >
                          <Text style={styles.rejectText}>ปฏิเสธ</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleDecision(item.id, 'approved')}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color={THEME.bg} />
                          ) : (
                            <Text style={styles.approveText}>อนุมัติ</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 34, 64, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  tabBtnActive: {
    backgroundColor: THEME.gold
  },
  tabText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  tabTextActive: {
    color: THEME.bg
  },
  requestCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginBottom: 12
  },
  userName: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  userEmail: {
    color: THEME.textMuted,
    fontSize: 10,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginTop: 1
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  typeBadgeText: {
    color: THEME.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  planBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  planBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  dateText: {
    color: THEME.textMuted,
    fontSize: 9,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginTop: 4
  },
  noteBox: {
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)'
  },
  noteTitle: {
    color: THEME.text,
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 4
  },
  noteText: {
    color: THEME.textMuted,
    fontSize: 9,
    lineHeight: 14,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  actionSection: {
    marginTop: 14,
    gap: 10
  },
  noteInput: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.text,
    fontSize: 11,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  rejectText: {
    color: '#F87171',
    fontSize: 11,
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  approveBtn: {
    backgroundColor: THEME.gold,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70
  },
  approveText: {
    color: THEME.bg,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  }
});
