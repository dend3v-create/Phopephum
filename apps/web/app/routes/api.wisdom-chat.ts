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

    // 4. Try AI Worker (Streaming)
    if (env.AI_WORKER_URL && env.AI_WORKER_SECRET) {
      try {
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

        if (aiResponse.ok && aiResponse.body) {
          const reader = aiResponse.body.getReader();
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const decoder = new TextDecoder();
          let accumulatedText = "";
          let streamBuffer = "";

          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writer.write(value);

                // Decode to track telemetry text
                streamBuffer += decoder.decode(value, { stream: true });
                const lines = streamBuffer.split("\n");
                streamBuffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const data = trimmed.replace(/^data:\s*/, "");
                  if (data === "[DONE]") break;
                  try {
                    const parsed = JSON.parse(data);
                    accumulatedText += parsed?.text ?? parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? "";
                  } catch {
                    if (data && !data.startsWith("{") && !data.startsWith("[")) {
                      accumulatedText += data;
                    }
                  }
                }
              }
            } catch (streamErr) {
              console.error("[api.wisdom-chat] Stream pipe error:", streamErr);
            } finally {
              await writer.close();
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
        }
      } catch (workerErr) {
        console.warn("[api.wisdom-chat] AI Worker unavailable, activating Engine Fallback Synthesis:", workerErr);
      }
    }

    // 5. Intelligent Engine Fallback Synthesis (เมื่อ AI Worker ออฟไลน์ หรือ Dev Mode)
    const fallbackText = generateWisdomEngineFallback({
      mode,
      question,
      userName,
      now,
      horoscopeContext,
      yamContext,
      karnchataContext,
      horanuContext,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunks = fallbackText.match(/.{1,18}/g) || [fallbackText];
        let idx = 0;
        const interval = setInterval(() => {
          if (idx < chunks.length) {
            const payload = JSON.stringify({ text: chunks[idx] });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            idx++;
          } else {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            clearInterval(interval);
            controller.close();
          }
        }, 35);
      },
    });

    // Record Telemetry & Log query
    await recordAiExecutionTelemetry({
      userId: user.id,
      profile,
      reportType: `wisdom_${mode}_chat`,
      promptText: prompt,
      outputText: fallbackText,
      env,
      isSuccess: true,
      releaseSlot: guard.releaseSlot,
      refundSandsIfNeeded: guard.refundSandsIfNeeded,
    });

    supabase.from("wisdom_queries").insert({
      user_id: user.id,
      question,
      category: `[${mode}] ${category}`,
    }).then(({ error: insertErr }) => {
      if (insertErr) console.error("[api.wisdom-chat] Insert query error:", insertErr);
    });

    return new Response(stream, {
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

// ─── Intelligent Engine Fallback Synthesis ────────────────────────────────────

function generateWisdomEngineFallback({
  mode,
  question,
  userName,
  now,
  horoscopeContext,
  yamContext,
  karnchataContext,
  horanuContext,
}: {
  mode: "horoscope" | "yam" | "karnchata" | "horanu";
  question: string;
  userName: string;
  now: Date;
  horoscopeContext?: WisdomChatOptions["horoscopeContext"];
  yamContext?: WisdomChatOptions["yamContext"];
  karnchataContext?: WisdomChatOptions["karnchataContext"];
  horanuContext?: WisdomChatOptions["horanuContext"];
}): string {
  const isWork = /งาน|โอกาส|อาชีพ|โปรเจกต์|สมัคร|เลื่อน|ธุรกิจ|สัมภาษณ์|ตำแหน่ง|ย้าย/i.test(question);
  const isFinance = /เงิน|โชค|ลาภ|หนี้|ทรัพย์|รวย|ลงทุน|กำไร|ขาย/i.test(question);
  const isLove = /รัก|แฟน|คู่|ใจ|ชอบ|แต่งงาน|เลิก/i.test(question);
  const isLost = /หาย|ของ|ลืม|หาไม่เจอ|คืน/i.test(question);
  const isConflict = /ฟ้อง|คดี|ศัตรู|อุปสรรค|สัญญา|ปัญหา|คู่แข่ง/i.test(question);

  // 1. โหมดพรายกระซิบ (Hora Nu)
  if (mode === "horanu" && horanuContext) {
    const { timeAsked, yamAsked, bhavaName, bhavaMeaning, isBadBhava, planetsDesc, xyzEquation } = horanuContext;

    let conclusion = "";
    if (isBadBhava) {
      conclusion = `**สรุปผลตามยามพรายกระซิบ**: ต้องระวังอุปสรรคและความล่าช้าในระยะแรก (ตกภพ${bhavaName}) อย่าเพิ่งใจร้อน ให้เน้นการตรวจสอบรายละเอียดและเตรียมแผนสำรองไว้`;
    } else {
      conclusion = `**สรุปผลตามยามพรายกระซิบ**: จังหวะพลังงานเป็นบวกและเปิดกว้าง (ตกภพ${bhavaName}) มีเกณฑ์ได้รับข่าวดีหรือความคืบหน้าที่ชัดเจนครับ`;
    }

    let topicAdvice = "";
    if (isWork) {
      topicAdvice = isBadBhava
        ? `สำหรับเรื่องงานและโอกาสใหม่ๆ: ในช่วงนี้จะมีบททดสอบหรือเงื่อนไขที่ต้องพิสูจน์ตนเองก่อน โอกาสจะเข้ามาผ่านการปรับตัวและการแก้ปัญหาเฉพาะหน้าอย่างมีสติครับ`
        : `สำหรับเรื่องงานและโอกาสใหม่ๆ: คุณจะได้รับความสนใจหรือมีข้อเสนอใหม่ๆ เข้ามาอย่างแน่นอนครับ แนะนำให้แสดงความพร้อมและจุดเด่นของคุณอย่างมั่นใจ`;
    } else if (isFinance) {
      topicAdvice = isBadBhava
        ? `สำหรับเรื่องการเงินและผลประโยชน์: ควรระวังรายจ่ายหรือข้อตกลงที่ยังไม่ชัดเจน หลีกเลี่ยงการตัดสินใจเสี่ยงโชคในช่วงนี้`
        : `สำหรับเรื่องการเงินและผลประโยชน์: มีทิศทางไหลเวียนที่ดี การเจรจาเรื่องผลตอบแทนมีโอกาสได้รับผลลัพธ์ที่น่าพึงพอใจครับ`;
    } else if (isLove) {
      topicAdvice = `สำหรับเรื่องความสัมพันธ์: พลังงานในขณะนี้บ่งบอกถึงความจำเป็นในการสื่อสารอย่างตรงไปตรงมาและให้เกียรติซึ่งกันและกัน`;
    } else if (isLost) {
      topicAdvice = isBadBhava
        ? `สำหรับสิ่งของที่ค้นหา: มีเกณฑ์ถูกบดบังหรือวางอยู่ในจุดที่มองข้าม เช่น มุมอับหรือที่เก็บของลับตา ให้ลองค้นหาในทิศทางเดิมอีกครั้ง`
        : `สำหรับสิ่งของที่ค้นหา: มีโอกาสพบเจอในไม่ช้า โดยมักอยู่ใกล้กับบริเวณที่มีการใช้งานบ่อยหรือมีผู้ช่วยพบเห็นครับ`;
    } else {
      topicAdvice = `พลังงานของสถานการณ์กำลังขับเคลื่อนไปข้างหน้า การดำเนินตามแผนอย่างรอบคอบจะช่วยให้บรรลุเป้าหมายได้อย่างราบรื่นครับ`;
    }

    return `✦ **คำพยากรณ์ยามพรายกระซิบ (ณ เวลา ${timeAsked} น.)**

**๑. จุดพยากรณ์ ณ วินาทีที่ถาม (X)**:
• เวลาตกในภพ: **${bhavaName}** (${bhavaMeaning})
• สภาพดาวลอยสถิต:
${planetsDesc}

**๒. การขับเคลื่อนตามสมการกาลชะตา (X ➔ Y ➔ Z)**:
${xyzEquation}

**๓. คำชี้แนะเชิงยุทธศาสตร์**:
${topicAdvice}

${conclusion}`;
  }

  // 2. โหมดเช็คฤกษ์ยาม (Yam)
  if (mode === "yam" && yamContext) {
    const { yamName, periodName, timeRange, meaning, subYamName, recommendedActivities } = yamContext;
    return `✦ **วิเคราะห์ฤกษ์ยามอัฐกาล (${timeRange})**

• **ยามใหญ่ขณะนี้**: **${yamName}** (${periodName})
• **ยามซอยย่อย**: ${subYamName || "จังหวะย่อยสมดุล"}
• **พลังงานประจำยาม**: ${meaning}

**คำแนะนำเชิงปฏิบัติ**:
${recommendedActivities && recommendedActivities.length > 0 ? recommendedActivities.map(a => `• ${a}`).join("\n") : "• เหมาะแก่การคิดทบทวน เจรจาอย่างสุขุม และวางแผนล่วงหน้า"}

**จังหวะก้าวสำหรับคุณ ${userName}**:
หากต้องการดำเนินการเรื่องสำคัญ เช่น การติดต่อเจรจาหรือเริ่มงาน ให้ใช้ความสงบนิ่งและชัดเจนในประเด็น จะนำพาความราบรื่นและลดข้อติดขัดได้อย่างยอดเยี่ยมครับ ✦`;
  }

  // 3. โหมดกาลชะตา (Karnchata)
  if (mode === "karnchata" && karnchataContext) {
    return `✦ **ผังพลังงานกาลชะตา ณ จุดตั้งคำถาม**

• **ยามใหญ่**: ${karnchataContext.yamYaiName || "ยามกาลชะตา"}
• **ยามซอย**: ${karnchataContext.yamSoyName || "ช่วงพลังงานเฉพาะหน้า"}

**วิเคราะห์สถานการณ์เฉพาะหน้าสำหรับคำถาม**: "${question}"
กาลชะตา ณ วินาทีนี้บ่งชี้ว่า สถานการณ์ที่คุณกำลังเผชิญอยู่มีทางออกที่ชัดเจน เพียงแต่ต้องอาศัยการจัดลำดับความสำคัญ ไม่ปล่อยให้อารมณ์ความกังวลเข้ามากำหนดทิศทาง

**คำชี้แนะจากปัญญาญาณ**:
๑. **สิ่งสำคัญเฉพาะหน้า**: ยึดความจริงและข้อมูลที่พิสูจน์ได้เป็นหลัก
๒. **ทางเลือกที่เหมาะสม**: หากเป็นเรื่องโอกาสใหม่ ให้เปิดรับการเจรจาแต่ยังไม่ต้องรีบผูกมัดจนกว่าจะเห็นเงื่อนไขครบถ้วน
๓. **พลังเสริมความสำเร็จ**: ดำเนินการด้วยความซื่อตรงและความตั้งใจจริง จะมีผู้ใหญ่หรือคนรอบข้างยื่นมือเข้าช่วยหนุนนำครับ ✦`;
  }

  // 4. โหมดตรวจดวงชะตา (Horoscope)
  if (horoscopeContext && horoscopeContext.hasBirthData) {
    const { thaiLunarText, currentAge, sriStar, dechStar, montriStar, kaliStar, vayaHouse } = horoscopeContext;
    return `✦ **วิเคราะห์ผังดวงชะตา ๗ ตัว ๙ ฐาน & จังหวะชีวิต**

• **ดวงกำเนิด**: วัน${thaiLunarText || "ตามปฏิทินสุริยยาตร์"} (อายุย่าง ${currentAge || "—"} ปี)
• **ดาวสำคัญจร**: ศรี (${sriStar || "—"}), มนตรี (${montriStar || "—"}), กาลกิณี (${kaliStar || "—"})
• **วัยจรปัจจุบัน**: ตกเรือน **${vayaHouse || "ภพจร"}**

**วิเคราะห์เจาะจงตามคำถาม**: "${question}"
สำหรับคุณ **${userName}** จังหวะชีวิตในช่วงนี้มีดาวหนุนนำด้านความก้าวหน้า แม้จะมีภาระหน้าที่หรือความรับผิดชอบที่ต้องแบกรับเพิ่มขึ้น แต่ก็เป็นบันไดสำคัญในการยกระดับฐานะและความมั่นคง

**คำแนะนำวางแผนเชิงรุก**:
• ใช้ประโยชน์จากดาวศรีและมนตรีในการเข้าหาผู้ใหญ่ ขอคำปรึกษา หรือเจรจาข้อตกลงสำคัญ
• ระวังผลกระทบจากดาวกาลกิณีในเรื่องเอกสารสัญญาหรือคำพูดที่อาจถูกตีความผิดพลาด
• ก้าวไปข้างหน้าอย่างมั่นใจ เพราะดวงชะตามีรากฐานความสำเร็จรองรับอยู่แล้วครับ ✦`;
  }

  // Fallback ทั่วไป
  return `✦ **คำชี้แนะจาก Wisdom AI สำหรับคุณ ${userName}**

สำหรับคำถาม: "${question}"

พลังงานและจังหวะเวลาในขณะนี้กำลังหมุนเวียนไปในทิศทางที่สร้างสรรค์:
• **แนวโน้มโอกาส**: สิ่งที่คุณกำลังมุ่งหวังมีโอกาสเป็นรูปธรรมได้ หากคุณเริ่มต้นด้วยความรอบคอบและลงมือทำอย่างต่อเนื่อง
• **สิ่งที่ควรใส่ใจ**: ตรวจสอบรายละเอียดของข้อตกลงและการสื่อสารให้กระชับชัดเจน
• **ทัศนคติแห่งปัญญา**: รักษาความมั่นใจและมองเห็นคุณค่าในตัวเอง โอกาสดีๆ ย่อมตอบสนองต่อผู้ที่มีความพร้อมเสมอครับ ✦`;
}
