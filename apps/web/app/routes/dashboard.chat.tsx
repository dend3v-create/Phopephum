import { json } from "@remix-run/cloudflare";
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "Wisdom AI — PhopePhum" },
  { name: "description", content: "รวมคำแนะนำและกาลชะตาเพื่อตอบคำถามชีวิตของคุณในจุดเดียว" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "wisdom";
  text: string;
  ts: Date;
  streaming?: boolean;
};

type Mode = "horoscope" | "yam" | "karnchata" | "horanu" | "journal";

type ModeConfig = {
  id: Exclude<Mode, "journal">;
  emoji: string;
  label: string;
  desc: string;
  welcome: string;
  suggestions: string[];
};

const MODE_CONFIGS: Record<Exclude<Mode, "journal">, ModeConfig> = {
  horoscope: {
    id: "horoscope",
    emoji: "🔮",
    label: "ตรวจดวงชะตา",
    desc: "วิเคราะห์พื้นดวงชะตาและอุปสรรคตามวันเดือนปีเกิดและเวลาเกิดของคุณ",
    welcome: "สวัสดีครับ ✦ ยินดีต้อนรับสู่โหมด **ตรวจดวงชะตา**\n\nผมคือ Wisdom AI จะนำแผนผังดวงชะตาและพื้นดวงชะตาของคุณ (เลข ๗ ตัว) มาวิเคราะห์ร่วมกับคำถามที่คุณสงสัยครับ\n\nสามารถถามเกี่ยวกับพื้นดวง ทิศทางชีวิต หรือข้อดีข้อเสียส่วนตัวได้เลยครับ",
    suggestions: [
      "วิเคราะห์พื้นดวงการงานและอาชีพที่เหมาะสมกับดวงชะตาของฉัน",
      "พื้นดวงชะตาด้านการเงินของฉันมีจุดเด่นและจุดรั่วไหลที่ต้องระวังอย่างไร?",
      "วิเคราะห์พื้นฐานจุดแข็งจุดอ่อนในดวงชะตาของฉัน"
    ]
  },
  yam: {
    id: "yam",
    emoji: "⏰",
    label: "เช็คฤกษ์ยาม",
    desc: "หาจังหวะเวลาที่เป็นมงคลเพื่อเริ่มต้นเจรจาหรือดำเนินกิจกรรมสำคัญ",
    welcome: "สวัสดีครับ ✦ ยินดีต้อนรับสู่โหมด **เช็คฤกษ์ยาม**\n\nผมคือ Wisdom AI จะพยากรณ์ความมงคลของกิจกรรมตามหลักยามอัฐกาลและยามย่อยในขณะนี้ เพื่อค้นหาจังหวะเวลาที่ราบรื่นและส่งเสริมที่สุดสำหรับคุณครับ\n\nสามารถถามความมงคลของเวลาในการเจรจาหรือเริ่มกิจกรรมได้เลยครับ",
    suggestions: [
      "ช่วงเวลานี้เหมาะแก่การเจรจาติดต่อธุรกิจสำคัญหรือเรื่องการเงินไหม?",
      "ชั่วโมงถัดไปจากนี้เป็นยามดีหรือร้ายสำหรับการทำธุรกรรมสำคัญ?",
      "วันและเวลาสำหรับการเริ่มต้นกิจการใหม่หรือติดต่อผู้ใหญ่ช่วงนี้คือช่วงไหน?"
    ]
  },
  karnchata: {
    id: "karnchata",
    emoji: "⏳",
    label: "กาลชะตา",
    desc: "อ่านแนวโน้มเรื่องด่วนของสถานการณ์ตามกาลเวลาที่ตั้งคำถาม",
    welcome: "ยินดีต้อนรับสู่โหมด **กาลชะตา (เลข ๗ ตัวกาลชะตา)** ✦\n\nโหมดนี้จะวิเคราะห์พลังงานของสถานการณ์ผ่านเคล็ดกาลชะตาประจำช่วงเวลานี้ เพื่อชี้แนวโน้มความสำเร็จ ทางเลือกการแก้ไข และจังหวะชีวิตก้าวถัดไปของคุณครับ\n\nถามเรื่องเรื่องราวที่เกิดขึ้นด่วนหรือสถานการณ์เฉพาะตัวได้เลยครับ",
    suggestions: [
      "ปัญหายุ่งยากเรื่องงานในตอนนี้ตามกาลชะตาจะคลี่คลายอย่างไร?",
      "การตัดสินใจลงทุนร่วมหุ้นในช่วงนี้จะส่งผลดีร้ายอย่างไรบ้าง?",
      "แนวโน้มและคำปรึกษาเรื่องความรักความสัมพันธ์ในขณะนี้ตามกาลชะตา"
    ]
  },
  horanu: {
    id: "horanu",
    emoji: "🦉",
    label: "พรายกระซิบ",
    desc: "พยากรณ์ผลลัพธ์เฉพาะเจาะจง ตกภพย่อยและดาวลอยประจำวินาที",
    welcome: "ยินดีต้อนรับสู่โหมด **พรายกระซิบ** ✦\n\nทำนายผลลัพธ์ของเรื่องเฉพาะเจาะจงทันทีจากจุดวินาทีที่ถาม โดยผูกดวงยามพรายกระซิบวิเคราะห์ ภพ และดาวลอยประจำนาที ตีความประดุจพรายกระซิบเตือนภัย\n\nระบุคำถามที่ต้องการคำตอบที่เด็ดขาดและด่วนที่สุดได้เลยครับ",
    suggestions: [
      "การสอบแข่งขันหรือสมัครงานสำคัญในวันนี้ จะประสบความสำเร็จไหม?",
      "คนที่เพิ่งเข้ามาเจรจาหรือติดต่อในขณะนี้ มีความจริงใจเพียงใด?",
      "สิ่งของที่ทำหายหรือหาไม่เจอในขณะนี้ จะได้คืนหรือไม่และอยู่ที่ใด?"
    ]
  }
};

const getInitialMessages = (modeId: Exclude<Mode, "journal">): Message[] => [
  {
    id: `welcome-${modeId}`,
    role: "wisdom",
    text: MODE_CONFIGS[modeId].welcome,
    ts: new Date(),
  }
];

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
    .limit(50);

  return json({
    journals: journals || [],
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WisdomChatPage() {
  const { journals } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const [activeMode, setActiveMode] = useState<Mode>("horoscope");
  const [messagesByMode, setMessagesByMode] = useState<Record<Exclude<Mode, "journal">, Message[]>>({
    horoscope: getInitialMessages("horoscope"),
    yam: getInitialMessages("yam"),
    karnchata: getInitialMessages("karnchata"),
    horanu: getInitialMessages("horanu"),
  });

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [journalDetail, setJournalDetail] = useState<any | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByMode, activeMode]);

  // Close suggestions panel and focus input when switching modes
  useEffect(() => {
    setShowQuestions(false);
    if (activeMode !== "journal") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeMode]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || activeMode === "journal") return;

    const modeId = activeMode;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: text.trim(), ts: new Date() };
    const wisdomId = crypto.randomUUID();
    const wisdomMsg: Message = { id: wisdomId, role: "wisdom", text: "", ts: new Date(), streaming: true };

    setMessagesByMode(prev => ({
      ...prev,
      [modeId]: [...prev[modeId], userMsg, wisdomMsg]
    }));
    setInput("");
    setIsStreaming(true);
    setShowQuestions(false);

    try {
      let response: Response;

      if (modeId === "horanu") {
        response = await fetch("/api/horanu-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: text.trim(),
            isoTime: new Date().toISOString(),
          }),
        });
      } else {
        const endpoint = modeId === "karnchata" ? "/api/karnchata-chat" : "/api/wisdom-chat";
        const fd = new FormData();
        fd.append("question", text.trim());
        fd.append("category", MODE_CONFIGS[modeId].label);
        if (modeId === "karnchata") {
          fd.append("targetDate", new Date().toISOString());
        }
        response = await fetch(endpoint, { method: "POST", body: fd });
      }

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({}));
        const errMsg = (err as { error?: string }).error || "เกิดข้อผิดพลาด ลองใหม่ ✦";
        setMessagesByMode(prev => ({
          ...prev,
          [modeId]: prev[modeId].map(m => m.id === wisdomId ? { ...m, text: errMsg, streaming: false } : m)
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? "";
            if (token) {
              acc += token;
              setMessagesByMode(prev => ({
                ...prev,
                [modeId]: prev[modeId].map(m => m.id === wisdomId ? { ...m, text: acc } : m)
              }));
            }
          } catch { /* skip */ }
        }
      }

      setMessagesByMode(prev => ({
        ...prev,
        [modeId]: prev[modeId].map(m => m.id === wisdomId ? { ...m, text: acc, streaming: false } : m)
      }));

      // ── บันทึกลง Wisdom Journal เมื่อรับคำตอบเสร็จสมบูรณ์ ──────────────────────
      if (acc.trim()) {
        const saveFd = new FormData();
        const modeLabel = MODE_CONFIGS[modeId].emoji + " " + MODE_CONFIGS[modeId].label;
        saveFd.append("question", `[${modeLabel}] ${text.trim()}`);
        saveFd.append("answer", acc.trim());
        saveFd.append("energyRating", "3");

        fetch("/api/journal-save", {
          method: "POST",
          body: saveFd
        })
        .then(() => {
          revalidate();
        })
        .catch(err => console.error("Failed to save Wisdom Journal:", err));
      }

    } catch (err) {
      console.error("Chat Error:", err);
      setMessagesByMode(prev => ({
        ...prev,
        [modeId]: prev[modeId].map(m => m.id === wisdomId ? { ...m, text: "ขาดการเชื่อมต่อ กรุณาลองใหม่ ✦", streaming: false } : m)
      }));
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeMode, isStreaming, revalidate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className="-mx-4 -mt-6 -mb-6 flex flex-col md:flex-row relative bg-[var(--bg-base)]"
      style={{
        height: "calc(100dvh - 48px - 64px)",
        overflow: "hidden",
        maxWidth: "100vw",
      }}
    >
      {/* ── Desktop Left Sidebar Tabs ── */}
      <div
        className="hidden md:flex flex-col w-72 shrink-0 border-r"
        style={{
          background: "rgba(10, 34, 64, 0.15)",
          borderColor: "var(--border-gold)",
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border-gold)" }}>
          <h2 className="font-display text-sm font-bold text-[var(--text-body)] flex items-center gap-2">
            <span className="text-[#C6A96B]">✨</span> คลังแชทปัญญา Wisdom AI
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">ถาม-ตอบปัญหาชีวิตและอ่านพลังงานเหนือกาลเวลา</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {Object.values(MODE_CONFIGS).map(mode => {
            const active = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  setActiveMode(mode.id);
                  setJournalDetail(null);
                }}
                className={`w-full text-left p-3.5 rounded-xl transition-all border flex items-start gap-3 group relative ${
                  active
                    ? "bg-gradient-to-r from-[#C6A96B]/15 to-[#D9BC82]/5 border-[#C6A96B] text-[var(--text-body)] shadow-lg shadow-[#C6A96B]/5"
                    : "border-transparent text-[var(--text-secondary)] hover:bg-white/5"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#C6A96B] to-[#D9BC82] rounded-r-md" />
                )}
                <span className="text-xl shrink-0 mt-0.5">{mode.emoji}</span>
                <div>
                  <h3 className={`text-sm font-bold transition-colors ${active ? "text-[#C6A96B]" : "text-[var(--text-body)] group-hover:text-[#C6A96B]"}`}>
                    {mode.label}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {mode.desc}
                  </p>
                </div>
              </button>
            );
          })}
          {/* Journal Tab */}
          <button
            onClick={() => {
              setActiveMode("journal");
              setJournalDetail(null);
            }}
            className={`w-full text-left p-3.5 rounded-xl transition-all border flex items-start gap-3 group relative ${
              activeMode === "journal"
                ? "bg-gradient-to-r from-[#C6A96B]/15 to-[#D9BC82]/5 border-[#C6A96B] text-[var(--text-body)] shadow-lg shadow-[#C6A96B]/5"
                : "border-transparent text-[var(--text-secondary)] hover:bg-white/5"
            }`}
          >
            {activeMode === "journal" && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#C6A96B] to-[#D9BC82] rounded-r-md" />
            )}
            <span className="text-xl shrink-0 mt-0.5">📜</span>
            <div>
              <h3 className={`text-sm font-bold transition-colors ${activeMode === "journal" ? "text-[#C6A96B]" : "text-[var(--text-body)] group-hover:text-[#C6A96B]"}`}>
                คลังบันทึกปัญญา
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                บันทึกประวัติการปรึกษาและคำชี้แนะทั้งหมดในระบบ
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Mobile Top Horizonal Scroll Tab Bar ── */}
      <div
        className="flex md:hidden overflow-x-auto shrink-0 border-b scrollbar-none whitespace-nowrap px-3 py-2.5 gap-2"
        style={{
          background: "rgba(10, 34, 64, 0.25)",
          borderColor: "var(--border-gold)",
        }}
      >
        {Object.values(MODE_CONFIGS).map(mode => {
          const active = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setJournalDetail(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                active
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] border-transparent shadow-md"
                  : "bg-[var(--card-dark-bg)] border-[var(--card-dark-border)] text-[var(--text-secondary)]"
              }`}
            >
              <span>{mode.emoji}</span>
              <span>{mode.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => {
            setActiveMode("journal");
            setJournalDetail(null);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            activeMode === "journal"
              ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] border-transparent shadow-md"
              : "bg-[var(--card-dark-bg)] border-[var(--card-dark-border)] text-[var(--text-secondary)]"
          }`}
        >
          <span>📜</span>
          <span>คลังบันทึกปัญญา</span>
        </button>
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Workspace Header */}
        <div
          className="flex justify-between items-center px-4 py-3 border-b shrink-0"
          style={{
            background: "var(--input-bg)",
            borderColor: "var(--border-gold)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">
              {activeMode === "journal" ? "📜" : MODE_CONFIGS[activeMode].emoji}
            </span>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[var(--text-body)]">
                {activeMode === "journal" ? "คลังบันทึกปัญญา" : MODE_CONFIGS[activeMode].label}
              </h2>
              {activeMode !== "journal" && (
                <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px] xs:max-w-[280px] sm:max-w-none">
                  {MODE_CONFIGS[activeMode].desc}
                </p>
              )}
            </div>
          </div>

          {/* Action: Clear current chat */}
          {activeMode !== "journal" && (
            <button
              onClick={() => {
                if (window.confirm("คุณต้องการล้างการสนทนาในโหมดนี้ใช่หรือไม่?")) {
                  setMessagesByMode(prev => ({
                    ...prev,
                    [activeMode]: getInitialMessages(activeMode)
                  }));
                }
              }}
              className="p-1.5 rounded-lg border border-[var(--border-gold)] hover:bg-white/5 transition-colors text-[var(--text-muted)] hover:text-[#C6A96B]"
              title="ล้างการสนทนา"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Content Area */}
        {activeMode === "journal" ? (
          journalDetail ? (
            /* Journal Detail Mode */
            <div className="flex-1 flex flex-col overflow-hidden animate-fade-in p-4 bg-[var(--bg-base)]">
              <div className="flex justify-between items-center pb-3 border-b mb-4" style={{ borderColor: "var(--border-gold)" }}>
                <button
                  onClick={() => setJournalDetail(null)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-[var(--border-gold)] text-[var(--text-secondary)] hover:bg-white/5"
                >
                  ← ย้อนกลับ
                </button>
                <span className="text-[10px] text-[var(--text-muted)] font-bold">
                  {new Date(journalDetail.created_at).toLocaleString("th-TH", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Question Section */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-[#C6A96B] uppercase tracking-wider block">คำถามของคุณ:</span>
                  <div className="p-3.5 rounded-2xl bg-[#C6A96B]/10 border border-[#C6A96B]/20 text-[var(--text-body)] text-[14px] leading-relaxed">
                    {journalDetail.affirmation_received.replace(/^\[.*?\]\s*/, "")}
                  </div>
                </div>

                {/* Answer Section */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider block">คำชี้แนะจาก Wisdom:</span>
                  <div className="p-4 rounded-2xl bg-[var(--card-dark-bg)] border border-[var(--card-dark-border)] text-[var(--text-secondary)] text-[14px] leading-relaxed whitespace-pre-line">
                    {journalDetail.journal_content}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t mt-4 flex justify-end" style={{ borderColor: "var(--border-gold)" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(journalDetail.journal_content);
                    alert("คัดลอกคำแนะนำไปยังคลิปบอร์ดแล้ว ✦");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C6A96B] hover:bg-[#D9BC82] text-[#020617] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
                >
                  📋 คัดลอกคำชี้แนะ
                </button>
              </div>
            </div>
          ) : (
            /* Journal List Mode */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {journals.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl block mb-2">📜</span>
                  <h3 className="text-sm font-bold text-[var(--text-body)] mt-3">ไม่มีบันทึกประวัติการปรึกษา</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-xs mx-auto leading-relaxed">
                    การพิมพ์สนทนาเพื่อถามคำถามกับ Wisdom ในทุกโหมด จะถูกเก็บบันทึกปัญญาญาณไว้ที่นี่เพื่อให้คุณกลับมาอ่านทบทวนได้ทุกเมื่อ
                  </p>
                </div>
              ) : (
                journals.map((j: any) => {
                  const match = j.affirmation_received.match(/^\[(.*?)\]\s*(.*)/);
                  const tag = match ? match[1] : "Wisdom AI";
                  const questionText = match ? match[2] : j.affirmation_received;

                  return (
                    <button
                      key={j.id}
                      onClick={() => setJournalDetail(j)}
                      className="w-full text-left p-4 rounded-xl border border-[var(--card-dark-border)] bg-[var(--card-dark-bg)] hover:border-[#C6A96B]/50 hover:bg-white/5 transition-all block group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-black/10 text-[#C6A96B]"
                              style={{ borderColor: "var(--border-gold)" }}>
                          {tag}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-bold">
                          {new Date(j.created_at).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[var(--text-body)] text-xs font-bold line-clamp-1 group-hover:text-[#C6A96B]">
                        Q: {questionText}
                      </p>
                      <p className="text-[var(--text-secondary)] text-[13px] mt-1.5 line-clamp-2 leading-relaxed">
                        A: {j.journal_content}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )
        ) : (
          /* Active Chat Workspace */
          <>
            {/* Chat Feed */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none">
              {messagesByMode[activeMode].map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions Panel */}
            {showQuestions && (
              <div
                className="shrink-0 overflow-y-auto max-h-40 border-t bg-[var(--bg-base)] px-4 py-3 space-y-1.5 animate-fade-in"
                style={{ borderColor: "var(--border-gold)" }}
              >
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">คำแนะนำในการถาม:</p>
                <div className="space-y-1.5">
                  {MODE_CONFIGS[activeMode].suggestions.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={isStreaming}
                      className="w-full text-left px-3 py-2.5 rounded-xl border bg-[var(--card-dark-bg)] border-[var(--card-dark-border)] text-[var(--text-secondary)] text-[13px] hover:border-[#C6A96B]/50 transition-colors disabled:opacity-40"
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div
              className="px-4 pb-4 pt-2 shrink-0 border-t"
              style={{ borderColor: "var(--border-gold)" }}
            >
              <div className="flex items-end gap-2 rounded-2xl px-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-gold)] backdrop-blur-md">
                {/* Suggestions Trigger */}
                <button
                  onClick={() => setShowQuestions(v => !v)}
                  disabled={isStreaming}
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all border disabled:opacity-30 ${
                    showQuestions
                      ? "bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] border-transparent text-[#020617]"
                      : "bg-white/5 border-white/10 text-[#C6A96B]"
                  }`}
                  aria-label="คำถามแนะนำ"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" />
                    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
                  </svg>
                </button>

                {/* Textarea Input */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`ถามในโหมด${MODE_CONFIGS[activeMode].label}...`}
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent outline-none resize-none leading-relaxed disabled:opacity-50 text-[var(--text-body)]"
                  style={{
                    fontSize: "15px",
                    fontFamily: "'IBM Plex Sans Thai', sans-serif",
                    maxHeight: "96px",
                    overflowY: "auto",
                  }}
                />

                {/* Send Button */}
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-br from-[#C6A96B] to-[#D9BC82]"
                  aria-label="ส่งคำถาม"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#020617" strokeWidth={2.5} className="w-4 h-4">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
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
          className="rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed font-semibold text-[14px]"
          style={{
            maxWidth: "80%",
            background: "rgba(198,169,107,0.18)",
            border: "1px solid rgba(198,169,107,0.25)",
            color: "var(--text-body)",
          }}
        >
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 animate-fade-up">
      {/* Avatar */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 border"
        style={{
          background: "rgba(198,169,107,0.10)",
          borderColor: "var(--border-gold)",
        }}
      >
        <span className="text-[12px] font-bold text-[#C6A96B]">✦</span>
      </div>

      <div
        className="rounded-2xl rounded-tl-sm px-4 py-2.5 leading-relaxed text-sm border"
        style={{
          maxWidth: "83%",
          background: "var(--card-dark-bg)",
          borderColor: "var(--card-dark-border)",
          color: "var(--text-secondary)",
          fontSize: "14px",
        }}
      >
        {msg.text
          ? msg.text.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))
          : null}
        {msg.streaming && (
          <span className="inline-flex items-center gap-1 ml-1.5">
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
