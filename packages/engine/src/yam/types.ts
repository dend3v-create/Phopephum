export interface YamResult {
  yamNumber: number;        // 1–8
  yamName: string;          // ยามที่ N
  planet: string;           // ดาวปกครอง
  element: string;          // ธาตุ
  quality: string;          // คุณภาพ: มงคล/อัปมงคล/กลาง
  prediction: string;       // คำทำนาย
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
  isCurrentYam: boolean;
}
