"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Sparkles, ArrowRight, User, Calendar, MapPin, Mail, Lock } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthProvince, setBirthProvince] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const supabase = createClient();
      
      // 1. ลงทะเบียน Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setErrorMsg(signUpError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setErrorMsg("เกิดข้อผิดพลาดในการรับข้อมูลผู้ใช้ใหม่");
        setLoading(false);
        return;
      }

      // 2. บันทึกข้อมูล Profile ลง Database
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: fullName,
        birth_date: birthDate,
        birth_time: birthTime || null,
        birth_province: birthProvince || null,
        gender: gender || null,
        plan: "free",
        ai_tokens_limit: 5,
      });

      if (profileError) {
        setErrorMsg(`ลงทะเบียนสำเร็จ แต่ไม่สามารถบันทึกข้อมูลดวงชะตาได้: ${profileError.message}`);
      } else {
        setSuccessMsg("ลงทะเบียนดวงชะตาสำเร็จ! กำลังนำคุณไปยัง Dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hora-dark text-hora-text py-12 px-6 flex items-center justify-center relative font-sans">
      {/* Background Subtle Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(201,169,110,0.1),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-lg glass-hora rounded-2xl p-8 border border-hora-dark-border relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-hora-gold/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-serif font-semibold text-hora-gold tracking-wide mb-2 hover:opacity-80 transition-opacity">
            Hora AI
          </Link>
          <p className="text-sm text-hora-text-muted">
            ลงทะเบียนวิเคราะห์ชะตาชีวิตและยามอัฐกาลเฉพาะบุคคล
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

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-hora-gold" /> ชื่อ - นามสกุลจริง
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="กรอกชื่อ-นามสกุล ของคุณ"
              className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Birth Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-hora-gold" /> วันเกิด
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all"
              />
            </div>

            {/* Birth Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-2">
                ⏱️ เวลาเกิด (โดยประมาณ)
              </label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Birth Province */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-hora-gold" /> จังหวัดเกิด
              </label>
              <input
                type="text"
                required
                value={birthProvince}
                onChange={(e) => setBirthProvince(e.target.value)}
                placeholder="เช่น กรุงเทพฯ"
                className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-2">
                🧬 เพศตามบัตรประชาชน
              </label>
              <select
                value={gender}
                onChange={(e: any) => setGender(e.target.value)}
                className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all"
              >
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่น ๆ / ไม่ระบุ</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-hora-gold" /> อีเมลสำหรับการล็อกอิน
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-hora-gold" /> ตั้งรหัสผ่าน
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ตั้งรหัสผ่าน 6 ตัวอักษรขึ้นไป"
              className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-hora py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-4"
          >
            {loading ? "กำลังบันทึกข้อมูลดวงชะตา..." : "บันทึกดวงชะตา & เริ่มวิเคราะห์"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center text-xs text-hora-text-muted font-sans border-t border-hora-dark-border/40 pt-5">
          มีบัญชีวิเคราะห์อยู่แล้ว?{" "}
          <Link href="/login" className="text-hora-gold font-bold hover:underline">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}
