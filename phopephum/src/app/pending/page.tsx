"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Clock, LogOut, RefreshCw, Sparkles } from "lucide-react";

export default function PendingPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email ?? null);
    });
  }, []);

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", user.id)
        .single();
      if (profile?.is_approved) {
        window.location.href = "/dashboard";
      }
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-cosmic-950 flex items-center justify-center px-4 font-sans">
      <div className="bg-cosmic-portal" />
      <div className="cosmic-nebula-aura" />

      <div className="relative z-10 glass-hora border border-gold-500/20 rounded-3xl p-10 max-w-md w-full text-center shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-9 h-9 text-gold-500" />
        </div>

        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-gold-500" />
          <span className="text-xxs font-bold text-gold-500/60 uppercase tracking-[0.3em]">PHOPEPHUM</span>
        </div>

        <h1 className="text-xl font-serif font-bold text-foreground mb-3 tracking-wide">
          รอการอนุมัติจากแอดมิน
        </h1>

        <p className="text-sm text-text-secondary/70 leading-relaxed mb-2">
          บัญชีของคุณกำลังรอการตรวจสอบ<br />ทีมงานจะอนุมัติสิทธิ์ภายใน 24 ชั่วโมง
        </p>

        {userEmail && (
          <p className="text-xs text-gold-500/50 font-bold tracking-wide mt-3 mb-6">
            {userEmail}
          </p>
        )}

        <div className="border-t border-white/5 pt-6 flex flex-col gap-3">
          <button
            onClick={handleCheckAgain}
            disabled={checking}
            className="btn-hora !py-3 !text-xs flex items-center justify-center gap-2 w-full"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "กำลังตรวจสอบ..." : "ตรวจสอบสถานะอีกครั้ง"}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 text-xs font-bold text-text-secondary/50 hover:text-text-secondary transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>

        <p className="text-[10px] text-text-secondary/30 mt-6 uppercase tracking-[0.2em]">
          Living Wisdom OS · Imperial Access
        </p>
      </div>
    </div>
  );
}
