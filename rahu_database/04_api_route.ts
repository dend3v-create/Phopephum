// ============================================================
// Next.js API Route: /api/rahu
// GET /api/rahu              → ใช้เวลาปัจจุบัน
// GET /api/rahu?time=14:25&day=1  → ระบุเวลา+วันเอง
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { calculateRahu } from '@/lib/rahu_database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeParam = searchParams.get('time');
    const dayParam  = searchParams.get('day');

    let targetDate: Date;

    if (timeParam) {
      const [h, m] = timeParam.split(':').map(Number);
      targetDate = new Date();
      targetDate.setHours(h, m, 0, 0);
      if (dayParam) {
        // adjust day of week (1=Sun...7=Sat → JS 0-6)
        const targetDay = parseInt(dayParam) - 1;
        const diff = targetDay - targetDate.getDay();
        targetDate.setDate(targetDate.getDate() + diff);
      }
    } else {
      targetDate = new Date();
    }

    const result = calculateRahu(targetDate);

    if (!result) {
      return NextResponse.json({ status: 'error', message: 'ไม่พบข้อมูลยาม' }, { status: 400 });
    }

    return NextResponse.json({ status: 'success', data: result });
  } catch (err) {
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 });
  }
}

// ── Example JSON Response ─────────────────────────────────────
/*
{
  "status": "success",
  "data": {
    "request_time": "14:25",
    "day_of_week": 1,
    "day_name": "อาทิตย์",
    "main_block": {
      "id": 6, "period_type": "กลางวัน", "slot_number": 6,
      "start_time": "13:30", "end_time": "15:00"
    },
    "sub_block": {
      "id": 6, "name": "กัลยาณ์",
      "minute_start": 50, "minute_end": 60,
      "is_good": true, "phase_indicator": null
    },
    "is_current_moment_good": false,
    "minutes_elapsed": 55,
    "yam_number": 5,
    "yam_rule": {
      "yam_number": 5, "yam_name": "ยามที่ ๕",
      "traibhum_result": "ดียามต้น",
      "huajai_truth": "ทุกเรื่อง ๕๐/๕๐",
      "huajai_lost_item": "ได้คืน ๕๐/๕๐",
      "huajai_health": "ถามป่วย/ควรเปลี่ยนหมอ",
      "good_phase_desc": "ดีช่วงยามต้น (นาที 0-10 เท่านั้น)"
    },
    "summary": {
      "phase": "ยามกลาง",
      "current_yam_name": "กัลยาณ์",
      "overall_verdict": "🔶 ยามนี้ดี แต่ไม่ใช่จุดสูงสุดของวัน",
      "advice": "ดีช่วงยามต้น (นาที 0-10 เท่านั้น)"
    }
  }
}
*/
