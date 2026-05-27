/**
 * calculateHouse.ts
 * คำนวณภพเรือนจากฐานดวงชะตา
 */

import housesData from '../datasets/houses.json'

const HOUSE_KEYS = Object.keys(housesData) as string[]

/**
 * แมปฐาน (1-9) → ภพเรือน (1-12) ตามหลักโหราศาสตร์ไทย
 * ฐาน 1 = ตนุ (ภพที่ 1), ฐาน 2 = กดุมภะ (ภพที่ 2), ...
 */
export function calculateHouse(base: number): string {
  const houseKey = String(((base - 1) % HOUSE_KEYS.length) + 1)
  const house = (housesData as Record<string, { nameThai: string; meaning: string }>)[houseKey]
  return house?.nameThai ?? 'ตนุ'
}

/**
 * ดึงความหมายเต็มของภพ
 */
export function getHouseMeaning(base: number): { nameThai: string; meaning: string } {
  const houseKey = String(((base - 1) % HOUSE_KEYS.length) + 1)
  const house = (housesData as Record<string, { nameThai: string; meaning: string }>)[houseKey]
  return house ?? { nameThai: 'ตนุ', meaning: 'ตัวตน บุคลิกภาพ สุขภาพกาย ชีวิตโดยรวม' }
}
