/**
 * TaksaConsultationChat.tsx
 * ระบบถาม-ตอบคำพยากรณ์ทักษาและมหาภูติรายหัวข้อ
 * คุณสมบัติ:
 * 1. หัวข้อที่สนใจ (Topic Chips) แตะเพื่อเลือกคำถามยอดนิยม
 * 2. ช่องคำถามขยายตามตัวอักษรที่พิมพ์เข้าไป (Auto-expanding Textarea)
 * 3. แสดงคำตอบแบบเจาะลึกพร้อมสัญลักษณ์มงคล
 * 4. บันทึกประวัติการสนทนา (Conversation History) ในเครื่องปัจจุบัน (localStorage)
 */

import { useState, useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { TaksaMap, StarNumber } from "@phopephum/engine";

export interface ChatMessage {
  id: string;
  sender: "user" | "oracle";
  topic?: string;
  text: string;
  timestamp: string;
}

interface TaksaConsultationChatProps {
  taksaNatal: {
    map: TaksaMap;
    bariStar: StarNumber;
    kalakiniStar: StarNumber;
  };
  taksaTransit: {
    map: TaksaMap;
    bariStar: StarNumber;
    kalakiniStar: StarNumber;
    ageYang: number;
  };
  mahaNatal?: { cs: number; remainder: number; map: Record<string, number> };
  mahaTransit?: { cs: number; remainder: number; map: Record<string, number> };
  storageKeyId?: string;
  className?: string;
}

const TOPIC_CHIPS = [
  {
    id: "career",
    label: "🏢 สมัครงาน / สัมภาษณ์ / เจรจา",
    prompt: "ในปีนี้ตามหลักทักษาและมหาภูติจร ควรเลือกเดินทางไปสัมภาษณ์งาน สมัครงาน หรือเจรจาธุรกิจในทิศใดจึงจะประสบความสำเร็จสูงสุด?",
  },
  {
    id: "travel",
    label: "🚗 เดินทาง / ความปลอดภัย / เลี่ยงอุบัติเหตุ",
    prompt: "ทิศทางใดในปีนี้ที่ควรระมัดระวังเป็นพิเศษในการเดินทางไกล และทิศทางใดคือทิศอายุจรที่ปลอดภัยและไร้อุปสรรค?",
  },
  {
    id: "wealth",
    label: "💰 ค้าขาย / รับทรัพย์ / เสี่ยงโชค",
    prompt: "ทิศศรีจรและมูละจรประจำปีนี้อยู่ทิศใด เหมาะกับการลงทุน ค้าขาย หรือเสี่ยงโชคด้านไหนบ้าง?",
  },
  {
    id: "desk",
    label: "🪑 จัดโต๊ะทำงาน / ฮวงจุ้ย / ปลูกเรือน",
    prompt: "ควรหันโต๊ะทำงานไปทางทิศใดเพื่อรับพลังบารมี (เดช/มนตรี) และควรหลีกเลี่ยงการหันหน้าไปทิศใดเพื่อไม่ให้เจอพลังกาลกิณีจร?",
  },
  {
    id: "remedy",
    label: "🛡️ วิธีแก้เคล็ดดาวกาลกิณีจร & โลกาวินาศ",
    prompt: "ในปีนี้มีดาวกาลกิณีจรหรือภพโลกาวินาศตกที่ดาวและทิศใด มีวิธีทำบุญ เสริมดวง หรือแก้เคล็ดอย่างไรให้ชีวิตราบรื่น?",
  },
  {
    id: "annual",
    label: "⚡ สรุปพลังงานทักษาและมหาภูติจรปีนี้",
    prompt: "สรุปภาพรวมภาพใหญ่ของดวงชะตาในปีนี้ตามทักษาจรและมหาภูติจร ทั้งจุดเด่น จุดแข็ง และสิ่งที่ต้องระวัง",
  },
];

export function TaksaConsultationChat({
  taksaNatal,
  taksaTransit,
  mahaNatal,
  mahaTransit,
  storageKeyId = "default",
  className = "",
}: TaksaConsultationChatProps) {
  const fetcher = useFetcher<{ ok: boolean; answer: string; question: string; topic?: string }>();
  const [question, setQuestion] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const storageKey = `phopephum_mahathaksa_chat_${storageKeyId}`;

  // บันทึกประวัติการสนทนาลง localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
    return [
      {
        id: "initial-greeting",
        sender: "oracle",
        text: `สวัสดีครับ ยินดีต้อนรับสู่ห้องปรึกษาภูมิปัญญามหาทักษาและมหาภูติพยากรณ์ อายุย่างของคุณคือ ${taksaTransit.ageYang} ปี\n\nท่านสามารถเลือกหัวข้อที่สนใจด้านล่าง หรือพิมพ์คำถามเกี่ยวกับ ทิศมงคล, การงาน, การเดินทาง, การค้าขาย, หรือวิธีแก้เคล็ดกาลกิณีจร ได้ทันทีครับ`,
        timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  // บันทึกลง localStorage เมื่อ messages เปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
    }
  }, [messages, storageKey]);

  // ปรับขนาด Textarea อัตโนมัติตามเนื้อหาที่พิมพ์
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 260)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [question]);

  // เมื่อ fetcher ตอบกลับผลลัพธ์
  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.answer) {
      const oracleMsg: ChatMessage = {
        id: `oracle-${Date.now()}`,
        sender: "oracle",
        text: fetcher.data.answer,
        topic: fetcher.data.topic,
        timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, oracleMsg]);
      // เลื่อนจอลงไปยังคำตอบล่าสุด
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [fetcher.data]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || fetcher.state !== "idle") return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmed,
      topic: selectedTopic || undefined,
      timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setSelectedTopic(null);

    // รีเซ็ตความสูง textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // ส่งคำถามไปยัง Action
    fetcher.submit(
      {
        intent: "ask_oracle",
        question: trimmed,
        topic: selectedTopic || "",
        taksaNatal: JSON.stringify(taksaNatal),
        taksaTransit: JSON.stringify(taksaTransit),
        mahaNatal: JSON.stringify(mahaNatal || {}),
        mahaTransit: JSON.stringify(mahaTransit || {}),
      },
      { method: "post" }
    );

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSelectChip = (chip: typeof TOPIC_CHIPS[number]) => {
    setSelectedTopic(chip.label);
    setQuestion(chip.prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("ท่านต้องการล้างประวัติการสนทนาทั้งหมดหรือไม่?")) {
      const resetMsg: ChatMessage[] = [
        {
          id: "initial-greeting",
          sender: "oracle",
          text: `ประวัติการสนทนาถูกรีเซ็ตเรียบร้อยแล้วครับ ท่านสามารถเริ่มต้นถามคำถามใหม่เกี่ยวกับทักษาและมหาภูติจรได้ตลอดเวลา`,
          timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        },
      ];
      setMessages(resetMsg);
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }
    }
  };

  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  return (
    <Card className={`p-0 overflow-hidden border-[#C9A96E]/25 dark:border-[#C9A96E]/20 shadow-2xl bg-white/95 dark:bg-slate-900/40 backdrop-blur-md ${className}`}>
      {/* ── Header ── */}
      <div className="p-4 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5 dark:bg-[#C9A96E]/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C9A96E] animate-pulse" />
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-widest text-[#B45309] dark:text-[#C9A96E]">
              ปรึกษาคำพยากรณ์ทักษา & มหาภูติ
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#C6B79F]">
              ถาม-ตอบเจาะลึกเฉพาะดวงชะตา พร้อมบันทึกการสนทนาปัจจุบัน
            </p>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[11px] text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors font-medium"
          >
            ล้างประวัติ
          </button>
        )}
      </div>

      {/* ── Topic Chips (แตะเพื่อเลือกหัวข้อที่สนใจ) ── */}
      <div className="px-4 py-3 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/70 dark:bg-slate-950/20">
        <p className="text-xs font-bold text-slate-700 dark:text-[#C6B79F] mb-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          แตะเลือกหัวข้อที่สนใจเพื่อเริ่มถามทันที:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TOPIC_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSelectChip(chip)}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-[#C9A96E]/50 hover:bg-[#C9A96E]/10 transition-all text-left truncate max-w-full"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conversation History List ── */}
      <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto bg-slate-100/30 dark:bg-slate-950/15">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-in fade-in duration-200`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-[#C6B79F]">
                  {isUser ? "ท่าน (คำถาม)" : "คำพยากรณ์มหาทักษา"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  · {msg.timestamp}
                </span>
              </div>

              <div
                className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-[#0A2240] text-white rounded-tr-none border border-sky-500/30 shadow-md"
                    : "bg-white dark:bg-slate-900/85 text-slate-800 dark:text-[#F8F6F1] rounded-tl-none border border-slate-200 dark:border-white/10 shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {isSubmitting && (
          <div className="flex flex-col items-start animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="text-[11px] font-bold text-[#C9A96E]">คำพยากรณ์มหาทักษา</span>
              <span className="text-[10px] text-slate-400">· กำลังวิเคราะห์</span>
            </div>
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl rounded-tl-none border border-[#C9A96E]/30 p-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-600 dark:text-[#C6B79F]">
                กำลังคำนวณและประมวลผลคำพยากรณ์ตามคัมภีร์ทักษาและมหาภูติ...
              </p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input Box: Auto-expanding Textarea ── */}
      <form onSubmit={handleSubmit} className="p-3.5 border-t border-slate-200/60 dark:border-white/10 bg-white dark:bg-slate-900/80">
        <div className="space-y-2">
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="พิมพ์คำถามที่ต้องการปรึกษา (ช่องคำถามจะขยายตามข้อความที่พิมพ์อัตโนมัติ)... เช่น ควรเดินทางไปทิศไหนช่วงนี้? หรือ จัดโต๊ะทำงานหันไปทางไหนดี?"
              className="w-full resize-none overflow-hidden bg-slate-50 dark:bg-slate-950/40 border border-slate-300 dark:border-white/15 rounded-2xl p-3.5 pr-12 text-xs md:text-sm text-slate-900 dark:text-[#F8F6F1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E] transition-all"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              กด <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-mono">Enter</kbd> เพื่อส่งคำถาม, <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-mono">Shift+Enter</kbd> เพื่อขึ้นบรรทัดใหม่
            </p>
            <Button
              type="submit"
              disabled={!question.trim() || isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold"
            >
              {isSubmitting ? "กำลังส่ง..." : "ส่งคำถาม"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
