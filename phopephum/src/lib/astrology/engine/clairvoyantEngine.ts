/**
 * engine/clairvoyantEngine.ts
 * Module 3 (sub): อ่านรหัสชีวิตจากผังดวง — ดาวกระทบภพ + แผนที่ดาวสากล
 *
 * Pipeline:
 *   targetHouse + FateMatrix + TransitContext
 *     → findHouseLocations()     — หาพิกัดภพในผัง
 *     → analyzeDestinyFlow()     — ดึงกำลังดาวทุกฐาน
 *     → generateAstralMap()      — แปลงเป็น Western Astrology visualization
 *     → DestinyBlueprint[]
 *
 * หลักการ: "ภพบอกเรื่องราว ดาวบอกอาการ ฐานบอกผลลัพธ์"
 */

import { HouseMapper } from '../calculators/houseMapper'
import {
  FateMatrix,
  TransitContext,
  DestinyBlueprint,
} from '../types/fateMatrix'

/** Map เลขดาว (1-7) → ดาวเคราะห์ไทย + สากล */
const PLANET_MAP: Record<number, string> = {
  1: 'Sun — ตัวตนเปล่งประกาย',
  2: 'Moon — ห้วงอารมณ์ความรู้สึก',
  3: 'Mars — การลงมือทำอันทรงพลัง',
  4: 'Mercury — สื่อสารวาจาสิทธิ์',
  5: 'Jupiter — มหาปัญญาบริสุทธิ์',
  6: 'Venus — ความรักและการดึงดูดความมั่งคั่ง',
  7: 'Saturn — โครงสร้างความอดทนอันยิ่งใหญ่',
}

/** Map ชื่อภพไทย → Western House */
const WESTERN_HOUSE_MAP: Record<string, string> = {
  'อัตตา':    '1st House (ภาพลักษณ์และตัวตน)',
  'ตนุ':      '1st House (ภาพลักษณ์และตัวตน)',
  'กดุมพะ':   '2nd House (การเงินและความมั่งคั่ง)',
  'หินะ':     '2nd House (ทรัพย์สินพูนทวี)',
  'สหัชชะ':   '3rd House (การสื่อสารและเครือข่าย)',
  'พันธุ':    '4th House (รากฐานครอบครัว)',
  'ปุตตะ':    '5th House (โปรเจกต์ใหม่และความคิดสร้างสรรค์)',
  'อริ':      '6th House (การแก้ปัญหาและการฝ่าฟัน)',
  'ปัตนิ':    '7th House (หุ้นส่วน คู่ชีวิต และการร่วมทุน)',
  'มรณะ':     '8th House (การเปลี่ยนแปลงและการเปลี่ยนผ่าน)',
  'ศุภะ':     '9th House (ความเจริญก้าวหน้าและความสำเร็จชั้นสูง)',
  'กัมมะ':    '10th House (ชื่อเสียง เกียรติยศ และหน้าที่การงาน)',
  'ลาภะ':     '11th House (โชคลาภที่ไม่คาดฝันและมหามิตร)',
  'พยายะ':    '12th House (กรรมเก่าและการปล่อยวาง)',
  'ทาสา':     '6th House (งานบริการและการอุทิศตน)',
  'ทาสี':     '10th House (งานบริการที่สร้างคุณค่าอันยิ่งใหญ่)',
  'ปิตา':     '4th House (บิดา รากฐาน มรดก)',
  'มาตา':     '4th House (มารดา บ้าน และความมั่นคงทางจิตใจ)',
  'โภคา':     '2nd House (โภคทรัพย์และความสุขสบาย)',
}

export class ClairvoyantEngine {
  /**
   * วิเคราะห์พลังงานดาวกระทบภพเรือนที่เลือก
   * คืนค่า DestinyBlueprint ทุกพิกัดที่พบภพนั้นในผัง 3 แถวหลัก
   */
  public static analyzeDestinyFlow(
    matrix: FateMatrix,
    targetHouse: string,
    transit: TransitContext,
  ): DestinyBlueprint[] {
    const locations = HouseMapper.findHouseLocations(targetHouse)

    return locations.map((loc) => {
      const col = loc.colIdx

      // ─── ดาวที่สถิตในภพ ───────────────────────────────────────────────
      const activatedStar = matrix[loc.rowIdx][col]

      // ─── ฐาน 4: กำลังเทวดาหนุนหลัง (ต้นเหตุ) ─────────────────────────
      const base4Power = matrix[3][col]

      // ─── ฐาน 8-9: วิบากกรรม / เป้าหมายสูงสุด (ปลายทาง) ───────────────
      const futureProjection = {
        base8: matrix[7][col],
        base9: matrix[8][col],
      }

      // ─── ฐาน 5-7: กลยุทธ์แก้เกม (Matrix Solution) ─────────────────────
      const matrixSolutions = {
        base5: matrix[4][col],
        base6: matrix[5][col],
        base7: matrix[6][col],
      }

      // ─── แผนที่ดวงดาวสากล (Western Visualization) ──────────────────────
      const astralVisualization = ClairvoyantEngine.generateAstralMap(
        activatedStar,
        loc.houseName,
        transit,
      )

      return {
        inquiryHouse: targetHouse,
        activatedStar,
        base4Power,
        futureProjection,
        matrixSolutions,
        astralVisualization,
      }
    })
  }

  /**
   * แปลงพลังงานโหราศาสตร์ไทย → ภาพ Visualization แบบ Western Astrology
   * (Planet / Sign Archetype / House)
   */
  private static generateAstralMap(
    star: number,
    houseName: string,
    transit: TransitContext,
  ): DestinyBlueprint['astralVisualization'] {
    const planet = PLANET_MAP[star] ?? `ดาวเลข ${star}`

    // ── Sign Archetype จาก Transit Context ───────────────────────────────
    const fireKeywords = ['เดช', 'ราชา', 'ธงชัย']
    const airKeywords  = ['ศรี', 'มนตรี']
    const waterKeywords = ['อุตสาหะ', 'มรณะ']

    let signArchetype: string
    if (
      fireKeywords.some(k => transit.thaksa === k || transit.mahaphoot === k)
    ) {
      signArchetype = 'Fire Sign — ร้อนแรง ทรงอำนาจ ความเป็นผู้นำอย่างจักรพรรดิ'
    } else if (airKeywords.some(k => transit.thaksa === k)) {
      signArchetype = 'Air Sign — ไหลเวียน ไอเดียสร้างสรรค์ การเชื่อมต่อ Energy Flow'
    } else if (
      waterKeywords.some(k => transit.thaksa === k) ||
      transit.mahaphoot === 'มรณะ'
    ) {
      signArchetype = 'Water Sign — ลึกซึ้ง หยั่งรู้ ลึกลับและปรับตัว'
    } else {
      signArchetype = 'Earth Sign — ความมั่นคง เป็นระบบ รากฐานอันแน่วแน่'
    }

    const westernHouse =
      WESTERN_HOUSE_MAP[houseName] ?? 'Angular House — พื้นที่แห่งการขับเคลื่อนชีวิต'

    return { planet, signArchetype, westernHouse }
  }
}
