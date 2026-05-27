"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora, getCurrentHora, PLANETS } from "@/engine/phopephum-calculator";
import { 
  ArrowLeft, Sparkles, Send, Bot, User, Zap, MessageSquare, 
  HelpCircle, ShieldCheck, Heart, Award, Moon, Sun
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
          
          // Initial greeting from Coach
          setMessages([
            {
              role: "assistant",
              content: `สวัสดีครับคุณ ${prof.full_name} 🪐 ยินดีต้อนรับสู่แผง **Living Wisdom AI Coach** 
ผมทำหน้าที่เป็นผู้ร่วมคิดและนำพาภูมิปัญญาโหราศาสตร์ไทยผสมผสานจิตวิทยาการพัฒนาตนเอง (TQM) มาชี้นำพลังบวกให้คุณ

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
      <div className="min-h-screen bg-hora-dark text-hora-text flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-hora-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-hora-text-muted">กำลังเปิดมิติจิตวิทยาการโค้ชดวงชะตา...</p>
        </div>
      </div>
    );
  }

  const slot = currentHora?.currentHora?.subSlot;
  const planet = slot?.planet;

  return (
    <div className="min-h-screen bg-hora-dark text-hora-text font-sans pb-10 flex flex-col justify-between selection:bg-hora-gold selection:text-hora-dark">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(201,169,110,0.05),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(155,127,232,0.03),transparent_70%)] pointer-events-none" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 glass-hora border-b border-hora-dark-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="hover:text-hora-gold text-hora-text-muted/80 flex items-center gap-1 transition-colors cursor-pointer border border-hora-dark-border/40 rounded-lg p-2 glass-hora"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-serif font-bold text-hora-gold tracking-wide flex items-center gap-1.5">
                AI Wisdom Coach
              </h1>
              <p className="text-xxs text-hora-text-muted hidden sm:block">
                ระบบชี้แนะส่วนบุคคลเชิงธรรมประธานและกระแสดวงดาวอัฐกาล
              </p>
            </div>
          </div>

          {/* Current Hora Widget in Header */}
          {planet && (
            <div className="flex items-center gap-3 bg-[#14110C] border border-hora-dark-border/50 rounded-xl px-4 py-2 text-left font-sans">
              <span className="text-xl filter drop-shadow-[0_0_4px_rgba(201,169,110,0.5)]" style={{ color: planet.color }}>
                {planet.symbol}
              </span>
              <div>
                <span className="text-[10px] text-hora-text-muted block font-semibold leading-none">ยามปัจจุบัน</span>
                <span className="text-xs text-hora-gold-light font-bold">
                  {planet.nameThai} ({slot.startTime} - {slot.endTime} น.)
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Chat Window Main container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 pt-6 flex flex-col justify-between overflow-hidden relative z-10">
        
        {/* Messages list scrollable container */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-hora-dark-border">
          {messages.map((msg, index) => {
            const isAI = msg.role === "assistant";
            return (
              <div 
                key={index} 
                className={`flex gap-4 max-w-[85%] ${
                  isAI ? "self-start text-left" : "self-end flex-row-reverse ml-auto text-right"
                }`}
              >
                {/* Avatar Icon */}
                <div 
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    isAI 
                      ? "bg-hora-gold/10 border-hora-gold/30 text-hora-gold" 
                      : "bg-[#14110C]/80 border-hora-dark-border/60 text-hora-gold-light"
                  }`}
                >
                  {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div 
                  className={`rounded-2xl p-4 sm:p-5 font-sans leading-relaxed text-sm ${
                    isAI 
                      ? "glass-hora border border-hora-dark-border/40 text-hora-text bg-hora-dark-card/30" 
                      : "bg-gradient-to-br from-[#D4C29A] to-[#C0B7A5] text-[#03071A] font-medium shadow-lg"
                  }`}
                >
                  <p className="whitespace-pre-line text-xs sm:text-sm">{msg.content}</p>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex gap-4 max-w-[80%] self-start text-left">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center border bg-hora-gold/10 border-hora-gold/30 text-hora-gold">
                <Bot className="w-4 h-4" />
              </div>
              <div className="glass-hora border border-hora-dark-border/40 rounded-2xl px-5 py-4 bg-hora-dark-card/30">
                <div className="flex gap-1.5 items-center justify-center py-1">
                  <div className="w-2 h-2 bg-hora-gold rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-hora-gold rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-hora-gold rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Actions: Quick Prompts & Text input */}
        <div className="pt-4 mt-4 border-t border-hora-dark-border/30 space-y-4">
          
          {/* Quick Prompts Carousel */}
          {messages.length === 1 && (
            <div className="space-y-2">
              <p className="text-xxs text-hora-text-muted flex items-center gap-1 font-semibold tracking-wider uppercase">
                <MessageSquare className="w-3.5 h-3.5 text-hora-gold" /> เลือกหัวข้อคำชี้แนะเร่งด่วน:
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPromptClick(qp.text)}
                    className="glass-hora hover:border-hora-gold/40 border border-hora-dark-border/40 rounded-xl p-3 text-xxs font-semibold text-hora-text-muted hover:text-hora-gold text-left flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 bg-hora-dark-card/25"
                  >
                    <span className="text-hora-gold filter drop-shadow-[0_0_2px_rgba(201,169,110,0.3)]">{qp.icon}</span>
                    <span>{qp.text.substring(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Text Input Bar */}
          <div className="flex gap-2 bg-[#14110C] border border-hora-dark-border/60 focus-within:border-hora-gold/60 rounded-2xl p-2 transition-all">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
              placeholder="ถามคำถาม เช่น 'ยามนี้เหมาะเจรจาธุรกิจการค้าอย่างไรบ้าง?' หรือ 'ขอแนวทางเสริมความสัมพันธ์วันนี้'..."
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-hora-text outline-none px-3 py-2 cursor-text"
              disabled={sending}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={sending || !inputValue.trim()}
              className="w-10 h-10 rounded-xl bg-hora-gold text-hora-dark flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xxs text-hora-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-hora-gold" />
            <span>ข้อมูลแชทถูกป้องกันด้วยสิทธิ์ความเป็นส่วนตัวสูงสุดบน Supabase RLS</span>
          </div>
        </div>
      </main>
    </div>
  );
}
