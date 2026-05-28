"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora, getCurrentHora, PLANETS } from "@/engine/phopephum-calculator";
import { 
  ArrowLeft, Sparkles, Send, Bot, User, Zap, MessageSquare, 
  HelpCircle, ShieldCheck, Heart, Award, Moon, Sun, Compass, Calendar, Download
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

  // Categories and Prompts data
  const [activeCategory, setActiveCategory] = useState("all");

  const promptCategories = [
    { id: "all", name: "ภาพรวม", icon: <Compass className="w-3.5 h-3.5" /> },
    { id: "work", name: "การงาน", icon: <Award className="w-3.5 h-3.5" /> },
    { id: "love", name: "ความรัก", icon: <Heart className="w-3.5 h-3.5" /> },
    { id: "health", name: "สุขภาพ", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "finance", name: "การเงิน", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "travel", name: "การเดินทาง", icon: <Moon className="w-3.5 h-3.5" /> },
    { id: "business", name: "ธุรกิจ", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  const promptChips: Record<string, { text: string; context: string }[]> = {
    all: [
      { text: "ช่วงนี้ดวงชีวิตโดยรวมเป็นอย่างไร?", context: "วิเคราะห์พลังงาน ปีจร เดือนจร และวันจรปัจจุบัน" },
      { text: "ช่วงไหนของปีนี้เป็นจุดพีคที่สุดในชีวิต?", context: "วิเคราะห์ยามอัฐกาลและเดือนจรที่ดีที่สุด" },
      { text: "สิ่งที่ควรระวังที่สุดในช่วงนี้คืออะไร?", context: "วิเคราะห์เลข 7 ตัว และมหาภูติจร" },
      { text: "ฤกษ์ดีสุดของสัปดาห์นี้คือวันไหน เวลาไหน?", context: "วิเคราะห์ยามอัฐกาลรายวัน" },
    ],
    work: [
      { text: "เจรจาธุรกิจสำคัญ ควรนัดช่วงไหนถึงสำเร็จ?", context: "วิเคราะห์ยามอัฐกาล และยามเจ้าของวัน" },
      { text: "จะขอเพิ่มเงินเดือนหรือเลื่อนตำแหน่ง ช่วงนี้เหมาะไหม?", context: "วิเคราะห์ปีจร และทักษา" },
      { text: "โปรเจกต์ที่ทำอยู่จะสำเร็จได้ผลดีไหม?", context: "วิเคราะห์เลข 7 ตัว เจ้าเรือนกรรมะ" },
      { text: "ควรเปลี่ยนงานตอนนี้หรือรอช่วงไหนดีกว่า?", context: "วิเคราะห์วัยจร และเดือนจร" },
    ],
    love: [
      { text: "ช่วงไหนง้อแฟนแล้วหายงอน ยอมคืนดีได้?", context: "วิเคราะห์ยามอัฐกาลดาวศุกร์ และวันจร" },
      { text: "จะสารภาพรักช่วงไหนให้ได้รับการตอบรับดี?", context: "วิเคราะห์ยามศุกร์ และมหาภูติจร" },
      { text: "คนที่คบอยู่ตอนนี้ ดวงสมพงษ์กับเราไหม?", context: "วิเคราะห์เลข 7 ตัว และทักษาสัมพันธ์" },
      { text: "ปีนี้มีโอกาสพบรักหรือแต่งงานไหม?", context: "วิเคราะห์ปีจร เดือนจร และห้องปัตนิ" },
    ],
    health: [
      { text: "ป่วยอยู่ตอนนี้ ดวงบอกว่าจะหายเร็วไหม?", context: "วิเคราะห์ยามอัฐกาล และห้องมรณะ" },
      { text: "ช่วงไหนควรระวังสุขภาพเป็นพิเศษ?", context: "วิเคราะห์เดือนจร และดาวเสาร์จร" },
      { text: "ผ่าตัดหรือรักษาพยาบาลสำคัญ วันไหนฤกษ์ดี?", context: "วิเคราะห์ยามอาทิตย์และพฤหัสบดี" },
      { text: "พลังงานร่างกายจิตใจช่วงนี้ควรดูแลอะไรก่อน?", context: "วิเคราะห์เลข 7 ตัว ฐานอัตตะ" },
    ],
    finance: [
      { text: "ลงทุนหรือซื้อของมูลค่าสูง ช่วงไหนดีที่สุด?", context: "วิเคราะห์ยามพฤหัสบดี และปีจรธนัง" },
      { text: "ช่วงนี้ดวงการเงินเป็นอย่างไร มีเงินเข้ามาไหม?", context: "วิเคราะห์เดือนจร และเลข 7 ตัว" },
      { text: "กู้เงินหรือลงนามสัญญาการเงิน วันไหนเหมาะ?", context: "วิเคราะห์ยามอัฐกาล และฤกษ์มงคล" },
      { text: "โชคลาภหรือเงินก้อนใหญ่ ปีนี้มีโอกาสไหม?", context: "วิเคราะห์ปีจร และมหาภูติจรโภคา" },
    ],
    travel: [
      { text: "จะเดินทางต่างจังหวัด/ต่างประเทศ เวลาไหนดี?", context: "วิเคราะห์ยามอัฐกาล และทิศมงคล" },
      { text: "เดินทางสัปดาห์นี้ ควรออกเดินทางวันไหน เวลาไหน?", context: "วิเคราะห์ยามวันจร และดาวพุธ" },
      { text: "การเดินทางครั้งนี้จะราบรื่นหรือมีอุปสรรค?", context: "วิเคราะห์เลข 7 ตัว และมหาภูติจร" },
      { text: "ย้ายบ้าน/ย้ายที่ทำงาน ฤกษ์ไหนเหมาะที่สุด?", context: "วิเคราะห์ยามอาทิตย์ และทักษาสุขภาพ" },
    ],
    business: [
      { text: "จะเปิดธุรกิจใหม่ ควรเริ่มต้นช่วงไหนดีที่สุด?", context: "วิเคราะห์ยามพฤหัสบดี และปีจรลาภะ" },
      { text: "จดทะเบียนบริษัทหรือเซ็นสัญญาใหญ่ วันไหนฤกษ์ดี?", context: "วิเคราะห์ยามอัฐกาลมงคล" },
      { text: "พาร์ทเนอร์ที่จะร่วมทำธุรกิจ ดวงเข้ากันไหม?", context: "วิเคราะห์เลข 7 ตัว และทักษาสัมพันธ์" },
      { text: "ธุรกิจที่ทำอยู่ตอนนี้จะเติบโตหรือควรปรับทิศทาง?", context: "วิเคราะห์วัยจร และเดือนจรปัจจุบัน" },
    ],
  };

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
              content: `กราบสวัสดีครับคุณ ${prof.full_name} ผม AI Wisdom Coach ยินดีที่ได้ร่วมออกแบบเส้นทางชีวิตไปกับคุณครับ

หากคุณมีข้อสงสัยหรือต้องการคำแนะนำเชิงกลยุทธ์เกี่ยวกับ "การงาน การเงิน ความรัก สุขภาพ หรือธุรกิจ" สามารถพิมพ์ปรึกษาหรือเลือกใช้ Smart Quick Prompts ด้านล่างเพื่อเจาะลึกข้อมูลดวงชะตาได้ทันทีครับ`
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

  const handleSendMessage = async (text: string, context?: string) => {
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
          messages: [...messages, userMsg],
          context: context // Smart Context Injection
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
            content: "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูลดวงชะตา กรุณาลองใหม่อีกครั้งครับ" 
          }
        ]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev, 
        { 
          role: "assistant", 
          content: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI กรุณาลองใหม่อีกครั้งครับ" 
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleQuickPromptClick = (chip: { text: string; context: string }) => {
    handleSendMessage(chip.text, chip.context);
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
          
          {/* Categories Horizontal Scroll */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none no-scrollbar">
            {promptCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
                  activeCategory === cat.id
                    ? "bg-gold-500/20 border-gold-500 text-gold-300 shadow-[0_0_15px_rgba(198,169,107,0.2)]"
                    : "glass-hora border-white/5 text-text-secondary hover:border-white/20"
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>

          {/* Quick Prompts Chips */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {promptChips[activeCategory]?.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPromptClick(chip)}
                  className="glass-hora hover:border-gold-500/40 border border-white/5 rounded-2xl p-4 text-left flex flex-col gap-1 cursor-pointer transition-all hover:-translate-y-1 bg-cosmic-900/20 group"
                >
                  <span className="text-xs font-bold text-gold-100 group-hover:text-gold-300 transition-colors line-clamp-1">
                    {chip.text}
                  </span>
                  <span className="text-[10px] text-gold-500/60 font-medium tracking-wide">
                    {chip.context}
                  </span>
                </button>
              ))}
            </div>
          </div>

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

          <div className="flex items-center justify-center gap-2 text-xxs text-text-secondary/40 font-bold uppercase tracking-[0.2em] pb-16 sm:pb-0">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-500/50" />
            <span>Secured by Supabase RLS · AI Wisdom OS</span>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-hora border-t border-white/10 bg-cosmic-950/85 backdrop-blur-lg flex items-center justify-around py-3 px-2 shadow-[0_-10px_20px_rgba(0,0,0,0.8)] pb-safe">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Compass className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">ภาพรวมดวง</span>
        </Link>
        <Link href="/dashboard/planner" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Calendar className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">Planner</span>
        </Link>
        <Link href="/dashboard/coach" className="flex flex-col items-center gap-1 text-gold-500">
          <Sparkles className="w-4 h-4 text-gold-500" />
          <span className="text-[9px] font-bold tracking-wider">AI Coach</span>
        </Link>
        <Link href="/dashboard/report" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Download className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">Reports</span>
        </Link>
      </div>
    </div>
  );
}
