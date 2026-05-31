// ============================================================
// ยามราหูค้นทรัพย์ (Raahu Treasure Hunt Time)
// ============================================================

export interface RahuTimeBlock {
  id: number;
  period_type: 'กลางวัน' | 'กลางคืน';
  slot_number: number;
  start_time: string;
  end_time: string;
}

export interface RahuSubBlock {
  id: number;
  name: string;
  minute_start: number;
  minute_end: number;
  is_good: boolean;
  phase_indicator: 'ยามต้น' | 'ยามกลาง' | 'ยามปลาย' | null;
}

export interface RahuYamRule {
  yam_number: number;
  yam_name: string;
  traibhum_result: string;
  huajai_truth: string;
  huajai_lost_item: string;
  huajai_health: string;
  good_phase_desc: string;
}

export interface RahuYamMatrix {
  id: number;
  day_of_week: number;
  time_block_id: number;
  yam_number: number;
}

export interface RahuResult {
  request_time: string;
  day_of_week: number;
  day_name: string;
  main_block: RahuTimeBlock;
  sub_block: RahuSubBlock;
  is_current_moment_good: boolean;
  minutes_elapsed: number;
  yam_number: number;
  yam_rule: RahuYamRule;
  summary: {
    phase: string;
    current_yam_name: string;
    overall_verdict: string;
    advice: string;
  };
}

// ── CONSTANTS ──────────────────────────────────────────────

export const RAHU_TIME_BLOCKS: RahuTimeBlock[] = [
  { id: 1,  period_type: 'กลางวัน', slot_number: 1, start_time: '06:00', end_time: '07:30' },
  { id: 2,  period_type: 'กลางวัน', slot_number: 2, start_time: '07:30', end_time: '09:00' },
  { id: 3,  period_type: 'กลางวัน', slot_number: 3, start_time: '09:00', end_time: '10:30' },
  { id: 4,  period_type: 'กลางวัน', slot_number: 4, start_time: '10:30', end_time: '12:00' },
  { id: 5,  period_type: 'กลางวัน', slot_number: 5, start_time: '12:00', end_time: '13:30' },
  { id: 6,  period_type: 'กลางวัน', slot_number: 6, start_time: '13:30', end_time: '15:00' },
  { id: 7,  period_type: 'กลางวัน', slot_number: 7, start_time: '15:00', end_time: '16:30' },
  { id: 8,  period_type: 'กลางวัน', slot_number: 8, start_time: '16:30', end_time: '18:00' },
  { id: 9,  period_type: 'กลางคืน', slot_number: 1, start_time: '18:00', end_time: '19:30' },
  { id: 10, period_type: 'กลางคืน', slot_number: 2, start_time: '19:30', end_time: '21:00' },
  { id: 11, period_type: 'กลางคืน', slot_number: 3, start_time: '21:00', end_time: '22:30' },
  { id: 12, period_type: 'กลางคืน', slot_number: 4, start_time: '22:30', end_time: '00:00' },
  { id: 13, period_type: 'กลางคืน', slot_number: 5, start_time: '00:00', end_time: '01:30' },
  { id: 14, period_type: 'กลางคืน', slot_number: 6, start_time: '01:30', end_time: '03:00' },
  { id: 15, period_type: 'กลางคืน', slot_number: 7, start_time: '03:00', end_time: '04:30' },
  { id: 16, period_type: 'กลางคืน', slot_number: 8, start_time: '04:30', end_time: '06:00' },
];

export const RAHU_SUB_BLOCKS: RahuSubBlock[] = [
  { id: 1, name: 'ทาษา',       minute_start: 0,  minute_end: 10, is_good: false, phase_indicator: 'ยามต้น' },
  { id: 2, name: 'คหปติ',     minute_start: 10, minute_end: 20, is_good: true,  phase_indicator: null },
  { id: 3, name: 'โจโร',      minute_start: 20, minute_end: 30, is_good: false, phase_indicator: null },
  { id: 4, name: 'เสนาปติ',   minute_start: 30, minute_end: 40, is_good: true,  phase_indicator: 'ยามกลาง' },
  { id: 5, name: 'กาลทัณฑ์',  minute_start: 40, minute_end: 50, is_good: false, phase_indicator: null },
  { id: 6, name: 'กัลยาณ์',   minute_start: 50, minute_end: 60, is_good: true,  phase_indicator: null },
  { id: 7, name: 'มหายักษ์',  minute_start: 60, minute_end: 70, is_good: false, phase_indicator: 'ยามปลาย' },
  { id: 8, name: 'ธนบดินทร์', minute_start: 70, minute_end: 80, is_good: true,  phase_indicator: null },
  { id: 9, name: 'นักพรต',    minute_start: 80, minute_end: 90, is_good: true,  phase_indicator: null },
];

export const RAHU_YAM_RULES: RahuYamRule[] = [
  {
    yam_number: 1, yam_name: 'ยามที่ ๑',
    traibhum_result: 'ดียามกลาง',
    huajai_truth: 'พูดจริง เชื่อถือได้',
    huajai_lost_item: 'ของหายได้คืน',
    huajai_health: 'ถามป่วย/ตาย',
    good_phase_desc: 'ดีช่วงยามกลาง (นาที 30-40)'
  },
  {
    yam_number: 2, yam_name: 'ยามที่ ๒',
    traibhum_result: 'ดียามกลาง',
    huajai_truth: 'ทุกเรื่อง ๕๐/๕๐',
    huajai_lost_item: 'ได้คืน ๕๐/๕๐',
    huajai_health: 'ถามป่วย/ควรเปลี่ยนหมอ',
    good_phase_desc: 'ดีช่วงยามกลาง (นาที 30-40)'
  },
  {
    yam_number: 3, yam_name: 'ยามที่ ๓',
    traibhum_result: 'ดียามปลาย',
    huajai_truth: 'พูดเท็จ เชื่อถือไม่ได้',
    huajai_lost_item: 'ของหายไม่ได้คืน',
    huajai_health: 'ถามป่วย/หาย',
    good_phase_desc: 'ดีช่วงยามปลาย (นาที 60-90)'
  },
  {
    yam_number: 4, yam_name: 'ยามที่ ๔',
    traibhum_result: 'ดียามกลาง+ยามปลาย',
    huajai_truth: 'พูดจริง เชื่อถือได้',
    huajai_lost_item: 'ของหายได้คืน',
    huajai_health: 'ถามป่วย/ตาย',
    good_phase_desc: 'ดีช่วงยามกลาง+ปลาย (นาที 30-40, 50-60, 70-90)'
  },
  {
    yam_number: 5, yam_name: 'ยามที่ ๕',
    traibhum_result: 'ดียามต้น',
    huajai_truth: 'ทุกเรื่อง ๕๐/๕๐',
    huajai_lost_item: 'ได้คืน ๕๐/๕๐',
    huajai_health: 'ถามป่วย/ควรเปลี่ยนหมอ',
    good_phase_desc: 'ดีช่วงยามต้น (นาที 0-10 เท่านั้น)'
  },
  {
    yam_number: 6, yam_name: 'ยามที่ ๖',
    traibhum_result: 'ดียามปลาย',
    huajai_truth: 'พูดเท็จ เชื่อถือไม่ได้',
    huajai_lost_item: 'ของหายไม่ได้คืน',
    huajai_health: 'ถามป่วย/หาย',
    good_phase_desc: 'ดีช่วงยามปลาย (นาที 60-90)'
  },
  {
    yam_number: 7, yam_name: 'ยามที่ ๗',
    traibhum_result: 'ดียามกลาง+ยามปลาย',
    huajai_truth: 'พูดจริง เชื่อถือได้',
    huajai_lost_item: 'ของหายได้คืน',
    huajai_health: 'ถามป่วย/ตาย',
    good_phase_desc: 'ดีช่วงยามกลาง+ปลาย (นาที 30-40, 50-60, 70-90)'
  },
];

const _raw: [number, number, number][] = [
  // อาทิตย์ กลางวัน
  [1,1,1],[1,2,6],[1,3,4],[1,4,2],[1,5,7],[1,6,5],[1,7,3],[1,8,1],
  // อาทิตย์ กลางคืน
  [1,9,1],[1,10,5],[1,11,2],[1,12,6],[1,13,3],[1,14,7],[1,15,4],[1,16,1],
  // จันทร์ กลางวัน
  [2,1,2],[2,2,7],[2,3,5],[2,4,3],[2,5,1],[2,6,6],[2,7,4],[2,8,2],
  // จันทร์ กลางคืน
  [2,9,2],[2,10,6],[2,11,3],[2,12,7],[2,13,4],[2,14,1],[2,15,5],[2,16,2],
  // อังคาร กลางวัน
  [3,1,3],[3,2,1],[3,3,6],[3,4,4],[3,5,2],[3,6,7],[3,7,5],[3,8,3],
  // อังคาร กลางคืน
  [3,9,3],[3,10,7],[3,11,4],[3,12,1],[3,13,5],[3,14,2],[3,15,6],[3,16,3],
  // พุธ กลางวัน
  [4,1,4],[4,2,2],[4,3,7],[4,4,5],[4,5,3],[4,6,1],[4,7,6],[4,8,4],
  // พุธ กลางคืน
  [4,9,4],[4,10,1],[4,11,5],[4,12,2],[4,13,6],[4,14,3],[4,15,7],[4,16,4],
  // พฤหัสบดี กลางวัน
  [5,1,5],[5,2,3],[5,3,1],[5,4,6],[5,5,4],[5,6,2],[5,7,7],[5,8,5],
  // พฤหัสบดี กลางคืน
  [5,9,5],[5,10,2],[5,11,6],[5,12,3],[5,13,7],[5,14,4],[5,15,1],[5,16,5],
  // ศุกร์ กลางวัน
  [6,1,6],[6,2,4],[6,3,2],[6,4,7],[6,5,5],[6,6,3],[6,7,1],[6,8,6],
  // ศุกร์ กลางคืน
  [6,9,6],[6,10,3],[6,11,7],[6,12,4],[6,13,1],[6,14,5],[6,15,2],[6,16,6],
  // เสาร์ กลางวัน
  [7,1,7],[7,2,5],[7,3,3],[7,4,1],[7,5,6],[7,6,4],[7,7,2],[7,8,7],
  // เสาร์ กลางคืน
  [7,9,7],[7,10,4],[7,11,1],[7,12,5],[7,13,2],[7,14,6],[7,15,3],[7,16,7],
];

export const RAHU_YAM_MATRIX: RahuYamMatrix[] = _raw.map(([d, b, y], i) => ({
  id: i + 1, day_of_week: d, time_block_id: b, yam_number: y
}));

// ── ENGINE ──────────────────────────────────────────────────

const DAY_NAMES = ['', 'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function findTimeBlock(totalMinutes: number): RahuTimeBlock | null {
  for (const tb of RAHU_TIME_BLOCKS) {
    let start = timeToMinutes(tb.start_time);
    let end   = timeToMinutes(tb.end_time);
    if (tb.id === 12) end = 24 * 60; // 22:30-00:00
    if (end === 0) end = 1440;

    if (start < end) {
      if (totalMinutes >= start && totalMinutes < end) return tb;
    } else {
      // spans midnight
      if (totalMinutes >= start || totalMinutes < end) return tb;
    }
  }
  return null;
}

export function calculateRahu(date: Date): RahuResult | null {
  const dayOfWeek = date.getDay() + 1;
  const hours   = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const mainBlock = findTimeBlock(totalMinutes);
  if (!mainBlock) return null;

  let blockStartMin = timeToMinutes(mainBlock.start_time);
  let elapsed = totalMinutes - blockStartMin;
  if (elapsed < 0) elapsed += 1440;
  const minutesElapsed = elapsed % 90;

  const subBlock = RAHU_SUB_BLOCKS.find(
    sb => minutesElapsed >= sb.minute_start && minutesElapsed < sb.minute_end
  ) ?? RAHU_SUB_BLOCKS[8];

  const matrixRow = RAHU_YAM_MATRIX.find(
    m => m.day_of_week === dayOfWeek && m.time_block_id === mainBlock.id
  );
  if (!matrixRow) return null;

  const yamRule = RAHU_YAM_RULES.find(r => r.yam_number === matrixRow.yam_number)!;

  const phase = subBlock.phase_indicator ?? (
    minutesElapsed < 30 ? 'ยามต้น' :
    minutesElapsed < 60 ? 'ยามกลาง' : 'ยามปลาย'
  );

  const isGoodPhaseForYam = (() => {
    const t = yamRule.traibhum_result;
    if (t === 'ดียามต้น')           return phase === 'ยามต้น' && subBlock.is_good;
    if (t === 'ดียามกลาง')          return phase === 'ยามกลาง' && subBlock.is_good;
    if (t === 'ดียามปลาย')          return phase === 'ยามปลาย' && subBlock.is_good;
    if (t === 'ดียามกลาง+ยามปลาย') return (phase === 'ยามกลาง' || phase === 'ยามปลาย') && subBlock.is_good;
    return false;
  })();

  const overallVerdict = isGoodPhaseForYam
    ? '✨ ฤกษ์ดี — เหมาะแก่การเดินทางและทำการมงคล'
    : subBlock.is_good
      ? '🔶 ยามนี้ดี แต่ไม่ใช่จุดสูงสุดของวัน'
      : '⚠️ ยามนี้ไม่เป็นมงคล ควรรอช่วงเวลาที่ดีกว่า';

  const hh = String(hours).padStart(2,'0');
  const mm = String(minutes).padStart(2,'0');

  return {
    request_time: `${hh}:${mm}`,
    day_of_week: dayOfWeek,
    day_name: DAY_NAMES[dayOfWeek],
    main_block: mainBlock,
    sub_block: subBlock,
    is_current_moment_good: isGoodPhaseForYam,
    minutes_elapsed: minutesElapsed,
    yam_number: matrixRow.yam_number,
    yam_rule: yamRule,
    summary: {
      phase,
      current_yam_name: subBlock.name,
      overall_verdict: overallVerdict,
      advice: yamRule.good_phase_desc,
    }
  };
}
