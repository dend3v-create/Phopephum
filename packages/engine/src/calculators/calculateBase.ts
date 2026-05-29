/**
 * calculateBase.ts
 * คำนวณเลขฐานจากวันเกิด (1-9) — หลักเลข 7 ตัว 9 ฐาน
 */

/**
 * คำนวณฐานจากตัวเลขใดๆ ด้วยวิธี digit root (วนลด จนเหลือ 1-9)
 */
export function calculateBase(n: number): number {
  if (n <= 0) return 9
  const r = n % 9
  return r === 0 ? 9 : r
}

/**
 * คำนวณ "ฐานวันเกิด" จาก day-of-month
 */
export function calculateDayBase(day: number): number {
  return calculateBase(day)
}

/**
 * คำนวณ "ฐานเดือนเกิด" จาก month (1-12)
 */
export function calculateMonthBase(month: number): number {
  return calculateBase(month)
}

/**
 * คำนวณ "ฐานปีเกิด" จากตัวเลขปี ค.ศ.
 * วิธี: รวมตัวเลขแต่ละหลักจนเหลือ 1 หลัก
 */
export function calculateYearBase(year: number): number {
  let sum = year
  while (sum >= 10) {
    sum = String(sum).split('').reduce((acc, d) => acc + parseInt(d), 0)
  }
  return sum === 0 ? 9 : sum
}

/**
 * คำนวณ "ฐานรวม" (อัตตะ) จากวัน+เดือน+ปี
 */
export function calculateMasterBase(day: number, month: number, year: number): number {
  const dayB  = calculateDayBase(day)
  const monB  = calculateMonthBase(month)
  const yearB = calculateYearBase(year)
  return calculateBase(dayB + monB + yearB)
}
