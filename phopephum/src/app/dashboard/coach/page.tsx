"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora, getCurrentHora, PLANETS } from "@/engine/phopephum-calculator";
import { 
  ArrowLeft, Sparkles, Send, Bot, User, Zap, MessageSquare, 
  HelpCircle, ShieldCheck, Heart, Award, Moon, Sun, Compass
} from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function CoachPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentHora, setCurrentHora] = useState<any>(null);
  
  // Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick Prompts list
  const quickPrompts = [
    { text: "🔮 วิเคราะห์ดวงและภารกิจประจำวัน", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { text: "💼 นัดหมายสำคัญ & วิเคราะห์ยามงาน", icon: <Award className="w-3.5 h-3.5" /> },
    { text: "💰 เปิดกระแสทรัพย์ & วิเคราะห์ยามเงิน", icon: <Zap className="w-3.5 h-3.5" /> },
    { text: "💖 ถอดรหัสยามความรักความสัมพันธ์", icon: <Heart className="w-3.5 h-3.5" /> }
  ];

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        // Load profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (prof) {
          setProfile(prof);
          
          // Initial greeting from Coach - Refined to persona
          setMessages([
            {
              role: "assistant",
              content: `สวัสดีครับคุณ ${prof.full_name} 🪐 ผมคือ **Living Wisdom AI Coach** 
ยินดีที่ได้ร่วมทางในกระแสแห่งปัญญาและดวงดาวกับคุณในวันนี้

ขณะนี้พวกเราคุยกันภายใต้ยามจรที่สำคัญ หากคุณต้องการปรึกษาทิศทาง **การงาน/การเงิน, ความรักความสัมพันธ์ หรือเคล็ดลับการใช้ยามมงคลในการบรรลุความสำเร็จ** สามารถพิมพ์ถามผม หรือกดปุ่มคำสั่งด่วนด้านล่างได้ทันทีเลยครับ ✨`
            }
          ]);
        }

        // Calculate current hora slot
        const horaResult = getCurrentHora();
        setCurrentHora(horaResult);
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg]
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      } else {
        setMessages((prev) => [
          ...prev, 
          { 
            role: "assistant", 
            content: "ขออภัยด้วยครับ ดูเหมือนกระแสลมสัญญาณขัดข้องเล็กน้อยในเวลานี้ กรุณาลองถามใหม่อีกครั้งครับ 🪐" 
          }
        ]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev, 
        { 
          role: "assistant", 
          content: "ขออภัยด้วยครับ เกิดข้อผิดพลาดในการเชื่อมต่อดวงดาวกับระบบ AI กรุณาลองใหม่อีกครั้งครับ 🪐" 
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleQuickPromptClick = (promptText: string) => {
    handleSendMessage(promptText);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-950 text-foreground flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-hora-text-muted">กำลังเปิดมิติจิตวิทยาการโค้ชดวงชะตา...</p>
        </div>
      </div>
    );
  }

  const slot = currentHora?.currentHora?.subSlot;
  const planet = slot?.planet;

  return (
    <div className="min-h-screen bg-cosmic-950 text-foreground font-sans pb-10 flex flex-col justify-between selection:bg-gold-500 selection:text-cosmic-950">
      {/* Background layers */}
      <div className="bg-cosmic-portal" />
      <div className="cosmic-nebula-aura" />
      <div className="cosmic-zodiac-wheel" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 glass-hora border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="hover:text-gold-500 text-text-secondary/80 flex items-center gap-1 transition-colors cursor-pointer border border-white/5 rounded-xl p-2.5 glass-hora"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-serif font-bold text-gradient-gold tracking-widest flex items-center gap-2">
                AI WISDOM COACH
              </h1>
              <p className="text-xxs text-text-secondary uppercase tracking-[0.2em] hidden sm:block font-bold opacity-70">
                LIVING WISDOM & ASTROLOGY GUIDANCE
              </p>
            </div>
          </div>

          {/* Current Hora Widget in Header */}
          {planet && (
            <div className="flex items-center gap-4 bg-cosmic-900/50 border border-white/5 rounded-2xl px-5 py-2.5 text-left glass-hora">
              <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(198,169,107,0.5)]" style={{ color: planet.color }}>
                {planet.symbol}
              </span>
              <div>
                <span className="text-[10px] text-gold-500/60 block font-bold uppercase tracking-widest leading-none mb-1">ยามจรปัจจุบัน</span>
                <span className="text-xs text-gold-300 font-bold tracking-wide">
                  {planet.nameThai} ({slot.startTime} - {slot.endTime} น.)
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Chat Window */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 flex flex-col justify-between overflow-hidden relative z-10">
        
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-8 max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-white/5">
          {messages.map((msg, index) => {
            const isAI = msg.role === "assistant";
            return (
              <div 
                key={index} 
                className={`flex gap-5 max-w-[90%] sm:max-w-[85%] ${
                  isAI ? "self-start text-left" : "self-end flex-row-reverse ml-auto text-right"
                } animate-in fade-in slide-in-from-bottom-2 duration-500`}
              >
                {/* Avatar */}
                <div 
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                    isAI 
                      ? "bg-gold-500/10 border-gold-500/30 text-gold-500" 
                      : "bg-cosmic-900 border-white/10 text-gold-300"
                  } glass-hora shadow-lg`}
                >
                  {isAI ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                {/* Message Bubble */}
                <div 
                  className={`rounded-3xl p-5 sm:p-6 font-sans leading-relaxed text-sm shadow-2xl ${
                    isAI 
                      ? "glass-hora border border-white/5 text-foreground bg-cosmic-900/40" 
                      : "bg-gradient-to-br from-gold-500 to-gold-liquid text-cosmic-950 font-bold shadow-[0_10px_30px_rgba(198,169,107,0.15)]"
                  }`}
                >
                  <p className="whitespace-pre-line text-xs sm:text-sm tracking-wide">{msg.content}</p>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex gap-5 max-w-[80%] self-start text-left animate-pulse">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-gold-500/10 border-gold-500/30 text-gold-500 glass-hora">
                <Bot className="w-5 h-5" />
              </div>
              <div className="glass-hora border border-white/5 rounded-3xl px-6 py-5 bg-cosmic-900/40">
                <div className="flex gap-2 items-center justify-center py-1">
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 mt-4 border-t border-white/5 space-y-6">
          
          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="space-y-3">
              <p className="text-xxs text-gold-500/60 flex items-center gap-2 font-bold tracking-[0.2em] uppercase ml-1">
                <Compass className="w-3.5 h-3.5" /> เลือกหัวข้อคำชี้แนะเชิงกลยุทธ์
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPromptClick(qp.text)}
                    className="glass-hora hover:border-gold-500/40 border border-white/5 rounded-2xl p-4 text-xxs font-bold text-text-secondary hover:text-gold-300 text-left flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-1 bg-cosmic-900/20 group"
                  >
                    <span className="text-gold-500 group-hover:scale-110 transition-transform">{qp.icon}</span>
                    <span className="tracking-wide">{qp.text.substring(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="flex gap-3 bg-cosmic-900/60 border border-white/10 focus-within:border-gold-500/50 rounded-3xl p-2.5 transition-all shadow-2xl glass-hora">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
              placeholder="ปรึกษาปัญญาแห่งดวงดาว... เช่น 'ยามนี้เหมาะเจรจาธุรกิจอย่างไร?'"
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-foreground outline-none px-4 py-2 cursor-text placeholder:text-text-secondary/40"
              disabled={sending}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={sending || !inputValue.trim()}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-liquid text-cosmic-950 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0 shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xxs text-text-secondary/40 font-bold uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-500/50" />
            <span>Secured by Supabase RLS · AI Wisdom OS</span>
          </div>
        </div>
      </main>
    </div>
  );
}
