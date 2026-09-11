import React, { useState } from "react";
import { Link, useNavigate, useFetcher } from "@remix-run/react";

export interface ActiveSubjectProps {
  currentSubject: {
    id: string;
    name: string;
    birthDate: string;
    birthTime?: string;
    birthPlace?: string;
    isCustomer: boolean;
  };
  customers: Array<{
    id: string;
    name: string;
    birth_date: string;
    birth_time?: string;
    birth_place?: string;
  }>;
  profileName?: string;
  personLimit?: number | null;
  currentCustomerCount?: number;
  hasReachedLimit?: boolean;
  onSubjectChange?: (subjectId: string) => void;
  showManageButtons?: boolean;
}

export function ActiveSubjectBanner({
  currentSubject,
  customers,
  profileName = "ฉัน (เจ้าของบัญชี)",
  personLimit,
  currentCustomerCount,
  hasReachedLimit = false,
  onSubjectChange,
  showManageButtons = true,
}: ActiveSubjectProps) {
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form states for Add/Edit
  const [formName, setFormName] = useState("");
  const [formDay, setFormDay] = useState(15);
  const [formMonth, setFormMonth] = useState(6);
  const [formYear, setFormYear] = useState(2540);
  const [formTime, setFormTime] = useState("12:00");
  const [formPlace, setFormPlace] = useState("กรุงเทพมหานคร");

  const openAddModal = () => {
    setFormName("");
    setFormDay(1);
    setFormMonth(1);
    setFormYear(2535);
    setFormTime("12:00");
    setFormPlace("กรุงเทพมหานคร");
    setIsAddModalOpen(true);
  };

  const openEditModal = () => {
    if (!currentSubject.isCustomer) return;
    setFormName(currentSubject.name);
    if (currentSubject.birthDate) {
      const [y, m, d] = currentSubject.birthDate.split("-").map(Number);
      setFormDay(d || 1);
      setFormMonth(m || 1);
      setFormYear((y || 1990) + 543);
    }
    setFormTime(currentSubject.birthTime || "12:00");
    setFormPlace(currentSubject.birthPlace || "กรุงเทพมหานคร");
    setIsEditModalOpen(true);
  };

  const handleSelectSubject = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__ADD_NEW__") {
      openAddModal();
      return;
    }

    // Update active subject cookie
    await fetch("/api/active-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: val === "self" ? null : val }),
    }).catch(() => {});

    if (onSubjectChange) {
      onSubjectChange(val);
    } else {
      const url = new URL(window.location.href);
      if (val === "self") {
        url.searchParams.delete("customerId");
      } else {
        url.searchParams.set("customerId", val);
      }
      window.location.href = url.toString();
    }
  };

  const handleDelete = () => {
    if (!currentSubject.isCustomer) return;
    fetcher.submit(
      {
        _action: "delete",
        id: currentSubject.id,
      },
      { method: "post", action: "/dashboard/people" }
    );
    setIsDeleteConfirmOpen(false);

    // Reset to self
    fetch("/api/active-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: null }),
    }).then(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("customerId");
      window.location.href = url.toString();
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    fetcher.submit(
      {
        _action: "create",
        name: formName.trim(),
        birthDay: String(formDay),
        birthMonth: String(formMonth),
        birthYear: String(formYear),
        birthTime: formTime,
        birthPlace: formPlace,
      },
      { method: "post", action: "/dashboard/people" }
    );
    setIsAddModalOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !currentSubject.id) return;

    fetcher.submit(
      {
        _action: "update",
        id: currentSubject.id,
        name: formName.trim(),
        birthDay: String(formDay),
        birthMonth: String(formMonth),
        birthYear: String(formYear),
        birthTime: formTime,
        birthPlace: formPlace,
      },
      { method: "post", action: "/dashboard/people" }
    );
    setIsEditModalOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="rounded-2xl border border-[#C6A96B]/30 bg-gradient-to-r from-[#0A2240]/80 via-[#0A1628]/90 to-[#0A2240]/80 p-3.5 sm:p-4 text-[#F8F6F1] shadow-lg relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        
        {/* ฝั่งซ้าย: ข้อมูลเจ้าชะตา */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#C6A96B]/15 border border-[#C6A96B]/40 flex items-center justify-center text-lg shrink-0 shadow-[0_0_12px_rgba(198,169,107,0.2)]">
            {currentSubject.isCustomer ? "👤" : "🌟"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A96B]">
                {currentSubject.isCustomer ? "ผังดวงลูกดวง (เจ้าชะตา)" : "ผังดวงประจำตัวของฉัน"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-semibold">เรียลไทม์</span>
            </div>
            <div className="flex items-center gap-2 truncate">
              <h2 className="text-base sm:text-lg font-bold text-[#F8F6F1] truncate">
                {currentSubject.name}
              </h2>
              {currentSubject.birthDate && (
                <span className="text-xs text-[#C6B79F] hidden md:inline">
                  (เกิด {new Date(currentSubject.birthDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ฝั่งขวา: Dropdown สลับดวง + ปุ่มจัดการ */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div className="relative">
            <select
              value={currentSubject.isCustomer ? currentSubject.id : "self"}
              onChange={handleSelectSubject}
              className="bg-slate-950/80 border border-[#C6A96B]/40 text-[#F8F6F1] text-xs sm:text-sm rounded-xl px-3 py-2 pr-8 focus:border-[#C6A96B] outline-none shadow-sm cursor-pointer"
            >
              <option value="self">🌟 ดวงของฉัน ({profileName})</option>
              {customers && customers.length > 0 && (
                <optgroup label="── รายชื่อลูกดวงที่บันทึกไว้ ──">
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      👤 {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__ADD_NEW__">➕ เพิ่มเจ้าชะตาใหม่...</option>
            </select>
          </div>

          {showManageButtons && currentSubject.isCustomer && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openEditModal}
                className="px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-[#C6A96B]/60 bg-white/5 hover:bg-[#C6A96B]/15 text-xs text-[#C6B79F] hover:text-[#F8F6F1] transition-all flex items-center gap-1"
                title="แก้ไขข้อมูลเจ้าชะตานี้"
              >
                <span>✏️</span>
                <span className="hidden sm:inline">แก้ไข</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-rose-500/20 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 hover:text-rose-200 transition-all flex items-center gap-1"
                title="ลบเจ้าชะตานี้ออกจากฐานข้อมูล"
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">ลบ</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold text-xs hover:opacity-90 transition-all shadow-md flex items-center gap-1"
          >
            <span>➕</span>
            <span className="hidden sm:inline">เพิ่มเจ้าชะตา</span>
          </button>
        </div>

      </div>

      {/* ── Modal ยืนยันการลบ ── */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A2240] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl text-[#F8F6F1] space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold">ยืนยันการลบเจ้าชะตา</h3>
            </div>
            <p className="text-sm text-[#C6B79F]">
              คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ <strong className="text-[#F8F6F1]">"{currentSubject.name}"</strong> ออกจากฐานข้อมูล? เมื่อลบแล้วจะไม่สามารถกู้คืนได้
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm text-[#C6B79F]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal เพิ่มเจ้าชะตาใหม่ ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A2240] border border-[#C6A96B]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl text-[#F8F6F1] space-y-4">
            <div className="flex items-center justify-between border-b border-[#C6A96B]/20 pb-3">
              <h3 className="text-lg font-bold text-[#F8F6F1] flex items-center gap-2">
                <span>➕</span>
                <span>เพิ่มเจ้าชะตาใหม่</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#C6B79F] hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {hasReachedLimit ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                <p className="text-sm text-amber-300 font-semibold">
                  คุณใช้โควต้าโปรไฟล์บุคคลครบแล้ว ({personLimit} คน)
                </p>
                <p className="text-xs text-[#C6B79F]">
                  อัปเกรดเป็นแผน Pro หรือ Master เพื่อเพิ่มเจ้าชะตาได้สูงสุด 10 ถึงไม่จำกัดคน
                </p>
                <Link
                  to="/pricing"
                  className="inline-block px-4 py-2 bg-[#C6A96B] text-[#020617] font-bold rounded-xl text-xs"
                >
                  ดูแพ็กเกจสมาชิก ➔
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSaveAdd} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-[#C6B79F] mb-1 font-semibold">ชื่อเจ้าชะตา / ลูกดวง *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="เช่น คุณสมชาย หรือ ลูกดวง A"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-[#F8F6F1] focus:border-[#C6A96B] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#C6B79F] mb-1 font-semibold">วันเดือนปีเกิด (พ.ศ.) *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={formDay}
                      onChange={e => setFormDay(Number(e.target.value))}
                      className="bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2 text-[#F8F6F1] outline-none"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d} className="bg-[#0A2240]">{d}</option>
                      ))}
                    </select>
                    <select
                      value={formMonth}
                      onChange={e => setFormMonth(Number(e.target.value))}
                      className="bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2 text-[#F8F6F1] outline-none"
                    >
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#0A2240]">{m}</option>
                      ))}
                    </select>
                    <select
                      value={formYear}
                      onChange={e => setFormYear(Number(e.target.value))}
                      className="bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2 text-[#F8F6F1] outline-none"
                    >
                      {Array.from({ length: 100 }, (_, i) => 2569 - i).map(y => (
                        <option key={y} value={y} className="bg-[#0A2240]">{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#C6B79F] mb-1 font-semibold">เวลาเกิด</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={e => setFormTime(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-[#F8F6F1] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#C6B79F] mb-1 font-semibold">จังหวัดที่เกิด</label>
                    <input
                      type="text"
                      value={formPlace}
                      onChange={e => setFormPlace(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-[#F8F6F1] outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-[#C6B79F] hover:bg-white/5"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold shadow-md"
                  >
                    บันทึกเจ้าชะตา
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal แก้ไขเจ้าชะตา ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A2240] border border-[#C6A96B]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl text-[#F8F6F1] space-y-4">
            <div className="flex items-center justify-between border-b border-[#C6A96B]/20 pb-3">
              <h3 className="text-lg font-bold text-[#F8F6F1] flex items-center gap-2">
                <span>✏️</span>
                <span>แก้ไขข้อมูลเจ้าชะตา</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#C6B79F] hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-[#C6B79F] mb-1 font-semibold">ชื่อเจ้าชะตา / ลูกดวง *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-[#F8F6F1] focus:border-[#C6A96B] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#C6B79F] mb-1 font-semibold">วันเดือนปีเกิด (พ.ศ.) *</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={formDay}
                    onChange={e => setFormDay(Number(e.target.value))}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2 text-[#F8F6F1] outline-none"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d} className="bg-[#0A2240]">{d}</option>
                    ))}
                  </select>
                  <select
                    value={formMonth}
                    onChange={e => setFormMonth(Number(e.target.value))}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2 text-[#F8F6F1] outline-none"
                  >
                    {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#0A2240]">{m}</option>
                    ))}
                  </select>
                  <select
                    value={formYear}
                    onChange={e => setFormYear(Number(e.target.value))}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2 text-[#F8F6F1] outline-none"
                  >
                    {Array.from({ length: 100 }, (_, i) => 2569 - i).map(y => (
                      <option key={y} value={y} className="bg-[#0A2240]">{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#C6B79F] mb-1 font-semibold">เวลาเกิด</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-[#F8F6F1] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#C6B79F] mb-1 font-semibold">จังหวัดที่เกิด</label>
                  <input
                    type="text"
                    value={formPlace}
                    onChange={e => setFormPlace(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-[#F8F6F1] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-[#C6B79F] hover:bg-white/5"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold shadow-md"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
