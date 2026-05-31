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

import { AstroBaseNumbers, FateMatrix } from '../types/fateMatrix.js'

/** Circular reduce to 1-7 (หารลงตัว → 7, รองรับค่าลบ) */
function r7(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1
}

/** legacy alias */
const mod7 = r7

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

    // ลำดับเลขยามกลางวัน (1->6->4->2->7->5->3)
    const yamForward = [1, 6, 4, 2, 7, 5, 3];
    // ลำดับเลขยามกลางวันทวนกลับ (3->5->7->2->4->6->1)
    const yamBackward = [3, 5, 7, 2, 4, 6, 1];

    return Array.from({ length: 7 }, (_, col) => {
      switch (rowIndex) {
        case 4: // ฐานที่ 5: ลดทอน ฐาน 4 → mod 7
          return r7(row4[col])

        case 5: // ฐานที่ 6: ฐาน 5 × 2
          return r7((matrix[4]?.[col] ?? 1) * 2)

        case 6: // ฐานที่ 7: ฐาน 6 × 2
          return r7((matrix[5]?.[col] ?? 1) * 2)

        case 7: { // ฐานที่ 8 (อาตมะ / เดินยามหน้า)
          // นำ "ตัวเลขตัวแรกสุดของฐานที่ 5" มาวางในช่องแรก
          const startNum = matrix[4]?.[0] ?? 1;
          const startIndex = yamForward.indexOf(startNum);
          // เดินหน้าตามลำดับยามกลางวัน
          return yamForward[(startIndex + col) % 7];
        }

        case 8: { // ฐานที่ 9 (ภริยัง / เดินยามทวนกลับ)
          // นำ "ตัวเลขตัวสุดท้ายของฐานที่ 5" มาบวกกับ "ตัวเลขตัวสุดท้ายของฐานที่ 8"
          const lastBase5 = matrix[4]?.[6] ?? 1;
          const lastBase8 = matrix[7]?.[6] ?? 1;
          const startNum = r7(lastBase5 + lastBase8); // ลบด้วย 7 จนกว่าจะเหลือ 1-7
          
          const startIndex = yamBackward.indexOf(startNum);
          // วางในช่องสุดท้ายทางขวามือ (ภริยัง) แล้วเดินถอยหลังจากขวามาซ้าย
          // ซึ่งก็คือจากช่องแรก (col=0) ไปยังช่องสุดท้าย (col=6) จะเป็นการเดินย้อนทางของ array yamBackward
          // แต่เพื่อให้ช่องสุดท้าย (col=6) เป็น startNum เราจะคำนวณ index แบบนี้:
          // ค่าที่ col = 6 คือ startNum (index ใน yamBackward = startIndex)
          // ค่าที่ col = 5 คือ ตัวถัดไปใน yamBackward (startIndex + 1)
          // ดังนั้นที่ col ใดๆ คือ (startIndex + (6 - col)) % 7
          return yamBackward[(startIndex + (6 - col)) % 7];
        }

        default:
          return 0
      }
    })
  }
}
