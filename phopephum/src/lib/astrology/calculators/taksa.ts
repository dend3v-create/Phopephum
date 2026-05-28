/**
 * calculators/taksa.ts
 * ทักษา 8 ตำแหน่ง — คำนวณตามวันเกิดและ sevenBase
 *
 * ทักษา 8 ตำแหน่ง (เรียงตามพลังงาน):
 * 1. บริวาร — ผู้ติดตาม/บริวาร
 * 2. อายุ — สุขภาพ/อายุ
 * 3. เดช — อำนาจ/บารมี
 * 4. ศรี — ความมั่งคั่ง/ความงาม
 * 5. มูละ — รากฐาน/ทรัพย์สิน
 * 6. อุตสาหะ — ความขยัน
 * 7. มนตรี — ปัญญา/ที่ปรึกษา
 * 8. กาลกิณี — อุปสรรค (ระวัง)
 */

import taksaData from '../datasets/taksa.json'

export interface TaksaPosition {
  position:    number   // 1-8
  nameThai:    string
  meaning:     string
  career:      string
  isAuspicious: boolean
  power:       number   // 1-9
}

const TAKSA_MAP = [
  'บริวาร', 'อายุ', 'เดช', 'ศรี',
  'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี',
] as const

/**
 * คำนวณทักษาจาก birthDay (0=อาทิตย์...6=เสาร์)
 * คืนอาร์เรย์ 8 ตำแหน่งทักษาที่เรียงจากตำแหน่งนั้นๆ
 *
 * @param birthDay วัน 0=อาทิตย์ ... 6=เสาร์
 * @returns ชื่อทักษา 8 ตำแหน่ง เริ่มจากวันเกิด
 */
export function calculateTaksa(birthDay: number): string[] {
  return TAKSA_MAP.map(
    (_, index) => TAKSA_MAP[(birthDay + index) % TAKSA_MAP.length] as string
  )
}

/**
 * คำนวณทักษาปัจจุบัน (ตำแหน่งที่ 1 ของวันนั้น)
 * @param birthDay วันเกิด (0-6)
 * @param currentDay วันปัจจุบัน (0-6)
 */
export function getCurrentTaksa(birthDay: number, currentDay: number = new Date().getDay()): TaksaPosition {
  const offset = (currentDay - birthDay + 8) % 8
  const position = (offset % 8) + 1
  const nameThai = TAKSA_MAP[offset] as string

  const posData = (taksaData.positions as Record<string, {
    nameThai: string; meaning: string; career: string; isAuspicious: boolean; power: number
  }>)[String(position)]

  return {
    position,
    nameThai,
    meaning:     posData?.meaning     ?? '',
    career:      posData?.career      ?? '',
    isAuspicious: posData?.isAuspicious ?? true,
    power:       posData?.power       ?? 5,
  }
}

/**
 * ดึงข้อมูลทักษาตำแหน่งที่ระบุ (1-8)
 */
export function getTaksaInfo(position: number): TaksaPosition {
  const idx = ((position - 1) % 8 + 8) % 8
  const nameThai = TAKSA_MAP[idx] as string

  const posData = (taksaData.positions as Record<string, {
    nameThai: string; meaning: string; career: string; isAuspicious: boolean; power: number
  }>)[String(position)]

  return {
    position,
    nameThai,
    meaning:     posData?.meaning     ?? '',
    career:      posData?.career      ?? '',
    isAuspicious: posData?.isAuspicious ?? true,
    power:       posData?.power       ?? 5,
  }
}
