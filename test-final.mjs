import { getThaiBaseNumbers } from "./packages/engine/src/core/lunarCalendar.js";

const testDate = "2024-02-27";
const testTime = "07:17";

try {
  const result = getThaiBaseNumbers(testDate, testTime);
  console.log("--- New Result for Feb 27, 2024 07:17 ---");
  console.log(`  Day Num: ${result.dayNum}`);
  console.log(`  Thai Month: ${result.lunarMonth}`);
  console.log(`  Month Num: ${result.monthNum}`);
  console.log(`  Year Num: ${result.yearNum}`);
  console.log(`  Thai Year: ${result.thaiYear}`);
  console.log(`  Thai Date Text: ${result.thaiDateText}`);
} catch (e) {
  console.error("Error running test:", e);
}
