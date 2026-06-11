import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData, Link } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, requireAuth } from "~/services/auth.server";
import { getPersonLimit, getUserPlan } from "~/services/permissions.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "โปรไฟล์บุคคล — PhopePhum" },
  { name: "description", content: "จัดการโปรไฟล์บุคคล บันทึกข้อมูลวันเดือนปีเกิดเพื่อตั้งดวงชะตา เลข 7 ตัว 9 ฐาน และระบบพยากรณ์ต่างๆ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user, profile } = await requireMinPlan("basic", request, env);

  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  // ดึงข้อมูลโปรไฟล์บุคคลทั้งหมดของผู้ใช้นี้
  const { data: people, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching people profiles:", error);
  }

  const personLimit = getPersonLimit(profile);
  const currentCount = people?.length ?? 0;
  const hasReachedLimit = currentCount >= personLimit;

  return json({
    profile,
    people: people ?? [],
    personLimit,
    currentCount,
    hasReachedLimit,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  
  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  const formData = await request.formData();
  const actionType = formData.get("_action");

  // ดึงโปรไฟล์ผู้ใช้เพื่อเช็คลิมิตก่อนทำการเพิ่มใหม่
  const { getProfile } = await import("~/services/auth.server");
  const profile = await getProfile(user.id, request, env);
  const personLimit = getPersonLimit(profile);

  if (actionType === "create") {
    // 1. เช็คลิมิตจำนวนคน
    const { count } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= personLimit) {
      return json({ error: `ไม่สามารถเพิ่มได้เนื่องจากสิทธิ์ของคุณจำกัดไว้ที่ ${personLimit} โปรไฟล์ กรุณาอัปเกรดแผนสมาชิก` }, { status: 403 });
    }

    const name = String(formData.get("name") ?? "").trim();
    const bDay = Number(formData.get("birthDay") ?? "0");
    const bMonth = Number(formData.get("birthMonth") ?? "0");
    const bYear = Number(formData.get("birthYear") ?? "0");
    const birthTime = String(formData.get("birthTime") ?? "").trim();
    const birthPlace = String(formData.get("birthPlace") ?? "").trim();

    if (!name) return json({ error: "กรุณากรอกชื่อโปรไฟล์บุคคล" }, { status: 400 });
    if (!bDay || !bMonth || !bYear) return json({ error: "กรุณาระบุวันเดือนปีเกิดให้ครบถ้วน" }, { status: 400 });

    const bYearCE = bYear - 543;
    const birthDateStr = `${bYearCE}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;

    const { error: insertError } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name,
        birth_date: birthDateStr,
        birth_time: birthTime || "12:00",
        birth_place: birthPlace || "กรุงเทพมหานคร",
      });

    if (insertError) {
      console.error("Insert profile error:", insertError);
      return json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }, { status: 500 });
    }

    await logEvent(request, env, EVENTS.CALC_HORA, { action: "create_person", source: "people" });
    return json({ success: "เพิ่มข้อมูลโปรไฟล์บุคคลสำเร็จ", error: null });
  }

  if (actionType === "update") {
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const bDay = Number(formData.get("birthDay") ?? "0");
    const bMonth = Number(formData.get("birthMonth") ?? "0");
    const bYear = Number(formData.get("birthYear") ?? "0");
    const birthTime = String(formData.get("birthTime") ?? "").trim();
    const birthPlace = String(formData.get("birthPlace") ?? "").trim();

    if (!id) return json({ error: "ไม่พบข้อมูลโปรไฟล์ที่ต้องการแก้ไข" }, { status: 400 });
    if (!name) return json({ error: "กรุณากรอกชื่อโปรไฟล์บุคคล" }, { status: 400 });
    if (!bDay || !bMonth || !bYear) return json({ error: "กรุณาระบุวันเดือนปีเกิดให้ครบถ้วน" }, { status: 400 });

    const bYearCE = bYear - 543;
    const birthDateStr = `${bYearCE}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        name,
        birth_date: birthDateStr,
        birth_time: birthTime || "12:00",
        birth_place: birthPlace || "กรุงเทพมหานคร",
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update profile error:", updateError);
      return json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" }, { status: 500 });
    }

    return json({ success: "อัปเดตข้อมูลโปรไฟล์บุคคลสำเร็จ", error: null });
  }

  if (actionType === "delete") {
    const id = String(formData.get("id") ?? "");
    if (!id) return json({ error: "ไม่พบข้อมูลโปรไฟล์ที่ต้องการลบ" }, { status: 400 });

    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete profile error:", deleteError);
      return json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" }, { status: 500 });
    }

    return json({ success: "ลบโปรไฟล์บุคคลสำเร็จ", error: null });
  }

  return json({ error: "การทำงานไม่ถูกต้อง" }, { status: 400 });
}

// ฟังก์ชันคำนวณอายุแบบง่าย
function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ฟังก์ชันแปลงวันที่ค.ศ. เป็น วัน/เดือน/ปี พ.ศ.
function formatThaiBirthDate(birthDateStr: string): { day: number; month: number; year: number; text: string } {
  if (!birthDateStr) return { day: 15, month: 6, year: 2540, text: "" };
  const d = new Date(birthDateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear() + 543;
  
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const text = `${day} ${monthNames[month - 1]} พ.ศ. ${year}`;
  
  return { day, month, year, text };
}

export default function PeopleProfilesPage() {
  const { profile, people, personLimit, currentCount, hasReachedLimit } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [formMode, setFormMode] = useState<"idle" | "create" | "edit">("idle");
  const [editingPerson, setEditingPerson] = useState<any>(null);

  // Reset form status when success occurs
  useEffect(() => {
    if (actionData && !actionData.error) {
      setFormMode("idle");
      setEditingPerson(null);
    }
  }, [actionData]);

  const handleEditClick = (person: any) => {
    setEditingPerson(person);
    setFormMode("edit");
  };

  const handleCancel = () => {
    setFormMode("idle");
    setEditingPerson(null);
  };

  const getEditDefaults = () => {
    if (!editingPerson) return { name: "", day: 15, month: 6, year: 2540, time: "12:00", place: "กรุงเทพมหานคร" };
    const dateInfo = formatThaiBirthDate(editingPerson.birth_date);
    return {
      name: editingPerson.name,
      day: dateInfo.day,
      month: dateInfo.month,
      year: dateInfo.year,
      time: editingPerson.birth_time || "12:00",
      place: editingPerson.birth_place || "กรุงเทพมหานคร",
    };
  };

  const defaults = getEditDefaults();

  return (
    <div className="space-y-6 pb-20 animate-fade-up max-w-4xl mx-auto">
      {/* ส่วนหัวหน้าเว็บ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#C6A96B] rounded-full animate-pulse" />
            <p className="text-[#C6A96B] text-[11px] tracking-[0.3em] uppercase font-bold">Personal Profiles</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F8F6F1] font-bold">โปรไฟล์บุคคล</h1>
          <p className="text-[#8A8070] text-sm mt-1">สมุดบันทึกรายชื่อบุคคล เพื่อการตั้งดวงชะตาและวิเคราะห์อย่างรวดเร็ว</p>
        </div>
        
        {formMode === "idle" && (
          <button
            onClick={() => {
              if (hasReachedLimit) {
                alert(`สิทธิ์ของท่านสามารถบันทึกได้สูงสุด ${personLimit} คน กรุณาอัปเกรดเพื่อบันทึกไม่จำกัดค่ะ`);
                return;
              }
              setFormMode("create");
            }}
            disabled={hasReachedLimit}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 ${
              hasReachedLimit 
                ? "bg-[#C6A96B]/20 text-[#C6A96B]/50 cursor-not-allowed border border-[#C6A96B]/10" 
                : "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-[0_4px_12px_rgba(198,169,107,0.2)]"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            เพิ่มบุคคลใหม่ ({currentCount}/{personLimit === 9999 ? "∞" : personLimit})
          </button>
        )}
      </div>

      {/* Action Errors */}
      {actionData?.error && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm animate-shake">
          ⚠️ {actionData.error}
        </div>
      )}

      {/* ฟอร์ม เพิ่ม / แก้ไขข้อมูล (เปิดด้านบนเมื่อต้องการจัดการ) */}
      {formMode !== "idle" && (
        <Card className="border-[#C6A96B]/30 bg-[#0A2240]/40 backdrop-blur-xl p-6 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl bg-[#C6A96B]/10 -z-10" />
          <h2 className="text-[#C6A96B] text-[15px] font-bold mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B]" />
            {formMode === "create" ? "✦ เพิ่มโปรไฟล์บุคคลใหม่" : "✦ แก้ไขข้อมูลบุคคล"}
          </h2>

          <Form method="post" className="space-y-4">
            <input type="hidden" name="_action" value={formMode} />
            {formMode === "edit" && <input type="hidden" name="id" value={editingPerson?.id} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="name"
                label="ชื่อ-นามสกุล หรือ นามสมมุติ *"
                defaultValue={defaults.name}
                placeholder="เช่น สมชาย ดวงดี"
                required
              />
              <Input
                name="birthPlace"
                label="จังหวัดที่เกิด (เพื่อวิเคราะห์ถิ่นกำเนิด)"
                defaultValue={defaults.place}
                placeholder="กรุงเทพมหานคร"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropdown วันเกิด พ.ศ. */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#8A8070] font-bold uppercase tracking-wider">วันเดือนปีเกิด (พ.ศ.) *</label>
                <div className="grid grid-cols-3 gap-2">
                  <select name="birthDay" defaultValue={defaults.day} className="bg-slate-950/50 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-3 py-2.5 text-xs focus:border-[#C6A96B]/50 outline-none">
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                    ))}
                  </select>
                  <select name="birthMonth" defaultValue={defaults.month} className="bg-slate-950/50 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-3 py-2.5 text-xs focus:border-[#C6A96B]/50 outline-none">
                    {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                    ))}
                  </select>
                  <select name="birthYear" defaultValue={defaults.year} className="bg-slate-950/50 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-3 py-2.5 text-xs focus:border-[#C6A96B]/50 outline-none">
                    {Array.from({ length: 120 }).map((_, i) => {
                      const y = new Date().getFullYear() + 543 - i;
                      return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                    })}
                  </select>
                </div>
              </div>

              <Input
                name="birthTime"
                type="time"
                label="เวลาเกิด (หากไม่ทราบให้ใส่ 06:00 หรือเวลาประมาณ)"
                defaultValue={defaults.time}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#8A8070] hover:text-[#F8F6F1] transition-colors"
              >
                ยกเลิก
              </button>
              <Button type="submit" loading={isSubmitting} className="px-6 py-2 h-[38px] text-xs">
                {formMode === "create" ? "บันทึกข้อมูล" : "อัปเดตข้อมูล"}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* โควตาแผงเตือนกรณีใช้เวอร์ชั่นจำกัด */}
      {hasReachedLimit && personLimit < 9999 && (
        <Card className="border-[#C6A96B]/20 bg-gradient-to-r from-amber-500/5 to-yellow-600/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[#C6A96B] font-bold text-sm">✦ คุณใช้โควตาโปรไฟล์บุคคลครบแล้ว ({currentCount}/{personLimit} คน)</p>
            <p className="text-[#8A8070] text-xs mt-1">อัปเกรดเป็นแผนพรีเมียม เพื่อบันทึกข้อมูลดวงบุคคลได้แบบไม่จำกัด พร้อมปลดล็อกระบบจรชั้นสูง</p>
          </div>
          <Link
            to="/dashboard/upgrade"
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#020617] bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] hover:opacity-90 transition-all text-center self-start md:self-auto shrink-0"
          >
            อัปเกรดด่วน
          </Link>
        </Card>
      )}

      {/* รายชื่อโปรไฟล์บุคคล (Grid Cards) */}
      {people.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-transparent py-16 text-center">
          <div className="w-12 h-12 rounded-full border border-dashed border-[#C6A96B]/30 flex items-center justify-center mx-auto mb-4 bg-[#C6A96B]/5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-[#C6A96B]/70">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
          </div>
          <p className="text-[#F8F6F1] font-bold text-sm">ยังไม่มีรายชื่อโปรไฟล์บุคคล</p>
          <p className="text-[#8A8070] text-xs mt-1 max-w-sm mx-auto">เริ่มต้นโดยการกดปุ่ม "เพิ่มบุคคลใหม่" ด้านบน เพื่อเก็บประวัติวันเกิดลูกค้า ญาติพี่น้อง หรือผู้ที่พยากรณ์ประจำ</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {people.map((person) => {
            const age = calculateAge(person.birth_date);
            const dateInfo = formatThaiBirthDate(person.birth_date);
            
            return (
              <Card 
                key={person.id} 
                className="border-[#C6A96B]/10 hover:border-[#C6A96B]/30 bg-[#0A2240]/25 backdrop-blur-md p-5 flex flex-col justify-between gap-4 transition-all duration-300 group hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] relative"
              >
                {/* ตกแต่งมุมการ์ดเบาๆ */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#C6A96B]/20 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#C6A96B]/20 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* ส่วนแสดงข้อมูล */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#F8F6F1] leading-tight flex items-center gap-2">
                        {person.name}
                        {age > 0 && (
                          <span className="text-[11px] font-bold bg-[#C6A96B]/15 border border-[#C6A96B]/30 text-[#C6A96B] px-1.5 py-0.5 rounded-md leading-none">
                            อายุ {age} ปี
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#8A8070] mt-1.5 flex items-center gap-1.5">
                        <span>📍 {person.birth_place || "กรุงเทพมหานคร"}</span>
                        <span className="text-white/10">•</span>
                        <span>⏰ {person.birth_time || "12:00"} น.</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(person)}
                        className="p-1.5 rounded-lg text-[#8A8070] hover:text-[#C6A96B] hover:bg-white/5 transition-all"
                        title="แก้ไขข้อมูล"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      <Form method="post" onSubmit={(e) => {
                        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรไฟล์ของ "${person.name}"?`)) {
                          e.preventDefault();
                        }
                      }}>
                        <input type="hidden" name="_action" value="delete" />
                        <input type="hidden" name="id" value={person.id} />
                        <button
                          type="submit"
                          className="p-1.5 rounded-lg text-[#8A8070] hover:text-rose-400 hover:bg-white/5 transition-all"
                          title="ลบโปรไฟล์"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </Form>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5">
                    <p className="text-[12px] text-[#8A8070] leading-none">วันพระราชสมภพ / วันเกิดทางจันทรคติ:</p>
                    <p className="text-xs text-[#D9BC82] font-semibold mt-1 flex items-center gap-1.5">
                      📅 {dateInfo.text}
                    </p>
                  </div>
                </div>

                {/* ส่วนปุ่มด่วนสำหรับวิเคราะห์ */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5">
                  <Link
                    to={`/dashboard/horoscope?customerId=${person.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[11px] font-bold text-[#020617] bg-[#C6A96B] hover:bg-[#D9BC82] transition-colors text-center"
                  >
                    ☸️ ตั้งผังดวง
                  </Link>
                  <Link
                    to={`/dashboard/mahaphuti?customerId=${person.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[11px] font-bold text-[#F8F6F1] bg-white/5 border border-white/10 hover:border-[#C6A96B]/30 hover:bg-[#C6A96B]/5 transition-colors text-center"
                  >
                    🧭 มหาภูติ
                  </Link>
                  <Link
                    to={`/dashboard/mahathaksa?customerId=${person.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[11px] font-bold text-[#F8F6F1] bg-white/5 border border-white/10 hover:border-[#C6A96B]/30 hover:bg-[#C6A96B]/5 transition-colors text-center"
                  >
                    🌟 มหาทักษา
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
