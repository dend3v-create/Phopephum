/**
 * engine/ragEngine.ts
 * RAG Engine — ดึง Knowledge Base context สำหรับ AI prediction
 *
 * Wrapper ที่รวม:
 * - Supabase knowledge_base (primary)
 * - Static fallback context
 *
 * รองรับ: Supabase Vector / pgvector (อนาคต), Pinecone, Weaviate
 */

export interface RagContext {
  /** Context text สำหรับใส่ใน AI prompt */
  text:       string
  /** จำนวน documents ที่ดึงมา */
  docCount:   number
  /** source ที่ใช้ */
  source:     'supabase' | 'static'
}

export interface RagQuery {
  /** เลขฐาน (1-9) สำหรับ filter */
  base?:       number
  /** categories ที่ต้องการ */
  categories?: string[]
  /** คำค้นหา */
  keywords?:   string[]
  /** จำนวน results สูงสุด */
  limit?:      number
}

/**
 * ดึง RAG context จาก Supabase knowledge_base
 * ถ้าไม่มี Supabase หรือ error → ใช้ static fallback
 */
export async function getRagContext(query: RagQuery): Promise<RagContext> {
  const { base, categories = [], keywords = [], limit = 5 } = query

  // Dynamic import เพื่อรองรับ edge runtime
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabaseClient()

    // Build category filter
    const defaultCategories = ['phopephum_meaning', 'seven_base_9_stars', 'prediction_guideline']
    const allCategories = [...new Set([...defaultCategories, ...categories])]

    const { data: items, error } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .in('category', allCategories)
      .limit(limit)

    if (error || !items?.length) {
      return buildStaticContext(base, keywords)
    }

    const text = (items as Array<{ title: string; content: string; category: string }>)
      .map(item => `[${item.title}]\n${item.content}`)
      .join('\n\n')

    return { text, docCount: items.length, source: 'supabase' }

  } catch {
    return buildStaticContext(base, keywords)
  }
}

// ─── Static Fallback ──────────────────────────────────────────────────────────

const STATIC_BASE_CONTEXT: Record<number, string> = {
  1: 'ฐาน 1 (อาทิตย์) — ผู้นำ อำนาจ เกียรติยศ เหมาะตำแหน่งบริหารและการสร้างชื่อเสียง',
  2: 'ฐาน 2 (จันทร์) — เมตตา เข้าใจคน สัญชาตญาณสูง เหมาะงานดูแลและสร้างความสัมพันธ์',
  3: 'ฐาน 3 (อังคาร) — กล้าหาญ พลังงานสูง ลงมือทำ เหมาะงานที่ต้องการพลังงานและความกล้า',
  4: 'ฐาน 4 (พุธ) — ฉลาด สื่อสารเก่ง ธุรกิจรุ่งเรือง เหมาะงาน Content และการเจรจา',
  5: 'ฐาน 5 (พฤหัส) — ปัญญาสูง โชคลาภ ครู เหมาะงานสอน ที่ปรึกษา และการขยายธุรกิจ',
  6: 'ฐาน 6 (ศุกร์) — เสน่ห์ ความงาม ความรัก เหมาะงานศิลปะ ความงาม และการสร้างแบรนด์',
  7: 'ฐาน 7 (เสาร์) — วินัย วางระบบ อดทน เหมาะเป็นที่ปรึกษา นักวิเคราะห์ และนักวางแผน',
  8: 'ฐาน 8 (ราหู) — โอกาสพิเศษ สิ่งแปลกใหม่ เทคโนโลยี เหมาะงาน Innovation และ Startup',
  9: 'ฐาน 9 (เกตุ) — จิตวิญญาณ การบำบัด ช่วยเหลือผู้อื่น เหมาะเป็นโค้ชและนักบำบัด',
}

function buildStaticContext(base?: number, keywords?: string[]): RagContext {
  const baseContext = base ? (STATIC_BASE_CONTEXT[base] ?? '') : ''
  const keyContext  = keywords?.length ? `คำค้นหา: ${keywords.join(', ')}` : ''

  const text = [
    '=== องค์ความรู้โหราศาสตร์ไทย (Static) ===',
    baseContext,
    keyContext,
    'หลักการ: เลข 7 ตัว 9 ฐาน ใช้วันเกิดจันทรคติเป็นรากฐาน ดาวเจ้าฐานบอกบุคลิกและชะตา',
    'ทักษา 8 ตำแหน่งบอกจังหวะชีวิต วัยจรบอกดาวเจ้าช่วงอายุ',
  ].filter(Boolean).join('\n')

  return { text, docCount: 0, source: 'static' }
}
