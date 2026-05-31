/**
 * Watch Data Utility
 * 
 * Handles all data related to "ยามอัฐกาล (กลางคืน)" - Night Watch Astrology
 * Provides methods to calculate current watch, get watch details, and manage watch information
 */

export interface TimeSlot {
  id: number;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
}

export interface WatchMeaning {
  id: number;
  name: string;
  descriptions: {
    beginning: string;
    middle: string;
    end: string;
  };
}

export interface DailyWatch {
  watchId: number;
  nameId: number;
  ticks: number; // 0 = not good, 1 = good, 2 = very good
}

export interface WatchData {
  title: string;
  timeSlots: TimeSlot[];
  meanings: Record<number, WatchMeaning>;
  table: Record<string, DailyWatch[]>;
}

// Raw watch data
const watchDatabase: WatchData = {
  title: "ยามอัฐกาล (กลางคืน)",
  timeSlots: [
    { id: 1, start: "18:01", end: "19:30", startMinutes: 18 * 60 + 1, endMinutes: 19 * 60 + 30 },
    { id: 2, start: "19:31", end: "21:00", startMinutes: 19 * 60 + 31, endMinutes: 21 * 60 },
    { id: 3, start: "21:01", end: "22:30", startMinutes: 21 * 60 + 1, endMinutes: 22 * 60 + 30 },
    { id: 4, start: "22:31", end: "24:00", startMinutes: 22 * 60 + 31, endMinutes: 24 * 60 },
    { id: 5, start: "00:01", end: "01:30", startMinutes: 1, endMinutes: 1 * 60 + 30 },
    { id: 6, start: "01:31", end: "03:00", startMinutes: 1 * 60 + 31, endMinutes: 3 * 60 },
    { id: 7, start: "03:01", end: "04:30", startMinutes: 3 * 60 + 1, endMinutes: 4 * 60 + 30 },
    { id: 8, start: "04:31", end: "06:00", startMinutes: 4 * 60 + 31, endMinutes: 6 * 60 },
  ],
  meanings: {
    1: {
      id: 1,
      name: "ระวิ",
      descriptions: {
        beginning: "ยามนี้มิได้ ลำบากยุ่งยาก",
        middle: "ยามนี้ดีเลิศ",
        end: "ยามนี้ติดขัด",
      },
    },
    2: {
      id: 2,
      name: "ศะศิ",
      descriptions: {
        beginning: "ยามนี้ร้อนรน",
        middle: "ยามนี้ดีมีชัย",
        end: "ยามนี้ดีนัก",
      },
    },
    3: {
      id: 3,
      name: "ภุมโม",
      descriptions: {
        beginning: "ยามนี้ช้าร้าย เจ็บไข้",
        middle: "ยามนี้ร้อนจิต",
        end: "ยามนี้ดีล้น",
      },
    },
    4: {
      id: 4,
      name: "พุโธ",
      descriptions: {
        beginning: "ยามนี้วิบัติ",
        middle: "ยามนี้สมมาตร สำเร็จ เด็ดขาด",
        end: "ยามนี้เหมาะสัญจร มีชัย",
      },
    },
    5: {
      id: 5,
      name: "ชีโว",
      descriptions: {
        beginning: "ยามนี้สุขา ลาภมี",
        middle: "ยามโศกเศร้า ทนทุกข์",
        end: "ยามนี้ฟังผล ทุกคนดูหมิ่นเสียมาก",
      },
    },
    6: {
      id: 6,
      name: "ศุกโร",
      descriptions: {
        beginning: "ยามนี้ไร้ค่า ผัวเมียนอกใจ ไม่ควรจากสถานที่",
        middle: "ยามนี้ กึ่งกัน",
        end: "ยามนี้มีลาภ",
      },
    },
    7: {
      id: 7,
      name: "โสโร",
      descriptions: {
        beginning: "ยามนี้อัปลักษณ์ ไม่มีสิ่งดี ระวังคนพาล",
        middle: "ยามนี้ดีไซร้ สวัสดิ์มีชัย",
        end: "ยามนี้เปรมปรีดิ์ แสนสุขสยาม ลาภผลพูนทวี",
      },
    },
  },
  table: {
    sunday: [
      { watchId: 1, nameId: 1, ticks: 1 },
      { watchId: 2, nameId: 5, ticks: 1 },
      { watchId: 3, nameId: 2, ticks: 1 },
      { watchId: 4, nameId: 6, ticks: 0 },
      { watchId: 5, nameId: 3, ticks: 1 },
      { watchId: 6, nameId: 7, ticks: 2 },
      { watchId: 7, nameId: 4, ticks: 2 },
      { watchId: 8, nameId: 1, ticks: 1 },
    ],
    monday: [
      { watchId: 1, nameId: 2, ticks: 1 },
      { watchId: 2, nameId: 6, ticks: 1 },
      { watchId: 3, nameId: 3, ticks: 1 },
      { watchId: 4, nameId: 7, ticks: 2 },
      { watchId: 5, nameId: 4, ticks: 2 },
      { watchId: 6, nameId: 1, ticks: 1 },
      { watchId: 7, nameId: 5, ticks: 1 },
      { watchId: 8, nameId: 2, ticks: 1 },
    ],
    tuesday: [
      { watchId: 1, nameId: 3, ticks: 1 },
      { watchId: 2, nameId: 7, ticks: 2 },
      { watchId: 3, nameId: 4, ticks: 2 },
      { watchId: 4, nameId: 1, ticks: 1 },
      { watchId: 5, nameId: 5, ticks: 1 },
      { watchId: 6, nameId: 2, ticks: 1 },
      { watchId: 7, nameId: 6, ticks: 1 },
      { watchId: 8, nameId: 3, ticks: 1 },
    ],
    wednesday: [
      { watchId: 1, nameId: 4, ticks: 2 },
      { watchId: 2, nameId: 1, ticks: 1 },
      { watchId: 3, nameId: 5, ticks: 1 },
      { watchId: 4, nameId: 2, ticks: 1 },
      { watchId: 5, nameId: 6, ticks: 1 },
      { watchId: 6, nameId: 3, ticks: 1 },
      { watchId: 7, nameId: 7, ticks: 2 },
      { watchId: 8, nameId: 4, ticks: 2 },
    ],
    thursday: [
      { watchId: 1, nameId: 5, ticks: 1 },
      { watchId: 2, nameId: 2, ticks: 1 },
      { watchId: 3, nameId: 6, ticks: 1 },
      { watchId: 4, nameId: 3, ticks: 1 },
      { watchId: 5, nameId: 7, ticks: 2 },
      { watchId: 6, nameId: 4, ticks: 2 },
      { watchId: 7, nameId: 1, ticks: 1 },
      { watchId: 8, nameId: 5, ticks: 1 },
    ],
    friday: [
      { watchId: 1, nameId: 6, ticks: 1 },
      { watchId: 2, nameId: 3, ticks: 1 },
      { watchId: 3, nameId: 7, ticks: 2 },
      { watchId: 4, nameId: 4, ticks: 2 },
      { watchId: 5, nameId: 1, ticks: 1 },
      { watchId: 6, nameId: 5, ticks: 1 },
      { watchId: 7, nameId: 2, ticks: 1 },
      { watchId: 8, nameId: 6, ticks: 1 },
    ],
    saturday: [
      { watchId: 1, nameId: 7, ticks: 2 },
      { watchId: 2, nameId: 4, ticks: 2 },
      { watchId: 3, nameId: 1, ticks: 1 },
      { watchId: 4, nameId: 5, ticks: 1 },
      { watchId: 5, nameId: 2, ticks: 1 },
      { watchId: 6, nameId: 6, ticks: 1 },
      { watchId: 7, nameId: 3, ticks: 1 },
      { watchId: 8, nameId: 7, ticks: 2 },
    ],
  },
};

/**
 * Get the day name in English
 */
export function getDayName(date: Date): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[date.getDay()];
}

/**
 * Get the day name in Thai
 */
export function getDayNameThai(date: Date): string {
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  return days[date.getDay()];
}

/**
 * Convert time string (HH:MM) to minutes
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current watch based on current time
 */
export function getCurrentWatch(date: Date = new Date()): DailyWatch | null {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const dayName = getDayName(date);
  const dayWatches = watchDatabase.table[dayName as keyof typeof watchDatabase.table];

  if (!dayWatches) return null;

  // Handle time ranges that cross midnight
  for (const watch of dayWatches) {
    const timeSlot = watchDatabase.timeSlots[watch.watchId - 1];
    if (!timeSlot) continue;

    // For slots that cross midnight (like 22:31 - 24:00 or 00:01 - 01:30)
    if (timeSlot.startMinutes > timeSlot.endMinutes) {
      // This slot crosses midnight
      if (currentMinutes >= timeSlot.startMinutes || currentMinutes <= timeSlot.endMinutes) {
        return watch;
      }
    } else {
      // Normal slot
      if (currentMinutes >= timeSlot.startMinutes && currentMinutes <= timeSlot.endMinutes) {
        return watch;
      }
    }
  }

  return null;
}

/**
 * Get watch details including meaning
 */
export function getWatchDetails(watch: DailyWatch) {
  const meaning = watchDatabase.meanings[watch.nameId];
  const timeSlot = watchDatabase.timeSlots[watch.watchId - 1];

  return {
    watch,
    meaning,
    timeSlot,
    quality: watch.ticks === 2 ? "excellent" : watch.ticks === 1 ? "good" : "neutral",
  };
}

/**
 * Get all watches for a specific day
 */
export function getWatchesForDay(dayName: string): DailyWatch[] {
  return watchDatabase.table[dayName as keyof typeof watchDatabase.table] || [];
}

/**
 * Get watch meaning description
 */
export function getWatchMeaning(nameId: number): WatchMeaning | null {
  return watchDatabase.meanings[nameId] || null;
}

/**
 * Get time slot information
 */
export function getTimeSlot(watchId: number): TimeSlot | null {
  return watchDatabase.timeSlots[watchId - 1] || null;
}

/**
 * Get all time slots
 */
export function getAllTimeSlots(): TimeSlot[] {
  return watchDatabase.timeSlots;
}

/**
 * Get all watch meanings
 */
export function getAllMeanings(): WatchMeaning[] {
  return Object.values(watchDatabase.meanings);
}

/**
 * Get the quality label for a watch
 */
export function getQualityLabel(ticks: number): string {
  switch (ticks) {
    case 2:
      return "ดีมาก";
    case 1:
      return "ดี";
    case 0:
      return "ติดขัด";
    default:
      return "ไม่ทราบ";
  }
}

/**
 * Get the quality color for a watch
 */
export function getQualityColor(ticks: number): string {
  switch (ticks) {
    case 2:
      return "text-green-400"; // Bright green for excellent
    case 1:
      return "text-yellow-400"; // Gold for good
    case 0:
      return "text-red-400"; // Red for neutral/bad
    default:
      return "text-gray-400";
  }
}

/**
 * Get the quality background color for a watch
 */
export function getQualityBgColor(ticks: number): string {
  switch (ticks) {
    case 2:
      return "bg-green-500/20";
    case 1:
      return "bg-yellow-500/20";
    case 0:
      return "bg-red-500/20";
    default:
      return "bg-gray-500/20";
  }
}

export default watchDatabase;
