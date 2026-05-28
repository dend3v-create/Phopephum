"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { ArrowRight, User, Calendar, MapPin, Mail, Lock } from "lucide-react";
import Link from "next/link";

const inputStyle = {
  background: "rgba(4,20,48,0.7)",
  border: "1px solid rgba(217,188,130,0.18)",
};

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

        fetch('/api/notify/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_member',
            member: {
              id: user.id,
              full_name: fullName,
              email: user.email || '',
              birth_date: birthDate,
              birth_time: birthTime || null,
              created_at: new Date().toISOString()
            }
          })
        }).catch(() => { /* silent fail */ });

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
    <div
      className="min-h-screen text-hora-text py-10 px-4 flex items-center justify-center relative font-sans"
      style={{ background: "linear-gradient(180deg, #020617 0%, #071427 50%, #0A2240 100%)" }}
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 20%, rgba(201,169,110,0.09) 0%, transparent 60%)" }} />

      <div
        className="w-full max-w-sm relative overflow-hidden shadow-2xl"
        style={{ background: "rgba(10,34,64,0.62)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: "1px solid rgba(217,188,130,0.20)", borderRadius: 20, padding: "32px 24px 28px" }}
      >
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(198,169,107,0.06)" }} />

        {/* Brand Header */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-block text-3xl font-serif font-semibold text-hora-gold tracking-wide mb-1.5 hover:opacity-80 transition-opacity">
            Phopephum
          </Link>
          <p className="text-sm text-hora-text-muted">
            ลงทะเบียนวิเคราะห์ชะตาชีวิตและยามอัฐกาลเฉพาะบุคคล
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/30 text-red-200 rounded-lg text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-green-950/40 border border-green-500/30 text-green-200 rounded-lg text-sm font-medium">
            ✨ {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-hora-gold" /> ชื่อ - นามสกุลจริง
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="กรอกชื่อ-นามสกุล ของคุณ"
              style={inputStyle}
              className="w-full focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Birth Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-hora-gold" /> วันเกิด
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={inputStyle}
                className="w-full focus:border-hora-gold/80 rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none transition-all"
              />
              <p className="text-[9px] text-hora-text-muted/70 leading-normal">ปี ค.ศ. เท่านั้น</p>
            </div>

            {/* Birth Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-1.5">
                ⏱️ เวลาเกิด
              </label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                style={inputStyle}
                className="w-full focus:border-hora-gold/80 rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Birth Province */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-hora-gold" /> จังหวัดเกิด
              </label>
              <input
                type="text"
                required
                value={birthProvince}
                onChange={(e) => setBirthProvince(e.target.value)}
                placeholder="เช่น กรุงเทพฯ"
                style={inputStyle}
                className="w-full focus:border-hora-gold/80 rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-1.5">
                🧬 เพศ
              </label>
              <select
                value={gender}
                onChange={(e: any) => setGender(e.target.value)}
                style={inputStyle}
                className="w-full focus:border-hora-gold/80 rounded-lg px-3 py-2.5 text-sm text-hora-text outline-none transition-all"
              >
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-hora-gold" /> อีเมลสำหรับ Login
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={inputStyle}
              className="w-full focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-hora-gold-light flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-hora-gold" /> ตั้งรหัสผ่าน
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 ตัวอักษรขึ้นไป"
              style={inputStyle}
              className="w-full focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none transition-all placeholder:text-hora-text-muted/40"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-hora py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? "กำลังบันทึกข้อมูล..." : "บันทึกดวงชะตา & เริ่มใช้งาน"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Login link */}
        <div className="mt-6 border-t border-white/5 pt-5 flex flex-col items-center gap-3">
          <p className="text-[11px] text-hora-text-muted tracking-wide">
            มีบัญชีวิเคราะห์อยู่แล้ว?
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all group"
            style={{
              border: "1px solid rgba(198,169,107,0.45)",
              background: "rgba(198,169,107,0.08)",
              color: "#D9BC82",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(198,169,107,0.16)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(198,169,107,0.75)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(198,169,107,0.08)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(198,169,107,0.45)";
            }}
          >
            เข้าสู่ระบบบัญชีที่มีอยู่
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
