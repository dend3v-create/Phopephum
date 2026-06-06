import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
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

export default function AdminUsersScreen() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Edit State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('user');
  const [editSub, setEditSub] = useState('free');
  const [editPlan, setEditPlan] = useState('free');
  const [editStatus, setEditStatus] = useState('active');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAdminAndUsers();
  }, []);

  async function fetchAdminAndUsers() {
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
      await loadUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers(searchStr = search, role = roleFilter) {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchStr.trim()) {
        query = query.or(`email.ilike.%${searchStr}%,display_name.ilike.%${searchStr}%`);
      }
      if (role !== 'all') {
        query = query.eq('role', role);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setUsers(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'โหลดข้อมูลผู้ใช้ล้มเหลว');
    }
  }

  const handleSearchSubmit = () => {
    loadUsers();
  };

  const handleStartEdit = (user: any) => {
    setEditingUserId(user.id);
    setEditRole(user.role || 'user');
    setEditSub(user.subscription || 'free');
    setEditPlan(user.plan || 'free');
    setEditStatus(user.membership_status || 'active');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveUser = async (userId: string) => {
    if (userId === adminUser.id && editRole !== 'admin') {
      Alert.alert('Error', 'ไม่สามารถเปลี่ยนสิทธิ์แอดมินของตัวท่านเองได้');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          subscription: editSub,
          plan: editPlan,
          membership_status: editStatus
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Success', 'บันทึกการเปลี่ยนแปลงสำเร็จ');
      setEditingUserId(null);
      await loadUsers();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }} className="justify-center items-center">
        <ActivityIndicator size="large" color={THEME.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <View style={{ flex: 1, padding: 18 }}>
        
        {/* Filters Box */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>ค้นหาบัญชีสมาชิก</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              placeholder="ค้นหาด้วยชื่อ หรือ อีเมล..."
              placeholderTextColor="#4b5563"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={() => loadUsers()}>
              <Ionicons name="search" size={16} color={THEME.bg} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSelectRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectLabel}>ประเภทสิทธิ์ (Role)</Text>
              <View style={styles.rowFilterOptions}>
                {['all', 'user', 'operator', 'admin'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleBadgeBtn, roleFilter === role && styles.roleBadgeBtnActive]}
                    onPress={() => {
                      setRoleFilter(role);
                      loadUsers(search, role);
                    }}
                  >
                    <Text style={[styles.roleBadgeText, roleFilter === role && styles.roleBadgeTextActive]}>
                      {role === 'all' ? 'ทั้งหมด' : role.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Users list */}
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {users.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: THEME.textMuted }}>ไม่พบข้อมูลผู้ใช้</Text>
            </View>
          ) : (
            users.map((item) => {
              const isEditing = editingUserId === item.id;

              return (
                <View key={item.id} style={styles.userCard}>
                  <View style={styles.userCardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(item.display_name || item.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text style={styles.displayName}>{item.display_name || 'ไม่มีชื่อ'}</Text>
                      <Text style={styles.email}>{item.email}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {isEditing ? (
                    <View style={styles.editForm}>
                      {/* Role Selector */}
                      <View style={styles.editRow}>
                        <Text style={styles.editRowLabel}>สิทธิ์ (Role):</Text>
                        <View style={styles.optionRow}>
                          {['user', 'operator', 'admin'].map((r) => (
                            <TouchableOpacity
                              key={r}
                              style={[styles.optionBadge, editRole === r && styles.optionBadgeActive]}
                              onPress={() => setEditRole(r)}
                            >
                              <Text style={[styles.optionText, editRole === r && styles.optionTextActive]}>{r.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Tier/Subscription Selector */}
                      <View style={styles.editRow}>
                        <Text style={styles.editRowLabel}>ระดับ (Tier):</Text>
                        <View style={styles.optionRow}>
                          {['free', 'basic', 'premium', 'lifetime'].map((s) => (
                            <TouchableOpacity
                              key={s}
                              style={[styles.optionBadge, editSub === s && styles.optionBadgeActive]}
                              onPress={() => setEditSub(s)}
                            >
                              <Text style={[styles.optionText, editSub === s && styles.optionTextActive]}>{s.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Plan Selector */}
                      <View style={styles.editRow}>
                        <Text style={styles.editRowLabel}>แพ็กเกจ (Plan):</Text>
                        <View style={styles.optionRow}>
                          {['free', 'basic', 'pro', 'imperial'].map((p) => (
                            <TouchableOpacity
                              key={p}
                              style={[styles.optionBadge, editPlan === p && styles.optionBadgeActive]}
                              onPress={() => setEditPlan(p)}
                            >
                              <Text style={[styles.optionText, editPlan === p && styles.optionTextActive]}>{p.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Status Selector */}
                      <View style={styles.editRow}>
                        <Text style={styles.editRowLabel}>สถานะ (Status):</Text>
                        <View style={styles.optionRow}>
                          {['active', 'pending', 'inactive'].map((st) => (
                            <TouchableOpacity
                              key={st}
                              style={[styles.optionBadge, editStatus === st && styles.optionBadgeActive]}
                              onPress={() => setEditStatus(st)}
                            >
                              <Text style={[styles.optionText, editStatus === st && styles.optionTextActive]}>{st.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={handleCancelEdit}
                          disabled={updating}
                        >
                          <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveBtn}
                          onPress={() => handleSaveUser(item.id)}
                          disabled={updating}
                        >
                          {updating ? (
                            <ActivityIndicator size="small" color="#020617" />
                          ) : (
                            <Text style={styles.saveBtnText}>บันทึก</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.metaRow}>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Role</Text>
                        <Text style={[styles.metaVal, item.role === 'admin' && { color: '#C084FC' }]}>
                          {item.role?.toUpperCase() || 'USER'}
                        </Text>
                      </View>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Tier / Plan</Text>
                        <Text style={styles.metaVal}>{item.subscription?.toUpperCase() || 'FREE'} / {item.plan || 'free'}</Text>
                      </View>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Status</Text>
                        <Text style={[
                          styles.metaVal,
                          item.membership_status === 'active' ? { color: '#34D399' } : item.membership_status === 'pending' ? { color: '#FBBF24' } : { color: '#EF4444' }
                        ]}>
                          {item.membership_status?.toUpperCase() || 'ACTIVE'}
                        </Text>
                      </View>

                      <TouchableOpacity style={styles.editBtn} onPress={() => handleStartEdit(item)}>
                        <Ionicons name="create-outline" size={18} color={THEME.gold} />
                      </TouchableOpacity>
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
  filterCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginBottom: 16
  },
  filterLabel: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 10
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: THEME.text,
    fontSize: 12,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  searchBtn: {
    backgroundColor: THEME.gold,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterSelectRow: {
    flexDirection: 'row',
    gap: 12
  },
  selectLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    fontFamily: 'IBMPlexSansThai_600SemiBold',
    marginBottom: 6
  },
  rowFilterOptions: {
    flexDirection: 'row',
    gap: 6
  },
  roleBadgeBtn: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  roleBadgeBtnActive: {
    borderColor: THEME.gold,
    backgroundColor: 'rgba(198, 169, 107, 0.1)'
  },
  roleBadgeText: {
    color: THEME.textMuted,
    fontSize: 9,
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  roleBadgeTextActive: {
    color: THEME.gold
  },
  userCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginBottom: 10
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(75, 110, 174, 0.2)',
    borderWidth: 1,
    borderColor: THEME.mystic,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cinzel_700Bold'
  },
  displayName: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  email: {
    color: THEME.textMuted,
    fontSize: 11,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginTop: 1
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaCol: {
    flex: 1
  },
  metaLabel: {
    color: THEME.textMuted,
    fontSize: 9,
    fontFamily: 'IBMPlexSansThai_500Medium'
  },
  metaVal: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginTop: 2
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198, 169, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.15)'
  },
  editForm: {
    gap: 12
  },
  editRow: {
    flexDirection: 'column',
    gap: 6
  },
  editRowLabel: {
    color: THEME.textMuted,
    fontSize: 9,
    fontFamily: 'IBMPlexSansThai_600SemiBold'
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  optionBadge: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  optionBadgeActive: {
    borderColor: THEME.gold,
    backgroundColor: 'rgba(198, 169, 107, 0.1)'
  },
  optionText: {
    color: THEME.textMuted,
    fontSize: 9,
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  optionTextActive: {
    color: THEME.gold
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  cancelBtnText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  saveBtn: {
    backgroundColor: THEME.gold,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center'
  },
  saveBtnText: {
    color: THEME.bg,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  }
});
