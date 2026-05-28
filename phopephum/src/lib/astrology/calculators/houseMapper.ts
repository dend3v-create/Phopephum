/**
 * calculators/houseMapper.ts
 * จับคู่พิกัดผังดวง (แถว × คอลัมน์) กับชื่อภพเรือน 21 ภพ
 *
 * ระบบภพ 3 แถว × 7 คอลัมน์ (เฉพาะฐาน 1-3):
 *   แถว 0: อัตตา  ตนุ   หินะ  ปิตา   มาตา  โภคา  มรณะ
 *   แถว 1: ตนุ   กดุมพะ สหัชชะ พันธุ  ปุตตะ อริ   ปัตนิ
 *   แถว 2: ศุภะ  กัมมะ  ลาภะ  พยายะ  ทาสา  ทาสี  ทาสี
 */

import { HouseDelineation, HouseLocation, FateMatrix } from '../types/fateMatrix'

export class HouseMapper {
  /**
   * ตารางชื่อภพ 3 แถว × 7 คอลัมน์
   * index [row][col] → ชื่อภพ
   */
  public static readonly THAI_7_THREE_ROWS_HOUSES: string[][] = [
    ['อัตตา', 'ตนุ',    'หินะ',    'ปิตา',   'มาตา', 'โภคา', 'มรณะ'],
    ['ตนุ',   'กดุมพะ', 'สหัชชะ',  'พันธุ',  'ปุตตะ','อริ',  'ปัตนิ'],
    ['ศุภะ',  'กัมมะ',  'ลาภะ',    'พยายะ',  'ทาสา', 'ทาสี', 'ทาสี'],
  ]

  /**
   * แปลงผังดวง 9×7 → รายการภพพร้อมตัวเลขดาว (เฉพาะ 3 แถวหลัก)
   * ใช้สำหรับแสดงผลบน Dashboard
   */
  public static mapMatrixToHouses(matrix: FateMatrix): HouseDelineation[] {
    const result: HouseDelineation[] = []
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 7; col++) {
        result.push({
          row: row + 1,
          col: col + 1,
          houseName: HouseMapper.THAI_7_THREE_ROWS_HOUSES[row][col],
          starNumber: matrix[row][col],
        })
      }
    }
    return result
  }

  /**
   * ค้นหาพิกัดทั้งหมดของภพที่ระบุในผัง 3 แถวหลัก
   * ใช้เป็น entry point ใน ClairvoyantEngine.analyzeDestinyFlow()
   */
  public static findHouseLocations(targetHouse: string): HouseLocation[] {
    const locations: HouseLocation[] = []
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        if (HouseMapper.THAI_7_THREE_ROWS_HOUSES[r][c] === targetHouse) {
          locations.push({ rowIdx: r, colIdx: c, houseName: targetHouse })
        }
      }
    }
    return locations
  }
}
