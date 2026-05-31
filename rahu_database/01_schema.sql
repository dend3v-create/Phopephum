-- ============================================================
-- ยามราหูค้นทรัพย์ — Complete Database Schema
-- Version: 1.0.0
-- Compatible: PostgreSQL / MySQL / SQLite
-- ============================================================

-- 1. รอบเวลาหลัก 1.5 ชั่วโมง (16 รอบ/วัน)
CREATE TABLE time_blocks (
    id          INTEGER PRIMARY KEY,
    period_type VARCHAR(20)  NOT NULL,  -- 'กลางวัน' | 'กลางคืน'
    slot_number INTEGER      NOT NULL,  -- 1-8 ในแต่ละ period
    start_time  VARCHAR(8)   NOT NULL,  -- 'HH:MM'
    end_time    VARCHAR(8)   NOT NULL   -- 'HH:MM'
);

-- 2. ยามย่อย 10 นาที (9 ยามต่อรอบ = คงที่ทุกรอบ)
CREATE TABLE sub_blocks (
    id              INTEGER PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL,
    minute_start    INTEGER      NOT NULL,  -- 0,10,20,...,80
    minute_end      INTEGER      NOT NULL,  -- 10,20,30,...,90
    is_good         BOOLEAN      NOT NULL,
    phase_indicator VARCHAR(20)             -- 'ยามต้น'|'ยามกลาง'|'ยามปลาย'|NULL
);

-- 3. Matrix วัน × รอบเวลา → ตัวเลขยาม
CREATE TABLE yam_matrix (
    id            INTEGER PRIMARY KEY,
    day_of_week   INTEGER NOT NULL,  -- 1=อาทิตย์ ... 7=เสาร์
    time_block_id INTEGER NOT NULL,  -- FK → time_blocks.id
    yam_number    INTEGER NOT NULL,  -- 1-7
    FOREIGN KEY (time_block_id) REFERENCES time_blocks(id)
);

-- 4. คำทำนายประจำยาม 1-7
CREATE TABLE yam_rules (
    yam_number       INTEGER PRIMARY KEY,  -- 1-7
    yam_name         VARCHAR(50)  NOT NULL,
    traibhum_result  VARCHAR(50)  NOT NULL,   -- ยามไตรภูมิ
    huajai_truth     VARCHAR(100) NOT NULL,   -- หัวใจยาม: ความน่าเชื่อถือ
    huajai_lost_item VARCHAR(100) NOT NULL,   -- หัวใจยาม: ของหาย
    huajai_health    VARCHAR(100) NOT NULL,   -- หัวใจยาม: ถามสุขภาพ
    good_phase_desc  VARCHAR(100) NOT NULL    -- คำอธิบายว่าช่วงไหนดี
);

