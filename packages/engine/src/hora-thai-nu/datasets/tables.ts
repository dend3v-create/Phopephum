/**
 * tables.ts — Hora Thai Nu Static Datasets
 */

// Zodiac signs (Taurus=0, i.e. index 0 = House 1 in Hora Thai Nu)
export const HORA_NU_SIGNS = [
  { index: 0,  house: 1,  nameThai: 'พฤษภ',  nameEn: 'Taurus',      symbol: '♉', element: 'ดิน',  lord: 6  },
  { index: 1,  house: 2,  nameThai: 'เมถุน',  nameEn: 'Gemini',      symbol: '♊', element: 'ลม',   lord: 4  },
  { index: 2,  house: 3,  nameThai: 'กรกฎ',   nameEn: 'Cancer',      symbol: '♋', element: 'น้ำ',  lord: 2  },
  { index: 3,  house: 4,  nameThai: 'สิงห์',   nameEn: 'Leo',         symbol: '♌', element: 'ไฟ',   lord: 1  },
  { index: 4,  house: 5,  nameThai: 'กันย์',   nameEn: 'Virgo',       symbol: '♍', element: 'ดิน',  lord: 4  },
  { index: 5,  house: 6,  nameThai: 'ตุลย์',   nameEn: 'Libra',       symbol: '♎', element: 'ลม',   lord: 6  },
  { index: 6,  house: 7,  nameThai: 'พิจิก',   nameEn: 'Scorpio',     symbol: '♏', element: 'น้ำ',  lord: 3  },
  { index: 7,  house: 8,  nameThai: 'ธนู',    nameEn: 'Sagittarius', symbol: '♐', element: 'ไฟ',   lord: 5  },
  { index: 8,  house: 9,  nameThai: 'มังกร',  nameEn: 'Capricorn',   symbol: '♑', element: 'ดิน',  lord: 7  },
  { index: 9,  house: 10, nameThai: 'กุมภ์',   nameEn: 'Aquarius',    symbol: '♒', element: 'ลม',   lord: 7  },
  { index: 10, house: 11, nameThai: 'มีน',    nameEn: 'Pisces',      symbol: '♓', element: 'น้ำ',  lord: 5  },
  { index: 11, house: 12, nameThai: 'เมษ',    nameEn: 'Aries',       symbol: '♈', element: 'ไฟ',   lord: 3  },
] as const;

// House meanings
export const HORA_NU_HOUSES: Record<number, { name: string; keywords: string }> = {
  1:  { name: 'ลัคนา',   keywords: 'ตัวผู้ถาม, ร่างกาย' },
  2:  { name: 'กฎุมภะ',  keywords: 'ทรัพย์สิน, ของหาย' },
  3:  { name: 'ภาตุ',    keywords: 'พี่น้อง, ข่าวสาร' },
  4:  { name: 'พันธุ',   keywords: 'บ้าน, ครอบครัว' },
  5:  { name: 'ปุตตะ',   keywords: 'ลูกหลาน, บริวาร' },
  6:  { name: 'อริ',     keywords: 'ศัตรู, โรคภัย' },
  7:  { name: 'ปัตนิ',   keywords: 'คู่ครอง, หุ้นส่วน' },
  8:  { name: 'มรณะ',   keywords: 'วิกฤต, สูญเสีย' },
  9:  { name: 'ธรรม',   keywords: 'โชคลาภ, การเดินทาง' },
  10: { name: 'กรรม',   keywords: 'การงาน, ชื่อเสียง' },
  11: { name: 'ลาภ',    keywords: 'กำไร, รายได้' },
  12: { name: 'ศุภะ',   keywords: 'วิญญาณ, สิ่งซ่อนเร้น' },
};

// Planet info
export const HORA_NU_PLANETS: Record<number, { name: string; symbol: string; color: string; primary: number; secondary: number }> = {
  1: { name: 'อาทิตย์', symbol: '☉', color: '#EF4444', primary: 3,  secondary: -1 }, // Leo(house4=index3)
  2: { name: 'จันทร์',  symbol: '☽', color: '#FBBF24', primary: 2,  secondary: -1 }, // Cancer(house3=index2)
  3: { name: 'อังคาร',  symbol: '♂',  color: '#F97316', primary: 6,  secondary: 11 }, // Scorpio / Aries
  4: { name: 'พุธ',     symbol: '☿',  color: '#10B981', primary: 4,  secondary: 1  }, // Virgo / Gemini
  5: { name: 'พฤหัส',  symbol: '♃',  color: '#F59E0B', primary: 7,  secondary: 10 }, // Sagittarius / Pisces
  6: { name: 'ศุกร์',   symbol: '♀',  color: '#EC4899', primary: 0,  secondary: 5  }, // Taurus / Libra
  7: { name: 'เสาร์',   symbol: '♄',  color: '#8B5CF6', primary: 8,  secondary: 9  }, // Capricorn / Aquarius
};

// Planet dignity map: planet → zodiac indices where it has each status
// Using Taurus-first indexing (Taurus=0, Gemini=1, ..., Aries=11)
export const DIGNITY_MAP: Record<number, {
  kaset: number[];
  maha_uch: number[];
  neech: number[];
  pra: number[];
}> = {
  1: { kaset: [3],      maha_uch: [11],  neech: [5],    pra: [9]       }, // Sun
  2: { kaset: [2],      maha_uch: [0],   neech: [6],    pra: [8]       }, // Moon
  3: { kaset: [11, 6],  maha_uch: [8],   neech: [2],    pra: [5, 0]    }, // Mars
  4: { kaset: [1, 4],   maha_uch: [4],   neech: [10],   pra: [7, 10]   }, // Mercury
  5: { kaset: [7, 10],  maha_uch: [2],   neech: [8],    pra: [1, 4]    }, // Jupiter
  6: { kaset: [0, 5],   maha_uch: [10],  neech: [4],    pra: [11, 6]   }, // Venus
  7: { kaset: [8, 9],   maha_uch: [5],   neech: [11],   pra: [2, 3]    }, // Saturn
};

// Yam → direction mapping (yam 1=E going clockwise through compass)
// Geographic angles: 0=N, 90=E, 180=S, 270=W
export const YAM_DIRECTIONS: Record<number, { thai: string; abbr: string; geoAngle: number }> = {
  1: { thai: 'ตะวันออก',           abbr: 'ตอ.',  geoAngle: 90  }, // E
  2: { thai: 'อาคเนย์',            abbr: 'อคน.', geoAngle: 135 }, // SE
  3: { thai: 'ใต้',                abbr: 'ต.',   geoAngle: 180 }, // S
  4: { thai: 'หรดี',               abbr: 'หรด.', geoAngle: 225 }, // SW
  5: { thai: 'ตะวันตก',            abbr: 'ตต.',  geoAngle: 270 }, // W
  6: { thai: 'พายัพ',              abbr: 'พย.',  geoAngle: 315 }, // NW
  7: { thai: 'เหนือ',              abbr: 'น.',   geoAngle: 0   }, // N
  8: { thai: 'อีสาน',              abbr: 'อส.',  geoAngle: 45  }, // NE
};

// Compass directions for the 8 markers on the wheel
// svgAngle: degrees from TOP going CLOCKWISE (used in chart rendering)
// geoAngle 0=N → svgAngle 0 (top), geoAngle 90=E → svgAngle 90, etc.
export const COMPASS_8: Array<{ thai: string; abbr: string; geoAngle: number; svgAngle: number }> = [
  { thai: 'เหนือ',              abbr: 'น.',   geoAngle: 0,   svgAngle: 0   }, // N = top
  { thai: 'อีสาน',              abbr: 'อส.',  geoAngle: 45,  svgAngle: 45  }, // NE
  { thai: 'ตะวันออก',           abbr: 'ตอ.',  geoAngle: 90,  svgAngle: 90  }, // E = right
  { thai: 'อาคเนย์',            abbr: 'อคน.', geoAngle: 135, svgAngle: 135 }, // SE
  { thai: 'ใต้',                abbr: 'ต.',   geoAngle: 180, svgAngle: 180 }, // S = bottom
  { thai: 'หรดี',               abbr: 'หรด.', geoAngle: 225, svgAngle: 225 }, // SW
  { thai: 'ตะวันตก',            abbr: 'ตต.',  geoAngle: 270, svgAngle: 270 }, // W = left
  { thai: 'พายัพ',              abbr: 'พย.',  geoAngle: 315, svgAngle: 315 }, // NW
];

// Day names
export const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// Prediction text by planet + status
export const PREDICTIONS: Record<number, Record<string, string>> = {
  1: {
    KASET:     'พลังอาทิตย์ปกครอง — อำนาจ เกียรติยศ สง่าราศีสูงสุด เหมาะติดต่อผู้ใหญ่และขอความช่วยเหลือ',
    MAHA_UCH:  'อาทิตย์มหาอุจจ์ — ฤกษ์ดีที่สุดสำหรับงานใหญ่ การเริ่มต้นโครงการสำคัญ',
    RACHA_CHOK:'อาทิตย์ราชาโชค — โอกาสพิเศษมาถึง ของหายมักอยู่ในที่โล่งแจ้ง ทิศตะวันออก',
    NEUTRAL:   'อาทิตย์กลาง — สมดุลพอดี ดำเนินชีวิตได้ตามปกติ',
    PRA:       'อาทิตย์ประ — อำนาจถูกบั่นทอน ระวังการขัดแย้งกับผู้มีอำนาจ',
    NEECH:     'อาทิตย์นิจ — ดวงตกชั่วคราว หลีกเลี่ยงการตัดสินใจสำคัญและการเผชิญหน้า',
    MAHA_CHAK: 'อาทิตย์มหาจักร — วงจรพลังงานใหญ่ ช่วงเปลี่ยนผ่านสำคัญของชีวิต',
  },
  2: {
    KASET:     'จันทร์บ้านตัวเอง — อารมณ์ดี จิตใจสงบ เหมาะพบปะผู้คน ทำงานสร้างสรรค์ และค้าขาย',
    MAHA_UCH:  'จันทร์มหาอุจจ์ — โชคจากสตรี การเงินราบรื่น ของหายมักอยู่ในบ้านหรือใกล้น้ำ',
    RACHA_CHOK:'จันทร์ราชาโชค — สัญชาตญาณแหลมคม เหมาะทำนายและตัดสินใจด้วยใจ',
    NEUTRAL:   'จันทร์กลาง — อารมณ์ปกติ เรื่องทั่วไปดำเนินได้',
    PRA:       'จันทร์ประ — อารมณ์ผันผวน ระวังความเข้าใจผิดในความสัมพันธ์',
    NEECH:     'จันทร์นิจ — ฟุ้งซ่าน ระวังปัญหาครอบครัวและสุขภาพจิต งดตัดสินใจเรื่องเงิน',
    MAHA_CHAK: 'จันทร์มหาจักร — ความเปลี่ยนแปลงทางอารมณ์ครั้งใหญ่',
  },
  3: {
    KASET:     'อังคารบ้านตัวเอง — พลังงานสูง ความกล้าหาญ เหมาะการแข่งขัน ป้องกันตัว และตามหาของหาย',
    MAHA_UCH:  'อังคารมหาอุจจ์ — ชัยชนะเหนือศัตรู ของหายมักอยู่ทิศใต้ เหมาะฟ้องร้องคดีความ',
    RACHA_CHOK:'อังคารราชาโชค — ความกล้าได้ดี เหมาะงานที่ต้องใช้พลังและความเด็ดขาด',
    NEUTRAL:   'อังคารกลาง — พลังงานปานกลาง ระวังความรีบร้อน',
    PRA:       'อังคารประ — ความขัดแย้งสูง หลีกเลี่ยงการเผชิญหน้าและทะเลาะ',
    NEECH:     'อังคารนิจ — อันตราย อุบัติเหตุสูง ระมัดระวังอย่างยิ่ง งดเดินทางเสี่ยง',
    MAHA_CHAK: 'อังคารมหาจักร — วงจรพลังงานและความขัดแย้งครั้งใหญ่',
  },
  4: {
    KASET:     'พุธบ้านตัวเอง — ปัญญาเฉียบ การค้าและสัญญาดี เหมาะเจรจาธุรกิจ เซ็นสัญญา และหาข้อมูล',
    MAHA_UCH:  'พุธมหาอุจจ์ — ความฉลาดสูงสุด ของหายมักเกี่ยวกับเอกสาร เหมาะงานวิชาการ',
    RACHA_CHOK:'พุธราชาโชค — การสื่อสารโชคดี ข่าวดีจะมาถึง',
    NEUTRAL:   'พุธกลาง — ความคิดปกติ ดำเนินกิจการได้',
    PRA:       'พุธประ — การสื่อสารผิดพลาด ตรวจสอบสัญญาและข้อมูลซ้ำก่อนลงนาม',
    NEECH:     'พุธนิจ — ความคิดสับสน ระวังการโกงและข้อมูลเท็จ',
    MAHA_CHAK: 'พุธมหาจักร — การเปลี่ยนแปลงทางความคิดและการสื่อสารครั้งใหญ่',
  },
  5: {
    KASET:     'พฤหัสบ้านตัวเอง — โชคลาภ ความเจริญ บุญบารมี เหมาะลงทุน ขยายกิจการ และขอพร',
    MAHA_UCH:  'พฤหัสมหาอุจจ์ — โชคดีสูงสุด เหมาะเริ่มกิจการใหม่ ลงทุนสำคัญ',
    RACHA_CHOK:'พฤหัสราชาโชค — พรพิเศษจากสวรรค์ โอกาสทองกำลังมาถึง',
    NEUTRAL:   'พฤหัสกลาง — โชคปกติ ดำเนินการตามแผน',
    PRA:       'พฤหัสประ — โอกาสน้อยลง รอเวลาที่เหมาะสมกว่า',
    NEECH:     'พฤหัสนิจ — โชคถูกบั่นทอน ระวังการลงทุนและการหลอกลวงทางศาสนา',
    MAHA_CHAK: 'พฤหัสมหาจักร — วงจรโชคลาภและการขยายตัวครั้งใหญ่',
  },
  6: {
    KASET:     'ศุกร์บ้านตัวเอง — เสน่ห์ดึงดูด ความรักราบรื่น โชคทรัพย์ เหมาะงานศิลปะและพบปะเพื่อน',
    MAHA_UCH:  'ศุกร์มหาอุจจ์ — เสน่ห์สูงสุด เหมาะติดต่อธุรกิจ งานสร้างสรรค์',
    RACHA_CHOK:'ศุกร์ราชาโชค — ความสัมพันธ์พิเศษ โชคลาภจากเพื่อน',
    NEUTRAL:   'ศุกร์กลาง — ความสัมพันธ์ปกติ',
    PRA:       'ศุกร์ประ — เสน่ห์ลดลง หลีกเลี่ยงการทะเลาะกับคนรัก',
    NEECH:     'ศุกร์นิจ — ความสัมพันธ์ตึงเครียด ระวังการทรยศและปัญหาเงิน',
    MAHA_CHAK: 'ศุกร์มหาจักร — การเปลี่ยนแปลงความสัมพันธ์ครั้งสำคัญ',
  },
  7: {
    KASET:     'เสาร์บ้านตัวเอง — ความมั่นคง วินัย อดทน เหมาะงานระยะยาว การสร้างฐานที่มั่น',
    MAHA_UCH:  'เสาร์มหาอุจจ์ — ความยุติธรรมสูงสุด เหมาะทำสัญญาและตัดสินคดีความ',
    RACHA_CHOK:'เสาร์ราชาโชค — ความมั่นคงพิเศษ โชคจากความอดทนและความขยัน',
    NEUTRAL:   'เสาร์กลาง — ความก้าวหน้าช้าแต่มั่นคง',
    PRA:       'เสาร์ประ — ความล่าช้า อุปสรรค อดทนรอเวลาที่ดีกว่า',
    NEECH:     'เสาร์นิจ — ดวงตกหนัก ระวังเรื่องกฎหมาย อุบัติเหตุ และการสูญเสีย',
    MAHA_CHAK: 'เสาร์มหาจักร — วงจรการเปลี่ยนแปลงโครงสร้างชีวิตครั้งใหญ่',
  },
};
