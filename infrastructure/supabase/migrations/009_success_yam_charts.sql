-- Migration 009: ดวงยามสำเร็จ 112 ผัง
-- 7 วัน × 2 ช่วง (กลางวัน/กลางคืน) × 8 ยาม = 112 rows

CREATE TABLE IF NOT EXISTS success_yam_charts (
  -- Primary key: 'sun-day-1', 'mon-night-3', etc.
  id              TEXT        PRIMARY KEY,

  -- เวลา / ยาม
  weekday         TEXT        NOT NULL,  -- 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat'
  weekday_num     SMALLINT    NOT NULL,  -- 0=อาทิตย์ … 6=เสาร์
  weekday_name_th TEXT        NOT NULL,  -- 'อาทิตย์'|'จันทร์'|…
  period          TEXT        NOT NULL CHECK (period IN ('day','night')),
  yam_no          SMALLINT    NOT NULL CHECK (yam_no BETWEEN 1 AND 8),
  start_time      TEXT        NOT NULL,  -- '06:00'
  end_time        TEXT        NOT NULL,  -- '07:30'

  -- ดาวลอย 11 ดวง: key = planet label, value = zodiac index (0–11)
  planets         JSONB       NOT NULL DEFAULT '{}',

  -- ภพ 12 หลัง: key = bhava name (EN), value = zodiac index (0–11)
  houses          JSONB       NOT NULL DEFAULT '{}',

  -- ยามย่อย 12 ช่อง (7.5 นาที) — array of start time strings
  time_slots      JSONB       NOT NULL DEFAULT '[]',

  -- ลัคนา
  lagna_zodiac_index  SMALLINT,
  lagna_zodiac_name   TEXT,

  -- มาตรฐานดาวของดาวเจ้ายาม
  yam_planet      SMALLINT,
  day_planet      SMALLINT,

  -- Interpretation (Rule-Based)
  overall_score   SMALLINT,
  grade           TEXT CHECK (grade IN ('A','B','C','D','F')),
  interp_finance  TEXT,
  interp_work     TEXT,
  interp_love     TEXT,
  interp_health   TEXT,
  interp_law      TEXT,

  -- Full chart snapshot (for future use)
  chart_snapshot  JSONB,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับ query pattern ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_syc_weekday_period ON success_yam_charts (weekday_num, period, yam_no);
CREATE INDEX IF NOT EXISTS idx_syc_grade ON success_yam_charts (grade);

-- RLS
ALTER TABLE success_yam_charts ENABLE ROW LEVEL SECURITY;

-- ทุกคน (รวม anonymous) อ่านได้ — เป็นข้อมูลสาธารณะ
CREATE POLICY "public_read" ON success_yam_charts
  FOR SELECT USING (true);

-- เฉพาะ service_role เขียนได้ (seed script ใช้ service_role key)
CREATE POLICY "service_role_write" ON success_yam_charts
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_success_yam_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_success_yam_updated_at
  BEFORE UPDATE ON success_yam_charts
  FOR EACH ROW EXECUTE FUNCTION update_success_yam_updated_at();
