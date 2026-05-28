/**
 * provinces.ts — ข้อมูลจังหวัดไทย 77 จังหวัด
 * พร้อมพิกัดละติจูด/ลองจิจูด และภาค
 */

export interface ProvinceInfo {
  name: string;
  lat: number;
  lng: number;
  region: "กลาง" | "เหนือ" | "อีสาน" | "ตะวันออก" | "ตะวันตก" | "ใต้";
  timezone: "Asia/Bangkok"; // ทุกจังหวัดใช้ UTC+7
}

export const PROVINCES: ProvinceInfo[] = [
  // ── กรุงเทพฯ และปริมณฑล ──────────────────────────────────────────────────
  { name: "กรุงเทพมหานคร",     lat: 13.7563,  lng: 100.5018, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "นนทบุรี",           lat: 13.8622,  lng: 100.5149, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "ปทุมธานี",          lat: 14.0208,  lng: 100.5251, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "สมุทรปราการ",       lat: 13.5990,  lng: 100.5998, region: "กลาง", timezone: "Asia/Bangkok" },
  // ── ภาคกลาง ──────────────────────────────────────────────────────────────
  { name: "พระนครศรีอยุธยา",   lat: 14.3692,  lng: 100.5877, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "สระบุรี",           lat: 14.5289,  lng: 100.9104, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "ลพบุรี",            lat: 14.7995,  lng: 100.6534, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "สิงห์บุรี",         lat: 14.8906,  lng: 100.3966, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "อ่างทอง",           lat: 14.5896,  lng: 100.4549, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "ชัยนาท",            lat: 15.1851,  lng: 100.1253, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "นครสวรรค์",         lat: 15.7030,  lng: 100.1369, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "อุทัยธานี",         lat: 15.3835,  lng: 100.0255, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "สุพรรณบุรี",        lat: 14.4744,  lng: 100.1178, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "นครปฐม",            lat: 13.8199,  lng: 100.0650, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "สมุทรสาคร",         lat: 13.5475,  lng: 100.2747, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "สมุทรสงคราม",       lat: 13.4098,  lng: 100.0022, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "ราชบุรี",           lat: 13.5360,  lng:  99.8173, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "กาญจนบุรี",         lat: 14.0023,  lng:  99.5476, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "นครนายก",           lat: 14.2069,  lng: 101.2130, region: "กลาง", timezone: "Asia/Bangkok" },
  { name: "ฉะเชิงเทรา",        lat: 13.6904,  lng: 101.0779, region: "กลาง", timezone: "Asia/Bangkok" },
  // ── ภาคตะวันออก ──────────────────────────────────────────────────────────
  { name: "ชลบุรี",            lat: 13.3611,  lng: 100.9817, region: "ตะวันออก", timezone: "Asia/Bangkok" },
  { name: "ระยอง",             lat: 12.6812,  lng: 101.2816, region: "ตะวันออก", timezone: "Asia/Bangkok" },
  { name: "จันทบุรี",          lat: 12.6101,  lng: 102.1038, region: "ตะวันออก", timezone: "Asia/Bangkok" },
  { name: "ตราด",              lat: 12.2427,  lng: 102.5175, region: "ตะวันออก", timezone: "Asia/Bangkok" },
  { name: "ปราจีนบุรี",        lat: 14.0500,  lng: 101.3700, region: "ตะวันออก", timezone: "Asia/Bangkok" },
  { name: "สระแก้ว",           lat: 13.8212,  lng: 102.0659, region: "ตะวันออก", timezone: "Asia/Bangkok" },
  // ── ภาคตะวันตก ──────────────────────────────────────────────────────────
  { name: "ตาก",               lat: 16.8798,  lng:  99.1258, region: "ตะวันตก", timezone: "Asia/Bangkok" },
  { name: "เพชรบุรี",          lat: 13.1119,  lng:  99.9388, region: "ตะวันตก", timezone: "Asia/Bangkok" },
  { name: "ประจวบคีรีขันธ์",   lat: 11.8126,  lng:  99.7970, region: "ตะวันตก", timezone: "Asia/Bangkok" },
  // ── ภาคเหนือ ─────────────────────────────────────────────────────────────
  { name: "เชียงใหม่",         lat: 18.7883,  lng:  98.9853, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "เชียงราย",          lat: 19.9105,  lng:  99.8406, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "แม่ฮ่องสอน",        lat: 19.2988,  lng:  97.9638, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "ลำพูน",             lat: 18.5745,  lng:  99.0087, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "ลำปาง",             lat: 18.2888,  lng:  99.4927, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "พะเยา",             lat: 19.2154,  lng:  99.8868, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "แพร่",              lat: 18.1445,  lng: 100.1403, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "น่าน",              lat: 18.7747,  lng: 100.7730, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "อุตรดิตถ์",         lat: 17.6200,  lng: 100.0993, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "สุโขทัย",           lat: 17.0069,  lng:  99.8267, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "พิษณุโลก",          lat: 16.8198,  lng: 100.2654, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "พิจิตร",            lat: 16.4406,  lng: 100.3488, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "กำแพงเพชร",         lat: 16.4827,  lng:  99.5228, region: "เหนือ", timezone: "Asia/Bangkok" },
  { name: "เพชรบูรณ์",         lat: 16.4192,  lng: 101.1555, region: "เหนือ", timezone: "Asia/Bangkok" },
  // ── ภาคตะวันออกเฉียงเหนือ ────────────────────────────────────────────────
  { name: "นครราชสีมา",        lat: 14.9799,  lng: 102.0978, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "บุรีรัมย์",         lat: 14.9931,  lng: 103.1029, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "สุรินทร์",          lat: 14.8824,  lng: 103.4937, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "ศรีสะเกษ",          lat: 15.1186,  lng: 104.3221, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "อุบลราชธานี",       lat: 15.2448,  lng: 104.8473, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "ยโสธร",             lat: 15.7922,  lng: 104.1455, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "อำนาจเจริญ",        lat: 15.8656,  lng: 104.6257, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "มุกดาหาร",          lat: 16.5427,  lng: 104.7236, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "นครพนม",            lat: 17.3920,  lng: 104.7734, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "สกลนคร",            lat: 17.1664,  lng: 104.1486, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "กาฬสินธุ์",         lat: 16.4314,  lng: 103.5060, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "มหาสารคาม",         lat: 16.1851,  lng: 103.3002, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "ร้อยเอ็ด",          lat: 16.0538,  lng: 103.6522, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "ขอนแก่น",           lat: 16.4419,  lng: 102.8360, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "ชัยภูมิ",           lat: 15.8068,  lng: 102.0317, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "อุดรธานี",          lat: 17.3647,  lng: 102.8158, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "หนองบัวลำภู",       lat: 17.2218,  lng: 102.4260, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "เลย",               lat: 17.4860,  lng: 101.7223, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "หนองคาย",           lat: 17.8783,  lng: 102.7413, region: "อีสาน", timezone: "Asia/Bangkok" },
  { name: "บึงกาฬ",            lat: 18.3609,  lng: 103.6561, region: "อีสาน", timezone: "Asia/Bangkok" },
  // ── ภาคใต้ ───────────────────────────────────────────────────────────────
  { name: "ชุมพร",             lat: 10.4930,  lng:  99.1800, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "ระนอง",             lat:  9.9529,  lng:  98.6085, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "สุราษฎร์ธานี",      lat:  9.1382,  lng:  99.3214, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "นครศรีธรรมราช",     lat:  8.4322,  lng:  99.9628, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "กระบี่",            lat:  8.0863,  lng:  98.9063, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "พังงา",             lat:  8.4512,  lng:  98.5252, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "ภูเก็ต",            lat:  7.8804,  lng:  98.3923, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "ตรัง",              lat:  7.5593,  lng:  99.6116, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "พัทลุง",            lat:  7.6173,  lng: 100.0742, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "สงขลา",             lat:  7.1893,  lng: 100.5953, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "สตูล",              lat:  6.6238,  lng: 100.0673, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "ปัตตานี",           lat:  6.8688,  lng: 101.2498, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "ยะลา",              lat:  6.5415,  lng: 101.2806, region: "ใต้", timezone: "Asia/Bangkok" },
  { name: "นราธิวาส",          lat:  6.4255,  lng: 101.8253, region: "ใต้", timezone: "Asia/Bangkok" },
];

/** ค้นหาจังหวัดจากชื่อ (fuzzy match) */
export function findProvince(name: string): ProvinceInfo | undefined {
  const clean = name.trim();
  return PROVINCES.find(p =>
    p.name === clean ||
    p.name.includes(clean) ||
    clean.includes(p.name)
  );
}

/** ค้นหาจังหวัดจากชื่อ (strict match, fallback to กรุงเทพ) */
export function getProvinceOrDefault(name?: string): ProvinceInfo {
  if (!name) return PROVINCES[0]; // กรุงเทพมหานคร
  return findProvince(name) ?? PROVINCES[0];
}
