import { json } from "@remix-run/cloudflare";
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

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

type Category = { id: string; emoji: string; label: string; questions: string[] };

const CATEGORIES: Category[] = [
  { id: "timing", emoji: "⚡", label: "เวลาที่ใช่",
    questions: ["วันนี้เหมาะทำอะไรเป็นพิเศษไหม?", "จังหวะนี้ควรรอหรือลงมือเลยดี?", "ตัดสินใจครั้งใหญ่ตอนนี้ได้เลยไหม?"] },
  { id: "work", emoji: "💼", label: "การงาน",
    questions: ["การเจรจาวันนี้จะออกมาดีไหม?", "ควรเริ่มงานใหม่ตอนนี้ไหม?", "โอกาสที่รออยู่จะมาถึงไหม?"] },
  { id: "wealth", emoji: "💰", label: "การเงิน",
    questions: ["ตอนนี้เหมาะลงทุนไหม?", "เงินที่รอคอยจะได้รับเร็วๆ นี้ไหม?", "ควรระวังการใช้จ่ายในช่วงนี้ไหม?"] },
  { id: "love", emoji: "💖", label: "ความรัก",
    questions: ["ความสัมพันธ์ที่คิดอยู่จะเป็นยังไง?", "ตอนนี้เหมาะเปิดใจรักใหม่ไหม?", "คนที่ห่างกันจะกลับมาไหม?"] },
  { id: "health", emoji: "🌿", label: "สุขภาพ",
    questions: ["ควรดูแลสุขภาพอย่างไรช่วงนี้?", "อาการที่เป็นอยู่จะดีขึ้นเร็วไหม?", "ช่วงนี้ควรพักหรือออกแรงได้?"] },
  { id: "life", emoji: "✦", label: "ชีวิต",
    questions: ["ขอคำแนะนำสำหรับชีวิตตอนนี้หน่อย", "สิ่งที่กกังวลอยู่จะคลี่คลายไหม?", "มีอะไรควรทำหรือหลีกเลี่ยงช่วงนี้?"] },
];

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "wisdom",
  text: "สวัสดีครับ ✦\n\nผมคือ Wisdom — เพื่อนที่จะช่วยอ่านพลังงานของวัน และตอบคำถามชีวิตที่คุณสงสัย\n\nถามอะไรก็ได้เลยครับ",
  ts: new Date(),
};

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { supabase } = createSupabaseClient(request, env);

  // ดึงประวัติคำถามเดิมใน Wisdom Journal
  const { data: journals } = await supabase
    .from("user_journals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return json({
    journals: journals || [],
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WisdomChatPage() {
  const { journals } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [activeCat, setActiveCat] = useState<Category>(CATEGORIES[0]!);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close questions panel when category changes
  useEffect(() => { setShowQuestions(false); }, [activeCat]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    setShowQuestions(false);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: text.trim(), ts: new Date() };
    const wisdomId = crypto.randomUUID();
    const wisdomMsg: Message = { id: wisdomId, role: "wisdom", text: "", ts: new Date(), streaming: true };

    setMessages(prev => [...prev, userMsg, wisdomMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const fd = new FormData();
      fd.append("question", text.trim());
      fd.append("category", activeCat.label);

      const res = await fetch("/api/wisdom-chat", { method: "POST", body: fd });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setMessages(prev => prev.map(m => m.id === wisdomId
          ? { ...m, text: (err as { error?: string }).error || "เกิดข้อผิดพลาด ลองใหม่ ✦", streaming: false } : m));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? "";
            if (token) {
              acc += token;
              setMessages(prev => prev.map(m => m.id === wisdomId ? { ...m, text: acc } : m));
            }
          } catch { /* skip */ }
        }
      }
      setMessages(prev => prev.map(m => m.id === wisdomId ? { ...m, streaming: false } : m));

      // ── บันทึกลง Wisdom Journal เมื่อรับคำตอบเสร็จสมบูรณ์ ──────────────────────
      if (acc.trim()) {
        const saveFd = new FormData();
        saveFd.append("question", text.trim());
        saveFd.append("answer", acc.trim());
        saveFd.append("energyRating", "3");

        fetch("/api/journal-save", {
          method: "POST",
          body: saveFd
        })
        .then(() => {
          // รีเฟรชข้อมูลหน้าเว็บเพื่อให้ประวัติล่าสุดอัปเดต
          revalidate();
        })
        .catch(err => console.error("Failed to save Wisdom Journal:", err));
      }

    } catch {
      setMessages(prev => prev.map(m => m.id === wisdomId
        ? { ...m, text: "ขาดการเชื่อมต่อ กรุณาลองใหม่ ✦", streaming: false } : m));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [activeCat, isStreaming, revalidate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    /*
     * -mx-4 -mt-6 -mb-6 cancels ProtectedContent px-4 py-6
     * overflow-x-hidden prevents horizontal bleed
     * height = 100dvh − topbar(48px) − bottombar(64px)
     */
    <div
      className="-mx-4 -mt-6 -mb-6 flex flex-col relative"
      style={{
        height: "calc(100dvh - 48px - 64px)",
        overflow: "hidden",
        maxWidth: "100vw",
      }}
    >
      {/* ── Header ── */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-[#C6A96B]/15 bg-[#0a2240]/45 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[#C6A96B] text-lg font-bold">✦</span>
          <h2 className="font-display text-sm sm:text-base font-bold text-[#F8F6F1]">ปัญญาพยากรณ์ Wisdom Oracle</h2>
        </div>
        <button
          onClick={() => setShowHistory(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border border-[#C6A96B]/20 bg-[#C6A96B]/5 text-[#C6A96B] hover:bg-[#C6A96B]/15"
        >
          📜 คลังบันทึกปัญญา ({journals.length})
        </button>
      </div>

      {/* ── Category tabs: 2-row × 3-col grid ───────────────────── */}
      <div
        className="grid grid-cols-3 gap-1.5 px-3 py-2 shrink-0 border-b"
        style={{ borderColor: "rgba(217,188,130,0.10)" }}
      >
        {CATEGORIES.map(cat => {
          const active = activeCat.id === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat)}
              className="flex items-center justify-center gap-1 py-1.5 rounded-xl font-medium transition-all"
              style={active
                ? { background: "linear-gradient(135deg,#C6A96B,#D9BC82)", color: "#020617", fontSize: "13px" }
                : { background: "rgba(10,34,64,0.5)", border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8", fontSize: "13px" }
              }
            >
              <span style={{ fontSize: "13px" }}>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Messages ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-3 scrollbar-none">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* ── Wisdom Journal History Slide-over Panel ───────────────── */}
      {showHistory && (
        <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md z-20 flex flex-col p-4 animate-fade-up">
          <div className="flex justify-between items-center pb-3 border-b border-[#C6A96B]/15">
            <h3 className="font-display text-[#C6A96B] font-bold text-base flex items-center gap-2">
              <span>📜</span> Wisdom Journal (คลังบันทึกปัญญา)
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-[#94A3B8] hover:text-[#F8F6F1] font-bold border border-white/10 px-3 py-1.5 rounded-xl"
            >
              ปิด
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 space-y-2.5">
            {journals.length === 0 ? (
              <p className="text-center py-10 text-[#8A8070] text-xs italic">ไม่มีบันทึกประวัติการปรึกษาในขณะนี้</p>
            ) : (
              journals.map((j: any) => (
                <button
                  key={j.id}
                  onClick={() => {
                    setMessages([
                      WELCOME_MSG,
                      { id: `q-${j.id}`, role: "user", text: j.affirmation_received, ts: new Date(j.created_at) },
                      { id: `a-${j.id}`, role: "wisdom", text: j.journal_content, ts: new Date(j.created_at) }
                    ]);
                    setShowHistory(false);
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-[#C6A96B]/10 bg-[#0a2240]/40 hover:border-[#C6A96B]/40 hover:bg-[#0a2240]/85 transition-all block group"
                >
                  <span className="text-[10px] text-[#8A8070] font-bold block mb-1">
                    {new Date(j.created_at).toLocaleString("th-TH", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p className="text-[#C6A96B] text-xs font-bold line-clamp-1 group-hover:text-gold-liquid">Q: {j.affirmation_received}</p>
                  <p className="text-[#D9CDB7] text-[13px] mt-1 line-clamp-2 leading-relaxed">A: {j.journal_content}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Quick questions slide-up panel ───────────────────────── */}
      <div
        className="shrink-0 overflow-hidden transition-all duration-200"
        style={{
          maxHeight: showQuestions ? "160px" : "0px",
          borderTop: showQuestions ? "1px solid rgba(217,188,130,0.10)" : "none",
        }}
      >
        <div className="px-3 py-2 space-y-1.5">
          {activeCat.questions.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={isStreaming}
              className="w-full text-left px-3 py-2 rounded-xl border transition-all disabled:opacity-40"
              style={{
                background: "rgba(10,34,64,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#D9CDB7",
                fontSize: "13px",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input bar ────────────────────────────────────────────── */}
      <div
        className="px-3 pb-3 pt-2 shrink-0"
        style={{ borderTop: "1px solid rgba(217,188,130,0.10)" }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2.5"
          style={{
            background: "rgba(10,34,64,0.7)",
            border: "1px solid rgba(217,188,130,0.18)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Quick questions toggle */}
          <button
            onClick={() => setShowQuestions(v => !v)}
            disabled={isStreaming}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{
              background: showQuestions
                ? "linear-gradient(135deg,#C6A96B,#D9BC82)"
                : "rgba(255,255,255,0.06)",
              border: showQuestions ? "none" : "1px solid rgba(255,255,255,0.10)",
            }}
            aria-label="คำถามแนะนำ"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={showQuestions ? "#020617" : "#C6A96B"} strokeWidth={2} className="w-4 h-4">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" />
              <circle cx="12" cy="17" r="0.5" fill={showQuestions ? "#020617" : "#C6A96B"} stroke="none" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`ถาม Wisdom เรื่อง${activeCat.label}...`}
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent outline-none resize-none leading-relaxed disabled:opacity-50"
            style={{
              color: "#F8F6F1",
              fontSize: "15px",
              fontFamily: "'IBM Plex Sans Thai', sans-serif",
              maxHeight: "96px",
              overflowY: "auto",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#C6A96B,#D9BC82)" }}
            aria-label="ส่ง"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#020617" strokeWidth={2.2} className="w-4 h-4">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div
          className="rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed font-sans-thai font-semibold"
          style={{
            maxWidth: "80%",
            background: "rgba(198,169,107,0.18)",
            border: "1px solid rgba(198,169,107,0.25)",
            color: "#F8F6F1",
            fontSize: "14px",
          }}
        >
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 animate-fade-up">
      {/* Avatar */}
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: "rgba(198,169,107,0.10)", border: "1px solid rgba(198,169,107,0.25)" }}
      >
        <span style={{ color: "#C6A96B", fontSize: "12px" }}>✦</span>
      </div>

      <div
        className="rounded-2xl rounded-tl-sm px-4 py-2.5 leading-relaxed font-sans-thai text-sm"
        style={{
          maxWidth: "83%",
          background: "rgba(10,34,64,0.65)",
          border: "1px solid rgba(255,255,255,0.06)",
          color: "#D9CDB7",
          fontSize: "14px",
        }}
      >
        {msg.text
          ? msg.text.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))
          : null}
        {msg.streaming && (
          <span className="inline-flex items-center gap-1 ml-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: "#C6A96B", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
