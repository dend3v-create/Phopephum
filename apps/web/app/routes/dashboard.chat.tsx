import type { MetaFunction } from "@remix-run/cloudflare";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "Wisdom AI — PhopePhum" },
  { name: "description", content: "ถามเรื่องอะไรก็ได้ที่คุณสงสัยเกี่ยวกับชีวิต Wisdom จะตอบทันที" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "wisdom";
  text: string;
  ts: Date;
  streaming?: boolean;
};

type Category = {
  id: string;
  emoji: string;
  label: string;
  questions: string[];
};

// ─── Quick categories (consumer-friendly, no astrology jargon) ───────────────

const CATEGORIES: Category[] = [
  {
    id: "timing",
    emoji: "⚡",
    label: "เวลาที่ใช่",
    questions: [
      "วันนี้เหมาะทำอะไรเป็นพิเศษไหม?",
      "จังหวะตอนนี้เหมาะกับการตัดสินใจครั้งใหญ่หรือเปล่า?",
      "ควรรอหรือลงมือทำเลยดี?",
    ],
  },
  {
    id: "work",
    emoji: "💼",
    label: "การงาน",
    questions: [
      "การเจรจาวันนี้จะออกมาดีไหม?",
      "ควรเริ่มงานใหม่ตอนนี้เลยหรือรอก่อน?",
      "โอกาสที่รออยู่จะมาถึงไหม?",
    ],
  },
  {
    id: "wealth",
    emoji: "💰",
    label: "การเงิน",
    questions: [
      "ตอนนี้เหมาะกับการลงทุนไหม?",
      "เงินที่รอคอยจะได้รับเร็วๆ นี้หรือเปล่า?",
      "ควรระวังการใช้จ่ายในช่วงนี้ไหม?",
    ],
  },
  {
    id: "love",
    emoji: "💖",
    label: "ความรัก",
    questions: [
      "ความสัมพันธ์ที่คิดอยู่จะเป็นยังไงบ้าง?",
      "ตอนนี้เหมาะกับการเปิดใจรักใหม่ไหม?",
      "คนที่ห่างใจกันจะกลับมาไหม?",
    ],
  },
  {
    id: "health",
    emoji: "🌿",
    label: "สุขภาพ",
    questions: [
      "ควรดูแลสุขภาพเป็นพิเศษอย่างไรในช่วงนี้?",
      "อาการที่เป็นอยู่จะดีขึ้นเร็วไหม?",
      "ช่วงนี้ควรพักผ่อนหรือออกแรงได้?",
    ],
  },
  {
    id: "life",
    emoji: "✦",
    label: "ชีวิต",
    questions: [
      "ขอคำแนะนำสำหรับชีวิตตอนนี้หน่อย",
      "สิ่งที่กำลังกังวลอยู่จะคลี่คลายไหม?",
      "มีอะไรที่ควรทำหรือหลีกเลี่ยงในช่วงนี้?",
    ],
  },
];

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "wisdom",
  text: "สวัสดีครับ ✦\n\nผมคือ Wisdom — เพื่อนที่จะช่วยคุณอ่านพลังงานของวันและตอบทุกคำถามที่คุณสงสัยเกี่ยวกับชีวิต\n\nถามอะไรก็ได้เลยครับ ไม่ว่าจะเรื่องการงาน ความรัก การเงิน หรือเวลาที่เหมาะกับการตัดสินใจสำคัญ",
  ts: new Date(),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WisdomChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [activeCat, setActiveCat] = useState<Category>(CATEGORIES[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: text.trim(),
      ts: new Date(),
    };

    const wisdomMsgId = crypto.randomUUID();
    const wisdomMsg: Message = {
      id: wisdomMsgId,
      role: "wisdom",
      text: "",
      ts: new Date(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, wisdomMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const formData = new FormData();
      formData.append("question", text.trim());
      formData.append("category", activeCat.label);

      const response = await fetch("/api/wisdom-chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({}));
        setMessages(prev =>
          prev.map(m =>
            m.id === wisdomMsgId
              ? { ...m, text: (err as { error?: string }).error || "เกิดข้อผิดพลาด กรุณาลองใหม่ ✦", streaming: false }
              : m
          )
        );
        return;
      }

      // Stream SSE response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? "";
              if (token) {
                accumulated += token;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === wisdomMsgId ? { ...m, text: accumulated } : m
                  )
                );
              }
            } catch {
              // non-JSON SSE data line — skip
            }
          }
        }
      }

      // Mark streaming done
      setMessages(prev =>
        prev.map(m =>
          m.id === wisdomMsgId ? { ...m, streaming: false } : m
        )
      );

    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === wisdomMsgId
            ? { ...m, text: "ขาดการเชื่อมต่อชั่วคราว กรุณาลองใหม่ ✦", streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [activeCat, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-32px)] max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "rgba(217,188,130,0.10)" }}>
        <div className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.3)" }}>
          <span className="text-[#C6A96B] text-base">✦</span>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2"
            style={{ borderColor: "#020617" }} />
        </div>
        <div>
          <p className="text-[#F8F6F1] text-sm font-semibold leading-none">Wisdom</p>
          <p className="text-[#94A3B8] text-xs mt-0.5">พร้อมตอบทุกคำถาม</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/dashboard"
            className="text-xs text-[#94A3B8] hover:text-[#C6A96B] transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            วันนี้ →
          </Link>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto shrink-0 border-b scrollbar-none"
        style={{ borderColor: "rgba(217,188,130,0.07)" }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeCat.id === cat.id
                ? "text-[#020617] scale-[1.03]"
                : "text-[#94A3B8] border border-white/8 hover:border-[#C6A96B]/30 hover:text-[#D9BC82]"
            }`}
            style={activeCat.id === cat.id
              ? { background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }
              : { background: "rgba(10,34,64,0.4)" }
            }
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick questions ── */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
        {activeCat.questions.map(q => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={isStreaming}
            className="shrink-0 text-xs text-[#94A3B8] border border-white/8 px-3 py-1.5 rounded-full hover:border-[#C6A96B]/40 hover:text-[#D9BC82] transition-all disabled:opacity-40 max-w-[200px] text-left truncate"
            style={{ background: "rgba(10,34,64,0.3)" }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── Input bar ── */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t"
        style={{ borderColor: "rgba(217,188,130,0.10)" }}>
        <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{
            background: "rgba(10,34,64,0.6)",
            border: "1px solid rgba(217,188,130,0.15)",
            backdropFilter: "blur(12px)",
          }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`ถามเรื่อง${activeCat.label}...`}
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-[#F8F6F1] placeholder-[#4A5568] text-sm resize-none outline-none leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Sans Thai', sans-serif" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
            aria-label="ส่ง"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#020617" strokeWidth={2.2} className="w-4 h-4">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[#4A5568] text-[10px] mt-2 tracking-wide">
          Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่
        </p>
      </div>

    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: "rgba(198,169,107,0.18)", border: "1px solid rgba(198,169,107,0.25)", color: "#F8F6F1" }}
        >
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1"
        style={{ background: "rgba(198,169,107,0.10)", border: "1px solid rgba(198,169,107,0.25)" }}>
        <span className="text-[#C6A96B] text-xs">✦</span>
      </div>
      <div
        className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
        style={{ background: "rgba(10,34,64,0.6)", border: "1px solid rgba(255,255,255,0.06)", color: "#D9CDB7" }}
      >
        {msg.text
          ? msg.text.split("\n").map((line, i) => (
              <span key={i}>{line}{i < msg.text.split("\n").length - 1 && <br />}</span>
            ))
          : null}
        {msg.streaming && (
          <span className="inline-flex items-center gap-1 ml-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-[#C6A96B] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
