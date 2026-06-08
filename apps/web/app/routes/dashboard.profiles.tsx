import { json } from "@remix-run/cloudflare";
import { Form, useLoaderData, useActionData, useNavigation, Link } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useState } from "react";
import {
  buddhistPartsToISODate,
  currentBuddhistParts,
  isoDateToBuddhistParts,
} from "~/lib/buddhist-year";
import { BuddhistDatePartsSchema } from "@phopephum/validators";

export const meta: MetaFunction = () => [
  { title: "โปรไฟล์บุคคล — PhopePhum" },
  { name: "description", content: "จัดการข้อมูลบุคคลที่ต้องการดูดวง" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  birth_place: string | null;
  created_at: string;
};

type ActionResult = { ok: true; intent: string } | { ok: false; error: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

const DAY_NAMES = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
const DAY_COLORS: Record<number, string> = {
  0: "from-amber-600 to-amber-500",
  1: "from-slate-500 to-slate-400",
  2: "from-rose-600 to-rose-500",
  3: "from-emerald-600 to-emerald-500",
  4: "from-orange-600 to-orange-500",
  5: "from-sky-500 to-sky-400",
  6: "from-violet-700 to-violet-500",
};

function getBirthDayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y!, m! - 1, d!).getDay();
}

function formatThaiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${THAI_MONTHS[(m ?? 1) - 1]} พ.ศ. ${(y ?? 1970) + 543}`;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) console.warn("[profiles] load error:", error.message);

  return json({ customers: (customers ?? []) as Customer[] });
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  const formData = await request.formData();
  const intent = String(formData.get("_intent") ?? "");

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return json<ActionResult>({ ok: false, error: "ลบไม่สำเร็จ" }, { status: 500 });
    return json<ActionResult>({ ok: true, intent: "delete" });
  }

  // parse birth date (Buddhist year)
  const parsed = BuddhistDatePartsSchema.safeParse({
    day: Number(formData.get("birthDay")),
    month: Number(formData.get("birthMonth")),
    yearBE: Number(formData.get("birthYear")),
  });
  if (!parsed.success) return json<ActionResult>({ ok: false, error: "วันเกิดไม่ถูกต้อง" }, { status: 400 });

  const birthDate = buddhistPartsToISODate(parsed.data);
  if (!birthDate) return json<ActionResult>({ ok: false, error: "วันเกิดไม่ถูกต้อง" }, { status: 400 });

  const name = String(formData.get("name") ?? "").trim();
  const birthTime = String(formData.get("birthTime") ?? "").trim() || null;
  const birthPlace = String(formData.get("birthPlace") ?? "").trim() || null;

  if (!name) return json<ActionResult>({ ok: false, error: "กรุณาระบุชื่อ" }, { status: 400 });

  if (intent === "add") {
    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      name,
      birth_date: birthDate,
      birth_time: birthTime,
      birth_place: birthPlace,
    });
    if (error) return json<ActionResult>({ ok: false, error: "บันทึกไม่สำเร็จ: " + error.message }, { status: 500 });
    return json<ActionResult>({ ok: true, intent: "add" });
  }

  if (intent === "edit") {
    const id = String(formData.get("id") ?? "");
    const { error } = await supabase
      .from("customers")
      .update({ name, birth_date: birthDate, birth_time: birthTime, birth_place: birthPlace })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return json<ActionResult>({ ok: false, error: "แก้ไขไม่สำเร็จ" }, { status: 500 });
    return json<ActionResult>({ ok: true, intent: "edit" });
  }

  return json<ActionResult>({ ok: false, error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectField({
  name, label, value, onChange, children,
}: {
  name: string; label: string; value: number; onChange: (v: number) => void; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-[#8A8070] uppercase tracking-widest">{label}</label>
      <select
        name={name}
        value={value}
        onChange={e => onChange(Number(e.currentTarget.value))}
        autoComplete="off"
        className="w-full bg-[#020617] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#F8F6F1] outline-none focus:border-[#C6A96B]"
      >
        {children}
      </select>
    </div>
  );
}

function ProfileForm({
  defaultName = "", defaultDay = 1, defaultMonth = 1, defaultYear = 2520,
  defaultTime = "", defaultPlace = "", intent = "add", id = "", onCancel,
}: {
  defaultName?: string; defaultDay?: number; defaultMonth?: number; defaultYear?: number;
  defaultTime?: string; defaultPlace?: string; intent?: "add" | "edit"; id?: string; onCancel?: () => void;
}) {
  const maxYear = currentBuddhistParts().yearBE + 6;
  const [day, setDay] = useState(defaultDay);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [name, setName] = useState(defaultName);
  const [time, setTime] = useState(defaultTime);
  const [place, setPlace] = useState(defaultPlace);
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="_intent" value={intent} />
      {id && <input type="hidden" name="id" value={id} />}

      <Input
        name="name"
        label="ชื่อ-นามสกุล"
        value={name}
        onChange={e => setName(e.currentTarget.value)}
        placeholder="เช่น นายสมชาย ใจดี"
        required
      />

      <div className="grid grid-cols-3 gap-3">
        <SelectField name="birthDay" label="วัน" value={day} onChange={setDay}>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </SelectField>
        <SelectField name="birthMonth" label="เดือน" value={month} onChange={setMonth}>
          {THAI_MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </SelectField>
        <SelectField name="birthYear" label="ปีเกิด (พ.ศ.)" value={year} onChange={setYear}>
          {Array.from({ length: 120 }, (_, i) => {
            const y = maxYear - i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </SelectField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          name="birthTime"
          type="time"
          label="เวลาเกิด (ถ้าทราบ)"
          value={time}
          onChange={e => setTime(e.currentTarget.value)}
        />
        <Input
          name="birthPlace"
          label="จังหวัดเกิด (ถ้าทราบ)"
          value={place}
          onChange={e => setPlace(e.currentTarget.value)}
          placeholder="เช่น กรุงเทพมหานคร"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={isLoading} className="flex-1 py-2.5 rounded-xl text-sm font-black">
          {intent === "add" ? "เพิ่มโปรไฟล์" : "บันทึกการแก้ไข"}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-[#8A8070] text-sm font-bold hover:text-[#F8F6F1] hover:border-white/20 transition-colors"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </Form>
  );
}

function CustomerCard({ customer, onEdit }: { customer: Customer; onEdit: (c: Customer) => void }) {
  const dow = getBirthDayOfWeek(customer.birth_date);
  const gradientCls = DAY_COLORS[dow] ?? "from-slate-600 to-slate-500";
  const parts = isoDateToBuddhistParts(customer.birth_date);
  const navigation = useNavigation();
  const isDeleting = navigation.state === "submitting" && navigation.formData?.get("id") === customer.id;

  return (
    <Card className="border-white/5 bg-[#0A1628] p-5 flex flex-col gap-4 relative group">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientCls} flex items-center justify-center text-xl font-display font-black text-white shadow-lg shrink-0`}>
          {customer.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#F8F6F1] text-sm truncate">{customer.name}</p>
          <p className="text-[10px] text-[#8A8070] mt-0.5">วัน{DAY_NAMES[dow]}ที่เกิด</p>
        </div>
      </div>

      {/* Birth info */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#C6A96B]">📅</span>
          <span className="text-[#D9CDB7]">{formatThaiDate(customer.birth_date)}</span>
        </div>
        {customer.birth_time && (
          <div className="flex items-center gap-2">
            <span className="text-[#C6A96B]">⏰</span>
            <span className="text-[#D9CDB7]">{customer.birth_time.substring(0, 5)} น.</span>
          </div>
        )}
        {customer.birth_place && (
          <div className="flex items-center gap-2">
            <span className="text-[#C6A96B]">📍</span>
            <span className="text-[#D9CDB7]">{customer.birth_place}</span>
          </div>
        )}
        {!customer.birth_time && !customer.birth_place && (
          <p className="text-[#8A8070] italic">ไม่ระบุเวลา/สถานที่เกิด</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
        <Link
          to={`/dashboard/horoscope?customer=${customer.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C6A96B]/10 border border-[#C6A96B]/20 text-[#C6A96B] text-xs font-black hover:bg-[#C6A96B]/20 transition-colors"
        >
          🔮 ดูดวง
        </Link>
        <button
          type="button"
          onClick={() => onEdit(customer)}
          className="px-3 py-2 rounded-xl border border-white/10 text-[#8A8070] text-xs font-bold hover:text-[#F8F6F1] hover:border-white/20 transition-colors"
        >
          ✏️
        </button>
        <Form method="post">
          <input type="hidden" name="_intent" value="delete" />
          <input type="hidden" name="id" value={customer.id} />
          <button
            type="submit"
            disabled={isDeleting}
            onClick={e => {
              if (!confirm(`ลบโปรไฟล์ "${customer.name}" หรือไม่?`)) e.preventDefault();
            }}
            className="px-3 py-2 rounded-xl border border-rose-500/20 text-rose-500 text-xs font-bold hover:bg-rose-500/10 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "⏳" : "🗑️"}
          </button>
        </Form>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilesPage() {
  const { customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const navigation = useNavigation();
  const isAdding = navigation.state === "submitting" && navigation.formData?.get("_intent") === "add";

  // Close forms after successful save
  const prevActionData = actionData;
  if (prevActionData?.ok && prevActionData.intent === "add" && showAddForm) {
    setShowAddForm(false);
  }
  if (prevActionData?.ok && prevActionData.intent === "edit" && editingCustomer) {
    setEditingCustomer(null);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[#C6A96B] text-xs tracking-[0.25em] uppercase font-bold block mb-1">
            ✦ บุคคลที่ต้องการดูดวง
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#F8F6F1]">
            โปรไฟล์บุคคล
          </h1>
          <p className="text-[#D9CDB7] text-sm mt-2">
            บันทึกข้อมูลเกิดของบุคคลที่ต้องการตรวจดวง เพื่อเรียกใช้งานได้สะดวก
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-[#8A8070] font-bold">{customers.length} โปรไฟล์</span>
          <button
            type="button"
            onClick={() => { setShowAddForm(v => !v); setEditingCustomer(null); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
              showAddForm
                ? "bg-white/5 border border-white/10 text-[#8A8070]"
                : "bg-[#C6A96B] text-[#020617] hover:bg-[#D9BC82]"
            }`}
          >
            {showAddForm ? "✕ ยกเลิก" : "+ เพิ่มโปรไฟล์ใหม่"}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {actionData && !actionData.ok && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold" role="alert">
          ⚠️ {actionData.error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <Card className="border-[#C6A96B]/30 bg-[#0A1628] p-6 sm:p-8">
          <h2 className="text-sm font-black text-[#C6A96B] uppercase tracking-widest mb-5">
            ➕ เพิ่มโปรไฟล์ใหม่
          </h2>
          <ProfileForm
            intent="add"
            defaultYear={currentBuddhistParts().yearBE - 30}
            onCancel={() => setShowAddForm(false)}
          />
        </Card>
      )}

      {/* Edit Form */}
      {editingCustomer && (
        <Card className="border-sky-500/30 bg-[#0A1628] p-6 sm:p-8">
          <h2 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-5">
            ✏️ แก้ไขโปรไฟล์ — {editingCustomer.name}
          </h2>
          <ProfileForm
            intent="edit"
            id={editingCustomer.id}
            defaultName={editingCustomer.name}
            defaultDay={isoDateToBuddhistParts(editingCustomer.birth_date)?.day ?? 1}
            defaultMonth={isoDateToBuddhistParts(editingCustomer.birth_date)?.month ?? 1}
            defaultYear={isoDateToBuddhistParts(editingCustomer.birth_date)?.yearBE ?? 2520}
            defaultTime={editingCustomer.birth_time?.substring(0, 5) ?? ""}
            defaultPlace={editingCustomer.birth_place ?? ""}
            onCancel={() => setEditingCustomer(null)}
          />
        </Card>
      )}

      {/* Customer Grid */}
      {customers.length === 0 && !showAddForm ? (
        <Card className="border-white/5 bg-[#0A1628] p-10 sm:p-16 flex flex-col items-center text-center gap-5">
          <div className="text-5xl">👥</div>
          <div>
            <h3 className="text-lg font-black text-[#F8F6F1] mb-2">ยังไม่มีโปรไฟล์</h3>
            <p className="text-sm text-[#8A8070] max-w-sm">
              เพิ่มข้อมูลบุคคลที่ต้องการดูดวง — ครอบครัว เพื่อน หรือลูกค้า — เพื่อเรียกใช้งานได้รวดเร็ว
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 rounded-xl bg-[#C6A96B] text-[#020617] font-black text-sm hover:bg-[#D9BC82] transition-colors"
          >
            + เพิ่มโปรไฟล์แรก
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(customer => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={c => { setEditingCustomer(c); setShowAddForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
