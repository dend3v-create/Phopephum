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
  
  const b9Start = r7_local(b5First - 1);
  const b9 = Array.from({ length: 7 }, (_, i) => r7_local(b9Start + i * 2));

  return [b1, b2, b3, b4, b5, b6, b7, b8, b9];
}
