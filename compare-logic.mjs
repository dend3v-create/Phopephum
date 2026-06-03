
// Mocking the reference project logic for Feb 27, 2024, 07:17 AM

const LUNAR_MONTH_STARTS_REF = {
  "2024-1":"2024-01-11","2024-2":"2024-02-10","2024-3":"2024-03-10",
  "2024-5":"2024-05-08"
};

function getThaiBaseNumbers_Ref(dateStr, timeStr) {
  const parts = dateStr.split("-").map(Number);
  const [hy, hm, hd] = [parts[0], parts[1], parts[2]];
  let effectiveDate = new Date(hy, hm - 1, hd, 12, 0, 0);
  
  const [h, m] = timeStr.split(":").map(Number);
  if (h < 6) {
    effectiveDate = new Date(hy, hm - 1, hd - 1, 12, 0, 0);
  }
  
  const weekDay = effectiveDate.getDay(); // 0=Sun
  const dayNum = weekDay + 1;
  
  // Month lookup
  const dateMs = effectiveDate.getTime();
  const entries = [];
  for (const key in LUNAR_MONTH_STARTS_REF) {
    const [y, m] = key.split("-").map(Number);
    const startMs = new Date(LUNAR_MONTH_STARTS_REF[key] + "T00:00:00").getTime();
    entries.push({ month: m, startMs });
  }
  entries.sort((a, b) => a.startMs - b.startMs);
  let currentMonth = entries[0];
  for (const e of entries) {
    if (e.startMs <= dateMs) currentMonth = e;
  }
  const thaiMonth = currentMonth.month;
  const monthNum = thaiMonth > 7 ? thaiMonth - 7 : thaiMonth;
  
  // Year lookup (cutoff Month 5)
  const m5Start = new Date(LUNAR_MONTH_STARTS_REF["2024-5"] + "T00:00:00").getTime();
  let useThaiYear = hy + 543;
  if (dateMs < m5Start) {
    useThaiYear -= 1;
  }
  
  const zodiacIdx = ((useThaiYear - 2503) % 12 + 12) % 12;
  const zodiacNum_raw = zodiacIdx + 1;
  const yearNum = zodiacNum_raw > 7 ? zodiacNum_raw - 7 : zodiacNum_raw;
  
  return { dayNum, monthNum, yearNum, thaiMonth, useThaiYear };
}

// Current Project Logic (simulation)
const LUNAR_CALENDAR_JSON_V2 = {
  "2024-1": "2024-12-01", // WRONG
  "2024-2": "2024-12-30", // WRONG
  "2024-3": "2024-02-10", // CORRECT
  "2024-4": "2024-03-10"
};

function getThaiBaseNumbers_V2(dateStr, timeStr) {
  // Simulate phopephum-v2 logic
  const parts = dateStr.split("-").map(Number);
  const effectiveDate = new Date(dateStr + 'T12:00:00');
  const [h, mi] = timeStr.split(":").map(Number);
  if (h * 60 + mi < 361) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  }
  
  const weekDay = effectiveDate.getDay();
  const dayNum = [1, 2, 3, 4, 5, 6, 7][weekDay] || 1; // 0=Sun->1
  
  // Month lookup
  const dateMs = effectiveDate.getTime();
  const entries = [];
  for (const key in LUNAR_CALENDAR_JSON_V2) {
    const startMs = new Date(LUNAR_CALENDAR_JSON_V2[key] + "T00:00:00").getTime();
    entries.push({ month: parseInt(key.split("-")[1]), startMs });
  }
  entries.sort((a, b) => a.startMs - b.startMs);
  let current = entries[0];
  for (const e of entries) {
    if (e.startMs <= dateMs) current = e;
  }
  const thaiMonth = current.month;
  const monthNum = thaiMonth > 7 ? thaiMonth - 7 : thaiMonth;
  
  return { dayNum, monthNum, thaiMonth };
}

const testDate = "2024-02-27";
const testTime = "07:17";

const ref = getThaiBaseNumbers_Ref(testDate, testTime);
const v2 = getThaiBaseNumbers_V2(testDate, testTime);

console.log("--- Comparison for Feb 27, 2024 07:17 ---");
console.log("Reference (Perfect) System:");
console.log(`  Day Num: ${ref.dayNum}`);
console.log(`  Thai Month: ${ref.thaiMonth}`);
console.log(`  Month Num: ${ref.monthNum}`);
console.log(`  Year Num: ${ref.yearNum}`);
console.log(`  Thai Year: ${ref.useThaiYear}`);

console.log("\nCurrent V2 System:");
console.log(`  Day Num: ${v2.dayNum}`);
console.log(`  Thai Month: ${v2.thaiMonth}`);
console.log(`  Month Num: ${v2.monthNum}`);

if (ref.monthNum !== v2.monthNum) {
  console.log("\n!!! MONTH MISMATCH !!!");
}
