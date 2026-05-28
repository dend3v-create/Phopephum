/**
 * calculators/matrixBuilder.ts
 * Module 2: สร้างผังดวงชะตา 9 ฐาน (เลข 7 ตัว 9 ฐาน)
 *
 * โครงสร้างผัง (9 แถว × 7 คอลัมน์):
 *   แถว 0 (ฐานที่ 1): ฐานวัน      — อัตตา → มรณะ
 *   แถว 1 (ฐานที่ 2): ฐานเดือน    — หินะ  → อาสา
 *   แถว 2 (ฐานที่ 3): ฐานปี       — โภคา  → ทาสี
 *   แถว 3 (ฐานที่ 4): ฐานกำลังพระเคราะห์  (ผลรวม แถว 0+1+2 ต่อคอลัมน์)
 *   แถว 4 (ฐานที่ 5): ฐานอายตนะ   (วัน + ปี) mod 7
 *   แถว 5 (ฐานที่ 6): ฐานดวงพริ้ง  (ฐาน 4) mod 7
 *   แถว 6 (ฐานที่ 7): ฐานอินทภาส  (เดือน × 2 + วัน) mod 7
 *   แถว 7 (ฐานที่ 8): ฐานบาทจันทร์ (ฐาน 4 − ปี + 7) mod 7
 *   แถว 8 (ฐานที่ 9): ฐานโสฬส     (ฐาน 5+6+8) mod 9
 */

import { AstroBaseNumbers, FateMatrix } from '../types/fateMatrix'

/** ลดทอนให้เหลือเลข 1-7 (หารลงตัว → 7) */
function mod7(n: number): number {
  const r = n % 7
  return r === 0 ? 7 : r
}

/** ลดทอนให้เหลือเลข 1-9 (หารลงตัว → 9) */
function mod9(n: number): number {
  const r = n % 9
  return r === 0 ? 9 : r
}

export class MatrixBuilder {
  /**
   * สร้างผังดวงชะตา 9×7 จากเลขฐานวัน/เดือน/ปี (1-7)
   */
  public static buildMatrix(base: AstroBaseNumbers): FateMatrix {
    const matrix: FateMatrix = []

    // ── แถวหลัก 1-3: เวียนเลข 1-7 จากเลขตั้งต้น ─────────────────────────
    matrix.push(MatrixBuilder.generateRow(base.dayNum))   // แถว 0 = ฐานที่ 1
    matrix.push(MatrixBuilder.generateRow(base.monthNum)) // แถว 1 = ฐานที่ 2
    matrix.push(MatrixBuilder.generateRow(base.yearNum))  // แถว 2 = ฐานที่ 3

    // ── แถวที่ 4 (ฐานกำลังพระเคราะห์): ผลรวมคอลัมน์ แถว 1+2+3 ──────────
    const row4: number[] = []
    for (let col = 0; col < 7; col++) {
      row4.push(matrix[0][col] + matrix[1][col] + matrix[2][col])
    }
    matrix.push(row4) // แถว 3 = ฐานที่ 4 (คงค่าดิบ ไม่ลดทอน)

    // ── แถวที่ 5-9 (ฐานหนุน): คำนวณผ่าน loop ─────────────────────────────
    for (let rowIdx = 4; rowIdx < 9; rowIdx++) {
      matrix.push(MatrixBuilder.calculateExtendedBase(matrix, rowIdx))
    }

    return matrix
  }

  /**
   * สร้างแถวเวียนเลข 1-7 จากเลขตั้งต้น
   * ตัวอย่าง: startNum=3 → [3, 4, 5, 6, 7, 1, 2]
   */
  private static generateRow(startNum: number): number[] {
    const row: number[] = []
    let cur = startNum
    for (let i = 0; i < 7; i++) {
      row.push(cur)
      cur = cur === 7 ? 1 : cur + 1
    }
    return row
  }

  /**
   * คำนวณฐานหนุน (แถวที่ 5-9)
   * @param matrix ผังดวงที่มีแถว 0 ถึง rowIndex-1 อยู่แล้ว
   * @param rowIndex ดัชนีแถวที่กำลังคำนวณ (4=ฐานที่ 5 … 8=ฐานที่ 9)
   */
  public static calculateExtendedBase(matrix: FateMatrix, rowIndex: number): number[] {
    const row1 = matrix[0] // ฐานวัน
    const row2 = matrix[1] // ฐานเดือน
    const row3 = matrix[2] // ฐานปี
    const row4 = matrix[3] // ฐานกำลังพระเคราะห์

    return Array.from({ length: 7 }, (_, col) => {
      switch (rowIndex) {
        case 4: // ฐานที่ 5: ฐานอายตนะ / ฐานหนุนศุภโชค
          // สูตร: วัน + ปี → mod 7
          return mod7(row1[col] + row3[col])

        case 5: // ฐานที่ 6: ฐานดวงพริ้ง / ฐานโชคลาภ
          // สูตร: กำลังพระเคราะห์ (ฐาน 4) → mod 7
          return mod7(row4[col])

        case 6: // ฐานที่ 7: ฐานอินทภาส
          // สูตร: (เดือน × 2) + วัน → mod 7
          return mod7(row2[col] * 2 + row1[col])

        case 7: // ฐานที่ 8: ฐานบาทจันทร์
          // สูตร: (ฐาน 4 − ปี + 7) → mod 7  (บวก 7 ป้องกันค่าติดลบ)
          return mod7(row4[col] - row3[col] + 7)

        case 8: // ฐานที่ 9: ฐานโสฬส / กำลังรวมจุดพยากรณ์
          // สูตร: ฐาน 5 + ฐาน 6 + ฐาน 8 → mod 9
          // (ลดทอนด้วย 9 ตามสูตรคัมภีร์โสฬส)
          return mod9(matrix[4][col] + matrix[5][col] + matrix[7][col])

        default:
          return 0
      }
    })
  }
}
