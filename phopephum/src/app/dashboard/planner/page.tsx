"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora, PLANETS, PlanetId } from "@/engine/phopephum-calculator";
import { 
  Calendar, Sparkles, Plus, Trash2, CheckCircle2, Circle, 
  ArrowLeft, Star, Heart, Zap, ShieldAlert, Award, ChevronRight, Save, Compass, Download
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  taskTitle: string;
  horaSlotIndex: number;
  isCompleted: boolean;
  scheduledDate: string;
}

interface Journal {
  id?: string;
  journalDate: string;
  energyRating: number;
  journalContent: string;
  affirmationReceived: string;
}

export default function PlannerPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Date tracking
  const [selectedDate, setSelectedDate] = useState("");
  const [dayHoraData, setDayHoraData] = useState<any>(null);
  
  // Planner state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTexts, setNewTaskTexts] = useState<Record<number, string>>({});
  const [isAddingTask, setIsAddingTask] = useState<Record<number, boolean>>({});
  
  // Journal state
  const [journal, setJournal] = useState<Journal>({
    journalDate: "",
    energyRating: 5,
    journalContent: "",
    affirmationReceived: ""
  });
  const [savingJournal, setSavingJournal] = useState(false);
  const [journalMessage, setJournalMessage] = useState("");

  useEffect(() => {
    // Set default date to today in local timezone
    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format
    setSelectedDate(todayStr);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    const loadDayData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          window.location.href = "/login";
          return;
        }

        // Fetch user profile if not loaded
        if (!profile) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (prof) setProfile(prof);
        }

        // Calculate hora slots for selected date
        const dateObj = new Date(selectedDate);
        const horaResult = calculateHora({ date: dateObj });
        setDayHoraData(horaResult);

        // Fetch tasks and journal from API
        const res = await fetch(`/api/planner?date=${selectedDate}`);
        const result = await res.json();
        
        if (res.ok && result.success) {
          setTasks(result.data.tasks || []);
          if (result.data.journal) {
            setJournal(result.data.journal);
          } else {
            setJournal({
              journalDate: selectedDate,
              energyRating: 5,
              journalContent: "",
              affirmationReceived: ""
            });
          }
        }
      } catch (err) {
        console.error("Error loading day data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDayData();
  }, [selectedDate]);

  // Task Handlers
  const handleAddTask = async (slotIndex: number) => {
    const text = newTaskTexts[slotIndex]?.trim();
    if (!text) return;

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task",
          taskTitle: text,
          horaSlotIndex: slotIndex,
          scheduledDate: selectedDate
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setTasks((prev) => [...prev, result.data]);
        setNewTaskTexts((prev) => ({ ...prev, [slotIndex]: "" }));
        setIsAddingTask((prev) => ({ ...prev, [slotIndex]: false }));
      }
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          isCompleted: !currentStatus
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, isCompleted: !currentStatus } : t))
        );
      }
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/planner?id=${taskId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // Journal Handlers
  const handleSaveJournal = async () => {
    setSavingJournal(true);
    setJournalMessage("");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "journal",
          journalDate: selectedDate,
          energyRating: journal.energyRating,
          journalContent: journal.journalContent,
          affirmationReceived: journal.affirmationReceived
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setJournal(result.data);
        setJournalMessage("บันทึกพลังงานและสะท้อนคิดเรียบร้อยแล้ว ✨");
        setTimeout(() => setJournalMessage(""), 3000);
      } else {
        setJournalMessage("เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
      }
    } catch (err) {
      console.error("Error saving journal:", err);
      setJournalMessage("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingJournal(false);
    }
  };

  if (loading && !dayHoraData) {
    return (
      <div className="min-h-screen bg-hora-dark text-hora-text flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-hora-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-hora-text-muted">กำลังคำนวณสล็อตยามอัฐกาลส่วนบุคคล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hora-dark text-hora-text font-sans pb-20 selection:bg-hora-gold selection:text-hora-dark">
      {/* Radial overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,169,110,0.08),transparent_60%)] pointer-events-none" />

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
              <h1 className="text-xl font-serif font-bold text-hora-gold tracking-wide">
                TQM Planner
              </h1>
              <p className="text-xxs text-hora-text-muted hidden sm:block">
                ระบบจัดการแผนงานสอดคล้องภูมิปัญญายามอัฐกาลเฉพาะบุคคล
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#14110C] border border-hora-dark-border/50 rounded-xl px-4 py-2">
              <Calendar className="w-4 h-4 text-hora-gold" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm text-hora-text outline-none font-medium cursor-pointer"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 grid lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: TQM Info & Reflection Journal */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* Daily Aura & Guide Card */}
          <div className="glass-hora rounded-2xl p-6 border border-hora-dark-border/80">
            <span className="text-xxs text-hora-gold font-bold uppercase tracking-widest flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-hora-gold" /> Daily Wisdom Guide
            </span>
            <h3 className="text-xl font-serif font-bold text-hora-gold-light mb-3">
              พลังงานวัน{dayHoraData?.dayNameThai}
            </h3>
            
            <div className="space-y-4 font-sans text-sm text-hora-text-muted">
              <p className="leading-relaxed">
                วันนี้ปกครองโดยดาว <strong className="text-hora-gold">{dayHoraData?.dayRuler.nameThai} ({dayHoraData?.dayRuler.symbol})</strong> ซึ่งมีลักษณะพลังงานเด่นคือ <span className="text-hora-text">{dayHoraData?.dayRuler.description}</span>
              </p>
              
              <div className="border-t border-hora-dark-border/30 pt-3 space-y-2">
                <span className="text-xs font-semibold text-hora-gold flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> เกื้อหนุนและส่งเสริมเป็นพิเศษ
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dayHoraData?.dayRuler.promotes.map((promo: string, i: number) => (
                    <span key={i} className="text-xxs bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full">
                      {promo}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-hora-dark-border/30 pt-3 space-y-2">
                <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> พึงระวัง
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dayHoraData?.dayRuler.warns.map((warn: string, i: number) => (
                    <span key={i} className="text-xxs bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full">
                      {warn}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reflection Journal Card */}
          <div className="glass-hora rounded-2xl p-6 border border-hora-gold/20 bg-hora-dark-card/40">
            <span className="text-xxs text-hora-gold font-bold uppercase tracking-widest flex items-center gap-1 mb-2">
              <Heart className="w-3.5 h-3.5 text-hora-gold" /> Reflection Journal
            </span>
            <h3 className="text-lg font-serif font-bold text-hora-gold-light mb-4 pb-2 border-b border-hora-dark-border/30">
              บันทึกพลังงาน & สะท้อนคิด
            </h3>

            <div className="space-y-5 font-sans">
              {/* Energy Rating Star Selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted">ระดับพลังงานวันนี้ (Energy Level)</label>
                <div className="flex gap-2 items-center pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setJournal((prev) => ({ ...prev, energyRating: star }))}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          star <= journal.energyRating 
                            ? "text-hora-gold fill-hora-gold filter drop-shadow-[0_0_4px_rgba(201,169,110,0.4)]" 
                            : "text-hora-text-muted/40"
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-xs text-hora-gold ml-2 font-semibold">
                    {journal.energyRating === 5 ? "ยอดเยี่ยมที่สุด 🔥" : 
                     journal.energyRating === 4 ? "ดีมาก ⚡" : 
                     journal.energyRating === 3 ? "ปานกลาง 🍃" : 
                     journal.energyRating === 2 ? "เหนื่อยล้า 💤" : "หมดพลัง 🛑"}
                  </span>
                </div>
              </div>

              {/* Journal Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted">ข้อสะท้อนคิดประจำวัน / ความสำเร็จวันนี้</label>
                <textarea
                  rows={4}
                  value={journal.journalContent}
                  onChange={(e) => setJournal((prev) => ({ ...prev, journalContent: e.target.value }))}
                  placeholder="วันนี้ได้สัจจะบารมีเรื่องใดบ้าง? หรือมีสิ่งใดให้เรียนรู้เพิ่มเติม..."
                  className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-xl px-4 py-3 text-xs text-hora-text outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Affirmation Textbox */}
              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted">ธรรมประธาน / คำสอนเติมพลังใจ</label>
                <input
                  type="text"
                  value={journal.affirmationReceived}
                  onChange={(e) => setJournal((prev) => ({ ...prev, affirmationReceived: e.target.value }))}
                  placeholder="ความอดทนในวันลำบาก คือความสำเร็จในวันหน้า..."
                  className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-xl px-4 py-3 text-xs text-hora-text outline-none"
                />
              </div>

              {journalMessage && (
                <p className="text-xs font-semibold text-center text-hora-gold animate-pulse">
                  {journalMessage}
                </p>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSaveJournal}
                disabled={savingJournal}
                className="btn-hora w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {savingJournal ? "กำลังบันทึก..." : "บันทึกข้อมูลสะท้อนคิด"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (span 2): TQM 8 Hora Slots Calendar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-hora rounded-2xl p-6 border border-hora-dark-border/80">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-hora-dark-border/20">
              <h3 className="text-lg font-serif font-bold text-hora-gold-light">
                ปฏิทินยามอัฐกาลและแผนงาน TQM รายสล็อต
              </h3>
              <span className="text-xxs bg-hora-gold/10 border border-hora-gold/30 text-hora-gold px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                16 HORA CALENDAR
              </span>
            </div>

            {/* List 8 Major Slots */}
            <div className="space-y-6 font-sans">
              {dayHoraData?.majorSlots.map((slot: any) => {
                const slotTasks = tasks.filter((t) => t.horaSlotIndex === slot.majorSlot);
                const isAdding = isAddingTask[slot.majorSlot] || false;
                const taskText = newTaskTexts[slot.majorSlot] || "";

                return (
                  <div 
                    key={slot.majorSlot} 
                    className={`border border-hora-dark-border/40 rounded-2xl p-5 transition-all ${
                      slot.period === "day" 
                        ? "bg-gradient-to-r from-hora-dark-card/80 to-[#14110C]/40" 
                        : "bg-gradient-to-r from-[#03071A]/90 to-hora-dark-card/50"
                    } hover:border-hora-gold/25`}
                  >
                    {/* Slot Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hora-dark-border/20 pb-3">
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border"
                          style={{ 
                            borderColor: `${slot.rulerPlanet.color}40`,
                            backgroundColor: `${slot.rulerPlanet.color}12`,
                            color: slot.rulerPlanet.color 
                          }}
                        >
                          {slot.majorSlot}
                        </span>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-hora-text flex items-center gap-1.5">
                            {slot.name}
                            <span className="text-xxs text-hora-text-muted font-normal">
                              ({slot.startTime} - {slot.endTime} น.)
                            </span>
                          </h4>
                          
                          <p className="text-xxs text-hora-text-muted flex items-center gap-1">
                            ผู้ครองยาม: <span className="font-semibold text-hora-gold" style={{ color: slot.rulerPlanet.color }}>{slot.rulerPlanet.nameThai} ({slot.rulerPlanet.symbol})</span>
                            <span className="text-xxs text-hora-text-muted/70">
                              — {slot.rulerPlanet.description}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Add Task Button */}
                      <button
                        onClick={() => setIsAddingTask((prev) => ({ ...prev, [slot.majorSlot]: !isAdding }))}
                        className="text-xxs text-hora-gold border border-hora-gold/20 hover:bg-hora-gold/10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all self-start sm:self-auto cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> เพิ่มกิจกรรม
                      </button>
                    </div>

                    {/* Task Add Form Overlay */}
                    {isAdding && (
                      <div className="mt-4 flex gap-2 items-center bg-[#03071A]/60 border border-hora-gold/20 rounded-xl p-3">
                        <input
                          type="text"
                          value={taskText}
                          onChange={(e) => setNewTaskTexts((prev) => ({ ...prev, [slot.majorSlot]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddTask(slot.majorSlot)}
                          placeholder="กรอกชื่อกิจกรรมที่วางแผนทำในยามมงคลนี้..."
                          className="flex-1 bg-transparent border-none text-xs text-hora-text outline-none"
                        />
                        <button
                          onClick={() => handleAddTask(slot.majorSlot)}
                          className="bg-hora-gold text-hora-dark text-xxs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 cursor-pointer"
                        >
                          บันทึก
                        </button>
                        <button
                          onClick={() => setIsAddingTask((prev) => ({ ...prev, [slot.majorSlot]: false }))}
                          className="text-xxs text-hora-text-muted hover:text-hora-text border border-hora-dark-border/60 px-2 py-1.5 rounded-lg cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    )}

                    {/* Slot Tasks List */}
                    <div className="mt-4 space-y-2">
                      {slotTasks.length === 0 ? (
                        <p className="text-xxs text-hora-text-muted/60 italic">
                          ยังไม่มีการบันทึกแผนงานในยามมงคลนี้
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {slotTasks.map((task) => (
                            <div 
                              key={task.id} 
                              className="flex items-center justify-between bg-[#14110C]/40 border border-hora-dark-border/40 rounded-xl p-3 hover:border-hora-gold/15 group"
                            >
                              <button
                                onClick={() => handleToggleTask(task.id, task.isCompleted)}
                                className="flex items-center gap-3 cursor-pointer text-left flex-1"
                              >
                                {task.isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-hora-gold filter drop-shadow-[0_0_3px_rgba(201,169,110,0.4)] flex-shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-hora-text-muted/60 flex-shrink-0" />
                                )}
                                <span 
                                  className={`text-xs ${
                                    task.isCompleted 
                                      ? "line-through text-hora-text-muted/50 font-normal" 
                                      : "text-hora-text font-medium"
                                  }`}
                                >
                                  {task.taskTitle}
                                </span>
                              </button>

                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-hora-text-muted hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-hora border-t border-white/10 bg-cosmic-950/85 backdrop-blur-lg flex items-center justify-around py-3 px-2 shadow-[0_-10px_20px_rgba(0,0,0,0.8)] pb-safe">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Compass className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">ภาพรวมดวง</span>
        </Link>
        <Link href="/dashboard/planner" className="flex flex-col items-center gap-1 text-gold-500">
          <Calendar className="w-4 h-4 text-gold-500" />
          <span className="text-[9px] font-bold tracking-wider">Planner</span>
        </Link>
        <Link href="/dashboard/coach" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Sparkles className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">AI Coach</span>
        </Link>
        <Link href="/dashboard/report" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Download className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">Reports</span>
        </Link>
      </div>
    </div>
  );
}
