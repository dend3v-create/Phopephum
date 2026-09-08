/**
 * dashboard.mahathaksa.tsx
 * มหาทักษาพยากรณ์ — ระบบทักษาคู่ครองทิศ และ ผังมหาภูติพยากรณ์สมดุลชีวิต
 * 
 * ปรับปรุงตามมาตรฐาน v2:
 * 1. ใช้ระบบ 2 สีแยก กำเนิด (สีขาว) และ จร (สีฟ้า) ชัดเจน ไม่มีคำว่า "เกิด" หรือ "จร"
 * 2. กาลกิณี = สีแดง, โลกาวินาศ = สีเหลือง
 * 3. ตัดสีม่วงและเขียวออกจากธีมมืด เพื่อความพรีเมียมหรูหรา
 * 4. ตัดคำว่า "ภพ" และ "ดาว" ออกจากผังมหาภูติ
 * 5. ตัดส่วนที่ไม่จำเป็นออก: "คำพยากรณ์รายดาว", "การแจ้งเตือนชะตา", "ดาวเสวยอายุ+ดาวแทรก", "คู่ธาตุ"
 * 6. เพิ่มระบบถาม-ตอบเจาะลึกตามหัวข้อที่สนใจ (Auto-expanding Textarea) พร้อมบันทึกประวัติการสนทนา
 */

import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import {
  calculatePhopephum,
  calcTaksaMaha,
  buddhToCS,
  STAR_NAMES,
  TAKSA_DIRECTIONS,
  getDirectionOracle,
} from "@phopephum/engine";
import type { StarNumber, TaksaMap } from "@phopephum/engine";
import { HoroscopeInputSchema } from "@phopephum/validators";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { InteractiveTaksaCard } from "~/components/taksa/InteractiveTaksaCard";
import { CombinedMahaCard } from "~/components/taksa/CombinedMahaCard";
import { TaksaConsultationChat } from "~/components/taksa/TaksaConsultationChat";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "มหาทักษาและมหาภูติพยากรณ์ — PhopePhum" },
  { name: "description", content: "วิเคราะห์ระบบทักษาคู่ครองทิศและผังมหาภูติพยากรณ์สมดุลชีวิต พร้อมระบบปรึกษาดวงชะตารายหัวข้อ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { getProfile } = await import("~/services/auth.server");
  const profile = await getProfile(user.id, request, env);

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id);

  let targetPerson = profile;
  let selectedCust = null;
  if (customerId && customers) {
    selectedCust = customers.find(c => c.id === customerId);
    if (selectedCust) {
      targetPerson = {
        id: selectedCust.id,
        birth_date: selectedCust.birth_date,
        birth_time: selectedCust.birth_time,
        birth_place: selectedCust.birth_place,
        display_name: selectedCust.name,
      } as any;
    }
  }

  let initialResult: any = null;
  if (targetPerson?.birth_date) {
    try {
      const checkDate = new Date();
      const birthCE = new Date(targetPerson.birth_date).getFullYear();
      const phopephumResult = await calculatePhopephum({
        birthDate: targetPerson.birth_date,
        birthTime: targetPerson.birth_time || "12:00",
        birthPlace: targetPerson.birth_place || "กรุงเทพมหานคร",
      }, checkDate);

      const taksaMahaFull = calcTaksaMaha({
        birthDate: new Date(targetPerson.birth_date + "T12:00:00"),
        checkDate,
        csNatal:   buddhToCS(birthCE + 543),
        csTransit: buddhToCS(checkDate.getFullYear() + 543),
      });

      initialResult = {
        taksaMaha: {
          taksaNatal: phopephumResult.taksaNatal,
          taksaTransit: phopephumResult.taksaTransit,
          mahaNatal: phopephumResult.mahaNatal,
          mahaTransit: phopephumResult.mahaTransit,
        },
        birthDate: targetPerson.birth_date,
        birthTime: targetPerson.birth_time || "",
        birthYearThai: birthCE + 543,
        currentYearThai: checkDate.getFullYear() + 543,
        customerId: customerId || undefined,
        customerName: selectedCust ? selectedCust.name : undefined,
      };
    } catch (e) {
      console.error("mahathaksa loader error:", e);
    }
  }

  return json({ profile, initialResult });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  try {
    const formData = await request.formData();
    const intent = formData.get("intent");

    // ── 1. Intent: ถาม-ตอบคำพยากรณ์เจาะลึก ──
    if (intent === "ask_oracle") {
      const question = String(formData.get("question") || "").trim();
      const topic = String(formData.get("topic") || "");
      const taksaTransitRaw = formData.get("taksaTransit");
      const taksaNatalRaw = formData.get("taksaNatal");
      const mahaTransitRaw = formData.get("mahaTransit");

      let transitMap: TaksaMap = {} as TaksaMap;
      let natalMap: TaksaMap = {} as TaksaMap;
      let ageYang = 0;
      let kalaStar: StarNumber = 8;
      let sriStar: StarNumber = 1;
      let dechStar: StarNumber = 1;
      let montriStar: StarNumber = 1;
      let mahaMap: Record<string, number> = {};

      if (taksaTransitRaw) {
        try {
          const parsed = JSON.parse(String(taksaTransitRaw));
          transitMap = parsed.map || {};
          ageYang = parsed.ageYang || 0;
          kalaStar = parsed.kalakiniStar || 8;
        } catch (e) {
          console.error("Failed to parse taksaTransit in action", e);
        }
      }

      if (taksaNatalRaw) {
        try {
          const parsed = JSON.parse(String(taksaNatalRaw));
          natalMap = parsed.map || {};
        } catch (e) {
          console.error("Failed to parse taksaNatal in action", e);
        }
      }

      if (mahaTransitRaw) {
        try {
          const parsed = JSON.parse(String(mahaTransitRaw));
          mahaMap = parsed.map || {};
        } catch (e) {
          console.error("Failed to parse mahaTransit in action", e);
        }
      }

      // หาดาวศรี, เดช, มนตรี, มูละ ประจำปี
      for (const [starStr, bhop] of Object.entries(transitMap)) {
        const s = Number(starStr) as StarNumber;
        if (bhop === "ศรี") sriStar = s;
        if (bhop === "เดช") dechStar = s;
        if (bhop === "มนตรี") montriStar = s;
      }

      const sriDir = TAKSA_DIRECTIONS[sriStar];
      const dechDir = TAKSA_DIRECTIONS[dechStar];
      const montriDir = TAKSA_DIRECTIONS[montriStar];
      const kalaDir = TAKSA_DIRECTIONS[kalaStar];

      // สร้างคำตอบตามหลักวิชาทักษาและมหาภูติ
      let answer = "";

      const qLower = question.toLowerCase();
      if (qLower.includes("งาน") || qLower.includes("สัมภาษณ์") || qLower.includes("สมัคร") || topic.includes("งาน")) {
        answer = `💼 **คำพยากรณ์ด้านการงาน & การสมัครงาน/เจรจา (อายุย่าง ${ageYang} ปี):**\n\n` +
          `• **ทิศมงคลสูงสุดสำหรับการเสนองาน/เจรจา:** ทิศ${sriDir.paliName} (${sriDir.thaiName} - ดาว${STAR_NAMES[sriStar]}) ซึ่งเป็น **ทิศศรีจร** จะเปิดประตูแห่งโอกาส ความเมตตามหานิยม และผู้ฟังคล้อยตามได้ง่าย\n` +
          `• **ทิศเสริมอำนาจบารมี/การสอบแข่งขัน:** ทิศ${dechDir.paliName} (${dechDir.thaiName} - ดาว${STAR_NAMES[dechStar]}) เป็น **ทิศเดชจร** ช่วยเสริมความมั่นใจ ชนะคู่แข่ง และสร้างความน่าเชื่อถือระดับผู้บริหาร\n` +
          `• **ทิศรับผู้ใหญ่อุปถัมภ์:** ทิศ${montriDir.paliName} (${montriDir.thaiName} - ดาว${STAR_NAMES[montriStar]}) เป็น **ทิศมนตรีจร** เหมาะแก่การขอคำปรึกษาหรือขอความอนุเคราะห์จากผู้ใหญ่\n` +
          `• **⚠️ ทิศที่ควรเลี่ยงในการนัดหมายสำคัญ:** ทิศ${kalaDir.paliName} (${kalaDir.thaiName} - ดาว${STAR_NAMES[kalaStar]}) เนื่องจากเป็น **ทิศกาลกิณีจร** มักมีอุปสรรค ความเข้าใจผิด หรือข้อติดขัดในเอกสาร`;
      } else if (qLower.includes("เดินทาง") || qLower.includes("อุบัติเหตุ") || qLower.includes("ปลอดภัย") || topic.includes("เดินทาง")) {
        // หาดาวอายุจร
        let ayuStar: StarNumber = 1;
        for (const [sStr, b] of Object.entries(transitMap)) {
          if (b === "อายุ") ayuStar = Number(sStr) as StarNumber;
        }
        const ayuDir = TAKSA_DIRECTIONS[ayuStar];

        answer = `🚗 **คำพยากรณ์การเดินทาง & ความปลอดภัย (อายุย่าง ${ageYang} ปี):**\n\n` +
          `• **ทิศปลอดภัย ไร้อุปสรรค (ทิศอายุจร):** ทิศ${ayuDir.paliName} (${ayuDir.thaiName} - ดาว${STAR_NAMES[ayuStar]}) เดินทางไปทิศนี้จะได้รับความสงบ ราบรื่น สุขภาพแข็งแรง และคุ้มครองความปลอดภัย\n` +
          `• **ทิศนำโชคลาภในการเดินทาง (ทิศศรีจร):** ทิศ${sriDir.paliName} (${sriDir.thaiName} - ดาว${STAR_NAMES[sriStar]}) เดินทางไปติดต่องานหรือพักผ่อนจะได้รับข่าวดีและโชคลาภ\n` +
          `• **⚠️ ทิศที่ต้องระวังเป็นพิเศษ (ทิศกาลกิณีจร):** ทิศ${kalaDir.paliName} (${kalaDir.thaiName} - ดาว${STAR_NAMES[kalaStar]})\n` +
          `  - ควรตรวจสภาพยานพาหนะ ลมยาง และระบบเบรกก่อนออกเดินทางเสมอ\n` +
          `  - มีสติ ไม่ขับรถเร็ว และหลีกเลี่ยงการเดินทางยามวิกาลไปยังทิศนี้โดยไม่จำเป็น\n` +
          `  - หากเลี่ยงไม่ได้ ให้สวดคาถาพาหุงมหากา หรือพกของมงคลสีขาว/ทองเพื่อคุ้มครอง`;
      } else if (qLower.includes("ค้าขาย") || qLower.includes("เงิน") || qLower.includes("โชค") || qLower.includes("ทรัพย์") || topic.includes("ค้าขาย")) {
        let mulaStar: StarNumber = 1;
        for (const [sStr, b] of Object.entries(transitMap)) {
          if (b === "มูละ") mulaStar = Number(sStr) as StarNumber;
        }
        const mulaDir = TAKSA_DIRECTIONS[mulaStar];

        answer = `💰 **คำพยากรณ์การค้าขาย รับทรัพย์ & เสี่ยงโชค (อายุย่าง ${ageYang} ปี):**\n\n` +
          `• **ทิศมหาเศรษฐีรับทรัพย์ (ทิศศรีจร):** ทิศ${sriDir.paliName} (${sriDir.thaiName} - ดาว${STAR_NAMES[sriStar]}) เหมาะอย่างยิ่งสำหรับการตั้งหน้าร้าน ออกบูธ เจรจาค้าขาย หรือเสี่ยงโชคลาภ\n` +
          `• **ทิศหลักทรัพย์มั่นคง (ทิศมูละจร):** ทิศ${mulaDir.paliName} (${mulaDir.thaiName} - ดาว${STAR_NAMES[mulaStar]}) เหมาะกับการลงทุนระยะยาว ซื้ออสังหาริมทรัพย์ ที่ดิน หรือเปิดสาขาธุรกิจใหม่\n` +
          `• **เคล็ดลับการเงินมหาภูติ:** สถิตขุมทรัพย์จรประจำปีช่วยหนุนให้เงินทองไม่รั่วไหล แต่ควรหลีกเลี่ยงการลงทุนสุ่มเสี่ยงกับบุคคลที่มาจากทิศ${kalaDir.paliName} (${kalaDir.thaiName})`;
      } else if (qLower.includes("โต๊ะ") || qLower.includes("ฮวงจุ้ย") || qLower.includes("เรือน") || qLower.includes("บ้าน") || topic.includes("โต๊ะ")) {
        answer = `🪑 **คำพยากรณ์จัดโต๊ะทำงาน & ฮวงจุ้ยเคหสถาน (อายุย่าง ${ageYang} ปี):**\n\n` +
          `• **ทิศหันหน้าโต๊ะทำงานที่ดีที่สุด:** หันหน้าไปทาง **ทิศ${dechDir.paliName} (${dechDir.thaiName})** หรือ **ทิศ${sriDir.paliName} (${sriDir.thaiName})** จะส่งเสริมให้มีความคิดสร้างสรรค์ มีอำนาจคุมงาน และได้รับการสนับสนุนจากผู้ร่วมงาน\n` +
          `• **ทิศที่ตั้งเก้าอี้พิงหลัง (หลังพิงมั่นคง):** ควรพิงไปทางทิศที่มีดาวมงคล เช่น ทิศ${montriDir.paliName} (${montriDir.thaiName})\n` +
          `• **❌ ทิศต้องห้ามในการหันหน้าโต๊ะทำงาน:** อย่าหันหน้าตรงไปทาง **ทิศ${kalaDir.paliName} (${kalaDir.thaiName})** ซึ่งเป็นทิศกาลกิณีจร เพราะจะทำให้งานสะดุด เกิดความเครียด และขัดแย้งกับผู้ร่วมงานได้ง่าย`;
      } else if (qLower.includes("แก้เคล็ด") || qLower.includes("กาลกิณี") || qLower.includes("โลกาวินาศ") || topic.includes("แก้เคล็ด")) {
        answer = `🛡️ **คำแนะนำการแก้เคล็ดดาวกาลกิณีจร & โลกาวินาศ (อายุย่าง ${ageYang} ปี):**\n\n` +
          `• **ดาวกาลกิณีจรประจำปีนี้คือ:** ดาว${STAR_NAMES[kalaStar]} (${kalaStar}) สถิตทาง **ทิศ${kalaDir.paliName} (${kalaDir.thaiName})**\n` +
          `• **การทำบุญเสริมดวงชะตา:**\n` +
          `  1. ทำบุญบริจาคโลหิต หรือบริจาคโลงศพ/ผ้าห่อศพ เพื่อแก้เคล็ดการสูญเสียหรืออุบัติเหตุ\n` +
          `  2. ถวายภัตตาหาร หลอดไฟ หรือค่าน้ำค่าไฟแก่วัด เพื่อเปิดแสงสว่างแห่งปัญญา\n` +
          `  3. ปล่อยปลา หรือไถ่ชีวิตโคกระบือ เพื่อเสริมพลังแห่งชีวิตและความแคล้วคลาด\n` +
          `• **ข้อควรปฏิบัติ:** หลีกเลี่ยงการสวมเสื้อผ้าสีที่เป็นกาลกิณีในวันสำคัญ และฝึกการแผ่เมตตาในทิศ${kalaDir.paliName}เพื่อเปลี่ยนพลังลบให้เป็นพลังคุ้มครอง`;
      } else {
        answer = `🔮 **สรุปภาพรวมชะตาทักษาและมหาภูติ (อายุย่าง ${ageYang} ปี):**\n\n` +
          `• **บริวารจร:** เริ่มต้นวัฏจักรใหม่ด้วยพลังดาวทักษาจรที่มีชีวิตชีวา\n` +
          `• **ดาวสิริมงคล (ศรีจร):** ดาว${STAR_NAMES[sriStar]} (${sriStar}) สถิตทาง **ทิศ${sriDir.paliName}** นำพาโชคลาภ เกียรติยศ และความราบรื่น\n` +
          `• **ดาวเตือนภัย (กาลกิณีจร):** ดาว${STAR_NAMES[kalaStar]} (${kalaStar}) สถิตทาง **ทิศ${kalaDir.paliName}** พึงระวังความใจร้อน เอกสารสัญญา และสุขภาพ\n` +
          `• **คำแนะนำสำคัญ:** เดินทาง เจรจา หรือลงทุน ให้มุ่งเน้นทิศมงคล (${sriDir.thaiName} / ${dechDir.thaiName}) เป็นหลัก จะพลิกฟื้นและเสริมดวงชะตาให้สำเร็จราบรื่น`;
      }

      return json({
        ok: true,
        answer,
        question,
        topic,
      });
    }

    // ── 2. Intent: ป้อนวันเกิดคำนวณใหม่ ──
    const bDay = Number(formData.get("birthDay") ?? "0");
    const bMonth = Number(formData.get("birthMonth") ?? "0");
    const bYear = Number(formData.get("birthYear") ?? "0");
    const bYearCE = bYear - 543;
    const birthDateStr = `${bYearCE}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;

    const raw = {
      birthDate: birthDateStr,
      birthTime: String(formData.get("birthTime") ?? "") || undefined,
      birthPlace: "กรุงเทพมหานคร",
    };

    const parsed = HoroscopeInputSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "ข้อมูลวันเกิดไม่ถูกต้อง", result: null }, { status: 400 });
    }

    const checkDate = new Date();
    const birthCE = new Date(parsed.data.birthDate).getFullYear();
    const phopephumResult = await calculatePhopephum(parsed.data, checkDate);

    await logEvent(request, env, EVENTS.CALC_HORA, {
      birthYear: parsed.data.birthDate.split("-")[0],
      source: "mahathaksa",
    });

    return json({
      taksaMaha: {
        taksaNatal: phopephumResult.taksaNatal,
        taksaTransit: phopephumResult.taksaTransit,
        mahaNatal: phopephumResult.mahaNatal,
        mahaTransit: phopephumResult.mahaTransit,
      },
      birthDate: parsed.data.birthDate,
      birthTime: parsed.data.birthTime || "",
      birthYearThai: birthCE + 543,
      currentYearThai: checkDate.getFullYear() + 543,
      error: null,
    });
  } catch (err) {
    console.error("mahathaksa action error:", err);
    return json({ error: "เกิดข้อผิดพลาดในการคำนวณ", result: null }, { status: 500 });
  }
}

// ─── Component: ฟอร์มป้อนวันเกิด ─────────────────────────────────────────────

function BirthForm() {
  return (
    <Card className="border-[#C9A96E]/20 bg-white/90 dark:bg-slate-900/40 backdrop-blur-md p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#C9A96E] animate-pulse" />
        <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold">
          คำนวณชะตาใหม่ / เปลี่ยนวันเกิด
        </p>
      </div>
      <Form method="post" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-600 dark:text-[#C6B79F] mb-1 block">วัน</label>
          <input
            name="birthDay"
            type="number"
            min={1}
            max={31}
            placeholder="15"
            required
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-[#C6B79F] mb-1 block">เดือน</label>
          <input
            name="birthMonth"
            type="number"
            min={1}
            max={12}
            placeholder="6"
            required
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-[#C6B79F] mb-1 block">ปี พ.ศ.</label>
          <input
            name="birthYear"
            type="number"
            min={2400}
            max={2600}
            placeholder="2524"
            required
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-[#C6B79F] mb-1 block">เวลาเกิด</label>
          <input
            name="birthTime"
            type="time"
            defaultValue="06:00"
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
        <div className="col-span-2 sm:col-span-4 mt-1">
          <Button type="submit" className="w-full py-2.5 rounded-xl font-bold">
            คำนวณทักษาและมหาภูติ
          </Button>
        </div>
      </Form>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MahaThaksaPage() {
  const { profile, initialResult } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting" && navigation.formData?.get("intent") !== "ask_oracle";
  const ad = actionData as any;

  const [activeResult, setActiveResult] = useState<any>(initialResult);
  useEffect(() => {
    if (ad && !ad.error && ad.taksaMaha) {
      setActiveResult(ad);
    }
  }, [ad]);

  const taksaMaha = activeResult?.taksaMaha;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 dark:border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
            <p className="text-[#C9A96E] text-[11px] tracking-[0.3em] uppercase font-bold">
              Taksa & Mahabhuti Wisdom
            </p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-[#F8F6F1] font-bold">
            มหาทักษาและมหาภูติพยากรณ์ {activeResult?.customerName ? `(${activeResult.customerName})` : ""}
          </h1>
          <p className="text-slate-600 dark:text-[#C6B79F] text-xs md:text-sm mt-1">
            วิเคราะห์ระบบทักษาคู่ครองทิศ ทักษากำเนิด-ทักษาจร และผังมหาภูติพยากรณ์สมดุลชีวิต
          </p>
        </div>
        {taksaMaha && (
          <div className="text-right text-xs text-slate-600 dark:text-[#C6B79F] shrink-0 bg-[#C9A96E]/10 border border-[#C9A96E]/30 rounded-2xl px-3.5 py-2">
            <p className="text-[11px] font-semibold text-[#B45309] dark:text-[#C9A96E]">อายุย่าง</p>
            <p className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-[#F8F6F1] font-bold leading-none my-0.5">
              {taksaMaha.taksaTransit?.ageYang}
            </p>
            <p className="text-[10px]">ปีบริบูรณ์</p>
          </div>
        )}
      </div>

      {/* ── Error Notification ── */}
      {ad?.error && (
        <div className="bg-rose-100 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-500/30 rounded-2xl p-4 text-rose-800 dark:text-rose-400 text-sm">
          {ad.error}
        </div>
      )}

      {/* ── Form (ถ้ายังไม่มีข้อมูลวันเกิด) ── */}
      {!taksaMaha && <BirthForm />}

      {/* ── Visual Charts & Consultation ── */}
      {taksaMaha && (
        <div className="space-y-6">
          {/* 1. ตารางทักษาคู่ครองทิศ + ผังมหาภูติ Side-by-Side (2 สีแยก กำเนิด/จร) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <InteractiveTaksaCard
              taksaNatal={taksaMaha.taksaNatal}
              taksaTransit={taksaMaha.taksaTransit}
            />
            <CombinedMahaCard
              natal={taksaMaha.mahaNatal}
              transit={taksaMaha.mahaTransit}
              birthYearThai={activeResult.birthYearThai}
              currentYearThai={activeResult.currentYearThai}
              taksaMaha={taksaMaha}
            />
          </div>

          {/* 2. ระบบถาม-ตอบเจาะลึกตามหัวข้อที่สนใจ (Auto-expanding Textarea + History) */}
          <TaksaConsultationChat
            taksaNatal={taksaMaha.taksaNatal}
            taksaTransit={taksaMaha.taksaTransit}
            mahaNatal={taksaMaha.mahaNatal}
            mahaTransit={taksaMaha.mahaTransit}
            storageKeyId={profile?.id || "guest"}
          />

          {/* 3. ฟอร์มป้อนวันเกิดคำนวณชะตาใหม่ */}
          <BirthForm />
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-[#C9A96E]/30 rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin" />
            <p className="text-[#C9A96E] text-sm font-bold">กำลังคำนวณทักษาและมหาภูติ...</p>
          </div>
        </div>
      )}
    </div>
  );
}
