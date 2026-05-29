import * as fs from 'fs';
import * as path from 'path';

const START_YEAR = 2450;
const END_YEAR = 2590; 
const OUTPUT_FILE = path.join(process.cwd(), 'packages/engine/src/datasets/thaiLunarCalendar.json');

const THAI_MONTH_TO_NUM: Record<string, string> = {
  'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04',
  'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08',
  'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12',
};

const LUNAR_MONTH_TO_NUM: Record<string, string> = {
  'อ้าย': '1', 'ยี่': '2', 'สาม': '3', 'สี่': '4',
  'ห้า': '5', 'หก': '6', 'เจ็ด': '7', 'แปด': '8',
  'แปดหนแรก': '8', 'แปดแรก': '8', 'แปดก่อน': '8',
  'แปดหลัง': '88', 'แปดหนหลัง': '88', // 88 for Adhikamasa (leap month)
  'เก้า': '9', 'สิบ': '10', 'สิบเอ็ด': '11', 'สิบสอง': '12',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeYear(year: number): Promise<Record<string, string>> {
  const url = `https://myhora.com/calendar/thai-${year}.aspx`;
  console.log(`[${year}] Fetching ${url}...`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const html = await res.text();
    const results: Record<string, string> = {};
    const ceYear = year - 543;
    
    // Regex to match the exact string format from myhora
    // e.g. title='ปฏิทิน วันอาทิตย์ ที่ 22 มกราคม พ.ศ.2566/2023 ตรงกับ วันขึ้น ๑ ค่ำ เดือนสาม (๓) ปีขาล'
    const regex = /title='ปฏิทิน วัน.*? ที่ (\d{1,2}) (มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม) พ\.ศ\.(\d{4}).*? ตรงกับ วันขึ้น ๑ ค่ำ เดือน(.*?) \(/g;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
      const day = match[1].padStart(2, '0');
      const monthThaiName = match[2];
      const monthNum = THAI_MONTH_TO_NUM[monthThaiName];
      // match[3] is the Thai Year, but we use the CE year based on the request (or parse from the string if we want exact year)
      // Actually myhora shows พ.ศ.2566/2023, let's just compute the CE year from the matched พ.ศ. to be safe
      const matchedYearCE = parseInt(match[3]) - 543; 
      const lunarName = match[4].trim();
      
      const lunarNum = LUNAR_MONTH_TO_NUM[lunarName];
      
      if (!lunarNum) {
        console.warn(`[${year}] Unknown lunar month name: ${lunarName}`);
        continue;
      }
      
      const key = `${matchedYearCE}-${lunarNum}`;
      const isoDate = `${matchedYearCE}-${monthNum}-${day}`;
      
      results[key] = isoDate;
    }
    
    console.log(`[${year}] Found ${Object.keys(results).length} lunar months.`);
    return results;
  } catch (err) {
    console.error(`[${year}] Error:`, err);
    return {};
  }
}

async function main() {
  console.log(`Starting scrape for years ${START_YEAR} to ${END_YEAR}...`);
  
  const allData: Record<string, string> = {};
  
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      Object.assign(allData, existing);
    } catch (e) {}
  }

  for (let y = START_YEAR; y <= END_YEAR; y++) {
    const data = await scrapeYear(y);
    Object.assign(allData, data);
    
    // Sort keys before writing for neatness (by year and month)
    const sortedData: Record<string, string> = {};
    Object.keys(allData).sort((a, b) => {
      const [ya, ma] = a.split('-').map(Number);
      const [yb, mb] = b.split('-').map(Number);
      if (ya !== yb) return ya - yb;
      return ma - mb;
    }).forEach(k => {
      sortedData[k] = allData[k];
    });
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedData, null, 2));
    
    if (y < END_YEAR) {
      await sleep(1000); // 1 sec delay to avoid rate limit
    }
  }
  
  console.log('Done!');
}

main();
