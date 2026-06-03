import { getThaiBaseNumbers } from "./packages/engine/src/core/lunarCalendar.js";
import { r7 } from "./packages/engine/src/core/lunarCalendar.js";

function calculateMatrix(d, m, y) {
  const r7_local = (n) => ((n - 1) % 7 + 7) % 7 + 1;
  const genBase1to3 = (seed) => Array.from({ length: 7 }, (_, i) => r7_local(seed + i));
  const b1 = genBase1to3(d);
  const b2 = genBase1to3(m);
  const b3 = genBase1to3(y);
  const b4 = b1.map((v, i) => v + b2[i] + b3[i]);
  const b5 = b4.map(r7_local);
  return [b1, b2, b3, b4, b5];
}

const testDate = "2024-02-27";
const testTime = "07:17";
const result = getThaiBaseNumbers(testDate, testTime);

console.log(`Date: ${testDate} ${testTime}`);
console.log(`Thai Date: ${result.thaiDateText}`);
console.log(`Day Num (B1): ${result.dayNum}`);
console.log(`Month Num (B2): ${result.monthNum}`);
console.log(`Year Num (B3): ${result.yearNum}`);

const matrix = calculateMatrix(result.dayNum, result.monthNum, result.yearNum);
console.log("Matrix Row 1:", matrix[0].join(" "));
console.log("Matrix Row 2:", matrix[1].join(" "));
console.log("Matrix Row 3:", matrix[2].join(" "));
console.log("Matrix Row 4:", matrix[3].join(" "));
console.log("Matrix Row 5:", matrix[4].join(" "));
