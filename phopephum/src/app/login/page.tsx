"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Sparkles, ArrowRight, Lock, Mail } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยัง Dashboard...");
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hora-dark text-hora-text flex items-center justify-center px-6 relative font-sans">
      {/* Background Subtle Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(201,169,110,0.1),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md glass-hora rounded-2xl p-8 border border-hora-dark-border relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-24 h-24 bg-hora-gold/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-serif font-semibold text-hora-gold tracking-wide mb-2 hover:opacity-80 transition-opacity">
            Phopephum
          </Link>
          <p className="text-sm text-hora-text-muted">
            เข้าสู่ระบบเพื่อเปิดประตูและถอดรหัสชะตาชีวิตของคุณ
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-200 rounded-lg text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-950/40 border border-green-500/30 text-green-200 rounded-lg text-sm font-medium">
            ✨ {successMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-hora-gold-light flex items-center gap-2">
              <Mail className="w-4 h-4 text-hora-gold" /> อีเมล
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-3 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-hora-gold-light flex items-center gap-2">
                <Lock className="w-4 h-4 text-hora-gold" /> รหัสผ่าน
              </label>
              <a href="#" className="text-xs text-hora-gold hover:underline">
                ลืมรหัสผ่าน?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-3 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-hora py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Register link */}
        <div className="mt-8 text-center text-xs text-hora-text-muted font-sans border-t border-hora-dark-border/40 pt-6">
          ยังไม่มีบัญชีผู้ใช้?{" "}
          <Link href="/register" className="text-hora-gold font-bold hover:underline">
            ลงทะเบียนฟรีที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}
