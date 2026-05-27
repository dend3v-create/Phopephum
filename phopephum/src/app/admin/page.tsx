"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Sparkles, ArrowLeft, Upload, Trash2, CheckSquare, Square, Info, Users, Crown, ShieldCheck, Clock, RefreshCw, Send } from "lucide-react";
import Link from "next/link";

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  created_at: string;
}

interface FeatureConfig {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  birth_date: string;
  birth_time?: string;
  plan: string;
  role: string;
  is_approved: boolean;
  approved_at?: string;
  created_at: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Knowledge base state
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("phopephum_meaning");
  const [newContent, setNewContent] = useState("");
  const [isSubmittingKnowledge, setIsSubmittingKnowledge] = useState(false);

  // Feature toggle state
  const [features, setFeatures] = useState<FeatureConfig[]>([]);

  // User management state
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);
  const [memberMsg, setMemberMsg] = useState('');

  // Role & Package Modal State
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = "/login";
          return;
        }

        // ดึงโปรไฟล์เพื่อเช็ค role
        let { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // MVP Helper: สถาปนาคนล็อกอินคนแรกเป็น admin หากยังไม่มี admin
        if (prof && prof.role !== "admin") {
          const { data: adminCheck } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .limit(1);

          if (!adminCheck || adminCheck.length === 0) {
            // ทำการโปรโมทเป็น admin เพื่อให้คุณทดสอบสะดวก
            await supabase
              .from("profiles")
              .update({ role: "admin" })
              .eq("id", user.id);
            
            prof.role = "admin";
          }
        }

        setProfile(prof);

        if (prof && (prof.role === "admin" || prof.role === "operator")) {
          setIsAdmin(true);
          await loadData();
        } else {
          // ไม่ใช่แอดมินหรือโอเปเรอเตอร์ ให้ดีดไปหน้าแดชบอร์ดผู้ใช้
          window.location.href = "/dashboard";
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const loadData = async () => {
    // 1. ดึงคลังความรู้
    const { data: kl } = await supabase
      .from("knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (kl) setKnowledgeList(kl);

    // 2. ดึงสถานะเปิด-ปิดฟังก์ชัน
    const { data: ft } = await supabase
      .from("mobile_features_config")
      .select("*")
      .order("created_at", { ascending: true });
    
    if (ft) setFeatures(ft);

    // 3. ดึงรายการสมาชิกทั้งหมด
    await loadMembers();
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': 'Bearer admin' }
      });
      if (res.ok) {
        const json = await res.json();
        setMembers(json.users || []);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleApprove = async (userId: string, action: 'approve' | 'reject', plan = 'premium') => {
    setApproveLoading(userId);
    setMemberMsg('');
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, plan })
      });
      const json = await res.json();
      if (json.success) {
        setMemberMsg(`✅ ${json.message}`);
        await loadMembers(); // รีโหลดรายการ
      } else {
        setMemberMsg(`❌ ${json.error || 'เกิดข้อผิดพลาด'}`);
      }
    } catch (err) {
      setMemberMsg('❌ ไม่สามารถเชื่อมต่อได้');
    } finally {
      setApproveLoading(null);
    }
  };

  const handleResendLine = async (member: UserProfile) => {
    try {
      await fetch('/api/notify/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_member',
          member: {
            id: member.id,
            full_name: member.full_name,
            email: member.email,
            birth_date: member.birth_date,
            birth_time: member.birth_time,
            created_at: member.created_at
          }
        })
      });
      setMemberMsg(`📲 ส่ง Line แจ้งเตือน ${member.full_name} อีกครั้งแล้ว`);
    } catch {
      setMemberMsg('❌ ส่ง Line ไม่สำเร็จ');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตั้งชื่อหัวข้อตามชื่อไฟล์ (ไม่รวมนามสกุล)
    const titleWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setNewTitle(titleWithoutExt);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setNewContent(text);
    };
    reader.readAsText(file);
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) {
      alert("⚠️ สิทธิ์ของคุณคือ Operator (ผู้ควบคุมสิทธิ์) สามารถอ่านข้อมูลได้เท่านั้น ไม่สามารถเพิ่ม แก้ไข หรือสอนระบบ AI ได้ครับ");
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmittingKnowledge(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .insert({
          title: newTitle,
          category: newCategory,
          content: newContent,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setKnowledgeList([data, ...knowledgeList]);
        setNewTitle("");
        setNewContent("");
        alert("เพิ่มข้อมูลความรู้สำเร็จ! AI ได้รับคำพยากรณ์และ Logic ใหม่แล้ว");
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message + "\n\n(หากระบบฟ้องว่าตารางไม่มีอยู่ กรุณาตรวจเช็ค SQL Editor ใน Supabase Dashboard ดูก่อนครับ)");
    } finally {
      setIsSubmittingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (isOperator) {
      alert("⚠️ สิทธิ์ของคุณคือ Operator (ผู้ควบคุมสิทธิ์) สามารถอ่านข้อมูลได้เท่านั้น ไม่สามารถลบข้อมูลจากสมอง AI ได้ครับ");
      return;
    }
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลความรู้นี้? AI จะสูญเสียปัญญาในด้านนี้ทันที")) return;

    const { error } = await supabase
      .from("knowledge_base")
      .delete()
      .eq("id", id);

    if (!error) {
      setKnowledgeList(knowledgeList.filter((item) => item.id !== id));
    }
  };

  const handleToggleFeature = async (featureId: string, currentStatus: boolean) => {
    if (isOperator) {
      alert("⚠️ สิทธิ์ของคุณคือ Operator (ผู้ควบคุมสิทธิ์) ไม่สามารถสลับการเปิด-ปิดฟังก์ชันของหน้าจอมือถือผู้ใช้ได้ครับ");
      return;
    }
    // อัปเดต UI ชั่วคราวก่อนเพื่อความลื่นไหล
    setFeatures(
      features.map((f) => (f.id === featureId ? { ...f, is_enabled: !currentStatus } : f))
    );

    try {
      const { error } = await supabase
        .from("mobile_features_config")
        .update({ is_enabled: !currentStatus })
        .eq("id", featureId);

      if (error) {
        // Revert on error
        setFeatures(
          features.map((f) => (f.id === featureId ? { ...f, is_enabled: currentStatus } : f))
        );
      }
    } catch {
      setFeatures(
        features.map((f) => (f.id === featureId ? { ...f, is_enabled: currentStatus } : f))
      );
    }
  };

  const isOperator = profile?.role === 'operator';

  const openRoleModal = (member: UserProfile) => {
    setSelectedMember(member);
    setSelectedPlan(member.plan || 'free');
    setSelectedRole(member.role || 'user');
  };

  const handleUpdateRoleAndPlan = async () => {
    if (!selectedMember) return;
    setIsUpdatingRole(true);
    setMemberMsg('');
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember.id,
          action: 'approve',
          plan: selectedPlan,
          role: selectedRole
        })
      });
      const json = await res.json();
      if (json.success) {
        setMemberMsg(`✅ อัปเดตสิทธิ์ ${selectedMember.full_name} เรียบร้อยแล้ว`);
        setSelectedMember(null);
        await loadMembers();
      } else {
        setMemberMsg(`❌ ${json.error || 'เกิดข้อผิดพลาดในการอัปเดต'}`);
      }
    } catch (err) {
      setMemberMsg('❌ เชื่อมต่อล้มเหลว');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="min-h-screen bg-hora-dark text-hora-text font-sans pb-20 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,169,110,0.08),transparent_60%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-hora border-b border-hora-dark-border bg-hora-dark/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-auto min-h-[5rem] py-3 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xl sm:text-2xl font-serif font-bold text-hora-gold tracking-wide">Phopephum</span>
            <span className="text-xxs bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              ADMIN CONTROL
            </span>
          </div>

          <Link
            href="/dashboard"
            className="text-xs hover:text-hora-gold text-hora-text-muted/80 flex items-center gap-1.5 transition-colors cursor-pointer border border-hora-dark-border/60 rounded-lg px-3 py-1.5 glass-hora w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าแดชบอร์ด
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 relative z-10 space-y-8">

        {/* ─── User Management Panel ─────────────────────────────── */}
        <div className="glass-hora rounded-2xl border border-hora-gold/30 overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-hora-dark-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-hora-gold/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-hora-gold" />
              </div>
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-serif font-semibold text-hora-gold-light">
                  👥 จัดการสมาชิก Beta Testers
                </h3>
                <p className="text-xxs text-hora-text-muted">
                  อนุมัติหรือปฏิเสธสิทธิ์สมาชิกด้วยคลิกเดียว — แจ้งเตือน Line อัตโนมัติเมื่อมีสมาชิกใหม่
                </p>
              </div>
            </div>
            <button
              onClick={loadMembers}
              disabled={membersLoading}
              className="flex items-center justify-center gap-2 text-xs text-hora-text-muted hover:text-hora-gold border border-hora-dark-border/40 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${membersLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>

          {memberMsg && (
            <div className={`mx-6 sm:mx-8 mt-4 text-xs px-4 py-2.5 rounded-lg text-left ${
              memberMsg.startsWith('✅') || memberMsg.startsWith('📲') 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {memberMsg}
            </div>
          )}

          {/* Mobile View: Cards Layout */}
          <div className="block sm:hidden divide-y divide-hora-dark-border/20">
            {membersLoading ? (
              <div className="text-center py-12 text-hora-text-muted text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-hora-gold" />
                กำลังโหลดรายชื่อสมาชิก...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <Info className="w-8 h-8 text-hora-text-muted mx-auto mb-2" />
                <p className="text-xs text-hora-text-muted">ยังไม่มีสมาชิกในระบบ</p>
              </div>
            ) : (
              members.map((m) => (
                <div key={m.id} className="p-4 space-y-3 bg-[#071329]/10 text-left">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-hora-text text-sm truncate">{m.full_name}</p>
                        {m.role === 'admin' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full font-bold uppercase">ADMIN</span>
                        )}
                        {m.role === 'operator' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full font-bold uppercase">OPERATOR</span>
                        )}
                      </div>
                      <p className="text-xxs text-hora-text-muted truncate">{m.email}</p>
                    </div>
                    <span className={`text-xxs px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide flex-shrink-0 ${
                      m.plan === 'imperial' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' :
                      m.plan === 'premium' ? 'bg-hora-gold/15 border-hora-gold/40 text-hora-gold' :
                      m.plan === 'pro' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                      'bg-gray-500/10 border-gray-500/30 text-gray-400'
                    }`}>
                      {m.plan === 'imperial' ? '💎 Imperial' : m.plan === 'premium' ? '👑 Premium' : m.plan === 'pro' ? '⭐ Pro' : '🔓 Free'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-hora-text-muted">วันเกิด:</span>
                    <span className="text-hora-text font-medium">
                      {m.birth_date ? new Date(m.birth_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      {m.birth_time && ` ${m.birth_time.slice(0,5)} น.`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-hora-text-muted">สถานะ:</span>
                    {m.is_approved ? (
                      <span className="text-green-400 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> อนุมัติแล้ว</span>
                    ) : (
                      <span className="text-yellow-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> รอการอนุมัติ</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 border-t border-hora-dark-border/10">
                    {!m.is_approved ? (
                      <>
                        <button
                          onClick={() => openRoleModal(m)}
                          disabled={approveLoading === m.id}
                          className="flex items-center gap-1 text-[10px] bg-hora-gold/15 hover:bg-hora-gold/25 border border-hora-gold/40 text-hora-gold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 font-semibold cursor-pointer"
                        >
                          <Crown className="w-3 h-3" />
                          อนุมัติ & ตั้งค่าสิทธิ์
                        </button>
                        <button
                          onClick={() => handleResendLine(m)}
                          className="flex items-center gap-1 text-[10px] bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Line
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(m.id, 'reject')}
                          disabled={approveLoading === m.id}
                          className="flex items-center gap-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 font-semibold cursor-pointer"
                        >
                          {approveLoading === m.id ? 'ระงับ...' : '🚫 ระงับสิทธิ์'}
                        </button>
                        <button
                          onClick={() => openRoleModal(m)}
                          disabled={approveLoading === m.id}
                          className="flex items-center gap-1 text-[10px] bg-hora-gold/15 hover:bg-hora-gold/25 border border-hora-gold/40 text-hora-gold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 font-semibold cursor-pointer"
                        >
                          <Crown className="w-3 h-3" /> จัดการบทบาท
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table Layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-hora-dark-border/40">
                  <th className="text-left px-8 py-4 text-xxs uppercase tracking-wider text-hora-text-muted">ชื่อ / อีเมล</th>
                  <th className="text-left px-4 py-4 text-xxs uppercase tracking-wider text-hora-text-muted">วันเกิด</th>
                  <th className="text-left px-4 py-4 text-xxs uppercase tracking-wider text-hora-text-muted">สิทธิ์</th>
                  <th className="text-left px-4 py-4 text-xxs uppercase tracking-wider text-hora-text-muted">สถานะ</th>
                  <th className="text-right px-8 py-4 text-xxs uppercase tracking-wider text-hora-text-muted">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-hora-text-muted text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-hora-gold" />
                      กำลังโหลดรายชื่อสมาชิก...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Info className="w-8 h-8 text-hora-text-muted mx-auto mb-2" />
                      <p className="text-xs text-hora-text-muted">ยังไม่มีสมาชิกในระบบ</p>
                    </td>
                  </tr>
                ) : members.map((m) => (
                  <tr key={m.id} className="border-b border-hora-dark-border/20 hover:bg-hora-gold/3 transition-colors">
                    <td className="px-8 py-4">
                      <div className="text-left">
                        <p className="font-semibold text-hora-text text-sm">{m.full_name}</p>
                        <p className="text-xxs text-hora-text-muted">{m.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-hora-text-muted text-left">
                      {m.birth_date ? new Date(m.birth_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      {m.birth_time && <span className="block">{m.birth_time.slice(0,5)} น.</span>}
                    </td>
                    <td className="px-4 py-4 text-left">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-xxs px-2 py-1 rounded-full border font-bold uppercase tracking-wide ${
                          m.plan === 'imperial' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' :
                          m.plan === 'premium' ? 'bg-hora-gold/15 border-hora-gold/40 text-hora-gold' :
                          m.plan === 'pro' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                          'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }`}>
                          {m.plan === 'imperial' ? '💎 Imperial · แพ็ก 3' : m.plan === 'premium' ? '👑 Premium · แพ็ก 2' : m.plan === 'pro' ? '⭐ Pro · แพ็ก 1' : '🔓 Free'}
                        </span>
                        {m.role === 'admin' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold uppercase">
                            ADMIN
                          </span>
                        )}
                        {m.role === 'operator' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold uppercase">
                            OPERATOR
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-left">
                      {m.is_approved ? (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-xxs">อนุมัติแล้ว</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-yellow-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-xxs">รอการอนุมัติ</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!m.is_approved ? (
                          <>
                            <button
                              onClick={() => openRoleModal(m)}
                              disabled={approveLoading === m.id}
                              className="flex items-center gap-1.5 text-xxs bg-hora-gold/15 hover:bg-hora-gold/25 border border-hora-gold/40 text-hora-gold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 font-semibold cursor-pointer"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              อนุมัติ & ตั้งค่าสิทธิ์
                            </button>
                            <button
                              onClick={() => handleResendLine(m)}
                              className="flex items-center gap-1.5 text-xxs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              Line
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApprove(m.id, 'reject')}
                              disabled={approveLoading === m.id}
                              className="flex items-center gap-1.5 text-xxs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 font-semibold cursor-pointer"
                            >
                              {approveLoading === m.id ? 'กำลังดำเนินการ...' : '🚫 ระงับสิทธิ์'}
                            </button>
                            <button
                              onClick={() => openRoleModal(m)}
                              disabled={approveLoading === m.id}
                              className="flex items-center gap-1.5 text-xxs bg-hora-gold/15 hover:bg-hora-gold/25 border border-hora-gold/40 text-hora-gold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 font-semibold cursor-pointer"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              จัดการสิทธิ์ & บทบาท
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Knowledge + Feature Controls ──────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Knowledge Developer System */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-hora rounded-2xl p-8 border border-hora-dark-border/80">
            <h3 className="text-xl font-serif font-semibold text-hora-gold-light mb-2 flex items-center gap-2">
              🧠 คลังวิทยาการเฉพาะทางเพื่อพัฒนาสมอง AI (Knowledge Base RAG)
            </h3>
            <p className="text-xs text-hora-text-muted mb-6 leading-relaxed">
              วางข้อมูลดิบ (TXT) หรืออัปโหลดไฟล์หลักทฤษฎีพยากรณ์ เพื่อให้ระบบนำข้อมูลเหล่านั้นแนบไปสอน AI ก่อนส่งคำทำนายแก่ลูกค้า เพิ่มความขลังและความคลาสสิกของแบรนด์
            </p>
            {isOperator && (
              <div className="mb-6 p-4 bg-purple-950/40 border border-purple-500/30 text-purple-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                🛡️ สถานะผู้ควบคุมสิทธิ์ (Operator Mode): คุณสามารถเข้าตรวจสอบรายการความรู้ได้เท่านั้น ไม่มีสิทธิ์เพิ่ม ลบ หรือแก้ไขคลัง RAG เพื่อป้องกันความปลอดภัยของข้อมูลหลักครับ
              </div>
            )}

            <form onSubmit={handleAddKnowledge} className="space-y-5 text-left font-sans">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-hora-text-muted">หัวข้อวิทยาการ/ชื่อคัมภีร์</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ความหมาย 35 ภพภูมิระดับลึก, คัมภีร์การวิเคราะห์วัยจร"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#071329] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-hora-text-muted">หมวดหมู่วิทยาศาสตร์พยากรณ์</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#071329] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none"
                  >
                    <option value="phopephum_meaning">ความหมายของภพภูมิ (Phopephum Meanings)</option>
                    <option value="definition">คำจำกัดความบางอย่าง (Definitions)</option>
                    <option value="prediction_guideline">แนวทางการทำนาย (Prediction Guidelines)</option>
                    <option value="reading_logic">Logic การอ่านคำทำนาย (Prediction Logic)</option>
                    <option value="seven_base_9_stars">เลข 7 ตัว 9 ฐาน (7 Base 9 Stars)</option>
                    <option value="hora_tai_noo">โหรทายหนู (Hora Tai Noo)</option>
                    <option value="thai_astrology">โหราศาสตร์ไทย (Thai Astrology)</option>
                    <option value="attakarn_hora">ยามอัฐกาล (Attakarn Hora)</option>
                    <option value="psychology_philosophy">จิตวิทยาและปรัชญา (Psychology & Philosophy)</option>
                    <option value="chakra_energy">จักระและพลังงาน (Chakra & Energy)</option>
                    <option value="therapy_life_guide">การบำบัดและไกด์ชีวิต (Therapy & Life Guide)</option>
                  </select>
                </div>
              </div>

              {/* Upload TXT File Helper */}
              <div className="border border-dashed border-hora-dark-border/40 rounded-xl p-4 bg-[#071329]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-hora-gold-light" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-hora-text">อัปโหลดไฟล์คลังความรู้ด้วยไฟล์ TXT</p>
                    <p className="text-xxs text-hora-text-muted">ระบบจะอ่านข้อความและกรอกลงฟอร์มข้างล่างให้อัตโนมัติ</p>
                  </div>
                </div>
                {!isOperator ? (
                  <label className="btn-hora py-1.5 px-4 text-xs cursor-pointer">
                    เลือกไฟล์ .txt
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <span className="text-purple-400 text-xxs font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-md">Read Only</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted">เนื้อหาคลังวิชาการ (ข้อมูลดิบ/กฎและเงื่อนไขพยากรณ์)</label>
                <textarea
                  required={!isOperator}
                  disabled={isOperator}
                  rows={8}
                  placeholder={isOperator ? "บัญชีผู้ควบคุมสิทธิ์ (Operator) สามารถอ่านได้อย่างเดียว ไม่สามารถพิมพ์ RAG ได้..." : "ป้อนกฎการทำนาย รายละเอียดความหมายของภพภูมิแต่ละฐาน หรือ Logic การเขียนอธิบายชีวิตที่ต้องการให้ AI ปฏิบัติตามอย่างเคร่งครัด..."}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-[#071329] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-3 text-sm text-hora-text outline-none resize-none font-sans disabled:opacity-50"
                />
              </div>

              {isOperator ? (
                <div className="w-full py-3 rounded-lg bg-purple-950/20 border border-purple-500/30 text-purple-400 text-center font-semibold text-xs">
                  🛡️ ฟังก์ชันการสอนสมอง AI RAG ปิดสำหรับ Operator
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmittingKnowledge}
                  className="btn-hora w-full py-3 rounded-lg font-semibold text-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingKnowledge ? "กำลังติดตั้งความรู้ลงสมอง AI..." : "ยืนยันการเพิ่มและสอนระบบ AI"}
                </button>
              )}
            </form>
          </div>

          {/* List of Knowledge items */}
          <div className="glass-hora rounded-2xl p-8 border border-hora-dark-border/80 text-left">
            <h4 className="text-lg font-serif font-semibold text-hora-gold-light mb-4">
              📚 รายการความรู้เฉพาะทางที่ AI กำลังจดจำใช้งาน ({knowledgeList.length} เรื่อง)
            </h4>

            {knowledgeList.length === 0 ? (
              <div className="text-center py-10 border border-hora-dark-border/30 rounded-xl bg-hora-dark-card/20 space-y-2">
                <Info className="w-8 h-8 text-hora-text-muted mx-auto" />
                <p className="text-sm text-hora-text-muted font-sans">ยังไม่ได้สอนความรู้แก่ระบบ AI ในตอนนี้</p>
              </div>
            ) : (
              <div className="space-y-4">
                {knowledgeList.map((item) => (
                  <div key={item.id} className="bg-[#071329]/40 border border-hora-dark-border/40 rounded-xl p-5 flex items-start justify-between gap-4 font-sans">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-semibold text-hora-gold-light text-sm">{item.title}</h5>
                        <span className="text-xxs bg-hora-gold/10 border border-hora-gold/30 text-hora-gold-light px-2 py-0.5 rounded-full uppercase">
                          {item.category === "phopephum_meaning" && "ความหมายภพภูมิ"}
                          {item.category === "definition" && "คำจำกัดความ"}
                          {item.category === "prediction_guideline" && "แนวทางการทำนาย"}
                          {item.category === "reading_logic" && "Logic การทำนาย"}
                          {item.category === "seven_base_9_stars" && "เลข 7 ตัว 9 ฐาน"}
                          {item.category === "hora_tai_noo" && "โหรทายหนู"}
                          {item.category === "thai_astrology" && "โหราศาสตร์ไทย"}
                          {item.category === "attakarn_hora" && "ยามอัฐกาล"}
                          {item.category === "psychology_philosophy" && "จิตวิทยาและปรัชญา"}
                          {item.category === "chakra_energy" && "จักระและพลังงาน"}
                          {item.category === "therapy_life_guide" && "การบำบัดและไกด์ชีวิต"}
                        </span>
                      </div>
                      <p className="text-xs text-hora-text-muted line-clamp-3 leading-relaxed text-left whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteKnowledge(item.id)}
                      className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="ลบข้อมูลความรู้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Mobile Feature Toggle Control */}
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-hora rounded-2xl p-6 border-2 border-hora-gold/30 relative overflow-hidden bg-hora-dark-card/60">
            <h3 className="text-lg font-serif font-semibold text-hora-gold-light mb-3 flex items-center gap-2 border-b border-hora-gold/20 pb-3">
              📱 แผงควบคุมหน้าจอมือถือ (Feature Display Config)
            </h3>
            <p className="text-xxs text-hora-text-muted mb-6 leading-relaxed">
              ติ๊กเลือกเพื่อเปิด-ปิดการแสดงผลของแต่ละ Widget วิจิตรศิลป์บนแดชบอร์ดหน้าจอมือถือของผู้ใช้ได้แบบ Real-time
            </p>

            <div className="space-y-4 font-sans text-left">
              {features.map((feat) => (
                <div
                  key={feat.id}
                  onClick={() => handleToggleFeature(feat.id, feat.is_enabled)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                    feat.is_enabled
                      ? "border-hora-gold/40 bg-hora-gold/5"
                      : "border-hora-dark-border/40 bg-black/20 opacity-70"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-hora-text">{feat.feature_name}</p>
                    <p className="text-xxs text-hora-text-muted font-sans">
                      Key: <strong className="text-hora-gold-light">{feat.feature_key}</strong>
                    </p>
                  </div>
                  
                  <div>
                    {feat.is_enabled ? (
                      <CheckSquare className="w-5 h-5 text-hora-gold-cta" />
                    ) : (
                      <Square className="w-5 h-5 text-hora-text-muted" />
                    )}
                  </div>
                </div>
              ))}

              {features.length === 0 && (
                <div className="text-center py-6 border border-hora-dark-border/30 rounded-xl bg-hora-dark-card/20">
                  <p className="text-xs text-hora-text-muted font-sans">ยังไม่ได้สร้างการตั้งค่าเริ่มต้นขึ้นมา</p>
                </div>
              )}
            </div>
          </div>
        </div>

        </div>{/* end grid */}

      </main>

      {/* ─── Role & Package Configuration Modal ─── */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#071329] border border-hora-gold/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative space-y-6 text-left font-sans">
            <div className="absolute top-0 right-0 w-32 h-32 bg-hora-gold/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-1.5">
              <h3 className="text-lg font-serif font-semibold text-hora-gold-light flex items-center gap-2">
                ⚙️ กำหนดสิทธิ์และบทบาทสมาชิก
              </h3>
              <p className="text-xxs text-hora-text-muted">
                กำหนดระดับการเข้าถึงระบบและแพ็กเกจของสมาชิกแต่ละท่าน
              </p>
            </div>

            <div className="border border-hora-dark-border/20 rounded-xl p-4 bg-black/20 text-xs space-y-1">
              <p className="text-hora-text font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-hora-gold" /> {selectedMember.full_name}
              </p>
              <p className="text-hora-text-muted">{selectedMember.email}</p>
            </div>

            <div className="space-y-4">
              {/* Role Select */}
              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted font-semibold">1. บทบาทการเข้าถึงระบบ (System Role)</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-[#030a17] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-3 py-2 text-sm text-hora-text outline-none"
                >
                  <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                  <option value="operator">ผู้ควบคุมสิทธิ์ (Operator) - เทียบเท่าแอดมิน แต่อ่าน RAG ได้อย่างเดียว</option>
                  <option value="admin">ผู้ดูแลระบบสูงสุด (Admin)</option>
                </select>
              </div>

              {/* Plan Select */}
              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted font-semibold">2. ระดับสิทธิ์แพ็กเกจ (Subscription Plan)</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-[#030a17] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-3 py-2 text-sm text-hora-text outline-none"
                >
                  <option value="free">🔓 สมาชิกทั่วไป (Free Plan) - จำกัดโควตา 5 Token</option>
                  <option value="pro">⭐ สมาชิกแพ็ก 1 (Pro Plan) - โควตา 500 Token</option>
                  <option value="premium">👑 สมาชิกแพ็ก 2 (Premium Plan) - โควตา 999,999 Token</option>
                  <option value="imperial">💎 สมาชิกแพ็ก 3 (Imperial Plan) - โควตาสูงสุดไม่จำกัด</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => setSelectedMember(null)}
                className="flex-1 bg-black/30 hover:bg-black/50 border border-hora-dark-border/50 text-hora-text-muted py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdateRoleAndPlan}
                disabled={isUpdatingRole}
                className="flex-1 bg-gradient-to-r from-hora-gold to-hora-gold-light hover:brightness-110 text-[#071329] py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer text-center"
              >
                {isUpdatingRole ? "กำลังอัปเดต..." : "บันทึกและอนุมัติ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
