import { getThaiBaseNumbers } from "./packages/engine/src/core/lunarCalendar.js";

const testDate = "2024-02-27";
const testTime = "07:17";
const result = getThaiBaseNumbers(testDate, testTime);

console.log(`Date: ${testDate} ${testTime}`);
console.log(`Day Num (B1): ${result.dayNum} (วัน${result.dayName})`);
console.log(`Month Num (B2): ${result.monthNum} (เดือน${result.lunarMonthName})`);
console.log(`Year Num (B3): ${result.yearNum} (ปี${result.zodiacName})`);
console.log(`Thai Date: ${result.thaiDateText}`);
