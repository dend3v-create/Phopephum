import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import {
  calculateKarnchata,
  calculatePhopephum,
  getYamPrediction,
  calculateHoraTaynoo,
  PLANET_INFO,
  BHAVA_KNOWLEDGE,
  KASTERN_FIXED,
  STAR_NAMES,
} from "@phopephum/engine";
import { buildWisdomChatPrompt, type WisdomChatOptions } from "@phopephum/prompts";
import type { Env } from "~/env.server";

const STATUS_LABEL: Record<string, string> = {
  "maha-uccj": "มหาอุจจ์ (กำลังสูงสุด)",
  "kaset": "เกษตร (มั่นคงถาวร)",
  "racha-chok": "ราชาโชค (โชคลาภเกื้อหนุน)",
  "maha-chakr": "มหาจักร (บุกเบิกสำเร็จยิ่งใหญ่)",
  "pra": "ประ (อ่อนกำลัง ต้องพึ่งพา)",
  "nij": "นิจ (เสื่อมถอย ไร้กำลัง)",
};

const BAD_BHAVAS = new Set(["อริ", "มรณะ", "วินาศ"]);

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const formData = await request.formData();
  const question = String(formData.get("question") || "").trim();
  const category = String(formData.get("category") || "ตรวจดวงชะตา");
  const rawMode = String(formData.get("mode") || "").trim();
  const targetDateStr = String(formData.get("targetDate") || new Date().toISOString());

  if (!question) {
    return json({ error: "กรุณาระบุคำถาม" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);

  // 1. Server-Side AI Cost Guard (Pre-Flight: Auth → Entitlement → Quota → Rate Limit → Concurrency → Payload)
  const { guardAiRequestPreflight, recordAiExecutionTelemetry } = await import("~/services/aiCostGuard.server");

  const guard = await guardAiRequestPreflight({
    userId: user.id,
    profile,
    featureType: "wisdom_ai",
    promptText: question,
    env,
    supabase,
  });

  if (!guard.allowed) {
    return json({
      error: guard.errorMessage,
      code: guard.errorCode,
    }, { status: guard.status });
  }

  const now = new Date(targetDateStr || Date.now());
  const userName = profile?.display_name || profile?.full_name || "คุณ";

  // Determine active mode
  let mode: "horoscope" | "yam" | "karnchata" | "horanu" = "horoscope";
  if (rawMode === "horoscope" || rawMode === "yam" || rawMode === "karnchata" || rawMode === "horanu") {
    mode = rawMode;
  } else if (category.includes("ฤกษ์") || category.includes("ยาม")) {
    mode = "yam";
  } else if (category.includes("กาลชะตา")) {
    mode = "karnchata";
  } else if (category.includes("พรายกระซิบ")) {
    mode = "horanu";
  } else if (category.includes("ดวง")) {
    mode = "horoscope";
  }

  try {
    // 2. Compute Multi-discipline Contexts according to Core Methodology
    let horoscopeContext: WisdomChatOptions["horoscopeContext"] = undefined;
    let yamContext: WisdomChatOptions["yamContext"] = undefined;
    let karnchataContext: WisdomChatOptions["karnchataContext"] = undefined;
    let horanuContext: WisdomChatOptions["horanuContext"] = undefined;

    // A. Personal Horoscope (เลข ๗ ตัว ๙ ฐาน & สุริยยาตร์แท้)
    if (profile?.birth_date) {
      try {
        const phResult = await calculatePhopephum({
          birthDate: profile.birth_date,
          birthTime: profile.birth_time || "12:00",
          birthPlace: profile.birth_place || "กรุงเทพมหานคร",
        }, now);

        const nineBase = phResult?.nineBase;
        const matrix = nineBase?.bases || [];
        const taksaMap = (phResult?.taksaTransit?.map || {}) as Record<string, string>;
        const sriStar = Object.entries(taksaMap).find(([_, v]) => v === "ศรี")?.[0];
        const dechStar = Object.entries(taksaMap).find(([_, v]) => v === "เดช")?.[0];
        const montriStar = Object.entries(taksaMap).find(([_, v]) => v === "มนตรี")?.[0];
        const kaliStar = Object.entries(taksaMap).find(([_, v]) => v === "กาลกิณี")?.[0];

        const vayaCol = phResult?.vayaJorn?.col ? phResult.vayaJorn.col - 1 : undefined;
        const yearlyCol = phResult?.yearlyJorn?.col ? phResult.yearlyJorn.col - 1 : undefined;

        horoscopeContext = {
          birthDate: profile.birth_date,
          birthTime: profile.birth_time || "12:00",
          birthPlace: profile.birth_place || "กรุงเทพมหานคร",
          thaiLunarText: nineBase?.lunarDate?.thaiDateText,
          zodiacName: nineBase?.lunarDate?.zodiacName,
          currentAge: phResult?.taksaTransit?.ageYang,
          sriStar: sriStar ? `${(STAR_NAMES as any)[Number(sriStar)] || sriStar} (ดาว ${sriStar})` : undefined,
          dechStar: dechStar ? `${(STAR_NAMES as any)[Number(dechStar)] || dechStar} (ดาว ${dechStar})` : undefined,
          montriStar: montriStar ? `${(STAR_NAMES as any)[Number(montriStar)] || montriStar} (ดาว ${montriStar})` : undefined,
          kaliStar: kaliStar ? `${(STAR_NAMES as any)[Number(kaliStar)] || kaliStar} (ดาว ${kaliStar})` : undefined,
          vayaHouse: phResult?.vayaJorn?.houseName,
          vayaBase4: vayaCol !== undefined && matrix[3]?.[vayaCol] ? `กำลัง ${matrix[3][vayaCol]}` : undefined,
          yearlyHouse: phResult?.yearlyJorn?.houseName,
          yearlyBase4: yearlyCol !== undefined && matrix[3]?.[yearlyCol] ? `กำลัง ${matrix[3][yearlyCol]}` : undefined,
          lagnaHouse: phResult?.lagnaTransit?.houseName,
          mahaPhutiStatus: phResult?.mahaTransit?.map ? JSON.stringify(phResult.mahaTransit.map) : undefined,
          hasBirthData: true,
        };
      } catch (err) {
        console.warn("[api.wisdom-chat] Error calculating personal horoscope:", err);
      }
    }

    // B. Yam & Timing (ยามอัฐกาล & กาลโยค)
    if (mode === "yam" || mode === "horoscope") {
      try {
        const yamPred = getYamPrediction(now);
        const karnchata = calculateKarnchata(now);

        yamContext = {
          yamName: yamPred.yamName || `ยามที่ ${yamPred.yamNumber}`,
          planetName: yamPred.yamName || "—",
          periodName: yamPred.period === "day" ? "กลางวัน (ทิวากาล)" : "กลางคืน (รัตติกาล)",
          timeRange: yamPred.phase ? `ช่วง ${yamPred.phase}` : "ขณะนี้",
          meaning: yamPred.prediction?.news || yamPred.prediction?.auspicious || "จังหวะแห่งการเจรจาและการวางแผน",
          subYamName: karnchata.yamSoyName,
          subYamMeaning: undefined,
          kalayokeStatus: "กาลโยคปกติ",
          recommendedActivities: yamPred.prediction?.shouldDo ? [yamPred.prediction.shouldDo] : [],
        };
      } catch (err) {
        console.warn("[api.wisdom-chat] Error calculating yam:", err);
      }
    }

    // C. Karnchata (กาลชะตา)
    if (mode === "karnchata" || mode === "horoscope" || mode === "yam") {
      try {
        const karnchata = calculateKarnchata(now);
        karnchataContext = {
          yamYaiName: karnchata.yamYaiName,
          yamSoyName: karnchata.yamSoyName,
        };
      } catch (err) {
        console.warn("[api.wisdom-chat] Error calculating karnchata:", err);
      }
    }

    // D. Hora Nu (พรายกระซิบ)
    if (mode === "horanu") {
      try {
        const chart = calculateHoraTaynoo({ dateAsked: now });
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Bangkok",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        let h = Number(parts.find((p) => p.type === "hour")?.value);
        const m = Number(parts.find((p) => p.type === "minute")?.value);
        const s = Number(parts.find((p) => p.type === "second")?.value);
        if (h === 24) h = 0;
        const nowMin = h * 60 + m + s / 60;

        let activeSlot = chart.subTimeSlots.find((slot) => nowMin >= slot.startMin && nowMin < slot.endMin);
        if (!activeSlot) activeSlot = chart.subTimeSlots[0];

        const bhavaInfo = (BHAVA_KNOWLEDGE as any)[activeSlot.bhavaName];
        const isBadBhava = BAD_BHAVAS.has(activeSlot.bhavaName);

        const planetsInSlot = chart.planetEntries.filter(
          (p) => p.zodiacIndex === activeSlot.zodiacIndex && !p.isLagna
        );

        const planetsDesc = planetsInSlot.length === 0
          ? "(ไม่มีดาวลอยสถิต — ตีความจากความหมายภพ)"
          : planetsInSlot
              .map((p) => {
                const pInfo = p.planetNum !== null ? (PLANET_INFO as any)[p.planetNum] : null;
                const statusStr = p.status ? (STATUS_LABEL[p.status] ?? p.status) : "ปกติ";
                return `• ดาว ${p.labelThai} (${pInfo?.thai ?? "ดาวประกอบ"}) มาตรฐาน: ${statusStr}`;
              })
              .join("\n");

        const getPointDesc = (zIdx: number) => {
          const bhava = chart.bhavaMap[zIdx] || "?";
          const lord = (KASTERN_FIXED as any)[zIdx];
          const ps = chart.planetEntries.filter((p) => p.zodiacIndex === zIdx && !p.isLagna);
          const planetsStr = ps.length > 0
            ? ps.map((p) => `${p.labelThai}(${p.status ? STATUS_LABEL[p.status].split(" ")[0] : "ปกติ"})`).join(", ")
            : "ไม่มีดาวลอย";
          const lordPosEntry = chart.planetEntries.find((p) => p.planetNum === lord);
          const nextZIdx = lordPosEntry ? lordPosEntry.zodiacIndex : zIdx;
          return { bhava, lord, nextZIdx, planetsStr };
        };

        const x = getPointDesc(activeSlot.zodiacIndex);
        const y = getPointDesc(x.nextZIdx);
        const z = getPointDesc(y.nextZIdx);
        const xyzEquation = `${x.bhava}(ดาว: ${x.planetsStr}) ➔ ${y.bhava}(ดาว: ${y.planetsStr}) ➔ ${z.bhava}(ดาว: ${z.planetsStr})`;

        horanuContext = {
          timeAsked: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
          yamAsked: chart.yamAsked,
          bhavaName: activeSlot.bhavaName,
          bhavaMeaning: bhavaInfo?.meaning ?? "—",
          isBadBhava,
          planetsDesc,
          xyzEquation,
        };
      } catch (err) {
        console.warn("[api.wisdom-chat] Error calculating horanu:", err);
      }
    }

    // 3. Build Unified Prompt
    const prompt = buildWisdomChatPrompt({
      question,
      category,
      mode,
      userName,
      now,
      horoscopeContext,
      yamContext,
      karnchataContext,
      horanuContext,
    });

    // 4. Call AI Worker (streaming)
    const aiResponse = await fetch(`${env.AI_WORKER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        userId: user.id,
        reportType: `wisdom_${mode}_chat`,
        context: { category, question, mode },
        prompt,
      }),
    });

    if (!aiResponse.ok || !aiResponse.body) {
      await recordAiExecutionTelemetry({
        userId: user.id,
        profile,
        reportType: `wisdom_${mode}_chat`,
        promptText: prompt,
        env,
        isSuccess: false,
        error: new Error(`AI Service Response Status: ${aiResponse.status}`),
        releaseSlot: guard.releaseSlot,
        refundSandsIfNeeded: guard.refundSandsIfNeeded,
      });
      throw new Error("AI Service Unavailable");
    }

    // 5. Wrap stream to capture output tokens & record telemetry upon completion
    const reader = aiResponse.body.getReader();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    let accumulatedText = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (streamErr) {
        console.error("[api.wisdom-chat] Stream pipe error:", streamErr);
      } finally {
        await writer.close();
        // Record telemetry & release slot
        await recordAiExecutionTelemetry({
          userId: user.id,
          profile,
          reportType: `wisdom_${mode}_chat`,
          promptText: prompt,
          outputText: accumulatedText,
          env,
          isSuccess: true,
          releaseSlot: guard.releaseSlot,
          refundSandsIfNeeded: guard.refundSandsIfNeeded,
        });

        // Insert wisdom_query record for usage tracking
        supabase.from("wisdom_queries").insert({
          user_id: user.id,
          question,
          category: `[${mode}] ${category}`,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.error("[api.wisdom-chat] Insert query error:", insertErr);
        });
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (err) {
    console.error("Wisdom Chat Error:", err);
    await recordAiExecutionTelemetry({
      userId: user.id,
      profile,
      reportType: `wisdom_${mode}_chat`,
      env,
      isSuccess: false,
      error: err,
      releaseSlot: guard.releaseSlot,
      refundSandsIfNeeded: guard.refundSandsIfNeeded,
    });
    return json({ error: "Wisdom ไม่ว่างชั่วคราว กรุณาลองใหม่สักครู่ ✦" }, { status: 500 });
  }
}
