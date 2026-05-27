/**
 * engine/ragContextEngine.ts
 * RAG Context Engine — ดึง Knowledge Base จาก Supabase
 *
 * รองรับ:
 * - Supabase knowledge_base table (ระบบที่ใช้อยู่)
 * - Supabase Vector / pgvector (อนาคต)
 * - Pinecone / Weaviate / LangChain (pluggable)
 */

import { HoroscopeData, RuleMatch } from '../types/horoscope'

// Dynamic import เพื่อรองรับ edge runtime
async function getSupabaseClient() {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server')
  return createServerSupabaseClient()
}

/**
 * ดึง RAG context จาก Supabase knowledge_base
 * พร้อม filter ตาม category ที่เกี่ยวข้องกับ base และ rules
 */
export async function getRagContext(
  data: HoroscopeData,
  rules: RuleMatch[],
  useSupabase = true
): Promise<string> {
  // รวม categories ที่ต้องการจาก rules
  const ruleCategories = [...new Set(rules.map(r => r.category))]

  // Map rule category → knowledge_base category
  const knowledgeCategories = [
    'phopephum_meaning',
    'seven_base_9_stars',
    'prediction_guideline',
    'reading_logic',
    ...(ruleCategories.includes('career')   ? ['attakarn_hora'] : []),
    ...(ruleCategories.includes('health')   ? ['chakra_energy', 'therapy_life_guide'] : []),
    ...(ruleCategories.includes('branding') ? ['psychology_philosophy'] : []),
  ]

  let knowledgeText = ''

  if (useSupabase) {
    try {
      const supabase = await getSupabaseClient()
      const { data: items } = await supabase
        .from('knowledge_base')
        .select('title, content, category')
        .in('category', knowledgeCategories)
        .limit(6)

      if (items && items.length > 0) {
        knowledgeText = items
          .map(item => `[${item.title}]\n${item.content}`)
          .join('\n\n')
      }
    } catch (err) {
      console.warn('[ragContextEngine] Supabase unavailable, using static context:', err)
    }
  }

  // Fallback static context จาก HoroscopeData
  const staticContext = buildStaticContext(data, rules)

  return knowledgeText
    ? `${staticContext}\n\n--- ความรู้เพิ่มเติมจากคัมภีร์ ---\n${knowledgeText}`
    : staticContext
}

function buildStaticContext(data: HoroscopeData, rules: RuleMatch[]): string {
  const ruleInsights = rules
    .slice(0, 4)
    .map(r => `• [${r.category.toUpperCase()}] ${r.insight}`)
    .join('\n')

  return `
ข้อมูลดวงชะตาที่คำนวณได้:
- เลขฐาน: ${data.base} (ดาวประจำ: ${getPlanetByBase(data.base)})
- ภพหลัก: ${data.house}
- กำลังดวง: ${data.power}
- วันเกิด: วัน${data.dayName}
- ปีนักษัตร: ปี${data.zodiacYear}
- จังหวะชีวิต: ${data.transit}
- วัยจร: ${data.vayaChorn}
- ทักษา: ${data.taksa.meaning}

Rule Engine Insights:
${ruleInsights}
`.trim()
}

function getPlanetByBase(base: number): string {
  const planets: Record<number, string> = {
    1: 'อาทิตย์', 2: 'จันทร์', 3: 'อังคาร', 4: 'พุธ',
    5: 'พฤหัส', 6: 'ศุกร์', 7: 'เสาร์', 8: 'ราหู', 9: 'เกตุ',
  }
  return planets[base] ?? 'พฤหัส'
}
