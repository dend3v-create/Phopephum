import type { PhopephumResult, UserProfile, StarAlert } from "@phopephum/types";

/**
 * buildHoraContext (v3 Systematic)
 * Transforms engine results into a structured context for Wisdom Oracle.
 */
export function buildHoraContext(result: PhopephumResult, profile?: UserProfile): string {
  const { nineBase, taksaNatal, taksaTransit, mahaNatal, mahaTransit, crossCheck, atthakarn, rahu } = result;
  const matrix = nineBase.bases;

  let context = `=== ข้อมูลเจ้าชะตา ===\n`;
  if (profile) {
    context += `ชื่อ: ${profile.displayName ?? "ผู้ใช้งาน"} | วันเกิด: ${profile.birthDate}\n`;
  }
  context += `วันจันทรคติ: ${nineBase.lunarDate.thaiDateText}\n`;
  context += `ปีนักษัตร: ${nineBase.lunarDate.zodiacName}\n\n`;

  context += `=== ผัง 7 ตัว 9 ฐาน (Matrix 9x7) ===\n`;
  context += `ฐาน 1 (วัน): ${matrix[0]?.join(" ")}\n`;
  context += `ฐาน 2 (เดือน): ${matrix[1]?.join(" ")}\n`;
  context += `ฐาน 3 (ปี): ${matrix[2]?.join(" ")}\n`;
  context += `ฐาน 4 (กำลัง): ${matrix[3]?.join(" ")}\n`;
  context += `ฐาน 5 (เศษ): ${matrix[4]?.join(" ")} (KEY ROW)\n`;
  context += `ฐาน 8 (อาตมา): ${matrix[7]?.join(" ")}\n`;
  context += `ฐาน 9 (ภริยัง): ${matrix[8]?.join(" ")}\n\n`;

  context += `=== ทักษา (Taksa) ===\n`;
  context += `ทักษากำเนิด บริวาร: ดาว ${taksaNatal.bariStar}\n`;
  context += `ทักษาจร (อายุย่าง ${taksaTransit.ageYang}): บริวารจร: ดาว ${taksaTransit.bariStar}\n\n`;

  context += `=== มหาภูติ (Mahabhuti) ===\n`;
  context += `มหาภูติกำเนิด: ${JSON.stringify(mahaNatal.map)}\n`;
  context += `มหาภูติจร: ${JSON.stringify(mahaTransit.map)}\n\n`;

  context += `=== ยามมงคลขณะนี้ (Time Context) ===\n`;
  context += `ยามอัฏฐกาล: ${atthakarn.planetName} | ยามย่อย: ${atthakarn.subPlanetName} (${atthakarn.startTime}-${atthakarn.endTime})\n`;
  context += `ยามราหูค้นทรัพย์: ${rahu.name} (คุณภาพ: ${rahu.quality})\n\n`;

  context += `=== การวิเคราะห์ระบบสหวิชา (Cross-Check Alerts) ===\n`;
  crossCheck.alerts.forEach((a: StarAlert) => {
    context += `[${a.level.toUpperCase()}] ดาว ${a.star}: ${a.message}\n`;
  });

  return context;
}

/**
 * askHoraOracle (Shorthand for calling the Oracle proxy)
 */
export async function askHoraOracle(prompt: string, env: { AI_WORKER_URL: string; AI_WORKER_SECRET: string }) {
  const response = await fetch(`${env.AI_WORKER_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
    },
    body: JSON.stringify({ prompt }),
  });
  return response;
}
