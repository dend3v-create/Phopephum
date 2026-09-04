import { useState, useEffect, useRef } from "react";
import { Link } from "@remix-run/react";
import type { TimingReminder } from "@phopephum/types";

export interface TimingReminderBellProps {
  initialReminders?: TimingReminder[];
  initialUnreadCount?: number;
}

export function TimingReminderBell({
  initialReminders = [],
  initialUnreadCount = 0,
}: TimingReminderBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState<TimingReminder[]>(initialReminders);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch latest reminders when opening
  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/reminders");
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          reminders?: TimingReminder[];
          unreadCount?: number;
        };
        if (data.ok && Array.isArray(data.reminders)) {
          setReminders(data.reminders);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchReminders();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isRead: true } : r))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "mark_read", reminderId: id }),
      });
    } catch (err) {
      console.error("Failed to mark reminder as read:", err);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* ── Bell Trigger Button ── */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-[#F8F6F1]/80 hover:text-[#C6A96B] hover:bg-white/5 active:scale-95 transition-all focus:outline-none"
        aria-label="การแจ้งเตือนจังหวะเวลา"
        title="Personal Timing Reminders"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="w-5 h-5"
        >
          <path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-[9px] font-black text-[#020617] shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden border animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: "rgba(10, 20, 38, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "rgba(198, 169, 107, 0.28)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#C6A96B]/15 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔔</span>
              <span className="font-display text-sm font-bold text-[#F8F6F1]">
                เตือนจังหวะเวลาเฉพาะตน
              </span>
            </div>
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-[#C6A96B] hover:underline"
            >
              ตั้งค่า
            </Link>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5 py-1">
            {isLoading && reminders.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40">
                กำลังตรวจสอบจังหวะเวลา...
              </div>
            ) : reminders.length === 0 ? (
              <div className="py-8 text-center px-4">
                <span className="text-2xl block mb-1">🌿</span>
                <p className="text-xs text-white/60">ยังไม่มีการแจ้งเตือนในขณะนี้</p>
                <p className="text-[11px] text-white/40 mt-1">
                  ระบบจะแจ้งเตือนเมื่อถึงช่วงเวลาทองคำหรือก่อนถึงเวลานัดหมาย
                </p>
              </div>
            ) : (
              reminders.map((reminder) => {
                const isHigh = reminder.priority === "high";
                return (
                  <div
                    key={reminder.id}
                    className={`p-3.5 transition-colors hover:bg-white/[0.04] ${
                      reminder.isRead ? "opacity-60" : "bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {reminder.type === "golden_window" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ⭐ เวลาทองคำ
                          </span>
                        ) : reminder.type === "appointment" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            🔔 นัดหมาย
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            🌅 ทิศทางวัน
                          </span>
                        )}

                        {reminder.targetTime && (
                          <span className="text-[10px] font-mono text-white/60">
                            {reminder.targetTime} น.
                          </span>
                        )}
                      </div>

                      {!reminder.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(reminder.id, e)}
                          className="text-[10px] text-white/40 hover:text-white/80 p-1"
                          title="ทำเครื่องหมายว่าอ่านแล้ว"
                        >
                          ✓ อ่านแล้ว
                        </button>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-[#F8F6F1] mb-1 leading-snug">
                      {reminder.title}
                    </h4>

                    <p className="text-[11px] text-[#F8F6F1]/75 leading-relaxed line-clamp-2">
                      {reminder.message}
                    </p>

                    {reminder.actionUrl && (
                      <div className="mt-2 flex items-center justify-end">
                        <Link
                          to={reminder.actionUrl}
                          onClick={() => setIsOpen(false)}
                          className="text-[11px] font-bold text-[#C6A96B] hover:text-[#D9BC82] transition-colors flex items-center gap-1"
                        >
                          <span>{reminder.actionLabel || "เปิดดู"}</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
