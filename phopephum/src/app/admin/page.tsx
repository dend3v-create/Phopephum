"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ArrowLeft, Upload, Trash2, CheckSquare, Square, Info, Users, Crown, ShieldCheck, Clock, RefreshCw, Send, Brain, Smartphone } from "lucide-react";
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

type AdminTab = "members" | "knowledge" | "features" | "services";

const UPCOMING_SERVICES = [
  {
    icon: "☽",
    title: "ยามอัฐกาล",
    subtitle: "ทำนายทุก 90 นาที",
    desc: "วิเคราะห์ดาวเสวยยามและการพยากรณ์รายยาม (เรื่องที่ได้ยิน, คนเจ็บไข้, ของหาย, การเดินทาง) ตามหลักโหราศาสตร์ไทยโบราณ",
    tag: "พร้อมใช้งาน",
    tagStyle: { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" },
    href: "/dashboard",
  },
  {
    icon: "🐘",
    title: "พระรามเดินดง",
    subtitle: "วิเคราะห์ทุก 30 นาที",
    desc: "ระบบพระรามเดินดงแบ่งยามละ 30 นาที พยากรณ์ดวงในช่วงเวลาสั้นที่แม่นยำสูง",
    tag: "เร็วๆ นี้",
    tagStyle: { background: "rgba(217,188,130,0.1)", border: "1px solid rgba(217,188,130,0.25)", color: "#C6A96B" },
    href: null,
  },
  {
    icon: "💰",
    title: "ยามราหูค้นทรัพย์",
    subtitle: "หาฤกษ์รวย ทุก 10 นาที",
    desc: "คำนวณยามราหูรายคืน — หาเวลามงคลสำหรับธุรกิจ การลงทุน และระวังภัยโจรปล้น",
    tag: "เร็วๆ นี้",
    tagStyle: { background: "rgba(217,188,130,0.1)", border: "1px solid rgba(217,188,130,0.25)", color: "#C6A96B" },
    href: null,
  },
  {
    icon: "🐭",
    title: "โหรทายหนู",
    subtitle: "พยากรณ์ทุก 7 นาที",
    desc: "ระบบโหรทายหนูดั้งเดิม แบ่งเวลาออกเป็นช่วง 7 นาที เหมาะสำหรับตัดสินใจเรื่องเร่งด่วน",
    tag: "เร็วๆ นี้",
    tagStyle: { background: "rgba(217,188,130,0.1)", border: "1px solid rgba(217,188,130,0.25)", color: "#C6A96B" },
    href: null,
  },
  {
    icon: "✦",
    title: "เลข 7 ตัว 9 ฐาน",
    subtitle: "ยามอัศนี · ยามสาริกา",
    desc: "วิเคราะห์กาลชะตาส่วนตัวในเชิงลึกด้วยเลข 7 ตัว ตัดสินใจรายยาม — ดีกว่ายามอัฐกาลหลายเท่า",
    tag: "Beta",
    tagStyle: { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" },
    href: "/dashboard",
  },
  {
    icon: "✈",
    title: "Affiliate & บริการเดินทาง",
    subtitle: "จองตั๋ว · ท่องเที่ยว",
    desc: "เชื่อมต่อบริการเดินทางและท่องเที่ยว — ค้นหาฤกษ์ดีก่อนออกเดินทาง พร้อมจองตั๋วในแอปเดียว",
    tag: "กำลังพัฒนา",
    tagStyle: { background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", color: "#7dd3fc" },
    href: null,
  },
] as const;

const CARD_STYLE = {
  background: "rgba(10,34,64,0.55)",
  border: "1px solid rgba(217,188,130,0.18)",
  borderRadius: 16,
};

const INPUT_STYLE = {
  background: "rgba(4,20,48,0.7)",
  border: "1px solid rgba(217,188,130,0.18)",
};

const MODAL_INPUT_STYLE = {
  background: "rgba(2,10,28,0.9)",
  border: "1px solid rgba(217,188,130,0.18)",
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>("members");

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

        let { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (prof && prof.role !== "admin") {
          const { data: adminCheck } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .limit(1);

          if (!adminCheck || adminCheck.length === 0) {
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
    const { data: kl } = await supabase
      .from("knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });
    if (kl) setKnowledgeList(kl);

    const { data: ft } = await supabase
      .from("mobile_features_config")
      .select("*")
      .order("created_at", { ascending: true });
    if (ft) setFeatures(ft);

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
        await loadMembers();
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
      alert("⚠️ สิทธิ์ของคุณคือ Operator สามารถอ่านข้อมูลได้เท่านั้น ไม่สามารถเพิ่ม แก้ไข หรือสอนระบบ AI ได้");
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmittingKnowledge(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .insert({ title: newTitle, category: newCategory, content: newContent })
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
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsSubmittingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (isOperator) {
      alert("⚠️ สิทธิ์ของคุณคือ Operator ไม่สามารถลบข้อมูลจากสมอง AI ได้");
      return;
    }
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลความรู้นี้?")) return;

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
      alert("⚠️ สิทธิ์ของคุณคือ Operator ไม่สามารถสลับการเปิด-ปิดฟังก์ชันได้");
      return;
    }
    setFeatures(features.map((f) => (f.id === featureId ? { ...f, is_enabled: !currentStatus } : f)));

    try {
      const { error } = await supabase
        .from("mobile_features_config")
        .update({ is_enabled: !currentStatus })
        .eq("id", featureId);

      if (error) {
        setFeatures(features.map((f) => (f.id === featureId ? { ...f, is_enabled: currentStatus } : f)));
      }
    } catch {
      setFeatures(features.map((f) => (f.id === featureId ? { ...f, is_enabled: currentStatus } : f)));
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

  // ─── Derived stats ───────────────────────────────────────────────
  const totalMembers = members.length;
  const pendingMembers = members.filter(m => !m.is_approved).length;
  const approvedMembers = members.filter(m => m.is_approved).length;
  const knowledgeCount = knowledgeList.length;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans"
        style={{ background: "linear-gradient(180deg, #020617 0%, #071427 50%, #0A2240 100%)" }}
      >
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-hora-gold/40 border-t-hora-gold rounded-full animate-spin mx-auto" />
          <p className="text-xs text-hora-text-muted">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div
      className="min-h-screen text-hora-text font-sans pb-24 relative"
      style={{ background: "linear-gradient(180deg, #020617 0%, #071427 50%, #0A2240 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%, rgba(201,169,110,0.07) 0%, transparent 55%)" }} />

      {/* ─── Header ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{ background: "rgba(2,6,23,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(217,188,130,0.14)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-serif font-bold text-hora-gold tracking-wide">Phopephum</span>
            <span className="text-[9px] bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              ADMIN
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-hora-text-muted hover:text-hora-gold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">กลับแดชบอร์ด</span>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4 relative z-10 space-y-4">

        {/* ─── Stats Bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "สมาชิก", value: totalMembers, color: "#D9BC82" },
            { label: "รออนุมัติ", value: pendingMembers, color: "#facc15" },
            { label: "อนุมัติแล้ว", value: approvedMembers, color: "#4ade80" },
            { label: "คลัง AI", value: knowledgeCount, color: "#a78bfa" },
          ].map((s) => (
            <div
              key={s.label}
              style={{ ...CARD_STYLE, padding: "10px 8px", textAlign: "center" }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: "rgba(198,169,107,0.65)", marginTop: 3, letterSpacing: "0.04em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ─── Tab Navigation ────────────────────────────────────── */}
        <div
          style={{ ...CARD_STYLE, padding: "4px", display: "flex", gap: 4 }}
        >
          {([
            { id: "members" as AdminTab, label: "สมาชิก", icon: <Users className="w-3.5 h-3.5" /> },
            { id: "knowledge" as AdminTab, label: "คลัง AI", icon: <Brain className="w-3.5 h-3.5" /> },
            { id: "features" as AdminTab, label: "แสดงผล", icon: <Smartphone className="w-3.5 h-3.5" /> },
            { id: "services" as AdminTab, label: "บริการ", icon: <Crown className="w-3.5 h-3.5" /> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "9px 6px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                background: adminTab === tab.id ? "rgba(198,169,107,0.18)" : "transparent",
                color: adminTab === tab.id ? "#D9BC82" : "rgba(198,169,107,0.5)",
                outline: adminTab === tab.id ? "1px solid rgba(217,188,130,0.30)" : "none",
              }}
            >
              {tab.icon}
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden" style={{ fontSize: 9 }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── Tab: Members ─────────────────────────────────────── */}
        {adminTab === "members" && (
          <div style={CARD_STYLE} className="overflow-hidden">
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(217,188,130,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#D9BC82", fontFamily: "'Playfair Display', serif" }}>
                  👥 จัดการสมาชิก Beta Testers
                </div>
                <div style={{ fontSize: 10, color: "rgba(198,169,107,0.55)", marginTop: 2 }}>
                  อนุมัติสิทธิ์ · แจ้งเตือน Line อัตโนมัติ
                </div>
              </div>
              <button
                onClick={loadMembers}
                disabled={membersLoading}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(198,169,107,0.7)", background: "rgba(198,169,107,0.08)", border: "1px solid rgba(217,188,130,0.18)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                className="disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${membersLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
            </div>

            {memberMsg && (
              <div style={{ margin: "10px 14px 0", padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: memberMsg.startsWith('✅') || memberMsg.startsWith('📲') ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', color: memberMsg.startsWith('✅') || memberMsg.startsWith('📲') ? '#4ade80' : '#f87171', border: memberMsg.startsWith('✅') || memberMsg.startsWith('📲') ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(248,113,113,0.2)' }}>
                {memberMsg}
              </div>
            )}

            <div style={{ padding: "8px 0" }}>
              {membersLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-hora-gold" />
                  <p style={{ fontSize: 11, color: "rgba(198,169,107,0.55)" }}>กำลังโหลด...</p>
                </div>
              ) : members.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <Info className="w-7 h-7 mx-auto mb-2" style={{ color: "rgba(198,169,107,0.4)" }} />
                  <p style={{ fontSize: 11, color: "rgba(198,169,107,0.55)" }}>ยังไม่มีสมาชิกในระบบ</p>
                </div>
              ) : (
                <div>
                  {members.map((m, i) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "12px 14px",
                        borderBottom: i < members.length - 1 ? "1px solid rgba(217,188,130,0.07)" : "none",
                      }}
                    >
                      {/* Row 1: Name + plan badge */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#E8D5A3" }}>{m.full_name}</span>
                            {m.role === 'admin' && (
                              <span style={{ fontSize: 8, padding: "1px 6px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", borderRadius: 20, fontWeight: 700, letterSpacing: "0.08em" }}>ADMIN</span>
                            )}
                            {m.role === 'operator' && (
                              <span style={{ fontSize: 8, padding: "1px 6px", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", borderRadius: 20, fontWeight: 700, letterSpacing: "0.08em" }}>OPR</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(198,169,107,0.5)", marginTop: 1 }}>{m.email}</div>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 20, flexShrink: 0,
                          ...(m.plan === 'imperial' ? { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.35)", color: "#22d3ee" } :
                             m.plan === 'premium' ? { background: "rgba(217,188,130,0.12)", border: "1px solid rgba(217,188,130,0.35)", color: "#D9BC82" } :
                             m.plan === 'pro' ? { background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa" } :
                             { background: "rgba(156,163,175,0.1)", border: "1px solid rgba(156,163,175,0.25)", color: "#9ca3af" })
                        }}>
                          {m.plan === 'imperial' ? '💎 Imperial' : m.plan === 'premium' ? '👑 Premium' : m.plan === 'pro' ? '⭐ Pro' : '🔓 Free'}
                        </span>
                      </div>

                      {/* Row 2: birth + status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, color: "rgba(198,169,107,0.5)" }}>
                          {m.birth_date ? new Date(m.birth_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                          {m.birth_time && ` · ${m.birth_time.slice(0,5)}`}
                        </span>
                        {m.is_approved ? (
                          <span style={{ fontSize: 10, color: "#4ade80", display: "flex", alignItems: "center", gap: 4 }}>
                            <ShieldCheck className="w-3 h-3" /> อนุมัติแล้ว
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "#facc15", display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock className="w-3 h-3" /> รอการอนุมัติ
                          </span>
                        )}
                      </div>

                      {/* Row 3: Actions */}
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {!m.is_approved ? (
                          <>
                            <button
                              onClick={() => openRoleModal(m)}
                              disabled={approveLoading === m.id}
                              style={{ fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "rgba(198,169,107,0.12)", border: "1px solid rgba(217,188,130,0.35)", color: "#D9BC82", cursor: "pointer" }}
                              className="disabled:opacity-50"
                            >
                              <Crown className="w-3 h-3" /> อนุมัติ & ตั้งสิทธิ์
                            </button>
                            <button
                              onClick={() => handleResendLine(m)}
                              style={{ fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa", cursor: "pointer" }}
                            >
                              <Send className="w-3 h-3" /> Line
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApprove(m.id, 'reject')}
                              disabled={approveLoading === m.id}
                              style={{ fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", cursor: "pointer" }}
                              className="disabled:opacity-50"
                            >
                              {approveLoading === m.id ? '...' : '🚫 ระงับ'}
                            </button>
                            <button
                              onClick={() => openRoleModal(m)}
                              disabled={approveLoading === m.id}
                              style={{ fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "rgba(198,169,107,0.12)", border: "1px solid rgba(217,188,130,0.35)", color: "#D9BC82", cursor: "pointer" }}
                              className="disabled:opacity-50"
                            >
                              <Crown className="w-3 h-3" /> จัดการสิทธิ์
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab: Knowledge ───────────────────────────────────── */}
        {adminTab === "knowledge" && (
          <div className="space-y-4">
            <div style={{ ...CARD_STYLE, padding: "16px" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#D9BC82", fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>
                  🧠 คลังวิทยาการ AI (Knowledge Base RAG)
                </div>
                <div style={{ fontSize: 10, color: "rgba(198,169,107,0.55)", lineHeight: 1.5 }}>
                  อัปโหลดหรือพิมพ์หลักทฤษฎีพยากรณ์เพื่อสอน AI ให้ตอบได้แม่นยำยิ่งขึ้น
                </div>
              </div>

              {isOperator && (
                <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>
                  🛡️ Operator Mode: อ่านข้อมูลได้เท่านั้น ไม่สามารถเพิ่ม ลบ หรือแก้ไขคลัง RAG ได้
                </div>
              )}

              <form onSubmit={handleAddKnowledge} className="space-y-3 font-sans">
                <div>
                  <label style={{ fontSize: 10, color: "rgba(198,169,107,0.65)", display: "block", marginBottom: 5 }}>หัวข้อวิทยาการ / ชื่อคัมภีร์</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ความหมาย 35 ภพภูมิระดับลึก"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={INPUT_STYLE}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none focus:border-hora-gold/80"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, color: "rgba(198,169,107,0.65)", display: "block", marginBottom: 5 }}>หมวดหมู่</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={INPUT_STYLE}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none"
                  >
                    <option value="phopephum_meaning">ความหมายของภพภูมิ</option>
                    <option value="definition">คำจำกัดความ</option>
                    <option value="prediction_guideline">แนวทางการทำนาย</option>
                    <option value="reading_logic">Logic การอ่านคำทำนาย</option>
                    <option value="seven_base_9_stars">เลข 7 ตัว 9 ฐาน</option>
                    <option value="hora_tai_noo">โหรทายหนู</option>
                    <option value="thai_astrology">โหราศาสตร์ไทย</option>
                    <option value="attakarn_hora">ยามอัฐกาล</option>
                    <option value="psychology_philosophy">จิตวิทยาและปรัชญา</option>
                    <option value="chakra_energy">จักระและพลังงาน</option>
                    <option value="therapy_life_guide">การบำบัดและไกด์ชีวิต</option>
                  </select>
                </div>

                {/* Upload */}
                <div style={{ ...INPUT_STYLE, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Upload className="w-4 h-4" style={{ color: "#D9BC82", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#E8D5A3" }}>อัปโหลดไฟล์ .txt</div>
                      <div style={{ fontSize: 9, color: "rgba(198,169,107,0.5)" }}>ระบบกรอกข้อมูลลงฟอร์มให้อัตโนมัติ</div>
                    </div>
                  </div>
                  {!isOperator ? (
                    <label style={{ fontSize: 10, fontWeight: 700, padding: "5px 10px", background: "rgba(198,169,107,0.12)", border: "1px solid rgba(217,188,130,0.3)", color: "#D9BC82", borderRadius: 8, cursor: "pointer" }}>
                      เลือกไฟล์
                      <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                    </label>
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, padding: "3px 8px" }}>Read Only</span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 10, color: "rgba(198,169,107,0.65)", display: "block", marginBottom: 5 }}>เนื้อหาคลังวิชาการ</label>
                  <textarea
                    required={!isOperator}
                    disabled={isOperator}
                    rows={7}
                    placeholder={isOperator ? "Operator สามารถอ่านได้อย่างเดียว..." : "ป้อนกฎการทำนาย รายละเอียดความหมายของภพภูมิ หรือ Logic ที่ต้องการให้ AI ปฏิบัติตาม..."}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    style={INPUT_STYLE}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none resize-none disabled:opacity-50"
                  />
                </div>

                {isOperator ? (
                  <div style={{ textAlign: "center", padding: "10px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>
                    🛡️ ฟังก์ชันสอนสมอง AI ปิดสำหรับ Operator
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmittingKnowledge}
                    className="w-full btn-hora py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
                  >
                    {isSubmittingKnowledge ? "กำลังติดตั้งความรู้..." : "ยืนยันการเพิ่มและสอน AI"}
                  </button>
                )}
              </form>
            </div>

            {/* Knowledge List */}
            <div style={{ ...CARD_STYLE, padding: "14px 14px 8px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#D9BC82", fontFamily: "'Playfair Display', serif", marginBottom: 10 }}>
                📚 รายการความรู้ที่ AI จดจำ ({knowledgeList.length} เรื่อง)
              </div>
              {knowledgeList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ fontSize: 11, color: "rgba(198,169,107,0.45)" }}>ยังไม่ได้สอนความรู้แก่ระบบ AI</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeList.map((item) => (
                    <div
                      key={item.id}
                      style={{ background: "rgba(4,20,48,0.5)", border: "1px solid rgba(217,188,130,0.12)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#D9BC82" }}>{item.title}</span>
                          <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", background: "rgba(198,169,107,0.08)", border: "1px solid rgba(217,188,130,0.2)", color: "#C6A96B", borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            {item.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p style={{ fontSize: 10, color: "rgba(198,169,107,0.5)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {item.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteKnowledge(item.id)}
                        style={{ color: "#f87171", padding: "4px", borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab: Features ─────────────────────────────────────── */}
        {adminTab === "features" && (
          <div style={{ ...CARD_STYLE, padding: "16px" }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D9BC82", fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>
                📱 แผงควบคุมหน้าจอมือถือ
              </div>
              <div style={{ fontSize: 10, color: "rgba(198,169,107,0.55)", lineHeight: 1.5 }}>
                เปิด-ปิดการแสดงผล Widget บนแดชบอร์ดผู้ใช้แบบ Real-time
              </div>
            </div>

            {isOperator && (
              <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>
                🛡️ Operator Mode: ดูได้เท่านั้น ไม่สามารถสลับ Feature ได้
              </div>
            )}

            <div className="space-y-2.5">
              {features.map((feat) => (
                <div
                  key={feat.id}
                  onClick={() => handleToggleFeature(feat.id, feat.is_enabled)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: feat.is_enabled ? "1px solid rgba(198,169,107,0.35)" : "1px solid rgba(217,188,130,0.10)",
                    background: feat.is_enabled ? "rgba(198,169,107,0.07)" : "rgba(4,20,48,0.4)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    opacity: feat.is_enabled ? 1 : 0.65,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#E8D5A3", marginBottom: 2 }}>{feat.feature_name}</div>
                    <div style={{ fontSize: 9, color: "rgba(198,169,107,0.5)", letterSpacing: "0.04em" }}>
                      key: <strong style={{ color: "#C6A96B" }}>{feat.feature_key}</strong>
                    </div>
                  </div>
                  <div>
                    {feat.is_enabled ? (
                      <CheckSquare className="w-5 h-5" style={{ color: "#D9BC82" }} />
                    ) : (
                      <Square className="w-5 h-5" style={{ color: "rgba(198,169,107,0.3)" }} />
                    )}
                  </div>
                </div>
              ))}

              {features.length === 0 && (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <p style={{ fontSize: 11, color: "rgba(198,169,107,0.45)" }}>ยังไม่ได้สร้างการตั้งค่าเริ่มต้น</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab: Services ─────────────────────────────────────── */}
        {adminTab === "services" && (
          <div className="space-y-3">
            <div style={{ ...CARD_STYLE, padding: "16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D9BC82", fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>
                ☰ บริการและฟีเจอร์
              </div>
              <div style={{ fontSize: 10, color: "rgba(198,169,107,0.55)", lineHeight: 1.5, marginBottom: 12 }}>
                ระบบพยากรณ์เฉพาะทางและบริการเสริมที่กำลังพัฒนา
              </div>
            </div>

            {UPCOMING_SERVICES.map((svc) => (
              <div key={svc.title} style={{ ...CARD_STYLE, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(198,169,107,0.1)",
                    border: "1px solid rgba(217,188,130,0.2)",
                    fontSize: 20,
                  }}>
                    {svc.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#D9BC82", fontFamily: "'Playfair Display', serif" }}>
                        {svc.title}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, ...svc.tagStyle }}>
                        {svc.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(198,169,107,0.7)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 6 }}>
                      {svc.subtitle}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(198,169,107,0.5)", lineHeight: 1.55, margin: 0 }}>
                      {svc.desc}
                    </p>
                    {svc.href && (
                      <Link
                        href={svc.href}
                        style={{
                          display: "inline-block",
                          marginTop: 10,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#D9BC82",
                          background: "rgba(198,169,107,0.08)",
                          border: "1px solid rgba(217,188,130,0.2)",
                          borderRadius: 8,
                          padding: "5px 14px",
                          textDecoration: "none",
                        }}
                      >
                        เปิดใช้งาน →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ─── Role & Package Modal ─────────────────────────────────── */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm relative space-y-5 font-sans"
            style={{ background: "rgba(4,15,38,0.98)", border: "1px solid rgba(217,188,130,0.35)", borderRadius: 20, padding: "24px 20px" }}
          >
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(198,169,107,0.05)" }} />

            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#D9BC82", fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>
                ⚙️ กำหนดสิทธิ์สมาชิก
              </div>
              <div style={{ padding: "8px 10px", background: "rgba(4,20,48,0.7)", border: "1px solid rgba(217,188,130,0.14)", borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E8D5A3" }}>{selectedMember.full_name}</div>
                <div style={{ fontSize: 10, color: "rgba(198,169,107,0.5)" }}>{selectedMember.email}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(198,169,107,0.7)", display: "block", marginBottom: 5 }}>1. บทบาท (System Role)</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={MODAL_INPUT_STYLE}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none"
                >
                  <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                  <option value="operator">ผู้ควบคุมสิทธิ์ (Operator)</option>
                  <option value="admin">ผู้ดูแลระบบสูงสุด (Admin)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(198,169,107,0.7)", display: "block", marginBottom: 5 }}>2. แพ็กเกจ (Subscription Plan)</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  style={MODAL_INPUT_STYLE}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none"
                >
                  <option value="free">🔓 Free — จำกัด 5 Token</option>
                  <option value="pro">⭐ Pro (แพ็ก 1) — 500 Token</option>
                  <option value="premium">👑 Premium (แพ็ก 2) — 999,999 Token</option>
                  <option value="imperial">💎 Imperial (แพ็ก 3) — ไม่จำกัด</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(4,20,48,0.6)", border: "1px solid rgba(217,188,130,0.15)", color: "rgba(198,169,107,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdateRoleAndPlan}
                disabled={isUpdatingRole}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#071329", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none" }}
                className="disabled:opacity-50"
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
