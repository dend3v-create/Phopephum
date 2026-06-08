import { r7_local } from "../engine/seven-numbers-v2.js";

/**
 * Nine Base Calculator (v3.1)
 * Calculates the full 9-row matrix.
 */
export function calculateNineBase(
  b1: number[],
  b2: number[],
  b3: number[]
) {
  const b4 = b1.map((v, i) => v + b2[i] + b3[i]);
  const b5 = b4.map(r7_local);
  const b6 = b5.map((v) => r7_local(v * 2));
  const b7 = b6.map((v) => r7_local(v * 2));
  
  const b5First = b5[0]!;
  const b8 = Array.from({ length: 7 }, (_, i) => r7_local(b5First - i * 2));
  
  // ฐานที่ 9 (ภริยัง): ตัวสุดท้ายคือ (ตัวสุดท้ายฐาน 5 + ตัวสุดท้ายฐาน 8) mod 7
  // จากนั้นเดินหน้าด้วย +2 (หรือเดินถอยหลังจากขวาด้วยลำดับยาม)
  const b9Last = r7_local(b5[6]! + b8[6]!);
  const b9Start = r7_local(b9Last + 2); // b9_0 = (b9_6 + 12) mod 7 = (b9_6 - 2) mod 7 ... wait. 
  // If b9[6] = b9[0] + 12, then b9[0] = b9[6] - 12 = b9[6] + 2.
  const b9 = Array.from({ length: 7 }, (_, i) => r7_local(b9Start + i * 2));

  return [b1, b2, b3, b4, b5, b6, b7, b8, b9];
}
